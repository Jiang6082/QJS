import { setTimeout as sleep } from "node:timers/promises";

export async function fetchWorkdayJson(url, options = {}, dependencies = {}) {
  const request = dependencies.fetch || fetch;
  const wait = dependencies.sleep || sleep;
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await request(url, { ...options, signal: AbortSignal.timeout(20000) });
    } catch (error) {
      if (attempt === 2) throw error;
      await wait(5000 * 2 ** attempt);
      continue;
    }
    if (response.ok) return response.json();
    const retryable = response.status === 429 || response.status >= 500;
    const retryAfter = response.headers.get("retry-after");
    await response.body?.cancel();
    if (!retryable || attempt === 2) throw new Error(`HTTP ${response.status}`);
    const seconds = retryAfter === null ? NaN : Number(retryAfter);
    const requestedDelay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
    const delay = Math.max(5000 * 2 ** attempt, Number.isFinite(requestedDelay) ? requestedDelay : 0);
    // Do not retry earlier than the server permits, or wait without a bound.
    if (delay > 60000) throw new Error(`HTTP ${response.status}: retry-after exceeds retry budget`);
    await wait(delay);
  }
}
