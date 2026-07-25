import fs from "node:fs/promises";
import { isKnownWrongCareerPage } from "./tools/career-source-guards.mjs";

const baseCsvPath = "swe_2027_internship_scan_base.csv";
const careerPageDbPath = "company_career_pages.json";
const firmRoster = JSON.parse(await fs.readFile("quant_firm_roster.json", "utf8"));
const rosterCompanies = firmRoster.companies.map((company) => firmRoster.aliases?.[company] || company);

const expandedCompanies = [
  "AQR Capital Management",
  "Acadian Asset Management",
  "AllianceBernstein",
  "Allianz Global Investors",
  "Ares Management",
  "Aspect Capital",
  "Baillie Gifford",
  "BlackRock",
  "BlueCove",
  "BNP Paribas",
  "BMO Capital Markets",
  "Barclays",
  "Berenberg",
  "Bridgewater Associates",
  "Capital Group",
  "Citi",
  "Connor Clark & Lunn",
  "Deutsche Bank",
  "Dimensional Fund Advisors",
  "Fidelity Investments",
  "Goldman Sachs",
  "HSBC",
  "Invesco",
  "J.P. Morgan",
  "Janus Henderson",
  "Lazard Asset Management",
  "Macquarie",
  "Morgan Stanley",
  "Neuberger Berman",
  "Northern Trust Asset Management",
  "PGIM",
  "PIMCO",
  "Putnam Investments",
  "Research Affiliates",
  "Robeco",
  "Russell Investments",
  "Schroders",
  "State Street Global Advisors",
  "T. Rowe Price",
  "UBS",
  "Vanguard",
  "Wellington Management",
  "William Blair",
];

const broadFinancialServicesCompanies = [
  "Bank of America",
  "Wells Fargo",
  "U.S. Bank",
  "Truist",
  "Capital One",
  "KeyBank",
  "Citizens Financial Group",
  "Fifth Third Bank",
  "Regions Bank",
  "M&T Bank",
  "Huntington Bank",
  "Ally Financial",
  "Discover Financial Services",
  "Synchrony",
  "American Express",
  "Charles Schwab",
  "E*TRADE",
  "Edward Jones",
  "Raymond James",
  "LPL Financial",
  "Interactive Brokers",
  "Robinhood",
  "SoFi",
  "Coinbase",
  "Stripe",
  "Plaid",
  "Chime",
  "Brex",
  "Ramp",
  "Affirm",
  "Upstart",
  "PayPal",
  "Block",
  "Visa",
  "Mastercard",
  "Fiserv",
  "FIS",
  "Global Payments",
  "CME Group",
  "Cboe",
  "Nasdaq",
  "Intercontinental Exchange",
  "S&P Global",
  "Moody's",
  "Morningstar",
  "MSCI",
  "FactSet",
  "Bloomberg",
  "Franklin Templeton",
  "MFS Investment Management",
  "Nuveen",
  "J.P. Morgan Asset Management",
  "BNY",
  "BNY Mellon",
  "State Street",
  "Prudential Financial",
  "MetLife",
  "New York Life",
  "Northwestern Mutual",
  "MassMutual",
  "Guardian Life",
  "Pacific Life",
  "Lincoln Financial",
  "Principal Financial Group",
  "The Hartford",
  "AIG",
  "Travelers",
  "Chubb",
  "Allstate",
  "State Farm",
  "Liberty Mutual",
  "Nationwide",
  "Progressive",
  "Berkshire Hathaway",
  "Markel",
  "Everest",
  "Arch Capital",
  "KKR",
  "Blackstone",
  "Apollo Global Management",
  "Carlyle",
  "TPG",
  "Warburg Pincus",
  "General Atlantic",
  "Vista Equity Partners",
  "Thoma Bravo",
  "Ares Management",
  "Brookfield Asset Management",
  "Blue Owl Capital",
  "Oaktree Capital Management",
];

const originalCompanies = [
  "Jane Street", "Citadel", "Citadel Securities", "DRW", "Point72", "Cubist", "Hudson River Trading",
  "Five Rings", "Arrowstreet", "3Red Partners", "A Priori", "Akuna Capital", "AlphaGrep", "AlphaSimplex",
  "Alyeska Investment Group", "Aquatic Capital", "AXQ Capital", "Balyasny Asset Management",
  "Belvedere Trading", "Bluefin Capital Management", "Brevan Howard", "Bridgewater Associates",
  "Capital Fund Management", "Capstone", "Capula", "Caxton Associates", "Centiva Capital",
  "Chicago Trading Company", "D. E. Shaw", "DV Trading", "Engineers Gate", "Ergoteles",
  "ExodusPoint", "Flow Traders", "G-Research", "Garda Capital Partners", "Gelber Group",
  "Geneva Trading", "Geode Capital Management", "Graham Capital Management", "Graviton Research Capital",
  "Group One Trading", "GSA Capital", "Headlands Technologies", "IMC Trading", "Jump Trading",
  "Kepos Capital", "Laurion Capital Management", "Man Group", "Marshall Wace", "Maven Securities",
  "Millennium", "Old Mission Capital", "Optiver", "PanAgora", "PDT Partners", "Peak6",
  "Qube Research & Technologies", "Radix Trading", "Renaissance Technologies", "Schonfeld",
  "Squarepoint Capital", "Stevens Capital Management", "Susquehanna International Group",
  "Systematica Investments", "Teza Technologies", "Tower Research Capital", "Trexquant",
  "Two Sigma", "Valkyrie Trading", "Vatic Investments", "Verition Fund Management", "Virtu Financial",
  "Voleon Group", "Voloridge", "Walleye Capital", "Winton Capital", "Wintermute", "Wolverine Trading",
  "WorldQuant", "XTX Markets", "Trillium", "TransMarket Group",
  "Weiss Asset Management", "Musket", "BP", "Castleton Commodities International", "Equinor", "Gunvor", "Shell", "Talos",
];

const companies = [...new Set([...originalCompanies, ...expandedCompanies, ...broadFinancialServicesCompanies, ...rosterCompanies])];

const officialDomains = {
  "AQR Capital Management": ["aqr.com", "careers.aqr.com"],
  "Acadian Asset Management": ["acadian-asset.com"],
  AllianceBernstein: ["alliancebernstein.com"],
  "American Express": ["americanexpress.com"],
  "Bank of America": ["bankofamerica.com", "careers.bankofamerica.com"],
  BlackRock: ["blackrock.com", "blackrock.tal.net"],
  BlueCove: ["bluecove.com"],
  BNY: ["bnymellon.com", "bnymellon.eightfold.ai"],
  "BNY Mellon": ["bnymellon.com", "bnymellon.eightfold.ai"],
  "BNP Paribas": ["group.bnpparibas", "bnpparibas.com"],
  Barclays: ["search.jobs.barclays", "barclays.com"],
  "Bridgewater Associates": ["bridgewater.com"],
  "Capital One": ["capitalonecareers.com", "capitalone.com"],
  "Charles Schwab": ["schwabjobs.com", "schwab.com"],
  Citi: ["jobs.citi.com"],
  "CME Group": ["cmegroup.com"],
  "Coinbase": ["coinbase.com", "greenhouse.io"],
  "D. E. Shaw": ["deshaw.com", "campus.deshaw.com"],
  "DE Shaw": ["deshaw.com", "campus.deshaw.com"],
  "Dimensional Fund Advisors": ["dimensional.com"],
  "Discover Financial Services": ["discover.com", "myworkdayjobs.com"],
  "Fidelity Investments": ["fidelity.com", "jobs.fidelity.com"],
  "Fiserv": ["fiserv.com"],
  "Goldman Sachs": ["goldmansachs.com", "higher.gs.com"],
  "Hudson River Trading": ["hudsonrivertrading.com"],
  "Intercontinental Exchange": ["ice.com"],
  "J.P. Morgan": ["jpmorgan.com", "careers.jpmorgan.com"],
  "J.P. Morgan Asset Management": ["jpmorgan.com", "careers.jpmorgan.com"],
  "Mastercard": ["mastercard.com"],
  "MetLife": ["metlife.com"],
  "Morgan Stanley": ["morganstanley.com"],
  Nasdaq: ["nasdaq.com"],
  "New York Life": ["newyorklife.com"],
  Optiver: ["optiver.com"],
  PayPal: ["paypal.com"],
  PGIM: ["pgim.com"],
  PIMCO: ["pimco.com"],
  "Prudential Financial": ["prudential.com", "pru.wd5.myworkdayjobs.com"],
  Robeco: ["robeco.com"],
  "S&P Global": ["spglobal.com"],
  "State Farm": ["statefarm.com"],
  "State Street Global Advisors": ["statestreet.com"],
  "State Street": ["statestreet.com"],
  "Susquehanna International Group": ["sig.com", "careers.sig.com"],
  "Teza Technologies": ["teza.com"],
  Visa: ["visa.com"],
  UBS: ["ubs.com"],
  "U.S. Bank": ["usbank.com"],
  Vanguard: ["vanguardjobs.com", "vanguard.com"],
  "Walleye Capital": ["walleyecapital.com", "job-boards.greenhouse.io"],
  "Wellington Management": ["wellington.com"],
  "Wells Fargo": ["wellsfargo.com"],
  Voloridge: ["voloridge.com", "voloridge-investment-management.hiringthing.com"],
  Point72: ["point72.com", "careers.point72.com", "boards.greenhouse.io", "job-boards.greenhouse.io"],
  "Weiss Asset Management": ["weissasset.com", "boards.greenhouse.io"],
  Musket: ["jobs.loves.com", "loves.com"],
  BP: ["bp.com", "jobs.bp.com", "jobs-bp.icims.com", "bpglobal.com"],
  "Castleton Commodities International": ["cci.com"],
  Equinor: ["equinor.com", "equinor.wd3.myworkdayjobs.com", "equinor.wd5.myworkdayjobs.com"],
  Gunvor: ["gunvorgroup.com"],
  "Qube Research & Technologies": ["qube-rt.com", "job-boards.greenhouse.io"],
  Shell: ["shell.com", "shell.wd3.myworkdayjobs.com", "shell.wd5.myworkdayjobs.com"],
  Talos: ["talos.com"],
  "Verition Fund Management": ["verition.com"],
};

const seedCareerPages = {
  "Qube Research & Technologies": ["https://www.qube-rt.com/careers/"],
  "Radix Trading": ["https://job-boards.greenhouse.io/radixuniversity"],
  "TransMarket Group": ["https://job-boards.greenhouse.io/transmarketgroup"],
  "Teza Technologies": ["https://www.teza.com/careers/"],
  "Walleye Capital": ["https://job-boards.greenhouse.io/walleyecapital-external-students"],
  "Bank of America": ["https://careers.bankofamerica.com/en-us/students"],
  BlackRock: ["https://careers.blackrock.com/early-careers"],
  "Capital One": ["https://www.capitalonecareers.com/students"],
  "Charles Schwab": ["https://www.schwabjobs.com/students"],
  "CME Group": ["https://www.cmegroup.com/careers.html"],
  Coinbase: ["https://www.coinbase.com/careers/positions"],
  "D. E. Shaw": ["https://www.deshaw.com/careers?source=campus"],
  "DE Shaw": ["https://www.deshaw.com/careers?source=campus"],
  "Fidelity Investments": ["https://jobs.fidelity.com/students"],
  "Goldman Sachs": ["https://www.goldmansachs.com/careers/students/programs/"],
  "J.P. Morgan": ["https://careers.jpmorgan.com/us/en/students/programs"],
  "J.P. Morgan Asset Management": ["https://careers.jpmorgan.com/us/en/students/programs"],
  Mastercard: ["https://careers.mastercard.com/us/en/early-careers"],
  "Morgan Stanley": ["https://www.morganstanley.com/careers/career-opportunities-search"],
  Nasdaq: ["https://www.nasdaq.com/about/careers"],
  "New York Life": ["https://www.newyorklife.com/careers/students"],
  PayPal: ["https://paypal.eightfold.ai/careers"],
  "Prudential Financial": ["https://pru.wd5.myworkdayjobs.com/Prudential_Careers"],
  "S&P Global": ["https://careers.spglobal.com/jobs"],
  "State Street": ["https://statestreet.wd1.myworkdayjobs.com/Global"],
  "U.S. Bank": ["https://careers.usbank.com/students"],
  Visa: ["https://usa.visa.com/careers.html"],
  Vanguard: ["https://www.vanguardjobs.com/students-and-recent-graduates/"],
  "Wells Fargo": ["https://www.wellsfargojobs.com/en/university-programs/"],
};

const aggregatorDomains = [
  "efinancialcareers.com",
  "openquant.co",
  "simplify.jobs",
  "tealhq.com",
  "builtin.com",
  "levels.fyi",
  "prosple.com",
  "jobright.ai",
  "linkedin.com/jobs",
  "indeed.com",
  "glassdoor.com",
  "wayup.com",
  "handshake",
  "revopscareers.com",
  "jobs.ashbyhq.com",
  "job-boards.greenhouse.io",
  "boards.greenhouse.io",
  "lever.co",
  "myworkdayjobs.com",
  "icims.com",
];

const roleSignal = /\b(software|swe|developer|development|engineer|engineering|technology|technologist|technical|programmer|programming|platform|backend|back[- ]end|frontend|front[- ]end|full[- ]stack|systems|infrastructure|site reliability|sre|devops|cloud|distributed systems|data engineer|data engineering|machine learning engineer|ml engineer|ai engineer|security engineer|cybersecurity|mobile|ios|android|c\+\+|java|python|typescript|javascript|api|database|fpga|hardware engineer)\b/i;
const internSignal = /\b(intern|internship|summer analyst|summer associate|co-?op|industrial placement)\b/i;
const cycleSignal = /\b(2027|summer\s+2027|2027\s+summer|class of 2028|graduat(?:e|ing|ion)[^.!?;]{0,120}\b20(27|28)\b|\b20(27|28)\b[^.!?;]{0,120}graduat(?:e|ing|ion)|december\s+2027|spring\s+2028|winter\s+2027)\b/i;
const negativeSignal = /\b(new grad|new graduate|graduate programme|graduate program|full[- ]time|experienced|senior|principal|director|vp|vice president|phd intern|ph\.d\. intern|doctoral|postdoc|mba)\b/i;
const nonSoftwareSignal = /\b(audit|accounting|tax|human resources|marketing|sales intern|business development|compliance|legal|investment banking|corporate banking|commercial banking|private banking|wealth management|asset management summer analyst|markets summer analyst|sales and trading|trader intern|quantitative trader|quant trader|research analyst|portfolio|underwriting|actuarial)\b/i;

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;|&#8211;/g, "-")
    .replace(/&mdash;|&#8212;/g, "-")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value = "") {
  return decodeHtml(decodeHtml(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function timingMetadata(title = "", content = "") {
  const plain = stripHtml(content);
  const timing = title.match(/\b(spring|summer|fall|winter)\s+20\d{2}\b/i)?.[0]
    || title.match(/\b20\d{2}\s+(spring|summer|fall|winter)\b/i)?.[0]
    || title.match(/\b(spring|summer|fall|winter)\b/i)?.[0]
    || "";
  const graduationText = plain
    .split(/(?<=[.!?;])\s+/)
    .filter((sentence) => /\b(graduat(?:e|ing|ion)?|class of|degree completion)\b/i.test(sentence))
    .join(" ");
  const graduationYears = [...new Set([...graduationText.matchAll(/\b20\d{2}\b/g)].map((match) => match[0]))];
  return [
    timing ? `internship timing: ${timing}` : "internship timing not stated in title",
    graduationYears.length ? `graduation eligibility mentions: ${graduationYears.join(", ")}` : "",
  ].filter(Boolean).join("; ");
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

function firstJsonLd(html = "") {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

async function normalizeOpenQuantHit(hitUrl) {
  const res = await fetchText(hitUrl);
  if (!res.ok) return null;
  const jsonLd = firstJsonLd(res.text);
  const applyHref = [...res.text.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ href: m[1], text: stripHtml(m[2]) }))
    .find((link) => /\bapply\b/i.test(link.text))?.href || "";
  const canonicalUrl = decodeHtml(applyHref) || res.url;
  const datePosted = typeof jsonLd?.datePosted === "string" ? jsonLd.datePosted.slice(0, 10) : "";
  const locality = jsonLd?.jobLocation?.address?.addressLocality || "";
  const region = jsonLd?.jobLocation?.address?.addressRegion || "";
  const location = [locality, region].filter(Boolean).join(", ");
  const title = jsonLd?.title || "";
  return { canonicalUrl, datePosted, location, title, openQuantUrl: res.url };
}

function classifySource(company, url) {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch {}
  const official = (officialDomains[company] || []).some((d) => host.endsWith(d));
  const aggregator = aggregatorDomains.some((d) => host.includes(d));
  if (official) return "Official posting/page";
  if (aggregator) return "Web-discovered posting/lead";
  return "Web-discovered lead";
}

function isRelevantResult(title, snippet, url) {
  const text = `${title} ${snippet} ${url}`;
  if (/\b2026\b/.test(title)) return false;
  if (!internSignal.test(text) || !roleSignal.test(text) || !cycleSignal.test(text)) return false;
  if (negativeSignal.test(text) && !/\bBS\/MS|Bachelor|undergrad|undergraduate|master/i.test(text)) return false;
  if (/linkedin\.com/i.test(url) && !/linkedin\.com\/jobs\//i.test(url)) return false;
  if (nonSoftwareSignal.test(text) && !/\bsoftware|developer|engineer|technology|swe|programming|platform|backend|frontend|full[- ]stack|infrastructure|sre|devops|machine learning engineer|data engineer|fpga/i.test(text)) return false;
  if (/reddit\.com|wikipedia\.org|\.edu(?:\/|$)|pdf$|youtube\.com|facebook\.com|wallstreetoasis\.com|thewallstreetquants\.com|builtin\.com/i.test(url)) return false;
  if (/\binterview\b/i.test(title) || /\bjobs$/i.test(title) || /search job openings/i.test(text) || /hedge funds hiring graduates and interns/i.test(title)) return false;
  return true;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 internship-research",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    return { ok: res.ok, status: res.status, text: await res.text(), url: res.url };
  } catch (error) {
    return { ok: false, status: 0, text: "", url, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function searchBing(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const res = await fetchText(url);
  if (!res.ok) return [];
  const blocks = res.text.split('<li class="b_algo"').slice(1, 10);
  const hits = [];
  for (const block of blocks) {
    const h2 = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!h2) continue;
    let resultUrl = decodeHtml(h2[1]);
    if (resultUrl.includes("/ck/a?")) resultUrl = decodeBingUrl(resultUrl);
    const title = stripHtml(h2[2]);
    const snippet = stripHtml(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "");
    hits.push({ title, url: resultUrl, snippet });
  }
  return hits;
}

function isAggregatorUrl(url = "") {
  return aggregatorDomains.some((domain) => url.toLowerCase().includes(domain));
}

const trustedCareerHosts = [
  "job-boards.greenhouse.io",
  "boards.greenhouse.io",
  "jobs.lever.co",
  "jobs.ashbyhq.com",
  "myworkdayjobs.com",
  "icims.com",
  "hiringthing.com",
];

const genericCompanyTerms = new Set([
  "group", "capital", "management", "asset", "assets", "financial", "finance",
  "technologies", "technology", "partners", "markets", "trading", "investment",
  "investments", "llc", "inc", "corp", "corporation", "company", "international",
  "global", "research", "securities", "bank", "life", "insurance",
]);

function companyTokens(company) {
  return company.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !genericCompanyTerms.has(token));
}

function isLikelyCompanyCareerHost(company, url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (!/\b(career|careers|job|jobs|join|opportunities|students|campus|early-careers|open-roles)\b/.test(`${host} ${path}`)) return false;
    const tokens = companyTokens(company);
    return tokens.some((token) => host.includes(token));
  } catch {
    return false;
  }
}

function isTrustedCareerPageUrl(company, url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return (officialDomains[company] || []).some((domain) => host.endsWith(domain))
      || trustedCareerHosts.some((domain) => host.endsWith(domain))
      || isLikelyCompanyCareerHost(company, url);
  } catch {
    return false;
  }
}

function isLikelyCareerPage(hit, company) {
  if (isKnownWrongCareerPage(company, hit.url)) return false;
  const text = `${hit.title} ${hit.snippet} ${hit.url}`.toLowerCase();
  if (!/\b(career|careers|jobs|join us|opportunities)\b/.test(text)) return false;
  if (/linkedin|indeed|glassdoor|ziprecruiter|levels\.fyi|builtin|simplify|tealhq|openquant|efinancialcareers|prosple|jobright|wayup|talent\.com|jooble|careerjet|jobrapido|grabjobs|whatjobs|adzuna|reddit|crunchbase|zoominfo|facebook|instagram/i.test(hit.url)) return false;
  if (isTrustedCareerPageUrl(company, hit.url)) return true;
  const normalizedCompany = company.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
  const normalizedText = text.replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ");
  return normalizedCompany.length >= 4 && normalizedText.includes(normalizedCompany);
}

function careerPageQueries(company) {
  const quoted = `"${company}"`;
  return [
    `${quoted} careers jobs`,
    `${quoted} internships careers`,
  ];
}

async function discoverCareerPages(company) {
  const pages = new Set(seedCareerPages[company] || []);
  for (const query of careerPageQueries(company)) {
    const hits = await searchBing(query);
    for (const hit of hits) {
      if (isLikelyCareerPage(hit, company)) pages.add(hit.url.split("#")[0]);
      if (pages.size >= 3) break;
    }
  }
  return [...pages];
}

async function loadCareerPageDb() {
  try {
    return JSON.parse(await fs.readFile(careerPageDbPath, "utf8"));
  } catch {
    return { generatedAt: "", companies: {} };
  }
}

async function ensureCareerPageDb() {
  const db = await loadCareerPageDb();
  db.companies ||= {};
  const discoveredAt = new Date().toISOString();

  const companiesNeedingDiscovery = companies.filter((company) => !(db.companies[company]?.careerPages || []).length);
  const discovered = await mapLimit(companiesNeedingDiscovery, 6, async (company) => ({
    company,
    careerPages: await discoverCareerPages(company),
  }), "career-pages");

  for (const company of companies) {
    const existing = (db.companies[company]?.careerPages || [])
      .filter((url) => !isKnownWrongCareerPage(company, url));
    const seeded = seedCareerPages[company] || [];
    const found = discovered.find((entry) => entry.company === company)?.careerPages || [];
    db.companies[company] = {
      ...(db.companies[company] || {}),
      careerPages: [...new Set([...existing, ...seeded, ...found])],
      updatedAt: discoveredAt,
    };
  }

  db.generatedAt = discoveredAt;
  await fs.writeFile(careerPageDbPath, JSON.stringify(db, null, 2), "utf8");
  return db;
}

function extractScriptUrls(html, pageUrl) {
  const urls = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map((match) => new URL(decodeHtml(match[1]), pageUrl).toString())
    .filter(Boolean);
  const pageHost = new URL(pageUrl).hostname.replace(/^www\./, "");
  const jobScripts = urls.filter((url) => /(?:^|[._/-])(jobs?|careers?|greenhouse|lever|ashby|workday)(?:[._/?-]|$)/i.test(url));
  const sameOriginScripts = urls.filter((url) => !jobScripts.includes(url) && new URL(url).hostname.replace(/^www\./, "") === pageHost);
  const externalScripts = urls.filter((url) => !jobScripts.includes(url) && !sameOriginScripts.includes(url));
  return [...new Set([...jobScripts, ...sameOriginScripts.slice(0, 8), ...externalScripts.slice(0, 4)])];
}

const searchResultCompanyAliases = {
  "D. E. Shaw": ["deshaw"],
  "Hudson River Trading": ["hrt"],
  "J.P. Morgan": ["jpmorgan"],
  "Qube Research & Technologies": ["qube-rt"],
  "Susquehanna International Group": ["sig", "susquehanna"],
};

function matchesSearchResultCompany(company, hit) {
  let host = "";
  try { host = new URL(hit.url).hostname.replace(/^www\./, "").toLowerCase(); } catch {}
  const sharedAts = /(?:greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|icims\.com)$/;
  if ((officialDomains[company] || []).some((domain) => !sharedAts.test(domain) && (host === domain || host.endsWith(`.${domain}`)))) return true;

  const raw = `${hit.title} ${hit.snippet} ${hit.url}`.toLowerCase();
  const words = ` ${raw.replace(/[^a-z0-9]+/g, " ").trim()} `;
  const compact = raw.replace(/[^a-z0-9]+/g, "");
  const identifiers = new Set([...companyTokens(company), ...(searchResultCompanyAliases[company] || [])]);
  const fullName = company.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (fullName.length >= 4) identifiers.add(fullName);
  return [...identifiers].some((identifier) => {
    const word = identifier.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return word && (words.includes(` ${word} `) || (word.length >= 4 && compact.includes(word)));
  });
}

const workdayTenantAliases = {
  "AlphaSimplex": ["virtus"],
  "Castleton Commodities International": ["cci", "osvcci"],
  "Nuveen": ["tiaa"],
};

function isPlausibleWorkdaySite(company, siteInfo, pageUrl) {
  const tenant = `${siteInfo.tenant || ""} ${siteInfo.origin || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
  try {
    const pageHost = new URL(pageUrl).hostname.toLowerCase();
    const workdayHost = siteInfo.origin ? new URL(siteInfo.origin).hostname.toLowerCase() : "";
    if (pageHost.endsWith(".myworkdayjobs.com") && pageHost === workdayHost) return true;
  } catch {}
  const identifiers = [
    ...companyTokens(company).filter((token) => token.length >= 3),
    ...(workdayTenantAliases[company] || []),
  ].map((token) => token.replace(/[^a-z0-9]+/g, ""));
  return identifiers.some((token) => token && tenant.includes(token));
}

function extractAtsTokens(text) {
  const greenhouse = new Set();
  const lever = new Set();
  const ashby = new Set();
  const workday = new Map();
  for (const match of text.matchAll(/(?:boards-api|api)\.greenhouse\.io\/v1\/boards\/([^/"'\s?]+)\/jobs/gi)) greenhouse.add(match[1]);
  for (const match of text.matchAll(/(?:boards|job-boards)\.greenhouse\.io\/embed\/[^?"'\s]*\?[^"'\s]*?\bfor=([^&"'\s\\]+)/gi)) greenhouse.add(match[1]);
  for (const match of text.matchAll(/(?:boards|job-boards)\.greenhouse\.io\/embed\/job_board\/js\?[^\s"']*?\bfor=([^&"'\s]+)/gi)) greenhouse.add(match[1]);
  for (const match of text.matchAll(/(?:boards|job-boards)\.greenhouse\.io\/([^/"'\s?#]+)/gi)) {
    if (match[1].toLowerCase() !== "embed") greenhouse.add(match[1]);
  }
  if (/greenhouse/i.test(text)) {
    for (const match of text.matchAll(/(?:boardToken|board_token|greenhouseBoard|greenhouse_board)\s*[:=]\s*["']([a-z0-9_-]+)["']/gi)) greenhouse.add(match[1]);
    for (const match of text.matchAll(/getJobListing\(\s*["']([a-z0-9_-]+)["']/gi)) greenhouse.add(match[1]);
  }
  for (const match of text.matchAll(/api\.lever\.co\/v0\/postings\/([^/"'\s?]+)|jobs\.lever\.co\/([^/"'\s?#]+)/gi)) lever.add(match[1] || match[2]);
  for (const match of text.matchAll(/api\.ashbyhq\.com\/posting-api\/job-board\/([^/"'\s?]+)|jobs\.ashbyhq\.com\/([^/"'\s?#]+)/gi)) ashby.add(match[1] || match[2]);
  if (/ashby/i.test(text)) {
    for (const match of text.matchAll(/ashbySlug\s*[:=]\s*["']([a-z0-9_-]+)["']/gi)) ashby.add(match[1]);
  }
  for (const match of text.matchAll(/tenant:\s*"([^"]+)"[\s\S]*?siteId:\s*"([^"]+)"/gi)) {
    workday.set(`${match[1]}/${match[2]}`, { tenant: match[1], site: match[2] });
  }
  for (const match of text.matchAll(/https?:\/\/([^/"'\s]+\.myworkdayjobs\.com)\/([^/"'\s?#]+)/gi)) {
    const tenant = match[1].split(".")[0];
    workday.set(`${tenant}/${match[2]}`, { tenant, site: match[2], origin: `https://${match[1]}` });
  }
  return { greenhouse: [...greenhouse], lever: [...lever], ashby: [...ashby], workday: [...workday.values()] };
}

function detectUnsupportedAts(text) {
  const systems = {
    icims: /icims\.com/i,
    eightfold: /eightfold\.ai/i,
    oracle: /oraclecloud\.com\/hcmUI|fa\.ocs\.oraclecloud\.com/i,
    phenom: /phenompeople\.com|phenom\.com/i,
    avature: /avature\.net/i,
    brassring: /brassring\.com/i,
    taleo: /taleo\.net/i,
    jobvite: /jobvite\.com/i,
    successfactors: /successfactors\.(?:com|eu)/i,
    workable: /workable\.com/i,
  };
  return Object.entries(systems).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

async function getGreenhouseBoard(company, token, careerPageUrl = "") {
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
  const res = await fetchText(url);
  if (!res.ok) return null;
  let json;
  try { json = JSON.parse(res.text); } catch { return null; }
  const jobs = (json.jobs || []).map((job) => ({
    Company: company,
    Title: job.title || "",
    Department: (job.departments || []).map((department) => department.name).filter(Boolean).join(", "),
    Location: job.location?.name || "",
    URL: job.absolute_url || `https://job-boards.greenhouse.io/${token}/jobs/${job.id}`,
    Source: `Career page Greenhouse:${token}`,
    Status: "Confirmed official posting",
    Notes: [
      careerPageUrl ? `career_page=${careerPageUrl}` : "",
      careerPageUrl ? `company_wrapper=${new URL(`job?gh_jid=${job.id}`, careerPageUrl).toString()}` : "",
      timingMetadata(job.title || "", job.content || ""),
      stripHtml(job.content || ""),
    ].filter(Boolean).join(" | "),
  }));
  return { source: `Greenhouse:${token}`, jobs };
}

async function getLeverBoard(company, token, careerPageUrl = "") {
  const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
  const res = await fetchText(url);
  if (!res.ok) return null;
  let json;
  try { json = JSON.parse(res.text); } catch { return null; }
  if (!Array.isArray(json)) return null;
  const jobs = json.map((job) => ({
    Company: company,
    Title: job.text || "",
    Department: job.categories?.team || job.categories?.department || "",
    Location: job.categories?.location || "",
    URL: job.hostedUrl || job.applyUrl || "",
    Source: `Career page Lever:${token}`,
    Status: "Confirmed official posting",
    Notes: [careerPageUrl ? `career_page=${careerPageUrl}` : "", timingMetadata(job.text || "", `${job.descriptionPlain || ""} ${job.lists?.map((list) => `${list.text} ${list.content}`).join(" ") || ""}`), stripHtml(`${job.descriptionPlain || ""} ${job.lists?.map((list) => `${list.text} ${list.content}`).join(" ") || ""}`)].filter(Boolean).join(" | "),
  }));
  return { source: `Lever:${token}`, jobs };
}

async function getAshbyBoard(company, token, careerPageUrl = "") {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${token}`;
  const res = await fetchText(url);
  if (!res.ok) return null;
  let json;
  try { json = JSON.parse(res.text); } catch { return null; }
  if (!Array.isArray(json.jobs)) return null;
  const jobs = json.jobs.map((job) => ({
    Company: company,
    Title: job.title || "",
    Department: job.department || "",
    Location: (job.locationName || job.location || "").toString(),
    URL: job.jobUrl || `https://jobs.ashbyhq.com/${token}/${job.id}`,
    Source: `Career page Ashby:${token}`,
    Status: "Confirmed official posting",
    Notes: [careerPageUrl ? `career_page=${careerPageUrl}` : "", timingMetadata(job.title || "", job.descriptionHtml || ""), stripHtml(`${job.descriptionHtml || ""} ${job.department || ""} ${job.employmentType || ""}`)].filter(Boolean).join(" | "),
  }));
  return { source: `Ashby:${token}`, jobs };
}

async function getWorkdayBoard(company, siteInfo, careerPageUrl = "") {
  let origin = siteInfo.origin;
  try {
    origin ||= new URL(careerPageUrl).origin;
  } catch {
    return null;
  }
  const url = `${origin}/wday/cxs/${siteInfo.tenant}/${siteInfo.site}/jobs`;
  try {
    const postings = [];
    const limit = 20;
    for (let offset = 0; ; offset += limit) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let json;
      try {
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: { "accept": "application/json", "content-type": "application/json" },
          body: JSON.stringify({ appliedFacets: {}, limit, offset, searchText: "" }),
        });
        if (!res.ok) return null;
        json = await res.json();
      } finally {
        clearTimeout(timeout);
      }
      const page = json.jobPostings || [];
      postings.push(...page);
      if (!page.length || postings.length >= (json.total || postings.length) || page.length < limit) break;
    }
    const jobs = postings.map((job) => ({
      Company: company,
      Title: job.title || "",
      Department: "",
      Location: job.locationsText || "",
      URL: `${origin}/${siteInfo.site}${job.externalPath || ""}`,
      Source: `Career page Workday:${siteInfo.tenant}/${siteInfo.site}`,
      Status: "Confirmed official posting",
      Notes: [careerPageUrl ? `career_page=${careerPageUrl}` : "", job.postedOn || "", ...(job.bulletFields || [])].filter(Boolean).join(" | "),
    }));
    return { source: `Workday:${siteInfo.tenant}/${siteInfo.site}`, jobs };
  } catch {
    return null;
  }
}

function relevantCareerJob(row) {
  const text = `${row.Title} ${row.Location} ${row.Notes}`.toLowerCase();
  const title = row.Title.toLowerCase();
  const roleText = `${row.Title} ${row.Department || ""}`.toLowerCase();
  if (/\b2026\b/.test(title) && !/\b2027\b/.test(title)) return false;
  const isIntern = /\b(intern|internship|summer analyst|summer associate|co-?op|industrial placement)\b/.test(title);
  const hasDomain = /\b(software|swe|developer|development|engineer|engineering|technology|technologist|technical|programmer|programming|platform|backend|back[- ]end|frontend|front[- ]end|full[- ]stack|systems|infrastructure|site reliability|sre|devops|cloud|distributed systems|data engineer|data engineering|machine learning engineer|ml engineer|ai engineer|security engineer|cybersecurity|mobile|ios|android|api|database|fpga|hardware engineer)\b/.test(roleText) || /c\+\+|javascript|typescript|python|java\b/.test(roleText);
  const hasCycle = cycleSignal.test(`${row.Title} ${row.Location} ${row.Notes}`);
  const blockedEducation = /\b(phd|ph\.d|doctoral|doctorate|postdoc|postdoctoral|mba)\b/.test(title) && !/\b(bs|bachelor|undergrad|undergraduate|master|ms)\b/.test(text);
  const blockedFullTime = /\b(new grad|new graduate|graduate programme|graduate program|full[- ]time|experienced|senior|principal|director|vp|vice president|recruiter|recruitment)\b/.test(title) || (/\bgraduate\b/.test(title) && !/\bintern/.test(title));
  const blockedNonSoftware = nonSoftwareSignal.test(`${row.Title} ${row.Department || ""}`) && !/\bsoftware|developer|engineer|technology|swe|programming|platform|backend|frontend|full[- ]stack|infrastructure|sre|devops|machine learning engineer|data engineer|fpga/i.test(roleText);
  return isIntern && hasDomain && hasCycle && !blockedEducation && !blockedFullTime && !blockedNonSoftware;
}

async function scanCareerPage(company, pageUrl) {
  const page = await fetchText(pageUrl);
  let searchable = `${pageUrl}\n${page.url}\n${page.text}`;
  if (page.ok) {
    for (const scriptUrl of extractScriptUrls(page.text, page.url)) {
      const script = await fetchText(scriptUrl);
      if (script.ok) searchable += `\n${script.text}`;
    }
  }
  const tokens = extractAtsTokens(searchable);
  const unsupportedAts = detectUnsupportedAts(searchable);
  const boards = [
    ...(await Promise.all(tokens.greenhouse.map((token) => getGreenhouseBoard(company, token, page.url)))),
    ...(await Promise.all(tokens.lever.map((token) => getLeverBoard(company, token, page.url)))),
    ...(await Promise.all(tokens.ashby.map((token) => getAshbyBoard(company, token, page.url)))),
    ...(await Promise.all(tokens.workday
      .filter((siteInfo) => isPlausibleWorkdaySite(company, siteInfo, page.url))
      .map((siteInfo) => getWorkdayBoard(company, siteInfo, page.url)))),
  ].filter(Boolean);
  const allJobs = boards.flatMap((board) => board.jobs);
  const rows = allJobs.filter(relevantCareerJob);
  return {
    rows,
    audit: {
      company,
      pageUrl,
      resolvedUrl: page.url,
      pageOk: page.ok,
      pageStatus: page.status,
      atsTokens: tokens,
      unsupportedAts,
      boards: boards.map((board) => ({
        source: board.source,
        jobsSeen: board.jobs.length,
        relevantInternships: board.jobs.filter(relevantCareerJob).length,
      })),
      jobsSeen: allJobs.length,
      relevantInternships: rows.length,
    },
  };
}

async function scanCareerPages(db) {
  const tasks = [];
  for (const company of companies) {
    for (const pageUrl of db.companies[company]?.careerPages || []) {
      tasks.push({ company, pageUrl });
    }
  }
  const results = await mapLimit(tasks, 6, async ({ company, pageUrl }) => scanCareerPage(company, pageUrl), "career-page-scan");
  return { rows: results.flatMap((result) => result.rows), tasks, audits: results.map((result) => result.audit) };
}

function companyQueries(company) {
  const quoted = `"${company}"`;
  return [
    `${quoted} 2027 software engineer internship`,
    `${quoted} 2027 software developer intern`,
    `${quoted} 2027 technology summer analyst internship`,
    `${quoted} 2027 engineering internship`,
    `${quoted} careers students software engineering intern 2027`,
  ];
}

async function mapLimit(items, limit, fn, label = "searched") {
  const out = [];
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      if ((i + 1) % 20 === 0) console.error(`${label} ${i + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quote = !quote;
    } else if (ch === "," && !quote) {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function readBaseCsv() {
  try {
    const text = await fs.readFile(baseCsvPath, "utf8");
    const [headerLine, ...lines] = text.trim().split(/\r?\n/);
    const headers = parseCsvLine(headerLine);
    return lines.filter(Boolean).map((line) => {
      const cells = parseCsvLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] || ""]));
    });
  } catch {
    return [];
  }
}

const baseRows = (await readBaseCsv()).map((row) => ({
  Company: row.Company,
  Title: row.Title,
  Location: row.Location,
  URL: row.URL,
  Source: row.Source || "Official ATS/careers page",
  Status: "Confirmed official posting",
  Notes: row.Notes || "",
}));

const searchedAt = new Date().toISOString();
const careerPageDb = await ensureCareerPageDb();
const careerPageScan = await scanCareerPages(careerPageDb);
const careerPageRows = careerPageScan.rows;
const discoveredNested = await mapLimit(companies, 8, async (company) => {
  const companyHits = [];
  const seen = new Set();
  for (const query of companyQueries(company)) {
    const hits = await searchBing(query);
    for (const hit of hits) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      if (!isRelevantResult(hit.title, hit.snippet, hit.url)) continue;
      if (!matchesSearchResultCompany(company, hit)) continue;
      let url = hit.url;
      let title = hit.title;
      let location = "";
      let notes = hit.snippet;

      if (/^https?:\/\/openquant\.co\/job\//i.test(hit.url)) {
        const normalized = await normalizeOpenQuantHit(hit.url);
        if (normalized?.canonicalUrl) {
          url = normalized.canonicalUrl;
          title = normalized.title || title;
          location = normalized.location || location;
          const posted = normalized.datePosted ? `openquant_datePosted=${normalized.datePosted}` : "openquant_datePosted=unknown";
          notes = [`openquant_url=${normalized.openQuantUrl}`, posted, notes].filter(Boolean).join(" | ");
        }
      }

      const sourceType = classifySource(company, url);
      const confidence = sourceType === "Official posting/page" ? "Likely official; verify application form" : "Aggregator/web lead; verify on official site";
      companyHits.push({
        Company: company,
        Title: title,
        Location: location,
        URL: url,
        Source: sourceType,
        Status: confidence,
        Notes: notes,
      });
    }
  }
  return companyHits;
}, "search");

const manualLeads = [
  {
    Company: "AQR Capital Management",
    Title: "AQR internship program page",
    Location: "Greenwich / other AQR offices",
    URL: "https://www.aqr.com/about-us/our-internship-program",
    Source: "Official internship page",
    Status: "Official program page; roles/application timing should be checked on careers.aqr.com",
    Notes: "AQR says internship applications for the coming summer are live on its careers page beginning June 30 to mid-August; summer interns frequently join Research and Portfolio Management plus Portfolio Implementation, Trading, and Portfolio Finance.",
  },
  {
    Company: "AQR Capital Management",
    Title: "2027 Research Summer Analyst",
    Location: "Greenwich, CT",
    URL: "https://www.efinancialcareers.com/jobs-USA-CT-Greenwich-2027_Research_Summer_Analyst.id24267297",
    Source: "Web-discovered posting/lead",
    Status: "Aggregator/web lead; verify on official site",
    Notes: "eFinancialCareers listing says AQR is looking for undergraduates to join as Summer Research Analysts.",
  },
  {
    Company: "AQR Capital Management",
    Title: "2027 Research Product Specialist Summer Analyst",
    Location: "Greenwich, CT",
    URL: "https://www.efinancialcareers.com/jobs-United_States-Greenwich-2027_Research_Product_Specialist_Summer_Analyst.id24267379",
    Source: "Web-discovered posting/lead",
    Status: "Aggregator/web lead; verify on official site",
    Notes: "Separate from AQR's Research internship; still research/product/quant-adjacent.",
  },
  {
    Company: "AQR Capital Management",
    Title: "2027 Portfolio Implementation, Trading and Portfolio Finance Summer Analyst",
    Location: "Greenwich, CT",
    URL: "https://www.efinancialcareers.com/jobs-United_States-Greenwich-2027_Portfolio_Implementation_Trading_and_Portfolio_Finance_Summer_Analyst.id24267490",
    Source: "Web-discovered posting/lead",
    Status: "Aggregator/web lead; verify on official site",
    Notes: "AQR team owns construction, optimization, management, trade execution, and financing of systematic portfolios; listing says summer analyst role includes portfolio construction, implementation research, model research, and analytics.",
  },
  {
    Company: "AQR Capital Management",
    Title: "2027 Risk Summer Analyst",
    Location: "Greenwich, CT",
    URL: "https://www.efinancialcareers.com/jobs-United_States-Greenwich-2027_Risk_Summer_Analyst.id24267213",
    Source: "Web-discovered posting/lead",
    Status: "Aggregator/web lead; verify on official site",
    Notes: "Quant/risk-adjacent summer analyst role; listing mentions research/development of risk methodologies and quantitative investigations.",
  },
  {
    Company: "AQR Capital Management",
    Title: "2027 Engineering Summer Analyst",
    Location: "Greenwich, CT",
    URL: "https://www.dice.com/job-detail/11fc0876-bd30-4755-add9-f93c4c21522f",
    Source: "Web-discovered posting/lead",
    Status: "Aggregator/web lead; verify on official site",
    Notes: "AQR enterprise engineering summer analyst lead; verify on AQR careers for the exact team and application form.",
  },
  {
    Company: "BlackRock",
    Title: "2027 Summer Internship Program - AMERS",
    Location: "Multiple Americas offices",
    URL: "https://careers.blackrock.com/job/new-york/2027-summer-internship-program-amers/45831/90628276544",
    Source: "Official careers page",
    Status: "Official broad program; select quant-relevant functions in application",
    Notes: "Official page says applications are open and candidates can apply to functions such as Investment Research and Analytics & Modeling.",
  },
  {
    Company: "Goldman Sachs",
    Title: "2027 | Americas | New York City Area | Wealth Management, Quantitative Finance | Summer Analyst",
    Location: "New York",
    URL: "https://higher.gs.com/roles/155800",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Goldman Sachs Higher role page; Summer Analyst program for bachelor's/graduate degree students.",
  },
  {
    Company: "Goldman Sachs",
    Title: "2027 | APEJ | Singapore | FICC and Equities (Sales and Trading) Quantitative Strats | Summer Analyst",
    Location: "Singapore",
    URL: "https://higher.gs.com/roles/170600",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Goldman Sachs Higher role page; quantitative strategists construct quantitative models for global markets.",
  },
  {
    Company: "J.P. Morgan",
    Title: "Markets Summer Analyst Program",
    Location: "Varies by open location",
    URL: "https://careers.jpmorgan.com/us/en/students/programs/markets-summer-analyst",
    Source: "Official program page",
    Status: "Official broad program; check currently open locations",
    Notes: "JPM page describes work on market strategies, complex mathematical models, machine learning techniques, and trading simulations.",
  },
  {
    Company: "J.P. Morgan",
    Title: "Asset Management Summer Analyst Program",
    Location: "Varies by open location",
    URL: "https://careers.jpmorgan.com/US/en/students/programs/asset-management-summer-analyst",
    Source: "Official program page",
    Status: "Official broad program; check currently open locations",
    Notes: "JPM page says interns research, analyze, and develop investment strategies and models; useful for quant asset-management track.",
  },
  {
    Company: "Bank of America",
    Title: "Global Risk Summer 2027 Analyst",
    Location: "Charlotte, NC; New York; additional locations",
    URL: "https://careers.bankofamerica.com/en-us/students/job-detail/14334/-global-risk-summer-2027-analyst-multiple-locations",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Bank of America student posting; 10-week Global Risk Development Summer Analyst Program.",
  },
  {
    Company: "Bank of America",
    Title: "Corporate Audit Summer 2027 Analyst",
    Location: "Charlotte, NC; Dallas, TX; Pennington, NJ; additional locations",
    URL: "https://careers.bankofamerica.com/en-us/students/job-detail/14335/corporate-audit-summer-2027-analyst-multiple-locations",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Bank of America student posting; 10-week Corporate Audit Summer Analyst Program.",
  },
  {
    Company: "Citi",
    Title: "Markets - Sales and Trading, Summer Analyst, New York City - US, 2027",
    Location: "New York, NY",
    URL: "https://jobs.citi.com/job/new-york/markets-sales-and-trading-summer-analyst-new-york-city-us-2027/287/89809477504",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Citi careers page for 2027 Markets summer analyst role.",
  },
  {
    Company: "Goldman Sachs",
    Title: "2027 Summer Analyst Program - Americas",
    Location: "Americas",
    URL: "https://www.goldmansachs.com/careers/students/programs-and-internships/americas/2027-summer-analyst-program",
    Source: "Official program page",
    Status: "Official broad program; select division/location in application",
    Notes: "Official Goldman Sachs program page says applications are open for Summer 2027.",
  },
  {
    Company: "Wells Fargo",
    Title: "2027 Summer Internship, Early Careers - Corporate Banking",
    Location: "Charlotte, NC; New York, NY",
    URL: "https://www.wellsfargojobs.com/fr/jobs/r-512832/2027-summer-internship-early-careers-corporate-banking/",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Wells Fargo early careers posting for 2027 Corporate Banking summer analyst internship.",
  },
  {
    Company: "Wells Fargo",
    Title: "2027 CIB Markets - Summer Internship, Early Careers",
    Location: "Charlotte, NC; Houston, TX; New York, NY; California posting also available",
    URL: "https://www.wellsfargojobs.com/en/university-programs/",
    Source: "Official early careers page",
    Status: "Official broad program; check currently open locations",
    Notes: "Wells Fargo early careers page lists 2027 CIB Markets and other Summer 2027 internships.",
  },
  {
    Company: "Wells Fargo",
    Title: "2027 Summer Internship, Early Careers - CIB Commercial Real Estate",
    Location: "New York, NY; Charlotte, NC; Chicago, IL; Dallas, TX",
    URL: "https://www.wellsfargojobs.com/fr/jobs/r-511357/2027-summer-internship-early-careers-cib-commercial-real-estate/",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Wells Fargo early careers posting for 2027 Commercial Real Estate summer analyst internship.",
  },
  {
    Company: "Wells Fargo",
    Title: "2027 Summer Internship, Early Careers - Investment Banking (Houston)",
    Location: "Houston, TX",
    URL: "https://www.wellsfargojobs.com/fr-ca/jobs/r-507805/2027-summer-internship-early-careers-investment-banking-houston/",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Wells Fargo early careers posting for 2027 Investment Banking summer analyst internship.",
  },
  {
    Company: "Wells Fargo",
    Title: "2027 Summer Internship, Early Careers - Corporate & Investment Banking COO",
    Location: "Charlotte, NC",
    URL: "https://www.wellsfargojobs.com/en/jobs/r-548718/2027-summer-internship-early-careers-corporate-investment-banking-chief-operating-office-coo/",
    Source: "Official careers page",
    Status: "Confirmed official posting",
    Notes: "Official Wells Fargo early careers posting, published June 2026.",
  },
  {
    Company: "Blackstone",
    Title: "Summer Internship Program",
    Location: "Varies by group/location",
    URL: "https://www.blackstone.com/careers/students/",
    Source: "Official internship page",
    Status: "Official program page; check open positions",
    Notes: "Official Blackstone students page describes Summer Analyst and Associate internship timelines and applications.",
  },
  {
    Company: "New York Life",
    Title: "Student Internships",
    Location: "Varies by internship track",
    URL: "https://www.newyorklife.com/careers/corporate/internships",
    Source: "Official internship page",
    Status: "Official program page; check current openings",
    Notes: "Official New York Life internships page lists actuarial, finance, investments, AI/data, technology, and related internship tracks.",
  },
];

const rowsByUrl = new Map();
const officialTitleIdentities = new Set();
const companiesWithEnumeratedRows = new Set([...careerPageRows, ...baseRows].map((row) => row.Company));
const discoveredRows = discoveredNested.flat().filter((row) => !companiesWithEnumeratedRows.has(row.Company));
for (const row of [...careerPageRows, ...baseRows, ...discoveredRows, ...manualLeads]) {
  if (!row.URL) continue;
  const urlKey = row.URL.toLowerCase();
  if (rowsByUrl.has(urlKey)) continue;
  if (!relevantCareerJob(row)) continue;
  if (row.Company !== "AQR Capital Management" && /\bAQR\b|AQR Capital/i.test(`${row.Title} ${row.Notes} ${row.URL}`)) continue;
  if (row.Company !== "IMC Financial Markets" && /IMC Trading|www\.imc\.com/i.test(`${row.Title} ${row.Notes} ${row.URL}`)) continue;
  if (row.Company !== "J.P. Morgan" && /jpmorgan|jpmorganchase/i.test(`${row.Title} ${row.Notes} ${row.URL}`)) continue;
  row.Title = row.Title.replace(/\s+null$/i, "").trim();
  const titleIdentityKey = `${row.Company}\n${row.Title}`.toLowerCase();
  const isOfficial = /official|career page/i.test(`${row.Source} ${row.Status}`) && !/aggregator|web lead/i.test(`${row.Source} ${row.Status}`);
  if (!isOfficial && companiesWithEnumeratedRows.has(row.Company)) continue;
  if (!isOfficial && officialTitleIdentities.has(titleIdentityKey)) continue;
  if (row.Notes?.length > 900) row.Notes = `${row.Notes.slice(0, 900)}...`;
  rowsByUrl.set(urlKey, row);
  if (isOfficial) officialTitleIdentities.add(titleIdentityKey);
}

async function readKnownBoardCoverage() {
  try {
    const audit = JSON.parse(await fs.readFile("data/quant_internship_scan_audit.json", "utf8"));
    return new Map((audit.companyAudits || [])
      .filter((entry) => (entry.resolvedBoards || []).length > 0)
      .map((entry) => [entry.company, entry.jobsSeen || 0]));
  } catch {
    return new Map();
  }
}

const rows = [...rowsByUrl.values()].sort((a, b) => a.Company.localeCompare(b.Company) || a.Title.localeCompare(b.Title));
const companiesWithoutRows = companies.filter((company) => !rows.some((row) => row.Company === company)).sort();
const enumeratedCoverage = await readKnownBoardCoverage();
for (const audit of careerPageScan.audits) {
  if ((audit.boards || []).length > 0) {
    enumeratedCoverage.set(audit.company, Math.max(enumeratedCoverage.get(audit.company) || 0, audit.jobsSeen || 0));
  }
}
const companiesWithUnsupportedAts = new Set(careerPageScan.audits.filter((audit) => (audit.unsupportedAts || []).length > 0).map((audit) => audit.company));
const confirmedNoOpenPostings = companiesWithoutRows.filter((company) => enumeratedCoverage.has(company) && enumeratedCoverage.get(company) === 0 && !companiesWithUnsupportedAts.has(company));
const confirmedNoMatchingRoles = companiesWithoutRows.filter((company) => (enumeratedCoverage.get(company) || 0) > 0 && !companiesWithUnsupportedAts.has(company));
const couldNotFullyVerify = companiesWithoutRows.filter((company) => !enumeratedCoverage.has(company) || companiesWithUnsupportedAts.has(company));
const csv = [
  ["Company", "Title", "Location", "URL", "Source", "Status", "Notes"].map(csvEscape).join(","),
  ...rows.map((row) => ["Company", "Title", "Location", "URL", "Source", "Status", "Notes"].map((key) => csvEscape(row[key])).join(",")),
].join("\n");

const md = [
  "# 2027 SWE Internship Open Roles Scan",
  "",
  `Scanned: ${searchedAt}`,
  `Companies searched: ${companies.length}`,
  `Rows/leads retained: ${rows.length}`,
  "",
  "Scope: QJS company universe: original quant firms plus broader US financial services companies. The scan refreshes company career-page discovery every run, scans official career/ATS pages, then adds broader web-discovered postings. A retained row must look like a 2027-cycle internship and a software/technology/engineering role.",
  "",
  "Status guide:",
  "- Confirmed official posting: direct role from official ATS/careers page.",
  "- Likely official; verify application form: search result appears to be on an official company domain.",
  "- Aggregator/web lead; verify on official site: posting surfaced on a job board or aggregator and needs confirmation before applying.",
  "- Official program page: useful application timing/team information, not necessarily a specific open role.",
  "",
  "## Roles And Leads",
  "",
  rows.map((row) => `- **${row.Company}** - [${row.Title}](${row.URL})${row.Location ? ` - ${row.Location}` : ""} - ${row.Status} (${row.Source})${row.Notes ? `: ${row.Notes}` : ""}`).join("\n"),
  "",
  "## Confirmed: Enumerated Source Reports No Open Postings",
  "",
  "A successfully enumerated official ATS/feed returned zero open postings.",
  "",
  confirmedNoOpenPostings.length ? confirmedNoOpenPostings.map((company) => `- ${company}`).join("\n") : "_None._",
  "",
  "## Confirmed: Open Postings Exist, None Matched",
  "",
  "An enumerated official source returned open postings, but none matched this scan's internship scope.",
  "",
  confirmedNoMatchingRoles.length ? confirmedNoMatchingRoles.map((company) => `- ${company}`).join("\n") : "_None._",
  "",
  "## Unverified: Could Not Fully Enumerate",
  "",
  "The company was searched, but no official source was successfully enumerated; absence of a retained role is not evidence that none exists.",
  "",
  couldNotFullyVerify.length ? couldNotFullyVerify.map((company) => `- ${company}`).join("\n") : "_None._",
  "",
].join("\n");

await fs.writeFile("reports/swe_2027_internship_scan.csv", csv, "utf8");
await fs.writeFile("reports/swe_2027_internship_scan.md", md, "utf8");
await fs.writeFile("data/swe_2027_internship_scan_raw.json", JSON.stringify({ searchedAt, companies, careerPageDb, careerPageScanTasks: careerPageScan.tasks, careerPageScanAudits: careerPageScan.audits, careerPageRows, rows, companiesWithoutRows, confirmedNoOpenPostings, confirmedNoMatchingRoles, couldNotFullyVerify }, null, 2), "utf8");
await fs.writeFile("data/swe_2027_internship_scan_audit.json", JSON.stringify({
  searchedAt,
  companies,
  companiesWithoutKnownCareerPage: companies.filter((company) => !(careerPageDb.companies[company]?.careerPages || []).length),
  careerPageScanAudits: careerPageScan.audits,
}, null, 2), "utf8");

console.log(`companies=${companies.length} careerPages=${careerPageScan.tasks.length} careerPageRows=${careerPageRows.length} rows=${rows.length}`);
console.log("wrote swe_2027_internship_scan.csv, swe_2027_internship_scan.md, swe_2027_internship_scan_raw.json, swe_2027_internship_scan_audit.json");
