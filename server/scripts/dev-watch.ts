import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const tsxLoaderPath = require.resolve("tsx");
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const watchArgs = ["--watch-path", path.resolve(serverRoot, "src")];
const fallbackArgs = ["--import", tsxLoaderPath, "src/index.ts"];

function runServer(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      HOST: "127.0.0.1",
      PAPERCLIP_BIND_HOST: "127.0.0.1",
      PAPERCLIP_LOG_SYNC: "true",
    };
    const child = spawn(process.execPath, args, {
      cwd: serverRoot,
      env,
      stdio: "inherit",
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      resolve(code ?? 0);
    });

    child.on("error", (error) => {
      console.error(error);
      resolve(1);
    });
  });
}

const watchExitCode = await runServer([...watchArgs, "--import", tsxLoaderPath, "src/index.ts"]);
if (watchExitCode === 0) process.exit(0);

console.warn("[paperclip] Dev watch fallback: running without file watching because the watch launcher failed in this environment.");
const fallbackExitCode = await runServer(fallbackArgs);
process.exit(fallbackExitCode);
