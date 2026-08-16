import { describe, expect, it } from "vitest";
import type { CreateConfigValues } from "@paperclipai/adapter-utils";
import { DEFAULT_FREEBUFF_LOCAL_MODEL } from "../index.js";
import { buildFreebuffLocalConfig } from "./build-config.js";

function makeValues(overrides: Partial<CreateConfigValues> = {}): CreateConfigValues {
  return {
    adapterType: "freebuff_local",
    cwd: "",
    instructionsFilePath: "",
    promptTemplate: "",
    model: "",
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
  };
}

describe("buildFreebuffLocalConfig", () => {
  it("pins the default Freebuff model when the UI leaves model blank", () => {
    const config = buildFreebuffLocalConfig(makeValues());

    expect(config).toMatchObject({
      model: DEFAULT_FREEBUFF_LOCAL_MODEL,
      timeoutSec: 0,
      graceSec: 15,
    });
  });

  it("preserves explicit model, command, and env bindings", () => {
    const config = buildFreebuffLocalConfig(
      makeValues({
        model: "deepseek-v4-pro",
        command: "/usr/local/bin/freebuff",
        extraArgs: "--sandbox, --verbose",
        envBindings: {
          FOO: { type: "plain", value: "bar" },
        },
      }),
    );

    expect(config).toMatchObject({
      model: "deepseek-v4-pro",
      command: "/usr/local/bin/freebuff",
      extraArgs: ["--sandbox", "--verbose"],
      env: {
        FOO: { type: "plain", value: "bar" },
      },
    });
  });
});
