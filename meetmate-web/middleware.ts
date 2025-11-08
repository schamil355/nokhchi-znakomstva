import { NextResponse, type NextRequest } from "next/server";

const SUPPORTED_LANGS = ["de", "fr", "ru", "nb", "nl-BE", "en"] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];
const DEFAULT_LANG: SupportedLang = "en";

const COUNTRY_TO_LANG: Record<string, SupportedLang> = {
  AD: "fr",
  AL: "fr",
  AT: "de",
  AX: "de",
  BA: "fr",
  BE: "nl-BE",
  BG: "fr",
  BY: "ru",
  CH: "de",
  CY: "fr",
  CZ: "fr",
  DE: "de",
  DK: "nb",
  EE: "fr",
  ES: "fr",
  FI: "nb",
  FO: "nb",
  FR: "fr",
  GB: "en",
  GG: "en",
  GI: "en",
  GR: "fr",
  HR: "fr",
  HU: "fr",
  IE: "en",
  IM: "en",
  IS: "nb",
  IT: "fr",
  JE: "en",
  LI: "de",
  LT: "fr",
  LU: "fr",
  LV: "fr",
  MC: "fr",
  MD: "fr",
  ME: "fr",
  MK: "fr",
  MT: "fr",
  NL: "nl-BE",
  NO: "nb",
  PL: "fr",
  PT: "fr",
  RO: "fr",
  RS: "fr",
  SE: "nb",
  SI: "fr",
  SK: "fr",
  SM: "fr",
  UA: "fr",
  VA: "fr",
  XK: "fr",
  RU: "ru"
};

const COUNTRY_HEADER_CANDIDATES = [
  "x-vercel-ip-country",
  "x-forwarded-country",
  "cf-ipcountry",
  "x-country",
  "x-geo-country"
];

const PUBLIC_FILE = /\.(.*)$/;

const parseAcceptLanguage = (headerValue: string | null): SupportedLang => {
  if (!headerValue) {
    return DEFAULT_LANG;
  }

  const candidates = headerValue
    .split(",")
    .map((item) => {
      const [langPart, qValue] = item.trim().split(";q=");
      const lang = langPart.toLowerCase();
      const quality = qValue ? Number.parseFloat(qValue) : 1;
      return { lang, quality: Number.isFinite(quality) ? quality : 1 };
    })
    .sort((a, b) => b.quality - a.quality)
    .map(({ lang }) => lang);

  for (const lang of candidates) {
    const normalized = normalizeLang(lang);
    if (normalized) {
      return normalized;
    }
  }
  return DEFAULT_LANG;
};

const normalizeLang = (value: string | null | undefined): SupportedLang | null => {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (SUPPORTED_LANGS.includes(lower as SupportedLang)) {
    return lower as SupportedLang;
  }
  const base = lower.split("-")[0];
  if (base === "nl") {
    return "nl-BE";
  }
  if (SUPPORTED_LANGS.includes(base as SupportedLang)) {
    return base as SupportedLang;
  }
  return null;
};

const getCountryFromHeaders = (request: NextRequest): string => {
  for (const header of COUNTRY_HEADER_CANDIDATES) {
    const value = request.headers.get(header);
    if (value) {
      return value.toUpperCase();
    }
  }
  return "XX";
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const pathSegments = pathname.split("/");
  const pathLangCandidate = pathSegments[1];
  const normalizedPathLang = normalizeLang(pathLangCandidate);

  const cookieLang = request.cookies.get("mm_lang")?.value;
  const normalizedCookieLang = normalizeLang(cookieLang);
  const country = request.cookies.get("mm_country")?.value ?? getCountryFromHeaders(request);
  const countryBasedLang = COUNTRY_TO_LANG[country as keyof typeof COUNTRY_TO_LANG];
  const normalizedCountryLang = normalizeLang(countryBasedLang);

  const acceptLanguage = request.headers.get("accept-language");
  const preferredLang = parseAcceptLanguage(acceptLanguage);
  const effectiveLang =
    normalizedPathLang ??
    normalizedCookieLang ??
    normalizedCountryLang ??
    preferredLang;

  const response = normalizedPathLang ? NextResponse.next() : NextResponse.rewrite(
    createRewrittenUrl(request, effectiveLang)
  );

  if (!normalizedCookieLang || normalizedCookieLang !== effectiveLang) {
    response.cookies.set("mm_lang", effectiveLang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
  }

  if (!request.cookies.get("mm_country") || request.cookies.get("mm_country")?.value !== country) {
    response.cookies.set("mm_country", country, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
  }

  return response;
}

const createRewrittenUrl = (request: NextRequest, lang: SupportedLang) => {
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}${request.nextUrl.pathname}`;
  return url;
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
