import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { groupedRoleMarkdown } from "../tools/regions.mjs";
import { calendarDate } from "./calendar-date.mjs";
import { stableUrl, roleIdentity, isAggregatorLead } from "../tools/role-identity.mjs";
import { scanHash, updateLifecycle } from "../tools/scan-confirmation.mjs";

const looseUrl = stableUrl; // Tracker job query IDs must remain distinct.
function parseCsv(text = "") {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      record.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      record.push(field);
      if (record.some(Boolean)) records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }
  if (!records.length) return [];
  const headers = records[0];
  return records.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

async function historicalTrackerUrls() {
  const urls = new Set();
  for (const path of ["inputs/internship_tracker.csv", "inputs/new_internships_since_june_2026.csv"]) {
    try {
      const rows = parseCsv(await fs.readFile(path, "utf8"));
      for (const row of rows) if (row.URL) urls.add(looseUrl(row.URL));
    } catch {}
  }
  return urls;
}


const manifest = JSON.parse(await fs.readFile("data/scan_confirmation.json", "utf8"));
const previous = JSON.parse(execFileSync("git", ["show", `${manifest.baselineCommit}:data/quant_internship_roles_scan_v2_raw.json`], { encoding: "utf8", maxBuffer: 30 * 1024 * 1024 }));
const current = JSON.parse(await fs.readFile("data/quant_internship_roles_scan_v2_raw.json", "utf8"));
if (scanHash(current) !== manifest.confirmationPass.hash) throw new Error("Confirmation evidence does not match the current scan; run refresh:v2.");
const manual = JSON.parse(await fs.readFile("inputs/manually_verified_roles.json", "utf8"));
const stableState = JSON.parse(await fs.readFile("data/stable_quant_roles.json", "utf8"));
const history = JSON.parse(await fs.readFile("data/closed_roles_history.json", "utf8"));
// Repair legacy closure timestamps from actual saved observations. The old
// builder used the previous scan timestamp even when that scan was missing it.
const legacyHistory = history.filter((entry) => !entry.lastSeenEvidence);
if (legacyHistory.length) {
  const rawPath = "data/quant_internship_roles_scan_v2_raw.json";
  const commits = execFileSync("git", ["log", "--reverse", "--format=%H", "--", rawPath], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  const seen = new Map();
  for (const commit of commits) {
    const snapshot = JSON.parse(execFileSync("git", ["show", `${commit}:${rawPath}`], { encoding: "utf8", maxBuffer: 40 * 1024 * 1024 }));
    const ids = new Set((snapshot.rows || []).map(roleIdentity));
    for (const entry of legacyHistory) {
      if (ids.has(roleIdentity(entry)) && snapshot.searchedAt < entry.detectedClosedAt) {
        const key = `${roleIdentity(entry)}|${entry.detectedClosedAt}`;
        if (!seen.has(key) || snapshot.searchedAt > seen.get(key)) seen.set(key, snapshot.searchedAt);
      }
    }
  }
  for (const entry of legacyHistory) {
    entry.lastSeenOpenAt = seen.get(`${roleIdentity(entry)}|${entry.detectedClosedAt}`) || null;
    entry.lastSeenEvidence = entry.lastSeenOpenAt ? "committed_scan_history" : "unavailable";
  }
}
const result = updateLifecycle({
  previous, current, first: manifest.firstPass,
  stableRoles: stableState.roles.filter((row) => !isAggregatorLead(row)),
  history: history.filter((row) => !isAggregatorLead(row)),
  manualRoles: manual.roles || [],
});
await fs.writeFile("data/stable_quant_roles.json", `${JSON.stringify({ updatedAt: current.searchedAt, roles: result.stableRoles }, null, 2)}\n`);
await fs.writeFile("data/closed_roles_history.json", `${JSON.stringify(result.history, null, 2)}\n`);
const report = {
  generatedAt: new Date().toISOString(), baselineCommit: manifest.baselineCommit,
  previousScanAt: previous.searchedAt, currentScanAt: current.searchedAt,
  previousRows: previous.rows.length, currentRows: current.rows.length,
  added: result.added, removed: result.removed, pending: result.pending,
};
await fs.writeFile("data/new_quant_roles_since_last_run.json", `${JSON.stringify(report, null, 2)}\n`);
const link = (row) => `- **${row.Company}** - [${row.Title}](${row.URL})`;
await fs.writeFile("reports/new_quant_roles_since_last_run.md", [
  "# New Quant Roles Since Last Run", "",
  `Previous scan: ${previous.searchedAt}`, `Current scan: ${current.searchedAt}`,
  `Previous rows: ${previous.rows.length}`, `Current rows: ${current.rows.length}`,
  `New URLs confirmed in both source passes: ${result.added.length}`,
  `Confirmed no longer present: ${result.removed.length}`, "",
  "## New Roles By Region", "", ...groupedRoleMarkdown(result.added),
  "## No Longer Present", "", result.removed.length ? result.removed.map(link).join("\n") : "_None._", "",
  "## Missing but not confirmed closed", "",
  "_Source errors and incomplete coverage do not establish closure. These roles remain in the stability history._", "",
  result.pending.length ? result.pending.map(link).join("\n") : "_None._", "",
].join("\n"));
const byDay = new Map();
for (const entry of result.history) {
  const day = calendarDate(entry.detectedClosedAt) || "unknown";
  if (!byDay.has(day)) byDay.set(day, []);
  byDay.get(day).push(entry);
}
await fs.writeFile("reports/closed_roles_history.md", [
  "# Closed / Removed Roles History", "",
  `Total closure events recorded: ${result.history.length}`, `Last updated: ${current.searchedAt}`, "",
  "Closures require two independent successful observations of absence from the role's own official source. Detected closed is the confirmation time, not the employer's exact closing time. Legacy entries may have an unknown last-seen time. Reopened roles are annotated; a later closure is a separate event.", "",
  ...[...byDay].sort(([a], [b]) => b.localeCompare(a)).flatMap(([day, entries]) => [
    `### ${day} (${entries.length})`, "",
    ...entries.map((entry) => `${link(entry)}${String(entry.Location || "").trim() ? ` - ${String(entry.Location).trim()}` : ""}${entry.reopenedAt ? ` — _reopened ${calendarDate(entry.reopenedAt)}_` : ""}`), "",
  ]),
].join("\n"));
const trackerUrls = await historicalTrackerUrls();
const notInTracker = current.rows.filter((row) => !trackerUrls.has(stableUrl(row.URL)));
await fs.writeFile("reports/current_quant_roles_not_in_tracker.md", [
  "# Current Quant Roles Not In Historical Tracker", "", `Current scan: ${current.searchedAt}`,
  `Historical tracker URLs: ${trackerUrls.size}`, `Current roles absent from tracker: ${notInTracker.length}`, "",
  "These roles are absent from the older tracker and are not necessarily newly posted.", "", ...groupedRoleMarkdown(notInTracker),
].join("\n"));
await fs.writeFile("data/current_quant_roles_not_in_tracker.json", `${JSON.stringify({ generatedAt: report.generatedAt, currentScanAt: current.searchedAt, rows: notInTracker }, null, 2)}\n`);
console.log(`new-role report: added=${result.added.length} removed=${result.removed.length} pending=${result.pending.length}`);
