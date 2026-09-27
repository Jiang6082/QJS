import test from "node:test";
import assert from "node:assert/strict";
import { collectWorkdayPostings } from "../tools/workday-search.mjs";

test("keeps successful pages and continues searches after a timeout", async () => {
  const result = await collectWorkdayPostings(async ({ searchText, offset }) => {
    if (searchText === "intern") throw new Error("timeout");
    if (!searchText && offset === 20) throw new Error("HTTP 503");
    if (!searchText) return { total: 40, jobPostings: [{ externalPath: "/first" }] };
    if (searchText === "internship") return { total: 1, jobPostings: [{ externalPath: "/second" }] };
    return { total: 0, jobPostings: [] };
  });
  assert.deepEqual(result.postings.map(j => j.externalPath), ["/first", "/second"]);
  assert.equal(result.searchComplete, false);
  assert.equal(result.errors.length, 2);
});

test("enumerates smaller boards beyond the old 40-result cutoff and deduplicates", async () => {
  const result = await collectWorkdayPostings(async ({ searchText, offset }) => {
    if (searchText) return { total: 1, jobPostings: [{ externalPath: "/40" }] };
    return { total: 45, jobPostings: Array.from({ length: Math.min(20, 45-offset) }, (_,i) => ({ externalPath: `/${offset+i}` })) };
  });
  assert.equal(result.postings.length, 45);
  assert.equal(result.searchComplete, true);
});
