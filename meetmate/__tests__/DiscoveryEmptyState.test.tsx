import React from "react";
import { render, act } from "@testing-library/react-native";

import DiscoveryScreen from "../features/discovery/DiscoveryScreen";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
const mockUseQueryClient = jest.fn();
const mockUseSearchPrefs = jest.fn();
const mockUseEntitlements = jest.fn();
const mockUseRegionOffering = jest.fn();
const mockUseSafety = jest.fn();
const mockUseToast = jest.fn();
const mockRankVector = jest.fn();
const mockRankClassic = jest.fn();
const mockFetchBlockedIds = jest.fn();
const mockFetchProfile = jest.fn();
const mockEnsureUserLocation = jest.fn();
const mockGetSupabase = jest.fn();
const mockRouterPush = jest.fn();
const mockSessionState = {
  session: { user: { id: "00000000-0000-0000-0000-000000000001" } },
  user: { id: "00000000-0000-0000-0000-000000000001" },
};

jest.mock("../store/sessionStore", () => ({
  selectSession: (state: typeof mockSessionState) => state.session,
  useSessionStore: (selector: any) =>
    selector ? selector(mockSessionState) : mockSessionState,
}));

jest.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Pan: () => {
      const chain = {
        onChange: () => chain,
        onEnd: () => chain,
      };
      return chain;
    },
  },
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: any) => {
      React.useEffect(() => {
        const cleanup = callback();
        return cleanup;
      }, [callback]);
    },
    useRouter: () => ({
      push: mockRouterPush,
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
      replace: jest.fn(),
    }),
    usePathname: () => "/discovery",
  };
});

jest.mock("../features/preferences/useSearchPrefs", () => ({
  useSearchPrefs: () => mockUseSearchPrefs(),
}));

jest.mock("../features/discovery/service", () => {
  const actual = jest.requireActual("../features/discovery/service");
  return {
    ...actual,
    fetchBlockedIds: (...args: any[]) => mockFetchBlockedIds(...args),
    ensureUserLocation: (...args: any[]) => mockEnsureUserLocation(...args),
    mapPublicProfilesToCandidates: jest.fn(() => Promise.resolve([])),
    sendSwipeAction: jest.fn(),
  };
});

jest.mock("../features/profile", () => ({
  fetchProfileForUser: (...args: any[]) => mockFetchProfile(...args),
  isProfileComplete: jest.fn(() => true),
}));

jest.mock("../features/moderation", () => ({
  REPORT_REASONS: ["spam", "fake"],
  blockUser: jest.fn(),
  submitReport: jest.fn(),
  useSafety: () => mockUseSafety(),
}));

jest.mock("../features/paywall/hooks", () => ({
  useEntitlements: () => mockUseEntitlements(),
}));

jest.mock("../lib/region", () => ({
  useRegionOffering: () => mockUseRegionOffering(),
}));

jest.mock("../components/ToastProvider", () => ({
  useToast: () => mockUseToast(),
}));

jest.mock("../components/theme/ThemeProvider", () => {
  const { Text, View } = require("react-native");
  return {
    useTheme: () => ({
      colors: {
        background: "#fff",
        text: "#000",
        muted: "#666",
        card: "#f5f5f5",
        border: "#e5e5e5",
      },
      spacing: (value: number) => value * 8,
      Text,
      View,
    }),
  };
});

jest.mock("../components/ui", () => {
  const React = require("react");
  const { Text, View, TouchableOpacity } = require("react-native");
  return {
    Avatar: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
    Button: ({ title, onPress }: { title: string; onPress: () => void }) => (
      <TouchableOpacity accessibilityRole="button" onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
    Chip: ({ label }: { label: string }) => (
      <View>
        <Text>{label}</Text>
      </View>
    ),
    EmptyState: ({
      title,
      description,
      actionLabel,
    }: {
      title: string;
      description: string;
      actionLabel: string;
    }) => (
      <View>
        <Text>{title}</Text>
        <Text>{description}</Text>
        <Text>{actionLabel}</Text>
      </View>
    ),
    Skeleton: () => <View testID="skeleton" />,
  };
});

jest.mock("../lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("../lib/location", () => ({
  requestLocation: jest.fn(async () => null),
}));

jest.mock("../lib/matching", () => ({
  rankCandidatesVector: (...args: any[]) => mockRankVector(...args),
  rankCandidatesClassic: (...args: any[]) => mockRankClassic(...args),
}));

jest.mock("../lib/supabase", () => ({
  getSupabase: () => mockGetSupabase(),
}));

jest.mock("../lib/notifications", () => ({
  invokeNotify: jest.fn(),
}));

describe("DiscoveryScreen empty states", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    });
    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
    });
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockUseEntitlements.mockReturnValue({
      entitlements: { unlimitedSwipes: false },
      hasEntitlement: jest.fn(() => false),
      consumeSuperLike: jest.fn(),
      refreshEntitlements: jest.fn(),
    });
    mockUseRegionOffering.mockReturnValue({
      data: { paywallMode: "iap" },
    });
    mockUseSafety.mockReturnValue({
      guardAction: jest.fn(),
    });
    mockUseToast.mockReturnValue({
      showToast: jest.fn(),
    });
    mockRankVector.mockResolvedValue([]);
    mockRankClassic.mockReturnValue([]);
    mockFetchBlockedIds.mockResolvedValue([]);
    mockFetchProfile.mockResolvedValue(null);
    mockEnsureUserLocation.mockResolvedValue(null);
    mockGetSupabase.mockReturnValue({
      rpc: jest.fn(async () => ({ data: [], error: null })),
    });
    mockRouterPush.mockClear();
  });

  const renderScreen = async () => {
    const screen = render(<DiscoveryScreen />);
    await act(async () => {
      await flushPromises();
      await flushPromises();
    });
    return screen;
  };

  it("shows Chechnya empty state with change region CTA", async () => {
    mockUseSearchPrefs.mockReturnValue({
      prefs: {
        userId: "viewer",
        regionMode: "CHECHNYA",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      isLoading: false,
      isFetching: false,
      error: null,
      update: jest.fn(),
      isUpdating: false,
    });

    const screen = await renderScreen();
    expect(screen.getByText("discovery.empty.chechnya")).toBeTruthy();
    expect(screen.getByText("discovery.empty.changeRegion")).toBeTruthy();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("shows Europe empty state with refresh CTA", async () => {
    mockUseSearchPrefs.mockReturnValue({
      prefs: {
        userId: "viewer",
        regionMode: "EUROPE",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      isLoading: false,
      isFetching: false,
      error: null,
      update: jest.fn(),
      isUpdating: false,
    });

    const screen = await renderScreen();
    expect(screen.getByText("discovery.empty.europe")).toBeTruthy();
    expect(screen.getByText("discovery.refresh")).toBeTruthy();
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
