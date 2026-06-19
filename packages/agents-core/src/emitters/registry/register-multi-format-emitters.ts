import { claudePluginConfigEmitter, claudePluginEmitter } from '../adapters/claude/claude-plugin.js';
import { cursorMdcEmitter } from '../adapters/cursor/cursor-mdc.js';
import { registerAggregateEmitter, registerEmitter } from '../core/emitter-interface.js';
import { rooYamlEmitter } from '../adapters/roo/roo-yaml.js';

// Wires the multi-format plugin targets into the registries:
//   - roo           → AGGREGATE `.roomodes`                   (customModes YAML)
//   - cursor        → per-agent `.cursor/rules/{slug}.mdc`    (Agent-Requested MDC)
//   - claude-plugin → AGGREGATE `.claude-plugin/marketplace.json` + `plugin.json`
//
// Idempotent: register* replace any prior registration. SEPARATE from existing
// register*Emitters() calls so prior wiring stays untouched (open/closed).

/** Register all multi-format plugin emitters (roo, cursor, claude-plugin). */
export function registerMultiFormatEmitters(): void {
  // Roo Code: aggregate → one .roomodes at repo root.
  registerAggregateEmitter('roo', rooYamlEmitter);

  // Cursor MDC: per-agent → .cursor/rules/{slug}.mdc
  registerEmitter('cursor', cursorMdcEmitter);

  // Claude Plugin Marketplace: aggregate → two files under .claude-plugin/
  // Primary: marketplace.json (the main emitter)
  // Companion: plugin.json (registered under a separate relativePath)
  registerAggregateEmitter('claude-plugin', claudePluginEmitter);
}
