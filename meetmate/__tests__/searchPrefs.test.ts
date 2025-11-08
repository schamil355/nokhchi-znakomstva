jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

import { getSupabase } from "../lib/supabase";
import {
  getMySearchPrefs,
  updateSearchPrefs,
} from "../features/preferences/useSearchPrefs";

const mockGetSupabase = getSupabase as jest.Mock;

const VIEWER_ID = "00000000-0000-0000-0000-000000000001";
const FIXED_DATE = "2024-01-01T00:00:00.000Z";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getMySearchPrefs", () => {
  it("returns existing preferences without inserting", async () => {
    const selectMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        user_id: VIEWER_ID,
        region_mode: "EUROPE",
        updated_at: FIXED_DATE,
      },
      error: null,
    });

    const eq = jest.fn().mockReturnValue({ maybeSingle: selectMaybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const insert = jest.fn(() => {
      throw new Error("Insert should not be called");
    });

    mockGetSupabase.mockReturnValue({
      from: jest.fn().mockImplementation(() => ({
        select,
        insert,
        upsert: jest.fn(),
      })),
    });

    const result = await getMySearchPrefs(VIEWER_ID);

    expect(result).toEqual({
      userId: VIEWER_ID,
      regionMode: "EUROPE",
      updatedAt: FIXED_DATE,
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("creates default preferences when none exist", async () => {
    const selectMaybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const insertMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        user_id: VIEWER_ID,
        region_mode: "NEARBY",
        updated_at: FIXED_DATE,
      },
      error: null,
    });

    const eq = jest.fn().mockReturnValue({ maybeSingle: selectMaybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const insertSelect = jest.fn().mockReturnValue({ maybeSingle: insertMaybeSingle });
    const insert = jest.fn().mockReturnValue({ select: insertSelect });

    mockGetSupabase.mockReturnValue({
      from: jest.fn().mockImplementation(() => ({
        select,
        insert,
        upsert: jest.fn(),
      })),
    });

    const result = await getMySearchPrefs(VIEWER_ID);

    expect(insert).toHaveBeenCalledWith({ user_id: VIEWER_ID, region_mode: "NEARBY" });
    expect(result).toEqual({
      userId: VIEWER_ID,
      regionMode: "NEARBY",
      updatedAt: FIXED_DATE,
    });
  });
});

describe("updateSearchPrefs", () => {
  it("upserts new region mode", async () => {
    const upsertMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        user_id: VIEWER_ID,
        region_mode: "CHECHNYA",
        updated_at: FIXED_DATE,
      },
      error: null,
    });

    const upsertSelect = jest.fn().mockReturnValue({ maybeSingle: upsertMaybeSingle });
    const upsert = jest.fn().mockReturnValue({ select: upsertSelect });

    mockGetSupabase.mockReturnValue({
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn(),
        insert: jest.fn(),
        upsert,
      })),
    });

    const result = await updateSearchPrefs(VIEWER_ID, { regionMode: "CHECHNYA" });

    expect(upsert).toHaveBeenCalledWith(
      { user_id: VIEWER_ID, region_mode: "CHECHNYA" },
      { onConflict: "user_id" },
    );
    expect(result.regionMode).toBe("CHECHNYA");
  });
});
