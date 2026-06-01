import { agentsMdOutputValidator } from '../validation/agents-md-output-validator.js';
import { registerOutputValidator } from '../validation/output-validator-interface.js';
import { agentsMdEmitter } from './agents-md-emitter.js';
import { registerAggregateEmitter } from './emitter-interface.js';

// Wires the FALLBACK tier into the registries. The aggregate `agents-md` emitter + its
// output validator are registered so `transpileAggregate(agents, ['agents-md'], ctx)` works.
//
// OPT-IN rule emitters (cursor `.mdc`, windsurf, cline) are intentionally NOT registered:
// they target rules-only directories that are not ToolTarget destinations and are activated
// explicitly by the caller (Phase 08 CLI flag), not by default. Importing them here keeps
// the opt-in surface discoverable without turning them on. Idempotent: register* replace.

/** Register the aggregate agents-md emitter + its output validator (opt-in rules stay OFF). */
export function registerFallbackEmitters(): void {
  registerAggregateEmitter('agents-md', agentsMdEmitter);
  registerOutputValidator('agents-md', agentsMdOutputValidator);
}
