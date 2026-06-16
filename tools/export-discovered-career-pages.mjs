import fs from "node:fs";

const input = "C:/Users/illus/Documents/Codex/2026-06-03/can-you-look-under-downloads-drive/work/discovered-career-pages.json";
const outputJson = "C:/Users/illus/Documents/Codex/2026-06-03/can-you-look-under-downloads-drive/outputs/discovered-career-pages.json";
const outputCsv = "C:/Users/illus/Documents/Codex/2026-06-03/can-you-look-under-downloads-drive/outputs/discovered-career-pages.csv";

const data = JSON.parse(fs.readFileSync(input, "utf8"));
const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const rows = [["Company", "Score", "Title", "URL", "ExistingDomains"].map(escapeCsv).join(",")];

for (const result of data.results.filter((entry) => entry.candidates.length)) {
  const candidate = result.candidates[0];
  rows.push([
    result.company,
    candidate.score,
    candidate.title,
    candidate.url,
    (result.existingOfficialDomains || []).join("; "),
  ].map(escapeCsv).join(","));
}

fs.copyFileSync(input, outputJson);
fs.writeFileSync(outputCsv, rows.join("\n"), "utf8");

console.log(JSON.stringify({
  target: data.targetCompanies,
  discovered: data.discoveredCount,
  noCandidate: data.noCandidateCount,
  outputJson,
  outputCsv,
}, null, 2));
