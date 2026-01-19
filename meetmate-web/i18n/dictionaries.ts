export const SUPPORTED_LANGS = ["de", "fr", "ru", "nb", "nl-BE", "en"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

type Dictionary = {
  common: {
    pricingCta: string;
    legalCta: string;
    homeCta: string;
    checkoutCta: string;
  };
  landing: {
    headline: string;
    subheadline: string;
    primaryAction: string;
    secondaryAction: string;
  };
  pricing: {
    title: string;
    subtitle: string;
    paywallDisabled: string;
    plans: Array<{
      name: string;
      price: string;
      features: string[];
      cta: string;
    }>;
  };
  legal: {
    title: string;
    content: string;
  };
  checkout: {
    title: string;
    subtitle: string;
    monthlyLabel: string;
    yearlyLabel: string;
    action: string;
    successTitle: string;
    successDescription: string;
    ruNotice: string;
  };
  region: {
    no_paywall_text: string;
  };
};

const dictionaries: Record<SupportedLang, Dictionary> = {
  de: {
    common: {
      pricingCta: "Preise ansehen",
      legalCta: "Rechtliches",
      homeCta: "Startseite",
      checkoutCta: "Checkout"
    },
    landing: {
      headline: "Triff neue Menschen mit meetmate",
      subheadline: "Premium-Dating mit Sicherheit, Respekt und smarten Matches.",
      primaryAction: "App herunterladen",
      secondaryAction: "Preise entdecken"
    },
    pricing: {
      title: "Preise",
      subtitle: "Wähle das Paket, das zu dir passt.",
      paywallDisabled:
        "Du bist eingeloggt. Premium-Funktionen sind in deiner Region kontogebunden und werden nach Anmeldung automatisch freigeschaltet.",
      plans: [
        {
          name: "Kostenlos",
          price: "0 €",
          features: ["Begrenzte Swipes", "Matches & Chat", "Sicherheitsfunktionen"],
          cta: "Jetzt starten"
        },
        {
          name: "Premium",
          price: "9,99 € / Monat",
          features: ["Unbegrenzte Swipes", "Boost & Super-Likes", "Erweiterte Filter"],
          cta: "Premium holen"
        }
      ]
    },
    legal: {
      title: "Rechtliche Hinweise",
      content: "meetmate verpflichtet sich zu Transparenz und Datenschutz. Hier findest du Informationen zu Privatsphäre, Nutzungsbedingungen und Kontakt."
    },
    checkout: {
      title: "Checkout",
      subtitle: "Schließe dein Premium-Abo sicher über unseren Zahlungsanbieter ab.",
      monthlyLabel: "Monatlich",
      yearlyLabel: "Jährlich",
      action: "Jetzt bezahlen",
      successTitle: "Vielen Dank!",
      successDescription: "Deine Zahlung wurde erfolgreich verarbeitet. Premium-Vorteile werden gleich freigeschaltet.",
      ruNotice: "Hinweis für RU: Käufe bleiben möglich, in der iOS-App werden jedoch keine Kauf-Links angezeigt."
    },
    region: {
      no_paywall_text:
        "Du bist eingeloggt. Premium-Funktionen sind in deiner Region kontogebunden und werden nach Anmeldung automatisch freigeschaltet."
    }
  },
  fr: {
    common: {
      pricingCta: "Voir les tarifs",
      legalCta: "Mentions légales",
      homeCta: "Accueil",
      checkoutCta: "Paiement"
    },
    landing: {
      headline: "Rencontrez de nouvelles personnes avec meetmate",
      subheadline: "Une application de rencontre premium axée sur la sécurité et des matchs intelligents.",
      primaryAction: "Télécharger l’app",
      secondaryAction: "Découvrir les tarifs"
    },
    pricing: {
      title: "Tarifs",
      subtitle: "Choisissez la formule qui vous convient.",
      paywallDisabled:
        "Vous êtes connecté. Les fonctionnalités Premium sont liées à votre compte dans votre région et seront activées automatiquement après connexion.",
      plans: [
        {
          name: "Gratuit",
          price: "0 €",
          features: ["Swipes limités", "Matchs & chat", "Fonctions de sécurité"],
          cta: "Commencer"
        },
        {
          name: "Premium",
          price: "9,99 € / mois",
          features: ["Swipes illimités", "Boost & Super-Likes", "Filtres avancés"],
          cta: "Devenir Premium"
        }
      ]
    },
    legal: {
      title: "Mentions légales",
      content: "meetmate protège vos données et respecte les réglementations européennes. Retrouvez ici nos documents légaux et contacts."
    },
    checkout: {
      title: "Paiement",
      subtitle: "Finalisez votre abonnement Premium en toute sécurité.",
      monthlyLabel: "Mensuel",
      yearlyLabel: "Annuel",
      action: "Payer maintenant",
      successTitle: "Merci !",
      successDescription: "Votre paiement a été validé. Les avantages Premium seront activés sous peu.",
      ruNotice: "Note RU : les achats sont possibles, mais les liens d’achat n’apparaissent pas dans l’application iOS."
    },
    region: {
      no_paywall_text:
        "Vous êtes connecté. Les fonctionnalités Premium sont liées à votre compte dans votre région et seront activées automatiquement après connexion."
    }
  },
  ru: {
    common: {
      pricingCta: "Тарифы",
      legalCta: "Правовая информация",
      homeCta: "Главная",
      checkoutCta: "Оплата"
    },
    landing: {
      headline: "Знакомьтесь с новыми людьми в meetmate",
      subheadline: "Премиум-знакомства с безопасностью и умными совпадениями.",
      primaryAction: "Скачать приложение",
      secondaryAction: "Посмотреть тарифы"
    },
    pricing: {
      title: "Тарифы",
      subtitle: "Подберите идеальный вариант для себя.",
      paywallDisabled:
        "Вы вошли в систему. Премиум-функции в вашем регионе привязаны к аккаунту и активируются автоматически после входа.",
      plans: [
        {
          name: "Бесплатно",
          price: "0 ₽",
          features: ["Ограниченные свайпы", "Матчи и чат", "Системы безопасности"],
          cta: "Начать"
        },
        {
          name: "Premium",
          price: "Подписка через приложение",
          features: ["Неограниченные свайпы", "Бусты и суперлайки", "Расширенные фильтры"],
          cta: "Подробнее в приложении"
        }
      ]
    },
    legal: {
      title: "Правовая информация",
      content: "meetmate соблюдает требования по защите данных. Здесь вы найдёте политику конфиденциальности, условия использования и контакты."
    },
    checkout: {
      title: "Оплата подписки",
      subtitle: "Завершите оплату Premium через Stripe или YooKassa.",
      monthlyLabel: "Ежемесячно",
      yearlyLabel: "Ежегодно",
      action: "Оплатить",
      successTitle: "Спасибо!",
      successDescription: "Платёж успешно обработан. Premium-доступ активируется в ближайшее время.",
      ruNotice: "Важно: покупка доступна, но в iOS-приложении ссылки на оплату не отображаются."
    },
    region: {
      no_paywall_text:
        "Вы вошли в систему. Премиум-функции в вашем регионе привязаны к аккаунту и активируются автоматически после входа."
    }
  },
  nb: {
    common: {
      pricingCta: "Se priser",
      legalCta: "Juridisk",
      homeCta: "Hjem",
      checkoutCta: "Kasse"
    },
    landing: {
      headline: "Møt nye mennesker med meetmate",
      subheadline: "Premium dating med sikkerhet og smarte matcher.",
      primaryAction: "Last ned appen",
      secondaryAction: "Se prisene"
    },
    pricing: {
      title: "Priser",
      subtitle: "Velg pakken som passer for deg.",
      paywallDisabled:
        "Du er pålogget. Premium-funksjoner er kontobundne i din region og aktiveres automatisk etter innlogging.",
      plans: [
        {
          name: "Gratis",
          price: "0 kr",
          features: ["Begrensede sveip", "Matcher og chat", "Sikkerhetsverktøy"],
          cta: "Kom i gang"
        },
        {
          name: "Premium",
          price: "159 kr / mnd",
          features: ["Ubegrensede sveip", "Boost & Super-Likes", "Avanserte filtre"],
          cta: "Velg Premium"
        }
      ]
    },
    legal: {
      title: "Juridisk informasjon",
      content: "meetmate tar personvern på alvor. Her finner du personvernerklæring, vilkår og kontaktinformasjon."
    },
    checkout: {
      title: "Kasse",
      subtitle: "Fullfør Premium-kjøpet trygt med Stripe eller YooKassa.",
      monthlyLabel: "Månedlig",
      yearlyLabel: "Årlig",
      action: "Betal nå",
      successTitle: "Takk!",
      successDescription: "Betalingen er registrert. Premium-fordeler aktiveres om kort tid.",
      ruNotice: "Merk: I RU er kjøp mulig, men iOS-appen viser ingen kjøpslenker."
    },
    region: {
      no_paywall_text:
        "Du er pålogget. Premium-funksjoner er kontobundne i din region og aktiveres automatisk etter innlogging."
    }
  },
  "nl-BE": {
    common: {
      pricingCta: "Prijzen bekijken",
      legalCta: "Juridisch",
      homeCta: "Home",
      checkoutCta: "Afrekenen"
    },
    landing: {
      headline: "Ontmoet nieuwe mensen met meetmate",
      subheadline: "Premium daten met veiligheid en slimme matches.",
      primaryAction: "Download de app",
      secondaryAction: "Ontdek de prijzen"
    },
    pricing: {
      title: "Prijzen",
      subtitle: "Kies het pakket dat bij jou past.",
      paywallDisabled:
        "Je bent aangemeld. Premiumfuncties zijn in jouw regio aan je account gekoppeld en worden na aanmelden automatisch geactiveerd.",
      plans: [
        {
          name: "Gratis",
          price: "0 €",
          features: ["Beperkte swipes", "Matches & chat", "Veiligheidsfeatures"],
          cta: "Start nu"
        },
        {
          name: "Premium",
          price: "9,99 € / maand",
          features: ["Onbeperkte swipes", "Boost & Super-Likes", "Uitgebreide filters"],
          cta: "Word Premium"
        }
      ]
    },
    legal: {
      title: "Juridische informatie",
      content: "meetmate beschermt jouw gegevens. Raadpleeg hier onze privacyverklaring, gebruiksvoorwaarden en contact."
    },
    checkout: {
      title: "Afrekenen",
      subtitle: "Rond je Premium-abonnement veilig af via Stripe of YooKassa.",
      monthlyLabel: "Maandelijks",
      yearlyLabel: "Jaarlijks",
      action: "Nu betalen",
      successTitle: "Bedankt!",
      successDescription: "Je betaling is verwerkt. Premium wordt binnenkort geactiveerd.",
      ruNotice: "Opmerking: in RU zijn aankopen mogelijk, maar iOS toont geen kooplinks."
    },
    region: {
      no_paywall_text:
        "Je bent aangemeld. Premiumfuncties zijn in jouw regio aan je account gekoppeld en worden na aanmelden automatisch geactiveerd."
    }
  },
  en: {
    common: {
      pricingCta: "View pricing",
      legalCta: "Legal",
      homeCta: "Home",
      checkoutCta: "Checkout"
    },
    landing: {
      headline: "Meet new people with meetmate",
      subheadline: "Premium dating built on safety, respect, and smart matching.",
      primaryAction: "Download the app",
      secondaryAction: "Explore pricing"
    },
    pricing: {
      title: "Pricing",
      subtitle: "Choose the plan that fits you best.",
      paywallDisabled:
        "You’re signed in. Premium features are account-bound in your region and activate automatically after sign-in.",
      plans: [
        {
          name: "Free",
          price: "$0",
          features: ["Limited swipes", "Matches & chat", "Safety tooling"],
          cta: "Get started"
        },
        {
          name: "Premium",
          price: "$14.99 / month",
          features: ["Unlimited swipes", "Boost & Super-Likes", "Advanced filters"],
          cta: "Go Premium"
        }
      ]
    },
    legal: {
      title: "Legal information",
      content: "meetmate is committed to transparency and privacy. Access policies, terms, and contact details here."
    },
    checkout: {
      title: "Checkout",
      subtitle: "Complete your Premium purchase securely via Stripe or YooKassa.",
      monthlyLabel: "Monthly",
      yearlyLabel: "Yearly",
      action: "Pay now",
      successTitle: "Thank you!",
      successDescription: "Your payment was processed successfully. Premium access will be activated shortly.",
      ruNotice: "RU note: Purchases remain possible, but iOS UI will not display purchase links."
    },
    region: {
      no_paywall_text:
        "You’re signed in. Premium features are account-bound in your region and activate automatically after sign-in."
    }
  }
};

export const getDictionary = async (lang: SupportedLang): Promise<Dictionary> => {
  return dictionaries[lang] ?? dictionaries.en;
};
