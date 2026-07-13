import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const validModes = new Set(["v1", "v2", "broad", "swe", "all"]);
const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const positionalMode = process.argv.find((arg) => !arg.startsWith("-") && !arg.endsWith(".mjs"));
const mode = modeArg ? modeArg.split("=")[1] : positionalMode || "all";

if (!validModes.has(mode)) {
  console.error(`Invalid mode: ${mode}`);
  console.error("Use one of: v1, v2, broad, swe, all");
  process.exit(1);
}

const sourceDir = dirname(fileURLToPath(import.meta.url));
const stateDir = resolve(sourceDir, ".scan-state");
const previousRunFile = resolve(stateDir, "previous_scan_time.txt");
const broadRawPath = resolve(sourceDir, "us_financial_services_internship_scan_raw.json");
const currentRunStartedAt = new Date().toISOString();

await fs.mkdir(stateDir, { recursive: true });

try {
  const raw = JSON.parse(await fs.readFile(broadRawPath, "utf8"));
  if (raw.searchedAt) {
    await fs.writeFile(previousRunFile, raw.searchedAt);
  }
} catch {
  try {
    await fs.access(previousRunFile);
  } catch {
    await fs.writeFile(previousRunFile, currentRunStartedAt);
  }
}

const scripts = [];
if (["v1", "v2", "broad", "all"].includes(mode)) scripts.push("scan_quant_internships.mjs");
if (["v2", "all"].includes(mode)) scripts.push("expand_quant_internship_search.mjs");
if (["broad", "all"].includes(mode)) scripts.push("expand_us_financial_services_search.mjs");
if (["swe", "all"].includes(mode)) scripts.push("scan_swe_2027_internships.mjs");

console.log(`Using Node: ${process.execPath}`);
console.log(`Running scan mode: ${mode}`);

for (const script of scripts) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: sourceDir,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${script} exited with code ${code}`));
      }
    });
  });
}

console.log("");
console.log("Done. Generated CSV, Markdown, raw JSON, and audit JSON files in:");
console.log(sourceDir);
console.log("Previous run timestamp saved at:");
console.log(previousRunFile);
