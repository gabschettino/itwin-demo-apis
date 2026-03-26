import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

const nodeExe = process.execPath;
const tscJs = path.join(workspaceRoot, "node_modules", "typescript", "lib", "tsc.js");
const backendEntry = path.join(workspaceRoot, "dist-backend", "index.js");

function spawnChild(name, command, args) {
  const child = spawn(command, args, {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: process.env,
    windowsHide: false,
  });

  child.on("exit", (code, signal) => {
    const why = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`[${name}] exited (${why})`);
  });

  child.on("error", (err) => {
    console.error(`[${name}] failed to start:`, err);
  });

  return child;
}

if (!process.env.CI) {
  console.log("Starting backend dev watchers...");
  console.log(`- tsc: ${tscJs}`);
  console.log(`- backend: ${backendEntry}`);
}

const tsc = spawnChild("tsc", nodeExe, [
  tscJs,
  "-p",
  "tsconfig.backend.json",
  "--watch",
  "--preserveWatchOutput",
]);

const backend = spawnChild("backend", nodeExe, [
  "--watch",
  "--watch-preserve-output",
  backendEntry,
]);

function shutdown() {
  try {
    tsc.kill();
  } catch {
    // ignore
  }
  try {
    backend.kill();
  } catch {
    // ignore
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
