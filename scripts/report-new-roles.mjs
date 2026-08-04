// Stateless "what opened recently" reporter.
//
// Reads the current scan outputs and re-derives each role's true release date
// from the source ATS (Greenhouse first_published, Eightfold t_create, Workable
// published, Ashby publishedAt), then prints roles released within a window.
// No saved state needed, so it is safe to run in a fresh cloud session daily:
//   node report-new-roles.mjs --days=3
//   node report-new-roles.mjs --since=2026-07-27
import fs from "node:fs";

const arg = (k, d) => { const m = process.argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.split("=")[1] : d; };
const days = Number(arg("days", "1"));
const since = arg("since", new Date(Date.now() - days * 864e5).toISOString().slice(0, 10));
const until = arg("until", new Date().toISOString().slice(0, 10));
const inWindow = (iso) => { if (!iso) return false; const d = iso.slice(0, 10); return d >= since && d <= until; };

const files = [
  "data/quant_internship_scan_raw.json",
  "data/quant_internship_roles_scan_v2_raw.json",
  "data/us_financial_services_internship_scan_raw.json",
  "data/swe_2027_internship_scan_raw.json",
];
const rows = [];
for (const f of files) {
  try {
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    (j.rows || j.matches || []).forEach((r) => rows.push({
      Company: r.Company || r.company, Title: r.Title || r.title,
      Location: r.Location || r.location, URL: (r.URL || r.url || "").trim(), Source: r.Source || r.source || "",
    }));
  } catch { /* output missing — skip */ }
}
const byUrl = new Map();
for (const r of rows) if (r.URL && !byUrl.has(r.URL)) byUrl.set(r.URL, r);
const uniq = [...byUrl.values()];

async function jget(url, opts) { try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000); const r = await fetch(url, { signal: c.signal, headers: { "user-agent": "Mozilla/5.0" }, ...opts }); clearTimeout(t); return r.ok ? await r.json() : null; } catch { return null; } }
const idOf = (u) => { const m = (u || "").match(/(\d{5,})/g); return m ? m[m.length - 1] : null; };

const gh = new Set(["janestreet"]), ef = new Set(), wk = new Set(), ash = new Set();
for (const r of uniq) {
  let m;
  if ((m = r.Source.match(/Greenhouse:([^ ]+)/))) gh.add(m[1]);
  else if ((m = r.Source.match(/Eightfold:([^ ]+)/))) ef.add(m[1]);
  else if ((m = r.Source.match(/Workable:([^ ]+)/))) wk.add(m[1]);
  else if ((m = r.Source.match(/Ashby:([^ ]+)/))) ash.add(m[1]);
}
const dateByUrl = new Map(), dateById = new Map();
for (const tok of gh) { const j = await jget(`https://boards-api.greenhouse.io/v1/boards/${tok}/jobs?content=true`); for (const job of (j?.jobs || [])) { const d = job.first_published; if (job.absolute_url) dateByUrl.set(job.absolute_url, d); if (job.id) dateById.set(String(job.id), d); } }
for (const host of ef) { const j = await jget(`https://${host}/api/apply/v2/jobs?domain=${host.includes("mlp") ? "mlp.com" : host.split(".").slice(-2).join(".")}&start=0&num=100&sort_by=relevance`); for (const p of (j?.positions || [])) { const d = p.t_create ? new Date(p.t_create * 1000).toISOString() : null; if (p.canonicalPositionUrl) dateByUrl.set(p.canonicalPositionUrl, d); if (p.id) dateById.set(String(p.id), d); } }
for (const acc of wk) { const j = await jget(`https://apply.workable.com/api/v3/accounts/${acc}/jobs`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); for (const job of (j?.results || [])) { if (job.published) dateByUrl.set(`https://apply.workable.com/${acc}/j/${job.shortcode}/`, job.published); } }
for (const tok of ash) { const j = await jget(`https://api.ashbyhq.com/posting-api/job-board/${tok}`); for (const job of (j?.jobs || [])) { const d = job.publishedAt || job.updatedAt; if (job.jobUrl) dateByUrl.set(job.jobUrl, d); } }

const released = [];
for (const r of uniq) {
  let d = dateByUrl.get(r.URL);
  if (!d) { const id = idOf(r.URL); if (id) d = dateById.get(id); }
  if (d && inWindow(d)) released.push({ ...r, date: d.slice(0, 10) });
}
released.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.Company.localeCompare(b.Company)));
const byco = {};
for (const r of released) (byco[r.Company] ||= []).push(r);
let out = `# Roles released ${since} → ${until} (${released.length} with confirmed release dates)\n`;
for (const [co, list] of Object.entries(byco).sort((a, b) => b[1].length - a[1].length)) {
  out += `\n## ${co} (${list.length})\n`;
  for (const r of list) out += `- **${r.date}** — [${r.Title}](${r.URL}) — ${r.Location || "n/a"}\n`;
}
process.stdout.write(out);
