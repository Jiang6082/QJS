import { calendarDate } from "../scripts/calendar-date.mjs";

export function jobPostingJsonLd(html = "") {
  const find = (value) => {
    if (!value || typeof value !== "object") return null;
    if (Array.isArray(value)) return value.map(find).find(Boolean) || null;
    if ([value["@type"]].flat().some((type) => String(type).toLowerCase() === "jobposting")) return value;
    return find(value["@graph"]);
  };
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const posting = find(JSON.parse(match[1])); if (posting) return posting; } catch {}
  }
  return null;
}

export async function verifyOfficialPosting(row, fetcher = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetcher(row.URL || row.url, { signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 QJS posting verifier" } });
    if ([404, 410].includes(response.status)) return { status: "absent", reason: `HTTP ${response.status}` };
    if (!response.ok) return { status: "unknown", reason: `HTTP ${response.status}` };
    const html = await response.text();
    const posting = jobPostingJsonLd(html);
    if (!posting?.title) return { status: "unknown", reason: "No current JobPosting structured data" };
    const expiry = posting.validThrough;
    if (expiry && (String(expiry).length === 10 ? calendarDate(expiry) < calendarDate() : new Date(expiry).getTime() < Date.now())) {
      return { status: "absent", reason: "Employer validThrough has expired" };
    }
    const expected = String(row.Title || row.title || "").toLowerCase().match(/[a-z0-9]+/g) || [];
    const actual = String(posting.title).toLowerCase();
    if (expected.length && expected.filter((word) => actual.includes(word)).length / expected.length < 0.6) {
      return { status: "unknown", reason: "Structured posting title does not match requested role" };
    }
    return { status: "active", reason: "Current official JobPosting", posting };
  } catch (error) { return { status: "unknown", reason: error.message }; }
  finally { clearTimeout(timer); }
}
