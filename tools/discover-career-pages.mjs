import fs from "node:fs/promises";

const scannerPath = new URL("../expand_us_financial_services_search.mjs", import.meta.url);
const dbPath = new URL("../inputs/company_career_pages.json", import.meta.url);
const outJsonPath = new URL("../discovered-career-pages.json", import.meta.url);
const outCsvPath = new URL("../discovered-career-pages.csv", import.meta.url);

const scannerText = await fs.readFile(scannerPath, "utf8");

function extractArray(name) {
  const match = scannerText.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  return match ? Function(`return [${match[1]}];`)() : [];
}

function extractObject(name) {
  const start = scannerText.indexOf(`const ${name} = {`);
  if (start < 0) return {};
  const bodyStart = scannerText.indexOf("{", start);
  let depth = 0;
  for (let i = bodyStart; i < scannerText.length; i++) {
    if (scannerText[i] === "{") depth++;
    if (scannerText[i] === "}") {
      depth--;
      if (depth === 0) return Function(`return (${scannerText.slice(bodyStart, i + 1)});`)();
    }
  }
  return {};
}

const companies = [...new Set([
  ...extractArray("originalCompanies"),
  ...extractArray("expandedCompanies"),
  ...extractArray("broadFinancialServicesCompanies"),
])].sort();
const officialDomains = extractObject("officialDomains");

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
  "vault.com",
  "vaia.com",
];

const atsHosts = [
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
  "successfactors.com",
  "tal.net",
];

const genericCompanyTerms = new Set([
  "group",
  "capital",
  "management",
  "asset",
  "assets",
  "financial",
  "finance",
  "technologies",
  "technology",
  "partners",
  "markets",
  "trading",
  "investment",
  "investments",
  "llc",
  "inc",
  "corp",
  "corporation",
  "company",
  "international",
  "global",
  "research",
  "securities",
  "bank",
  "life",
  "insurance",
]);

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
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !genericCompanyTerms.has(token));
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
      url: url.split("#")[0],
      snippet: decodeHtml(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ""),
    };
  }).filter(Boolean);
}

function isAtsHost(host) {
  return atsHosts.some((domain) => host.endsWith(domain) || host.includes(domain));
}

function scoreHit(company, hit) {
  const host = hostOf(hit.url);
  const text = `${hit.title} ${hit.snippet} ${hit.url}`.toLowerCase();
  if (!host) return -100;
  if (badHosts.some((bad) => host.includes(bad))) return -100;
  if (!/\b(career|careers|job|jobs|join|opportunities|students|internship|early careers|campus)\b/i.test(text)) return -30;

  let score = 0;
  if ((officialDomains[company] || []).some((domain) => host.endsWith(domain))) score += 90;
  if (isAtsHost(host)) score += 45;
  if (/\b(career|careers|jobs|join us|opportunities)\b/i.test(hit.title)) score += 25;
  if (/\b(student|students|intern|internship|campus|early careers)\b/i.test(text)) score += 15;

  const tokens = companyTokens(company);
  const tokenHits = tokens.filter((token) => host.includes(token) || text.includes(token)).length;
  score += tokenHits * 12;
  if (tokens.length && tokenHits === 0 && !isAtsHost(host)) score -= 40;
  return score;
}

async function discoverCompany(company) {
  const queries = [
    `"${company}" careers`,
    `"${company}" jobs`,
    `"${company}" students internships careers`,
    `"${company}" early careers`,
  ];
  const seen = new Set();
  const hits = [];
  for (const query of queries) {
    for (const hit of await searchBing(query)) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      hits.push({ ...hit, score: scoreHit(company, hit) });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return {
    company,
    candidates: hits.filter((hit) => hit.score >= 45).slice(0, 4),
    topRejected: hits.filter((hit) => hit.score < 45).slice(0, 3),
  };
}

async function mapLimit(items, limit, fn, label) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index], index);
      if ((index + 1) % 25 === 0) console.error(`${label} ${index + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

const shouldWrite = process.argv.includes("--write");
const existingDb = JSON.parse(await fs.readFile(dbPath, "utf8").catch(() => '{"companies":{}}'));
existingDb.companies ||= {};

const targetCompanies = companies;
const results = await mapLimit(targetCompanies, 5, discoverCompany, "discovered");
const discoveredAt = new Date().toISOString();

if (shouldWrite) {
  for (const result of results) {
    const current = existingDb.companies[result.company]?.careerPages || [];
    const additions = result.candidates.map((candidate) => candidate.url);
    existingDb.companies[result.company] = {
      careerPages: [...new Set([...current, ...additions])],
      updatedAt: discoveredAt,
    };
  }
  existingDb.generatedAt = discoveredAt;
  await fs.writeFile(dbPath, JSON.stringify(existingDb, null, 2), "utf8");
}

const discovered = results.filter((result) => result.candidates.length);
await fs.writeFile(outJsonPath, JSON.stringify({
  generatedAt: discoveredAt,
  wroteDatabase: shouldWrite,
  targetCompanies: targetCompanies.length,
  discoveredCount: discovered.length,
  noCandidateCount: targetCompanies.length - discovered.length,
  results,
}, null, 2), "utf8");

const csvRows = [["Company", "Score", "Title", "URL"].map((value) => `"${value}"`).join(",")];
for (const result of discovered) {
  for (const candidate of result.candidates) {
    csvRows.push([result.company, candidate.score, candidate.title, candidate.url].map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","));
  }
}
await fs.writeFile(outCsvPath, `${csvRows.join("\n")}\n`, "utf8");

console.log(JSON.stringify({
  targetCompanies: targetCompanies.length,
  discovered: discovered.length,
  noCandidate: targetCompanies.length - discovered.length,
  wroteDatabase: shouldWrite,
  outJsonPath: outJsonPath.pathname,
  outCsvPath: outCsvPath.pathname,
}, null, 2));
