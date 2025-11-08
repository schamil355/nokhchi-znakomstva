import * as FileSystem from "expo-file-system";

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"];

const extensionOf = (uri: string) => {
  const lower = uri.toLowerCase();
  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx) : "";
};

export const validateImageUri = async (uri: string) => {
  const ext = extensionOf(uri);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error("Bitte wähle ein Foto im Format JPG, PNG, HEIC oder WebP.");
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || typeof info.size !== "number") {
    throw new Error("Datei konnte nicht gelesen werden.");
  }

  if (info.size > MAX_UPLOAD_BYTES) {
    throw new Error("Das Foto ist zu groß. Bitte wähle ein Bild unter 6 MB.");
  }
};
