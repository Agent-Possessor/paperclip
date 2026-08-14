import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@paperclipai/adapter-utils";
import {
  ensureAdapterExecutionTargetCommandResolvable,
  readAdapterExecutionTarget,
  resolveAdapterExecutionTargetCwd,
  runAdapterExecutionTargetShellCommand,
} from "@paperclipai/adapter-utils/execution-target";
import {
  DEFAULT_ACP_ENGINE_MODE,
  DEFAULT_ACP_ENGINE_NON_INTERACTIVE_PERMISSIONS,
  DEFAULT_ACP_ENGINE_PERMISSION_MODE,
  DEFAULT_ACP_ENGINE_WARM_HANDLE_IDLE_MS,
} from "@paperclipai/adapter-utils/acpx-engine/constants";
import type {
  AcpxEngineExecutorOptions,
  AcpxRemoteManagedHomeContext,
  AcpxRemoteManagedHomeResult,
} from "@paperclipai/adapter-utils/acpx-engine/execute";
import {
  asNumber,
  asString,
  parseObject,
} from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_ANTIGRAVITY_LOCAL_MODEL } from "../index.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const packageRootDir = path.resolve(moduleDir, "../..");
const MIN_ACP_NODE_VERSION = "20.0.0";

export type AntigravityExecutionEngine = "cli" | "acp";

export interface AntigravityEngineSelection {
  engine: AntigravityExecutionEngine;
  explicit: boolean;
  fallbackReason?: string;
}

type AntigravityEngineResolutionInput =
  Pick<AdapterExecutionContext, "config"> &
  Partial<Pick<AdapterExecutionContext, "executionTarget" | "executionTransport">>;

type AntigravityAcpExecutorOptions = Omit<
  AcpxEngineExecutorOptions,
  "adapterType" | "moduleDir" | "packageRootDir"
>;

type AntigravityAcpExecutor = (ctx: AdapterExecutionContext) => Promise<AdapterExecutionResult>;

function normalizeEngine(value: unknown, config?: Record<string, unknown>): AntigravityEngineSelection {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "acp") return { engine: "acp", explicit: true };
  if (raw === "cli") return { engine: "cli", explicit: true };
  const configuredAgentCommand = firstNonEmptyString(
    config?.agentCommand,
    config?.antigravityAcpAgentCommand,
    config?.acpAgentCommand,
  );
  if (configuredAgentCommand) return { engine: "acp", explicit: false };
  return { engine: "cli", explicit: false };
}

export function resolveAntigravityExecutionEngine(config: Record<string, unknown>): AntigravityEngineSelection {
  return normalizeEngine(config.engine, config);
}

export async function resolveAntigravityExecutionEngineForRun(
  input: AntigravityEngineResolutionInput,
): Promise<AntigravityEngineSelection> {
  const selection = normalizeEngine(input.config.engine, input.config);
  if (selection.explicit || selection.engine !== "acp") return selection;

  const fallbackReason = await defaultAntigravityAcpFallbackReason(input);
  if (!fallbackReason) return selection;
  return { engine: "cli", explicit: false, fallbackReason };
}

export function formatAntigravityAcpFallbackMessage(reason: string): string {
  return `[paperclip] Antigravity ACP default unavailable; falling back to Antigravity CLI. ${reason} Set engine=acp to require ACP or engine=cli to silence this fallback.\n`;
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

export function buildAntigravityAcpConfig(config: Record<string, unknown>): Record<string, unknown> {
  const configuredAgentCommand = firstNonEmptyString(config.agentCommand, config.antigravityAcpAgentCommand, config.acpAgentCommand);
  const configuredAntigravityCommand = firstNonEmptyString(config.command);
  const agentCommand = configuredAgentCommand ?? (configuredAntigravityCommand ? `${configuredAntigravityCommand} --acp` : undefined);
  const stateDir = firstNonEmptyString(config.stateDir, config.antigravityAcpStateDir, config.acpStateDir);
  const mode = firstNonEmptyString(config.mode, config.antigravityAcpMode, config.acpMode) ?? DEFAULT_ACP_ENGINE_MODE;
  const permissionMode =
    firstNonEmptyString(config.permissionMode, config.acpPermissionMode) ??
    DEFAULT_ACP_ENGINE_PERMISSION_MODE;
  const nonInteractivePermissions =
    firstNonEmptyString(config.nonInteractivePermissions, config.antigravityAcpNonInteractivePermissions, config.acpNonInteractivePermissions) ??
    DEFAULT_ACP_ENGINE_NON_INTERACTIVE_PERMISSIONS;
  const warmHandleIdleMs =
    config.warmHandleIdleMs ??
    config.antigravityAcpWarmHandleIdleMs ??
    config.acpWarmHandleIdleMs ??
    DEFAULT_ACP_ENGINE_WARM_HANDLE_IDLE_MS;

  const next: Record<string, unknown> = {
    ...config,
    agent: "antigravity",
    mode,
    permissionMode,
    nonInteractivePermissions,
    warmHandleIdleMs,
    ...(agentCommand ? { agentCommand } : {}),
    ...(stateDir ? { stateDir } : {}),
  };
  const model = asString(next.model, "").trim();
  if (!model || model === DEFAULT_ANTIGRAVITY_LOCAL_MODEL) delete next.model;
  return next;
}

function resolveAntigravitySkillsHome(config: Record<string, unknown>): string {
  const envConfig = parseObject(config.env);
  const configuredHome =
    typeof envConfig.HOME === "string" && envConfig.HOME.trim().length > 0
      ? path.resolve(envConfig.HOME.trim())
      : os.homedir();
  return path.join(configuredHome, ".gemini", "antigravity-cli", "skills");
}

async function prepareAntigravityRemoteManagedHome(
  input: AcpxRemoteManagedHomeContext,
): Promise<AcpxRemoteManagedHomeResult> {
  const { env, runId, onLog, executionTarget } = input;
  const antigravitySkillsHome = resolveAntigravitySkillsHome(input.config);
  const stagedRuntime = await input.stage(
    antigravitySkillsHome
      ? [{ key: "skills", localDir: antigravitySkillsHome, followSymlinks: true }]
      : [],
  );

  const managedRemoteHomeDir = stagedRuntime.runtimeRootDir;
  if (!managedRemoteHomeDir) {
    return { stagedRuntime };
  }
  env.HOME = managedRemoteHomeDir;

  const shellOptions = {
    cwd: stagedRuntime.workspaceRemoteDir ?? input.workspaceLocalDir,
    env,
    timeoutSec: Math.max(input.timeoutSec, 15),
    graceSec: 20,
    onLog,
  };

  const remoteSkillsAssetDir = stagedRuntime.assetDirs.skills;
  if (remoteSkillsAssetDir) {
    const remoteSkillsDir = path.posix.join(managedRemoteHomeDir, ".gemini", "antigravity-cli", "skills");
    await runAdapterExecutionTargetShellCommand(
      runId,
      executionTarget,
      `mkdir -p ${JSON.stringify(path.posix.dirname(remoteSkillsDir))} && rm -rf ${JSON.stringify(remoteSkillsDir)} && cp -a ${JSON.stringify(remoteSkillsAssetDir)} ${JSON.stringify(remoteSkillsDir)}`,
      shellOptions,
    );
  }

  const hasGeminiApiKey = Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);
  if (hasGeminiApiKey) {
    const remoteSettingsPath = path.posix.join(managedRemoteHomeDir, ".gemini", "antigravity-cli", "settings.json");
    const authSettingsJson = JSON.stringify({
      selectedAuthType: "gemini-api-key",
      security: { auth: { selectedType: "gemini-api-key" } },
    });
    await runAdapterExecutionTargetShellCommand(
      runId,
      executionTarget,
      `mkdir -p ${JSON.stringify(path.posix.dirname(remoteSettingsPath))} && { [ -f ${JSON.stringify(remoteSettingsPath)} ] || printf '%s' ${JSON.stringify(authSettingsJson)} > ${JSON.stringify(remoteSettingsPath)}; }`,
      shellOptions,
    );
  }

  return { stagedRuntime };
}

function withAntigravityAcpDefaults(options: AntigravityAcpExecutorOptions): AcpxEngineExecutorOptions {
  return {
    prepareRemoteManagedHome: prepareAntigravityRemoteManagedHome,
    ...options,
    adapterType: "antigravity_local",
    moduleDir,
    packageRootDir,
  };
}

export function createAntigravityAcpExecutor(options: AntigravityAcpExecutorOptions = {}): AntigravityAcpExecutor {
  let executor: AntigravityAcpExecutor | null = null;
  return async (ctx) => {
    let currentExecutor = executor;
    if (!currentExecutor) {
      const { createAcpxEngineExecutor } = await import("@paperclipai/adapter-utils/acpx-engine/execute");
      currentExecutor = createAcpxEngineExecutor(withAntigravityAcpDefaults(options));
      executor = currentExecutor;
    }
    return currentExecutor({
      ...ctx,
      config: buildAntigravityAcpConfig(ctx.config),
    });
  };
}

function parseVersion(version: string): [number, number, number] {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function nodeVersionMeetsAntigravityAcpMinimum(version = process.version): boolean {
  const [major, minor, patch] = parseVersion(version);
  const [minMajor, minMinor, minPatch] = parseVersion(MIN_ACP_NODE_VERSION);
  if (major !== minMajor) return major > minMajor;
  if (minor !== minMinor) return minor > minMinor;
  return patch >= minPatch;
}

async function pathExists(candidate: string): Promise<boolean> {
  return fs.access(candidate).then(() => true).catch(() => false);
}

function hasPathSeparator(command: string): boolean {
  return command.includes("/") || command.includes("\\");
}

function firstShellToken(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("'") || trimmed.startsWith("\"")) return null;
  return trimmed.split(/\s+/, 1)[0] ?? null;
}

async function findCommandOnPath(binName: string, pathValue = process.env.PATH ?? ""): Promise<string | null> {
  for (const segment of pathValue.split(path.delimiter)) {
    if (!segment) continue;
    const candidate = path.join(segment, binName);
    if (await pathExists(candidate)) return candidate;
  }
  return null;
}

function resolveConfigPath(config: Record<string, unknown>): string {
  const envConfig = parseObject(config.env);
  return typeof envConfig.PATH === "string" && envConfig.PATH.trim().length > 0
    ? envConfig.PATH
    : process.env.PATH ?? "";
}

async function commandIsResolvable(
  command: string,
  pathValue = process.env.PATH ?? "",
  input?: AntigravityEngineResolutionInput,
): Promise<boolean> {
  const token = firstShellToken(command);
  if (!token) return true;
  const target = readAdapterExecutionTarget({
    executionTarget: input?.executionTarget,
    legacyRemoteExecution: input?.executionTransport?.remoteExecution,
  });
  if (target?.kind === "remote") {
    try {
      await ensureAdapterExecutionTargetCommandResolvable(
        token,
        target,
        resolveAdapterExecutionTargetCwd(target, asString(input?.config.cwd, ""), process.cwd()),
        process.env,
      );
      return true;
    } catch {
      return false;
    }
  }
  if (path.isAbsolute(token) || hasPathSeparator(token)) return pathExists(token);
  return (await findCommandOnPath(token, pathValue)) !== null;
}

function resolveAntigravityAcpCommand(config: Record<string, unknown>): string {
  const configured = firstNonEmptyString(config.agentCommand, config.acpAgentCommand);
  if (configured) return configured;
  const antigravityCommand = firstNonEmptyString(config.command) ?? "agy";
  return `${antigravityCommand} --acp`;
}

function sandboxTargetHasProcessSessionBridge(
  target: ReturnType<typeof readAdapterExecutionTarget>,
): boolean {
  return target?.kind === "remote" && target.transport === "sandbox" && Boolean(target.runner);
}

async function defaultAntigravityAcpFallbackReason(
  input: AntigravityEngineResolutionInput,
): Promise<string | null> {
  const target = readAdapterExecutionTarget({
    executionTarget: input.executionTarget,
    legacyRemoteExecution: input.executionTransport?.remoteExecution,
  });
  if (target?.kind === "remote" && !sandboxTargetHasProcessSessionBridge(target)) {
    if (target.transport === "sandbox") {
      return "Antigravity ACP requires a bidirectional remote process target; this sandbox exposes only one-shot command execution.";
    }
    return "Antigravity ACP supports sandbox remote targets only; this run targets a non-sandbox remote environment.";
  }
  if (!nodeVersionMeetsAntigravityAcpMinimum()) {
    return `Node ${process.version} does not satisfy Antigravity ACP's Node >=${MIN_ACP_NODE_VERSION} prerequisite.`;
  }
  const configuredAgentCommand = firstNonEmptyString(
    input.config.agentCommand,
    input.config.antigravityAcpAgentCommand,
    input.config.acpAgentCommand,
  );
  if (!configuredAgentCommand) {
    return "Antigravity CLI (agy) does not support native ACP mode (--acp flag undefined); configure agentCommand to specify a custom ACP server.";
  }
  const command = resolveAntigravityAcpCommand(input.config);
  if (!(await commandIsResolvable(command, resolveConfigPath(input.config), input))) {
    return `Antigravity ACP command is not available: ${command}.`;
  }
  return null;
}

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function testAntigravityAcpEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const target = ctx.executionTarget ?? null;
  const targetIsRemote = target?.kind === "remote";

  checks.push({
    code: "antigravity_engine_selected",
    level: "info",
    message: "Execution engine selected: ACP.",
    hint: "Set engine=cli to use the existing Antigravity CLI lane.",
  });

  if (targetIsRemote) {
    checks.push({
      code: "antigravity_acp_remote_target",
      level: "info",
      message: "Antigravity ACP will run against the remote execution environment.",
      hint: "Remote ACP requires a bidirectional process target such as SSH or Paperclip's sandbox process-session bridge.",
    });
  }

  const cwd = asString(config.cwd, process.cwd());
  try {
    await fs.mkdir(cwd, { recursive: true });
    checks.push({
      code: "antigravity_acp_cwd_valid",
      level: "info",
      message: `Working directory is valid: ${cwd}`,
    });
  } catch (err) {
    checks.push({
      code: "antigravity_acp_cwd_invalid",
      level: "error",
      message: err instanceof Error ? err.message : "Invalid working directory",
      detail: cwd,
    });
  }

  checks.push({
    code: nodeVersionMeetsAntigravityAcpMinimum() ? "antigravity_acp_node_supported" : "antigravity_acp_node_unsupported",
    level: nodeVersionMeetsAntigravityAcpMinimum() ? "info" : "error",
    message: nodeVersionMeetsAntigravityAcpMinimum()
      ? `Node ${process.version} satisfies ACP runtime requirements.`
      : `Node ${process.version} does not satisfy ACP runtime requirements.`,
    hint: nodeVersionMeetsAntigravityAcpMinimum()
      ? undefined
      : `Run Antigravity ACP with Node >=${MIN_ACP_NODE_VERSION} or switch engine=cli.`,
  });

  const command = resolveAntigravityAcpCommand(config);
  const commandResolvable = await commandIsResolvable(command, resolveConfigPath(config), {
    config,
    executionTarget: ctx.executionTarget,
  });
  checks.push({
    code: commandResolvable ? "antigravity_acp_command_resolvable" : "antigravity_acp_command_missing",
    level: commandResolvable ? "info" : "error",
    message: commandResolvable
      ? `Antigravity ACP command is executable: ${command}`
      : `Antigravity ACP command is not available: ${command}`,
    hint: commandResolvable
      ? undefined
      : "Install the Antigravity CLI with ACP support, or set agentCommand to a valid Antigravity ACP server command.",
  });

  const envConfig = parseObject(config.env);
  const considerHostEnv = !targetIsRemote;
  const hasGca = envConfig.GOOGLE_GENAI_USE_GCA === "true" || (considerHostEnv && process.env.GOOGLE_GENAI_USE_GCA === "true");
  const configGeminiApiKey = envConfig.GEMINI_API_KEY;
  const hostGeminiApiKey = considerHostEnv ? process.env.GEMINI_API_KEY : undefined;
  const configGoogleApiKey = envConfig.GOOGLE_API_KEY;
  const hostGoogleApiKey = considerHostEnv ? process.env.GOOGLE_API_KEY : undefined;
  if (
    isNonEmpty(configGeminiApiKey) ||
    isNonEmpty(hostGeminiApiKey) ||
    isNonEmpty(configGoogleApiKey) ||
    isNonEmpty(hostGoogleApiKey) ||
    hasGca
  ) {
    const source = hasGca
      ? "Google account login (GCA)"
      : isNonEmpty(configGeminiApiKey) || isNonEmpty(configGoogleApiKey)
        ? "adapter config env"
        : "server environment";
    checks.push({
      code: "antigravity_acp_credentials_detected",
      level: "info",
      message: "Antigravity credentials are set for ACP authentication.",
      detail: `Detected in ${source}.`,
    });
  } else if (!targetIsRemote) {
    checks.push({
      code: "antigravity_acp_credentials_not_detected",
      level: "warn",
      message: "No Antigravity ACP credentials were detected.",
      hint: "Set GEMINI_API_KEY / GOOGLE_API_KEY, enable Google account auth, or run `agy auth login` before starting an Antigravity ACP agent.",
    });
  }

  const mode = firstNonEmptyString(config.mode, config.acpMode) ?? DEFAULT_ACP_ENGINE_MODE;
  const warmHandleIdleMs = asNumber(
    config.warmHandleIdleMs ?? config.acpWarmHandleIdleMs,
    DEFAULT_ACP_ENGINE_WARM_HANDLE_IDLE_MS,
  );
  checks.push({
    code: "antigravity_acp_runtime_scaffold",
    level: "info",
    message: "Antigravity ACP runtime execution is available through the shared ACP engine.",
    detail: `mode=${mode}; warmHandleIdleMs=${warmHandleIdleMs}`,
  });

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
