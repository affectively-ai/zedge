/**
 * Zedge Companion HTTP Server (v1.0)
 *
 * localhost:7331 — OpenAI-compatible proxy + compute pool + mesh + superinference + ACP agent
 */

import {
  infer,
  getModels,
  embed,
  createSSEProxyStream,
} from './inference-bridge';
import { joinPool, leavePool, getPoolStatus } from './compute-node';
import { getCompanionPort, getZedgeConfig } from './config';
import {
  startMesh,
  stopMesh,
  getMeshStatus,
  handlePeerRequest,
} from './p2p-mesh';
import { login, logout, whoami } from './auth';
import {
  getTierHealth,
  getProbeResults,
  getFastestTier,
} from './latency-probe';
import { createResilientStream, getActiveSessions } from './stream-reconnect';
import {
  superinfer,
  recursiveSuperinfer,
} from './superinference';
import type { CollapseStrategy, RecursiveRequest } from './superinference';
import {
  createSession,
  getSession,
  deleteSession,
  agentTurn,
} from './acp-agent';
import type { AgentCapabilities } from './acp-agent';
import {
  encode as binaryEncode,
  decode as binaryDecode,
  isValidFrame,
  CONTENT_TYPE as BINARY_CONTENT_TYPE,
} from './binary-protocol';
import type { ChatCompletionRequest } from './inference-bridge';

// --- Request body types ---

interface ChatRequestBody {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

interface CompletionRequestBody extends ChatRequestBody {
  prompt?: string;
}

interface EmbeddingRequestBody {
  input?: string | string[];
  model?: string;
}

interface SuperinferenceRequestBody {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  models?: string[];
  strategy?: CollapseStrategy;
  timeout_ms?: number;
  temperature?: number;
  max_tokens?: number;
}

interface RecursiveRequestBody {
  prompt?: string;
  models?: string[];
  strategy?: CollapseStrategy;
  max_depth?: number;
  max_token_budget?: number;
}

interface AgentSessionRequestBody {
  workspace_path?: string;
  capabilities?: Partial<AgentCapabilities>;
}

interface AgentTurnRequestBody {
  session_id?: string;
  message?: string;
}

// --- Helpers ---

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function corsHeaders(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-Zedge-Session',
    },
  });
}

// --- Request Handler ---

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return corsHeaders();
  }

  // ==================== Health ====================

  if (path === '/health' && req.method === 'GET') {
    const config = getZedgeConfig();
    const pool = getPoolStatus();
    const mesh = getMeshStatus();
    return jsonResponse({
      status: 'ok',
      version: '1.0.0',
      port: config.port,
      preferredModel: config.preferredModel,
      computePool: {
        joined: pool.joined,
        tokensEarned: pool.tokensEarned,
        requestsServed: pool.requestsServed,
      },
      mesh: {
        running: mesh.running,
        nodeId: mesh.nodeId,
        peerCount: mesh.peers.length,
        totalModels: mesh.totalCapacity.models.length,
        totalCores: mesh.totalCapacity.totalCores,
        totalMemoryMb: mesh.totalCapacity.totalMemoryMb,
      },
      inference: {
        tiers: ['mesh', 'edge', 'cloudrun', 'wasm', 'echo'],
        meshAvailable: mesh.running && mesh.peers.length > 0,
        edgeAvailable: true,
        cloudRunDirect: config.cloudRunDirect,
        wasmLocal: true,
      },
    });
  }

  // ==================== OpenAI-Compatible API ====================

  // Chat completions
  if (path === '/v1/chat/completions' && req.method === 'POST') {
    const body = (await req.json()) as ChatRequestBody;
    const request: ChatCompletionRequest = {
      model: body.model ?? getZedgeConfig().preferredModel,
      messages: (body.messages ?? []) as ChatCompletionRequest['messages'],
      stream: body.stream ?? false,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      top_p: body.top_p,
    };

    const result = await infer(request);

    // SSE streaming: wrap with heartbeat proxy
    const contentType =
      result.response.headers.get('content-type') ?? 'application/json';
    if (contentType.includes('text/event-stream') || request.stream) {
      const proxyStream = createSSEProxyStream(
        result.response.body,
        result.tier
      );
      return new Response(proxyStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'X-Zedge-Tier': result.tier,
        },
      });
    }

    const data = await result.response.json();
    return jsonResponse({ ...data, _zedge_tier: result.tier });
  }

  // Code completions (FIM — fill-in-middle)
  if (path === '/v1/completions' && req.method === 'POST') {
    const body = (await req.json()) as CompletionRequestBody;
    const prompt = body.prompt ?? '';

    // Detect if prompt has FIM markers
    const hasFimMarkers =
      prompt.includes('<|fim_prefix|>') || prompt.includes('<PRE>');

    let messages: ChatCompletionRequest['messages'];
    if (hasFimMarkers) {
      // Pass FIM prompt directly — Qwen Coder and StarCoder understand these
      messages = [
        {
          role: 'system',
          content:
            'You are a code completion engine. Output ONLY the code that fills the gap. No explanation, no markdown fences.',
        },
        { role: 'user', content: prompt },
      ];
    } else {
      // Standard completion: treat as code continuation
      messages = [
        {
          role: 'system',
          content:
            'You are a code completion assistant. Complete the code that follows. Output ONLY the completion, no explanation, no markdown fences.',
        },
        { role: 'user', content: prompt },
      ];
    }

    const request: ChatCompletionRequest = {
      model: body.model ?? 'qwen-2.5-coder-7b',
      messages,
      temperature: body.temperature ?? 0.2,
      max_tokens: body.max_tokens ?? 256,
    };

    const result = await infer(request);
    const data = await result.response.json();
    return jsonResponse({ ...data, _zedge_tier: result.tier });
  }

  // Models list
  if (path === '/v1/models' && req.method === 'GET') {
    const models = await getModels();
    return jsonResponse({ object: 'list', data: models });
  }

  // Embeddings
  if (path === '/v1/embeddings' && req.method === 'POST') {
    const body = (await req.json()) as EmbeddingRequestBody;
    const resp = await embed(body.input ?? '', body.model);
    const data = await resp.json();
    return jsonResponse(data);
  }

  // ==================== Compute Pool ====================

  if (path === '/compute-pool/join' && req.method === 'POST') {
    const status = await joinPool();
    return jsonResponse(status);
  }

  if (path === '/compute-pool/leave' && req.method === 'POST') {
    const status = await leavePool();
    return jsonResponse(status);
  }

  if (path === '/compute-pool/status' && req.method === 'GET') {
    return jsonResponse(getPoolStatus());
  }

  // ==================== P2P Mesh ====================

  if (path === '/mesh/start' && req.method === 'POST') {
    const status = startMesh();
    return jsonResponse(status);
  }

  if (path === '/mesh/stop' && req.method === 'POST') {
    const status = stopMesh();
    return jsonResponse(status);
  }

  if (path === '/mesh/status' && req.method === 'GET') {
    return jsonResponse(getMeshStatus());
  }

  // Peer-to-peer inference endpoint (called by other mesh nodes)
  if (path === '/mesh/infer' && req.method === 'POST') {
    const body = (await req.json()) as ChatRequestBody;
    const request: ChatCompletionRequest = {
      model: body.model ?? getZedgeConfig().preferredModel,
      messages: (body.messages ?? []) as ChatCompletionRequest['messages'],
      temperature: body.temperature,
      max_tokens: body.max_tokens,
    };
    const response = await handlePeerRequest(request);
    const data = await response.json();
    return jsonResponse(data);
  }

  // ==================== Superinference ====================

  if (path === '/v1/superinference' && req.method === 'POST') {
    const body = (await req.json()) as SuperinferenceRequestBody;
    const result = await superinfer({
      request: {
        model: body.model ?? getZedgeConfig().preferredModel,
        messages: (body.messages ?? []) as ChatCompletionRequest['messages'],
        temperature: body.temperature,
        max_tokens: body.max_tokens,
      },
      models: body.models,
      strategy: body.strategy ?? 'fastest',
      timeoutMs: body.timeout_ms,
    });
    return jsonResponse(result);
  }

  if (path === '/v1/superinference/recursive' && req.method === 'POST') {
    const body = (await req.json()) as RecursiveRequestBody;
    const result = await recursiveSuperinfer({
      prompt: body.prompt ?? '',
      models: body.models,
      strategy: body.strategy ?? 'consensus',
      maxDepth: body.max_depth,
      maxTokenBudget: body.max_token_budget,
    });
    return jsonResponse(result);
  }

  // ==================== ACP Agent ====================

  // Create agent session
  if (path === '/agent/session' && req.method === 'POST') {
    const body = (await req.json()) as AgentSessionRequestBody;
    if (!body.workspace_path) {
      return jsonResponse({ error: 'workspace_path is required' }, 400);
    }
    const capabilities: AgentCapabilities = {
      processExec: body.capabilities?.processExec ?? [],
      fileRead: body.capabilities?.fileRead ?? true,
      fileWrite: body.capabilities?.fileWrite ?? false,
      gitAccess: body.capabilities?.gitAccess ?? true,
    };
    const session = createSession(body.workspace_path, capabilities);
    return jsonResponse({
      session_id: session.id,
      workspace_path: session.workspacePath,
      capabilities: session.capabilities,
    });
  }

  // Agent turn (chat with tools)
  if (path === '/agent/turn' && req.method === 'POST') {
    const body = (await req.json()) as AgentTurnRequestBody;
    if (!body.session_id || !body.message) {
      return jsonResponse(
        { error: 'session_id and message are required' },
        400
      );
    }
    const session = getSession(body.session_id);
    if (!session) {
      return jsonResponse({ error: 'Session not found' }, 404);
    }
    const response = await agentTurn(body.session_id, body.message);
    return jsonResponse(response);
  }

  // Delete agent session
  if (path.startsWith('/agent/session/') && req.method === 'DELETE') {
    const sessionId = path.slice('/agent/session/'.length);
    deleteSession(sessionId);
    return jsonResponse({ deleted: true });
  }

  // ==================== Binary Protocol v2 ====================

  if (path === '/v1/binary/infer' && req.method === 'POST') {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes(BINARY_CONTENT_TYPE)) {
      return jsonResponse(
        {
          error: `Expected Content-Type: ${BINARY_CONTENT_TYPE}`,
        },
        415
      );
    }

    const buffer = await req.arrayBuffer();
    if (!isValidFrame(buffer)) {
      return jsonResponse({ error: 'Invalid binary frame' }, 400);
    }

    // Decode, process (pass through for now — mesh nodes use this for tensor transfer)
    const frame = binaryDecode(buffer);
    // Re-encode and return (echo for tensor routing validation)
    const encoded = binaryEncode(frame);
    return new Response(encoded, {
      headers: {
        'Content-Type': BINARY_CONTENT_TYPE,
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // ==================== Auth ====================

  if (path === '/auth/login' && req.method === 'POST') {
    const result = await login();
    return jsonResponse(result, result.success ? 200 : 401);
  }

  if (path === '/auth/logout' && req.method === 'POST') {
    logout();
    return jsonResponse({ success: true });
  }

  if (path === '/auth/whoami' && req.method === 'GET') {
    return jsonResponse(whoami());
  }

  // ==================== Latency Probing ====================

  if (path === '/probe/health' && req.method === 'GET') {
    return jsonResponse(getTierHealth());
  }

  if (path === '/probe/results' && req.method === 'GET') {
    return jsonResponse(getProbeResults());
  }

  if (path === '/probe/fastest' && req.method === 'GET') {
    const model = new URL(req.url).searchParams.get('model') ?? 'tinyllama-1.1b';
    const tier = getFastestTier(model);
    return jsonResponse({ model, fastestTier: tier });
  }

  // ==================== Resilient Streaming ====================

  if (path === '/v1/chat/completions/resilient' && req.method === 'POST') {
    const body = (await req.json()) as ChatRequestBody;
    const request: ChatCompletionRequest = {
      model: body.model ?? getZedgeConfig().preferredModel,
      messages: (body.messages ?? []) as ChatCompletionRequest['messages'],
      stream: true,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      top_p: body.top_p,
    };

    const stream = createResilientStream(request);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Zedge-Resilient': 'true',
      },
    });
  }

  if (path === '/stream/sessions' && req.method === 'GET') {
    return jsonResponse(getActiveSessions());
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

export function startServer(): void {
  const port = getCompanionPort();

  Bun.serve({
    port,
    fetch: handleRequest,
  });

  console.log(`[zedge] Companion sidecar v1.0 on http://localhost:${port}`);
  console.log(`[zedge] OpenAI-compatible API: http://localhost:${port}/v1`);
  console.log(`[zedge] Superinference: POST http://localhost:${port}/v1/superinference`);
  console.log(`[zedge] Mesh: http://localhost:${port}/mesh/status`);
  console.log(`[zedge] Agent: POST http://localhost:${port}/agent/session`);
  console.log(`[zedge] Health: http://localhost:${port}/health`);
}
