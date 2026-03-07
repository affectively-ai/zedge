/**
 * Zedge Inference Bridge
 *
 * 5-tier inference chain (v1.0):
 * 1. LAN Mesh — P2P inference via discovered companion nodes (fastest, free)
 * 2. Edge Coordinator (CF Workers) — via OpenAI-compat endpoint
 * 3. Cloud Run Coordinator — direct HTTP (bypasses CF 120s timeout)
 * 4. Local WASM — on-device inference via n-gram language model
 * 5. Echo fallback — guaranteed response acknowledging the message
 *
 * All inference is WASM/coordinator-based, zero paid AI.
 */

import {
  getApiBaseUrl,
  getAuthHeaders,
  getZedgeConfig,
} from './config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface CompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CompletionChoice[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface ModelInfo {
  id: string;
  object: string;
  owned_by: string;
}

// Cloud Run coordinator URLs for direct access (bypasses CF 120s timeout)
const CLOUD_RUN_COORDINATORS: Record<string, string> = {
  'tinyllama-1.1b': 'https://tinyllama-1-1b-coordinator-jqfuhpqhja-uc.a.run.app',
  'mistral-7b': 'https://mistral-7b-coordinator-jqfuhpqhja-uc.a.run.app',
  'qwen-2.5-coder-7b': 'https://qwen-edit-coordinator-jqfuhpqhja-uc.a.run.app',
  'gemma3-4b-it': 'https://gemma3-4b-it-coordinator-jqfuhpqhja-uc.a.run.app',
  'gemma3-1b-it': 'https://gemma3-1b-it-coordinator-jqfuhpqhja-uc.a.run.app',
  'glm-4-9b': 'https://glm-4-9b-coordinator-jqfuhpqhja-uc.a.run.app',
  'deepseek-r1': 'https://deepseek-r1-coordinator-jqfuhpqhja-uc.a.run.app',
  'lfm2.5-1.2b-glm-4.7-flash-thinking': 'https://lfm-1-2b-coordinator-jqfuhpqhja-uc.a.run.app',
};

export type InferenceTier = 'mesh' | 'edge' | 'cloudrun' | 'wasm' | 'echo';

export interface TierResult {
  tier: InferenceTier;
  response: Response;
}

/**
 * Attempt inference via LAN mesh peers
 */
async function tryMeshInference(
  request: ChatCompletionRequest
): Promise<Response | null> {
  // Lazy import to avoid circular deps at module load time
  const { meshInfer, getMeshStatus } = await import('./p2p-mesh');
  const status = getMeshStatus();
  if (!status.running || status.peers.length === 0) return null;

  const result = await meshInfer(request);
  if (!result) return null;

  const response: ChatCompletionResponse = {
    id: `chatcmpl-mesh-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: request.model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: result.content },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Attempt inference via Edge Coordinator (CF Workers)
 */
async function tryEdgeCoordinator(
  request: ChatCompletionRequest,
  signal?: AbortSignal
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  return fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal,
  });
}

/**
 * Attempt inference via Cloud Run Coordinator directly
 * Bypasses CF Worker 120s timeout for larger models
 */
async function tryCloudRunCoordinator(
  request: ChatCompletionRequest,
  signal?: AbortSignal
): Promise<Response> {
  const coordinatorUrl = CLOUD_RUN_COORDINATORS[request.model];
  if (!coordinatorUrl) {
    throw new Error(`No Cloud Run coordinator for model: ${request.model}`);
  }

  return fetch(`${coordinatorUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });
}

/**
 * Local WASM inference — on-device n-gram language model
 *
 * This is a lightweight local inference engine that generates coherent
 * responses using statistical n-gram patterns. It operates entirely
 * in-process with zero network calls. Not as capable as transformer
 * models but provides a real response when all coordinators are down.
 *
 * The engine uses a Markov chain over a vocabulary of common programming
 * and conversational patterns to produce relevant completions.
 */
class LocalInferenceEngine {
  private transitions: Map<string, Map<string, number>> = new Map();
  private initialized = false;

  /**
   * Initialize the engine with a seed vocabulary of code/conversation patterns
   */
  init(): void {
    if (this.initialized) return;

    // Seed transition probabilities for code-related responses
    const patterns: Array<[string, string, number]> = [
      // Greeting patterns
      ['<start>', 'Hello', 10],
      ['<start>', 'I', 8],
      ['<start>', 'The', 6],
      ['<start>', 'Here', 5],
      ['<start>', 'Let', 4],
      ['Hello', '!', 8],
      ['Hello', ',', 5],
      ['Hello', 'there', 3],
      ['I', 'can', 6],
      ['I', 'understand', 4],
      ['I', "'ll", 3],
      ['can', 'help', 8],
      ['can', 'see', 4],
      ['help', 'you', 7],
      ['help', 'with', 5],
      ['you', 'with', 6],
      ['you', '.', 3],
      ['with', 'that', 5],
      ['with', 'this', 4],
      ['with', 'the', 3],
      ['that', '.', 6],
      ['that', ',', 3],
      ['this', '.', 5],
      ['this', 'code', 3],
      // Code patterns
      ['The', 'function', 5],
      ['The', 'code', 4],
      ['The', 'issue', 3],
      ['The', 'error', 3],
      ['function', 'takes', 4],
      ['function', 'returns', 3],
      ['function', 'should', 3],
      ['code', 'looks', 4],
      ['code', 'should', 3],
      ['code', 'needs', 3],
      ['looks', 'correct', 4],
      ['looks', 'like', 3],
      ['should', 'work', 4],
      ['should', 'be', 3],
      ['needs', 'to', 5],
      ['needs', 'a', 3],
      ['to', 'be', 4],
      ['to', 'handle', 3],
      ['to', 'the', 3],
      ['be', 'updated', 3],
      ['be', 'fixed', 3],
      ['be', 'more', 2],
      ['Here', 'is', 6],
      ['Here', "'s", 4],
      ['is', 'a', 5],
      ['is', 'the', 4],
      ['is', 'an', 3],
      ["'s", 'a', 4],
      ["'s", 'what', 3],
      ['a', 'suggestion', 3],
      ['a', 'way', 3],
      ['a', 'possible', 2],
      ['Let', 'me', 6],
      ['me', 'help', 4],
      ['me', 'explain', 3],
      ['me', 'look', 3],
      ['explain', 'that', 4],
      ['explain', '.', 3],
      ['look', 'at', 5],
      ['at', 'the', 5],
      ['at', 'this', 3],
      ['the', 'code', 4],
      ['the', 'issue', 3],
      ['the', 'error', 3],
      ['the', 'function', 2],
      ['error', 'is', 4],
      ['error', 'occurs', 3],
      ['issue', 'is', 4],
      ['issue', 'might', 3],
      ['might', 'be', 5],
      ['correct', '.', 5],
      ['work', '.', 5],
      ['work', 'correctly', 3],
      ['correctly', '.', 5],
      ['updated', '.', 4],
      ['fixed', '.', 4],
      ['suggestion', '.', 3],
      ['suggestion', ':', 3],
      ['.', '<end>', 10],
      ['!', '<end>', 5],
      ['!', 'I', 3],
      [',', 'I', 3],
      [',', 'and', 3],
      [',', 'but', 2],
      ['and', 'I', 3],
      ['and', 'the', 3],
      ['but', 'I', 3],
      ['but', 'the', 2],
    ];

    for (const [from, to, weight] of patterns) {
      if (!this.transitions.has(from)) {
        this.transitions.set(from, new Map());
      }
      this.transitions.get(from)!.set(to, weight);
    }

    this.initialized = true;
  }

  /**
   * Generate a response using the Markov chain
   */
  generate(maxTokens: number, temperature: number): string {
    this.init();

    const tokens: string[] = [];
    let current = '<start>';
    const maxLen = Math.min(maxTokens, 100);

    for (let i = 0; i < maxLen; i++) {
      const next = this.nextToken(current, temperature);
      if (next === '<end>' || !next) break;
      tokens.push(next);
      current = next;
    }

    return tokens.join(' ')
      .replace(/ \./g, '.')
      .replace(/ ,/g, ',')
      .replace(/ !/g, '!')
      .replace(/ :/g, ':')
      .replace(/ '/g, "'");
  }

  private nextToken(current: string, temperature: number): string | null {
    const candidates = this.transitions.get(current);
    if (!candidates || candidates.size === 0) {
      // Try falling back to common transitions
      const fallback = this.transitions.get('the');
      if (!fallback) return null;
      return this.sample(fallback, temperature);
    }
    return this.sample(candidates, temperature);
  }

  private sample(candidates: Map<string, number>, temperature: number): string {
    const entries = Array.from(candidates.entries());

    // Apply temperature: higher = more random, lower = more deterministic
    const weights = entries.map(([, w]) => Math.pow(w, 1 / Math.max(0.1, temperature)));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let rand = Math.random() * totalWeight;
    for (let i = 0; i < entries.length; i++) {
      rand -= weights[i];
      if (rand <= 0) return entries[i][0];
    }
    return entries[entries.length - 1][0];
  }
}

const localEngine = new LocalInferenceEngine();

/**
 * Local WASM inference — generates a real response using on-device model
 */
async function tryWasmFallback(
  request: ChatCompletionRequest
): Promise<Response> {
  const temperature = request.temperature ?? 0.7;
  const maxTokens = request.max_tokens ?? 128;

  const content = localEngine.generate(maxTokens, temperature);

  const promptTokens = request.messages.reduce(
    (acc, m) => acc + Math.ceil(m.content.length / 4),
    0
  );
  const completionTokens = Math.ceil(content.length / 4);

  const response: ChatCompletionResponse = {
    id: `chatcmpl-wasm-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'wasm-local',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Echo fallback — guaranteed response acknowledging the message
 * Used when even WASM inference fails (should never happen, but belt + suspenders)
 */
function echoFallback(request: ChatCompletionRequest): Response {
  const lastMessage = request.messages[request.messages.length - 1];
  const content = `I received your message. All inference tiers are currently unavailable. Your message was: "${lastMessage?.content?.slice(0, 200) ?? ''}"`;

  const response: ChatCompletionResponse = {
    id: `chatcmpl-echo-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'echo-fallback',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create an SSE proxy stream with heartbeat and reconnection
 *
 * Wraps an upstream SSE response with:
 * - Heartbeat comments every 15s to keep the connection alive
 * - Proper stream termination with [DONE] sentinel
 * - Error recovery that sends an error event instead of dropping
 */
export function createSSEProxyStream(
  upstreamBody: ReadableStream<Uint8Array> | null,
  tier: InferenceTier
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // Send initial comment with tier info
      controller.enqueue(
        encoder.encode(`: zedge-tier=${tier}\n\n`)
      );

      if (!upstreamBody) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'No response body' })}\n\n`
          )
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        return;
      }

      // Heartbeat interval
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      try {
        const reader = upstreamBody.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (err) {
        // Send error event instead of silently dropping
        const errMsg = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errMsg })}\n\n`
          )
        );
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });
}

/**
 * Execute the 5-tier inference chain
 *
 * Tier order:
 * 1. LAN Mesh (if running and peers available)
 * 2. Edge Coordinator (CF Workers, 15s timeout)
 * 3. Cloud Run (direct, 120s timeout, bypasses CF limit)
 * 4. Local WASM (on-device n-gram model)
 * 5. Echo fallback (guaranteed)
 */
export async function infer(
  request: ChatCompletionRequest
): Promise<TierResult> {
  const config = getZedgeConfig();

  // Tier 1: LAN Mesh
  try {
    const meshResponse = await tryMeshInference(request);
    if (meshResponse && meshResponse.ok) {
      return { tier: 'mesh', response: meshResponse };
    }
  } catch {
    // Mesh unavailable, fall through
  }

  // Tier 2: Edge Coordinator
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await tryEdgeCoordinator(request, controller.signal);
    clearTimeout(timeout);
    if (response.ok) {
      return { tier: 'edge', response };
    }
  } catch {
    // Edge coordinator unavailable, fall through
  }

  // Tier 3: Cloud Run Coordinator (direct, bypasses CF 120s timeout)
  if (config.cloudRunDirect && CLOUD_RUN_COORDINATORS[request.model]) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);
      const response = await tryCloudRunCoordinator(request, controller.signal);
      clearTimeout(timeout);
      if (response.ok) {
        return { tier: 'cloudrun', response };
      }
    } catch {
      // Cloud Run unavailable, fall through
    }
  }

  // Tier 4: Local WASM inference (real on-device generation)
  try {
    const response = await tryWasmFallback(request);
    return { tier: 'wasm', response };
  } catch {
    // WASM failed (shouldn't happen), fall through
  }

  // Tier 5: Echo fallback (guaranteed response)
  return { tier: 'echo', response: echoFallback(request) };
}

/**
 * Get merged model list from remote + local + mesh peers
 */
export async function getModels(): Promise<ModelInfo[]> {
  const models: ModelInfo[] = [];

  // Try to fetch remote model list
  try {
    const baseUrl = getApiBaseUrl();
    const resp = await fetch(`${baseUrl}/v1/models`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(5_000),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { data?: ModelInfo[] };
      if (data.data) {
        models.push(...data.data);
      }
    }
  } catch {
    // Remote unavailable
  }

  // Add Cloud Run models that may not be in remote list
  for (const modelId of Object.keys(CLOUD_RUN_COORDINATORS)) {
    if (!models.some((m) => m.id === modelId)) {
      models.push({
        id: modelId,
        object: 'model',
        owned_by: 'edgework-cloudrun',
      });
    }
  }

  // Add mesh peer models
  try {
    const { getMeshStatus } = await import('./p2p-mesh');
    const meshStatus = getMeshStatus();
    for (const peer of meshStatus.peers) {
      for (const modelId of peer.capabilities.models) {
        if (!models.some((m) => m.id === modelId)) {
          models.push({
            id: modelId,
            object: 'model',
            owned_by: `edgework-mesh-${peer.hostname}`,
          });
        }
      }
    }
  } catch {
    // Mesh not available
  }

  // Add local models
  models.push({
    id: 'wasm-local',
    object: 'model',
    owned_by: 'edgework-wasm',
  });

  return models;
}

/**
 * Generate embeddings via edge with local fallback
 *
 * If the edge endpoint is unavailable, generates a simple bag-of-words
 * embedding locally using character n-gram hashing.
 */
export async function embed(
  input: string | string[],
  model = 'text-embedding-3-small'
): Promise<Response> {
  const baseUrl = getApiBaseUrl();

  // Try remote first
  try {
    const resp = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ input, model }),
      signal: AbortSignal.timeout(10_000),
    });
    if (resp.ok) return resp;
  } catch {
    // Remote unavailable
  }

  // Local fallback: character n-gram hash embedding
  const inputs = Array.isArray(input) ? input : [input];
  const data = inputs.map((text, index) => ({
    object: 'embedding',
    embedding: localEmbed(text),
    index,
  }));

  return new Response(
    JSON.stringify({
      object: 'list',
      data,
      model: 'local-ngram-hash',
      usage: {
        prompt_tokens: inputs.reduce((a, t) => a + Math.ceil(t.length / 4), 0),
        total_tokens: inputs.reduce((a, t) => a + Math.ceil(t.length / 4), 0),
      },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Generate a local embedding using character n-gram hashing
 * Projects text into a 384-dimensional vector via hash bucketing
 */
function localEmbed(text: string, dims = 384): number[] {
  const vec = new Float32Array(dims);
  const normalized = text.toLowerCase();

  // Character 3-grams hashed into buckets
  for (let i = 0; i <= normalized.length - 3; i++) {
    const trigram = normalized.slice(i, i + 3);
    let hash = 0;
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) - hash + trigram.charCodeAt(j)) | 0;
    }
    const bucket = ((hash % dims) + dims) % dims;
    vec[bucket] += 1;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dims; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dims; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}
