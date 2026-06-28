// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – App Principal (Telas 7-11)
//  Dark theme pixel-perfect conforme referências
//  #0B121E · laranja #FF6D00 · verde #22C55E
// ═══════════════════════════════════════════════════════════════════════

import { GOOGLE_CLIENT_ID, getFirebaseAuthScripts } from './auth'

export function getAppHTML(firebaseScripts: string): string {
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
  <meta name="application-name" content="RotaPosto"/>
  <meta name="google-signin-client_id" content="${GOOGLE_CLIENT_ID}"/>
  <title>RotaPosto – Ache o Melhor Preço</title>
  <link rel="manifest" href="/manifest.json"/>
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png"/>
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  ${firebaseScripts}
  <style>
    *, *::before, *::after {
      margin: 0; padding: 0; box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    :root {
      --bg:        #0B121E;
      --bg2:       #111827;
      --card:      #151E2D;
      --card2:     #1A2435;
      --card3:     #1F2D40;
      --border:    rgba(255,255,255,0.08);
      --border2:   rgba(255,255,255,0.12);
      --laranja:   #FF6D00;
      --laranja2:  #FF8C00;
      --verde:     #22C55E;
      --verde2:    #16A34A;
      --vermelho:  #EF4444;
      --azul:      #3B82F6;
      --branco:    #FFFFFF;
      --cinza:     rgba(255,255,255,0.45);
      --cinza2:    rgba(255,255,255,0.25);
      --cinza3:    rgba(255,255,255,0.12);
      --radius:    18px;
      --radius-sm: 12px;
      --nav-h:     68px;
      --header-h:  110px;
    }

    html { height: 100%; }
    body {
      font-family: 'Raleway', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--branco);
      height: 100%;
      max-width: 430px;
      margin: 0 auto;
      overflow: hidden;
      position: relative;
    }

    /* ═══════════════════════════════════════════
       VIEWS (telas)
    ═══════════════════════════════════════════ */
    .view {
      position: fixed;
      inset: 0;
      display: none;
      flex-direction: column;
      background: var(--bg);
      max-width: 430px;
      left: 50%;
      transform: translateX(-50%);
    }
    .view.active { display: flex; }

    /* ═══════════════════════════════════════════
       HEADER GLOBAL
    ═══════════════════════════════════════════ */
    .app-header {
      background: var(--bg);
      padding: env(safe-area-inset-top, 44px) 16px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      border-bottom: 1px solid var(--border);
      position: relative;
      z-index: 50;
    }
    .header-logo {
      display: flex; align-items: center; gap: 8px;
    }
    .header-logo-icon {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .header-logo-text {
      font-size: 20px; font-weight: 900;
      color: var(--branco); letter-spacing: -0.5px;
    }
    .header-logo-text span { color: var(--laranja); }
    .header-menu-btn {
      width: 36px; height: 36px;
      background: var(--card);
      border: none; border-radius: 10px;
      color: var(--branco); font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .header-bell-btn {
      width: 36px; height: 36px;
      background: var(--card);
      border: none; border-radius: 10px;
      color: var(--branco); font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    .header-bell-dot {
      position: absolute; top: 6px; right: 6px;
      width: 8px; height: 8px;
      background: var(--laranja);
      border-radius: 50%;
      border: 2px solid var(--bg);
    }

    /* Barra de busca */
    .search-bar {
      padding: 0 16px 12px;
      background: var(--bg);
      flex-shrink: 0;
    }
    .search-input-wrap {
      position: relative;
    }
    .search-input-wrap i {
      position: absolute; left: 14px; top: 50%;
      transform: translateY(-50%);
      color: var(--cinza); font-size: 14px;
    }
    .search-input {
      width: 100%; height: 44px;
      background: var(--card);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      padding: 0 16px 0 40px;
      color: var(--branco);
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 500;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input::placeholder { color: var(--cinza); }
    .search-input:focus { border-color: var(--laranja); }

    /* ═══════════════════════════════════════════
       BOTTOM NAV (tela 7-11)
    ═══════════════════════════════════════════ */
    #bottom-nav {
      position: fixed;
      bottom: 0; left: 50%;
      transform: translateX(-50%);
      width: 100%; max-width: 430px;
      height: var(--nav-h);
      background: var(--card);
      border-top: 1px solid var(--border);
      display: flex;
      z-index: 200;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    .nav-item {
      flex: 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 3px;
      border: none; background: none;
      color: var(--cinza);
      font-family: 'Raleway', sans-serif;
      font-size: 10px; font-weight: 700;
      cursor: pointer;
      transition: color 0.2s;
      padding: 8px 4px 4px;
    }
    .nav-item i { font-size: 20px; }
    .nav-item.active { color: var(--laranja); }
    .nav-item.active i { filter: drop-shadow(0 0 6px rgba(255,109,0,0.5)); }

    /* ═══════════════════════════════════════════
       TELA 7: MAPA
    ═══════════════════════════════════════════ */
    #view-mapa {
      overflow: hidden;
    }
    #map-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    #leaflet-map {
      width: 100%; height: 100%;
      background: #1a2535;
    }
    /* Pin de preço no mapa */
    .price-pin {
      background: var(--laranja);
      color: white;
      font-size: 11px; font-weight: 800;
      padding: 4px 8px;
      border-radius: 20px;
      white-space: nowrap;
      box-shadow: 0 3px 10px rgba(255,109,0,0.5);
      border: 2px solid rgba(255,255,255,0.2);
      cursor: pointer;
      position: relative;
    }
    .price-pin::after {
      content: '';
      position: absolute;
      bottom: -5px; left: 50%;
      transform: translateX(-50%);
      width: 0; height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid var(--laranja);
    }
    .price-pin.best {
      background: var(--verde);
      box-shadow: 0 3px 10px rgba(34,197,94,0.5);
    }
    .price-pin.best::after { border-top-color: var(--verde); }

    /* Card "Melhor posto próximo" flutuante */
    #card-melhor {
      position: absolute;
      bottom: calc(var(--nav-h) + 12px);
      left: 16px; right: 16px;
      background: var(--card);
      border-radius: var(--radius);
      padding: 16px;
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      border: 1px solid var(--border2);
      display: none;
    }
    #card-melhor.show { display: block; }
    .card-melhor-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }
    .card-melhor-label {
      font-size: 11px; font-weight: 700;
      color: var(--verde);
      text-transform: uppercase; letter-spacing: 0.8px;
    }
    .card-melhor-close {
      width: 24px; height: 24px;
      background: var(--card3);
      border: none; border-radius: 6px;
      color: var(--cinza); font-size: 12px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .card-melhor-body {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 12px;
    }
    .posto-logo-circle {
      width: 44px; height: 44px;
      border-radius: 50%;
      background: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .card-melhor-info { flex: 1; }
    .card-melhor-nome {
      font-size: 15px; font-weight: 800;
      color: var(--branco);
      margin-bottom: 2px;
    }
    .card-melhor-meta {
      font-size: 12px; font-weight: 500;
      color: var(--cinza);
    }
    .card-melhor-preco {
      font-size: 20px; font-weight: 900;
      color: var(--verde);
    }
    .btn-ir {
      width: 100%; height: 48px;
      background: var(--laranja);
      border: none; border-radius: 14px;
      color: white;
      font-family: 'Raleway', sans-serif;
      font-size: 15px; font-weight: 800;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.15s;
    }
    .btn-ir:active { transform: scale(0.98); }

    /* Botão localizar */
    #btn-localizar-mapa {
      position: absolute;
      top: 16px; right: 16px;
      width: 40px; height: 40px;
      background: var(--card);
      border: 1px solid var(--border2);
      border-radius: 12px;
      color: var(--branco); font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      z-index: 50;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }

    /* ═══════════════════════════════════════════
       TELA 8: LISTA DE POSTOS
    ═══════════════════════════════════════════ */
    #view-lista {
      overflow: hidden;
    }
    .lista-header {
      padding: env(safe-area-inset-top, 44px) 16px 0;
      background: var(--bg);
      flex-shrink: 0;
    }
    .lista-header-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .lista-logo {
      font-size: 20px; font-weight: 900;
      color: var(--branco);
    }
    .lista-logo span { color: var(--laranja); }
    .lista-bell {
      width: 36px; height: 36px;
      background: var(--card);
      border: none; border-radius: 10px;
      color: var(--branco); font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    /* Barra busca lista */
    .lista-search {
      position: relative; margin-bottom: 12px;
    }
    .lista-search i {
      position: absolute; left: 14px; top: 50%;
      transform: translateY(-50%);
      color: var(--cinza); font-size: 14px;
    }
    .lista-search input {
      width: 100%; height: 44px;
      background: var(--card);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      padding: 0 16px 0 40px;
      color: var(--branco);
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 500;
      outline: none;
    }
    .lista-search input::placeholder { color: var(--cinza); }
    /* Filtros combustível */
    .fuel-tabs {
      display: flex; gap: 8px;
      padding-bottom: 12px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .fuel-tabs::-webkit-scrollbar { display: none; }
    .fuel-tab {
      padding: 7px 16px;
      border-radius: 100px;
      border: 1.5px solid var(--border);
      background: transparent;
      color: var(--cinza);
      font-family: 'Raleway', sans-serif;
      font-size: 13px; font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .fuel-tab.active {
      background: var(--laranja);
      border-color: var(--laranja);
      color: white;
    }
    /* Lista scroll */
    .lista-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 0 16px;
      padding-bottom: calc(var(--nav-h) + 16px);
    }
    .lista-scroll::-webkit-scrollbar { display: none; }
    /* Card de posto na lista */
    .posto-card {
      background: var(--card);
      border-radius: var(--radius);
      padding: 14px;
      margin-bottom: 10px;
      display: flex; align-items: center; gap: 12px;
      cursor: pointer;
      border: 1px solid var(--border);
      transition: border-color 0.2s, background 0.2s;
    }
    .posto-card:active { background: var(--card2); border-color: var(--border2); }
    .posto-logo {
      width: 44px; height: 44px;
      border-radius: 50%;
      background: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .posto-info { flex: 1; min-width: 0; }
    .posto-nome {
      font-size: 15px; font-weight: 800;
      color: var(--branco);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .posto-meta {
      display: flex; align-items: center; gap: 8px;
      margin-top: 3px;
    }
    .posto-stars {
      display: flex; align-items: center; gap: 3px;
      font-size: 12px; font-weight: 700; color: #FBBF24;
    }
    .posto-stars i { font-size: 10px; }
    .posto-dist {
      font-size: 12px; font-weight: 500; color: var(--cinza);
    }
    .posto-preco-col {
      text-align: right; flex-shrink: 0;
    }
    .posto-preco {
      font-size: 17px; font-weight: 900;
      color: var(--branco);
    }
    .posto-preco.best { color: var(--verde); }
    .posto-dist-time {
      font-size: 11px; font-weight: 500;
      color: var(--cinza);
      margin-top: 2px;
    }
    /* Badge melhor preço */
    .badge-best {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(34,197,94,0.15);
      border: 1px solid rgba(34,197,94,0.3);
      color: var(--verde);
      font-size: 10px; font-weight: 800;
      padding: 2px 7px;
      border-radius: 100px;
      margin-top: 4px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    /* ═══════════════════════════════════════════
       TELA 9: DETALHES DO POSTO
    ═══════════════════════════════════════════ */
    #view-detalhes {
      overflow: hidden;
    }
    .detalhes-scroll {
      flex: 1;
      overflow-y: auto;
      padding-bottom: calc(var(--nav-h) + 16px);
    }
    .detalhes-scroll::-webkit-scrollbar { display: none; }
    /* Foto de capa */
    .detalhes-cover {
      width: 100%; height: 200px;
      position: relative;
      overflow: hidden;
      background: var(--card);
    }
    .detalhes-cover-img {
      width: 100%; height: 100%;
      object-fit: cover;
    }
    .detalhes-cover-placeholder {
      width: 100%; height: 100%;
      background: linear-gradient(135deg, #1A2435, #0F1B2D);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px;
    }
    .detalhes-cover-placeholder i { font-size: 48px; color: var(--laranja); opacity: 0.6; }
    .detalhes-back-btn {
      position: absolute;
      top: calc(env(safe-area-inset-top, 20px) + 8px);
      left: 16px;
      width: 38px; height: 38px;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
      border: none; border-radius: 10px;
      color: white; font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .detalhes-logo-badge {
      position: absolute;
      bottom: 16px; left: 16px;
      width: 52px; height: 52px;
      background: white;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    /* Info do posto */
    .detalhes-info {
      padding: 16px;
    }
    .detalhes-nome {
      font-size: 22px; font-weight: 900;
      color: var(--branco);
      margin-bottom: 4px;
    }
    .detalhes-endereco {
      font-size: 13px; font-weight: 500;
      color: var(--cinza);
      margin-bottom: 10px;
    }
    .detalhes-rating-row {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 16px;
    }
    .rating-stars {
      display: flex; align-items: center; gap: 3px;
      font-size: 14px; font-weight: 800; color: #FBBF24;
    }
    .rating-stars i { font-size: 13px; }
    .rating-count {
      font-size: 13px; font-weight: 500; color: var(--cinza);
    }
    .badge-aberto {
      background: rgba(34,197,94,0.15);
      border: 1px solid rgba(34,197,94,0.3);
      color: var(--verde);
      font-size: 11px; font-weight: 800;
      padding: 3px 10px; border-radius: 100px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    /* Preço destaque */
    .preco-destaque-card {
      background: rgba(34,197,94,0.12);
      border: 1px solid rgba(34,197,94,0.25);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      margin-bottom: 12px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: space-between;
    }
    .preco-destaque-label {
      font-size: 13px; font-weight: 700; color: var(--cinza);
      margin-bottom: 4px;
    }
    .preco-destaque-valor {
      font-size: 26px; font-weight: 900; color: var(--verde);
    }
    .preco-destaque-unit {
      font-size: 14px; font-weight: 600; color: var(--cinza);
    }
    .preco-destaque-arrow {
      color: var(--verde); font-size: 18px;
    }
    /* Tabela de combustíveis */
    .preco-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }
    .preco-row:last-child { border-bottom: none; }
    .preco-row-label {
      font-size: 14px; font-weight: 600; color: var(--cinza);
    }
    .preco-row-val {
      font-size: 15px; font-weight: 800; color: var(--branco);
    }
    /* Botões de ação */
    .detalhes-actions {
      display: flex; gap: 10px;
      margin-top: 16px;
      padding: 0 16px;
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
    .btn-outline:active { background: rgba(255,109,0,0.1); }
    .btn-solid {
      flex: 1; height: 48px;
      background: var(--laranja);
      border: none;
      border-radius: 14px;
      color: white;
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 800;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: all 0.15s;
    }
    .btn-solid:active { transform: scale(0.98); }
    /* Avaliações */
    .avaliacoes-section {
      padding: 16px;
    }
    .section-title {
      font-size: 16px; font-weight: 800;
      color: var(--branco);
      margin-bottom: 14px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .section-link {
      font-size: 13px; font-weight: 700;
      color: var(--laranja); cursor: pointer;
    }
    .review-card {
      background: var(--card);
      border-radius: var(--radius-sm);
      padding: 14px;
      border: 1px solid var(--border);
    }
    .review-header {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 8px;
    }
    .review-avatar {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 800; color: white;
      flex-shrink: 0;
    }
    .review-name {
      font-size: 14px; font-weight: 800; color: var(--branco);
    }
    .review-date {
      font-size: 12px; font-weight: 500; color: var(--cinza);
    }
    .review-stars {
      display: flex; gap: 2px;
      margin-left: auto;
    }
    .review-stars i { font-size: 13px; color: #FBBF24; }
    .review-text {
      font-size: 13px; font-weight: 500;
      color: rgba(255,255,255,0.7);
      line-height: 1.5;
    }

    /* ═══════════════════════════════════════════
       TELA 10: PLANEJAR ROTA
    ═══════════════════════════════════════════ */
    #view-planejar {
      overflow: hidden;
    }
    .planejar-header {
      padding: env(safe-area-inset-top, 44px) 16px 14px;
      background: var(--bg);
      flex-shrink: 0;
      border-bottom: 1px solid var(--border);
    }
    .planejar-header-row {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 14px;
    }
    .planejar-back {
      width: 38px; height: 38px;
      background: var(--card);
      border: none; border-radius: 10px;
      color: var(--branco); font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .planejar-title {
      font-size: 18px; font-weight: 800;
      color: var(--branco);
    }
    /* Inputs de rota */
    .rota-inputs {
      display: flex; flex-direction: column; gap: 8px;
    }
    .rota-input-row {
      display: flex; align-items: center; gap: 10px;
    }
    .rota-dot {
      width: 12px; height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .rota-dot.origin { background: #4ADE80; }
    .rota-dot.dest { background: #EF4444; }
    .rota-line {
      width: 2px; height: 20px;
      background: var(--border2);
      margin: 0 5px;
    }
    .rota-input-field {
      flex: 1; height: 44px;
      background: var(--card);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      padding: 0 14px;
      color: var(--branco);
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 500;
      outline: none;
    }
    .rota-input-field::placeholder { color: var(--cinza); }
    .rota-input-field:focus { border-color: var(--laranja); }
    /* Mapa da rota */
    #rota-map-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    #rota-map {
      width: 100%; height: 100%;
      background: #1a2535;
    }
    /* Resumo da rota */
    .rota-resumo {
      position: absolute;
      top: 16px; left: 16px; right: 16px;
      background: var(--card);
      border-radius: var(--radius-sm);
      padding: 14px;
      display: flex; gap: 24px; align-items: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      border: 1px solid var(--border2);
      z-index: 50;
    }
    .rota-stat {
      text-align: center;
    }
    .rota-stat-val {
      font-size: 22px; font-weight: 900;
      color: var(--branco);
    }
    .rota-stat-label {
      font-size: 12px; font-weight: 600;
      color: var(--cinza);
    }
    .rota-divider {
      width: 1px; height: 32px;
      background: var(--border2);
    }
    /* Botão iniciar */
    .btn-iniciar-nav {
      position: absolute;
      bottom: calc(var(--nav-h) + 16px);
      left: 16px; right: 16px;
      height: 54px;
      background: var(--laranja);
      border: none; border-radius: 16px;
      color: white;
      font-family: 'Raleway', sans-serif;
      font-size: 16px; font-weight: 800;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 8px 24px rgba(255,109,0,0.4);
      z-index: 50;
    }

    /* ═══════════════════════════════════════════
       TELA 11: RELATÓRIOS / PERFIL
    ═══════════════════════════════════════════ */
    #view-perfil {
      overflow: hidden;
    }
    .perfil-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      padding-bottom: calc(var(--nav-h) + 16px);
    }
    .perfil-scroll::-webkit-scrollbar { display: none; }
    /* Tabs Semana/Mês/Ano */
    .period-tabs {
      display: flex;
      background: var(--card);
      border-radius: 12px;
      padding: 4px;
      margin-bottom: 20px;
      border: 1px solid var(--border);
    }
    .period-tab {
      flex: 1;
      height: 36px;
      background: transparent;
      border: none; border-radius: 9px;
      color: var(--cinza);
      font-family: 'Raleway', sans-serif;
      font-size: 13px; font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .period-tab.active {
      background: var(--card3);
      color: var(--branco);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    /* Navegação mês */
    .month-nav {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
    }
    .month-nav-btn {
      width: 32px; height: 32px;
      background: var(--card);
      border: none; border-radius: 8px;
      color: var(--cinza); font-size: 14px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .month-nav-label {
      font-size: 14px; font-weight: 700; color: var(--cinza);
    }
    /* Valor destaque economia */
    .economia-card {
      background: var(--card);
      border-radius: var(--radius);
      padding: 20px;
      text-align: center;
      margin-bottom: 16px;
      border: 1px solid var(--border);
    }
    .economia-label {
      font-size: 12px; font-weight: 700;
      color: var(--cinza);
      text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 8px;
    }
    .economia-valor {
      font-size: 40px; font-weight: 900;
      color: var(--verde);
      line-height: 1;
      margin-bottom: 4px;
    }
    .economia-sub {
      font-size: 13px; font-weight: 500; color: var(--cinza);
    }
    /* Grid stats */
    .stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: var(--card);
      border-radius: var(--radius-sm);
      padding: 16px;
      border: 1px solid var(--border);
    }
    .stat-card-label {
      font-size: 11px; font-weight: 700;
      color: var(--cinza);
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .stat-card-val {
      font-size: 24px; font-weight: 900;
      color: var(--branco);
    }
    /* Economia por litro */
    .eco-litro-card {
      background: var(--card);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      margin-bottom: 16px;
      border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .eco-litro-label {
      font-size: 14px; font-weight: 600; color: var(--cinza);
    }
    .eco-litro-val {
      font-size: 20px; font-weight: 900; color: var(--verde);
      display: flex; align-items: center; gap: 6px;
    }
    /* Postos mais abastecidos */
    .postos-ranking {
      background: var(--card);
      border-radius: var(--radius);
      overflow: hidden;
      border: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .postos-ranking-title {
      padding: 14px 16px 10px;
      font-size: 14px; font-weight: 800;
      color: var(--branco);
      border-bottom: 1px solid var(--border);
    }
    .ranking-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }
    .ranking-item:last-child { border-bottom: none; }
    .ranking-logo {
      width: 36px; height: 36px;
      border-radius: 50%; background: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .ranking-nome {
      flex: 1;
      font-size: 14px; font-weight: 700; color: var(--branco);
    }
    .ranking-vezes {
      font-size: 13px; font-weight: 600; color: var(--cinza);
    }
    /* Perfil usuário */
    .perfil-user-card {
      background: var(--card);
      border-radius: var(--radius);
      padding: 20px;
      text-align: center;
      margin-bottom: 16px;
      border: 1px solid var(--border);
    }
    .perfil-avatar {
      width: 72px; height: 72px;
      background: linear-gradient(135deg, var(--laranja), var(--laranja2));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 900; color: white;
      margin: 0 auto 12px;
    }
    .perfil-nome {
      font-size: 18px; font-weight: 900; color: var(--branco);
      margin-bottom: 4px;
    }
    .perfil-email {
      font-size: 13px; font-weight: 500; color: var(--cinza);
      margin-bottom: 12px;
    }
    .perfil-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,109,0,0.15);
      border: 1px solid rgba(255,109,0,0.3);
      color: var(--laranja);
      font-size: 12px; font-weight: 800;
      padding: 4px 12px; border-radius: 100px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    /* ═══════════════════════════════════════════
       MODAL DETALHES
    ═══════════════════════════════════════════ */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 500;
      display: none;
      align-items: flex-end;
    }
    .modal-overlay.show { display: flex; }
    .modal-sheet {
      width: 100%; max-width: 430px;
      margin: 0 auto;
      background: var(--card);
      border-radius: 24px 24px 0 0;
      padding: 8px 20px 40px;
      max-height: 92dvh;
      overflow-y: auto;
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .modal-handle {
      width: 40px; height: 4px;
      background: var(--border2);
      border-radius: 2px;
      margin: 12px auto 20px;
    }

    /* ═══════════════════════════════════════════
       TOAST
    ═══════════════════════════════════════════ */
    #toast {
      position: fixed;
      bottom: calc(var(--nav-h) + 16px);
      left: 50%;
      transform: translateX(-50%) translateY(80px);
      background: rgba(15,25,40,0.95);
      color: white;
      padding: 12px 20px;
      border-radius: 24px;
      font-size: 13px; font-weight: 600;
      white-space: nowrap;
      z-index: 9999;
      transition: transform 0.3s ease;
      pointer-events: none;
      backdrop-filter: blur(8px);
      border: 1px solid var(--border2);
    }
    #toast.show { transform: translateX(-50%) translateY(0); }

    /* Loading overlay */
    #loading-overlay {
      position: fixed; inset: 0;
      background: var(--bg);
      z-index: 9998;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 20px;
    }
    #loading-overlay.hidden { display: none; }
    .loading-spinner {
      width: 40px; height: 40px;
      border: 3px solid var(--border2);
      border-top-color: var(--laranja);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text {
      font-size: 14px; font-weight: 600; color: var(--cinza);
    }

    /* Leaflet overrides */
    .leaflet-container {
      background: #1A2535 !important;
      font-family: 'Raleway', sans-serif !important;
    }
    .leaflet-tile-pane { filter: brightness(0.85) saturate(0.8); }
    .leaflet-control-zoom {
      border: 1px solid var(--border2) !important;
      border-radius: 10px !important;
      overflow: hidden;
    }
    .leaflet-control-zoom a {
      background: var(--card) !important;
      color: var(--branco) !important;
      border: none !important;
      width: 32px !important; height: 32px !important;
      line-height: 32px !important;
    }
    .leaflet-control-zoom a:hover { background: var(--card2) !important; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-popup-content-wrapper {
      background: var(--card) !important;
      border: 1px solid var(--border2) !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
      color: white !important;
    }
    .leaflet-popup-tip { background: var(--card) !important; }
  </style>
</head>
<body>

<!-- ═══════════════════ LOADING ═══════════════════ -->
<div id="loading-overlay">
  <div style="display:flex;align-items:center;gap:10px;">
    <div style="width:36px;height:36px;background:linear-gradient(135deg,#FF6D00,#FF8C00);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;">⛽</div>
    <div style="font-size:22px;font-weight:900;color:white;">Rota<span style="color:#FF6D00">Posto</span></div>
  </div>
  <div class="loading-spinner"></div>
  <div class="loading-text">Carregando postos próximos...</div>
</div>

<!-- ═══════════════════════════════════════════════════════
     TELA 7: MAPA (view-mapa)
═══════════════════════════════════════════════════════ -->
<section id="view-mapa" class="view active">
  <!-- Header -->
  <div class="app-header" style="padding-bottom:0">
    <button class="header-menu-btn" onclick="toggleMenu()"><i class="fas fa-bars"></i></button>
    <div class="header-logo">
      <div class="header-logo-icon">⛽</div>
      <div class="header-logo-text">Rota<span>Posto</span></div>
    </div>
    <button class="header-bell-btn" onclick="abrirNotificacoes()">
      <i class="fas fa-bell"></i>
      <div class="header-bell-dot"></div>
    </button>
  </div>
  <!-- Busca -->
  <div class="search-bar" style="padding-top:10px;">
    <div class="search-input-wrap">
      <i class="fas fa-search"></i>
      <input type="text" class="search-input" id="mapa-busca" placeholder="Buscar cidade ou endereço" oninput="debounceBusca(this.value)"/>
    </div>
  </div>
  <!-- Mapa -->
  <div id="map-container">
    <div id="leaflet-map"></div>
    <button id="btn-localizar-mapa" onclick="centralizarMapa()" title="Minha localização">
      <i class="fas fa-location-arrow"></i>
    </button>
    <!-- Card melhor posto -->
    <div id="card-melhor" class="show">
      <div class="card-melhor-header">
        <span class="card-melhor-label"><i class="fas fa-star"></i> Melhor posto próximo</span>
        <button class="card-melhor-close" onclick="fecharCardMelhor()">✕</button>
      </div>
      <div class="card-melhor-body">
        <div class="posto-logo-circle" id="mapa-posto-logo">🐚</div>
        <div class="card-melhor-info">
          <div class="card-melhor-nome" id="mapa-posto-nome">Posto Shell</div>
          <div class="card-melhor-meta" id="mapa-posto-meta">1,2 km · 3 min · ★ 4,6</div>
        </div>
        <div class="card-melhor-preco" id="mapa-posto-preco">R$ 5,67</div>
      </div>
      <button class="btn-ir" onclick="irAtePostoMapa()">
        <i class="fas fa-route"></i> Ir até lá
      </button>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════
     TELA 8: LISTA DE POSTOS (view-lista)
═══════════════════════════════════════════════════════ -->
<section id="view-lista" class="view">
  <div class="lista-header">
    <div class="lista-header-row">
      <div class="lista-logo">Rota<span>Posto</span></div>
      <button class="lista-bell" onclick="abrirNotificacoes()">
        <i class="fas fa-bell"></i>
      </button>
    </div>
    <div class="lista-search">
      <i class="fas fa-search"></i>
      <input type="text" placeholder="Buscar nesta área" id="lista-busca" oninput="filtrarLista(this.value)"/>
    </div>
    <div class="fuel-tabs" id="fuel-tabs">
      <button class="fuel-tab active" onclick="setFuel('gasolina', this)">Gasolina</button>
      <button class="fuel-tab" onclick="setFuel('etanol', this)">Etanol</button>
      <button class="fuel-tab" onclick="setFuel('diesel', this)">Diesel</button>
      <button class="fuel-tab" onclick="setFuel('gnv', this)">GNV</button>
    </div>
  </div>
  <div class="lista-scroll" id="lista-postos-scroll">
    <!-- Postos inseridos via JS -->
    <div style="text-align:center;padding:60px 20px;color:var(--cinza);">
      <i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:12px;"></i>
      <div>Buscando postos próximos...</div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════
     TELA 9: DETALHES DO POSTO (view-detalhes)
═══════════════════════════════════════════════════════ -->
<section id="view-detalhes" class="view">
  <div class="detalhes-scroll" id="detalhes-scroll">
    <!-- Capa -->
    <div class="detalhes-cover">
      <div class="detalhes-cover-placeholder" id="detalhes-cover">
        <i class="fas fa-gas-pump"></i>
        <div style="font-size:13px;color:var(--cinza);">Posto de Combustível</div>
      </div>
      <button class="detalhes-back-btn" onclick="voltarDaDetalhes()">
        <i class="fas fa-arrow-left"></i>
      </button>
      <div class="detalhes-logo-badge" id="detalhes-logo">🐚</div>
    </div>

    <!-- Info -->
    <div class="detalhes-info">
      <div class="detalhes-nome" id="detalhes-nome">Posto Shell</div>
      <div class="detalhes-endereco" id="detalhes-endereco">Av. Rebouças, 1234 – Pinheiros, SP</div>
      <div class="detalhes-rating-row">
        <div class="rating-stars">
          <i class="fas fa-star"></i>
          <span id="detalhes-rating">4,6</span>
        </div>
        <span class="rating-count" id="detalhes-avaliacoes">(128 avaliações)</span>
        <span class="badge-aberto">Aberto agora</span>
      </div>

      <!-- Preço destaque -->
      <div class="preco-destaque-card" onclick="irAtePostoDetalhes()">
        <div>
          <div class="preco-destaque-label" id="detalhes-combustivel">Gasolina Comum</div>
          <div class="preco-destaque-valor" id="detalhes-preco-principal">R$ 5,67 <span class="preco-destaque-unit">/L</span></div>
        </div>
        <i class="fas fa-chevron-right preco-destaque-arrow"></i>
      </div>

      <!-- Outros combustíveis -->
      <div id="detalhes-outros-precos">
        <div class="preco-row">
          <span class="preco-row-label">Etanol</span>
          <span class="preco-row-val" id="d-etanol">R$ 3,89</span>
        </div>
        <div class="preco-row">
          <span class="preco-row-label">Diesel S10</span>
          <span class="preco-row-val" id="d-diesel">R$ 6,19</span>
        </div>
        <div class="preco-row">
          <span class="preco-row-label">GNV</span>
          <span class="preco-row-val" id="d-gnv">R$ 4,49</span>
        </div>
      </div>
    </div>

    <!-- Botões de ação -->
    <div class="detalhes-actions">
      <button class="btn-outline" onclick="comoChegar()">
        <i class="fas fa-map-marker-alt"></i> Como chegar
      </button>
      <button class="btn-solid" onclick="irAtePostoDetalhes()">
        <i class="fas fa-route"></i> Ir até lá
      </button>
    </div>

    <!-- Avaliações -->
    <div class="avaliacoes-section">
      <div class="section-title">
        Avaliações
        <span class="section-link" onclick="verTodasAvaliacoes()">Ver todas</span>
      </div>
      <div class="review-card" id="review-card">
        <div class="review-header">
          <div class="review-avatar" id="review-avatar">J</div>
          <div>
            <div class="review-name" id="review-nome">João M.</div>
            <div class="review-date">Hoje</div>
          </div>
          <div class="review-stars">
            <i class="fas fa-star"></i><i class="fas fa-star"></i>
            <i class="fas fa-star"></i><i class="fas fa-star"></i>
            <i class="fas fa-star"></i>
          </div>
        </div>
        <div class="review-text" id="review-texto">Ótimo atendimento e preço justo!</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════
     TELA 10: PLANEJAR ROTA (view-planejar)
═══════════════════════════════════════════════════════ -->
<section id="view-planejar" class="view">
  <div class="planejar-header">
    <div class="planejar-header-row">
      <button class="planejar-back" onclick="irPara('view-mapa')"><i class="fas fa-arrow-left"></i></button>
      <div class="planejar-title">Planejar rota</div>
    </div>
    <div class="rota-inputs">
      <div class="rota-input-row">
        <div class="rota-dot origin"></div>
        <input type="text" class="rota-input-field" id="rota-origem" placeholder="De: Minha localização" value="Minha localização"/>
      </div>
      <div style="padding-left:5px;"><div class="rota-line"></div></div>
      <div class="rota-input-row">
        <div class="rota-dot dest"></div>
        <input type="text" class="rota-input-field" id="rota-destino" placeholder="Para: Posto Shell"/>
      </div>
    </div>
  </div>
  <div id="rota-map-container">
    <div id="rota-map"></div>
    <!-- Resumo -->
    <div class="rota-resumo" id="rota-resumo" style="display:none">
      <div class="rota-stat">
        <div class="rota-stat-val" id="rota-dist">1,2 km</div>
        <div class="rota-stat-label">Distância</div>
      </div>
      <div class="rota-divider"></div>
      <div class="rota-stat">
        <div class="rota-stat-val" id="rota-tempo">3 min</div>
        <div class="rota-stat-label">Tempo</div>
      </div>
    </div>
    <button class="btn-iniciar-nav" id="btn-nav" onclick="iniciarNavegacao()">
      <i class="fas fa-play"></i> Iniciar navegação
    </button>
  </div>
</section>

<!-- ═══════════════════════════════════════════════════════
     TELA 11: RELATÓRIOS / PERFIL (view-perfil)
═══════════════════════════════════════════════════════ -->
<section id="view-perfil" class="view">
  <!-- Header simples -->
  <div class="app-header">
    <div style="width:36px"></div>
    <div style="font-size:18px;font-weight:900;color:var(--branco);">Meus relatórios</div>
    <button class="header-bell-btn"><i class="fas fa-ellipsis-v"></i></button>
  </div>

  <div class="perfil-scroll">
    <!-- Period tabs -->
    <div class="period-tabs">
      <button class="period-tab" onclick="setPeriodo('semana',this)">Semana</button>
      <button class="period-tab active" onclick="setPeriodo('mes',this)">Mês</button>
      <button class="period-tab" onclick="setPeriodo('ano',this)">Ano</button>
    </div>

    <!-- Navegação mês -->
    <div class="month-nav">
      <button class="month-nav-btn" onclick="mesAnterior()"><i class="fas fa-chevron-left"></i></button>
      <span class="month-nav-label" id="mes-label">Maio 2024</span>
      <button class="month-nav-btn" onclick="mesSeguinte()"><i class="fas fa-chevron-right"></i></button>
    </div>

    <!-- Economia destaque -->
    <div class="economia-card">
      <div class="economia-label">Total economizado</div>
      <div class="economia-valor" id="economia-valor">R$ 289,60</div>
      <div class="economia-sub" id="economia-sub">comparado ao preço médio da região</div>
    </div>

    <!-- Stats grid -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-card-label">Abastecimentos</div>
        <div class="stat-card-val" id="stat-abast">8</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Gasto total</div>
        <div class="stat-card-val" id="stat-gasto">R$ 412,30</div>
      </div>
    </div>

    <!-- Economia por litro -->
    <div class="eco-litro-card">
      <div class="eco-litro-label">Economia por litro</div>
      <div class="eco-litro-val">
        R$ <span id="eco-litro">0,36</span>
        <i class="fas fa-chevron-right" style="font-size:14px;color:var(--cinza);"></i>
      </div>
    </div>

    <!-- Ranking postos -->
    <div class="postos-ranking">
      <div class="postos-ranking-title">Postos mais abastecidos</div>
      <div class="ranking-item">
        <div class="ranking-logo">🐚</div>
        <div class="ranking-nome">Posto Shell</div>
        <div class="ranking-vezes">3 vezes</div>
      </div>
      <div class="ranking-item">
        <div class="ranking-logo">🟡</div>
        <div class="ranking-nome">Posto Ipiranga</div>
        <div class="ranking-vezes">2 vezes</div>
      </div>
      <div class="ranking-item">
        <div class="ranking-logo">🔵</div>
        <div class="ranking-nome">Posto BR</div>
        <div class="ranking-vezes">2 vezes</div>
      </div>
      <div class="ranking-item">
        <div class="ranking-logo">⚪</div>
        <div class="ranking-nome">Outros</div>
        <div class="ranking-vezes">1 vez</div>
      </div>
    </div>

    <!-- Perfil usuário -->
    <div class="perfil-user-card" id="perfil-user-card">
      <div class="perfil-avatar" id="perfil-avatar">U</div>
      <div class="perfil-nome" id="perfil-nome">Usuário</div>
      <div class="perfil-email" id="perfil-email">usuario@email.com</div>
      <div class="perfil-badge"><i class="fas fa-star"></i> Plano Gratuito</div>
    </div>

    <!-- Botão sair -->
    <button onclick="sair()" style="width:100%;height:48px;background:transparent;border:2px solid rgba(239,68,68,0.3);border-radius:14px;color:#EF4444;font-family:'Raleway',sans-serif;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
      <i class="fas fa-sign-out-alt"></i> Sair da conta
    </button>
  </div>
</section>

<!-- ═══════════════════ BOTTOM NAV ═══════════════════ -->
<nav id="bottom-nav">
  <button class="nav-item active" id="nav-melhor" onclick="irPara('view-mapa')">
    <i class="fas fa-star"></i>
    <span>Melhor★</span>
  </button>
  <button class="nav-item" id="nav-lista" onclick="irPara('view-lista')">
    <i class="fas fa-list"></i>
    <span>Lista</span>
  </button>
  <button class="nav-item" id="nav-mapa" onclick="irPara('view-mapa')">
    <i class="fas fa-map-marker-alt"></i>
    <span>Mapa</span>
  </button>
  <button class="nav-item" id="nav-planejar" onclick="irPara('view-planejar')">
    <i class="fas fa-route"></i>
    <span>Planejar</span>
  </button>
  <button class="nav-item" id="nav-perfil" onclick="irPara('view-perfil')">
    <i class="fas fa-user"></i>
    <span>Perfil</span>
  </button>
</nav>

<!-- TOAST -->
<div id="toast"></div>

<!-- ═══════════════════ SCRIPTS ═══════════════════ -->
<script>
// ══════════════════════════════════════════════════
// ESTADO GLOBAL
// ══════════════════════════════════════════════════
let _mapa = null;
let _rotaMapa = null;
let _postos = [];
let _postoAtual = null;
let _userLat = null;
let _userLng = null;
let _combustivelAtivo = 'gasolina';
let _markersLayer = null;
let _userMarker = null;

// ══════════════════════════════════════════════════
// NAVEGAÇÃO
// ══════════════════════════════════════════════════
function irPara(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');

  // Atualizar nav ativo
  const navMap = {
    'view-mapa':     ['nav-melhor','nav-mapa'],
    'view-lista':    ['nav-lista'],
    'view-planejar': ['nav-planejar'],
    'view-perfil':   ['nav-perfil'],
    'view-detalhes': ['nav-lista']
  };
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  (navMap[viewId] || []).forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
  });

  // Init mapa se necessário
  if(viewId === 'view-mapa' && !_mapa) {
    setTimeout(initMapa, 100);
  }
  if(viewId === 'view-planejar' && !_rotaMapa) {
    setTimeout(initRotaMapa, 100);
  }
}

function voltarDaDetalhes() {
  irPara('view-lista');
}

// ══════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════
function toast(msg, dur=3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

// ══════════════════════════════════════════════════
// MAPA LEAFLET (Tela 7)
// ══════════════════════════════════════════════════
function initMapa() {
  if(_mapa) return;
  _mapa = L.map('leaflet-map', {
    center: [-23.5505, -46.6333],
    zoom: 14,
    zoomControl: false,
    attributionControl: false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(_mapa);

  L.control.zoom({ position: 'bottomright' }).addTo(_mapa);

  _markersLayer = L.layerGroup().addTo(_mapa);

  // Obter localização
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      _userLat = pos.coords.latitude;
      _userLng = pos.coords.longitude;
      _mapa.setView([_userLat, _userLng], 14);
      addUserMarker(_userLat, _userLng);
      carregarPostos(_userLat, _userLng);
    }, () => {
      // São Paulo centro como fallback
      _userLat = -23.5505; _userLng = -46.6333;
      addUserMarker(_userLat, _userLng);
      carregarPostos(_userLat, _userLng);
    });
  } else {
    _userLat = -23.5505; _userLng = -46.6333;
    carregarPostos(_userLat, _userLng);
  }
}

function addUserMarker(lat, lng) {
  if(_userMarker) _userMarker.remove();
  const icon = L.divIcon({
    html: '<div style="width:16px;height:16px;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.2)"></div>',
    className: '', iconAnchor: [8,8]
  });
  _userMarker = L.marker([lat, lng], { icon }).addTo(_mapa);
}

function centralizarMapa() {
  if(_mapa && _userLat) {
    _mapa.setView([_userLat, _userLng], 15);
  } else {
    toast('Localizando você...');
    initMapa();
  }
}

function carregarPostos(lat, lng) {
  fetch('/api/postos?lat='+lat+'&lng='+lng+'&raio=3000')
    .then(r => r.json())
    .then(data => {
      _postos = data.postos || [];
      renderPostosNoMapa(_postos);
      renderListaPostos(_postos);
      document.getElementById('loading-overlay').classList.add('hidden');
      // Mostrar melhor posto no card
      if(_postos.length > 0) mostrarCardMelhor(_postos[0]);
    })
    .catch(() => {
      // Dados mock se API falhar
      _postos = getDadosMock(lat, lng);
      renderPostosNoMapa(_postos);
      renderListaPostos(_postos);
      document.getElementById('loading-overlay').classList.add('hidden');
      if(_postos.length > 0) mostrarCardMelhor(_postos[0]);
    });
}

function getDadosMock(lat, lng) {
  const marcas = [
    { nome: 'Posto Shell', emoji: '🐚', cor: '#FF6600' },
    { nome: 'Posto Ipiranga', emoji: '🟡', cor: '#FFC107' },
    { nome: 'Posto BR', emoji: '🔵', cor: '#1565C0' },
    { nome: 'Posto Ale', emoji: '🔴', cor: '#E53935' },
    { nome: 'Posto Raízen', emoji: '🟢', cor: '#2E7D32' },
  ];
  return marcas.map((m, i) => ({
    id: 'mock_'+i,
    nome: m.nome,
    emoji: m.emoji,
    cor: m.cor,
    lat: lat + (Math.random()-0.5)*0.04,
    lng: lng + (Math.random()-0.5)*0.04,
    endereco: 'Av. Exemplo, '+(1000+i*200)+' - São Paulo, SP',
    distancia: (0.8 + i*0.4).toFixed(1),
    tempo: (3 + i*2),
    rating: (4.1 + Math.random()*0.8).toFixed(1),
    avaliacoes: Math.floor(50 + Math.random()*200),
    precos: {
      gasolina: (5.50 + i*0.09).toFixed(2),
      etanol:   (3.80 + i*0.06).toFixed(2),
      diesel:   (6.10 + i*0.05).toFixed(2),
      gnv:      (4.40 + i*0.04).toFixed(2),
    }
  }));
}

function renderPostosNoMapa(postos) {
  if(!_mapa || !_markersLayer) return;
  _markersLayer.clearLayers();
  postos.forEach((p, idx) => {
    const preco = p.precos?.[_combustivelAtivo] || p.preco || '0.00';
    const isBest = idx === 0;
    const icon = L.divIcon({
      html: \`<div class="price-pin \${isBest?'best':''}" onclick="abrirDetalhes('\${p.id}')">R$ \${preco}</div>\`,
      className: '', iconAnchor: [30, 30]
    });
    L.marker([p.lat, p.lng], { icon }).addTo(_markersLayer);
  });
}

function mostrarCardMelhor(posto) {
  document.getElementById('mapa-posto-logo').textContent = posto.emoji || '⛽';
  document.getElementById('mapa-posto-nome').textContent = posto.nome;
  document.getElementById('mapa-posto-meta').textContent =
    posto.distancia + ' km · ' + posto.tempo + ' min · ★ ' + posto.rating;
  const preco = posto.precos?.[_combustivelAtivo] || posto.preco || '--';
  document.getElementById('mapa-posto-preco').textContent = 'R$ ' + preco;
  document.getElementById('card-melhor').classList.add('show');
  _postoAtual = posto;
}

function fecharCardMelhor() {
  document.getElementById('card-melhor').classList.remove('show');
}

function irAtePostoMapa() {
  if(_postoAtual) abrirRota(_postoAtual);
}

// ══════════════════════════════════════════════════
// LISTA DE POSTOS (Tela 8)
// ══════════════════════════════════════════════════
function renderListaPostos(postos) {
  const container = document.getElementById('lista-postos-scroll');
  if(!postos || postos.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--cinza)"><i class="fas fa-gas-pump" style="font-size:32px;margin-bottom:12px;display:block;opacity:0.4"></i>Nenhum posto encontrado</div>';
    return;
  }

  const combustivel = _combustivelAtivo;
  const sorted = [...postos].sort((a,b) =>
    parseFloat(a.precos?.[combustivel]||9) - parseFloat(b.precos?.[combustivel]||9)
  );

  container.innerHTML = sorted.map((p, i) => {
    const preco = p.precos?.[combustivel] || '–';
    const isBest = i === 0;
    return \`
    <div class="posto-card" onclick="abrirDetalhes('\${p.id}')">
      <div class="posto-logo">\${p.emoji || '⛽'}</div>
      <div class="posto-info">
        <div class="posto-nome">\${p.nome}</div>
        <div class="posto-meta">
          <div class="posto-stars"><i class="fas fa-star"></i> \${p.rating}</div>
          <span class="posto-dist">\${p.distancia} km · \${p.tempo} min</span>
        </div>
        \${isBest ? '<div class="badge-best">✓ Melhor preço</div>' : ''}
      </div>
      <div class="posto-preco-col">
        <div class="posto-preco \${isBest?'best':''}">R$ \${preco}</div>
        <div class="posto-dist-time">\${p.distancia} km · \${p.tempo} min</div>
      </div>
    </div>\`;
  }).join('');
}

function setFuel(fuel, btn) {
  _combustivelAtivo = fuel;
  document.querySelectorAll('.fuel-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderListaPostos(_postos);
  renderPostosNoMapa(_postos);
}

function filtrarLista(q) {
  if(!q) { renderListaPostos(_postos); return; }
  const filtrados = _postos.filter(p =>
    p.nome.toLowerCase().includes(q.toLowerCase()) ||
    p.endereco?.toLowerCase().includes(q.toLowerCase())
  );
  renderListaPostos(filtrados);
}

// ══════════════════════════════════════════════════
// DETALHES DO POSTO (Tela 9)
// ══════════════════════════════════════════════════
function abrirDetalhes(id) {
  const posto = _postos.find(p => p.id === id);
  if(!posto) return;
  _postoAtual = posto;

  document.getElementById('detalhes-logo').textContent = posto.emoji || '⛽';
  document.getElementById('detalhes-nome').textContent = posto.nome;
  document.getElementById('detalhes-endereco').textContent = posto.endereco || 'Endereço não disponível';
  document.getElementById('detalhes-rating').textContent = posto.rating;
  document.getElementById('detalhes-avaliacoes').textContent = '(' + (posto.avaliacoes || 0) + ' avaliações)';

  const precos = posto.precos || {};
  document.getElementById('detalhes-preco-principal').innerHTML = 'R$ ' + (precos.gasolina || '–') + '<span class="preco-destaque-unit"> /L</span>';
  document.getElementById('d-etanol').textContent = precos.etanol ? 'R$ '+precos.etanol : '–';
  document.getElementById('d-diesel').textContent = precos.diesel ? 'R$ '+precos.diesel : '–';
  document.getElementById('d-gnv').textContent = precos.gnv ? 'R$ '+precos.gnv : '–';

  // Scroll pro topo
  document.getElementById('detalhes-scroll').scrollTop = 0;

  irPara('view-detalhes');
}

function irAtePostoDetalhes() {
  if(_postoAtual) abrirRota(_postoAtual);
}

function comoChegar() {
  if(_postoAtual) {
    const url = 'https://maps.google.com/?q=' + _postoAtual.lat + ',' + _postoAtual.lng;
    window.open(url, '_blank');
  }
}

function verTodasAvaliacoes() {
  toast('Avaliações em breve!');
}

// ══════════════════════════════════════════════════
// PLANEJAR ROTA (Tela 10)
// ══════════════════════════════════════════════════
let _rotaLayer = null;

function initRotaMapa() {
  if(_rotaMapa) return;
  _rotaMapa = L.map('rota-map', {
    center: [-23.5505, -46.6333],
    zoom: 14,
    zoomControl: false,
    attributionControl: false
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(_rotaMapa);
  L.control.zoom({ position: 'bottomright' }).addTo(_rotaMapa);
}

function abrirRota(posto) {
  _postoAtual = posto;
  document.getElementById('rota-destino').value = posto.nome;

  // Calcular rota
  if(_userLat && posto) {
    document.getElementById('rota-dist').textContent = posto.distancia + ' km';
    document.getElementById('rota-tempo').textContent = posto.tempo + ' min';
    document.getElementById('rota-resumo').style.display = 'flex';
  }

  irPara('view-planejar');

  setTimeout(() => {
    if(!_rotaMapa) initRotaMapa();
    if(_userLat && posto) {
      _rotaMapa.setView(
        [(_userLat + posto.lat)/2, (_userLng + posto.lng)/2],
        14
      );
      if(_rotaLayer) _rotaLayer.remove();
      // Linha da rota
      _rotaLayer = L.layerGroup().addTo(_rotaMapa);
      L.polyline([[_userLat, _userLng], [posto.lat, posto.lng]], {
        color: '#3B82F6', weight: 4, opacity: 0.9,
        dashArray: '10,6'
      }).addTo(_rotaLayer);
      // Marcadores
      const origemIcon = L.divIcon({
        html: '<div style="width:14px;height:14px;background:#4ADE80;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
        className: '', iconAnchor: [7,7]
      });
      const destIcon = L.divIcon({
        html: '<div style="width:14px;height:14px;background:#EF4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
        className: '', iconAnchor: [7,7]
      });
      L.marker([_userLat, _userLng], { icon: origemIcon }).addTo(_rotaLayer);
      L.marker([posto.lat, posto.lng], { icon: destIcon }).addTo(_rotaLayer);
    }
  }, 300);
}

function iniciarNavegacao() {
  if(_postoAtual) {
    const url = 'https://maps.google.com/maps?daddr=' + _postoAtual.lat + ',' + _postoAtual.lng;
    window.open(url, '_blank');
  } else {
    toast('Selecione um posto para navegar.');
  }
}

// ══════════════════════════════════════════════════
// RELATÓRIOS (Tela 11)
// ══════════════════════════════════════════════════
const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let _mesAtual = 4; // Maio = index 4
let _anoAtual = 2024;

function setPeriodo(p, btn) {
  document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  atualizarRelatorio();
}

function mesAnterior() {
  if(_mesAtual === 0) { _mesAtual = 11; _anoAtual--; }
  else _mesAtual--;
  atualizarRelatorio();
}

function mesSeguinte() {
  if(_mesAtual === 11) { _mesAtual = 0; _anoAtual++; }
  else _mesAtual++;
  atualizarRelatorio();
}

function atualizarRelatorio() {
  document.getElementById('mes-label').textContent = meses[_mesAtual] + ' ' + _anoAtual;
}

// ══════════════════════════════════════════════════
// BUSCA NO MAPA
// ══════════════════════════════════════════════════
let _buscaTimeout;
function debounceBusca(q) {
  clearTimeout(_buscaTimeout);
  if(!q) return;
  _buscaTimeout = setTimeout(() => buscarEndereco(q), 600);
}

function buscarEndereco(q) {
  fetch('/api/geocode?q='+encodeURIComponent(q))
    .then(r => r.json())
    .then(data => {
      if(data.lat && _mapa) {
        _mapa.setView([data.lat, data.lng], 14);
        carregarPostos(data.lat, data.lng);
      }
    })
    .catch(() => {});
}

// ══════════════════════════════════════════════════
// PERFIL / AUTH
// ══════════════════════════════════════════════════
function carregarPerfil() {
  try {
    const u = JSON.parse(localStorage.getItem('rp_user') || '{}');
    if(u.nome) {
      document.getElementById('perfil-nome').textContent = u.nome;
      document.getElementById('perfil-email').textContent = u.email || '';
      document.getElementById('perfil-avatar').textContent = (u.nome||'U')[0].toUpperCase();
    }
  } catch(e) {}
}

function sair() {
  localStorage.removeItem('rp_user');
  localStorage.removeItem('rp_veiculo');
  window.location.href = '/onboarding';
}

function toggleMenu() {
  toast('Menu em breve!');
}

function abrirNotificacoes() {
  toast('Sem novas notificações.');
}

// ══════════════════════════════════════════════════
// FIREBASE AUTH CHECK
// ══════════════════════════════════════════════════
let _appFirebaseAuth = null;

function initFirebaseApp() {
  if(!window._fbGetAuth || !window._fbFirebaseApp) return;
  try {
    _appFirebaseAuth = window._fbGetAuth(window._fbFirebaseApp);
    window._fbOnAuthStateChanged(_appFirebaseAuth, user => {
      if(!user) {
        // Verificar localStorage antes de redirecionar
        const stored = localStorage.getItem('rp_user');
        if(!stored) {
          window.location.href = '/onboarding';
        } else {
          document.getElementById('loading-overlay').classList.add('hidden');
          iniciarApp();
        }
      } else {
        window._firebaseUser = user;
        document.getElementById('loading-overlay').classList.add('hidden');
        iniciarApp();
      }
    });
  } catch(e) {
    document.getElementById('loading-overlay').classList.add('hidden');
    iniciarApp();
  }
}

function iniciarApp() {
  carregarPerfil();
  initMapa();
}

// ══════════════════════════════════════════════════
// SERVICE WORKER
// ══════════════════════════════════════════════════
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => {
      reg.update();
      reg.addEventListener('updatefound', () => {
        const novoSW = reg.installing;
        if(novoSW) {
          novoSW.addEventListener('statechange', () => {
            if(novoSW.state === 'installed' && navigator.serviceWorker.controller) {
              novoSW.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    })
    .catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// ══════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════
let _fbRetry = 0;
function tryInitFirebase() {
  if(window._fbGetAuth && window._fbFirebaseApp) {
    initFirebaseApp();
  } else if(_fbRetry++ < 20) {
    setTimeout(tryInitFirebase, 300);
  } else {
    // Firebase não carregou, continuar sem auth
    document.getElementById('loading-overlay').classList.add('hidden');
    iniciarApp();
  }
}
tryInitFirebase();

</script>
</body>
</html>`
}
