import React from "react";
import { Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Purchases from "react-native-purchases";
import PaywallScreen from "../features/paywall/PaywallScreen";
import { usePriceDisplay } from "../features/paywall/usePriceDisplay";

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    getOfferings: jest.fn(),
  },
}));

jest.mock("../components/ToastProvider", () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

jest.mock("../lib/region", () => {
  let mockRegionData = {
    country: "FR" as const,
    paywallMode: "iap" as "iap" | "none",
    source: "edge" as "profile" | "edge" | "device",
  };
  return {
    useRegionOffering: jest.fn(() => ({
      data: mockRegionData,
      isLoading: false,
      refetch: jest.fn(),
    })),
    __setRegionData: (next: typeof mockRegionData) => {
      mockRegionData = next;
    },
  };
});

type TranslationMap = Record<string, Record<string, string>>;

const TRANSLATIONS: TranslationMap = {
  "fr-FR": {
    "paywall.pricePerMonth": "{{price}} €/Monat",
    "paywall.buy": "Acheter",
    "paywall.swipes.unlimited": "Illimité",
    "paywall.swipes.limited": "Limité",
    "paywall.boost.available": "Disponible",
    "paywall.boost.locked": "Verfügbar",
    "paywall.statusActive": "Aktiv",
    "paywall.statusLocked": "Gesperrt",
    "paywall.statusActiveWithCount": "Aktiv ({{count}})",
    "paywall.subtitle": "Swipes: {{swipes}}, Boost: {{boost}}, Super-Likes: {{super}}",
    "paywall.title": "Premium",
    "paywall.statusTitle": "Status",
    "paywall.unlimitedLabel": "Unlimited Swipes",
    "paywall.boostLabel": "Boost",
    "paywall.superLikeLabel": "Super-Likes",
    "paywall.noOffers": "Keine Angebote",
    "paywall.manualSync": "Schon bezahlt?",
    "paywall.restore": "Käufe wiederherstellen",
    "paywall.back": "Zurück",
    "paywall.toast.offerError": "Fehler beim Laden",
    "paywall.toast.purchaseSuccess": "Erfolg",
    "paywall.toast.purchaseCancelled": "Abgebrochen",
    "paywall.toast.purchaseFailed": "Fehlgeschlagen",
    "paywall.toast.restoreSuccess": "Restore ok",
    "paywall.toast.restoreFailed": "Restore fail",
    "paywall.toast.syncSuccess": "Sync ok",
    "paywall.toast.syncFailed": "Sync fail",
    "region.no_paywall_text": "Premium ist kontogebunden.",
  },
  "nb-NO": {
    "paywall.pricePerMonth": "{{price}} kr/mnd",
    "paywall.buy": "Kjøp nå",
    "paywall.swipes.unlimited": "Ubegrenset",
    "paywall.swipes.limited": "Begrenset",
    "paywall.boost.available": "Tilgjengelig",
    "paywall.boost.locked": "Låst",
    "paywall.statusActive": "Aktiv",
    "paywall.statusLocked": "Låst",
    "paywall.statusActiveWithCount": "Aktiv ({{count}})",
    "paywall.subtitle": "Sveip: {{swipes}}, Boost: {{boost}}, Super-Likes: {{super}}",
    "paywall.title": "Premium",
    "paywall.statusTitle": "Status",
    "paywall.unlimitedLabel": "Ubegrenset",
    "paywall.boostLabel": "Boost",
    "paywall.superLikeLabel": "Super-likes",
    "paywall.noOffers": "Ingen tilbud",
    "paywall.manualSync": "Allerede betalt?",
    "paywall.restore": "Gjenopprett",
    "paywall.back": "Tilbake",
    "paywall.toast.offerError": "Feil",
    "paywall.toast.purchaseSuccess": "Suksess",
    "paywall.toast.purchaseCancelled": "Avbrutt",
    "paywall.toast.purchaseFailed": "Feilet",
    "paywall.toast.restoreSuccess": "Gjenopprettet",
    "paywall.toast.restoreFailed": "Gjenoppretting feilet",
    "paywall.toast.syncSuccess": "Oppdatert",
    "paywall.toast.syncFailed": "Oppdatering feilet",
    "region.no_paywall_text": "Premium-funksjoner er knyttet til kontoen.",
  },
  "ru-RU": {
    "paywall.pricePerMonth": "{{price}} ₽/мес",
    "paywall.buy": "Купить",
    "paywall.swipes.unlimited": "Без ограничений",
    "paywall.swipes.limited": "Ограничено",
    "paywall.boost.available": "Доступно",
    "paywall.boost.locked": "Недоступно",
    "paywall.statusActive": "Активно",
    "paywall.statusLocked": "Недоступно",
    "paywall.statusActiveWithCount": "Активно ({{count}})",
    "paywall.subtitle": "Свайпы: {{swipes}}, Буст: {{boost}}, Суперлайки: {{super}}",
    "paywall.title": "Премиум",
    "paywall.statusTitle": "Статус",
    "paywall.unlimitedLabel": "Свайпы",
    "paywall.boostLabel": "Буст",
    "paywall.superLikeLabel": "Суперлайки",
    "paywall.noOffers": "Нет предложений",
    "paywall.manualSync": "Уже куплено?",
    "paywall.restore": "Восстановить покупки",
    "paywall.back": "Назад",
    "paywall.toast.offerError": "Ошибка",
    "paywall.toast.purchaseSuccess": "Успех",
    "paywall.toast.purchaseCancelled": "Отменено",
    "paywall.toast.purchaseFailed": "Ошибка",
    "paywall.toast.restoreSuccess": "Восстановлено",
    "paywall.toast.restoreFailed": "Ошибка",
    "paywall.toast.syncSuccess": "Обновлено",
    "paywall.toast.syncFailed": "Ошибка",
    "region.no_paywall_text": "Премиум-функции в вашем регионе связаны с аккаунтом.",
  },
};

let mockCurrentLocale = "fr-FR";

const interpolate = (template: string, params?: Record<string, unknown>) => {
  if (!params) {
    return template;
  }
  return Object.keys(params).reduce((acc, key) => {
    const value = `${params[key] ?? ""}`;
    return acc.replaceAll(`{{${key}}}`, value);
  }, template);
};

const translate = (key: string, params?: Record<string, unknown>) => {
  const dict = TRANSLATIONS[mockCurrentLocale] ?? {};
  const template = dict[key] ?? key;
  return interpolate(template, params);
};

jest.mock("../lib/i18n", () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => translate(key, params),
  }),
  getCurrentLocale: () => mockCurrentLocale,
  setLocale: jest.fn(),
  syncLocale: jest.fn(),
  initI18n: jest.fn(),
  supportedLocales: ["fr", "nb", "ru"],
  t: (key: string, params?: Record<string, unknown>) => translate(key, params),
  __setLocale: (next: string) => {
    mockCurrentLocale = next;
  },
}));

const mockEntitlements = {
  entitlements: {
    unlimitedSwipes: false,
    dailyBoost: false,
    superLikes: 0,
    expiresAt: null,
    sources: [],
  },
  isLoading: false,
  isRestoring: false,
  error: null,
  refreshEntitlements: jest.fn(),
  restorePurchases: jest.fn(),
  hasEntitlement: jest.fn(),
};

jest.mock("../features/paywall/hooks", () => ({
  useEntitlements: jest.fn(() => mockEntitlements),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

const renderWithClient = (ui: React.ReactElement) => {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const PriceProbe = ({ productId }: { productId: string }) => {
  const { pricePerMonth, isLoading } = usePriceDisplay(productId);
  if (isLoading) {
    return <Text testID="price">loading</Text>;
  }
  return <Text testID="price">{pricePerMonth}</Text>;
};

const mockedPurchases = Purchases as unknown as { getOfferings: jest.Mock };
const { __setLocale } = require("../lib/i18n");
const { __setRegionData } = require("../lib/region");

beforeEach(() => {
  mockedPurchases.getOfferings.mockReset();
  mockEntitlements.entitlements = {
    unlimitedSwipes: false,
    dailyBoost: false,
    superLikes: 0,
    expiresAt: null,
    sources: [],
  };
  mockEntitlements.refreshEntitlements.mockReset();
  mockEntitlements.restorePurchases.mockReset();
  __setLocale("fr-FR");
  __setRegionData({
    country: "FR",
    paywallMode: "iap",
    source: "edge",
  });
});

describe("usePriceDisplay", () => {
  it("formats price with monthly suffix for FR locale", async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          {
            identifier: "monthly",
            packageType: "MONTHLY",
            product: {
              identifier: "monthly",
              price: 9.99,
              priceString: "9,99 €",
              currencyCode: "EUR",
              description: "Monthly",
              title: "Monthly",
              introPrice: null,
              discounts: null,
              productCategory: null,
              productType: "AUTO_RENEWABLE_SUBSCRIPTION",
            },
          } as any,
        ],
      },
      all: {},
    } as any);

    const { getByTestId } = renderWithClient(<PriceProbe productId="monthly" />);

    await waitFor(() => {
      expect(getByTestId("price").props.children).toContain("€/Monat");
    });
  });

  it("falls back to formatted price for NO locale", async () => {
    __setLocale("nb-NO");
    __setRegionData({
      country: "NO",
      paywallMode: "iap",
      source: "edge",
    });
    mockedPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          {
            identifier: "monthly_no",
            packageType: "MONTHLY",
            product: {
              identifier: "monthly_no",
              price: 129,
              priceString: "",
              currencyCode: "NOK",
              description: "Monthly",
              title: "Monthly",
              introPrice: null,
              discounts: null,
              productCategory: null,
              productType: "AUTO_RENEWABLE_SUBSCRIPTION",
            },
          } as any,
        ],
      },
      all: {},
    } as any);

    const { getByTestId } = renderWithClient(<PriceProbe productId="monthly_no" />);

    await waitFor(() => {
      expect(getByTestId("price").props.children).toContain("kr/mnd");
    });
  });
});

describe("PaywallScreen regional behaviour", () => {
  it("shows regional message without purchase buttons for RU", async () => {
    __setLocale("ru-RU");
    __setRegionData({
      country: "RU",
      paywallMode: "none",
      source: "edge",
    });

    const { getByText, queryByText } = renderWithClient(<PaywallScreen />);

    await waitFor(() => {
      expect(getByText(TRANSLATIONS["ru-RU"]["region.no_paywall_text"])).toBeTruthy();
    });

    expect(queryByText(TRANSLATIONS["ru-RU"]["paywall.buy"])).toBeNull();
  });
});
