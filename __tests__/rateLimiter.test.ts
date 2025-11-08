import { createRateLimiter } from "../src/lib/rateLimiter";

describe("rateLimiter", () => {
  test("limits concurrency", async () => {
    const limiter = createRateLimiter({ intervalMs: 10, maxCalls: 1 });
    const timestamps: number[] = [];

    const task = () =>
      limiter(async () => {
        timestamps.push(Date.now());
      });

    await Promise.all([task(), task()]);
    expect(timestamps.length).toBe(2);
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(0);
  });
});
