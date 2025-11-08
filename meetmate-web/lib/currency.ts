export type SupportedCurrency = "EUR" | "NOK" | "RUB";

export const currencyForCountry = (country: string | null | undefined): SupportedCurrency => {
  switch ((country ?? "XX").toUpperCase()) {
    case "RU":
      return "RUB";
    case "NO":
      return "NOK";
    default:
      return "EUR";
  }
};

export const formatCurrency = (amountMinor: number, currency: SupportedCurrency, locale: string) => {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol"
  });
  return formatter.format(amountMinor / 100);
};
