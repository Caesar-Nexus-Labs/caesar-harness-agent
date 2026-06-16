import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PluginManifestSchema } from '../packages/cli/src/plugin-manifest-schema.js';

const REPO_ROOT = resolve(process.cwd());
const CAT_DIR = join(REPO_ROOT, 'packages/categories');

function run() {
  if (!existsSync(CAT_DIR)) {
    console.error('No category packages found. Run "pnpm assemble" first.');
    process.exit(1);
  }

  const dirs = readdirSync(CAT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
    
  if (dirs.length === 0) {
    console.error('No category packages found. Run "pnpm assemble" first.');
    process.exit(1);
  }

  const files = dirs.map(d => `packages/categories/${d}/package.json`);

  let failed = false;

  for (const file of files) {
    const fullPath = join(REPO_ROOT, file);
    if (!existsSync(fullPath)) continue;
    try {
      const pkg = JSON.parse(readFileSync(fullPath, 'utf8'));
      if (!pkg.caesar) {
        console.error(`❌ [FAIL] ${file} is missing the "caesar" field.`);
        failed = true;
        continue;
      }
      
      const result = PluginManifestSchema.safeParse(pkg.caesar);
      if (!result.success) {
        console.error(`❌ [FAIL] ${file} has invalid "caesar" field:`);
        console.error(JSON.stringify(result.error.issues, null, 2));
        failed = true;
      } else {
        console.log(`✅ [PASS] ${file} (agentCount: ${result.data.agentCount})`);
      }
    } catch (e: any) {
      console.error(`❌ [FAIL] ${file} could not be parsed: ${e.message}`);
      failed = true;
    }
  }

  if (failed) {
    console.error('\nAssemble check failed! One or more packages have invalid plugin manifests.');
    process.exit(1);
  } else {
    console.log('\nAll assembled packages are valid plugins!');
    process.exit(0);
  }
}

run();
