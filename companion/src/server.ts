/**
 * Zedge Companion HTTP Server (v2.0)
 *
 * localhost:7331 — OpenAI-compatible proxy + compute pool + mesh + superinference + ACP agent + forge
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
import type { ForgeBridge } from './forge-bridge';
import {
  superinferWithPreset,
  getCompositionPreset,
  COMPOSITION_PRESETS,
} from './superinference';
import type { VfsBridge } from './vfs-bridge';
import type { CollabBridge, CollabPresenceUpdate } from './collab-bridge';
import type { KernelBridge } from './kernel-bridge';
import type { CapacitorBridge, ProjectionType, CodeBlock } from './capacitor-bridge';
import { getMarketStatus } from './compute-node';

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

interface ForgeDeployRequestBody {
  project?: string;
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

// --- Bridges (set during server start) ---

let forgeBridge: ForgeBridge | null = null;
let vfsBridge: VfsBridge | null = null;
let collabBridge: CollabBridge | null = null;
let kernelBridge: KernelBridge | null = null;
let capacitorBridge: CapacitorBridge | null = null;

export function setForgeBridge(bridge: ForgeBridge): void {
  forgeBridge = bridge;
}

export function setVfsBridge(bridge: VfsBridge): void {
  vfsBridge = bridge;
}

export function setCollabBridge(bridge: CollabBridge): void {
  collabBridge = bridge;
}

export function setKernelBridge(bridge: KernelBridge): void {
  kernelBridge = bridge;
}

export function setCapacitorBridge(bridge: CapacitorBridge): void {
  capacitorBridge = bridge;
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

  // ==================== Forge (ForgoCD) ====================

  if (path === '/forge/deploy' && req.method === 'POST') {
    if (!forgeBridge) {
      return jsonResponse({ error: 'Forge bridge not initialized' }, 503);
    }
    const body = (await req.json()) as ForgeDeployRequestBody;
    const result = await forgeBridge.deploy(body.project);
    return jsonResponse(result, result.success ? 200 : 400);
  }

  if (path === '/forge/status' && req.method === 'GET') {
    if (!forgeBridge) {
      return jsonResponse({ error: 'Forge bridge not initialized' }, 503);
    }
    return jsonResponse(forgeBridge.getStatus());
  }

  if (path === '/forge/projects' && req.method === 'GET') {
    if (!forgeBridge) {
      return jsonResponse({ error: 'Forge bridge not initialized' }, 503);
    }
    const projects = await forgeBridge.discoverProjects();
    return jsonResponse({
      count: projects.length,
      projects: projects.map((p) => ({
        name: p.name,
        dir: p.dir,
        kind: p.config.kind,
        runtime: p.config.runtime,
        port: p.config.port,
        buildCommand: p.config.buildCommand,
        configSource: p.configSource,
      })),
    });
  }

  if (path.startsWith('/forge/logs/') && req.method === 'GET') {
    if (!forgeBridge) {
      return jsonResponse({ error: 'Forge bridge not initialized' }, 503);
    }
    const processId = path.slice('/forge/logs/'.length);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const line of forgeBridge!.getLogs(processId)) {
          controller.enqueue(encoder.encode(`data: ${line}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (path.startsWith('/forge/stop/') && req.method === 'POST') {
    if (!forgeBridge) {
      return jsonResponse({ error: 'Forge bridge not initialized' }, 503);
    }
    const processId = path.slice('/forge/stop/'.length);
    await forgeBridge.stop(processId);
    return jsonResponse({ stopped: true, processId });
  }

  // ==================== VFS (Phase 2) ====================

  if (path === '/vfs/mount' && req.method === 'POST') {
    if (!vfsBridge) return jsonResponse({ error: 'VFS bridge not initialized' }, 503);
    const body = (await req.json()) as { repoPath?: string; passphrase?: string };
    if (!body.repoPath) return jsonResponse({ error: 'repoPath is required' }, 400);
    const mount = vfsBridge.mount(body.repoPath, body.passphrase);
    return jsonResponse({ id: mount.id, fileCount: mount.files.size, mountedAt: mount.mountedAt });
  }

  if (path.startsWith('/vfs/status/') && req.method === 'GET') {
    if (!vfsBridge) return jsonResponse({ error: 'VFS bridge not initialized' }, 503);
    const mountId = path.slice('/vfs/status/'.length);
    return jsonResponse(vfsBridge.getStatus(mountId));
  }

  if (path === '/vfs/mounts' && req.method === 'GET') {
    if (!vfsBridge) return jsonResponse({ error: 'VFS bridge not initialized' }, 503);
    return jsonResponse(vfsBridge.getMounts().map((m) => ({
      id: m.id, repoPath: m.repoPath, fileCount: m.files.size, peerCount: m.peers.size,
    })));
  }

  if (path === '/vfs/changes' && req.method === 'GET') {
    if (!vfsBridge) return jsonResponse({ error: 'VFS bridge not initialized' }, 503);
    const since = url.searchParams.get('since');
    return jsonResponse(vfsBridge.getChanges(since ? Number(since) : undefined));
  }

  // ==================== Collaborative Editing (Phase 3) ====================

  if (path === '/collab/session' && req.method === 'POST') {
    if (!collabBridge) return jsonResponse({ error: 'Collab bridge not initialized' }, 503);
    const body = (await req.json()) as { filePath?: string; name?: string };
    if (!body.filePath) return jsonResponse({ error: 'filePath is required' }, 400);
    const session = collabBridge.createSession(body.filePath, body.name);
    return jsonResponse({
      id: session.id, name: session.name, hostPeerId: session.hostPeerId,
      filePath: session.filePath, participants: Array.from(session.participants.values()),
    });
  }

  if (path.startsWith('/collab/join/') && req.method === 'POST') {
    if (!collabBridge) return jsonResponse({ error: 'Collab bridge not initialized' }, 503);
    const sessionId = path.slice('/collab/join/'.length);
    const body = (await req.json()) as { peerId?: string; displayName?: string };
    if (!body.peerId || !body.displayName) {
      return jsonResponse({ error: 'peerId and displayName are required' }, 400);
    }
    const participant = collabBridge.joinSession(sessionId, body.peerId, body.displayName);
    if (!participant) return jsonResponse({ error: 'Session not found' }, 404);
    return jsonResponse(participant);
  }

  if (path === '/collab/presence' && req.method === 'POST') {
    if (!collabBridge) return jsonResponse({ error: 'Collab bridge not initialized' }, 503);
    const body = (await req.json()) as CollabPresenceUpdate;
    collabBridge.updatePresence(body);
    return jsonResponse({ updated: true });
  }

  if (path === '/collab/sessions' && req.method === 'GET') {
    if (!collabBridge) return jsonResponse({ error: 'Collab bridge not initialized' }, 503);
    return jsonResponse(collabBridge.listSessions().map((s) => ({
      id: s.id, name: s.name, filePath: s.filePath,
      participantCount: s.participants.size, lastActivity: s.lastActivity,
    })));
  }

  if (path.startsWith('/collab/participants/') && req.method === 'GET') {
    if (!collabBridge) return jsonResponse({ error: 'Collab bridge not initialized' }, 503);
    const sessionId = path.slice('/collab/participants/'.length);
    return jsonResponse(collabBridge.getParticipants(sessionId));
  }

  // ==================== Kernel (Phase 4) ====================

  if (path === '/kernel/commands' && req.method === 'GET') {
    if (!kernelBridge) return jsonResponse({ error: 'Kernel bridge not initialized' }, 503);
    return jsonResponse(kernelBridge.listCommands().map((c) => ({
      id: c.id, label: c.label, description: c.description,
    })));
  }

  if (path === '/kernel/execute' && req.method === 'POST') {
    if (!kernelBridge) return jsonResponse({ error: 'Kernel bridge not initialized' }, 503);
    const body = (await req.json()) as { commandId?: string; payload?: unknown };
    if (!body.commandId) return jsonResponse({ error: 'commandId is required' }, 400);
    try {
      const result = await kernelBridge.executeCommand(body.commandId, body.payload);
      return jsonResponse({ success: true, result });
    } catch (err) {
      return jsonResponse({ success: false, error: String(err) }, 400);
    }
  }

  if (path === '/kernel/route' && req.method === 'POST') {
    if (!kernelBridge) return jsonResponse({ error: 'Kernel bridge not initialized' }, 503);
    const body = (await req.json()) as { task?: string; taskType?: string };
    if (!body.task) return jsonResponse({ error: 'task is required' }, 400);
    return jsonResponse(kernelBridge.routeTask(body.task, body.taskType));
  }

  if (path === '/kernel/daemons' && req.method === 'GET') {
    if (!kernelBridge) return jsonResponse({ error: 'Kernel bridge not initialized' }, 503);
    return jsonResponse(kernelBridge.getDaemonStatus());
  }

  if (path === '/kernel/plugins' && req.method === 'GET') {
    if (!kernelBridge) return jsonResponse({ error: 'Kernel bridge not initialized' }, 503);
    return jsonResponse(kernelBridge.getPlugins());
  }

  if (path === '/kernel/flight-log' && req.method === 'GET') {
    if (!kernelBridge) return jsonResponse({ error: 'Kernel bridge not initialized' }, 503);
    const limit = url.searchParams.get('limit');
    return jsonResponse(kernelBridge.getFlightLog(limit ? Number(limit) : 50));
  }

  if (path === '/kernel/deep-link' && req.method === 'POST') {
    if (!kernelBridge) return jsonResponse({ error: 'Kernel bridge not initialized' }, 503);
    const body = (await req.json()) as { url?: string };
    if (!body.url) return jsonResponse({ error: 'url is required' }, 400);
    const parsed = kernelBridge.parseDeepLink(body.url);
    if (!parsed) return jsonResponse({ error: 'Invalid deep link' }, 400);
    return jsonResponse(parsed);
  }

  // ==================== Capacitor (Phase 5) ====================

  if (path === '/capacitor/mount' && req.method === 'POST') {
    if (!capacitorBridge) return jsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const body = (await req.json()) as { path?: string; projection?: ProjectionType };
    if (!body.path) return jsonResponse({ error: 'path is required' }, 400);
    const mount = capacitorBridge.mount(body.path, body.projection);
    return jsonResponse({ id: mount.id, path: mount.path, projection: mount.projection });
  }

  if (path.startsWith('/capacitor/layout/') && req.method === 'GET') {
    if (!capacitorBridge) return jsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const mountId = path.slice('/capacitor/layout/'.length);
    return jsonResponse(capacitorBridge.getLayout(mountId));
  }

  if (path === '/capacitor/personalize' && req.method === 'POST') {
    if (!capacitorBridge) return jsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const body = (await req.json()) as { developerId?: string; preferences?: Record<string, unknown>; recentFiles?: string[]; focusArea?: string };
    if (!body.developerId) return jsonResponse({ error: 'developerId is required' }, 400);
    capacitorBridge.personalize({
      developerId: body.developerId,
      preferences: body.preferences ?? {},
      recentFiles: body.recentFiles ?? [],
      focusArea: body.focusArea,
    });
    return jsonResponse({ personalized: true });
  }

  if (path.startsWith('/capacitor/graph/') && req.method === 'GET') {
    if (!capacitorBridge) return jsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const mountId = path.slice('/capacitor/graph/'.length);
    return jsonResponse(capacitorBridge.getClusters(mountId));
  }

  if (path === '/capacitor/project' && req.method === 'POST') {
    if (!capacitorBridge) return jsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const body = (await req.json()) as { mountId?: string; projection?: ProjectionType };
    if (!body.mountId || !body.projection) {
      return jsonResponse({ error: 'mountId and projection are required' }, 400);
    }
    capacitorBridge.setProjection(body.mountId, body.projection);
    return jsonResponse({ projection: body.projection });
  }

  if (path === '/capacitor/index' && req.method === 'POST') {
    if (!capacitorBridge) return jsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const body = (await req.json()) as { mountId?: string; block?: CodeBlock };
    if (!body.mountId || !body.block) {
      return jsonResponse({ error: 'mountId and block are required' }, 400);
    }
    capacitorBridge.indexBlock(body.mountId, body.block);
    return jsonResponse({ indexed: true, blockId: body.block.id });
  }

  // ==================== Superinference 2.0 (Phase 6) ====================

  if (path === '/v1/superinference/preset' && req.method === 'POST') {
    const body = (await req.json()) as {
      preset?: string;
      messages?: Array<{ role: string; content: string }>;
      timeout_ms?: number;
      max_tokens?: number;
    };
    if (!body.preset) return jsonResponse({ error: 'preset is required' }, 400);
    const preset = getCompositionPreset(body.preset);
    if (!preset) {
      return jsonResponse({
        error: `Unknown preset: ${body.preset}. Available: ${Object.keys(COMPOSITION_PRESETS).join(', ')}`,
      }, 400);
    }
    const result = await superinferWithPreset(
      preset,
      (body.messages ?? []) as ChatCompletionRequest['messages'],
      { timeoutMs: body.timeout_ms, maxTokens: body.max_tokens }
    );
    return jsonResponse(result);
  }

  if (path === '/v1/superinference/presets' && req.method === 'GET') {
    return jsonResponse(
      Object.entries(COMPOSITION_PRESETS).map(([key, p]) => ({
        key,
        name: p.name,
        description: p.description,
        models: p.models,
        strategy: p.strategy,
      }))
    );
  }

  // ==================== Compute Market 2.0 (Phase 8) ====================

  if (path === '/market/status' && req.method === 'GET') {
    return jsonResponse(getMarketStatus());
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

export function startServer(): void {
  const port = getCompanionPort();

  Bun.serve({
    port,
    fetch: handleRequest,
  });

  console.log(`[zedge] Companion sidecar v2.0 on http://localhost:${port}`);
  console.log(`[zedge] OpenAI-compatible API: http://localhost:${port}/v1`);
  console.log(`[zedge] Superinference: POST http://localhost:${port}/v1/superinference`);
  console.log(`[zedge] Mesh: http://localhost:${port}/mesh/status`);
  console.log(`[zedge] Agent: POST http://localhost:${port}/agent/session`);
  console.log(`[zedge] Forge: http://localhost:${port}/forge/status`);
  console.log(`[zedge] Health: http://localhost:${port}/health`);
}
