import Link from "next/link";
import type { Route } from "next";
import { getDictionary, type SupportedLang } from "../../../i18n";

const SUPPORT_EMAIL = "support@meetmate.app";
const PRIVACY_EMAIL = "privacy@meetmate.app";

type Props = {
  params: {
    lang: SupportedLang;
  };
};

const SupportPage = async ({ params }: Props) => {
  const dictionary = await getDictionary(params.lang);
  const { support } = dictionary;

  const contactCards = [
    {
      label: support.supportEmailLabel,
      description: support.supportEmailDescription,
      email: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL}?subject=Support%20request%20%2F%20meetmate`
    },
    {
      label: support.privacyEmailLabel,
      description: support.privacyEmailDescription,
      email: PRIVACY_EMAIL,
      href: `mailto:${PRIVACY_EMAIL}?subject=Privacy%20request%20%2F%20meetmate`
    }
  ];

  const sections = [
    support.sections.account,
    support.sections.safety,
    support.sections.billing,
    support.sections.data
  ];

  const quickLinks: { href: Route<string>; label: string }[] = [
    { href: `/${params.lang}/legal` as Route<string>, label: support.quickLinks.legal },
    { href: `/${params.lang}/pricing` as Route<string>, label: support.quickLinks.pricing },
    { href: `/${params.lang}/checkout` as Route<string>, label: support.quickLinks.checkout }
  ];

  return (
    <section className="space-y-8">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            {support.badge}
          </span>
          <span className="text-sm text-slate-500">{support.responseTimeDescription}</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{support.title}</h1>
            <p className="max-w-2xl text-slate-600">{support.subtitle}</p>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Support%20request%20%2F%20meetmate`}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            {support.primaryCta}
          </a>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-slate-500">{support.contactNote}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {contactCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{card.email}</p>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
            <a
              href={card.href}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-600"
            >
              <span>{support.primaryCta}</span>
              <span aria-hidden className="text-base">→</span>
            </a>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                meetmate
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
                  <p className="text-sm text-slate-600">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{support.responseTimeTitle}</h3>
          <p className="mt-2 text-sm text-slate-600">{support.responseTimeDescription}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{support.quickLinksTitle}</h3>
          <div className="mt-3 space-y-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700"
              >
                <span>{link.label}</span>
                <span aria-hidden className="text-emerald-600 transition group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{support.addressTitle}</h3>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            {support.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
};

export default SupportPage;
