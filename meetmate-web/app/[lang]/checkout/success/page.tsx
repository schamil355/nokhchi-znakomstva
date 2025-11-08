import Link from "next/link";
import { getDictionary, type SupportedLang } from "../../../../i18n";

type Props = {
  params: {
    lang: SupportedLang;
  };
};

const CheckoutSuccessPage = async ({ params }: Props) => {
  const dictionary = await getDictionary(params.lang);

  return (
    <section className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">{dictionary.checkout.successTitle}</h1>
        <p className="text-slate-600">{dictionary.checkout.successDescription}</p>
      </div>
      <div className="flex justify-center gap-4">
        <Link
          href={`/${params.lang}`}
          className="rounded-md bg-slate-900 px-5 py-3 text-white font-semibold hover:bg-slate-800 transition"
        >
          {dictionary.common.homeCta}
        </Link>
        <Link
          href={`/${params.lang}/legal`}
          className="rounded-md border border-slate-300 px-5 py-3 text-slate-900 font-semibold hover:border-slate-400 transition"
        >
          {dictionary.common.legalCta}
        </Link>
      </div>
    </section>
  );
};

export default CheckoutSuccessPage;
