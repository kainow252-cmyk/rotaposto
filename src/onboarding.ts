// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Landing Page de Entrada (onboarding mobile-first)
//  Design inspirado em ShareWallet + SafeRouteGo
//  Dark theme azul petróleo + laranja + verde
// ═══════════════════════════════════════════════════════════════════════

import { GOOGLE_CLIENT_ID, getFirebaseAuthScripts } from './auth'

export function getLandingOnboardingHTML(firebaseScripts: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
  <meta name="theme-color" content="#0D1B2A"/>
  <meta name="description" content="Encontre o posto de combustível mais barato perto de você. Gasolina, Etanol, Diesel e GNV com dados reais ANP."/>
  <!-- PWA -->
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="RotaPosto"/>
  <meta name="application-name" content="RotaPosto"/>
  <meta name="msapplication-TileColor" content="#0D1B2A"/>
  <!-- Open Graph -->
  <meta property="og:title" content="RotaPosto – Combustível mais barato perto de você"/>
  <meta property="og:description" content="Economize em cada abastecimento. Dados reais da ANP."/>
  <meta property="og:image" content="/icons/icon-512x512.png"/>
  <meta property="og:type" content="website"/>
  <meta name="google-signin-client_id" content="${GOOGLE_CLIENT_ID}"/>
  <title>RotaPosto – Abasteça Mais Barato</title>
  <link rel="manifest" href="/manifest.json"/>
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png"/>
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  ${firebaseScripts}
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

    :root {
      --azul:    #0D1B2A;
      --azul2:   #0f2744;
      --azul3:   #1a3a5c;
      --laranja: #FF6D00;
      --laranja2:#ff8c00;
      --verde:   #00C853;
      --verde2:  #69F0AE;
      --branco:  #FFFFFF;
      --cinza:   rgba(255,255,255,0.55);
      --card-bg: rgba(255,255,255,0.06);
      --card-bord: rgba(255,255,255,0.10);
    }

    html, body {
      height: 100%; width: 100%;
      font-family: 'Raleway', sans-serif;
      background: var(--azul);
      color: var(--branco);
      overflow-x: hidden;
    }

    /* ── TELAS / SLIDES ─────────────────────────────────── */
    #onboarding {
      width: 100%; height: 100vh;
      display: flex; flex-direction: column;
      position: relative; overflow: hidden;
    }

    /* Fundo animado com gradiente + partículas */
    .bg-glow {
      position: absolute; inset: 0; z-index: 0;
      background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,109,0,0.18) 0%, transparent 70%),
                  radial-gradient(ellipse 60% 40% at 20% 80%, rgba(0,200,83,0.10) 0%, transparent 60%),
                  radial-gradient(ellipse 70% 50% at 80% 60%, rgba(13,27,42,0.9) 0%, transparent 80%),
                  linear-gradient(180deg, #0D1B2A 0%, #0a1520 100%);
      animation: glow-pulse 6s ease-in-out infinite alternate;
    }
    @keyframes glow-pulse {
      0%   { opacity: 0.9; }
      100% { opacity: 1; }
    }

    /* Grade de pontos decorativos */
    .bg-dots {
      position: absolute; inset: 0; z-index: 0; opacity: 0.15;
      background-image: radial-gradient(circle, rgba(255,109,0,0.6) 1px, transparent 1px);
      background-size: 32px 32px;
    }

    /* ── HEADER DO ONBOARDING ───────────────────────────── */
    .ob-header {
      position: relative; z-index: 10;
      padding: 52px 24px 0;
      text-align: center;
      flex-shrink: 0;
    }

    .ob-logo-wrap {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .ob-icon {
      width: 88px; height: 88px;
      background: linear-gradient(135deg, #FF6D00, #ff9500);
      border-radius: 24px;
      display: flex; align-items: center; justify-content: center;
      font-size: 44px;
      box-shadow: 0 8px 32px rgba(255,109,0,0.45), 0 0 0 1px rgba(255,109,0,0.2);
      animation: icon-float 3s ease-in-out infinite;
    }
    @keyframes icon-float {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-6px); }
    }

    .ob-brand {
      font-size: 32px; font-weight: 900;
      letter-spacing: -0.5px;
      color: var(--branco);
    }
    .ob-brand span { color: var(--laranja); }
    .ob-tagline {
      font-size: 14px; font-weight: 500;
      color: var(--cinza);
      margin-top: 4px;
      letter-spacing: 0.3px;
    }

    /* ── FEATURES GRID ──────────────────────────────────── */
    .ob-features {
      position: relative; z-index: 10;
      padding: 28px 20px 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      flex-shrink: 0;
    }

    .feat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-bord);
      border-radius: 18px;
      padding: 16px 8px;
      text-align: center;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: transform 0.2s, background 0.2s;
    }
    .feat-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.09); }

    .feat-icon {
      width: 44px; height: 44px;
      border-radius: 14px;
      margin: 0 auto 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .feat-icon.laranja { background: rgba(255,109,0,0.18); }
    .feat-icon.verde   { background: rgba(0,200,83,0.18);  }
    .feat-icon.azul    { background: rgba(33,150,243,0.18);}

    .feat-title {
      font-size: 11px; font-weight: 800;
      color: var(--branco);
      line-height: 1.3;
    }
    .feat-desc {
      font-size: 10px; font-weight: 500;
      color: var(--cinza);
      margin-top: 4px;
      line-height: 1.4;
    }

    /* ── STATS ──────────────────────────────────────────── */
    .ob-stats {
      position: relative; z-index: 10;
      padding: 20px 20px 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      flex-shrink: 0;
    }

    .stat-item {
      text-align: center;
      padding: 14px 8px;
      background: var(--card-bg);
      border: 1px solid var(--card-bord);
      border-radius: 14px;
    }
    .stat-num {
      font-size: 20px; font-weight: 900;
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.1;
    }
    .stat-lbl {
      font-size: 10px; font-weight: 600;
      color: var(--cinza);
      margin-top: 3px;
    }

    /* ── SPACER FLEX ────────────────────────────────────── */
    .ob-spacer { flex: 1; min-height: 16px; }

    /* ── CTA BUTTONS ────────────────────────────────────── */
    .ob-cta {
      position: relative; z-index: 10;
      padding: 0 20px calc(env(safe-area-inset-bottom, 0px) + 28px);
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex-shrink: 0;
    }

    .btn-primary {
      width: 100%; padding: 18px 24px;
      background: linear-gradient(135deg, #FF6D00, #ff8c00);
      border: none; border-radius: 18px;
      color: white; font-family: 'Raleway', sans-serif;
      font-size: 16px; font-weight: 800;
      letter-spacing: 0.3px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      box-shadow: 0 8px 28px rgba(255,109,0,0.40), 0 2px 8px rgba(0,0,0,0.2);
      transition: transform 0.15s, box-shadow 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .btn-primary:active { transform: scale(0.97); box-shadow: 0 4px 16px rgba(255,109,0,0.3); }

    .btn-secondary {
      width: 100%; padding: 17px 24px;
      background: transparent;
      border: 1.5px solid rgba(255,255,255,0.25);
      border-radius: 18px;
      color: rgba(255,255,255,0.85); font-family: 'Raleway', sans-serif;
      font-size: 15px; font-weight: 700;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      transition: background 0.15s, border-color 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .btn-secondary:active { background: rgba(255,255,255,0.08); }

    .terms-note {
      text-align: center;
      font-size: 10px; font-weight: 500;
      color: rgba(255,255,255,0.3);
      margin-top: 4px;
    }
    .terms-note a { color: rgba(255,255,255,0.5); text-decoration: none; }

    /* ── MODAL DE LOGIN FIREBASE ────────────────────────── */
    .auth-overlay {
      position: fixed; inset: 0; z-index: 9000;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: none;
      align-items: flex-end;
      justify-content: center;
    }
    .auth-overlay.open { display: flex; animation: fade-in 0.2s ease; }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

    .auth-sheet {
      width: 100%; max-width: 480px;
      background: #111e2f;
      border-radius: 28px 28px 0 0;
      padding: 8px 24px calc(env(safe-area-inset-bottom, 0px) + 32px);
      border-top: 1px solid rgba(255,255,255,0.1);
      animation: slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }

    .sheet-handle {
      width: 36px; height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      margin: 12px auto 20px;
    }

    .auth-logo-sm {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 4px;
    }
    .auth-logo-sm .icon-sm {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #FF6D00, #ff9500);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .auth-title {
      font-size: 20px; font-weight: 900; color: var(--branco);
    }
    .auth-subtitle {
      font-size: 13px; font-weight: 500; color: var(--cinza);
      margin-bottom: 20px;
    }

    .btn-social {
      width: 100%; padding: 15px 18px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      color: var(--branco); font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 700;
      cursor: pointer; margin-bottom: 10px;
      display: flex; align-items: center; gap: 12px;
      transition: background 0.15s;
    }
    .btn-social:active { background: rgba(255,255,255,0.12); }
    .btn-social.fb { }

    .auth-divider {
      display: flex; align-items: center; gap: 12px;
      margin: 14px 0;
    }
    .auth-divider::before, .auth-divider::after {
      content: ''; flex: 1; height: 1px;
      background: rgba(255,255,255,0.1);
    }
    .auth-divider span { font-size: 11px; color: var(--cinza); font-weight: 600; white-space: nowrap; }

    .auth-input {
      width: 100%; padding: 15px 16px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      color: var(--branco); font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 600;
      margin-bottom: 10px;
      outline: none;
      transition: border-color 0.2s;
    }
    .auth-input:focus { border-color: var(--laranja); }
    .auth-input::placeholder { color: rgba(255,255,255,0.3); }

    .btn-auth-enter {
      width: 100%; padding: 16px;
      background: linear-gradient(135deg, #FF6D00, #ff8c00);
      border: none; border-radius: 14px;
      color: white; font-family: 'Raleway', sans-serif;
      font-size: 15px; font-weight: 800;
      cursor: pointer; margin-top: 4px;
      box-shadow: 0 6px 20px rgba(255,109,0,0.35);
      transition: transform 0.15s;
    }
    .btn-auth-enter:active { transform: scale(0.97); }

    #auth-erro-ob {
      color: #FF6D00; font-size: 12px; font-weight: 600;
      min-height: 16px; text-align: center; margin-top: 8px;
    }

    .auth-footer-links {
      text-align: center; margin-top: 14px;
      font-size: 12px; font-weight: 600; color: var(--cinza);
    }
    .auth-footer-links a { color: var(--laranja); text-decoration: none; }

    /* ── BANNER PWA INSTALL ─────────────────────────────── */
    #pwa-banner-ob {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 8000;
      background: linear-gradient(135deg, #1a3a5c, #0f2744);
      border-top: 1px solid rgba(255,109,0,0.3);
      padding: 14px 20px calc(env(safe-area-inset-bottom, 0px) + 14px);
      display: flex; align-items: center; gap: 14px;
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }
    #pwa-banner-ob.visible { transform: translateY(0); }
    #pwa-banner-ob img { width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0; }
    .pwa-txt { flex: 1; }
    .pwa-txt strong { font-size: 13px; font-weight: 800; display: block; color: var(--branco); }
    .pwa-txt span   { font-size: 11px; font-weight: 500; color: var(--cinza); }
    .btn-pwa-install {
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      border: none; border-radius: 10px;
      color: white; font-family: 'Raleway', sans-serif;
      font-size: 13px; font-weight: 800;
      padding: 10px 16px; cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(255,109,0,0.3);
    }
    .btn-pwa-close {
      background: none; border: none;
      color: var(--cinza); font-size: 18px;
      cursor: pointer; padding: 4px; flex-shrink: 0;
    }

    /* ── SPINNER ────────────────────────────────────────── */
    .spinner-sm {
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.2);
      border-top-color: white;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── TOAST ─────────────────────────────────────────── */
    #toast-ob {
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.15);
      color: white; font-size: 13px; font-weight: 700;
      padding: 12px 20px; border-radius: 14px;
      pointer-events: none; opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      white-space: nowrap; z-index: 9999;
    }
    #toast-ob.show {
      opacity: 1; transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>

<!-- ═══ ONBOARDING / LANDING PAGE ══════════════════════════════════════════ -->
<div id="onboarding">

  <!-- Fundo decorativo -->
  <div class="bg-glow"></div>
  <div class="bg-dots"></div>

  <!-- Header com logo -->
  <header class="ob-header">
    <div class="ob-logo-wrap">
      <div class="ob-icon">⛽</div>
      <div>
        <div class="ob-brand">Rota<span>Posto</span></div>
        <div class="ob-tagline">Abasteça mais barato, sempre</div>
      </div>
    </div>
  </header>

  <!-- Cards de features (3 colunas) -->
  <div class="ob-features">
    <div class="feat-card">
      <div class="feat-icon laranja">🔍</div>
      <div class="feat-title">Preços em Tempo Real</div>
      <div class="feat-desc">Dados direto da ANP</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon verde">📍</div>
      <div class="feat-title">GPS Automático</div>
      <div class="feat-desc">Postos ao redor de você</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon azul">💰</div>
      <div class="feat-title">IA de Economia</div>
      <div class="feat-desc">Calcula o melhor custo-rota</div>
    </div>
  </div>

  <!-- Stats (números de impacto) -->
  <div class="ob-stats">
    <div class="stat-item">
      <div class="stat-num">46K</div>
      <div class="stat-lbl">Postos Brasil</div>
    </div>
    <div class="stat-item">
      <div class="stat-num">R$0,80</div>
      <div class="stat-lbl">Economia/L</div>
    </div>
    <div class="stat-item">
      <div class="stat-num">7 tipos</div>
      <div class="stat-lbl">Combustível</div>
    </div>
  </div>

  <div class="ob-spacer"></div>

  <!-- CTAs -->
  <div class="ob-cta">
    <button class="btn-primary" id="btn-comecar" onclick="abrirLogin('comecar')">
      <i class="fas fa-rocket"></i>
      Cadastre-se agora
    </button>
    <button class="btn-secondary" id="btn-ja-tenho" onclick="abrirLogin('entrar')">
      <i class="fas fa-user"></i>
      Já tenho uma conta
    </button>
    <!-- Botão Ver Mapa ocultado (acesso via menu após login) -->
    <p class="terms-note">Ao criar sua conta você concorda com nossos <a href="#">Termos de Uso</a></p>
  </div>

</div>

<!-- ═══ MODAL DE LOGIN FIREBASE ════════════════════════════════════════════ -->
<div class="auth-overlay" id="auth-overlay" onclick="fecharAuthOverlay(event)">
  <div class="auth-sheet" id="auth-sheet">
    <div class="sheet-handle"></div>

    <div class="auth-logo-sm">
      <div class="icon-sm">⛽</div>
      <div>
        <div class="auth-title">RotaPosto</div>
      </div>
    </div>
    <p class="auth-subtitle" id="auth-subtitle-ob">Entre para salvar postos favoritos e histórico</p>

    <!-- Google -->
    <button class="btn-social" id="btn-google-ob" onclick="loginGoogleOB()">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continuar com Google
    </button>

    <!-- Facebook -->
    <button class="btn-social fb" id="btn-fb-ob" onclick="loginFacebookOB()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      Continuar com Facebook
    </button>

    <div class="auth-divider"><span>ou use seu email</span></div>

    <input type="email" class="auth-input" id="ob-email" placeholder="seu@email.com" autocomplete="email"/>
    <input type="password" class="auth-input" id="ob-senha" placeholder="Senha (mín. 6 caracteres)" autocomplete="current-password"/>

    <button class="btn-auth-enter" id="btn-entrar-ob" onclick="loginEmailOB()">
      <i class="fas fa-sign-in-alt"></i> Entrar
    </button>

    <div id="auth-erro-ob"></div>

    <div class="auth-footer-links">
      Não tem conta? <a href="#" onclick="modoRegistroOB(event)">Criar conta grátis</a>
      &nbsp;·&nbsp;
      <a href="#" onclick="fecharAuthOverlay(null,true)">Continuar sem login</a>
    </div>
  </div>
</div>

<!-- ═══ BANNER PWA INSTALL ═════════════════════════════════════════════════ -->
<div id="pwa-banner-ob">
  <img src="/icons/icon-192x192.png" alt="RotaPosto" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22 viewBox=%220 0 48 48%22><rect width=%2248%22 height=%2248%22 rx=%2212%22 fill=%22%23FF6D00%22/><text x=%2224%22 y=%2234%22 text-anchor=%22middle%22 font-size=%2228%22>⛽</text></svg>'"/>
  <div class="pwa-txt">
    <strong>Instalar RotaPosto</strong>
    <span>Acesso rápido na tela inicial</span>
  </div>
  <button class="btn-pwa-install" id="btn-pwa-ob">Instalar</button>
  <button class="btn-pwa-close" onclick="document.getElementById('pwa-banner-ob').classList.remove('visible')">×</button>
</div>

<!-- Toast -->
<div id="toast-ob"></div>

<script>
// ═══ ESTADO ═══════════════════════════════════════════════════════════════
let _obPwaPrompt = null;
let _obModoRegistro = false;
let _obFirebaseAuth = null;
let _obModoInicio = 'comecar'; // 'comecar' ou 'entrar'

// ═══ PWA INSTALL PROMPT ═══════════════════════════════════════════════════
(function() {
  const banner = document.getElementById('pwa-banner-ob');
  const btnInstall = document.getElementById('btn-pwa-ob');
  const jaInstalado = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (jaInstalado) { banner.style.display = 'none'; return; }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _obPwaPrompt = e;
    setTimeout(() => banner.classList.add('visible'), 2500);
  });

  btnInstall.addEventListener('click', async () => {
    if (!_obPwaPrompt) {
      toastOB('📱 Safari: Menu → "Adicionar à Tela de Início"');
      return;
    }
    banner.classList.remove('visible');
    _obPwaPrompt.prompt();
    const { outcome } = await _obPwaPrompt.userChoice;
    if (outcome === 'accepted') toastOB('✅ App instalado!');
    _obPwaPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    banner.classList.remove('visible');
    toastOB('🎉 RotaPosto instalado!');
  });

  // iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS && !jaInstalado) {
    setTimeout(() => {
      banner.classList.add('visible');
      btnInstall.textContent = 'Como instalar';
      btnInstall.onclick = () => {
        toastOB('📱 Safari: Compartilhar → "Adicionar à Tela de Início"');
        banner.classList.remove('visible');
      };
    }, 4000);
  }
})();

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(r => console.log('[SW] OK', r.scope))
    .catch(e => console.warn('[SW] Erro:', e));
}

// ═══ FIREBASE AUTH ═════════════════════════════════════════════════════════
window.addEventListener('firebase-ready', () => {
  _obFirebaseAuth = window._fbAuth;

  window._fbOnAuthStateChanged(_obFirebaseAuth, (user) => {
    if (user) {
      // Usuário já logado — redirecionar direto para o app
      toastOB('👋 Bem-vindo de volta, ' + (user.displayName || user.email || 'usuário') + '!');
      setTimeout(() => { window.location.href = '/app'; }, 800);
    }
  });
});

// Fallback polling
let _obFbTentativas = 0;
const _obFbTimer = setInterval(() => {
  _obFbTentativas++;
  if (window._firebaseReady && window._fbAuth) {
    clearInterval(_obFbTimer);
    _obFirebaseAuth = window._fbAuth;
    window._fbOnAuthStateChanged(_obFirebaseAuth, (user) => {
      if (user) {
        toastOB('👋 Bem-vindo de volta!');
        setTimeout(() => { window.location.href = '/app'; }, 800);
      }
    });
  } else if (_obFbTentativas >= 20) {
    clearInterval(_obFbTimer);
  }
}, 300);

// ═══ ABRIR MODAL DE LOGIN ══════════════════════════════════════════════════
function abrirLogin(modo) {
  _obModoInicio = modo;
  _obModoRegistro = (modo === 'comecar');

  const overlay = document.getElementById('auth-overlay');
  const subtitle = document.getElementById('auth-subtitle-ob');
  const btnEntrar = document.getElementById('btn-entrar-ob');

  overlay.classList.add('open');

  if (_obModoRegistro) {
    subtitle.textContent = 'Crie sua conta grátis para salvar favoritos';
    btnEntrar.innerHTML = '<i class="fas fa-user-plus"></i> Criar conta grátis';
    document.getElementById('ob-senha').placeholder = 'Criar senha (mín. 6 caracteres)';
    document.getElementById('ob-senha').autocomplete = 'new-password';
  } else {
    subtitle.textContent = 'Entre para acessar seus dados salvos';
    btnEntrar.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    document.getElementById('ob-senha').placeholder = 'Sua senha';
    document.getElementById('ob-senha').autocomplete = 'current-password';
  }

  document.getElementById('auth-erro-ob').textContent = '';
}

function modoRegistroOB(e) {
  e && e.preventDefault();
  _obModoRegistro = !_obModoRegistro;
  const btnEntrar = document.getElementById('btn-entrar-ob');
  const subtitle = document.getElementById('auth-subtitle-ob');
  const linkToggle = document.querySelector('.auth-footer-links a');

  if (_obModoRegistro) {
    subtitle.textContent = 'Crie sua conta grátis';
    btnEntrar.innerHTML = '<i class="fas fa-user-plus"></i> Criar conta grátis';
    document.querySelector('.auth-footer-links').innerHTML =
      'Já tem conta? <a href="#" onclick="modoRegistroOB(event)">Entrar</a> · <a href="#" onclick="fecharAuthOverlay(null,true)">Pular</a>';
  } else {
    subtitle.textContent = 'Entre na sua conta';
    btnEntrar.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    document.querySelector('.auth-footer-links').innerHTML =
      'Não tem conta? <a href="#" onclick="modoRegistroOB(event)">Criar conta grátis</a> · <a href="#" onclick="fecharAuthOverlay(null,true)">Continuar sem login</a>';
  }
  document.getElementById('auth-erro-ob').textContent = '';
}

function fecharAuthOverlay(e, forcar) {
  if (forcar || (e && e.target === document.getElementById('auth-overlay'))) {
    document.getElementById('auth-overlay').classList.remove('open');
    // Ir direto ao app mesmo sem login
    window.location.href = '/app';
  }
}

// ═══ LOGIN GOOGLE ══════════════════════════════════════════════════════════
async function loginGoogleOB() {
  if (!window._fbSignInWithPopup || !window._fbGoogleProvider || !_obFirebaseAuth) {
    toastOB('⏳ Aguarde...');
    setTimeout(loginGoogleOB, 600);
    return;
  }
  const btn = document.getElementById('btn-google-ob');
  btn.innerHTML = '<span class="spinner-sm"></span> Aguardando Google...';
  btn.disabled = true;
  try {
    await window._fbSignInWithPopup(_obFirebaseAuth, window._fbGoogleProvider);
    // onAuthStateChanged irá redirecionar
  } catch (err) {
    erroAuthOB(err);
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continuar com Google';
    btn.disabled = false;
  }
}

// ═══ LOGIN FACEBOOK ════════════════════════════════════════════════════════
async function loginFacebookOB() {
  if (!window._fbSignInWithPopup || !window._fbFacebookProvider || !_obFirebaseAuth) {
    toastOB('⏳ Aguarde...');
    setTimeout(loginFacebookOB, 600);
    return;
  }
  const btn = document.getElementById('btn-fb-ob');
  btn.innerHTML = '<span class="spinner-sm"></span> Aguardando Facebook...';
  btn.disabled = true;
  try {
    await window._fbSignInWithPopup(_obFirebaseAuth, window._fbFacebookProvider);
  } catch (err) {
    erroAuthOB(err);
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> Continuar com Facebook';
    btn.disabled = false;
  }
}

// ═══ LOGIN EMAIL ═══════════════════════════════════════════════════════════
async function loginEmailOB() {
  if (!window._fbSignInWithEmailAndPassword || !_obFirebaseAuth) {
    toastOB('⏳ Aguarde Firebase...'); return;
  }
  const email = document.getElementById('ob-email').value.trim();
  const senha = document.getElementById('ob-senha').value;
  if (!email || !senha) { erroAuthOB({ code: 'auth/empty-fields' }); return; }
  if (_obModoRegistro && senha.length < 6) { erroAuthOB({ code: 'auth/weak-password' }); return; }

  const btn = document.getElementById('btn-entrar-ob');
  const txtOriginal = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-sm"></span>';
  btn.disabled = true;

  try {
    if (_obModoRegistro) {
      await window._fbCreateUserWithEmailAndPassword(_obFirebaseAuth, email, senha);
    } else {
      await window._fbSignInWithEmailAndPassword(_obFirebaseAuth, email, senha);
    }
    // onAuthStateChanged redireciona
  } catch (err) {
    erroAuthOB(err);
    btn.innerHTML = txtOriginal;
    btn.disabled = false;
  }
}

// ═══ ERRO AUTH ═════════════════════════════════════════════════════════════
function erroAuthOB(err) {
  const msgs = {
    'auth/user-not-found':        'Usuário não encontrado. Crie uma conta!',
    'auth/wrong-password':        'Senha incorreta.',
    'auth/email-already-in-use':  'Email já cadastrado. Faça login!',
    'auth/weak-password':         'Senha precisa ter 6+ caracteres.',
    'auth/invalid-email':         'Email inválido.',
    'auth/popup-closed-by-user':  'Login cancelado.',
    'auth/network-request-failed':'Sem internet. Verifique a conexão.',
    'auth/empty-fields':          'Preencha email e senha.',
    'auth/too-many-requests':     'Muitas tentativas. Aguarde.',
    'auth/invalid-credential':    'Email ou senha incorretos.',
  };
  document.getElementById('auth-erro-ob').textContent =
    msgs[err.code] || (err.message || 'Erro desconhecido');
}

// ═══ TOAST ═════════════════════════════════════════════════════════════════
function toastOB(msg) {
  const t = document.getElementById('toast-ob');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
</script>
</body>
</html>`
}
