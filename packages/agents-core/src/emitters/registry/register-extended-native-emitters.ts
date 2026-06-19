import { geminiOutputValidator } from '../../validation/gemini-output-validator.js';
import { kiloOutputValidator } from '../../validation/kilo-output-validator.js';
import { openhandsOutputValidator } from '../../validation/openhands-output-validator.js';
import { registerOutputValidator } from '../../validation/output-validator-interface.js';
import { registerAggregateEmitter, registerEmitter } from '../core/emitter-interface.js';
import { geminiEmitter } from '../adapters/gemini/gemini-emitter.js';
import { kiloEmitter } from '../adapters/pilot/kilo-emitter.js';
import { openhandsEmitter } from '../adapters/pilot/openhands-emitter.js';

// Wires the EXTENDED native targets (beyond the original 6) into the registries:
//   - openhands → per-agent `.agents/skills/{slug}/SKILL.md`  (inherit-only)
//   - gemini    → per-agent `.gemini/agents/{slug}.md`        (inherit-only)
//   - kilo      → AGGREGATE `.kilocodemodes`                  (real `groups` permission)
//
// Shared single entrypoint so build + validate + the integration gate register the same set.
// Idempotent: register* replace any prior registration. Kept SEPARATE from
// registerNativeEmitters() (the 6) so the original wiring stays untouched (open/closed).

/** Register the extended emitters (gemini + openhands per-agent; kilo aggregate) + validators. */
export function registerExtendedNativeEmitters(): void {
  registerEmitter('openhands', openhandsEmitter);
  registerEmitter('gemini', geminiEmitter);
  registerAggregateEmitter('kilo', kiloEmitter);

  registerOutputValidator('openhands', openhandsOutputValidator);
  registerOutputValidator('gemini', geminiOutputValidator);
  registerOutputValidator('kilo', kiloOutputValidator);
}
