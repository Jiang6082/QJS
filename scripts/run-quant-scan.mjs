import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const validModes = new Set(["v1", "v2", "broad", "swe", "all"]);
const userArgs = process.argv.slice(2);
const modeArg = userArgs.find((arg) => arg.startsWith("--mode="));
const positionalMode = userArgs.find((arg) => !arg.startsWith("-"));
const mode = modeArg ? modeArg.split("=")[1] : positionalMode || "all";
const shouldPublish = userArgs.includes("--publish") || process.env.QJS_AUTO_PUBLISH === "1";

if (!validModes.has(mode)) {
  console.error(`Invalid mode: ${mode}`);
  console.error("Use one of: v1, v2, broad, swe, all");
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const stateDir = resolve(rootDir, ".scan-state");
const previousRunFile = resolve(stateDir, "previous_scan_time.txt");
const broadRawPath = resolve(rootDir, "data/us_financial_services_internship_scan_raw.json");
const quantV2RawPath = resolve(rootDir, "data/quant_internship_roles_scan_v2_raw.json");
const previousQuantV2RawPath = resolve(stateDir, "previous_quant_v2_raw.json");
const currentRunStartedAt = new Date().toISOString();

await fs.mkdir(stateDir, { recursive: true });
await fs.mkdir(resolve(rootDir, "reports"), { recursive: true });
await fs.mkdir(resolve(rootDir, "data"), { recursive: true });

if (["v2", "all"].includes(mode)) {
  try {
    await fs.copyFile(quantV2RawPath, previousQuantV2RawPath);
  } catch {}
}

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
    const child = spawn(process.execPath, [resolve(scriptDir, script)], {
      cwd: rootDir,
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

if (["v2", "all"].includes(mode)) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [resolve(scriptDir, "build_quant_roster_scan_audit.mjs")], {
      cwd: rootDir,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolvePromise()
      : reject(new Error(`build_quant_roster_scan_audit.mjs exited with code ${code}`)));
  });

  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [resolve(scriptDir, "build_new_quant_roles_report.mjs")], {
      cwd: rootDir,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolvePromise()
      : reject(new Error(`build_new_quant_roles_report.mjs exited with code ${code}`)));
  });

  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [resolve(scriptDir, "build_scan_dashboard.mjs")], {
      cwd: rootDir,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolvePromise()
      : reject(new Error(`build_scan_dashboard.mjs exited with code ${code}`)));
  });

  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [
      resolve(scriptDir, "report-new-roles.mjs"),
      "--days=21",
      "--scope=quant",
      "--write",
    ], {
      cwd: rootDir,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolvePromise()
      : reject(new Error(`report-new-roles.mjs exited with code ${code}`)));
  });

  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [resolve(scriptDir, "build-cumulative-application-report.mjs")], {
      cwd: rootDir,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolvePromise()
      : reject(new Error(`build-cumulative-application-report.mjs exited with code ${code}`)));
  });

  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [resolve(scriptDir, "build-readme.mjs")], {
      cwd: rootDir,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolvePromise()
      : reject(new Error(`build-readme.mjs exited with code ${code}`)));
  });
}

if (shouldPublish) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [resolve(scriptDir, "publish_scan_results.mjs")], {
      cwd: rootDir,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolvePromise()
      : reject(new Error(`publish_scan_results.mjs exited with code ${code}`)));
  });
}

console.log("");
console.log("Done. Generated CSV, Markdown, raw JSON, and audit JSON files in:");
console.log(rootDir);
console.log("Previous run timestamp saved at:");
console.log(previousRunFile);
