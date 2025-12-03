import { create } from "zustand";

export type OnboardingGender = "male" | "female";
export type NotificationAuthorizationStatus =
  | "granted"
  | "provisional"
  | "denied"
  | "blocked"
  | "unavailable"
  | "skipped";

export type LocationPermissionStatus =
  | "idle"
  | "granted"
  | "denied"
  | "blocked"
  | "unavailable"
  | "skipped";

export type OnboardingLocation = {
  status: LocationPermissionStatus;
  latitude: number | null;
  longitude: number | null;
  country?: string | null;
  countryName?: string | null;
};

type OnboardingState = {
  selectedGender: OnboardingGender | null;
  name: string;
  dob: string | null;
  age: number | null;
  notificationsStatus: NotificationAuthorizationStatus | null;
  pushToken: string | null;
  location: OnboardingLocation;
  photosUploaded: boolean;
  showVerifySuccess: boolean;
  setGender: (gender: OnboardingGender) => void;
  setName: (name: string) => void;
  setDob: (dob: string | null) => void;
  setAge: (age: number | null) => void;
  setNotifications: (payload: { status: NotificationAuthorizationStatus; token?: string | null }) => void;
  setLocation: (location: Partial<OnboardingLocation>) => void;
  setPhotosUploaded: (uploaded: boolean) => void;
  setShowVerifySuccess: (show: boolean) => void;
  reset: () => void;
};

const defaultLocation: OnboardingLocation = {
  status: "idle",
  latitude: null,
  longitude: null,
  country: null,
  countryName: null
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  selectedGender: null,
  name: "",
  dob: null,
  age: null,
  notificationsStatus: null,
  pushToken: null,
  location: defaultLocation,
  photosUploaded: false,
  showVerifySuccess: false,
  setGender: (selectedGender) => set({ selectedGender }),
  setName: (name) => set({ name }),
  setDob: (dob) => set({ dob }),
  setAge: (age) => set({ age }),
  setNotifications: ({ status, token = null }) =>
    set({ notificationsStatus: status, pushToken: token ?? null }),
  setLocation: (partial) =>
    set((state) => ({
      location: {
        ...state.location,
        ...partial
      }
    })),
  setPhotosUploaded: (uploaded) => set({ photosUploaded: uploaded }),
  setShowVerifySuccess: (show) => set({ showVerifySuccess: show }),
  reset: () =>
    set({
      selectedGender: null,
      name: "",
      dob: null,
      age: null,
      notificationsStatus: null,
      pushToken: null,
      location: defaultLocation,
      photosUploaded: false,
      showVerifySuccess: false
    })
}));
