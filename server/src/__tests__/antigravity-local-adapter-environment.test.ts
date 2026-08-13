import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { testEnvironment } from "@paperclipai/adapter-antigravity-local/server";

async function writeFakeAntigravityCommand(binDir: string, argsCapturePath: string): Promise<string> {
  const commandPath = path.join(binDir, "agy");
  const script = `#!/usr/bin/env node
const fs = require("node:fs");
const outPath = process.env.PAPERCLIP_TEST_ARGS_PATH;
if (outPath) {
  fs.writeFileSync(outPath, JSON.stringify(process.argv.slice(2)), "utf8");
}
console.log(JSON.stringify({
  type: "assistant",
  message: { content: [{ type: "output_text", text: "hello" }] },
}));
console.log(JSON.stringify({
  type: "result",
  subtype: "success",
  result: "hello",
}));
`;
  await fs.writeFile(commandPath, script, "utf8");
  await fs.chmod(commandPath, 0o755);
  return commandPath;
}

async function writeQuotaAntigravityCommand(binDir: string): Promise<string> {
  const commandPath = path.join(binDir, "agy");
  const script = `#!/usr/bin/env node
if (process.argv.includes("--help")) {
  process.exit(0);
}
console.error("429 RESOURCE_EXHAUSTED: You exceeded your current quota and billing details.");
process.exit(1);
`;
  await fs.writeFile(commandPath, script, "utf8");
  await fs.chmod(commandPath, 0o755);
  return commandPath;
}

describe("antigravity_local environment diagnostics", () => {
  it("creates a missing working directory when cwd is absolute", async () => {
    const cwd = path.join(
      os.tmpdir(),
      `paperclip-antigravity-local-cwd-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      "workspace",
    );

    await fs.rm(path.dirname(cwd), { recursive: true, force: true });

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "antigravity_local",
      config: {
        engine: "cli",
        command: process.execPath,
        cwd,
      },
    });

    expect(result.checks.some((check) => check.code === "antigravity_cwd_valid")).toBe(true);
    expect(result.checks.some((check) => check.level === "error")).toBe(false);
    const stats = await fs.stat(cwd);
    expect(stats.isDirectory()).toBe(true);
    await fs.rm(path.dirname(cwd), { recursive: true, force: true });
  });

  it("passes model and yolo flags to the hello probe", async () => {
    const root = path.join(
      os.tmpdir(),
      `paperclip-antigravity-local-probe-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    const binDir = path.join(root, "bin");
    const cwd = path.join(root, "workspace");
    const argsCapturePath = path.join(root, "args.json");
    await fs.mkdir(binDir, { recursive: true });
    await writeFakeAntigravityCommand(binDir, argsCapturePath);

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "antigravity_local",
      config: {
        engine: "cli",
        command: "agy",
        cwd,
        model: "gemini-2.5-pro",
        yolo: true,
        env: {
          GEMINI_API_KEY: "test-key",
          PAPERCLIP_TEST_ARGS_PATH: argsCapturePath,
          PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
        },
      },
    });

    expect(result.status).not.toBe("fail");
    const args = JSON.parse(await fs.readFile(argsCapturePath, "utf8")) as string[];
    expect(args).toContain("--model");
    expect(args).toContain("gemini-2.5-pro");
    expect(args).toContain("--dangerously-skip-permissions");
    expect(args).toContain("--prompt");
    await fs.rm(root, { recursive: true, force: true });
  });

  it("classifies quota exhaustion as a quota warning instead of a generic failure", async () => {
    const root = path.join(
      os.tmpdir(),
      `paperclip-antigravity-local-quota-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    const binDir = path.join(root, "bin");
    const cwd = path.join(root, "workspace");
    await fs.mkdir(binDir, { recursive: true });
    await writeQuotaAntigravityCommand(binDir);

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "antigravity_local",
      config: {
        engine: "cli",
        command: "agy",
        cwd,
        env: {
          GEMINI_API_KEY: "test-key",
          PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
        },
      },
    });

    expect(result.status).toBe("warn");
    expect(result.checks.some((check) => check.code === "antigravity_hello_probe_quota_exhausted")).toBe(true);
    await fs.rm(root, { recursive: true, force: true });
  });

  it("trusts remote sandbox workspaces during the hello probe", async () => {
    let probeEnv: Record<string, string> | undefined;

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "antigravity_local",
      config: {
        engine: "cli",
        command: "agy",
      },
      executionTarget: {
        kind: "remote",
        transport: "sandbox",
        providerKey: "cloudflare",
        remoteCwd: "/workspace/paperclip",
        runner: {
          execute: async (input) => {
            if (input.command === "agy") {
              probeEnv = input.env;
              return {
                exitCode: 0,
                signal: null,
                timedOut: false,
                stdout: [
                  JSON.stringify({
                    type: "assistant",
                    message: { content: [{ type: "output_text", text: "hello" }] },
                  }),
                  JSON.stringify({ type: "result", subtype: "success", result: "hello" }),
                ].join("\n"),
                stderr: "",
                pid: null,
                startedAt: new Date().toISOString(),
              };
            }
            return {
              exitCode: 0,
              signal: null,
              timedOut: false,
              stdout: "",
              stderr: "",
              pid: null,
              startedAt: new Date().toISOString(),
            };
          },
        },
      },
      environmentName: "QA Cloudflare",
    });

    expect(result.checks.some((check) => check.code === "antigravity_hello_probe_passed")).toBe(true);
    expect(probeEnv?.GEMINI_CLI_TRUST_WORKSPACE).toBe("true");
  });
});
