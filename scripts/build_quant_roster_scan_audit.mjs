import fs from "node:fs/promises";

const roster = JSON.parse(await fs.readFile("inputs/quant_firm_roster.json", "utf8"));
const db = JSON.parse(await fs.readFile("inputs/company_career_pages.json", "utf8"));
const scan = JSON.parse(await fs.readFile("data/quant_internship_roles_scan_v2_raw.json", "utf8"));

const outputJson = "data/quant_roster_scan_audit.json";
const outputMarkdown = "reports/quant_roster_scan_audit.md";
const canonical = (company) => roster.aliases?.[company] || company;
const canonicalCompanies = [...new Set(roster.companies.map(canonical))];
const noRows = new Set(scan.companiesWithoutRows || []);
const noOpenPostings = new Set(scan.confirmedNoOpenPostings || []);
const noMatchingRoles = new Set(scan.confirmedNoMatchingRoles || []);

function statusFor(company) {
  if (!noRows.has(company)) return "matching-role-found";
  if (noOpenPostings.has(company)) return "confirmed-no-open-postings";
  if (noMatchingRoles.has(company)) return "confirmed-openings-no-matching-role";
  return "could-not-fully-verify";
}

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|");
}

const pageAudits = scan.careerPageScanAudits || [];
const rows = canonicalCompanies.map((company) => {
  const careerPages = db.companies?.[company]?.careerPages || [];
  const auditedPages = pageAudits.filter((page) => page.company === company);
  return {
    company,
    sourceRosterNames: roster.companies.filter((name) => canonical(name) === company),
    status: statusFor(company),
    careerPages,
    livePages: auditedPages.filter((page) => page.pageOk).length,
    attemptedPages: auditedPages.length,
    jobsSeen: Math.max(0, ...auditedPages.map((page) => page.jobsSeen || 0)),
    relevantInternships: Math.max(0, ...auditedPages.map((page) => page.relevantInternships || 0)),
  };
});

const statusOrder = [
  "matching-role-found",
  "confirmed-no-open-postings",
  "confirmed-openings-no-matching-role",
  "could-not-fully-verify",
];
const counts = Object.fromEntries(statusOrder.map((status) => [status, rows.filter((row) => row.status === status).length]));
const audit = {
  generatedAt: new Date().toISOString(),
  scanStartedAt: scan.searchedAt,
  sourceRosterEntries: roster.companies.length,
  canonicalCompanies: canonicalCompanies.length,
  counts,
  companies: rows,
};
await fs.writeFile(outputJson, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

const labels = {
  "matching-role-found": "Matching Roles Found",
  "confirmed-no-open-postings": "Confirmed No Open Postings",
  "confirmed-openings-no-matching-role": "Confirmed Openings, No Matching Role",
  "could-not-fully-verify": "Could Not Fully Verify",
};
const lines = [
  "# Quant Roster Scan Audit",
  "",
  `Scan started: ${scan.searchedAt}`,
  `Source roster entries: ${roster.companies.length}`,
  `Canonical companies after aliases: ${canonicalCompanies.length}`,
  "",
];
for (const status of statusOrder) {
  lines.push(`## ${labels[status]} (${counts[status]})`, "", "| Company | Source health | Saved pages |", "| --- | --- | --- |");
  for (const row of rows.filter((candidate) => candidate.status === status)) {
    const health = row.attemptedPages ? `${row.livePages}/${row.attemptedPages} pages live` : "no saved page attempted";
    const pages = row.careerPages.length ? row.careerPages.map((url) => `[link](${url})`).join(" ") : "none";
    lines.push(`| ${escapeMarkdown(row.company)} | ${health} | ${pages} |`);
  }
  lines.push("");
}
await fs.writeFile(outputMarkdown, `${lines.join("\n")}\n`, "utf8");

console.log(`roster audit: ${statusOrder.map((status) => `${status}=${counts[status]}`).join(" ")}`);
