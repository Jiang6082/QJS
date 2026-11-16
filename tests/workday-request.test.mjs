import test from "node:test";
import assert from "node:assert/strict";
import { fetchWorkdayJson } from "../tools/workday-request.mjs";

test("Workday retries rate limits and preserves POST options", async () => {
  const waits = [];
  let calls = 0;
  const result = await fetchWorkdayJson("https://example.test", { method: "POST", body: "{}" }, {
    fetch: async (url, options) => {
      assert.equal(options.method, "POST");
      assert.equal(options.body, "{}");
      return ++calls === 1 ? new Response("", { status: 429, headers: { "retry-after": "12" } }) : Response.json({ total: 1 });
    },
    sleep: async ms => waits.push(ms),
  });
  assert.deepEqual(result, { total: 1 });
  assert.deepEqual(waits, [12000]);
});

test("Workday persistent rate limits remain failures after bounded retries", async () => {
  let calls = 0;
  await assert.rejects(fetchWorkdayJson("https://example.test", {}, {
    fetch: async () => { calls++; return new Response("", { status: 429 }); },
    sleep: async () => {},
  }), /HTTP 429/);
  assert.equal(calls, 3);
});

test("Workday does not retry permanent errors or excessive Retry-After", async () => {
  for (const status of [404, 429]) {
    await assert.rejects(fetchWorkdayJson("https://example.test", {}, {
      fetch: async () => new Response("", { status, headers: { "retry-after": "120" } }),
      sleep: async () => assert.fail("unexpected retry"),
    }), /HTTP/);
  }
});
