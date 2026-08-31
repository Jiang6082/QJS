import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { calendarDate } from "./calendar-date.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) => JSON.parse(await fs.readFile(resolve(repo, path), "utf8"));

function gitJson(spec) {
  return JSON.parse(execFileSync("git", ["show", spec], {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  }));
}

function stableUrl(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|gclid|fbclid|mc_cid|mc_eid|ref|source|src|trk|_ga)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return String(value).toLowerCase().replace(/#.*$/, "").replace(/\/$/, "");
  }
}

function isAggregatorLead(row = {}) {
  return /aggregator|web-discovered|web lead/i.test(`${row.Source || ""} ${row.Status || ""}`)
    || /(?:glassdoor\.com|extern\.com)/i.test(row.URL || "");
}

async function jsonFilesUnder(relativeDir) {
  const root = resolve(repo, relativeDir);
  const found = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name.endsWith(".json")) found.push(path);
    }
  }
  await walk(root);
  return found;
}

const current = await readJson("data/quant_internship_roles_scan_v2_raw.json");
let previous;
try {
  previous = await readJson(".scan-state/previous_quant_v2_raw.json");
} catch {
  previous = gitJson("HEAD:data/quant_internship_roles_scan_v2_raw.json");
}
const newReport = await readJson("data/new_quant_roles_since_last_run.json");
const recent = await readJson("data/new_roles_last_three_weeks.json");
const cumulative = await readJson("data/cumulative_application_roles.json");
const manual = await readJson("inputs/manually_verified_roles.json");
const priorCumulative = gitJson("HEAD:data/cumulative_application_roles.json");
const today = calendarDate();

const currentStableUrls = (current.rows || []).map((row) => stableUrl(row.URL));
const currentByUrl = new Map((current.rows || []).map((row) => [stableUrl(row.URL), row]));
const previousByUrl = new Map((previous.rows || []).map((row) => [stableUrl(row.URL), row]));
const manualUrls = new Set((manual.roles || []).map((row) => stableUrl(row.URL)));
const exactAdded = [...currentByUrl.keys()].filter((url) => !previousByUrl.has(url));
const exactRemoved = [...previousByUrl.keys()].filter((url) => !currentByUrl.has(url));
const expectedReportedAdded = exactAdded.filter((url) => !manualUrls.has(url)).sort();
const reportedAdded = (newReport.added || []).map((row) => stableUrl(row.URL)).sort();
const duplicateUrls = currentStableUrls.filter((url, index, all) => all.indexOf(url) !== index);
const aggregatorRows = (current.rows || []).filter(isAggregatorLead);
const futureDated = (recent.roles || []).filter((row) => row.date && row.date > today);
const priorCumulativeMissing = (priorCumulative.roles || []).filter((row) => !(cumulative.roles || []).some((currentRole) => currentRole.URL === row.URL));
const verifiedManual = (manual.roles || []).filter((row) => row.verifiedAt === today);
const verifiedManualMissing = verifiedManual.filter((row) => !currentByUrl.has(stableUrl(row.URL)));
const scientechAudit = (current.careerPageScanAudits || []).find((entry) => entry.company === "Scientech Research Capital");
const badAureasPage = (current.careerPageDb?.companies?.["Aureas Finance"]?.careerPages || [])
  .filter((url) => /aresmgmt\.wd1\.myworkdayjobs\.com/i.test(url));

const invalidJson = [];
for (const file of [...await jsonFilesUnder("data"), ...await jsonFilesUnder("inputs")]) {
  try {
    JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    invalidJson.push(`${relative(repo, file)}: ${error.message}`);
  }
}

const failures = [];
if (duplicateUrls.length) failures.push(`${duplicateUrls.length} duplicate stable URLs`);
if (aggregatorRows.length) failures.push(`${aggregatorRows.length} aggregator rows in the applicant scan`);
if (futureDated.length) failures.push(`${futureDated.length} future-dated rolling-report roles`);
if (priorCumulativeMissing.length) failures.push(`${priorCumulativeMissing.length} prior cumulative URLs were lost`);
if (verifiedManualMissing.length) failures.push(`${verifiedManualMissing.length} roles verified today are absent from the raw scan`);
if (badAureasPage.length) failures.push("Aureas Finance contains the blocked Ares Management page");
if (JSON.stringify(reportedAdded) !== JSON.stringify(expectedReportedAdded)) failures.push("reported additions do not match the saved baseline delta");
if (invalidJson.length) failures.push(`${invalidJson.length} JSON files could not be parsed`);

const summary = {
  generatedAt: new Date().toISOString(),
  scanDate: today,
  status: failures.length ? "failed" : "passed",
  baselineScanAt: previous.searchedAt,
  currentScanAt: current.searchedAt,
  baselineRows: previous.rows?.length || 0,
  currentRows: current.rows?.length || 0,
  exactAdded: exactAdded.map((url) => currentByUrl.get(url)),
  exactRemoved: exactRemoved.map((url) => previousByUrl.get(url)),
  reportedAdded: newReport.added || [],
  reportedRemoved: newReport.removed || [],
  rollingDated: recent.roles?.length || 0,
  rollingUndated: recent.undatedFirstSeen?.length || 0,
  cumulativeTotal: cumulative.total,
  cumulativeActive: cumulative.active,
  cumulativeNotDetected: cumulative.notDetected,
  manuallyVerifiedToday: verifiedManual.length,
  scientechJobsSeen: scientechAudit?.jobsSeen || 0,
  scientechRolesRetained: scientechAudit?.relevantInternships || 0,
  checks: {
    duplicateUrls: duplicateUrls.length,
    aggregatorRows: aggregatorRows.length,
    futureDated: futureDated.length,
    priorCumulativeMissing: priorCumulativeMissing.length,
    verifiedManualMissing: verifiedManualMissing.length,
    invalidJson: invalidJson.length,
  },
  failures,
};

const roleLines = (roles) => roles.length
  ? roles.map((row) => `- **${row.Company}** — [${row.Title}](${row.URL})`).join("\n")
  : "_None._";
const markdown = [
  "# Quant Workflow Validation",
  "",
  `Status: **${summary.status.toUpperCase()}**`,
  `Scan date: ${today}`,
  `Baseline rows: ${summary.baselineRows}`,
  `Current rows: ${summary.currentRows}`,
  `Exact additions: ${summary.exactAdded.length}`,
  `Exact removals: ${summary.exactRemoved.length}`,
  `Rolling report: ${summary.rollingDated} dated + ${summary.rollingUndated} undated`,
  `Cumulative queue: ${summary.cumulativeTotal} total / ${summary.cumulativeActive} active / ${summary.cumulativeNotDetected} not detected`,
  "",
  "## Exact additions",
  "",
  roleLines(summary.exactAdded),
  "",
  "## Exact removals",
  "",
  roleLines(summary.exactRemoved),
  "",
  "## Integrity checks",
  "",
  `- Duplicate URLs: ${summary.checks.duplicateUrls}`,
  `- Aggregator rows: ${summary.checks.aggregatorRows}`,
  `- Future-dated roles: ${summary.checks.futureDated}`,
  `- Prior cumulative URLs lost: ${summary.checks.priorCumulativeMissing}`,
  `- Verified manual roles missing: ${summary.checks.verifiedManualMissing}`,
  `- Invalid JSON files: ${summary.checks.invalidJson}`,
  `- Scientech official board: ${summary.scientechJobsSeen} jobs seen / ${summary.scientechRolesRetained} matching internships`,
  "",
  ...(failures.length ? ["## Failures", "", ...failures.map((failure) => `- ${failure}`), ""] : []),
].join("\n");

await fs.writeFile(resolve(repo, "data/scan_validation.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await fs.writeFile(resolve(repo, "reports/scan_validation.md"), `${markdown}\n`, "utf8");
console.log(`validation: ${summary.status} baseline=${summary.baselineRows} current=${summary.currentRows} added=${summary.exactAdded.length} removed=${summary.exactRemoved.length}`);
if (failures.length) throw new Error(failures.join("; "));
