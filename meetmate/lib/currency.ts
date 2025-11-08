import { SupportedCountry } from "./region";

export type SupportedCurrency = "RUB" | "EUR" | "NOK";

const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["RUB", "EUR", "NOK"];

const COUNTRY_TO_CURRENCY: Record<SupportedCountry, SupportedCurrency> = {
  RU: "RUB",
  FR: "EUR",
  DE: "EUR",
  AT: "EUR",
  BE: "EUR",
  NO: "NOK",
  XX: "EUR",
};

export const currencyForCountry = (country: SupportedCountry): SupportedCurrency => {
  return COUNTRY_TO_CURRENCY[country] ?? "EUR";
};

export const isSupportedCurrency = (
  value?: string | null,
): value is SupportedCurrency => {
  if (!value) {
    return false;
  }
  return SUPPORTED_CURRENCIES.includes(value as SupportedCurrency);
};

export const formatCurrency = (
  amount: number,
  currency: SupportedCurrency,
  locale: string,
): string => {
  const formatter = new Intl.NumberFormat(locale || "en-US", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
};
