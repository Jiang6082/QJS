import fs from "node:fs/promises";
import { groupedRoleMarkdown, regionForLocation } from "./tools/regions.mjs";

const previousPath = ".scan-state/previous_quant_v2_raw.json";
const currentPath = "data/quant_internship_roles_scan_v2_raw.json";

function stableUrl(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.toLowerCase().replace(/[?#].*$/, "").replace(/\/$/, "");
  }
}

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
  for (const path of ["internship_tracker.csv", "new_internships_since_june_2026.csv"]) {
    try {
      const rows = parseCsv(await fs.readFile(path, "utf8"));
      for (const row of rows) if (row.URL) urls.add(stableUrl(row.URL));
    } catch {}
  }
  return urls;
}

let previous = { searchedAt: "unknown", rows: [] };
try {
  previous = JSON.parse(await fs.readFile(previousPath, "utf8"));
} catch {}
const current = JSON.parse(await fs.readFile(currentPath, "utf8"));
const previousUrls = new Set((previous.rows || []).map((row) => stableUrl(row.URL)));
const currentUrls = new Set((current.rows || []).map((row) => stableUrl(row.URL)));
const added = (current.rows || []).filter((row) => !previousUrls.has(stableUrl(row.URL)));
const removed = (previous.rows || []).filter((row) => !currentUrls.has(stableUrl(row.URL)));
const enrichedAdded = added.map((row) => ({ ...row, Region: regionForLocation(row.Location) }));
const trackerUrls = await historicalTrackerUrls();
const notInTracker = (current.rows || []).filter((row) => !trackerUrls.has(stableUrl(row.URL)));

const report = {
  generatedAt: new Date().toISOString(),
  previousScanAt: previous.searchedAt,
  currentScanAt: current.searchedAt,
  previousRows: previous.rows?.length || 0,
  currentRows: current.rows?.length || 0,
  added: enrichedAdded,
  removed,
};
await fs.writeFile("data/new_quant_roles_since_last_run.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");

const markdown = [
  "# New Quant Roles Since Last Run",
  "",
  `Previous scan: ${previous.searchedAt}`,
  `Current scan: ${current.searchedAt}`,
  `Previous rows: ${report.previousRows}`,
  `Current rows: ${report.currentRows}`,
  `New stable job URLs: ${added.length}`,
  `No longer present: ${removed.length}`,
  "",
  "## New Roles By Region",
  "",
  ...groupedRoleMarkdown(enrichedAdded),
  "## No Longer Present",
  "",
  removed.length ? removed.map((row) => `- **${row.Company}** - [${row.Title}](${row.URL})`).join("\n") : "_None._",
  "",
].join("\n");
await fs.writeFile("reports/new_quant_roles_since_last_run.md", markdown, "utf8");

// --- Persistent closed/removed-role archive ---
// Each role that disappears between two scans is recorded once (keyed by URL),
// with the last scan that still saw it open and the scan that first saw it gone.
// The true close time lies between those two timestamps.
const closedHistoryPath = "data/closed_roles_history.json";
let closedHistory = [];
try {
  const parsed = JSON.parse(await fs.readFile(closedHistoryPath, "utf8"));
  if (Array.isArray(parsed)) closedHistory = parsed;
} catch {}
const closedByUrl = new Map(closedHistory.map((entry) => [stableUrl(entry.URL), entry]));

// Annotate any previously-closed role that is open again in the current scan.
for (const row of current.rows || []) {
  const entry = closedByUrl.get(stableUrl(row.URL));
  if (entry && !entry.reopenedAt) entry.reopenedAt = current.searchedAt;
}

// Record newly-detected closures (first time we see a given URL disappear).
let newlyClosed = 0;
for (const row of removed) {
  const key = stableUrl(row.URL);
  if (closedByUrl.has(key)) continue;
  const entry = {
    Company: row.Company,
    Title: row.Title,
    Location: row.Location || "",
    Region: row.Region || regionForLocation(row.Location),
    URL: row.URL,
    Source: row.Source || "",
    Status: row.Status || "",
    lastSeenOpenAt: previous.searchedAt,
    detectedClosedAt: current.searchedAt,
  };
  closedHistory.push(entry);
  closedByUrl.set(key, entry);
  newlyClosed += 1;
}

// Most-recently-closed first.
closedHistory.sort((a, b) => String(b.detectedClosedAt).localeCompare(String(a.detectedClosedAt)));
await fs.writeFile(closedHistoryPath, `${JSON.stringify(closedHistory, null, 2)}\n`, "utf8");

const closedByDay = new Map();
for (const entry of closedHistory) {
  const day = String(entry.detectedClosedAt).slice(0, 10) || "unknown";
  if (!closedByDay.has(day)) closedByDay.set(day, []);
  closedByDay.get(day).push(entry);
}
const closedDays = [...closedByDay.keys()].sort((a, b) => b.localeCompare(a));
const closedMarkdown = [
  "# Closed / Removed Roles History",
  "",
  `Total closures recorded: ${closedHistory.length}`,
  `Last updated: ${current.searchedAt}`,
  "",
  "Each role below was present in an earlier scan and absent in a later one. \"Detected closed\" is the first scan that no longer saw the posting; it actually came down sometime between the previous scan and that one. Roles later seen open again are annotated as reopened.",
  "",
  "## Closures By Date Detected",
  "",
  ...closedDays.flatMap((day) => [
    `### ${day} (${closedByDay.get(day).length})`,
    "",
    ...closedByDay.get(day).map((entry) => {
      const loc = entry.Location ? ` - ${entry.Location}` : "";
      const reopened = entry.reopenedAt ? ` — _reopened ${String(entry.reopenedAt).slice(0, 10)}_` : "";
      return `- **${entry.Company}** - [${entry.Title}](${entry.URL})${loc}${reopened}`;
    }),
    "",
  ]),
].join("\n");
await fs.writeFile("reports/closed_roles_history.md", closedMarkdown, "utf8");

const trackerMarkdown = [
  "# Current Quant Roles Not In Historical Tracker",
  "",
  `Current scan: ${current.searchedAt}`,
  `Historical tracker URLs: ${trackerUrls.size}`,
  `Current roles absent from tracker: ${notInTracker.length}`,
  "",
  "These roles are absent from the older application tracker, but may have appeared in a prior full scanner output. They are not necessarily newly posted.",
  "",
  ...groupedRoleMarkdown(notInTracker),
].join("\n");
await fs.writeFile("reports/current_quant_roles_not_in_tracker.md", trackerMarkdown, "utf8");
await fs.writeFile("data/current_quant_roles_not_in_tracker.json", `${JSON.stringify({
  generatedAt: report.generatedAt,
  currentScanAt: current.searchedAt,
  historicalTrackerUrls: trackerUrls.size,
  roles: notInTracker,
}, null, 2)}\n`, "utf8");

console.log(`new-role report: previous=${report.previousRows} current=${report.currentRows} added=${added.length} removed=${removed.length} notInHistoricalTracker=${notInTracker.length}`);
console.log(`closed-role archive: total=${closedHistory.length} newlyClosed=${newlyClosed}`);
