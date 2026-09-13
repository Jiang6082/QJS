import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { confirmationSnapshot } from "../tools/scan-confirmation.mjs";
import { isScanArtifact } from "../tools/publish-policy.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const shouldPublish = args.has("--publish");
const allowDirty = args.has("--allow-dirty");
function output(command, args) {
  const result = spawnSync(command, args, { cwd: repo, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout);
  return result.stdout.trim();
}
function step(script, args = []) {
  console.log(`\n==> ${script}`);
  const result = spawnSync(process.execPath, [resolve(repo, "scripts", script), ...args], {
    cwd: repo, stdio: "inherit", env: { ...process.env, QJS_AUTO_PUBLISH: "0" },
  });
  if (result.status !== 0) throw new Error(`${script}: ${result.error?.message || `exit ${result.status}`}`);
}
const dirty = output("git", ["status", "--porcelain", "--untracked-files=all"]);
if (dirty && !allowDirty) throw new Error("Worktree is not clean. Commit your changes before refreshing.");
if (dirty && shouldPublish) throw new Error("--allow-dirty cannot be combined with publishing. Commit reviewed code first.");
const changed = output("git", ["diff", "HEAD", "--name-only"]).split(/\r?\n/).filter(Boolean);
if (changed.some(isScanArtifact)) throw new Error("Generated artifacts contain local changes. Commit them before rebuilding to preserve your baseline.");
const stateDir = resolve(repo, ".scan-state");
fs.mkdirSync(stateDir, { recursive: true });
const lockPath = resolve(stateDir, "refresh.lock");
let lock;
try { lock = fs.openSync(lockPath, "wx"); }
catch { throw new Error("Another refresh owns .scan-state/refresh.lock. Check whether it is still running before removing a stale lock."); }
fs.writeFileSync(lock, String(process.pid));
const snapshots = new Map();
let rebuilt = false;
try {
  const paths = output("git", ["ls-files"]).split(/\r?\n/).filter(isScanArtifact);
  for (const file of [...paths, "data/scan_confirmation.json", "data/role_date_history.json"]) {
    if (!snapshots.has(file)) snapshots.set(file, fs.existsSync(resolve(repo, file)) ? fs.readFileSync(resolve(repo, file)) : null);
  }
  const baselineCommit = output("git", ["rev-parse", "HEAD"]);
  const baseline = JSON.parse(output("git", ["show", `${baselineCommit}:data/quant_internship_roles_scan_v2_raw.json`]));
  fs.writeFileSync(resolve(stateDir, "previous_quant_v2_raw.json"), JSON.stringify(baseline));
  const stable = JSON.parse(fs.readFileSync(resolve(repo, "data/stable_quant_roles.json"), "utf8"));
  const candidates = [...baseline.rows, ...stable.roles];
  step("verify-manually-verified-roles.mjs");
  step("run-quant-scan.mjs", ["--mode=v2", "--scan-only", "--preserve-baseline"]);
  const first = JSON.parse(fs.readFileSync(resolve(repo, "data/quant_internship_roles_scan_v2_raw.json"), "utf8"));
  step("run-quant-scan.mjs", ["--mode=v2", "--scan-only", "--preserve-baseline"]);
  const second = JSON.parse(fs.readFileSync(resolve(repo, "data/quant_internship_roles_scan_v2_raw.json"), "utf8"));
  const firstPass = confirmationSnapshot(first, candidates);
  const confirmationPass = confirmationSnapshot(second, candidates);
  const firstIds = new Set(firstPass.identities);
  const secondIds = new Set(confirmationPass.identities);
  const manifest = {
    baselineCommit, firstPass, confirmationPass,
    onlyFirstPass: [...firstIds].filter((id) => !secondIds.has(id)),
    onlyConfirmationPass: [...secondIds].filter((id) => !firstIds.has(id)),
  };
  fs.writeFileSync(resolve(repo, "data/scan_confirmation.json"), JSON.stringify(manifest, null, 2) + "\n");
  for (const [script, args] of [
    ["build_quant_roster_scan_audit.mjs", []],
    ["build_new_quant_roles_report.mjs", ["--confirmed-rerun"]],
    ["report-new-roles.mjs", ["--days=21", "--scope=quant", "--write"]],
    ["build-cumulative-application-report.mjs", []],
    ["build_scan_dashboard.mjs", []],
    ["build-readme.mjs", []],
    ["validate-quant-workflow.mjs", []],
  ]) step(script, args);
  rebuilt = true;
  if (shouldPublish) step("publish_scan_results.mjs");
  console.log("Portable quant refresh complete.");
} catch (error) {
  if (!rebuilt) {
    for (const [file, content] of snapshots) {
      if (content === null) fs.rmSync(resolve(repo, file), { force: true });
      else fs.writeFileSync(resolve(repo, file), content);
    }
    console.error("Refresh failed; restored the previous generated reports and history.");
  }
  throw error;
} finally {
  fs.closeSync(lock);
  fs.unlinkSync(lockPath);
}
