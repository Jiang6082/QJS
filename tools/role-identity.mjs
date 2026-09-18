// Shared identity rules for scanners, reports, validation, and the ledger.
export function stableUrl(value = "") {
  try {
    const url = new URL(String(value).trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|gclid|fbclid|mc_cid|mc_eid|ref|source|src|trk|_ga|gh_src)$/i.test(key)) url.searchParams.delete(key);
    }
    for (const key of [...new Set(url.searchParams.keys())]) {
      const values = [...new Set(url.searchParams.getAll(key))];
      url.searchParams.delete(key);
      for (const item of values) url.searchParams.append(key, item);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/$/, "");
    // D. E. Shaw publishes equivalent upper/lower-case slugs for the same
    // numeric posting. Restrict case folding to this verified provider route.
    if (/(?:^|\.)deshaw\.com$/i.test(url.hostname) && /^\/careers\/[^/]+-\d+$/.test(url.pathname)) url.pathname = url.pathname.toLowerCase();
    // Paths and job query values can be case-sensitive. URL normalizes the host.
    return url.toString();
  } catch { return String(value).trim(); }
}

export function workdayRequisitionIdentity(row = {}) {
  try {
    const url = new URL(row.URL);
    if (!/\.myworkday(?:jobs|site)\.com$/i.test(url.hostname)) return "";
    const match = url.pathname.split("/").at(-1).match(/_([A-Z]*-?\d+)(?:-\d+)?$/i);
    const parts = url.pathname.split("/").filter(Boolean);
    const tenant = /\.myworkdayjobs\.com$/i.test(url.hostname) ? url.hostname.split(".")[0]
      : parts[0] === "recruiting" ? parts[1] : String(row.Source || "").match(/Workday:([^/\s]+)/i)?.[1];
    return match && tenant ? `${tenant.toLowerCase()}|${match[1].toUpperCase()}|${String(row.Title || "").trim().toLowerCase()}` : "";
  } catch { return ""; }
}

export const roleIdentity = (row) => workdayRequisitionIdentity(row) || stableUrl(row.URL);
export function workdayJobUrl({ origin, tenant, site }, externalPath) {
  const url = new URL(origin);
  const prefix = /\.myworkdaysite\.com$/i.test(url.hostname) ? `/recruiting/${tenant}/${site}` : `/${site}`;
  return `${url.origin}${prefix}${externalPath.startsWith("/") ? "" : "/"}${externalPath}`;
}
export function workdayDetailUrl(value = "") {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const jobIndex = parts.indexOf("job");
    if (jobIndex < 1) return null;
    const tenant = /\.myworkdayjobs\.com$/i.test(url.hostname) ? url.hostname.split(".")[0]
      : /\.myworkdaysite\.com$/i.test(url.hostname) && parts[0] === "recruiting" ? parts[1] : null;
    return tenant ? `${url.origin}/wday/cxs/${tenant}/${parts[jobIndex - 1]}/${parts.slice(jobIndex).join("/")}` : null;
  } catch { return null; }
}
export function isAggregatorLead(row = {}) {
  return /aggregator|web-discovered|web lead/i.test(`${row.Source || ""} ${row.Status || row.source_status || ""}`)
    || /(?:glassdoor\.com|extern\.com|efinancialcareers\.com|openquant\.co)/i.test(row.URL || "");
}

export function sourceKey(value = "") {
  return String(value).match(/(?:Greenhouse|Lever|Ashby|SmartRecruiters|Workday|HiringThing|Trakstar):[^\s|]+/i)?.[0]?.toLowerCase() || String(value);
}

export function absenceConfirmed(snapshot, row) {
  const key = stableUrl(row.URL);
  if ((snapshot.observedUrls || []).some((url) => stableUrl(url) === key)) return false;
  const detail = (snapshot.postingAudits || []).find((audit) => stableUrl(audit.URL) === key);
  if (detail) return detail.status === "absent";
  // Only a fully enumerated instance of this role's own source proves absence.
  return (snapshot.sourceHealth || []).some((source) => source.complete === true && sourceKey(source.source) === sourceKey(row.Source));
}
