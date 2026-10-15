import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Jain Global is in the active roster with its direct Workday source", () => {
  const roster = JSON.parse(fs.readFileSync(new URL("../inputs/quant_firm_roster.json", import.meta.url)));
  const sources = JSON.parse(fs.readFileSync(new URL("../inputs/company_career_pages.json", import.meta.url)));
  assert.ok(roster.companies.includes("Jain Global"));
  assert.ok(sources.companies["Jain Global"].careerPages.includes("https://jainglobal.wd5.myworkdayjobs.com/ExternalSite"));
});
