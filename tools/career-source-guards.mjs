const knownWrongSources = new Map([
  ["Aureas Finance", /aresmgmt\.wd1\.myworkdayjobs\.com/i],
  ["Campbell and Company", /(?:thecampbellscompany\.com|campbellsoup\.)/i],
]);

export function isKnownWrongCareerPage(company, url = "") {
  return knownWrongSources.get(company)?.test(url) || false;
}
