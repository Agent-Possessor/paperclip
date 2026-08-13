# Plan: Migrate Gemini CLI to Antigravity CLI

This document outlines the research, feasibility, and step-by-step action plan to replace the deprecated Gemini CLI integration (`gemini_local`) in Paperclip with its successor, the **Antigravity CLI** (`agy`).

---

## 1. Feasibility & Differences Analysis

Our research confirms that Google has deprecated the Node-based Gemini CLI (`@google/gemini-cli`) in favor of the Go-based **Antigravity CLI** (`agy`). Below is a comparison of their integration surfaces:

| Feature | Legacy Gemini CLI (`gemini_local`) | New Antigravity CLI (`antigravity_local`) |
| :--- | :--- | :--- |
| **Command** | `gemini` | `agy` |
| **Distribution** | npm package (`@google/gemini-cli`) | Standalone Go binary |
| **Installation** | `npm install -g @google/gemini-cli` | `curl -fsSL https://antigravity.google/cli/install.sh \| bash` |
| **Config Directory** | `~/.gemini/` | `~/.gemini/antigravity-cli/` |
| **Settings File** | `~/.gemini/settings.json` | `~/.gemini/antigravity-cli/settings.json` |
| **Skills Directory** | `~/.gemini/skills/` | `~/.gemini/antigravity-cli/skills/` |
| **ACP Support** | Yes (`gemini --acp`) | Yes (`agy --acp`) |

### Conclusion
**Yes, it is fully feasible to replace Gemini CLI with Antigravity CLI.** Because they both support the **Agent Client Protocol (ACP)** via similar command lines (`--acp`), we can perform a clean rename/refactor of the adapter package.

---

## 2. Proposed Changes & Impact Analysis

To make this transition, we should perform the following changes in the codebase:

### 2.1 Rename the Adapter Package
1. **Rename directory** from `packages/adapters/gemini-local` to `packages/adapters/antigravity-local`.
2. **Update `package.json`**:
   - Change `"name"` to `"@paperclipai/adapter-antigravity-local"`.
   - Update any workspace links (e.g. `directory` in `"repository"`).
3. **Update Adapter Metadata (`index.ts`)**:
   - Change `export const type = "antigravity_local"`.
   - Change `export const label = "Antigravity CLI"`.
   - Change `SANDBOX_INSTALL_COMMAND` to:
     ```ts
     export const SANDBOX_INSTALL_COMMAND =
       "curl -fsSL https://antigravity.google/cli/install.sh | bash";
     ```
   - Rename/update configuration docs references from `gemini` to `antigravity-cli` or `agy`.

### 2.2 Update Server execution and skills logic
1. **Update Command Invocation**:
   - Change the default executable command from `"gemini"` to `"agy"`.
   - In `packages/adapter-utils/src/acpx-engine/execute.ts`:
     - Rename checks for `agent === "gemini"` to `agent === "antigravity"`.
     - Update resolving built-in command from `gemini --acp` to `agy --acp`.
     - Rename version parser to `parseAntigravityVersionParts` / probe version logic (since `agy` uses Go version printing or similar).
2. **Update Paths**:
   - Change skills directory path calculation from `~/.gemini/skills` to `~/.gemini/antigravity-cli/skills`.
   - Change settings file management from `~/.gemini/settings.json` to `~/.gemini/antigravity-cli/settings.json`.

### 2.3 Update Registries
Update registrations across server, UI, and CLI to import and register the new package:
* `server/src/adapters/registry.ts`
* `ui/src/adapters/registry.ts`
* `cli/src/adapters/registry.ts`

### 2.4 Update Dependencies
Modify `package.json` in:
- `server/package.json`
- `ui/package.json`
- `cli/package.json`
Replace `@paperclipai/adapter-gemini-local` with `@paperclipai/adapter-antigravity-local`.

### 2.5 Rename Test Files and Internal Helpers
- Rename test files from `*gemini*` to `*antigravity*`.
- Update references in `vitest.config.ts`.
- Update references in internal routing/helpers (e.g. allowed adapter types list in `server/src/services/built-in-agents.ts`).

---

## 3. Migration Plan Checklist

To perform this rename in a single, safe transition:

- [ ] Rename the adapter directory and update its `package.json`.
- [ ] Refactor internal metadata, installation command, and config/skills paths.
- [ ] Update execution utility functions in `packages/adapter-utils/`.
- [ ] Register `@paperclipai/adapter-antigravity-local` in server, UI, and CLI registry files.
- [ ] Rename and update the test files.
- [ ] Validate compilation with `pnpm -r typecheck`.
- [ ] Run test suite with `pnpm test`.

---

## 4. Feedback Request

Would you like to proceed with implementing this change now?
If yes, I will rename the files, update the imports, modify the configuration directory path, and ensure all tests are adjusted accordingly.
