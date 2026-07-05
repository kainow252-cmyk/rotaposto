// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Onboarding Completo (Telas 1-6)
//  Design pixel-perfect conforme referências do usuário
//  Tema: BRANCO com laranja #FF6D00
// ═══════════════════════════════════════════════════════════════════════

export function getLandingOnboardingHTML(firebaseScripts: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
  <meta name="theme-color" content="#1A1A2E"/>
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="RotaPosto"/>
  <title>RotaPosto – Boas-vindas</title>
  <link rel="manifest" href="/manifest.json"/>
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png"/>
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  ${firebaseScripts}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

    :root {
      --orange: #FF6D00;
      --orange-dark: #E65100;
      --orange-light: #FFF3E0;
      --black: #1A1A1A;
      --gray-dark: #555;
      --gray: #888;
      --gray-light: #CCC;
      --gray-bg: #F5F5F5;
      --white: #FFFFFF;
      --green: #00C853;
      --red: #E53935;
      --border: #E0E0E0;
      --sat: env(safe-area-inset-top, 0px);
      --sab: env(safe-area-inset-bottom, 0px);
    }

    html, body {
      width: 100%; height: 100%;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #000;
      overflow: hidden;
    }

    /* ── CONTAINER PRINCIPAL ── */
    #ob-root {
      width: 100%; height: 100dvh;
      position: fixed; inset: 0;
      overflow: hidden;
    }

    /* ══════════════════════════════════════════════
       TELA 1 — SPLASH
    ══════════════════════════════════════════════ */
    #screen-splash {
      width: 100%; height: 100%;
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: flex-start;
      background: #1A1A2E;
      overflow: hidden;
    }

    /* Foto de fundo: posto de combustível à noite */
    #splash-bg {
      position: absolute; inset: 0;
      background:
        linear-gradient(180deg, rgba(26,26,46,0.3) 0%, rgba(26,26,46,0.5) 40%, rgba(26,26,46,0.92) 70%, #1A1A2E 100%),
        url('https://images.unsplash.com/photo-1545431781-3e1b506e9a37?w=800&q=80') center/cover no-repeat;
      z-index: 0;
    }

    #splash-content {
      position: relative; z-index: 1;
      width: 100%; padding: 0 32px;
      padding-top: calc(var(--sat) + 80px);
      padding-bottom: calc(var(--sab) + 40px);
      display: flex; flex-direction: column;
      align-items: center;
      flex: 1;
      justify-content: flex-start;
    }

    /* Logo central */
    #splash-logo-wrap {
      display: flex; flex-direction: column;
      align-items: center; margin-bottom: 12px;
    }

    /* Ícone SVG: bomba + pin laranja */
    .splash-icon {
      width: 88px; height: 88px; margin-bottom: 16px;
    }

    #splash-brand {
      font-size: 42px; font-weight: 900;
      letter-spacing: -1px; margin-bottom: 10px;
      line-height: 1;
    }
    #splash-brand .rota { color: #fff; }
    #splash-brand .posto { color: var(--orange); }

    #splash-sub {
      font-size: 15px; font-weight: 400;
      color: rgba(255,255,255,0.75);
      text-align: center; line-height: 1.5;
      margin-bottom: 0;
    }

    .btn-splash-primary {
      width: 100%; padding: 17px;
      background: var(--orange);
      border: none; border-radius: 14px;
      color: #fff; font-family: 'Inter', sans-serif;
      font-size: 17px; font-weight: 700;
      cursor: pointer; margin-top: auto; margin-bottom: 16px;
      transition: opacity 0.2s;
    }
    .btn-splash-primary:active { opacity: 0.85; }

    .btn-splash-ghost {
      background: none; border: none;
      color: rgba(255,255,255,0.75);
      font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 500;
      cursor: pointer; padding: 8px;
    }

    /* ══════════════════════════════════════════════
       TELAS 2-6: CONTAINER BRANCO
    ══════════════════════════════════════════════ */
    .screen-white {
      width: 100%; height: 100%;
      position: absolute; inset: 0;
      display: none; flex-direction: column;
      background: var(--white);
      overflow: hidden;
    }
    .screen-white.active { display: flex; }

    /* Header com seta voltar */
    .ob-header {
      display: flex; align-items: center;
      padding: calc(var(--sat) + 16px) 20px 0;
      min-height: calc(var(--sat) + 56px);
    }
    .btn-back {
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer;
      color: var(--black);
    }
    .btn-back svg { width: 22px; height: 22px; }

    /* ══════════════════════════════════════════════
       TELA 2 — BOAS-VINDAS (carrossel)
    ══════════════════════════════════════════════ */
    #screen-welcome {
      justify-content: space-between;
    }

    #welcome-illustration {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 20px 40px 0;
    }

    /* Ilustração bomba de gasolina */
    .fuel-illustration {
      width: 240px; height: 240px;
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }

    .fuel-circle-bg {
      width: 200px; height: 200px;
      border-radius: 50%;
      background: #F0F0F0;
      display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden;
    }

    /* Silhueta cidade dentro do círculo */
    .fuel-city-silhouette {
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 60px;
      background: linear-gradient(to top, rgba(200,200,200,0.4) 0%, transparent 100%);
    }

    /* Bomba 3D em SVG */
    .fuel-pump-img {
      position: relative; z-index: 1;
      width: 130px; height: 130px;
    }

    #welcome-bottom {
      padding: 0 28px calc(var(--sab) + 28px);
    }

    #welcome-title {
      font-size: 26px; font-weight: 800;
      color: var(--black); text-align: center;
      line-height: 1.25; margin-bottom: 12px;
    }
    #welcome-title .highlight { color: var(--orange); }

    #welcome-sub {
      font-size: 15px; color: var(--gray-dark);
      text-align: center; line-height: 1.6;
      margin-bottom: 28px;
    }

    /* Dots paginação */
    .dots-row {
      display: flex; justify-content: center;
      gap: 6px; margin-bottom: 28px;
    }
    .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--gray-light);
      transition: all 0.3s;
    }
    .dot.active {
      width: 24px; border-radius: 4px;
      background: var(--orange);
    }

    .btn-primary {
      width: 100%; padding: 17px;
      background: var(--orange);
      border: none; border-radius: 14px;
      color: #fff; font-family: 'Inter', sans-serif;
      font-size: 17px; font-weight: 700;
      cursor: pointer; margin-bottom: 14px;
      transition: opacity 0.2s;
    }
    .btn-primary:active { opacity: 0.85; }

    .btn-ghost {
      width: 100%; padding: 10px;
      background: none; border: none;
      color: var(--black); font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 600;
      cursor: pointer; text-align: center;
    }

    /* ══════════════════════════════════════════════
       TELA 3 — PERMISSÃO LOCALIZAÇÃO
    ══════════════════════════════════════════════ */
    #screen-location {
      justify-content: space-between;
    }

    #location-illustration {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 20px 40px 0;
    }

    .location-map-wrap {
      width: 260px; height: 260px;
      position: relative;
      display: flex; align-items: center; justify-content: center;
    }

    /* Mapa de fundo (tiles simulados) */
    .location-map-bg {
      width: 100%; height: 100%;
      border-radius: 50%;
      overflow: hidden;
      position: absolute;
      background: #E8F4FD;
    }

    /* Grade do mapa */
    .map-grid {
      width: 100%; height: 100%;
      position: relative;
    }

    /* Linhas de rua simuladas */
    .map-road-h {
      position: absolute; left: 0; right: 0;
      height: 8px; background: #fff;
      border-radius: 2px;
    }
    .map-road-v {
      position: absolute; top: 0; bottom: 0;
      width: 8px; background: #fff;
      border-radius: 2px;
    }

    /* Blocos/quarteirões */
    .map-block {
      position: absolute;
      background: #D4E9F7;
      border-radius: 3px;
    }

    /* Círculo azul (raio/radar) */
    .location-radar {
      width: 140px; height: 140px;
      border-radius: 50%;
      background: rgba(66, 133, 244, 0.12);
      border: 2px solid rgba(66, 133, 244, 0.25);
      position: absolute; z-index: 1;
    }

    /* Pin laranja grande */
    .location-pin {
      position: absolute; z-index: 2;
      display: flex; align-items: center; justify-content: center;
    }

    /* Ponto azul do usuário */
    .user-dot {
      width: 14px; height: 14px; border-radius: 50%;
      background: #4285F4;
      border: 2.5px solid #fff;
      box-shadow: 0 2px 6px rgba(66,133,244,0.5);
      position: absolute; z-index: 3;
      left: 25%; bottom: 42%;
    }

    #location-bottom {
      padding: 0 28px calc(var(--sab) + 28px);
    }

    #location-title {
      font-size: 24px; font-weight: 800;
      color: var(--black); text-align: center;
      line-height: 1.3; margin-bottom: 12px;
    }
    #location-sub {
      font-size: 15px; color: var(--gray-dark);
      text-align: center; line-height: 1.6;
      margin-bottom: 32px;
    }

    /* ══════════════════════════════════════════════
       TELA 4 — LOGIN / CADASTRO
    ══════════════════════════════════════════════ */
    #screen-login {
      align-items: center;
      padding: calc(var(--sat) + 48px) 28px calc(var(--sab) + 24px);
      overflow-y: auto;
    }

    #login-logo {
      font-size: 28px; font-weight: 900;
      margin-bottom: 28px;
      letter-spacing: -0.5px;
    }
    #login-logo .rota { color: var(--black); }
    #login-logo .posto { color: var(--orange); }

    #login-title {
      font-size: 24px; font-weight: 800;
      color: var(--black); text-align: center;
      line-height: 1.25; margin-bottom: 6px;
    }
    #login-sub {
      font-size: 14px; color: var(--gray);
      margin-bottom: 32px; text-align: center;
    }

    /* Botões social */
    .btn-social {
      width: 100%; padding: 15px 20px;
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center; gap: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 600;
      color: var(--black); cursor: pointer;
      margin-bottom: 12px;
      transition: background 0.15s;
    }
    .btn-social:active { background: var(--gray-bg); }

    /* Google G colorido */
    .google-g {
      width: 20px; height: 20px; flex-shrink: 0;
    }

    /* Divisor "ou" */
    .divider-ou {
      width: 100%; display: flex; align-items: center;
      gap: 12px; margin: 4px 0 16px;
    }
    .divider-line { flex: 1; height: 1px; background: var(--border); }
    .divider-text {
      font-size: 13px; font-weight: 500; color: var(--gray);
    }

    /* Campos de formulário */
    .field-group { width: 100%; margin-bottom: 12px; }
    .field-wrap {
      width: 100%; position: relative;
    }
    .field-input {
      width: 100%; padding: 15px 16px;
      border: 1.5px solid var(--border);
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 400;
      color: var(--black); background: var(--white);
      outline: none;
      transition: border-color 0.2s;
    }
    .field-input::placeholder { color: var(--gray-light); }
    .field-input:focus { border-color: var(--orange); }

    .field-eye {
      position: absolute; right: 14px; top: 50%;
      transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: var(--gray); padding: 4px;
    }

    /* Esqueci senha */
    .link-forgot {
      width: 100%; text-align: right;
      font-size: 13px; font-weight: 600;
      color: var(--orange); background: none; border: none;
      cursor: pointer; padding: 0; margin-bottom: 20px;
    }

    /* Rodapé login */
    #login-footer {
      margin-top: 20px;
      font-size: 14px; color: var(--gray-dark);
      text-align: center;
    }
    #login-footer .link-orange {
      color: var(--orange); font-weight: 700;
      background: none; border: none; cursor: pointer;
      font-family: 'Inter', sans-serif; font-size: 14px;
    }

    /* ══════════════════════════════════════════════
       TELA 5 — PREFERÊNCIAS VEÍCULO
    ══════════════════════════════════════════════ */
    #screen-vehicle {
      overflow-y: auto;
    }

    #vehicle-body {
      flex: 1; padding: 0 28px calc(var(--sab) + 28px);
      display: flex; flex-direction: column;
    }

    #vehicle-title {
      font-size: 26px; font-weight: 800;
      color: var(--black); text-align: center;
      margin-bottom: 6px;
    }
    #vehicle-sub {
      font-size: 14px; color: var(--gray);
      text-align: center; margin-bottom: 32px;
      line-height: 1.5;
    }

    /* Label + Dropdown */
    .dropdown-group { margin-bottom: 18px; }
    .dropdown-label {
      font-size: 13px; font-weight: 600;
      color: var(--gray-dark); margin-bottom: 6px;
    }
    .dropdown-select {
      width: 100%; padding: 15px 16px;
      border: 1.5px solid var(--border);
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 500;
      color: var(--black); background: var(--white);
      appearance: none; -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 16px center;
      background-size: 18px;
      cursor: pointer; outline: none;
    }
    .dropdown-select:focus { border-color: var(--orange); }

    /* Spacer */
    .flex-spacer { flex: 1; }

    /* ── TOAST ── */
    #ob-toast {
      position: fixed; bottom: calc(var(--sab) + 80px);
      left: 50%; transform: translateX(-50%) translateY(20px);
      background: #333; color: #fff;
      padding: 10px 20px; border-radius: 100px;
      font-size: 13px; font-weight: 600;
      opacity: 0; transition: opacity 0.3s, transform 0.3s;
      z-index: 9999; pointer-events: none; white-space: nowrap;
    }
    #ob-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* ── LOADING OVERLAY ── */
    #ob-loading {
      position: fixed; inset: 0; background: rgba(255,255,255,0.85);
      display: none; align-items: center; justify-content: center;
      flex-direction: column; gap: 14px; z-index: 9999;
    }
    #ob-loading.show { display: flex; }
    .ob-spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,109,0,0.2);
      border-top-color: var(--orange);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ob-loading-text {
      font-size: 14px; font-weight: 600; color: var(--gray-dark);
    }

    /* Animações de transição */
    @keyframes fadeIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
    .screen-white.active { animation: fadeIn 0.28s ease; }
  </style>
</head>
<body>

<div id="ob-root">

  <!-- ═══════════════════════════════════════
       TELA 1: SPLASH / ABERTURA
  ═══════════════════════════════════════ -->
  <div id="screen-splash">
    <div id="splash-bg"></div>
    <div id="splash-content">
      <div id="splash-logo-wrap">
        <!-- Ícone: bomba + pin laranja -->
        <svg class="splash-icon" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="44" cy="44" r="44" fill="rgba(255,109,0,0.15)"/>
          <!-- Pin base -->
          <path d="M44 16C33.5 16 25 24.5 25 35C25 49 44 68 44 68C44 68 63 49 63 35C63 24.5 54.5 16 44 16Z" fill="#FF6D00"/>
          <!-- Bomba de combustível dentro do pin -->
          <rect x="36" y="26" width="16" height="20" rx="2" fill="white" opacity="0.9"/>
          <rect x="38" y="28" width="12" height="8" rx="1" fill="#FF6D00" opacity="0.4"/>
          <rect x="51" y="30" width="4" height="10" rx="1" fill="white" opacity="0.9"/>
          <rect x="53" y="28" width="2" height="4" rx="1" fill="white" opacity="0.9"/>
          <!-- Círculo branco no centro do pin -->
          <circle cx="44" cy="46" r="5" fill="white"/>
        </svg>

        <h1 id="splash-brand">
          <span class="rota">Rota</span><span class="posto">Posto</span>
        </h1>
        <p id="splash-sub">O caminho mais inteligente<br/>para economizar combustível</p>
      </div>

      <button class="btn-splash-primary" onclick="goToScreen('welcome')">Começar</button>
      <button class="btn-splash-ghost" onclick="goToScreen('login')">Já tenho conta</button>
    </div>
  </div>

  <!-- ═══════════════════════════════════════
       TELA 2: BOAS-VINDAS
  ═══════════════════════════════════════ -->
  <div id="screen-welcome" class="screen-white">
    <div id="welcome-illustration">
      <div class="fuel-illustration">
        <div class="fuel-circle-bg">
          <!-- Silhueta de cidade -->
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" style="position:absolute;opacity:0.15">
            <rect x="20" y="140" width="20" height="60" fill="#888"/>
            <rect x="15" y="120" width="30" height="20" fill="#888"/>
            <rect x="50" y="100" width="25" height="100" fill="#888"/>
            <rect x="80" y="130" width="20" height="70" fill="#888"/>
            <rect x="75" y="110" width="30" height="20" fill="#888"/>
            <rect x="105" y="90" width="30" height="110" fill="#888"/>
            <rect x="140" y="120" width="25" height="80" fill="#888"/>
            <rect x="165" y="100" width="20" height="100" fill="#888"/>
          </svg>

          <!-- Bomba de gasolina 3D em SVG -->
          <svg class="fuel-pump-img" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Corpo principal -->
            <rect x="25" y="35" width="60" height="85" rx="6" fill="#FF6D00"/>
            <!-- Painel frontal -->
            <rect x="32" y="45" width="46" height="35" rx="4" fill="#E55A00"/>
            <!-- Tela digital -->
            <rect x="36" y="48" width="38" height="20" rx="3" fill="#1A1A2E"/>
            <text x="55" y="62" fill="#00FF88" font-size="9" font-weight="700" text-anchor="middle" font-family="monospace">R$ 5,67</text>
            <!-- Mangueira -->
            <path d="M85 55 Q100 50 105 65 Q108 75 100 80 L95 82" stroke="#333" stroke-width="5" stroke-linecap="round" fill="none"/>
            <!-- Bico -->
            <rect x="88" y="78" width="14" height="8" rx="3" fill="#555" transform="rotate(-30 88 78)"/>
            <!-- Base -->
            <rect x="20" y="118" width="70" height="8" rx="3" fill="#E55A00"/>
            <!-- Gota -->
            <path d="M96 88 Q98 93 96 97 Q94 93 96 88Z" fill="#FFB800"/>
          </svg>
        </div>
      </div>
    </div>

    <div id="welcome-bottom">
      <h2 id="welcome-title">Bem-vindo ao<br/><span class="rota" style="color:var(--black)">Rota</span><span class="highlight">Posto!</span></h2>
      <p id="welcome-sub">Encontre os melhores preços,<br/>compare, economize e chegue mais longe.</p>

      <div class="dots-row">
        <div class="dot active"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>

      <button class="btn-primary" onclick="goToScreen('location')">Continuar</button>
      <button class="btn-ghost" onclick="goToScreen('login')">Pular</button>
    </div>
  </div>

  <!-- ═══════════════════════════════════════
       TELA 3: PERMISSÃO DE LOCALIZAÇÃO
  ═══════════════════════════════════════ -->
  <div id="screen-location" class="screen-white">
    <div id="location-illustration">
      <div class="location-map-wrap">
        <!-- Mapa de fundo circular -->
        <div class="location-map-bg">
          <svg width="260" height="260" viewBox="0 0 260 260" fill="none">
            <!-- Blocos de quarteirão -->
            <rect x="0" y="0" width="260" height="260" fill="#E8F4FD"/>
            <!-- Ruas horizontais -->
            <rect x="0" y="70" width="260" height="10" fill="white"/>
            <rect x="0" y="130" width="260" height="10" fill="white"/>
            <rect x="0" y="195" width="260" height="10" fill="white"/>
            <!-- Ruas verticais -->
            <rect x="60" y="0" width="10" height="260" fill="white"/>
            <rect x="130" y="0" width="10" height="260" fill="white"/>
            <rect x="200" y="0" width="10" height="260" fill="white"/>
            <!-- Quarteirões azul claro -->
            <rect x="10" y="10" width="45" height="55" rx="4" fill="#D4E9F7"/>
            <rect x="75" y="10" width="50" height="55" rx="4" fill="#C8E4F4"/>
            <rect x="145" y="10" width="50" height="55" rx="4" fill="#D4E9F7"/>
            <rect x="10" y="85" width="45" height="40" rx="4" fill="#C8E4F4"/>
            <rect x="75" y="85" width="50" height="40" rx="4" fill="#D4E9F7"/>
            <rect x="145" y="85" width="50" height="40" rx="4" fill="#C8E4F4"/>
            <rect x="10" y="145" width="45" height="45" rx="4" fill="#D4E9F7"/>
            <rect x="75" y="145" width="50" height="45" rx="4" fill="#C8E4F4"/>
            <rect x="145" y="145" width="50" height="45" rx="4" fill="#D4E9F7"/>
          </svg>
        </div>

        <!-- Círculo radar azul -->
        <div class="location-radar"></div>

        <!-- Pin laranja grande -->
        <div class="location-pin">
          <svg width="52" height="66" viewBox="0 0 52 66" fill="none">
            <path d="M26 0C11.64 0 0 11.64 0 26C0 45.5 26 66 26 66C26 66 52 45.5 52 26C52 11.64 40.36 0 26 0Z" fill="#FF6D00"/>
            <circle cx="26" cy="26" r="11" fill="white"/>
          </svg>
        </div>

        <!-- Ponto azul do usuário (fora do pin) -->
        <div class="user-dot"></div>
      </div>
    </div>

    <div id="location-bottom">
      <h2 id="location-title">Permitir acesso à<br/>sua localização</h2>
      <p id="location-sub">Para encontrarmos os melhores<br/>postos próximos a você.</p>

      <button class="btn-primary" onclick="requestLocation()">Permitir localização</button>
      <button class="btn-ghost" onclick="goToScreen('login')">Agora não</button>
    </div>
  </div>

  <!-- ═══════════════════════════════════════
       TELA 4: LOGIN / CADASTRO
  ═══════════════════════════════════════ -->
  <div id="screen-login" class="screen-white">
    <div id="login-logo"><span class="rota">Rota</span><span class="posto">Posto</span></div>

    <h2 id="login-title">Entrar ou criar<br/>sua conta</h2>
    <p id="login-sub">É rápido, fácil e seguro.</p>

    <!-- Google -->
    <button class="btn-social" id="btn-google-login" onclick="loginGoogle()">
      <svg class="google-g" viewBox="0 0 20 20"><path d="M19.6 10.23c0-.68-.06-1.36-.17-2H10v3.79h5.4a4.61 4.61 0 01-2 3.03v2.51h3.23c1.89-1.74 2.97-4.3 2.97-7.33z" fill="#4285F4"/><path d="M10 20c2.7 0 4.97-.89 6.63-2.44l-3.23-2.51c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H1.06v2.6A10 10 0 0010 20z" fill="#34A853"/><path d="M4.39 11.88A6.01 6.01 0 014.1 10c0-.65.11-1.28.29-1.88V5.52H1.06A10 10 0 000 10c0 1.61.39 3.14 1.06 4.48l3.33-2.6z" fill="#FBBC05"/><path d="M10 3.96c1.47 0 2.79.51 3.83 1.5l2.86-2.86C14.96.99 12.7 0 10 0A10 10 0 001.06 5.52l3.33 2.6C5.18 5.72 7.39 3.96 10 3.96z" fill="#EA4335"/></svg>
      Continuar com Google
    </button>

    <!-- Facebook -->
    <button class="btn-social" id="btn-facebook-login" onclick="loginFacebook()" style="border-color:#1877F2;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      Continuar com Facebook
    </button>

    <!-- Termos -->
    <p style="font-size:11px;color:#9E9E9E;text-align:center;margin-top:16px;line-height:1.5;">
      Ao entrar, você concorda com nossos<br/>
      <a href="/termos" target="_blank" style="color:#FF6D00;text-decoration:none;">Termos de Uso</a> e
      <a href="/privacidade" target="_blank" style="color:#FF6D00;text-decoration:none;">Política de Privacidade</a>
    </p>
  </div>

  <!-- ═══════════════════════════════════════
       TELA 6: PREFERÊNCIAS DO VEÍCULO
  ═══════════════════════════════════════ -->
  <div id="screen-vehicle" class="screen-white">
    <div class="ob-header">
      <button class="btn-back" onclick="goToScreen('login')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
    </div>
    <div id="vehicle-body">
      <h2 id="vehicle-title">Seu veículo</h2>
      <p id="vehicle-sub">Para calcular sua economia<br/>com mais precisão.</p>

      <!-- Tipo de veículo -->
      <div class="dropdown-group">
        <div class="dropdown-label">Tipo de veículo</div>
        <select class="dropdown-select" id="veh-type">
          <option>SUV / Picape</option>
          <option>Carro de passeio</option>
          <option>Moto</option>
          <option>Caminhão / Van</option>
          <option>Elétrico / Híbrido</option>
        </select>
      </div>

      <!-- Consumo médio -->
      <div class="dropdown-group">
        <div class="dropdown-label">Consumo médio</div>
        <select class="dropdown-select" id="veh-consumption">
          <option>6 km/L</option>
          <option selected>8 km/L</option>
          <option>10 km/L</option>
          <option>12 km/L</option>
          <option>14 km/L</option>
          <option>16 km/L</option>
          <option>18 km/L</option>
          <option>20+ km/L</option>
        </select>
      </div>

      <!-- Capacidade do tanque -->
      <div class="dropdown-group">
        <div class="dropdown-label">Capacidade do tanque</div>
        <select class="dropdown-select" id="veh-tank">
          <option>30 litros</option>
          <option>40 litros</option>
          <option selected>50 litros</option>
          <option>60 litros</option>
          <option>70 litros</option>
          <option>80 litros</option>
          <option>90+ litros</option>
        </select>
      </div>

      <div class="flex-spacer"></div>
      <button class="btn-primary" onclick="saveVehicle()">Continuar</button>
    </div>
  </div>

  <!-- Toast e Loading -->
  <div id="ob-toast"></div>
  <div id="ob-loading">
    <div class="ob-spinner"></div>
    <p class="ob-loading-text">Aguarde...</p>
  </div>

</div><!-- #ob-root -->

<script>
  // ── Estado ──
  let currentScreen = 'splash';

  // ── Navegação ──
  function goToScreen(id) {
    // Ocultar todas
    document.querySelectorAll('.screen-white').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-splash').style.display = 'none';

    if (id === 'splash') {
      document.getElementById('screen-splash').style.display = 'flex';
    } else {
      const el = document.getElementById('screen-' + id);
      if (el) el.classList.add('active');
    }
    currentScreen = id;
  }

  // ── Toast ──
  function showToast(msg, duration = 2500) {
    const t = document.getElementById('ob-toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  }

  // ── Loading ──
  function showLoading(show) {
    document.getElementById('ob-loading').classList.toggle('show', show);
  }

  // ── Localização ──
  function requestLocation() {
    if (!navigator.geolocation) {
      showToast('Localização não suportada');
      goToScreen('login');
      return;
    }
    showLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        showLoading(false);
        localStorage.setItem('rp_lat', pos.coords.latitude);
        localStorage.setItem('rp_lng', pos.coords.longitude);
        showToast('Localização obtida! ✓');
        setTimeout(() => goToScreen('login'), 800);
      },
      err => {
        showLoading(false);
        showToast('Localização não permitida');
        goToScreen('login');
      },
      { timeout: 10000 }
    );
  }

  // ══════════════════════════════════════════════════════
  //  AUTH – Google + Facebook (somente social login)
  // ══════════════════════════════════════════════════════

  // Helper: salvar usuário e ir pro app
  // ── Gerar ou recuperar deviceId permanente deste dispositivo ──
  function getDeviceId() {
    var id = localStorage.getItem('rp_device_id');
    if (!id) {
      // Gerar ID único para este dispositivo (persiste mesmo após logout)
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem('rp_device_id', id);
    }
    return id;
  }

  // ── Registrar sessão única no backend ──
  function registrarSessao(uid, callback) {
    var deviceId = getDeviceId();
    fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid, deviceId: deviceId })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.sessionToken) {
        localStorage.setItem('rp_session_token', data.sessionToken);
        localStorage.setItem('rp_session_uid', uid);
      }
      callback();
    })
    .catch(function() {
      // Falha na rede: permitir acesso mesmo assim (não bloquear usuário)
      callback();
    });
  }

  function onLoginSuccess(user) {
    var userData = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Usuário',
      email: user.email || '',
      photo: user.photoURL || '',
      provider: user.providerData?.[0]?.providerId || 'unknown'
    };
    localStorage.setItem('rp_user', JSON.stringify(userData));
    showToast('Bem-vindo, ' + userData.name.split(' ')[0] + '! 👋');

    // Registrar sessão única no servidor antes de redirecionar
    registrarSessao(user.uid, function() {
      // Verificar veículo: primeiro localStorage (rápido), depois servidor (confiável)
      var vehicleLocal = localStorage.getItem('rp_vehicle');
      if (vehicleLocal) {
        // Tem local — sincroniza com servidor em background e vai pro app
        _sincVeiculoServidor(user.uid, vehicleLocal);
        setTimeout(function() { window.location.href = '/app'; }, 600);
        return;
      }
      // Não tem local — consultar servidor (outro dispositivo pode ter salvo)
      fetch('/api/usuario/veiculo/' + user.uid)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.veiculo) {
            // Restaurar do servidor para o localStorage
            localStorage.setItem('rp_vehicle', JSON.stringify(data.veiculo));
            setTimeout(function() { window.location.href = '/app'; }, 300);
          } else {
            // Primeiro acesso — pedir cadastro de veículo
            goToScreen('vehicle');
          }
        })
        .catch(function() {
          // Falha de rede — pede veículo mesmo assim
          goToScreen('vehicle');
        });
    });
  }

  // ── Helper: detectar ambiente que nao suporta popup (WebView, apps sociais) ──
  function usarRedirect() {
    var ua = navigator.userAgent || '';
    var isWebView = /wv|WebView/i.test(ua);
    var isSocialApp = /FBAN|FBAV|Instagram|Twitter|Line|MicroMessenger/i.test(ua);
    var isStandalone = window.navigator.standalone === true;
    return isWebView || isSocialApp || isStandalone;
  }

  // ── Helper: aguardar Firebase estar pronto (retry até 5s) ──
  function aguardarFirebase(callback, tentativa) {
    tentativa = tentativa || 0;
    if (window._fbSignInWithPopup && window._fbAuth) {
      callback();
    } else if (tentativa < 25) {
      setTimeout(function() { aguardarFirebase(callback, tentativa + 1); }, 200);
    } else {
      showLoading(false);
      showToast('Firebase nao carregou. Verifique sua conexao.');
    }
  }

  // ── Helper: login via redirect (mobile/webview) ──
  function loginComRedirect(provider) {
    if (!window._fbSignInWithRedirect || !window._fbAuth) {
      showToast('Firebase nao carregou. Tente novamente.');
      showLoading(false);
      return;
    }
    window._fbSignInWithRedirect(window._fbAuth, provider)
      .catch(function(err) {
        showLoading(false);
        console.error('[Auth] Erro redirect:', err.code, err.message);
        showToast('Erro ao redirecionar. Tente novamente.');
      });
  }

  // ── Helper: tratar erros de auth ──
  function tratarErroAuth(err, provedor, provider) {
    showLoading(false);
    var code = err.code || '';
    var msg = err.message || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    // Popup invalido ou bloqueado -> tentar redirect automaticamente
    if (code === 'auth/popup-blocked' || code === 'auth/unauthorized-domain' ||
        msg.indexOf('invalid') !== -1 || msg.indexOf('Invalid') !== -1) {
      showToast('Redirecionando para login...');
      setTimeout(function() { if (provider) loginComRedirect(provider); }, 800);
      return;
    }
    if (code === 'auth/account-exists-with-different-credential') {
      showToast('Email ja vinculado ao Google. Use "Continuar com Google".');
      return;
    }
    if (code === 'auth/network-request-failed') {
      showToast('Sem conexao. Verifique sua internet.');
      return;
    }
    console.error('[Auth] Erro ' + provedor + ':', code, msg);
    showToast('Erro ao entrar. Tente novamente.');
  }

  // ── Verificar resultado de redirect ao carregar a pagina ──
  function verificarRedirectResult() {
    if (!window._fbGetRedirectResult || !window._fbAuth) return;
    window._fbGetRedirectResult(window._fbAuth)
      .then(function(result) {
        if (result && result.user) {
          showLoading(false);
          onLoginSuccess(result.user);
        }
      })
      .catch(function(err) {
        if (err && err.code && err.code !== 'auth/no-current-user') {
          console.error('[Auth] Redirect result err:', err.code);
        }
      });
  }
  aguardarFirebase(function() { verificarRedirectResult(); });

  // ── Google Login ──
  function loginGoogle() {
    var btn = document.getElementById('btn-google-login');
    if (btn) btn.disabled = true;
    showLoading(true);

    aguardarFirebase(function() {
      if (usarRedirect()) {
        loginComRedirect(window._fbGoogleProvider);
        return;
      }
      window._fbSignInWithPopup(window._fbAuth, window._fbGoogleProvider)
        .then(function(result) {
          showLoading(false);
          if (result && result.user) { onLoginSuccess(result.user); }
        })
        .catch(function(err) {
          if (btn) btn.disabled = false;
          tratarErroAuth(err, 'Google', window._fbGoogleProvider);
        });
    });
  }

  // ── Facebook Login ──
  function loginFacebook() {
    var btn = document.getElementById('btn-facebook-login');
    if (btn) btn.disabled = true;
    showLoading(true);

    aguardarFirebase(function() {
      if (usarRedirect()) {
        loginComRedirect(window._fbFacebookProvider);
        return;
      }
      window._fbSignInWithPopup(window._fbAuth, window._fbFacebookProvider)
        .then(function(result) {
          showLoading(false);
          if (result && result.user) { onLoginSuccess(result.user); }
        })
        .catch(function(err) {
          if (btn) btn.disabled = false;
          tratarErroAuth(err, 'Facebook', window._fbFacebookProvider);
        });
    });
  }

  // ── Salvar veículo e ir pro app ──
  function saveVehicle() {
    const type = document.getElementById('veh-type').value;
    const consumption = document.getElementById('veh-consumption').value;
    const tank = document.getElementById('veh-tank').value;
    const vehicleData = { type, consumption: parseInt(consumption), tank: parseInt(tank) };
    localStorage.setItem('rp_vehicle', JSON.stringify(vehicleData));

    // Salvar no servidor vinculado ao UID (garante persistência entre dispositivos)
    try {
      var userData = JSON.parse(localStorage.getItem('rp_user') || '{}');
      if (userData.uid) {
        fetch('/api/usuario/veiculo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userData.uid, ...vehicleData })
        }).catch(function() {}); // ignora erro de rede silenciosamente
      }
    } catch(e) {}

    showToast('Tudo pronto! 🚗');
    setTimeout(() => window.location.href = '/app', 600);
  }

  // ── Sincronizar veículo local com servidor (em background) ──
  function _sincVeiculoServidor(uid, vehicleJson) {
    try {
      var v = JSON.parse(vehicleJson);
      fetch('/api/usuario/veiculo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uid, type: v.type, consumption: v.consumption, tank: v.tank })
      }).catch(function() {});
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════
  //  PWA – Banner de instalação + Auto-update
  // ══════════════════════════════════════════════════════

  var _deferredInstallPrompt = null;

  // Capturar evento de instalação do browser
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    _deferredInstallPrompt = e;
    // Só mostrar banner se não está instalado e não dispensou antes
    var dispensado = localStorage.getItem('rp_pwa_dispensado');
    var jaInstalado = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (!dispensado && !jaInstalado) {
      setTimeout(function() { mostrarBannerPWA(); }, 2000);
    }
  });

  function mostrarBannerPWA() {
    if (document.getElementById('pwa-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'pwa-banner';
    banner.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'right:0', 'z-index:99999',
      'background:#fff', 'border-top:1px solid #eee',
      'box-shadow:0 -4px 24px rgba(0,0,0,0.12)',
      'padding:16px 20px', 'display:flex', 'align-items:center',
      'gap:14px', 'animation:slideUp 0.3s ease'
    ].join(';');
    banner.innerHTML = [
      '<img src="/icons/icon-96x96.png" style="width:48px;height:48px;border-radius:12px;flex-shrink:0"/>',
      '<div style="flex:1;min-width:0">',
        '<div style="font-weight:700;font-size:14px;color:#1A1A1A">Adicionar RotaPosto</div>',
        '<div style="font-size:12px;color:#888;margin-top:2px">Acesso rápido direto da tela inicial</div>',
      '</div>',
      '<button onclick="dispensarBannerPWA()" style="background:none;border:none;padding:8px;cursor:pointer;color:#aaa;font-size:20px;line-height:1;flex-shrink:0">✕</button>',
      '<button onclick="instalarPWA()" style="background:#FF6D00;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-weight:700;font-size:14px;cursor:pointer;flex-shrink:0;white-space:nowrap">Instalar</button>'
    ].join('');

    // Animação
    var style = document.createElement('style');
    style.textContent = '@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}';
    document.head.appendChild(style);
    document.body.appendChild(banner);
  }

  function instalarPWA() {
    if (!_deferredInstallPrompt) return;
    _deferredInstallPrompt.prompt();
    _deferredInstallPrompt.userChoice.then(function(result) {
      if (result.outcome === 'accepted') {
        localStorage.setItem('rp_pwa_instalado', '1');
        var banner = document.getElementById('pwa-banner');
        if (banner) banner.remove();
        showToast('RotaPosto instalado! ✓');
      }
      _deferredInstallPrompt = null;
    });
  }

  function dispensarBannerPWA() {
    localStorage.setItem('rp_pwa_dispensado', '1');
    var banner = document.getElementById('pwa-banner');
    if (banner) banner.remove();
  }

  // Quando instalado com sucesso via browser
  window.addEventListener('appinstalled', function() {
    localStorage.setItem('rp_pwa_instalado', '1');
    var banner = document.getElementById('pwa-banner');
    if (banner) banner.remove();
    showToast('RotaPosto instalado com sucesso! ✓');
  });

  // ── Init: verificar se já logado / resultado de redirect ──
  (function init() {
    // Registrar SW v6 com auto-update
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(function(reg) {
        // Checar por atualizações a cada 60 segundos
        setInterval(function() { reg.update(); }, 60000);

        // Quando novo SW estiver esperando → forçar ativação imediata
        reg.addEventListener('updatefound', function() {
          var newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', function() {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // Tem atualização disponível — ativar silenciosamente
              newSW.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch(function() {});

      // Quando SW atualizar e recarregar, recarregar página automaticamente
      navigator.serviceWorker.addEventListener('controllerchange', function() {
        window.location.reload();
      });
    }

    // Se já tem usuário logado → vai direto pro app
    var user = localStorage.getItem('rp_user');
    if (user) {
      try {
        var u = JSON.parse(user);
        if (u.uid) {
          window.location.href = '/app';
          return;
        }
      } catch(e) {}
    }

    // Popup mode: sem redirect, sem listeners de redirect-result
  })();
</script>
</body>
</html>`;
}
