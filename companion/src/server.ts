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
import type { CrdtBridge } from './crdt-bridge';
import { generateInvite, parseRoomUcan, isRoomUcanExpired } from './ucan-scope';
import type { ZedgeAccessMode } from './ucan-scope';
import type { UcanBridge, AgentMode } from './ucan-bridge';
import type { UcanCapability } from '@affectively/auth';
import { AgentParticipant } from './agent-participant';
import type { AgentEdit, AgentReplacement } from './agent-participant';
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

function deprecatedJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Deprecated': 'Use /crdt/* endpoints instead',
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
let crdtBridge: CrdtBridge | null = null;
let ucanBridge: UcanBridge | null = null;
const agentParticipants = new Map<string, AgentParticipant>();

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

export function setCrdtBridge(bridge: CrdtBridge): void {
  crdtBridge = bridge;
}

export function setUcanBridge(bridge: UcanBridge): void {
  ucanBridge = bridge;
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
      version: '2.0.0',
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
      ghostwriter: {
        crdt: crdtBridge?.getStatus() ?? null,
        ucan: ucanBridge?.getStatus() ?? null,
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
    if (!collabBridge) return deprecatedJsonResponse({ error: 'Collab bridge not initialized' }, 503);
    const body = (await req.json()) as { filePath?: string; name?: string };
    if (!body.filePath) return deprecatedJsonResponse({ error: 'filePath is required' }, 400);
    const session = collabBridge.createSession(body.filePath, body.name);
    return deprecatedJsonResponse({
      id: session.id, name: session.name, hostPeerId: session.hostPeerId,
      filePath: session.filePath, participants: Array.from(session.participants.values()),
    });
  }

  if (path.startsWith('/collab/join/') && req.method === 'POST') {
    if (!collabBridge) return deprecatedJsonResponse({ error: 'Collab bridge not initialized' }, 503);
    const sessionId = path.slice('/collab/join/'.length);
    const body = (await req.json()) as { peerId?: string; displayName?: string };
    if (!body.peerId || !body.displayName) {
      return deprecatedJsonResponse({ error: 'peerId and displayName are required' }, 400);
    }
    const participant = collabBridge.joinSession(sessionId, body.peerId, body.displayName);
    if (!participant) return deprecatedJsonResponse({ error: 'Session not found' }, 404);
    return deprecatedJsonResponse(participant);
  }

  if (path === '/collab/presence' && req.method === 'POST') {
    if (!collabBridge) return deprecatedJsonResponse({ error: 'Collab bridge not initialized' }, 503);
    const body = (await req.json()) as CollabPresenceUpdate;
    collabBridge.updatePresence(body);
    return deprecatedJsonResponse({ updated: true });
  }

  if (path === '/collab/sessions' && req.method === 'GET') {
    if (!collabBridge) return deprecatedJsonResponse({ error: 'Collab bridge not initialized' }, 503);
    return deprecatedJsonResponse(collabBridge.listSessions().map((s) => ({
      id: s.id, name: s.name, filePath: s.filePath,
      participantCount: s.participants.size, lastActivity: s.lastActivity,
    })));
  }

  if (path.startsWith('/collab/participants/') && req.method === 'GET') {
    if (!collabBridge) return deprecatedJsonResponse({ error: 'Collab bridge not initialized' }, 503);
    const sessionId = path.slice('/collab/participants/'.length);
    return deprecatedJsonResponse(collabBridge.getParticipants(sessionId));
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
    if (!capacitorBridge) return deprecatedJsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const body = (await req.json()) as { path?: string; projection?: ProjectionType };
    if (!body.path) return deprecatedJsonResponse({ error: 'path is required' }, 400);
    const mount = capacitorBridge.mount(body.path, body.projection);
    return deprecatedJsonResponse({ id: mount.id, path: mount.path, projection: mount.projection });
  }

  if (path.startsWith('/capacitor/layout/') && req.method === 'GET') {
    if (!capacitorBridge) return deprecatedJsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const mountId = path.slice('/capacitor/layout/'.length);
    return deprecatedJsonResponse(capacitorBridge.getLayout(mountId));
  }

  if (path === '/capacitor/personalize' && req.method === 'POST') {
    if (!capacitorBridge) return deprecatedJsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const body = (await req.json()) as { developerId?: string; preferences?: Record<string, unknown>; recentFiles?: string[]; focusArea?: string };
    if (!body.developerId) return deprecatedJsonResponse({ error: 'developerId is required' }, 400);
    capacitorBridge.personalize({
      developerId: body.developerId,
      preferences: body.preferences ?? {},
      recentFiles: body.recentFiles ?? [],
      focusArea: body.focusArea,
    });
    return deprecatedJsonResponse({ personalized: true });
  }

  if (path.startsWith('/capacitor/graph/') && req.method === 'GET') {
    if (!capacitorBridge) return deprecatedJsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const mountId = path.slice('/capacitor/graph/'.length);
    return deprecatedJsonResponse(capacitorBridge.getClusters(mountId));
  }

  if (path === '/capacitor/project' && req.method === 'POST') {
    if (!capacitorBridge) return deprecatedJsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const body = (await req.json()) as { mountId?: string; projection?: ProjectionType };
    if (!body.mountId || !body.projection) {
      return deprecatedJsonResponse({ error: 'mountId and projection are required' }, 400);
    }
    capacitorBridge.setProjection(body.mountId, body.projection);
    return deprecatedJsonResponse({ projection: body.projection });
  }

  if (path === '/capacitor/index' && req.method === 'POST') {
    if (!capacitorBridge) return deprecatedJsonResponse({ error: 'Capacitor bridge not initialized' }, 503);
    const body = (await req.json()) as { mountId?: string; block?: CodeBlock };
    if (!body.mountId || !body.block) {
      return deprecatedJsonResponse({ error: 'mountId and block are required' }, 400);
    }
    capacitorBridge.indexBlock(body.mountId, body.block);
    return deprecatedJsonResponse({ indexed: true, blockId: body.block.id });
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

  // ==================== Ghostwriter CRDT (Zedge 3.0) ====================

  if (path === '/crdt/status' && req.method === 'GET') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    return jsonResponse(crdtBridge.getStatus());
  }

  if (path === '/crdt/open' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as { path?: string; initialContent?: string };
    if (!body.path) return jsonResponse({ error: 'path is required' }, 400);
    const handle = await crdtBridge.openFile(body.path, body.initialContent);
    return jsonResponse({
      path: handle.path,
      contentLength: handle.content.length,
      cursors: Array.from(handle.cursors.values()),
    });
  }

  if (path === '/crdt/close' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as { path?: string };
    if (!body.path) return jsonResponse({ error: 'path is required' }, 400);
    crdtBridge.closeFile(body.path);
    return jsonResponse({ closed: true, path: body.path });
  }

  if (path === '/crdt/files' && req.method === 'GET') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    return jsonResponse(crdtBridge.getOpenFiles());
  }

  if (path === '/crdt/cursor' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as { path?: string; line?: number; col?: number };
    if (!body.path || body.line === undefined || body.col === undefined) {
      return jsonResponse({ error: 'path, line, and col are required' }, 400);
    }
    crdtBridge.updateCursor(body.path, body.line, body.col);
    return jsonResponse({ updated: true });
  }

  if (path === '/crdt/selection' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as {
      path?: string; startLine?: number; startCol?: number; endLine?: number; endCol?: number;
    };
    if (!body.path || body.startLine === undefined || body.startCol === undefined ||
        body.endLine === undefined || body.endCol === undefined) {
      return jsonResponse({ error: 'path, startLine, startCol, endLine, endCol are required' }, 400);
    }
    crdtBridge.updateSelection(body.path, body.startLine, body.startCol, body.endLine, body.endCol);
    return jsonResponse({ updated: true });
  }

  if (path === '/crdt/cursors' && req.method === 'GET') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const filePath = url.searchParams.get('path');
    if (!filePath) return jsonResponse({ error: 'path query param is required' }, 400);
    return jsonResponse(crdtBridge.getCursors(filePath));
  }

  if (path === '/crdt/diagnostics' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as {
      path?: string;
      diagnostics?: Array<{ filePath: string; line: number; column: number; severity: string; message: string; source: string }>;
    };
    if (!body.path || !body.diagnostics) {
      return jsonResponse({ error: 'path and diagnostics are required' }, 400);
    }
    crdtBridge.shareDiagnostics(body.path, body.diagnostics as Parameters<typeof crdtBridge.shareDiagnostics>[1]);
    return jsonResponse({ shared: true, count: body.diagnostics.length });
  }

  if (path === '/crdt/diagnostics' && req.method === 'GET') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const filePath = url.searchParams.get('path');
    if (!filePath) return jsonResponse({ error: 'path query param is required' }, 400);
    return jsonResponse(crdtBridge.getDiagnostics(filePath));
  }

  if (path === '/crdt/annotation' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as {
      path?: string; blockId?: string; content?: string;
      type?: 'comment' | 'todo' | 'question' | 'suggestion'; line?: number;
    };
    if (!body.path || !body.blockId || !body.content || !body.type || body.line === undefined) {
      return jsonResponse({ error: 'path, blockId, content, type, and line are required' }, 400);
    }
    const annotation = crdtBridge.addAnnotation(body.path, {
      blockId: body.blockId, content: body.content, type: body.type, line: body.line,
    });
    return jsonResponse(annotation);
  }

  if (path === '/crdt/annotations' && req.method === 'GET') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const filePath = url.searchParams.get('path');
    if (!filePath) return jsonResponse({ error: 'path query param is required' }, 400);
    return jsonResponse(crdtBridge.getAnnotations(filePath));
  }

  if (path === '/crdt/reading' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as { path?: string; blockId?: string; timeSpentMs?: number };
    if (!body.path || !body.blockId || !body.timeSpentMs) {
      return jsonResponse({ error: 'path, blockId, and timeSpentMs are required' }, 400);
    }
    crdtBridge.recordReading(body.path, body.blockId, body.timeSpentMs);
    return jsonResponse({ recorded: true });
  }

  if (path === '/crdt/emotion' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as {
      path?: string; blockId?: string; emotion?: string;
      valence?: number; arousal?: number; dominance?: number; intensity?: number;
    };
    if (!body.path || !body.blockId || !body.emotion) {
      return jsonResponse({ error: 'path, blockId, and emotion are required' }, 400);
    }
    crdtBridge.tagEmotion(body.path, {
      blockId: body.blockId, emotion: body.emotion,
      valence: body.valence ?? 0, arousal: body.arousal ?? 0,
      dominance: body.dominance ?? 0, intensity: body.intensity ?? 0.5,
    });
    return jsonResponse({ tagged: true });
  }

  if (path === '/crdt/emotion' && req.method === 'GET') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const filePath = url.searchParams.get('path');
    const blockId = url.searchParams.get('blockId');
    if (!filePath || !blockId) {
      return jsonResponse({ error: 'path and blockId query params are required' }, 400);
    }
    return jsonResponse(crdtBridge.getEmotionTags(filePath, blockId));
  }

  if (path === '/crdt/participants' && req.method === 'GET') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    return jsonResponse(crdtBridge.getParticipants());
  }

  if (path === '/crdt/undo' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as { path?: string };
    if (!body.path) return jsonResponse({ error: 'path is required' }, 400);
    crdtBridge.undo(body.path);
    return jsonResponse({ undone: true });
  }

  if (path === '/crdt/snapshot' && req.method === 'GET') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const filePath = url.searchParams.get('path');
    if (!filePath) return jsonResponse({ error: 'path query param is required' }, 400);
    const snapshot = crdtBridge.getSnapshot(filePath);
    if (!snapshot) return jsonResponse({ error: 'File not open' }, 404);
    return jsonResponse({ path: filePath, snapshot: Array.from(snapshot) });
  }

  if (path === '/crdt/state-vector' && req.method === 'GET') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const filePath = url.searchParams.get('path');
    if (!filePath) return jsonResponse({ error: 'path query param is required' }, 400);
    const stateVector = crdtBridge.getStateVector(filePath);
    if (!stateVector) return jsonResponse({ error: 'File not open' }, 404);
    return jsonResponse({ path: filePath, stateVector: Array.from(stateVector) });
  }

  if (path === '/crdt/ledger' && req.method === 'GET') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    return jsonResponse(crdtBridge.getReputationLedger());
  }

  if (path === '/crdt/contribute' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as { peerId?: string; tokens?: number; requests?: number };
    if (!body.peerId || body.tokens === undefined || body.requests === undefined) {
      return jsonResponse({ error: 'peerId, tokens, and requests are required' }, 400);
    }
    crdtBridge.recordContribution(body.peerId, body.tokens, body.requests);
    return jsonResponse({ recorded: true });
  }

  if (path === '/crdt/redo' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as { path?: string };
    if (!body.path) return jsonResponse({ error: 'path is required' }, 400);
    crdtBridge.redo(body.path);
    return jsonResponse({ redone: true });
  }

  // ==================== UCAN Invite/Join (Ghostwriter Phase 2) ====================

  if (path === '/crdt/invite' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as { room?: string; mode?: string; ttlMs?: number };
    if (!body.room) return jsonResponse({ error: 'room is required' }, 400);
    const mode = (body.mode ?? 'reviewMode') as ZedgeAccessMode;
    const status = crdtBridge.getStatus();
    const invite = generateInvite(status.peerId, body.room, mode, body.ttlMs);
    return jsonResponse(invite);
  }

  if (path === '/crdt/join' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as { token?: string };
    if (!body.token) return jsonResponse({ error: 'token is required' }, 400);
    const payload = parseRoomUcan(body.token);
    if (!payload) return jsonResponse({ error: 'Invalid token' }, 400);
    if (isRoomUcanExpired(body.token)) return jsonResponse({ error: 'Token expired' }, 401);
    return jsonResponse({ joined: true, room: payload.room, capabilities: payload.capabilities });
  }

  // ==================== Agent Participant (Ghostwriter Phase 3) ====================

  if (path === '/agent-participant/join' && req.method === 'POST') {
    if (!crdtBridge) return jsonResponse({ error: 'CRDT bridge not initialized' }, 503);
    const body = (await req.json()) as {
      agentId?: string; displayName?: string; model?: string;
      color?: string; mode?: AgentMode;
    };
    if (!body.agentId || !body.model) {
      return jsonResponse({ error: 'agentId and model are required' }, 400);
    }
    const mode = body.mode ?? 'review';
    const agent = new AgentParticipant(
      {
        agentId: body.agentId,
        displayName: body.displayName ?? `${body.model} (${mode})`,
        model: body.model,
        color: body.color ?? '',
        mode,
      },
      crdtBridge,
      ucanBridge ?? undefined,
    );
    await agent.join();
    agentParticipants.set(body.agentId, agent);
    return jsonResponse(agent.getStatus());
  }

  if (path === '/agent-participant/leave' && req.method === 'POST') {
    const body = (await req.json()) as { agentId?: string };
    if (!body.agentId) return jsonResponse({ error: 'agentId is required' }, 400);
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    agent.leave();
    agentParticipants.delete(body.agentId);
    return jsonResponse({ left: true, agentId: body.agentId });
  }

  if (path === '/agent-participant/status' && req.method === 'GET') {
    const agentId = url.searchParams.get('agentId');
    if (agentId) {
      const agent = agentParticipants.get(agentId);
      if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
      return jsonResponse(agent.getStatus());
    }
    return jsonResponse(Array.from(agentParticipants.values()).map((a) => a.getStatus()));
  }

  if (path === '/agent-participant/open' && req.method === 'POST') {
    const body = (await req.json()) as { agentId?: string; path?: string; initialContent?: string };
    if (!body.agentId || !body.path) {
      return jsonResponse({ error: 'agentId and path are required' }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    const state = await agent.openFile(body.path, body.initialContent);
    return jsonResponse(state);
  }

  if (path === '/agent-participant/read' && req.method === 'GET') {
    const agentId = url.searchParams.get('agentId');
    const filePath = url.searchParams.get('path');
    if (!agentId || !filePath) {
      return jsonResponse({ error: 'agentId and path query params are required' }, 400);
    }
    const agent = agentParticipants.get(agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    const content = agent.readFile(filePath);
    if (content === null) return jsonResponse({ error: 'File not open' }, 404);
    return jsonResponse({ path: filePath, content });
  }

  if (path === '/agent-participant/insert' && req.method === 'POST') {
    const body = (await req.json()) as { agentId?: string; path?: string; offset?: number; text?: string };
    if (!body.agentId || !body.path || body.offset === undefined || !body.text) {
      return jsonResponse({ error: 'agentId, path, offset, and text are required' }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    const ok = agent.insert(body.path, body.offset, body.text);
    return jsonResponse({ inserted: ok });
  }

  if (path === '/agent-participant/delete' && req.method === 'POST') {
    const body = (await req.json()) as { agentId?: string; path?: string; offset?: number; length?: number };
    if (!body.agentId || !body.path || body.offset === undefined || !body.length) {
      return jsonResponse({ error: 'agentId, path, offset, and length are required' }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    const ok = agent.delete(body.path, body.offset, body.length);
    return jsonResponse({ deleted: ok });
  }

  if (path === '/agent-participant/replace' && req.method === 'POST') {
    const body = (await req.json()) as {
      agentId?: string; path?: string; offset?: number; length?: number; text?: string;
    };
    if (!body.agentId || !body.path || body.offset === undefined || !body.length || body.text === undefined) {
      return jsonResponse({ error: 'agentId, path, offset, length, and text are required' }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    const ok = agent.replace(body.path, body.offset, body.length, body.text);
    return jsonResponse({ replaced: ok });
  }

  if (path === '/agent-participant/batch-edit' && req.method === 'POST') {
    const body = (await req.json()) as { agentId?: string; edits?: AgentEdit[] };
    if (!body.agentId || !body.edits?.length) {
      return jsonResponse({ error: 'agentId and edits are required' }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    const applied = agent.applyEdits(body.edits);
    return jsonResponse({ applied });
  }

  if (path === '/agent-participant/batch-replace' && req.method === 'POST') {
    const body = (await req.json()) as { agentId?: string; replacements?: AgentReplacement[] };
    if (!body.agentId || !body.replacements?.length) {
      return jsonResponse({ error: 'agentId and replacements are required' }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    const applied = agent.applyReplacements(body.replacements);
    return jsonResponse({ applied });
  }

  if (path === '/agent-participant/review' && req.method === 'POST') {
    const body = (await req.json()) as {
      agentId?: string; path?: string; line?: number; content?: string; type?: 'comment' | 'suggestion';
    };
    if (!body.agentId || !body.path || body.line === undefined || !body.content) {
      return jsonResponse({ error: 'agentId, path, line, and content are required' }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    if (body.type === 'suggestion') {
      agent.addSuggestion(body.path, body.line, body.content);
    } else {
      agent.addReviewComment(body.path, body.line, body.content);
    }
    return jsonResponse({ reviewed: true });
  }

  if (path === '/agent-participant/thinking' && req.method === 'POST') {
    const body = (await req.json()) as { agentId?: string; context?: string };
    if (!body.agentId) return jsonResponse({ error: 'agentId is required' }, 400);
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    agent.setThinking(body.context ?? '');
    return jsonResponse({ thinking: true });
  }

  if (path === '/agent-participant/undo' && req.method === 'POST') {
    const body = (await req.json()) as { agentId?: string; path?: string };
    if (!body.agentId || !body.path) {
      return jsonResponse({ error: 'agentId and path are required' }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    agent.undo(body.path);
    return jsonResponse({ undone: true });
  }

  if (path === '/agent-participant/redo' && req.method === 'POST') {
    const body = (await req.json()) as { agentId?: string; path?: string };
    if (!body.agentId || !body.path) {
      return jsonResponse({ error: 'agentId and path are required' }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);
    agent.redo(body.path);
    return jsonResponse({ redone: true });
  }

  // ==================== UCAN Auth (Ghostwriter Phase 2) ====================

  if (path === '/ucan/status' && req.method === 'GET') {
    if (!ucanBridge) return jsonResponse({ error: 'UCAN bridge not initialized' }, 503);
    return jsonResponse(ucanBridge.getStatus());
  }

  if (path === '/ucan/did' && req.method === 'GET') {
    if (!ucanBridge) return jsonResponse({ error: 'UCAN bridge not initialized' }, 503);
    return jsonResponse({ did: ucanBridge.getDid(), publicKey: ucanBridge.getPublicKeyJwk() });
  }

  if (path === '/ucan/issue' && req.method === 'POST') {
    if (!ucanBridge) return jsonResponse({ error: 'UCAN bridge not initialized' }, 503);
    const body = (await req.json()) as {
      audienceDid?: string;
      capabilities?: UcanCapability[];
      expirationSeconds?: number;
    };
    if (!body.audienceDid || !body.capabilities?.length) {
      return jsonResponse({ error: 'audienceDid and capabilities are required' }, 400);
    }
    const token = await ucanBridge.issueToken(
      body.audienceDid, body.capabilities, body.expirationSeconds,
    );
    return jsonResponse({ token: token.token, expiresAt: token.payload.exp * 1000 });
  }

  if (path === '/ucan/agent' && req.method === 'POST') {
    if (!ucanBridge) return jsonResponse({ error: 'UCAN bridge not initialized' }, 503);
    const body = (await req.json()) as {
      agentDid?: string; mode?: AgentMode; expirationSeconds?: number;
    };
    if (!body.agentDid || !body.mode) {
      return jsonResponse({ error: 'agentDid and mode are required' }, 400);
    }
    if (!['review', 'pair', 'autonomous'].includes(body.mode)) {
      return jsonResponse({ error: 'mode must be review, pair, or autonomous' }, 400);
    }
    const result = await ucanBridge.issueAgentToken(
      body.agentDid, body.mode, body.expirationSeconds,
    );
    return jsonResponse({
      token: result.token, mode: result.mode,
      capabilities: result.payload.att, expiresAt: result.payload.exp * 1000,
    });
  }

  if (path === '/ucan/invite' && req.method === 'POST') {
    if (!ucanBridge) return jsonResponse({ error: 'UCAN bridge not initialized' }, 503);
    const body = (await req.json()) as {
      audienceDid?: string; path?: string; dirPath?: string;
      access?: 'read' | 'write' | 'read_write'; expirationSeconds?: number;
      label?: string; open?: boolean;
    };
    const invite = body.open
      ? await ucanBridge.createOpenInvite({
          path: body.path, dirPath: body.dirPath,
          access: body.access, expirationSeconds: body.expirationSeconds,
        })
      : await ucanBridge.createInvite(body.audienceDid ?? 'did:key:*', {
          path: body.path, dirPath: body.dirPath,
          access: body.access, expirationSeconds: body.expirationSeconds,
          label: body.label,
        });
    return jsonResponse(invite);
  }

  if (path === '/ucan/verify' && req.method === 'POST') {
    if (!ucanBridge) return jsonResponse({ error: 'UCAN bridge not initialized' }, 503);
    const body = (await req.json()) as {
      token?: string; requiredCapabilities?: UcanCapability[];
    };
    if (!body.token) return jsonResponse({ error: 'token is required' }, 400);
    const result = await ucanBridge.verifyToken(body.token, body.requiredCapabilities);
    return jsonResponse(result);
  }

  if (path === '/ucan/grants' && req.method === 'GET') {
    if (!ucanBridge) return jsonResponse({ error: 'UCAN bridge not initialized' }, 503);
    return jsonResponse(ucanBridge.listGrants());
  }

  if (path.startsWith('/ucan/revoke/') && req.method === 'POST') {
    if (!ucanBridge) return jsonResponse({ error: 'UCAN bridge not initialized' }, 503);
    const grantId = path.slice('/ucan/revoke/'.length);
    const revoked = ucanBridge.revokeGrant(grantId);
    return jsonResponse({ revoked, grantId });
  }

  if (path === '/ucan/revoke-audience' && req.method === 'POST') {
    if (!ucanBridge) return jsonResponse({ error: 'UCAN bridge not initialized' }, 503);
    const body = (await req.json()) as { audienceDid?: string };
    if (!body.audienceDid) return jsonResponse({ error: 'audienceDid is required' }, 400);
    const count = ucanBridge.revokeAudience(body.audienceDid);
    return jsonResponse({ revoked: count, audienceDid: body.audienceDid });
  }

  if (path === '/ucan/revoke-mode' && req.method === 'POST') {
    if (!ucanBridge) return jsonResponse({ error: 'UCAN bridge not initialized' }, 503);
    const body = (await req.json()) as { mode?: AgentMode };
    if (!body.mode) return jsonResponse({ error: 'mode is required' }, 400);
    const count = ucanBridge.revokeMode(body.mode);
    return jsonResponse({ revoked: count, mode: body.mode });
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
  console.log(`[zedge] Ghostwriter CRDT: http://localhost:${port}/crdt/status`);
  console.log(`[zedge] Ghostwriter UCAN: http://localhost:${port}/ucan/status`);
}
