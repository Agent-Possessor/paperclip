import type { AdapterModelProfileDefinition } from "@paperclipai/adapter-utils";

export const type = "kiro_local";
export const label = "Kiro";

export const SANDBOX_INSTALL_COMMAND = "curl -fsSL https://cli.kiro.dev/install | bash";

export const models: Array<{ id: string; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
  { id: "claude-opus-4.8", label: "Claude Opus 4.8" },
  { id: "claude-opus-4.7", label: "Claude Opus 4.7" },
  { id: "claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { id: "claude-sonnet-4.0", label: "Claude Sonnet 4.0" },
  { id: "claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { id: "minimax-m2.5", label: "MiniMax M2.5" },
  { id: "glm-5", label: "GLM-5" },
  { id: "deepseek-3.2", label: "DeepSeek 3.2" },
  { id: "minimax-m2.1", label: "MiniMax M2.1" },
  { id: "qwen3-coder-next", label: "Qwen3 Coder Next" },
];

export const modelProfiles: AdapterModelProfileDefinition[] = [];

export const agentConfigurationDoc = `# kiro_local agent configuration

Adapter: kiro_local

Use when:
- You want Paperclip to run Kiro CLI as an ACP agent
- You want Kiro's native MCP and steering support in a terminal workflow
- You want Kiro sessions to resume through ACP session state

Don't use when:
- You need webhook-style external invocation (use openclaw_gateway or http)
- You only need one-shot shell commands (use process)
- Kiro CLI is not installed on the machine

Core fields:
- cwd (string, optional): default absolute working directory fallback for the agent process (created if missing when possible)
- instructionsFilePath (string, optional): absolute path to a markdown instructions file prepended to the run prompt
- promptTemplate (string, optional): run prompt template
- command (string, optional): defaults to "kiro-cli"
- agentCommand (string, optional): ACP server command override; defaults to "kiro-cli acp"
- agentName (string, optional): custom Kiro agent config name passed as --agent
- mode (string, optional): ACP session mode; persistent or oneshot
- nonInteractivePermissions (string, optional): ACP non-interactive permission fallback; deny or fail
- stateDir (string, optional): ACP state directory override
- warmHandleIdleMs (number, optional): ACP warm process idle timeout; defaults to 0
- env (object, optional): KEY=VALUE environment variables
- extraArgs (string[], optional): additional CLI args

Operational fields:
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period in seconds

Notes:
- Paperclip uses the Kiro ACP entrypoint (kiro-cli acp) and the shared ACP engine for execution.
- Kiro CLI sessions are directory-aware and persist to ~/.kiro by default.
- The adapter keeps the CLI command configurable so custom installs can point at a different binary path.
`;
