import { cookies } from "next/headers";
import { getDictionary, type SupportedLang } from "../../../i18n";
import { getRegionConfig } from "../../../lib/region";

type Props = {
  params: {
    lang: SupportedLang;
  };
};

const PricingPage = async ({ params }: Props) => {
  const dictionary = await getDictionary(params.lang);
  const country = cookies().get("mm_country")?.value ?? "XX";
  const regionConfig = await getRegionConfig(country);

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">{dictionary.pricing.title}</h1>
        <p className="text-slate-600">{dictionary.pricing.subtitle}</p>
      </div>

      {regionConfig.paywallMode === "none" ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
          {dictionary.region.no_paywall_text}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {dictionary.pricing.plans.map((plan) => (
            <div key={plan.name} className="rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
              <div className="mt-2 text-2xl font-bold text-slate-900">{plan.price}</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-slate-900" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2 text-white font-semibold hover:bg-slate-800 transition">
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PricingPage;
