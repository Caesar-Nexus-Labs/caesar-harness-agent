import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// Squad preset manifest schema: groups existing canonical agent slugs into a coordinated team.

const SquadStageSchema = z
  .object({
    stage: z.string().min(1),
    agents: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1),
    parallel: z.boolean().default(false),
  })
  .strict();

export const SquadManifestSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'squad name must be lowercase kebab-case'),
    description: z.string().min(10),
    agents: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1),
    workflow: z.array(SquadStageSchema).min(1),
  })
  .strict();

export type SquadManifest = z.infer<typeof SquadManifestSchema>;

export function parseSquadManifest(yamlContent: string): SquadManifest {
  const raw = parseYaml(yamlContent);
  return SquadManifestSchema.parse(raw);
}
