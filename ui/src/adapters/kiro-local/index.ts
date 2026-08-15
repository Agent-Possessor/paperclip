import type { UIAdapterModule } from "../types";
import { SchemaConfigFields } from "../schema-config-fields";
import { parseKiroStdoutLine, buildKiroLocalConfig } from "@paperclipai/adapter-kiro-local/ui";

export const kiroLocalUIAdapter: UIAdapterModule = {
  type: "kiro_local",
  label: "Kiro",
  parseStdoutLine: parseKiroStdoutLine,
  ConfigFields: SchemaConfigFields,
  buildAdapterConfig: buildKiroLocalConfig,
};
