import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { calendarDate } from "./calendar-date.mjs";
import { roleIdentity } from "../tools/role-identity.mjs";
import { validateArtifacts } from "../tools/workflow-validation.mjs";
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = async (file) => JSON.parse(await fs.readFile(resolve(repo, file), "utf8"));
const manifest = await read("data/scan_confirmation.json");
const gitJson = (file) => JSON.parse(execFileSync("git", ["show", `${manifest.baselineCommit}:${file}`], { cwd: repo, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 }));
const artifacts = {
  manifest, current: await read("data/quant_internship_roles_scan_v2_raw.json"),
  previous: gitJson("data/quant_internship_roles_scan_v2_raw.json"),
  report: await read("data/new_quant_roles_since_last_run.json"),
  recent: await read("data/new_roles_last_three_weeks.json"),
  cumulative: await read("data/cumulative_application_roles.json"),
  priorCumulative: gitJson("data/cumulative_application_roles.json"),
  manual: await read("inputs/manually_verified_roles.json"),
  closed: await read("data/closed_roles_history.json"),
  readme: await fs.readFile(resolve(repo, "README.md"), "utf8"),
};
const { failures, difference, verifiedManual } = validateArtifacts(artifacts);
async function checkJson(dir) {
  for (const entry of await fs.readdir(resolve(repo, dir), { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await checkJson(file);
    else if (entry.name.endsWith(".json")) {
      try { await read(file); } catch (error) { failures.push(`Invalid JSON: ${file}: ${error.message}`); }
    }
  }
}
await checkJson("data");
await checkJson("inputs");
const { current, previous, report, recent, cumulative } = artifacts;
const currentIds = new Set(current.rows.map(roleIdentity)), previousIds = new Set(previous.rows.map(roleIdentity));
const summary = {
  generatedAt: new Date().toISOString(), scanDate: calendarDate(current.searchedAt),
  baselineCommit: manifest.baselineCommit, baselineScanAt: previous.searchedAt, currentScanAt: current.searchedAt,
  status: failures.length ? "failed" : "passed",
  baselineRows: previous.rows.length, currentRows: current.rows.length,
  exactAdded: current.rows.filter((row) => !previousIds.has(roleIdentity(row))),
  exactRemoved: previous.rows.filter((row) => !currentIds.has(roleIdentity(row))),
  reportedAdded: report.added, reportedRemoved: report.removed,
  pendingAbsences: report.pending?.length || 0, passDifference: difference,
  rollingDated: recent.roles.length, rollingUndated: recent.undatedFirstSeen.length,
  cumulativeTotal: cumulative.total, cumulativeActive: cumulative.active, cumulativeNotDetected: cumulative.notDetected,
  manuallyVerifiedToday: verifiedManual, failures,
};
if (!process.argv.includes("--check")) {
  await fs.writeFile(resolve(repo, "data/scan_validation.json"), JSON.stringify(summary, null, 2) + "\n");
  await fs.writeFile(resolve(repo, "reports/scan_validation.md"), [
    "# Quant Workflow Validation", "", `Status: **${summary.status.toUpperCase()}**`,
    `Scan date: ${summary.scanDate}`, `Baseline rows: ${summary.baselineRows}`, `Current rows: ${summary.currentRows}`,
    `Exact additions: ${summary.exactAdded.length}; additions confirmed in both passes: ${report.added.length}`,
    `Exact absences: ${summary.exactRemoved.length}; confirmed closures: ${report.removed.length}; guarded absences: ${summary.pendingAbsences}`,
    `Differences between source passes: ${difference}`,
    `Rolling report: ${summary.rollingDated} source-dated + ${summary.rollingUndated} undated`,
    `Cumulative queue: ${cumulative.total} total / ${cumulative.active} active / ${cumulative.notDetected} not detected`, "",
    "Checks cover identities, independent confirmation, critical source health, closure evidence, reopened roles, report timestamps and membership, date windows, cumulative preservation, manual verification, README counts, and JSON validity.", "",
    ...failures.map((failure) => `- ${failure}`), "",
  ].join("\n"));
}
console.log(`validation: ${summary.status}, ${summary.currentRows} roles, ${failures.length} failures`);
if (failures.length) throw new Error(failures.join("; "));
