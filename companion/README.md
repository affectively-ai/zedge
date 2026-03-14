# @affectively/zedge-companion

`@affectively/zedge-companion` is the local sidecar service behind Zedge.

The fair brag is that it is more than a thin proxy. It handles inference routing, local coordination, and the service layer that the Zed extension talks to on `localhost:7331`.

## What It Helps You Do

- run the local Zedge companion service
- expose an OpenAI-compatible inference endpoint to Zed
- provide the MCP entry point and other sidecar behaviors

## Commands

```bash
bun run src/index.ts
bun run --watch src/index.ts
bun run src/mcp-stdio.ts
```

## Why This README Exists

The companion is a real package with its own runtime role, so it should have its own entry point in the docs.
