const fr = {
  errors: {
    notLoggedIn: "Veuillez vous reconnecter.",
    generic: "Une erreur est survenue. Veuillez réessayer."
  },
  discovery: {
    empty: {
      chechnya: "Aucun autre profil en Tchétchénie pour le moment. Changez de région pour élargir votre recherche.",
      europe: "Plus de correspondances européennes pour l'instant. Revenez bientôt.",
      russia: "Aucune nouvelle correspondance en Russie pour le moment. Rafraîchissez ou changez de région.",
      nearby: "Aucune correspondance à proximité pour le moment. Retentez plus tard ou modifiez la région.",
      changeRegion: "Changer de région"
    }
  },
  prefs: {
    region: {
      title: "Où devons-nous rechercher des correspondances ?",
      nearby: "À proximité (rayon de 50 km)",
      chechnya: "Focalisation Tchétchénie",
      europe: "Europe élargie (ensemble de base UE)",
      russia: "Toute la Russie",
      russiaDescription: "Couvre les comptes vérifiés dans l'ensemble de la Fédération de Russie.",
      russiaCities: {
        moscow: "Moscou",
        saintPetersburg: "Saint-Pétersbourg",
        kazan: "Kazan",
        novosibirsk: "Novossibirsk"
      },
      saved: "Préférences de recherche mises à jour."
    }
  },
  verification: {
    consent: {
      title: "Vérification d'identité",
      description: "Pour protéger la communauté, nous confirmons un selfie en direct et un code à usage unique avant d'activer la messagerie.",
      camera: "Prenez un selfie en direct dans l’app (aucun import depuis la galerie).",
      otp: "Validez votre e-mail ou numéro de téléphone avec un code OTP.",
      deletion: "Les selfies sont supprimés juste après la vérification ; seuls des scores anonymes sont conservés.",
      checkbox: "Je comprends et j’accepte le processus de vérification.",
      notice: "Nous traitons vos images conformément à notre politique de confidentialité.",
      privacyLink: "Avis de confidentialité",
      dataPolicyLink: "Politique vérification & données",
      button: "Commencer la vérification"
    },
    selfie: {
      title: "Prenez un selfie en direct",
      instructions: "Placez votre visage au centre, regardez la caméra et suivez les demandes de clignement/déplacement.",
      hintMovement: "Tournez légèrement la tête et clignez des yeux lorsqu’on vous le demande pour confirmer la présence réelle.",
      hintLight: "Placez-vous dans un endroit bien éclairé sans contre-jour fort.",
      capture: "Prendre le selfie",
      retake: "Reprendre la photo",
      attempts: "Essai {{count}} sur {{total}}",
      permission: "L’accès à la caméra est requis pour continuer.",
      enableCamera: "Autoriser la caméra",
      retryTitle: "Réessayer"
    },
    otp: {
      title: "Saisir le code de vérification",
      description: "Nous avons envoyé un code à 6 chiffres à votre contact. Entrez-le pour terminer.",
      attempts: "Essai {{count}} sur {{total}}",
      resend: "Renvoyer le code",
      waiting: "En attente de confirmation…",
      noScore: "Nous n’affichons jamais votre score de similarité, seulement le succès."
    },
    progress: {
      selfie: "Vérification du selfie…",
      otp: "Validation du code…"
    },
    errors: {
      verificationFailed: "La vérification a échoué. Vérifiez votre éclairage et réessayez.",
      rateLimited: "Trop de tentatives. Veuillez patienter quelques minutes.",
      otpInvalid: "Code invalide. Merci de réessayer."
    },
    success: "Vérification réussie ! Profitez de toutes les fonctionnalités.",
    badge: {
      verified: "Vérifié·e"
    }
  },
  profile: {
    form: {
      countryLabel: "Pays"
    },
    errors: {
      countryRequired: "Veuillez sélectionner un pays."
    },
    countries: {
      RU: "Russie",
      FR: "France",
      DE: "Allemagne",
      AT: "Autriche",
      BE: "Belgique",
      NO: "Norvège"
    },
    country_hint: "Aide à affiner le filtre « Europe »."
  },
  region: {
    no_paywall_text:
      "Vous êtes connecté. Les fonctionnalités Premium sont liées à votre compte dans votre région et seront activées automatiquement après connexion."
  }
};

export default fr;
