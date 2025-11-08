import { fetchBlockedIds, sendSwipeAction } from "../../features/discovery/service";
import { invokeNotify } from "../../lib/notifications";

jest.mock("../../lib/notifications", () => ({
  invokeNotify: jest.fn().mockResolvedValue(undefined),
}));

const likeInsertMock = jest.fn();
const matchSelectMock = jest.fn();
const matchEqFirstMock = jest.fn();
const matchEqSecondMock = jest.fn();
const matchMaybeSingleMock = jest.fn();
const blockEqMock = jest.fn();
const blockSelectMock = jest.fn();
const functionsInvokeMock = jest.fn();

const resetSupabaseMocks = () => {
  likeInsertMock.mockReset();
  matchSelectMock.mockReset();
  matchEqFirstMock.mockReset();
  matchEqSecondMock.mockReset();
  matchMaybeSingleMock.mockReset();
  blockEqMock.mockReset();
  blockSelectMock.mockReset();
  functionsInvokeMock.mockReset();

  likeInsertMock.mockReturnValue({
    select: jest.fn().mockReturnValue({
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: "like" }, error: null }),
    }),
  });

  matchMaybeSingleMock.mockResolvedValue({ data: { id: "match-123" }, error: null });
  matchEqSecondMock.mockReturnValue({ maybeSingle: matchMaybeSingleMock });
  matchEqFirstMock.mockReturnValue({ eq: matchEqSecondMock });
  matchSelectMock.mockReturnValue({ eq: matchEqFirstMock });

  blockEqMock.mockResolvedValue({ data: [{ blocked: "abc" }], error: null });
  blockSelectMock.mockReturnValue({ eq: blockEqMock });
  functionsInvokeMock.mockResolvedValue({ data: { allow: true }, error: null });
};

const supabaseMock = {
  from: (table: string) => {
    switch (table) {
      case "blocks":
        return { select: blockSelectMock };
      case "likes":
        return { insert: likeInsertMock };
      case "matches":
        return { select: matchSelectMock };
      default:
        throw new Error(`Unexpected table: ${table}`);
    }
  },
  functions: {
    invoke: functionsInvokeMock,
  },
};

jest.mock("../../lib/supabase", () => ({
  getSupabase: jest.fn(() => supabaseMock),
  storageBucket: jest.fn(),
}));

describe("RLS smoke tests", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    (invokeNotify as jest.Mock).mockClear();
  });

  it("scopes blocked-user lookups to the acting user", async () => {
    const result = await fetchBlockedIds("user-123");
    expect(blockSelectMock).toHaveBeenCalledWith("blocked");
    expect(blockEqMock).toHaveBeenCalledWith("blocker", "user-123");
    expect(result).toEqual(["abc"]);
  });

  it("enforces liker identity and triggers notifications on mutual matches", async () => {
    const response = await sendSwipeAction({
      currentUserId: "user-1",
      targetUserId: "user-2",
      action: "like",
    });

    expect(likeInsertMock).toHaveBeenCalledWith({
      liker: "user-1",
      liked: "user-2",
      is_superlike: false,
    });
    expect(matchSelectMock).toHaveBeenCalledWith("id");
    expect(matchEqFirstMock).toHaveBeenCalledWith("user_a", "user-1");
    expect(matchEqSecondMock).toHaveBeenCalledWith("user_b", "user-2");
    expect(response.matchId).toBe("match-123");
    expect(invokeNotify).toHaveBeenCalledWith({
      type: "match",
      matchId: "match-123",
      receiverId: "user-2",
      actorId: "user-1",
    });
  });
});
