// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Módulo de Autenticação Firebase
//  Projeto: affiliate-wallet-75853 (projeto com Google + Facebook ativos)
//  Login: Google Sign-In · Facebook Login (somente social, sem email/senha)
// ═══════════════════════════════════════════════════════════════════════

// Config Firebase do projeto affiliate-wallet-75853
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAapUKRo74zDOzrjjtZnAjodjptUnnHrCM",
  authDomain: "affiliate-wallet-75853.firebaseapp.com",
  projectId: "affiliate-wallet-75853",
  storageBucket: "affiliate-wallet-75853.firebasestorage.app",
  messagingSenderId: "470218127330",
  appId: "1:470218127300:web:310f8672bbdefe2f4aabbb"
}

// Google OAuth Client ID real
export const GOOGLE_CLIENT_ID = "470218127330-d1tr5j60i6db3ui56jgdqhar039dilvh.apps.googleusercontent.com"

// Google API Key
export const GOOGLE_API_KEY = "AIzaSyAapUKRo74zDOzrjjtZnAjodjptUnnHrCM"

// ─── HTML do Firebase Auth ────────────────────────────────────────────────────
// Expõe no window:
//   window._fbAuth                    → instância do Auth
//   window._fbGoogleProvider          → GoogleAuthProvider
//   window._fbFacebookProvider        → FacebookAuthProvider
//   window._fbSignInWithPopup         → função signInWithPopup
//   window._fbSignOut                 → função signOut
//   window._fbOnAuthStateChanged      → listener de estado
//   window._fbUpdateProfile           → atualizar perfil
//   window._firebaseReady             → true após inicialização
export function getFirebaseAuthScripts(): string {
  const configJson = JSON.stringify(FIREBASE_CONFIG)
  return `
  <!-- Firebase SDK v10 (modular via CDN) -->
  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
    import {
      getAuth,
      signInWithPopup,
      signOut,
      onAuthStateChanged,
      GoogleAuthProvider,
      FacebookAuthProvider,
      updateProfile
    } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

    // ─── Inicializar Firebase ─────────────────────────────────────────────
    const firebaseConfig = ${configJson};
    const fbApp = initializeApp(firebaseConfig);
    const auth = getAuth(fbApp);
    auth.languageCode = 'pt-BR';

    // ─── Google Provider ──────────────────────────────────────────────────
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    googleProvider.addScope('profile');
    googleProvider.addScope('email');

    // ─── Facebook Provider ────────────────────────────────────────────────
    const facebookProvider = new FacebookAuthProvider();
    facebookProvider.addScope('email');
    facebookProvider.addScope('public_profile');

    // ─── Expor globalmente ────────────────────────────────────────────────
    window._fbAuth = auth;
    window._fbGoogleProvider = googleProvider;
    window._fbFacebookProvider = facebookProvider;
    window._fbSignInWithPopup = signInWithPopup;
    window._fbSignOut = signOut;
    window._fbOnAuthStateChanged = onAuthStateChanged;
    window._fbUpdateProfile = updateProfile;
    window._firebaseReady = true;

    // ─── Notificar app ────────────────────────────────────────────────────
    window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { auth } }));
    console.log('[RotaPosto] Firebase Auth v10 ✓ (Google + Facebook)');
  </script>`
}
