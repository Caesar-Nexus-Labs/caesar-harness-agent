// @caesar/agents-core — public API surface.

// Native emitters (claude, opencode, kiro, codex, factory, copilot).
export { claudeEmitter } from './emitters/adapters/claude/claude-emitter.js';
// Multi-format plugin emitters (claude-plugin marketplace, roo YAML, cursor MDC).
export {
  claudePluginConfigEmitter,
  claudePluginEmitter,
} from './emitters/adapters/claude/claude-plugin.js';
export { copilotEmitter } from './emitters/adapters/copilot/copilot-emitter.js';
export { cursorMdcEmitter } from './emitters/adapters/cursor/cursor-mdc.js';
// Aggregate fallback emitter (agents-md routing index).
export { agentsMdEmitter } from './emitters/adapters/fallback/agents-md-emitter.js';
export { geminiEmitter } from './emitters/adapters/gemini/gemini-emitter.js';
export { codexEmitter } from './emitters/adapters/pilot/codex-emitter.js';
export { factoryEmitter } from './emitters/adapters/pilot/factory-emitter.js';
export { kiloEmitter } from './emitters/adapters/pilot/kilo-emitter.js';
export { kiroEmitter } from './emitters/adapters/pilot/kiro-emitter.js';
export { opencodeEmitter } from './emitters/adapters/pilot/opencode-emitter.js';
export { openhandsEmitter } from './emitters/adapters/pilot/openhands-emitter.js';
export { rooYamlEmitter } from './emitters/adapters/roo/roo-yaml.js';
// Emitter contract + registry.
export {
  type AggregateEmitter,
  clearAggregateEmitters,
  clearEmitters,
  type EmitContext,
  type EmittedFile,
  type Emitter,
  getAggregateEmitter,
  getEmitter,
  hasAggregateEmitter,
  hasEmitter,
  registerAggregateEmitter,
  registerEmitter,
  registeredAggregateEmitters,
  registeredEmitters,
  unregisterAggregateEmitter,
  unregisterEmitter,
} from './emitters/core/emitter-interface.js';
// Opt-in per-tool rule emitters (rules-only fallback tools; OFF by default).
export {
  type ClineRuleOptions,
  clineRuleEmitter,
} from './emitters/opt-in-rules/cline-rule-emitter.js';
export {
  type CursorRuleOptions,
  cursorRuleEmitter,
} from './emitters/opt-in-rules/cursor-rule-emitter.js';
export type { RuleFile } from './emitters/opt-in-rules/rule-file-shared.js';
export {
  WINDSURF_MAX_CHARS,
  windsurfRuleEmitter,
} from './emitters/opt-in-rules/windsurf-rule-emitter.js';
export { registerExtendedNativeEmitters } from './emitters/registry/register-extended-native-emitters.js';
export { registerFallbackEmitters } from './emitters/registry/register-fallback-emitters.js';
export { registerMultiFormatEmitters } from './emitters/registry/register-multi-format-emitters.js';
export { registerNativeEmitters } from './emitters/registry/register-native-emitters.js';
export { registerPilotEmitters } from './emitters/registry/register-pilot-emitters.js';
export {
  type KiloMode,
  serializeKiloModes,
} from './emitters/serializers/kilo-modes-serializer.js';
export {
  type FrontmatterValue,
  serializeMarkdownAgent,
} from './emitters/serializers/markdown-frontmatter-serializer.js';
// Errors.
export { AgentValidationError } from './errors.js';
export {
  type AgentFileDescriptor,
  discoverAgents,
} from './loader/agent-discovery.js';
// Loader + discovery.
export {
  type CanonicalAgent,
  parseAgentFile,
} from './loader/agent-file-loader.js';
// Field → tool mapping tables.
export {
  type ModelMapOptions,
  type ModelOverrides,
  mapModel,
} from './mapping/model-alias-map.js';
export {
  type ClaudePermission,
  type CodexPermission,
  type FactoryPermission,
  type KiloGroup,
  type KiloPermission,
  mapPermission,
  type OpenCodeAction,
  type OpenCodePermission,
  type PermissionFor,
} from './mapping/permission-map.js';
export {
  getToolTargetMeta,
  isToolTarget,
  TOOL_TARGET_META,
  TOOL_TARGETS,
  type ToolTarget,
  type ToolTargetMeta,
  type ToolTier,
} from './mapping/tool-targets.js';
export { mapTools } from './mapping/tools-map.js';
export {
  type BodyValidationResult,
  REQUIRED_SECTIONS,
  validateBody,
} from './schema/body-section-validator.js';
export {
  type CanonicalAgentFrontmatter,
  CanonicalAgentFrontmatterSchema,
} from './schema/canonical-agent-schema.js';
// Schema + enums (single source of truth).
export * from './schema/enums.js';
// Smoke-test harnesses for emitted agent files.
export {
  type SmokeOptions,
  type SmokeResult,
  smokeTest,
} from './smoke/markdown-agent-smoke-test.js';
export {
  type StructuredFormat,
  type StructuredSmokeOptions,
  type StructuredSmokeResult,
  structuredSmokeTest,
} from './smoke/structured-agent-smoke-test.js';
// Transpile engine.
export {
  type TranspileOptions,
  type TranspileResult,
  TranspileValidationError,
  transpile,
  transpileAggregate,
} from './transpile.js';
// Output validator contract + registry.
export {
  agentsMdOutputValidator,
  makeAgentsMdOutputValidator,
} from './validation/agents-md-output-validator.js';
export { claudeOutputValidator } from './validation/claude-output-validator.js';
export { codexOutputValidator } from './validation/codex-output-validator.js';
export { copilotOutputValidator } from './validation/copilot-output-validator.js';
export { factoryOutputValidator } from './validation/factory-output-validator.js';
export { geminiOutputValidator } from './validation/gemini-output-validator.js';
export { kiloOutputValidator } from './validation/kilo-output-validator.js';
export { kiroOutputValidator } from './validation/kiro-output-validator.js';
export { opencodeOutputValidator } from './validation/opencode-output-validator.js';
export { openhandsOutputValidator } from './validation/openhands-output-validator.js';
export {
  clearOutputValidators,
  getOutputValidator,
  hasOutputValidator,
  type OutputValidator,
  registerOutputValidator,
  unregisterOutputValidator,
  type ValidationResult,
  validationFailed,
  validationOk,
} from './validation/output-validator-interface.js';
export { CAESAR_AGENTS_CORE_VERSION } from './version.js';
// Filesystem sink.
export {
  OutputPathError,
  type WriteOutputsResult,
  writeOutputs,
} from './write-outputs.js';
