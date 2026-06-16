import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve as pathResolve } from 'node:path';
import { PluginNotFoundError, RegistryFetchError, UsageError } from './cli-errors.js';
import { type PluginManifest, PluginManifestSchema } from './plugin-manifest-schema.js';

export type PluginSource =
  | { type: 'npm'; name: string; version?: string }
  | { type: 'github'; owner: string; repo: string; ref?: string }
  | { type: 'local'; path: string };

export interface ResolvedPlugin {
  manifest: PluginManifest;
  distDir: string;
  name: string;
  version: string;
  source: PluginSource;
  integrity: string;
  cleanup(): void;
}

export function parseSource(raw: string): PluginSource {
  if (
    raw.startsWith('./') ||
    raw.startsWith('../') ||
    raw.startsWith('/') ||
    /^[a-zA-Z]:[\\/]/.test(raw)
  ) {
    return { type: 'local', path: raw };
  }

  if (raw.startsWith('gh:') || raw.startsWith('github:')) {
    const withoutPrefix = raw.replace(/^(gh|github):/, '');
    const parts = withoutPrefix.split('#');
    const ownerRepo = parts[0]!;
    const ref = parts[1];
    const repoParts = ownerRepo.split('/');
    const owner = repoParts[0];
    const repo = repoParts[1];
    if (!owner || !repo) {
      throw new UsageError(`Invalid github source format: ${raw}. Expected gh:owner/repo[#ref]`);
    }
    return { type: 'github', owner, repo, ref };
  }

  // owner/repo (no @ at start, has exactly one /)
  if (/^[^/@]+\/[^/@]+(#.*)?$/.test(raw)) {
    const parts = raw.split('#');
    const ownerRepo = parts[0]!;
    const ref = parts[1];
    const repoParts = ownerRepo.split('/');
    const owner = repoParts[0]!;
    const repo = repoParts[1]!;
    return { type: 'github', owner, repo, ref };
  }

  // npm
  let name = raw;
  let version: string | undefined;

  const lastAtIndex = raw.lastIndexOf('@');
  if (lastAtIndex > 0) {
    name = raw.substring(0, lastAtIndex);
    version = raw.substring(lastAtIndex + 1);
  }

  if (name.trim() === '') {
    throw new UsageError(`Invalid npm source format: ${raw}`);
  }

  return { type: 'npm', name, version };
}

/**
 * Resolves the plugin source to a local directory containing the extracted package.
 * Validates the package.json contains the caesar manifest field.
 */
export async function resolveSource(
  source: PluginSource,
  opts: { cwd: string },
): Promise<ResolvedPlugin> {
  if (source.type === 'local') {
    const absPath = pathResolve(opts.cwd, source.path);
    if (!existsSync(absPath)) {
      throw new UsageError(`Local plugin path does not exist: ${absPath}`);
    }
    const manifest = readAndValidateManifest(absPath);
    return {
      manifest,
      distDir: join(absPath, 'dist'),
      name: manifest.name ?? 'local-plugin',
      version: manifest.version ?? '0.0.0',
      source,
      integrity: 'none',
      cleanup: () => {}, // no-op
    };
  }

  const tmpDir = mkdtempSync(join(tmpdir(), 'caesar-plugin-'));
  let cleanupRun = false;
  const cleanup = () => {
    if (!cleanupRun) {
      rmSync(tmpDir, { recursive: true, force: true });
      cleanupRun = true;
    }
  };

  try {
    if (source.type === 'npm') {
      const _target = source.version ? `${source.name}@${source.version}` : source.name;
      // Use npm pack to fetch and extract the tarball
      // npm pack downloads the tarball to cwd. We can then extract it.
      // Wait, let's just fetch from the registry using standard fetch API to avoid npm dependency issues,
      // or just use `npm pack` since npm is universally available in Node environments.
      // We will use fetch for reliability and speed as per instructions.

      const registryUrl = `https://registry.npmjs.org/${source.name.replace('/', '%2F')}`;
      const res = await fetch(registryUrl);
      if (!res.ok) {
        if (res.status === 404) {
          throw new PluginNotFoundError(`Package not found on npm registry: ${source.name}`);
        }
        throw new RegistryFetchError(
          `Failed to fetch package metadata for ${source.name} from npm: ${res.statusText}`,
        );
      }
      const data = (await res.json()) as any;
      const versionToUse = source.version || data['dist-tags']?.latest;
      if (!versionToUse || !data.versions[versionToUse]) {
        throw new PluginNotFoundError(
          `Version ${versionToUse || 'latest'} not found for package ${source.name}`,
        );
      }

      const versionData = data.versions[versionToUse];
      const tarballUrl = versionData.dist.tarball;
      const integrity = versionData.dist.integrity || versionData.dist.shasum;

      await downloadAndExtractTarball(tarballUrl, tmpDir);

      // npm tarballs extract to a 'package' directory by default
      const extractedPkgDir = join(tmpDir, 'package');
      if (!existsSync(extractedPkgDir)) {
        throw new UsageError(`Invalid tarball structure from npm for ${source.name}`);
      }

      const manifest = readAndValidateManifest(extractedPkgDir);
      return {
        manifest,
        distDir: join(extractedPkgDir, 'dist'),
        name: versionData.name,
        version: versionData.version,
        source,
        integrity,
        cleanup,
      };
    }

    if (source.type === 'github') {
      const ref = source.ref || 'HEAD';
      // Use github api to get the latest commit sha to use as version if ref is HEAD
      let version = ref;
      if (ref === 'HEAD') {
        const apiRes = await fetch(
          `https://api.github.com/repos/${source.owner}/${source.repo}/commits/HEAD`,
        );
        if (apiRes.ok) {
          const apiData = (await apiRes.json()) as any;
          version = apiData.sha?.substring(0, 7) || 'HEAD';
        }
      }

      const tarballUrl = `https://codeload.github.com/${source.owner}/${source.repo}/tar.gz/${ref}`;
      await downloadAndExtractTarball(tarballUrl, tmpDir);

      // GitHub tarballs extract to `{repo}-{ref}` directory.
      // We can just find the first directory inside tmpDir
      const fs = await import('node:fs');
      const entries = fs.readdirSync(tmpDir);
      const pkgDirName = entries.find((e) => fs.statSync(join(tmpDir, e)).isDirectory());
      if (!pkgDirName) {
        throw new UsageError(
          `Invalid tarball structure from github for ${source.owner}/${source.repo}`,
        );
      }

      const extractedPkgDir = join(tmpDir, pkgDirName);
      const manifest = readAndValidateManifest(extractedPkgDir);
      return {
        manifest,
        distDir: join(extractedPkgDir, 'dist'),
        name: manifest.name ?? `${source.owner}-${source.repo}`,
        version: manifest.version ?? version,
        source,
        integrity: 'none',
        cleanup,
      };
    }

    throw new UsageError(`Unsupported plugin source type`);
  } catch (err) {
    cleanup();
    throw err;
  }
}

async function downloadAndExtractTarball(url: string, extractToDir: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new PluginNotFoundError(`Archive not found at ${url}`);
    }
    throw new RegistryFetchError(`Failed to download tarball from ${url}: ${res.statusText}`);
  }
  const buffer = await res.arrayBuffer();
  const tarballPath = join(extractToDir, 'package.tgz');
  writeFileSync(tarballPath, Buffer.from(buffer));

  try {
    // macOS, Linux, and Windows 10+ all have native tar command
    execSync(`tar -xzf package.tgz`, { cwd: extractToDir, stdio: 'ignore' });
  } catch (err: any) {
    throw new UsageError(
      `Failed to extract tarball. Ensure 'tar' is available in your system path: ${err.message}`,
    );
  } finally {
    rmSync(tarballPath, { force: true });
  }
}

function readAndValidateManifest(
  dir: string,
): PluginManifest & { name?: string; version?: string } {
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) {
    throw new UsageError(`No package.json found at ${pkgPath}`);
  }

  let pkgContent: string;
  try {
    pkgContent = readFileSync(pkgPath, 'utf8');
  } catch (err: any) {
    throw new UsageError(`Failed to read package.json at ${pkgPath}: ${err.message}`);
  }

  let pkgJson: any;
  try {
    pkgJson = JSON.parse(pkgContent);
  } catch (err: any) {
    throw new UsageError(`Failed to parse package.json at ${pkgPath}: ${err.message}`);
  }

  if (!pkgJson.caesar) {
    throw new UsageError(`Plugin package.json missing "caesar" manifest field`);
  }

  const result = PluginManifestSchema.safeParse(pkgJson.caesar);
  if (!result.success) {
    throw new UsageError(`Invalid "caesar" manifest in package.json: ${result.error.message}`);
  }

  return {
    ...result.data,
    name: pkgJson.name,
    version: pkgJson.version,
  } as PluginManifest & { name?: string; version?: string };
}
