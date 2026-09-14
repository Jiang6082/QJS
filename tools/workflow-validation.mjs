import { stableUrl, roleIdentity, isAggregatorLead } from "./role-identity.mjs";
import { scanHash, confirmedAdditions } from "./scan-confirmation.mjs";
import { calendarDate } from "../scripts/calendar-date.mjs";
import { inDateWindow } from "./role-dates.mjs";

export function validateArtifacts({ current, previous, manifest, report, recent, cumulative, priorCumulative, manual, closed, readme }) {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const unique = (values) => new Set(values).size === values.length;
  const ids = current.rows.map(roleIdentity);
  const currentIds = new Set(ids);
  const currentUrls = new Set(current.rows.map((row) => stableUrl(row.URL)));
  const firstIds = new Set(manifest.firstPass.identities);
  const day = calendarDate(current.searchedAt);
  const expected = confirmedAdditions(previous, current, manifest.firstPass, manual.roles).map(roleIdentity).sort();
  check(unique(ids), "Duplicate current role identities");
  check(unique(current.rows.map((row) => stableUrl(row.URL))), "Duplicate current URLs");
  check(current.rows.every((row) => !isAggregatorLead(row)), "Aggregator rows in applicant scan");
  check(scanHash(current) === manifest.confirmationPass.hash, "Current scan differs from confirmation evidence");
  check(new Date(manifest.firstPass.searchedAt) < new Date(current.searchedAt), "The source passes are not independent sequential scans");
  check(JSON.stringify(report.added.map(roleIdentity).sort()) === JSON.stringify(expected), "Reported additions lack confirmation or differ from the baseline");
  check(report.previousScanAt === previous.searchedAt && report.currentScanAt === current.searchedAt, "Addition report uses different scan timestamps");
  check(report.currentRows === current.rows.length && report.previousRows === previous.rows.length, "Addition report counts are inconsistent");
  check(recent.currentScanAt === current.searchedAt && recent.until === day, "Rolling report is stale or uses a different scan date");
  check(recent.count === recent.roles.length, "Rolling report count is inconsistent");
  const rolling = [...recent.roles, ...recent.undatedFirstSeen];
  check(unique(rolling.map(roleIdentity)), "Duplicate roles across rolling report sections");
  check(rolling.every((row) => currentIds.has(roleIdentity(row))), "Rolling report includes roles absent from the confirmed scan");
  check(recent.roles.every((row) => inDateWindow(row.date, recent.since, recent.until)), "Rolling source date outside its window");
  check(recent.undatedFirstSeen.every((row) => inDateWindow(row.first_seen, recent.since, recent.until)), "First-seen date outside its window");
  const cumulativeIds = new Set(cumulative.roles.map(roleIdentity));
  check(unique(cumulative.roles.map(roleIdentity)), "Duplicate cumulative role identities");
  check(priorCumulative.roles.every((row) => cumulativeIds.has(roleIdentity(row))), "Prior cumulative roles were lost");
  check(cumulative.currentScanAt === current.searchedAt, "Cumulative report is stale");
  check(cumulative.total === cumulative.roles.length && cumulative.active + cumulative.notDetected === cumulative.total, "Cumulative counts are inconsistent");
  check(cumulative.active === cumulative.roles.filter((row) => row.status === "active").length, "Cumulative active count is inconsistent");
  const verifiedManual = manual.roles.filter((row) => row.verifiedAt === day && row.verificationStatus !== "not_detected");
  check(verifiedManual.every((row) => currentUrls.has(stableUrl(row.URL))), "A manually verified role is absent from the scan");
  check(manual.roles.every((row) => row.checkedAt === day), "Manual verification is stale");
  const absentFirst = new Set(manifest.firstPass.absentUrls);
  const absentSecond = new Set(manifest.confirmationPass.absentUrls);
  check(report.removed.every((row) => absentFirst.has(stableUrl(row.URL)) && absentSecond.has(stableUrl(row.URL)) && !currentIds.has(roleIdentity(row))), "Closure lacks two successful absence checks");
  check(report.removed.every((row) => closed.some((entry) => roleIdentity(entry) === roleIdentity(row) && entry.detectedClosedAt === current.searchedAt && !entry.reopenedAt)), "Closure is missing from history");
  const openClosures = closed.filter((row) => !row.reopenedAt && currentIds.has(roleIdentity(row)) && firstIds.has(roleIdentity(row)));
  check(!openClosures.length, "Reopened roles remain marked closed");
  const difference = ids.filter((id) => !firstIds.has(id)).length + [...firstIds].filter((id) => !currentIds.has(id)).length;
  check(difference <= Math.max(10, Math.ceil(previous.rows.length * 0.1)), "Source passes disagree materially; investigate before publishing");
  for (const source of ["Official Balyasny Salesforce Experience Cloud feed", "Official Goldman Sachs Higher API", "Ashby:scientech-research"]) {
    check((current.sourceHealth || []).some((entry) => entry.complete === true && entry.source.toLowerCase().endsWith(source.toLowerCase())), `Critical source is incomplete: ${source}`);
  }
  check(readme.includes(`**Last scan:** ${day}`) && readme.includes(`**${current.rows.length} open roles**`), "README does not match the current scan");
  return { failures, difference, verifiedManual: verifiedManual.length };
}
