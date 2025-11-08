const nb = {
  errors: {
    notLoggedIn: "Logg inn på nytt.",
    generic: "Noe gikk galt. Prøv igjen."
  },
  discovery: {
    empty: {
      chechnya: "Ingen flere profiler i Tsjetsjenia akkurat nå. Bytt region for å se flere matcher.",
      europe: "Ingen nye europeiske matcher for øyeblikket. Sjekk igjen senere.",
      russia: "Ingen nye matcher i Russland for øyeblikket. Oppdater eller bytt region.",
      nearby: "Ingen matcher i nærheten nå. Prøv igjen senere eller endre region.",
      changeRegion: "Bytt region"
    }
  },
  prefs: {
    region: {
      title: "Hvor skal vi lete etter matcher?",
      nearby: "I nærheten (innen 50 km)",
      chechnya: "Fokus Tsjetsjenia",
      europe: "Europa (EU-grunnsett)",
      russia: "Hele Russland",
      russiaDescription: "Dekker verifiserte kontoer over hele Russland.",
      russiaCities: {
        moscow: "Moskva",
        saintPetersburg: "St. Petersburg",
        kazan: "Kazan",
        novosibirsk: "Novosibirsk"
      },
      saved: "Søkepreferansene er oppdatert."
    }
  },
  verification: {
    consent: {
      title: "Identitetskontroll",
      description: "For å beskytte fellesskapet bekrefter vi et raskt live-selfie og en engangskode før meldinger låses opp.",
      camera: "Ta et live-selfie i appen (ingen galleriopplastinger).",
      otp: "Bekreft e-post eller telefon med en engangskode.",
      deletion: "Selfiene slettes rett etter kontrollen; vi lagrer bare anonyme scorer.",
      checkbox: "Jeg forstår og samtykker til verifiseringsprosessen.",
      notice: "Vi håndterer bildene dine i tråd med våre personvernregler.",
      privacyLink: "Personvernerklæring",
      dataPolicyLink: "Verifiserings- og datapolicy",
      button: "Start verifisering"
    },
    selfie: {
      title: "Ta et live-selfie",
      instructions: "Plasser ansiktet midt i bildet, se i kameraet og følg blink-/hodebevegelsene.",
      hintMovement: "Vri hodet forsiktig og blink når du blir bedt om det, så kan vi bekrefte at du er til stede.",
      hintLight: "Stå et sted med godt lys uten sterkt motlys.",
      capture: "Ta selfie",
      retake: "Ta på nytt",
      attempts: "Forsøk {{count}} av {{total}}",
      permission: "Vi trenger kameratilgang for å fortsette.",
      enableCamera: "Tillat kamera",
      retryTitle: "Prøv igjen"
    },
    otp: {
      title: "Skriv inn verifikasjonskode",
      description: "Vi har sendt en 6-sifret kode. Skriv den inn for å fullføre verifiseringen.",
      attempts: "Forsøk {{count}} av {{total}}",
      resend: "Send koden på nytt",
      waiting: "Venter på bekreftelse…",
      noScore: "Vi viser ikke likhetsscoren din – kun at verifiseringen lykkes."
    },
    progress: {
      selfie: "Sjekker selfien…",
      otp: "Verifiserer koden…"
    },
    errors: {
      verificationFailed: "Verifiseringen mislyktes. Sjekk lysforholdene og prøv igjen.",
      rateLimited: "For mange forsøk. Vent et par minutter.",
      otpInvalid: "Koden er feil. Prøv igjen."
    },
    success: "Du er verifisert! Nyt alle funksjoner.",
    badge: {
      verified: "Verifisert"
    }
  },
  profile: {
    form: {
      countryLabel: "Land"
    },
    errors: {
      countryRequired: "Velg et land."
    },
    countries: {
      RU: "Russland",
      FR: "Frankrike",
      DE: "Tyskland",
      AT: "Østerrike",
      BE: "Belgia",
      NO: "Norge"
    },
    country_hint: "Hjelper oss å finjustere «Europa»-filteret."
  },
  region: {
    no_paywall_text:
      "Du er pålogget. Premium-funksjoner er kontobundne i din region og aktiveres automatisk etter innlogging."
  }
};

export default nb;
