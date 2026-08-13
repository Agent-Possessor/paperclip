import { describe, expect, it } from "vitest";
import type { CreateConfigValues } from "@paperclipai/adapter-utils";
import { buildAntigravityLocalConfig } from "./build-config.js";

function makeValues(overrides: Partial<CreateConfigValues> = {}): CreateConfigValues {
  return {
    adapterType: "antigravity_local",
    cwd: "",
    instructionsFilePath: "",
    promptTemplate: "",
    model: "gemini-2.5-pro",
    thinkingEffort: "",
    chrome: false,
    dangerouslySkipPermissions: true,
    search: false,
    fastMode: false,
    dangerouslyBypassSandbox: false,
    command: "",
    args: "",
    extraArgs: "",
    envVars: "",
    envBindings: {},
    url: "",
    bootstrapPrompt: "",
    payloadTemplateJson: "",
    workspaceStrategyType: "project_primary",
    workspaceBaseRef: "",
    workspaceBranchTemplate: "",
    worktreeParentDir: "",
    runtimeServicesJson: "",
    maxTurnsPerRun: 1000,
    heartbeatEnabled: false,
    intervalSec: 300,
    ...overrides,
  } as CreateConfigValues;
}

describe("buildAntigravityLocalConfig", () => {
  it("omits engine for the auto default so runtime fallback remains available", () => {
    const config = buildAntigravityLocalConfig(makeValues({ antigravityEngine: "auto" }));

    expect(config).not.toHaveProperty("engine");
  });

  it("persists explicit engine pins", () => {
    expect(buildAntigravityLocalConfig(makeValues({ antigravityEngine: "cli" }))).toMatchObject({ engine: "cli" });
    expect(buildAntigravityLocalConfig(makeValues({ antigravityEngine: "acp" }))).toMatchObject({ engine: "acp" });
  });

  it("persists ACP fields when Antigravity ACP is selected", () => {
    const config = buildAntigravityLocalConfig(makeValues({
      antigravityEngine: "acp",
      antigravityAcpAgentCommand: "custom-agy --acp",
      antigravityAcpMode: "oneshot",
      antigravityAcpNonInteractivePermissions: "fail",
      antigravityAcpStateDir: "/tmp/antigravity-acp",
      antigravityAcpWarmHandleIdleMs: 30,
    }));

    expect(config).toMatchObject({
      engine: "acp",
      agentCommand: "custom-agy --acp",
      mode: "oneshot",
      nonInteractivePermissions: "fail",
      stateDir: "/tmp/antigravity-acp",
      warmHandleIdleMs: 30,
    });
  });
});
