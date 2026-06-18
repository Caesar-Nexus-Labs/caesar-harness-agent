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
  rmSync,
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
import { includeFile, listFilesRecursive } from '../packages/cli/src/shared/file-copy-utils.js';

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
  '11-marketing': 'marketing',
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
        if (!includeFile(tool, rel, slugs)) continue;
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
      `${JSON.stringify(buildPackageJson(pkgSlug, category, [...slugs]), null, 2)}\n`,
      'utf8',
    );
    writeFileSync(resolve(pkgDir, 'README.md'), buildReadme(category, pkgSlug, [...slugs]), 'utf8');

    results.push({ category, slug: pkgSlug, agentSlugs: [...slugs], fileCount });
  }

  return results;
}

function buildPackageJson(pkgSlug: string, category: string, agentSlugs: string[]): Record<string, unknown> {
  return {
    name: `@caesar/${pkgSlug}`,
    version: VERSION,
    description: `Caesar Harness Agent ${humanTitle(category)} harness subagents — specialized AI assistants designed for specific development tasks and native cross-platform coding agent outputs.`,
    license: 'GPL-3.0-only',
    keywords: [
      'ai-agents',
      'ai-agent-harness',
      'coding-agents',
      'claude-code-subagents',
      'native-agent-outputs',
      'agent-prompt-library',
    ],
    caesar: {
      type: 'agent-plugin',
      schemaVersion: 1,
      categories: [category],
      agentCount: agentSlugs.length,
      agentSlugs,
      supportedTools: TOOL_TARGETS,
    },
    files: ['dist', 'README.md'],
    publishConfig: { access: 'public' },
  };
}

function buildReadme(category: string, pkgSlug: string, agentSlugs: string[]): string {
  const title = humanTitle(category);
  const lines = [
    `# @caesar/${pkgSlug}`,
    '',
    `Prebuilt **${title}** expert coding agents from the Caesar Harness Agent suite, transpiled into native outputs for supported AI coding tools.`,
    '',
    `## Agents (${agentSlugs.length})`,
    '',
    ...agentSlugs.map((s) => `- \`${s}\``),
    '',
    '## Install',
    '',
    'Add to your project (all supported tools):',
    '```bash',
    `npx @caesar/cli add @caesar/${pkgSlug} --tool all`,
    '```',
    '',
    'Or install for a specific tool:',
    '```bash',
    `npx @caesar/cli add @caesar/${pkgSlug} --tool claude`,
    `npx @caesar/cli add @caesar/${pkgSlug} --tool opencode`,
    '```',
    '',
    'Global install:',
    '```bash',
    `npx @caesar/cli add @caesar/${pkgSlug} --tool claude --global`,
    '```',
    '',
    'Supported tools: `claude`, `opencode`, `kiro`, `codex`, `factory`, `copilot`, `gemini`, `openhands`, `kilo` (native), plus a shared `AGENTS.md` routing index for fallback tools (Cursor, Windsurf, Cline, Antigravity, Amp).',
    '',
    '## Layout',
    '',
    'Built artifacts live under `dist/{tool}/` mirroring each tool’s native agent path (e.g. `dist/claude/.claude/agents/*.md`).',
    '',
    'You can view installed plugins using `caesar list` or `caesar list --global`.',
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
