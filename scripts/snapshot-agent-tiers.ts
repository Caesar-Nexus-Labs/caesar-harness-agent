// One-shot: snapshot every agent's permission/model/category tier to baseline-tiers.json.
// Used as the regression source-of-truth for the depth-upgrade (Phase C). Re-run only when
// a tier change is intentional. Not part of CI.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverAgents, parseAgentFile } from '@caesar/agents-core';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const agents = discoverAgents(repoRoot);
const out: Record<string, { permission: string; model: string; category: string }> = {};
for (const d of agents) {
  const a = parseAgentFile(d.path);
  out[a.frontmatter.name] = {
    permission: a.frontmatter.permission,
    model: a.frontmatter.model,
    category: a.frontmatter.category,
  };
}
const dest = join(repoRoot, 'packages', 'agents-core', 'src', 'integration', 'baseline-tiers.json');
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log('SNAPSHOT_OK', Object.keys(out).length, '->', dest);
