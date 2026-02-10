import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyIfDifferent(src, dest) {
  const [srcBuf, destBuf] = await Promise.all([
    fs.readFile(src),
    fs.readFile(dest).catch(() => null),
  ]);

  if (destBuf && Buffer.compare(srcBuf, destBuf) === 0) return false;
  await fs.writeFile(dest, srcBuf);
  return true;
}

async function main() {
  const src = path.join(
    projectRoot,
    "node_modules",
    "@itwin",
    "core-frontend",
    "lib",
    "workers",
    "webpack",
    "parse-imdl-worker.js",
  );

  const destDir = path.join(projectRoot, "public", "scripts");
  const dest = path.join(destDir, "parse-imdl-worker.js");

  await ensureDir(destDir);
  const changed = await copyIfDifferent(src, dest);

  console.log(changed ? `Copied iTwin worker: ${path.relative(projectRoot, dest)}` : "iTwin worker already up to date");
}

main().catch((err) => {
  console.error("Failed to copy iTwin worker(s):", err);
  process.exitCode = 1;
});
