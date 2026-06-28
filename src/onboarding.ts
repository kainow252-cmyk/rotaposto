// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Onboarding Flow (Telas 1-6)
//  Pixel-perfect conforme referências de design
//  Dark theme #0B121E + laranja #FF6D00
// ═══════════════════════════════════════════════════════════════════════

import { GOOGLE_CLIENT_ID, getFirebaseAuthScripts } from './auth'

export function getLandingOnboardingHTML(firebaseScripts: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
  <meta name="theme-color" content="#0B121E"/>
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="RotaPosto"/>
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
    *, *::before, *::after {
      margin: 0; padding: 0; box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    :root {
      --bg:      #0B121E;
      --bg2:     #111827;
      --card:    #151E2D;
      --card2:   #1A2435;
      --border:  rgba(255,255,255,0.08);
      --laranja: #FF6D00;
      --laranja2:#FF8C00;
      --verde:   #22C55E;
      --branco:  #FFFFFF;
      --cinza:   rgba(255,255,255,0.45);
      --cinza2:  rgba(255,255,255,0.25);
      --radius:  16px;
      --radius-sm: 12px;
    }

    html, body {
      width: 100%; height: 100%;
      background: var(--bg);
      font-family: 'Raleway', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
      color: var(--branco);
    }

    /* ── SCREENS ──────────────────────────────────── */
    .screen {
      position: fixed;
      inset: 0;
      display: none;
      flex-direction: column;
      background: var(--bg);
    }
    .screen.active { display: flex; }

    /* ═══════════════════════════════════════════════
       TELA 1: SPLASH
    ═══════════════════════════════════════════════ */
    #screen-splash {
      background: #0B121E;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .splash-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 80% 50% at 50% 80%, rgba(255,109,0,0.18) 0%, transparent 70%),
        radial-gradient(ellipse 60% 40% at 30% 60%, rgba(255,140,0,0.10) 0%, transparent 60%),
        linear-gradient(180deg, #0B121E 0%, #0d1726 50%, #111520 100%);
    }
    /* Silhueta cidade/posto no fundo */
    .splash-cityscape {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 45%;
      background: linear-gradient(180deg, transparent 0%, rgba(255,80,0,0.06) 40%, rgba(0,0,0,0.4) 100%);
      overflow: hidden;
    }
    .splash-cityscape::before {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 60%;
      background: 
        linear-gradient(to top, rgba(255,100,0,0.15), transparent),
        repeating-linear-gradient(
          90deg,
          rgba(255,120,0,0.08) 0px, rgba(255,120,0,0.08) 2px,
          transparent 2px, transparent 40px
        );
    }
    /* Luzes da rua */
    .splash-lights {
      position: absolute;
      bottom: 15%;
      left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(255,140,0,0.3) 15%, rgba(255,200,0,0.6) 20%, rgba(255,200,0,0.6) 22%, rgba(255,140,0,0.3) 27%,
        transparent 30%, transparent 35%,
        rgba(255,140,0,0.3) 45%, rgba(255,200,0,0.6) 50%, rgba(255,200,0,0.6) 52%, rgba(255,140,0,0.3) 57%,
        transparent 60%, transparent 65%,
        rgba(255,140,0,0.3) 73%, rgba(255,200,0,0.6) 78%, rgba(255,200,0,0.6) 80%, rgba(255,140,0,0.3) 85%,
        transparent 100%
      );
      box-shadow: 0 0 20px rgba(255,180,0,0.3);
    }
    .splash-content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      margin-top: -60px;
    }
    .splash-icon-wrap {
      width: 96px; height: 96px;
      position: relative;
    }
    .splash-icon-ring {
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 2px solid rgba(255,109,0,0.25);
      animation: pulse-ring 2s ease-in-out infinite;
    }
    .splash-icon-ring2 {
      position: absolute;
      inset: -18px;
      border-radius: 50%;
      border: 1px solid rgba(255,109,0,0.12);
      animation: pulse-ring 2s ease-in-out 0.5s infinite;
    }
    @keyframes pulse-ring {
      0%, 100% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.05); opacity: 1; }
    }
    .splash-icon-bg {
      width: 96px; height: 96px;
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      border-radius: 28px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 32px rgba(255,109,0,0.45);
    }
    /* Pin SVG estilizado */
    .splash-pin {
      width: 52px; height: 52px;
      fill: none;
      stroke: none;
    }
    .splash-logo {
      text-align: center;
    }
    .splash-logo-text {
      font-size: 38px;
      font-weight: 900;
      color: var(--branco);
      letter-spacing: -1px;
      line-height: 1;
    }
    .splash-logo-text span { color: var(--laranja); }
    .splash-tagline {
      font-size: 14px;
      font-weight: 500;
      color: var(--cinza);
      text-align: center;
      line-height: 1.5;
      margin-top: 6px;
    }
    .splash-spinner {
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      width: 28px; height: 28px;
      border: 2px solid rgba(255,109,0,0.2);
      border-top-color: var(--laranja);
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
    }
    @keyframes spin { to { transform: translateX(-50%) rotate(360deg); } }

    /* ═══════════════════════════════════════════════
       TELA 2: BOAS-VINDAS (Onboarding carousel)
    ═══════════════════════════════════════════════ */
    #screen-welcome {
      justify-content: space-between;
    }
    .welcome-top {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px 20px;
      gap: 32px;
    }
    .welcome-illustration {
      width: 220px; height: 220px;
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    /* Glow atrás da ilustração */
    .welcome-illustration::before {
      content: '';
      position: absolute;
      width: 180px; height: 180px;
      background: radial-gradient(circle, rgba(255,109,0,0.25) 0%, transparent 70%);
      border-radius: 50%;
    }
    /* Bomba de combustível SVG/emoji estilizada */
    .fuel-pump-wrap {
      position: relative;
      z-index: 1;
    }
    .fuel-pump-body {
      width: 100px; height: 140px;
      background: linear-gradient(160deg, #FF6D00, #CC5000);
      border-radius: 16px 16px 12px 12px;
      position: relative;
      box-shadow: 0 12px 40px rgba(255,109,0,0.4), inset 0 2px 0 rgba(255,255,255,0.15);
    }
    .fuel-pump-screen {
      position: absolute;
      top: 14px; left: 12px; right: 12px;
      height: 36px;
      background: rgba(0,0,0,0.5);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800;
      color: #22C55E;
      letter-spacing: 1px;
    }
    .fuel-pump-logo {
      position: absolute;
      bottom: 16px; left: 50%;
      transform: translateX(-50%);
      font-size: 22px;
    }
    .fuel-pump-hose {
      position: absolute;
      right: -28px; top: 20px;
      width: 28px; height: 60px;
      border: 5px solid #CC5000;
      border-left: none;
      border-radius: 0 12px 12px 0;
    }
    .fuel-pump-nozzle {
      position: absolute;
      right: -42px; bottom: -8px;
      width: 20px; height: 28px;
      background: #CC5000;
      border-radius: 4px 4px 10px 10px;
    }
    .fuel-drop {
      position: absolute;
      right: -46px; bottom: -28px;
      width: 12px; height: 18px;
      background: linear-gradient(180deg, #FFD700, #FF8C00);
      border-radius: 50% 50% 60% 60% / 40% 40% 60% 60%;
      animation: drip 2s ease-in-out infinite;
    }
    @keyframes drip {
      0%, 100% { transform: translateY(0) scaleY(1); opacity: 1; }
      50% { transform: translateY(4px) scaleY(1.1); opacity: 0.8; }
    }
    .welcome-text {
      text-align: center;
    }
    .welcome-logo-row {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-bottom: 8px;
    }
    .welcome-logo-icon {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
    }
    .welcome-logo-name {
      font-size: 22px; font-weight: 900; color: var(--branco); letter-spacing: -0.5px;
    }
    .welcome-logo-name span { color: var(--laranja); }
    .welcome-title {
      font-size: 26px; font-weight: 800;
      color: var(--branco);
      line-height: 1.25;
      margin-bottom: 12px;
    }
    .welcome-desc {
      font-size: 15px; font-weight: 500;
      color: var(--cinza);
      line-height: 1.6;
    }
    /* Dots do carrossel */
    .carousel-dots {
      display: flex; gap: 6px;
      justify-content: center;
    }
    .dot {
      width: 8px; height: 8px;
      border-radius: 4px;
      background: rgba(255,255,255,0.2);
      transition: all 0.3s;
    }
    .dot.active {
      width: 24px;
      background: var(--laranja);
    }
    .welcome-bottom {
      padding: 16px 24px 40px;
      display: flex; flex-direction: column; gap: 12px;
    }

    /* ═══════════════════════════════════════════════
       TELA 3: PERMISSÃO DE LOCALIZAÇÃO
    ═══════════════════════════════════════════════ */
    #screen-location {
      position: relative;
      overflow: hidden;
    }
    .location-map-bg {
      position: absolute;
      inset: 0;
      background: #111827;
      overflow: hidden;
    }
    /* Grade do mapa */
    .location-map-bg::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    /* Ruas do mapa */
    .location-map-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(45deg, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0 / 80px 80px,
        linear-gradient(-45deg, rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 120px 80px,
        linear-gradient(rgba(255,255,255,0.06) 2px, transparent 2px) 0 0 / 80px 200px,
        linear-gradient(90deg, rgba(255,255,255,0.06) 2px, transparent 2px) 0 0 / 200px 80px;
    }
    .location-map-glow {
      position: absolute;
      top: 30%; left: 50%;
      transform: translate(-50%, -50%);
      width: 200px; height: 200px;
      background: radial-gradient(circle, rgba(255,109,0,0.15) 0%, transparent 70%);
      border-radius: 50%;
    }
    /* Pin de localização */
    .location-pin-wrap {
      position: absolute;
      top: 32%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .location-pin {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 8px 24px rgba(255,109,0,0.5);
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    .location-pin::after {
      content: '';
      width: 18px; height: 18px;
      background: white;
      border-radius: 50%;
    }
    .location-pin-shadow {
      width: 20px; height: 6px;
      background: rgba(255,109,0,0.3);
      border-radius: 50%;
      margin-top: 4px;
      filter: blur(3px);
    }
    /* Ponto azul (usuário) */
    .location-user-dot {
      position: absolute;
      top: 42%; left: 45%;
      width: 18px; height: 18px;
      background: #3B82F6;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 0 6px rgba(59,130,246,0.2);
      z-index: 10;
    }
    /* Card bottom */
    .location-card {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      background: var(--card);
      border-radius: 28px 28px 0 0;
      padding: 28px 24px 48px;
      z-index: 20;
    }
    .location-card-handle {
      width: 40px; height: 4px;
      background: rgba(255,255,255,0.15);
      border-radius: 2px;
      margin: 0 auto 24px;
    }
    .location-card-title {
      font-size: 24px; font-weight: 800;
      color: var(--branco);
      text-align: center;
      line-height: 1.3;
      margin-bottom: 10px;
    }
    .location-card-desc {
      font-size: 14px; font-weight: 500;
      color: var(--cinza);
      text-align: center;
      line-height: 1.6;
      margin-bottom: 28px;
    }

    /* ═══════════════════════════════════════════════
       TELA 4: LOGIN / CADASTRO
    ═══════════════════════════════════════════════ */
    #screen-login {
      overflow-y: auto;
    }
    .login-top {
      padding: 60px 24px 24px;
      text-align: center;
    }
    .login-logo {
      font-size: 26px; font-weight: 900;
      color: var(--branco); letter-spacing: -0.5px;
      margin-bottom: 6px;
    }
    .login-logo span { color: var(--laranja); }
    .login-subtitle {
      font-size: 15px; font-weight: 500;
      color: var(--cinza);
    }
    .login-body {
      padding: 0 24px 40px;
      display: flex; flex-direction: column; gap: 12px;
    }
    /* Botões sociais */
    .social-btn {
      width: 100%; height: 52px;
      background: var(--branco);
      border: none; border-radius: 14px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      font-family: 'Raleway', sans-serif;
      font-size: 15px; font-weight: 700;
      color: #1a1a1a;
      cursor: pointer;
      transition: all 0.15s;
    }
    .social-btn:active { transform: scale(0.98); opacity: 0.9; }
    .social-btn.apple { background: #1C1C1E; color: var(--branco); }
    .social-btn-icon {
      width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
    }
    /* Divider */
    .divider {
      display: flex; align-items: center; gap: 12px;
      color: var(--cinza2);
      font-size: 13px; font-weight: 600;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }
    /* Inputs */
    .input-group {
      position: relative;
    }
    .input-icon {
      position: absolute;
      left: 16px; top: 50%;
      transform: translateY(-50%);
      color: var(--cinza2);
      font-size: 16px;
    }
    .auth-input {
      width: 100%; height: 52px;
      background: var(--card);
      border: 1.5px solid var(--border);
      border-radius: 14px;
      padding: 0 16px 0 44px;
      color: var(--branco);
      font-family: 'Raleway', sans-serif;
      font-size: 15px; font-weight: 500;
      outline: none;
      transition: border-color 0.2s;
    }
    .auth-input::placeholder { color: var(--cinza2); }
    .auth-input:focus { border-color: var(--laranja); }
    .input-eye {
      position: absolute;
      right: 16px; top: 50%;
      transform: translateY(-50%);
      color: var(--cinza2);
      font-size: 16px;
      cursor: pointer;
    }
    .forgot-link {
      text-align: center;
      font-size: 13px; font-weight: 600;
      color: var(--laranja);
      cursor: pointer;
      text-decoration: none;
    }
    .login-footer {
      text-align: center;
      font-size: 13px; font-weight: 500;
      color: var(--cinza);
    }
    .login-footer a {
      color: var(--laranja);
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }

    /* ═══════════════════════════════════════════════
       TELA 5: CADASTRO RÁPIDO
    ═══════════════════════════════════════════════ */
    #screen-register {
      overflow-y: auto;
    }
    .register-header {
      padding: 56px 24px 8px;
      display: flex; align-items: center; gap: 12px;
    }
    .back-btn {
      width: 40px; height: 40px;
      background: var(--card);
      border: none; border-radius: 12px;
      color: var(--branco);
      font-size: 18px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s;
    }
    .back-btn:active { background: var(--card2); }
    .register-title {
      font-size: 26px; font-weight: 800;
      color: var(--branco);
      line-height: 1.2;
    }
    .register-subtitle {
      font-size: 14px; font-weight: 500;
      color: var(--cinza);
      margin-top: 2px;
    }
    .register-body {
      padding: 20px 24px 40px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .input-full {
      width: 100%; height: 52px;
      background: var(--card);
      border: 1.5px solid var(--border);
      border-radius: 14px;
      padding: 0 16px;
      color: var(--branco);
      font-family: 'Raleway', sans-serif;
      font-size: 15px; font-weight: 500;
      outline: none;
      transition: border-color 0.2s;
    }
    .input-full::placeholder { color: var(--cinza2); }
    .input-full:focus { border-color: var(--laranja); }
    .checkbox-row {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 4px 0;
    }
    .checkbox-custom {
      width: 20px; height: 20px;
      border: 2px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
      flex-shrink: 0;
      margin-top: 1px;
      background: var(--card);
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .checkbox-custom.checked {
      background: var(--laranja);
      border-color: var(--laranja);
    }
    .checkbox-custom.checked::after {
      content: '✓';
      color: white;
      font-size: 13px;
      font-weight: 900;
    }
    .checkbox-label {
      font-size: 13px; font-weight: 500;
      color: var(--cinza);
      line-height: 1.5;
    }
    .checkbox-label a {
      color: var(--laranja);
      font-weight: 700;
      text-decoration: underline;
      cursor: pointer;
    }

    /* ═══════════════════════════════════════════════
       TELA 6: PREFERÊNCIAS DO VEÍCULO
    ═══════════════════════════════════════════════ */
    #screen-vehicle {
      overflow-y: auto;
    }
    .vehicle-header {
      padding: 56px 24px 8px;
      display: flex; align-items: center; gap: 12px;
    }
    .vehicle-title-wrap {}
    .vehicle-title {
      font-size: 26px; font-weight: 800;
      color: var(--branco);
      line-height: 1.2;
    }
    .vehicle-subtitle {
      font-size: 14px; font-weight: 500;
      color: var(--cinza);
      margin-top: 4px;
      line-height: 1.5;
    }
    .vehicle-body {
      padding: 24px 24px 40px;
      display: flex; flex-direction: column; gap: 16px;
    }
    .vehicle-field label {
      display: block;
      font-size: 12px; font-weight: 700;
      color: var(--cinza);
      text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 8px;
    }
    .select-custom {
      width: 100%; height: 52px;
      background: var(--card);
      border: 1.5px solid var(--border);
      border-radius: 14px;
      padding: 0 16px;
      color: var(--branco);
      font-family: 'Raleway', sans-serif;
      font-size: 15px; font-weight: 600;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 16px center;
      transition: border-color 0.2s;
    }
    .select-custom:focus { border-color: var(--laranja); }
    .select-custom option { background: #1A2435; }

    /* ═══════════════════════════════════════════════
       BOTÕES GLOBAIS
    ═══════════════════════════════════════════════ */
    .btn-primary {
      width: 100%; height: 54px;
      background: var(--laranja);
      border: none; border-radius: 16px;
      color: var(--branco);
      font-family: 'Raleway', sans-serif;
      font-size: 16px; font-weight: 800;
      cursor: pointer;
      transition: all 0.15s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-primary:active { transform: scale(0.98); background: var(--laranja2); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      width: 100%; height: 46px;
      background: transparent;
      border: none;
      color: var(--cinza);
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 700;
      cursor: pointer;
      transition: color 0.15s;
    }
    .btn-secondary:active { color: var(--branco); }

    /* ═══════════════════════════════════════════════
       LOADING / TOAST
    ═══════════════════════════════════════════════ */
    .btn-loading {
      display: none;
      width: 20px; height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    #toast-ob {
      position: fixed;
      bottom: 24px; left: 50%;
      transform: translateX(-50%) translateY(80px);
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 12px 20px;
      border-radius: 24px;
      font-size: 13px; font-weight: 600;
      white-space: nowrap;
      z-index: 9999;
      transition: transform 0.3s ease;
      pointer-events: none;
      backdrop-filter: blur(8px);
    }
    #toast-ob.show { transform: translateX(-50%) translateY(0); }

    /* ═══════════════════════════════════════════════
       ERRO AUTH
    ═══════════════════════════════════════════════ */
    .auth-error {
      background: rgba(239,68,68,0.12);
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 13px; font-weight: 600;
      color: #F87171;
      display: none;
    }
    .auth-error.show { display: block; }

  </style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════
     TELA 1: SPLASH
═══════════════════════════════════════════════════════ -->
<section id="screen-splash" class="screen active">
  <div class="splash-bg"></div>
  <div class="splash-cityscape"></div>
  <div class="splash-lights"></div>
  <div class="splash-content">
    <div class="splash-icon-wrap">
      <div class="splash-icon-ring"></div>
      <div class="splash-icon-ring2"></div>
      <div class="splash-icon-bg">
        <!-- Pin com bomba de gasolina -->
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Pin shape -->
          <path d="M26 4C17.716 4 11 10.716 11 19C11 30 26 48 26 48C26 48 41 30 41 19C41 10.716 34.284 4 26 4Z" fill="rgba(0,0,0,0.25)"/>
          <!-- Bomba de gasolina icon inside pin -->
          <g transform="translate(16, 8)">
            <rect x="2" y="2" width="12" height="18" rx="2" fill="white" opacity="0.9"/>
            <rect x="3.5" y="3.5" width="9" height="6" rx="1" fill="rgba(0,0,0,0.3)"/>
            <rect x="5" y="13" width="6" height="2" rx="1" fill="rgba(0,0,0,0.2)"/>
            <rect x="14" y="4" width="4" height="8" rx="1" fill="white" opacity="0.8"/>
            <rect x="14" y="10" width="5" height="4" rx="1" fill="white" opacity="0.7"/>
          </g>
        </svg>
      </div>
    </div>
    <div class="splash-logo">
      <div class="splash-logo-text">Rota<span>Posto</span></div>
      <div class="splash-tagline">O caminho mais inteligente<br>para economizar combustível</div>
    </div>
  </div>
  <div class="splash-spinner"></div>
</section>

<!-- ═══════════════════════════════════════════════════════
     TELA 2: BOAS-VINDAS
═══════════════════════════════════════════════════════ -->
<section id="screen-welcome" class="screen">
  <div class="welcome-top">
    <div class="welcome-illustration">
      <div class="fuel-pump-wrap">
        <div class="fuel-pump-body">
          <div class="fuel-pump-screen">R$ 5,67/L</div>
          <div class="fuel-pump-logo">⛽</div>
          <div class="fuel-pump-hose"></div>
          <div class="fuel-pump-nozzle"></div>
          <div class="fuel-drop"></div>
        </div>
      </div>
    </div>

    <div class="welcome-text">
      <div class="welcome-logo-row">
        <div class="welcome-logo-icon">⛽</div>
        <div class="welcome-logo-name">Rota<span>Posto</span></div>
      </div>
      <div class="welcome-title">Bem-vindo ao<br>RotaPosto</div>
      <div class="welcome-desc">Encontre postos próximos,<br>compare preços e economize<br>em cada abastecimento.</div>
    </div>

    <div class="carousel-dots">
      <div class="dot active"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  </div>

  <div class="welcome-bottom">
    <button class="btn-primary" onclick="irParaLocalizacao()">
      Continuar <i class="fas fa-arrow-right"></i>
    </button>
    <button class="btn-secondary" onclick="irParaLogin()">Pular</button>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════
     TELA 3: PERMISSÃO LOCALIZAÇÃO
═══════════════════════════════════════════════════════ -->
<section id="screen-location" class="screen">
  <div class="location-map-bg"></div>
  <div class="location-map-glow"></div>

  <!-- Pin de localização -->
  <div class="location-pin-wrap">
    <div class="location-pin"></div>
    <div class="location-pin-shadow"></div>
  </div>

  <!-- Ponto azul do usuário -->
  <div class="location-user-dot"></div>

  <!-- Card bottom -->
  <div class="location-card">
    <div class="location-card-handle"></div>
    <div class="location-card-title">Permitir acesso à<br>sua localização</div>
    <div class="location-card-desc">Para encontrar os melhores postos<br>próximos a você.</div>
    <button class="btn-primary" onclick="solicitarLocalizacao()">
      <i class="fas fa-location-arrow"></i> Permitir localização
    </button>
    <div style="height:12px"></div>
    <button class="btn-secondary" onclick="irParaLogin()">Agora não</button>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════
     TELA 4: LOGIN / CADASTRO
═══════════════════════════════════════════════════════ -->
<section id="screen-login" class="screen">
  <div class="login-top">
    <div class="login-logo">Rota<span>Posto</span></div>
    <div class="login-subtitle">Entre ou crie sua conta</div>
  </div>

  <div class="login-body">
    <!-- Google -->
    <button class="social-btn" onclick="loginGoogle()">
      <div class="social-btn-icon">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </div>
      Continuar com Google
    </button>

    <!-- Apple -->
    <button class="social-btn apple" onclick="loginApple()">
      <div class="social-btn-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      </div>
      Continuar com Apple
    </button>

    <div class="divider">ou</div>

    <!-- Email -->
    <div class="input-group">
      <i class="fas fa-user input-icon"></i>
      <input type="email" class="auth-input" id="ob-email" placeholder="E-mail ou telefone" autocomplete="email"/>
    </div>

    <!-- Senha -->
    <div class="input-group">
      <i class="fas fa-lock input-icon"></i>
      <input type="password" class="auth-input" id="ob-senha" placeholder="Senha" autocomplete="current-password"/>
      <i class="fas fa-eye input-eye" id="toggle-senha" onclick="toggleSenha()"></i>
    </div>

    <!-- Erro auth -->
    <div class="auth-error" id="auth-erro-login"></div>

    <a class="forgot-link" onclick="esqueciSenha()">Esqueci minha senha</a>

    <button class="btn-primary" id="btn-entrar" onclick="fazerLogin()">
      <span id="btn-entrar-text">Entrar</span>
      <div class="btn-loading" id="btn-entrar-load"></div>
    </button>

    <div class="login-footer">
      Não tem uma conta? <a onclick="irParaCadastro()">Cadastre-se</a>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════
     TELA 5: CADASTRO RÁPIDO
═══════════════════════════════════════════════════════ -->
<section id="screen-register" class="screen">
  <div class="register-header">
    <button class="back-btn" onclick="voltarParaLogin()">
      <i class="fas fa-arrow-left"></i>
    </button>
    <div>
      <div class="register-title">Vamos criar<br>sua conta</div>
      <div class="register-subtitle">É rápido e fácil!</div>
    </div>
  </div>

  <div class="register-body">
    <input type="text" class="input-full" id="ob-nome" placeholder="Nome completo" autocomplete="name"/>
    <input type="email" class="input-full" id="ob-email-reg" placeholder="E-mail" autocomplete="email"/>
    <input type="tel" class="input-full" id="ob-tel" placeholder="Telefone (opcional)" autocomplete="tel"/>
    <div class="input-group">
      <i class="fas fa-lock input-icon"></i>
      <input type="password" class="auth-input" id="ob-senha-reg" placeholder="Senha (mín. 6 caracteres)" autocomplete="new-password"/>
    </div>

    <!-- Erro auth -->
    <div class="auth-error" id="auth-erro-reg"></div>

    <div class="checkbox-row">
      <div class="checkbox-custom checked" id="checkbox-termos" onclick="toggleTermos()"></div>
      <div class="checkbox-label">
        Eu aceito os <a href="#" onclick="event.preventDefault()">Termos de Uso</a>
        e <a href="#" onclick="event.preventDefault()">Política de Privacidade</a>
      </div>
    </div>

    <button class="btn-primary" id="btn-criar" onclick="criarConta()">
      <span id="btn-criar-text">Criar conta</span>
      <div class="btn-loading" id="btn-criar-load"></div>
    </button>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════
     TELA 6: PREFERÊNCIAS DO VEÍCULO
═══════════════════════════════════════════════════════ -->
<section id="screen-vehicle" class="screen">
  <div class="vehicle-header">
    <button class="back-btn" onclick="voltarParaLogin()">
      <i class="fas fa-arrow-left"></i>
    </button>
    <div class="vehicle-title-wrap">
      <div class="vehicle-title">Seu veículo</div>
      <div class="vehicle-subtitle">Para calcular sua economia<br>com mais precisão.</div>
    </div>
  </div>

  <div class="vehicle-body">
    <div class="vehicle-field">
      <label>Tipo de veículo</label>
      <select class="select-custom" id="veh-tipo">
        <option value="hatch">Hatch</option>
        <option value="sedan">Sedan</option>
        <option value="suv" selected>SUV / Picape</option>
        <option value="moto">Moto</option>
        <option value="comercial">Comercial / Caminhão</option>
      </select>
    </div>

    <div class="vehicle-field">
      <label>Consumo médio</label>
      <select class="select-custom" id="veh-consumo">
        <option value="5">5 km/L</option>
        <option value="6">6 km/L</option>
        <option value="7">7 km/L</option>
        <option value="8" selected>8 km/L</option>
        <option value="10">10 km/L</option>
        <option value="12">12 km/L</option>
        <option value="14">14 km/L</option>
        <option value="15">15 km/L</option>
      </select>
    </div>

    <div class="vehicle-field">
      <label>Capacidade do tanque</label>
      <select class="select-custom" id="veh-tanque">
        <option value="30">30 litros</option>
        <option value="40">40 litros</option>
        <option value="45">45 litros</option>
        <option value="50" selected>50 litros</option>
        <option value="60">60 litros</option>
        <option value="80">80 litros</option>
        <option value="100">100 litros</option>
      </select>
    </div>

    <div style="height: 8px"></div>

    <button class="btn-primary" onclick="salvarVeiculo()">
      Continuar <i class="fas fa-arrow-right"></i>
    </button>

    <button class="btn-secondary" onclick="pularVeiculo()">Pular por enquanto</button>
  </div>
</section>

<!-- TOAST -->
<div id="toast-ob"></div>

<script>
// ═══════════════════════════════════════════════
// NAVEGAÇÃO ENTRE TELAS
// ═══════════════════════════════════════════════
let _obFirebaseAuth = null;
let _obTermosAceitos = true;

function mostrarTela(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// Splash → Welcome (após 2.5s)
setTimeout(() => mostrarTela('screen-welcome'), 2500);

function irParaLocalizacao() {
  mostrarTela('screen-location');
}

function irParaLogin() {
  mostrarTela('screen-login');
}

function irParaCadastro() {
  mostrarTela('screen-register');
}

function voltarParaLogin() {
  mostrarTela('screen-login');
}

function irParaVeiculo() {
  mostrarTela('screen-vehicle');
}

function solicitarLocalizacao() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      () => irParaLogin(),
      () => irParaLogin(),
      { timeout: 8000 }
    );
  } else {
    irParaLogin();
  }
}

// ═══════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════
function toast(msg, dur = 3000) {
  const t = document.getElementById('toast-ob');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

function toggleSenha() {
  const inp = document.getElementById('ob-senha');
  const ico = document.getElementById('toggle-senha');
  if (inp.type === 'password') {
    inp.type = 'text'; ico.className = 'fas fa-eye-slash input-eye';
  } else {
    inp.type = 'password'; ico.className = 'fas fa-eye input-eye';
  }
}

function toggleTermos() {
  _obTermosAceitos = !_obTermosAceitos;
  const cb = document.getElementById('checkbox-termos');
  if (_obTermosAceitos) cb.classList.add('checked');
  else cb.classList.remove('checked');
}

function setBtnLoading(btnId, loadId, loading) {
  const btn = document.getElementById(btnId);
  const txt = document.getElementById(btnId + '-text');
  const load = document.getElementById(loadId);
  btn.disabled = loading;
  txt.style.display = loading ? 'none' : 'inline';
  load.style.display = loading ? 'block' : 'none';
}

function mostrarErroLogin(msg) {
  const el = document.getElementById('auth-erro-login');
  el.textContent = msg;
  el.classList.add('show');
}

function mostrarErroReg(msg) {
  const el = document.getElementById('auth-erro-reg');
  el.textContent = msg;
  el.classList.add('show');
}

function limparErros() {
  document.querySelectorAll('.auth-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
}

function traduzirErroAuth(code) {
  const erros = {
    'auth/user-not-found':     'Conta não encontrada. Verifique o e-mail.',
    'auth/wrong-password':     'Senha incorreta. Tente novamente.',
    'auth/invalid-email':      'E-mail inválido.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password':      'Senha precisa ter pelo menos 6 caracteres.',
    'auth/too-many-requests':  'Muitas tentativas. Aguarde alguns minutos.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
  };
  return erros[code] || 'Erro ao autenticar. Tente novamente.';
}

// ═══════════════════════════════════════════════
// FIREBASE AUTH
// ═══════════════════════════════════════════════
function fazerLogin() {
  limparErros();
  const email = document.getElementById('ob-email').value.trim();
  const senha = document.getElementById('ob-senha').value;
  if (!email || !senha) { mostrarErroLogin('Preencha e-mail e senha.'); return; }
  if (!window._fbSignInWithEmailAndPassword || !_obFirebaseAuth) {
    toast('Autenticação não carregada. Aguarde...');
    return;
  }
  setBtnLoading('btn-entrar', 'btn-entrar-load', true);
  window._fbSignInWithEmailAndPassword(_obFirebaseAuth, email, senha)
    .then(result => {
      window._firebaseUser = result.user;
      salvarUserLocal(result.user);
      window.location.href = '/app';
    })
    .catch(err => {
      setBtnLoading('btn-entrar', 'btn-entrar-load', false);
      mostrarErroLogin(traduzirErroAuth(err.code));
    });
}

function criarConta() {
  limparErros();
  const nome = document.getElementById('ob-nome').value.trim();
  const email = document.getElementById('ob-email-reg').value.trim();
  const senha = document.getElementById('ob-senha-reg').value;
  if (!nome) { mostrarErroReg('Informe seu nome completo.'); return; }
  if (!email) { mostrarErroReg('Informe seu e-mail.'); return; }
  if (senha.length < 6) { mostrarErroReg('Senha precisa ter pelo menos 6 caracteres.'); return; }
  if (!_obTermosAceitos) { mostrarErroReg('Aceite os termos para continuar.'); return; }
  if (!window._fbCreateUserWithEmailAndPassword || !_obFirebaseAuth) {
    toast('Autenticação não carregada. Aguarde...');
    return;
  }
  setBtnLoading('btn-criar', 'btn-criar-load', true);
  window._fbCreateUserWithEmailAndPassword(_obFirebaseAuth, email, senha)
    .then(result => {
      window._firebaseUser = result.user;
      salvarUserLocal(result.user, nome);
      irParaVeiculo();
    })
    .catch(err => {
      setBtnLoading('btn-criar', 'btn-criar-load', false);
      mostrarErroReg(traduzirErroAuth(err.code));
    });
}

function salvarVeiculo() {
  const tipo    = document.getElementById('veh-tipo').value;
  const consumo = document.getElementById('veh-consumo').value;
  const tanque  = document.getElementById('veh-tanque').value;
  localStorage.setItem('rp_veiculo', JSON.stringify({ tipo, consumo, tanque }));
  toast('Preferências salvas!');
  setTimeout(() => window.location.href = '/app', 800);
}

function pularVeiculo() {
  window.location.href = '/app';
}

function salvarUserLocal(user, nome) {
  const data = {
    uid: user.uid,
    email: user.email,
    nome: nome || user.displayName || user.email?.split('@')[0] || 'Usuário',
    foto: user.photoURL || null,
    plano: 'gratuito',
    ultimoLogin: Date.now()
  };
  localStorage.setItem('rp_user', JSON.stringify(data));
}

function loginGoogle() {
  toast('Login com Google em breve...');
}

function loginApple() {
  toast('Login com Apple em breve...');
}

function esqueciSenha() {
  const email = document.getElementById('ob-email').value.trim();
  if (!email) { mostrarErroLogin('Digite seu e-mail primeiro.'); return; }
  if (!window._fbSendPasswordResetEmail || !_obFirebaseAuth) {
    toast('Autenticação não carregada.');
    return;
  }
  window._fbSendPasswordResetEmail(_obFirebaseAuth, email)
    .then(() => toast('E-mail de recuperação enviado! Verifique sua caixa.', 4000))
    .catch(() => toast('Não foi possível enviar. Verifique o e-mail.'));
}

// ═══════════════════════════════════════════════
// FIREBASE INIT
// ═══════════════════════════════════════════════
function initFirebaseOB() {
  if (!window._fbGetAuth || !window._fbFirebaseApp) return;
  try {
    _obFirebaseAuth = window._fbGetAuth(window._fbFirebaseApp);
    window._fbOnAuthStateChanged(_obFirebaseAuth, user => {
      if (user) {
        const tela = document.querySelector('.screen.active')?.id;
        if (tela === 'screen-login' || tela === 'screen-register' ||
            tela === 'screen-splash' || tela === 'screen-welcome' ||
            tela === 'screen-location') {
          salvarUserLocal(user);
          window.location.href = '/app';
        }
      }
    });
  } catch(e) { console.warn('[OB] Firebase init error:', e); }
}

// Tentar init assim que possível
let _fbRetry = 0;
function tryInitFB() {
  if (window._fbGetAuth && window._fbFirebaseApp) {
    initFirebaseOB();
  } else if (_fbRetry++ < 20) {
    setTimeout(tryInitFB, 300);
  }
}
tryInitFB();

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => { reg.update(); })
    .catch(() => {});
}
</script>
</body>
</html>`
}
