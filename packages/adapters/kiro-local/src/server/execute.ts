import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import { createKiroAcpExecutor } from "./acp.js";

const executeKiroAcp = createKiroAcpExecutor();

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  return executeKiroAcp(ctx);
}
