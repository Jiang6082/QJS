import fs from "node:fs/promises";

const rosterPath = "quant_firm_roster.json";
const seedsPath = "roster_career_page_seeds.json";
const reviewedPath = "reviewed_career_pages.json";
const dbPath = "company_career_pages.json";
const auditJsonPath = "data/quant_roster_career_page_audit.json";
const auditMarkdownPath = "reports/quant_roster_career_page_audit.md";

// These search results are demonstrably for another organization, an aggregator,
// or a document that mentions the firm instead of an official recruiting page.
const rejectedSeedCompanies = new Set([
  "26 Miles Capital",
  "ACT Group",
  "All Options",
  "Armada Technologies",
  "Barak Capital",
  "Coding Test Firm",
  "Consolidated Trading",
  "Entropy Trading Group",
  "Final",
  "GMO",
  "Golden Meadow Investment",
  "Grasshopper",
  "High-Flyer",
  "Lucida",
  "Mako Trading",
  "Marquette Partners",
  "Mercuria",
  "Nino Options",
  "Optica",
  "OTS Capital",
  "Quantbox Research",
  "RSJ Securities",
  "Saccade Capital",
  "Sumo",
  "TGS",
]);

const rejectedUrl = /(?:\.pdf(?:$|\?)|internshala\.com|thetrustedinsight\.com|eujobs\.co|businesstoday\.in|gsa\.gov\/.*internship|3dprintingindustry\.com|zippia\.com|explorecareers\.com|careers\.honeywell\.com|thecampbellscompany\.com|campbellsoup\.|appsumo\.com|internet\.gmo|careers\.ox\.ac\.uk|ocs\.iith\.ac\.in|nus\.edu\.sg|cdn\.uconnectlabs\.com|cse\.snu\.ac\.kr|in\.bgu\.ac\.il|whiteoakwildlife\.org|job-boards\.greenhouse\.io\/testendouble)/i;

// Manually reviewed official sources recovered during the second audit pass.
const supplementalPages = {
  "Caladan": ["https://caladan.xyz/careers/"],
  "Cross Options": ["https://www.crossoptions.net/join-us"],
  "CTS Global Equity Group": [
    "https://www.ctsglobalgroup.com/",
    "https://www.ctsglobalgroup.com/internship",
  ],
  "D2X": ["https://d2x.com/careers"],
  "Eagle Seven": ["https://www.eagleseven.com/"],
  "Freepoint Commodities": ["https://www.freepoint.com/life-at-freepoint/"],
  "Great Point Capital": ["https://www.greatpointcapital.com/contact-apply"],
  "HBK Capital Management": ["https://www.hbk.com/careers"],
  "Kershner Trading Group": ["https://kershnertrading.applicantstack.com/x/openings"],
  "Mako Trading": [
    "https://www.mako.com/opportunities",
    "https://www.mako.com/early-careers",
  ],
  "Mercuria": ["https://mercuria.com/careers/"],
  "Mercuria Energy America": ["https://mercuria.com/careers/"],
  "Mercuria Energy Group": ["https://mercuria.com/careers/"],
  "Nine Mile": ["https://www.nmftrading.com/careers"],
  "QCP Capital": ["https://www.qcpgroup.com/career/"],
  "Seven Points Capital": ["https://sevenpointscapital.pinpointhq.com/"],
  "Simplex Trading": [
    "https://simplextrading.com/careers/",
    "https://job-boards.greenhouse.io/simplextrading",
  ],
  "Stronghold Capital Management": ["https://www.stronghold.capital/"],
  "Systematic Alpha Oy": ["https://systematicalpha.fi/careers"],
  "Woorton": ["https://www.woorton.com/about-us"],
};

function canonicalCompany(roster, company) {
  return roster.aliases?.[company] || company;
}

// Exact-match URLs confirmed dead/superseded during the reviewed audit; purged on import.
const stalePages = new Set();

function cleanPages(pages = []) {
  return [...new Set(pages.filter((url) => /^https?:\/\//i.test(url) && !rejectedUrl.test(url) && !stalePages.has(url)))];
}

function markdownEscape(value) {
  return String(value).replaceAll("|", "\\|");
}

const roster = JSON.parse(await fs.readFile(rosterPath, "utf8"));
const seeds = JSON.parse(await fs.readFile(seedsPath, "utf8"));
const db = JSON.parse(await fs.readFile(dbPath, "utf8"));
db.companies ||= {};

// Reviewed official career/ATS pages verified live during the coverage-gap + stale-URL audit.
let reviewed = { stalePages: [], companies: {} };
try {
  reviewed = JSON.parse(await fs.readFile(reviewedPath, "utf8"));
} catch {}
for (const url of reviewed.stalePages || []) stalePages.add(url);

const importedAt = new Date().toISOString();
let removedBadUrls = 0;
let importedUrls = 0;

for (const [company, record] of Object.entries(db.companies)) {
  const existing = record.careerPages || [];
  const cleaned = cleanPages(existing);
  removedBadUrls += existing.length - cleaned.length;
  record.careerPages = cleaned;
}

for (const [sourceCompany, candidatePages] of Object.entries(seeds.companies || {})) {
  if (rejectedSeedCompanies.has(sourceCompany)) continue;
  const company = canonicalCompany(roster, sourceCompany);
  const record = db.companies[company] || {};
  const existing = cleanPages(record.careerPages || []);
  const approved = cleanPages(candidatePages);
  const merged = [...new Set([...existing, ...approved])];
  importedUrls += merged.length - existing.length;
  db.companies[company] = {
    ...record,
    careerPages: merged,
    rosterDiscoveryStatus: merged.length ? "verified-page-saved" : "no-verified-public-page",
    rosterResearchedAt: seeds.generatedAt || importedAt,
    updatedAt: importedAt,
  };
}

for (const [company, candidatePages] of Object.entries(supplementalPages)) {
  const record = db.companies[company] || {};
  const existing = cleanPages(record.careerPages || []);
  const merged = [...new Set([...existing, ...cleanPages(candidatePages)])];
  importedUrls += merged.length - existing.length;
  db.companies[company] = {
    ...record,
    careerPages: merged,
    rosterDiscoveryStatus: "verified-page-saved",
    rosterResearchedAt: importedAt,
    updatedAt: importedAt,
  };
}

for (const [company, candidatePages] of Object.entries(reviewed.companies || {})) {
  const record = db.companies[company] || {};
  const existing = cleanPages(record.careerPages || []);
  const merged = [...new Set([...existing, ...cleanPages(candidatePages)])];
  importedUrls += merged.length - existing.length;
  db.companies[company] = {
    ...record,
    careerPages: merged,
    rosterDiscoveryStatus: merged.length ? "verified-page-saved" : "no-verified-public-page",
    rosterResearchedAt: reviewed.generatedAt || importedAt,
    updatedAt: importedAt,
  };
}

const sourceCompanies = roster.companies;
const canonicalCompanies = [...new Set(sourceCompanies.map((company) => canonicalCompany(roster, company)))];
const rows = canonicalCompanies.map((company) => {
  const record = db.companies[company] || {};
  const careerPages = cleanPages(record.careerPages || []);
  const status = careerPages.length ? "verified-page-saved" : "no-verified-public-page";
  db.companies[company] = {
    ...record,
    careerPages,
    rosterDiscoveryStatus: status,
    rosterResearchedAt: record.rosterResearchedAt || seeds.generatedAt || importedAt,
    updatedAt: record.updatedAt || importedAt,
  };
  return { company, status, careerPages };
});

db.generatedAt = importedAt;
await fs.writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");

const verified = rows.filter((row) => row.careerPages.length);
const unresolved = rows.filter((row) => !row.careerPages.length);
const audit = {
  generatedAt: importedAt,
  sourceRosterEntries: sourceCompanies.length,
  canonicalCompanies: canonicalCompanies.length,
  verifiedCompanies: verified.length,
  unresolvedCompanies: unresolved.length,
  importedUrls,
  removedBadUrls,
  companies: rows,
};
await fs.writeFile(auditJsonPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

const markdown = [
  "# Quant Firm Career-Page Audit",
  "",
  `Generated: ${importedAt}`,
  "",
  `- Source roster entries: ${sourceCompanies.length}`,
  `- Canonical companies after aliases: ${canonicalCompanies.length}`,
  `- Companies with a verified saved career/ATS page: ${verified.length}`,
  `- Companies without a verified public page: ${unresolved.length}`,
  "",
  "## Verified Career Pages",
  "",
  "| Company | Saved pages |",
  "| --- | --- |",
  ...verified.map((row) => `| ${markdownEscape(row.company)} | ${row.careerPages.map((url) => `[link](${url})`).join(" ")} |`),
  "",
  "## No Verified Public Page",
  "",
  ...unresolved.map((row) => `- ${row.company}`),
  "",
].join("\n");
await fs.writeFile(auditMarkdownPath, markdown, "utf8");

console.log(
  `sourceRoster=${sourceCompanies.length} canonical=${canonicalCompanies.length} verified=${verified.length} unresolved=${unresolved.length} importedUrls=${importedUrls} removedBadUrls=${removedBadUrls}`,
);
