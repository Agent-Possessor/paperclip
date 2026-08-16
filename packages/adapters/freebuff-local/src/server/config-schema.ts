import type { AdapterConfigSchema } from "@paperclipai/adapter-utils";
import { DEFAULT_FREEBUFF_LOCAL_MODEL, FREEBUFF_LOCAL_ALT_MODEL } from "../index.js";

export function getConfigSchema(): AdapterConfigSchema {
  return {
    fields: [
      {
        key: "command",
        label: "Freebuff CLI command",
        type: "text",
        default: "freebuff",
        hint: "Path or command name used to launch Freebuff CLI.",
      },
      {
        key: "model",
        label: "Default Freebuff model",
        type: "select",
        default: DEFAULT_FREEBUFF_LOCAL_MODEL,
        options: [
          { value: DEFAULT_FREEBUFF_LOCAL_MODEL, label: "DeepSeek V4 Flash (default)" },
          { value: FREEBUFF_LOCAL_ALT_MODEL, label: "MiMo 2.5" },
        ],
        hint: "Paperclip prepends /model <id> to the run prompt so Freebuff starts on the selected model.",
      },
      {
        key: "cwd",
        label: "Working directory",
        type: "text",
        hint: "Absolute working directory for the Freebuff process.",
      },
      {
        key: "instructionsFilePath",
        label: "Instructions file",
        type: "text",
        hint: "Optional markdown file prepended to the wake prompt.",
      },
      {
        key: "extraArgs",
        label: "Extra CLI args",
        type: "text",
        hint: "Additional command line arguments appended after the command.",
      },
      {
        key: "timeoutSec",
        label: "Timeout",
        type: "number",
        hint: "Run timeout in seconds.",
      },
      {
        key: "graceSec",
        label: "Grace period",
        type: "number",
        hint: "SIGTERM grace period in seconds.",
      },
    ],
  };
}
