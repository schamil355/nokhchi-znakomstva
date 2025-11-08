const en = {
  common: {
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    cancel: "Cancel",
    save: "Save"
  },
  auth: {
    signIn: {
      title: "Welcome to meetmate",
      submit: "Sign in",
      magicLink: "Send magic link",
      google: "Sign in with Google",
      apple: "Sign in with Apple",
      goToSignUp: "No account? Register",
      goToForgotPassword: "Forgot password",
      success: "Welcome back!",
      error: "Sign-in failed.",
      magicLinkSuccess: "We emailed you a magic link. Please check your inbox.",
      magicLinkError: "Could not send the magic link.",
      oauthErrorTitle: "Sign-in failed",
      oauthErrorMessage: "Please try again."
    },
    signUp: {
      title: "Create your account",
      displayNamePlaceholder: "Display name",
      submit: "Create account",
      goToSignIn: "Already registered? Sign in",
      success: "Success! Please confirm your email to finish signing up.",
      error: "Registration failed.",
      locationRequiredTitle: "Location required",
      locationRequiredMessage: "We need your location to show nearby matches. Please allow location access and try again."
    },
    forgotPassword: {
      title: "Reset password",
      submit: "Send email",
      goToSignIn: "Back to sign in",
      success: "If the address exists, we sent password reset instructions.",
      error: "Reset failed. Please try again."
    },
    magicLinkConfirm: {
      verifying: "Verifying link…",
      invalidLink: "Invalid or expired link.",
      fallbackError: "Something went wrong. Please try again.",
      successMessage: "Signed in successfully! Redirecting…",
      successTitle: "Welcome!",
      errorTitle: "Oops!",
      loadingTitle: "Please wait…",
      backToLogin: "Back to sign in"
    },
    errors: {
      email: "Please enter a valid email address.",
      passwordLength: "At least 8 characters required.",
      displayNameMin: "Display name must be at least 2 characters.",
      displayNameMax: "Display name must be at most 50 characters.",
      passwordMismatch: "Passwords do not match.",
      oauthStart: "Could not start the sign-in flow.",
      oauthFailed: "Sign-in failed. Please try again.",
      oauthCancelled: "Sign-in was cancelled."
    },
    alerts: {
      signOutFailedTitle: "Sign-out failed",
      signOutFailedMessage: "Please try again."
    }
  },
  errors: {
    notLoggedIn: "Please sign in again.",
    generic: "Something went wrong. Please try again."
  },
  verification: {
    consent: {
      title: "Identity verification",
      description: "To keep everyone safe we confirm a quick selfie and one-time code before unlocking messaging.",
      camera: "Take a live selfie inside the app (no gallery uploads).",
      otp: "Confirm your email or phone number with a one-time code.",
      deletion: "Selfie images are removed right after the check; only anonymous scores remain.",
      checkbox: "I understand and agree to the verification process.",
      notice: "We handle your images in accordance with our privacy commitments.",
      privacyLink: "Privacy notice",
      dataPolicyLink: "Verification & data policy",
      button: "Start verification"
    },
    selfie: {
      title: "Take a live selfie",
      instructions: "Center your face, look at the camera, and follow the blink / head-turn prompts.",
      hintMovement: "Gently turn your head and blink when asked so we can confirm liveness.",
      hintLight: "Stand in a bright place without strong backlight for the best result.",
      capture: "Capture selfie",
      retake: "Retake selfie",
      attempts: "Attempt {{count}} of {{total}}",
      permission: "Camera permission is required to continue.",
      enableCamera: "Enable camera",
      retryTitle: "Try again"
    },
    otp: {
      title: "Enter verification code",
      description: "We sent a 6-digit code to your contact. Enter it to finish verification.",
      attempts: "Attempt {{count}} of {{total}}",
      resend: "Resend code",
      waiting: "Waiting for confirmation…",
      noScore: "We never show your similarity score—only the success state."
    },
    progress: {
      selfie: "Checking your selfie…",
      otp: "Verifying the code…"
    },
    errors: {
      verificationFailed: "We could not verify you. Please retry in good light and stay within frame.",
      rateLimited: "Too many attempts. Please wait a few minutes before trying again.",
      otpInvalid: "That code looks wrong. Please try again."
    },
    success: "You’re verified! Enjoy the full experience.",
    badge: {
      verified: "Verified"
    }
  },
  prefs: {
    region: {
      title: "Where should we look for matches?",
      nearby: "Nearby (within 50 km)",
      chechnya: "Chechnya focus",
      europe: "Wider Europe (EU Base set)",
      russia: "All of Russia",
      russiaDescription: "Covers verified accounts across the entire Russian Federation.",
      russiaCities: {
        moscow: "Moscow",
        saintPetersburg: "Saint Petersburg",
        kazan: "Kazan",
        novosibirsk: "Novosibirsk"
      },
      saved: "Search preferences updated."
    }
  },
  home: {
    greeting: "Hi {{email}} 👋",
    greetingFallback: "friend",
    subtitle: "You’re signed in and can explore the protected area.",
    buttons: {
      discovery: "Discovery",
      matches: "Matches",
      profile: "My profile",
      paywall: "View Premium",
      boost: "Activate boost",
      privacy: "Privacy",
      debug: "Debug entitlements",
      signOut: "Sign out"
    },
    toast: {
      boostRegion: "Boosts are account-bound in your region.",
      boostPremium: "Boosts are reserved for Premium members.",
      boostActivated: "Boost activated!",
      paywallDisabled: "Premium purchases are account-bound in your region."
    }
  },
  profile: {
    loadingProfile: "Loading your profile…",
    form: {
      heading: "Personal details",
      displayNamePlaceholder: "Display name",
      birthdatePlaceholder: "Birthdate (YYYY-MM-DD)",
      genderLabel: "Gender",
      orientationLabel: "Orientation",
      bioLabel: "About you",
      bioPlaceholder: "Tell people a little about yourself…",
      interestsLabel: "Interests",
      photosLabel: "Photos",
      photoRemove: "Remove",
      photoChoose: "Choose photo",
      photoCapture: "Take photo",
      locationLabel: "Location",
      locationButton: "Update location",
      locationUnset: "Location not set",
      locationCoordinates: "Lat {{lat}}, Lng {{lng}}",
      countryLabel: "Country",
      devPhoto: "Add dummy photo",
      devLocation: "Set dummy location",
      submitCreate: "Create profile",
      submitUpdate: "Save profile"
    },
    errors: {
      cameraPermission: "Please allow camera access.",
      libraryPermission: "Please allow photo library access.",
      photoUpload: "Could not upload the photo.",
      photoRemove: "Could not remove the photo.",
      locationFail: "Could not determine your location.",
      submitFailed: "Saving failed. Please try again.",
      displayNameMin: "Display name must be at least 2 characters.",
      displayNameMax: "Display name must be at most 50 characters.",
      bioMax: "Bio can be up to 500 characters.",
      birthdateInvalid: "Please enter a valid birthdate.",
      ageRestriction: "You must be at least 18 years old.",
      interestsMin: "Select at least one interest.",
      photosMin: "Add at least one photo.",
      countryRequired: "Please select a country."
    },
    screen: {
      noProfile: "You haven’t created a profile yet.",
      create: "Create profile",
      about: "About me",
      descriptionFallback: "No description yet.",
      photos: "Photos",
      interests: "Interests",
      location: "Location",
      edit: "Edit profile"
    },
    gender: {
      female: "Female",
      male: "Male",
      nonbinary: "Non-binary",
      other: "Other"
    },
    orientation: {
      women: "Interested in women",
      men: "Interested in men",
      everyone: "Open to everyone"
    },
    interests: {
      Reisen: "Travel",
      Kochen: "Cooking",
      Sport: "Sports",
      Musik: "Music",
      Kunst: "Art",
      Natur: "Nature",
      Technologie: "Technology",
      Gaming: "Gaming",
      Lesen: "Reading",
      Tanzen: "Dancing",
      Fotografie: "Photography",
      Kulinarik: "Foodie",
      Wellness: "Wellness",
      Abenteuer: "Adventure",
      Startups: "Startups"
    },
    countries: {
      RU: "Russia",
      FR: "France",
      DE: "Germany",
      AT: "Austria",
      BE: "Belgium",
      NO: "Norway"
    },
    country_hint: "Helps us tailor the ‘Europe’ region filter."
  },
  discovery: {
    title: "Discovery",
    noPhoto: "No photo",
    distance: "{{distance}} km away",
    distanceUnknown: "Distance unknown",
    bioFallback: "No description yet.",
    locationRequiredTitle: "Location required",
    locationRequiredDescription: "We couldn’t determine your location. Please enable location services.",
    retry: "Try again",
    errorTitle: "Something went wrong",
    errorDescription: "We couldn’t load new suggestions. Please try again.",
    emptyTitle: "No new suggestions",
    emptyDescription: "Refresh the feed or check back later.",
    refresh: "Refresh",
    empty: {
      chechnya: "No more profiles in Chechnya right now. Switch the region to broaden your matches.",
      europe: "No more European matches at the moment. Please check back soon.",
      russia: "No more Russian matches at the moment. Refresh the feed or switch the region.",
      nearby: "No nearby matches right now. Try again later or adjust your region.",
      changeRegion: "Change region"
    },
    swipe: {
      limitPremium: "Daily limit reached. Upgrade for unlimited swipes.",
      limitFree: "Daily limit reached. Please try again later.",
      superLikeEmpty: "No Super Likes remaining.",
      superLikeRegion: "Super Likes are account-bound in your region."
    },
    blockAction: "Block",
    reportAction: "Report",
    blockSuccess: "{{name}} has been blocked.",
    blockError: "Unable to block this user.",
    reportThanks: "Thanks for your report.",
    reportError: "Unable to submit your report.",
    matchTitle: "It’s a match! 🎉",
    matchSubtitle: "You and {{name}} liked each other. Start chatting now.",
    matchContinue: "Keep swiping",
    reportTitle: "Report profile",
    reportDetailsPlaceholder: "Details (optional)",
    reportCancel: "Cancel",
    reportSubmit: "Submit report"
  },
  chat: {
    matches: {
      blockSuccess: "Match hidden.",
      blockError: "Could not block this match.",
      reportSuccess: "Thanks for your report.",
      reportError: "Unable to submit the report.",
      unknownUser: "Unknown user",
      noMessages: "No messages yet",
      emptyTitle: "No matches yet",
      emptyDescription: "Swipe in Discovery to meet new people.",
      refresh: "Refresh",
      modalTitle: "Report or block this match",
      modalHint: "Long press a match to open this menu.",
      detailsPlaceholder: "Details (optional)",
      cancel: "Cancel",
      block: "Block",
      report: "Report"
    },
    screen: {
      sendSuccess: "Message sent.",
      sendError: "Could not send the message.",
      blockSuccess: "User blocked.",
      blockError: "Unable to block this user.",
      reportSuccess: "Thanks for your report.",
      reportError: "Unable to submit the report.",
      notFoundTitle: "Conversation not found",
      notFoundDescription: "Please open the chat again from your matches.",
      emptyTitle: "Start the conversation",
      emptyDescription: "Say hi and get to know each other.",
      inputPlaceholder: "Message…",
      send: "Send",
      report: "Report",
      block: "Block",
      modalTitle: "Report user",
      modalHint: "Describe briefly what happened.",
      detailsPlaceholder: "Details (optional)",
      cancel: "Cancel",
      submitReport: "Submit",
      optimistic: "Sending…"
    }
  },
  paywall: {
    title: "Upgrade to meetmate Premium",
    subtitle: "Current benefits: {{swipes}} · Boost: {{boost}} · Super Likes: {{super}}",
    statusTitle: "Status",
    unlimitedLabel: "Unlimited swipes",
    boostLabel: "Boost",
    superLikeLabel: "Super Likes",
    statusActive: "Active",
    statusLocked: "Locked",
    statusActiveWithCount: "Active ({{count}})",
    swipes: {
      unlimited: "Unlimited",
      limited: "Limited"
    },
    boost: {
      available: "Available",
      locked: "Locked"
    },
    pricePerMonth: "{{price}} / month",
    noOffers: "No offers available right now.",
    buy: "Get now",
    manualSync: "Already paid?",
    restore: "Restore purchases",
    back: "Back",
    toast: {
      offerError: "Failed to load offers.",
      purchaseSuccess: "Purchase successful.",
      purchaseCancelled: "Purchase cancelled.",
      purchaseFailed: "Purchase failed.",
      restoreSuccess: "Purchases restored.",
      restoreFailed: "Could not restore purchases.",
      syncSuccess: "Benefits updated.",
      syncFailed: "Unable to refresh benefits.",
      purchaseUnsupported: "Purchases require the full app build. Please use a development build."
    }
  },
  moderation: {
    errors: {
      selfBlock: "You cannot block yourself.",
      rateLimited: "Please wait a moment before trying again.",
      messageProfanity: "Please keep your message respectful.",
      messageContact: "Please don’t share email addresses or phone numbers in chat."
    },
    reasons: {
      spam: "Spam",
      fake: "Fake profile",
      abuse: "Abusive behaviour",
      other: "Other"
    }
  },
  privacy: {
    title: "Privacy & data",
    description: "Export or delete your data at any time. We’ll send a compact JSON export of your stored information.",
    exportTitle: "Data export",
    exportDescription: "Receive a summary of your profile, matches, messages, and reports.",
    exportCta: "Start export",
    exportSuccess: "Export created.",
    exportFailed: "Export failed.",
    exportDataTitle: "Your data",
    deleteTitle: "Delete account",
    deleteDescription: "All data will be removed. This action cannot be undone.",
    deleteCta: "Delete data",
    deleteInfo: "Your data will be deleted shortly.",
    deleteFailed: "Deletion failed.",
    linkPolicy: "Privacy policy",
    linkImprint: "Imprint"
  },
  region: {
    no_paywall_text: "You’re signed in. Premium features are account-bound in your region and activate automatically after sign-in."
  },
  tabs: {
    discovery: "Discovery",
    matches: "Matches",
    profile: "Profile"
  },
  settings: {
    open: "Settings"
  },
  featureFlags: {
    disabled: "This feature is not yet available."
  }
} as const;

export default en;
