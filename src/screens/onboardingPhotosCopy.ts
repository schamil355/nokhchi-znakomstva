type OnboardingPhotosCopy = {
  title: string;
  subtitle: string;
  profileLabel: string;
  guidelines: string[];
  rulesLink: string;
  rulesTitle: string;
  rulesBody: string;
  continue: string;
  skip: string;
  back: string;
  removePhoto: string;
  removeConfirm: string;
  cancel: string;
  library: string;
  camera: string;
  selectionTitle: string;
  permissionDenied: string;
  uploadError: string;
  unsupportedFormat: string;
  instructions: string;
  sessionExpiredTitle: string;
  sessionExpiredMessage: string;
  locationConfirmed: string;
  locationCountryLabel: string;
};

export const onboardingPhotosTranslations: Record<string, OnboardingPhotosCopy> = {
  en: {
    title: "Add at least one photo",
    subtitle: "We use the profile photo for verification. Choose one where your face is clearly visible!",
    profileLabel: "Profile photo",
    guidelines: ["Clear view", "Don't hide your face", "No group photos"],
    rulesLink: "Rules and Guidelines",
    rulesTitle: "Photo rules",
    rulesBody:
      "Use a clear, recent photo of yourself. No group photos, no minors, no violent/sexual/illegal content. Face must be visible. By adding photos, you confirm you own the rights and the content follows our policies.",
    continue: "Continue",
    skip: "Later",
    back: "Back",
    removePhoto: "Remove photo?",
    removeConfirm: "Remove",
    cancel: "Cancel",
    library: "Choose from library",
    camera: "Take a photo",
    selectionTitle: "Select source",
    permissionDenied: "Permission denied. Please enable it in settings.",
    uploadError: "Could not upload photos. Please try again.",
    unsupportedFormat: "Unsupported image format. Please choose a JPG or PNG photo.",
    instructions: "Tap to add, tap the X to remove.",
    sessionExpiredTitle: "Session expired",
    sessionExpiredMessage: "Please sign in again to upload your photos.",
    locationConfirmed: "Location captured",
    locationCountryLabel: "Country:"
  },
  de: {
    title: "Füge mindestens ein Foto hinzu",
    subtitle: "Wir nutzen das Profilfoto zur Verifizierung. Wähle ein Foto, auf dem dein Gesicht gut sichtbar ist!",
    profileLabel: "Profilfoto",
    guidelines: ["Klarer Blick", "Versteck dein Gesicht nicht", "Keine Gruppenfotos"],
    rulesLink: "Regeln und Richtlinien",
    rulesTitle: "Foto-Regeln",
    rulesBody:
      "Nutze ein aktuelles, klares Foto von dir. Keine Gruppenfotos, keine Minderjährigen, kein Gewalt-/sexueller/illegaler Inhalt. Gesicht muss sichtbar sein. Mit dem Hochladen bestätigst du, dass du die Rechte hast und die Inhalte unseren Richtlinien entsprechen.",
    continue: "Weiter",
    skip: "Später",
    back: "Zurück",
    removePhoto: "Foto entfernen?",
    removeConfirm: "Entfernen",
    cancel: "Abbrechen",
    library: "Aus Galerie wählen",
    camera: "Foto aufnehmen",
    selectionTitle: "Quelle auswählen",
    permissionDenied: "Berechtigung verweigert. Bitte in den Einstellungen aktivieren.",
    uploadError: "Fotos konnten nicht hochgeladen werden. Bitte versuche es erneut.",
    unsupportedFormat: "Bildformat nicht unterstützt. Bitte wähle ein JPG- oder PNG-Foto.",
    instructions: "Tippen zum Hinzufügen, X zum Entfernen.",
    sessionExpiredTitle: "Sitzung abgelaufen",
    sessionExpiredMessage: "Bitte melde dich erneut an, um deine Fotos hochzuladen.",
    locationConfirmed: "Standort erkannt",
    locationCountryLabel: "Land:"
  },
  fr: {
    title: "Ajoute au moins une photo",
    subtitle: "Nous utilisons la photo de profil pour la vérification. Choisis une photo où ton visage est bien visible !",
    profileLabel: "Photo de profil",
    guidelines: ["Visage net", "Ne cache pas ton visage", "Pas de photos de groupe"],
    rulesLink: "Règles et directives",
    rulesTitle: "Règles photo",
    rulesBody:
      "Utilise une photo récente et claire de toi. Pas de photos de groupe, pas de mineurs, pas de contenu violent/sexuel/illégal. Le visage doit être visible. En ajoutant des photos, tu confirmes détenir les droits et respecter nos directives.",
    continue: "Continuer",
    skip: "Plus tard",
    back: "Retour",
    removePhoto: "Supprimer la photo ?",
    removeConfirm: "Supprimer",
    cancel: "Annuler",
    library: "Choisir dans la galerie",
    camera: "Prendre une photo",
    selectionTitle: "Choisir la source",
    permissionDenied: "Autorisation refusée. Active-la dans les réglages.",
    uploadError: "Impossible de téléverser les photos. Réessaie.",
    unsupportedFormat: "Format d'image non pris en charge. Choisis une photo JPG ou PNG.",
    instructions: "Touchez pour ajouter, appuyez sur le X pour supprimer.",
    sessionExpiredTitle: "Session expirée",
    sessionExpiredMessage: "Merci de te reconnecter pour téléverser tes photos.",
    locationConfirmed: "Localisation confirmée",
    locationCountryLabel: "Pays :"
  },
  ru: {
    title: "Добавь хотя бы одно фото",
    subtitle: "Мы используем фото профиля для проверки. Выбери то, где хорошо видно твоё лицо!",
    profileLabel: "Фото профиля",
    guidelines: ["Чёткий взгляд", "Не скрывай лицо", "Без групповых фото"],
    rulesLink: "Правила и рекомендации",
    rulesTitle: "Правила для фото",
    rulesBody:
      "Используй своё недавнее, чёткое фото. Без групповых фото, без несовершеннолетних, без насилия/секса/незаконного контента. Лицо должно быть видно. Загружая фото, ты подтверждаешь права и соответствие правилам.",
    continue: "Далее",
    skip: "Позже",
    back: "Назад",
    removePhoto: "Удалить фото?",
    removeConfirm: "Удалить",
    cancel: "Отмена",
    library: "Выбрать из галереи",
    camera: "Сделать фото",
    selectionTitle: "Выбери источник",
    permissionDenied: "Разрешение отклонено. Включи его в настройках.",
    uploadError: "Не удалось загрузить фото. Попробуй ещё раз.",
    unsupportedFormat: "Формат фото не поддерживается. Выберите JPG или PNG.",
    instructions: "Нажми, чтобы добавить; нажми X, чтобы удалить.",
    sessionExpiredTitle: "Сессия истекла",
    sessionExpiredMessage: "Пожалуйста, войди снова, чтобы загрузить фото.",
    locationConfirmed: "Локация определена",
    locationCountryLabel: "Страна:"
  }
};
