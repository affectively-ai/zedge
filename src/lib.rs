mod context_server;
mod provider;
mod slash_commands;

use zed_extension_api::{self as zed, *};

struct ZedgeExtension;

impl zed::Extension for ZedgeExtension {
    fn new() -> Self {
        ZedgeExtension
    }

    fn run_slash_command(
        &self,
        command: SlashCommand,
        _args: Vec<String>,
        worktree: Option<&Worktree>,
    ) -> Result<SlashCommandOutput, String> {
        match command.name.as_str() {
            "zedge-status" => slash_commands::run_status(worktree),
            "zedge-models" => slash_commands::run_models(),
            "zedge-pool" => slash_commands::run_pool(),
            "zedge-logs" => slash_commands::run_logs(),
            "zedge-clear" => slash_commands::run_clear(),
            "zedge-restart" => slash_commands::run_restart(),
            "zedge-admin" => slash_commands::run_admin(&_args),
            "zedge-feedback" => slash_commands::run_feedback(),
            _ => Err(format!("Unknown command: {}", command.name)),
        }
    }

    fn complete_slash_command_argument(
        &self,
        command: SlashCommand,
        _args: Vec<String>,
    ) -> Result<Vec<SlashCommandArgumentCompletion>, String> {
        match command.name.as_str() {
            "zedge-models" => Ok(provider::MODELS
                .iter()
                .map(|m| SlashCommandArgumentCompletion {
                    label: m.display_name.to_string(),
                    new_text: m.id.to_string(),
                    run_command: true,
                })
                .collect()),
            "zedge-admin" => {
                let commands = vec![
                    ("doctor", "Runtime and MCP health diagnostics"),
                    ("ops status", "Operator health snapshot"),
                    ("ops logs", "Monitor and log scripts"),
                    ("ops costs", "Cost and spend summary"),
                    ("ops services", "Service inventory"),
                    ("ops cloudrun status", "Cloud Run status"),
                    ("ops cloudrun logs", "Cloud Run logs"),
                    ("ops edge health", "Edge health check"),
                    ("fleet status", "Fleet status snapshot"),
                    ("fleet health", "Fleet health checks"),
                    ("fleet sessions", "Fleet session capacity"),
                    ("fleet logs", "Tail fleet logs"),
                    ("mcp list", "MCP catalog entries"),
                    ("mcp doctor", "MCP catalog health"),
                    ("ai diagnose", "AI diagnostics"),
                    ("ai runbook", "Curated runbook sequences"),
                    ("workflow list", "Available workflows"),
                ];
                Ok(commands.into_iter().map(|(cmd, desc)| SlashCommandArgumentCompletion {
                    label: format!("{cmd} — {desc}"),
                    new_text: cmd.to_string(),
                    run_command: true,
                }).collect())
            }
            _ => Ok(Vec::new()),
        }
    }

    fn context_server_command(
        &mut self,
        context_server_id: &ContextServerId,
        _project: &Project,
    ) -> Result<Command> {
        if context_server_id.as_ref() == "zedge-companion" {
            Ok(Command {
                command: "bun".to_string(),
                args: vec!["open-source/zedge/companion/src/index.ts".to_string()],
                env: Vec::new(),
            })
        } else {
            Err(format!("Unknown context server: {context_server_id}"))
        }
    }

    fn context_server_configuration(
        &mut self,
        context_server_id: &ContextServerId,
        _project: &Project,
    ) -> Result<Option<ContextServerConfiguration>> {
        if context_server_id.as_ref() == "zedge-companion" {
            Ok(Some(ContextServerConfiguration {
                installation_instructions: "Install Bun (https://bun.sh) and run:\n\n```\nbun open-source/zedge/companion/src/index.ts\n```\n\nThe companion sidecar provides inference, CRDT collaboration, and workspace context on localhost:7331.".to_string(),
                settings_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "port": { "type": "number", "default": 7331 },
                        "preferredModel": { "type": "string", "default": "tinyllama-1.1b" },
                        "cloudRunDirect": { "type": "boolean", "default": true }
                    }
                }).to_string(),
                default_settings: serde_json::json!({
                    "port": 7331,
                    "preferredModel": "tinyllama-1.1b",
                    "cloudRunDirect": true
                }).to_string(),
            }))
        } else {
            Ok(None)
        }
    }
}

zed::register_extension!(ZedgeExtension);
