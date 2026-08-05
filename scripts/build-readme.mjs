// Regenerates README.md from the latest scan outputs. Wired into the scan
// pipeline (run-quant-scan.mjs) so the README refreshes on every v2/all run,
// on any machine. Self-locating: resolves the repo root from its own path.
import fs from 'node:fs';
import path from 'node:path';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(repo, 'reports/quant_internship_roles_scan_v2.csv');
const newPath = path.join(repo, 'data/new_quant_roles_since_last_run.json');
const scanPath = path.join(repo, 'reports/LATEST_QUANT_SCAN.md');
const closedPath = path.join(repo, 'data/closed_roles_history.json');

let closedCount = 0;
try {
  const closed = JSON.parse(fs.readFileSync(closedPath, 'utf8'));
  if (Array.isArray(closed)) closedCount = closed.length;
} catch {}

// --- tiny CSV parser (handles quoted fields) ---
function parseCSV(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const csvRaw = fs.readFileSync(csvPath, 'utf8');
const rows = parseCSV(csvRaw).filter(r => r.length > 1);
const header = rows.shift();
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
const roles = rows.map(r => ({
  Company: r[idx.Company],
  Title: r[idx.Title],
  Location: (r[idx.Location] || '').trim(),
  Region: r[idx.Region],
  URL: r[idx.URL],
  Status: r[idx.Status],
}));

const newData = JSON.parse(fs.readFileSync(newPath, 'utf8'));
const added = newData.added || [];

// scan date — from the dashboard if present, else the report's own timestamp
let scanDate;
try {
  const scanMd = fs.readFileSync(scanPath, 'utf8');
  const m = scanMd.match(/Last updated:\s*(\S+)/);
  scanDate = (m ? m[1] : (newData.currentScanAt || new Date().toISOString())).slice(0, 10);
} catch {
  scanDate = (newData.currentScanAt || new Date().toISOString()).slice(0, 10);
}

const REGION_ORDER = [
  'North America',
  'Europe',
  'Asia',
  'Oceania',
  'Middle East',
  'South America',
  'Africa',
  'Global / Multiple Regions',
  'Remote / Unspecified',
];
function regionKey(r) {
  if (!r) return 'Remote / Unspecified';
  if (REGION_ORDER.includes(r)) return r;
  const low = r.toLowerCase();
  if (low.includes('multi') || low.includes('global')) return 'Global / Multiple Regions';
  if (low.includes('remote') || low.includes('unspec')) return 'Remote / Unspecified';
  return r;
}

function esc(s) { return (s || '').replace(/\|/g, '\\|'); }
function roleLine(role) {
  const loc = role.Location ? ` — ${esc(role.Location)}` : '';
  return `- **${esc(role.Company)}** — [${esc(role.Title)}](${role.URL})${loc}`;
}

let out = '';
out += `# QJS — Quant & Trading Internship Scanner\n\n`;
out += `Automated scan of quant, trading, research, strategy, and engineering internships across a `;
out += `**300+ firm universe**. `;
out += `GitHub is the shared source of truth — pull the repo, run the scan, and everyone sees the same latest roles.\n\n`;
out += `> **Last scan:** ${scanDate} &nbsp;•&nbsp; **${roles.length} open roles** &nbsp;•&nbsp; **${added.length} new today**${closedCount ? ` &nbsp;•&nbsp; **${closedCount} closed** ([history](reports/closed_roles_history.md))` : ''}\n\n`;
out += `**Jump to:** [🆕 New Roles Released Today](#-new-roles-released-today) · [📋 All Roles Available](#-all-roles-available) · [How to Run](#how-to-run)\n\n`;
out += `---\n\n`;

// --- Section 1: New today ---
out += `## 🆕 New Roles Released Today\n\n`;
out += `_Scan date: ${scanDate}_\n\n`;
if (added.length === 0) {
  out += `_No new roles detected in the latest scan._\n\n`;
} else {
  out += `**${added.length}** new stable job posting${added.length === 1 ? '' : 's'} since the previous scan:\n\n`;
  const byRegionNew = {};
  for (const r of added) {
    const k = regionKey(r.Region);
    (byRegionNew[k] ||= []).push(r);
  }
  const regionsNew = REGION_ORDER.filter(r => byRegionNew[r]);
  for (const region of regionsNew) {
    out += `**${region}**\n\n`;
    for (const role of byRegionNew[region].sort((a, b) => a.Company.localeCompare(b.Company) || a.Title.localeCompare(b.Title))) {
      out += roleLine(role) + '\n';
    }
    out += '\n';
  }
}
out += `---\n\n`;

// --- Section 2: All roles ---
out += `## 📋 All Roles Available\n\n`;
out += `**${roles.length}** open internship roles, grouped by region. Click a title to open the official posting.\n\n`;

const byRegion = {};
for (const r of roles) {
  const k = regionKey(r.Region);
  (byRegion[k] ||= []).push(r);
}
const regions = REGION_ORDER.filter(r => byRegion[r]);
out += `**Regions:** `;
out += regions.map(r => {
  // GitHub slug: lowercase, drop non-word/space/hyphen, then each space -> one hyphen (no collapse)
  const anchor = r.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/ /g, '-');
  return `[${r} (${byRegion[r].length})](#${anchor})`;
}).join(' · ');
out += `\n\n`;

for (const region of regions) {
  const list = byRegion[region].slice().sort(
    (a, b) => a.Company.localeCompare(b.Company) || a.Title.localeCompare(b.Title)
  );
  out += `### ${region}\n\n`;
  out += `<details>\n<summary><strong>${list.length} role${list.length === 1 ? '' : 's'}</strong> — click to expand</summary>\n\n`;
  for (const role of list) {
    out += roleLine(role) + '\n';
  }
  out += `\n</details>\n\n`;
}
out += `---\n\n`;

// --- Operational docs ---
out += `## How to Run\n\n`;
out += `Requires **Node.js 18+**. From the repo folder:\n\n`;
out += '```bash\n';
out += 'npm run scan:all          # run the full workflow\n';
out += 'npm run scan:v2           # known ATS boards + expanded quant career-page/web search\n';
out += 'npm run scan:v2:publish   # scan, rebuild reports, and push to GitHub\n';
out += 'npm run scan:all:publish  # run every scanner and publish\n';
out += '```\n\n';
out += `**Scan modes:** \`v1\` (known ATS boards) · \`v2\` (ATS + expanded quant search) · \`broad\` (ATS + broader US financial-services) · \`swe\` (2027 software/eng roles) · \`all\` (full workflow).\n\n`;
out += `### Normal workflow on any machine\n\n`;
out += '```bash\n';
out += 'git pull\n';
out += 'npm run scan:v2:publish\n';
out += '```\n\n';
out += `Every \`v2\`/\`all\` run rebuilds [reports/LATEST_QUANT_SCAN.md](reports/LATEST_QUANT_SCAN.md) and this README. The publish step then commits the changed scanner files and reports and pushes to \`origin\`. To publish already-generated local changes without scanning, run \`npm run publish\`.\n\n`;

out += `## Repo Layout\n\n`;
out += `- **Root** — only \`README.md\`, \`package.json\`, and \`.gitignore\`.\n`;
out += `- **[scripts/](scripts/)** — all scanner code (\`*.mjs\` and \`run-quant-scan.ps1\`).\n`;
out += `- **[inputs/](inputs/)** — hand-maintained source data (career-page database, firm roster, trackers).\n`;
out += `- **[reports/](reports/)** — human-readable generated reports incl. the [LATEST_QUANT_SCAN.md](reports/LATEST_QUANT_SCAN.md) dashboard.\n`;
out += `- **[data/](data/)** — machine-readable raw/audit JSON artifacts.\n`;
out += `- **[tools/](tools/)** — shared helper modules and optional discovery scripts.\n\n`;
out += `### Key Files\n\n`;
out += `| File | What it is |\n|------|-----------|\n`;
out += `| [reports/LATEST_QUANT_SCAN.md](reports/LATEST_QUANT_SCAN.md) | Latest scan summary + newest roles |\n`;
out += `| [reports/new_quant_roles_since_last_run.md](reports/new_quant_roles_since_last_run.md) | New stable job URLs, grouped by region |\n`;
out += `| [reports/quant_internship_roles_scan_v2.md](reports/quant_internship_roles_scan_v2.md) | Full current role list (detailed) |\n`;
out += `| [reports/quant_internship_roles_scan_v2.csv](reports/quant_internship_roles_scan_v2.csv) | Full current role list (spreadsheet) |\n`;
out += `| [reports/current_quant_roles_not_in_tracker.md](reports/current_quant_roles_not_in_tracker.md) | Current roles absent from the older application tracker |\n`;
out += `| [reports/quant_roster_scan_audit.md](reports/quant_roster_scan_audit.md) | 303-firm roster split into confirmed vs. unverifiable states |\n`;
out += `| [reports/closed_roles_history.md](reports/closed_roles_history.md) | Archive of roles that have closed/come down, grouped by date detected (${closedCount} so far) |\n`;
out += `| [inputs/company_career_pages.json](inputs/company_career_pages.json) | Seeded career-page database |\n`;
out += `| [inputs/quant_firm_roster.json](inputs/quant_firm_roster.json) | Complete 303-entry firm list + canonical aliases |\n\n`;
out += `Generated outputs are intentionally tracked so every clone shares the same baseline. The committed \`data/quant_internship_roles_scan_v2_raw.json\` is the cross-device baseline for the next comparison.\n`;

fs.writeFileSync(path.join(repo, 'README.md'), out);
console.log(`wrote README.md (roles=${roles.length}, new=${added.length}, closed=${closedCount})`);
