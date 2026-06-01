import { claudeOutputValidator } from '../validation/claude-output-validator.js';
import { opencodeOutputValidator } from '../validation/opencode-output-validator.js';
import { registerOutputValidator } from '../validation/output-validator-interface.js';
import { claudeEmitter } from './claude-emitter.js';
import { registerEmitter } from './emitter-interface.js';
import { opencodeEmitter } from './opencode-emitter.js';

// Wires the Phase 04 pilot emitters (claude + opencode) and their output validators into
// the Phase 03 registries. Calling this once enables `transpile(agent, ['claude','opencode'])`.
// Idempotent: registerEmitter/registerOutputValidator replace any prior registration.

/** Register the claude + opencode emitters and their output validators. */
export function registerPilotEmitters(): void {
  registerEmitter('claude', claudeEmitter);
  registerEmitter('opencode', opencodeEmitter);
  registerOutputValidator('claude', claudeOutputValidator);
  registerOutputValidator('opencode', opencodeOutputValidator);
}
