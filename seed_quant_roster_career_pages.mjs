import fs from "node:fs/promises";

const rosterPath = "quant_firm_roster.json";
const dbPath = "company_career_pages.json";
const concurrency = 4;
const blockedHosts = /(?:linkedin|indeed|glassdoor|ziprecruiter|levels\.fyi|builtin|simplify|tealhq|openquant|efinancialcareers|prosple|jobright|wayup|talent\.com|jooble|careerjet|jobrapido|grabjobs|whatjobs|adzuna|reddit|crunchbase|zoominfo|facebook|instagram|trustedinsight|eujobs|businesstoday)/i;
const trustedAtsHosts = /(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|workdayjobs\.com|icims\.com|workable\.com|hiringthing\.com|smartrecruiters\.com|jobvite\.com|applicantpro\.com|eightfold\.ai|tal\.net)$/i;
const careerSignal = /(?:career|careers|jobs|job|join|vacancies|opportunities|students|internships|open-positions|work-with-us)/i;
const genericTerms = new Set([
  "group", "capital", "management", "asset", "assets", "financial", "finance",
  "technologies", "technology", "partners", "markets", "trading", "investment",
  "investments", "llc", "inc", "corp", "company", "international", "global",
  "research", "securities", "bank", "fund", "energy", "the", "and",
]);

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value = "") {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value = "") {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function companyTokens(company) {
  return normalize(company).split(/\s+/).filter((token) => token.length > 2 && !genericTerms.has(token));
}

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 career-page-research" },
    });
    return { ok: response.ok, status: response.status, url: response.url, text: await response.text() };
  } catch {
    return { ok: false, status: 0, url, text: "" };
  } finally {
    clearTimeout(timeout);
  }
}

function resultCards(html = "") {
  return html.split(/<div class="snippet[^>]*data-type="web"/i).slice(1).map((block) => {
    const href = decodeHtml(block.match(/<a[^>]+href="(https?:\/\/[^"#]+)"/i)?.[1] || "");
    return { url: href, text: stripHtml(block.slice(0, 5000)) };
  }).filter((result) => result.url);
}

function scoreResult(company, result) {
  try {
    const parsed = new URL(result.url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (blockedHosts.test(host) || /\.(?:edu|gov)$/.test(host)) return -100;
    const urlText = `${host}${parsed.pathname}`.toLowerCase();
    const normalizedResult = normalize(`${result.text} ${urlText}`);
    const exactCompany = normalize(company);
    const tokens = companyTokens(company);
    const tokenMatch = tokens.length ? tokens.some((token) => urlText.includes(token)) : false;
    const exactMatch = exactCompany.length >= 4 && normalizedResult.includes(exactCompany);
    const ats = trustedAtsHosts.test(host);
    const career = careerSignal.test(urlText) || careerSignal.test(result.text);
    if (!career || (!tokenMatch && !exactMatch)) return -100;
    return (ats ? 12 : 0) + (careerSignal.test(urlText) ? 10 : 4) + (tokenMatch ? 7 : 0) + (exactMatch ? 5 : 0);
  } catch {
    return -100;
  }
}

async function discoverCompany(company) {
  const query = `"${company}" careers jobs internships`;
  const search = await fetchText(`https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`);
  if (!search.ok) return { company, pages: [], status: `search-http-${search.status}` };
  const ranked = resultCards(search.text)
    .map((result) => ({ ...result, score: scoreResult(company, result) }))
    .filter((result) => result.score >= 10)
    .sort((a, b) => b.score - a.score);

  const pages = [];
  for (const candidate of ranked.slice(0, 5)) {
    const verified = await fetchText(candidate.url);
    if (!verified.ok) continue;
    const finalUrl = verified.url.split("#")[0];
    const finalHost = new URL(finalUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (blockedHosts.test(finalHost)) continue;
    pages.push(finalUrl);
    if (pages.length >= 2) break;
  }
  return { company, pages: [...new Set(pages)], status: pages.length ? "verified-pages-found" : "no-verifiable-public-career-page" };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
      if ((index + 1) % 20 === 0) console.log(`researched ${index + 1}/${items.length}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const roster = JSON.parse(await fs.readFile(rosterPath, "utf8"));
const db = JSON.parse(await fs.readFile(dbPath, "utf8"));
db.companies ||= {};
const canonicalCompanies = [...new Set(roster.companies.map((company) => roster.aliases?.[company] || company))];
const missing = canonicalCompanies.filter((company) => !(db.companies[company]?.careerPages || []).length);
const researchedAt = new Date().toISOString();
const results = await mapLimit(missing, concurrency, discoverCompany);

for (const result of results) {
  const existing = db.companies[result.company] || {};
  db.companies[result.company] = {
    ...existing,
    careerPages: [...new Set([...(existing.careerPages || []), ...result.pages])],
    rosterDiscoveryStatus: result.status,
    rosterResearchedAt: researchedAt,
    updatedAt: researchedAt,
  };
}

db.generatedAt = researchedAt;
await fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
const found = results.filter((result) => result.pages.length).length;
console.log(`roster=${canonicalCompanies.length} researched=${missing.length} newlyCovered=${found} stillUnverified=${missing.length - found}`);
