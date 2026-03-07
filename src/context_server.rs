/// Zedge Context Server
///
/// Provides workspace context to inference for code-aware completions.
/// In the Zed WASM sandbox, filesystem access is limited. The context
/// server fetches workspace info from the companion sidecar which has
/// full filesystem access via the ACP agent session.

use serde::{Deserialize, Serialize};

/// Context types that can be provided to inference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContextType {
    FileTree,
    OpenBuffers,
    GitDiff,
    Selection,
}

/// A piece of workspace context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceContext {
    pub context_type: ContextType,
    pub content: String,
}

/// Build a system prompt enrichment from workspace context
pub fn build_context_prompt(contexts: &[WorkspaceContext]) -> String {
    let mut parts = Vec::new();

    for ctx in contexts {
        match ctx.context_type {
            ContextType::FileTree => {
                parts.push(format!("<file_tree>\n{}\n</file_tree>", ctx.content));
            }
            ContextType::OpenBuffers => {
                parts.push(format!("<open_files>\n{}\n</open_files>", ctx.content));
            }
            ContextType::GitDiff => {
                parts.push(format!("<git_diff>\n{}\n</git_diff>", ctx.content));
            }
            ContextType::Selection => {
                parts.push(format!("<selection>\n{}\n</selection>", ctx.content));
            }
        }
    }

    if parts.is_empty() {
        return String::new();
    }

    format!(
        "The following workspace context is available:\n\n{}",
        parts.join("\n\n")
    )
}

/// Fetch workspace context from the companion sidecar's ACP agent
///
/// This creates an agent session (or reuses an existing one) and
/// gathers file tree and git diff context from the workspace.
pub fn fetch_context_from_companion(
    companion_url: &str,
    workspace_path: &str,
) -> Result<Vec<WorkspaceContext>, String> {
    use crate::provider::COMPANION_URL;

    let url = companion_url;

    // Create a session to get workspace context
    let session_body = serde_json::json!({
        "workspace_path": workspace_path,
        "capabilities": {
            "fileRead": true,
            "fileWrite": false,
            "gitAccess": true,
            "processExec": []
        }
    });

    let session_resp = zed_extension_api::http_client::fetch(
        &zed_extension_api::http_client::HttpRequest {
            url: format!("{}/agent/session", url),
            method: zed_extension_api::http_client::HttpMethod::Post,
            headers: vec![
                ("Content-Type".to_string(), "application/json".to_string()),
            ],
            body: Some(session_body.to_string()),
            redirect_policy: zed_extension_api::http_client::RedirectPolicy::FollowAll,
        },
    )
    .map_err(|e| format!("Failed to create session: {}", e))?;

    let session: serde_json::Value = serde_json::from_str(&session_resp.body)
        .map_err(|e| format!("Failed to parse session: {}", e))?;

    let session_id = session["session_id"]
        .as_str()
        .ok_or("No session_id in response")?;

    // Ask the agent to describe the workspace
    let turn_body = serde_json::json!({
        "session_id": session_id,
        "message": "List the top-level files and show the current git diff."
    });

    let turn_resp = zed_extension_api::http_client::fetch(
        &zed_extension_api::http_client::HttpRequest {
            url: format!("{}/agent/turn", url),
            method: zed_extension_api::http_client::HttpMethod::Post,
            headers: vec![
                ("Content-Type".to_string(), "application/json".to_string()),
            ],
            body: Some(turn_body.to_string()),
            redirect_policy: zed_extension_api::http_client::RedirectPolicy::FollowAll,
        },
    )
    .map_err(|e| format!("Agent turn failed: {}", e))?;

    let turn: serde_json::Value = serde_json::from_str(&turn_resp.body)
        .map_err(|e| format!("Failed to parse turn: {}", e))?;

    let content = turn["content"].as_str().unwrap_or("");

    // Clean up session
    let _ = zed_extension_api::http_client::fetch(
        &zed_extension_api::http_client::HttpRequest {
            url: format!("{}/agent/session/{}", url, session_id),
            method: zed_extension_api::http_client::HttpMethod::Delete,
            headers: vec![],
            body: None,
            redirect_policy: zed_extension_api::http_client::RedirectPolicy::FollowAll,
        },
    );

    Ok(vec![WorkspaceContext {
        context_type: ContextType::FileTree,
        content: content.to_string(),
    }])
}
