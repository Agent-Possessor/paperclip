import { describe, expect, it } from "vitest";
import { buildKiroAcpConfig } from "./acp.js";

describe("buildKiroAcpConfig", () => {
  it("defaults to the kiro-cli acp entrypoint", () => {
    expect(buildKiroAcpConfig({})).toMatchObject({
      agent: "kiro",
      command: "kiro-cli",
      agentCommand: "kiro-cli acp",
    });
  });

  it("maps agentName to the Kiro ACP --agent flag", () => {
    expect(buildKiroAcpConfig({ agentName: "paperclip" })).toMatchObject({
      agentCommand: "kiro-cli acp --agent 'paperclip'",
    });
  });

  it("keeps an explicit agentCommand override", () => {
    expect(buildKiroAcpConfig({ agentName: "paperclip", agentCommand: "custom-kiro acp" })).toMatchObject({
      agentCommand: "custom-kiro acp",
    });
  });
});
