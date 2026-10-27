const knownWrongSources = new Map([
  ["TCI Fund Management", /greenhouse\.io\/(?:twosixtechnologies|tekion|eikontherapeutics)(?:\/|\?|$)/i],
  ["Aureas Finance", /aresmgmt\.wd1\.myworkdayjobs\.com/i],
  ["Campbell and Company", /(?:thecampbellscompany\.com|campbellsoup\.)/i],
]);

export function isKnownWrongCareerPage(company, url = "") {
  return knownWrongSources.get(company)?.test(url) || false;
}
