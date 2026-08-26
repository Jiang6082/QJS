import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { calendarDate } from "./calendar-date.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(repo, "data/cumulative_application_roles.json");
const reportPath = path.join(repo, "reports/cumulative_application_roles.md");
const currentRawPath = path.join(repo, "data/quant_internship_roles_scan_v2_raw.json");
const previousRawPath = path.join(repo, ".scan-state/previous_quant_v2_raw.json");
const recentPath = path.join(repo, "data/new_roles_last_three_weeks.json");
const manualPath = path.join(repo, "inputs/manually_verified_roles.json");

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}

function gitJson(spec) {
  try {
    return JSON.parse(execFileSync("git", ["show", spec], {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 25 * 1024 * 1024,
    }));
  } catch { return null; }
}

function cleanRow(row) {
  return {
    Company: row.Company || row.company || "Unknown",
    Title: row.Title || row.title || "Untitled role",
    Location: row.Location || row.location || "n/a",
    URL: String(row.URL || row.url || "").trim(),
    Source: row.Source || row.source || "",
    source_status: row.source_status || row.Status || row.StatusLabel || "",
    release_date: row.release_date || row.date || null,
    first_seen: row.first_seen || null,
    discovery_note: row.discovery_note || null,
    manually_verified: Boolean(row.manually_verified),
    verifiedAt: row.verifiedAt || null,
  };
}

function isAggregatorLead(row) {
  return /aggregator|web-discovered/i.test(`${row.source_status || row.Status || ""} ${row.Source || ""}`)
    || /(?:glassdoor\.com|extern\.com)/i.test(row.URL || "");
}

function mergeRole(ledger, row, defaults = {}) {
  const incoming = cleanRow({ ...defaults, ...row });
  if (!incoming.URL) return;
  const previous = ledger.get(incoming.URL) || {};
  ledger.set(incoming.URL, {
    ...previous,
    ...incoming,
    release_date: incoming.release_date || previous.release_date || null,
    first_seen: previous.first_seen || incoming.first_seen || null,
    discovery_note: incoming.discovery_note || previous.discovery_note || null,
    manually_verified: incoming.manually_verified || previous.manually_verified || false,
    verifiedAt: incoming.verifiedAt || previous.verifiedAt || null,
  });
}

function reportDates(...reports) {
  const dates = new Map();
  const firstSeen = new Map();
  for (const report of reports.filter(Boolean)) {
    for (const role of report.roles || []) if (role.URL && role.date) dates.set(role.URL, role.date);
    for (const role of report.undatedFirstSeen || []) if (role.URL && role.first_seen) firstSeen.set(role.URL, role.first_seen);
  }
  return { dates, firstSeen };
}

function bootstrapLedger() {
  const ledger = new Map();
  const seed = readJson(path.join(repo, ".scan-state/previous_report_2026-08-16.json"), { roles: [], undatedFirstSeen: [] });
  const reports = [
    seed,
    readJson(path.join(repo, ".scan-state/previous_report_2026-08-19.json")),
    readJson(path.join(repo, ".scan-state/previous_report_2026-08-20.json")),
    readJson(recentPath),
  ];
  const { dates, firstSeen } = reportDates(...reports);
  for (const role of seed.roles || []) mergeRole(ledger, role, { release_date: role.date });
  for (const role of seed.undatedFirstSeen || []) mergeRole(ledger, role, { first_seen: role.first_seen });

  const baseline = gitJson("66d9257:data/quant_internship_roles_scan_v2_raw.json") || { rows: [] };
  const baselineUrls = new Set((baseline.rows || []).map((row) => row.URL));
  const snapshots = [
    gitJson("8be78c4:data/quant_internship_roles_scan_v2_raw.json"),
    readJson(path.join(repo, ".scan-state/previous_raw_2026-08-19.json")),
    readJson(path.join(repo, ".scan-state/previous_raw_2026-08-20.json")),
  ].filter(Boolean);
  for (const snapshot of snapshots) {
    const day = String(snapshot.searchedAt || "").slice(0, 10) || null;
    for (const row of snapshot.rows || []) {
      if (baselineUrls.has(row.URL)) continue;
      mergeRole(ledger, row, {
        release_date: dates.get(row.URL) || null,
        first_seen: firstSeen.get(row.URL) || day,
      });
    }
  }
  return ledger;
}

const existing = readJson(dataPath);
const ledger = existing?.roles?.length
  ? new Map(existing.roles.map((role) => [role.URL, cleanRow(role)]))
  : bootstrapLedger();
const currentRaw = readJson(currentRawPath, { searchedAt: new Date().toISOString(), rows: [] });
const scanDate = calendarDate(currentRaw.searchedAt) || calendarDate();
const previousRaw = readJson(previousRawPath, { rows: [] });
const recent = readJson(recentPath, { roles: [], undatedFirstSeen: [] });
const manual = readJson(manualPath, { roles: [] });
const { dates: currentDates, firstSeen: currentFirstSeen } = reportDates(recent);
const previousRoleRows = (previousRaw.rows || []).filter((row) => !isAggregatorLead(row));
const currentRoleRows = (currentRaw.rows || []).filter((row) => !isAggregatorLead(row));
const previousUrls = new Set(previousRoleRows.map((row) => row.URL));
const currentUrls = new Set(currentRoleRows.map((row) => row.URL));

for (const [url, role] of ledger) {
  if (isAggregatorLead(role)) ledger.delete(url);
}

for (const role of recent.roles || []) if (!isAggregatorLead(role)) mergeRole(ledger, role, { release_date: role.date });
for (const role of recent.undatedFirstSeen || []) if (!isAggregatorLead(role)) mergeRole(ledger, role, { first_seen: role.first_seen });
for (const row of currentRoleRows) {
  if (!previousUrls.has(row.URL) || ledger.has(row.URL)) {
    mergeRole(ledger, row, {
      release_date: currentDates.get(row.URL) || null,
      first_seen: currentFirstSeen.get(row.URL) || scanDate,
    });
  }
}
for (const role of manual.roles || []) mergeRole(ledger, role, { manually_verified: true });

const roles = [...ledger.values()].map((role) => ({
  ...role,
  first_seen: role.first_seen && role.first_seen > scanDate ? scanDate : role.first_seen,
  status: currentUrls.has(role.URL) || (role.manually_verified && role.verifiedAt === scanDate)
    ? "active"
    : "not_detected",
})).sort((a, b) => {
  if (a.status !== b.status) return a.status === "active" ? -1 : 1;
  const ad = a.release_date || a.first_seen || "";
  const bd = b.release_date || b.first_seen || "";
  return bd.localeCompare(ad) || a.Company.localeCompare(b.Company) || a.Title.localeCompare(b.Title) || a.Location.localeCompare(b.Location);
});

const scannerNewUrls = new Set(currentRoleRows.filter((row) => !previousUrls.has(row.URL)).map((row) => row.URL));
const manuallyRecoveredUrls = new Set((manual.roles || []).map((role) => role.URL));
const active = roles.filter((role) => role.status === "active");
const notDetected = roles.filter((role) => role.status === "not_detected");
const scannerNew = roles.filter((role) => scannerNewUrls.has(role.URL));
const manuallyRecovered = roles.filter((role) => manuallyRecoveredUrls.has(role.URL));

const output = {
  generatedAt: new Date().toISOString(),
  currentScanAt: currentRaw.searchedAt,
  total: roles.length,
  active: active.length,
  notDetected: notDetected.length,
  newSincePreviousScan: scannerNew.length,
  manuallyRecovered: manuallyRecovered.length,
  roles,
};

function esc(value) { return String(value || "").replace(/\|/g, "\\|"); }
function line(role) {
  const date = role.release_date ? `released ${role.release_date}` : role.first_seen ? `first seen ${role.first_seen}` : "date unavailable";
  return `- **${esc(role.Company)}** — [${esc(role.Title)}](${role.URL}) — ${esc(role.Location)} — ${date}`;
}

let md = `# Cumulative application queue\n\n`;
md += `_Updated ${scanDate}. Roles remain in this ledger when they age out of the rolling 21-day report._\n\n`;
md += `- **${roles.length}** unique role URLs tracked\n`;
md += `- **${active.length}** active or manually verified today\n`;
md += `- **${notDetected.length}** not detected in the latest scan\n`;
md += `- **${scannerNew.length}** new scanner URLs since the previous scan\n`;
md += `- **${manuallyRecovered.length}** live Scientech roles recovered from its nested official Ashby board\n\n`;

md += `## New scanner URLs since the previous scan (${scannerNew.length})\n\n`;
for (const role of scannerNew) md += `${line(role)}\n`;

md += `\n## Scientech roles recovered from the nested official board (${manuallyRecovered.length})\n\n`;
md += `_These roles are live on Scientech's official Ashby board but absent from the scanner because the configured Wix page hides the board inside nested iframes._\n\n`;
for (const role of manuallyRecovered) md += `${line(role)}\n`;

md += `\n## Active cumulative queue (${active.length})\n\n`;
const byCompany = new Map();
for (const role of active) {
  if (!byCompany.has(role.Company)) byCompany.set(role.Company, []);
  byCompany.get(role.Company).push(role);
}
for (const [company, companyRoles] of [...byCompany.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  md += `### ${company} (${companyRoles.length})\n\n`;
  for (const role of companyRoles) md += `${line(role)}\n`;
  md += `\n`;
}

md += `## Not detected in the latest scan (${notDetected.length})\n\n`;
md += `_These entries are preserved for history. A single missing scan is not proof that an employer closed the posting._\n\n`;
for (const role of notDetected) md += `${line(role)}\n`;

fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(dataPath, JSON.stringify(output, null, 2));
fs.writeFileSync(reportPath, md);
console.log(`wrote ${path.relative(repo, reportPath)} and ${path.relative(repo, dataPath)} (total=${roles.length}, active=${active.length}, notDetected=${notDetected.length})`);
