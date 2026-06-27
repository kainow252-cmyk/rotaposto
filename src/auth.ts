// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Módulo de Autenticação Firebase
//  Google Sign-In · Facebook Login · Email/Password
//  Firebase config extraída do projeto ShareWallet (mesmo owner)
// ═══════════════════════════════════════════════════════════════════════

// Config Firebase do projeto affiliate-wallet-75853 (ShareWallet → RotaPosto)
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAapUKRo74zDOzrjjtZnAjodjptUnnHrCM",
  authDomain: "affiliate-wallet-75853.firebaseapp.com",
  projectId: "affiliate-wallet-75853",
  storageBucket: "affiliate-wallet-75853.firebasestorage.app",
  messagingSenderId: "470218127330",
  appId: "1:470218127330:web:310f8672bbdefe2f4aabbb"
}

// Google OAuth Client ID (para Sign-In with Google)
export const GOOGLE_CLIENT_ID = "470218127330-d1tr5j60i6db3ui56jgdqhar039dilvh.apps.googleusercontent.com"

// Google API Key (Maps + Places)
export const GOOGLE_API_KEY = "AIzaSyAapUKRo74zDOzrjjtZnAjodjptUnnHrCM"

// HTML do Firebase Auth (injetado no <head> das páginas)
// Expõe no window as funções necessárias para o app funcionar:
//   window._fbAuth         → instância do Auth
//   window._fbGoogleProvider  → GoogleAuthProvider configurado
//   window._fbFacebookProvider → FacebookAuthProvider configurado
//   window._fbSignInWithPopup  → função signInWithPopup
//   window._fbSignInWithEmailAndPassword
//   window._fbCreateUserWithEmailAndPassword
//   window._fbSignOut
//   window._fbOnAuthStateChanged
//   window._firebaseReady  → true após inicialização
export function getFirebaseAuthScripts(): string {
  const configJson = JSON.stringify(FIREBASE_CONFIG)
  return `
  <!-- Firebase SDK v10 (modular via CDN) -->
  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
    import {
      getAuth,
      signInWithPopup,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
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

    // ─── Providers ────────────────────────────────────────────────────────
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    googleProvider.addScope('profile');
    googleProvider.addScope('email');

    const facebookProvider = new FacebookAuthProvider();
    facebookProvider.addScope('email');
    facebookProvider.addScope('public_profile');

    // ─── Expor globalmente (nomes usados pelos handlers do app) ───────────
    window._fbAuth = auth;
    window._fbGoogleProvider = googleProvider;
    window._fbFacebookProvider = facebookProvider;
    window._fbSignInWithPopup = signInWithPopup;
    window._fbSignInWithEmailAndPassword = signInWithEmailAndPassword;
    window._fbCreateUserWithEmailAndPassword = createUserWithEmailAndPassword;
    window._fbSignOut = signOut;
    window._fbOnAuthStateChanged = onAuthStateChanged;
    window._fbUpdateProfile = updateProfile;
    window._firebaseReady = true;

    // ─── Notificar app que Firebase está pronto ───────────────────────────
    window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { auth } }));
    console.log('[RotaPosto] Firebase Auth v10 inicializado ✓');
  </script>`
}
