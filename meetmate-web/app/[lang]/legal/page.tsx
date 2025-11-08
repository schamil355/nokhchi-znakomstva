import { getDictionary, type SupportedLang } from "../../../i18n";

type Props = {
  params: {
    lang: SupportedLang;
  };
};

const LegalPage = async ({ params }: Props) => {
  const dictionary = await getDictionary(params.lang);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">{dictionary.legal.title}</h1>
      <p className="text-slate-600 leading-relaxed">{dictionary.legal.content}</p>
      <div className="rounded-lg border border-slate-200 bg-slate-100 p-4 text-sm text-slate-600">
        <p>hello@meetmate.com</p>
        <p className="mt-1">Einhornstraße 12, 10119 Berlin, Germany</p>
      </div>
    </section>
  );
};

export default LegalPage;
