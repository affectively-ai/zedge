mod context_server;
mod provider;
mod slash_commands;

use zed_extension_api as zed;

struct ZedgeExtension {
    companion_url: String,
}

impl zed::Extension for ZedgeExtension {
    fn new() -> Self {
        ZedgeExtension {
            companion_url: provider::COMPANION_URL.to_string(),
        }
    }

    fn language_model_id(&self) -> Option<String> {
        Some("zedge".to_string())
    }

    fn language_model_name(&self) -> Option<String> {
        Some("Zedge".to_string())
    }

    fn complete(&self, params: zed::CompletionParams) -> Result<String, String> {
        let request_body = serde_json::json!({
            "model": params.model.unwrap_or_else(|| "tinyllama-1.1b".to_string()),
            "messages": params.messages.iter().map(|m| {
                serde_json::json!({
                    "role": m.role,
                    "content": m.content
                })
            }).collect::<Vec<_>>(),
            "temperature": params.temperature.unwrap_or(0.7),
            "max_tokens": params.max_tokens.unwrap_or(2048),
            "stream": false
        });

        let url = format!("{}/v1/chat/completions", self.companion_url);

        let response = zed::http_client::fetch(&zed::http_client::HttpRequest {
            url: url.clone(),
            method: zed::http_client::HttpMethod::Post,
            headers: vec![
                ("Content-Type".to_string(), "application/json".to_string()),
            ],
            body: Some(request_body.to_string()),
            redirect_policy: zed::http_client::RedirectPolicy::FollowAll,
        }).map_err(|e| format!("HTTP error: {}", e))?;

        let body: serde_json::Value = serde_json::from_str(&response.body)
            .map_err(|e| format!("JSON parse error: {}", e))?;

        body["choices"][0]["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "No content in response".to_string())
    }

    fn run_slash_command(
        &self,
        command: zed::SlashCommand,
        _args: Vec<String>,
    ) -> Result<String, String> {
        match command.name.as_str() {
            "zedge-status" => {
                let url = format!("{}/health", self.companion_url);
                match zed::http_client::fetch(&zed::http_client::HttpRequest {
                    url,
                    method: zed::http_client::HttpMethod::Get,
                    headers: vec![],
                    body: None,
                    redirect_policy: zed::http_client::RedirectPolicy::FollowAll,
                }) {
                    Ok(resp) => Ok(slash_commands::format_status_response(&resp.body)),
                    Err(e) => Ok(format!("Companion unavailable: {}. Start it with: bun open-source/zedge/companion/src/index.ts", e)),
                }
            }
            "zedge-models" => {
                let url = format!("{}/v1/models", self.companion_url);
                match zed::http_client::fetch(&zed::http_client::HttpRequest {
                    url,
                    method: zed::http_client::HttpMethod::Get,
                    headers: vec![],
                    body: None,
                    redirect_policy: zed::http_client::RedirectPolicy::FollowAll,
                }) {
                    Ok(resp) => Ok(slash_commands::format_models_response(&resp.body)),
                    Err(e) => Ok(format!("Companion unavailable: {}", e)),
                }
            }
            "zedge-pool" => {
                let url = format!("{}/compute-pool/status", self.companion_url);
                match zed::http_client::fetch(&zed::http_client::HttpRequest {
                    url,
                    method: zed::http_client::HttpMethod::Get,
                    headers: vec![],
                    body: None,
                    redirect_policy: zed::http_client::RedirectPolicy::FollowAll,
                }) {
                    Ok(resp) => Ok(slash_commands::format_pool_response(&resp.body)),
                    Err(e) => Ok(format!("Companion unavailable: {}", e)),
                }
            }
            "zedge-feedback" => {
                Ok("Feedback noted. Quality ratings help improve model routing.".to_string())
            }
            _ => Err(format!("Unknown command: {}", command.name)),
        }
    }

    fn slash_commands(&self) -> Vec<zed::SlashCommand> {
        slash_commands::COMMANDS
            .iter()
            .map(|cmd| zed::SlashCommand {
                name: cmd.name.to_string(),
                description: cmd.description.to_string(),
                tooltip_text: cmd.description.to_string(),
                requires_argument: false,
            })
            .collect()
    }
}

zed::register_extension!(ZedgeExtension);
