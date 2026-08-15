import type { AdapterConfigSchema } from "@paperclipai/adapter-utils";
import {
  DEFAULT_ACP_ENGINE_MODE,
  DEFAULT_ACP_ENGINE_NON_INTERACTIVE_PERMISSIONS,
  DEFAULT_ACP_ENGINE_WARM_HANDLE_IDLE_MS,
} from "@paperclipai/adapter-utils/acpx-engine/constants";

export function getConfigSchema(): AdapterConfigSchema {
  return {
    fields: [
      {
        key: "command",
        label: "Kiro CLI command",
        type: "text",
        default: "kiro-cli",
        hint: "Path or command name used to launch Kiro CLI.",
      },
      {
        key: "agentCommand",
        label: "ACP server command",
        type: "text",
        hint: 'Optional override for the Kiro ACP server command. Defaults to "kiro-cli acp".',
      },
      {
        key: "agentName",
        label: "Kiro agent name",
        type: "text",
        hint: 'Optional Kiro custom agent config passed as "--agent". When set, Paperclip uses "kiro-cli acp --agent <name>" unless agentCommand is overridden.',
      },
      {
        key: "mode",
        label: "ACP session mode",
        type: "select",
        default: DEFAULT_ACP_ENGINE_MODE,
        options: [
          { value: "persistent", label: "Persistent" },
          { value: "oneshot", label: "One-shot" },
        ],
        hint: "Persistent keeps ACP session state between runs. One-shot starts fresh each run.",
      },
      {
        key: "nonInteractivePermissions",
        label: "ACP non-interactive permissions",
        type: "select",
        default: DEFAULT_ACP_ENGINE_NON_INTERACTIVE_PERMISSIONS,
        options: [
          { value: "deny", label: "Deny" },
          { value: "fail", label: "Fail" },
        ],
        hint: "Fallback if the ACP agent asks for input outside an interactive session.",
      },
      {
        key: "stateDir",
        label: "ACP state directory",
        type: "text",
        hint: "Optional ACP session state directory. Defaults to Paperclip-managed storage.",
      },
      {
        key: "warmHandleIdleMs",
        label: "ACP warm process idle ms",
        type: "number",
        default: DEFAULT_ACP_ENGINE_WARM_HANDLE_IDLE_MS,
        hint: "Defaults to 0, which closes the ACP process after each run while retaining persistent session state.",
      },
    ],
  };
}
