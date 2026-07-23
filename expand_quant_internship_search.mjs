import fs from "node:fs/promises";
import { groupedRoleMarkdown, regionForLocation } from "./tools/regions.mjs";
import { isKnownWrongCareerPage } from "./tools/career-source-guards.mjs";

const baseCsvPath = "reports/quant_internship_roles_scan.csv";
const careerPageDbPath = "company_career_pages.json";
const firmRosterPath = "quant_firm_roster.json";
const firmRoster = JSON.parse(await fs.readFile(firmRosterPath, "utf8"));
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

const companies = [...new Set([...originalCompanies, ...expandedCompanies, ...rosterCompanies])];

const officialDomains = {
  "AQR Capital Management": ["aqr.com", "careers.aqr.com"],
  "Acadian Asset Management": ["acadian-asset.com"],
  AllianceBernstein: ["alliancebernstein.com"],
  BlackRock: ["blackrock.com", "blackrock.tal.net"],
  BlueCove: ["bluecove.com"],
  "BNP Paribas": ["group.bnpparibas", "bnpparibas.com"],
  Barclays: ["search.jobs.barclays", "barclays.com"],
  "Bridgewater Associates": ["bridgewater.com"],
  Capula: ["capula.com", "apply.workable.com"],
  Citi: ["jobs.citi.com"],
  "D. E. Shaw": ["deshaw.com", "campus.deshaw.com"],
  "DE Shaw": ["deshaw.com", "campus.deshaw.com"],
  "Dimensional Fund Advisors": ["dimensional.com"],
  "Fidelity Investments": ["fidelity.com", "jobs.fidelity.com"],
  "Goldman Sachs": ["goldmansachs.com", "higher.gs.com"],
  "Hudson River Trading": ["hudsonrivertrading.com"],
  "Jane Street": ["janestreet.com"],
  "J.P. Morgan": ["jpmorgan.com", "careers.jpmorgan.com"],
  "Morgan Stanley": ["morganstanley.com"],
  Optiver: ["optiver.com"],
  PGIM: ["pgim.com"],
  PIMCO: ["pimco.com"],
  Robeco: ["robeco.com"],
  "State Street Global Advisors": ["statestreet.com"],
  "Susquehanna International Group": ["sig.com", "careers.sig.com"],
  "Teza Technologies": ["teza.com"],
  UBS: ["ubs.com"],
  Vanguard: ["vanguardjobs.com", "vanguard.com"],
  "Walleye Capital": ["walleyecapital.com", "job-boards.greenhouse.io"],
  "Wellington Management": ["wellington.com"],
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
  "Jane Street": ["https://www.janestreet.com/join-jane-street/open-roles/?type=students-and-new-grads"],
  "Chicago Trading Company": ["https://job-boards.greenhouse.io/ctccampusboard"],
  "Qube Research & Technologies": ["https://www.qube-rt.com/careers/"],
  "Radix Trading": ["https://job-boards.greenhouse.io/radixuniversity"],
  "TransMarket Group": ["https://job-boards.greenhouse.io/transmarketgroup"],
  "Teza Technologies": ["https://www.teza.com/careers/"],
  Voloridge: ["https://job-boards.greenhouse.io/voloridgeinvestmentmanagement"],
  "Walleye Capital": ["https://job-boards.greenhouse.io/walleyecapital-external-students"],
};

const seedAtsTokens = {
  "Chicago Trading Company": { greenhouse: ["ctccampusboard"] },
  "Hudson River Trading": { greenhouse: ["wehrtyou"] },
  "Stevens Capital Management": { greenhouse: ["scm"] },
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

const roleSignal = /\b(quant|quantitative|systematic|alpha|research|portfolio|trading|trader|strats?|strategy|strategic|developer|software|engineer|machine learning|data science|risk|implementation|model|analytics)\b/i;
const internSignal = /\b(intern|internship|summer analyst|summer associate|co-?op|industrial placement)\b/i;
const yearSignal = /\b(2026|2027|summer)\b/i;
const negativeSignal = /\b(new grad|new graduate|graduate programme|graduate program|full[- ]time|experienced|senior|principal|director|vp|vice president|phd intern|ph\.d\. intern|doctoral|postdoc|mba)\b/i;
const veryBroadFinance = /\b(investment banking|wealth management|audit|accounting|tax|human resources|marketing|sales intern|business development|compliance)\b/i;
const nonTargetInternshipTiming = /\b(?:(?:spring|summer|fall|autumn|winter|january|february|march|april|may|june|july|august|september|october|november|december)\s*202[0-6]|202[0-6]\s*(?:spring|summer|fall|autumn|winter))\b/i;
const stalePostingDate = /\b(?:datePosted=202[0-5]|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},\s+202[0-5])\b/i;

function hasNonTargetInternshipTiming(title = "", notes = "") {
  if (nonTargetInternshipTiming.test(`${title} ${notes}`)) return true;
  return /\b202[0-6]\b/.test(title) && internSignal.test(title);
}

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
  if (!internSignal.test(text) || !roleSignal.test(text)) return false;
  if (hasNonTargetInternshipTiming(title, snippet) || stalePostingDate.test(snippet)) return false;
  if (negativeSignal.test(text) && !/\bBS\/MS|Bachelor|undergrad|undergraduate|master/i.test(text)) return false;
  if (veryBroadFinance.test(text) && !/\bquant|systematic|research|portfolio implementation|trading|risk|strats?|strategy|strategic|analytics|model|developer|software|machine learning/i.test(text)) return false;
  if (/linkedin\.com/i.test(url) && !/linkedin\.com\/jobs\//i.test(url)) return false;
  if (/reddit\.com|wikipedia\.org|\.edu(?:\/|$)|pdf$|youtube\.com|facebook\.com|wallstreetoasis\.com|thewallstreetquants\.com/i.test(url)) return false;
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

  // Saved pages are visited every run. Discovery is only needed until a company has
  // at least one page; this keeps the expanded roster practical without weakening scans.
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
  const isIntern = /\b(intern|internship|summer analyst|summer associate|co-?op|industrial placement)\b/.test(title)
    || /^(?:internship|co-op|industrial placement year)\b/i.test((row.Notes || "").trim());
  const hasDomain = /\b(quant|quantitative|systematic|alpha|research|portfolio|trading|trader|strats?|strategy|strategic|developer|software|engineer|technology|devops|site reliability|sre|infrastructure|data science|machine learning|risk|implementation|model|analytics|fpga)\b/.test(roleText) || /c\+\+/i.test(roleText);
  const blockedEducation = /\b(phd|ph\.d|doctoral|doctorate|postdoc|postdoctoral|mba)\b/.test(title) && !/\b(bs|bachelor|undergrad|undergraduate|master|ms)\b/.test(text);
  const blockedFullTime = /\b(new grad|new graduate|graduate programme|graduate program|full[- ]time|experienced|senior|principal|director|vp|vice president|recruiter|recruitment)\b/.test(title) || (/\bgraduate\b/.test(title) && !/\bintern/.test(title));
  const blockedTiming = hasNonTargetInternshipTiming(row.Title, row.Notes || "");
  const staleWebLead = /web-discovered|aggregator/i.test(`${row.Source} ${row.Status}`) && stalePostingDate.test(row.Notes || "");
  return isIntern && hasDomain && !blockedEducation && !blockedFullTime && !blockedTiming && !staleWebLead;
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
  const seededTokens = seedAtsTokens[company] || {};
  tokens.greenhouse = [...new Set([...tokens.greenhouse, ...(seededTokens.greenhouse || [])])];
  tokens.lever = [...new Set([...tokens.lever, ...(seededTokens.lever || [])])];
  tokens.ashby = [...new Set([...tokens.ashby, ...(seededTokens.ashby || [])])];
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

const janeStreetCityNames = {
  NYC: "New York",
  LDN: "London",
  HKG: "Hong Kong",
  AMS: "Amsterdam",
  CHI: "Chicago",
  SGP: "Singapore",
  MUM: "Mumbai",
  SHA: "Shanghai",
  PHL: "Philadelphia",
  SF: "San Francisco",
  ATX: "Austin",
  "NYC/HKG": "New York/Hong Kong",
};

function normalizeJaneStreetType(availability = "") {
  const text = availability.toLowerCase();
  if (text.includes("co-op")) return "Co-Op";
  if (text.includes("industrial placement year")) return "Industrial Placement Year";
  if (text.includes("full-time")) return availability;
  return "Internship";
}

function relevantJaneStreetStudentJob(job) {
  const roleText = `${job.position} ${job.department}`.toLowerCase();
  return /\b(quant|quantitative|research|trading|trader|software|engineer|technology|network|machine learning|strats?|strategy|strategic|product|operations|tools|compilers|fpga)\b/.test(roleText);
}

async function getJaneStreetStudentRows() {
  const [jobsRes, dirsRes] = await Promise.all([
    fetchText("https://www.janestreet.com/jobs/main.json"),
    fetchText("https://www.janestreet.com/static/position-directories.json"),
  ]);
  if (!jobsRes.ok || !dirsRes.ok) return [];

  let jobs;
  let directories;
  try {
    jobs = JSON.parse(jobsRes.text);
    directories = JSON.parse(dirsRes.text);
  } catch {
    return [];
  }

  const directoryIds = new Set(directories.map(String));
  return jobs
    .filter((job) => directoryIds.has(String(job.id)))
    .map((job) => ({
      id: job.id,
      position: decodeHtml(job.position || ""),
      location: decodeHtml(job.city || ""),
      type: normalizeJaneStreetType(decodeHtml(job.availability || "")),
      department: decodeHtml(job.category || ""),
      duration: decodeHtml(job.duration || ""),
    }))
    .filter((job) => ["Internship", "Co-Op", "Industrial Placement Year"].includes(job.type))
    .filter(relevantJaneStreetStudentJob)
    .map((job) => ({
      Company: "Jane Street",
      Title: job.position,
      Location: janeStreetCityNames[job.location] || job.location,
      URL: `https://www.janestreet.com/join-jane-street/position/${job.id}/`,
      Source: "Official Jane Street jobs feed",
      Status: "Confirmed official posting",
      Notes: [job.type, job.duration, job.department].filter(Boolean).join("; "),
    }));
}

async function getDeshawInternRows() {
  const careerPageUrl = "https://www.deshaw.com/careers/internships";
  const page = await fetchText(careerPageUrl);
  if (!page.ok) return [];

  const cardPattern = /<div class="job"[^>]*>[\s\S]*?<p class="category">([\s\S]*?)<\/p>[\s\S]*?<span class="location">([\s\S]*?)<\/span>[\s\S]*?<a[^>]+href="(\/careers\/[^\"]+)"[\s\S]*?<span class="job-display-name">([\s\S]*?)<\/span>/gi;
  const rowsByUrl = new Map();
  for (const match of page.text.matchAll(cardPattern)) {
    const row = {
      Company: "D. E. Shaw",
      Title: stripHtml(match[4]),
      Department: stripHtml(match[1]),
      Location: stripHtml(match[2]),
      URL: new URL(match[3], page.url).href,
      Source: "Official D. E. Shaw internships page",
      Status: "Confirmed official posting",
      Notes: `career_page=${careerPageUrl}`,
    };
    if (relevantCareerJob(row)) rowsByUrl.set(row.URL, row);
  }

  return mapLimit([...rowsByUrl.values()], 4, async (row) => {
    const detail = await fetchText(row.URL);
    const detailText = detail.ok ? stripHtml(detail.text) : "";
    return {
      ...row,
      Notes: [
        row.Notes,
        `department=${row.Department}`,
        timingMetadata(row.Title, detail.text),
        detail.ok ? "official detail page checked" : "official detail page could not be fetched",
        detailText.slice(0, 600),
      ].filter(Boolean).join(" | "),
    };
  }, "deshaw-detail");
}

async function getTwoSigmaInternRows() {
  const careerPageUrl = "https://careers.twosigma.com/careers/OpenRoles/";
  const rowsByUrl = new Map();

  for (let offset = 0; offset < 300; offset += 10) {
    const pageUrl = `${careerPageUrl}?jobRecordsPerPage=10&jobOffset=${offset}`;
    const page = await fetchText(pageUrl);
    if (!page.ok) break;

    const cards = [...page.text.matchAll(/<article class="article article--result"[^>]*>([\s\S]*?)<\/article>/gi)];
    for (const card of cards) {
      const link = card[1].match(/<a class="link" href="([^"]+)">([\s\S]*?)<\/a>/i);
      if (!link) continue;
      const fields = [...card[1].matchAll(/<span class="paragraph_inner-span">([\s\S]*?)<\/span>/gi)].map((match) => stripHtml(match[1]));
      const row = {
        Company: "Two Sigma",
        Title: stripHtml(link[2]),
        Department: fields[1] || "",
        Location: fields[0] || "",
        URL: decodeHtml(link[1]),
        Source: "Official Two Sigma careers portal",
        Status: "Confirmed official posting",
        Notes: [`career_page=${careerPageUrl}`, fields[1] ? `function=${fields[1]}` : "", fields[2] ? `experience=${fields[2]}` : ""].filter(Boolean).join(" | "),
      };
      if (relevantCareerJob(row)) rowsByUrl.set(row.URL, row);
    }

    if (cards.length < 10) break;
  }

  return mapLimit([...rowsByUrl.values()], 4, async (row) => {
    const detail = await fetchText(row.URL);
    const detailText = detail.ok ? stripHtml(detail.text) : "";
    return {
      ...row,
      Notes: [
        row.Notes,
        timingMetadata(row.Title, detail.text),
        detail.ok ? "official detail page checked" : "official detail page could not be fetched",
        detailText.slice(0, 600),
      ].filter(Boolean).join(" | "),
    };
  }, "two-sigma-detail");
}

async function getSigInternRows() {
  const jobs = [];
  const limit = 100;
  for (let page = 1; ; page++) {
    const response = await fetchText(`https://careers.sig.com/api/jobs?limit=${limit}&page=${page}`);
    if (!response.ok) break;
    let payload;
    try { payload = JSON.parse(response.text); } catch { break; }
    jobs.push(...(payload.jobs || []).map((entry) => entry.data || {}).filter((job) => job.slug));
    if (jobs.length >= (payload.totalCount || jobs.length) || (payload.jobs || []).length < limit) break;
  }

  return jobs.map((job) => ({
    Company: "Susquehanna International Group",
    Title: job.title || "",
    Department: [...(job.tags1 || []), ...(job.tags2 || [])].join(", "),
    Location: job.full_location || [job.city, job.state, job.country].filter(Boolean).join(", "),
    URL: `https://careers.sig.com/jobs/${job.slug}?lang=${job.language || "en-us"}`,
    Source: "Official SIG jobs API",
    Status: "Confirmed official posting",
    Notes: [
      job.posted_date ? `posted=${job.posted_date}` : "",
      ...(job.tags3 || []),
      timingMetadata(job.title || "", job.description || ""),
      stripHtml(job.description || ""),
    ].filter(Boolean).join(" | "),
  })).filter(relevantCareerJob);
}

function companyQueries(company) {
  const quoted = `"${company}"`;
  return [
    `${quoted} 2027 internship quantitative research summer analyst`,
    `${quoted} 2027 summer analyst quant portfolio trading research`,
    `${quoted} 2026 2027 software developer intern trading quantitative`,
    `${quoted} careers intern quantitative research portfolio implementation`,
    `${quoted} 2027 summer strategy intern strategic initiatives`,
    `${quoted} careers "strategy intern" "summer analyst"`,
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
const janeStreetRows = await getJaneStreetStudentRows();
const deshawRows = await getDeshawInternRows();
const twoSigmaRows = await getTwoSigmaInternRows();
const sigRows = await getSigInternRows();
const customSourceAudits = [
  { company: "Jane Street", source: "Official jobs feed", jobsRetained: janeStreetRows.length },
  { company: "D. E. Shaw", source: "Official internships page", jobsRetained: deshawRows.length },
  { company: "Two Sigma", source: "Official paginated careers portal", jobsRetained: twoSigmaRows.length },
  { company: "Susquehanna International Group", source: "Official paginated jobs API", jobsRetained: sigRows.length },
];
const careerPageRows = [...careerPageScan.rows, ...janeStreetRows, ...deshawRows, ...twoSigmaRows, ...sigRows];
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
      if (sourceType !== "Official posting/page" && !/\b2027\b/.test(`${title} ${notes}`)) continue;
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
    Company: "Citadel",
    Title: "International Equities Associate - Intern (Europe)",
    Location: "London",
    URL: "https://www.citadel.com/careers/details/international-equities-associate-intern-europe/",
    Source: "Official Citadel careers posting",
    Status: "Confirmed official posting",
    Notes: "Live official application; summer internship in long-short equities investing.",
  },
  {
    Company: "Citadel Securities",
    Title: "Sector Data Analyst - Intern (Europe)",
    Location: "London",
    URL: "https://www.citadelsecurities.com/careers/details/sector-data-analyst-intern-europe/",
    Source: "Official Citadel Securities careers posting",
    Status: "Confirmed official posting",
    Notes: "Live official application; June-August is the signature internship window, with other timing sometimes available.",
  },
  {
    Company: "Capula",
    Title: "2027 Trading and Research Summer Internship",
    Location: "London / New York / Singapore / Hong Kong",
    URL: "https://apply.workable.com/capula-investment-management-ltd/j/A15A62A8BE/",
    Source: "Official Workable posting",
    Status: "Confirmed official posting",
    Notes: "Ten-week internship from June to August 2027; students graduating in 2027 or 2028.",
  },
  {
    Company: "Group One Trading",
    Title: "Trading Analyst Intern",
    Location: "Chicago, IL",
    URL: "https://group1.applicantpro.com/jobs/3859850",
    Source: "Official ApplicantPro posting",
    Status: "Confirmed official posting",
    Notes: "Summer internship from June through August 2027; applicant must remain an active college student in Fall 2027.",
  },
  {
    Company: "Morgan Stanley",
    Title: "2027 Institutional Equity Division Quantitative Finance Summer Analyst / Associate Program",
    Location: "Hong Kong",
    URL: "https://morganstanley.tal.net/vx/lang-en-GB/mobile-0/brand-2/xf-5ae2f1abc6f7/candidate/so/pm/1/pl/1/opp/21270-2027-Institutional-Equity-Division-Quantitative-Finance-Summer-Analyst-Associate-Program-Hong-Kong/en-GB",
    Source: "Official Morgan Stanley campus posting",
    Status: "Confirmed official posting",
    Notes: "Ten-week Summer 2027 program; application deadlines listed as August 16 and September 27, 2026.",
  },
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
];

const rowsByUrl = new Map();
const officialIdentities = new Set();
const officialTitleIdentities = new Set();
const companiesWithEnumeratedRows = new Set([...careerPageRows, ...baseRows].map((row) => row.Company));
const companiesWithEnumeratedSources = new Set([
  ...companiesWithEnumeratedRows,
  ...careerPageScan.audits.filter((audit) => audit.boards.length > 0).map((audit) => audit.company),
  ...customSourceAudits.map((audit) => audit.company),
]);
const discoveredCandidates = discoveredNested.flat().filter((row) => !companiesWithEnumeratedSources.has(row.Company));
const companiesWithOfficialDiscoveredRows = new Set(discoveredCandidates
  .filter((row) => row.Source === "Official posting/page")
  .map((row) => row.Company));
const discoveredRows = discoveredCandidates.filter((row) => row.Source === "Official posting/page" || !companiesWithOfficialDiscoveredRows.has(row.Company));
const manualLeadUrls = new Set(manualLeads.map((row) => row.URL.toLowerCase().replace(/\/$/, "")));
for (const row of [...careerPageRows, ...baseRows, ...manualLeads, ...discoveredRows]) {
  if (!row.URL) continue;
  const urlKey = row.URL.toLowerCase();
  if (rowsByUrl.has(urlKey)) continue;
  if (!manualLeadUrls.has(urlKey.replace(/\/$/, "")) && !relevantCareerJob(row)) continue;
  if (row.Company !== "AQR Capital Management" && /\bAQR\b|AQR Capital/i.test(`${row.Title} ${row.Notes} ${row.URL}`)) continue;
  if (row.Company !== "IMC Financial Markets" && /IMC Trading|www\.imc\.com/i.test(`${row.Title} ${row.Notes} ${row.URL}`)) continue;
  if (row.Company !== "J.P. Morgan" && /jpmorgan|jpmorganchase/i.test(`${row.Title} ${row.Notes} ${row.URL}`)) continue;
  row.Title = row.Title.replace(/\s+null$/i, "").trim();
  const identityKey = `${row.Company}\n${row.Title}\n${row.Location}`.toLowerCase();
  const titleIdentityKey = `${row.Company}\n${row.Title}`.toLowerCase();
  const isOfficial = /official|career page/i.test(`${row.Source} ${row.Status}`) && !/aggregator|web lead/i.test(`${row.Source} ${row.Status}`);
  if (!isOfficial && companiesWithEnumeratedRows.has(row.Company)) continue;
  if (!isOfficial && (officialIdentities.has(identityKey) || officialTitleIdentities.has(titleIdentityKey))) continue;
  if (row.Notes?.length > 900) row.Notes = `${row.Notes.slice(0, 900)}...`;
  rowsByUrl.set(urlKey, row);
  if (isOfficial) {
    officialIdentities.add(identityKey);
    officialTitleIdentities.add(titleIdentityKey);
  }
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
for (const row of rows) row.Region = regionForLocation(row.Location);
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
  ["Company", "Title", "Location", "Region", "URL", "Source", "Status", "Notes"].map(csvEscape).join(","),
  ...rows.map((row) => ["Company", "Title", "Location", "Region", "URL", "Source", "Status", "Notes"].map((key) => csvEscape(row[key])).join(",")),
].join("\n");

const md = [
  "# Quant Internship Open Roles Scan v2",
  "",
  `Scanned: ${searchedAt}`,
  `Companies searched: ${companies.length}`,
  `Rows/leads retained: ${rows.length}`,
  "",
  "Scope: original quant company list plus adjacent systematic/quant asset managers, large asset managers, and bank strats/quant-style programs. Target roles include quant, trading, research, software, engineering, and strategy internships. The scan checks saved company career pages first, then official ATS findings from v1, then broader web-discovered postings.",
  "",
  "Status guide:",
  "- Confirmed official posting: direct role from official ATS/careers page.",
  "- Likely official; verify application form: search result appears to be on an official company domain.",
  "- Aggregator/web lead; verify on official site: posting surfaced on a job board or aggregator and needs confirmation before applying.",
  "- Official program page: useful application timing/team information, not necessarily a specific open role.",
  "",
  "## Roles And Leads By Region",
  "",
  ...groupedRoleMarkdown(rows),
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

await fs.writeFile("reports/quant_internship_roles_scan_v2.csv", csv, "utf8");
await fs.writeFile("reports/quant_internship_roles_scan_v2.md", md, "utf8");
await fs.writeFile("data/quant_internship_roles_scan_v2_raw.json", JSON.stringify({ searchedAt, companies, careerPageDb, careerPageScanTasks: careerPageScan.tasks, careerPageScanAudits: careerPageScan.audits, customSourceAudits, careerPageRows, rows, companiesWithoutRows, confirmedNoOpenPostings, confirmedNoMatchingRoles, couldNotFullyVerify }, null, 2), "utf8");
await fs.writeFile("data/quant_internship_roles_scan_v2_audit.json", JSON.stringify({
  searchedAt,
  companies,
  companiesWithoutKnownCareerPage: companies.filter((company) => !(careerPageDb.companies[company]?.careerPages || []).length),
  careerPageScanAudits: careerPageScan.audits,
  customSourceAudits,
}, null, 2), "utf8");

console.log(`companies=${companies.length} careerPages=${careerPageScan.tasks.length} careerPageRows=${careerPageRows.length} rows=${rows.length}`);
console.log("wrote quant_internship_roles_scan_v2.csv, quant_internship_roles_scan_v2.md, quant_internship_roles_scan_v2_raw.json, quant_internship_roles_scan_v2_audit.json");
