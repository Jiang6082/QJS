import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isKnownWrongCareerPage } from "../tools/career-source-guards.mjs";

test("TCI discovery rejects unrelated employers' Greenhouse boards", () => {
  for (const host of ["boards.greenhouse.io", "job-boards.greenhouse.io"]) {
    for (const board of ["twosixtechnologies", "tekion", "eikontherapeutics"]) {
      assert.equal(isKnownWrongCareerPage("TCI Fund Management", `https://${host}/${board}/jobs/123`), true);
    }
  }
  assert.equal(isKnownWrongCareerPage("TCI Fund Management", "https://www.tcifund.com/"), false);
  assert.equal(isKnownWrongCareerPage("Two Six Technologies", "https://boards.greenhouse.io/twosixtechnologies"), false);
});

test("Jain Global is in the active roster with its direct Workday source", () => {
  const roster = JSON.parse(fs.readFileSync(new URL("../inputs/quant_firm_roster.json", import.meta.url)));
  const sources = JSON.parse(fs.readFileSync(new URL("../inputs/company_career_pages.json", import.meta.url)));
  assert.ok(roster.companies.includes("Jain Global"));
  assert.ok(sources.companies["Jain Global"].careerPages.includes("https://jainglobal.wd5.myworkdayjobs.com/ExternalSite"));
});
