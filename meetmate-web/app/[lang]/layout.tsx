import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { SUPPORTED_LANGS, type SupportedLang } from "../../i18n";

type Params = {
  lang: string;
};

export const dynamic = "force-static";

export const generateStaticParams = () =>
  SUPPORTED_LANGS.map((lang) => ({
    lang
  }));

const LangLayout = async ({ children, params }: { children: ReactNode; params: Params }) => {
  const lang = normaliseLang(params.lang);
  if (!lang) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 py-12">{children}</div>
      </main>
      <footer className="px-4 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} meetmate
      </footer>
    </div>
  );
};

const normaliseLang = (value: string): SupportedLang | null => {
  if (SUPPORTED_LANGS.includes(value as SupportedLang)) {
    return value as SupportedLang;
  }
  return null;
};

export default LangLayout;
