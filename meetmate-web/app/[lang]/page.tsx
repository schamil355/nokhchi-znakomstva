import Link from "next/link";
import { getDictionary, type SupportedLang } from "../../i18n";

type Props = {
  params: {
    lang: SupportedLang;
  };
};

const LandingPage = async ({ params }: Props) => {
  const dictionary = await getDictionary(params.lang);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">{dictionary.landing.headline}</h1>
        <p className="text-lg text-slate-600">{dictionary.landing.subheadline}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a
          href="https://apps.apple.com"
          className="rounded-md bg-slate-900 px-5 py-3 text-white font-semibold hover:bg-slate-800 transition"
        >
          {dictionary.landing.primaryAction}
        </a>
        <Link
          href={`/${params.lang}/pricing`}
          className="rounded-md border border-slate-300 px-5 py-3 text-slate-900 font-semibold hover:border-slate-400 transition"
        >
          {dictionary.landing.secondaryAction}
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <FeatureCard
          title="Safety first"
          description="Photo verification, moderation tooling, and rate-limited actions keep our community respectful."
        />
        <FeatureCard
          title="Smart matching"
          description="Location-aware discovery, interest-based ranking, and instant match notifications."
        />
        <FeatureCard
          title="Built for mobile"
          description="Native apps for iOS and Android with real-time chat, push notifications, and offline support."
        />
        <FeatureCard
          title="Global community"
          description="Multi-language experience with regional pricing and content to serve members worldwide."
        />
      </div>
      <FooterLinks lang={params.lang} dictionary={dictionary} />
    </section>
  );
};

const FeatureCard = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-lg border border-slate-200 p-6 shadow-sm">
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-slate-600">{description}</p>
  </div>
);

const FooterLinks = ({
  lang,
  dictionary
}: {
  lang: string;
  dictionary: Awaited<ReturnType<typeof getDictionary>>;
}) => (
  <div className="pt-8 text-sm text-slate-500 space-x-4">
    <Link href={`/${lang}/pricing`} className="underline underline-offset-4">
      {dictionary.common.pricingCta}
    </Link>
    <Link href={`/${lang}/checkout`} className="underline underline-offset-4">
      {dictionary.common.checkoutCta}
    </Link>
    <Link href={`/${lang}/legal`} className="underline underline-offset-4">
      {dictionary.common.legalCta}
    </Link>
  </div>
);

export default LandingPage;
