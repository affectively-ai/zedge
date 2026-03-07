/**
 * Model Latency Probing
 *
 * On startup, pings each inference tier to measure latency.
 * Caches results and periodically re-probes.
 * Routes to the fastest healthy coordinator per model.
 */

import {
  getApiBaseUrl,
  getAuthHeaders,
  getZedgeConfig,
} from './config';

// --- Types ---

export interface ProbeResult {
  tier: string;
  model: string;
  url: string;
  latencyMs: number;
  healthy: boolean;
  lastProbed: number;
}

export interface TierHealth {
  edge: { healthy: boolean; latencyMs: number };
  cloudRun: Record<string, { healthy: boolean; latencyMs: number }>;
  mesh: { healthy: boolean; peerCount: number };
  wasm: { healthy: boolean; latencyMs: number };
}

// --- State ---

const probeCache = new Map<string, ProbeResult>();
const PROBE_INTERVAL_MS = 60_000; // Re-probe every 60s
const PROBE_TIMEOUT_MS = 5_000;

// Cloud Run coordinator URLs
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

let probeInterval: ReturnType<typeof setInterval> | null = null;

// --- Public API ---

/**
 * Start latency probing — runs immediately then every 60s
 */
export function startProbing(): void {
  if (probeInterval) return;

  // Probe immediately (non-blocking)
  probeAll().catch(() => {});

  // Re-probe periodically
  probeInterval = setInterval(() => {
    probeAll().catch(() => {});
  }, PROBE_INTERVAL_MS);

  console.log('[zedge:probe] Latency probing started (60s interval)');
}

/**
 * Stop latency probing
 */
export function stopProbing(): void {
  if (probeInterval) {
    clearInterval(probeInterval);
    probeInterval = null;
  }
}

/**
 * Get the fastest healthy tier for a given model
 */
export function getFastestTier(model: string): string | null {
  const candidates: ProbeResult[] = [];

  // Check edge
  const edge = probeCache.get('edge:global');
  if (edge && edge.healthy) {
    candidates.push(edge);
  }

  // Check Cloud Run for this model
  const cloudRun = probeCache.get(`cloudrun:${model}`);
  if (cloudRun && cloudRun.healthy) {
    candidates.push(cloudRun);
  }

  // WASM is always available
  candidates.push({
    tier: 'wasm',
    model: 'wasm-local',
    url: 'local',
    latencyMs: 1, // Near-instant
    healthy: true,
    lastProbed: Date.now(),
  });

  if (candidates.length === 0) return null;

  // Sort by latency, return fastest
  candidates.sort((a, b) => a.latencyMs - b.latencyMs);
  return candidates[0].tier;
}

/**
 * Get full tier health report
 */
export function getTierHealth(): TierHealth {
  const edge = probeCache.get('edge:global');
  const cloudRunHealth: Record<string, { healthy: boolean; latencyMs: number }> = {};

  for (const model of Object.keys(CLOUD_RUN_COORDINATORS)) {
    const probe = probeCache.get(`cloudrun:${model}`);
    cloudRunHealth[model] = probe
      ? { healthy: probe.healthy, latencyMs: probe.latencyMs }
      : { healthy: false, latencyMs: -1 };
  }

  return {
    edge: edge
      ? { healthy: edge.healthy, latencyMs: edge.latencyMs }
      : { healthy: false, latencyMs: -1 },
    cloudRun: cloudRunHealth,
    mesh: { healthy: false, peerCount: 0 }, // Mesh health comes from p2p-mesh
    wasm: { healthy: true, latencyMs: 1 },
  };
}

/**
 * Get all cached probe results
 */
export function getProbeResults(): ProbeResult[] {
  return Array.from(probeCache.values());
}

// --- Internal ---

/**
 * Probe all tiers
 */
async function probeAll(): Promise<void> {
  const promises: Promise<void>[] = [];

  // Probe edge coordinator
  promises.push(probeEndpoint('edge', 'global', `${getApiBaseUrl()}/v1/models`));

  // Probe each Cloud Run coordinator
  for (const [model, url] of Object.entries(CLOUD_RUN_COORDINATORS)) {
    promises.push(probeEndpoint('cloudrun', model, `${url}/health`));
  }

  await Promise.allSettled(promises);
}

/**
 * Probe a single endpoint
 */
async function probeEndpoint(
  tier: string,
  model: string,
  url: string
): Promise<void> {
  const key = `${tier}:${model}`;
  const start = Date.now();

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: tier === 'edge' ? getAuthHeaders() : {},
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });

    const latencyMs = Date.now() - start;
    probeCache.set(key, {
      tier,
      model,
      url,
      latencyMs,
      healthy: resp.ok || resp.status === 404, // 404 on /health is still "up"
      lastProbed: Date.now(),
    });
  } catch {
    const latencyMs = Date.now() - start;
    probeCache.set(key, {
      tier,
      model,
      url,
      latencyMs,
      healthy: false,
      lastProbed: Date.now(),
    });
  }
}
