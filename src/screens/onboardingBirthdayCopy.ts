type OnboardingBirthdayCopy = {
  title: string;
  subtitle: string;
  selectLabel: string;
  selectHint: string;
  continue: string;
  continueHint: string;
  back: string;
  ageLabel: (age: number) => string;
  dateLocale: string;
};

export const onboardingBirthdayTranslations: Record<string, OnboardingBirthdayCopy> = {
  en: {
    title: "When is your birthday?",
    subtitle: "Your profile shows your age, not the exact date.",
    selectLabel: "Pick birth date",
    selectHint: "Opens the date picker",
    continue: "Continue",
    continueHint: "Continue to the next step",
    back: "Back",
    ageLabel: (age: number) => `${age} years old`,
    dateLocale: "en-US"
  },
  de: {
    title: "Wann hast du Geburtstag?",
    subtitle: "Dein Profil zeigt dein Alter, nicht dein Geburtsdatum.",
    selectLabel: "Geburtsdatum auswählen",
    selectHint: "Öffnet den Datumswähler",
    continue: "Weiter",
    continueHint: "Weiter zum nächsten Schritt",
    back: "Zurück",
    ageLabel: (age: number) => `${age} Jahre alt`,
    dateLocale: "de-DE"
  },
  fr: {
    title: "Quelle est ta date de naissance ?",
    subtitle: "Sur ton profil, nous montrons ton âge, pas la date exacte.",
    selectLabel: "Choisir la date de naissance",
    selectHint: "Ouvre le sélecteur de date",
    continue: "Continuer",
    continueHint: "Passer à l'étape suivante",
    back: "Retour",
    ageLabel: (age: number) => `${age} ans`,
    dateLocale: "fr-FR"
  },
  ru: {
    title: "Когда твой день рождения?",
    subtitle: "В профиле показываем только возраст, не дату.",
    selectLabel: "Выбрать дату рождения",
    selectHint: "Откроется выбор даты",
    continue: "Далее",
    continueHint: "Перейти к следующему шагу",
    back: "Назад",
    ageLabel: (age: number) => `${age} лет`,
    dateLocale: "ru-RU"
  }
};
