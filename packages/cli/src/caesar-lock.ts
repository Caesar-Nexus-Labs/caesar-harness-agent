import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOOL_TARGETS } from '@caesar/agents-core';
import { z } from 'zod';
import { UsageError } from './cli-errors.js';

export const PluginLockEntrySchema = z.object({
  name: z.string(),
  version: z.string(),
  source: z.enum(['npm', 'github', 'local']),
  resolved: z.string(),
  integrity: z.string(),
  installedTools: z.array(z.enum(TOOL_TARGETS as any)),
  installedPaths: z.array(z.string()),
  scope: z.enum(['project', 'global']),
  installedAt: z.string(), // ISO 8601
});

export type PluginLockEntry = z.infer<typeof PluginLockEntrySchema>;

export const CaesarLockSchema = z.object({
  lockfileVersion: z.literal(1),
  plugins: z.record(z.string(), PluginLockEntrySchema),
});

export type CaesarLock = z.infer<typeof CaesarLockSchema>;

/** Read the lock file from `dir`. Returns an empty lock if absent. Throws UsageError on invalid schema. */
export function readLock(dir: string): CaesarLock {
  const lockPath = join(dir, 'caesar.lock');
  if (!existsSync(lockPath)) {
    return { lockfileVersion: 1, plugins: {} };
  }

  let content: string;
  try {
    content = readFileSync(lockPath, 'utf8');
  } catch (err: any) {
    throw new UsageError(`Failed to read caesar.lock at ${lockPath}: ${err.message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err: any) {
    throw new UsageError(`Failed to parse caesar.lock as JSON at ${lockPath}: ${err.message}`);
  }

  const result = CaesarLockSchema.safeParse(parsed);
  if (!result.success) {
    throw new UsageError(`Invalid caesar.lock format at ${lockPath}: ${result.error.message}`);
  }

  return result.data;
}

/** Atomically write the lock file to `dir`. */
export function writeLock(dir: string, lock: CaesarLock): void {
  const lockPath = join(dir, 'caesar.lock');
  const tmpPath = join(dir, 'caesar.lock.tmp');

  try {
    writeFileSync(tmpPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    renameSync(tmpPath, lockPath);
  } catch (err: any) {
    throw new UsageError(`Failed to write caesar.lock to ${lockPath}: ${err.message}`);
  }
}

/** Returns the key used in the plugins record. */
function getEntryKey(name: string, version: string, scope: PluginLockEntry['scope']): string {
  return `${name}@${version}|${scope}`;
}

/** Pure function: returns a new lock with the entry added or updated. */
export function addEntry(lock: CaesarLock, entry: PluginLockEntry): CaesarLock {
  const key = getEntryKey(entry.name, entry.version, entry.scope);
  return {
    ...lock,
    plugins: {
      ...lock.plugins,
      [key]: entry,
    },
  };
}

/** Pure function: returns a new lock with the entry removed. */
export function removeEntry(
  lock: CaesarLock,
  name: string,
  version: string,
  scope: PluginLockEntry['scope'],
): CaesarLock {
  const key = getEntryKey(name, version, scope);
  const newPlugins = { ...lock.plugins };
  delete newPlugins[key];

  return {
    ...lock,
    plugins: newPlugins,
  };
}

/** Return an array of all entries, optionally filtered by scope. */
export function listEntries(lock: CaesarLock, scope?: PluginLockEntry['scope']): PluginLockEntry[] {
  const entries = Object.values(lock.plugins);
  if (scope) {
    return entries.filter((e) => e.scope === scope);
  }
  return entries;
}
