const ensureDate = (value: string | number | Date): Date => {
  if (value instanceof Date) return value;
  return new Date(value);
};

export const formatDateISO = (value: string | number | Date): string => {
  const date = ensureDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC"
});

export const formatTime = (value: string | number | Date): string => {
  const date = ensureDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return timeFormatter.format(date);
};
