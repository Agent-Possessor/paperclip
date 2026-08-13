import type { AdapterConfigFieldsProps } from "../types";
import {
  DraftNumberInput,
  DraftInput,
  Field,
} from "../../components/agent-config-primitives";
import { ChoosePathButton } from "../../components/PathInstructionsModal";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";
const instructionsFileHint =
  "Absolute path to a markdown file (e.g. AGENTS.md) that defines this agent's behavior. Prepended to the Antigravity prompt at runtime.";

export function AntigravityLocalConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
  hideInstructionsFile,
}: AdapterConfigFieldsProps) {
  const rawEngine = isCreate
    ? values!.antigravityEngine ?? "auto"
    : eff("adapterConfig", "engine", String(config.engine ?? "auto"));
  const engine = rawEngine === "acp" || rawEngine === "cli" ? rawEngine : "auto";
  const acpSelected = engine === "acp";

  return (
    <>
      <Field label="Execution engine" hint="Auto uses ACP when prerequisites pass and falls back to Antigravity CLI with diagnostics.">
        <select
          className={inputClass}
          value={engine}
          onChange={(e) => {
            const value = e.target.value === "acp" ? "acp" : e.target.value === "cli" ? "cli" : "auto";
            isCreate
              ? set!({ antigravityEngine: value })
              : mark("adapterConfig", "engine", value === "auto" ? undefined : value);
          }}
        >
          <option value="auto">Auto (ACP preferred)</option>
          <option value="cli">Antigravity CLI</option>
          <option value="acp">ACP</option>
        </select>
      </Field>
      {acpSelected && (
        <>
          <Field
            label="ACP server command"
            hint="Optional override for the Antigravity ACP server command. Defaults to agy --acp."
          >
            <DraftInput
              value={
                isCreate
                  ? values!.antigravityAcpAgentCommand ?? ""
                  : eff("adapterConfig", "agentCommand", String(config.agentCommand ?? ""))
              }
              onCommit={(v) =>
                isCreate
                  ? set!({ antigravityAcpAgentCommand: v })
                  : mark("adapterConfig", "agentCommand", v || undefined)
              }
              immediate
              className={inputClass}
              placeholder="agy --acp"
            />
          </Field>
          <Field label="ACP session mode" hint="Persistent keeps ACP session state between runs. One-shot starts fresh each run.">
            <select
              className={inputClass}
              value={
                isCreate
                  ? values!.antigravityAcpMode ?? "persistent"
                  : eff("adapterConfig", "mode", String(config.mode ?? "persistent"))
              }
              onChange={(e) => {
                const value = e.target.value === "oneshot" ? "oneshot" : "persistent";
                isCreate
                  ? set!({ antigravityAcpMode: value })
                  : mark("adapterConfig", "mode", value);
              }}
            >
              <option value="persistent">Persistent</option>
              <option value="oneshot">One-shot</option>
            </select>
          </Field>
          <Field
            label="ACP non-interactive permissions"
            hint="Fallback if the ACP agent asks for input outside an interactive session."
          >
            <select
              className={inputClass}
              value={
                isCreate
                  ? values!.antigravityAcpNonInteractivePermissions ?? "deny"
                  : eff("adapterConfig", "nonInteractivePermissions", String(config.nonInteractivePermissions ?? "deny"))
              }
              onChange={(e) => {
                const value = e.target.value === "fail" ? "fail" : "deny";
                isCreate
                  ? set!({ antigravityAcpNonInteractivePermissions: value })
                  : mark("adapterConfig", "nonInteractivePermissions", value);
              }}
            >
              <option value="deny">Deny</option>
              <option value="fail">Fail</option>
            </select>
          </Field>
          <Field
            label="ACP state directory"
            hint="Optional ACP session state directory. Defaults to Paperclip-managed company/agent scoped storage."
          >
            <div className="flex items-center gap-2">
              <DraftInput
                value={
                  isCreate
                    ? values!.antigravityAcpStateDir ?? ""
                    : eff("adapterConfig", "stateDir", String(config.stateDir ?? ""))
                }
                onCommit={(v) =>
                  isCreate
                    ? set!({ antigravityAcpStateDir: v })
                    : mark("adapterConfig", "stateDir", v || undefined)
                }
                immediate
                className={inputClass}
                placeholder="/path/to/acp-state"
              />
              <ChoosePathButton />
            </div>
          </Field>
          <Field
            label="ACP warm process idle ms"
            hint="Defaults to 0, which closes the ACP process after each run while retaining persistent session state."
          >
            {isCreate ? (
              <input
                type="number"
                className={inputClass}
                value={values!.antigravityAcpWarmHandleIdleMs ?? 0}
                onChange={(e) => set!({ antigravityAcpWarmHandleIdleMs: Number(e.target.value) })}
              />
            ) : (
              <DraftNumberInput
                value={eff(
                  "adapterConfig",
                  "warmHandleIdleMs",
                  Number(config.warmHandleIdleMs ?? 0),
                )}
                onCommit={(v) => mark("adapterConfig", "warmHandleIdleMs", v || 0)}
                immediate
                className={inputClass}
              />
            )}
          </Field>
        </>
      )}
      {!hideInstructionsFile && (
        <Field label="Agent instructions file" hint={instructionsFileHint}>
          <div className="flex items-center gap-2">
            <DraftInput
              value={
                isCreate
                  ? values!.instructionsFilePath ?? ""
                  : eff(
                      "adapterConfig",
                      "instructionsFilePath",
                      String(config.instructionsFilePath ?? ""),
                    )
              }
              onCommit={(v) =>
                isCreate
                  ? set!({ instructionsFilePath: v })
                  : mark("adapterConfig", "instructionsFilePath", v || undefined)
              }
              immediate
              className={inputClass}
              placeholder="/absolute/path/to/AGENTS.md"
            />
            <ChoosePathButton />
          </div>
        </Field>
      )}
    </>
  );
}
