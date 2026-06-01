// Assemble per-category npm packages from built dist/ artifacts.
//
// Reads `dist/{tool}/{subdir}/{slug}.{ext}` (produced by `caesar build`), groups the
// per-agent files by category, and emits one publishable package per category under
// `packages/categories/caesar-{slug}/` containing:
//   - package.json  (@caesar/{slug}, files: ["dist"], GPL-3.0-only, public)
//   - README.md     (generated: agent list + install instructions)
//   - dist/{tool}/...  (only this category's native files + the shared AGENTS.md)
//
// Packages are GENERATED at release time — never hand-edited. Run `caesar build` first.
// Source agents are the single source of truth; this script only repackages build output.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  discoverAgents,
  getToolTargetMeta,
  hasAggregateEmitter,
  registerExtendedNativeEmitters,
  registerFallbackEmitters,
  registerNativeEmitters,
  TOOL_TARGETS,
  type ToolTarget,
} from '@caesar/agents-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const DIST_ROOT = resolve(REPO_ROOT, 'dist');
const OUT_ROOT = resolve(REPO_ROOT, 'packages', 'categories');
const VERSION = '0.1.0';

/**
 * Map a category dir (`NN-name`) to a short, collision-safe npm package slug.
 * `02-language-specialists` → `lang`, etc. Falls back to the dir name minus `NN-`.
 */
const CATEGORY_PACKAGE_SLUG: Record<string, string> = {
  '01-core-development': 'core-dev',
  '02-language-specialists': 'lang',
  '03-infrastructure': 'infra',
  '04-quality-security': 'quality-security',
  '05-data-ai': 'data-ai',
  '06-developer-experience': 'devex',
  '07-specialized-domains': 'specialized',
  '08-business-product': 'product',
  '09-meta-orchestration': 'orchestration',
  '10-research-analysis': 'research',
};

function packageSlug(category: string): string {
  return CATEGORY_PACKAGE_SLUG[category] ?? category.replace(/^\d+-/, '');
}

function humanTitle(category: string): string {
  return category
    .replace(/^\d+-/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** List files under `dir` recursively, returning paths relative to `dir`. */
function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { recursive: true }) as string[]) {
    const abs = join(dir, entry);
    if (statSync(abs).isFile()) out.push(entry);
  }
  return out;
}

/** True when a native per-agent built file (relative to its tool dir) belongs to one of `slugs`. */
function fileBelongsToCategory(tool: ToolTarget, relativePath: string, slugs: Set<string>): boolean {
  const segs = relativePath.split(/[\\/]/);
  const base = segs.at(-1) ?? relativePath;
  // Folder-per-agent (openhands): `.agents/skills/{slug}/SKILL.md` → slug is the parent dir.
  if (base === 'SKILL.md') return slugs.has(segs.at(-2) ?? '');
  // Flat per-agent: slug = basename minus the tool extension (handles copilot `.agent.md`).
  const ext = getToolTargetMeta(tool).fileExtension;
  if (!base.endsWith(ext)) return false;
  return slugs.has(base.slice(0, base.length - ext.length));
}

interface CategoryPackage {
  category: string;
  slug: string;
  agentSlugs: string[];
  fileCount: number;
}

function assemble(): CategoryPackage[] {
  if (!existsSync(DIST_ROOT)) {
    throw new Error(`dist/ not found at ${DIST_ROOT}. Run "caesar build" first.`);
  }

  const agents = discoverAgents(REPO_ROOT);
  const byCategory = new Map<string, string[]>();
  for (const a of agents) {
    const list = byCategory.get(a.category) ?? [];
    list.push(a.slug);
    byCategory.set(a.category, list);
  }

  // Register emitters so hasAggregateEmitter() routing is accurate (idempotent).
  registerNativeEmitters();
  registerExtendedNativeEmitters();
  registerFallbackEmitters();

  // Fresh output tree (regenerated every run).
  rmSync(OUT_ROOT, { recursive: true, force: true });
  mkdirSync(OUT_ROOT, { recursive: true });

  // Native per-agent targets (filtered to category slugs) vs native AGGREGATE targets (kilo —
  // single all-agents file, copied whole like the fallback AGENTS.md).
  const nativeTargets = TOOL_TARGETS.filter(
    (t) => getToolTargetMeta(t).tier === 'native' && !hasAggregateEmitter(t),
  );
  const aggregateNativeTargets = TOOL_TARGETS.filter(
    (t) => getToolTargetMeta(t).tier === 'native' && hasAggregateEmitter(t),
  );
  const results: CategoryPackage[] = [];

  for (const [category, slugList] of [...byCategory].sort()) {
    const slugs = new Set(slugList.sort());
    const pkgSlug = packageSlug(category);
    const pkgDir = resolve(OUT_ROOT, `caesar-${pkgSlug}`);
    const pkgDist = resolve(pkgDir, 'dist');
    mkdirSync(pkgDist, { recursive: true });

    let fileCount = 0;

    // Copy this category's native per-agent files, preserving the tool subdir layout.
    for (const tool of nativeTargets) {
      const toolDir = resolve(DIST_ROOT, tool);
      for (const rel of listFilesRecursive(toolDir)) {
        if (!fileBelongsToCategory(tool, rel, slugs)) continue;
        const src = join(toolDir, rel);
        const dest = join(pkgDist, tool, rel);
        mkdirSync(dirname(dest), { recursive: true });
        cpSync(src, dest);
        fileCount++;
      }
    }

    // Include native AGGREGATE indexes (kilo `.kilocodemodes`) whole — single all-agents file.
    for (const tool of aggregateNativeTargets) {
      const toolDir = resolve(DIST_ROOT, tool);
      for (const rel of listFilesRecursive(toolDir)) {
        const dest = join(pkgDist, tool, rel);
        mkdirSync(dirname(dest), { recursive: true });
        cpSync(join(toolDir, rel), dest);
        fileCount++;
      }
    }

    // Include the shared AGENTS.md routing index (fallback tier) whole, if present.
    const agentsMdDir = resolve(DIST_ROOT, 'agents-md');
    for (const rel of listFilesRecursive(agentsMdDir)) {
      const dest = join(pkgDist, 'agents-md', rel);
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(join(agentsMdDir, rel), dest);
      fileCount++;
    }

    writeFileSync(
      resolve(pkgDir, 'package.json'),
      `${JSON.stringify(buildPackageJson(pkgSlug, category), null, 2)}\n`,
      'utf8',
    );
    writeFileSync(resolve(pkgDir, 'README.md'), buildReadme(category, pkgSlug, [...slugs]), 'utf8');

    results.push({ category, slug: pkgSlug, agentSlugs: [...slugs], fileCount });
  }

  return results;
}

function buildPackageJson(pkgSlug: string, category: string): Record<string, unknown> {
  return {
    name: `@caesar/${pkgSlug}`,
    version: VERSION,
    description: `CaesarAgent ${humanTitle(category)} expert coding agents — prebuilt native outputs for supported AI coding tools.`,
    license: 'GPL-3.0-only',
    keywords: [
      'ai-agents',
      'ai-agent-harness',
      'coding-agents',
      'claude-code-subagents',
      'native-agent-outputs',
      'agent-prompt-library',
    ],
    files: ['dist', 'README.md'],
    publishConfig: { access: 'public' },
  };
}

function buildReadme(category: string, pkgSlug: string, agentSlugs: string[]): string {
  const title = humanTitle(category);
  const lines = [
    `# @caesar/${pkgSlug}`,
    '',
    `Prebuilt **${title}** expert coding agents from the CaesarAgent suite, transpiled into native outputs for supported AI coding tools.`,
    '',
    `## Agents (${agentSlugs.length})`,
    '',
    ...agentSlugs.map((s) => `- \`${s}\``),
    '',
    '## Install',
    '',
    'Copy the prebuilt files for your tool into your project using the `caesar` CLI:',
    '',
    '```bash',
    `caesar install ${category} --tool claude`,
    '```',
    '',
    'Supported tools: `claude`, `opencode`, `kiro`, `codex`, `factory`, `copilot`, `gemini`, `openhands`, `kilo` (native), plus a shared `AGENTS.md` routing index for fallback tools (Cursor, Windsurf, Cline, Antigravity, Amp).',
    '',
    '## Layout',
    '',
    'Built artifacts live under `dist/{tool}/` mirroring each tool’s native agent path (e.g. `dist/claude/.claude/agents/*.md`).',
    '',
    '> Generated from canonical sources — do not edit these files directly.',
    '',
  ];
  return lines.join('\n');
}

const packages = assemble();
const totalFiles = packages.reduce((n, p) => n + p.fileCount, 0);
process.stdout.write(
  `Assembled ${packages.length} category package(s), ${totalFiles} file(s) total → ${OUT_ROOT}\n`,
);
for (const p of packages) {
  process.stdout.write(
    `  @caesar/${p.slug}: ${p.agentSlugs.length} agent(s), ${p.fileCount} file(s)\n`,
  );
}
