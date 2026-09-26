import { createHash } from "node:crypto";
import { absenceConfirmed, roleIdentity, stableUrl } from "./role-identity.mjs";

export const scanHash = (scan) => createHash("sha256").update(JSON.stringify(scan)).digest("hex");
export function confirmationSnapshot(scan, candidates) {
  return {
    searchedAt: scan.searchedAt,
    hash: scanHash(scan),
    identities: (scan.rows || []).map(roleIdentity),
    absentUrls: candidates.filter((row) => absenceConfirmed(scan, row)).map((row) => stableUrl(row.URL)),
  };
}

export function confirmedAdditions(previous, current, first, manualRoles = []) {
  const before = new Set((previous.rows || []).map(roleIdentity));
  const confirmed = new Set(first.identities || []);
  const manual = new Set(manualRoles.map(roleIdentity));
  return (current.rows || []).filter((row) => !before.has(roleIdentity(row)) && confirmed.has(roleIdentity(row)) && !manual.has(roleIdentity(row)));
}

export function updateLifecycle({ previous, current, first, stableRoles, history = [], manualRoles = [] }) {
  const present = new Map((current.rows || []).map((row) => [roleIdentity(row), row]));
  const firstIds = new Set(first.identities);
  const firstAbsent = new Set(first.absentUrls);
  const previousById = new Map((previous.rows || []).map((row) => [roleIdentity(row), row]));
  const stable = new Map(stableRoles.map((row) => [roleIdentity(row), { ...row }]));
  const archive = history.map((row) => ({ ...row }));
  const removed = [];
  const pending = [];
  for (const [key, row] of stable) {
    if (present.has(key)) continue;
    if (firstAbsent.has(stableUrl(row.URL)) && absenceConfirmed(current, row)) {
      const existing = archive.find((entry) => roleIdentity(entry) === key && !entry.reopenedAt);
      const entry = existing || {
        ...row,
        // Legacy state did not track this. Leave unknown if the baseline was
        // already missing the posting, instead of inventing a last-seen time.
        lastSeenOpenAt: row.lastSeenOpenAt || (previousById.has(key) ? previous.searchedAt : null),
        lastSeenEvidence: row.lastSeenOpenAt || previousById.has(key) ? "recorded_scan" : "unavailable",
        detectedClosedAt: current.searchedAt,
      };
      if (!existing) archive.push(entry);
      removed.push(entry);
      stable.delete(key);
    } else {
      pending.push(row);
    }
  }
  for (const [key, row] of present) {
    if (!stable.has(key) && !firstIds.has(key)) continue;
    stable.set(key, { ...stable.get(key), ...row, Location: String(row.Location || "").trim(), lastSeenOpenAt: current.searchedAt });
    if (firstIds.has(key)) {
      for (const entry of archive) if (roleIdentity(entry) === key && !entry.reopenedAt) entry.reopenedAt = current.searchedAt;
    }
  }
  // Preserve the same closure event when rebuilding a report for this scan.
  for (const entry of archive) {
    if (entry.detectedClosedAt === current.searchedAt && !entry.reopenedAt && !removed.some((row) => roleIdentity(row) === roleIdentity(entry))) removed.push(entry);
  }
  return {
    added: confirmedAdditions(previous, current, first, manualRoles),
    removed,
    pending,
    stableRoles: [...stable.values()],
    history: archive.sort((a, b) => String(b.detectedClosedAt).localeCompare(String(a.detectedClosedAt))),
  };
}
