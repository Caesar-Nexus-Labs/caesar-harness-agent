import matter from 'gray-matter';
import { stringify as stringifyYaml } from 'yaml';

// Shared YAML-frontmatter + markdown-body serializer for the MD-based emitters
// (claude, opencode, and future factory/copilot). Emitters build a frontmatter object;
// this module guarantees DETERMINISTIC key order + stable scalar style for snapshots.
//
// Determinism: key order comes from the explicit `keyOrder` array, NOT object insertion
// order — so a refactor of how an emitter assembles its object can never churn snapshots.

/** A frontmatter value we know how to serialize (objects + string arrays allowed). */
export type FrontmatterValue = string | number | boolean | string[] | Record<string, unknown>;

/** lineWidth: 0 disables YAML's soft line folding so long descriptions stay one scalar. */
const YAML_STRINGIFY_OPTS = { lineWidth: 0 } as const;

/** gray-matter engine wired to the `yaml` lib (matches the loader's parse side). */
const GRAY_MATTER_OPTS = {
  engines: {
    yaml: {
      // Parse is unused on the stringify path but required by the engine contract.
      parse: (input: string): object => (matter(`---\n${input}\n---\n`).data as object) ?? {},
      stringify: (obj: object): string => stringifyYaml(obj, YAML_STRINGIFY_OPTS),
    },
  },
} as const;

/**
 * Reorder a frontmatter object into `keyOrder`, dropping `undefined` values so optional
 * fields are omitted rather than emitted as `null`. Keys not in `keyOrder` are dropped.
 */
function orderFrontmatter(
  data: Record<string, FrontmatterValue | undefined>,
  keyOrder: readonly string[],
): Record<string, FrontmatterValue> {
  const ordered: Record<string, FrontmatterValue> = {};
  for (const key of keyOrder) {
    const value = data[key];
    if (value !== undefined) ordered[key] = value;
  }
  return ordered;
}

/**
 * Serialize a frontmatter object + markdown body into a `---`-delimited agent file.
 * Output shape (stable for snapshots):
 *
 *   ---
 *   <yaml in keyOrder>
 *   ---
 *   <blank line>
 *   <trimmed body>
 *   <trailing newline>
 */
export function serializeMarkdownAgent(
  data: Record<string, FrontmatterValue | undefined>,
  keyOrder: readonly string[],
  body: string,
): string {
  const ordered = orderFrontmatter(data, keyOrder);
  // Normalize CRLF/CR → LF so emitted output is byte-identical across OSes (Windows source
  // files + autocrlf otherwise leak \r\n into the body). Leading "\n" = one blank line
  // between frontmatter and body; trim() normalizes body edges.
  const normalizedBody = body.replace(/\r\n?/g, '\n').trim();
  return matter.stringify(`\n${normalizedBody}\n`, ordered, GRAY_MATTER_OPTS);
}
