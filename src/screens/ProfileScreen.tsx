import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActionSheetIOS,
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
  type AlertButton
} from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { Profile, Photo } from "../types";
import { refetchProfile, upsertProfile } from "../services/profileService";
import GuardedPhoto from "../components/GuardedPhoto";
import {
  deletePhoto as deletePhotoRemote,
  registerPhoto,
  updatePrivacySettings,
  uploadOriginalAsync,
  VisibilityMode,
  changeVisibility,
  revokeAllPermissions,
  getSignedPhotoUrl
} from "../services/photoService";
import { useOnboardingStore } from "../state/onboardingStore";
import { getSupabaseClient } from "../lib/supabaseClient";
import { getPhotoUrl, PROFILE_BUCKET } from "../lib/storage";
import { signOut as signOutService } from "../services/authService";
import { formatCountryLabel, isWithinChechnyaRadius, resolveGeoRegion } from "../lib/geo";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";
import { LinearGradient } from "expo-linear-gradient";
import VerifiedBadgePng from "../../assets/icons/icon.png";
import { useRevenueCat } from "../hooks/useRevenueCat";

const BRAND_GREEN = "#0d6e4f";
const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};
const PROFILE_AVATAR_SIZE = 120;
const PROFILE_ADD_BUTTON_SIZE = 32;
const PROFILE_ADD_BUTTON_RADIUS = PROFILE_ADD_BUTTON_SIZE / 2;
const PROFILE_ADD_BUTTON_BOTTOM = 0;
const PROFILE_ADD_BUTTON_RIGHT = -2;
const VERIFIED_BADGE_WRAPPER_SIZE = 36;
const PROFILE_SCREEN_TOP_PADDING = 90;
const PROFILE_PHOTO_SLOT_COUNT = 6;

const VerifiedBadge = ({ size = VERIFIED_BADGE_WRAPPER_SIZE }) => (
  <Image source={VerifiedBadgePng} style={{ width: size, height: size }} resizeMode="contain" />
);

const dedupeProfilePhotos = (photos: Photo[]): Photo[] => {
  const seen = new Set<string>();
  const result: Photo[] = [];
  for (const photo of photos) {
    const key =
      (typeof photo.assetId === "number" && Number.isFinite(photo.assetId)
        ? `asset:${photo.assetId}`
        : undefined) ??
      (photo.storagePath ? `path:${photo.storagePath}` : undefined) ??
      (photo.url ? `url:${photo.url}` : undefined) ??
      (photo.id ? `id:${photo.id}` : undefined);
    if (!key) {
      continue;
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(photo);
  }
  return result;
};

const toCoordinate = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

type CopyShape = {
  visibilityOptions: Record<VisibilityMode, string>;
  locationUnknown: string;
  locationChechnya: string;
  defaultProfileName: string;
  editProfile: string;
  removePhoto: string;
  viewLoading: string;
  edit: {
    back: string;
    title: string;
    subtitle: string;
    noPhoto: string;
  };
  buttons: {
    addPhotoLoading: string;
    addPhoto: string;
    saveLoading: string;
    save: string;
    signOutLoading: string;
    signOut: string;
  };
  labels: {
    visibility: string;
    bio: string;
    interests: string;
    incognito: string;
    showDistance: string;
    showLastSeen: string;
  };
  placeholders: {
    bio: string;
    interests: string;
  };
  hints: {
    logoutPrimary: string;
    logoutSecondary: string;
  };
  photoManager: {
    title: string;
    subtitle: string;
    instructions: string;
    primaryBadge: string;
    addLabel: string;
    done: string;
  };
  alerts: {
    savedTitle: string;
    savedMessage: string;
    errorTitle: string;
    saveError: string;
    permissionTitle: string;
    permissionMessage: string;
    photoSavedTitle: string;
    photoSavedMessage: string;
    uploadFailedTitle: string;
    uploadFailedMessage: string;
    noteTitle: string;
    noteMessage: string;
    photoDeleteError: string;
    signOutErrorTitle: string;
    signOutErrorMessage: string;
    signOutConfirmTitle: string;
    signOutConfirmMessage: string;
    cancel: string;
    confirmSignOut: string;
    actionNotPossibleTitle: string;
    actionNoAsset: string;
    visibilityUpdatedTitle: string;
    visibilityUpdatedMessage: string;
    visibilityErrorMessage: string;
    sharesUpdatedTitle: string;
    sharesUpdatedMessage: string;
    sharesErrorMessage: string;
    visibilitySheetTitle: string;
    changeVisibility: string;
    revokeShares: string;
    deletePhoto: string;
    photoActionsTitle: string;
  };
};

const baseCopy: CopyShape = {
  visibilityOptions: {
    public: "Public",
    match_only: "Connections only",
    whitelist: "Whitelist",
    blurred_until_match: "Blurred until connection",
  },
  locationUnknown: "Location unknown",
  locationChechnya: "Chechnya",
  defaultProfileName: "Your profile",
  editProfile: "Edit profile",
  removePhoto: "Remove",
  viewLoading: "Loading your profile…",
  edit: {
    back: "Back",
    title: "Edit profile",
    subtitle: "Update your photos and details",
    noPhoto: "No photo",
  },
  buttons: {
    addPhotoLoading: "Uploading…",
    addPhoto: "Add photo",
    saveLoading: "Saving…",
    save: "Save profile",
    signOutLoading: "Signing out…",
    signOut: "Sign out",
  },
  labels: {
    visibility: "Default visibility for new photos",
    bio: "Bio",
    interests: "Interests",
    incognito: "Stay anonymous",
    showDistance: "Show distance",
    showLastSeen: "Show last seen",
  },
  placeholders: {
    bio: "Tell people a little about yourself…",
    interests: "e.g. travel, fitness, music",
  },
  hints: {
    logoutPrimary: "Would you like to sign out and return to the start?",
    logoutSecondary: "Want to sign in with a different account?",
  },
  photoManager: {
    title: "My photos",
    subtitle: "Manage your gallery. The first tile is your main profile photo.",
    instructions: "The first photo is your profile photo!",
    primaryBadge: "Profile photo",
    addLabel: "Add photo",
    done: "Done"
  },
  alerts: {
    savedTitle: "Saved",
    savedMessage: "Your profile was updated.",
    errorTitle: "Error",
    saveError: "Could not save your profile.",
    permissionTitle: "Permission required",
    permissionMessage: "Please allow access to your photos.",
    photoSavedTitle: "Saved",
    photoSavedMessage: "Photo registered.",
    uploadFailedTitle: "Upload failed",
    uploadFailedMessage: "Please try again later.",
    noteTitle: "Heads-up",
    noteMessage: "Older photos can currently only be removed via support.",
    photoDeleteError: "Could not delete the photo.",
    signOutErrorTitle: "Sign-out failed",
    signOutErrorMessage: "Please try again.",
    signOutConfirmTitle: "Sign out",
    signOutConfirmMessage: "Are you sure you want to sign out?",
    cancel: "Cancel",
    confirmSignOut: "Sign out",
    actionNotPossibleTitle: "Action unavailable",
    actionNoAsset: "No asset ID is available for this photo.",
    visibilityUpdatedTitle: "Updated",
    visibilityUpdatedMessage: "Photo visibility changed.",
    visibilityErrorMessage: "Could not update visibility.",
    sharesUpdatedTitle: "Updated",
    sharesUpdatedMessage: "All access was revoked.",
    sharesErrorMessage: "Could not revoke access.",
    visibilitySheetTitle: "Visibility",
    changeVisibility: "Change visibility",
    revokeShares: "Revoke access",
    deletePhoto: "Delete photo",
    photoActionsTitle: "Photo actions"
  },
};

const translations: Record<string, CopyShape> = {
  en: baseCopy,
  de: {
    ...baseCopy,
  visibilityOptions: {
    public: "Öffentlich",
    match_only: "Nur Verbindungen",
    whitelist: "Whitelist",
    blurred_until_match: "Blur bis Verbindung",
  },
    locationUnknown: "Standort unbekannt",
    locationChechnya: "Tschetschenien",
    defaultProfileName: "Dein Profil",
    editProfile: "Profil bearbeiten",
    removePhoto: "Entfernen",
    viewLoading: "Lade dein Profil...",
    edit: {
      back: "Zurück",
      title: "Profil bearbeiten",
      subtitle: "Aktualisiere deine Fotos und Angaben",
      noPhoto: "Kein Foto",
    },
    buttons: {
      addPhotoLoading: "Wird hochgeladen...",
      addPhoto: "Foto hinzufügen",
      saveLoading: "Speichern...",
      save: "Profil speichern",
      signOutLoading: "Melde ab...",
      signOut: "Abmelden"
    },
    labels: {
      visibility: "Sichtbarkeit neuer Fotos",
      bio: "Bio",
      interests: "Interessen",
      incognito: "Anonym bleiben",
      showDistance: "Distanz anzeigen",
      showLastSeen: "Zuletzt online anzeigen",
    },
    placeholders: {
      bio: "Erzähle etwas über dich...",
      interests: "z.B. Reisen, Fitness, Musik",
    },
    hints: {
      logoutPrimary: "Möchtest du dich abmelden und zur Startseite zurückkehren?",
      logoutSecondary: "Du möchtest dich mit einem anderen Account anmelden?",
    },
    photoManager: {
      title: "Meine Fotos",
      subtitle: "Verwalte deine Fotos. Das erste Foto ist dein Profilfoto.",
      instructions: "Das erste Foto ist dein Profilfoto!",
      primaryBadge: "Profilfoto",
      addLabel: "Foto hinzufügen",
      done: "Fertig"
    },
    alerts: {
      savedTitle: "Gespeichert",
      savedMessage: "Dein Profil wurde aktualisiert.",
      errorTitle: "Fehler",
      saveError: "Konnte Profil nicht speichern.",
      permissionTitle: "Berechtigung benötigt",
      permissionMessage: "Bitte erlaube den Zugriff auf deine Fotos.",
      photoSavedTitle: "Gespeichert",
      photoSavedMessage: "Foto wurde registriert.",
      uploadFailedTitle: "Upload fehlgeschlagen",
      uploadFailedMessage: "Bitte versuche es später erneut.",
      noteTitle: "Hinweis",
      noteMessage: "Ältere Fotos können derzeit nur über den Support gelöscht werden.",
      photoDeleteError: "Foto konnte nicht gelöscht werden.",
      signOutErrorTitle: "Abmelden fehlgeschlagen",
      signOutErrorMessage: "Bitte versuche es erneut.",
      signOutConfirmTitle: "Abmelden",
      signOutConfirmMessage: "Möchtest du dich wirklich abmelden?",
      cancel: "Abbrechen",
      confirmSignOut: "Abmelden",
      actionNotPossibleTitle: "Aktion nicht möglich",
      actionNoAsset: "Für dieses Foto liegt keine Asset-ID vor.",
      visibilityUpdatedTitle: "Aktualisiert",
      visibilityUpdatedMessage: "Sichtbarkeit wurde geändert.",
      visibilityErrorMessage: "Sichtbarkeit konnte nicht geändert werden.",
      sharesUpdatedTitle: "Aktualisiert",
      sharesUpdatedMessage: "Alle Freigaben wurden entfernt.",
      sharesErrorMessage: "Freigaben konnten nicht widerrufen werden.",
      visibilitySheetTitle: "Sichtbarkeit",
      changeVisibility: "Sichtbarkeit ändern",
      revokeShares: "Freigaben widerrufen",
      deletePhoto: "Foto löschen",
      photoActionsTitle: "Foto-Aktionen"
    },
  },
  fr: {
    ...baseCopy,
    labels: {
      ...baseCopy.labels,
      incognito: "Rester anonyme",
    },
    locationChechnya: "Tchétchénie",
    photoManager: {
      title: "Mes photos",
      subtitle: "Gère ta galerie. La première tuile est ta photo de profil.",
      instructions: "La première photo est ta photo de profil !",
      primaryBadge: "Photo de profil",
      addLabel: "Ajouter une photo",
      done: "Terminé"
    },
    buttons: {
      ...baseCopy.buttons,
      signOutLoading: "Déconnexion...",
      signOut: "Se déconnecter"
    },
    alerts: {
      ...baseCopy.alerts
    }
  },
  ru: {
    ...baseCopy,
    labels: {
      ...baseCopy.labels,
      incognito: "Оставаться анонимным",
    },
    locationChechnya: "Чечня",
    photoManager: {
      title: "Мои фото",
      subtitle: "Управляй галереей. Первый слот — фото профиля.",
      instructions: "Первое фото — фото профиля!",
      primaryBadge: "Фото профиля",
      addLabel: "Добавить фото",
      done: "Готово"
    },
    buttons: {
      ...baseCopy.buttons,
      signOutLoading: "Выходим...",
      signOut: "Выйти"
    },
    alerts: {
      ...baseCopy.alerts,
      signOutErrorTitle: "Не удалось выйти",
      signOutErrorMessage: "Попробуйте еще раз.",
      signOutConfirmTitle: "Выйти",
      signOutConfirmMessage: "Вы уверены, что хотите выйти?",
      cancel: "Отмена",
      confirmSignOut: "Выйти"
    }
  },
};

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const session = useAuthStore((state) => state.session);
  const isPremium = useAuthStore((state) => state.profile?.isPremium ?? false);
  const { isPro } = useRevenueCat({ loadOfferings: false });
  const copy = useLocalizedCopy(translations);
  const compassCopy = useLocalizedCopy({
    en: {
      title: "Relationship compass",
      subtitle: "Optional. Highlight your values and pace.",
      cta: "Answer compass questions"
    },
    de: {
      title: "Beziehungs-Kompass",
      subtitle: "Optional. Zeig deine Werte und dein Tempo.",
      cta: "Kompass-Fragen beantworten"
    },
    fr: {
      title: "Compas relationnel",
      subtitle: "Optionnel. Affiche tes valeurs et ton rythme.",
      cta: "Répondre aux questions"
    },
    ru: {
      title: "Компас отношений",
      subtitle: "Необязательно. Покажи ценности и темп.",
      cta: "Ответить на вопросы"
    }
  });
  const errorCopy = useErrorCopy();
  const profile = useAuthStore((state) => state.profile);
  const viewerRegion = useMemo(() => {
    if (!profile) {
      return null;
    }
    return resolveGeoRegion({
      countryCode: profile.country ?? null,
      regionCode: profile.regionCode ?? null,
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null
    });
  }, [profile?.country, profile?.regionCode, profile?.latitude, profile?.longitude]);
  const isFreeRegion = viewerRegion === "chechnya" || viewerRegion === "russia";
  const hasPremiumAccess = isPremium || isPro || isFreeRegion;
  const setProfile = useAuthStore((state) => state.setProfile);
  const onboardingName = useOnboardingStore((state) => state.name);
  const onboardingDob = useOnboardingStore((state) => state.dob);
  const onboardingCountry = useOnboardingStore((state) => state.location.country);
  const onboardingCountryName = useOnboardingStore((state) => state.location.countryName);
  const onboardingLatitude = useOnboardingStore((state) => state.location.latitude);
  const onboardingLongitude = useOnboardingStore((state) => state.location.longitude);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const insets = useSafeAreaInsets();
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [interests, setInterests] = useState(profile?.interests?.join(", ") ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [isUpdatingIncognito, setIsUpdatingIncognito] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("public");
  const [isIncognito, setIsIncognito] = useState(Boolean(profile?.isIncognito));
  const [showDistance, setShowDistance] = useState(profile?.showDistance ?? true);
  const [showLastSeen, setShowLastSeen] = useState(profile?.showLastSeen ?? true);
  const [isEditing, setIsEditing] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [primaryPhotoPreview, setPrimaryPhotoPreview] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPhotoManagerVisible, setIsPhotoManagerVisible] = useState(false);
  const [hasPhotoOrderChanges, setHasPhotoOrderChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? "");
      setInterests(profile.interests?.join(", ") ?? "");
      setIsIncognito(Boolean(profile.isIncognito));
      setShowDistance(profile.showDistance ?? true);
      setShowLastSeen(profile.showLastSeen ?? true);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile && isEditing) {
      setIsEditing(false);
    }
  }, [isEditing, profile]);

  useEffect(() => {
    let mounted = true;
    const ensureProfile = async () => {
      if (!session?.user?.id || profile || isFetchingProfile) {
        return;
      }
      setIsFetchingProfile(true);
      try {
        await refetchProfile();
      } catch (error) {
        console.warn("Failed to fetch profile for ProfileScreen", error);
      } finally {
        if (mounted) {
          setIsFetchingProfile(false);
        }
      }
    };
    ensureProfile();
    return () => {
      mounted = false;
    };
  }, [isFetchingProfile, profile, session?.user?.id]);

  const sanitizedProfilePhotos = useMemo(
    () =>
      (profile?.photos ?? []).filter((photo) => {
        const url = photo?.url?.toLowerCase?.() ?? "";
        const storagePath = (photo as any)?.storagePath?.toLowerCase?.() ?? "";
        return !(
          url.includes("/verifications/") ||
          url.includes("verifications/") ||
          storagePath.includes("/verifications/") ||
          storagePath.includes("verifications/")
        ) && typeof (photo as any).assetId === "number" && Number.isFinite((photo as any).assetId);
      }),
    [profile?.photos]
  );

  const uniquePhotos = useMemo(() => {
    const seen = new Set<string>();
    const photos = sanitizedProfilePhotos.filter(Boolean);
    return photos.filter((photo) => {
      if (!photo) {
        return false;
      }
      const key =
        (typeof (photo as any).assetId === "number" && Number.isFinite((photo as any).assetId)
          ? `asset:${(photo as any).assetId}`
          : undefined) ??
        (photo.url ? `url:${photo.url}` : undefined) ??
        (photo.id ? `id:${photo.id}` : undefined) ??
        "";
      if (!key) {
        return false;
      }
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [sanitizedProfilePhotos]);

  const visibilityOptions: { label: string; value: VisibilityMode }[] = useMemo(
    () => [
      { label: copy.visibilityOptions.public, value: "public" },
      { label: copy.visibilityOptions.match_only, value: "match_only" },
      { label: copy.visibilityOptions.whitelist, value: "whitelist" },
      { label: copy.visibilityOptions.blurred_until_match, value: "blurred_until_match" }
    ],
    [copy.visibilityOptions]
  );

  const heroPhoto = uniquePhotos[0];
  const heroPhotoUriRaw = heroPhoto?.url ?? null;
  const heroPhotoUri = heroPhotoUriRaw ?? null;
  const heroAssetId = profile?.primaryPhotoId ?? heroPhoto?.assetId ?? (heroPhoto?.id ? Number(heroPhoto.id) : null);
  const guardAssetId = heroAssetId;
  const canUseHeroGuarded = typeof guardAssetId === "number" && Number.isFinite(guardAssetId);
  const [avatarUri, setAvatarUri] = useState<string | null>(heroPhotoUri ?? primaryPhotoPreview);
  const age = useMemo(() => {
    const sourceBirthday = profile?.birthday ?? session?.user?.user_metadata?.birthday ?? onboardingDob ?? undefined;
    if (!sourceBirthday) {
      return null;
    }
    const birthDate = new Date(sourceBirthday);
    if (Number.isNaN(birthDate.getTime())) {
      return null;
    }
    const now = new Date();
    let computed = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      computed -= 1;
    }
    return computed;
  }, [profile?.birthday, session?.user?.user_metadata?.birthday, onboardingDob]);
  const locationLabel = useMemo(() => {
    const latCandidate =
      toCoordinate(profile?.latitude) ??
      toCoordinate(session?.user?.user_metadata?.latitude) ??
      toCoordinate(onboardingLatitude);
    const lonCandidate =
      toCoordinate(profile?.longitude) ??
      toCoordinate(session?.user?.user_metadata?.longitude) ??
      toCoordinate(onboardingLongitude);
    if (isWithinChechnyaRadius(latCandidate, lonCandidate)) {
      return copy.locationChechnya;
    }
    const countryCode = profile?.country ?? session?.user?.user_metadata?.country ?? onboardingCountry ?? null;
    const formatted = formatCountryLabel(countryCode, onboardingCountryName ?? null);
    return formatted ?? copy.locationUnknown;
  }, [
    copy.locationUnknown,
    copy.locationChechnya,
    onboardingCountry,
    onboardingCountryName,
    onboardingLatitude,
    onboardingLongitude,
    profile?.country,
    profile?.latitude,
    profile?.longitude,
    session?.user?.user_metadata?.country,
    session?.user?.user_metadata?.latitude,
    session?.user?.user_metadata?.longitude
  ]);
  const displayName =
    profile?.displayName ??
    (onboardingName?.trim().length ? onboardingName.trim() : undefined) ??
    session?.user?.user_metadata?.display_name ??
    session?.user?.user_metadata?.full_name ??
    copy.defaultProfileName;
  const isVerified = profile?.verified ?? Boolean(session?.user?.user_metadata?.verified);
  const photoManagerSlots = useMemo(() => {
    const photos = uniquePhotos;
    const trimmed = photos.slice(0, PROFILE_PHOTO_SLOT_COUNT);
    const padded: (Photo | null)[] = [...trimmed];
    while (padded.length < PROFILE_PHOTO_SLOT_COUNT) {
      padded.push(null);
    }
    return padded;
  }, [uniquePhotos]);

  useEffect(() => {
    let active = true;
    // Ensure primary photo follows first slot
    if (profile?.photos?.length) {
      const first = profile.photos[0];
      const asset = typeof first.assetId === "number" ? first.assetId : Number(first.id);
      const nextPrimaryId = Number.isFinite(asset) ? (asset as number) : null;
      if (nextPrimaryId && profile.primaryPhotoId !== nextPrimaryId) {
        setProfile({ ...profile, primaryPhotoId: nextPrimaryId, primaryPhotoPath: first.url ?? null });
      }
    }
    const loadPreview = async () => {
      if (!profile || !profile.userId) {
        if (active) {
          setPrimaryPhotoPreview(null);
        }
        return;
      }
      if (heroPhotoUri) {
        if (active) {
          setPrimaryPhotoPreview(null);
        }
        return;
      }
      try {
        const loadFromPath = async (path: string) => {
          const url = await getPhotoUrl(path, supabase, PROFILE_BUCKET);
          if (active) {
            setPrimaryPhotoPreview(url);
          }
        };

        if (profile.primaryPhotoPath) {
          await loadFromPath(profile.primaryPhotoPath);
          return;
        }

        if (typeof guardAssetId === "number" && Number.isFinite(guardAssetId)) {
          try {
            const signed = await getSignedPhotoUrl(guardAssetId, "original");
            if (active) {
              setPrimaryPhotoPreview(signed.url);
            }
            return;
          } catch (error) {
            console.warn("[ProfileScreen] hero asset preview failed", error);
          }
        }

        const ownerId =
          typeof profile.userId === "string" && profile.userId.length >= 16 ? profile.userId : null;
        if (ownerId) {
          const { data: fallbackAsset, error: fallbackError } = await supabase
            .from("photo_assets")
            .select("id, storage_path")
            .eq("owner_id", ownerId)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (fallbackError) {
            throw fallbackError;
          }
          if (fallbackAsset?.id) {
            try {
              const signed = await getSignedPhotoUrl(fallbackAsset.id, "original");
              if (active) {
                setPrimaryPhotoPreview(signed.url);
              }
              return;
            } catch (error) {
              console.warn("[ProfileScreen] fallback signed url failed", error);
            }
          }
          if (fallbackAsset?.storage_path) {
            await loadFromPath(fallbackAsset.storage_path);
            return;
          }
        }
      } catch (error) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: string }).message)
            : "";
        if (!message.includes("Object not found")) {
          console.warn("[ProfileScreen] primary photo load failed", error);
        }
      }
      if (active) {
        setPrimaryPhotoPreview(null);
      }
    };
    loadPreview();
    return () => {
      active = false;
    };
  }, [guardAssetId, heroPhotoUri, profile, setProfile, supabase]);

  useEffect(() => {
    setAvatarUri(heroPhotoUri ?? primaryPhotoPreview ?? null);
  }, [heroPhotoUri, primaryPhotoPreview]);

  const openPhotoManager = () => {
    if (!profile) {
      return;
    }
    setIsPhotoManagerVisible(true);
  };

  const openSettings = useCallback(() => {
    const parentNav: any = (navigation as any).getParent?.() ?? navigation;
    const rootNav: any = parentNav?.getParent?.() ?? parentNav;
    if (rootNav?.navigate) {
      rootNav.navigate("Settings" as never);
    } else {
      navigation.navigate("Settings" as never);
    }
  }, [navigation]);

  const openCompass = useCallback(() => {
    const parentNav: any = (navigation as any).getParent?.() ?? navigation;
    const rootNav: any = parentNav?.getParent?.() ?? parentNav;
    if (rootNav?.navigate) {
      rootNav.navigate("RelationshipCompass" as never);
    } else {
      navigation.navigate("RelationshipCompass" as never);
    }
  }, [navigation]);

  const handleSave = async () => {
    const currentProfile = profile;
    if (!session?.user?.id || !currentProfile) {
      return;
    }
    setIsSaving(true);
    try {
      const updated = await upsertProfile(session.user.id, {
        displayName: currentProfile.displayName,
        birthday: currentProfile.birthday,
        bio,
        gender: currentProfile.gender,
        intention: currentProfile.intention,
        interests: interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        photos: currentProfile.photos,
        primaryPhotoPath: currentProfile.primaryPhotoPath ?? null,
        primaryPhotoId: currentProfile.primaryPhotoId ?? null,
        relationshipCompass: currentProfile.relationshipCompass ?? null
      });
      const privacyChanged =
        currentProfile.isIncognito !== isIncognito ||
        currentProfile.showDistance !== showDistance ||
        currentProfile.showLastSeen !== showLastSeen;

      if (privacyChanged) {
        await updatePrivacySettings({
          is_incognito: isIncognito,
          show_distance: showDistance,
          show_last_seen: showLastSeen
        });
        updated.isIncognito = isIncognito;
        updated.showDistance = showDistance;
        updated.showLastSeen = showLastSeen;
      }
      setProfile(updated);
      Alert.alert(copy.alerts.savedTitle, copy.alerts.savedMessage);
    } catch (error: any) {
      logError(error, "profile-save");
      Alert.alert(copy.alerts.errorTitle, getErrorMessage(error, errorCopy, copy.alerts.saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPhoto = async (slotIndex: number | null = null) => {
    const currentProfile = profile;
    if (!session?.user?.id || !currentProfile) {
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(copy.alerts.permissionTitle, copy.alerts.permissionMessage);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadingIndex(typeof slotIndex === "number" ? slotIndex : 0);
      const asset = result.assets[0];
      if (!asset?.uri) {
        throw new Error(copy.alerts.uploadFailedMessage ?? "Ausgewähltes Foto hat keine gültige URI.");
      }
      const activeSession = await ensureSessionOrFail();
      const storagePath = await uploadOriginalAsync(asset.uri, activeSession.user.id);
      const { photoId } = await registerPhoto(storagePath, visibilityMode);
      const newPhoto: Photo = {
        id: String(photoId),
        assetId: photoId,
        storagePath,
        visibilityMode,
        url: asset.uri,
        createdAt: new Date().toISOString()
      };
      const updatedPhotos = dedupeProfilePhotos([...currentProfile.photos]);
      const targetIndex = typeof slotIndex === "number" ? slotIndex : 0;
      const clampedIndex = Math.min(Math.max(targetIndex, 0), Math.max(updatedPhotos.length, 0));
      updatedPhotos.splice(clampedIndex, 0, newPhoto);
      const deduped = dedupeProfilePhotos(updatedPhotos);

      let nextPrimaryPath = currentProfile.primaryPhotoPath ?? null;
      let nextPrimaryId = currentProfile.primaryPhotoId ?? null;
      const shouldUpdatePrimary = clampedIndex === 0 || !nextPrimaryId;
      if (shouldUpdatePrimary) {
        nextPrimaryPath = storagePath;
        nextPrimaryId = photoId;
        setPrimaryPhotoPreview(asset.uri);
      }

      const updatedProfile: Profile = {
        ...currentProfile,
        photos: deduped,
        primaryPhotoPath: nextPrimaryPath,
        primaryPhotoId: nextPrimaryId
      };
      setProfile(updatedProfile);
      setHasPhotoOrderChanges(true);
    } catch (error: any) {
      logError(error, "photo-upload");
      Alert.alert(copy.alerts.uploadFailedTitle, getErrorMessage(error, errorCopy, copy.alerts.uploadFailedMessage));
    } finally {
      setIsUploading(false);
      setUploadingIndex(null);
    }
  };

  const handleToggleIncognitoDisplay = async (nextValue: boolean) => {
    if (!session?.user?.id || !profile) {
      return;
    }
    if (nextValue && !hasPremiumAccess) {
      setIsIncognito(false);
      const parentNav: any = (navigation as any).getParent?.() ?? navigation;
      const rootNav: any = parentNav?.getParent?.() ?? parentNav;
      const navigateToUpsell = rootNav?.navigate ?? navigation?.navigate;
      if (typeof navigateToUpsell === "function") {
        navigateToUpsell("PremiumUpsell");
      }
      return;
    }
    setIsUpdatingIncognito(true);
    try {
      setIsIncognito(nextValue);
      await updatePrivacySettings({
        is_incognito: nextValue,
        show_distance: showDistance,
        show_last_seen: showLastSeen
      });
      try {
        await supabase
          .from("profiles")
          .update({ is_incognito: nextValue, show_distance: showDistance, show_last_seen: showLastSeen })
          .eq("id", session.user.id);
      } catch (syncError) {
        console.warn("[Profile] failed to sync incognito/show settings to supabase", syncError);
      }
      setProfile({
        ...profile,
        isIncognito: nextValue
      });
    } catch (error: any) {
      logError(error, "toggle-incognito");
      Alert.alert(copy.alerts.errorTitle, getErrorMessage(error, errorCopy, copy.alerts.saveError));
      setIsIncognito(Boolean(profile.isIncognito));
    } finally {
      setIsUpdatingIncognito(false);
    }
  };

  const handlePhotoManagerDone = useCallback(async () => {
    if (!profile || !session?.user?.id) {
      setIsPhotoManagerVisible(false);
      setHasPhotoOrderChanges(false);
      return;
    }
    if (!hasPhotoOrderChanges) {
      setIsPhotoManagerVisible(false);
      return;
    }
    try {
      const first = profile.photos[0];
      const nextPrimaryId =
        typeof first?.assetId === "number" ? first.assetId : Number.isFinite(Number(first?.id)) ? Number(first?.id) : null;
      await upsertProfile(session.user.id, {
        displayName: profile.displayName,
        birthday: profile.birthday,
        bio: profile.bio,
        gender: profile.gender,
        intention: profile.intention,
        interests: profile.interests,
        photos: profile.photos,
        primaryPhotoId: nextPrimaryId ?? null,
        primaryPhotoPath: nextPrimaryId ? null : profile.primaryPhotoPath ?? null,
        relationshipCompass: profile.relationshipCompass ?? null
      });
    } catch (error: any) {
      logError(error, "photo-manager");
      Alert.alert(copy.alerts.errorTitle, getErrorMessage(error, errorCopy, copy.alerts.saveError));
    } finally {
      setHasPhotoOrderChanges(false);
      setIsPhotoManagerVisible(false);
    }
  }, [
    copy.alerts.errorTitle,
    copy.alerts.saveError,
    errorCopy,
    hasPhotoOrderChanges,
    profile,
    session?.user?.id,
    setIsPhotoManagerVisible
  ]);

  if (!session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={BRAND_GREEN} style={{ marginBottom: 12 }} />
        <Text>{copy.viewLoading}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{copy.viewLoading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDeletePhoto = async (photo: Photo) => {
    const currentProfile = profile;
    if (!currentProfile || !session?.user?.id) {
      return;
    }
    if (!photo.assetId) {
      Alert.alert(copy.alerts.noteTitle, copy.alerts.noteMessage);
      return;
    }
    try {
      await deletePhotoRemote(photo.assetId);
      const remainingPhotos = currentProfile.photos.filter((item) => item.id !== photo.id);
      let nextPrimaryId = currentProfile.primaryPhotoId ?? null;
      let nextPrimaryPath = currentProfile.primaryPhotoPath ?? null;
      const removedWasPrimary = photo.assetId === currentProfile.primaryPhotoId;

      if (remainingPhotos.length === 0) {
        nextPrimaryId = null;
        nextPrimaryPath = null;
        setPrimaryPhotoPreview(null);
      } else if (removedWasPrimary) {
        const first = remainingPhotos[0];
        nextPrimaryId = typeof first.assetId === "number" ? first.assetId : Number(first.id) ?? null;
        nextPrimaryPath = null;
        setPrimaryPhotoPreview(null);
      }

      const updatedProfile: Profile = {
        ...currentProfile,
        photos: remainingPhotos,
        primaryPhotoId: nextPrimaryId,
        primaryPhotoPath: nextPrimaryPath
      };

      const saved = await upsertProfile(session.user.id, {
        displayName: updatedProfile.displayName,
        birthday: updatedProfile.birthday,
        bio: updatedProfile.bio,
        gender: updatedProfile.gender,
        intention: updatedProfile.intention,
        interests: updatedProfile.interests,
        photos: updatedProfile.photos,
        primaryPhotoPath: updatedProfile.primaryPhotoPath ?? null,
        primaryPhotoId: updatedProfile.primaryPhotoId ?? null
      });
      setProfile(saved);
    } catch (error: any) {
      logError(error, "photo-delete");
      Alert.alert(copy.alerts.errorTitle, getErrorMessage(error, errorCopy, copy.alerts.photoDeleteError));
    }
  };

  const performSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutService();
    } catch (error: any) {
      logError(error, "sign-out");
      Alert.alert(copy.alerts.signOutErrorTitle, getErrorMessage(error, errorCopy, copy.alerts.signOutErrorMessage));
    } finally {
      setIsSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(copy.alerts.signOutConfirmTitle, copy.alerts.signOutConfirmMessage, [
      { text: copy.alerts.cancel, style: "cancel" },
      { text: copy.alerts.confirmSignOut, style: "destructive", onPress: () => performSignOut() }
    ]);
  };

  const ensureSessionOrFail = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session) {
      return data.session;
    }
    const refresh = await supabase.auth.refreshSession();
    if (refresh.data.session) {
      return refresh.data.session;
    }
    throw new Error(copy.alerts.signOutErrorMessage);
  };

  const resolveAssetId = (photo: Photo): number | null => {
    if (typeof photo.assetId === "number") {
      return photo.assetId;
    }
    const numeric = Number(photo.id);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const handleVisibilityChange = async (photo: Photo, mode: VisibilityMode) => {
    const currentProfile = profile;
    if (!currentProfile) {
      return;
    }
    const assetId = resolveAssetId(photo);
    if (!assetId) {
      Alert.alert(copy.alerts.actionNotPossibleTitle, copy.alerts.actionNoAsset);
      return;
    }
    try {
      await changeVisibility(assetId, mode);
      const updatedPhotos = currentProfile.photos.map((entry) =>
        entry.id === photo.id ? { ...entry, visibilityMode: mode } : entry
      );
      setProfile({ ...currentProfile, photos: updatedPhotos });
      Alert.alert(copy.alerts.visibilityUpdatedTitle, copy.alerts.visibilityUpdatedMessage);
    } catch (error: any) {
      logError(error, "visibility-update");
      Alert.alert(copy.alerts.errorTitle, getErrorMessage(error, errorCopy, copy.alerts.visibilityErrorMessage));
    }
  };

  const handleRevokePermissions = async (photo: Photo) => {
    const assetId = resolveAssetId(photo);
    if (!assetId) {
      Alert.alert(copy.alerts.actionNotPossibleTitle, copy.alerts.actionNoAsset);
      return;
    }
    try {
      await revokeAllPermissions(assetId);
      Alert.alert(copy.alerts.sharesUpdatedTitle, copy.alerts.sharesUpdatedMessage);
    } catch (error: any) {
      logError(error, "revoke-permissions");
      Alert.alert(copy.alerts.errorTitle, getErrorMessage(error, errorCopy, copy.alerts.sharesErrorMessage));
    }
  };

  const presentVisibilitySheet = (photo: Photo) => {
    const labels = visibilityOptions.map((option) => option.label).concat(copy.alerts.cancel);
    const cancelButtonIndex = labels.length - 1;
    const onSelect = (index: number) => {
      if (index === cancelButtonIndex) {
        return;
      }
      const mode = visibilityOptions[index]?.value;
      if (mode) {
        handleVisibilityChange(photo, mode);
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: labels, cancelButtonIndex }, onSelect);
    } else {
      const buttons: AlertButton[] = visibilityOptions.map((option, optionIndex) => ({
        text: option.label,
        onPress: () => onSelect(optionIndex)
      }));
      buttons.push({
        text: copy.alerts.cancel,
        style: "cancel",
        onPress: () => onSelect(cancelButtonIndex)
      });
      Alert.alert(copy.alerts.visibilitySheetTitle, undefined, buttons);
    }
  };

  const handlePhotoActions = (photo: Photo) => {
    const options = [
      copy.alerts.changeVisibility,
      copy.alerts.revokeShares,
      copy.alerts.deletePhoto,
      copy.alerts.cancel,
    ];
    const cancelButtonIndex = options.length - 1;
    const onSelect = (index: number) => {
      switch (index) {
        case 0:
          presentVisibilitySheet(photo);
          break;
        case 1:
          handleRevokePermissions(photo);
          break;
        case 2:
          handleDeletePhoto(photo);
          break;
        default:
          break;
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex }, onSelect);
    } else {
      const buttons: AlertButton[] = options.map((option, index) => ({
        text: option,
        onPress: () => onSelect(index),
        style: index === cancelButtonIndex ? ("cancel" as const) : "default"
      }));
      Alert.alert(copy.alerts.photoActionsTitle, undefined, buttons);
    }
  };

  const renderPhotoManagerModal = () => {
    if (!profile) {
      return null;
    }
    return (
      <Modal
        visible={isPhotoManagerVisible}
        animationType="slide"
        transparent
        onRequestClose={handlePhotoManagerDone}
      >
        <View style={styles.photoModalBackdrop}>
          <Pressable style={styles.photoModalBackdropTouchable} onPress={handlePhotoManagerDone} />
        <View style={styles.photoModalCard}>
            <Text style={styles.photoModalTitle}>{copy.photoManager.title}</Text>
            <Text style={styles.photoModalInstructions}>{copy.photoManager.instructions}</Text>
            <View style={styles.photoGrid}>
              {photoManagerSlots.map((slot, index) => {
                if (slot) {
                  const assetId = resolveAssetId(slot);
                  const key = slot.id ?? `photo-${index}`;
                  return (
                    <View key={key} style={styles.photoSlot}>
                      <Pressable
                        style={styles.photoSlotPressable}
                        // no drag/reorder, tap does nothing
                        onPress={() => {}}
                      >
                        {assetId ? (
                          <GuardedPhoto photoId={assetId} style={styles.photoSlotImage} blur={isIncognito} />
                        ) : slot.url ? (
                          isIncognito ? (
                            <LinearGradient
                              colors={["#b5b5b5", "#f2f2f2"]}
                              start={{ x: 0.5, y: 0 }}
                              end={{ x: 0.5, y: 1 }}
                              style={[styles.photoSlotImage, styles.lockGradientTile]}
                            >
                              <Ionicons name="lock-closed" size={22} color="#f7f7f7" style={styles.lockIconCenter} />
                            </LinearGradient>
                          ) : (
                            <Image source={{ uri: slot.url }} style={styles.photoSlotImage} />
                          )
                        ) : (
                          <View style={[styles.photoSlotImage, styles.photoSlotPlaceholder]}>
                            <Ionicons name="image-outline" size={26} color="#98a2b3" />
                          </View>
                        )}
                      </Pressable>
                      <Pressable style={styles.photoSlotRemove} onPress={() => handleDeletePhoto(slot)}>
                        <Ionicons name="close" size={14} color="#34383c" />
                      </Pressable>
                      {isUploading && uploadingIndex === index ? (
                        <View style={styles.photoSlotSpinner}>
                          <ActivityIndicator color={BRAND_GREEN} />
                        </View>
                      ) : null}
                    </View>
                  );
                }
                return (
                  <View key={`empty-${index}`} style={styles.photoSlot}>
                    <Pressable
                      style={[
                        styles.photoSlotEmpty,
                        isUploading && uploadingIndex === index && styles.photoSlotEmptyDisabled
                      ]}
                      onPress={() => handleAddPhoto(index)}
                      disabled={isUploading && uploadingIndex === index}
                    >
                      {isUploading && uploadingIndex === index ? (
                        <ActivityIndicator color={BRAND_GREEN} />
                      ) : (
                        <Ionicons name="add" size={28} color="#8c919f" />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <Pressable style={styles.photoModalButton} onPress={handlePhotoManagerDone}>
              <LinearGradient
                colors={[PALETTE.gold, "#8b6c2a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.photoModalButtonInner}
              >
                <Text style={styles.photoModalButtonText}>{copy.photoManager.done}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  if (isEditing && profile) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backRow} onPress={() => setIsEditing(false)}>
          <Ionicons name="chevron-back" size={20} color="#2b2d33" />
          <Text style={styles.backText}>{copy.edit.back}</Text>
        </Pressable>
        <Text style={styles.editHeader}>{copy.edit.title}</Text>
        <Text style={styles.subheader}>{copy.edit.subtitle}</Text>
      <FlatList
        data={profile?.photos ?? []}
        keyExtractor={(photo) => photo.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => {
          const numericId = typeof item.assetId === "number" ? item.assetId : Number(item.id);
          const canUseGuarded = Number.isFinite(numericId);
          return (
            <View style={styles.photoItem}>
              {canUseGuarded ? (
                <GuardedPhoto photoId={numericId} style={styles.photo} blur={isIncognito} />
              ) : item.url ? (
                isIncognito ? (
                  <LinearGradient
                    colors={["#b5b5b5", "#f2f2f2"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[styles.photo, styles.lockGradientTile]}
                  >
                    <Ionicons name="lock-closed" size={22} color="#f7f7f7" style={styles.lockIconCenter} />
                  </LinearGradient>
                ) : (
                  <Image style={styles.photo} source={{ uri: item.url }} />
                )
              ) : (
                <View style={[styles.photo, styles.placeholder]}>
                  <Text style={styles.placeholderText}>{copy.edit.noPhoto}</Text>
                </View>
              )}
              <View style={styles.photoActions}>
                <Text style={styles.visibilityBadge}>{item.visibilityMode ?? "?"}</Text>
                <Pressable style={styles.photoMenu} onPress={() => handlePhotoActions(item)}>
                  <Text style={styles.photoMenuText}>•••</Text>
                </Pressable>
              </View>
              {!item.assetId ? (
                <Pressable style={styles.removeTag} onPress={() => handleDeletePhoto(item)}>
                  <Text style={styles.removeTagText}>{copy.removePhoto}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
      <View style={styles.section}>
        <Text style={styles.label}>{copy.labels.visibility}</Text>
        <View style={styles.visibilityRow}>
          {visibilityOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.visibilityChip, visibilityMode === option.value && styles.visibilityChipActive]}
              onPress={() => setVisibilityMode(option.value)}
            >
              <Text
                style={[
                  styles.visibilityChipText,
                  visibilityMode === option.value && styles.visibilityChipTextActive
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.uploadButton, (isUploading || isSaving) && styles.saveButtonDisabled]}
          onPress={() => handleAddPhoto()}
          disabled={isUploading || isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isUploading ? copy.buttons.addPhotoLoading : copy.buttons.addPhoto}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.label}>{copy.labels.bio}</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        style={[styles.input, styles.multiline]}
        multiline
        numberOfLines={5}
        maxLength={300}
        placeholder={copy.placeholders.bio}
      />
      <Text style={styles.label}>{copy.labels.interests}</Text>
      <TextInput
        value={interests}
        onChangeText={setInterests}
        style={styles.input}
        placeholder={copy.placeholders.interests}
      />
      <View style={styles.section}>
        <Text style={styles.label}>{compassCopy.title}</Text>
        <Text style={styles.compassSubtitle}>{compassCopy.subtitle}</Text>
        <Pressable style={styles.compassButton} onPress={openCompass}>
          <Text style={styles.compassButtonText}>{compassCopy.cta}</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{copy.labels.incognito}</Text>
          <Switch
            value={isIncognito}
            onValueChange={setIsIncognito}
            trackColor={{ true: PALETTE.deep, false: "rgba(255,255,255,0.25)" }}
            thumbColor={PALETTE.deep}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{copy.labels.showDistance}</Text>
          <Switch value={showDistance} onValueChange={setShowDistance} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{copy.labels.showLastSeen}</Text>
          <Switch value={showLastSeen} onValueChange={setShowLastSeen} />
        </View>
      </View>
        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? copy.buttons.saveLoading : copy.buttons.save}
          </Text>
        </Pressable>
        <View style={styles.logoutSection}>
          <Text style={styles.logoutHint}>{copy.hints.logoutSecondary}</Text>
          <Pressable
            style={[styles.logoutButton, isSigningOut && styles.logoutButtonDisabled]}
            onPress={confirmSignOut}
            disabled={isSigningOut}
          >
            <Text style={styles.logoutButtonText}>
              {isSigningOut ? copy.buttons.signOutLoading : copy.buttons.signOut}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.heroContainer}>
          <View style={styles.avatarWrapperHero}>
            {isIncognito ? (
              <LinearGradient
                colors={["#b5b5b5", "#f2f2f2"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.avatarImage, styles.lockGradientAvatar]}
              >
                <Ionicons name="lock-closed" size={26} color="#f7f7f7" style={styles.lockIconCenter} />
              </LinearGradient>
            ) : avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                onError={() => setAvatarUri(null)}
              />
            ) : canUseHeroGuarded ? (
              <GuardedPhoto photoId={guardAssetId as number} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={48} color={PALETTE.sand} />
              </View>
            )}
            <Pressable
              style={[styles.addButtonHero, (isUploading || !profile) && styles.addButtonDisabled]}
              onPress={openPhotoManager}
              disabled={isUploading || !profile}
            >
              <LinearGradient
                colors={[PALETTE.gold, "#8b6c2a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addButtonInner}
              >
                <Ionicons name="add" size={18} color={PALETTE.sand} />
              </LinearGradient>
            </Pressable>
          </View>
          <View style={styles.nameRowHero}>
            <Text style={styles.nameHero}>
              {displayName}
              {age ? `, ${age}` : ""}
            </Text>
            {isVerified ? (
              <View style={styles.verifiedBadgeWrapperHero}>
                <VerifiedBadge size={VERIFIED_BADGE_WRAPPER_SIZE} />
              </View>
            ) : null}
          </View>
          <View style={styles.locationRowHero}>
            <Ionicons name="location-outline" size={18} color={PALETTE.sand} />
            <Text style={styles.locationTextHero}>{locationLabel}</Text>
          </View>
          <View style={styles.toggleRowHero}>
            <Text style={styles.toggleLabelHero}>{copy.labels.incognito}</Text>
            <Switch
              value={isIncognito}
              onValueChange={handleToggleIncognitoDisplay}
              disabled={isUpdatingIncognito || isSigningOut}
              trackColor={{ true: PALETTE.deep, false: "rgba(255,255,255,0.25)" }}
              thumbColor={PALETTE.deep}
            />
          </View>
        </View>
        <Pressable
          style={[
            styles.gearButton,
            { bottom: Math.max(88, insets.bottom + 28) }
          ]}
          onPress={openSettings}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[PALETTE.gold, "#8b6c2a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gearInner}
          >
            <Ionicons name="settings-outline" size={20} color={PALETTE.sand} />
          </LinearGradient>
        </Pressable>
        {renderPhotoManagerModal()}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent"
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff"
  },
  loadingText: {
    color: "#1f2933",
    fontSize: 16,
    textAlign: "center"
  },
  displayWrapper: {
    flexGrow: 1,
    paddingTop: PROFILE_SCREEN_TOP_PADDING,
    paddingBottom: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingHorizontal: 32
  },
  avatarWrapper: {
    position: "relative"
  },
  avatarImage: {
    width: PROFILE_AVATAR_SIZE,
    height: PROFILE_AVATAR_SIZE,
    borderRadius: PROFILE_AVATAR_SIZE / 2,
    backgroundColor: "#f2f4f7"
  },
  lockGradientAvatar: {
    borderRadius: PROFILE_AVATAR_SIZE / 2
  },
  lockGradientTile: {
    borderRadius: 12
  },
  lockIconCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -13 }, { translateY: -13 }]
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center"
  },
  addButton: {
    position: "absolute",
    bottom: PROFILE_ADD_BUTTON_BOTTOM,
    right: PROFILE_ADD_BUTTON_RIGHT,
    width: PROFILE_ADD_BUTTON_SIZE,
    height: PROFILE_ADD_BUTTON_SIZE,
    borderRadius: PROFILE_ADD_BUTTON_RADIUS,
    backgroundColor: BRAND_GREEN,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
    shadowColor: "#0f172a",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4
  },
  addButtonDisabled: {
    opacity: 0.5
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24
  },
  nameText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1f2933",
    textTransform: "none"
  },
  verifiedBadgeWrapper: {
    marginLeft: 0,
    width: VERIFIED_BADGE_WRAPPER_SIZE,
    height: VERIFIED_BADGE_WRAPPER_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6
  },
  locationText: {
    fontSize: 16,
    color: "#6a6f7a"
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28
  },
  primaryAction: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    minWidth: 200,
    alignItems: "center"
  },
  primaryActionDisabled: {
    opacity: 0.6
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2b2d33"
  },
  infoButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e9e9e9",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  infoButtonOverlay: {
    position: "absolute",
    right: 20,
    bottom: 20
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end"
  },
  photoModalBackdropTouchable: {
    ...StyleSheet.absoluteFillObject
  },
  photoModalCard: {
    backgroundColor: PALETTE.deep,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.35)"
  },
  photoModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: PALETTE.sand,
    textAlign: "center"
  },
  photoModalSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6a6f7a",
    textAlign: "center"
  },
  photoModalInstructions: {
    marginTop: 12,
    fontSize: 13,
    color: "rgba(242,231,215,0.8)",
    textAlign: "center"
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 24
  },
  photoSlot: {
    width: "30%",
    aspectRatio: 0.66,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 16
  },
  photoSlotPressable: {
    flex: 1
  },
  photoSlotImage: {
    width: "100%",
    height: "100%"
  },
  photoSlotPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  photoSlotRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center"
  },
  photoSlotEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(217,192,143,0.4)",
    borderStyle: "solid",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  photoSlotEmptyDisabled: {
    opacity: 0.5
  },
  primaryBadge: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#0d6e4f"
  },
  photoModalButton: {
    marginTop: 28,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.45)"
  },
  photoModalButtonInner: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  photoModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  dragOverlay: {
    position: "absolute",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8
  },
  photoSlotSpinner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 10
  },
  container: {
    padding: 20,
    backgroundColor: "#fff"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  backText: {
    marginLeft: 6,
    fontSize: 16,
    color: "#2b2d33"
  },
  editHeader: {
    fontSize: 24,
    fontWeight: "700"
  },
  subheader: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16
  },
  section: {
    marginTop: 16
  },
  photoItem: {
    width: 160,
    height: 200,
    borderRadius: 16,
    marginRight: 12,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center"
  },
  photo: {
    width: "100%",
    height: "100%"
  },
  removeTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  photoActions: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  visibilityBadge: {
    backgroundColor: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    textTransform: "uppercase"
  },
  photoMenu: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)"
  },
  photoMenuText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0"
  },
  placeholderText: {
    color: "#777"
  },
  removeTagText: {
    color: "#fff",
    fontSize: 12
  },
  visibilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  visibilityChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cfd8dc"
  },
  visibilityChipActive: {
    backgroundColor: BRAND_GREEN,
    borderColor: BRAND_GREEN
  },
  visibilityChipText: {
    color: BRAND_GREEN,
    fontSize: 13,
    fontWeight: "500"
  },
  visibilityChipTextActive: {
    color: "#fff"
  },
  uploadButton: {
    marginTop: 12,
    backgroundColor: BRAND_GREEN,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 8
  },
  compassSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 10
  },
  compassButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BRAND_GREEN,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12
  },
  compassButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600"
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5"
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: BRAND_GREEN,
    paddingVertical: 14,
    borderRadius: 12
  },
  saveButtonDisabled: {
    opacity: 0.7
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600"
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8
  },
  switchLabel: {
    fontSize: 16,
    color: "#333"
  },
  logoutSection: {
    width: "100%",
    marginTop: 32,
    alignItems: "stretch",
    gap: 12
  },
  logoutHint: {
    fontSize: 14,
    color: "#6a6f7a",
    textAlign: "left",
    flex: 1
  },
  logoutButton: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#0f172a",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  logoutButtonDisabled: {
    opacity: 0.6
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12
  },
  logoutRowButton: {
    paddingHorizontal: 20,
    alignSelf: "flex-end"
  },
  heroContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
    gap: 18
  },
  avatarWrapperHero: {
    width: PROFILE_AVATAR_SIZE + 16,
    height: PROFILE_AVATAR_SIZE + 16,
    borderRadius: (PROFILE_AVATAR_SIZE + 16) / 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  addButtonHero: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: PROFILE_ADD_BUTTON_SIZE + 6,
    height: PROFILE_ADD_BUTTON_SIZE + 6,
    borderRadius: (PROFILE_ADD_BUTTON_SIZE + 6) / 2,
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden",
    backgroundColor: "transparent"
  },
  addButtonInner: {
    flex: 1,
    borderRadius: (PROFILE_ADD_BUTTON_SIZE + 6) / 2,
    alignItems: "center",
    justifyContent: "center"
  },
  nameRowHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0
  },
  nameHero: {
    fontSize: 28,
    fontWeight: "800",
    color: PALETTE.sand
  },
  verifiedBadgeWrapperHero: {
    width: VERIFIED_BADGE_WRAPPER_SIZE,
    height: VERIFIED_BADGE_WRAPPER_SIZE,
    alignItems: "center",
    justifyContent: "center"
  },
  locationRowHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  locationTextHero: {
    fontSize: 16,
    color: PALETTE.sand
  },
  toggleRowHero: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "80%"
  },
  toggleLabelHero: {
    fontSize: 16,
    color: PALETTE.sand,
    fontWeight: "500"
  },
  gearButton: {
    position: "absolute",
    right: 20,
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden",
    backgroundColor: "transparent"
  },
  gearInner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 44
  }
});

export default ProfileScreen;
