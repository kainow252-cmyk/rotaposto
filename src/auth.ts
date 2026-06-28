// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Módulo de Autenticação Firebase
//  Projeto: rotaposto-32e33 (projeto oficial RotaPosto)
//  Login: Google Sign-In · Facebook Login (signInWithPopup)
//  authDomain: rotaposto-32e33.firebaseapp.com
//  NOTA: authDomain customizado (rotaposto.com.br) exige /__/auth/handler no servidor
//  que só existe no Firebase Hosting. Usando o domínio padrão do Firebase.
//  O login funciona desde que rotaposto.com.br esteja nos Authorized domains do Firebase
//  E nos JavaScript origins do Google OAuth Console.
// ═══════════════════════════════════════════════════════════════════════

// Config Firebase do projeto rotaposto-32e33
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDrecb_jj0S1NG3cLNfb6F7fcP8vAwBCx8",
  authDomain: "rotaposto-32e33.firebaseapp.com",
  projectId: "rotaposto-32e33",
  storageBucket: "rotaposto-32e33.firebasestorage.app",
  messagingSenderId: "1078426960222",
  appId: "1:1078426960222:web:0e206f74445fd456b84fcf",
  measurementId: "G-13NYT80VQG"
}

// Google OAuth Client ID do projeto rotaposto-32e33 (Rotaposto2)
export const GOOGLE_CLIENT_ID = "1078426960222-viiv45tf4i508rlvj53202h6kda8ga9b.apps.googleusercontent.com"

// Google API Key
export const GOOGLE_API_KEY = "AIzaSyDrecb_jj0S1NG3cLNfb6F7fcP8vAwBCx8"

// ─── HTML do Firebase Auth ────────────────────────────────────────────────────
// signInWithPopup — sem redirect_uri_mismatch
// Domínio rotaposto.com.br deve estar em:
// Firebase Console → rotaposto-32e33 → Authentication → Settings → Authorized domains
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

    // ─── Google Provider ──────────────────────────────────────────────────
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    googleProvider.addScope('profile');
    googleProvider.addScope('email');

    // ─── Facebook Provider ────────────────────────────────────────────────
    // IMPORTANTE: O Firebase v10 adiciona 'email' como scope padrão automaticamente.
    // O Facebook rejeita 'email' como OAuth scope (é uma permission, não scope).
    // Solução: usar auth_type e forçar scope apenas com public_profile via customParameters.
    const facebookProvider = new FacebookAuthProvider();
    facebookProvider.setCustomParameters({
      display: 'popup',
      auth_type: 'rerequest',
      scope: 'public_profile'   // sobrescreve o scope padrão do Firebase
    });
    // NÃO usar addScope() — o Firebase ignora a remoção e sempre inclui email.
    // O email será obtido via user.email após login (Facebook já envia no token).

    // ─── Expor globalmente ────────────────────────────────────────────────
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
    console.log('[RotaPosto] Firebase Auth v10 OK - projeto rotaposto-32e33');
  </script>`
}
