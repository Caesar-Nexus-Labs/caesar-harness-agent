import { claudeOutputValidator } from '../../validation/claude-output-validator.js';
import { codexOutputValidator } from '../../validation/codex-output-validator.js';
import { copilotOutputValidator } from '../../validation/copilot-output-validator.js';
import { factoryOutputValidator } from '../../validation/factory-output-validator.js';
import { kiroOutputValidator } from '../../validation/kiro-output-validator.js';
import { opencodeOutputValidator } from '../../validation/opencode-output-validator.js';
import { registerOutputValidator } from '../../validation/output-validator-interface.js';
import { claudeEmitter } from '../adapters/claude/claude-emitter.js';
import { copilotEmitter } from '../adapters/copilot/copilot-emitter.js';
import { codexEmitter } from '../adapters/pilot/codex-emitter.js';
import { factoryEmitter } from '../adapters/pilot/factory-emitter.js';
import { kiroEmitter } from '../adapters/pilot/kiro-emitter.js';
import { opencodeEmitter } from '../adapters/pilot/opencode-emitter.js';
import { registerEmitter } from '../core/emitter-interface.js';

// Wires ALL 6 native emitters (claude, opencode, kiro, codex, factory, copilot) and their
// output validators into the Phase 03 registries. Calling this once enables
// `transpile(agent, [...native tools])`. Idempotent: register* replace any prior registration.
//
// The engine itself is unchanged (open/closed) — adding a tool is purely a registry wiring +
// mapping-column change, never an engine change.

/** Register all 6 native emitters + their output validators. */
export function registerNativeEmitters(): void {
  registerEmitter('claude', claudeEmitter);
  registerEmitter('opencode', opencodeEmitter);
  registerEmitter('kiro', kiroEmitter);
  registerEmitter('codex', codexEmitter);
  registerEmitter('factory', factoryEmitter);
  registerEmitter('copilot', copilotEmitter);

  registerOutputValidator('claude', claudeOutputValidator);
  registerOutputValidator('opencode', opencodeOutputValidator);
  registerOutputValidator('kiro', kiroOutputValidator);
  registerOutputValidator('codex', codexOutputValidator);
  registerOutputValidator('factory', factoryOutputValidator);
  registerOutputValidator('copilot', copilotOutputValidator);
}
