import fs from "node:fs/promises";
import { collectWorkdayPostings } from "../tools/workday-search.mjs";

const current = JSON.parse(await fs.readFile("data/quant_internship_roles_scan_v2_raw.json", "utf8"));
const rows = new Map();
const boards = [];
for (const site of ["NBCareers", "PWM"]) {
  const endpoint = `https://nb.wd1.myworkdayjobs.com/wday/cxs/nb/${site}`;
  const collected = await collectWorkdayPostings(async (page) => {
    const response = await fetch(`${endpoint}/jobs`, {
      method: "POST", signal: AbortSignal.timeout(20000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...page, appliedFacets: {} }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
  boards.push({ site, jobsSeen: collected.postings.length, searchComplete: collected.searchComplete, errors: collected.errors });
  for (const job of collected.postings.filter(j => /intern|summer analyst|summer associate|co-op/i.test(j.title))) {
    const URL = `https://nb.wd1.myworkdayjobs.com/${site}${job.externalPath}`;
    let description = "", detailError = null;
    try {
      const response = await fetch(`${endpoint}${job.externalPath}`, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      description = (await response.json()).jobPostingInfo?.jobDescription || "";
    } catch (error) { detailError = error.message; }
    const inQuantScan = current.rows.some(row => row.URL === URL);
    const talentPool = /not for any specific role|future internship openings|internship talent pool/i.test(description);
    rows.set(URL, { ...job, URL, inQuantScan, talentPool, detailError });
  }
}
const result = { checkedAt: new Date().toISOString(), boards, roles: [...rows.values()] };
await fs.writeFile("data/neuberger_internship_audit.json", JSON.stringify(result, null, 2) + "\n");
let report = `# Neuberger Berman internship coverage\n\nChecked: ${result.checkedAt}\n\n`;
for (const board of boards) report += `- ${board.site}: ${board.jobsSeen} postings inspected; search complete: ${board.searchComplete}\n`;
report += "\n## Internship listings\n\n";
for (const role of result.roles) report += `- [${role.title}](${role.URL}) - ${role.locationsText}; ${role.talentPool ? "Talent pool for future openings" : role.inQuantScan ? "Included in quant scan" : "Outside current quant title filter; review separately"}${role.detailError ? "; detail verification failed" : ""}\n`;
await fs.writeFile("reports/neuberger_internship_audit.md", report);
console.log(report);
if (boards.some(board => !board.searchComplete) || result.roles.some(role => role.detailError)) process.exitCode = 1;
