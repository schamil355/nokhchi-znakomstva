import { differenceInYears } from "date-fns";
import { z } from "zod";
import { COUNTRY_CODES, GENDERS, ORIENTATION_OPTIONS } from "./constants";

export const photoSchema = z.object({
  path: z.string(),
  url: z.string().url(),
});

const genderEnum = z.enum(GENDERS);
const orientationEnum = z.enum(ORIENTATION_OPTIONS);
const countryEnum = z.enum(COUNTRY_CODES, {
  errorMap: () => ({ message: "profile.errors.countryRequired" }),
});

export const profileFormSchema = z.object({
  displayName: z
    .string()
    .min(2, "profile.errors.displayNameMin")
    .max(50, "profile.errors.displayNameMax"),
  bio: z.string().max(500, "profile.errors.bioMax").optional().default(""),
  birthdate: z
    .string()
    .refine((value) => {
      const birthDate = new Date(value);
      return !Number.isNaN(birthDate.getTime());
    }, "profile.errors.birthdateInvalid")
    .refine((value) => {
      const birthDate = new Date(value);
      if (Number.isNaN(birthDate.getTime())) {
        return false;
      }
      return differenceInYears(new Date(), birthDate) >= 18;
    }, "profile.errors.ageRestriction"),
  gender: genderEnum,
  orientation: orientationEnum,
  interests: z.array(z.string()).min(1, "profile.errors.interestsMin"),
  photos: z.array(photoSchema).min(1, "profile.errors.photosMin"),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .nullable()
    .optional(),
  country: countryEnum,
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
