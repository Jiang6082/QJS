export async function collectWorkdayPostings(fetchPage) {
  const postings = new Map();
  const errors = [];
  const searches = ["", "intern", "internship", "summer analyst", "summer associate", "off cycle internship", "co-op", "industrial placement"];
  for (const searchText of searches) {
    let cap = searchText ? 10000 : 40;
    for (let offset = 0; offset < cap; offset += 20) {
      let page;
      try {
        page = await fetchPage({ searchText, offset, limit: 20 });
        if (!Array.isArray(page.jobPostings)) throw new Error("Invalid Workday page");
      } catch (error) {
        // Preserve earlier pages and continue independent searches after a failure.
        errors.push({ searchText, offset, error: error.message });
        break;
      }
      if (!searchText && Number.isInteger(page.total) && page.total <= 500) cap = 500;
      for (const job of page.jobPostings) postings.set(job.externalPath || `${job.title}|${job.locationsText}`, job);
      if (!page.jobPostings.length || offset + page.jobPostings.length >= page.total) break;
      if (offset + 20 >= cap && searchText) errors.push({ searchText, offset, error: "Pagination limit reached" });
    }
  }
  return { postings: [...postings.values()], searchComplete: errors.length === 0, errors };
}
