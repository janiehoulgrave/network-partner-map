// ─────────────────────────────────────────────────────────────
// Network Partner Map settings
// Firebase web config (same project as SignatureStudio).
// Firebase console → Project settings → General → Your apps → Web app → "SDK setup and configuration" → Config.
// These values are safe to publish; access is protected by the Firestore rules.
// ─────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyB1Homchyphi_-oNu_FHcOBtVd0-KtjL0w",
  authDomain: "signaturestudio-f49f4.firebaseapp.com",
  projectId: "signaturestudio-f49f4",
  storageBucket: "signaturestudio-f49f4.firebasestorage.app",
  messagingSenderId: "249570654167",
  appId: "1:249570654167:web:12912e6b9aa2967479bd92",
  measurementId: "G-SGR3W70EWR",
};

// Firestore collection for this app (each agent's partners live under networkMap/{their user id}/partners)
export const COLLECTION = "networkMap";

// Only Google accounts on this domain can sign in
export const ALLOWED_DOMAIN = "compass.com";

// Tag added to every contact in the CRM export
export const CRM_TAG = "Network";
