import { buildAdapterEnvConfig, type CreateConfigValues } from "@paperclipai/adapter-utils";

function parseCommaArgs(value: string): string[] {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildKiroLocalConfig(values: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (values.cwd) ac.cwd = values.cwd;
  if (values.instructionsFilePath) ac.instructionsFilePath = values.instructionsFilePath;
  if (values.promptTemplate) ac.promptTemplate = values.promptTemplate;
  if (values.command) ac.command = values.command;
  if (values.model) ac.model = values.model;
  if (values.thinkingEffort) ac.thinkingEffort = values.thinkingEffort;
  if (values.extraArgs) ac.extraArgs = parseCommaArgs(values.extraArgs);
  const env = buildAdapterEnvConfig(values.envBindings, values.envVars);
  if (Object.keys(env).length > 0) ac.env = env;
  if (values.adapterSchemaValues) Object.assign(ac, values.adapterSchemaValues);
  if (!ac.agentCommand && typeof ac.command === "string" && ac.command.trim()) {
    ac.agentCommand = `${ac.command.trim()} acp`;
  }
  return ac;
}
