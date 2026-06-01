import type { Permission } from '../schema/enums.js';
import type { ToolTarget } from './tool-targets.js';

// Permission tier → per-tool permission representation.
//
// SOURCE + DATE (2026-05-30, docs/tech-stack.md §5 + researcher reports):
// - Claude: `permissionMode` (plan/acceptEdits/default).
// - OpenCode: `permission:{}` block (edit/bash → allow|ask|deny); read always allowed.
// - Codex: `sandbox_mode` (read-only/workspace-write/danger-full-access).
// - Factory: `tools` category string.
// Tools without a sandbox/permission concept (kiro, copilot, agents-md) gate access
// purely through their tools allowlist → mapPermission returns undefined (omit field).

/** OpenCode per-tool permission action. */
export type OpenCodeAction = 'allow' | 'ask' | 'deny';

export interface ClaudePermission {
  permissionMode: 'plan' | 'acceptEdits' | 'default';
}
export interface OpenCodePermission {
  permission: { edit: OpenCodeAction; bash: OpenCodeAction };
}
export interface CodexPermission {
  sandbox_mode: 'read-only' | 'workspace-write' | 'danger-full-access';
}
export interface FactoryPermission {
  /**
   * Factory `tools` CATEGORY string. Omitted (undefined) for the full tier — Factory has no
   * `all` category; omitting the field grants all tools (verified 2026-05-30,
   * docs.factory.ai/cli/configuration/custom-droids).
   */
  tools?: 'read-only' | 'edit';
}

/** Kilo `.kilocodemodes` mode permission group. Plain strings (no fileRegex tuples). */
export type KiloGroup = 'read' | 'edit' | 'command';
export interface KiloPermission {
  groups: KiloGroup[];
}

/** Precise return type per tool literal — `undefined` where the tool has no permission field. */
export type PermissionFor<T extends ToolTarget> = T extends 'claude'
  ? ClaudePermission
  : T extends 'opencode'
    ? OpenCodePermission
    : T extends 'codex'
      ? CodexPermission
      : T extends 'factory'
        ? FactoryPermission
        : T extends 'kilo'
          ? KiloPermission
          : undefined;

const CLAUDE: Record<Permission, ClaudePermission> = {
  'read-only': { permissionMode: 'plan' },
  edit: { permissionMode: 'acceptEdits' },
  // 'default' (interactive) chosen over 'bypassPermissions' — full access without
  // prompting is unsafe to ship as a default. TODO verify desired full-tier mode.
  full: { permissionMode: 'default' },
};

const OPENCODE: Record<Permission, OpenCodePermission> = {
  'read-only': { permission: { edit: 'deny', bash: 'deny' } },
  edit: { permission: { edit: 'allow', bash: 'ask' } },
  full: { permission: { edit: 'allow', bash: 'allow' } },
};

const CODEX: Record<Permission, CodexPermission> = {
  'read-only': { sandbox_mode: 'read-only' },
  edit: { sandbox_mode: 'workspace-write' },
  // Conservative: map full → workspace-write (not danger-full-access) — full network +
  // outside-workspace write is unsafe to ship by default and the exact enum is unverified.
  full: { sandbox_mode: 'workspace-write' }, // TODO verify danger-full-access opt-in (Phase 06)
};

const FACTORY: Record<Permission, FactoryPermission> = {
  'read-only': { tools: 'read-only' },
  edit: { tools: 'edit' },
  // No `all` category: omit `tools` entirely → Factory grants all tools (verified 2026-05-30).
  full: {},
};

// Kilo `.kilocodemodes` groups (Roo-origin official, verified 2026-06-01). Plain string groups
// only — NO `fileRegex` tuples (canonical schema has no file-scope field; fileRegex would be a
// guess → YAGNI). read-only poka-yoke: read-only stays exactly [read] (no edit/command).
const KILO: Record<Permission, KiloPermission> = {
  'read-only': { groups: ['read'] },
  edit: { groups: ['read', 'edit'] },
  full: { groups: ['read', 'edit', 'command'] },
};

/**
 * Map a canonical permission tier to a tool's permission representation.
 * Returns `undefined` for tools that have no sandbox/permission field (kiro, copilot,
 * agents-md, gemini, openhands) — those restrict access via their tools allowlist or
 * inherit the session default instead.
 */
export function mapPermission<T extends ToolTarget>(perm: Permission, tool: T): PermissionFor<T> {
  let result:
    | ClaudePermission
    | OpenCodePermission
    | CodexPermission
    | FactoryPermission
    | KiloPermission
    | undefined;
  switch (tool) {
    case 'claude':
      result = CLAUDE[perm];
      break;
    case 'opencode':
      result = OPENCODE[perm];
      break;
    case 'codex':
      result = CODEX[perm];
      break;
    case 'factory':
      result = FACTORY[perm];
      break;
    case 'kilo':
      result = KILO[perm];
      break;
    default:
      result = undefined;
  }
  return result as PermissionFor<T>;
}
