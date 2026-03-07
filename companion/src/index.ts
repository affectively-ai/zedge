#!/usr/bin/env bun
/**
 * Zedge Companion Sidecar v2.0
 *
 * Entry point — starts HTTP server, P2P mesh, latency probing, compute pool, and forge bridge.
 *
 * Usage:
 *   bun open-source/zedge/companion/src/index.ts
 */

import {
  startServer,
  setForgeBridge,
  setVfsBridge,
  setCollabBridge,
  setKernelBridge,
  setCapacitorBridge,
} from './server';
import { joinPool, getPoolStatus } from './compute-node';
import { startMesh, getMeshStatus } from './p2p-mesh';
import { startProbing } from './latency-probe';
import { whoami } from './auth';
import { getZedgeConfig } from './config';
import { ForgeBridge } from './forge-bridge';
import { VfsBridge } from './vfs-bridge';
import { CollabBridge } from './collab-bridge';
import { KernelBridge } from './kernel-bridge';
import { CapacitorBridge } from './capacitor-bridge';

async function main(): Promise<void> {
  console.log('[zedge] Starting companion sidecar v2.0...');

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

  // Initialize Forge Bridge (Phase 1)
  const workspacePath = process.cwd();
  const forge = new ForgeBridge(workspacePath);
  setForgeBridge(forge);

  const forgeProjects = await forge.discoverProjects();
  console.log(
    `[zedge] Forge: ${forgeProjects.length} project(s) discovered in workspace`
  );
  if (forgeProjects.length > 0) {
    console.log(
      `[zedge] Forge projects: ${forgeProjects.map((p) => p.name).join(', ')}`
    );
  }

  // Initialize VFS Bridge (Phase 2)
  const meshNodeId = getMeshStatus().nodeId;
  const vfs = new VfsBridge(meshNodeId);
  setVfsBridge(vfs);
  console.log('[zedge] VFS bridge initialized');

  // Initialize Collab Bridge (Phase 3)
  const authStatus = whoami();
  const displayName = authStatus.email ?? `zedge-${meshNodeId.slice(0, 8)}`;
  const collab = new CollabBridge(meshNodeId, displayName);
  setCollabBridge(collab);
  console.log('[zedge] Collab bridge initialized');

  // Initialize Kernel Bridge (Phase 4)
  const kernel = new KernelBridge();
  setKernelBridge(kernel);

  // Register Zedge as a kernel plugin
  kernel.registerPlugin({
    id: 'zedge-companion',
    name: 'Zedge Companion',
    version: '2.0.0',
    capabilities: [
      'inference', 'superinference', 'mesh', 'forge-deploy',
      'vfs', 'collab', 'capacitor', 'compute-market',
    ],
    commands: [],
  });
  console.log(`[zedge] Kernel bridge initialized (${kernel.listCommands().length} commands)`);

  // Initialize Capacitor Bridge (Phase 5)
  const capacitor = new CapacitorBridge();
  setCapacitorBridge(capacitor);
  console.log('[zedge] Capacitor bridge initialized');

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
