import { agentSkillsOutputValidator } from '../../validation/agent-skills-output-validator.js';
import { cursorOutputValidator } from '../../validation/cursor-output-validator.js';
import { registerOutputValidator } from '../../validation/output-validator-interface.js';
import { qoderOutputValidator } from '../../validation/qoder-output-validator.js';
import { qwenOutputValidator } from '../../validation/qwen-output-validator.js';
import { a2aCardEmitter } from '../adapters/a2a/a2a-card-emitter.js';
import { claudePluginEmitter } from '../adapters/claude/claude-plugin.js';
import { cursorAgentEmitter } from '../adapters/cursor/cursor-agent-emitter.js';
import { cursorMdcEmitter } from '../adapters/cursor/cursor-mdc.js';
import { geminiExtensionEmitter } from '../adapters/gemini/gemini-extension.js';
import { gooseEmitter } from '../adapters/goose/goose-emitter.js';
import { codexConfigEmitter } from '../adapters/pilot/codex-config-emitter.js';
import { qoderEmitter } from '../adapters/qoder/qoder-emitter.js';
import { qwenEmitter } from '../adapters/qwen/qwen-emitter.js';
import { qwenExtensionEmitter } from '../adapters/qwen/qwen-extension.js';
import { rooYamlEmitter } from '../adapters/roo/roo-yaml.js';
import { agentSkillsEmitter } from '../adapters/skills/agent-skills-emitter.js';
import { registerAggregateEmitter, registerEmitter } from '../core/emitter-interface.js';

// Wires the multi-format plugin and Wave 1 harness targets into the registries:
//   - roo              → AGGREGATE `.roomodes`
//   - cursor           → per-agent `.cursor/agents/{slug}.md` (native subagents)
//   - cursor-mdc       → per-agent `.cursor/rules/{slug}.mdc` (legacy opt-in MDC)
//   - agent-skills     → per-agent `.agents/skills/{slug}/SKILL.md` (agentskills.io)
//   - qoder            → per-agent `.qoder/agents/{slug}.md`
//   - qwen             → per-agent `.qwen/skills/{slug}/SKILL.md`
//   - qwen-extension   → AGGREGATE `qwen-extension.json`
//   - gemini-extension → AGGREGATE `gemini-extension.json`
//   - claude-plugin    → AGGREGATE `.claude-plugin/marketplace.json` + `plugin.json`

/** Register all multi-format plugin & Wave 1 emitters + output validators. */
export function registerMultiFormatEmitters(): void {
  registerAggregateEmitter('roo', rooYamlEmitter);
  registerEmitter('cursor', cursorAgentEmitter);
  registerEmitter('cursor-mdc', cursorMdcEmitter);
  registerEmitter('agent-skills', agentSkillsEmitter);
  registerEmitter('qoder', qoderEmitter);
  registerEmitter('qwen', qwenEmitter);
  registerEmitter('goose', gooseEmitter);
  registerAggregateEmitter('qwen-extension', qwenExtensionEmitter);
  registerAggregateEmitter('gemini-extension', geminiExtensionEmitter);
  registerAggregateEmitter('codex-config', codexConfigEmitter);
  registerAggregateEmitter('a2a-card', a2aCardEmitter);
  registerAggregateEmitter('claude-plugin', claudePluginEmitter);

  registerOutputValidator('cursor', cursorOutputValidator);
  registerOutputValidator('agent-skills', agentSkillsOutputValidator);
  registerOutputValidator('qoder', qoderOutputValidator);
  registerOutputValidator('qwen', qwenOutputValidator);
}
