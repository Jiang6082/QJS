// Stateless "what opened recently" reporter.
//
// Reads the current scan outputs and re-derives each role's true release date
// from the source ATS (Greenhouse first_published, Eightfold t_create, Workable
// published, Ashby publishedAt, Lever createdAt, and source-provided Notes),
// then prints roles released within a window.
// No saved state needed, so it is safe to run in a fresh cloud session daily:
//   node report-new-roles.mjs --days=3
//   node report-new-roles.mjs --since=2026-07-27
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { calendarDate, shiftCalendarDate } from "./calendar-date.mjs";

const arg = (k, d) => { const m = process.argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.split("=")[1] : d; };
const days = Number(arg("days", "1"));
const until = arg("until", calendarDate());
const since = arg("since", shiftCalendarDate(until, -Math.max(0, days - 1)));
const shouldWrite = process.argv.includes("--write");
const scope = arg("scope", "all");
const markdownPath = arg("markdown", "reports/new_roles_last_three_weeks.md");
const jsonPath = arg("json", "data/new_roles_last_three_weeks.json");
const inWindow = (iso) => { if (!iso) return false; const d = iso.slice(0, 10); return d >= since && d <= until; };

const quantFiles = [
  "data/quant_internship_scan_raw.json",
  "data/quant_internship_roles_scan_v2_raw.json",
];
const files = scope === "quant" ? quantFiles : [
  ...quantFiles,
  "data/us_financial_services_internship_scan_raw.json",
  "data/swe_2027_internship_scan_raw.json",
];
const rows = [];
for (const f of files) {
  try {
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    const scanAt = j.searchedAt || j.scannedAt || null;
    (j.rows || j.matches || []).forEach((r) => rows.push({
      Company: r.Company || r.company, Title: r.Title || r.title,
      Location: r.Location || r.location, Region: r.Region || r.region || "",
      URL: (r.URL || r.url || "").trim(), Source: r.Source || r.source || "",
      Status: r.Status || r.status || "", Notes: r.Notes || r.notes || "", scanAt,
    }));
  } catch { /* output missing — skip */ }
}
function isAggregatorLead(row) {
  return /aggregator|web-discovered/i.test(`${row.Status || ""} ${row.Source || ""}`)
    || /(?:glassdoor\.com|extern\.com)/i.test(row.URL || "");
}
const byUrl = new Map();
for (const r of rows) if (r.URL && !byUrl.has(r.URL)) byUrl.set(r.URL, r);
const uniq = [...byUrl.values()].filter((row) => !isAggregatorLead(row));

async function jget(url, opts) { try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000); const r = await fetch(url, { signal: c.signal, headers: { "user-agent": "Mozilla/5.0" }, ...opts }); clearTimeout(t); return r.ok ? await r.json() : null; } catch { return null; } }
const idOf = (u) => { const m = (u || "").match(/(\d{5,})/g); return m ? m[m.length - 1] : null; };

const gh = new Set(["janestreet"]), ef = new Set(), wk = new Set(), ash = new Set(), lever = new Set(), smartRecruiters = new Set();
for (const r of uniq) {
  let m;
  if ((m = r.Source.match(/Greenhouse:([^ ]+)/))) gh.add(m[1]);
  else if ((m = r.Source.match(/Eightfold:([^ ]+)/))) ef.add(m[1]);
  else if ((m = r.Source.match(/Workable:([^ ]+)/))) wk.add(m[1]);
  else if ((m = r.Source.match(/Ashby:([^ ]+)/))) ash.add(m[1]);
  else if ((m = r.Source.match(/Lever:([^ ]+)/))) lever.add(m[1]);
  else if ((m = r.Source.match(/SmartRecruiters:([^ ]+)/))) smartRecruiters.add(m[1]);
}
const dateByUrl = new Map(), dateById = new Map();
for (const tok of gh) { const j = await jget(`https://boards-api.greenhouse.io/v1/boards/${tok}/jobs?content=true`); for (const job of (j?.jobs || [])) { const d = job.first_published; if (job.absolute_url) dateByUrl.set(job.absolute_url, d); if (job.id) dateById.set(String(job.id), d); } }
for (const host of ef) { const j = await jget(`https://${host}/api/apply/v2/jobs?domain=${host.includes("mlp") ? "mlp.com" : host.split(".").slice(-2).join(".")}&start=0&num=100&sort_by=relevance`); for (const p of (j?.positions || [])) { const d = p.t_create ? new Date(p.t_create * 1000).toISOString() : null; if (p.canonicalPositionUrl) dateByUrl.set(p.canonicalPositionUrl, d); if (p.id) dateById.set(String(p.id), d); } }
for (const acc of wk) { const j = await jget(`https://apply.workable.com/api/v3/accounts/${acc}/jobs`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); for (const job of (j?.results || [])) { if (job.published) dateByUrl.set(`https://apply.workable.com/${acc}/j/${job.shortcode}/`, job.published); } }
for (const tok of ash) { const j = await jget(`https://api.ashbyhq.com/posting-api/job-board/${tok}`); for (const job of (j?.jobs || [])) { const d = job.publishedAt || job.updatedAt; if (job.jobUrl) dateByUrl.set(job.jobUrl, d); } }
for (const tok of lever) { const jobs = await jget(`https://api.lever.co/v0/postings/${tok}?mode=json`); for (const job of (jobs || [])) { const d = job.createdAt ? new Date(job.createdAt).toISOString() : null; if (job.hostedUrl) dateByUrl.set(job.hostedUrl, d); if (job.applyUrl) dateByUrl.set(job.applyUrl, d); if (job.id) dateById.set(String(job.id), d); } }
for (const companyId of smartRecruiters) {
  for (let offset = 0; offset < 1000; offset += 100) {
    const j = await jget(`https://api.smartrecruiters.com/v1/companies/${companyId}/postings?limit=100&offset=${offset}`);
    const jobs = j?.content || [];
    for (const job of jobs) if (job.id && job.releasedDate) dateById.set(String(job.id), job.releasedDate);
    if (!j || jobs.length < 100 || offset + jobs.length >= (j.totalFound || 0)) break;
  }
}

// Some official feeds already expose an exact date during the scan. Preserve it
// in Notes and prefer it over a discovery timestamp.
for (const r of uniq) {
  const exact = r.Notes.match(/(?:^|\|\s*)(?:posted|datePosted|openquant_datePosted|lastPostedDate)=([0-9]{4}-[0-9]{2}-[0-9]{2}(?:T[^|\s]+)?)/i)?.[1];
  if (exact) dateByUrl.set(r.URL, exact);
}

// Workday and Salesforce boards can expose only a relative "Posted Today /
// N Days Ago" string. Re-anchor it to that file's scan time to get an absolute
// date (day granularity; "30+ Days Ago" is a floor, always pre-window).
function relativePostedDate(notes, scanAtIso) {
  if (!notes || !scanAtIso) return null;
  const m = notes.match(/Posted\s+(Today|Yesterday|(\d+)\+?\s+Days?\s+Ago)/i);
  if (!m) return null;
  const base = calendarDate(scanAtIso);
  if (!base) return null;
  const daysAgo = /Today/i.test(m[1]) ? 0 : /Yesterday/i.test(m[1]) ? 1 : Number(m[2]);
  return `${shiftCalendarDate(base, -daysAgo)}T00:00:00.000Z`;
}

// Relative labels can remain stuck on "Posted Today" across repeated scans.
// Recomputing them against every new scan timestamp would make an unchanged
// URL look newly released each day. Preserve the earliest source-derived date
// already published for that URL in the repository's report history.
function gitEarliestReportedDateByUrl() {
  const earliest = new Map();
  const reportPath = "data/new_roles_last_three_weeks.json";
  try {
    const commits = execFileSync("git", ["log", "--format=%H", "--", reportPath], { encoding: "utf8" })
      .trim().split(/\r?\n/).filter(Boolean).reverse();
    for (const commit of commits) {
      let snapshot;
      try {
        snapshot = JSON.parse(execFileSync("git", ["show", `${commit}:${reportPath}`], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }));
      } catch { continue; }
      for (const role of snapshot.roles || []) {
        const date = String(role.date || "").slice(0, 10);
        if (!role.URL || !date) continue;
        const previous = earliest.get(role.URL);
        if (!previous || date < previous) earliest.set(role.URL, date);
      }
    }
  } catch { /* git history unavailable — fall back to the current relative label */ }
  return earliest;
}

const earliestReportedDateByUrl = scope === "quant" ? gitEarliestReportedDateByUrl() : new Map();
for (const r of uniq) {
  if (dateByUrl.has(r.URL)) continue;
  if (/myworkdayjobs|Workday|Salesforce Experience Cloud|bambusdev\.my\.site\.com/i.test(`${r.URL} ${r.Source}`)) {
    const d = earliestReportedDateByUrl.get(r.URL) || relativePostedDate(r.Notes, r.scanAt);
    if (d) dateByUrl.set(r.URL, d);
  }
}

const released = [];
const sourceDateFor = (r) => {
  let d = dateByUrl.get(r.URL);
  if (!d) { const id = idOf(r.URL); if (id) d = dateById.get(id); }
  return d || null;
};
for (const r of uniq) {
  const d = sourceDateFor(r);
  if (d && inWindow(d)) released.push({ ...r, date: d.slice(0, 10) });
}
released.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.Company.localeCompare(b.Company)));

// For official pages that expose no posting date at all, keep a clearly
// separate first-seen list. Git history is the repo's cross-machine scan
// history; first_seen must never be presented as the employer's release date.
function gitFirstSeenByUrl() {
  const firstSeen = new Map();
  const rawPath = "data/quant_internship_roles_scan_v2_raw.json";
  try {
    const commits = execFileSync("git", ["log", "--format=%H", "--", rawPath], { encoding: "utf8" })
      .trim().split(/\r?\n/).filter(Boolean).reverse();
    if (!commits.length) return firstSeen;
    for (const commit of commits) {
      let snapshot;
      try {
        snapshot = JSON.parse(execFileSync("git", ["show", `${commit}:${rawPath}`], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }));
      } catch { continue; }
      const day = calendarDate(snapshot.searchedAt);
      for (const row of snapshot.rows || []) if (row.URL && !firstSeen.has(row.URL)) firstSeen.set(row.URL, day);
    }
    for (const r of uniq) if (r.URL && !firstSeen.has(r.URL) && r.scanAt) firstSeen.set(r.URL, calendarDate(r.scanAt));
  } catch { /* git history unavailable — do not guess */ }
  return firstSeen;
}
const firstSeenByUrl = scope === "quant" ? gitFirstSeenByUrl() : new Map();
const undatedFirstSeen = uniq
  .filter((r) => !sourceDateFor(r) && inWindow(firstSeenByUrl.get(r.URL)))
  .map((r) => ({ ...r, first_seen: firstSeenByUrl.get(r.URL) }))
  .sort((a, b) => b.first_seen.localeCompare(a.first_seen) || a.Company.localeCompare(b.Company) || a.Title.localeCompare(b.Title));

const byco = {};
for (const r of released) (byco[r.Company] ||= []).push(r);
let out = `# Roles released ${since} → ${until} (${released.length} with confirmed release dates)\n`;
for (const [co, list] of Object.entries(byco).sort((a, b) => b[1].length - a[1].length)) {
  out += `\n## ${co} (${list.length})\n`;
  for (const r of list) out += `- **${r.date}** — [${r.Title}](${r.URL}) — ${r.Location || "n/a"}\n`;
}
out += `\n## First seen in this window, but source posting date unavailable (${undatedFirstSeen.length})\n`;
out += `\n_These are discovery dates from QJS history, not employer release dates._\n`;
for (const r of undatedFirstSeen) out += `- **first seen ${r.first_seen}** — **${r.Company}** — [${r.Title}](${r.URL}) — ${r.Location || "n/a"}\n`;
process.stdout.write(out);
if (shouldWrite) {
  for (const file of [markdownPath, jsonPath]) fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(markdownPath, out);
  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    scope,
    since,
    until,
    count: released.length,
    roles: released,
    undatedFirstSeen,
  }, null, 2));
  process.stderr.write(`wrote ${markdownPath} and ${jsonPath}\n`);
}
