import fs from "node:fs/promises";
import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  adapterExecutionTargetIsRemote,
  resolveAdapterExecutionTargetCwd,
  ensureAdapterExecutionTargetCommandResolvable,
  maybeRunSandboxInstallCommand,
} from "@paperclipai/adapter-utils/execution-target";
import {
  asNumber,
  asString,
  asStringArray,
  buildPaperclipEnv,
  ensureAbsoluteDirectory,
  ensurePathInEnv,
  joinPromptSections,
  parseObject,
  renderPaperclipWakePrompt,
  runChildProcess,
  DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE,
} from "@paperclipai/adapter-utils/server-utils";
import { SANDBOX_INSTALL_COMMAND } from "../index.js";

function readFirstLine(text: string): string {
  return text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, config, context, onLog, onMeta, authToken } = ctx;
  const command = asString(config.command, "freebuff");
  const cwd = resolveAdapterExecutionTargetCwd(ctx.executionTarget ?? null, asString(config.cwd, ""), process.cwd());
  const executionTarget = ctx.executionTarget ?? null;
  const executionTargetIsRemote = adapterExecutionTargetIsRemote(executionTarget);
  const timeoutSec = asNumber(config.timeoutSec, 0);
  const graceSec = asNumber(config.graceSec, 20);
  const envConfig = parseObject(config.env);
  const env: Record<string, string> = { ...buildPaperclipEnv(agent) };
  for (const [key, value] of Object.entries(envConfig)) {
    if (typeof value === "string") env[key] = value;
  }
  if (authToken) env.PAPERCLIP_API_KEY = authToken;
  env.PAPERCLIP_RUN_ID = runId;
  if (executionTargetIsRemote) {
    env.PAPERCLIP_REMOTE_EXECUTION = "true";
  }
  await ensureAbsoluteDirectory(cwd, { createIfMissing: true });
  const runtimeEnv = ensurePathInEnv({ ...process.env, ...env });

  await maybeRunSandboxInstallCommand({
    runId,
    target: executionTarget,
    adapterKey: "freebuff",
    installCommand: SANDBOX_INSTALL_COMMAND,
    detectCommand: command,
    env,
  });

  await ensureAdapterExecutionTargetCommandResolvable(command, executionTarget, cwd, runtimeEnv, {
    installCommand: SANDBOX_INSTALL_COMMAND,
    timeoutSec,
  });

  const promptTemplate = asString(config.promptTemplate, DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE);
  const wakePrompt = renderPaperclipWakePrompt(context.paperclipWake, {
    includeExecutionContract: true,
  });
  const model = asString(config.model, "").trim();
  const instructionsFilePath = asString(config.instructionsFilePath, "").trim();
  let instructionsPrefix = "";
  if (instructionsFilePath) {
    try {
      const instructionsContents = await fs.readFile(path.resolve(cwd, instructionsFilePath), "utf8");
      instructionsPrefix =
        `${instructionsContents}\n\n` +
        `The above agent instructions were loaded from ${instructionsFilePath}.\n\n`;
    } catch (err) {
      await onLog(
        "stdout",
        `[paperclip] Warning: could not read agent instructions file "${instructionsFilePath}": ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }
  const modelPrefix = model ? `\n/model ${model}\n\n` : "";
  const prompt = joinPromptSections([
    instructionsPrefix,
    modelPrefix,
    wakePrompt || promptTemplate,
  ]);
  const extraArgs = (() => {
    const fromExtraArgs = asStringArray(config.extraArgs);
    if (fromExtraArgs.length > 0) return fromExtraArgs;
    return asStringArray(config.args);
  })();

  if (onMeta) {
    await onMeta({
      adapterType: "freebuff_local",
      command,
      cwd,
      commandArgs: extraArgs,
    });
  }

  const proc = await runChildProcess(runId, command, extraArgs, {
    cwd,
    env,
    timeoutSec,
    graceSec,
    stdin: prompt,
    onLog,
    onSpawn: ctx.onSpawn,
  });

  const resultJson = {
    stdout: proc.stdout,
    stderr: proc.stderr,
  };

  if (proc.timedOut) {
    return {
      exitCode: proc.exitCode,
      signal: proc.signal,
      timedOut: true,
      errorMessage: `Timed out after ${timeoutSec}s`,
      resultJson,
    };
  }

  if ((proc.exitCode ?? 0) !== 0) {
    return {
      exitCode: proc.exitCode,
      signal: proc.signal,
      timedOut: false,
      errorMessage: `Freebuff exited with code ${proc.exitCode ?? -1}`,
      resultJson,
    };
  }

  return {
    exitCode: proc.exitCode,
    signal: proc.signal,
    timedOut: false,
    resultJson,
  };
}
