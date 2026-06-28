// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – App Principal (Telas 7-11)
//  PWA NATIVO: fullscreen, sem barra de browser, touch nativo
//  Dark theme #0B121E · laranja #FF6D00 · verde #22C55E
// ═══════════════════════════════════════════════════════════════════════

import { GOOGLE_CLIENT_ID, getFirebaseAuthScripts } from './auth'

export function getAppHTML(firebaseScripts: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <!-- FULLSCREEN NATIVO — sem barra de URL, sem controles de browser -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover"/>

  <!-- PWA: comportamento 100% nativo -->
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="RotaPosto"/>
  <meta name="application-name" content="RotaPosto"/>

  <!-- Theme: escurece a status bar do Android -->
  <meta name="theme-color" content="#0B121E" media="(prefers-color-scheme: dark)"/>
  <meta name="theme-color" content="#0B121E"/>
  <meta name="msapplication-TileColor" content="#0B121E"/>
  <meta name="msapplication-navbutton-color" content="#0B121E"/>

  <!-- SEO / OG -->
  <meta name="description" content="Encontre o posto de combustível mais barato perto de você."/>
  <meta property="og:title" content="RotaPosto"/>
  <meta property="og:image" content="/icons/icon-512x512.png"/>
  <meta name="google-signin-client_id" content="${GOOGLE_CLIENT_ID}"/>
  <title>RotaPosto</title>

  <!-- Manifest PWA -->
  <link rel="manifest" href="/manifest.json"/>
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png"/>
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png"/>
  <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png"/>
  <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png"/>
  <!-- Apple splash screens (remove barra de URL no iOS) -->
  <meta name="apple-touch-fullscreen" content="yes"/>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <!-- Firebase -->
  ${firebaseScripts}

  <style>
    /* ══════════════════════════════════════════════════
       RESET ABSOLUTO — zero aparência de website
    ══════════════════════════════════════════════════ */
    *, *::before, *::after {
      margin: 0; padding: 0; box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    /* Permitir seleção só em inputs */
    input, textarea { -webkit-user-select: text; user-select: text; }

    :root {
      --bg:       #0B121E;
      --bg2:      #0F1A2B;
      --card:     #151E2D;
      --card2:    #1A2435;
      --card3:    #1F2D40;
      --border:   rgba(255,255,255,0.07);
      --border2:  rgba(255,255,255,0.13);
      --laranja:  #FF6D00;
      --laranja2: #FF8C00;
      --verde:    #22C55E;
      --azul:     #3B82F6;
      --branco:   #FFFFFF;
      --t1:       rgba(255,255,255,0.90);
      --t2:       rgba(255,255,255,0.55);
      --t3:       rgba(255,255,255,0.25);
      --radius:   16px;
      --radius-sm:12px;

      /* Safe areas (notch / home bar) */
      --sat: env(safe-area-inset-top, 0px);
      --sab: env(safe-area-inset-bottom, 0px);
      --sal: env(safe-area-inset-left, 0px);
      --sar: env(safe-area-inset-right, 0px);

      /* Altura da bottom nav (inclui home bar) */
      --nav-h: calc(60px + var(--sab));
      /* Padding-top das views (inclui notch) */
      --pt: calc(var(--sat) + 12px);
    }

    /* FULLSCREEN REAL: ocupa 100% da tela física */
    html {
      height: 100%;
      height: 100dvh;
      background: var(--bg);
      overflow: hidden;
    }
    body {
      width: 100%;
      height: 100%;
      height: 100dvh;
      background: var(--bg);
      font-family: 'Raleway', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--t1);
      overflow: hidden;
      position: fixed; /* Bloqueia scroll do body — comportamento de app */
      top: 0; left: 0; right: 0; bottom: 0;
      overscroll-behavior: none;
    }

    /* ══════════════════════════════════════════════════
       ESTRUTURA PRINCIPAL: fullscreen stack
    ══════════════════════════════════════════════════ */
    #app-root {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      overflow: hidden;
    }

    /* Área de conteúdo (acima do nav) */
    #app-content {
      flex: 1;
      position: relative;
      overflow: hidden;
      min-height: 0;
    }

    /* ══════════════════════════════════════════════════
       VIEWS — slides que cobrem a tela toda
    ══════════════════════════════════════════════════ */
    .view {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      visibility: hidden;
      pointer-events: none;
      transition: transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.22s;
      transform: translateX(20px);
      opacity: 0;
    }
    .view.active {
      visibility: visible;
      pointer-events: all;
      transform: translateX(0);
      opacity: 1;
    }
    .view.slide-left {
      transform: translateX(-20px);
      opacity: 0;
    }

    /* ══════════════════════════════════════════════════
       BOTTOM NAV — estilo app nativo
    ══════════════════════════════════════════════════ */
    #bottom-nav {
      position: relative;
      z-index: 100;
      background: var(--card);
      border-top: 1px solid var(--border2);
      display: flex;
      flex-shrink: 0;
      height: var(--nav-h);
      padding-bottom: var(--sab);
    }
    .nav-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      border: none;
      background: none;
      color: var(--t3);
      font-family: 'Raleway', sans-serif;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      cursor: pointer;
      padding: 8px 4px 4px;
      transition: color 0.18s;
      -webkit-tap-highlight-color: transparent;
      position: relative;
    }
    .nav-btn i {
      font-size: 22px;
      line-height: 1;
      transition: transform 0.15s, color 0.18s;
    }
    .nav-btn.active {
      color: var(--laranja);
    }
    .nav-btn.active i {
      transform: scale(1.08);
    }
    /* Indicador ativo */
    .nav-btn.active::before {
      content: '';
      position: absolute;
      top: 0; left: 25%; right: 25%;
      height: 2px;
      background: var(--laranja);
      border-radius: 0 0 2px 2px;
    }

    /* ══════════════════════════════════════════════════
       HEADER NATIVO
    ══════════════════════════════════════════════════ */
    .app-header {
      padding-top: var(--pt);
      padding-left: 16px;
      padding-right: 16px;
      padding-bottom: 12px;
      background: var(--bg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      position: relative;
      z-index: 10;
    }
    .header-title {
      font-size: 18px;
      font-weight: 900;
      color: var(--t1);
      letter-spacing: -0.3px;
    }
    .logo-text {
      font-size: 22px;
      font-weight: 900;
      color: var(--t1);
      letter-spacing: -0.5px;
    }
    .logo-text span { color: var(--laranja); }
    .icon-btn {
      width: 38px; height: 38px;
      background: var(--card);
      border: 1px solid var(--border2);
      border-radius: 12px;
      color: var(--t1); font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .icon-btn:active { background: var(--card2); }

    /* ══════════════════════════════════════════════════
       TELA 7: MAPA
    ══════════════════════════════════════════════════ */
    #view-mapa { overflow: hidden; }

    #map-wrap {
      flex: 1;
      position: relative;
      overflow: hidden;
      min-height: 0;
    }
    #leaflet-map {
      position: absolute;
      inset: 0;
      background: #1a2535;
    }

    /* Barra de busca flutuante sobre o mapa */
    .map-search-bar {
      position: absolute;
      top: 12px; left: 12px; right: 12px;
      z-index: 50;
    }
    .map-search-inner {
      display: flex;
      align-items: center;
      background: var(--card);
      border: 1px solid var(--border2);
      border-radius: 14px;
      padding: 0 14px;
      height: 46px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .map-search-inner i { color: var(--t2); margin-right: 10px; font-size: 15px; }
    .map-search-inner input {
      flex: 1; background: none; border: none;
      color: var(--t1); font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 500; outline: none;
    }
    .map-search-inner input::placeholder { color: var(--t2); }

    /* Botão localizar */
    #btn-locate {
      position: absolute;
      right: 12px;
      bottom: calc(var(--card-melhor-h, 160px) + 16px);
      width: 44px; height: 44px;
      background: var(--card);
      border: 1px solid var(--border2);
      border-radius: 50%;
      color: var(--t1); font-size: 18px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      z-index: 50;
      transition: all 0.15s;
    }
    #btn-locate:active { background: var(--card2); transform: scale(0.94); }

    /* Card do melhor posto flutuante */
    #card-melhor {
      position: absolute;
      bottom: 12px; left: 12px; right: 12px;
      background: var(--card);
      border-radius: var(--radius);
      border: 1px solid var(--border2);
      padding: 14px;
      z-index: 50;
      box-shadow: 0 8px 32px rgba(0,0,0,0.55);
      display: none;
    }
    #card-melhor.show { display: block; }

    .card-label {
      font-size: 10px; font-weight: 800;
      color: var(--verde);
      text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: 10px;
      display: flex; align-items: center; gap: 5px;
    }
    .card-body {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 12px;
    }
    .posto-emoji {
      width: 46px; height: 46px;
      background: white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .card-nome { font-size: 16px; font-weight: 800; color: var(--t1); }
    .card-meta { font-size: 12px; font-weight: 500; color: var(--t2); margin-top: 2px; }
    .card-preco { font-size: 22px; font-weight: 900; color: var(--verde); margin-left: auto; flex-shrink: 0; }

    .btn-laranja {
      width: 100%; height: 50px;
      background: var(--laranja);
      border: none; border-radius: 14px;
      color: white; font-family: 'Raleway', sans-serif;
      font-size: 16px; font-weight: 800;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.15s;
      box-shadow: 0 4px 16px rgba(255,109,0,0.35);
      -webkit-tap-highlight-color: transparent;
    }
    .btn-laranja:active { transform: scale(0.97); box-shadow: none; }

    /* ══════════════════════════════════════════════════
       TELA 8: LISTA
    ══════════════════════════════════════════════════ */
    #view-lista { }

    /* Chips de combustível */
    .fuel-row {
      display: flex; gap: 8px;
      padding: 0 16px 12px;
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
    }
    .fuel-row::-webkit-scrollbar { display: none; }
    .fuel-chip {
      height: 34px;
      padding: 0 16px;
      border-radius: 100px;
      border: 1.5px solid var(--border2);
      background: transparent;
      color: var(--t2);
      font-family: 'Raleway', sans-serif;
      font-size: 13px; font-weight: 700;
      cursor: pointer; white-space: nowrap;
      transition: all 0.18s;
      flex-shrink: 0;
    }
    .fuel-chip.active {
      background: var(--laranja);
      border-color: var(--laranja);
      color: white;
    }

    /* Barra de busca da lista */
    .list-search {
      padding: 0 16px 10px;
      flex-shrink: 0;
    }
    .list-search-inner {
      display: flex; align-items: center;
      background: var(--card);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      padding: 0 14px; height: 44px;
    }
    .list-search-inner i { color: var(--t2); margin-right: 10px; }
    .list-search-inner input {
      flex: 1; background: none; border: none;
      color: var(--t1); font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 500; outline: none;
    }
    .list-search-inner input::placeholder { color: var(--t2); }

    /* Scroll da lista */
    #lista-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      padding: 4px 16px 16px;
    }
    #lista-scroll::-webkit-scrollbar { display: none; }

    /* Card de posto */
    .posto-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
      margin-bottom: 10px;
      display: flex; align-items: center; gap: 12px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .posto-card:active { background: var(--card2); border-color: var(--border2); }
    .posto-logo {
      width: 46px; height: 46px;
      background: white; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .posto-info { flex: 1; min-width: 0; }
    .posto-nome {
      font-size: 15px; font-weight: 800; color: var(--t1);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .posto-sub {
      display: flex; align-items: center; gap: 6px;
      margin-top: 3px;
    }
    .posto-stars { color: #FBBF24; font-size: 11px; font-weight: 800; }
    .posto-dist { font-size: 11px; font-weight: 500; color: var(--t2); }
    .posto-preco-wrap { text-align: right; flex-shrink: 0; }
    .posto-preco {
      font-size: 18px; font-weight: 900; color: var(--t1);
      white-space: nowrap;
    }
    .posto-preco.best { color: var(--verde); }
    .posto-time { font-size: 11px; font-weight: 500; color: var(--t2); margin-top: 2px; }
    .badge-best {
      display: inline-flex; align-items: center; gap: 3px;
      background: rgba(34,197,94,0.12);
      border: 1px solid rgba(34,197,94,0.25);
      color: var(--verde);
      font-size: 9px; font-weight: 800;
      padding: 2px 7px; border-radius: 100px;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-top: 4px;
    }

    /* ══════════════════════════════════════════════════
       TELA 9: DETALHES DO POSTO
    ══════════════════════════════════════════════════ */
    #view-detalhes { }
    #det-scroll {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }
    #det-scroll::-webkit-scrollbar { display: none; }

    /* Capa do posto */
    .det-capa {
      width: 100%; height: 210px;
      position: relative;
      background: linear-gradient(160deg, #1A2435, #0F1B2D);
      flex-shrink: 0;
      overflow: hidden;
    }
    .det-capa-icon {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 10px;
    }
    .det-capa-icon i { font-size: 56px; color: var(--laranja); opacity: 0.5; }
    .det-capa-overlay {
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 60%;
      background: linear-gradient(transparent, rgba(11,18,30,0.9));
    }
    .det-back {
      position: absolute;
      top: calc(var(--sat) + 10px); left: 14px;
      width: 38px; height: 38px;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: none; border-radius: 10px;
      color: white; font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .det-logo {
      position: absolute;
      bottom: 14px; left: 16px;
      width: 54px; height: 54px;
      background: white; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 30px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    }

    /* Conteúdo detalhes */
    .det-body { padding: 14px 16px; }
    .det-nome { font-size: 22px; font-weight: 900; color: var(--t1); margin-bottom: 4px; }
    .det-end { font-size: 13px; font-weight: 500; color: var(--t2); margin-bottom: 10px; }
    .det-rating-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .stars-row { display: flex; align-items: center; gap: 4px; color: #FBBF24; font-size: 15px; font-weight: 800; }
    .stars-row i { font-size: 14px; }
    .avl-count { font-size: 13px; font-weight: 500; color: var(--t2); }
    .badge-aberto {
      background: rgba(34,197,94,0.15);
      border: 1px solid rgba(34,197,94,0.3);
      color: var(--verde);
      font-size: 11px; font-weight: 800;
      padding: 3px 10px; border-radius: 100px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    /* Card preço principal */
    .preco-card-principal {
      background: rgba(34,197,94,0.10);
      border: 1px solid rgba(34,197,94,0.2);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px; cursor: pointer;
    }
    .pcp-label { font-size: 12px; font-weight: 700; color: var(--t2); margin-bottom: 4px; }
    .pcp-valor { font-size: 28px; font-weight: 900; color: var(--verde); line-height: 1; }
    .pcp-unit { font-size: 14px; font-weight: 600; color: var(--t2); }
    .pcp-arrow { color: var(--verde); font-size: 18px; }

    /* Tabela outros combustíveis */
    .outros-precos {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      margin-bottom: 16px;
    }
    .preco-linha {
      display: flex; align-items: center; justify-content: space-between;
      padding: 13px 16px;
      border-bottom: 1px solid var(--border);
    }
    .preco-linha:last-child { border-bottom: none; }
    .pl-label { font-size: 14px; font-weight: 600; color: var(--t2); }
    .pl-valor { font-size: 15px; font-weight: 800; color: var(--t1); }

    /* Botões de ação detalhes */
    .det-actions {
      display: flex; gap: 10px;
      margin-bottom: 16px;
    }
    .btn-outline {
      flex: 1; height: 48px;
      background: transparent;
      border: 2px solid var(--laranja);
      border-radius: 14px;
      color: var(--laranja);
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 800;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: all 0.15s;
    }
    .btn-outline:active { background: rgba(255,109,0,0.1); transform: scale(0.97); }
    .btn-solid {
      flex: 1; height: 48px;
      background: var(--laranja);
      border: none; border-radius: 14px;
      color: white;
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 800;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: all 0.15s;
    }
    .btn-solid:active { transform: scale(0.97); }

    /* Review */
    .reviews-section { }
    .sec-title {
      font-size: 16px; font-weight: 800; color: var(--t1);
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }
    .sec-link { font-size: 13px; font-weight: 700; color: var(--laranja); cursor: pointer; }
    .review-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 14px;
    }
    .rv-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
    }
    .rv-avatar {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 900; color: white; flex-shrink: 0;
    }
    .rv-nome { font-size: 14px; font-weight: 800; color: var(--t1); }
    .rv-data { font-size: 12px; font-weight: 500; color: var(--t2); }
    .rv-stars { margin-left: auto; color: #FBBF24; display: flex; gap: 2px; }
    .rv-stars i { font-size: 13px; }
    .rv-texto { font-size: 13px; font-weight: 500; color: var(--t2); line-height: 1.5; }

    /* ══════════════════════════════════════════════════
       TELA 10: PLANEJAR ROTA
    ══════════════════════════════════════════════════ */
    #view-planejar { overflow: hidden; }

    .planejar-header {
      padding-top: var(--pt);
      padding: calc(var(--pt)) 16px 14px;
      background: var(--bg);
      flex-shrink: 0;
      border-bottom: 1px solid var(--border);
    }
    .ph-row {
      display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
    }
    .ph-title { font-size: 18px; font-weight: 800; color: var(--t1); }

    /* Inputs de origem/destino */
    .rota-form { display: flex; flex-direction: column; gap: 8px; }
    .rota-row { display: flex; align-items: center; gap: 12px; }
    .rota-dot {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
    }
    .rota-dot.origin { background: #4ADE80; }
    .rota-dot.dest { background: #EF4444; }
    .rota-linha-v {
      width: 2px; height: 18px; background: var(--border2);
      margin: 0 5px; flex-shrink: 0;
    }
    .rota-input {
      flex: 1; height: 44px;
      background: var(--card);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      padding: 0 14px;
      color: var(--t1);
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 500; outline: none;
    }
    .rota-input::placeholder { color: var(--t2); }
    .rota-input:focus { border-color: var(--laranja); }

    /* Mapa da rota */
    #rota-map-wrap {
      flex: 1; position: relative; overflow: hidden; min-height: 0;
    }
    #rota-map { position: absolute; inset: 0; background: #1a2535; }

    /* Card resumo rota */
    .rota-resumo {
      position: absolute;
      top: 14px; left: 14px; right: 14px;
      background: var(--card);
      border: 1px solid var(--border2);
      border-radius: var(--radius-sm);
      padding: 14px;
      display: none; gap: 20px; align-items: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.45);
      z-index: 50;
    }
    .rota-resumo.show { display: flex; }
    .rr-stat { text-align: center; }
    .rr-val { font-size: 22px; font-weight: 900; color: var(--t1); }
    .rr-label { font-size: 11px; font-weight: 700; color: var(--t2); margin-top: 2px; }
    .rr-div { width: 1px; height: 34px; background: var(--border2); }

    /* Botão iniciar navegação */
    .btn-nav {
      position: absolute;
      bottom: 16px; left: 14px; right: 14px;
      height: 54px;
      background: var(--laranja);
      border: none; border-radius: 16px;
      color: white; font-family: 'Raleway', sans-serif;
      font-size: 16px; font-weight: 800;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(255,109,0,0.4);
      z-index: 50;
      transition: all 0.15s;
    }
    .btn-nav:active { transform: scale(0.97); box-shadow: none; }

    /* ══════════════════════════════════════════════════
       TELA 11: RELATÓRIOS / PERFIL
    ══════════════════════════════════════════════════ */
    #view-perfil { }
    #perfil-scroll {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      padding: 12px 16px 16px;
    }
    #perfil-scroll::-webkit-scrollbar { display: none; }

    /* Tabs período */
    .period-tabs {
      display: flex;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 4px; margin-bottom: 18px;
    }
    .period-tab {
      flex: 1; height: 36px;
      background: transparent; border: none; border-radius: 9px;
      color: var(--t2); font-family: 'Raleway', sans-serif;
      font-size: 13px; font-weight: 700; cursor: pointer;
      transition: all 0.2s;
    }
    .period-tab.active {
      background: var(--card3); color: var(--t1);
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }

    /* Navegação mês */
    .month-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .month-btn {
      width: 34px; height: 34px;
      background: var(--card); border: 1px solid var(--border);
      border-radius: 10px; color: var(--t2); font-size: 14px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .month-btn:active { background: var(--card2); }
    .month-label { font-size: 14px; font-weight: 700; color: var(--t2); }

    /* Card economia */
    .eco-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 22px 16px;
      text-align: center;
      margin-bottom: 14px;
    }
    .eco-label { font-size: 11px; font-weight: 800; color: var(--t2); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
    .eco-valor { font-size: 42px; font-weight: 900; color: var(--verde); line-height: 1; margin-bottom: 6px; }
    .eco-sub { font-size: 12px; font-weight: 500; color: var(--t2); }

    /* Grid stats */
    .stats-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 10px; margin-bottom: 14px;
    }
    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 16px;
    }
    .sc-label { font-size: 11px; font-weight: 700; color: var(--t2); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .sc-val { font-size: 26px; font-weight: 900; color: var(--t1); }

    /* Eco litro */
    .eco-litro-row {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .el-label { font-size: 14px; font-weight: 600; color: var(--t2); }
    .el-val { font-size: 22px; font-weight: 900; color: var(--verde); display: flex; align-items: center; gap: 6px; }

    /* Ranking */
    .ranking-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden; margin-bottom: 14px;
    }
    .ranking-title {
      padding: 14px 16px 10px;
      font-size: 14px; font-weight: 800; color: var(--t1);
      border-bottom: 1px solid var(--border);
    }
    .ranking-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }
    .ranking-row:last-child { border-bottom: none; }
    .rk-logo {
      width: 36px; height: 36px; border-radius: 50%; background: white;
      display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
    }
    .rk-nome { flex: 1; font-size: 14px; font-weight: 700; color: var(--t1); }
    .rk-vez { font-size: 13px; font-weight: 600; color: var(--t2); }

    /* Card perfil usuário */
    .user-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 22px 16px;
      text-align: center; margin-bottom: 14px;
    }
    .user-avatar {
      width: 70px; height: 70px;
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; font-weight: 900; color: white;
      margin: 0 auto 12px;
    }
    .user-nome { font-size: 18px; font-weight: 900; color: var(--t1); margin-bottom: 4px; }
    .user-email { font-size: 13px; font-weight: 500; color: var(--t2); margin-bottom: 14px; }
    .user-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,109,0,0.12);
      border: 1px solid rgba(255,109,0,0.25);
      color: var(--laranja);
      font-size: 12px; font-weight: 800;
      padding: 5px 14px; border-radius: 100px;
      text-transform: uppercase;
    }
    .btn-sair {
      width: 100%; height: 48px;
      background: transparent;
      border: 1.5px solid rgba(239,68,68,0.3);
      border-radius: 14px;
      color: #EF4444;
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 800;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.15s;
    }
    .btn-sair:active { background: rgba(239,68,68,0.08); }

    /* ══════════════════════════════════════════════════
       TOAST NATIVO
    ══════════════════════════════════════════════════ */
    #toast {
      position: fixed;
      bottom: calc(var(--nav-h) + 20px);
      left: 16px; right: 16px;
      background: rgba(20,30,48,0.96);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: var(--t1);
      padding: 13px 18px;
      border-radius: 14px;
      border: 1px solid var(--border2);
      font-size: 14px; font-weight: 600;
      text-align: center;
      z-index: 9999;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      transform: translateY(20px);
      opacity: 0;
      transition: transform 0.25s ease, opacity 0.25s ease;
      pointer-events: none;
    }
    #toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    /* ══════════════════════════════════════════════════
       LOADING SPLASH
    ══════════════════════════════════════════════════ */
    #loading {
      position: fixed; inset: 0;
      background: var(--bg);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 24px; z-index: 9000;
      transition: opacity 0.4s;
    }
    #loading.fade { opacity: 0; pointer-events: none; }
    .loading-logo {
      display: flex; align-items: center; gap: 10px;
    }
    .loading-icon {
      width: 50px; height: 50px;
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      border-radius: 15px;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px;
      box-shadow: 0 8px 24px rgba(255,109,0,0.4);
    }
    .loading-logo-text { font-size: 30px; font-weight: 900; color: var(--t1); }
    .loading-logo-text span { color: var(--laranja); }
    .loading-spinner {
      width: 36px; height: 36px;
      border: 3px solid var(--border2);
      border-top-color: var(--laranja);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .loading-txt { font-size: 13px; font-weight: 600; color: var(--t2); }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ══════════════════════════════════════════════════
       LEAFLET DARK OVERRIDES
    ══════════════════════════════════════════════════ */
    .leaflet-container { background: #1A2535 !important; font-family: 'Raleway', sans-serif !important; }
    .leaflet-tile-pane { filter: brightness(0.88) saturate(0.75); }
    .leaflet-control-zoom { border: 1px solid var(--border2) !important; border-radius: 12px !important; overflow: hidden; }
    .leaflet-control-zoom a { background: var(--card) !important; color: var(--t1) !important; border: none !important; width: 34px !important; height: 34px !important; line-height: 34px !important; font-size: 18px !important; }
    .leaflet-control-zoom a:hover { background: var(--card2) !important; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-popup-content-wrapper { background: var(--card) !important; border: 1px solid var(--border2) !important; border-radius: 12px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important; color: var(--t1) !important; }
    .leaflet-popup-tip { background: var(--card) !important; }

    /* Pin de preço */
    .price-pin {
      background: var(--laranja);
      color: white; font-size: 12px; font-weight: 900;
      padding: 5px 10px; border-radius: 20px;
      white-space: nowrap;
      box-shadow: 0 3px 12px rgba(255,109,0,0.55);
      border: 2px solid rgba(255,255,255,0.2);
      cursor: pointer; position: relative;
    }
    .price-pin::after {
      content: ''; position: absolute;
      bottom: -6px; left: 50%; transform: translateX(-50%);
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid var(--laranja);
    }
    .price-pin.best { background: var(--verde); box-shadow: 0 3px 12px rgba(34,197,94,0.55); }
    .price-pin.best::after { border-top-color: var(--verde); }
  </style>
</head>
<body>

<!-- ══════════════════ LOADING ══════════════════ -->
<div id="loading">
  <div class="loading-logo">
    <div class="loading-icon">⛽</div>
    <div class="loading-logo-text">Rota<span>Posto</span></div>
  </div>
  <div class="loading-spinner"></div>
  <div class="loading-txt">Localizando postos próximos...</div>
</div>

<!-- ══════════════════ APP ROOT ══════════════════ -->
<div id="app-root">

  <!-- ────── ÁREA DE CONTEÚDO ────── -->
  <div id="app-content">

    <!-- ════════════════════════════════════════
         TELA 7: MAPA
    ════════════════════════════════════════ -->
    <section class="view active" id="view-mapa">
      <!-- Header -->
      <div class="app-header">
        <button class="icon-btn" onclick="toggleMenu()"><i class="fas fa-bars"></i></button>
        <div class="logo-text">Rota<span>Posto</span></div>
        <button class="icon-btn" onclick="abrirNotifs()">
          <i class="fas fa-bell"></i>
        </button>
      </div>

      <!-- Mapa -->
      <div id="map-wrap">
        <div id="leaflet-map"></div>

        <!-- Busca flutuante -->
        <div class="map-search-bar">
          <div class="map-search-inner">
            <i class="fas fa-search"></i>
            <input type="text" id="mapa-busca" placeholder="Buscar cidade ou endereço" oninput="debounceBusca(this.value)"/>
          </div>
        </div>

        <!-- Localizar -->
        <button id="btn-locate" onclick="centralizarMapa()">
          <i class="fas fa-location-arrow"></i>
        </button>

        <!-- Card melhor posto -->
        <div id="card-melhor">
          <div class="card-label"><i class="fas fa-star"></i> Melhor posto próximo</div>
          <div class="card-body">
            <div class="posto-emoji" id="cm-emoji">🐚</div>
            <div style="flex:1;min-width:0">
              <div class="card-nome" id="cm-nome">Posto Shell</div>
              <div class="card-meta" id="cm-meta">1,2 km · 3 min · ★ 4,6</div>
            </div>
            <div class="card-preco" id="cm-preco">R$ 5,67</div>
          </div>
          <button class="btn-laranja" onclick="irAteMapa()">
            <i class="fas fa-route"></i> Ir até lá
          </button>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         TELA 8: LISTA DE POSTOS
    ════════════════════════════════════════ -->
    <section class="view" id="view-lista">
      <!-- Header -->
      <div class="app-header">
        <div style="width:38px"></div>
        <div class="logo-text">Rota<span>Posto</span></div>
        <button class="icon-btn" onclick="abrirNotifs()"><i class="fas fa-bell"></i></button>
      </div>

      <!-- Busca -->
      <div class="list-search">
        <div class="list-search-inner">
          <i class="fas fa-search"></i>
          <input type="text" placeholder="Buscar nesta área" oninput="filtrarLista(this.value)"/>
        </div>
      </div>

      <!-- Chips combustível -->
      <div class="fuel-row" id="fuel-tabs">
        <button class="fuel-chip active" onclick="setFuel('gasolina',this)">Gasolina</button>
        <button class="fuel-chip" onclick="setFuel('etanol',this)">Etanol</button>
        <button class="fuel-chip" onclick="setFuel('diesel',this)">Diesel</button>
        <button class="fuel-chip" onclick="setFuel('gnv',this)">GNV</button>
      </div>

      <!-- Lista -->
      <div id="lista-scroll">
        <div style="text-align:center;padding:60px 0;color:var(--t2)">
          <i class="fas fa-spinner fa-spin" style="font-size:28px;margin-bottom:14px;display:block"></i>
          Buscando postos...
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         TELA 9: DETALHES DO POSTO
    ════════════════════════════════════════ -->
    <section class="view" id="view-detalhes">
      <div id="det-scroll">
        <!-- Capa -->
        <div class="det-capa">
          <div class="det-capa-icon">
            <i class="fas fa-gas-pump"></i>
          </div>
          <div class="det-capa-overlay"></div>
          <button class="det-back" onclick="voltarLista()"><i class="fas fa-arrow-left"></i></button>
          <div class="det-logo" id="det-logo">🐚</div>
        </div>

        <!-- Body -->
        <div class="det-body">
          <div class="det-nome" id="det-nome">Posto Shell</div>
          <div class="det-end" id="det-end">Av. Rebouças, 1234 – Pinheiros, SP</div>
          <div class="det-rating-row">
            <div class="stars-row">
              <i class="fas fa-star"></i>
              <span id="det-rating">4,6</span>
            </div>
            <span class="avl-count" id="det-avl">(128 avaliações)</span>
            <span class="badge-aberto">Aberto agora</span>
          </div>

          <!-- Preço destaque -->
          <div class="preco-card-principal">
            <div>
              <div class="pcp-label" id="det-comb">Gasolina Comum</div>
              <div class="pcp-valor" id="det-preco">R$ 5,67 <span class="pcp-unit">/L</span></div>
            </div>
            <i class="fas fa-chevron-right pcp-arrow"></i>
          </div>

          <!-- Outros combustíveis -->
          <div class="outros-precos">
            <div class="preco-linha">
              <span class="pl-label">Etanol</span>
              <span class="pl-valor" id="det-etanol">R$ 3,89</span>
            </div>
            <div class="preco-linha">
              <span class="pl-label">Diesel S10</span>
              <span class="pl-valor" id="det-diesel">R$ 6,19</span>
            </div>
            <div class="preco-linha">
              <span class="pl-label">GNV</span>
              <span class="pl-valor" id="det-gnv">R$ 4,49</span>
            </div>
          </div>

          <!-- Ações -->
          <div class="det-actions">
            <button class="btn-outline" onclick="comoChegar()">
              <i class="fas fa-map-marker-alt"></i> Como chegar
            </button>
            <button class="btn-solid" onclick="irAtePosto()">
              <i class="fas fa-route"></i> Ir até lá
            </button>
          </div>

          <!-- Reviews -->
          <div class="reviews-section">
            <div class="sec-title">
              Avaliações
              <span class="sec-link">Ver todas</span>
            </div>
            <div class="review-card">
              <div class="rv-header">
                <div class="rv-avatar">J</div>
                <div>
                  <div class="rv-nome">João M.</div>
                  <div class="rv-data">Hoje</div>
                </div>
                <div class="rv-stars">
                  <i class="fas fa-star"></i><i class="fas fa-star"></i>
                  <i class="fas fa-star"></i><i class="fas fa-star"></i>
                  <i class="fas fa-star"></i>
                </div>
              </div>
              <div class="rv-texto">Ótimo atendimento e preço justo!</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         TELA 10: PLANEJAR ROTA
    ════════════════════════════════════════ -->
    <section class="view" id="view-planejar">
      <div class="planejar-header">
        <div class="ph-row">
          <button class="icon-btn" onclick="irPara('view-mapa')"><i class="fas fa-arrow-left"></i></button>
          <div class="ph-title">Planejar rota</div>
        </div>
        <div class="rota-form">
          <div class="rota-row">
            <div class="rota-dot origin"></div>
            <input class="rota-input" id="r-origem" placeholder="De: Minha localização" value="Minha localização"/>
          </div>
          <div style="padding-left:5px"><div class="rota-linha-v"></div></div>
          <div class="rota-row">
            <div class="rota-dot dest"></div>
            <input class="rota-input" id="r-destino" placeholder="Para: Posto Shell"/>
          </div>
        </div>
      </div>

      <div id="rota-map-wrap">
        <div id="rota-map"></div>
        <div class="rota-resumo" id="rota-resumo">
          <div class="rr-stat">
            <div class="rr-val" id="r-dist">–</div>
            <div class="rr-label">Distância</div>
          </div>
          <div class="rr-div"></div>
          <div class="rr-stat">
            <div class="rr-val" id="r-tempo">–</div>
            <div class="rr-label">Tempo</div>
          </div>
        </div>
        <button class="btn-nav" onclick="iniciarNav()">
          <i class="fas fa-play"></i> Iniciar navegação
        </button>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         TELA 11: RELATÓRIOS / PERFIL
    ════════════════════════════════════════ -->
    <section class="view" id="view-perfil">
      <div class="app-header">
        <div style="width:38px"></div>
        <div class="header-title">Meus relatórios</div>
        <button class="icon-btn"><i class="fas fa-ellipsis-v"></i></button>
      </div>

      <div id="perfil-scroll">
        <!-- Period tabs -->
        <div class="period-tabs">
          <button class="period-tab" onclick="setPeriodo('semana',this)">Semana</button>
          <button class="period-tab active" onclick="setPeriodo('mes',this)">Mês</button>
          <button class="period-tab" onclick="setPeriodo('ano',this)">Ano</button>
        </div>

        <!-- Mês -->
        <div class="month-row">
          <button class="month-btn" onclick="mesAnterior()"><i class="fas fa-chevron-left"></i></button>
          <span class="month-label" id="mes-label">Maio 2024</span>
          <button class="month-btn" onclick="mesSeguinte()"><i class="fas fa-chevron-right"></i></button>
        </div>

        <!-- Economia -->
        <div class="eco-card">
          <div class="eco-label">Total economizado</div>
          <div class="eco-valor" id="eco-val">R$ 289,60</div>
          <div class="eco-sub">comparado ao preço médio da região</div>
        </div>

        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="sc-label">Abastecimentos</div>
            <div class="sc-val" id="stat-abast">8</div>
          </div>
          <div class="stat-card">
            <div class="sc-label">Gasto total</div>
            <div class="sc-val" id="stat-gasto">R$ 412,30</div>
          </div>
        </div>

        <!-- Eco litro -->
        <div class="eco-litro-row">
          <div class="el-label">Economia por litro</div>
          <div class="el-val">
            R$ <span id="eco-litro">0,36</span>
            <i class="fas fa-chevron-right" style="font-size:14px;color:var(--t2)"></i>
          </div>
        </div>

        <!-- Ranking postos -->
        <div class="ranking-card">
          <div class="ranking-title">Postos mais abastecidos</div>
          <div class="ranking-row">
            <div class="rk-logo">🐚</div>
            <div class="rk-nome">Posto Shell</div>
            <div class="rk-vez">3 vezes</div>
          </div>
          <div class="ranking-row">
            <div class="rk-logo">🟡</div>
            <div class="rk-nome">Posto Ipiranga</div>
            <div class="rk-vez">2 vezes</div>
          </div>
          <div class="ranking-row">
            <div class="rk-logo">🔵</div>
            <div class="rk-nome">Posto BR</div>
            <div class="rk-vez">2 vezes</div>
          </div>
          <div class="ranking-row">
            <div class="rk-logo">⚪</div>
            <div class="rk-nome">Outros</div>
            <div class="rk-vez">1 vez</div>
          </div>
        </div>

        <!-- Perfil -->
        <div class="user-card">
          <div class="user-avatar" id="u-avatar">U</div>
          <div class="user-nome" id="u-nome">Usuário</div>
          <div class="user-email" id="u-email">usuario@email.com</div>
          <div class="user-badge"><i class="fas fa-star"></i> Plano Gratuito</div>
        </div>

        <button class="btn-sair" onclick="sair()">
          <i class="fas fa-sign-out-alt"></i> Sair da conta
        </button>
      </div>
    </section>

  </div><!-- /app-content -->

  <!-- ────── BOTTOM NAV ────── -->
  <nav id="bottom-nav">
    <button class="nav-btn active" id="nb-melhor" onclick="irPara('view-mapa')">
      <i class="fas fa-star"></i>
      <span>Melhor★</span>
    </button>
    <button class="nav-btn" id="nb-lista" onclick="irPara('view-lista')">
      <i class="fas fa-list"></i>
      <span>Lista</span>
    </button>
    <button class="nav-btn" id="nb-mapa" onclick="irPara('view-mapa')">
      <i class="fas fa-map-marker-alt"></i>
      <span>Mapa</span>
    </button>
    <button class="nav-btn" id="nb-planejar" onclick="irPara('view-planejar')">
      <i class="fas fa-route"></i>
      <span>Planejar</span>
    </button>
    <button class="nav-btn" id="nb-perfil" onclick="irPara('view-perfil')">
      <i class="fas fa-user"></i>
      <span>Perfil</span>
    </button>
  </nav>

</div><!-- /app-root -->

<!-- TOAST -->
<div id="toast"></div>

<script>
'use strict';

// ══════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════
const S = {
  postos: [],
  postoAtual: null,
  combustivel: 'gasolina',
  userLat: null,
  userLng: null,
  mapa: null,
  rotaMapa: null,
  markersLayer: null,
  rotaLayer: null,
  userMarker: null,
  mesAtual: 4,
  anoAtual: 2024,
};

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ══════════════════════════════════════════════════
// NAVEGAÇÃO
// ══════════════════════════════════════════════════
const NAV_MAP = {
  'view-mapa':     ['nb-melhor','nb-mapa'],
  'view-lista':    ['nb-lista'],
  'view-detalhes': ['nb-lista'],
  'view-planejar': ['nb-planejar'],
  'view-perfil':   ['nb-perfil'],
};

function irPara(id, fromDetail) {
  const prev = document.querySelector('.view.active');
  if(prev && prev.id !== id) prev.classList.add('slide-left');
  setTimeout(() => {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active','slide-left');
    });
    const next = document.getElementById(id);
    if(next) next.classList.add('active');
  }, fromDetail ? 0 : 10);

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  (NAV_MAP[id] || []).forEach(nb => {
    const el = document.getElementById(nb);
    if(el) el.classList.add('active');
  });

  if(id === 'view-mapa' && !S.mapa) setTimeout(initMapa, 120);
  if(id === 'view-planejar' && !S.rotaMapa) setTimeout(initRotaMapa, 120);
}

function voltarLista() {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active','slide-left'));
  document.getElementById('view-lista').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('nb-lista').classList.add('active');
}

// ══════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════
let _toastTimer;
function toast(msg, dur=3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

// ══════════════════════════════════════════════════
// LOADING
// ══════════════════════════════════════════════════
function hideLoading() {
  const l = document.getElementById('loading');
  l.classList.add('fade');
  setTimeout(() => l.remove(), 450);
}

// ══════════════════════════════════════════════════
// MAPA (Tela 7)
// ══════════════════════════════════════════════════
function initMapa() {
  if(S.mapa) return;
  S.mapa = L.map('leaflet-map', {
    center: [-23.5505, -46.6333],
    zoom: 14,
    zoomControl: false,
    attributionControl: false,
    tap: true, tapTolerance: 15,
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd'
  }).addTo(S.mapa);
  L.control.zoom({ position: 'bottomright' }).addTo(S.mapa);
  S.markersLayer = L.layerGroup().addTo(S.mapa);
  obterLocalizacao();
}

function obterLocalizacao() {
  if(!navigator.geolocation) { usarFallback(); return; }
  navigator.geolocation.getCurrentPosition(
    p => {
      S.userLat = p.coords.latitude;
      S.userLng = p.coords.longitude;
      S.mapa.setView([S.userLat, S.userLng], 15);
      addUserMarker(S.userLat, S.userLng);
      carregarPostos(S.userLat, S.userLng);
    },
    () => usarFallback(),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function usarFallback() {
  S.userLat = -23.5505; S.userLng = -46.6333;
  if(S.mapa) {
    S.mapa.setView([S.userLat, S.userLng], 14);
    addUserMarker(S.userLat, S.userLng);
  }
  carregarPostos(S.userLat, S.userLng);
}

function addUserMarker(lat, lng) {
  if(S.userMarker) S.userMarker.remove();
  const icon = L.divIcon({
    html: '<div style="width:16px;height:16px;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 8px rgba(59,130,246,0.18)"></div>',
    className:'', iconAnchor:[8,8]
  });
  S.userMarker = L.marker([lat, lng], { icon }).addTo(S.mapa);
}

function centralizarMapa() {
  if(S.mapa && S.userLat) {
    S.mapa.setView([S.userLat, S.userLng], 15);
  } else {
    toast('Localizando...');
    if(!S.mapa) initMapa(); else obterLocalizacao();
  }
}

async function carregarPostos(lat, lng) {
  try {
    const r = await fetch('/api/postos?lat='+lat+'&lng='+lng+'&raio=3000');
    const d = await r.json();
    S.postos = (d.postos || []).length > 0 ? d.postos : mockPostos(lat, lng);
  } catch {
    S.postos = mockPostos(lat, lng);
  }
  renderMapMarkers();
  renderLista();
  hideLoading();
  if(S.postos.length) mostrarCardMelhor(S.postos[0]);
}

function mockPostos(lat, lng) {
  return [
    { id:'s1', nome:'Posto Shell',    emoji:'🐚', lat:lat+0.005, lng:lng+0.008, distancia:'1,2', tempo:3,  rating:'4,6', avaliacoes:128, precos:{gasolina:'5,67',etanol:'3,89',diesel:'6,19',gnv:'4,49'}, endereco:'Av. Rebouças, 1234 – Pinheiros, SP' },
    { id:'i2', nome:'Posto Ipiranga', emoji:'🟡', lat:lat-0.004, lng:lng+0.012, distancia:'1,4', tempo:4,  rating:'4,4', avaliacoes: 87, precos:{gasolina:'5,74',etanol:'3,95',diesel:'6,25',gnv:'4,55'}, endereco:'Rua da Consolação, 567 – Consolação, SP' },
    { id:'b3', nome:'Posto BR',       emoji:'🔵', lat:lat+0.010, lng:lng-0.007, distancia:'1,6', tempo:5,  rating:'4,2', avaliacoes: 63, precos:{gasolina:'5,79',etanol:'3,98',diesel:'6,29',gnv:'4,60'}, endereco:'Al. Santos, 890 – Jardins, SP' },
    { id:'a4', nome:'Posto Ale',      emoji:'🔴', lat:lat-0.009, lng:lng-0.010, distancia:'2,1', tempo:6,  rating:'4,1', avaliacoes: 45, precos:{gasolina:'5,89',etanol:'4,05',diesel:'6,35',gnv:'4,68'}, endereco:'R. Haddock Lobo, 200 – Jardim Paulista, SP' },
    { id:'r5', nome:'Posto Raízen',   emoji:'🟢', lat:lat+0.015, lng:lng+0.003, distancia:'2,8', tempo:8,  rating:'4,0', avaliacoes: 32, precos:{gasolina:'5,92',etanol:'4,08',diesel:'6,38',gnv:'4,72'}, endereco:'Av. Faria Lima, 3000 – Itaim Bibi, SP' },
  ];
}

function renderMapMarkers() {
  if(!S.mapa || !S.markersLayer) return;
  S.markersLayer.clearLayers();
  S.postos.forEach((p, i) => {
    const preco = p.precos?.[S.combustivel] || '–';
    const best = i === 0;
    const icon = L.divIcon({
      html: '<div class="price-pin '+(best?'best':'')+'" data-id="'+p.id+'">R$ '+preco+'</div>',
      className:'', iconAnchor:[36,38]
    });
    const m = L.marker([p.lat, p.lng], { icon }).addTo(S.markersLayer);
    m.on('click', () => { S.postoAtual = p; abrirDetalhes(p.id); });
  });
}

function mostrarCardMelhor(p) {
  document.getElementById('cm-emoji').textContent = p.emoji || '⛽';
  document.getElementById('cm-nome').textContent  = p.nome;
  document.getElementById('cm-meta').textContent  = p.distancia+' km · '+p.tempo+' min · ★ '+p.rating;
  document.getElementById('cm-preco').textContent = 'R$ '+(p.precos?.[S.combustivel]||'–');
  document.getElementById('card-melhor').classList.add('show');
  S.postoAtual = p;
}

function irAteMapa() {
  if(S.postoAtual) abrirRota(S.postoAtual);
}

// ══════════════════════════════════════════════════
// LISTA (Tela 8)
// ══════════════════════════════════════════════════
function renderLista(query) {
  const container = document.getElementById('lista-scroll');
  let lista = [...S.postos];
  if(query) lista = lista.filter(p =>
    p.nome.toLowerCase().includes(query.toLowerCase()) ||
    (p.endereco||'').toLowerCase().includes(query.toLowerCase())
  );
  lista.sort((a,b) =>
    parseFloat((a.precos?.[S.combustivel]||'9').replace(',','.')) -
    parseFloat((b.precos?.[S.combustivel]||'9').replace(',','.'))
  );
  if(!lista.length) {
    container.innerHTML='<div style="text-align:center;padding:60px 0;color:var(--t2)"><i class="fas fa-gas-pump" style="font-size:32px;margin-bottom:14px;display:block;opacity:0.3"></i>Nenhum posto encontrado</div>';
    return;
  }
  container.innerHTML = lista.map((p,i) => {
    const preco = p.precos?.[S.combustivel]||'–';
    const best = i===0;
    return \`<div class="posto-card" onclick="abrirDetalhes('\${p.id}')">
      <div class="posto-logo">\${p.emoji||'⛽'}</div>
      <div class="posto-info">
        <div class="posto-nome">\${p.nome}</div>
        <div class="posto-sub">
          <span class="posto-stars">★ \${p.rating}</span>
          <span class="posto-dist">\${p.distancia} km · \${p.tempo} min</span>
        </div>
        \${best?'<div class="badge-best">✓ Melhor preço</div>':''}
      </div>
      <div class="posto-preco-wrap">
        <div class="posto-preco \${best?'best':''}">R$ \${preco}</div>
        <div class="posto-time">\${p.distancia} km · \${p.tempo} min</div>
      </div>
    </div>\`;
  }).join('');
}

function setFuel(f, btn) {
  S.combustivel = f;
  document.querySelectorAll('.fuel-chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderLista();
  renderMapMarkers();
  if(S.postoAtual) mostrarCardMelhor(S.postos[0]||S.postoAtual);
}

function filtrarLista(q) { renderLista(q||''); }

// ══════════════════════════════════════════════════
// DETALHES (Tela 9)
// ══════════════════════════════════════════════════
function abrirDetalhes(id) {
  const p = S.postos.find(x=>x.id===id);
  if(!p) return;
  S.postoAtual = p;

  document.getElementById('det-logo').textContent = p.emoji||'⛽';
  document.getElementById('det-nome').textContent  = p.nome;
  document.getElementById('det-end').textContent   = p.endereco||'Endereço não disponível';
  document.getElementById('det-rating').textContent= p.rating;
  document.getElementById('det-avl').textContent   = '('+p.avaliacoes+' avaliações)';

  const pr = p.precos||{};
  document.getElementById('det-preco').innerHTML   = 'R$ '+(pr.gasolina||'–')+' <span class="pcp-unit">/L</span>';
  document.getElementById('det-etanol').textContent= pr.etanol ? 'R$ '+pr.etanol : '–';
  document.getElementById('det-diesel').textContent= pr.diesel ? 'R$ '+pr.diesel : '–';
  document.getElementById('det-gnv').textContent   = pr.gnv    ? 'R$ '+pr.gnv    : '–';

  document.getElementById('det-scroll').scrollTop = 0;
  irPara('view-detalhes');
}

function irAtePosto() { if(S.postoAtual) abrirRota(S.postoAtual); }
function comoChegar() {
  if(S.postoAtual) window.open('https://maps.google.com/?q='+S.postoAtual.lat+','+S.postoAtual.lng,'_blank');
}

// ══════════════════════════════════════════════════
// PLANEJAR ROTA (Tela 10)
// ══════════════════════════════════════════════════
function initRotaMapa() {
  if(S.rotaMapa) return;
  S.rotaMapa = L.map('rota-map',{
    center: [-23.5505,-46.6333], zoom:14,
    zoomControl:false, attributionControl:false
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(S.rotaMapa);
}

function abrirRota(p) {
  S.postoAtual = p;
  document.getElementById('r-destino').value = p.nome;
  document.getElementById('r-dist').textContent  = p.distancia+' km';
  document.getElementById('r-tempo').textContent = p.tempo+' min';
  document.getElementById('rota-resumo').classList.add('show');
  irPara('view-planejar');

  setTimeout(() => {
    if(!S.rotaMapa) initRotaMapa();
    if(S.userLat) {
      const mid = [(S.userLat+p.lat)/2, (S.userLng+p.lng)/2];
      S.rotaMapa.setView(mid, 14);
      if(S.rotaLayer) S.rotaLayer.remove();
      S.rotaLayer = L.layerGroup().addTo(S.rotaMapa);
      L.polyline([[S.userLat,S.userLng],[p.lat,p.lng]],{
        color:'#3B82F6', weight:5, opacity:0.9, dashArray:'12,7'
      }).addTo(S.rotaLayer);
      const mkO = L.divIcon({ html:'<div style="width:14px;height:14px;background:#4ADE80;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>', className:'', iconAnchor:[7,7]});
      const mkD = L.divIcon({ html:'<div style="width:14px;height:14px;background:#EF4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>', className:'', iconAnchor:[7,7]});
      L.marker([S.userLat,S.userLng],{icon:mkO}).addTo(S.rotaLayer);
      L.marker([p.lat,p.lng],{icon:mkD}).addTo(S.rotaLayer);
    }
  }, 350);
}

function iniciarNav() {
  if(S.postoAtual) window.open('https://maps.google.com/maps?daddr='+S.postoAtual.lat+','+S.postoAtual.lng,'_blank');
  else toast('Selecione um posto primeiro.');
}

// ══════════════════════════════════════════════════
// RELATÓRIOS (Tela 11)
// ══════════════════════════════════════════════════
function setPeriodo(p, btn) {
  document.querySelectorAll('.period-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function mesAnterior() {
  if(S.mesAtual===0){S.mesAtual=11;S.anoAtual--;}else S.mesAtual--;
  document.getElementById('mes-label').textContent = MESES[S.mesAtual]+' '+S.anoAtual;
}
function mesSeguinte() {
  if(S.mesAtual===11){S.mesAtual=0;S.anoAtual++;}else S.mesAtual++;
  document.getElementById('mes-label').textContent = MESES[S.mesAtual]+' '+S.anoAtual;
}

// ══════════════════════════════════════════════════
// BUSCA
// ══════════════════════════════════════════════════
let _bt;
function debounceBusca(q) {
  clearTimeout(_bt);
  if(!q) return;
  _bt = setTimeout(()=>buscarGeo(q), 700);
}
async function buscarGeo(q) {
  try {
    const r = await fetch('/api/geocode?q='+encodeURIComponent(q));
    const d = await r.json();
    if(d.lat && S.mapa) {
      S.mapa.setView([d.lat,d.lng],14);
      carregarPostos(d.lat,d.lng);
    }
  } catch {}
}

// ══════════════════════════════════════════════════
// PERFIL / AUTH
// ══════════════════════════════════════════════════
function carregarPerfil() {
  try {
    const u = JSON.parse(localStorage.getItem('rp_user')||'{}');
    if(u.nome) {
      document.getElementById('u-avatar').textContent = (u.nome||'U')[0].toUpperCase();
      document.getElementById('u-nome').textContent   = u.nome;
      document.getElementById('u-email').textContent  = u.email||'';
    }
  } catch {}
}

function sair() {
  localStorage.removeItem('rp_user');
  localStorage.removeItem('rp_veiculo');
  if(window._fbSignOut && window._appAuth) {
    window._fbSignOut(window._appAuth).catch(()=>{});
  }
  window.location.href = '/onboarding';
}

function toggleMenu()   { toast('Menu em breve!'); }
function abrirNotifs()  { toast('Sem novas notificações.'); }

// ══════════════════════════════════════════════════
// FIREBASE
// ══════════════════════════════════════════════════
let _appAuth = null;

function initFirebase() {
  if(!window._fbGetAuth || !window._fbFirebaseApp) return;
  try {
    _appAuth = window._fbGetAuth(window._fbFirebaseApp);
    window._appAuth = _appAuth;
    window._fbOnAuthStateChanged(_appAuth, user => {
      if(!user) {
        const stored = localStorage.getItem('rp_user');
        if(!stored) { window.location.href='/onboarding'; return; }
      }
      boot();
    });
  } catch {
    boot();
  }
}

function boot() {
  carregarPerfil();
  initMapa();
}

// ══════════════════════════════════════════════════
// SERVICE WORKER
// ══════════════════════════════════════════════════
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg=>{
    reg.update();
    reg.addEventListener('updatefound',()=>{
      const sw = reg.installing;
      sw?.addEventListener('statechange',()=>{
        if(sw.state==='installed'&&navigator.serviceWorker.controller)
          sw.postMessage({type:'SKIP_WAITING'});
      });
    });
  }).catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());
}

// ══════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════
let _tries=0;
(function tryFb(){
  if(window._fbGetAuth&&window._fbFirebaseApp) initFirebase();
  else if(_tries++<25) setTimeout(tryFb,250);
  else boot();
})();

</script>
</body>
</html>`;
}
