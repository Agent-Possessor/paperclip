import path from "node:path";
import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import {
  ensureAdapterExecutionTargetCommandResolvable,
  maybeRunSandboxInstallCommand,
  resolveAdapterExecutionTargetCwd,
} from "@paperclipai/adapter-utils/execution-target";
import { asString, parseObject } from "@paperclipai/adapter-utils/server-utils";
import { SANDBOX_INSTALL_COMMAND } from "../index.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

function commandLooksLike(command: string, expected: string): boolean {
  const base = path.basename(command).toLowerCase();
  return base === expected || base === `${expected}.cmd` || base === `${expected}.exe`;
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const command = asString(config.command, "freebuff");
  const cwd = resolveAdapterExecutionTargetCwd(ctx.executionTarget ?? null, asString(config.cwd, ""), process.cwd());
  const runId = `freebuff-envtest-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    const installCheck = await maybeRunSandboxInstallCommand({
      runId,
      target: ctx.executionTarget ?? null,
      adapterKey: "freebuff",
      installCommand: SANDBOX_INSTALL_COMMAND,
      detectCommand: command,
      env: {},
    });
    if (installCheck) checks.push(installCheck);
  } catch (err) {
    checks.push({
      code: "freebuff_install_probe_failed",
      level: "warn",
      message: err instanceof Error ? err.message : "Failed to run install probe",
    });
  }

  try {
    await ensureAdapterExecutionTargetCommandResolvable(command, ctx.executionTarget ?? null, cwd, process.env);
    checks.push({
      code: "freebuff_command_resolvable",
      level: "info",
      message: `Command is executable: ${command}`,
    });
  } catch (err) {
    checks.push({
      code: "freebuff_command_unresolvable",
      level: "error",
      message: err instanceof Error ? err.message : "Command is not executable",
      detail: command,
    });
  }

  if (!commandLooksLike(command, "freebuff")) {
    checks.push({
      code: "freebuff_custom_command",
      level: "info",
      message: "Using a custom Freebuff command path.",
      detail: command,
    });
  }

  return {
    adapterType: "freebuff_local",
    status: summarizeStatus(checks),
    testedAt: new Date().toISOString(),
    checks,
  };
}
