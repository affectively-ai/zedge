/**
 * Zedge Compute Pool Node
 *
 * Joins the distributed inference mesh via DistributedClient WASM bridge.
 * Earns Edgework tokens by serving inference requests from the mesh.
 *
 * Integrates with:
 * - distributed-bridge.ts (WASM DistributedClient or HTTP fallback)
 * - p2p-mesh.ts (LAN peer discovery)
 * - billing headers (X-Edgework-Debt-Mode, X-Edgework-Debt-Max)
 */

import { getZedgeConfig, getEdgeworkConfig, saveZedgeConfig, getApiKey } from './config';
import {
  connectToMesh,
  disconnectFromMesh,
  getMeshNodes,
  getBridgeStatus,
} from './distributed-bridge';
import type { DistributedConfig } from './distributed-bridge';

export interface ComputePoolStatus {
  joined: boolean;
  tokensEarned: number;
  requestsServed: number;
  connectedNodes: number;
  uptime: number;
  wasmBridgeAvailable: boolean;
  config: {
    maxCpuPercent: number;
    maxMemoryMb: number;
    allowedModels: string[];
  };
  billing: {
    debtMode: string;
    debtMax: number;
    currentDebt: number;
  };
}

let poolState: {
  joined: boolean;
  tokensEarned: number;
  requestsServed: number;
  connectedNodes: number;
  startTime: number | null;
  currentDebt: number;
} = {
  joined: false,
  tokensEarned: 0,
  requestsServed: 0,
  connectedNodes: 0,
  startTime: null,
  currentDebt: 0,
};

/**
 * Get billing headers for mesh requests
 * Implements the BillingDaemon debt policy from the edge inference ebook
 */
export function getBillingHeaders(): Record<string, string> {
  const config = getZedgeConfig();
  return {
    'X-Edgework-Debt-Mode': 'free', // Default tier: free (0 debt cap)
    'X-Edgework-Debt-Max': '0',
    ...(getApiKey()
      ? {
          'X-Edgework-Debt-Mode': 'premium',
          'X-Edgework-Debt-Max': '5',
        }
      : {}),
  };
}

/**
 * Join the distributed inference mesh
 *
 * Connects via DistributedClient WASM bridge if available,
 * falls back to HTTP mesh endpoint, then P2P discovery.
 */
export async function joinPool(): Promise<ComputePoolStatus> {
  if (poolState.joined) {
    return getPoolStatus();
  }

  const config = getZedgeConfig();
  const edgeworkConfig = getEdgeworkConfig();

  // Build distributed config for the WASM bridge
  const distributedConfig: DistributedConfig = {
    meshEndpoint: edgeworkConfig.apiBaseUrl,
    maxNodes: 50,
    timeoutMs: 10_000,
    retryCount: 3,
    enableFallback: true,
  };

  // Connect to mesh via WASM bridge or HTTP fallback
  const result = await connectToMesh(distributedConfig);

  poolState = {
    joined: true,
    tokensEarned: poolState.tokensEarned,
    requestsServed: poolState.requestsServed,
    connectedNodes: Math.max(1, result.nodeCount),
    startTime: Date.now(),
    currentDebt: 0,
  };

  // Persist preference
  saveZedgeConfig({
    computePool: { ...config.computePool, enabled: true },
  });

  const bridge = getBridgeStatus();
  console.log(
    `[zedge] Joined compute pool — WASM bridge: ${bridge.wasmAvailable ? 'yes' : 'no'}, ` +
      `nodes: ${result.nodeCount}, max CPU: ${config.computePool.maxCpuPercent}%, ` +
      `max memory: ${config.computePool.maxMemoryMb}MB`
  );

  return getPoolStatus();
}

/**
 * Leave the distributed inference mesh
 */
export async function leavePool(): Promise<ComputePoolStatus> {
  if (!poolState.joined) {
    return getPoolStatus();
  }

  const config = getZedgeConfig();

  // Disconnect from mesh
  disconnectFromMesh();

  poolState = {
    ...poolState,
    joined: false,
    connectedNodes: 0,
    startTime: null,
  };

  saveZedgeConfig({
    computePool: { ...config.computePool, enabled: false },
  });

  console.log('[zedge] Left compute pool');
  return getPoolStatus();
}

/**
 * Get current pool status
 */
export function getPoolStatus(): ComputePoolStatus {
  const config = getZedgeConfig();
  const bridge = getBridgeStatus();

  // Update connected nodes from mesh
  if (poolState.joined) {
    const meshNodes = getMeshNodes();
    if (meshNodes.length > 0) {
      poolState.connectedNodes = meshNodes.length + 1; // +1 for self
    }
  }

  return {
    joined: poolState.joined,
    tokensEarned: poolState.tokensEarned,
    requestsServed: poolState.requestsServed,
    connectedNodes: poolState.connectedNodes,
    uptime: poolState.startTime ? Date.now() - poolState.startTime : 0,
    wasmBridgeAvailable: bridge.wasmAvailable,
    config: {
      maxCpuPercent: config.computePool.maxCpuPercent,
      maxMemoryMb: config.computePool.maxMemoryMb,
      allowedModels: config.computePool.allowedModels,
    },
    billing: {
      debtMode: getApiKey() ? 'premium' : 'free',
      debtMax: getApiKey() ? 5 : 0,
      currentDebt: poolState.currentDebt,
    },
  };
}

/**
 * Record a served inference request (called by mesh when this node handles work)
 */
export function recordServedRequest(tokensProcessed: number): void {
  poolState.requestsServed += 1;
  // 1000 tokens processed = 1 credit
  poolState.tokensEarned += tokensProcessed / 1000;
}

/**
 * Record inference debt (called when this node consumes inference)
 */
export function recordDebt(amount: number): void {
  poolState.currentDebt += amount;
}
