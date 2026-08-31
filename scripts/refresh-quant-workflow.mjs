import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const shouldPublish = args.has("--publish");
const allowDirty = args.has("--allow-dirty");

function run(command, commandArgs, options = {}) {
  console.log(`\n==> ${options.label || `${command} ${commandArgs.join(" ")}`}`);
  const result = spawnSync(command, commandArgs, {
    cwd: repo,
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) throw new Error(`${options.label || command} exited with code ${result.status}`);
}

function output(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: repo, encoding: "utf8", maxBuffer: 30 * 1024 * 1024 });
  if (result.status !== 0) throw new Error([result.stdout, result.stderr].filter(Boolean).join("\n"));
  return result.stdout.trim();
}

const dirty = output("git", ["status", "--porcelain", "--untracked-files=all"]);
if (dirty && !allowDirty) {
  throw new Error("The worktree is not clean. Commit or stash unrelated work before running the portable refresh workflow.");
}
if (dirty) console.warn("refresh: continuing with --allow-dirty; use only when intentionally developing the workflow");

console.log(`Portable quant refresh from commit ${output("git", ["rev-parse", "--short", "HEAD"])}`);

const committedRaw = output("git", ["show", "HEAD:data/quant_internship_roles_scan_v2_raw.json"]);
const stateDir = resolve(repo, ".scan-state");
mkdirSync(stateDir, { recursive: true });
writeFileSync(resolve(stateDir, "previous_quant_v2_raw.json"), `${committedRaw}\n`);
console.log("Saved the committed raw scan as the exact comparison baseline.");

const nodeSteps = [
  ["Verify manually tracked official roles", "verify-manually-verified-roles.mjs", []],
  ["Run first source pass", "run-quant-scan.mjs", ["--mode=v2", "--scan-only", "--preserve-baseline"]],
  ["Run independent confirmation pass", "expand_quant_internship_search.mjs", []],
  ["Rebuild roster audit", "build_quant_roster_scan_audit.mjs", []],
  ["Build exact baseline report", "build_new_quant_roles_report.mjs", ["--confirmed-rerun"]],
  ["Build rolling 21-day report", "report-new-roles.mjs", ["--days=21", "--scope=quant", "--write"]],
  ["Build cumulative application queue", "build-cumulative-application-report.mjs", []],
  ["Build latest-scan dashboard", "build_scan_dashboard.mjs", []],
  ["Validate portable workflow outputs", "validate-quant-workflow.mjs", []],
  ["Rebuild README", "build-readme.mjs", []],
];

for (const [label, script, scriptArgs] of nodeSteps) {
  run(process.execPath, [resolve(repo, "scripts", script), ...scriptArgs], { label });
}

if (shouldPublish) {
  run(process.execPath, [resolve(repo, "scripts", "publish_scan_results.mjs")], { label: "Commit and push generated results" });
}

console.log("\nPortable quant refresh complete.");
console.log(`To repeat on another machine: npm run refresh:v2${shouldPublish ? ":publish" : ""}`);
