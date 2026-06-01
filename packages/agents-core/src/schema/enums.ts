import { z } from 'zod';

// Canonical enums — single source of truth, reused by schema + all emitters.

/** Model tier alias. Mapped to concrete provider model-ids per tool by the transpiler. */
export const MODEL_TIERS = ['inherit', 'fast', 'balanced', 'top'] as const;
export const ModelTierEnum = z.enum(MODEL_TIERS);
export type ModelTier = (typeof MODEL_TIERS)[number];

/** Permission tier. Mapped to sandbox_mode / permissionMode / tool gating per tool. */
export const PERMISSIONS = ['read-only', 'edit', 'full'] as const;
export const PermissionEnum = z.enum(PERMISSIONS);
export type Permission = (typeof PERMISSIONS)[number];

/** Canonical lowercase tool ids. Mapped to each tool's native tool names by emitters. */
export const TOOLS = ['read', 'grep', 'glob', 'edit', 'write', 'bash', 'web'] as const;
export const ToolEnum = z.enum(TOOLS);
export type Tool = (typeof TOOLS)[number];

/** Tools that mutate state — forbidden for read-only agents. */
export const MUTATING_TOOLS = ['edit', 'write', 'bash'] as const;

/** Reasoning effort hint. Maps to Codex/Factory; no-op where unsupported. */
export const REASONING_EFFORTS = ['low', 'medium', 'high'] as const;
export const ReasoningEffortEnum = z.enum(REASONING_EFFORTS);
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
