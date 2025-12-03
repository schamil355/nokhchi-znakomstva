import * as FileSystem from "expo-file-system";
import { getCurrentLocale } from "../localization/LocalizationProvider";

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"];

type ImageCopy = {
  invalidFormat: string;
  unreadable: string;
  tooLarge: string;
};

const translations: Record<string, ImageCopy> = {
  en: {
    invalidFormat: "Please choose a photo in JPG, PNG, HEIC or WebP format.",
    unreadable: "File could not be read.",
    tooLarge: "The photo is too large. Please pick an image under 6 MB."
  },
  de: {
    invalidFormat: "Bitte wähle ein Foto im Format JPG, PNG, HEIC oder WebP.",
    unreadable: "Datei konnte nicht gelesen werden.",
    tooLarge: "Das Foto ist zu groß. Bitte wähle ein Bild unter 6 MB."
  },
  fr: {
    invalidFormat: "Choisis une photo au format JPG, PNG, HEIC ou WebP.",
    unreadable: "Impossible de lire le fichier.",
    tooLarge: "La photo est trop lourde. Choisis une image de moins de 6 Mo."
  },
  ru: {
    invalidFormat: "Выбери фото в формате JPG, PNG, HEIC или WebP.",
    unreadable: "Не удалось прочитать файл.",
    tooLarge: "Фото слишком большое. Выбери файл меньше 6 МБ."
  }
};

const locale = getCurrentLocale();
const t = (key: keyof typeof translations.en) => {
  const locale = getCurrentLocale();
  return translations[locale]?.[key] ?? translations.en[key];
};

const extensionOf = (uri: string) => {
  const lower = uri.toLowerCase();
  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx) : "";
};

export const validateImageUri = async (uri: string) => {
  const ext = extensionOf(uri);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(t("invalidFormat"));
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || typeof info.size !== "number") {
    throw new Error(t("unreadable"));
  }

  if (info.size > MAX_UPLOAD_BYTES) {
    throw new Error(t("tooLarge"));
  }
};
