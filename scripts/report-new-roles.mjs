// Build the rolling report from the same confirmed scan as the README.
// Date observations are persisted so report rendering never depends on another
// live request and fresh clones keep the same discovery history.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { calendarDate, shiftCalendarDate } from "./calendar-date.mjs";
import { roleIdentity, isAggregatorLead } from "../tools/role-identity.mjs";
import { sourceDateFromNotes, employerDate, inDateWindow } from "../tools/role-dates.mjs";
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(repo);
const arg = (key, fallback) => process.argv.find((value) => value.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const scope = arg("scope", "quant");
if (!["quant", "all"].includes(scope)) throw new Error("scope must be quant or all");
const days = Number(arg("days", "21"));
if (!Number.isInteger(days) || days < 1) throw new Error("days must be a positive integer");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const current = read("data/quant_internship_roles_scan_v2_raw.json");
const until = arg("until", calendarDate(current.searchedAt));
const since = arg("since", shiftCalendarDate(until, -(days - 1)));
if (!employerDate(until) || !employerDate(since) || since > until) throw new Error("Invalid report date window");
const rows = current.rows.map((row) => ({ ...row, scanAt: current.searchedAt }));
if (scope === "all") {
  for (const file of ["data/us_financial_services_internship_scan_raw.json", "data/swe_2027_internship_scan_raw.json"]) {
    if (fs.existsSync(file)) {
      const source = read(file);
      rows.push(...(source.rows || []).map((row) => ({ ...row, scanAt: source.searchedAt || source.scannedAt })));
    }
  }
}
const uniq = [...new Map(rows.filter((row) => row.URL && !isAggregatorLead(row)).map((row) => [roleIdentity(row), row])).values()];
const historyPath = "data/role_date_history.json";
const observations = fs.existsSync(historyPath) ? read(historyPath).roles : {};
function gitJson(commit, file) {
  return JSON.parse(execFileSync("git", ["show", `${commit}:${file}`], { encoding: "utf8", maxBuffer: 40 * 1024 * 1024 }));
}
if (!fs.existsSync(historyPath)) {
  const rawPath = "data/quant_internship_roles_scan_v2_raw.json";
  const commits = execFileSync("git", ["log", "--reverse", "--format=%H", "--", rawPath], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  for (const commit of commits) {
    const scan = gitJson(commit, rawPath);
    for (const row of scan.rows || []) {
      const key = roleIdentity(row);
      const day = calendarDate(scan.searchedAt);
      const previous = observations[key] || {};
      const source = sourceDateFromNotes(row.Notes, scan.searchedAt);
      observations[key] = {
        ...previous, URL: row.URL,
        first_seen: previous.first_seen || day,
        date: previous.date || source?.date || null,
        evidence: previous.evidence || source?.evidence || null,
      };
    }
  }
  // Migrate old relative-label dates when their provenance is the same employer
  // source. Other legacy date lookups used unscoped IDs and are not trusted.
  const reportPath = "data/new_roles_last_three_weeks.json";
  const reports = execFileSync("git", ["log", "--reverse", "--format=%H", "--", reportPath], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  for (const commit of reports) {
    for (const row of gitJson(commit, reportPath).roles || []) {
      if (!/Workday|Salesforce Experience Cloud/i.test(row.Source || "") || !employerDate(row.date)) continue;
      const previous = observations[roleIdentity(row)] ||= { URL: row.URL };
      if (!previous.date || row.date < previous.date) {
        previous.date = row.date;
        previous.evidence = "employer_relative_label";
      }
    }
  }
}
const released = [], undatedFirstSeen = [];
for (const row of uniq) {
  const key = roleIdentity(row);
  const prior = observations[key] || {};
  const source = sourceDateFromNotes(row.Notes, row.scanAt);
  // Repeated relative labels cannot move an existing role's release forward.
  const date = source?.evidence === "employer_field" ? source.date : prior.date || source?.date || null;
  const evidence = source?.evidence === "employer_field" ? source.evidence : prior.evidence || source?.evidence || null;
  const first_seen = prior.first_seen || calendarDate(row.scanAt);
  observations[key] = { URL: row.URL, first_seen, date, evidence };
  const role = { ...row };
  if (date && inDateWindow(date, since, until)) released.push({ ...role, date, dateEvidence: evidence });
  else if (!date && inDateWindow(first_seen, since, until)) undatedFirstSeen.push({ ...role, first_seen });
}
released.sort((a, b) => b.date.localeCompare(a.date) || a.Company.localeCompare(b.Company) || a.Title.localeCompare(b.Title));
undatedFirstSeen.sort((a, b) => b.first_seen.localeCompare(a.first_seen) || a.Company.localeCompare(b.Company));
const byCompany = new Map();
for (const row of released) {
  if (!byCompany.has(row.Company)) byCompany.set(row.Company, []);
  byCompany.get(row.Company).push(row);
}
let out = `# Roles posted ${since} → ${until} (${released.length} with source posting dates)\n\n`;
out += "_Dates come from employer publication fields or dated relative labels. Relative labels have day-level precision; source publication dates can reflect a repost. Internship start dates and edit timestamps are not release dates._\n";
for (const [company, companyRows] of [...byCompany].sort((a, b) => b[1].length - a[1].length)) {
  out += `\n## ${company} (${companyRows.length})\n\n`;
  for (const row of companyRows) out += `- **${row.date}** — [${row.Title}](${row.URL}) — ${String(row.Location || "n/a").trim()}${row.dateEvidence === "employer_relative_label" ? " _(relative source date)_" : ""}\n`;
}
out += `\n## First seen in this window, source posting date unavailable (${undatedFirstSeen.length})\n\n_Discovery dates are from the available QJS history._\n\n`;
for (const row of undatedFirstSeen) out += `- **first seen ${row.first_seen}** — **${row.Company}** — [${row.Title}](${row.URL}) — ${String(row.Location || "n/a").trim()}\n`;
if (process.argv.includes("--write")) {
  fs.writeFileSync(arg("markdown", "reports/new_roles_last_three_weeks.md"), out);
  fs.writeFileSync(arg("json", "data/new_roles_last_three_weeks.json"), JSON.stringify({
    generatedAt: new Date().toISOString(), currentScanAt: current.searchedAt, scope, since, until, count: released.length, roles: released, undatedFirstSeen,
  }, null, 2) + "\n");
  if (scope === "quant") fs.writeFileSync(historyPath, JSON.stringify({ updatedAt: current.searchedAt, roles: observations }, null, 2) + "\n");
  console.log(`rolling report: ${released.length} source-dated + ${undatedFirstSeen.length} undated (${since} through ${until})`);
} else process.stdout.write(out);
