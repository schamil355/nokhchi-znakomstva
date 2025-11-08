const nlBE = {
  errors: {
    notLoggedIn: "Meld je opnieuw aan.",
    generic: "Er ging iets mis. Probeer het opnieuw."
  },
  discovery: {
    empty: {
      chechnya: "Er zijn momenteel geen extra profielen in Tsjetsjenië. Wissel van regio om meer matches te zien.",
      europe: "Er zijn nu geen nieuwe Europese matches. Kom later terug.",
      russia: "Er zijn momenteel geen nieuwe matches in Rusland. Vernieuw de feed of wijzig je regio.",
      nearby: "Er zijn nu geen matches in de buurt. Probeer het later opnieuw of wijzig je regio.",
      changeRegion: "Regio wijzigen"
    }
  },
  prefs: {
    region: {
      title: "Waar moeten we naar matches zoeken?",
      nearby: "In de buurt (binnen 50 km)",
      chechnya: "Focus Tsjetsjenië",
      europe: "Europa (EU-basisset)",
      russia: "Heel Rusland",
      russiaDescription: "Omvat geverifieerde accounts in de volledige Russische Federatie.",
      russiaCities: {
        moscow: "Moskou",
        saintPetersburg: "Sint-Petersburg",
        kazan: "Kazan",
        novosibirsk: "Novosibirsk"
      },
      saved: "Zoekvoorkeuren bijgewerkt."
    }
  },
  verification: {
    consent: {
      title: "Identiteitscontrole",
      description: "Om de community veilig te houden vragen we om een korte live-selfie en een eenmalige code voordat berichten worden vrijgegeven.",
      camera: "Maak een live-selfie in de app (geen uploads uit de galerij).",
      otp: "Bevestig je e-mail of telefoon met een eenmalige code.",
      deletion: "Selfies worden meteen na de controle verwijderd; we bewaren alleen anonieme scores.",
      checkbox: "Ik begrijp en aanvaard het verificatieproces.",
      notice: "We verwerken je beelden volgens onze privacyrichtlijnen.",
      privacyLink: "Privacyverklaring",
      dataPolicyLink: "Verificatie- en datapolicy",
      button: "Verificatie starten"
    },
    selfie: {
      title: "Maak een live-selfie",
      instructions: "Zet je gezicht in het midden, kijk naar de camera en volg de aanwijzingen om te knipperen of je hoofd te bewegen.",
      hintMovement: "Draai je hoofd lichtjes en knipper wanneer daarom wordt gevraagd, zo controleren we dat je echt aanwezig bent.",
      hintLight: "Ga in goed licht staan zonder fel tegenlicht.",
      capture: "Selfie maken",
      retake: "Opnieuw nemen",
      attempts: "Poging {{count}} van {{total}}",
      permission: "Camera-toegang is nodig om verder te gaan.",
      enableCamera: "Camera toestaan",
      retryTitle: "Opnieuw proberen"
    },
    otp: {
      title: "Voer de verificatiecode in",
      description: "We hebben een zescijferige code verstuurd. Vul die in om te voltooien.",
      attempts: "Poging {{count}} van {{total}}",
      resend: "Code opnieuw versturen",
      waiting: "Wachten op bevestiging…",
      noScore: "We tonen je similariteitsscore nooit – enkel dat je geslaagd bent."
    },
    progress: {
      selfie: "Selfie controleren…",
      otp: "Code wordt gevalideerd…"
    },
    errors: {
      verificationFailed: "Verificatie mislukt. Controleer het licht en probeer opnieuw.",
      rateLimited: "Te veel pogingen. Wacht een paar minuten.",
      otpInvalid: "Deze code is ongeldig. Probeer opnieuw."
    },
    success: "Je bent geverifieerd! Geniet van alle functies.",
    badge: {
      verified: "Geverifieerd"
    }
  },
  profile: {
    form: {
      countryLabel: "Land"
    },
    errors: {
      countryRequired: "Selecteer een land."
    },
    countries: {
      RU: "Rusland",
      FR: "Frankrijk",
      DE: "Duitsland",
      AT: "Oostenrijk",
      BE: "België",
      NO: "Noorwegen"
    },
    country_hint: "Helpt om het ‘Europa’-filter te verfijnen."
  },
  region: {
    no_paywall_text:
      "Je bent aangemeld. Premiumfuncties zijn in jouw regio aan je account gekoppeld en worden na aanmelden automatisch geactiveerd."
  }
};

export default nlBE;
