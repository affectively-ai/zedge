/// Zedge Slash Commands
///
/// Custom slash commands for the Zed AI assistant panel:
/// - /zedge-status  — inference chain health, compute pool stats, token balance
/// - /zedge-models  — list models with tier and readiness
/// - /zedge-pool    — toggle compute pool on/off, show earnings
/// - /zedge-feedback — RLHF feedback on response quality

/// Slash command definitions
pub struct SlashCommand {
    pub name: &'static str,
    pub description: &'static str,
}

pub const COMMANDS: &[SlashCommand] = &[
    SlashCommand {
        name: "zedge-status",
        description: "Show inference chain health, compute pool stats, and token balance",
    },
    SlashCommand {
        name: "zedge-models",
        description: "List available models with latency tier and readiness",
    },
    SlashCommand {
        name: "zedge-pool",
        description: "Toggle compute pool participation and show earnings dashboard",
    },
    SlashCommand {
        name: "zedge-feedback",
        description: "Submit RLHF feedback on response quality",
    },
];

/// Format status response from companion /health endpoint
pub fn format_status_response(health_json: &str) -> String {
    format!(
        "## Zedge Status\n\n```json\n{}\n```\n\nQuery the companion at http://localhost:7331/health for live data.",
        health_json
    )
}

/// Format models response from companion /v1/models endpoint
pub fn format_models_response(models_json: &str) -> String {
    format!(
        "## Available Models\n\n```json\n{}\n```\n\nTiers: edge (CF Workers) > cloudrun (direct) > wasm (local fallback)",
        models_json
    )
}

/// Format pool status response
pub fn format_pool_response(pool_json: &str) -> String {
    format!(
        "## Compute Pool\n\n```json\n{}\n```\n\nJoin: POST http://localhost:7331/compute-pool/join\nLeave: POST http://localhost:7331/compute-pool/leave",
        pool_json
    )
}
