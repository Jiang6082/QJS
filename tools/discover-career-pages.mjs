import fs from "node:fs/promises";

const scannerPath = "C:/Users/illus/Downloads/drive-download-20260603T154921Z-3-001/expand_us_financial_services_search.mjs";
const outPath = "C:/Users/illus/Documents/Codex/2026-06-03/can-you-look-under-downloads-drive/work/discovered-career-pages.json";

const text = await fs.readFile(scannerPath, "utf8");

function extractArray(name) {
  const match = text.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!match) return [];
  return Function(`return [${match[1]}];`)();
}

function extractObject(name) {
  const start = text.indexOf(`const ${name} = {`);
  if (start < 0) return {};
  const bodyStart = text.indexOf("{", start);
  let depth = 0;
  for (let i = bodyStart; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") {
      depth--;
      if (depth === 0) return Function(`return (${text.slice(bodyStart, i + 1)});`)();
    }
  }
  return {};
}

const companies = [...new Set([
  ...extractArray("originalCompanies"),
  ...extractArray("expandedCompanies"),
  ...extractArray("broadFinancialServicesCompanies"),
])];
const seedCareerPages = extractObject("seedCareerPages");
const officialDomains = extractObject("officialDomains");

const trustedAtsHosts = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "myworkdayjobs.com",
  "icims.com",
  "hiringthing.com",
  "smartrecruiters.com",
  "eightfold.ai",
  "workable.com",
  "bamboohr.com",
  "jobvite.com",
];

const badHosts = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "builtin.com",
  "levels.fyi",
  "tealhq.com",
  "simplify.jobs",
  "reddit.com",
  "wikipedia.org",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "wallstreetoasis.com",
  "jobright.ai",
  "openquant.co",
  "efinancialcareers.com",
];

const genericBadTerms = [
  "horoscope",
  "resort",
  "state park",
  "university project",
  "student-info",
  "jooble",
  "yahoo.com/news",
];

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeBingUrl(url) {
  try {
    const parsed = new URL(url);
    const encoded = parsed.searchParams.get("u");
    if (encoded?.startsWith("a1")) {
      const b64 = encoded.slice(2).replace(/-/g, "+").replace(/_/g, "/");
      return Buffer.from(b64, "base64").toString("utf8");
    }
  } catch {}
  return url;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function companyTokens(company) {
  return company
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(group|capital|management|asset|assets|financial|technologies|technology|partners|markets|trading|investment|investments|llc|inc|corp|corporation|company|international)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function scoreHit(company, hit) {
  const url = hit.url.toLowerCase();
  const host = hostOf(hit.url);
  const text = `${hit.title} ${hit.snippet} ${hit.url}`.toLowerCase();
  if (!host) return -100;
  if (badHosts.some((bad) => host.includes(bad))) return -100;
  if (genericBadTerms.some((bad) => text.includes(bad))) return -80;
  if (!/\b(career|careers|job|jobs|join us|opportunities|students|internship|early careers)\b/i.test(text)) return -20;

  let score = 0;
  const domains = officialDomains[company] || [];
  if (domains.some((domain) => host.endsWith(domain))) score += 80;
  if (trustedAtsHosts.some((domain) => host.endsWith(domain) || host.includes(domain))) score += 50;
  if (/\bcareer|careers|jobs|join us|opportunities\b/i.test(hit.title)) score += 20;
  if (/\bstudent|students|intern|internship|early careers\b/i.test(text)) score += 10;

  const tokens = companyTokens(company);
  const tokenHits = tokens.filter((token) => host.includes(token) || text.includes(token)).length;
  score += tokenHits * 8;
  if (tokens.length && tokenHits === 0 && !trustedAtsHosts.some((domain) => host.includes(domain))) score -= 30;
  return score;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 career-page-discovery",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    return { ok: response.ok, status: response.status, text: await response.text(), url: response.url };
  } catch (error) {
    return { ok: false, status: 0, text: "", url, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function searchBing(query) {
  const res = await fetchText(`https://www.bing.com/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const blocks = res.text.split('<li class="b_algo"').slice(1, 10);
  return blocks.map((block) => {
    const h2 = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!h2) return null;
    let url = decodeHtml(h2[1]);
    if (url.includes("/ck/a?")) url = decodeBingUrl(url);
    return {
      title: decodeHtml(h2[2]),
      url,
      snippet: decodeHtml(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ""),
    };
  }).filter(Boolean);
}

async function discoverCompany(company) {
  const queries = [
    `"${company}" careers`,
    `"${company}" jobs`,
    `"${company}" students careers internship`,
    `"${company}" early careers`,
  ];
  const hits = [];
  const seen = new Set();
  for (const query of queries) {
    for (const hit of await searchBing(query)) {
      const cleanUrl = hit.url.split("#")[0];
      if (seen.has(cleanUrl)) continue;
      seen.add(cleanUrl);
      hits.push({ ...hit, url: cleanUrl, score: scoreHit(company, { ...hit, url: cleanUrl }) });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return {
    company,
    existingOfficialDomains: officialDomains[company] || [],
    currentSeed: seedCareerPages[company] || [],
    candidates: hits.filter((hit) => hit.score >= 30).slice(0, 5),
    rejectedTop: hits.filter((hit) => hit.score < 30).slice(0, 3),
  };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index], index);
      if ((index + 1) % 25 === 0) console.error(`discovered ${index + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

const targetCompanies = companies.filter((company) => !(seedCareerPages[company] || []).length);
const results = await mapLimit(targetCompanies, 6, discoverCompany);
const discovered = results.filter((result) => result.candidates.length);

await fs.writeFile(outPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  targetCompanies: targetCompanies.length,
  discoveredCount: discovered.length,
  noCandidateCount: targetCompanies.length - discovered.length,
  results,
}, null, 2), "utf8");

console.log(`targetCompanies=${targetCompanies.length} discovered=${discovered.length} noCandidate=${targetCompanies.length - discovered.length}`);
console.log(`wrote ${outPath}`);
