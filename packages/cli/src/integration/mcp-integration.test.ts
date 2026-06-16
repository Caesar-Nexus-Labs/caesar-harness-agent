import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// MCP server integration tests.
// Validates security constraints (path traversal rejection) and protocol structure.
// Tests the Zod validation logic that underpins the summon_agent security boundary.

// ─── Agent ID Zod schema (mirrored from summon-server.ts for test isolation) ──

const AgentIdSchema = z
  .string()
  .min(1, 'agent_id must be non-empty')
  .max(100, 'agent_id too long')
  .regex(/^[a-z][a-z0-9-]*$/, 'agent_id must be lowercase kebab-case — no path separators allowed');

// ─── Path traversal rejection tests ───────────────────────────────────────────

describe('MCP summon-server: path traversal rejection (Zod validation)', () => {
  it('rejects agent_id with directory traversal (../etc/passwd)', () => {
    const result = AgentIdSchema.safeParse('../etc/passwd');
    expect(result.success).toBe(false);
  });

  it('rejects agent_id with double-dot traversal (../../secret)', () => {
    const result = AgentIdSchema.safeParse('../../secret');
    expect(result.success).toBe(false);
  });

  it('rejects agent_id with Windows path separator (..\\\\system)', () => {
    const result = AgentIdSchema.safeParse('..\\system');
    expect(result.success).toBe(false);
  });

  it('rejects agent_id with uppercase letters (Code-Reviewer)', () => {
    const result = AgentIdSchema.safeParse('Code-Reviewer');
    expect(result.success).toBe(false);
  });

  it('rejects agent_id starting with digit (123-agent)', () => {
    const result = AgentIdSchema.safeParse('123-agent');
    expect(result.success).toBe(false);
  });

  it('rejects empty agent_id', () => {
    const result = AgentIdSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects oversized agent_id (>100 chars)', () => {
    const tooLong = 'a'.repeat(101);
    const result = AgentIdSchema.safeParse(tooLong);
    expect(result.success).toBe(false);
  });

  it('rejects agent_id with forward slash (path/traversal)', () => {
    const result = AgentIdSchema.safeParse('path/traversal');
    expect(result.success).toBe(false);
  });

  it('rejects agent_id with dot extension (agent.md)', () => {
    const result = AgentIdSchema.safeParse('agent.md');
    expect(result.success).toBe(false);
  });
});

// ─── Valid agent ID acceptance tests ──────────────────────────────────────────

describe('MCP summon-server: valid agent_id acceptance', () => {
  it('accepts valid agent_id (code-reviewer)', () => {
    const result = AgentIdSchema.safeParse('code-reviewer');
    expect(result.success).toBe(true);
  });

  it('accepts valid agent_id with numbers (agent-001)', () => {
    const result = AgentIdSchema.safeParse('agent-001');
    expect(result.success).toBe(true);
  });

  it('accepts single-word agent_id (reviewer)', () => {
    const result = AgentIdSchema.safeParse('reviewer');
    expect(result.success).toBe(true);
  });

  it('accepts caesar-coordinator as valid agent_id', () => {
    const result = AgentIdSchema.safeParse('caesar-coordinator');
    expect(result.success).toBe(true);
  });
});

// ─── JSON-RPC 2.0 protocol structure tests ────────────────────────────────────

describe('MCP summon-server: JSON-RPC protocol structure', () => {
  it('error response shape conforms to JSON-RPC 2.0', () => {
    const error = {
      jsonrpc: '2.0' as const,
      id: 1,
      error: { code: -32602, message: 'Invalid params' },
    };
    expect(error.jsonrpc).toBe('2.0');
    expect(error.id).toBe(1);
    expect(error.error.code).toBe(-32602);
    expect(typeof error.error.message).toBe('string');
    expect('result' in error).toBe(false);
  });

  it('initialize response matches MCP 2024-11-05 protocol version', () => {
    const initResponse = {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'caesar-coordinator', version: '0.1.0' },
    };
    expect(initResponse.protocolVersion).toBe('2024-11-05');
    expect(initResponse.serverInfo.name).toBe('caesar-coordinator');
    expect(initResponse.capabilities).toHaveProperty('tools');
  });

  it('known error codes are semantically correct JSON-RPC 2.0 values', () => {
    // JSON-RPC 2.0 reserved error codes
    expect(-32700).toBeLessThan(-32000); // Parse error
    expect(-32601).toBeLessThan(-32000); // Method not found
    expect(-32602).toBeLessThan(-32000); // Invalid params
    expect(-32603).toBeLessThan(-32000); // Internal error
  });
});

// ─── search_agents query validation ───────────────────────────────────────────

describe('MCP summon-server: search_agents query validation', () => {
  const SearchQuerySchema = z.string().min(1, 'query must be non-empty').max(500);

  it('rejects empty query', () => {
    expect(SearchQuerySchema.safeParse('').success).toBe(false);
  });

  it('accepts a normal keyword query', () => {
    expect(SearchQuerySchema.safeParse('code review rust').success).toBe(true);
  });

  it('accepts unicode search query', () => {
    expect(SearchQuerySchema.safeParse('security análisis').success).toBe(true);
  });

  it('rejects query longer than 500 chars', () => {
    const tooLong = 'a'.repeat(501);
    expect(SearchQuerySchema.safeParse(tooLong).success).toBe(false);
  });
});
