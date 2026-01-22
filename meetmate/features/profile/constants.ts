import { Gender, Orientation } from "../../types";

export const GENDERS = ["female", "male"] as const satisfies ReadonlyArray<Gender>;

export const ORIENTATION_OPTIONS = [
  "women",
  "men",
  "everyone",
] as const satisfies ReadonlyArray<Orientation>;

export const COUNTRY_CODES = ["RU", "FR", "DE", "AT", "BE", "NO"] as const;

export const AVAILABLE_INTERESTS = [
  "Reisen",
  "Kochen",
  "Sport",
  "Musik",
  "Kunst",
  "Natur",
  "Technologie",
  "Gaming",
  "Lesen",
  "Tanzen",
  "Fotografie",
  "Kulinarik",
  "Wellness",
  "Abenteuer",
  "Startups",
];
