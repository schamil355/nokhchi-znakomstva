import { getRefreshDelay } from "../src/components/guardedPhoto.utils";

describe("GuardedPhoto helpers", () => {
  it("never refreshes sooner than 30s", () => {
    expect(getRefreshDelay(10)).toBe(30_000);
  });

  it("subtracts safety margin from ttl", () => {
    expect(getRefreshDelay(200)).toBe((200 * 1000) - 15_000);
  });
});
