import type { AdapterModelProfileDefinition } from "@paperclipai/adapter-utils";

export const type = "freebuff_local";
export const label = "Freebuff";

export const SANDBOX_INSTALL_COMMAND = "npm install -g freebuff";

export const DEFAULT_FREEBUFF_LOCAL_MODEL = "deepseek-v4-flash";
export const FREEBUFF_LOCAL_ALT_MODEL = "mimo-2.5";

export const models: Array<{ id: string; label: string }> = [
  { id: DEFAULT_FREEBUFF_LOCAL_MODEL, label: "DeepSeek V4 Flash (default)" },
  { id: FREEBUFF_LOCAL_ALT_MODEL, label: "MiMo 2.5" },
];

export const modelProfiles: AdapterModelProfileDefinition[] = [
  {
    key: "cheap",
    label: "Cheap",
    description: "Use Freebuff's DeepSeek default lane as the budget model.",
    adapterConfig: {
      model: DEFAULT_FREEBUFF_LOCAL_MODEL,
    },
    source: "adapter_default",
  },
];

export const agentConfigurationDoc = `# freebuff_local agent configuration

Adapter: freebuff_local

Use when:
- You want Paperclip to run Freebuff CLI locally as the agent runtime
- You want a free terminal coding agent with no API key setup
- You are fine with a lightweight stdin-driven CLI integration while Freebuff's command surface matures

Don't use when:
- You need webhook-style external invocation (use openclaw_gateway or http)
- You need a guaranteed ACP or JSON stream protocol today
- Freebuff CLI is not installed on the machine

Core fields:
- cwd (string, optional): default absolute working directory fallback for the agent process (created if missing when possible)
- instructionsFilePath (string, optional): absolute path to a markdown instructions file prepended to the run prompt
- model (string, optional): Freebuff model id. Defaults to DeepSeek V4 Flash.
- command (string, optional): defaults to "freebuff"
- extraArgs (string[], optional): additional CLI args
- env (object, optional): KEY=VALUE environment variables

Operational fields:
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period in seconds

Notes:
- Freebuff CLI is installed with \`npm install -g freebuff\`.
- The adapter sends the Paperclip wake prompt to Freebuff via stdin and keeps the command configurable for future upstream flags or wrappers.
- Freebuff currently documents a free CLI flow with no API key; model choice is surfaced here so teams can standardize a default, and Paperclip prepends \`/model <id>\` before the task prompt when a model is selected.
- The model list is hardcoded to the two Freebuff models we support today: DeepSeek V4 Flash and MiMo 2.5.
`;
