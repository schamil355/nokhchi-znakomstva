import { cookies } from "next/headers";
import { getDictionary, type SupportedLang } from "../../../i18n";
import { currencyForCountry, formatCurrency } from "../../../lib/currency";
import CheckoutForm from "../../../components/CheckoutForm";

type Props = {
  params: {
    lang: SupportedLang;
  };
};

const CheckoutPage = async ({ params }: Props) => {
  const dictionary = await getDictionary(params.lang);
  const country = cookies().get("mm_country")?.value ?? "XX";
  const currency = currencyForCountry(country);
  const locale = resolveLocale(params.lang);

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">{dictionary.checkout.title}</h1>
        <p className="text-slate-600">{dictionary.checkout.subtitle}</p>
      </div>

      <CheckoutForm
        lang={params.lang}
        currency={currency}
        formatPrice={(amountMinor) => formatCurrency(amountMinor, currency, locale)}
        labels={{
          monthlyLabel: dictionary.checkout.monthlyLabel,
          yearlyLabel: dictionary.checkout.yearlyLabel,
          action: dictionary.checkout.action,
          ruNotice: dictionary.checkout.ruNotice
        }}
      />
    </section>
  );
};

const resolveLocale = (lang: SupportedLang): string => {
  switch (lang) {
    case "en":
      return "en-US";
    case "nb":
      return "nb-NO";
    case "ru":
      return "ru-RU";
    case "de":
      return "de-DE";
    case "fr":
      return "fr-FR";
    case "nl-BE":
      return "nl-BE";
    default:
      return "en-US";
  }
};

export default CheckoutPage;
