import { type Permission, TOOLS, type Tool } from '../schema/enums.js';
import type { ToolTarget } from './tool-targets.js';

// Canonical tool → per-tool tool-id mapping + tools-allowlist semantics.
//
// CONTRACT (W2, see canonical-agent-schema.ts):
//   - non-empty `tools`  → restrict to EXACTLY those canonical tools.
//   - empty/omitted      → "no explicit restriction" → emit the tool default for the
//                          permission tier: read-only ⇒ restrict to the read-only triad;
//                          edit/full ⇒ no restriction (return undefined ⇒ emitter omits field).
//
// Return value: per-tool tool-id list to restrict to, OR `undefined` meaning
// "do not emit a tools allowlist" (all tools / tool has no allowlist concept).
//
// Tools WITHOUT a per-agent tools allowlist (return undefined always):
//   - codex   → no tools field; surface shaped via sandbox_mode (permission-map).
//   - factory → tools expressed as a category (read-only|edit|all) via permission-map.
//   - agents-md → aggregated fallback index, no per-agent tools field.

/** Targets that DO accept a per-agent tools allowlist. */
const ALLOWLIST_TOOLS: ReadonlySet<ToolTarget> = new Set(['claude', 'opencode', 'kiro', 'copilot']);

/** Default read-only tool surface when an agent gives no explicit list (standards §2). */
const READ_ONLY_DEFAULT: readonly Tool[] = ['read', 'grep', 'glob'];

/** Canonical → Claude tool ids (code.claude.com/docs sub-agents). */
const CLAUDE_IDS: Record<Tool, string> = {
  read: 'Read',
  grep: 'Grep',
  glob: 'Glob',
  edit: 'Edit',
  write: 'Write',
  bash: 'Bash',
  web: 'WebFetch',
};

/** Canonical → OpenCode tool keys (opencode.ai/docs/agents). */
const OPENCODE_IDS: Record<Tool, string> = {
  read: 'read',
  grep: 'grep',
  glob: 'glob',
  edit: 'edit',
  write: 'write',
  bash: 'bash',
  web: 'webfetch',
};

// Canonical → Kiro built-in tool ids (kiro.dev/docs/cli/custom-agents/configuration-reference,
// verified 2026-05-30). Kiro's built-in tool surface is coarse: read / write / shell (plus
// aws, knowledge). There is NO grep/glob/edit/execute built-in, so search ops collapse to
// `read` and mutations to `write`; `bash` is `shell` (NOT `execute`). Collapsed ids dedup.
const KIRO_IDS: Record<Tool, string> = {
  read: 'read',
  grep: 'read',
  glob: 'read',
  edit: 'write',
  write: 'write',
  bash: 'shell',
  // No documented built-in web/fetch tool in Kiro CLI; reached via MCP `@fetch` otherwise.
  web: 'fetch', // TODO verify Kiro web tool id (no built-in documented 2026-05-30)
};

// Canonical → GitHub Copilot custom-agent tool aliases
// (docs.github.com/en/copilot/reference/custom-agents-configuration, verified 2026-05-30).
// Primary aliases: read (Read), search (Grep/Glob), edit (Edit/Write), execute (Bash), web
// (WebFetch/WebSearch). grep+glob collapse to `search`; edit+write collapse to `edit`.
const COPILOT_IDS: Record<Tool, string> = {
  read: 'read',
  grep: 'search',
  glob: 'search',
  edit: 'edit',
  write: 'edit',
  bash: 'execute',
  web: 'web',
};

const ID_TABLES: Partial<Record<ToolTarget, Record<Tool, string>>> = {
  claude: CLAUDE_IDS,
  opencode: OPENCODE_IDS,
  kiro: KIRO_IDS,
  copilot: COPILOT_IDS,
};

/** Sort canonical tools by their enum order so output is deterministic for snapshots. */
function sortCanonical(tools: readonly Tool[]): Tool[] {
  const order = (t: Tool) => TOOLS.indexOf(t);
  return [...tools].sort((a, b) => order(a) - order(b));
}

/** Map canonical tools → per-tool ids, dedup preserving first occurrence (Copilot collapses). */
function toIds(table: Record<Tool, string>, canonical: readonly Tool[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of sortCanonical(canonical)) {
    const id = table[t];
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * Map a canonical tool list to a tool's per-agent allowlist ids.
 *
 * @returns array of per-tool ids to restrict to, or `undefined` to emit NO allowlist
 *          (all tools / tool has no allowlist concept — codex, factory, agents-md).
 */
export function mapTools(
  tools: readonly Tool[],
  tool: ToolTarget,
  permission: Permission,
): string[] | undefined {
  const table = ID_TABLES[tool];
  if (!ALLOWLIST_TOOLS.has(tool) || table === undefined) return undefined;

  if (tools.length > 0) return toIds(table, tools);

  // Empty list = no explicit restriction → apply the permission-tier default.
  if (permission === 'read-only') return toIds(table, READ_ONLY_DEFAULT);
  return undefined; // edit/full → unrestricted (omit allowlist).
}
