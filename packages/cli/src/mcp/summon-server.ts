import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { z } from 'zod';

// caesar-coordinator MCP Server — stdio transport.
//
// Provides two tools:
//   search_agents(query)      → Top 5-10 matching agents (metadata only, no full content)
//   summon_agent(agent_id)    → Full markdown content for a specific agent
//
// Security: agent_id is validated by Zod regex whitelisting ([a-z][a-z0-9-]*) to
// prevent directory traversal. All console output goes to stderr so it does not
// corrupt the JSON-RPC stream on stdout.
//
// Transport: stdio (newline-delimited JSON-RPC 2.0 messages).

// ─── Stderr-only logger (critical: never write to stdout in MCP servers) ──────
const log = {
  info: (...args: unknown[]) => process.stderr.write(`[mcp-server] ${args.join(' ')}\n`),
  error: (...args: unknown[]) => process.stderr.write(`[mcp-server:error] ${args.join(' ')}\n`),
};

// ─── Intercept stray console.log → stderr (prevents JSON-RPC corruption) ──────
console.log = (...args: unknown[]) =>
  process.stderr.write(`[captured-log] ${args.map(String).join(' ')}\n`);
console.warn = (...args: unknown[]) =>
  process.stderr.write(`[captured-warn] ${args.map(String).join(' ')}\n`);

// ─── Input validation schemas ──────────────────────────────────────────────────

/** Safe agent ID: lowercase kebab-case, no path separators, no dots. */
const AgentIdSchema = z
  .string()
  .min(1, 'agent_id must be non-empty')
  .max(100, 'agent_id too long')
  .regex(
    /^[a-z][a-z0-9-]*$/,
    'agent_id must be lowercase kebab-case ([a-z][a-z0-9-]*) — no path separators allowed',
  );

const SearchQuerySchema = z.string().min(1, 'query must be non-empty').max(500);

// ─── Agent index (lazy-loaded once from discovery) ────────────────────────────

interface AgentMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  path: string;
}

let agentIndex: AgentMeta[] | null = null;

async function loadAgentIndex(agentsRoot: string): Promise<AgentMeta[]> {
  if (agentIndex !== null) return agentIndex;

  const { discoverAgents, parseAgentFile } = await import('@caesar/agents-core');
  const descriptors = discoverAgents(agentsRoot);

  const agents: AgentMeta[] = [];
  for (const d of descriptors) {
    try {
      const parsed = parseAgentFile(d.path);
      agents.push({
        id: d.slug,
        name: d.slug
          .split('-')
          .map((w: string) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
          .join(' '),
        description: parsed.frontmatter.description,
        category: d.category,
        path: d.path,
      });
    } catch {
      // Skip invalid agent files gracefully — do not crash the server.
    }
  }

  agentIndex = agents;
  log.info(`Loaded ${agentIndex.length} agents into index`);
  return agentIndex;
}

// ─── Tool implementations ──────────────────────────────────────────────────────

/**
 * search_agents: keyword/semantic search over agent metadata.
 * Returns at most 10 results (basic metadata only — no full content to avoid context bloat).
 */
async function searchAgents(
  query: string,
  agentsRoot: string,
): Promise<{ agents: AgentMeta[]; total: number }> {
  const index = await loadAgentIndex(agentsRoot);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = index.map((agent) => {
    const haystack =
      `${agent.id} ${agent.name} ${agent.description} ${agent.category}`.toLowerCase();
    const matchCount = terms.filter((term) => haystack.includes(term)).length;
    return { agent, matchCount };
  });

  const matches = scored
    .filter((s) => s.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount || a.agent.id.localeCompare(b.agent.id))
    .slice(0, 10)
    .map((s) => s.agent);

  return { agents: matches, total: matches.length };
}

/**
 * summon_agent: fetch full agent markdown content by ID.
 * Strictly validates agent_id to prevent directory traversal.
 */
async function summonAgent(
  agentId: string,
  agentsRoot: string,
): Promise<{ id: string; content: string }> {
  // Validate with Zod (rejects ../etc/passwd, ../../, any path separator).
  const parsed = AgentIdSchema.safeParse(agentId);
  if (!parsed.success) {
    throw { code: -32602, message: `Invalid agent_id: ${parsed.error.errors[0]?.message}` };
  }

  const index = await loadAgentIndex(agentsRoot);
  const agent = index.find((a) => a.id === parsed.data);

  if (!agent) {
    throw { code: -32602, message: `Agent not found: ${parsed.data}` };
  }

  // Read from the indexed path (pre-discovered, no user-supplied path joins).
  let content: string;
  try {
    content = await readFile(agent.path, 'utf8');
  } catch (err) {
    throw {
      code: -32603,
      message: `Failed to read agent file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Encapsulate in XML tags to mitigate prompt injection from loaded content.
  return {
    id: parsed.data,
    content: `<agent_instructions id="${parsed.data}">\n${content}\n</agent_instructions>`,
  };
}

// ─── JSON-RPC 2.0 handler ──────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function makeError(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function makeResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

async function handleRequest(
  req: JsonRpcRequest,
  agentsRoot: string,
): Promise<JsonRpcResponse | null> {
  const { id, method, params } = req;

  // MCP initialize handshake.
  if (method === 'initialize') {
    return makeResult(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'caesar-coordinator', version: '0.1.0' },
    });
  }

  // MCP tools/list — advertise available tools.
  if (method === 'tools/list') {
    return makeResult(id, {
      tools: [
        {
          name: 'search_agents',
          description:
            'Search agents by keyword. Returns top 10 matches (metadata only). Always call this before summon_agent to find the correct agent_id.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search keywords (e.g. "code review rust")' },
            },
            required: ['query'],
          },
        },
        {
          name: 'summon_agent',
          description:
            'Load the full instructions for an agent by its exact id. Only call after search_agents confirms the id.',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: {
                type: 'string',
                description: 'Exact agent slug (lowercase kebab-case, e.g. "code-reviewer")',
              },
            },
            required: ['agent_id'],
          },
        },
      ],
    });
  }

  // MCP tools/call — dispatch tool invocations.
  if (method === 'tools/call') {
    const toolParams = params as { name?: string; arguments?: Record<string, unknown> } | undefined;
    const toolName = toolParams?.name;
    const toolArgs = toolParams?.arguments ?? {};

    if (toolName === 'search_agents') {
      const queryResult = SearchQuerySchema.safeParse(toolArgs.query);
      if (!queryResult.success) {
        return makeError(id, -32602, `Invalid query: ${queryResult.error.errors[0]?.message}`);
      }
      try {
        const result = await searchAgents(queryResult.data, agentsRoot);
        return makeResult(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return makeError(id, -32603, `search_agents failed: ${msg}`);
      }
    }

    if (toolName === 'summon_agent') {
      const agentIdRaw = String(toolArgs.agent_id ?? '');
      try {
        const result = await summonAgent(agentIdRaw, agentsRoot);
        return makeResult(id, {
          content: [{ type: 'text', text: result.content }],
        });
      } catch (err) {
        if (typeof err === 'object' && err !== null && 'code' in err) {
          const e = err as { code: number; message: string };
          return makeError(id, e.code, e.message);
        }
        return makeError(id, -32603, `summon_agent failed: ${String(err)}`);
      }
    }

    return makeError(id, -32601, `Unknown tool: ${toolName}`);
  }

  // notifications/initialized — no response needed.
  if (method === 'notifications/initialized') {
    return null;
  }

  return makeError(id, -32601, `Method not found: ${method}`);
}

// ─── Stdio server loop ────────────────────────────────────────────────────────

export async function startMcpServer(agentsRoot: string): Promise<void> {
  log.info('Starting caesar-coordinator MCP server (stdio transport)');

  const rl = createInterface({ input: process.stdin, terminal: false });

  rl.on('line', async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let req: JsonRpcRequest;
    try {
      req = JSON.parse(trimmed) as JsonRpcRequest;
    } catch {
      const errResponse = makeError(null, -32700, 'Parse error: invalid JSON');
      process.stdout.write(JSON.stringify(errResponse) + '\n');
      return;
    }

    try {
      const response = await handleRequest(req, agentsRoot);
      if (response !== null) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (err) {
      log.error('Unhandled error in request handler:', err);
      const errResponse = makeError(req.id ?? null, -32603, 'Internal server error');
      process.stdout.write(JSON.stringify(errResponse) + '\n');
    }
  });

  rl.on('close', () => {
    log.info('stdin closed — shutting down');
    process.exit(0);
  });
}
