# Zedge

Edge inference coding IDE — AI that runs where you are.

Zedge is a [Zed](https://zed.dev) extension paired with a local companion sidecar that brings AI-assisted coding to Zed with zero cloud dependency. Inference runs on your machine, your LAN, or AFFECTIVELY's edge network — never through a centralized API gateway.

## Architecture

Zedge has two components:

1. **Zed Extension** (`src/`) — A Rust WASM extension that registers Zedge as a language model provider and adds slash commands to Zed's AI assistant panel.
2. **Companion Sidecar** (`companion/`) — A Bun-powered HTTP server on `localhost:7331` that handles inference routing, CRDT collaboration, compute pooling, VFS, and agent orchestration.

```
┌─────────────────────┐       HTTP        ┌──────────────────────────────┐
│   Zed Editor        │ ◄──────────────►  │   Companion Sidecar (:7331)  │
│   + Zedge Extension │   localhost:7331   │                              │
│     (WASM)          │                    │  ├─ Inference Bridge          │
│                     │                    │  ├─ CRDT Bridge (Ghostwriter)│
│  /zedge-status      │                    │  ├─ VFS Bridge               │
│  /zedge-models      │                    │  ├─ Forge Bridge             │
│  /zedge-pool        │                    │  ├─ Compute Pool             │
│  /zedge-feedback    │                    │  ├─ P2P Mesh                 │
│                     │                    │  ├─ Agent Participant         │
│                     │                    │  └─ UCAN Auth                │
└─────────────────────┘                    └──────────────────────────────┘
                                                      │
                                           ┌──────────┼──────────┐
                                           ▼          ▼          ▼
                                        Edge CF    Cloud Run   WASM
                                        Workers   Coordinators  Local
```

## Prerequisites

- [Zed](https://zed.dev) (latest stable)
- [Bun](https://bun.sh) 1.3.5+
- [Rust](https://rustup.rs) toolchain (only needed to build the extension from source)

## Quick Start (Settings-Only, No Build)

The fastest path — use Zed's built-in OpenAI-compatible provider to point at the companion sidecar. No extension build required.

### 1. Install dependencies and start the companion

```bash
# From the monorepo root
bun install

# Start the companion sidecar
bun open-source/zedge/companion/src/index.ts
```

You should see:

```
[zedge] Starting companion sidecar v2.0...
[zedge] Server listening on http://localhost:7331
[zedge] Forge: N project(s) discovered in workspace
[zedge] Ready.
```

### 2. Configure Zed settings

Open Zed settings (`Cmd+,` on macOS, `Ctrl+,` on Linux) and add:

```jsonc
{
  "language_models": {
    "openai_compatible": {
      "Zedge": {
        "api_url": "http://localhost:7331/v1",
        "available_models": [
          {
            "name": "tinyllama-1.1b",
            "display_name": "TinyLlama 1.1B (Fast)",
            "max_tokens": 2048,
          },
          {
            "name": "qwen-2.5-coder-7b",
            "display_name": "Qwen 2.5 Coder 7B",
            "max_tokens": 4096,
          },
          {
            "name": "mistral-7b",
            "display_name": "Mistral 7B",
            "max_tokens": 4096,
          },
          {
            "name": "gemma3-4b-it",
            "display_name": "Gemma3 4B IT",
            "max_tokens": 4096,
          },
          {
            "name": "gemma3-1b-it",
            "display_name": "Gemma3 1B IT",
            "max_tokens": 2048,
          },
          {
            "name": "glm-4-9b",
            "display_name": "GLM-4 9B",
            "max_tokens": 4096,
          },
          {
            "name": "deepseek-r1",
            "display_name": "DeepSeek R1",
            "max_tokens": 4096,
          },
          {
            "name": "lfm2.5-1.2b-glm-4.7-flash-thinking",
            "display_name": "LFM 2.5 1.2B (Thinking)",
            "max_tokens": 2048,
          },
        ],
      },
    },
  },
}
```

Or generate this automatically:

```bash
bun open-source/zedge/scripts/generate-settings.ts
```

### 3. Use it

Open the Zed agent panel via the command palette (`Cmd+Shift+P` → "Agent Panel") or click the Agent icon in the right toolbar. Select "Zedge" as the provider, pick a model, and start chatting.

## Building the Zed Extension from Source

The extension gives you slash commands (`/zedge-status`, `/zedge-models`, `/zedge-pool`, `/zedge-gnosis`, `/zedge-gnosis-run`, `/zedge-feedback`) and registers Zedge as a native language model provider.

### Build

```bash
cd open-source/zedge

# Build the WASM extension
cargo build --release --target wasm32-wasi
```

### Install in Zed

1. Open Zed
2. Go to **Extensions** (`Cmd+Shift+X`)
3. Click **Install Dev Extension**
4. Select the `open-source/zedge` directory

Zed will load the compiled WASM from `target/wasm32-wasi/release/zedge.wasm`.

### Slash Commands

Once the extension is installed, these commands are available in the AI assistant panel:

| Command | Description |
|:---|:---|
| `/zedge-status` | Inference chain health, compute pool stats, token balance |
| `/zedge-models` | List available models with latency tier and readiness |
| `/zedge-pool` | Toggle compute pool participation and show earnings |
| `/zedge-gnosis` | Analyze Gnosis topological graphs and calculate Betti numbers |
| `/zedge-gnosis-run` | Run and evaluate the current Gnosis topology file |
| `/zedge-feedback` | Submit RLHF feedback on response quality |

## Companion Sidecar

The companion is a Bun HTTP server that provides the inference and collaboration backend.

### Start

```bash
# Development mode (auto-reload)
bun open-source/zedge/companion/src/index.ts --watch

# Or via package.json
cd open-source/zedge/companion
bun dev
```

### Build for production

```bash
cd open-source/zedge/companion
bun run build
# Output: companion/dist/index.js
```

### Configuration

Configuration lives in `~/.edgework/zedge.json`:

```json
{
  "port": 7331,
  "computePool": {
    "enabled": false,
    "maxCpuPercent": 50,
    "maxMemoryMb": 2048,
    "allowedModels": ["tinyllama-1.1b", "gemma3-1b-it"]
  },
  "preferredModel": "tinyllama-1.1b",
  "cloudRunDirect": true,
  "dashRelayUrl": "wss://relay.dashrelay.com",
  "dashRelayApiKey": "dr_...",
  "ucanToken": "..."
}
```

Authentication uses `~/.edgework/api-key` (shared with edgework-cli).

## API Reference

The companion exposes a REST API on `localhost:7331`.

### Inference (OpenAI-compatible)

| Method | Path | Description |
|:---|:---|:---|
| `POST` | `/v1/chat/completions` | Chat completion (streaming or sync) |
| `POST` | `/v1/embeddings` | Text embeddings |
| `GET` | `/v1/models` | List available models |
| `GET` | `/health` | Server health and status |

### Ghostwriter CRDT (Collaborative Editing)

Real-time collaborative editing powered by Yjs CRDTs synced through DashRelay.

| Method | Path | Description |
|:---|:---|:---|
| `GET` | `/crdt/status` | Bridge connection status |
| `POST` | `/crdt/open` | Open a file for collaborative editing |
| `POST` | `/crdt/close` | Close a collaborative file |
| `GET` | `/crdt/files` | List open collaborative files |
| `POST` | `/crdt/cursor` | Update cursor position |
| `POST` | `/crdt/selection` | Update selection range |
| `GET` | `/crdt/cursors?path=...` | Get all cursors for a file |
| `POST` | `/crdt/diagnostics` | Share diagnostics for a file |
| `GET` | `/crdt/diagnostics?path=...` | Get shared diagnostics |
| `POST` | `/crdt/annotation` | Add an annotation (comment, todo, question, suggestion) |
| `GET` | `/crdt/annotations?path=...` | Get annotations for a file |
| `POST` | `/crdt/reading` | Record reading time on a code block |
| `POST` | `/crdt/emotion` | Tag emotion on a code block |
| `GET` | `/crdt/emotion?path=...&blockId=...` | Get emotion tags |
| `GET` | `/crdt/participants` | List connected participants |
| `POST` | `/crdt/undo` | Undo last edit on a file |
| `POST` | `/crdt/redo` | Redo last undone edit |
| `GET` | `/crdt/snapshot?path=...` | Get encoded CRDT state snapshot |
| `GET` | `/crdt/state-vector?path=...` | Get CRDT state vector |
| `GET` | `/crdt/ledger` | Get compute pool reputation ledger |
| `POST` | `/crdt/contribute` | Record a compute contribution |
| `POST` | `/crdt/invite` | Generate a scoped UCAN invite link |
| `POST` | `/crdt/join` | Join a room with a UCAN token |

### Agent Participant

AI agents join as visible collaborators with their own cursor and individually undoable edits.

| Method | Path | Description |
|:---|:---|:---|
| `POST` | `/agent-participant/join` | Agent joins the workspace |
| `POST` | `/agent-participant/leave` | Agent leaves the workspace |
| `GET` | `/agent-participant/status` | Get agent status (one or all) |
| `POST` | `/agent-participant/open` | Agent opens a file |
| `GET` | `/agent-participant/read?agentId=...&path=...` | Agent reads file content |
| `POST` | `/agent-participant/insert` | Agent inserts text |
| `POST` | `/agent-participant/delete` | Agent deletes text |
| `POST` | `/agent-participant/replace` | Agent replaces text |
| `POST` | `/agent-participant/batch-edit` | Agent applies multiple edits |
| `POST` | `/agent-participant/batch-replace` | Agent applies multiple replacements |
| `POST` | `/agent-participant/review` | Agent adds a review comment or suggestion |
| `POST` | `/agent-participant/thinking` | Set agent "thinking" indicator |
| `POST` | `/agent-participant/undo` | Undo agent's last edit (agent-scoped) |
| `POST` | `/agent-participant/redo` | Redo agent's last undone edit |

### Superinference

Multi-model ensemble inference with composition strategies.

| Method | Path | Description |
|:---|:---|:---|
| `POST` | `/v1/superinference` | Ensemble inference across multiple models |
| `POST` | `/v1/superinference/recursive` | Recursive multi-pass superinference |
| `POST` | `/v1/superinference/preset` | Use a named composition preset |
| `GET` | `/v1/superinference/presets` | List available presets |

### Compute Pool

Donate idle compute to the mesh network and earn tokens.

| Method | Path | Description |
|:---|:---|:---|
| `POST` | `/compute-pool/join` | Join the compute pool |
| `POST` | `/compute-pool/leave` | Leave the compute pool |
| `GET` | `/compute-pool/status` | Pool status and earnings |

### Forge (Project Management)

Discover, build, and deploy projects in the workspace.

| Method | Path | Description |
|:---|:---|:---|
| `GET` | `/forge/projects` | List discovered projects |
| `POST` | `/forge/build` | Build a project |
| `POST` | `/forge/deploy` | Deploy a project |
| `GET` | `/forge/status` | Build/deploy status |

### VFS (Virtual File System)

Content-addressed virtual filesystem with change tracking.

| Method | Path | Description |
|:---|:---|:---|
| `GET` | `/vfs/tree` | Get file tree |
| `GET` | `/vfs/file?path=...` | Read file content |
| `POST` | `/vfs/file` | Write file |
| `GET` | `/vfs/changes` | Get recent changes |
| `GET` | `/vfs/search?q=...` | Search file contents |

### ACP Agent (Agentic Code Partner)

Sandboxed agent sessions with filesystem and git access.

| Method | Path | Description |
|:---|:---|:---|
| `POST` | `/agent/session` | Create an agent session |
| `POST` | `/agent/turn` | Send a message to an agent session |
| `DELETE` | `/agent/session/:id` | End an agent session |

## Inference Chain

Zedge routes inference through a 3-tier fallback chain:

1. **Edge Coordinators** (Cloudflare Workers) — lowest latency, distributed globally
2. **Cloud Run Coordinators** (GCP) — higher capacity, 20+ models
3. **WASM** (local) — zero network, works offline

The companion picks the fastest available tier automatically via continuous latency probing.

## Ghostwriter (Zedge 3.0)

Ghostwriter replaces in-memory state with Yjs CRDTs synced through DashRelay WebSocket relay. Features:

- **Real-time collaboration** — multiple users edit the same file with conflict-free merging
- **Per-peer undo** — each participant (human or AI) has an independent undo stack
- **Agent as participant** — AI agents join with a visible purple cursor and individually undoable edits
- **Emotion tagging** — annotate code blocks with emotional context (VAD model)
- **Reading metrics** — track time spent on code blocks
- **Encrypted sync** — optional AES-256-GCM encryption before relay transmission
- **UCAN authorization** — scoped invite tokens with access modes (review, pair, autonomous)
- **Time travel** — snapshot, state vector, and diff endpoints for historical CRDT states
- **Reputation ledger** — compute contributions tracked in a shared CRDT

### DashRelay Configuration

To enable collaborative features, configure DashRelay in `~/.edgework/zedge.json`:

```json
{
  "dashRelayUrl": "wss://relay.dashrelay.com",
  "dashRelayApiKey": "dr_<your-key>"
}
```

Without DashRelay credentials, the companion runs in local-only mode — all CRDT features work but don't sync to other peers.

### Invite a Collaborator

```bash
# Generate an invite link (defaults to read-only "review" mode)
curl -X POST http://localhost:7331/crdt/invite \
  -H 'Content-Type: application/json' \
  -d '{"room": "src/main.ts", "mode": "pairMode", "ttlMs": 3600000}'

# Response: { "url": "aeon://zedge/join?token=...&room=...", "token": "..." }
```

Access modes:
- `reviewMode` — read-only (cursors visible, no edits)
- `pairMode` — read + write
- `autonomousMode` — full access (all capabilities)

## Testing

```bash
# Run all companion tests
bun test open-source/zedge/companion

# Run a specific test file
bun test open-source/zedge/companion/src/__tests__/crdt-bridge.test.ts

# Via Nx
bunx nx test zedge
```

## Project Structure

```
open-source/zedge/
├── Cargo.toml                    # Rust extension manifest
├── extension.toml                # Zed extension metadata
├── project.json                  # Nx project configuration
├── src/
│   ├── lib.rs                    # Extension entry point (WASM)
│   ├── provider.rs               # Language model provider
│   ├── slash_commands.rs         # /zedge-status, /zedge-models, etc.
│   └── context_server.rs         # Workspace context for inference
├── companion/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # Sidecar entry point
│       ├── server.ts             # HTTP server (all routes)
│       ├── config.ts             # Configuration (~/.edgework/)
│       ├── auth.ts               # Authentication
│       ├── inference-bridge.ts   # Inference routing (edge/cloudrun/wasm)
│       ├── crdt-bridge.ts        # Ghostwriter CRDT engine (Yjs + DashRelay)
│       ├── crdt-encryption.ts    # AES-256-GCM encryption for CRDT sync
│       ├── crypto-utils.ts       # Shared crypto primitives
│       ├── ucan-scope.ts         # UCAN token generation and validation
│       ├── ucan-bridge.ts        # UCAN bridge for DID-based auth
│       ├── agent-participant.ts  # AI agent as collab participant
│       ├── vfs-bridge.ts         # Content-addressed virtual filesystem
│       ├── vfs-crdt-adapter.ts   # Bidirectional VFS <-> CRDT sync
│       ├── collab-bridge.ts      # Legacy collab (deprecated, delegates to CRDT)
│       ├── capacitor-bridge.ts   # Code comprehension engine
│       ├── forge-bridge.ts       # Project discovery and deployment
│       ├── kernel-bridge.ts      # Aeon kernel plugin registration
│       ├── compute-node.ts       # Compute pool participation
│       ├── p2p-mesh.ts           # LAN peer discovery
│       ├── latency-probe.ts      # Inference tier latency probing
│       ├── superinference.ts     # Multi-model ensemble inference
│       ├── acp-agent.ts          # Agentic Code Partner sessions
│       ├── stream-reconnect.ts   # Resilient SSE streaming
│       ├── binary-protocol.ts    # Binary frame protocol
│       ├── distributed-bridge.ts # Distributed inference coordination
│       └── __tests__/            # Test files (21 test files, 197+ tests)
└── scripts/
    └── generate-settings.ts      # Zed settings.json generator
```

## License

MIT
