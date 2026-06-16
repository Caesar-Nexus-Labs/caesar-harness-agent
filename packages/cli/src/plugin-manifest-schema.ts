import { TOOL_TARGETS } from '@caesar/agents-core';
import { z } from 'zod';

export const PluginManifestSchema = z.object({
  type: z.literal('agent-plugin'),
  schemaVersion: z.number().int().min(1),
  categories: z.array(z.string()).min(1),
  agentCount: z.number().int().positive(),
  agentSlugs: z.array(z.string()).optional(),
  supportedTools: z.array(z.enum(TOOL_TARGETS as any)),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;
