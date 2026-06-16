import { pathToFileURL } from 'node:url';
import { CAESAR_AGENTS_CORE_VERSION } from '@caesar/agents-core';
import { cac } from 'cac';
import { BuildNotFoundError, EXIT_OK, EXIT_USAGE, EXIT_VALIDATION } from './cli-errors.js';
import { runAdd } from './commands/add-command.js';
import { runBuild } from './commands/build-command.js';
import { runInstall } from './commands/install-command.js';
import { runList } from './commands/list-command.js';
import { runRemove } from './commands/remove-command.js';
import { runValidate } from './commands/validate-command.js';
import {
  formatAdd,
  formatBuild,
  formatInstall,
  formatList,
  formatRemove,
  formatValidate,
  toJson,
} from './reporting/cli-reporter.js';

// CLI entry: cac arg parsing + command registration + exit-code mapping. Contains NO transpile
// logic — each action calls a run* command function (which delegates to agents-core) and the
// result is rendered + mapped to an exit code here. Exit contract: 0 ok, 1 fail, 2 usage error.

/** cac collects a repeated flag as string | string[]; normalize to string[] | undefined. */
function toArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

function emit(text: string, stream: NodeJS.WriteStream = process.stdout): void {
  stream.write(`${text}\n`);
}

export function buildCli() {
  const cli = cac('caesar');

  cli
    .command('build', 'Transpile canonical agents into dist/{tool}/ for each target')
    .option('--tool <tool>', 'Target tool (repeatable); default = all targets')
    .option('--category <cat>', 'Category filter NN | NN-name | name (repeatable)')
    .option('--model-provider <provider>', 'Override provider prefix for provider/model-id tools')
    .option('--out <dir>', 'Output root directory (default: <repo>/dist)')
    .option('--root <dir>', 'Repo root containing agents/ (default: auto-detect)')
    .option('--json', 'Emit the raw result as JSON')
    .action((options) => {
      const result = runBuild({
        tool: toArray(options.tool),
        category: toArray(options.category),
        modelProvider: options.modelProvider,
        out: options.out,
        root: options.root,
      });
      emit(options.json ? toJson(result) : formatBuild(result));
      // A parse failure means a canonical source is invalid → validation exit code.
      process.exitCode = result.parseFailures.length > 0 ? EXIT_VALIDATION : EXIT_OK;
    });

  cli
    .command('validate', 'Validate canonical agent sources (schema + body)')
    .option('--strict', 'Also transpile + run output validators in-memory (no write)')
    .option('--root <dir>', 'Repo root containing agents/ (default: auto-detect)')
    .option('--json', 'Emit the raw result as JSON')
    .action((options) => {
      const result = runValidate({ strict: options.strict === true, root: options.root });
      emit(
        options.json ? toJson(result) : formatValidate(result),
        result.ok ? process.stdout : process.stderr,
      );
      process.exitCode = result.ok ? EXIT_OK : EXIT_VALIDATION;
    });

  cli
    .command('install <category>', 'Copy built artifacts for a category into a project')
    .option('--tool <tool>', 'Target tool to install (required)')
    .option('--dest <path>', 'Destination directory (default: current directory)')
    .option('--out <dir>', 'Build output root to read from (default: <repo>/dist)')
    .option('--force', 'Overwrite existing files in the destination')
    .option('--root <dir>', 'Repo root containing agents/ (default: auto-detect)')
    .option('--json', 'Emit the raw result as JSON')
    .action((category: string, options) => {
      const result = runInstall({
        category: String(category),
        tool: options.tool,
        dest: options.dest,
        out: options.out,
        force: options.force === true,
        root: options.root,
      });
      emit(options.json ? toJson(result) : formatInstall(result));
      process.exitCode = EXIT_OK;
    });

  cli
    .command('add <source>', 'Install agent plugin(s) from npm, GitHub, or local path')
    .option('--tool <tool>', 'Target tool (repeatable); default = all')
    .option('--category <cat>', 'Category filter NN | NN-name | name (repeatable)')
    .option('--global, -g', 'Install to user global agent dirs')
    .option('--force', 'Overwrite existing files')
    .option('--dry-run', 'Show what would be installed without writing')
    .option('--json', 'Emit the raw result as JSON')
    .action(async (source: string, options) => {
      const result = await runAdd({
        source: String(source),
        tool: toArray(options.tool),
        category: toArray(options.category),
        global: options.g || options.global,
        force: options.force === true,
        dryRun: options.dryRun === true,
      });
      emit(options.json ? toJson(result) : formatAdd(result));
      process.exitCode = EXIT_OK;
    });

  cli
    .command('remove <name>', 'Remove an installed agent plugin')
    .option('--global, -g', 'Operate on global scope')
    .option('--force', 'Skip error if plugin not found')
    .option('--dry-run', 'Show what would be removed')
    .option('--json', 'Emit the raw result as JSON')
    .action((name: string, options) => {
      const result = runRemove({
        name: String(name),
        global: options.g || options.global,
        force: options.force === true,
        dryRun: options.dryRun === true,
      });
      emit(options.json ? toJson(result) : formatRemove(result));
      process.exitCode = EXIT_OK;
    });

  cli
    .command('list', 'List installed agent plugins')
    .option('--global, -g', 'Show global scope only')
    .option('--all', 'Show both project and global scopes')
    .option('--json', 'Emit result as JSON')
    .action((options) => {
      const result = runList({
        global: options.g || options.global,
        all: options.all,
      });
      emit(options.json ? toJson(result) : formatList(result));
      process.exitCode = EXIT_OK;
    });

  cli.help();
  cli.version(CAESAR_AGENTS_CORE_VERSION);
  return cli;
}

/** Map a thrown error to its exit code, printing a clear message (+ hint) to stderr. */
function reportError(err: unknown): number {
  if (err instanceof BuildNotFoundError) {
    emit(`error: ${err.message}\nhint: ${err.hint}`, process.stderr);
    return err.exitCode;
  }
  if (err !== null && typeof err === 'object' && 'exitCode' in err) {
    const code = (err as { exitCode: unknown }).exitCode;
    const message = err instanceof Error ? err.message : String(err);
    emit(`error: ${message}`, process.stderr);
    return typeof code === 'number' ? code : EXIT_VALIDATION;
  }
  emit(`error: ${err instanceof Error ? err.message : String(err)}`, process.stderr);
  return EXIT_VALIDATION;
}

export function main(argv: readonly string[] = process.argv): void {
  const cli = buildCli();
  try {
    cli.parse([...argv], { run: false });
    // No subcommand (bare `caesar`) → show help, treat as usage error.
    if (cli.matchedCommandName === undefined && !cli.options.help && !cli.options.version) {
      cli.outputHelp();
      process.exitCode = EXIT_USAGE;
      return;
    }
    cli.runMatchedCommand();
  } catch (err) {
    process.exitCode = reportError(err);
  }
}

// Run only when executed as the bin (not when imported by tests).
const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  main();
}
