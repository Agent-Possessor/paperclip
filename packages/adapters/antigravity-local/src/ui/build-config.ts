import { buildAdapterEnvConfig, type CreateConfigValues } from "@paperclipai/adapter-utils";
import { DEFAULT_ANTIGRAVITY_LOCAL_MODEL } from "../index.js";

function parseCommaArgs(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildAntigravityLocalConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (v.cwd) ac.cwd = v.cwd;
  if (v.instructionsFilePath) ac.instructionsFilePath = v.instructionsFilePath;
  if (v.antigravityEngine === "cli" || v.antigravityEngine === "acp") ac.engine = v.antigravityEngine;
  if (v.antigravityEngine === "acp") {
    if (v.antigravityAcpAgentCommand) ac.agentCommand = v.antigravityAcpAgentCommand;
    ac.mode = v.antigravityAcpMode ?? "persistent";
    ac.nonInteractivePermissions = v.antigravityAcpNonInteractivePermissions ?? "deny";
    if (v.antigravityAcpStateDir) ac.stateDir = v.antigravityAcpStateDir;
    ac.warmHandleIdleMs = v.antigravityAcpWarmHandleIdleMs ?? 0;
  }
  ac.model = v.model || DEFAULT_ANTIGRAVITY_LOCAL_MODEL;
  if (v.thinkingEffort) ac.effort = v.thinkingEffort;
  ac.timeoutSec = 0;
  ac.graceSec = 15;
  const env = buildAdapterEnvConfig(v.envBindings, v.envVars);
  if (Object.keys(env).length > 0) ac.env = env;
  ac.sandbox = !v.dangerouslyBypassSandbox;

  if (v.command) ac.command = v.command;
  if (v.extraArgs) ac.extraArgs = parseCommaArgs(v.extraArgs);
  return ac;
}
