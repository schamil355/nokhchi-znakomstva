import { act } from "@testing-library/react-native";
import { isCooldownActive, useVerificationStore } from "../../meetmate/features/verification/store";

describe("useVerificationStore", () => {
  beforeEach(() => {
    useVerificationStore.getState().reset();
  });

  afterEach(() => {
    useVerificationStore.getState().reset();
  });

  it("marks selfie success with similarity score", () => {
    act(() => {
      useVerificationStore.getState().setSession("session-1");
      useVerificationStore.getState().markSelfieSuccess(0.82);
    });

    const state = useVerificationStore.getState();
    expect(state.status).toBe("selfie_ok");
    expect(state.similarity).toBe(0.82);
  });

  it("enters cooldown after too many selfie attempts", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(0);

    act(() => {
      useVerificationStore.getState().setSession("session-2");
      useVerificationStore.getState().incrementSelfieAttempts("fail-1");
      useVerificationStore.getState().incrementSelfieAttempts("fail-2");
      useVerificationStore.getState().incrementSelfieAttempts("fail-3");
    });

    const { status, selfieAttempts, cooldownUntil, errorMessage } = useVerificationStore.getState();
    expect(status).toBe("failed");
    expect(selfieAttempts).toBe(3);
    expect(errorMessage).toBe("fail-3");
    expect(cooldownUntil).toBe(5 * 60 * 1000);

    nowSpy.mockRestore();
  });
});

describe("isCooldownActive", () => {
  afterEach(() => {
    useVerificationStore.getState().reset();
  });

  it("returns true while in the future", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_000);
    expect(isCooldownActive(5_000)).toBe(true);
    nowSpy.mockRestore();
  });

  it("returns false when expired", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(10_000);
    expect(isCooldownActive(5_000)).toBe(false);
    nowSpy.mockRestore();
  });
});
