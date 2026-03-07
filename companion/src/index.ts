#!/usr/bin/env bun
/**
 * Zedge Companion Sidecar v1.0
 *
 * Entry point — starts HTTP server, P2P mesh, latency probing, and compute pool.
 *
 * Usage:
 *   bun open-source/zedge/companion/src/index.ts
 */

import { startServer } from './server';
import { joinPool, getPoolStatus } from './compute-node';
import { startMesh, getMeshStatus } from './p2p-mesh';
import { startProbing } from './latency-probe';
import { whoami } from './auth';
import { getZedgeConfig } from './config';

async function main(): Promise<void> {
  console.log('[zedge] Starting companion sidecar v1.0...');

  // Start HTTP server
  startServer();

  const config = getZedgeConfig();

  // Check auth status
  const authStatus = whoami();
  if (authStatus.authenticated) {
    console.log(
      `[zedge] Authenticated via ${authStatus.method}${authStatus.email ? ` (${authStatus.email})` : ''}`
    );
  } else {
    console.log(
      '[zedge] Not authenticated. Run POST /auth/login or create ~/.edgework/api-key'
    );
  }

  // Start latency probing (background, non-blocking)
  startProbing();

  // Start P2P mesh for LAN discovery
  const mesh = startMesh();
  console.log(
    `[zedge] Mesh started. Node ID: ${mesh.nodeId}, discovering peers...`
  );

  // Auto-join compute pool if previously enabled
  if (config.computePool.enabled) {
    console.log('[zedge] Auto-joining compute pool (previously enabled)...');
    await joinPool();
    const status = getPoolStatus();
    console.log(
      `[zedge] Pool: ${status.connectedNodes} nodes, ${status.tokensEarned} tokens earned, WASM bridge: ${status.wasmBridgeAvailable ? 'yes' : 'no'}`
    );
  }

  // Report initial status
  const meshStatus = getMeshStatus();
  console.log(
    `[zedge] Ready. Mesh peers: ${meshStatus.peers.length}, models: ${meshStatus.totalCapacity.models.length}`
  );
}

main().catch((err) => {
  console.error('[zedge] Fatal error:', err);
  process.exit(1);
});
