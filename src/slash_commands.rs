/// Zedge Slash Commands (v0.7 API)
///
/// Uses HttpRequest builder, SlashCommandOutput with labeled sections,
/// and Worktree for workspace-aware context.

use zed_extension_api::{self as zed, http_client::*, SlashCommandOutput, SlashCommandOutputSection, Worktree};

use crate::provider;

/// Helper: GET from companion and return body as string
fn companion_get(path: &str) -> Result<String, String> {
    let url = format!("{}{}", provider::COMPANION_URL, path);
    let response = HttpRequest::builder()
        .method(HttpMethod::Get)
        .url(&url)
        .redirect_policy(RedirectPolicy::FollowAll)
        .build()?
        .fetch()
        .map_err(|e| format!("Companion unavailable: {e}"))?;
    String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8: {e}"))
}

/// Helper: POST to companion and return body as string
fn companion_post(path: &str) -> Result<String, String> {
    let url = format!("{}{}", provider::COMPANION_URL, path);
    let response = HttpRequest::builder()
        .method(HttpMethod::Post)
        .url(&url)
        .redirect_policy(RedirectPolicy::FollowAll)
        .build()?
        .fetch()
        .map_err(|e| format!("Companion unavailable: {e}"))?;
    String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8: {e}"))
}

/// Helper: DELETE to companion and return body as string
fn companion_delete(path: &str) -> Result<String, String> {
    let url = format!("{}{}", provider::COMPANION_URL, path);
    let response = HttpRequest::builder()
        .method(HttpMethod::Delete)
        .url(&url)
        .redirect_policy(RedirectPolicy::FollowAll)
        .build()?
        .fetch()
        .map_err(|e| format!("Companion unavailable: {e}"))?;
    String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8: {e}"))
}

/// Build a SlashCommandOutput with a single labeled section spanning the full text
fn output_with_section(text: String, label: &str) -> SlashCommandOutput {
    let len = text.len() as u32;
    SlashCommandOutput {
        text,
        sections: vec![SlashCommandOutputSection {
            range: zed::Range { start: 0, end: len },
            label: label.to_string(),
        }],
    }
}

/// /zedge-status — inference chain health, compute pool, CRDT, workspace info
pub fn run_status(worktree: Option<&Worktree>) -> Result<SlashCommandOutput, String> {
    let mut parts: Vec<String> = Vec::new();

    match companion_get("/health") {
        Ok(health_json) => {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&health_json) {
                let status = v["status"].as_str().unwrap_or("unknown");
                let version = v["version"].as_str().unwrap_or("?");
                let model = v["preferredModel"].as_str().unwrap_or("?");
                let mesh_peers = v["mesh"]["peerCount"].as_u64().unwrap_or(0);
                let mesh_models = v["mesh"]["totalModels"].as_u64().unwrap_or(0);
                let pool_joined = v["computePool"]["joined"].as_bool().unwrap_or(false);
                let pool_tokens = v["computePool"]["tokensEarned"].as_u64().unwrap_or(0);
                let crdt_peers = v["ghostwriter"]["crdt"]["peerCount"].as_u64().unwrap_or(0);
                let crdt_files: Vec<&str> = v["ghostwriter"]["crdt"]["openFiles"]
                    .as_array()
                    .map(|a| a.iter().filter_map(|f| f.as_str()).collect())
                    .unwrap_or_default();
                let ucan_did = v["ghostwriter"]["ucan"]["did"].as_str().unwrap_or("none");

                parts.push(format!("## Zedge Companion v{version}"));
                parts.push(format!("**Status**: {status}"));
                parts.push(format!("**Model**: {model}"));
                parts.push(format!("**Mesh**: {mesh_peers} peers, {mesh_models} models"));
                parts.push(format!("**Pool**: {} (tokens: {pool_tokens})",
                    if pool_joined { "joined" } else { "not joined" }));
                parts.push(format!("**Ghostwriter CRDT**: {crdt_peers} peers, {} open files", crdt_files.len()));
                parts.push(format!("**UCAN DID**: `{ucan_did}`"));

                // Inference tiers
                let edge = v["inference"]["edgeAvailable"].as_bool().unwrap_or(false);
                let cloudrun = v["inference"]["cloudRunDirect"].as_bool().unwrap_or(false);
                let wasm = v["inference"]["wasmLocal"].as_bool().unwrap_or(false);
                parts.push(format!(
                    "**Inference**: edge={}, cloudrun={}, wasm={}",
                    if edge { "ok" } else { "off" },
                    if cloudrun { "ok" } else { "off" },
                    if wasm { "ok" } else { "off" },
                ));
            } else {
                parts.push(format!("```json\n{health_json}\n```"));
            }
        }
        Err(e) => {
            parts.push(format!("**Companion offline**: {e}"));
            parts.push("Start with: `bun open-source/zedge/companion/src/index.ts`".to_string());
        }
    }

    // Workspace context from worktree (v0.7 feature)
    if let Some(wt) = worktree {
        let root = wt.root_path();
        parts.push(format!("\n**Workspace**: `{root}`"));

        if let Ok(aeon_toml) = wt.read_text_file("aeon.toml") {
            let lines: Vec<&str> = aeon_toml.lines().take(5).collect();
            parts.push(format!("**aeon.toml**:\n```\n{}\n```", lines.join("\n")));
        }
    }

    let text = parts.join("\n");
    Ok(output_with_section(text, "Zedge Status"))
}

/// /zedge-models — list available models with tier info
pub fn run_models() -> Result<SlashCommandOutput, String> {
    let mut parts: Vec<String> = Vec::new();

    match companion_get("/v1/models") {
        Ok(models_json) => {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&models_json) {
                parts.push("## Available Models\n".to_string());
                parts.push("| Model | Owner |".to_string());
                parts.push("|:---|:---|".to_string());

                if let Some(data) = v["data"].as_array() {
                    for model in data {
                        let id = model["id"].as_str().unwrap_or("?");
                        let owner = model["owned_by"].as_str().unwrap_or("?");
                        parts.push(format!("| `{id}` | {owner} |"));
                    }
                }

                parts.push("\n### Model Details\n".to_string());
                for m in provider::MODELS {
                    parts.push(format!("- **{}** (`{}`) — max {} tokens", m.display_name, m.id, m.max_tokens));
                }
            } else {
                parts.push(format!("```json\n{models_json}\n```"));
            }
        }
        Err(e) => {
            parts.push(format!("**Companion offline**: {e}\n"));
            parts.push("Built-in model list:\n".to_string());
            for m in provider::MODELS {
                parts.push(format!("- **{}** (`{}`)", m.display_name, m.id));
            }
        }
    }

    let text = parts.join("\n");
    Ok(output_with_section(text, "Zedge Models"))
}

/// /zedge-pool — compute pool status and earnings
pub fn run_pool() -> Result<SlashCommandOutput, String> {
    let mut parts: Vec<String> = Vec::new();

    match companion_get("/compute-pool/status") {
        Ok(pool_json) => {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&pool_json) {
                let joined = v["joined"].as_bool().unwrap_or(false);
                let tokens = v["tokensEarned"].as_u64().unwrap_or(0);
                let requests = v["requestsServed"].as_u64().unwrap_or(0);
                let nodes = v["connectedNodes"].as_u64().unwrap_or(0);
                let wasm = v["wasmBridgeAvailable"].as_bool().unwrap_or(false);

                parts.push("## Compute Pool\n".to_string());
                parts.push(format!("**Status**: {}", if joined { "Joined" } else { "Not joined" }));
                parts.push(format!("**Tokens earned**: {tokens}"));
                parts.push(format!("**Requests served**: {requests}"));
                parts.push(format!("**Connected nodes**: {nodes}"));
                parts.push(format!("**WASM bridge**: {}", if wasm { "available" } else { "unavailable" }));
                parts.push("\n**Commands**:".to_string());
                parts.push("- Join: `curl -X POST http://localhost:7331/compute-pool/join`".to_string());
                parts.push("- Leave: `curl -X POST http://localhost:7331/compute-pool/leave`".to_string());
            } else {
                parts.push(format!("```json\n{pool_json}\n```"));
            }
        }
        Err(e) => {
            parts.push(format!("**Companion offline**: {e}"));
        }
    }

    let text = parts.join("\n");
    Ok(output_with_section(text, "Compute Pool"))
}

/// /zedge-logs — recent inference logs
pub fn run_logs() -> Result<SlashCommandOutput, String> {
    match companion_get("/logs?n=100") {
        Ok(logs_json) => {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&logs_json) {
                let mut parts: Vec<String> = Vec::new();
                let count = v["count"].as_u64().unwrap_or(0);
                parts.push(format!("## Inference Logs ({count} entries)\n"));
                parts.push("```".to_string());
                if let Some(lines) = v["lines"].as_array() {
                    for line in lines {
                        if let Some(s) = line.as_str() {
                            parts.push(s.to_string());
                        }
                    }
                }
                parts.push("```".to_string());
                let text = parts.join("\n");
                Ok(output_with_section(text, "Inference Logs"))
            } else {
                Ok(output_with_section(format!("```\n{logs_json}\n```"), "Inference Logs"))
            }
        }
        Err(e) => {
            Ok(output_with_section(
                format!("**Companion offline**: {e}\n\nStart with: `bun open-source/zedge/companion/src/index.ts`"),
                "Inference Logs",
            ))
        }
    }
}

/// /zedge-clear — clear inference logs
pub fn run_clear() -> Result<SlashCommandOutput, String> {
    match companion_delete("/logs") {
        Ok(_) => Ok(output_with_section("Inference logs cleared.".to_string(), "Logs Cleared")),
        Err(e) => Ok(output_with_section(format!("**Companion offline**: {e}"), "Logs Cleared")),
    }
}

/// /zedge-restart — restart companion sidecar
pub fn run_restart() -> Result<SlashCommandOutput, String> {
    match companion_post("/restart") {
        Ok(_) => Ok(output_with_section(
            "Companion is restarting. It will be back in a few seconds.".to_string(),
            "Companion Restart",
        )),
        Err(e) => Ok(output_with_section(format!("**Companion offline**: {e}"), "Companion Restart")),
    }
}

/// /zedge-feedback — RLHF quality feedback
pub fn run_feedback() -> Result<SlashCommandOutput, String> {
    let text = "Feedback noted. Quality ratings help improve model routing.\n\nTo submit detailed feedback, POST to `http://localhost:7331/feedback` with:\n```json\n{\"model\": \"tinyllama-1.1b\", \"rating\": 4, \"comment\": \"Good response\"}\n```".to_string();
    Ok(output_with_section(text, "Zedge Feedback"))
}
