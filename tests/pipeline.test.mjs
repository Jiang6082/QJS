import test from "node:test";
import assert from "node:assert/strict";
import { calendarDate, shiftCalendarDate } from "../scripts/calendar-date.mjs";
import { stableUrl, roleIdentity, absenceConfirmed, workdayJobUrl, workdayDetailUrl } from "../tools/role-identity.mjs";
import { sourceDateFromNotes, inDateWindow } from "../tools/role-dates.mjs";
import { confirmationSnapshot, confirmedAdditions, updateLifecycle, scanHash } from "../tools/scan-confirmation.mjs";
import { publishPaths } from "../tools/publish-policy.mjs";
import { verifyOfficialPosting } from "../tools/posting-verification.mjs";
import { validateArtifacts } from "../tools/workflow-validation.mjs";
import { hasNonTargetInternshipTiming } from "../tools/role-scope.mjs";
import { regionForLocation } from "../tools/regions.mjs";

const role = (id) => ({ Company: "Example", Title: "Quant Research Intern", Location: "New York", URL: `https://jobs.example.com/${id}`, Source: "Ashby:example" });
const scan = (rows, searchedAt, healthy = true) => ({ rows, searchedAt, observedUrls: rows.map((row) => row.URL), sourceHealth: [{ source: "Ashby:example", complete: healthy }] });
const a = role("A"), b = role("B");
test("graduation dates do not exclude a target-year internship", () => {
  assert.equal(hasNonTargetInternshipTiming("2027 Quant Research Intern", "Students graduating between December 2026 and June 2028"), false);
  assert.equal(hasNonTargetInternshipTiming("Quant Research Intern", "Eligible to graduate in December 2026"), false);
  assert.equal(hasNonTargetInternshipTiming("2026秋季量化实习", ""), true);
  assert.equal(hasNonTargetInternshipTiming("Quant Research Intern", "internship timing: summer 2026"), true);
});
test("region aliases preserve mixed-region locations", () => {
  assert.equal(regionForLocation("Glasgow"), "Europe");
  assert.equal(regionForLocation("Glasgow / New York"), "Global / Multiple Regions");
  assert.equal(regionForLocation("South America"), "South America");
  assert.equal(regionForLocation("Bala Cynwyd"), "North America");
});
const baseline = scan([a], "2026-09-12T12:00:00Z");
const first = scan([], "2026-09-13T12:00:00Z");
const second = scan([], "2026-09-13T12:10:00Z");
const lifecycle = (overrides = {}) => updateLifecycle({ previous: baseline, current: second, first: confirmationSnapshot(first, [a]), stableRoles: [a], ...overrides });

test("date-only employer dates do not shift backward in New York", () => {
  assert.equal(calendarDate("2026-09-13"), "2026-09-13");
  assert.equal(calendarDate("2026-09-13T01:00:00Z"), "2026-09-12");
  assert.equal(calendarDate(null), null);
  assert.equal(calendarDate("2026-02-30"), null);
  assert.equal(shiftCalendarDate("2026-03-01", -1), "2026-02-28");
});
test("URL identity preserves case-sensitive IDs and meaningful query IDs", () => {
  assert.notEqual(stableUrl(a.URL), stableUrl(a.URL.toLowerCase()));
  assert.notEqual(stableUrl("https://example.com/job?gh_jid=1"), stableUrl("https://example.com/job?gh_jid=2"));
  assert.equal(stableUrl("https://EXAMPLE.com/job?gh_jid=1&gh_jid=1&utm_source=x#apply"), "https://example.com/job?gh_jid=1");
  assert.equal(stableUrl("https://www.deshaw.com/careers/Quant-Intern-5731"), stableUrl("https://www.deshaw.com/careers/quant-intern-5731"));
});
test("Workday aliases resolve to one requisition without mixing employers", () => {
  const row = { ...a, URL: "https://abc.wd1.myworkdayjobs.com/jobs/job/NY/Title_R1234" };
  assert.equal(roleIdentity(row), roleIdentity({ ...row, URL: row.URL + "-2" }));
  assert.notEqual(roleIdentity(row), roleIdentity({ ...row, URL: row.URL.replace("abc.", "xyz.") }));
  const redirected = { ...row, URL: "https://wd1.myworkdaysite.com/recruiting/abc/jobs/job/NY/Title_R1234" };
  assert.equal(roleIdentity(row), roleIdentity(redirected));
  assert.equal(workdayJobUrl({ origin: "https://wd1.myworkdaysite.com", tenant: "abc", site: "jobs" }, "/job/NY/Title_R1234"), redirected.URL);
  assert.equal(workdayDetailUrl(redirected.URL), "https://wd1.myworkdaysite.com/wday/cxs/abc/jobs/job/NY/Title_R1234");
  assert.equal(workdayDetailUrl("https://abc.wd1.myworkdayjobs.com/en-US/jobs/job/NY/Title_R1234"), "https://abc.wd1.myworkdayjobs.com/wday/cxs/abc/jobs/job/NY/Title_R1234");
});
test("relative date bounds, edit dates, and aggregator dates are not release dates", () => {
  assert.equal(sourceDateFromNotes("Posted 30+ Days Ago", second.searchedAt), null);
  assert.equal(sourceDateFromNotes("updatedAt=2026-09-13 | openquant_datePosted=2026-09-13", second.searchedAt), null);
  assert.deepEqual(sourceDateFromNotes("Posted Yesterday", second.searchedAt), { date: "2026-09-12", evidence: "employer_relative_label" });
  assert.equal(sourceDateFromNotes("posted=2026-09-12T00:00:00Z", second.searchedAt).date, "2026-09-12");
  assert.equal(inDateWindow("2026-09-14", "2026-08-24", "2026-09-13"), false);
});
test("new roles need presence in both independent passes", () => {
  assert.equal(confirmedAdditions(baseline, scan([a, b], second.searchedAt), confirmationSnapshot(scan([a], first.searchedAt), [])).length, 0);
  assert.equal(confirmedAdditions(baseline, scan([a, b], second.searchedAt), confirmationSnapshot(scan([a, b], first.searchedAt), [])).length, 1);
});
test("two successful absence observations close a role with its actual last-seen timestamp", () => {
  const result = lifecycle();
  assert.equal(result.removed.length, 1);
  assert.equal(result.removed[0].lastSeenOpenAt, baseline.searchedAt);
});
test("source failures and partial coverage do not confirm closure", () => {
  const result = lifecycle({ current: scan([], second.searchedAt, false) });
  assert.equal(result.removed.length, 0);
  assert.equal(result.pending.length, 1);
  assert.equal(lifecycle({ first: confirmationSnapshot(scan([], first.searchedAt, false), [a]) }).removed.length, 0);
});
test("a live but filtered-out role cannot be marked closed", () => {
  assert.equal(absenceConfirmed({ ...second, observedUrls: [a.URL] }, a), false);
});
test("detail errors override board absence and 404 can confirm a missing posting", () => {
  assert.equal(absenceConfirmed({ ...second, postingAudits: [{ URL: a.URL, status: "unknown" }] }, a), false);
  assert.equal(absenceConfirmed({ ...second, sourceHealth: [], postingAudits: [{ URL: a.URL, status: "absent" }] }, a), true);
});
test("legacy missing roles do not get an invented last-seen timestamp", () => {
  assert.equal(lifecycle({ previous: scan([], baseline.searchedAt) }).removed[0].lastSeenOpenAt, null);
});
test("closure report rebuilds are idempotent", () => {
  const result = lifecycle();
  const rerun = lifecycle({ stableRoles: result.stableRoles, history: result.history });
  assert.equal(rerun.removed.length, 1);
  assert.equal(rerun.history.length, 1);
});
test("a reopen followed by another closure records a second event", () => {
  const closed = lifecycle();
  const openScan = scan([a], "2026-09-14T12:00:00Z");
  const reopened = lifecycle({ current: openScan, first: confirmationSnapshot(openScan, [a]), history: closed.history, stableRoles: [] });
  assert.equal(reopened.history[0].reopenedAt, openScan.searchedAt);
  const closedAgain = lifecycle({ previous: openScan, stableRoles: reopened.stableRoles, history: reopened.history });
  assert.equal(closedAgain.history.length, 2);
});
test("publishing scopes changes and refuses unrelated staged files", () => {
  assert.deepEqual(publishPaths(["README.md", "data/scan_confirmation.json", "notes.txt", "scripts/a.mjs"], []), ["README.md", "data/scan_confirmation.json"]);
  assert.throws(() => publishPaths(["README.md"], ["notes.txt"]), /Unrelated/);
});
test("manual seeds require live posting evidence; expired and mismatched pages are rejected", async () => {
  const response = (body, status = 200) => async () => new Response(body, { status });
  const html = (posting) => `<script type="application/ld+json">${JSON.stringify(posting)}</script>`;
  assert.equal((await verifyOfficialPosting(a, response("not found", 404))).status, "absent");
  assert.equal((await verifyOfficialPosting(a, response("Careers homepage"))).status, "unknown");
  assert.equal((await verifyOfficialPosting(a, response(html({ "@type": "JobPosting", title: "Sales Manager" })))) .status, "unknown");
  assert.equal((await verifyOfficialPosting(a, response(html({ "@type": "JobPosting", title: a.Title, validThrough: "2020-01-01" })))).status, "absent");
  assert.equal((await verifyOfficialPosting(a, response(html({ "@graph": [{ "@type": ["JobPosting"], title: a.Title }] })))).status, "active");
});

function fixture() {
  const current = scan([a], second.searchedAt);
  current.sourceHealth.push(...["Official Balyasny Salesforce Experience Cloud feed", "Official Goldman Sachs Higher API", "Ashby:scientech-research"].map((source) => ({ source, complete: true })));
  const manifest = { firstPass: confirmationSnapshot(scan([a], first.searchedAt), []), confirmationPass: confirmationSnapshot(current, []) };
  return {
    current, previous: baseline, manifest,
    report: { previousScanAt: baseline.searchedAt, currentScanAt: current.searchedAt, previousRows: 1, currentRows: 1, added: [], removed: [] },
    recent: { currentScanAt: current.searchedAt, until: "2026-09-13", since: "2026-08-24", count: 0, roles: [], undatedFirstSeen: [] },
    cumulative: { currentScanAt: current.searchedAt, total: 1, active: 1, notDetected: 0, roles: [{ ...a, status: "active" }] },
    priorCumulative: { roles: [a] }, manual: { roles: [] }, closed: [],
    readme: "**Last scan:** 2026-09-13 **1 open roles**",
  };
}
test("validator accepts consistent evidence and catches stale README/report rows", () => {
  const valid = fixture();
  assert.deepEqual(validateArtifacts(valid).failures, []);
  valid.recent.roles = [{ ...b, date: "2026-09-13" }];
  valid.recent.count = 1;
  valid.readme = "stale";
  assert.ok(validateArtifacts(valid).failures.some((s) => /absent/.test(s)));
  assert.ok(validateArtifacts(valid).failures.some((s) => /README/.test(s)));
});
test("validator detects tampered confirmation evidence and critical feed failures", () => {
  const valid = fixture();
  valid.current.sourceHealth = [];
  assert.ok(validateArtifacts(valid).failures.some((s) => /evidence/.test(s)));
  valid.manifest.confirmationPass.hash = scanHash(valid.current);
  assert.ok(validateArtifacts(valid).failures.some((s) => /Critical source/.test(s)));
});
