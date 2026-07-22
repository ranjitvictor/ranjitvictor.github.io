// Shared Firebase setup for the public form and the admin page.
//
// NOTE: These values are NOT secrets. A Firebase web "apiKey" is a public
// project identifier that must ship in browser code — security is enforced by
// Firestore Security Rules + App Check, NOT by hiding this config. It is safe
// to commit. Best practice is to restrict the key to your domains in the Google
// Cloud console (APIs & Services → Credentials) and enable App Check below.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app-check.js";

export const firebaseConfig = {
  apiKey: "AIzaSyB8YZhXx0mSj1BHBI-PJqRIxcyU8SvzvEo",
  authDomain: "ranjit-victor-a8d7c.firebaseapp.com",
  projectId: "ranjit-victor-a8d7c",
  storageBucket: "ranjit-victor-a8d7c.firebasestorage.app",
  messagingSenderId: "839194973636",
  appId: "1:839194973636:web:cba907e12cd3abf9918091",
};

// Optional: paste your reCAPTCHA v3 site key to turn on Firebase App Check
// (blocks scripted spam). Leave "" to skip for now.
export const RECAPTCHA_SITE_KEY = "";

// The single email allowed to read submissions in the admin page.
export const OWNER_EMAIL = "ranjitvictor@gmail.com";

// Firestore database ID (this project uses a named database, not "(default)").
export const DB_ID = "ranjit-victor-website";

export const app = initializeApp(firebaseConfig);

if (RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
