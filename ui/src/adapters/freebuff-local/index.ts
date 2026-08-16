import type { UIAdapterModule } from "../types";
import { parseProcessStdoutLine } from "../process/parse-stdout";
import { SchemaConfigFields } from "../schema-config-fields";
import { buildFreebuffLocalConfig } from "@paperclipai/adapter-freebuff-local/ui";

export const freebuffLocalUIAdapter: UIAdapterModule = {
  type: "freebuff_local",
  label: "Freebuff",
  parseStdoutLine: parseProcessStdoutLine,
  ConfigFields: SchemaConfigFields,
  buildAdapterConfig: buildFreebuffLocalConfig,
};
