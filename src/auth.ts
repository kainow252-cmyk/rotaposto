// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Módulo de Autenticação Firebase
//  Projeto: rotaposto-32e33 (projeto oficial RotaPosto)
//  Google Sign-In · Email/Password · Facebook Login
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Módulo de Autenticação Firebase
//  Projeto: rotaposto-32e33 (projeto oficial RotaPosto)
//  Google Sign-In · Email/Password · Facebook Login
// ═══════════════════════════════════════════════════════════════════════

// Config Firebase do projeto rotaposto-32e33 (projeto oficial)
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDrecb_jj0S1NG3cLNfb6F7fcP8vAwBCx8",
  authDomain: "rotaposto-32e33.firebaseapp.com",
  projectId: "rotaposto-32e33",
  storageBucket: "rotaposto-32e33.firebasestorage.app",
  messagingSenderId: "1078426960222",
  appId: "1:1078426960222:web:0e206f74445fd456b84fcf",
  measurementId: "G-13NYT80VQG"
}

// Google OAuth Client ID — gerado no Console do Google Cloud para rotaposto-32e33
// Nota: atualize com o Client ID específico do projeto rotaposto-32e33 se necessário
export const GOOGLE_CLIENT_ID = "1078426960222-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"

// Google API Key do projeto rotaposto-32e33
export const GOOGLE_API_KEY = "AIzaSyDrecb_jj0S1NG3cLNfb6F7fcP8vAwBCx8"

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
    console.log('[RotaPosto] Firebase Auth v10 inicializado ✓ (projeto: rotaposto-32e33)');
  </script>`
}
