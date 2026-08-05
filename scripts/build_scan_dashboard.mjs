import fs from "node:fs/promises";

const quantReportPath = "data/new_quant_roles_since_last_run.json";
const quantRawPath = "data/quant_internship_roles_scan_v2_raw.json";

function rowLink(row) {
  return `- **${row.Company}** - [${row.Title}](${row.URL}) - ${row.Location || "Location not listed"}`;
}

function groupedRows(rows = []) {
  const order = [
    "North America",
    "Europe",
    "Asia",
    "Oceania",
    "Middle East",
    "South America",
    "Africa",
    "Global / Multiple Regions",
    "Remote / Unspecified",
  ];
  const grouped = new Map(order.map((region) => [region, []]));
  for (const row of rows) {
    const region = row.Region || row.region || "Remote / Unspecified";
    if (!grouped.has(region)) grouped.set(region, []);
    grouped.get(region).push(row);
  }
  const lines = [];
  for (const region of order) {
    const regionRows = grouped.get(region) || [];
    lines.push(`### ${region} (${regionRows.length})`, "");
    lines.push(regionRows.length ? regionRows.map(rowLink).join("\n") : "_None._", "");
  }
  return lines;
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

const report = await readJson(quantReportPath, {
  generatedAt: new Date().toISOString(),
  previousScanAt: "unknown",
  currentScanAt: "unknown",
  previousRows: 0,
  currentRows: 0,
  added: [],
  removed: [],
});
const raw = await readJson(quantRawPath, { rows: [], companies: [], careerPageScanTasks: [] });
const audit = await readJson("data/quant_roster_scan_audit.json", { summary: {} });
const auditCounts = audit.summary || audit.counts || {};

const lines = [
  "# QJS Latest Quant Scan",
  "",
  `Last updated: ${report.currentScanAt || report.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Companies searched: ${(raw.companies || []).length || "unknown"}`,
  `- Career pages checked: ${(raw.careerPageScanTasks || []).length || "unknown"}`,
  `- Current retained roles: ${report.currentRows || (raw.rows || []).length}`,
  `- New stable job URLs since previous scan: ${(report.added || []).length}`,
  `- No longer present since previous scan: ${(report.removed || []).length}`,
  `- Matching-role firms: ${auditCounts["matching-role-found"] ?? "unknown"}`,
  `- Confirmed no open postings: ${auditCounts["confirmed-no-open-postings"] ?? "unknown"}`,
  `- Openings but no matching role: ${auditCounts["confirmed-openings-no-matching-role"] ?? "unknown"}`,
  `- Could not fully verify: ${auditCounts["could-not-fully-verify"] ?? "unknown"}`,
  "",
  "## New Roles Since Previous Scan",
  "",
  ...groupedRows(report.added || []),
  "## No Longer Present",
  "",
  (report.removed || []).length ? (report.removed || []).map(rowLink).join("\n") : "_None._",
  "",
  "## Full Reports",
  "",
  "- [Current full quant role list](quant_internship_roles_scan_v2.md)",
  "- [New quant roles since previous scan](new_quant_roles_since_last_run.md)",
  "- [Current roles absent from older tracker](current_quant_roles_not_in_tracker.md)",
  "- [Roster verification audit](quant_roster_scan_audit.md)",
  "- [Current full quant role CSV](quant_internship_roles_scan_v2.csv)",
  "",
];

await fs.writeFile("reports/LATEST_QUANT_SCAN.md", `${lines.join("\n")}\n`, "utf8");
console.log("wrote reports/LATEST_QUANT_SCAN.md");
