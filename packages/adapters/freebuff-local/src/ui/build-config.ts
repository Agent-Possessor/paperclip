import { buildAdapterEnvConfig, type CreateConfigValues } from "@paperclipai/adapter-utils";
import { DEFAULT_FREEBUFF_LOCAL_MODEL } from "../index.js";

function parseCommaArgs(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function buildFreebuffLocalConfig(values: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (values.cwd) ac.cwd = values.cwd;
  if (values.instructionsFilePath) ac.instructionsFilePath = values.instructionsFilePath;
  if (values.promptTemplate) ac.promptTemplate = values.promptTemplate;
  ac.model = values.model || DEFAULT_FREEBUFF_LOCAL_MODEL;
  if (values.thinkingEffort) ac.thinkingEffort = values.thinkingEffort;
  if (values.command) ac.command = values.command;
  if (values.extraArgs) ac.extraArgs = parseCommaArgs(values.extraArgs);
  ac.timeoutSec = 0;
  ac.graceSec = 15;
  const env = buildAdapterEnvConfig(values.envBindings, values.envVars);
  if (Object.keys(env).length > 0) ac.env = env;
  if (values.workspaceStrategyType === "git_worktree") {
    ac.workspaceStrategy = {
      type: "git_worktree",
      ...(values.workspaceBaseRef ? { baseRef: values.workspaceBaseRef } : {}),
      ...(values.workspaceBranchTemplate ? { branchTemplate: values.workspaceBranchTemplate } : {}),
      ...(values.worktreeParentDir ? { worktreeParentDir: values.worktreeParentDir } : {}),
    };
  }
  const runtimeServices = parseJsonObject(values.runtimeServicesJson ?? "");
  if (runtimeServices && Array.isArray(runtimeServices.services)) {
    ac.workspaceRuntime = runtimeServices;
  }
  if (values.adapterSchemaValues) Object.assign(ac, values.adapterSchemaValues);
  return ac;
}
