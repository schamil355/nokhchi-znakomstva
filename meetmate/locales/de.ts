const de = {
  common: {
    email: "E-Mail",
    password: "Passwort",
    confirmPassword: "Passwort bestätigen",
    cancel: "Abbrechen",
    save: "Speichern"
  },
  auth: {
    signIn: {
      title: "Willkommen bei meetmate",
      submit: "Einloggen",
      magicLink: "Magic Link senden",
      google: "Mit Google anmelden",
      apple: "Mit Apple anmelden",
      goToSignUp: "Kein Account? Registrieren",
      goToForgotPassword: "Passwort vergessen",
      success: "Willkommen zurück!",
      error: "Anmeldung fehlgeschlagen.",
      magicLinkSuccess: "Wir haben dir einen Magic Link geschickt. Bitte prüfe dein Postfach.",
      magicLinkError: "Magic Link konnte nicht gesendet werden.",
      oauthErrorTitle: "Anmeldung fehlgeschlagen",
      oauthErrorMessage: "Bitte versuche es erneut."
    },
    signUp: {
      title: "Konto erstellen",
      displayNamePlaceholder: "Anzeigename",
      submit: "Registrieren",
      goToSignIn: "Bereits registriert? Jetzt einloggen",
      success: "Erfolg! Bitte bestätige deine E-Mail, um dich anzumelden.",
      error: "Registrierung fehlgeschlagen.",
      locationRequiredTitle: "Standort benötigt",
      locationRequiredMessage: "Wir benötigen deinen Standort, um passende Matches in deiner Nähe zu zeigen. Bitte erlaube den Zugriff und versuche es erneut."
    },
    forgotPassword: {
      title: "Passwort zurücksetzen",
      submit: "E-Mail senden",
      goToSignIn: "Zurück zum Login",
      success: "Falls die Adresse existiert, haben wir eine E-Mail mit weiteren Schritten gesendet.",
      error: "Zurücksetzen fehlgeschlagen."
    },
    magicLinkConfirm: {
      verifying: "Link wird überprüft…",
      invalidLink: "Ungültiger oder abgelaufener Link.",
      fallbackError: "Leider hat das nicht geklappt.",
      successMessage: "Anmeldung erfolgreich! Du wirst weitergeleitet…",
      successTitle: "Willkommen!",
      errorTitle: "Uups!",
      loadingTitle: "Bitte warten…",
      backToLogin: "Zurück zum Login"
    },
    errors: {
      email: "Bitte gib eine gültige E-Mail ein.",
      passwordLength: "Mindestens 8 Zeichen.",
      displayNameMin: "Mindestens 2 Zeichen.",
      displayNameMax: "Maximal 50 Zeichen.",
      passwordMismatch: "Passwörter stimmen nicht überein.",
      oauthStart: "Anmeldung konnte nicht gestartet werden.",
      oauthFailed: "Anmeldung fehlgeschlagen. Bitte versuche es erneut.",
      oauthCancelled: "Anmeldung abgebrochen."
    },
    alerts: {
      signOutFailedTitle: "Abmelden fehlgeschlagen",
      signOutFailedMessage: "Bitte versuche es erneut."
    }
  },
  errors: {
    notLoggedIn: "Bitte melde dich erneut an.",
    generic: "Etwas ist schiefgelaufen. Bitte versuche es erneut."
  },
  verification: {
    consent: {
      title: "Identitätsprüfung",
      description: "Damit alle sicher bleiben, bestätigen wir vor dem Freischalten von Nachrichten eine kurze Selfie- und OTP-Prüfung.",
      camera: "Mache ein Live-Selfie direkt in der App (kein Upload aus der Galerie).",
      otp: "Bestätige deine E-Mail-Adresse oder Telefonnummer mit einem Einmalcode.",
      deletion: "Selfies werden direkt nach der Prüfung gelöscht; es bleiben nur anonyme Scores gespeichert.",
      checkbox: "Ich habe den Ablauf verstanden und stimme zu.",
      notice: "Wir verarbeiten deine Bilder gemäß unseren Datenschutzregeln.",
      privacyLink: "Datenschutzhinweis",
      dataPolicyLink: "Verifizierungs- & Datenrichtlinie",
      button: "Verifizierung starten"
    },
    selfie: {
      title: "Live-Selfie aufnehmen",
      instructions: "Positioniere dein Gesicht mittig, schaue in die Kamera und folge den Blink-/Kopfbewegungen.",
      hintMovement: "Drehe den Kopf leicht und blinzle auf Hinweis, damit wir die Lebenderkennung prüfen können.",
      hintLight: "Sorge für gutes Licht und vermeide starken Gegenlicht-Einfall.",
      capture: "Selfie aufnehmen",
      retake: "Erneut aufnehmen",
      attempts: "Versuch {{count}} von {{total}}",
      permission: "Für den Vorgang benötigen wir Zugriff auf deine Kamera.",
      enableCamera: "Kamera erlauben",
      retryTitle: "Noch einmal versuchen"
    },
    otp: {
      title: "Bestätigungscode eingeben",
      description: "Wir haben dir einen 6-stelligen Code geschickt. Gib ihn ein, um die Verifizierung abzuschließen.",
      attempts: "Versuch {{count}} von {{total}}",
      resend: "Code erneut senden",
      waiting: "Warte auf Bestätigung…",
      noScore: "Wir zeigen keine Scores an – nur den erfolgreichen Abschluss."
    },
    progress: {
      selfie: "Selfie wird geprüft…",
      otp: "Code wird verifiziert…"
    },
    errors: {
      verificationFailed: "Die Verifizierung ist fehlgeschlagen. Prüfe Licht und Position und versuche es erneut.",
      rateLimited: "Zu viele Versuche. Bitte warte einige Minuten.",
      otpInvalid: "Der Code ist ungültig. Bitte erneut versuchen."
    },
    success: "Verifizierung erfolgreich! Viel Spaß mit allen Funktionen.",
    badge: {
      verified: "Verifiziert"
    }
  },
  prefs: {
    region: {
      title: "Wo sollen wir nach Matches suchen?",
      nearby: "In der Nähe (bis 50 km)",
      chechnya: "Fokus Tschetschenien",
      europe: "Europa (EU-Basis-Set)",
      russia: "Ganz Russland",
      russiaDescription: "Umfasst verifizierte Accounts in der gesamten Russischen Föderation.",
      russiaCities: {
        moscow: "Moskau",
        saintPetersburg: "Sankt Petersburg",
        kazan: "Kasan",
        novosibirsk: "Nowosibirsk"
      },
      saved: "Suchpräferenzen aktualisiert."
    }
  },
  home: {
    greeting: "Hallo {{email}} 👋",
    greetingFallback: "Freund",
    subtitle: "Du bist angemeldet und siehst eine geschützte Seite.",
    buttons: {
      discovery: "Entdecken",
      matches: "Matches",
      profile: "Mein Profil",
      paywall: "Premium anzeigen",
      boost: "Boost aktivieren",
      privacy: "Datenschutz",
      debug: "Debug Entitlements",
      signOut: "Abmelden"
    },
    toast: {
      boostRegion: "Boosts sind in deiner Region konto-gebunden.",
      boostPremium: "Boosts sind nur für Premium verfügbar.",
      boostActivated: "Boost aktiviert!",
      paywallDisabled: "In deiner Region ist die Paywall deaktiviert."
    }
  },
  profile: {
    loadingProfile: "Profil wird geladen…",
    form: {
      heading: "Persönliche Angaben",
      displayNamePlaceholder: "Anzeigename",
      birthdatePlaceholder: "Geburtsdatum (YYYY-MM-DD)",
      genderLabel: "Geschlecht",
      orientationLabel: "Orientierung",
      bioLabel: "Über dich",
      bioPlaceholder: "Erzähle etwas über dich…",
      interestsLabel: "Interessen",
      photosLabel: "Fotos",
      photoRemove: "Entfernen",
      photoChoose: "Foto wählen",
      photoCapture: "Foto aufnehmen",
      locationLabel: "Standort",
      locationButton: "Aktualisieren",
      locationUnset: "Standort nicht gesetzt",
      locationCoordinates: "Lat {{lat}}, Lng {{lng}}",
      countryLabel: "Land",
      devPhoto: "Dummy-Foto",
      devLocation: "Dummy-Standort",
      submitCreate: "Profil anlegen",
      submitUpdate: "Profil speichern"
    },
    errors: {
      cameraPermission: "Bitte erlaube den Kamerazugriff.",
      libraryPermission: "Bitte erlaube den Zugriff auf deine Fotomediathek.",
      photoUpload: "Foto konnte nicht hochgeladen werden.",
      photoRemove: "Foto konnte nicht entfernt werden.",
      locationFail: "Standort konnte nicht ermittelt werden.",
      submitFailed: "Speichern fehlgeschlagen.",
      displayNameMin: "Anzeigename muss mindestens 2 Zeichen haben.",
      displayNameMax: "Anzeigename darf maximal 50 Zeichen haben.",
      bioMax: "Bio darf maximal 500 Zeichen haben.",
      birthdateInvalid: "Bitte gib ein gültiges Datum ein.",
      ageRestriction: "Du musst mindestens 18 Jahre alt sein.",
      interestsMin: "Bitte wähle mindestens ein Interesse.",
      photosMin: "Mindestens ein Foto erforderlich.",
      countryRequired: "Bitte wähle ein Land."
    },
    screen: {
      noProfile: "Du hast noch kein Profil angelegt.",
      create: "Profil erstellen",
      about: "Über mich",
      descriptionFallback: "Noch keine Beschreibung vorhanden.",
      photos: "Fotos",
      interests: "Interessen",
      location: "Standort",
      edit: "Profil bearbeiten"
    },
    gender: {
      female: "Weiblich",
      male: "Männlich"
    },
    orientation: {
      women: "Interessiert an Frauen",
      men: "Interessiert an Männern",
      everyone: "Offen für alle"
    },
    interests: {
      Reisen: "Reisen",
      Kochen: "Kochen",
      Sport: "Sport",
      Musik: "Musik",
      Kunst: "Kunst",
      Natur: "Natur",
      Technologie: "Technologie",
      Gaming: "Gaming",
      Lesen: "Lesen",
      Tanzen: "Tanzen",
      Fotografie: "Fotografie",
      Kulinarik: "Kulinarik",
      Wellness: "Wellness",
      Abenteuer: "Abenteuer",
      Startups: "Startups"
    },
    countries: {
      RU: "Russland",
      FR: "Frankreich",
      DE: "Deutschland",
      AT: "Österreich",
      BE: "Belgien",
      NO: "Norwegen"
    },
    country_hint: "Hilft, deine Suchregion ‚Europa‘ besser zu filtern."
  },
  discovery: {
    title: "Entdecken",
    noPhoto: "Kein Foto",
    distance: "{{distance}} km entfernt",
    distanceUnknown: "Entfernung unbekannt",
    bioFallback: "Noch keine Beschreibung vorhanden.",
    locationRequiredTitle: "Standort benötigt",
    locationRequiredDescription: "Wir konnten deinen Standort nicht bestimmen. Bitte aktiviere die Standortfreigabe.",
    retry: "Erneut versuchen",
    errorTitle: "Ups, etwas ist schiefgelaufen",
    errorDescription: "Wir konnten deine Vorschläge nicht laden. Bitte versuche es erneut.",
    emptyTitle: "Gerade keine neuen Vorschläge",
    emptyDescription: "Aktualisiere den Feed oder schaue später erneut vorbei.",
    refresh: "Aktualisieren",
    empty: {
      chechnya: "Derzeit gibt es keine weiteren Profile in Tschetschenien. Wechsle die Region, um mehr Vorschläge zu sehen.",
      europe: "Im europäischen Pool gibt es aktuell keine neuen Vorschläge. Schau bald wieder vorbei.",
      russia: "Aktuell keine neuen Matches in Russland. Aktualisiere den Feed oder wechsle die Region.",
      nearby: "In deiner Nähe sind gerade keine neuen Profile verfügbar. Versuche es später erneut oder passe die Region an.",
      changeRegion: "Region wechseln"
    },
    swipe: {
      limitPremium: "Tageslimit erreicht – Upgrade für unbegrenzte Swipes.",
      limitFree: "Tageslimit erreicht. Bitte später erneut versuchen.",
      superLikeEmpty: "Keine Super-Likes mehr übrig.",
      superLikeRegion: "Super-Likes sind in deiner Region konto-gebunden."
    },
    blockAction: "Blockieren",
    reportAction: "Melden",
    blockSuccess: "{{name}} wurde blockiert.",
    blockError: "Blockieren nicht möglich.",
    reportThanks: "Danke für deine Meldung.",
    reportError: "Meldung nicht möglich.",
    matchTitle: "It’s a match! 🎉",
    matchSubtitle: "Du und {{name}} habt euch gegenseitig geliked. Ihr könnt jetzt im Chat schreiben.",
    matchContinue: "Weiter swipen",
    reportTitle: "Profil melden",
    reportDetailsPlaceholder: "Details (optional)",
    reportCancel: "Abbrechen",
    reportSubmit: "Meldung senden"
  },
  chat: {
    matches: {
      blockSuccess: "Match ausgeblendet.",
      blockError: "Blockieren nicht möglich.",
      reportSuccess: "Danke für deine Meldung.",
      reportError: "Meldung nicht möglich.",
      unknownUser: "Unbekannt",
      noMessages: "Noch keine Nachrichten",
      emptyTitle: "Noch keine Matches",
      emptyDescription: "Swipe durch Discovery, um neue Verbindungen zu finden.",
      refresh: "Aktualisieren",
      modalTitle: "Match melden oder blockieren",
      modalHint: "Langer Druck auf ein Match öffnet dieses Menü.",
      detailsPlaceholder: "Details (optional)",
      cancel: "Abbrechen",
      block: "Blockieren",
      report: "Melden"
    },
    screen: {
      sendSuccess: "Nachricht gesendet.",
      sendError: "Nachricht konnte nicht gesendet werden.",
      blockSuccess: "Benutzer blockiert.",
      blockError: "Blockieren nicht möglich.",
      reportSuccess: "Danke für deine Meldung.",
      reportError: "Meldung nicht möglich.",
      notFoundTitle: "Konversation nicht gefunden",
      notFoundDescription: "Bitte starte den Chat erneut über deine Matches.",
      emptyTitle: "Starte die Unterhaltung",
      emptyDescription: "Sag hallo und lernt euch kennen.",
      inputPlaceholder: "Nachricht…",
      send: "Senden",
      report: "Melden",
      block: "Blockieren",
      modalTitle: "Nutzer melden",
      modalHint: "Beschreibe kurz, was passiert ist.",
      detailsPlaceholder: "Details (optional)",
      cancel: "Abbrechen",
      submitReport: "Senden",
      optimistic: "Senden…"
    }
  },
  paywall: {
    title: "Upgrade auf meetmate Premium",
    subtitle: "Deine aktuellen Vorteile: {{swipes}} · Boost: {{boost}} · Super-Likes: {{super}}",
    statusTitle: "Status",
    unlimitedLabel: "Unbegrenzte Swipes",
    boostLabel: "Boost",
    superLikeLabel: "Super-Likes",
    statusActive: "Aktiv",
    statusLocked: "Gesperrt",
    statusActiveWithCount: "Aktiv ({{count}})",
    swipes: {
      unlimited: "Unbegrenzt",
      limited: "Begrenzt"
    },
    boost: {
      available: "Verfügbar",
      locked: "Gesperrt"
    },
    pricePerMonth: "{{price}} pro Monat",
    noOffers: "Derzeit sind keine Angebote verfügbar.",
    buy: "Jetzt sichern",
    manualSync: "Schon bezahlt?",
    restore: "Käufe wiederherstellen",
    back: "Zurück",
    toast: {
      offerError: "Angebote konnten nicht geladen werden.",
      purchaseSuccess: "Kauf erfolgreich.",
      purchaseCancelled: "Kauf abgebrochen.",
      purchaseFailed: "Kauf fehlgeschlagen.",
      restoreSuccess: "Käufe wiederhergestellt.",
      restoreFailed: "Wiederherstellung fehlgeschlagen.",
      syncSuccess: "Vorteile aktualisiert.",
      syncFailed: "Aktualisierung fehlgeschlagen.",
      purchaseUnsupported:
        "Käufe benötigen einen Development Build. In Expo Go stehen diese Funktionen nicht zur Verfügung."
    }
  },
  moderation: {
    errors: {
      selfBlock: "Du kannst dich nicht selbst blockieren.",
      rateLimited: "Bitte warte einen Moment, bevor du die nächste Aktion ausführst.",
      messageProfanity: "Bitte formuliere deine Nachricht freundlicher.",
      messageContact: "Bitte teile keine E-Mail-Adressen oder Telefonnummern im Chat."
    },
    reasons: {
      spam: "Spam",
      fake: "Fake-Profil",
      abuse: "Missbrauch",
      other: "Sonstiges"
    }
  },
  privacy: {
    title: "Datenschutz & Privatsphäre",
    description:
      "Du kannst hier jederzeit deine Daten exportieren oder löschen. Wir senden dir beim Export eine kompakte JSON-Ansicht deiner gespeicherten Informationen.",
    exportTitle: "Datenexport",
    exportDescription: "Erhalte eine Zusammenfassung deiner Profildaten, Matches, Nachrichten und Meldungen.",
    exportCta: "Export starten",
    exportSuccess: "Export erstellt.",
    exportFailed: "Export fehlgeschlagen.",
    exportDataTitle: "Deine Daten",
    deleteTitle: "Konto löschen",
    deleteDescription: "Alle Daten werden dauerhaft entfernt. Dieser Schritt kann nicht rückgängig gemacht werden.",
    deleteCta: "Daten löschen",
    deleteInfo: "Deine Daten werden gelöscht.",
    deleteFailed: "Löschung fehlgeschlagen.",
    linkPolicy: "Privacy Policy",
    linkImprint: "Impressum"
  },
  region: {
    no_paywall_text:
      "Du bist eingeloggt. Premium-Funktionen sind in deiner Region kontogebunden und werden nach Anmeldung automatisch freigeschaltet."
  },
  tabs: {
    discovery: "Entdecken",
    matches: "Matches",
    profile: "Profil"
  },
  settings: {
    open: "Einstellungen"
  },
  featureFlags: {
    disabled: "Diese Funktion ist noch nicht freigeschaltet."
  }
} as const;

export default de;
