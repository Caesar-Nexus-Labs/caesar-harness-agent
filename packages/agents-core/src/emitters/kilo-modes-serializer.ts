import { stringify as stringifyYaml } from 'yaml';
import type { KiloGroup } from '../mapping/permission-map.js';

// Kilo `.kilocodemodes` serializer: build a `{ customModes: Mode[] }` YAML document via the
// `yaml` lib (clean stringify, stable output). Plain string `groups` only (no fileRegex tuples)
// → the serializer is a trivial object→YAML pass with no escaping edge cases.

/** One `customModes` entry. Optional fields are omitted (undefined) rather than emitted null. */
export interface KiloMode {
  slug: string;
  name: string;
  roleDefinition: string;
  whenToUse?: string;
  description?: string;
  customInstructions?: string;
  groups: KiloGroup[];
}

/**
 * YAML stringify opts:
 * - lineWidth 0 disables soft line-folding so long role/instruction scalars stay intact.
 * - aliasDuplicateObjects false forces fully-expanded output: repeated object references (e.g.
 *   the shared per-tier `groups` array) would otherwise be emitted as YAML anchors/aliases, which
 *   hurt readability AND trip the parser's alias-count safety limit on large agent sets.
 */
const YAML_OPTS = { lineWidth: 0, aliasDuplicateObjects: false } as const;

/** Key order per mode → stable snapshots regardless of object assembly. */
const MODE_KEY_ORDER: readonly (keyof KiloMode)[] = [
  'slug',
  'name',
  'roleDefinition',
  'whenToUse',
  'description',
  'customInstructions',
  'groups',
];

/** Reorder a mode into MODE_KEY_ORDER, dropping undefined optional fields. */
function orderMode(mode: KiloMode): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  for (const key of MODE_KEY_ORDER) {
    const value = mode[key];
    if (value !== undefined) ordered[key] = value;
  }
  return ordered;
}

/** Serialize modes into a `{ customModes: [...] }` YAML document. */
export function serializeKiloModes(modes: readonly KiloMode[]): string {
  return stringifyYaml({ customModes: modes.map(orderMode) }, YAML_OPTS);
}
