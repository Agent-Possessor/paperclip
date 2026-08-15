import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  ensureAdapterExecutionTargetCommandResolvable,
  maybeRunSandboxInstallCommand,
  resolveAdapterExecutionTargetCwd,
} from "@paperclipai/adapter-utils/execution-target";
import {
  DEFAULT_ACP_ENGINE_MODE,
  DEFAULT_ACP_ENGINE_NON_INTERACTIVE_PERMISSIONS,
  DEFAULT_ACP_ENGINE_PERMISSION_MODE,
  DEFAULT_ACP_ENGINE_WARM_HANDLE_IDLE_MS,
} from "@paperclipai/adapter-utils/acpx-engine/constants";
import type { AcpxEngineExecutorOptions } from "@paperclipai/adapter-utils/acpx-engine/execute";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const packageRootDir = path.resolve(moduleDir, "../..");

type KiroAcpExecutorOptions = Omit<AcpxEngineExecutorOptions, "adapterType" | "moduleDir" | "packageRootDir">;
type KiroAcpExecutor = (ctx: AdapterExecutionContext) => Promise<AdapterExecutionResult>;

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildKiroAcpConfig(config: Record<string, unknown>): Record<string, unknown> {
  const command = firstNonEmptyString(config.command) ?? "kiro-cli";
  const agentName = firstNonEmptyString(config.agentName, config.acpAgentName);
  const agentCommand =
    firstNonEmptyString(config.agentCommand, config.acpAgentCommand) ??
    (agentName ? `${command} acp --agent ${shellQuote(agentName)}` : `${command} acp`);
  const stateDir = firstNonEmptyString(config.stateDir, config.acpStateDir);
  const mode = firstNonEmptyString(config.mode, config.acpMode) ?? DEFAULT_ACP_ENGINE_MODE;
  const permissionMode =
    firstNonEmptyString(config.permissionMode, config.acpPermissionMode) ??
    DEFAULT_ACP_ENGINE_PERMISSION_MODE;
  const nonInteractivePermissions =
    firstNonEmptyString(config.nonInteractivePermissions, config.acpNonInteractivePermissions) ??
    DEFAULT_ACP_ENGINE_NON_INTERACTIVE_PERMISSIONS;
  const warmHandleIdleMs =
    config.warmHandleIdleMs ??
    config.acpWarmHandleIdleMs ??
    DEFAULT_ACP_ENGINE_WARM_HANDLE_IDLE_MS;

  return {
    ...config,
    agent: "kiro",
    mode,
    permissionMode,
    nonInteractivePermissions,
    warmHandleIdleMs,
    command,
    agentCommand,
    ...(stateDir ? { stateDir } : {}),
  };
}

function withKiroAcpDefaults(options: KiroAcpExecutorOptions): AcpxEngineExecutorOptions {
  return {
    ...options,
    adapterType: "kiro_local",
    moduleDir,
    packageRootDir,
  };
}

export function createKiroAcpExecutor(options: KiroAcpExecutorOptions = {}): KiroAcpExecutor {
  let executor: KiroAcpExecutor | null = null;
  return async (ctx) => {
    if (!executor) {
      const { createAcpxEngineExecutor } = await import("@paperclipai/adapter-utils/acpx-engine/execute");
      executor = createAcpxEngineExecutor(withKiroAcpDefaults(options)) as KiroAcpExecutor;
    }
    const currentExecutor = executor;
    if (!currentExecutor) {
      throw new Error("Kiro ACP executor was not initialized");
    }
    return currentExecutor({
      ...ctx,
      config: buildKiroAcpConfig(ctx.config),
    });
  };
}
