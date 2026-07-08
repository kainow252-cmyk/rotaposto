// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – App Principal (Telas 7-12)
//  Design pixel-perfect conforme referências do usuário
//  Tema: BRANCO com laranja #FF6D00, mapa claro
// ═══════════════════════════════════════════════════════════════════════

// Extensões globais do window usadas dentro dos scripts HTML embutidos
declare global {
  interface Window {
    _mascaraCPF: (el: HTMLInputElement) => void;
    _deferredInstallPrompt: any;
  }
}

export function getAppHTML(firebaseScripts: string, googleApiKey?: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
  <meta name="theme-color" content="#FF6D00"/>
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black"/>
  <meta name="apple-mobile-web-app-title" content="RotaPosto"/>
  <title>RotaPosto</title>
  <link rel="manifest" href="/manifest.json"/>
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png"/>
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  ${firebaseScripts}
  <!-- Google Identity Services — One Tap (reconhece conta automaticamente no Android) -->
  <script src="https://accounts.google.com/gsi/client" async defer><\/script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

    :root {
      --orange: #FF6D00;
      --orange-dark: #E65100;
      --orange-light: #FFF3E0;
      --black: #1A1A1A;
      --gray-dark: #444;
      --gray: #777;
      --gray-light: #BBB;
      --gray-bg: #F5F5F5;
      --gray-card: #FAFAFA;
      --white: #FFFFFF;
      --green: #00C853;
      --green-text: #2E7D32;
      --green-bg: #E8F5E9;
      --red: #E53935;
      --red-bg: #FFEBEE;
      --blue: #1565C0;
      --border: #E0E0E0;
      --shadow: 0 2px 12px rgba(0,0,0,0.08);
      --shadow-strong: 0 4px 24px rgba(0,0,0,0.15);
      --radius: 16px;
      --radius-sm: 10px;
      --sat: env(safe-area-inset-top, 0px);
      --sab: env(safe-area-inset-bottom, 0px);
      --nav-h: 64px;
      --header-h: 110px;
    }

    html, body {
      width: 100%; height: 100%;
      background: #F5F5F5;
      font-family: 'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--gray-bg);
      overflow: hidden;
    }

    /* ── LAYOUT PRINCIPAL ── */
    #app-root {
      width: 100%; height: 100dvh;
      position: fixed; inset: 0;
      display: flex; flex-direction: column;
      background: var(--white);
      overflow: hidden;
      /* Espaço para o bottom-nav fixo */
      padding-bottom: calc(var(--nav-h) + var(--sab));
    }

    /* ══════════════════════════════════════════════
       HEADER FIXO (Telas 7 e 8)
    ══════════════════════════════════════════════ */
    #app-header {
      background: var(--white);
      padding: calc(var(--sat) + 14px) 20px 0;
      border-bottom: 1px solid var(--border);
      position: relative; z-index: 200;
    }

    .header-row-1 {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }

    .btn-menu {
      width: 40px; height: 40px;
      display: flex; flex-direction: column; justify-content: center; gap: 5px;
      background: none; border: none; cursor: pointer; padding: 4px;
    }
    .btn-menu span {
      display: block; width: 22px; height: 2px;
      background: var(--black); border-radius: 2px;
    }

    .header-logo {
      font-size: 22px; font-weight: 900; letter-spacing: -0.5px;
      font-family: 'Roboto', sans-serif;
    }
    .header-logo .rota { color: var(--black); }
    .header-logo .posto { color: var(--orange); }

    .btn-bell {
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer; color: var(--black);
      position: relative;
    }
    .btn-bell svg { width: 22px; height: 22px; }
    .bell-dot {
      position: absolute; top: 7px; right: 7px;
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--orange); border: 1.5px solid var(--white);
    }

    /* Barra de busca */
    .search-bar {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 12px;
    }
    .search-wrap { flex: 1; position: relative; }
    .search-wrap svg {
      position: absolute; left: 13px; top: 50%;
      transform: translateY(-50%);
      width: 18px; height: 18px; color: var(--gray);
    }
    .search-input {
      width: 100%; padding: 11px 12px 11px 38px;
      background: var(--gray-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 14px; color: var(--black);
      outline: none;
    }
    .search-input::placeholder { color: var(--gray-light); }
    .btn-filter {
      width: 42px; height: 42px; flex-shrink: 0; position: relative;
      display: flex; align-items: center; justify-content: center;
      background: none; border: 1px solid var(--border);
      border-radius: 10px; cursor: pointer; color: var(--gray-dark);
    }
    .btn-filter.ativo { border-color: var(--orange); color: var(--orange); background: #FFF5EE; }

    /* Chips combustível */
    .chips-row {
      display: flex; gap: 8px;
      overflow-x: auto; scrollbar-width: none;
      padding-bottom: 12px;
    }
    .chips-row::-webkit-scrollbar { display: none; }
    .chip-fuel {
      padding: 7px 16px; border-radius: 20px;
      border: 1.5px solid var(--border);
      background: var(--white);
      font-family: 'Inter', sans-serif;
      font-size: 13px; font-weight: 600;
      color: var(--gray-dark); cursor: pointer;
      white-space: nowrap; flex-shrink: 0;
      transition: all 0.2s;
    }
    .chip-fuel.active {
      background: var(--black); border-color: var(--black); color: var(--white);
    }

    /* ══════════════════════════════════════════════
       CONTEÚDO / VIEWS
    ══════════════════════════════════════════════ */
    #app-content {
      flex: 1 1 0;
      min-height: 0;   /* permite shrink correto no flex column */
      overflow: hidden; position: relative;
      /* overflow:hidden necessário para o mapa Leaflet não vazar */
      /* O nav está em position:fixed, então o app-content usa todo o espaço disponível */
    }

    .view { display: none; width: 100%; height: 100%; position: absolute; inset: 0; overflow: hidden; background: var(--white); }
    .view.active { display: flex; flex-direction: column; z-index: 10; }
    /* Views com scroll simples (página inteira faz scroll) */
    #view-lista.active,
    #view-relatorios.active,
    #view-planejar.active,
    #view-detalhes.active { overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
    /* SOS tem header fixo + body scrollável internamente — NÃO usar overflow na view */
    #view-sos.active { overflow: hidden; }

    /* ══════════════════════════════════════════════
       TELA 7: MAPA
    ══════════════════════════════════════════════ */
    #view-mapa {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    /* Quando o mapa NÃO está ativo, esconder todos os panes do Leaflet
       para evitar tiles vazando sobre outras views */
    #view-mapa:not(.active) .leaflet-pane,
    #view-mapa:not(.active) .leaflet-control,
    #view-mapa:not(.active) .leaflet-top,
    #view-mapa:not(.active) .leaflet-bottom {
      display: none !important;
    }

    #map-leaflet {
      flex: 1; width: 100%;
      min-height: 0;
      /* Garantir que o Leaflet sempre tenha altura calculável */
      height: 100%;
    }

    /* Card inferior: Melhor posto próximo */
    #map-card {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: var(--white);
      border-radius: var(--radius) var(--radius) 0 0;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
      padding: 12px 16px calc(var(--sab) + 12px);
      z-index: 500;
    }

    .map-card-label {
      font-size: 11px; font-weight: 600;
      color: var(--gray); margin-bottom: 8px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .btn-close-card {
      width: 26px; height: 26px;
      background: var(--gray-bg); border: none; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--gray);
    }

    .map-posto-row {
      display: flex; align-items: center; gap: 10px;
    }

    .posto-logo-circle {
      width: 42px; height: 42px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
      border: 1.5px solid var(--border);
      overflow: hidden; background: var(--gray-bg);
    }
    .posto-logo-circle img {
      width: 100%; height: 100%; object-fit: contain;
    }

    .map-posto-info { flex: 1; min-width: 0; overflow: hidden; }
    .map-posto-nome {
      font-size: 12px; font-weight: 700; color: var(--black);
      margin-bottom: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      text-transform: uppercase; letter-spacing: 0.3px;
      font-family: 'Roboto', sans-serif;
    }
    .map-posto-preco {
      font-size: 20px; font-weight: 900; color: #1A237E;
      margin-bottom: 1px; line-height: 1.1;
      font-family: 'Roboto', sans-serif;
    }
    .map-posto-dist {
      font-size: 11px; color: var(--gray); font-weight: 500;
    }

    .btn-ir-ata-la {
      padding: 10px 14px;
      background: var(--orange); border: none; border-radius: 10px;
      color: var(--white); font-family: 'Inter', sans-serif;
      font-size: 13px; font-weight: 700;
      cursor: pointer; flex-shrink: 0;
      transition: opacity 0.2s; white-space: nowrap;
    }
    .btn-ir-ata-la:active { opacity: 0.85; }

    /* Balões de preço no mapa */
    .price-balloon {
      padding: 5px 10px; border-radius: 6px;
      font-size: 13px; font-weight: 700; color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      cursor: pointer; white-space: nowrap;
    }
    .price-balloon.green { background: #00A651; }
    .price-balloon.orange { background: #FF6D00; }
    .price-balloon.red { background: #E53935; }

    /* ══════════════════════════════════════════════
       TELA 8: LISTA DE POSTOS
    ══════════════════════════════════════════════ */
    #view-lista {
      /* overflow-y gerenciado pelo seletor .active acima */
    }

    #lista-container {
      padding: 8px 0 calc(var(--sab) + 80px);
    }

    .posto-item {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      cursor: pointer; background: var(--white);
      transition: background 0.15s;
    }
    .posto-item:active { background: var(--gray-bg); }

    .posto-brand-logo {
      width: 50px; height: 50px; border-radius: 50%;
      flex-shrink: 0; overflow: hidden;
      border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; background: var(--white);
    }

    .posto-item-info { flex: 1; min-width: 0; }
    .posto-item-nome {
      font-size: 14px; font-weight: 700; color: var(--black);
      margin-bottom: 3px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      text-transform: uppercase; letter-spacing: 0.3px;
      font-family: 'Roboto', sans-serif;
    }
    .posto-item-rating {
      display: flex; align-items: center; gap: 5px;
      font-size: 13px; color: var(--gray-dark);
    }
    .star-icon { color: #FFC107; font-size: 13px; }
    .rating-val { font-weight: 600; color: var(--gray-dark); }
    .green-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--green); flex-shrink: 0;
    }

    .posto-item-preco {
      text-align: right; flex-shrink: 0;
    }
    .posto-item-preco .preco-val {
      font-size: 22px; font-weight: 900; color: #1A237E;
      white-space: nowrap; font-family: 'Roboto', sans-serif;
      line-height: 1.1;
    }
    .posto-item-preco .preco-rs {
      font-size: 13px; font-weight: 700; color: #1A237E;
      vertical-align: top; margin-top: 3px; display: inline-block;
    }
    .posto-item-preco .preco-unit {
      font-size: 11px; font-weight: 500; color: var(--gray);
    }
    .posto-item-preco .dist-txt {
      font-size: 11px; color: var(--gray);
      margin-top: 4px;
    }
    .posto-item-preco .preco-estimado {
      color: #999;
    }

    /* ══════════════════════════════════════════════
       TELA 9: DETALHES DO POSTO
    ══════════════════════════════════════════════ */
    #view-detalhes {
      /* overflow-y gerenciado pelo seletor .active acima */
      background: var(--white);
    }

    #det-header {
      position: relative; height: 220px; flex-shrink: 0;
      background: linear-gradient(135deg, #1A1A2E, #2D2D44);
      overflow: hidden;
    }

    #det-hero-img {
      width: 100%; height: 100%; object-fit: cover; opacity: 0.7;
    }

    .det-overlay-btns {
      position: absolute; top: calc(var(--sat) + 12px); left: 0; right: 0;
      padding: 0 16px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .det-btn-icon {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(0,0,0,0.35); border: none;
      display: flex; align-items: center; justify-content: center;
      color: white; cursor: pointer; backdrop-filter: blur(4px);
    }
    .det-btn-group { display: flex; gap: 8px; }

    #det-logo-badge {
      position: absolute; bottom: -24px; left: 20px;
      width: 52px; height: 52px; border-radius: 50%;
      background: white; border: 3px solid white;
      box-shadow: var(--shadow);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; overflow: hidden;
    }

    #det-body {
      padding: 36px 20px calc(var(--sab) + 80px);
    }

    #det-nome {
      font-size: 22px; font-weight: 800; color: var(--black);
      margin-bottom: 4px;
    }
    #det-endereco {
      font-size: 13px; color: var(--gray); line-height: 1.5;
      margin-bottom: 10px;
    }

    #det-info-row {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 18px;
    }
    .det-stars { display: flex; gap: 2px; }
    .det-star { color: #FFC107; font-size: 15px; }
    .det-rating-count { font-size: 13px; color: var(--gray); }
    .badge-aberto {
      padding: 3px 10px; border-radius: 100px;
      background: var(--green-bg); color: var(--green-text);
      font-size: 12px; font-weight: 700;
    }

    /* Card preço destaque */
    #det-preco-destaque {
      background: var(--green-bg);
      border: 1px solid rgba(0,200,83,0.2);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      margin-bottom: 16px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .det-comb-nome { font-size: 13px; font-weight: 600; color: var(--green-text); }
    .det-comb-preco { font-size: 22px; font-weight: 900; color: var(--green-text); }
    .det-arrow svg { width: 18px; height: 18px; color: var(--green-text); }

    /* Lista combustíveis */
    .det-fuel-list { margin-bottom: 20px; }
    .det-fuel-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }
    .det-fuel-row:last-child { border-bottom: none; }
    .det-fuel-nome { font-size: 14px; color: var(--gray-dark); font-weight: 500; }
    .det-fuel-price { font-size: 14px; font-weight: 700; color: var(--black); }

    /* Botões ação */
    .det-btns {
      display: flex; gap: 10px; margin-bottom: 28px;
    }
    .btn-como-chegar {
      flex: 1; padding: 14px;
      background: var(--white); border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 14px; font-weight: 700; color: var(--black);
      cursor: pointer; transition: background 0.15s;
    }
    .btn-como-chegar:active { background: var(--gray-bg); }
    .btn-ir-la {
      flex: 1; padding: 14px;
      background: var(--orange); border: none;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 14px; font-weight: 700; color: var(--white);
      cursor: pointer; transition: opacity 0.2s;
    }
    .btn-ir-la:active { opacity: 0.85; }

    /* Avaliações */
    .det-section-title {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 14px;
    }
    .det-section-title h3 { font-size: 16px; font-weight: 800; color: var(--black); }
    .link-ver-todas { font-size: 13px; font-weight: 600; color: var(--orange); background: none; border: none; cursor: pointer; }

    .review-card {
      background: var(--gray-card);
      border-radius: var(--radius-sm);
      padding: 14px;
    }
    .review-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
    }
    .review-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      object-fit: cover; flex-shrink: 0;
      background: #DDD;
    }
    .review-name { font-size: 14px; font-weight: 700; color: var(--black); }
    .review-date { font-size: 12px; color: var(--gray); }
    .review-stars { color: #FFC107; font-size: 14px; margin-bottom: 6px; }
    .review-text { font-size: 13px; color: var(--gray-dark); line-height: 1.5; }

    /* ══════════════════════════════════════════════
       TELA 10: PLANEJAR ROTA
    ══════════════════════════════════════════════ */
    #view-planejar {
      background: var(--white);
      /* overflow-y gerenciado pelo seletor .active acima */
    }

    #plan-header {
      display: flex; align-items: center; gap: 14px;
      padding: calc(var(--sat) + 16px) 20px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--white);
      position: sticky; top: 0; z-index: 10;
      flex-shrink: 0;
    }
    #plan-title {
      font-size: 18px; font-weight: 800; color: var(--black);
    }
    .btn-back-plan {
      width: 38px; height: 38px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer; color: var(--black);
    }

    #plan-body { padding: 20px 20px calc(var(--sab) + 80px); }

    /* Campos de rota */
    .route-fields {
      background: var(--gray-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden; margin-bottom: 16px;
    }
    .route-field {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; min-height: 56px;
    }
    .route-field + .route-field {
      border-top: 1px solid var(--border);
    }
    .route-dot-origin {
      width: 14px; height: 14px; border-radius: 50%;
      background: #1565C0; flex-shrink: 0;
    }
    .route-dot-dest {
      width: 14px; height: 14px; border-radius: 50%;
      background: var(--red); flex-shrink: 0;
    }
    .route-field-content { flex: 1; }
    .route-field-label { font-size: 11px; color: var(--gray); font-weight: 500; }
    .route-field-val { font-size: 14px; font-weight: 600; color: var(--black); }
    .btn-target {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer; color: var(--gray);
    }

    /* Badge melhor rota */
    .route-stats-badge {
      background: var(--gray-bg);
      border-radius: var(--radius-sm);
      padding: 10px 16px;
      margin-bottom: 16px;
    }
    .route-stats-label { font-size: 11px; color: var(--gray); font-weight: 500; margin-bottom: 6px; }
    .route-stats-vals {
      display: flex; align-items: center; gap: 16px;
    }
    .route-stat {
      font-size: 20px; font-weight: 800; color: var(--black);
    }
    .route-stat-sep { width: 1px; height: 24px; background: var(--border); }

    /* Mapa da rota */
    #plan-map {
      height: 240px; border-radius: var(--radius-sm);
      overflow: hidden; margin-bottom: 16px;
      border: 1px solid var(--border);
    }

    /* Card posto destino */
    .plan-posto-card {
      display: flex; align-items: center; gap: 14px;
      background: var(--gray-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      margin-bottom: 20px;
    }
    .plan-posto-logo {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; flex-shrink: 0;
      border: 1px solid var(--border);
    }
    .plan-posto-info { flex: 1; }
    .plan-posto-nome { font-size: 14px; font-weight: 700; color: var(--black); margin-bottom: 2px; }
    .plan-posto-end { font-size: 12px; color: var(--gray); }
    .plan-posto-preco { font-size: 15px; font-weight: 800; color: var(--black); }
    .plan-preco-unit { font-size: 11px; color: var(--gray); font-weight: 500; }

    .btn-iniciar-nav {
      width: 100%; padding: 17px;
      background: var(--orange); border: none; border-radius: 14px;
      color: var(--white); font-family: 'Inter', sans-serif;
      font-size: 17px; font-weight: 700;
      cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 4px 16px rgba(255,109,0,0.4);
      margin-top: 4px;
    }
    .btn-iniciar-nav:active { opacity: 0.85; transform: scale(0.98); }

    /* ── Seletor de veículo na tela Planejar ── */
    #plan-veiculo-selector {
      margin-bottom: 14px;
    }
    #plan-veiculo-selector .plan-sec-label {
      font-size: 12px; font-weight: 700; color: var(--gray);
      text-transform: uppercase; letter-spacing: 0.6px;
      margin-bottom: 8px;
    }
    .plan-car-tabs {
      display: flex; gap: 8px;
    }
    .plan-car-tab {
      flex: 1; display: flex; align-items: center; gap: 9px;
      padding: 11px 13px;
      background: var(--gray-card);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      cursor: pointer; transition: all 0.18s;
      text-align: left;
    }
    .plan-car-tab.active {
      border-color: var(--orange);
      background: var(--orange-light);
    }
    .plan-car-tab-icon { font-size: 22px; flex-shrink: 0; }
    .plan-car-tab-info { flex: 1; overflow: hidden; }
    .plan-car-tab-nome {
      font-size: 13px; font-weight: 700; color: var(--black);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .plan-car-tab-consumo { font-size: 11px; color: var(--gray); }
    .plan-car-add {
      width: 52px; height: 52px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--gray-card); border: 1.5px dashed var(--border);
      border-radius: 12px; font-size: 22px; cursor: pointer;
      color: var(--gray);
    }

    /* ── Painel custo estimado ── */
    #plan-custo-panel {
      background: linear-gradient(135deg, #FF6D00 0%, #E65100 100%);
      border-radius: 14px; padding: 16px 18px;
      margin-bottom: 14px; color: #fff;
    }
    #plan-custo-panel .pcp-titulo {
      font-size: 12px; font-weight: 600; opacity: 0.85;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;
    }
    #plan-custo-panel .pcp-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      gap: 0;
    }
    #plan-custo-panel .pcp-item {
      text-align: center; padding: 4px 0;
    }
    #plan-custo-panel .pcp-item + .pcp-item {
      border-left: 1px solid rgba(255,255,255,0.25);
    }
    #plan-custo-panel .pcp-val {
      font-size: 19px; font-weight: 900; line-height: 1.1;
    }
    #plan-custo-panel .pcp-label {
      font-size: 10px; opacity: 0.8; margin-top: 2px;
    }
    #plan-custo-panel.sem-veiculo {
      background: var(--gray-card);
      border: 1.5px dashed var(--border);
    }
    #plan-custo-panel.sem-veiculo .pcp-titulo,
    #plan-custo-panel.sem-veiculo .pcp-val,
    #plan-custo-panel.sem-veiculo .pcp-label {
      color: var(--gray);
    }
    #plan-custo-panel.sem-veiculo .pcp-item + .pcp-item {
      border-left-color: var(--border);
    }

    /* ── Campo de texto editável de origem ── */
    #plan-origin-input {
      display: none; width: 100%;
      padding: 10px 12px; font-size: 14px; font-family: inherit;
      border: 1.5px solid var(--orange); border-radius: 8px;
      outline: none; box-sizing: border-box;
    }

    /* ── Campo de busca livre de destino ── */
    #plan-dest-wrap { flex: 1; min-width: 0; position: relative; }
    #plan-dest-val {
      font-size: 14px; font-weight: 600; color: var(--black);
      cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      line-height: 1.3;
    }
    #plan-dest-val.placeholder { color: var(--gray); font-weight: 400; }
    #plan-dest-input { display: none !important; height: 0 !important; width: 0 !important; opacity: 0 !important; position: absolute !important; pointer-events: none !important; }
    .plan-dest-label { font-size: 12px; color: var(--gray); margin-bottom: 2px; }

    /* ── Overlay de busca fullscreen ── */
    #plan-busca-overlay {
      display: none;
      position: fixed; inset: 0; z-index: 9800;
      background: #fff;
      flex-direction: column;
    }
    #plan-busca-overlay.aberto { display: flex; }
    #plan-busca-header {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      background: #fff;
    }
    #plan-busca-back {
      width: 38px; height: 38px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer; color: var(--black);
    }
    #plan-busca-input {
      flex: 1; padding: 11px 14px;
      border: 1.5px solid var(--orange);
      border-radius: 10px;
      font-size: 15px; font-family: inherit; font-weight: 600;
      color: var(--black); outline: none; background: #fff;
    }
    #plan-busca-input::placeholder { color: var(--gray); font-weight: 400; }
    #plan-busca-lista {
      flex: 1; overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .plan-busca-item {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid #F5F5F5;
      cursor: pointer; transition: background 0.1s;
    }
    .plan-busca-item:active { background: var(--orange-light); }
    .plan-busca-icone {
      width: 36px; height: 36px; flex-shrink: 0;
      border-radius: 10px; background: var(--gray-card);
      display: flex; align-items: center; justify-content: center; font-size: 18px;
    }
    .plan-busca-info { flex: 1; min-width: 0; }
    .plan-busca-nome {
      font-size: 14px; font-weight: 700; color: var(--black);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .plan-busca-sub {
      font-size: 12px; color: var(--gray); margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .plan-busca-loading {
      padding: 32px 16px; text-align: center;
      font-size: 14px; color: var(--gray); line-height: 1.7;
    }
    .plan-sug-item {
      display: flex; align-items: center; gap: 12px;
      padding: 13px 16px; cursor: pointer;
      border-bottom: 1px solid #F5F5F5;
      transition: background 0.12s;
    }
    .plan-sug-item:last-child { border-bottom: none; }
    .plan-sug-item:active, .plan-sug-item:hover { background: var(--orange-light); }
    .plan-sug-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--gray-card); display: flex; align-items: center;
      justify-content: center; font-size: 16px; flex-shrink: 0;
    }
    .plan-sug-info { flex: 1; min-width: 0; }
    .plan-sug-nome {
      font-size: 14px; font-weight: 700; color: var(--black);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .plan-sug-end {
      font-size: 12px; color: var(--gray); margin-top: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .plan-sug-loading {
      padding: 20px 16px; text-align: center;
      font-size: 13px; color: var(--gray);
    }
    /* Indicador de busca no campo Para */
    #plan-dest-searching {
      width: 18px; height: 18px; flex-shrink: 0;
      border: 2px solid var(--border); border-top-color: var(--orange);
      border-radius: 50%; animation: spin360 0.7s linear infinite;
      display: none;
    }

    /* ── Lista de veículos em Meus Veículos ── */
    .veh-list-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 0;
    }
    .veh-list-item + .veh-list-item { border-top: 1px solid var(--border); }
    .veh-list-icon {
      width: 50px; height: 50px; border-radius: 14px;
      background: var(--orange-light); display: flex; align-items: center;
      justify-content: center; font-size: 26px; flex-shrink: 0;
    }
    .veh-list-info { flex: 1; }
    .veh-list-nome { font-size: 15px; font-weight: 800; color: var(--black); }
    .veh-list-det { font-size: 12px; color: var(--gray); margin-top: 2px; }
    .veh-list-btns { display: flex; gap: 6px; }
    .veh-list-btn-edit {
      padding: 7px 14px; font-size: 13px; font-weight: 600;
      background: none; border: 1.5px solid var(--border);
      border-radius: 9px; cursor: pointer; color: var(--black);
    }
    .veh-slot-add {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 0; cursor: pointer; opacity: 0.7;
    }
    .veh-slot-add-icon {
      width: 50px; height: 50px; border-radius: 14px;
      border: 2px dashed var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; flex-shrink: 0;
    }
    .veh-slot-add-label { font-size: 14px; font-weight: 600; color: var(--gray); }

    /* ══════════════════════════════════════════════
       TELA 11: RELATÓRIOS
    ══════════════════════════════════════════════ */
    #view-relatorios {
      /* overflow-y gerenciado pelo seletor .active acima */
      background: var(--white);
    }

    #rel-header {
      padding: calc(var(--sat) + 20px) 20px 0;
      text-align: center;
      background: var(--white);
      position: sticky; top: 0; z-index: 10;
    }
    #rel-title {
      font-size: 20px; font-weight: 800; color: var(--black);
      margin-bottom: 16px;
    }

    /* Tabs período */
    .period-tabs {
      display: flex; background: var(--gray-bg);
      border-radius: 10px; padding: 3px;
      margin-bottom: 20px;
    }
    .period-tab {
      flex: 1; padding: 8px;
      border: none; border-radius: 8px;
      background: none; font-family: 'Inter', sans-serif;
      font-size: 14px; font-weight: 600; color: var(--gray);
      cursor: pointer; transition: all 0.2s; text-align: center;
    }
    .period-tab.active {
      background: var(--white); color: var(--black);
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    }

    /* Navegação mês */
    .month-nav {
      display: flex; align-items: center; justify-content: center; gap: 20px;
      margin-bottom: 24px;
    }
    .btn-month {
      width: 32px; height: 32px;
      background: none; border: none; cursor: pointer;
      color: var(--gray-dark); font-size: 18px;
      display: flex; align-items: center; justify-content: center;
    }
    .month-label { font-size: 15px; font-weight: 600; color: var(--black); }

    /* Valor total economizado */
    #rel-total {
      text-align: center; margin-bottom: 20px;
    }
    .rel-total-val {
      font-size: 42px; font-weight: 900; color: var(--green);
      line-height: 1; margin-bottom: 4px;
    }
    .rel-total-label { font-size: 14px; color: var(--gray); font-weight: 500; }

    /* Cards de stats */
    .rel-cards-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 10px; padding: 0 20px; margin-bottom: 10px;
    }
    .rel-stat-card {
      background: var(--gray-card); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 14px;
    }
    .rel-stat-label { font-size: 12px; color: var(--gray); font-weight: 500; margin-bottom: 6px; }
    .rel-stat-val { font-size: 22px; font-weight: 800; color: var(--black); }

    .rel-econ-litro {
      margin: 0 20px 24px;
      background: var(--gray-card); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 14px 16px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .rel-econ-label { font-size: 12px; color: var(--gray); font-weight: 500; margin-bottom: 4px; }
    .rel-econ-val { font-size: 18px; font-weight: 800; color: var(--black); }

    /* Postos mais abastecidos */
    .rel-section { padding: 0 20px; }
    .rel-section-title { font-size: 15px; font-weight: 800; color: var(--black); margin-bottom: 14px; }

    .rel-posto-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }
    .rel-posto-row:last-child { border-bottom: none; }
    .rel-posto-logo {
      width: 38px; height: 38px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
      border: 1px solid var(--border);
    }
    .rel-posto-nome { flex: 1; font-size: 14px; font-weight: 600; color: var(--black); }
    .rel-posto-vezes { font-size: 13px; color: var(--gray); font-weight: 500; }

    /* ══════════════════════════════════════════════
       TELA 12: PERFIL / MENU
    ══════════════════════════════════════════════ */
    /* Header dark perfil */
    #perfil-header {
      background: #1A1A2E;
      padding: calc(var(--sat) + 28px) 20px 28px;
      display: flex; align-items: center; gap: 16px;
    }

    /* ── Avatar de perfil com botão câmera ── */
    #perfil-avatar-wrap {
      position: relative; flex-shrink: 0;
      width: 72px; height: 72px;
      cursor: pointer;
    }
    #perfil-avatar {
      width: 72px; height: 72px; border-radius: 50%;
      object-fit: cover;
      background: #333;
      border: 3px solid rgba(255,255,255,0.2);
      display: block;
    }
    #perfil-avatar-inicial {
      width: 72px; height: 72px; border-radius: 50%;
      background: var(--orange);
      display: flex; align-items: center; justify-content: center;
      font-size: 30px; font-weight: 800; color: #fff;
      border: 3px solid rgba(255,255,255,0.2);
      flex-shrink: 0;
    }
    #perfil-avatar-cam {
      position: absolute; bottom: 0; right: 0;
      width: 26px; height: 26px; border-radius: 50%;
      background: var(--orange);
      border: 2px solid #1A1A2E;
      display: flex; align-items: center; justify-content: center;
      pointer-events: none;
    }
    #perfil-avatar-cam svg { width: 13px; height: 13px; fill: #fff; }

    /* Spinner de upload */
    #perfil-upload-spinner {
      display: none;
      position: absolute; inset: 0;
      border-radius: 50%;
      background: rgba(0,0,0,0.45);
      align-items: center; justify-content: center;
    }
    #perfil-upload-spinner.ativo { display: flex; }
    #perfil-upload-spinner::after {
      content: '';
      width: 24px; height: 24px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin360 0.8s linear infinite;
    }
    @keyframes spin360 { to { transform: rotate(360deg); } }

    /* ══════════════════════════════════════════════
       TELA PERFIL — position:fixed (igual rp-subtela)
    ══════════════════════════════════════════════ */
    #rp-perfil {
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      right: 0 !important; bottom: 0 !important;
      width: 100% !important; height: 100% !important;
      max-width: 100% !important; margin: 0 !important;
      z-index: 9000;
      background: var(--gray-bg);
      display: flex; flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    #rp-perfil.aberto { transform: translateX(0); }

    #rp-perfil #perfil-header {
      background: #1A1A2E;
      padding: calc(var(--sat) + 28px) 56px 28px 20px;
      display: flex; align-items: center; gap: 16px;
      flex-shrink: 0; position: relative;
    }
    #rp-perfil #perfil-menu-list {
      padding-bottom: calc(var(--sab) + 32px);
    }

    /* ══════════════════════════════════════════════
       SUB-TELA CHEIA (substitui modais do menu)
    ══════════════════════════════════════════════ */
    #rp-subtela {
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      right: 0 !important; bottom: 0 !important;
      width: 100% !important; height: 100% !important;
      max-width: 100% !important; margin: 0 !important;
      z-index: 99999;
      background: var(--gray-bg);
      display: flex; flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
    }
    #rp-subtela.aberta { transform: translateX(0); }

    #rp-subtela-header {
      background: var(--orange);
      padding: calc(var(--sat) + 16px) 16px 16px;
      display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
    }
    #rp-subtela-back {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    #rp-subtela-back svg { width: 20px; height: 20px; stroke: #fff; fill: none; }
    #rp-subtela-titulo {
      font-size: 18px; font-weight: 800; color: #fff; flex: 1;
    }
    #rp-subtela-body {
      flex: 1; overflow-y: auto;
      padding: 20px 16px calc(var(--sab) + 24px);
      -webkit-overflow-scrolling: touch;
    }

    /* Cards internos da subtela */
    .st-card {
      background: var(--white); border-radius: 16px;
      padding: 16px; margin-bottom: 12px;
      box-shadow: var(--shadow);
    }
    .st-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 13px 0; border-bottom: 1px solid var(--border);
    }
    .st-row:last-child { border-bottom: none; }
    .st-label { font-size: 14px; color: var(--gray); }
    .st-value { font-size: 14px; font-weight: 600; color: var(--black); }
    .st-btn {
      width: 100%; padding: 15px;
      background: var(--orange); color: #fff;
      border: none; border-radius: 14px;
      font-size: 15px; font-weight: 700; cursor: pointer;
      margin-top: 8px; transition: background .15s;
    }
    .st-btn:active { background: var(--orange-dark); }
    .st-btn-ghost {
      background: var(--gray-bg); color: var(--black);
    }
    .st-btn-danger {
      background: var(--red-bg); color: var(--red);
    }
    .st-section-title {
      font-size: 12px; font-weight: 700; color: var(--gray);
      text-transform: uppercase; letter-spacing: 0.5px;
      margin: 0 0 10px;
    }
    .st-faq details {
      border: 1.5px solid var(--border); border-radius: 14px;
      margin-bottom: 8px; overflow: hidden; background: #fff;
    }
    .st-faq summary {
      padding: 14px 16px; font-size: 14px; font-weight: 600;
      color: var(--black); cursor: pointer; list-style: none;
      display: flex; justify-content: space-between; align-items: center;
    }
    .st-faq summary::-webkit-details-marker { display: none; }
    .st-faq details[open] summary { color: var(--orange); }
    .st-faq .st-faq-body { padding: 0 16px 14px; font-size: 14px; color: var(--gray-dark); line-height: 1.65; }

    #perfil-info { flex: 1; }
    #perfil-ola {
      font-size: 20px; font-weight: 800; color: var(--white);
      margin-bottom: 6px;
    }
    .badge-premium {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 100px;
      background: rgba(255,193,7,0.2); color: #FFC107;
      font-size: 12px; font-weight: 700; margin-bottom: 4px;
    }
    #perfil-validade { font-size: 12px; color: rgba(255,255,255,0.55); }

    /* Lista de menu */
    #perfil-menu-list {
      background: var(--white);
      margin: 0; border-radius: 0;
    }

    .menu-item {
      display: flex; align-items: center; gap: 14px;
      padding: 17px 20px;
      border-bottom: 1px solid var(--border);
      cursor: pointer; background: var(--white);
      transition: background 0.15s;
    }
    .menu-item:active { background: var(--gray-bg); }
    .menu-item:last-child { border-bottom: none; }

    .menu-item-icon {
      width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      color: var(--gray); flex-shrink: 0;
    }
    .menu-item-icon svg { width: 20px; height: 20px; }
    .menu-item-label { flex: 1; font-size: 15px; font-weight: 500; color: var(--black); }
    .menu-item-arrow { color: var(--gray-light); }
    .menu-item-arrow svg { width: 16px; height: 16px; }

    /* Sair */
    .menu-item-sair .menu-item-icon { color: var(--red); }
    .menu-item-sair .menu-item-label { color: var(--red); }

    /* ══════════════════════════════════════════════
       BOTTOM NAV
    ══════════════════════════════════════════════ */
    #bottom-nav {
      background: var(--white);
      border-top: 1px solid var(--border);
      display: flex; align-items: stretch;
      padding-bottom: var(--sab);
      height: calc(var(--nav-h) + var(--sab));
      min-height: calc(var(--nav-h) + var(--sab));
      /* position:fixed garante que o nav SEMPRE aparece no Android/TWA
         independente de 100dvh ser calculado diferente */
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 500;
      flex-shrink: 0;
      flex-grow: 0;
    }

    .nav-item {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 3px;
      padding: 8px 4px;
      background: none; border: none; cursor: pointer;
      color: var(--gray-light); font-family: 'Inter', sans-serif;
      font-size: 10px; font-weight: 600;
      letter-spacing: 0.2px;
      transition: color 0.2s;
    }
    .nav-item svg { width: 22px; height: 22px; }
    .nav-item .nav-label { display: none; }        /* só Melhor tem label */
    .nav-item#nav-melhor .nav-label { display: block; font-size: 9px; font-weight: 700; color: inherit; }
    .nav-icon-only { gap: 0; }                      /* sem espaço extra ícone puro */
    .nav-icon-only svg { width: 25px; height: 25px; }
    .nav-item.active { color: var(--orange); }

    /* ══════════════════════════════════════════════
       BOTÃO SOS FLUTUANTE
    ══════════════════════════════════════════════ */
    #btn-sos-float {
      position: fixed;
      top: 50%;
      right: 16px;
      transform: translateY(-50%);
      bottom: auto;
      z-index: 400;
      width: 56px; height: 56px;
      background: #D32F2F;
      color: #fff;
      border: none; border-radius: 50%;
      font-size: 11px; font-weight: 800; letter-spacing: 0.5px;
      cursor: grab;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
      box-shadow: 0 4px 20px rgba(211,47,47,0.50);
      transition: transform 0.15s, box-shadow 0.15s;
      touch-action: none;
      user-select: none;
    }
    #btn-sos-float:active { transform: translateY(-50%) scale(0.93); }
    #btn-sos-float.dragging { cursor: grabbing; box-shadow: 0 8px 24px rgba(211,47,47,0.55); transform: none; opacity: 0.92; }
    #btn-sos-float svg { width: 20px; height: 20px; stroke: #fff; fill: none; pointer-events: none; }

    /* ══════════════════════════════════════════════
       VIEW SOS
    ══════════════════════════════════════════════ */
    #view-sos {
      /* display:none gerenciado pela classe .view — não redeclarar aqui */
      background: var(--gray-bg);
    }
    #sos-header {
      background: #D32F2F;
      padding: calc(var(--sat) + 14px) 16px 14px;
      display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
    }
    #sos-back {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,0.18); border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    #sos-back svg { width: 20px; height: 20px; stroke: #fff; fill: none; }
    #sos-titulo { font-size: 18px; font-weight: 800; color: #fff; flex: 1; }
    #sos-badge-premium {
      font-size: 11px; font-weight: 700; color: #FFD600;
      background: rgba(0,0,0,0.25); border-radius: 100px; padding: 3px 10px;
    }
    #sos-body {
      flex: 1; overflow-y: auto;
      padding: 16px 16px calc(var(--sab) + 80px);
    }
    /* Filtros de tipo */
    /* ── SOS filtros: "Todos" + chevron + bottom sheet de categorias ── */
    .sos-filtros {
      display: flex; gap: 8px; margin-bottom: 16px; align-items: center;
    }
    /* Botão "Todos" — ocupa a linha toda com seta de dropdown */
    .sos-chip-todos {
      flex: 1;
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; border-radius: 100px;
      background: #D32F2F; border: none;
      font-size: 14px; font-weight: 700; color: #fff; cursor: pointer;
      transition: background 0.15s; gap: 8px;
    }
    .sos-chip-todos svg {
      width: 18px; height: 18px; stroke: #fff; fill: none;
      transition: transform 0.2s;
      flex-shrink: 0;
    }
    .sos-chip-todos.aberto svg { transform: rotate(180deg); }
    /* Bottom sheet de categorias */
    #sos-cat-sheet-overlay {
      position: fixed; inset: 0; z-index: 9990;
      background: rgba(0,0,0,0.45);
      opacity: 0; pointer-events: none;
      transition: opacity 0.22s;
    }
    #sos-cat-sheet-overlay.visivel { opacity: 1; pointer-events: auto; }
    #sos-cat-sheet {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9991;
      background: #fff; border-radius: 20px 20px 0 0;
      padding: 0 0 calc(env(safe-area-inset-bottom,0px) + 16px);
      transform: translateY(100%);
      transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
    }
    #sos-cat-sheet.visivel { transform: translateY(0); }
    .sos-sheet-handle {
      width: 36px; height: 4px; background: #DDD; border-radius: 2px;
      margin: 12px auto 20px;
    }
    .sos-sheet-titulo {
      font-size: 13px; font-weight: 800; color: #888;
      text-transform: uppercase; letter-spacing: 0.8px;
      padding: 0 20px; margin-bottom: 12px;
    }
    .sos-cat-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 20px; cursor: pointer;
      transition: background 0.12s; border: none;
      background: none; width: 100%; text-align: left;
    }
    .sos-cat-item:active { background: #FFF3E0; }
    .sos-cat-item + .sos-cat-item {
      border-top: 1px solid #F5F5F5;
    }
    .sos-cat-ico {
      width: 46px; height: 46px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; flex-shrink: 0;
    }
    .sos-cat-ico.guincho   { background: #FFF3E0; }
    .sos-cat-ico.borracha  { background: #E8F5E9; }
    .sos-cat-ico.mecanica  { background: #E3F2FD; }
    .sos-cat-info { flex: 1; }
    .sos-cat-nome { font-size: 15px; font-weight: 700; color: #1A1A1A; }
    .sos-cat-desc { font-size: 12px; color: #888; margin-top: 2px; }
    .sos-cat-check {
      width: 22px; height: 22px; border-radius: 50%;
      background: #D32F2F; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
      opacity: 0; transition: opacity 0.15s;
    }
    .sos-cat-check svg { width: 12px; height: 12px; stroke: #fff; fill: none; }
    .sos-cat-item.ativo .sos-cat-check { opacity: 1; }
    .sos-cat-item.ativo .sos-cat-nome { color: #D32F2F; }
    /* Card de serviço */
    .sos-card {
      background: #fff; border-radius: 16px;
      padding: 14px 16px; margin-bottom: 10px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.07);
      display: flex; gap: 12px; align-items: flex-start;
    }
    .sos-card-emoji {
      width: 44px; height: 44px; border-radius: 12px;
      background: #FFF3E0; display: flex; align-items: center;
      justify-content: center; font-size: 22px; flex-shrink: 0;
    }
    .sos-card-info { flex: 1; min-width: 0; }
    .sos-card-nome {
      font-size: 15px; font-weight: 700; color: #1A1A1A;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sos-card-end {
      font-size: 12px; color: #888; margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sos-card-meta {
      display: flex; gap: 8px; align-items: center; margin-top: 6px;
      flex-wrap: wrap;
    }
    .sos-dist {
      font-size: 12px; font-weight: 600; color: #FF6D00;
      background: #FFF3E0; padding: 2px 8px; border-radius: 100px;
    }
    .sos-aberto {
      font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 100px;
    }
    .sos-aberto.sim { background: #E8F5E9; color: #2E7D32; }
    .sos-aberto.nao { background: #FFEBEE; color: #C62828; }
    .sos-rating {
      font-size: 12px; color: #888;
    }
    .sos-card-btns {
      display: flex; gap: 6px; flex-direction: column;
      flex-shrink: 0;
    }
    .sos-btn-ligar {
      padding: 8px 12px; background: #D32F2F; color: #fff;
      border: none; border-radius: 10px; font-size: 12px; font-weight: 700;
      cursor: pointer; white-space: nowrap; text-decoration: none;
      text-align: center; display: block;
    }
    .sos-btn-whats {
      padding: 8px 12px; background: #25D366; color: #fff;
      border: none; border-radius: 10px; font-size: 12px; font-weight: 700;
      cursor: pointer; white-space: nowrap; text-decoration: none;
      text-align: center; display: block;
    }
    .sos-btn-irla {
      padding: 8px 12px; background: #1565C0; color: #fff;
      border: none; border-radius: 10px; font-size: 12px; font-weight: 700;
      cursor: pointer; white-space: nowrap; text-decoration: none;
      text-align: center; display: block;
    }
    /* Drag handle do botão SOS flutuante */
    #btn-sos-float.dragging { opacity: 0.85; transition: none; }
    #btn-sos-drag-hint {
      position: fixed; right: 8px;
      display: flex; flex-direction: column; gap: 2px;
      align-items: center; pointer-events: none;
      opacity: 0; transition: opacity 0.3s;
    }
    #btn-sos-float:hover ~ #btn-sos-drag-hint,
    #btn-sos-drag-hint.visible { opacity: 1; }
    /* Estado vazio/loading */
    .sos-loading {
      text-align: center; padding: 40px 20px;
      color: #888; font-size: 14px;
    }
    .sos-loading-spinner {
      width: 36px; height: 36px; border: 3px solid #F5F5F5;
      border-top-color: #D32F2F; border-radius: 50%;
      animation: spin360 0.8s linear infinite; margin: 0 auto 12px;
    }
    /* Banner de degustação / upgrade */
    .sos-banner-upgrade {
      background: linear-gradient(135deg, #FF6D00, #FF8F00);
      border-radius: 16px; padding: 18px 16px; margin-bottom: 16px;
      color: #fff; text-align: center;
    }
    .sos-banner-upgrade h3 { margin: 0 0 6px; font-size: 16px; font-weight: 800; }
    .sos-banner-upgrade p { margin: 0 0 14px; font-size: 13px; opacity: 0.92; line-height: 1.5; }
    .sos-banner-upgrade button {
      background: #fff; color: #FF6D00; border: none;
      padding: 11px 24px; border-radius: 100px;
      font-size: 14px; font-weight: 800; cursor: pointer;
    }
    #app-toast {
      position: fixed; bottom: calc(var(--sab) + var(--nav-h) + 14px);
      left: 50%; transform: translateX(-50%) translateY(20px);
      background: #333; color: white;
      padding: 10px 20px; border-radius: 100px;
      font-size: 13px; font-weight: 600;
      opacity: 0; transition: opacity 0.3s, transform 0.3s;
      z-index: 9999; pointer-events: none; white-space: nowrap;
    }
    #app-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    #app-loading {
      position: fixed; inset: 0; background: rgba(255,255,255,0.9);
      display: none; align-items: center; justify-content: center;
      flex-direction: column; gap: 14px; z-index: 9999;
    }
    #app-loading.show { display: flex; }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    .app-spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,109,0,0.2);
      border-top-color: var(--orange);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      padding: 60px 30px; text-align: center;
    }
    .empty-state-icon { font-size: 48px; margin-bottom: 16px; }
    .empty-state h3 { font-size: 18px; font-weight: 800; color: var(--black); margin-bottom: 8px; }
    .empty-state p { font-size: 14px; color: var(--gray); line-height: 1.6; }

    /* Leaflet overrides */
    .leaflet-control-attribution { display: none !important; }
    .leaflet-container { font-family: 'Inter', sans-serif !important; }
  </style>
</head>
<body>
<!-- Splash de carregamento — some quando o JS inicializa -->
<div id="app-splash" style="position:fixed;inset:0;z-index:99999;background:#0B121E;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity 0.4s;">
  <img src="/icons/icon-192x192.png" style="width:80px;height:80px;border-radius:20px;margin-bottom:18px;" onerror="this.style.display='none'"/>
  <div style="color:#fff;font-size:24px;font-weight:800;">Rota<span style="color:#FF6D00;">Posto</span></div>
  <div style="margin-top:24px;width:160px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
    <div style="height:100%;background:#FF6D00;border-radius:2px;animation:splashprog 1.8s ease-out forwards;"></div>
  </div>
  <style>@keyframes splashprog{from{width:0%}to{width:100%}}</style>
</div>
<!-- Google One Tap — reconhece conta Google automaticamente no Android -->
<div id="g_id_onload"
  data-client_id="1078426960222-viiv45tf4i508rlvj53202h6kda8ga9b.apps.googleusercontent.com"
  data-callback="onGoogleOneTapCredential"
  data-auto_prompt="true"
  data-auto_select="true"
  data-cancel_on_tap_outside="false"
  data-context="signin"
  data-itp_support="true"
  data-use_fedcm_for_prompt="true">
</div>

<div id="app-root">

  <!-- ══════════════════════════════════
       HEADER (visível em Mapa e Lista)
  ══════════════════════════════════ -->
  <div id="app-header" style="display:none">
    <div class="header-row-1">
      <button class="btn-menu" onclick="toggleMenu()">
        <span></span><span></span><span></span>
      </button>
      <div class="header-logo"><span class="rota">Rota</span><span class="posto">Posto</span></div>
      <button class="btn-bell" onclick="showToast('Nenhuma notificação')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <div class="bell-dot"></div>
      </button>
    </div>
    <div class="search-bar">
      <div class="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="search-input" id="search-input" placeholder="Buscar cidade ou endereço" oninput="onSearchInput(this.value)" onkeydown="if(event.key==='Enter') doSearch()"/>
      </div>
      <button class="btn-filter" id="btn-filtros" onclick="abrirPainelFiltros()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
        <span id="filtros-badge" style="display:none;position:absolute;top:2px;right:2px;width:8px;height:8px;background:#FF6D00;border-radius:50%;"></span>
      </button>
    </div>
    <div class="chips-row" id="chips-row">
      <button class="chip-fuel active" onclick="selectFuel('gasolina',this)">Gasolina</button>
      <button class="chip-fuel" onclick="selectFuel('etanol',this)">Etanol</button>
      <button class="chip-fuel" onclick="selectFuel('diesel',this)">Diesel</button>
      <button class="chip-fuel" onclick="selectFuel('gnv',this)">GNV</button>
    </div>
  </div>

  <!-- ══════════════════════════════════
       CONTEÚDO
  ══════════════════════════════════ -->
  <div id="app-content">

    <!-- TELA 7: MAPA -->
    <div id="view-mapa" class="view active">
      <div id="map-leaflet"></div>
      <!-- Botão GPS flutuante -->
      <button id="btn-gps-float" onclick="_forcarGPS()" title="Minha localização" style="position:absolute;bottom:100px;right:16px;z-index:1000;width:44px;height:44px;border-radius:50%;background:#fff;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF6D00" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8" stroke-dasharray="4 2" stroke="#FF6D00" stroke-width="1.5" fill="none"/></svg>
      </button>
      <div id="map-card" style="display:none">
        <div class="map-card-label">
          Melhor posto próximo
          <button class="btn-close-card" onclick="document.getElementById('map-card').style.display='none'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="map-posto-row">
          <div class="posto-logo-circle" id="map-card-logo">🐚</div>
          <div class="map-posto-info">
            <div class="map-posto-nome" id="map-card-nome">Posto Shell</div>
            <div class="map-posto-preco" id="map-card-preco">R$ 5,67 /L</div>
            <div class="map-posto-dist" id="map-card-dist">1,2 km • 3 min</div>
          </div>
          <button class="btn-ir-ata-la" onclick="goToView('planejar')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Planejar
          </button>
        </div>
      </div>
    </div>

    <!-- TELA 8: LISTA -->
    <div id="view-lista" class="view">
      <div id="lista-container">
        <div class="empty-state" id="lista-empty" style="display:none">
          <div class="empty-state-icon">⛽</div>
          <h3>Nenhum posto encontrado</h3>
          <p>Tente uma área diferente ou mude o combustível</p>
        </div>
        <div id="lista-postos"></div>
      </div>
    </div>

    <!-- TELA 9: DETALHES -->
    <div id="view-detalhes" class="view">
      <div id="det-header">
        <img id="det-hero-img" src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=70" alt="Posto"/>
        <div class="det-overlay-btns">
          <button class="det-btn-icon" onclick="goToView('lista')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="det-btn-group">
            <button class="det-btn-icon" onclick="shareStation()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button class="det-btn-icon" onclick="toggleFavorite()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            </button>
          </div>
        </div>
        <div id="det-logo-badge">🐚</div>
      </div>

      <div id="det-body">
        <h1 id="det-nome">Posto Shell</h1>
        <p id="det-endereco">Av. Rebouças, 1234 – Pinheiros<br/>São Paulo – SP</p>

        <div id="det-info-row">
          <div class="det-stars" id="det-stars">
            <span class="det-star">★</span><span class="det-star">★</span>
            <span class="det-star">★</span><span class="det-star">★</span>
            <span class="det-star">★</span>
          </div>
          <span class="det-rating-count" id="det-rating-count">4,6 (128 avaliações)</span>
          <span class="badge-aberto">Aberto 24h</span>
        </div>

        <!-- Preço destaque -->
        <div id="det-preco-destaque">
          <div>
            <div class="det-comb-nome" id="det-comb-nome">Gasolina Comum</div>
            <div class="det-comb-preco" id="det-comb-preco">R$ 5,67 /L</div>
          </div>
          <div class="det-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        <!-- Lista combustíveis -->
        <div class="det-fuel-list" id="det-fuel-list">
          <div class="det-fuel-row">
            <span class="det-fuel-nome">Etanol</span>
            <span class="det-fuel-price">R$ 3,89</span>
          </div>
          <div class="det-fuel-row">
            <span class="det-fuel-nome">Diesel S10</span>
            <span class="det-fuel-price">R$ 6,19</span>
          </div>
          <div class="det-fuel-row">
            <span class="det-fuel-nome">GNV</span>
            <span class="det-fuel-price">R$ 4,49</span>
          </div>
        </div>

        <!-- Botões -->
        <div class="det-btns">
          <button class="btn-como-chegar" onclick="openMaps()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Como chegar
          </button>
          <button class="btn-ir-la" onclick="goToView('planejar')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Planejar rota
          </button>
        </div>

        <!-- Avaliações -->
        <div class="det-section-title">
          <h3>Avaliações</h3>
          <button class="link-ver-todas" onclick="showToast('Ver todas em breve')">Ver todas</button>
        </div>
        <div class="review-card">
          <div class="review-header">
            <img src="https://i.pravatar.cc/80?u=joao" class="review-avatar" alt="João M."/>
            <div>
              <div class="review-name">João M.</div>
              <div class="review-date">Hoje</div>
            </div>
          </div>
          <div class="review-stars">★★★★★</div>
          <div class="review-text">Ótimo atendimento e preço justo!</div>
        </div>
      </div>
    </div>

    <!-- TELA 10: PLANEJAR ROTA -->
    <div id="view-planejar" class="view">
      <div id="plan-header">
        <button class="btn-back-plan" onclick="goToView('mapa')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 id="plan-title">Planejar rota</h2>
      </div>

      <div id="plan-body">

        <!-- Campos de rota -->
        <div class="route-fields">
          <div class="route-field">
            <div class="route-dot-origin"></div>
            <div class="route-field-content" style="flex:1;">
              <div class="route-field-label">De</div>
              <div class="route-field-val" id="plan-origin" onclick="editarOrigem()" style="cursor:pointer;">Minha localização</div>
              <input id="plan-origin-input" type="text" placeholder="Digite o endereço de partida…"
                onblur="confirmarOrigem()" onkeydown="if(event.key==='Enter')confirmarOrigem()"/>
            </div>
            <button class="btn-target" onclick="usarLocalizacaoAtual()" title="Usar minha localização">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="1"/><line x1="12" y1="23" x2="12" y2="21"/><line x1="3" y1="12" x2="1" y2="12"/><line x1="23" y1="12" x2="21" y2="12"/></svg>
            </button>
          </div>
          <div class="route-field">
            <div class="route-dot-dest"></div>
            <div id="plan-dest-wrap" onclick="abrirBuscaDestino()">
              <div class="plan-dest-label">Para</div>
              <div id="plan-dest-val" class="placeholder">Cidade, endereço, shopping…</div>
            </div>
            <div id="plan-dest-searching"></div>
            <button class="btn-target" onclick="abrirBuscaDestino()" title="Buscar destino" id="btn-dest-buscar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
        </div>

        <!-- Seletor de veículo -->
        <div id="plan-veiculo-selector">
          <div class="plan-sec-label">Meu veículo</div>
          <div class="plan-car-tabs" id="plan-car-tabs">
            <!-- preenchido por renderPlanCarTabs() -->
          </div>
        </div>

        <!-- Painel custo estimado -->
        <div id="plan-custo-panel" class="sem-veiculo">
          <div class="pcp-titulo">⛽ Estimativa de viagem</div>
          <div class="pcp-grid">
            <div class="pcp-item">
              <div class="pcp-val" id="pcp-dist">—</div>
              <div class="pcp-label">Distância</div>
            </div>
            <div class="pcp-item">
              <div class="pcp-val" id="pcp-litros">—</div>
              <div class="pcp-label">Litros usados</div>
            </div>
            <div class="pcp-item">
              <div class="pcp-val" id="pcp-custo">—</div>
              <div class="pcp-label">Custo estimado</div>
            </div>
          </div>
        </div>

        <!-- Stats distância / tempo -->
        <div class="route-stats-badge">
          <div class="route-stats-label">Melhor rota</div>
          <div class="route-stats-vals">
            <div class="route-stat" id="plan-dist">—</div>
            <div class="route-stat-sep"></div>
            <div class="route-stat" id="plan-time">—</div>
          </div>
        </div>

        <!-- Mapa rota -->
        <div id="plan-map"></div>

        <!-- Card posto destino -->
        <div class="plan-posto-card" id="plan-posto-card" style="display:none;">
          <div class="plan-posto-logo" id="plan-logo">⛽</div>
          <div class="plan-posto-info">
            <div class="plan-posto-nome" id="plan-nome">—</div>
            <div class="plan-posto-end" id="plan-end">—</div>
          </div>
          <div>
            <div class="plan-posto-preco" id="plan-preco">—<span class="plan-preco-unit">/L</span></div>
          </div>
        </div>

        <button class="btn-iniciar-nav" id="btn-iniciar-nav" onclick="iniciarNavegacao()" style="display:none;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Iniciar navegação no Google Maps
        </button>
      </div>
    </div>

    <!-- TELA 11: RELATÓRIOS -->
    <div id="view-relatorios" class="view">
      <div id="rel-header">
        <h2 id="rel-title">Meus relatórios</h2>
        <div class="period-tabs">
          <button class="period-tab" onclick="selectPeriod('semana',this)">Semana</button>
          <button class="period-tab active" onclick="selectPeriod('mes',this)">Mês</button>
          <button class="period-tab" onclick="selectPeriod('ano',this)">Ano</button>
        </div>
        <div class="month-nav">
          <button class="btn-month" onclick="changeMonth(-1)">‹</button>
          <span class="month-label" id="month-label">Maio 2024</span>
          <button class="btn-month" onclick="changeMonth(1)">›</button>
        </div>
        <div id="rel-total">
          <div class="rel-total-val" id="rel-total-val">R$ 289,60</div>
          <div class="rel-total-label">Total economizado</div>
        </div>
      </div>

      <div class="rel-cards-grid">
        <div class="rel-stat-card">
          <div class="rel-stat-label">Abastecimentos</div>
          <div class="rel-stat-val">8</div>
        </div>
        <div class="rel-stat-card">
          <div class="rel-stat-label">Gasto total</div>
          <div class="rel-stat-val" style="font-size:18px">R$ 412,30</div>
        </div>
      </div>

      <div class="rel-econ-litro">
        <div>
          <div class="rel-econ-label">Economia por litro</div>
          <div class="rel-econ-val">R$ 0,36</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BBB" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>

      <div class="rel-section">
        <div class="rel-section-title">Postos mais abastecidos</div>
        <div class="rel-posto-row">
          <div class="rel-posto-logo">🐚</div>
          <div class="rel-posto-nome">Posto Shell</div>
          <div class="rel-posto-vezes">3 vezes</div>
        </div>
        <div class="rel-posto-row">
          <div class="rel-posto-logo" style="background:#FFF8E1">🔵</div>
          <div class="rel-posto-nome">Posto Ipiranga</div>
          <div class="rel-posto-vezes">2 vezes</div>
        </div>
        <div class="rel-posto-row">
          <div class="rel-posto-logo" style="background:#E8F5E9">🟢</div>
          <div class="rel-posto-nome">Posto BR</div>
          <div class="rel-posto-vezes">2 vezes</div>
        </div>
        <div class="rel-posto-row">
          <div class="rel-posto-logo" style="background:#F5F5F5">⚪</div>
          <div class="rel-posto-nome">Outros</div>
          <div class="rel-posto-vezes">1 vez</div>
        </div>
      </div>
    </div>

    <!-- TELA PERFIL removida daqui — agora é #rp-perfil (position:fixed, fora do app-content) -->


    <!-- TELA SOS: Guinchos, Borracheiros, Mecânicas — DENTRO do app-content -->
    <div id="view-sos" class="view">
      <div id="sos-header">
        <button id="sos-back" onclick="goToView('mapa')">
          <svg viewBox="0 0 24 24" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div id="sos-titulo">🚨 SOS RotaPosto</div>
        <div id="sos-badge-premium" style="display:none;">👑 Premium</div>
      </div>
      <div id="sos-body">
        <div class="sos-loading" id="sos-loading">
          <div class="sos-loading-spinner"></div>
          Buscando serviços próximos…
        </div>
      </div>
    </div>

  </div><!-- #app-content -->

  <!-- SOS: overlay + bottom sheet de categorias -->
  <div id="sos-cat-sheet-overlay" onclick="fecharSOSCatSheet()"></div>
  <div id="sos-cat-sheet">
    <div class="sos-sheet-handle"></div>
    <div class="sos-sheet-titulo">Tipo de serviço</div>
    <button class="sos-cat-item ativo" id="sos-cat-guincho" onclick="selecionarSOSCategoria('guincho')">
      <div class="sos-cat-ico guincho">🚛</div>
      <div class="sos-cat-info">
        <div class="sos-cat-nome">Guinchos</div>
        <div class="sos-cat-desc">Reboque e resgate 24h</div>
      </div>
      <div class="sos-cat-check">
        <svg viewBox="0 0 24 24" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </button>
    <button class="sos-cat-item" id="sos-cat-borracheiro" onclick="selecionarSOSCategoria('borracheiro')">
      <div class="sos-cat-ico borracha">🔧</div>
      <div class="sos-cat-info">
        <div class="sos-cat-nome">Borracheiros</div>
        <div class="sos-cat-desc">Pneus, reparos e calibragem</div>
      </div>
      <div class="sos-cat-check">
        <svg viewBox="0 0 24 24" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </button>
    <button class="sos-cat-item" id="sos-cat-mecanica" onclick="selecionarSOSCategoria('mecanica')">
      <div class="sos-cat-ico mecanica">🔩</div>
      <div class="sos-cat-info">
        <div class="sos-cat-nome">Mecânicas</div>
        <div class="sos-cat-desc">Oficinas e auto centers</div>
      </div>
      <div class="sos-cat-check">
        <svg viewBox="0 0 24 24" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </button>
  </div>

  <!-- BOTÃO SOS FLUTUANTE -->
  <!-- O overlay #plan-busca-overlay é criado dinamicamente no body por abrirBuscaDestino() -->

  <button id="btn-sos-float" onclick="abrirSOS()" title="SOS — Guinchos e Emergências">
    <svg viewBox="0 0 24 24" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    SOS
  </button>

  <nav id="bottom-nav">
    <!-- Melhor: único item com label — indica o melhor posto -->
    <button class="nav-item" id="nav-melhor" onclick="goToMelhor()">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      <span class="nav-label">Melhor</span>
    </button>
    <!-- Demais: só ícone -->
    <button class="nav-item nav-icon-only" id="nav-lista" onclick="goToView('lista')" title="Lista">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    </button>
    <button class="nav-item nav-icon-only" id="nav-mapa" onclick="goToView('mapa')" title="Mapa">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </button>
    <button class="nav-item nav-icon-only" id="nav-planejar" onclick="goToView('planejar')" title="Planejar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    </button>
    <button class="nav-item nav-icon-only" id="nav-perfil" onclick="goToView('perfil')" title="Perfil">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </button>
  </nav>

  <!-- Utilitários -->
  <div id="app-toast"></div>
  <div id="app-loading"><div class="app-spinner"></div></div>

</div><!-- #app-root -->

<!-- ══ TELA ASSINATURA — tela cheia, fora do #app-root ══ -->
<div id="modal-assinatura" style="position:fixed;inset:0;z-index:99999;background:#F5F5F5;display:flex;flex-direction:column;transform:translateX(100%);transition:transform 0.28s cubic-bezier(0.4,0,0.2,1);">
  <!-- Header laranja igual ao rp-subtela -->
  <div style="background:#FF6D00;padding:calc(env(safe-area-inset-top,0px) + 16px) 16px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;">
    <button onclick="fecharAssinatura()" style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.2);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <span id="assin-titulo-header" style="font-size:18px;font-weight:800;color:#fff;flex:1;">Assinatura Premium</span>
  </div>
  <!-- Corpo scrollável -->
  <div id="assin-body" style="flex:1;overflow-y:auto;padding:20px 16px calc(env(safe-area-inset-bottom,0px) + 24px);-webkit-overflow-scrolling:touch;">

    <!-- Step 1: Escolher plano -->
    <div id="assin-step1">

      <!-- Banner: já é premium (oculto por padrão, JS exibe quando ativa) -->
      <div id="assin-banner-ativo" style="display:none;background:linear-gradient(135deg,#1B5E20,#2E7D32);border-radius:16px;padding:16px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-size:24px;">👑</span>
          <div>
            <div style="font-size:15px;font-weight:800;color:#fff;">Plano Premium Ativo!</div>
            <div id="assin-banner-expira" style="font-size:12px;color:rgba(255,255,255,0.8);"></div>
          </div>
          <span id="assin-banner-plano-badge" style="margin-left:auto;background:rgba(255,255,255,0.15);color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;"></span>
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,0.7);border-top:1px solid rgba(255,255,255,0.15);padding-top:8px;">
          Você pode gerar um novo QR Code abaixo para renovar ou trocar de plano.
        </div>
      </div>

      <!-- Hero Premium -->
      <div style="background:linear-gradient(135deg,#FF6D00,#FF8F00);border-radius:20px;padding:24px;margin-bottom:16px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">👑</div>
        <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px;">RotaPosto Premium</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.85);">Assine e economize muito mais!</div>
      </div>

      <!-- Features -->
      <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:#555;margin-bottom:12px;">O que você recebe:</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${['Todos os postos BR','Mapa em tempo real','Rota mais barata','Histórico completo','Sem anúncios','Suporte premium'].map(f => `
          <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#424242;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6D00" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            ${f}
          </div>`).join('')}
        </div>
      </div>

      <!-- Planos -->
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        <label id="label-plano-premium" onclick="selecionarPlano('premium')" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border:2px solid #FF6D00;border-radius:16px;cursor:pointer;background:#FFF8F5;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:20px;height:20px;border-radius:50%;border:2px solid #FF6D00;background:#FF6D00;display:flex;align-items:center;justify-content:center;" id="radio-premium">
              <div style="width:8px;height:8px;border-radius:50%;background:#fff;"></div>
            </div>
            <div>
              <div style="font-weight:700;font-size:14px;color:#1A1A1A;">Mensal</div>
              <div style="font-size:12px;color:#757575;">Cancele quando quiser</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800;font-size:20px;color:#FF6D00;">R$ 9,90</div>
            <div style="font-size:11px;color:#757575;">/mês</div>
          </div>
        </label>

        <label id="label-plano-anual" onclick="selecionarPlano('anual')" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border:2px solid #E0E0E0;border-radius:16px;cursor:pointer;background:#fff;position:relative;">
          <div style="position:absolute;top:-8px;right:12px;background:#00C853;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">2 MESES GRÁTIS</div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:20px;height:20px;border-radius:50%;border:2px solid #E0E0E0;background:#fff;display:flex;align-items:center;justify-content:center;" id="radio-anual">
              <div style="width:8px;height:8px;border-radius:50%;background:#fff;"></div>
            </div>
            <div>
              <div style="font-weight:700;font-size:14px;color:#1A1A1A;">Anual</div>
              <div style="font-size:12px;color:#757575;">Economize R$ 29,80</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800;font-size:20px;color:#1A1A1A;">R$ 89,00</div>
            <div style="font-size:11px;color:#757575;">/ano</div>
          </div>
        </label>
      </div>

      <!-- Botão assinar -->
      <button onclick="iniciarPagamentoPIX()" id="assin-btn-pix" style="width:100%;padding:16px;background:#FF6D00;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;">
        <svg width="22" height="22" viewBox="0 0 512 512" fill="currentColor"><path d="M242.4 292.5C247.8 287.1 255.1 284.1 262.5 284.1C269.9 284.1 277.2 287.1 282.6 292.5L350.2 360.1C355.6 365.5 358.7 372.8 358.7 380.2C358.7 387.6 355.6 394.9 350.2 400.3L282.6 467.9C277.2 473.3 269.9 476.4 262.5 476.4C255.1 476.4 247.8 473.3 242.4 467.9L174.8 400.3C169.4 394.9 166.3 387.6 166.3 380.2C166.3 372.8 169.4 365.5 174.8 360.1L242.4 292.5zM374.7 111.7C380.1 106.3 387.4 103.2 394.8 103.2C402.2 103.2 409.5 106.3 414.9 111.7L482.5 179.3C487.9 184.7 491 192 491 199.4C491 206.8 487.9 214.1 482.5 219.5L414.9 287.1C409.5 292.5 402.2 295.6 394.8 295.6C387.4 295.6 380.1 292.5 374.7 287.1L307.1 219.5C301.7 214.1 298.6 206.8 298.6 199.4C298.6 192 301.7 184.7 307.1 179.3L374.7 111.7zM110.1 111.7C115.5 106.3 122.8 103.2 130.2 103.2C137.6 103.2 144.9 106.3 150.3 111.7L217.9 179.3C223.3 184.7 226.4 192 226.4 199.4C226.4 206.8 223.3 214.1 217.9 219.5L150.3 287.1C144.9 292.5 137.6 295.6 130.2 295.6C122.8 295.6 115.5 292.5 110.1 287.1L42.5 219.5C37.1 214.1 34 206.8 34 199.4C34 192 37.1 184.7 42.5 179.3L110.1 111.7z"/></svg>
        Pagar com PIX
      </button>
      <p style="text-align:center;font-size:11px;color:#9E9E9E;margin-top:10px;">
        Pagamento 100% seguro • Cancele quando quiser
      </p>
    </div>

    <!-- Step 2: QR Code PIX -->
    <div id="assin-step2" style="display:none;">
      <h2 style="font-size:18px;font-weight:700;color:#1A1A1A;text-align:center;margin:0 0 4px;">Pague com PIX</h2>
      <p id="assin-step2-desc" style="text-align:center;font-size:13px;color:#757575;margin:0 0 12px;">Escaneie o QR Code para ativar o Premium</p>
      <!-- Banner modo demo (oculto por padrão) -->
      <div id="assin-demo-warn" style="display:none;background:#FFF3E0;border:1.5px solid #FF6D00;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#E65100;text-align:center;">
        ⚠️ <strong>Modo demonstração</strong> — integração de pagamento em configuração.<br>Em breve você poderá assinar o Premium com PIX real.
      </div>

      <div style="display:flex;justify-content:center;margin-bottom:16px;">
        <div style="background:#fff;border:2px solid #E0E0E0;border-radius:20px;padding:16px;">
          <img id="assin-qr-img" src="" alt="QR Code PIX" style="width:200px;height:200px;display:block;" />
        </div>
      </div>

      <div style="text-align:center;margin-bottom:16px;">
        <span id="assin-valor-label" style="font-size:28px;font-weight:800;color:#FF6D00;"></span>
        <span id="assin-ciclo-label" style="font-size:14px;color:#757575;"></span>
      </div>

      <div style="background:#F5F5F5;border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:8px;">
        <span id="assin-brcode-txt" style="font-size:10px;color:#424242;word-break:break-all;flex:1;font-family:monospace;line-height:1.5;user-select:all;cursor:text;"></span>
      </div>
      <button onclick="copiarCodigo()" style="background:#FF6D00;color:#fff;border:none;border-radius:10px;padding:11px 20px;font-size:13px;font-weight:700;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:4px;"><i class="fas fa-copy"></i> Copiar código PIX completo</button>

      <div id="assin-status-box" style="background:#FFF3E0;border:1px solid #FFB300;border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
        <div id="assin-status-dot" style="width:10px;height:10px;border-radius:50%;background:#FFB300;flex-shrink:0;animation:pulse-dot 1.5s infinite;"></div>
        <span id="assin-status-txt" style="font-size:13px;color:#E65100;font-weight:600;">Aguardando pagamento...</span>
      </div>

      <div style="font-size:12px;color:#757575;line-height:1.6;margin-bottom:16px;">
        <b style="color:#1A1A1A;">Como pagar:</b><br/>
        1. Abra seu app de banco<br/>
        2. Vá em Pix > Pagar com QR Code ou Copia e Cola<br/>
        3. Confirme o pagamento<br/>
        4. Seu Premium é ativado automaticamente!
      </div>

      <button onclick="voltarStep1()" style="width:100%;padding:14px;background:#F5F5F5;color:#757575;border:none;border-radius:16px;font-size:14px;font-weight:600;cursor:pointer;">
        Escolher outro plano
      </button>
    </div>

    <!-- Step 3: Ativado! -->
    <div id="assin-step3" style="display:none;text-align:center;padding-top:40px;">
      <div style="width:80px;height:80px;background:#E8F5E9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;margin:0 auto 20px;">🎉</div>
      <h2 style="font-size:22px;font-weight:800;color:#1A1A1A;margin:0 0 8px;">Premium ativado!</h2>
      <p style="font-size:14px;color:#757575;margin:0 0 24px;">Bem-vindo ao RotaPosto Premium!<br/>Aproveite todos os benefícios.</p>
      <div id="assin-expira-label" style="background:#F1F8E9;border-radius:12px;padding:12px;margin-bottom:20px;font-size:13px;color:#558B2F;font-weight:600;"></div>
      <button onclick="fecharAssinatura()" style="width:100%;padding:16px;background:#FF6D00;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:10px;">
        Aproveitar o Premium!
      </button>
      <button onclick="mostrarStep1()" style="width:100%;padding:14px;background:#F5F5F5;color:#424242;border:none;border-radius:16px;font-size:14px;font-weight:600;cursor:pointer;">
        Ver planos / Gerar novo PIX
      </button>
    </div>

  </div>
</div>
<!-- /TELA ASSINATURA -->

<!-- ══ TELA PERFIL — position:fixed, fora do #app-root ══ -->
<div id="rp-perfil">
  <!-- Header escuro com avatar -->
  <div id="perfil-header">
    <button onclick="fecharPerfil()" style="position:absolute;top:calc(var(--sat) + 12px);right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1;">✕</button>
    <div id="perfil-avatar-wrap" onclick="document.getElementById('input-foto-perfil').click()" title="Alterar foto">
      <img id="perfil-avatar" src="" alt="Foto" style="display:none;"/>
      <div id="perfil-avatar-inicial">?</div>
      <div id="perfil-avatar-cam">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
      <div id="perfil-upload-spinner"></div>
    </div>
    <input type="file" id="input-foto-perfil" accept="image/*" style="display:none;" onchange="uploadFotoPerfil(this)"/>
    <div id="perfil-info">
      <div id="perfil-ola">Olá, <span id="perfil-nome">Usuário</span>!</div>
      <div id="perfil-badge-premium" class="badge-premium" style="display:none;">👑 Premium</div>
      <div id="perfil-plano-status" style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:2px;">Conta gratuita</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:4px;">Toque na foto para alterar</div>
    </div>
  </div>
  <!-- Lista de itens do menu -->
  <div id="perfil-menu-list">
    <div id="menu-item-minhaconta">${buildMenuItem('person', 'Minha conta', "abrirMinhaConta()")}</div>
    <div id="menu-item-veiculos">${buildMenuItem('car', 'Meus veículos', "abrirMeusVeiculos()")}</div>
    <div id="menu-item-assinatura">${buildMenuItem('card', 'Assinatura', "goToAssinatura()")}</div>
    <div id="menu-item-pagamento">${buildMenuItem('creditcard', 'Formas de pagamento', "abrirFormasPagamento()")}</div>
    <div id="menu-item-notificacoes">${buildMenuItem('bell', 'Notificações', "abrirNotificacoes()")}</div>
    <div id="menu-item-pontos"><div class="menu-item" onclick="abrirPainelGamificacao()">
      <div class="menu-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
      <div style="flex:1;"><span class="menu-item-label">Pontos &amp; Níveis</span><div id="gamif-pontos-preview" style="font-size:11px;color:#FF6D00;margin-top:1px;"></div></div>
      <div class="menu-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
    </div></div>
    <div id="menu-item-indique">${buildMenuItem('gift', 'Indique e ganhe', "abrirIndiqueGanhe()")}</div>
    <div id="menu-item-ajuda">${buildMenuItem('help', 'Ajuda e suporte', "abrirAjuda()")}</div>
    <div id="menu-item-config">${buildMenuItem('settings', 'Configurações', "abrirConfiguracoes()")}</div>
    <div id="menu-item-instalar" style="display:none;">${buildMenuItem('download', 'Instalar app', "instalarOuMostrarPWA()")}</div>
    <div class="menu-item menu-item-sair" onclick="doLogout()">
      <div class="menu-item-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </div>
      <span class="menu-item-label">Sair</span>
    </div>
  </div>
</div>

<!-- ══ SUB-TELA CHEIA (menu perfil) — FORA do #app-root para escapar de overflow:hidden ══ -->
<div id="rp-subtela">
  <div id="rp-subtela-header">
    <button id="rp-subtela-back" onclick="fecharTela()">
      <svg viewBox="0 0 24 24" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <div id="rp-subtela-titulo">Título</div>
  </div>
  <div id="rp-subtela-body"></div>
</div>

<script>
  // Chave Google injetada pelo servidor
  const _GKEY = '${googleApiKey || ''}';

  // ══════════════════════════════════════════════════════
  //  ESTADO
  // ══════════════════════════════════════════════════════
  let currentView = 'mapa';
  let mapMain = null, mapPlan = null;
  let userLat = null, userLng = null; // null até GPS real chegar — nunca iniciar em SP
  let _geoJaObtida = false; // true após localização ser obtida (ou timeout)
  let postosData = [];
  let semanaANP = '';   // semana de referência ANP — preenchida pela API
  let selectedFuel = 'gasolina';
  let selectedPosto = null;
  let currentMonthIdx = 4; // Maio 2024
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // ── Estado dos filtros ────────────────────────────────────────────────────
  let filtros = {
    raioKm: 5,
    ordenar: 'preco',       // 'preco' | 'distancia' | 'avaliacao'
    somenteAbertos: false,
    somentePrecoReal: false,
    avaliacaoMin: 0,        // 0 = todos, 3 = 3+, 4 = 4+
    somenteComDesconto: false
  };
  const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // ── Usuário logado ──
  const userStr = localStorage.getItem('rp_user');
  let currentUser = null;
  try { currentUser = userStr ? JSON.parse(userStr) : null; } catch {}

  // ══════════════════════════════════════════════════════
  //  NAVEGAÇÃO
  // ══════════════════════════════════════════════════════
  function goToView(viewId) {
    // Perfil é tela fixed separada — não usa o sistema de views
    if (viewId === 'perfil') { abrirPerfil(); return; }

    // Fechar perfil se estiver aberto
    fecharPerfil();

    // Ocultar tudo
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Mostrar view
    const view = document.getElementById('view-' + viewId);
    if (view) view.classList.add('active');

    // Header: visível só em mapa e lista
    const header = document.getElementById('app-header');
    if (viewId === 'mapa' || viewId === 'lista') {
      header.style.display = 'block';
    } else {
      header.style.display = 'none';
    }

    // Botão SOS flutuante: SEMPRE visível exceto na própria tela SOS
    const btnSos = document.getElementById('btn-sos-float');
    if (btnSos) {
      btnSos.style.display = viewId === 'sos' ? 'none' : 'flex';
      // Posição controlada só pelo CSS (top:50%, right:16px) — não ajustar aqui
    }

    // Bottom nav: atualizar ativo
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const navMap = { mapa: 'mapa', lista: 'lista', planejar: 'planejar', relatorios: 'perfil', detalhes: 'lista', sos: '' };
    const navId = navMap[viewId] || viewId;
    const navBtn = document.getElementById('nav-' + navId);
    if (navBtn) navBtn.classList.add('active');

    // Melhor → mapa com nav melhor
    if (viewId === 'mapa') {
      document.getElementById('nav-melhor').classList.add('active');
      document.getElementById('nav-mapa').classList.remove('active');
    }

    currentView = viewId;

    // Ao sair do mapa → resetar flag do card para não aparecer ao voltar
    if (viewId !== 'mapa') {
      _mapCardVisivel = false;
      var cardEl = document.getElementById('map-card');
      if (cardEl) cardEl.style.display = 'none';
    }

    // Esconder/mostrar container Leaflet para evitar tiles vazando sobre outras views
    const mapLeaflet = document.getElementById('map-leaflet');
    if (mapLeaflet) mapLeaflet.style.visibility = (viewId === 'mapa') ? 'visible' : 'hidden';

    // Init mapa: só se a localização já foi obtida (ou após timeout)
    // Se ainda não temos geo, _initLocalizacao() vai chamar initMapMain() quando pronto
    if (viewId === 'mapa' && !mapMain && _geoJaObtida) initMapMain();
    // Leaflet: forçar recalculo de tamanho quando a view mapa aparecer
    if (viewId === 'mapa' && mapMain) {
      setTimeout(() => { if (mapLeaflet) mapLeaflet.style.visibility = 'visible'; mapMain.invalidateSize(); }, 100);
    }
    if (viewId === 'planejar') {
      renderPlanCarTabs();
      // Tem destino livre digitado?
      if (!mapPlan && planDestLat && planDestLng) {
        tracarRotaPlan(planDestLat, planDestLng, planDestNome || 'Destino', '');
      } else if (!mapPlan && selectedPosto) {
        initMapPlan();
      } else if (mapPlan) {
        var dist = planDestLat ? calcHaversinePlan(userLat, userLng, planDestLat, planDestLng)
          : (selectedPosto?.distancia || 1.2);
        var preco = selectedPosto?.preco || selectedPosto?.precos?.[selectedFuel] || 0;
        atualizarCustoPlan(dist, preco);
      }
    }
    if (viewId === 'lista') renderLista();

    // Atualizar preview de pontos no menu de perfil
    if (viewId === 'perfil') {
      setTimeout(function() {
        var prev = document.getElementById('gamif-pontos-preview');
        if (prev && typeof getPontosGamif === 'function') {
          var pts = getPontosGamif();
          var nv = getNivelGamif();
          prev.textContent = nv.icone + ' ' + pts + ' pts • ' + nv.nome;
        }
      }, 100);
    }
  }

  // ══════════════════════════════════════════════════════
  //  SOS — GUINCHOS, BORRACHEIROS, MECÂNICAS
  // ══════════════════════════════════════════════════════
  let sosTipoAtivo = 'todos';
  let sosResultados = [];
  let sosUsosCount = 0;

  function abrirSOS() {
    goToView('sos');
    // Atualizar badge premium
    const badge = document.getElementById('sos-badge-premium');
    if (badge) badge.style.display = currentUser?.premium ? 'block' : 'none';
    buscarServicosSOSComLocalizacao(sosTipoAtivo);
  }

  function buscarServicosSOSComLocalizacao(tipo) {
    sosTipoAtivo = tipo;
    const body = document.getElementById('sos-body');
    body.innerHTML = '<div class="sos-loading" id="sos-loading"><div class="sos-loading-spinner"></div>Obtendo sua localização…</div>';

    if (!navigator.geolocation) {
      // Fallback: usar coordenada do mapa (já obtida no init)
      if (userLat && userLng) {
        buscarServicosSOSAPI(userLat, userLng, tipo);
      } else {
        body.innerHTML = '<div class="sos-loading">⚠️ Geolocalização não disponível no seu dispositivo.</div>';
      }
      return;
    }

    // Usar localização já obtida pelo GPS Google
    if (userLat && userLng) {
      buscarServicosSOSAPI(userLat, userLng, tipo);
    } else {
      body.innerHTML = '<div class="sos-loading">⚠️ Localização não disponível ainda. Aguarde e tente novamente.</div>';
    }
  }

  async function buscarServicosSOSAPI(lat, lng, tipo) {
    const body = document.getElementById('sos-body');
    body.innerHTML = '<div class="sos-loading"><div class="sos-loading-spinner"></div>Buscando serviços num raio de 10 km…</div>';

    try {
      const payload = { lat, lng, tipo };
      if (currentUser?.uid) payload.userId = currentUser.uid;

      const res = await fetch('/api/sos/servicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 403 && data.erro === 'premium_required') {
        renderSOSBloqueado(lat, lng, tipo);
        return;
      }

      if (!res.ok || !data.sucesso) {
        body.innerHTML = '<div class="sos-loading">⚠️ ' + (data.erro || 'Erro ao buscar serviços.') + '</div>';
        return;
      }

      sosResultados = data.servicos || [];
      sosUsosCount = data.usos || 1;
      renderSOSResultados(lat, lng, tipo, data.degustacao);

    } catch (e) {
      body.innerHTML = '<div class="sos-loading">⚠️ Sem conexão. Verifique sua internet e tente novamente.</div>';
    }
  }

  function renderSOSResultados(lat, lng, tipo, isDegustacao) {
    const body = document.getElementById('sos-body');
    // Botão "Todos" com label dinâmico e chevron (abre bottom sheet)
    var catLabel = sosTipoAtivo === 'todos' ? '🆘 Todos'
      : sosTipoAtivo === 'guincho' ? '🚛 Guinchos'
      : sosTipoAtivo === 'borracheiro' ? '🔧 Borracheiros'
      : '🔩 Mecânicas';
    var filtrosHTML = '<div class="sos-filtros">'
      + '<button class="sos-chip-todos" onclick="abrirSOSCatSheet()">'
      + '<span>' + catLabel + '</span>'
      + '<svg viewBox="0 0 24 24" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
      + '</button>'
      + '</div>';

    // Banner de aviso de degustação (discreta - só 1 uso restante)
    var bannerHTML = '';
    if (isDegustacao && !currentUser?.premium) {
      bannerHTML = '<div class="sos-banner-upgrade">'
        + '<h3>🎁 Uso gratuito utilizado!</h3>'
        + '<p>Você tem direito a 1 busca grátis. Para usar ilimitadamente, assine o Premium por R$ 9,90/mês.</p>'
        + '<button onclick="fecharTela();goToAssinatura();">Assinar Premium</button>'
        + '</div>';
    }

    if (sosResultados.length === 0) {
      body.innerHTML = filtrosHTML + bannerHTML
        + '<div class="sos-loading">😕 Nenhum serviço encontrado num raio de 10 km.<br><br><small>Tente mudar o tipo de serviço.</small></div>';
      return;
    }

    var cardsHTML = sosResultados.map(s => {
      var telLink = s.telefone ? s.telefone.replace(/\s+/g, '') : null;
      var whatsNum = telLink ? telLink.replace(/[^0-9]/g, '') : null;
      var whatsMsg = encodeURIComponent('Olá, vi seu contato pelo app RotaPosto. Estou precisando de ' +
        (sosTipoAtivo === 'guincho' ? 'um guincho' : sosTipoAtivo === 'borracheiro' ? 'um borracheiro' : 'assistência mecânica') +
        ' na minha localização atual. Você está disponível?');
      var abertoLabel = s.aberto === true ? '<span class="sos-aberto sim">Aberto</span>'
        : s.aberto === false ? '<span class="sos-aberto nao">Fechado</span>' : '';
      var ratingLabel = s.avaliacao ? '<span class="sos-rating">⭐ ' + s.avaliacao + (s.total_avaliacoes ? ' (' + s.total_avaliacoes + ')' : '') + '</span>' : '';
      var btnLigar = telLink
        ? '<a href="tel:' + telLink + '" class="sos-btn-ligar">📞 Ligar</a>'
        : '<span style="font-size:11px;color:#bbb;text-align:center;display:block;">Sem tel.</span>';
      var btnWhats = whatsNum
        ? '<a href="https://wa.me/' + whatsNum + '?text=' + whatsMsg + '" target="_blank" class="sos-btn-whats">💬 WhatsApp</a>'
        : '';
      // Botão Ir até lá (abre Google Maps com destino)
      var coordsLat = s.lat || '';
      var coordsLng = s.lng || '';
      var btnIrLa = (coordsLat && coordsLng)
        ? '<a href="https://www.google.com/maps/dir/?api=1&destination=' + coordsLat + ',' + coordsLng + '&travelmode=driving" class="sos-btn-irla" onclick="window.location.href=this.href;return false;">🗺️ Ir até lá</a>'
        : '<a href="https://www.google.com/maps/search/' + encodeURIComponent(s.nome + ' ' + (s.endereco || '')) + '" class="sos-btn-irla" onclick="window.location.href=this.href;return false;">🗺️ Ir até lá</a>';
      return '<div class="sos-card">'
        + '<div class="sos-card-emoji">' + s.emoji + '</div>'
        + '<div class="sos-card-info">'
        + '<div class="sos-card-nome">' + s.nome + '</div>'
        + '<div class="sos-card-end">' + s.endereco + '</div>'
        + '<div class="sos-card-meta"><span class="sos-dist">' + s.distancia_km + ' km</span>' + abertoLabel + ratingLabel + '</div>'
        + '</div>'
        + '<div class="sos-card-btns">' + btnLigar + btnWhats + btnIrLa + '</div>'
        + '</div>';
    }).join('');

    body.innerHTML = filtrosHTML + bannerHTML + cardsHTML;
  }

  // ── Bottom sheet de categorias SOS ────────────────────────────────────────
  function abrirSOSCatSheet() {
    var overlay = document.getElementById('sos-cat-sheet-overlay');
    var sheet   = document.getElementById('sos-cat-sheet');
    var btn     = document.querySelector('.sos-chip-todos');
    if (!overlay || !sheet) return;
    // Marcar item ativo no sheet
    var catMap = { guincho: 'sos-cat-guincho', borracheiro: 'sos-cat-borracheiro', mecanica: 'sos-cat-mecanica' };
    document.querySelectorAll('.sos-cat-item').forEach(el => el.classList.remove('ativo'));
    var activeId = catMap[sosTipoAtivo];
    if (activeId) { var el = document.getElementById(activeId); if (el) el.classList.add('ativo'); }
    overlay.classList.add('visivel');
    sheet.classList.add('visivel');
    if (btn) btn.classList.add('aberto');
  }

  function fecharSOSCatSheet() {
    var overlay = document.getElementById('sos-cat-sheet-overlay');
    var sheet   = document.getElementById('sos-cat-sheet');
    var btn     = document.querySelector('.sos-chip-todos');
    if (overlay) overlay.classList.remove('visivel');
    if (sheet)   sheet.classList.remove('visivel');
    if (btn)     btn.classList.remove('aberto');
  }

  function selecionarSOSCategoria(tipo) {
    fecharSOSCatSheet();
    // Disparar nova busca com o tipo selecionado (usa userLat/userLng do GPS)
    buscarServicosSOSComLocalizacao(tipo);
  }

  function renderSOSBloqueado(lat, lng, tipo) {
    const body = document.getElementById('sos-body');
    // Botão "Todos" com label dinâmico e chevron (abre bottom sheet)
    var catLabel2 = sosTipoAtivo === 'todos' ? '🆘 Todos'
      : sosTipoAtivo === 'guincho' ? '🚛 Guinchos'
      : sosTipoAtivo === 'borracheiro' ? '🔧 Borracheiros'
      : '🔩 Mecânicas';
    var filtrosHTML = '<div class="sos-filtros">'
      + '<button class="sos-chip-todos" onclick="abrirSOSCatSheet()">'
      + '<span>' + catLabel2 + '</span>'
      + '<svg viewBox="0 0 24 24" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
      + '</button>'
      + '</div>';

    body.innerHTML = filtrosHTML
      + '<div style="text-align:center;padding:32px 20px;">'
      + '<div style="font-size:56px;margin-bottom:12px;">🚨</div>'
      + '<div style="font-size:18px;font-weight:800;color:#1A1A1A;margin-bottom:8px;">Recurso Premium</div>'
      + '<div style="font-size:14px;color:#888;line-height:1.6;margin-bottom:24px;">Você já usou a busca gratuita.<br>Assine o <strong>Premium</strong> por apenas <strong>R$ 9,90/mês</strong> e tenha acesso ilimitado ao SOS RotaPosto — guinchos, borracheiros e mecânicas mais próximos de você, 24h.</div>'
      + '<div style="background:#FFF8F5;border-radius:16px;padding:16px;margin-bottom:24px;text-align:left;">'
      + '<div style="font-size:13px;font-weight:700;color:#FF6D00;margin-bottom:10px;">✦ O que você ganha com o Premium:</div>'
      + ['🚛 Guinchos próximos 24h', '🔧 Borracheiros e mecânicas', '📞 Liga direto ou WhatsApp', '⭐ Avaliação e distância exata', '🔔 Alertas de preço baixo'].map(f => '<div style="font-size:13px;color:#444;padding:4px 0;">'+f+'</div>').join('')
      + '</div>'
      + '<button onclick="goToAssinatura()" style="width:100%;padding:16px;background:#FF6D00;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:800;cursor:pointer;">Assinar por R$ 9,90/mês</button>'
      + '<button onclick="goToView(&quot;mapa&quot;)" style="width:100%;padding:12px;background:none;color:#888;border:none;font-size:14px;cursor:pointer;margin-top:8px;">Agora não</button>'
      + '</div>';
  }

  // ══════════════════════════════════════════════════════
  //  MAPA PRINCIPAL (Tela 7)
  // ══════════════════════════════════════════════════════
  function initMapMain() {
    mapMain = L.map('map-leaflet', {
      zoomControl: false,
      attributionControl: false
    }).setView([userLat, userLng], 14);

    // Tiles claros (padrão)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(mapMain);

    // Forçar recalculo de tamanho após o container se tornar visível
    // (Leaflet bug clássico: container estava display:none → tiles não carregam)
    setTimeout(() => mapMain.invalidateSize(), 100);
    setTimeout(() => mapMain.invalidateSize(), 400);

    // Ponto do usuário
    const userIcon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#1565C0;border:3px solid white;box-shadow:0 0 0 6px rgba(21,101,192,0.2)"></div>',
      iconSize: [16, 16], iconAnchor: [8, 8]
    });
    var userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(mapMain);
    userMarker._isUserMarker = true;

    // Carregar postos
    loadPostos();
  }

  // Controla se o card "Melhor posto" deve estar visível
  // Começa false: só aparece ao clicar em "Melhor" no nav ou num marcador no mapa
  var _mapCardVisivel = false;

  function goToMelhor() {
    _mapCardVisivel = true;
    goToView('mapa');
    // Se já tiver dados carregados, exibe imediatamente o melhor posto
    if (postosData && postosData.length > 0) {
      updateMapCard(postosData[0], 0);
    }
  }

  async function loadPostos() {
    try {
      const raio = filtros.raioKm || 5;
      const url = '/api/postos?lat='+userLat+'&lng='+userLng+'&raio='+raio+'&combustivel='+selectedFuel+'&litros=50&consumo=12';
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.postos && data.postos.length > 0) {
        postosData = data.postos;
        if (data.estatisticas?.semanaANP) semanaANP = data.estatisticas.semanaANP;
        addMapMarkers();
        // NÃO exibe card automaticamente — só quando usuário clicar
      }
    } catch(e) {
      // Dados demo
      postosData = getDemoPostos();
      addMapMarkers();
      // NÃO exibe card automaticamente — só quando usuário clicar
    }
  }

  function addMapMarkers() {
    if (!mapMain) return;
    // Limpar marcadores antigos
    mapMain.eachLayer(layer => {
      if (layer._isBalloon) mapMain.removeLayer(layer);
    });

    postosData.slice(0, 20).forEach((p, i) => {
      const preco = p.preco || p.precos?.[selectedFuel];
      if (!preco) return;

      const precoFmt = 'R$ ' + preco.toFixed(2).replace('.', ',');
      const isBest = i === 0;
      const cor = isBest ? '#00A651' : (preco > 6.5 ? '#E53935' : '#FF6D00');
      const shadow = isBest ? '0 2px 10px rgba(0,166,81,0.5)' : '0 2px 8px rgba(0,0,0,0.25)';
      const scale = isBest ? 'transform:scale(1.1);transform-origin:center bottom;' : '';
      const star = isBest ? '⭐ ' : '';

      const icon = L.divIcon({
        className: '',
        html: '<div style="padding:5px 10px;border-radius:6px;background:'+cor+';color:white;font-size:13px;font-weight:700;box-shadow:'+shadow+';white-space:nowrap;font-family:Inter,sans-serif;'+scale+'">'+star+precoFmt+'</div>',
        iconSize: [isBest ? 100 : 80, 30], iconAnchor: [isBest ? 50 : 40, 30]
      });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(mapMain);
      marker._isBalloon = true;
      marker._postoIdx = i;
      marker.on('click', () => {
        // Clicar num marcador sempre mostra o card
        _mapCardVisivel = true;
        updateMapCard(p, i);
        selectedPosto = p;
      });
    });
  }

  function calcTempo(distKm) {
    if (!distKm) return '-';
    const mins = Math.round((distKm / 30) * 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? h + 'h ' + m + 'min' : h + 'h';
    }
    return mins + ' min';
  }

  function updateMapCard(p, idx) {
    selectedPosto = p;
    const _idx = (idx !== undefined && idx !== null) ? idx : postosData.indexOf(p);
    const preco = p.preco || p.precos?.[selectedFuel];
    const precoFmt = preco ? 'R$ ' + preco.toFixed(2).replace('.', ',') + ' /L' : '-';
    const dist = p.distancia ? p.distancia.toFixed(1).replace('.', ',') + ' km' : '-';
    const tempo = calcTempo(p.distancia);

    const logoEl = document.getElementById('map-card-logo');
    const bandInfo = getBandeiraCor(p.bandeira || p.nome);
    logoEl.textContent = bandInfo.emoji;
    logoEl.style.background = bandInfo.bg;
    logoEl.style.borderColor = bandInfo.border;
    const nomeEl = document.getElementById('map-card-nome');
    nomeEl.textContent = p.nome;
    nomeEl.style.cursor = 'pointer';
    nomeEl.style.textDecoration = 'underline';
    nomeEl.style.textDecorationColor = 'rgba(255,109,0,0.4)';
    nomeEl.onclick = () => { if (_idx >= 0) openDetalhes(_idx); };
    document.getElementById('map-card-preco').textContent = precoFmt;
    document.getElementById('map-card-dist').textContent = dist + ' • ' + tempo;
    // Só mostrar o card se o usuário clicou em "Melhor" ou clicou num marcador
    if (typeof _mapCardVisivel !== 'undefined' && _mapCardVisivel) {
      document.getElementById('map-card').style.display = 'block';
    }
  }

  // ══════════════════════════════════════════════════════
  //  MAPA PLANEJAR (Tela 10)
  // ══════════════════════════════════════════════════════
  function initMapPlan() {
    const dest = selectedPosto || (postosData[0] || null);
    const destLat = dest?.lat || (userLat - 0.01);
    const destLng = dest?.lng || (userLng + 0.01);

    mapPlan = L.map('plan-map', {
      zoomControl: false,
      attributionControl: false,
      dragging: false, scrollWheelZoom: false, touchZoom: false
    }).setView([(userLat + destLat) / 2, (userLng + destLng) / 2], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapPlan);

    // Marcador origem (azul)
    const originIcon = L.divIcon({
      className: '',
      html: '<svg width="28" height="36" viewBox="0 0 28 36" fill="none"><path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="#1565C0"/><circle cx="14" cy="14" r="6" fill="white"/></svg>',
      iconSize: [28, 36], iconAnchor: [14, 36]
    });
    L.marker([userLat, userLng], { icon: originIcon }).addTo(mapPlan);

    // Marcador destino (laranja)
    const destIcon = L.divIcon({
      className: '',
      html: '<svg width="28" height="36" viewBox="0 0 28 36" fill="none"><path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="#FF6D00"/><circle cx="14" cy="14" r="6" fill="white"/></svg>',
      iconSize: [28, 36], iconAnchor: [14, 36]
    });
    L.marker([destLat, destLng], { icon: destIcon }).addTo(mapPlan);

    // Linha de rota azul
    const routeLine = L.polyline([[userLat, userLng], [destLat, destLng]], {
      color: '#1565C0', weight: 4, dashArray: '8, 4', opacity: 0.8
    }).addTo(mapPlan);

    mapPlan.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

    // Calcular distância e tempo
    var dist = dest && dest.distancia ? dest.distancia : calcHaversinePlan(userLat, userLng, destLat, destLng);
    document.getElementById('plan-dist').textContent = dist.toFixed(1).replace('.', ',') + ' km';
    document.getElementById('plan-time').textContent = calcTempo(dist);

    // Atualizar info do card posto
    if (dest) {
      const preco = dest.preco || dest.precos?.[selectedFuel] || 0;
      document.getElementById('plan-logo').textContent = getEmoji(dest.bandeira || dest.nome);
      document.getElementById('plan-nome').textContent = dest.nome;
      document.getElementById('plan-end').textContent = dest.endereco || dest.nome;
      document.getElementById('plan-preco').innerHTML = preco
        ? 'R$ ' + preco.toFixed(2).replace('.', ',') + '<span class="plan-preco-unit">/L</span>'
        : '—';
      document.getElementById('plan-posto-card').style.display = 'flex';
      document.getElementById('btn-iniciar-nav').style.display = 'block';

      // Calcular custo com veículo selecionado
      atualizarCustoPlan(dist, preco);
    }

    // Renderizar tabs de veículo
    renderPlanCarTabs();
  }

  function calcHaversinePlan(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
            Math.sin(dLng/2)*Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function getVeiculos() {
    try { return JSON.parse(localStorage.getItem('rp_vehicles') || '[]'); } catch(e) { return []; }
  }
  function salvarVeiculos(lista) {
    localStorage.setItem('rp_vehicles', JSON.stringify(lista));
    // migrar para novo formato se existir legacy
    localStorage.removeItem('rp_vehicle');
  }
  function getVeiculoAtivo() {
    var lista = getVeiculos();
    if (lista.length === 0) {
      // tentar migrar do formato antigo
      try {
        var legado = JSON.parse(localStorage.getItem('rp_vehicle') || 'null');
        if (legado) {
          var migrado = { id: 'v1', nome: legado.type || 'Meu carro', tipo: legado.type || 'Carro de passeio', consumo: legado.consumption || 12, tanque: legado.tank || 50, ativo: true };
          salvarVeiculos([migrado]);
          return migrado;
        }
      } catch(e) {}
      return null;
    }
    return lista.find(function(v) { return v.ativo; }) || lista[0];
  }
  var planVeiculoId = null; // id do veículo selecionado no painel Planejar

  function renderPlanCarTabs() {
    var lista = getVeiculos();
    var container = document.getElementById('plan-car-tabs');
    if (!container) return;
    var html = '';
    lista.forEach(function(v) {
      var ic = veiculoIcone(v.tipo);
      var isAtivo = planVeiculoId ? (v.id === planVeiculoId) : v.ativo;
      html += '<button class="plan-car-tab' + (isAtivo ? ' active' : '') + '" onclick="selecionarCarPlan(&quot;' + v.id + '&quot;)">'
        + '<span class="plan-car-tab-icon">' + ic + '</span>'
        + '<span class="plan-car-tab-info">'
        + '<span class="plan-car-tab-nome">' + v.nome + '</span>'
        + '<span class="plan-car-tab-consumo">' + v.consumo + ' km/L' + (v.placa ? ' · ' + v.placa : '') + '</span>'
        + '</span>'
        + '</button>';
    });
    if (lista.length < 2) {
      html += '<button class="plan-car-add" onclick="abrirMeusVeiculos()" title="Adicionar veículo">＋</button>';
    }
    if (lista.length === 0) {
      html = '<button style="flex:1;padding:12px;background:var(--orange-light);border:1.5px dashed var(--orange);border-radius:12px;font-size:13px;font-weight:600;color:var(--orange);cursor:pointer;" onclick="abrirMeusVeiculos()">＋ Cadastrar meu veículo para calcular o custo</button>';
    }
    container.innerHTML = html;
  }

  function selecionarCarPlan(id) {
    planVeiculoId = id;
    renderPlanCarTabs();
    // recalcular custo
    var dest = selectedPosto || (postosData[0] || null);
    if (!dest) return;
    var dist = dest.distancia || calcHaversinePlan(userLat, userLng, dest.lat, dest.lng);
    var preco = dest.preco || dest.precos?.[selectedFuel] || 0;
    atualizarCustoPlan(dist, preco);
  }

  function atualizarCustoPlan(distKm, precoLitro) {
    var lista = getVeiculos();
    var veh = planVeiculoId ? lista.find(function(v) { return v.id === planVeiculoId; }) : getVeiculoAtivo();
    var panel = document.getElementById('plan-custo-panel');
    if (!panel) return;

    if (!veh) {
      panel.classList.add('sem-veiculo');
      document.getElementById('pcp-dist').textContent = distKm ? distKm.toFixed(1).replace('.', ',') + ' km' : '—';
      document.getElementById('pcp-litros').textContent = '—';
      document.getElementById('pcp-custo').textContent = '—';
      return;
    }

    panel.classList.remove('sem-veiculo');
    var litros = distKm / veh.consumo;
    var custo = precoLitro > 0 ? litros * precoLitro : null;

    document.getElementById('pcp-dist').textContent = distKm.toFixed(1).replace('.', ',') + ' km';
    document.getElementById('pcp-litros').textContent = litros.toFixed(2).replace('.', ',') + ' L';
    document.getElementById('pcp-custo').textContent = custo ? 'R$ ' + custo.toFixed(2).replace('.', ',') : '—';
  }

  function veiculoIcone(tipo) {
    if (!tipo) return '🚗';
    var t = tipo.toLowerCase();
    if (t.includes('moto')) return '🏍️';
    if (t.includes('caminhão') || t.includes('caminhao') || t.includes('van')) return '🚛';
    if (t.includes('elétrico') || t.includes('eletrico') || t.includes('híbrido') || t.includes('hibrido')) return '⚡';
    if (t.includes('suv') || t.includes('picape') || t.includes('pickup')) return '🚙';
    return '🚗';
  }

  function editarOrigem() {
    var val = document.getElementById('plan-origin');
    var inp = document.getElementById('plan-origin-input');
    if (!val || !inp) return;
    inp.value = val.textContent === 'Minha localização' ? '' : val.textContent;
    val.style.display = 'none';
    inp.style.display = 'block';
    inp.focus();
  }

  async function confirmarOrigem() {
    var val = document.getElementById('plan-origin');
    var inp = document.getElementById('plan-origin-input');
    if (!val || !inp) return;
    var texto = inp.value.trim();
    inp.style.display = 'none';
    val.style.display = 'block';
    if (!texto) {
      val.textContent = 'Minha localização';
      return;
    }
    val.textContent = texto;
    // Geocodificar origem digitada
    try {
      var res = await fetch('/api/geocode?q=' + encodeURIComponent(texto));
      var data = await res.json();
      if (data && data.length > 0) {
        userLat = parseFloat(data[0].lat);
        userLng = parseFloat(data[0].lng);
        if (mapMain) { mapMain.setView([userLat, userLng], 14); }
        loadPostos();
        showToast('📍 Origem: ' + (data[0].nome || texto));
      }
    } catch(e) { /* silencioso */ }
  }

  function usarLocalizacaoAtual() {
    var el = document.getElementById('plan-origin');
    if (el) el.textContent = 'Minha localização';
    if (userLat && userLng) {
      _aplicarLocalizacao(userLat, userLng, true, true);
      showToast('📍 Localização atualizada!');
    } else {
      showToast('📍 Buscando localização via GPS…');
      _gpsNativo(false);
    }
  }

  // ── Destino livre no Planejar — overlay fullscreen ───────────────────────
  var planDestLat = null;
  var planDestLng = null;
  var planDestNome = null;
  var planDestTimer = null;

  // Abre o overlay fullscreen de busca
  function abrirBuscaDestino() {
    // Garantir que o overlay existe no body (fora de qualquer container com overflow:hidden)
    var overlay = document.getElementById('plan-busca-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'plan-busca-overlay';
      overlay.innerHTML = '<div id="plan-busca-header">'
        + '<button id="plan-busca-back" onclick="fecharBuscaOverlay()" style="width:38px;height:38px;flex-shrink:0;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:50%;">'
        + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>'
        + '</button>'
        + '<input id="plan-busca-input" type="text" placeholder="Cidade, shopping, endereço…"'
        + ' oninput="onBuscaOverlayInput(this.value)"'
        + ' onkeydown="if(event.key===' + String.fromCharCode(39) + 'Enter' + String.fromCharCode(39) + ')buscarDestinoPlan(this.value)"'
        + ' autocomplete="off" autocorrect="off" spellcheck="false"/>'
        + '</div>'
        + '<div id="plan-busca-lista"><div class="plan-busca-loading">🔍 Digite o destino acima para buscar</div></div>';
      document.body.appendChild(overlay);
    }
    var inp = document.getElementById('plan-busca-input');
    overlay.classList.add('aberto');
    if (inp) {
      inp.value = (planDestNome && planDestNome !== 'Cidade, endereço, shopping…') ? planDestNome : '';
    }
    document.getElementById('plan-busca-lista').innerHTML =
      '<div class="plan-busca-loading">🔍 Digite o destino acima para buscar</div>';
    setTimeout(function() { if (inp) { inp.focus(); inp.select(); } }, 80);
    // Se já tem texto, busca imediato
    if (inp && inp.value.length >= 3) buscarDestinoPlan(inp.value);
  }

  function fecharBuscaOverlay() {
    var overlay = document.getElementById('plan-busca-overlay');
    if (overlay) overlay.classList.remove('aberto');
  }

  // Compatibilidade com chamadas antigas
  function fecharBuscaDestino() { fecharBuscaOverlay(); }
  function fecharSugestoes()     { /* no-op: overlay fecha via fecharBuscaOverlay */ }
  function reposicionarSugestoes() { /* no-op: overlay é fullscreen */ }
  function onPlanDestInput(v) { /* no-op: substituído por onBuscaOverlayInput */ }

  function onBuscaOverlayInput(val) {
    clearTimeout(planDestTimer);
    if (!val || val.length < 3) {
      document.getElementById('plan-busca-lista').innerHTML =
        '<div class="plan-busca-loading">🔍 Continue digitando para buscar…</div>';
      return;
    }
    planDestTimer = setTimeout(function() { buscarDestinoPlan(val); }, 380);
  }

  async function buscarDestinoPlan(q) {
    if (!q || q.length < 2) return;
    var lista = document.getElementById('plan-busca-lista');
    if (!lista) return;

    lista.innerHTML = '<div class="plan-busca-loading">⏳ Buscando <b>"' + q + '"</b>…</div>';

    try {
      var res  = await fetch('/api/geocode?q=' + encodeURIComponent(q));
      var data = await res.json();

      if (!data || data.length === 0) {
        lista.innerHTML = '<div class="plan-busca-loading">😕 Nenhum resultado para <b>"' + q + '"</b>.<br>'
          + '<small style="color:#aaa;">Tente incluir a cidade: ex. "Shopping Vitória Salvador"</small></div>';
        return;
      }

      var html = data.slice(0, 8).map(function(r) {
        var nomeCompleto = r.nome || r.display_name || q;
        var partes  = nomeCompleto.split(',');
        var titulo  = partes[0].trim();
        var subtit  = '';
        if (r.cidade || r.estado) {
          subtit = [r.cidade, r.estado].filter(Boolean).join(' – ');
        } else if (partes.length > 1) {
          subtit = partes.slice(1, 3).join(',').trim();
        }
        var lat    = parseFloat(r.lat);
        var lng    = parseFloat(r.lng || r.lon);
        var icone  = detectarIconeLugar(nomeCompleto);
        var titEsc = titulo.replace(/"/g,'').replace(/'/g,'');
        var subEsc = subtit.replace(/"/g,'').replace(/'/g,'');
        return '<div class="plan-busca-item" onclick="selecionarDestinoPlan(' + lat + ',' + lng
          + ',&quot;' + titEsc + '&quot;,&quot;' + subEsc + '&quot;)">'
          + '<div class="plan-busca-icone">' + icone + '</div>'
          + '<div class="plan-busca-info">'
          + '<div class="plan-busca-nome">' + titulo + '</div>'
          + (subtit ? '<div class="plan-busca-sub">' + subtit + '</div>' : '')
          + '</div>'
          + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="2.5" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>'
          + '</div>';
      }).join('');
      lista.innerHTML = html;

    } catch(e) {
      lista.innerHTML = '<div class="plan-busca-loading">⚠️ Erro ao buscar. Verifique sua conexão.</div>';
    }
  }

  function detectarIconeLugar(nome) {
    var n = (nome || '').toLowerCase();
    if (n.includes('shopping') || n.includes('mall') || n.includes('center')) return '🛍️';
    if (n.includes('aeroporto') || n.includes('airport')) return '✈️';
    if (n.includes('hospital') || n.includes('clínica') || n.includes('ubs') || n.includes('saúde')) return '🏥';
    if (n.includes('escola') || n.includes('universidade') || n.includes('colégio') || n.includes('faculdade')) return '🎓';
    if (n.includes('praia') || n.includes('beach')) return '🏖️';
    if (n.includes('hotel') || n.includes('pousada') || n.includes('resort')) return '🏨';
    if (n.includes('parque') || n.includes('park')) return '🌳';
    if (n.includes('estádio') || n.includes('arena') || n.includes('stadium')) return '🏟️';
    if (n.includes('posto') || n.includes('gasolina') || n.includes('combustível')) return '⛽';
    if (n.includes('restaurante') || n.includes('bar ') || n.includes('lanchonete')) return '🍽️';
    if (n.includes('rua') || n.includes('av.') || n.includes('avenida') || n.includes('estrada')) return '📍';
    return '📍';
  }


  function selecionarDestinoPlan(lat, lng, nome, subtit) {
    planDestLat = parseFloat(lat);
    planDestLng = parseFloat(lng);
    planDestNome = nome;

    // Fechar overlay de busca
    fecharBuscaOverlay();

    // Atualizar UI do campo Para
    var val = document.getElementById('plan-dest-val');
    if (val) {
      val.textContent = nome;
      val.classList.remove('placeholder');
    }

    // Traçar rota no mapa
    tracarRotaPlan(planDestLat, planDestLng, nome, subtit || '');
  }

  function tracarRotaPlan(destLat, destLng, nome, endereco) {
    // Resetar mapa se existia
    if (mapPlan) { mapPlan.remove(); mapPlan = null; }

    var mapEl = document.getElementById('plan-map');
    if (!mapEl) return;

    mapPlan = L.map('plan-map', {
      zoomControl: false, attributionControl: false,
      dragging: true, scrollWheelZoom: false, touchZoom: true
    }).setView([(userLat + destLat) / 2, (userLng + destLng) / 2], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapPlan);

    // Marcador origem (azul)
    L.marker([userLat, userLng], { icon: L.divIcon({
      className: '',
      html: '<svg width="28" height="36" viewBox="0 0 28 36" fill="none"><path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="#1565C0"/><circle cx="14" cy="14" r="6" fill="white"/></svg>',
      iconSize: [28, 36], iconAnchor: [14, 36]
    })}).addTo(mapPlan).bindPopup('Você está aqui');

    // Marcador destino (laranja)
    L.marker([destLat, destLng], { icon: L.divIcon({
      className: '',
      html: '<svg width="28" height="36" viewBox="0 0 28 36" fill="none"><path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="#FF6D00"/><circle cx="14" cy="14" r="6" fill="white"/></svg>',
      iconSize: [28, 36], iconAnchor: [14, 36]
    })}).addTo(mapPlan).bindPopup(nome);

    // Linha de rota
    var routeLine = L.polyline([[userLat, userLng], [destLat, destLng]], {
      color: '#1565C0', weight: 4, dashArray: '8, 5', opacity: 0.85
    }).addTo(mapPlan);
    mapPlan.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

    // Calcular distância e tempo
    var dist = calcHaversinePlan(userLat, userLng, destLat, destLng);
    document.getElementById('plan-dist').textContent = dist.toFixed(1).replace('.', ',') + ' km';
    document.getElementById('plan-time').textContent = calcTempo(dist);

    // Card destino (genérico — não é posto)
    document.getElementById('plan-logo').textContent = detectarIconeLugar(nome + ' ' + endereco);
    document.getElementById('plan-nome').textContent = nome;
    document.getElementById('plan-end').textContent = endereco || '';
    document.getElementById('plan-preco').innerHTML = '—';
    document.getElementById('plan-posto-card').style.display = 'flex';
    document.getElementById('btn-iniciar-nav').style.display = 'block';

    // Calcular custo usando preço médio dos postos próximos carregados
    var precoEstimado = _getPrecoMedioPosros();
    // Mostrar preço estimado no card
    document.getElementById('plan-preco').innerHTML = 'R$ ' + precoEstimado.toFixed(2).replace('.', ',')
      + '<span class="plan-preco-unit">/L est.</span>';
    atualizarCustoPlan(dist, precoEstimado);
  }
  //  LISTA DE POSTOS (Tela 8)
  // ══════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════
  //  FILTROS — painel e aplicação
  // ══════════════════════════════════════════════════════

  function _contarFiltrosAtivos() {
    var n = 0;
    if (filtros.raioKm !== 5) n++;
    if (filtros.ordenar !== 'preco') n++;
    if (filtros.somenteAbertos) n++;
    if (filtros.somentePrecoReal) n++;
    if (filtros.avaliacaoMin > 0) n++;
    if (filtros.somenteComDesconto) n++;
    return n;
  }

  function _atualizarBadgeFiltros() {
    var badge = document.getElementById('filtros-badge');
    var btn = document.getElementById('btn-filtros');
    var n = _contarFiltrosAtivos();
    if (badge) badge.style.display = n > 0 ? 'block' : 'none';
    if (btn) btn.classList.toggle('ativo', n > 0);
  }

  function abrirPainelFiltros() {
    var el = document.getElementById('modal-filtros');
    if (el) { el.remove(); }

    var f = filtros;

    function optRaio(v, label) {
      return '<button onclick="window._tmpFiltros.raioKm=' + v + ';window._tmpFiltros._render()" '
        + 'style="padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid ' + (f.raioKm===v ? 'var(--orange)' : '#e0e0e0') + ';background:' + (f.raioKm===v ? '#FFF5EE' : '#fff') + ';color:' + (f.raioKm===v ? 'var(--orange)' : '#555') + ';">' + label + '</button>';
    }
    function optOrdenar(v, label) {
      var Q = String.fromCharCode(39);
      return '<button onclick="window._tmpFiltros.ordenar=' + Q + v + Q + ';window._tmpFiltros._render()" '
        + 'style="padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid ' + (f.ordenar===v ? 'var(--orange)' : '#e0e0e0') + ';background:' + (f.ordenar===v ? '#FFF5EE' : '#fff') + ';color:' + (f.ordenar===v ? 'var(--orange)' : '#555') + ';">' + label + '</button>';
    }
    function optAval(v, label) {
      return '<button onclick="window._tmpFiltros.avaliacaoMin=' + v + ';window._tmpFiltros._render()" '
        + 'style="padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid ' + (f.avaliacaoMin===v ? 'var(--orange)' : '#e0e0e0') + ';background:' + (f.avaliacaoMin===v ? '#FFF5EE' : '#fff') + ';color:' + (f.avaliacaoMin===v ? 'var(--orange)' : '#555') + ';">' + label + '</button>';
    }
    function togSwitch(campo, valor) {
      return '<div onclick="window._tmpFiltros.' + campo + '=!' + valor + ';window._tmpFiltros._render()" '
        + 'style="width:44px;height:24px;border-radius:12px;background:' + (valor ? 'var(--orange)' : '#ccc') + ';position:relative;cursor:pointer;flex-shrink:0;">'
        + '<div style="position:absolute;top:3px;' + (valor ? 'right:3px' : 'left:3px') + ';width:18px;height:18px;border-radius:50%;background:#fff;transition:all .2s;"></div></div>';
    }

    function renderModalContent() {
      var f2 = window['_tmpFiltros'];
      var n = [f2.raioKm !== 5, f2.ordenar !== 'preco', f2.somenteAbertos, f2.somentePrecoReal, f2.avaliacaoMin > 0, f2.somenteComDesconto].filter(Boolean).length;
      var modal = document.getElementById('modal-filtros');
      if (!modal) return;

      modal.innerHTML = '<div style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-height:88vh;overflow-y:auto;">'
        // Handle
        + '<div style="width:36px;height:4px;background:#E0E0E0;border-radius:2px;margin:12px auto 0;"></div>'
        // Header
        + '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;">'
        + '<div style="font-size:17px;font-weight:800;color:#1A1A1A;">Filtros</div>'
        + (n > 0 ? '<button onclick="window._tmpFiltros._resetar()" style="font-size:13px;color:var(--orange);font-weight:700;background:none;border:none;cursor:pointer;">Limpar filtros (' + n + ')</button>' : '<div style="width:80px;"></div>')
        + '</div>'
        // Seção raio
        + '<div style="padding:0 20px 16px;">'
        + '<div style="font-size:13px;font-weight:700;color:#555;margin-bottom:10px;">📍 Raio de busca</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        + _optRaio(f2.raioKm, 2, '2 km') + _optRaio(f2.raioKm, 5, '5 km') + _optRaio(f2.raioKm, 10, '10 km') + _optRaio(f2.raioKm, 20, '20 km') + _optRaio(f2.raioKm, 50, '50 km')
        + '</div></div>'
        // Seção ordenar
        + '<div style="padding:0 20px 16px;">'
        + '<div style="font-size:13px;font-weight:700;color:#555;margin-bottom:10px;">↕️ Ordenar por</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        + _optOrdenar(f2.ordenar, 'preco', '💰 Menor preço') + _optOrdenar(f2.ordenar, 'distancia', '📍 Mais próximo') + _optOrdenar(f2.ordenar, 'avaliacao', '⭐ Melhor avaliação')
        + '</div></div>'
        // Avaliação mínima
        + '<div style="padding:0 20px 16px;">'
        + '<div style="font-size:13px;font-weight:700;color:#555;margin-bottom:10px;">⭐ Avaliação mínima</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        + _optAval(f2.avaliacaoMin, 0, 'Todos') + _optAval(f2.avaliacaoMin, 3, '3+ ★') + _optAval(f2.avaliacaoMin, 4, '4+ ★') + _optAval(f2.avaliacaoMin, 4.5, '4.5+ ★')
        + '</div></div>'
        // Toggles
        + '<div style="padding:0 20px 16px;display:grid;gap:12px;">'
        + _togRow('somenteAbertos', f2.somenteAbertos, '🟢 Somente postos abertos agora')
        + _togRow('somentePrecoReal', f2.somentePrecoReal, '✅ Somente com preço confirmado')
        + _togRow('somenteComDesconto', f2.somenteComDesconto, '🎟️ Somente postos com cupom')
        + '</div>'
        // Botão aplicar
        + '<div style="padding:0 20px 20px;">'
        + '<button onclick="fecharPainelFiltros(true)" style="width:100%;padding:15px;background:var(--orange);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;">Ver resultados</button>'
        + '</div>'
        + '</div>';
    }

    function _optRaio(atual, v, label) {
      var sel = atual === v;
      return '<button onclick="window._tmpFiltros.raioKm=' + v + ';window._tmpFiltros._render()" '
        + 'style="padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid ' + (sel ? 'var(--orange)' : '#e0e0e0') + ';background:' + (sel ? '#FFF5EE' : '#fff') + ';color:' + (sel ? 'var(--orange)' : '#555') + ';">' + label + '</button>';
    }
    function _optOrdenar(atual, v, label) {
      var sel = atual === v;
      var Q = String.fromCharCode(39);
      return '<button onclick="window._tmpFiltros.ordenar=' + Q + v + Q + ';window._tmpFiltros._render()" '
        + 'style="padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid ' + (sel ? 'var(--orange)' : '#e0e0e0') + ';background:' + (sel ? '#FFF5EE' : '#fff') + ';color:' + (sel ? 'var(--orange)' : '#555') + ';">' + label + '</button>';
    }
    function _optAval(atual, v, label) {
      var sel = atual === v;
      return '<button onclick="window._tmpFiltros.avaliacaoMin=' + v + ';window._tmpFiltros._render()" '
        + 'style="padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid ' + (sel ? 'var(--orange)' : '#e0e0e0') + ';background:' + (sel ? '#FFF5EE' : '#fff') + ';color:' + (sel ? 'var(--orange)' : '#555') + ';">' + label + '</button>';
    }
    function _togRow(campo, valor, label) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;" onclick="window._tmpFiltros.' + campo + '=!window._tmpFiltros.' + campo + ';window._tmpFiltros._render()" style="cursor:pointer;">'
        + '<span style="font-size:14px;color:#333;">' + label + '</span>'
        + '<div style="width:44px;height:24px;border-radius:12px;background:' + (valor ? 'var(--orange)' : '#ccc') + ';position:relative;flex-shrink:0;cursor:pointer;">'
        + '<div style="position:absolute;top:3px;' + (valor ? 'right:3px' : 'left:3px') + ';width:18px;height:18px;border-radius:50%;background:#fff;transition:all .2s;"></div></div>'
        + '</div>';
    }

    // Estado temporário para edição sem aplicar
    window['_tmpFiltros'] = Object.assign({}, filtros, {
      _render: renderModalContent,
      _resetar: function() {
        var t = window['_tmpFiltros'];
        t.raioKm = 5; t.ordenar = 'preco'; t.somenteAbertos = false;
        t.somentePrecoReal = false; t.avaliacaoMin = 0; t.somenteComDesconto = false;
        renderModalContent();
      }
    });

    var modal = document.createElement('div');
    modal.id = 'modal-filtros';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;';
    modal.onclick = function(e) { if (e.target === this) fecharPainelFiltros(false); };
    document.body.appendChild(modal);

    renderModalContent();
  }

  function fecharPainelFiltros(aplicar) {
    if (aplicar && window['_tmpFiltros']) {
      var t = window['_tmpFiltros'];
      var raioMudou = filtros.raioKm !== t.raioKm;
      filtros.raioKm            = t.raioKm;
      filtros.ordenar           = t.ordenar;
      filtros.somenteAbertos    = t.somenteAbertos;
      filtros.somentePrecoReal  = t.somentePrecoReal;
      filtros.avaliacaoMin      = t.avaliacaoMin;
      filtros.somenteComDesconto = t.somenteComDesconto;
      _atualizarBadgeFiltros();
      // Re-buscar com novo raio sempre que raio mudou ou não há dados
      if (raioMudou || postosData.length === 0) {
        if (userLat && userLng) {
          loadPostos().then(() => renderLista());
        } else {
          renderLista();
        }
      } else {
        renderLista();
      }
    }
    var el = document.getElementById('modal-filtros');
    if (el) el.remove();
    delete window['_tmpFiltros'];
  }

  function limparFiltros() {
    filtros = { raioKm: 5, ordenar: 'preco', somenteAbertos: false, somentePrecoReal: false, avaliacaoMin: 0, somenteComDesconto: false };
    _atualizarBadgeFiltros();
    renderLista();
  }

  function renderLista() {
    const container = document.getElementById('lista-postos');
    const empty = document.getElementById('lista-empty');
    let postos = postosData.length > 0 ? [...postosData] : getDemoPostos();

    // ── Aplicar filtros ──────────────────────────────────────────────────────
    if (filtros.somenteAbertos) {
      postos = postos.filter(p => p.aberto === true);
    }
    if (filtros.somentePrecoReal) {
      postos = postos.filter(p => p.fontePreco === 'anp' || p.fontePreco === 'colaborativo');
    }
    if (filtros.avaliacaoMin > 0) {
      postos = postos.filter(p => p.rating && p.rating >= filtros.avaliacaoMin);
    }
    if (filtros.raioKm) {
      postos = postos.filter(p => !p.distancia || p.distancia <= filtros.raioKm);
    }
    // Ordenar
    if (filtros.ordenar === 'distancia') {
      postos.sort((a, b) => (a.distancia || 999) - (b.distancia || 999));
    } else if (filtros.ordenar === 'avaliacao') {
      postos.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // Padrão: menor preço
      postos.sort((a, b) => {
        const pa = a.preco || a.precos?.[selectedFuel] || 999;
        const pb = b.preco || b.precos?.[selectedFuel] || 999;
        return pa - pb;
      });
    }
    // Badge de filtros ativos na lista
    var nFiltros = _contarFiltrosAtivos();
    if (nFiltros > 0) {
      var badgeInfo = document.getElementById('lista-filtros-info');
      if (!badgeInfo) {
        badgeInfo = document.createElement('div');
        badgeInfo.id = 'lista-filtros-info';
        badgeInfo.style.cssText = 'margin:0 0 10px;padding:8px 14px;background:#FFF5EE;border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;';
        container.parentElement?.insertBefore(badgeInfo, container);
      }
      badgeInfo.innerHTML = '<span style="color:#FF6D00;font-weight:700;">🔍 ' + nFiltros + ' filtro' + (nFiltros > 1 ? 's' : '') + ' ativo' + (nFiltros > 1 ? 's' : '') + ' · ' + postos.length + ' posto' + (postos.length !== 1 ? 's' : '') + '</span>'
        + '<button onclick="limparFiltros()" style="font-size:12px;color:#888;background:none;border:none;cursor:pointer;font-weight:600;">Limpar</button>';
    } else {
      var bi = document.getElementById('lista-filtros-info');
      if (bi) bi.remove();
    }

    if (postos.length === 0) {
      empty.style.display = 'block';
      empty.innerHTML = '<div style="text-align:center;padding:40px 20px;">'
        + '<div style="font-size:40px;margin-bottom:12px;">🔍</div>'
        + '<div style="font-size:16px;font-weight:700;color:#333;margin-bottom:8px;">Nenhum posto encontrado</div>'
        + '<div style="font-size:14px;color:#888;margin-bottom:16px;">Tente remover alguns filtros para ver mais resultados.</div>'
        + '<button onclick="limparFiltros()" style="padding:10px 20px;background:var(--orange);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">Limpar filtros</button>'
        + '</div>';
      container.innerHTML = '';
      return;
    }
    empty.style.display = 'none';

    // ── Classificar fontes ──
    const totalReal = postos.filter(p => p.fontePreco === 'anp' || p.fontePreco === 'colaborativo').length;
    const totalEstimado = postos.filter(p => p.fontePreco === 'estimado' || !p.fontePreco).length;
    const temPrecoReal = totalReal > 0;

    // ── Detectar se todos são iguais (média municipal) ──
    const precos5 = postos.slice(0, 5).map(p => p.preco || p.precos?.[selectedFuel]).filter(v => v > 0);
    const todosIguais = precos5.length > 1 && precos5.every(v => Math.abs(v - precos5[0]) < 0.01);

    // Banner de status dos dados
    let banner = '';
    if (temPrecoReal) {
      banner = '<div style="margin:0 0 10px;padding:9px 14px;background:#F0FFF4;border-radius:12px;border-left:3px solid #00A651;display:flex;align-items:center;gap:8px;">'
        + '<span style="font-size:14px;">✅</span>'
        + '<div style="font-size:12px;color:#1A6B35;line-height:1.4;">'
        + '<b>Atualização via Agência Nacional do Petróleo, Gás Natural e Biocombustíveis</b>'
        + ''
        + '</div>'
        + '</div>';
    } else if (todosIguais) {
      banner = '<div style="margin:0 0 10px;padding:9px 14px;background:#FFF8E1;border-radius:12px;border-left:3px solid #FFA000;display:flex;align-items:flex-start;gap:8px;">'
        + '<span style="font-size:14px;">📊</span>'
        + '<div style="font-size:12px;color:#7A5200;line-height:1.5;">'
        + '<b>Preços são médias municipais ANP</b> — valores similares por cidade. '
        + '<span style="color:#FF6D00;font-weight:600;cursor:pointer;" onclick="reportarPrecoProximo()">Sabe o preço real? Informe! 👉</span>'
        + '</div>'
        + '</div>';
    }

    // ── Exibir somente postos com preço real (ANP ou colaborativo) ──
    const postosExibidos = postos.filter(p => p.fontePreco === 'anp' || p.fontePreco === 'colaborativo');
    const cards = (postosExibidos.length > 0 ? postosExibidos : postos).slice(0, 15).map((p, i) => {
      const preco = p.preco || p.precos?.[selectedFuel];
      const precoFmt = preco ? 'R$&nbsp;' + preco.toFixed(2).replace('.', ',') : '-';
      const dist = p.distancia ? p.distancia.toFixed(1).replace('.',',') + ' km' : '-';
      const tempo = calcTempo(p.distancia);
      const bandInfo = getBandeiraCor(p.bandeira || p.nome);
      const emoji = bandInfo.emoji;
      const isBest = i === 0;

      // ── Badge de fonte do preço ──
      const isReal = p.fontePreco === 'anp';
      const isColab = p.fontePreco === 'colaborativo';
      const isEstimado = !isReal && !isColab;
      const badgeFonte = isColab
        ? '<span style="font-size:10px;color:#00A651;font-weight:700;margin-left:4px;">👥 usuário</span>'
        : isReal
          ? '<span style="font-size:10px;color:#1565C0;font-weight:700;margin-left:4px;">✓ ANP real</span>'
          : '<span style="font-size:10px;color:#BBB;margin-left:4px;">~ média</span>';

      // Preço: verde se melhor, azul se real, cinza se estimado
      const corPreco = isBest ? '#00A651' : (isEstimado ? '#999' : '#1A1A1A');
      const fonteSufixo = isEstimado ? '~' : '';

      // Badge aberto/fechado do Google
      const abertoStr = p.aberto === true ? '<span style="font-size:10px;color:#2E7D32;font-weight:700;"> 🟢</span>'
        : p.aberto === false ? '<span style="font-size:10px;color:#C62828;font-weight:700;"> 🔴</span>' : '';
      // Rating Google compacto
      const ratingStr = p.rating ? '<span style="font-size:10px;color:#F59E0B;margin-left:3px;">★' + p.rating.toFixed(1) + '</span>' : '';

      // Badge de distância estilo pílula azul (igual CompletaÍ)
      const distBadge = p.distancia
        ? '<span style="display:inline-block;background:#1565C0;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:20px;margin-left:6px;vertical-align:middle;white-space:nowrap">' + dist + '</span>'
        : '';
      // Endereço em caixa alta estilo CompletaÍ
      const endStr = (p.endereco ? p.endereco.toUpperCase() : '') + (p.bairro ? ' - ' + p.bairro.toUpperCase() : '');

      return '<div class="posto-item" onclick="openDetalhes(' + i + ')">'
        + '<div class="posto-brand-logo" style="background:' + bandInfo.bg + ';border-color:' + bandInfo.border + ';font-size:20px">' + emoji + '</div>'
        + '<div class="posto-item-info">'
        +   '<div class="posto-item-nome">' + p.nome + distBadge + '</div>'
        +   (endStr ? '<div style="font-size:11px;color:#888;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:400;">' + endStr + '</div>' : '')
        +   '<div style="display:flex;align-items:center;gap:3px;margin-top:3px;">'
        +     (isBest ? '<span style="font-size:10px;background:#E8F5E9;color:#00A651;font-weight:700;padding:1px 5px;border-radius:4px;">MELHOR PREÇO</span>' : '')
        +     badgeFonte + abertoStr + ratingStr
        +   '</div>'
        + '</div>'
        + '<div class="posto-item-preco">'
        +   (precoFmt !== '-'
            ? '<div class="preco-val" style="color:' + corPreco + '"><span style="font-size:12px;font-weight:700;vertical-align:top;margin-top:2px;display:inline-block">R$</span>' + fonteSufixo + precoFmt + '</div>'
              + '<div class="preco-unit">/L</div>'
              + '<div class="dist-txt">' + tempo + '</div>'
            : '<div style="font-size:11px;color:#999;font-weight:600;text-align:right;line-height:1.4">Sem<br>atualização</div>'
          )
        + '</div>'
        + '</div>';
    }).join('');

    container.innerHTML = banner + cards;
  }

  function reportarPrecoProximo() {
    if (!postosData || postosData.length === 0) { showToast('Carregue os postos primeiro'); return; }
    // Usar o primeiro posto como referência ou deixar usuário escolher
    const p = postosData[0];
    abrirModal('Informar preço real',
      '<div style="padding:8px 0;">'
      + '<div style="font-size:13px;color:#555;margin-bottom:12px;">Ajude outros motoristas! Informe o preço que você viu no posto.</div>'
      + '<div style="font-size:14px;font-weight:600;margin-bottom:16px;">' + (p ? p.nome : 'Posto') + '</div>'
      + '<input id="inp-preco-real" type="number" step="0.01" min="2" max="15" placeholder="Ex: 5.89" style="width:100%;padding:12px;border:2px solid #eee;border-radius:10px;font-size:16px;box-sizing:border-box;margin-bottom:12px;"/>'
      + '<button onclick="enviarPrecoReal()" style="width:100%;padding:13px;background:#FF6D00;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;">Enviar preço</button>'
      + '</div>'
    );
  }

  function enviarPrecoReal(idx) {
    var inp = document.getElementById('inp-preco-real');
    var val = parseFloat(inp ? inp['value'] : '0');
    if (!val || val < 2 || val > 15) { showToast('Informe um preço válido (ex: 5.89)'); return; }
    const p = (idx !== undefined ? postosData[idx] : null) || postosData[0];
    if (!p) { fecharModal(); return; }
    fetch('/api/precos/reportar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postoId: p.id, postoNome: p.nome, combustivel: selectedFuel, preco: val, lat: userLat, lng: userLng, ts: Date.now() })
    }).then(r => r.json()).then(() => {
      // Atualizar o preço localmente na lista
      if (p) { p.preco = val; p.fontePreco = 'colaborativo'; if (p.precos) p.precos[selectedFuel] = val; }
      fecharModal();
      renderLista();
      showToast('Preço enviado! Obrigado 🙌');
      // Gamificação: pontos por atualizar preço
      if (typeof adicionarPontosGamif === 'function') adicionarPontosGamif('atualizar_preco');
    }).catch(() => {
      fecharModal();
      showToast('Preço enviado! Obrigado 🙌');
      if (typeof adicionarPontosGamif === 'function') adicionarPontosGamif('atualizar_preco');
    });
  }

  function openDetalhes(idx) {
    var p = postosData[idx] || getDemoPostos()[idx];
    if (!p) return;
    selectedPosto = p;

    var preco = p.preco || (p.precos && p.precos[selectedFuel]);
    var isReal = p.fontePreco === 'anp';
    var isColab = p.fontePreco === 'colaborativo';
    var isEstimado = !isReal && !isColab;

    document.getElementById('det-logo-badge').textContent = getEmoji(p.bandeira || p.nome);
    document.getElementById('det-nome').textContent = p.nome;
    document.getElementById('det-endereco').textContent = (p.endereco || '') + (p.bairro ? ' - ' + p.bairro : '') + ', ' + (p.cidade || '') + (p.estado ? ' - ' + p.estado : '');

    // Preço com indicador de fonte
    var precoEl = document.getElementById('det-comb-preco');
    if (preco) {
      precoEl.innerHTML = 'R$ ' + preco.toFixed(2).replace('.', ',') + ' /L'
        + (isEstimado ? ' <span style="font-size:11px;color:#FFA000;font-weight:600;">~ estimado</span>' : '')
        + (isReal ? ' <span style="font-size:11px;color:#1565C0;font-weight:600;">✓ ANP</span>' : '')
        + (isColab ? ' <span style="font-size:11px;color:#00A651;font-weight:600;">👥</span>' : '');
    } else {
      precoEl.textContent = '-';
    }

    // Combustíveis
    var list = document.getElementById('det-fuel-list');
    var fuels = [
      ['Gasolina', p.precos && p.precos.gasolina],
      ['Gasolina Aditivada', p.precos && p.precos.gasolinaAditivada],
      ['Etanol', p.precos && p.precos.etanol],
      ['Diesel S10', p.precos && p.precos.dieselS10],
      ['Diesel', p.precos && p.precos.diesel && !p.precos.dieselS10 ? p.precos.diesel : null],
      ['GNV', p.precos && p.precos.gnv],
      ['GLP', p.precos && p.precos.glp],
    ].filter(function(f) { return f[1]; });

    var fonteLabel = isReal
      ? '<div style="font-size:10px;color:#1565C0;margin-top:8px;">✅ Preço atualizado via ANP</div>'
      : isColab
        ? '<div style="font-size:10px;color:#00A651;margin-top:8px;">👥 Preço informado por usuário</div>'
        : '<div style="font-size:10px;color:#FFA000;margin-top:8px;">~ Média municipal ANP · pode variar</div>';

    // Badge aberto/fechado (Google Places)
    var statusBadge = '';
    if (p.aberto === true) {
      statusBadge = '<span style="display:inline-block;background:#E8F5E9;color:#2E7D32;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin-bottom:6px;">🟢 Aberto agora</span> ';
    } else if (p.aberto === false) {
      statusBadge = '<span style="display:inline-block;background:#FFEBEE;color:#C62828;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin-bottom:6px;">🔴 Fechado agora</span> ';
    }

    // Rating Google
    var ratingHtml = '';
    if (p.rating) {
      var starsStr = '';
      var rt = Math.round(p.rating * 2) / 2;
      for (var si = 1; si <= 5; si++) {
        starsStr += (si <= rt) ? '★' : '☆';
      }
      ratingHtml = '<div style="font-size:13px;color:#F59E0B;margin-bottom:4px;">'
        + starsStr + ' <span style="color:#555;">' + p.rating.toFixed(1) + '</span>'
        + (p.totalAvaliacoes ? ' <span style="color:#aaa;font-size:11px;">(' + p.totalAvaliacoes.toLocaleString('pt-BR') + ' av.)</span>' : '')
        + '</div>';
    }

    // Foto Google Places
    var fotoHtml = '';
    if (p.fotoUrl) {
      fotoHtml = '<img src="' + p.fotoUrl + '" style="width:100%;height:130px;object-fit:cover;border-radius:12px;margin-bottom:8px;" onerror="this.style.display=&quot;none&quot;" loading="lazy" alt="Foto do posto"/>';
    }

    // Telefone
    var telefoneHtml = '';
    if (p.telefone) {
      telefoneHtml = '<div style="font-size:12px;color:#555;margin-bottom:6px;">📞 <a href="tel:' + p.telefone + '" style="color:#FF6D00;text-decoration:none;">' + p.telefone + '</a></div>';
    }

    list.innerHTML = fotoHtml + statusBadge + ratingHtml + telefoneHtml
      + (fuels.map(function(f) {
          return '<div class="det-fuel-row"><span class="det-fuel-nome">'+f[0]+'</span><span class="det-fuel-price">R$ '+f[1].toFixed(2).replace('.',',')+'</span></div>';
        }).join('') || '<div class="det-fuel-row"><span class="det-fuel-nome" style="color:var(--gray)">Preços não disponíveis</span></div>')
      + fonteLabel
      + '<div style="margin-top:8px;">'
      + '<span style="font-size:11px;color:#FF6D00;cursor:pointer;font-weight:600;" onclick="abrirReportarPreco('+idx+')">'
      + '📝 Preços diferentes? Informe o valor real</span></div>'
      + '<div style="margin-top:12px;" id="btn-gerar-desconto-wrap">'
      + (function(){ var Q=String.fromCharCode(39); return '<button onclick="abrirGerarCupom(' + Q + (p.id||'') + Q + ',' + Q + (p.nome||'Posto').replace(/'/g,Q) + Q + ',' + Q + selectedFuel + Q + ')" '; }())
      + 'style="width:100%;padding:12px;background:linear-gradient(135deg,#FF6D00,#FFA040);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">'
      + '🎟️ Gerar Cupom de Desconto Premium'
      + '</button></div>';

    // Planejar: atualizar destino quando usuário vem da lista/detalhes
    var destVal = document.getElementById('plan-dest-val');
    if (destVal) {
      destVal.textContent = p.nome;
      destVal.classList.remove('placeholder');
    }
    // Setar coords do posto como destino livre também
    planDestLat = p.lat || null;
    planDestLng = p.lng || null;
    planDestNome = p.nome;
    if (mapPlan) { mapPlan.remove(); mapPlan = null; }
    planVeiculoId = null;

    goToView('detalhes');
  }

  function abrirReportarPreco(idx) {
    const p = postosData[idx];
    if (!p) return;
    abrirModal('Informar preço real',
      '<div style="padding:8px 0;">'
      + '<div style="font-size:13px;color:#555;margin-bottom:4px;">Posto:</div>'
      + '<div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:12px;">' + p.nome + '</div>'
      + '<div style="font-size:13px;color:#555;margin-bottom:8px;">Combustível: <b>' + selectedFuel + '</b></div>'
      + '<input id="inp-preco-real" type="number" step="0.01" min="2" max="15" placeholder="Ex: 5.89" style="width:100%;padding:12px;border:2px solid #eee;border-radius:10px;font-size:18px;box-sizing:border-box;margin-bottom:12px;text-align:center;"/>'
      + '<button onclick="enviarPrecoReal('+idx+')" style="width:100%;padding:13px;background:#FF6D00;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;">✓ Confirmar preço</button>'
      + '<div style="font-size:11px;color:#999;text-align:center;margin-top:8px;">Ajuda motoristas a encontrar o menor preço real</div>'
      + '</div>'
    );
  }

  // ══════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════
  function getEmoji(nome) {
    if (!nome) return '⛽';
    const n = nome.toUpperCase();
    if (n.includes('SHELL')) return '🐚';
    if (n.includes('IPIRANGA')) return '🔵';
    if (n.includes('PETROBRAS') || n.includes(' BR ') || n === 'BR') return '🟢';
    if (n.includes('RAIZEN') || n.includes('RAÍZEN')) return '⛽';
    if (n.includes('ALE') || n.includes('ALÉ')) return '🔴';
    if (n.includes('TEXACO')) return '⭐';
    if (n.includes('ESSO')) return '🔷';
    if (n.includes('BANDEIRANTE')) return '🏁';
    return '⛽';
  }

  function getBandeiraCor(nome) {
    if (!nome) return { emoji: '⛽', bg: '#F5F5F5', border: '#E0E0E0' };
    const n = nome.toUpperCase();
    if (n.includes('SHELL'))     return { emoji: '🐚', bg: '#FFF3E0', border: '#FFB300' };
    if (n.includes('IPIRANGA')) return { emoji: '🔵', bg: '#E3F2FD', border: '#1565C0' };
    if (n.includes('PETROBRAS') || n.includes(' BR ') || n === 'BR')
                                 return { emoji: '🟢', bg: '#E8F5E9', border: '#2E7D32' };
    if (n.includes('RAIZEN') || n.includes('RAÍZEN'))
                                 return { emoji: '⛽', bg: '#F3E5F5', border: '#7B1FA2' };
    if (n.includes('ALE') || n.includes('ALÉ'))
                                 return { emoji: '⛽', bg: '#FFEBEE', border: '#E53935' };
    if (n.includes('TEXACO'))    return { emoji: '⭐', bg: '#FFFDE7', border: '#F9A825' };
    if (n.includes('ESSO'))      return { emoji: '⛽', bg: '#E3F2FD', border: '#1565C0' };
    if (n.includes('BANDEIRANTE')) return { emoji: '🏁', bg: '#F5F5F5', border: '#616161' };
    // Posto independente — inicial do nome
    const inicial = nome.trim().charAt(0).toUpperCase();
    return { emoji: inicial, bg: '#FFF3E0', border: '#FF6D00' };
  }

  function getDemoPostos() {
    return [
      { id:'1', nome:'Posto Shell', bandeira:'Shell', endereco:'Av. Rebouças, 1234', bairro:'Pinheiros', cidade:'São Paulo', estado:'SP', lat:-23.5538, lng:-46.6662, preco:5.67, distancia:1.2, precos:{ gasolina:5.67, etanol:3.89, diesel:6.19, dieselS10:6.19, gnv:4.49 } },
      { id:'2', nome:'Posto Ipiranga', bandeira:'Ipiranga', endereco:'Av. Paulista, 900', bairro:'Bela Vista', cidade:'São Paulo', estado:'SP', lat:-23.5615, lng:-46.6542, preco:5.74, distancia:1.4, precos:{ gasolina:5.74, etanol:3.95, diesel:6.25 } },
      { id:'3', nome:'Posto BR Petrobras', bandeira:'BR', endereco:'Rua Augusta, 2100', bairro:'Consolação', cidade:'São Paulo', estado:'SP', lat:-23.5580, lng:-46.6610, preco:5.79, distancia:1.6, precos:{ gasolina:5.79, etanol:4.01 } },
      { id:'4', nome:'Posto Ale', bandeira:'Ale', endereco:'Al. Santos, 1500', bairro:'Jardins', cidade:'São Paulo', estado:'SP', lat:-23.5640, lng:-46.6490, preco:5.89, distancia:2.1, precos:{ gasolina:5.89, etanol:4.05 } },
      { id:'5', nome:'Posto Raizen', bandeira:'Raizen', endereco:'Rua Oscar Freire, 800', bairro:'Cerqueira César', cidade:'São Paulo', estado:'SP', lat:-23.5610, lng:-46.6680, preco:5.92, distancia:2.3, precos:{ gasolina:5.92, etanol:4.10 } },
    ];
  }

  function selectFuel(fuel, btn) {
    selectedFuel = fuel;
    document.querySelectorAll('.chip-fuel').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    if (mapMain) {
      loadPostos();
    }
    renderLista();
  }

  function selectPeriod(p, btn) {
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const vals = { semana: 'R$ 72,40', mes: 'R$ 289,60', ano: 'R$ 3.475,20' };
    document.getElementById('rel-total-val').textContent = vals[p] || 'R$ 289,60';
  }

  function changeMonth(dir) {
    currentMonthIdx = (currentMonthIdx + dir + 12) % 12;
    document.getElementById('month-label').textContent = MONTHS_FULL[currentMonthIdx] + ' 2024';
  }

  // Abre navegação no Google Maps ou Waze — funciona em TWA/Android
  function _abrirNavegacaoExterna(lat, lng, nome) {
    // No Android (TWA/Chrome) usa geo: URI que abre o app de mapas padrão
    var isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      // geo: URI abre Google Maps nativo no Android
      var geoUrl = 'geo:' + lat + ',' + lng + '?q=' + lat + ',' + lng + (nome ? '(' + encodeURIComponent(nome) + ')' : '');
      // Tentar geo: primeiro, fallback para google maps web
      var link = document.createElement('a');
      link.href = geoUrl;
      link.click();
      // Fallback após 500ms se geo: não abriu
      setTimeout(function() {
        window.location.href = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving';
      }, 800);
    } else {
      // Desktop/iOS — abrir nova aba
      var mapsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving';
      window.open(mapsUrl, '_blank');
    }
  }

  function irAteLa() {
    if (!selectedPosto) { showToast('Selecione um posto primeiro'); return; }
    _abrirNavegacaoExterna(selectedPosto.lat, selectedPosto.lng, selectedPosto.nome);
  }

  function openMaps() { irAteLa(); }

  function shareStation() {
    if (!selectedPosto) return;
    var txt = selectedPosto.nome + ' - ' + (selectedPosto.endereco || '') + ' | RotaPosto: https://rotaposto.com.br';
    if (navigator.share) {
      navigator.share({ title: selectedPosto.nome, text: txt, url: 'https://rotaposto.com.br' }).catch(function(){});
    } else {
      navigator.clipboard && navigator.clipboard.writeText(txt);
      showToast('Link copiado! 📋');
    }
  }

  function toggleFavorite() { showToast('Adicionado aos favoritos ❤️'); }

  function iniciarNavegacao() {
    var lat, lng, nome;
    if (planDestLat && planDestLng) {
      lat = planDestLat; lng = planDestLng; nome = planDestNome || '';
    } else if (selectedPosto) {
      lat = selectedPosto.lat; lng = selectedPosto.lng; nome = selectedPosto.nome;
    } else {
      showToast('Selecione um destino primeiro');
      return;
    }
    _abrirNavegacaoExterna(lat, lng, nome);
  }

  let _searchTimer = null;
  let _searchDropdownOpen = false;

  // Fechar dropdown de busca ao clicar fora
  document.addEventListener('pointerdown', (e) => {
    if (!_searchDropdownOpen) return;
    const dd = document.getElementById('search-dropdown');
    const inp = document.getElementById('search-input');
    if (dd && !dd.contains(e.target) && e.target !== inp) {
      _fecharDropdownBusca();
    }
  });

  function _fecharDropdownBusca() {
    const dd = document.getElementById('search-dropdown');
    if (dd) dd.remove();
    _searchDropdownOpen = false;
  }

  async function onSearchInput(val) {
    clearTimeout(_searchTimer);
    if (val.length < 2) { _fecharDropdownBusca(); return; }
    _searchTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/geocode?q=' + encodeURIComponent(val));
        const data = await res.json();
        if (!data || data.length === 0) { _fecharDropdownBusca(); return; }
        _fecharDropdownBusca();
        const inp = document.getElementById('search-input');
        if (!inp) return;
        const wrap = inp.parentElement;

        const dd = document.createElement('div');
        dd.id = 'search-dropdown';
        dd.style.cssText = 'position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;overflow:hidden;max-height:240px;overflow-y:auto;';

        data.slice(0, 6).forEach(item => {
          const row = document.createElement('div');
          row.style.cssText = 'padding:12px 16px;font-size:14px;color:#1A1A1A;cursor:pointer;border-bottom:1px solid #F5F5F5;display:flex;align-items:center;gap:8px;';
          row.innerHTML = '<span style="font-size:16px">📍</span><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.nome + '</span>';
          row.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            inp.value = item.nome;
            _fecharDropdownBusca();
            _aplicarGeocodeBusca(item.lat, item.lng, item.nome);
          });
          row.addEventListener('mouseover', () => row.style.background = '#FFF3E0');
          row.addEventListener('mouseout', () => row.style.background = '');
          dd.appendChild(row);
        });

        wrap.style.position = 'relative';
        wrap.appendChild(dd);
        _searchDropdownOpen = true;
      } catch { /* silencioso */ }
    }, 350);
  }

  function _aplicarGeocodeBusca(lat, lng, nome) {
    userLat = lat; userLng = lng;
    showLoading(true);
    if (mapMain) {
      mapMain.setView([userLat, userLng], 14);
      mapMain.invalidateSize();
    }
    loadPostos().then(() => {
      showLoading(false);
      goToView('mapa');
      if (nome) showToast('📍 ' + nome);
    }).catch(() => { showLoading(false); });
  }

  async function doSearch() {
    const val = (document.getElementById('search-input')).value.trim();
    if (!val) return;
    _fecharDropdownBusca();
    showLoading(true);
    try {
      const res = await fetch('/api/geocode?q=' + encodeURIComponent(val));
      const data = await res.json();
      showLoading(false);
      if (data && data.length > 0) {
        _aplicarGeocodeBusca(data[0].lat, data[0].lng, data[0].nome || val);
      } else showToast('Local não encontrado');
    } catch { showLoading(false); showToast('Erro na busca'); }
  }

  function toggleMenu() { abrirPerfil(); }

  function abrirPerfil() {
    var el = document.getElementById('rp-perfil');
    if (!el) return;

    // ── Usuário NÃO logado: mostrar tela de login ──────────────────────────
    if (!currentUser) {
      _mostrarPerfilNaoLogado();
      el.classList.add('aberto');
      return;
    }

    // Atualizar nome/foto antes de abrir
    if (currentUser) {
      var nome = currentUser.name || currentUser.email?.split('@')[0] || 'Usuário';
      var nomeEl = document.getElementById('perfil-nome');
      if (nomeEl) nomeEl.textContent = nome;
      var inicialEl = document.getElementById('perfil-avatar-inicial');
      if (inicialEl) inicialEl.textContent = nome.charAt(0).toUpperCase();
      var fotoLocal = localStorage.getItem('rp_foto_perfil_' + currentUser.uid);
      atualizarAvatarUI(fotoLocal || currentUser.photo || '');
      var badge = document.getElementById('perfil-badge-premium');
      if (badge) badge.style.display = currentUser.premium ? 'block' : 'none';
      var plano = document.getElementById('perfil-plano-status');
      if (plano) plano.textContent = currentUser.premium ? '👑 Assinante Premium' : 'Conta gratuita';
    }
    el.classList.add('aberto');
  }

  function fecharPerfil() {
    var el = document.getElementById('rp-perfil');
    if (el) el.classList.remove('aberto');
  }

  // ── Tela de login quando usuário não está logado ───────────────────────────
  function _mostrarPerfilNaoLogado() {
    var header = document.getElementById('perfil-header');
    var menu   = document.getElementById('perfil-menu-list');
    if (!header || !menu) return;

    // Cabeçalho simplificado
    header.innerHTML = '<button onclick="fecharPerfil()" style="position:absolute;top:calc(var(--sat)+12px);right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1;">✕</button>'
      + '<div style="display:flex;flex-direction:column;align-items:center;padding:40px 20px 24px;">'
      + '<div style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:14px;">👤</div>'
      + '<div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;">Entre na sua conta</div>'
      + '<div style="font-size:14px;color:rgba(255,255,255,0.7);text-align:center;max-width:240px;line-height:1.5;">Salve postos favoritos, acompanhe histórico e assine o Premium</div>'
      + '</div>';

    // Detectar se é Android/TWA para mostrar opções corretas
    var _ua = navigator.userAgent || '';
    var _isAndroidApp = /Android/i.test(_ua) && (
      document.referrer.indexOf('android-app://') === 0
      || _ua.indexOf('wv') > -1
      || window.matchMedia('(display-mode: standalone)').matches
    );

    // Botões de login social
    menu.innerHTML = '<div style="padding:20px 16px 0;">'
      // Google — funciona perfeitamente em Android via PKCE + One Tap
      + '<button id="perfil-btn-google" onclick="_loginGoogleApp()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:14px 20px;background:#fff;color:#1A1A1A;border:none;border-radius:16px;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">'
      + '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>'
      + '<span>Continuar com Google</span>'
      + '</button>'
      // Facebook — no Android/TWA mostra botão mas com aviso de redirect
      + '<button id="perfil-btn-fb" onclick="_loginFacebookApp()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:14px 20px;background:#1877F2;color:#fff;border:none;border-radius:16px;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:' + (_isAndroidApp ? '8' : '20') + 'px;box-shadow:0 2px 8px rgba(24,119,242,0.3);">'
      + '<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
      + '<span>Continuar com Facebook</span>'
      + '</button>'
      // Aviso no Android que o Facebook vai abrir o browser (normal)
      + (_isAndroidApp ? '<div style="font-size:11px;color:#aaa;text-align:center;margin-bottom:16px;padding:0 8px;">O Facebook será aberto brevemente e você voltará ao app automaticamente</div>' : '')
      // Divider
      + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">'
      + '<div style="flex:1;height:1px;background:rgba(0,0,0,0.08);"></div>'
      + '<span style="font-size:12px;color:#aaa;font-weight:600;">ou</span>'
      + '<div style="flex:1;height:1px;background:rgba(0,0,0,0.08);"></div>'
      + '</div>'
      // Continuar sem login
      + '<button onclick="fecharPerfil()" style="width:100%;padding:13px;background:transparent;color:#888;border:1.5px solid #ddd;border-radius:16px;font-size:14px;font-weight:700;cursor:pointer;">'
      + 'Continuar sem conta'
      + '</button>'
      + '</div>';
  }

  // ── Login Google via PKCE (mesmo fluxo do resto do app) ───────────────────
  async function _loginGoogleApp() {
    var btn = document.getElementById('perfil-btn-google');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div style="width:22px;height:22px;border:3px solid #ddd;border-top-color:#4285F4;border-radius:50%;animation:spin 0.8s linear infinite;"></div><span>Abrindo Google...</span>'; }

    var CLIENT_ID = '1078426960222-viiv45tf4i508rlvj53202h6kda8ga9b.apps.googleusercontent.com';
    var REDIRECT_URI = 'https://rotaposto.com.br/auth/google/callback';

    // PKCE
    var va = new Uint8Array(48); crypto.getRandomValues(va);
    var verifier = btoa(String.fromCharCode.apply(null, Array.from(va))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    var digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    var challenge = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    var sa = new Uint8Array(16); crypto.getRandomValues(sa);
    var state = Array.from(sa).map(function(b){return b.toString(16).padStart(2,'0');}).join('');

    localStorage.setItem('google_pkce_verifier', verifier);
    localStorage.setItem('google_pkce_state', state);

    var params = new URLSearchParams({
      client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
      response_type: 'code', scope: 'openid email profile',
      state: state, code_challenge: challenge,
      code_challenge_method: 'S256', prompt: 'select_account', access_type: 'online'
    });

    // Se usuário já usou Google antes, pré-seleciona a conta
    var saved = localStorage.getItem('rp_user');
    if (saved) { try { var u = JSON.parse(saved); if (u && u.email) params.set('login_hint', u.email); } catch(e) {} }

    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  }

  // ── Login Facebook via OAuth redirect (Android/TWA compatível) ─────────────
  // No Android/TWA o popup do Firebase é bloqueado → usa redirect via Custom Tab
  // O Firebase abre o OAuth do Facebook em Custom Tab e retorna via redirect_uri
  async function _loginFacebookApp() {
    var btn = document.getElementById('perfil-btn-fb');

    // Aguardar Firebase carregar (máx 3 tentativas)
    if (!window['_fbAuth'] || !window['_fbFacebookProvider']) {
      showToast('⏳ Carregando...');
      setTimeout(_loginFacebookApp, 1200);
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div style="width:22px;height:22px;border:3px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div><span>Abrindo Facebook...</span>';
    }

    var ua = navigator.userAgent || '';
    var isAndroid = /Android/i.test(ua);
    var isTWA = document.referrer.indexOf('android-app://') === 0
      || ua.indexOf('wv') > -1 || ua.indexOf('WebView') > -1
      || window.matchMedia('(display-mode: standalone)').matches;

    try {
      if (isAndroid || isTWA) {
        // Android/TWA: redirect (Firebase abre Custom Tab do sistema → sem popup bloqueado)
        // Salvar flag para processar resultado ao voltar
        localStorage.setItem('rp_fb_redirect_pending', '1');
        await window['_fbSignInWithRedirect'](window['_fbAuth'], window['_fbFacebookProvider']);
        // signInWithRedirect navega a página → o código abaixo não executa
      } else {
        // Desktop/iOS: popup normal
        await window['_fbSignInWithPopup'](window['_fbAuth'], window['_fbFacebookProvider']);
      }
    } catch(e: any) {
      // Popup bloqueado → fallback para redirect
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user')) {
        localStorage.setItem('rp_fb_redirect_pending', '1');
        await window['_fbSignInWithRedirect'](window['_fbAuth'], window['_fbFacebookProvider']);
      } else {
        showToast('❌ Erro ao entrar com Facebook. Tente novamente.');
        if (btn) { btn.disabled = false; }
      }
    }
  }

  // ── Google One Tap callback (chamado pelo GSI automaticamente) ─────────────
  window['onGoogleOneTapCredential'] = async function(response) {
    if (!response || !response.credential) return;
    showToast('🔄 Verificando conta Google...');
    try {
      var r = await fetch('/api/auth/google-onetap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential })
      });
      var d = await r.json();
      if (d.ok && d.user) {
        currentUser = {
          uid: d.user.uid, email: d.user.email,
          name: d.user.nome, photo: d.user.foto,
          provider: 'google.com'
        };
        localStorage.setItem('rp_user', JSON.stringify(currentUser));
        fecharPerfil();
        showToast('✅ Olá, ' + (d.user.nome || d.user.email) + '!');
        _atualizarUIUsuario(currentUser);
      } else {
        showToast('❌ ' + (d.erro || 'Erro ao fazer login'));
      }
    } catch(e) {
      showToast('❌ Erro de rede. Tente novamente.');
    }
  };

  // ── Atualizar UI após login ────────────────────────────────────────────────
  function _atualizarUIUsuario(user) {
    if (!user) return;
    var nomeEl = document.getElementById('perfil-nome');
    if (nomeEl) nomeEl.textContent = user.name || user.email?.split('@')[0] || 'Usuário';
    var inicialEl = document.getElementById('perfil-avatar-inicial');
    if (inicialEl) inicialEl.textContent = (user.name || user.email || 'U').charAt(0).toUpperCase();
    if (user.photo) atualizarAvatarUI(user.photo);
    // Restaurar menu normal se perfil estiver aberto
    var menu = document.getElementById('perfil-menu-list');
    if (menu && menu.querySelector('#perfil-btn-google')) {
      // Estava mostrando tela de não-logado — reabrir com dados corretos
      fecharPerfil();
      setTimeout(abrirPerfil, 100);
    }
  }

  function goToVehicle() { abrirMeusVeiculos(); }

  // ── Modal helpers ──────────────────────────────────────────────────────────
  function fecharTela() {
    var el = document.getElementById('rp-subtela');
    if (!el) return;
    el.classList.remove('aberta');
  }

  function fecharModal() { fecharTela(); }  // compatibilidade

  function abrirTela(titulo, conteudoHTML) {
    var el = document.getElementById('rp-subtela');
    var tit = document.getElementById('rp-subtela-titulo');
    var body = document.getElementById('rp-subtela-body');
    if (!el || !tit || !body) return;
    // Garantir que está no body (fora de qualquer container overflow:hidden)
    if (el.parentNode !== document.body) document.body.appendChild(el);
    tit.textContent = titulo;
    body.innerHTML = conteudoHTML;
    // Forçar reflow antes de adicionar classe para garantir transição CSS
    el.offsetHeight;
    el.classList.add('aberta');
    body.scrollTop = 0;
  }

  function abrirModal(titulo, conteudoHTML) { abrirTela(titulo, conteudoHTML); }

  // ── Minha Conta ───────────────────────────────────────────────────────────
  function abrirMinhaConta(destacarCPF) {
    var u = currentUser || {};
    var nome = u.name || 'Usuário';
    var email = u.email || '—';
    var foto = u.photo || localStorage.getItem('rp_foto_perfil_' + u.uid) || '';
    var provider = u.provider === 'google.com' ? 'Google' : u.provider === 'facebook.com' ? 'Facebook' : 'E-mail';

    // Carregar dados extras de perfil
    var perfilExtra = {};
    try { perfilExtra = JSON.parse(localStorage.getItem('rp_perfil_extra_' + u.uid) || '{}'); } catch {}
    var tel    = (perfilExtra['telefone'] || '').replace(/\D/g,'').slice(0,11);
    var cep    = (perfilExtra['cep']      || '').replace(/\D/g,'').slice(0,8);
    var rua    = perfilExtra['rua']      || '';
    var cidade = perfilExtra['cidade']   || '';
    var estado = perfilExtra['estado']   || '';
    var cpfRaw = (perfilExtra['cpf'] || localStorage.getItem('rp_cpf') || '').replace(/\D/g,'').slice(0,11);
    // Nunca pré-formatar no value= — o script abaixo aplica a máscara após render

    // Banner de alerta CPF (mostrado quando chamado a partir do fluxo PIX)
    var bannerCPF = destacarCPF
      ? '<div id="mc-alerta-cpf" style="background:linear-gradient(135deg,#E65100,#FF6D00);border-radius:16px;padding:16px 18px;margin-bottom:16px;display:flex;align-items:flex-start;gap:12px;">'
        + '<span style="font-size:26px;line-height:1;">⚠️</span>'
        + '<div>'
        + '<div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:3px;">CPF obrigatório para o PIX</div>'
        + '<div style="font-size:13px;color:rgba(255,255,255,0.9);">Preencha seu CPF abaixo e salve para continuar com o pagamento.</div>'
        + '</div>'
        + '</div>'
      : '';

    // Borda destacada no campo CPF quando vindo do fluxo PIX
    var cpfBorder = destacarCPF
      ? 'border:2.5px solid #FF6D00;border-radius:10px;box-shadow:0 0 0 3px rgba(255,109,0,0.18);'
      : 'border:1.5px solid #E0E0E0;border-radius:10px;';

    var html = bannerCPF
      + '<div style="text-align:center;margin-bottom:20px;padding:20px 0;">'
      + (foto ? '<img src="' + foto + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:12px;border:3px solid #FF6D00;">'
               : '<div style="width:80px;height:80px;border-radius:50%;background:#FF6D00;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:32px;color:#fff;font-weight:800;">' + nome.charAt(0).toUpperCase() + '</div>')
      + '<div style="font-size:20px;font-weight:800;color:#1A1A1A;">' + nome + '</div>'
      + '<div style="font-size:14px;color:#888;margin-top:4px;">' + email + '</div>'
      + '</div>'
      + '<div class="st-card">'
      + '<div class="st-row"><span class="st-label">Login via</span><span class="st-value">' + provider + '</span></div>'
      + '<div class="st-row"><span class="st-label">ID da conta</span><span class="st-value" style="font-size:12px;">' + (u.uid || '—').slice(0,16) + '...</span></div>'
      + '</div>'
      // Contato e endereço
      + '<div class="st-card">'
      + '<div style="font-size:13px;font-weight:800;color:#1A1A1A;margin-bottom:12px;">📋 Contato &amp; Endereço</div>'
      + '<label style="font-size:13px;font-weight:700;color:' + (destacarCPF ? '#E65100' : '#555') + ';display:block;margin-bottom:5px;">🪪 CPF' + (destacarCPF ? ' <span style="color:#E65100;font-size:11px;font-weight:600;">(obrigatório para o PIX)</span>' : '') + '</label>'
      + '<input id="mc-cpf" type="text" inputmode="numeric" value="" data-cpf-salvo="' + cpfRaw + '" placeholder="' + (cpfRaw.length===11 ? '●●●.●●●.●●●-●● (já salvo)' : 'Digite os 11 números') + '" maxlength="11" oninput="_mascaraCPF(this)" autocomplete="off" style="width:100%;padding:11px;' + cpfBorder + 'font-size:14px;box-sizing:border-box;margin-bottom:4px;font-family:inherit;letter-spacing:2px;">'
      + (destacarCPF ? '<div style="font-size:11px;color:#E65100;margin-bottom:10px;">👆 Preencha e clique em Salvar dados</div>' : '<div style="margin-bottom:8px;"></div>')
      + '<label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:5px;">📱 Celular / WhatsApp</label>'
      + '<input id="mc-telefone" type="text" inputmode="numeric" value="" data-tel-salvo="' + tel + '" placeholder="' + (tel.length>=10 ? '(' + tel.slice(0,2) + ') ' + tel.slice(2,7) + '-' + tel.slice(7) : 'Digite o celular com DDD') + '" maxlength="11" autocomplete="off" oninput="formatarTelefoneConta(this)" style="width:100%;padding:11px;border:1.5px solid #E0E0E0;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:12px;font-family:inherit;">'
      + '<label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:5px;">📮 CEP</label>'
      + '<div style="display:flex;gap:8px;margin-bottom:12px;">'
      + '<input id="mc-cep" type="text" inputmode="numeric" value="" data-cep-salvo="' + cep + '" placeholder="' + (cep.length===8 ? cep.slice(0,5) + '-' + cep.slice(5) : '00000-000') + '" maxlength="8" autocomplete="off" oninput="formatarCEPConta(this)" style="flex:1;padding:11px;border:1.5px solid #E0E0E0;border-radius:10px;font-size:14px;box-sizing:border-box;font-family:inherit;">'
      + '<button onclick="buscarCEPConta()" style="padding:11px 14px;background:#FF6D00;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;">Buscar</button>'
      + '</div>'
      + '<label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:5px;">🏠 Rua / Endereço</label>'
      + '<input id="mc-rua" type="text" value="' + rua + '" placeholder="Rua das Flores, 123" style="width:100%;padding:11px;border:1.5px solid #E0E0E0;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:12px;font-family:inherit;">'
      + '<div style="display:grid;grid-template-columns:1fr 70px;gap:10px;">'
      + '<div><label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:5px;">🏙️ Cidade</label>'
      + '<input id="mc-cidade" type="text" value="' + cidade + '" placeholder="São Paulo" style="width:100%;padding:11px;border:1.5px solid #E0E0E0;border-radius:10px;font-size:14px;box-sizing:border-box;font-family:inherit;"></div>'
      + '<div><label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:5px;">UF</label>'
      + '<input id="mc-estado" type="text" value="' + estado + '" placeholder="SP" maxlength="2" oninput="this.value=this.value.toUpperCase()" style="width:100%;padding:11px;border:1.5px solid #E0E0E0;border-radius:10px;font-size:14px;box-sizing:border-box;font-family:inherit;text-transform:uppercase;"></div>'
      + '</div>'
      + '</div>'
      + '<button class="st-btn" onclick="salvarContaConta()">💾 Salvar dados</button>'
      // Bloco de gamificação resumido
      + '<div style="background:#FFF8F0;border-radius:14px;padding:14px;margin:12px 0;cursor:pointer;" onclick="fecharTela();abrirPainelGamificacao();">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;">'
      + '<div><div style="font-size:13px;font-weight:700;color:#FF6D00;">⭐ Pontos &amp; Níveis</div>'
      + '<div id="mc-gamif-info" style="font-size:12px;color:#888;margin-top:3px;">Carregando...</div></div>'
      + '<div style="font-size:20px;">›</div></div></div>'
      + '<script>setTimeout(function(){'
      + 'var el=document.getElementById("mc-gamif-info");if(el&&typeof getPontosGamif==="function"){var pts=getPontosGamif();var nv=getNivelGamif();el.textContent=nv.icone+" "+pts+" pts \u2022 "+nv.nome;}'
      + (destacarCPF ? 'setTimeout(function(){var c=document.getElementById("mc-cpf");if(c)c.focus();},100);' : '')
      + '},200);<' + '/script>'
      + '<button class="st-btn st-btn-danger" onclick="doLogout();fecharTela();">Sair da conta</button>';
    abrirTela('Minha Conta', html);
  }

  function salvarContaConta() {
    var u = currentUser || {};
    var cpfEl  = document.getElementById('mc-cpf') || {};
    var cpfDigitado = (cpfEl.value || '').replace(/\D/g,'');
    var cpf    = cpfDigitado || (cpfEl.getAttribute ? (cpfEl.getAttribute('data-cpf-salvo') || '') : '');
    var telEl  = document.getElementById('mc-telefone') || {};
    var tel    = (telEl.value || '').replace(/\D/g,'') || (telEl.getAttribute ? (telEl.getAttribute('data-tel-salvo') || '') : '');
    var cepEl2 = document.getElementById('mc-cep') || {};
    var cep    = (cepEl2.value || '').replace(/\D/g,'') || (cepEl2.getAttribute ? (cepEl2.getAttribute('data-cep-salvo') || '') : '');
    var rua    = (document.getElementById('mc-rua')      || {}).value || '';
    var cidade = (document.getElementById('mc-cidade')   || {}).value || '';
    var estado = (document.getElementById('mc-estado')   || {}).value || '';
    // Validar CPF se preenchido
    if (cpf && cpf.length !== 11) { showToast('CPF inválido — deve ter 11 dígitos.'); return; }
    var perfil = { cpf: cpf, telefone: tel, cep: cep, rua: rua, cidade: cidade, estado: estado };
    localStorage.setItem('rp_perfil_extra_' + u.uid, JSON.stringify(perfil));
    localStorage.setItem('rp_perfil_completo_' + u.uid, '1');
    // Salvar CPF também no rp_cpf para acesso rápido
    if (cpf) localStorage.setItem('rp_cpf', cpf);
    // Enviar dados para o servidor (persiste no KV para o admin ver)
    if (u.uid) {
      fetch('/api/usuario/dados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: u.uid,
          nome: u.name || u.displayName || '',
          email: u.email || '',
          cpf: cpf,
          telefone: tel,
          cep: cep,
          cidade: cidade,
          estado: estado
        })
      }).catch(function(){});
    }
    fecharTela();
    showToast('Dados salvos! ✓');
  }

  function formatarTelefoneConta(input) {
    var v = input.value.replace(/\D/g,'').slice(0,11);
    input.value = v;
    try { input.setSelectionRange(v.length, v.length); } catch(e) {}
  }

  function formatarCEPConta(input) {
    var v = input.value.replace(/\D/g,'').slice(0,8);
    input.value = v;
    try { input.setSelectionRange(v.length, v.length); } catch(e) {}
  }

  function buscarCEPConta() {
    var cepEl = document.getElementById('mc-cep');
    if (!cepEl) return;
    var cep = cepEl.value.replace(/\D/g,'');
    if (cep.length !== 8) { showToast('CEP inválido'); return; }
    fetch('https://viacep.com.br/ws/' + cep + '/json/')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.erro) { showToast('CEP não encontrado'); return; }
        var ruaEl    = document.getElementById('mc-rua');
        var cidEl    = document.getElementById('mc-cidade');
        var estEl    = document.getElementById('mc-estado');
        if (ruaEl)    ruaEl.value    = (d.logradouro || '') + (d.bairro ? ', ' + d.bairro : '');
        if (cidEl)    cidEl.value    = d.localidade || '';
        if (estEl)    estEl.value    = d.uf         || '';
        showToast('Endereço preenchido! ✓');
      }).catch(function() { showToast('Erro ao buscar CEP'); });
  }

  // ── Upload de Foto de Perfil ──────────────────────────────────────────────
  function atualizarAvatarUI(fotoUrl) {
    var img = document.getElementById('perfil-avatar');
    var inicial = document.getElementById('perfil-avatar-inicial');
    if (fotoUrl) {
      if (img) { img.src = fotoUrl; img.style.display = 'block'; }
      if (inicial) inicial.style.display = 'none';
    } else {
      if (img) img.style.display = 'none';
      var nome = (currentUser && (currentUser.name || currentUser.email)) || 'U';
      if (inicial) {
        inicial.style.display = 'flex';
        inicial.textContent = nome.charAt(0).toUpperCase();
      }
    }
  }

  function uploadFotoPerfil(input) {
    var file = input && input.files && input.files[0];
    if (!file) return;

    // Verificar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      showToast('Selecione uma imagem válida.');
      return;
    }

    // Mostrar spinner
    var spinner = document.getElementById('perfil-upload-spinner');
    if (spinner) spinner.classList.add('ativo');

    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      // Redimensionar para max 400x400 via canvas (economiza ~85% de tamanho)
      var img = new Image();
      img.onload = function() {
        var maxSide = 400;
        var w = img.width, h = img.height;
        if (w > maxSide || h > maxSide) {
          var ratio = Math.min(maxSide / w, maxSide / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        var base64 = compressedDataUrl.split(',')[1];

        // Verificar tamanho após compressão
        if (base64.length > 1.8 * 1024 * 1024) {
          if (spinner) spinner.classList.remove('ativo');
          showToast('Foto muito grande. Tente uma imagem menor.');
          return;
        }

        var uid = currentUser && currentUser.uid;
        if (!uid) {
          if (spinner) spinner.classList.remove('ativo');
          showToast('Faça login para alterar a foto.');
          return;
        }

        // Atualizar avatar na UI imediatamente (feedback visual)
        atualizarAvatarUI(compressedDataUrl);

        // Enviar para o servidor
        fetch('/api/perfil/foto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, fotoBase64: base64, mimeType: 'image/jpeg' })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (spinner) spinner.classList.remove('ativo');
          if (data.sucesso) {
            var fotoUrl = data.fotoUrl;
            // Salvar no localStorage para persistência entre sessões
            localStorage.setItem('rp_foto_perfil_' + uid, fotoUrl);
            // Atualizar Firebase profile (photoURL)
            if (window._fbUpdateProfile && window._fbAuth && window._fbAuth.currentUser) {
              window._fbUpdateProfile(window._fbAuth.currentUser, { photoURL: fotoUrl })
                .catch(function() { /* não crítico */ });
            }
            showToast('Foto de perfil atualizada! ✓');
          } else {
            showToast(data.mensagem || 'Erro ao salvar foto.');
          }
        })
        .catch(function() {
          if (spinner) spinner.classList.remove('ativo');
          // Manter foto na UI mesmo offline (localStorage já salvo)
          var uid2 = currentUser && currentUser.uid;
          if (uid2) {
            localStorage.setItem('rp_foto_perfil_' + uid2, compressedDataUrl);
          }
          showToast('Foto salva localmente ✓ (sem conexão)');
        });

        // Limpar input para permitir selecionar mesma foto novamente
        input.value = '';
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // ── Meus Veículos (até 2 carros) ─────────────────────────────────────────
  function abrirMeusVeiculos() {
    var lista = getVeiculos();
    var html = '';

    // Lista de veículos cadastrados
    if (lista.length === 0) {
      html += '<div class="st-card" style="text-align:center;padding:28px 16px;">'
        + '<div style="font-size:52px;margin-bottom:10px;">🚗</div>'
        + '<div style="font-size:16px;font-weight:800;color:#1A1A1A;margin-bottom:6px;">Nenhum veículo cadastrado</div>'
        + '<div style="font-size:13px;color:#888;line-height:1.6;">Cadastre seu carro para calcular o consumo e custo de cada rota.</div>'
        + '</div>';
    } else {
      html += '<div class="st-card">';
      lista.forEach(function(v, i) {
        var ic = veiculoIcone(v.tipo);
        html += '<div class="veh-list-item">'
          + '<div class="veh-list-icon">' + ic + '</div>'
          + '<div class="veh-list-info">'
          + '<div class="veh-list-nome">' + v.nome + '</div>'
          + '<div class="veh-list-det">' + v.tipo + ' · ' + v.consumo + ' km/L · tanque ' + v.tanque + ' L' + (v.placa ? ' · 🔖 ' + v.placa : '') + '</div>'
          + '</div>'
          + '<div class="veh-list-btns">'
          + '<button class="veh-list-btn-edit" onclick="editarVeiculoId(&quot;' + v.id + '&quot;)">✏️</button>'
          + '<button class="veh-list-btn-edit" style="color:#E53935;border-color:#FFCDD2;" onclick="excluirVeiculo(&quot;' + v.id + '&quot;)">🗑️</button>'
          + '</div>'
          + '</div>';
      });
      html += '</div>';
    }

    // Slot para adicionar (se < 2)
    if (lista.length < 2) {
      html += '<button class="st-btn" onclick="adicionarVeiculo()">＋ Adicionar veículo</button>';
    } else {
      html += '<div style="text-align:center;font-size:13px;color:#888;padding:8px 0;">Limite de 2 veículos atingido. Exclua um para adicionar outro.</div>';
    }
    abrirTela('Meus Veículos', html);
  }

  function adicionarVeiculo() {
    var lista = getVeiculos();
    if (lista.length >= 2) { showToast('Limite de 2 veículos atingido'); return; }
    _renderFormVeiculo(null, lista);
  }

  function editarVeiculoId(id) {
    var lista = getVeiculos();
    var v = lista.find(function(x) { return x.id === id; });
    _renderFormVeiculo(v, lista);
  }

  function _renderFormVeiculo(v, lista) {
    var tipos = ['Carro de passeio','SUV / Picape','Moto','Caminhão / Van','Elétrico / Híbrido'];
    var optsHtml = tipos.map(function(t) {
      return '<option' + (v && v.tipo === t ? ' selected' : '') + '>' + t + '</option>';
    }).join('');
    var isNovo = !v;
    var html = '<div class="st-card">'
      + '<label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px;">Nome do veículo</label>'
      + '<input id="veh-f-nome" type="text" placeholder="Ex: Meu Corsa, Moto Honda…" maxlength="30" value="' + (v ? v.nome : '') + '" style="width:100%;padding:13px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;box-sizing:border-box;margin-bottom:14px;font-family:inherit;">'
      + '<label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px;">Tipo de veículo</label>'
      + '<select id="veh-f-tipo" style="width:100%;padding:13px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;background:#fff;margin-bottom:14px;">' + optsHtml + '</select>'
      + '<label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px;">Consumo médio <span style="font-weight:400;color:#AAA;">(km por litro)</span></label>'
      + '<input id="veh-f-consumo" type="number" min="4" max="50" step="0.5" value="' + (v ? v.consumo : '12') + '" placeholder="Ex: 12" style="width:100%;padding:13px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;box-sizing:border-box;margin-bottom:6px;font-family:inherit;">'
      + '<div style="font-size:11px;color:#AAA;margin-bottom:14px;">Carro popular ≈ 10–13 km/L · SUV ≈ 8–11 · Moto ≈ 20–35 · Elétrico: deixe 1 e insira Wh/km</div>'
      + '<label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px;">Capacidade do tanque <span style="font-weight:400;color:#AAA;">(litros)</span></label>'
      + '<input id="veh-f-tanque" type="number" min="10" max="200" value="' + (v ? v.tanque : '50') + '" placeholder="Ex: 50" style="width:100%;padding:13px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;box-sizing:border-box;font-family:inherit;">'
      + '<label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px;margin-top:14px;">Placa <span style="font-weight:400;color:#AAA;">(opcional)</span></label>'
      + '<input id="veh-f-placa" type="text" maxlength="8" placeholder="ABC-1234 ou ABC1D23" value="' + (v ? (v.placa || '') : '') + '" oninput="this.value=this.value.toUpperCase()" style="width:100%;padding:13px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;box-sizing:border-box;font-family:inherit;text-transform:uppercase;letter-spacing:3px;">'
      + '</div>'
      + '<button onclick="salvarFormVeiculo(&quot;' + (v ? v.id : '') + '&quot;)" class="st-btn">' + (isNovo ? 'Cadastrar veículo' : 'Salvar alterações') + '</button>';
    abrirTela(isNovo ? 'Novo Veículo' : 'Editar Veículo', html);
  }

  function salvarFormVeiculo(id) {
    var nomeEl = document.getElementById('veh-f-nome');
    var tipoEl = document.getElementById('veh-f-tipo');
    var consumoEl = document.getElementById('veh-f-consumo');
    var tanqueEl = document.getElementById('veh-f-tanque');
    var placaEl = document.getElementById('veh-f-placa');
    if (!nomeEl || !tipoEl || !consumoEl || !tanqueEl) return;
    var nome = nomeEl.value.trim() || tipoEl.value;
    var consumo = parseFloat(consumoEl.value) || 12;
    var tanque = parseInt(tanqueEl.value) || 50;
    var placa = placaEl ? placaEl.value.trim().toUpperCase().replace(/\s/g,'') : '';
    if (consumo < 1 || consumo > 100) { showToast('Consumo inválido'); return; }

    var lista = getVeiculos();

    // Validar placa duplicada (formato e duplicidade)
    if (placa) {
      // Aceitar apenas formatos válidos: ABC-1234, ABC1234, ABC1D23 (Mercosul)
      var placaLimpa = placa.replace('-','');
      var placaValida = /^[A-Z]{3}[0-9]{4}$/.test(placaLimpa) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placaLimpa);
      if (!placaValida) {
        showToast('Placa inválida. Use ABC-1234 ou ABC1D23');
        return;
      }
      // Verificar duplicidade em outro veículo
      var placaDup = lista.find(function(x) { return x.id !== id && x.placa && x.placa.replace('-','').toUpperCase() === placaLimpa; });
      if (placaDup) {
        showToast('Placa já cadastrada em "' + placaDup.nome + '"');
        return;
      }
    }

    // Validar nome duplicado em outro veículo
    var nomeDup = lista.find(function(x) { return x.id !== id && x.nome.toLowerCase() === nome.toLowerCase(); });
    if (nomeDup) {
      showToast('Já existe um veículo com este nome');
      return;
    }

    if (id) {
      // editar existente
      var idx = lista.findIndex(function(x) { return x.id === id; });
      if (idx >= 0) {
        lista[idx].nome = nome;
        lista[idx].tipo = tipoEl.value;
        lista[idx].consumo = consumo;
        lista[idx].tanque = tanque;
        lista[idx].placa = placa;
      }
    } else {
      // novo
      if (lista.length >= 2) { showToast('Limite de 2 veículos'); return; }
      lista.push({ id: 'v' + Date.now(), nome: nome, tipo: tipoEl.value, consumo: consumo, tanque: tanque, placa: placa, ativo: lista.length === 0 });
    }
    salvarVeiculos(lista);
    fecharTela();
    showToast('Veículo salvo! ✓');
    // Se estiver na tela planejar, atualizar tabs
    if (document.getElementById('view-planejar')?.classList.contains('active')) {
      renderPlanCarTabs();
    }
  }

  function excluirVeiculo(id) {
    var lista = getVeiculos().filter(function(v) { return v.id !== id; });
    if (lista.length > 0 && !lista.find(function(v) { return v.ativo; })) lista[0].ativo = true;
    salvarVeiculos(lista);
    abrirMeusVeiculos();
    showToast('Veículo removido');
  }

  function editarVeiculo(campo) {
    // legacy — redireciona para novo sistema
    abrirMeusVeiculos();
  }

  function salvarVeiculoCampo(campo) {
    // legacy — não usado mais, mas mantido para compatibilidade
    fecharTela();
  }

  // ── Formas de Pagamento ───────────────────────────────────────────────────
  function abrirFormasPagamento() {
    var html = '<div class="st-card" style="text-align:center;padding:24px 16px;">'
      + '<div style="font-size:48px;margin-bottom:10px;">💳</div>'
      + '<p style="font-size:14px;color:#555;line-height:1.65;">O RotaPosto utiliza <strong>PIX recorrente</strong> como forma de pagamento para assinaturas Premium.</p>'
      + '</div>'
      + '<div class="st-card">'
      + '<div class="st-row"><span class="st-label">PIX Recorrente</span><span class="st-value" style="color:#00C853;">✓ Disponível</span></div>'
      + '<div class="st-row"><span class="st-label">Cartão de crédito</span><span class="st-value" style="color:#888;">Em breve</span></div>'
      + '<div class="st-row"><span class="st-label">Processado via</span><span class="st-value">OpenPix/Woovi</span></div>'
      + '</div>'
      + '<button class="st-btn" onclick="fecharTela();goToAssinatura();">Ver planos Premium</button>';
    abrirTela('Formas de Pagamento', html);
  }

  // ── Notificações ──────────────────────────────────────────────────────────
  function _isWebView() {
    var ua = navigator.userAgent || '';
    return (/wv/.test(ua) || /WebView/i.test(ua)) && !/Chrome/.test(ua);
  }

  function abrirNotificacoes() {
    // WebView Android puro não suporta Notification API
    if (_isWebView() || !('Notification' in window)) {
      var html = '<div class="st-card" style="text-align:center;padding:28px 16px;">'
        + '<div style="font-size:48px;margin-bottom:12px;">🔔</div>'
        + '<div style="font-size:17px;font-weight:800;color:#1A1A1A;margin-bottom:8px;">Notificações Push</div>'
        + '<div style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">'
        + 'As notificações push estão <strong>disponíveis automaticamente</strong> no app RotaPosto.<br><br>'
        + 'Você será avisado sobre:<br>• Quedas de preço nos seus postos favoritos<br>• Promoções na sua região<br>• Novidades do RotaPosto'
        + '</div>'
        + '</div>'
        + '<div class="st-card">'
        + '<div style="display:flex;align-items:center;gap:12px;padding:8px 0;">'
        + '<span style="font-size:24px;">✅</span>'
        + '<div><div style="font-size:14px;font-weight:700;color:#1A1A1A;">Notificações ativas</div>'
        + '<div style="font-size:12px;color:#888;">O app envia alertas automaticamente</div></div>'
        + '</div>'
        + '</div>';
      abrirTela('Notificações', html);
      return;
    }

    var ativas = Notification.permission === 'granted';
    var html = '<div class="st-card" style="text-align:center;padding:24px 16px;">'
      + '<div style="font-size:48px;margin-bottom:10px;">' + (ativas ? '🔔' : '🔕') + '</div>'
      + '<div style="font-size:17px;font-weight:800;color:#1A1A1A;margin-bottom:6px;">' + (ativas ? 'Notificações ativas' : 'Notificações desativadas') + '</div>'
      + '<div style="font-size:13px;color:#888;">Status: ' + Notification.permission + '</div>'
      + '</div>'
      + '<div class="st-card">'
      + '<p style="font-size:14px;color:#555;line-height:1.7;">Receba alertas quando:<br>• Preços próximos de você caírem<br>• Postos favoritos atualizarem preços<br>• Novas promoções na sua região</p>'
      + '</div>'
      + (!ativas ? '<button class="st-btn" onclick="pedirPermissaoNotificacao()">Ativar notificações</button>'
      : '<div style="text-align:center;font-size:13px;color:#888;padding:12px;">Para desativar, acesse as configurações do seu dispositivo → Apps → RotaPosto → Notificações.</div>');
    abrirTela('Notificações', html);
  }

  function pedirPermissaoNotificacao() {
    if (!('Notification' in window)) { showToast('Notificações ativas no app! 🔔'); fecharTela(); return; }
    Notification.requestPermission().then(function(result) {
      fecharTela();
      if (result === 'granted') { showToast('Notificações ativadas! 🔔'); setTimeout(function(){ abrirNotificacoes(); }, 300); }
      else showToast('Permissão negada. Ative nas configurações do dispositivo.');
    });
  }

  // ── Indique e Ganhe ───────────────────────────────────────────────────────
  function abrirIndiqueGanhe() {
    var u = currentUser || {};
    var link = 'https://rotaposto.com.br?ref=' + (u.uid || 'usuario').slice(0, 8);
    var html = '<div class="st-card" style="background:linear-gradient(135deg,#FF6D00,#FF8F00);text-align:center;color:#fff;padding:24px 16px;">'
      + '<div style="font-size:48px;margin-bottom:10px;">🎁</div>'
      + '<div style="font-size:20px;font-weight:800;margin-bottom:8px;">Convide amigos!</div>'
      + '<div style="font-size:14px;opacity:0.92;">Você e seu amigo ganham<br><strong>7 dias de Premium grátis</strong></div>'
      + '</div>'
      + '<div class="st-card">'
      + '<div class="st-section-title">Seu link de indicação</div>'
      + '<div style="font-size:14px;font-weight:600;color:#FF6D00;word-break:break-all;padding:8px 0;">' + link + '</div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
      + '<button class="st-btn st-btn-ghost" onclick="copiarLinkIndicacao(this.dataset.link)" data-link="' + link + '">📋 Copiar</button>'
      + '<button class="st-btn" onclick="compartilharIndicacao(this.dataset.link)" data-link="' + link + '">📤 Compartilhar</button>'
      + '</div>';
    abrirTela('Indique e Ganhe', html);
  }

  function copiarLinkIndicacao(link) {
    navigator.clipboard.writeText(link).then(function() { showToast('Link copiado! ✓'); }).catch(function() { showToast('Erro ao copiar'); });
  }

  function compartilharIndicacao(link) {
    if (navigator.share) {
      navigator.share({ title: 'RotaPosto', text: 'Economize combustível comigo no RotaPosto! Use meu link:', url: link });
    } else {
      copiarLinkIndicacao(link);
    }
  }

  // ── Ajuda e Suporte ───────────────────────────────────────────────────────
  function abrirAjuda() {
    var faqs = [
      ['Como encontrar postos baratos?', 'Permita acesso à sua localização e o app mostrará automaticamente os postos mais baratos próximos a você.'],
      ['Os preços são atualizados em tempo real?', 'Usamos dados da ANP (Agência Nacional do Petróleo) atualizados semanalmente, combinados com reportes da comunidade.'],
      ['Como reportar um preço?', 'Clique em um posto no mapa, abra os detalhes e use o botão "Reportar preço" para atualizar o valor.'],
      ['Como cancelar minha assinatura?', 'Acesse Perfil → Assinatura e clique em "Cancelar assinatura". Você continua com acesso Premium até o fim do período pago.'],
    ];
    var html = '<div class="st-faq">'
      + faqs.map(function(f) {
          return '<details><summary>' + f[0] + '<span style="color:#FF6D00;font-size:20px;font-weight:300;">+</span></summary>'
            + '<div class="st-faq-body">' + f[1] + '</div></details>';
        }).join('')
      + '</div>'
      + '<div class="st-card" style="text-align:center;margin-top:4px;">'
      + '<p style="font-size:14px;color:#555;margin-bottom:14px;">Não encontrou o que procura?</p>'
      + '<a href="mailto:contato@rotaposto.com.br" class="st-btn" style="display:block;text-decoration:none;text-align:center;">📧 Falar com suporte</a>'
      + '</div>';
    abrirTela('Ajuda e Suporte', html);
  }

  // ── Termos e Privacidade — abre dentro do app com botão Voltar ───────────
  function abrirTermosApp() {
    // Buscar conteúdo da rota /termos e exibir na rp-subtela
    abrirTela('Termos de Uso', '<div style="display:flex;justify-content:center;padding:40px;"><div style="width:32px;height:32px;border:3px solid #FF6D00;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div></div>');
    fetch('/termos')
      .then(function(r) { return r.text(); })
      .then(function(html) {
        // Extrair apenas o conteúdo do <body>, descartando scripts e estilos
        // Remover tags script/style de forma simples (sem regex complexa)
        var el = document.getElementById('rp-subtela-body');
        if (!el) return;
        // Extrair body de forma segura usando DOMParser
        try {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          // Remover scripts e styles do documento parseado
          doc.querySelectorAll('script,style,link').forEach(function(s) { s.remove(); });
          var bodyContent = doc.body ? doc.body.innerHTML : html;
          el.innerHTML = '<div style="padding:4px 4px 40px;">' + bodyContent + '</div>';
        } catch(e) {
          // Fallback: exibir diretamente
          el.innerHTML = '<div style="padding:16px;">' + html.substring(0, 5000) + '</div>';
        }
      })
      .catch(function() {
        var el = document.getElementById('rp-subtela-body');
        if (el) el.innerHTML = '<div style="padding:24px;text-align:center;color:#888;">Erro ao carregar termos. <a href="/termos" style="color:#FF6D00;">Abrir no navegador</a></div>';
      });
  }

  function abrirPrivacidadeApp() {
    abrirTela('Política de Privacidade', '<div style="display:flex;justify-content:center;padding:40px;"><div style="width:32px;height:32px;border:3px solid #FF6D00;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div></div>');
    fetch('/privacidade')
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var el = document.getElementById('rp-subtela-body');
        if (!el) return;
        try {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          doc.querySelectorAll('script,style,link').forEach(function(s) { s.remove(); });
          var bodyContent = doc.body ? doc.body.innerHTML : html;
          el.innerHTML = '<div style="padding:4px 4px 40px;">' + bodyContent + '</div>';
        } catch(e) {
          el.innerHTML = '<div style="padding:16px;">' + html.substring(0, 5000) + '</div>';
        }
      })
      .catch(function() {
        var el = document.getElementById('rp-subtela-body');
        if (el) el.innerHTML = '<div style="padding:24px;text-align:center;color:#888;">Erro ao carregar. <a href="/privacidade" style="color:#FF6D00;">Abrir no navegador</a></div>';
      });
  }

  // ── Configurações ─────────────────────────────────────────────────────────
  function abrirConfiguracoes() {
    var unidade = localStorage.getItem('rp_unidade') || 'km';
    var tema = localStorage.getItem('rp_tema') || 'claro';
    var html = '<div style="background:#F9F9F9;border-radius:16px;padding:4px;margin-bottom:16px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;">'
      + '<div><div style="font-size:14px;font-weight:600;color:#1A1A1A;">Unidade de distância</div><div style="font-size:12px;color:#888;">km ou milhas</div></div>'
      + '<select id="cfg-unidade" onchange="salvarConfig(&quot;unidade&quot;,this.value)" style="padding:8px 12px;border:1.5px solid #E0E0E0;border-radius:8px;font-size:14px;">'
      + '<option value="km"' + (unidade==='km'?' selected':'') + '>Quilômetros (km)</option>'
      + '<option value="mi"' + (unidade==='mi'?' selected':'') + '>Milhas (mi)</option>'
      + '</select></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;">'
      + '<div><div style="font-size:14px;font-weight:600;color:#1A1A1A;">Raio de busca padrão</div><div style="font-size:12px;color:#888;">Distância máxima para busca</div></div>'
      + '<select id="cfg-raio" onchange="salvarConfig(&quot;raio&quot;,this.value)" style="padding:8px 12px;border:1.5px solid #E0E0E0;border-radius:8px;font-size:14px;">'
      + ['5','10','15','20','30'].map(function(r){ var sel=localStorage.getItem('rp_raio')||'10'; return '<option value="'+r+'"'+(sel===r?' selected':'')+'>'+r+' km</option>'; }).join('')
      + '</select></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;">'
      + '<div><div style="font-size:14px;font-weight:600;color:#1A1A1A;">Limpar dados locais</div><div style="font-size:12px;color:#888;">Remove cache e histórico</div></div>'
      + '<button onclick="limparDadosLocais()" style="padding:8px 14px;background:#FFF0F0;color:#E53935;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Limpar</button>'
      + '</div></div>'
      + '<div style="text-align:center;margin-top:8px;">'
      + '<div style="font-size:11px;color:#aaa;">RotaPosto v1.0 • <a href="#" onclick="abrirTermosApp();return false;" style="color:#FF6D00;">Termos</a> • <a href="#" onclick="abrirPrivacidadeApp();return false;" style="color:#FF6D00;">Privacidade</a></div>'
      + '</div>';
    abrirTela('Configurações', html);
  }

  function salvarConfig(chave, valor) {
    localStorage.setItem('rp_' + chave, valor);
    showToast('Configuração salva ✓');
  }

  function limparDadosLocais() {
    var user = localStorage.getItem('rp_user');
    var device = localStorage.getItem('rp_device_id');
    localStorage.clear();
    if (user) localStorage.setItem('rp_user', user);
    if (device) localStorage.setItem('rp_device_id', device);
    fecharTela();
    showToast('Dados locais limpos ✓');
  }

  // ══════════════════════════════════════════════════════
  //  ASSINATURA PIX RECORRENTE – FLUXO COMPLETO
  // ══════════════════════════════════════════════════════
  let planoSelecionado = 'premium';
  let assinaturaInterval = null;
  let assinaturaSubscriptionId = null;

  function goToAssinatura() {
    // Sempre abre Step1 (planos + PIX), mas verifica status para mostrar banner
    abrirModalAssinatura();
    if (currentUser?.uid) {
      fetch('/api/assinatura/status/' + currentUser.uid)
        .then(r => r.json())
        .then(data => {
          if (data.ativa) {
            // Já é premium — mostrar banner de ativo no Step1 e ajustar botão
            const banner = document.getElementById('assin-banner-ativo');
            const expiraEl = document.getElementById('assin-banner-expira');
            const badgeEl = document.getElementById('assin-banner-plano-badge');
            const btnPix = document.getElementById('assin-btn-pix');
            if (banner) banner.style.display = 'block';
            if (expiraEl && data.expiraEm) {
              const d = new Date(data.expiraEm);
              expiraEl.textContent = 'Ativo até ' + d.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
            }
            if (badgeEl) badgeEl.textContent = data.plano === 'anual' ? 'ANUAL' : 'MENSAL';
            if (btnPix) btnPix.textContent = '🔄 Gerar novo PIX (renovar)';
          } else if (data.status === 'PENDING' && data.qrCode) {
            // Pagamento pendente — mostrar QR existente direto
            mostrarQRCode(data.qrCode, data.brcode, data.subscriptionId, planoSelecionado || data.plano || 'premium');
          }
          // else: FREE → Step1 normal sem banner
        })
        .catch(() => { /* fica no Step1 normal */ });
    }
  }

  function abrirModalAssinatura() {
    var el = document.getElementById('modal-assinatura');
    if (!el) return;
    // Garantir que está no body (fora de qualquer container overflow:hidden)
    if (el.parentNode !== document.body) document.body.appendChild(el);
    el.offsetHeight; // forçar reflow para ativar transição CSS
    el.style.transform = 'translateX(0)';
    mostrarStep1();
  }

  function fecharAssinatura() {
    var el = document.getElementById('modal-assinatura');
    if (!el) return;
    el.style.transform = 'translateX(100%)';
    if (assinaturaInterval) { clearInterval(assinaturaInterval); assinaturaInterval = null; }
    // Recarregar dados do perfil
    verificarStatusAssinatura();
  }

  function selecionarPlano(plano) {
    planoSelecionado = plano;
    // Atualizar UI dos radios
    const isPremium = plano === 'premium';
    document.getElementById('label-plano-premium').style.borderColor = isPremium ? '#FF6D00' : '#E0E0E0';
    document.getElementById('label-plano-premium').style.background = isPremium ? '#FFF8F5' : '#fff';
    document.getElementById('radio-premium').style.background = isPremium ? '#FF6D00' : '#fff';
    document.getElementById('radio-premium').style.borderColor = isPremium ? '#FF6D00' : '#E0E0E0';

    document.getElementById('label-plano-anual').style.borderColor = !isPremium ? '#FF6D00' : '#E0E0E0';
    document.getElementById('label-plano-anual').style.background = !isPremium ? '#FFF8F5' : '#fff';
    document.getElementById('radio-anual').style.background = !isPremium ? '#FF6D00' : '#fff';
    document.getElementById('radio-anual').style.borderColor = !isPremium ? '#FF6D00' : '#E0E0E0';
  }

  function mostrarStep1() {
    document.getElementById('assin-step1').style.display = 'block';
    document.getElementById('assin-step2').style.display = 'none';
    document.getElementById('assin-step3').style.display = 'none';
    selecionarPlano(planoSelecionado || 'premium');
    // Restaurar texto do botão PIX
    var btnPix = document.getElementById('assin-btn-pix');
    if (btnPix) {
      btnPix.innerHTML = '<svg width="22" height="22" viewBox="0 0 512 512" fill="currentColor"><path d="M242.4 292.5C247.8 287.1 255.1 284.1 262.5 284.1C269.9 284.1 277.2 287.1 282.6 292.5L350.2 360.1C355.6 365.5 358.7 372.8 358.7 380.2C358.7 387.6 355.6 394.9 350.2 400.3L282.6 467.9C277.2 473.3 269.9 476.4 262.5 476.4C255.1 476.4 247.8 473.3 242.4 467.9L174.8 400.3C169.4 394.9 166.3 387.6 166.3 380.2C166.3 372.8 169.4 365.5 174.8 360.1L242.4 292.5zM374.7 111.7C380.1 106.3 387.4 103.2 394.8 103.2C402.2 103.2 409.5 106.3 414.9 111.7L482.5 179.3C487.9 184.7 491 192 491 199.4C491 206.8 487.9 214.1 482.5 219.5L414.9 287.1C409.5 292.5 402.2 295.6 394.8 295.6C387.4 295.6 380.1 292.5 374.7 287.1L307.1 219.5C301.7 214.1 298.6 206.8 298.6 199.4C298.6 192 301.7 184.7 307.1 179.3L374.7 111.7zM110.1 111.7C115.5 106.3 122.8 103.2 130.2 103.2C137.6 103.2 144.9 106.3 150.3 111.7L217.9 179.3C223.3 184.7 226.4 192 226.4 199.4C226.4 206.8 223.3 214.1 217.9 219.5L150.3 287.1C144.9 292.5 137.6 295.6 130.2 295.6C122.8 295.6 115.5 292.5 110.1 287.1L42.5 219.5C37.1 214.1 34 206.8 34 199.4C34 192 37.1 184.7 42.5 179.3L110.1 111.7z"/></svg> Pagar com PIX';
    }
  }

  function voltarStep1() {
    if (assinaturaInterval) { clearInterval(assinaturaInterval); assinaturaInterval = null; }
    mostrarStep1();
  }

  async function iniciarPagamentoPIX() {
    if (!currentUser) {
      showToast('Faça login para assinar!');
      fecharAssinatura();
      return;
    }

    // Garantir que userId nunca seja undefined
    const userId = currentUser.uid || currentUser.id || currentUser.email;
    if (!userId) {
      showToast('Erro de sessão. Faça login novamente.');
      fecharAssinatura();
      return;
    }

    showLoading(true);
    try {
      // Buscar CPF do servidor (KV) — fonte segura e autoritativa
      // Fallback: localStorage do próprio usuário (mesmo uid) se servidor retornar 404
      var cpfDoServidor = '';
      try {
        var perfilRes = await fetch('/api/usuario/perfil/' + userId);
        if (perfilRes.ok) {
          var perfilData = await perfilRes.json();
          cpfDoServidor = (perfilData && perfilData.cpf) ? String(perfilData.cpf).replace(/\D/g,'') : '';
        }
      } catch (e) {
        console.warn('[PIX] Nao foi possivel buscar CPF do servidor:', e);
      }
      // Fallback: localStorage vinculado ao uid atual (seguro pois usa o uid da sessão)
      if (!cpfDoServidor) {
        var perfilLocal = {};
        try { perfilLocal = JSON.parse(localStorage.getItem('rp_perfil_extra_' + userId) || '{}'); } catch {}
        cpfDoServidor = (perfilLocal['cpf'] || '').replace(/\D/g,'');
      }

      const body = {
        nome: currentUser.name || currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
        email: currentUser.email || '',
        cpf: cpfDoServidor,
        plano: planoSelecionado,
        userId: userId
      };

      const res = await fetch('/api/pix/assinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.jaAssinante || data.ativa) {
        mostrarStep3(data);
        return;
      }

      if (data.sucesso && data.qrCode) {
        assinaturaSubscriptionId = data.subscriptionId;
        if (data.demo) showToast('⚠️ Modo demonstração — pagamento não será processado');
        mostrarQRCode(data.qrCode, data.brcode, data.subscriptionId, planoSelecionado, data.demo);
      } else if (data.precisaCPF) {
        // CPF ausente ou inválido → fechar assinatura e abrir Minha Conta com alerta
        fecharAssinatura();
        setTimeout(function() { abrirMinhaConta(true); }, 300);
      } else {
        const msg = data.mensagem || data.error || 'Erro ao gerar PIX. Tente novamente.';
        console.error('[PIX] Falha:', JSON.stringify(data));
        showToast(msg);
      }
    } catch (e) {
      console.error('[PIX] Excecao:', e);
      showToast('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      showLoading(false);
    }
  }

  // Máscara CPF global — só dígitos, sem formatação durante digitação
  window._mascaraCPF = function(el) {
    var v = el.value.replace(/\D/g, '').slice(0, 11);
    el.value = v;
    try { el.setSelectionRange(v.length, v.length); } catch(e) {}
  };

  // Preço médio dos postos carregados (ou fallback ANP nacional)
  function _getPrecoMedioPosros() {
    if (postosData && postosData.length > 0) {
      var precos = postosData.slice(0, 10)
        .map(function(p) { return p.preco || (p.precos && p.precos[selectedFuel]) || 0; })
        .filter(function(v) { return v > 0; });
      if (precos.length > 0) {
        return precos.reduce(function(a, b) { return a + b; }, 0) / precos.length;
      }
    }
    // Fallback ANP médio nacional ~2025
    var fallbacks = { gasolina: 6.10, etanol: 4.20, diesel: 6.30, gnv: 4.80 };
    return fallbacks[selectedFuel] || 6.10;
  }

  // ── PWA install ─────────────────────────────────────────────────────────────
  function instalarOuMostrarPWA() {
    var prompt = window._deferredInstallPrompt;
    if (prompt) {
      prompt.prompt();
      prompt.userChoice.then(function() { window._deferredInstallPrompt = null; });
    } else {
      showToast('Abra no navegador e use "Adicionar à tela inicial"');
    }
  }

  function mostrarQRCode(qrCode, brcode, subscriptionId, plano, isDemoMode) {
    document.getElementById('assin-step1').style.display = 'none';
    document.getElementById('assin-step2').style.display = 'block';
    document.getElementById('assin-step3').style.display = 'none';

    // Imagem QR Code — com fallback para gerador público se a Woovi falhar
    const imgEl = document.getElementById('assin-qr-img');
    imgEl.src = qrCode;
    imgEl.onerror = function() {
      // Fallback: gerar QR Code a partir do brcode via API pública
      if (brcode) {
        this.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(brcode);
        this.onerror = null;
      }
    };

    const valores = { premium: 'R$ 9,90', anual: 'R$ 89,00' };
    const ciclos  = { premium: '/mês (recorrente)', anual: '/ano (recorrente)' };
    document.getElementById('assin-valor-label').textContent = valores[plano] || 'R$ 9,90';
    document.getElementById('assin-ciclo-label').textContent = ciclos[plano] || '/mês';

    const brcodeEl = document.getElementById('assin-brcode-txt');
    brcodeEl.textContent = brcode || '';

    assinaturaSubscriptionId = subscriptionId;

    // Banner de aviso modo demo
    var demoWarn = document.getElementById('assin-demo-warn');
    if (demoWarn) demoWarn.style.display = isDemoMode ? 'block' : 'none';

    // Polling: verificar pagamento a cada 5s (só se não for demo)
    if (assinaturaInterval) clearInterval(assinaturaInterval);
    if (!isDemoMode) {
      assinaturaInterval = setInterval(() => verificarPagamentoPIX(), 5000);
    }
  }

  async function verificarPagamentoPIX() {
    if (!currentUser) return;
    try {
      const userId = currentUser.uid || currentUser.id || currentUser.email;
      if (!userId) return;
      const res = await fetch('/api/assinatura/status/' + userId);
      const data = await res.json();

      if (data.ativa || data.status === 'ACTIVE') {
        clearInterval(assinaturaInterval);
        assinaturaInterval = null;
        mostrarStep3(data);
      }
    } catch {}
  }

  function mostrarStep3(data) {
    document.getElementById('assin-step1').style.display = 'none';
    document.getElementById('assin-step2').style.display = 'none';
    document.getElementById('assin-step3').style.display = 'block';

    let labelExpira = 'Plano ativo!';
    if (data.expiraEm) {
      const d = new Date(data.expiraEm);
      labelExpira = 'Ativo ate ' + d.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
      if (data.pagamentos > 1) labelExpira += ' (renovacao automatica #' + data.pagamentos + ')';
    }
    document.getElementById('assin-expira-label').textContent = labelExpira;

    // Atualizar badge premium no perfil
    const badge = document.getElementById('perfil-badge-premium');
    if (badge) badge.style.display = 'flex';

    // Salvar status no localStorage
    const user = currentUser || {};
    user.premium = true;
    user.plano = data.plano || planoSelecionado;
    localStorage.setItem('rp_user', JSON.stringify(user));
    currentUser = user;
  }

  function copiarCodigo() {
    const brcode = document.getElementById('assin-brcode-txt').textContent;
    if (brcode && navigator.clipboard) {
      navigator.clipboard.writeText(brcode)
        .then(() => showToast('Codigo PIX copiado!'))
        .catch(() => {
          const el = document.createElement('textarea');
          el.value = brcode;
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
          showToast('Codigo PIX copiado!');
        });
    }
  }

  async function verificarStatusAssinatura() {
    if (!currentUser) return;
    try {
      const userId = currentUser.uid || currentUser.email;
      const res = await fetch('/api/assinatura/status/' + userId);
      const data = await res.json();

      const badge = document.getElementById('perfil-badge-premium');
      const perfilPlano = document.getElementById('perfil-plano-status');

      if (data.ativa) {
        if (badge) badge.style.display = 'flex';
        if (perfilPlano) perfilPlano.textContent = 'Premium ativo';
        currentUser = { ...currentUser, premium: true };
        localStorage.setItem('rp_user', JSON.stringify(currentUser));
      } else {
        if (badge) badge.style.display = 'none';
        if (perfilPlano) perfilPlano.textContent = 'Conta gratuita';
      }
    } catch {}
  }

  function doLogout() {
    // Invalidar sessão no servidor antes de limpar dados locais
    var uid = localStorage.getItem('rp_session_uid');
    if (uid) {
      fetch('/api/auth/session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uid })
      }).catch(function() {}); // fire-and-forget
    }

    // Limpar dados locais (manter rp_device_id para identificar o aparelho)
    localStorage.removeItem('rp_user');
    localStorage.removeItem('rp_vehicle');
    localStorage.removeItem('rp_session_token');
    localStorage.removeItem('rp_session_uid');

    // Fazer logout no Firebase Auth para evitar re-login automático
    try {
      if (window['_fbSignOut'] && window['_fbAuth']) {
        window['_fbSignOut'](window['_fbAuth']).catch(function() {});
      }
    } catch(e) {}

    window.location.href = '/';
  }

  function showToast(msg, dur = 2500) {
    const t = document.getElementById('app-toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), dur);
  }

  function showLoading(show) {
    document.getElementById('app-loading').classList.toggle('show', show);
  }

  // ══════════════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════════════
  // PWA removido — app funciona como site web normal

  // Capturar prompt de instalação PWA globalmente
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    window._deferredInstallPrompt = e;
    var item = document.getElementById('menu-item-instalar');
    if (item) item.style.display = 'block';
  });

  (function init() {
    // ── Registrar Service Worker (PWA / TWA) ─────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .catch(function(err) { console.warn('SW registration failed:', err); });
    }

    // ── Verificação de sessão única ──────────────────────────────────────
    // Checa no servidor se este dispositivo ainda tem a sessão ativa.
    // Se outro celular tiver logado depois, o token é diferente → logout forçado.
    function verificarSessaoUnica() {
      var uid = localStorage.getItem('rp_session_uid');
      var token = localStorage.getItem('rp_session_token');
      var deviceId = localStorage.getItem('rp_device_id');
      if (!uid || !token || !deviceId) return; // usuário não logou com sessão gerenciada

      fetch('/api/auth/session/verify?uid=' + encodeURIComponent(uid) +
            '&token=' + encodeURIComponent(token) +
            '&deviceId=' + encodeURIComponent(deviceId))
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.valid) {
            // Sessão inválida: outro dispositivo logou
            console.warn('[RotaPosto] Sessão encerrada em outro dispositivo. Deslogando...');
            // Limpar dados locais
            localStorage.removeItem('rp_user');
            localStorage.removeItem('rp_session_token');
            localStorage.removeItem('rp_session_uid');
            // Mostrar aviso e redirecionar para login
            alert('Sua conta foi acessada em outro dispositivo. Por segurança, você foi desconectado.');
            window.location.href = '/';
          }
        })
        .catch(function() { /* falha de rede: manter sessão local */ });
    }

    // Verificar imediatamente ao abrir o app
    setTimeout(verificarSessaoUnica, 3000);
    // Verificar a cada 2 minutos enquanto o app estiver aberto
    setInterval(verificarSessaoUnica, 2 * 60 * 1000);

    // Atualizar nome e foto do usuário no perfil
    if (currentUser) {
      const nome = currentUser.name || currentUser.email?.split('@')[0] || 'Usuário';
      const nomeEl = document.getElementById('perfil-nome');
      if (nomeEl) nomeEl.textContent = nome;

      // Prioridade: localStorage → Firebase photo → inicial do nome
      const fotoLocal = localStorage.getItem('rp_foto_perfil_' + currentUser.uid);
      const fotoFinal = fotoLocal || currentUser.photo || '';
      atualizarAvatarUI(fotoFinal);

      // Atualizar também o div da inicial com a letra correta
      const inicialEl = document.getElementById('perfil-avatar-inicial');
      if (inicialEl) inicialEl.textContent = nome.charAt(0).toUpperCase();
    }

    // Remover splash de carregamento
    var splash = document.getElementById('app-splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(function() { if (splash && splash.parentNode) splash.parentNode.removeChild(splash); }, 450);
    }

    // ── Processar resultado de redirect do Facebook (NÃO-BLOQUEANTE) ──────────
    // IMPORTANTE: rodar em setTimeout para NÃO bloquear o init/splash.
    // O Firebase pode demorar para carregar; qualquer await aqui trava a splash.
    if (localStorage.getItem('rp_fb_redirect_pending')) {
      localStorage.removeItem('rp_fb_redirect_pending');
      setTimeout(function() {
        if (window['_fbGetRedirectResult'] && window['_fbAuth']) {
          window['_fbGetRedirectResult'](window['_fbAuth'])
            .then(function(result: any) {
              if (result && result.user) {
                var u = result.user;
                var userData = {
                  uid: u.uid, email: u.email || '',
                  name: u.displayName || '', photo: u.photoURL || '',
                  provider: 'facebook.com'
                };
                localStorage.setItem('rp_user', JSON.stringify(userData));
                showToast('✅ Olá, ' + (u.displayName || u.email) + '!');
                // Recarregar a view de perfil para refletir o login
                var curView = document.querySelector('.view.active');
                if (curView && curView.id === 'view-perfil') goToView('perfil');
              }
            })
            .catch(function(e: any) { console.warn('[FB Redirect]', e); });
        }
      }, 2500); // aguarda Firebase inicializar (scripts carregados de forma assíncrona)
    }

    // ── Verificar autenticação antes de abrir o app ──────────────────────────
    var _rpUserStr = localStorage.getItem('rp_user');
    var _rpUser = null;
    try { _rpUser = _rpUserStr ? JSON.parse(_rpUserStr) : null; } catch {}

    if (!_rpUser || !_rpUser.uid) {
      // Não logado → redirecionar para a landing/onboarding
      window.location.replace('/');
      return;
    }

    // Logado → iniciar na view mapa normalmente
    goToView('mapa');
    // Pedir localização logo no init — antes de qualquer coisa
    _initLocalizacao();



    // ── Botão SOS: posição inicial = centro vertical, mas arrastável ──────────
    (function initSosDrag() {
      var btn = document.getElementById('btn-sos-float');
      if (!btn) return;

      // Limpar posição antiga (era bottom, agora usamos top)
      localStorage.removeItem('rp_sos_bottom');

      var _sosDragging = false;
      var _sosWasDragged = false;
      var startClientY = 0;
      var startBtnTop = 0;   // top em px relativo à janela

      function getBtnTop() {
        return btn.getBoundingClientRect().top;
      }

      function onStart(e) {
        _sosDragging = false;
        _sosWasDragged = false;
        startClientY = e.touches ? e.touches[0].clientY : e.clientY;
        startBtnTop = getBtnTop();

        function onMove(ev) {
          var curY = ev.touches ? ev.touches[0].clientY : ev.clientY;
          var dy = curY - startClientY;
          if (!_sosDragging && Math.abs(dy) > 6) {
            _sosDragging = true;
            _sosWasDragged = true;
            btn.classList.add('dragging');
          }
          if (!_sosDragging) return;
          ev.preventDefault();
          // Converter para top% relativo à janela, limitando à tela
          var newTop = Math.max(56, Math.min(window.innerHeight - 56, startBtnTop + dy));
          // Usar top em px para arrastar, ignorar transform
          btn.style.transform = 'none';
          btn.style.top = newTop + 'px';
          btn.style.transition = 'none';
        }

        function onEnd() {
          if (_sosDragging) {
            btn.classList.remove('dragging');
            btn.style.transition = '';
            // Salvar posição como % para diferentes tamanhos de tela
            var pct = Math.round((getBtnTop() + btn.offsetHeight / 2) / window.innerHeight * 100);
            localStorage.setItem('rp_sos_top_pct', pct.toString());
          }
          _sosDragging = false;
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onEnd);
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('touchend', onEnd);
        }

        document.addEventListener('mousemove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
      }

      // Restaurar posição salva (em %)
      var savedPct = parseInt(localStorage.getItem('rp_sos_top_pct') || '50');
      var savedTop = Math.round((savedPct / 100) * window.innerHeight - btn.offsetHeight / 2);
      if (savedPct !== 50) {
        btn.style.transform = 'none';
        btn.style.top = savedTop + 'px';
      }

      btn.addEventListener('mousedown', onStart);
      btn.addEventListener('touchstart', onStart, { passive: true });

      btn.addEventListener('click', function(e) {
        if (_sosWasDragged) {
          e.stopPropagation();
          e.preventDefault();
          _sosWasDragged = false;
        }
      }, true);
    })();

    // Verificar se item "Instalar app" deve aparecer no menu
    // (PWA install prompt — só mostra se beforeinstallprompt disparou)
    (function() {
      var itemInstalar = document.getElementById('menu-item-instalar');
      if (!itemInstalar) return;
      if (window._deferredInstallPrompt) {
        itemInstalar.style.display = 'block';
      }
      window.addEventListener('beforeinstallprompt', function() {
        if (itemInstalar) itemInstalar.style.display = 'block';
      });
    })();

    // Verificar status de assinatura
    setTimeout(() => verificarStatusAssinatura(), 1000);

    // Aplicar configuração do menu definida pelo admin
    (function() {
      fetch('/api/app/menu-config')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || !data.itens) return;
          var mapaIds = {
            minhaConta:      'menu-item-minhaconta',
            meusVeiculos:    'menu-item-veiculos',
            assinatura:      'menu-item-assinatura',
            formasPagamento: 'menu-item-pagamento',
            notificacoes:    'menu-item-notificacoes',
            pontosNiveis:    'menu-item-pontos',
            indiqueGanhe:    'menu-item-indique',
            ajudaSuporte:    'menu-item-ajuda',
            configuracoes:   'menu-item-config',
          };
          data.itens.forEach(function(item) {
            var elId = mapaIds[item.id];
            if (!elId) return;
            var el = document.getElementById(elId);
            if (el) el.style.display = item.ativo ? '' : 'none';
          });
        })
        .catch(function() {});
    })();

    // Popup de boas-vindas: pedir dados cadastrais se perfil incompleto
    (function() {
      if (!currentUser || !currentUser.uid) return;
      var uid = currentUser.uid;
      var jaViu = localStorage.getItem('rp_dados_popup_' + uid);
      if (jaViu) return;
      var perfilExtra = {};
      try { perfilExtra = JSON.parse(localStorage.getItem('rp_perfil_extra_' + uid) || '{}'); } catch {}
      var cpfOk = (perfilExtra['cpf'] || '').replace(/\D/g,'').length === 11;
      if (cpfOk) return; // já tem dados, não mostrar
      // Marcar como visto para não mostrar toda vez
      localStorage.setItem('rp_dados_popup_' + uid, '1');
      setTimeout(function() { _mostrarPopupDadosCadastro(); }, 1800);
    })();
  })();

  // ── Popup de boas-vindas: completar cadastro ─────────────────────────────
  function _mostrarPopupDadosCadastro() {
    var overlay = document.createElement('div');
    overlay.id = 'popup-dados-cadastro';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:299999;background:rgba(0,0,0,0.65);display:flex;align-items:flex-end;justify-content:center;';
    var sheet = document.createElement('div');
    sheet.style.cssText = 'background:#fff;border-radius:24px 24px 0 0;padding:28px 20px 36px;width:100%;max-width:480px;box-shadow:0 -4px 32px rgba(0,0,0,0.22);';
    var handle = document.createElement('div');
    handle.style.cssText = 'width:40px;height:4px;background:#E0E0E0;border-radius:2px;margin:0 auto 20px;';
    var icone = document.createElement('div');
    icone.style.cssText = 'font-size:44px;text-align:center;margin-bottom:12px;';
    icone.textContent = '👋';
    var titulo = document.createElement('div');
    titulo.style.cssText = 'font-size:20px;font-weight:800;color:#1A1A1A;text-align:center;margin-bottom:8px;';
    titulo.textContent = 'Complete seu cadastro!';
    var subtit = document.createElement('div');
    subtit.style.cssText = 'font-size:14px;color:#757575;text-align:center;margin-bottom:22px;line-height:1.5;';
    subtit.textContent = 'Precisamos do seu CPF para gerar o PIX e outros dados para personalizar sua experiência.';
    var btnOk = document.createElement('button');
    btnOk.style.cssText = 'width:100%;padding:16px;background:#FF6D00;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:10px;';
    btnOk.textContent = '✏️ Preencher dados agora';
    btnOk.addEventListener('click', function() {
      overlay.remove();
      abrirMinhaConta(true);
    });
    var btnDepois = document.createElement('button');
    btnDepois.style.cssText = 'width:100%;padding:13px;background:transparent;color:#9E9E9E;border:none;font-size:14px;cursor:pointer;';
    btnDepois.textContent = 'Agora não';
    btnDepois.addEventListener('click', function() { overlay.remove(); });
    sheet.appendChild(handle);
    sheet.appendChild(icone);
    sheet.appendChild(titulo);
    sheet.appendChild(subtit);
    sheet.appendChild(btnOk);
    sheet.appendChild(btnDepois);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  // ── Geolocalização — chamada no init E quando mapa abre ──────────────────

  // ── GPS ─────────────────────────────────────────────────────────────────
  var _geoWatchId = null;
  var _geoGPSConfirmado = false; // true só após GPS real (não cache)

  function _mostrarOverlayGPS() {
    var mapEl = document.getElementById('map-leaflet');
    if (!mapEl || mapMain) return;
    // Só mostra se não tem overlay já
    if (document.getElementById('geo-loading-overlay')) return;
    mapEl.innerHTML = '<div id="geo-loading-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f5f5f5;z-index:999;">'
      + '<div style="width:44px;height:44px;border:4px solid #FF6D00;border-top-color:transparent;border-radius:50%;animation:spin360 0.8s linear infinite;margin-bottom:16px;"></div>'
      + '<div style="font-size:15px;color:#444;font-weight:700;">Obtendo sua localização…</div>'
      + '<div style="font-size:12px;color:#999;margin-top:6px;text-align:center;padding:0 20px;">Permita o acesso à localização quando solicitado</div>'
      + '</div>';
  }

  function _usarSPPadrao() {
    // Verificar se já temos cache GeoIP recente (<10 min) para não chamar API repetidamente
    var geoipTs = parseInt(localStorage.getItem('rp_geoip_ts') || '0');
    var geoipLat = parseFloat(localStorage.getItem('rp_geoip_lat') || '');
    var geoipLng = parseFloat(localStorage.getItem('rp_geoip_lng') || '');
    var geoipIdade = Date.now() - geoipTs;
    if (!isNaN(geoipLat) && !isNaN(geoipLng) && geoipIdade < 10 * 60 * 1000) {
      _aplicarLocalizacao(geoipLat, geoipLng, true, false);
      return;
    }

    // Antes de usar SP hardcoded, tentar localização por IP (mais preciso)
    console.warn('[GPS] GPS indisponível — tentando GeoIP como fallback...');
    fetch('/api/geoip')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.lat && d.lng && !d.fallback) {
          // Salvar cache GeoIP por 10 min (menos preciso que GPS, mas melhor que SP fixo)
          localStorage.setItem('rp_geoip_lat', String(d.lat));
          localStorage.setItem('rp_geoip_lng', String(d.lng));
          localStorage.setItem('rp_geoip_ts', String(Date.now()));
          _aplicarLocalizacao(d.lat, d.lng, true, false);
          // Mostrar toast informando qual cidade foi detectada
          var nomeLoc = d.cidade ? (d.cidade + (d.estado ? ' — ' + d.estado : '')) : 'sua região';
          showToast('📡 Localização aproximada: ' + nomeLoc, 4000);
        } else {
          console.warn('[GPS] GeoIP retornou fallback → usando SP padrão');
          _aplicarLocalizacao(-23.5505, -46.6333, true, false);
        }
      })
      .catch(function(e) {
        console.warn('[GPS] GeoIP falhou:', e, '→ usando SP padrão');
        _aplicarLocalizacao(-23.5505, -46.6333, true, false);
      });
  }

  function _forcarGPS() {
    // Limpar cache e buscar localização fresh via GPS nativo
    localStorage.removeItem('rp_lat');
    localStorage.removeItem('rp_lng');
    localStorage.removeItem('rp_loc_ts');
    _geoJaObtida = false;
    _geoGPSConfirmado = false;
    var btn = document.getElementById('btn-gps-float');
    if (btn) { btn.style.opacity = '0.5'; btn.disabled = true; }
    showToast('📍 Atualizando localização via GPS…', 2000);
    _gpsNativo(false);
    setTimeout(function() {
      if (btn) { btn.style.opacity = '1'; btn.disabled = false; }
    }, 5000);
  }

  function _haversineFast(la1, lo1, la2, lo2) {
    var R=6371, dLa=(la2-la1)*Math.PI/180, dLo=(lo2-lo1)*Math.PI/180;
    var a=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)*Math.sin(dLo/2);
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  function _ehCoordSP(lat, lng) {
    // Raio de 1 grau (~111km) em torno do centro de SP — qualquer coisa aqui é suspeita
    return !isNaN(lat) && !isNaN(lng)
      && Math.abs(lat - (-23.5505)) < 1.0
      && Math.abs(lng - (-46.6333)) < 1.0;
  }

  // ── Botão flutuante GPS ──────────────────────────────────────────────────────
  function _mostrarBotaoGPS(mensagem) {
    var old = document.getElementById('rp-gps-btn');
    if (old) old.remove();
    var btn = document.createElement('div');
    btn.id = 'rp-gps-btn';
    btn.innerHTML = \`
      <div onclick="_tentarGPSNovamente()" style="
        position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
        background:#FF6D00;color:#fff;border-radius:24px;padding:12px 20px;
        font-size:14px;font-weight:700;cursor:pointer;z-index:9999;
        box-shadow:0 4px 16px rgba(255,109,0,0.5);
        display:flex;align-items:center;gap:8px;white-space:nowrap;
        animation:rpGpsPulse 2s infinite">
        <span style="font-size:18px">📍</span>
        <span>\${mensagem}</span>
      </div>
      <style>
        @keyframes rpGpsPulse {
          0%,100%{box-shadow:0 4px 16px rgba(255,109,0,0.5)}
          50%{box-shadow:0 4px 24px rgba(255,109,0,0.9)}
        }
      </style>
    \`;
    document.body.appendChild(btn);
    // Auto-remover após 15s
    setTimeout(function() {
      var el = document.getElementById('rp-gps-btn');
      if (el) el.remove();
    }, 15000);
  }

  window._tentarGPSNovamente = function() {
    var old = document.getElementById('rp-gps-btn');
    if (old) old.remove();
    showToast('📍 Solicitando GPS...', 2000);
    _gpsNativo(false);
  };

  function _initLocalizacao() {
    // ── Limpar cache SP ──
    localStorage.removeItem('rp_geo_denied');
    localStorage.removeItem('rp_geoip_lat');
    localStorage.removeItem('rp_geoip_lng');
    localStorage.removeItem('rp_geoip_ts');
    var _cLat0 = parseFloat(localStorage.getItem('rp_lat') || '');
    var _cLng0 = parseFloat(localStorage.getItem('rp_lng') || '');
    if (_ehCoordSP(_cLat0, _cLng0)) {
      localStorage.removeItem('rp_lat');
      localStorage.removeItem('rp_lng');
      localStorage.removeItem('rp_loc_ts');
    }

    // ── Cache recente (<30min) fora de SP → abrir mapa já ──
    var cLat = parseFloat(localStorage.getItem('rp_lat') || '');
    var cLng = parseFloat(localStorage.getItem('rp_lng') || '');
    var cTs  = parseInt(localStorage.getItem('rp_loc_ts') || '0');
    var temCache = !isNaN(cLat) && !isNaN(cLng)
                   && !_ehCoordSP(cLat, cLng)
                   && (Date.now() - cTs) < 30 * 60 * 1000;
    if (temCache) {
      userLat = cLat; userLng = cLng;
      _geoJaObtida = true;
      initMapMain();
      _gpsNativo(true);
      return;
    }

    // ── Sem cache: ABRIR MAPA IMEDIATAMENTE + GPS em background ──
    // Não espera GPS — abre o mapa na posição que tiver e atualiza quando GPS chegar
    userLat = -20.3155; userLng = -40.3128; // ES como placeholder (Vitória)
    _geoJaObtida = true;
    initMapMain();
    _gpsNativo(false);
  }

  // ── GPS com suporte TWA ─────────────────────────────────────────────────────
  // silencioso=true: só atualiza marcador, não recarrega postos
  var _watchId = null; // ID do watchPosition ativo

  function _gpsNativo(silencioso) {
    if (!navigator.geolocation) {
      console.warn('[GPS] navigator.geolocation indisponível');
      if (!silencioso) _buscarLocalizacaoGoogle(null);
      return;
    }

    // ── PASSO 1: baixa precisão (WiFi/rede) — <2s ──
    navigator.geolocation.getCurrentPosition(
      function(pos1) {
        var acc1 = Math.round(pos1.coords.accuracy);
        var lat1 = pos1.coords.latitude, lng1 = pos1.coords.longitude;
        _aplicarLocalizacao(lat1, lng1, !silencioso, true);

        // ── PASSO 2: alta precisão (satélite) — refina quando pronto ──
        navigator.geolocation.getCurrentPosition(
          function(pos2) {
            var acc2 = Math.round(pos2.coords.accuracy);
            var lat2 = pos2.coords.latitude, lng2 = pos2.coords.longitude;
            _aplicarLocalizacao(lat2, lng2, false, true);
            showToast('📍 GPS: ' + acc2 + 'm', 2000);
          },
          function(e2) { console.warn('[GPS] Preciso erro: ' + e2.code); },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
      },
      function(err1) {
        console.warn('[GPS] Rápido erro: ' + err1.code);
        if (err1.code === 1) {
          // Permissão negada
          showToast('📍 Ative a localização nas configurações.', 7000);
          _mostrarBotaoGPS('Toque para ativar GPS');
          if (!silencioso) {
            _buscarLocalizacaoGoogle(function(lat, lng) {
              if (lat !== null) _aplicarLocalizacao(lat, lng, true, false);
            });
          }
        } else {
          // Timeout/indisponível: tentar direto com alta precisão
          navigator.geolocation.getCurrentPosition(
            function(pos) {
              _aplicarLocalizacao(pos.coords.latitude, pos.coords.longitude, !silencioso, true);
            },
            function(e) {
              console.warn('[GPS] Direto erro: ' + e.code);
              if (!silencioso) {
                _buscarLocalizacaoGoogle(function(lat, lng) {
                  if (lat !== null) _aplicarLocalizacao(lat, lng, true, false);
                });
              }
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
          );
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  // ── Fallback de localização via Google Geolocation API (server-side) ──────────
  // Envia WiFi + cell towers do dispositivo → servidor repassa para Google API
  // (chave fica segura no servidor, igual Uber/Google Maps)
  function _buscarLocalizacaoGoogle(callback) {
    // Coletar redes WiFi e torres de celular visíveis (Network Information API)
    var payload = {};

    // Network Information API — disponível em Android/Chrome
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      // Tentar coletar info de cell towers via connection (limitado no browser)
      if (conn.type === 'cellular' && conn.downlinkMax) {
        // Não temos acesso direto às cell towers no browser padrão,
        // mas podemos passar MCC/MNC se disponível
      }
    }

    // Chamar servidor com payload (pode ser vazio — servidor usa considerIpAddress como fallback)
    fetch('/api/geolocate-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d && d.lat && d.lng) {
        var lat = d.lat;
        var lng = d.lng;
        var acc = Math.round(d.accuracy || 9999);
        // Se retornar SP (fallback genérico do Google por IP) → ignorar
        if (_ehCoordSP(lat, lng)) {
          console.warn('[GPS] Google device retornou SP (acc=' + acc + 'm) — ignorando...');
          showToast('📡 Aguardando GPS do celular…', 3000);
          if (callback) callback(null, null);
          return;
        }
        console.log('[GPS] Google device: lat=' + lat + ' lng=' + lng + ' acc=' + acc + 'm fonte=' + (d.fonte||'?'));
        if (callback) { callback(lat, lng); }
        else { _aplicarLocalizacao(lat, lng, true, true); }
      } else {
        console.warn('[GPS] Google device sem resultado — fallback geoip');
        // Fallback para IP puro
        fetch('/api/geoip')
        .then(function(r2) { return r2.json(); })
        .then(function(d2) {
          if (d2 && d2.lat && d2.lng && !_ehCoordSP(d2.lat, d2.lng)) {
            if (callback) callback(d2.lat, d2.lng);
            else _aplicarLocalizacao(d2.lat, d2.lng, true, false);
          } else {
            if (callback) callback(null, null);
          }
        })
        .catch(function() { if (callback) callback(null, null); });
      }
    })
    .catch(function(e) {
      console.warn('[GPS] geolocate-device erro:', e);
      if (callback) callback(null, null);
    });
  }

  // lat, lng = coordenadas | recarregarPostos = buscar postos novamente | gpsReal = veio do GPS (não cache)
  function _aplicarLocalizacao(lat, lng, recarregarPostos, gpsReal) {
    _geoJaObtida = true;
    if (gpsReal) _geoGPSConfirmado = true;
    userLat = lat;
    userLng = lng;

    // Salvar cache só se GPS real E fora da região de SP
    var ehRegSP = _ehCoordSP(lat, lng);
    if (gpsReal && !ehRegSP) {
      localStorage.setItem('rp_lat', String(lat));
      localStorage.setItem('rp_lng', String(lng));
      localStorage.setItem('rp_loc_ts', String(Date.now()));
      localStorage.removeItem('rp_geoip_lat');
      localStorage.removeItem('rp_geoip_lng');
      localStorage.removeItem('rp_geoip_ts');
    } else if (ehRegSP) {
      // Recebeu SP — apagar cache para não persistir
      console.warn('[GPS] Coord SP recebida — NÃO salvando cache: lat=' + lat + ' lng=' + lng);
      localStorage.removeItem('rp_lat');
      localStorage.removeItem('rp_lng');
      localStorage.removeItem('rp_loc_ts');
    }

    // Remover overlay de loading
    var overlay = document.getElementById('geo-loading-overlay');
    if (overlay) overlay.remove();

    if (!mapMain) {
      initMapMain();
    } else {
      // Suavemente mover mapa para nova posição
      mapMain.setView([lat, lng], 14, { animate: true });
      // Atualizar marcador do usuário
      mapMain.eachLayer(function(l) {
        if (l._isUserMarker) { mapMain.removeLayer(l); }
      });
      var userIcon = L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#1565C0;border:3px solid white;box-shadow:0 0 0 6px rgba(21,101,192,0.2)"></div>',
        iconSize: [16,16], iconAnchor: [8,8]
      });
      var m = L.marker([lat, lng], { icon: userIcon }).addTo(mapMain);
      m._isUserMarker = true;
      if (recarregarPostos) loadPostos();
    }
  }
</script>
${getGamificacaoScripts()}
${getCupomQRScripts()}
</body>
</html>`;
}

// Helper para gerar itens do menu com ícones SVG
function buildMenuItem(icon: string, label: string, onclick: string): string {
  const icons: Record<string, string> = {
    person: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    car: '<rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    creditcard: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    bell: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
    gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>',
  };

  const svgPath = icons[icon] || icons.person;

  return `<div class="menu-item" onclick="${onclick}">
  <div class="menu-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${svgPath}</svg></div>
  <span class="menu-item-label">${label}</span>
  <div class="menu-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  GAMIFICAÇÃO — Pontos, Níveis e Recompensas
// ══════════════════════════════════════════════════════════════════════════════

export function getGamificacaoScripts(): string {
  return `
<script>
// ── Constantes de gamificação ───────────────────────────────────────────────
var GAMIF_PONTOS = {
  confirmar_preco:  5,
  atualizar_preco:  20,
  foto_totem:       30,
  comentar:         10,
  indicar_amigo:    50
};
var GAMIF_NIVEIS = [
  { min: 0,   max: 100, nome: 'Motorista Iniciante',   icone: '🚗', cor: '#9E9E9E' },
  { min: 101, max: 500, nome: 'Fiscal dos Postos',     icone: '🔍', cor: '#2196F3' },
  { min: 501, max: 999999, nome: 'Mestre do Combustível', icone: '🏆', cor: '#FF6D00' }
];

// ── Ler/gravar pontos no localStorage ──────────────────────────────────────
function _getGamifKey() {
  try {
    var user = JSON.parse(localStorage.getItem('rp_user') || 'null');
    return user && user.uid ? 'rp_gamif_' + user.uid : null;
  } catch { return null; }
}

function getPontosGamif() {
  var key = _getGamifKey();
  if (!key) return 0;
  return parseInt(localStorage.getItem(key + '_pontos') || '0', 10);
}

function getNivelGamif() {
  var pontos = getPontosGamif();
  for (var i = GAMIF_NIVEIS.length - 1; i >= 0; i--) {
    if (pontos >= GAMIF_NIVEIS[i].min) return GAMIF_NIVEIS[i];
  }
  return GAMIF_NIVEIS[0];
}

function getCodigoIndicacaoGamif() {
  var key = _getGamifKey();
  if (!key) return null;
  var cod = localStorage.getItem(key + '_codigo_indicacao');
  if (!cod) {
    try {
      var user = JSON.parse(localStorage.getItem('rp_user') || '{}');
      cod = 'RP' + (user.uid || '').slice(-4).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem(key + '_codigo_indicacao', cod);
    } catch { cod = 'RPDEMO'; }
  }
  return cod;
}

function adicionarPontosGamif(acao) {
  var key = _getGamifKey();
  if (!key) return;
  var pts = GAMIF_PONTOS[acao] || 0;
  if (!pts) return;
  var atual = getPontosGamif();
  var novo = atual + pts;
  localStorage.setItem(key + '_pontos', String(novo));

  // Log de ações
  var logKey = key + '_log';
  var log = [];
  try { log = JSON.parse(localStorage.getItem(logKey) || '[]'); } catch {}
  log.push({ acao: acao, pts: pts, total: novo, ts: Date.now() });
  localStorage.setItem(logKey, JSON.stringify(log.slice(-100)));

  // Verificar subida de nível
  var nivelAntes = _nivelParaPontos(atual);
  var nivelDepois = _nivelParaPontos(novo);
  if (nivelDepois > nivelAntes) {
    var info = GAMIF_NIVEIS[nivelDepois];
    setTimeout(function() {
      showToast(info.icone + ' Parabéns! Você é agora ' + info.nome + '!', 4000);
      // Se atingiu Mestre do Combustível (nível 2), liberar Premium 30 dias
      if (nivelDepois === 2) {
        _liberarPremiumGamif();
      }
    }, 800);
  }

  showToast('+' + pts + ' pontos! ' + GAMIF_PONTOS[acao] + ' pts ganhos.');
}

function _nivelParaPontos(pontos) {
  for (var i = GAMIF_NIVEIS.length - 1; i >= 0; i--) {
    if (pontos >= GAMIF_NIVEIS[i].min) return i;
  }
  return 0;
}

function _liberarPremiumGamif() {
  var key = _getGamifKey();
  if (!key) return;
  var expMs = Date.now() + 30 * 86400000; // 30 dias
  localStorage.setItem(key + '_premium_gamif_exp', String(expMs));
  localStorage.setItem('rp_assinatura_status', 'ativo');
  localStorage.setItem('rp_assinatura_via', 'gamificacao');
  setTimeout(function() {
    showToast('🎉 30 dias de Premium liberados! Obrigado por manter os preços atualizados!', 5000);
  }, 1500);
}

// ── UI do Painel de Gamificação ────────────────────────────────────────────
function abrirPainelGamificacao() {
  var pontos = getPontosGamif();
  var nivel = getNivelGamif();
  var proximo = GAMIF_NIVEIS[Math.min(_nivelParaPontos(pontos) + 1, GAMIF_NIVEIS.length - 1)];
  var pct = nivel.max === 999999 ? 100 : Math.min(100, Math.round(((pontos - nivel.min) / (nivel.max - nivel.min)) * 100));
  var codigo = getCodigoIndicacaoGamif();

  var key = _getGamifKey();
  var log = [];
  try { log = JSON.parse(localStorage.getItem((key || '') + '_log') || '[]').slice(-5).reverse(); } catch {}

  var logHtml = log.length ? log.map(function(l) {
    return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;">'
      + '<span style="font-size:13px;color:#555;">' + _nomeAcaoGamif(l.acao) + '</span>'
      + '<span style="font-size:13px;font-weight:700;color:#FF6D00;">+' + l.pts + ' pts</span>'
      + '</div>';
  }).join('') : '<p style="color:#aaa;font-size:13px;text-align:center;padding:16px 0;">Nenhuma ação registrada ainda</p>';

  var html = ''
    // Hero nível
    + '<div style="background:linear-gradient(135deg,#1A1A2E,#2d2d4e);border-radius:20px;padding:24px;margin-bottom:16px;text-align:center;">'
    + '<div style="font-size:48px;margin-bottom:8px;">' + nivel.icone + '</div>'
    + '<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px;">' + nivel.nome + '</div>'
    + '<div style="font-size:32px;font-weight:900;color:' + nivel.cor + ';margin:4px 0;">' + pontos + ' <span style="font-size:14px;color:rgba(255,255,255,0.6);">pontos</span></div>'
    + '</div>'
    // Barra de progresso
    + '<div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:12px;">'
    + '<div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:6px;">'
    + '<span>' + nivel.min + ' pts</span><span>' + (nivel.max === 999999 ? '∞' : nivel.max + ' pts') + '</span></div>'
    + '<div style="background:#f0f0f0;border-radius:8px;height:12px;">'
    + '<div style="width:' + pct + '%;height:100%;border-radius:8px;background:' + nivel.cor + ';transition:width .5s;"></div></div>'
    + (nivel.max !== 999999 ? '<div style="font-size:12px;color:#888;margin-top:6px;text-align:right;">Próximo: ' + proximo.nome + ' em ' + (proximo.min - pontos) + ' pts</div>' : '<div style="font-size:12px;color:#FF6D00;margin-top:6px;text-align:center;">🏆 Nível máximo atingido!</div>')
    + '</div>'
    // Como ganhar pontos
    + '<div style="background:#FFF8F0;border-radius:16px;padding:16px;margin-bottom:12px;">'
    + '<div style="font-size:14px;font-weight:700;color:#FF6D00;margin-bottom:12px;">⚡ Como ganhar pontos</div>'
    + '<div style="display:grid;gap:8px;">'
    + _itemPonto('✅ Confirmar preço no posto', 5)
    + _itemPonto('📝 Atualizar preço mudou', 20)
    + _itemPonto('📸 Enviar foto do totem', 30)
    + _itemPonto('💬 Avaliar/comentar posto', 10)
    + _itemPonto('👥 Indicar amigo', 50)
    + '</div></div>'
    // Código de indicação
    + '<div style="background:#F3F9FF;border-radius:16px;padding:16px;margin-bottom:12px;">'
    + '<div style="font-size:14px;font-weight:700;color:#1976D2;margin-bottom:8px;">👥 Seu Código de Indicação</div>'
    + '<div style="display:flex;align-items:center;gap:8px;">'
    + '<div style="flex:1;background:#fff;border:2px solid #1976D2;border-radius:12px;padding:12px;text-align:center;font-size:22px;font-weight:900;color:#1976D2;letter-spacing:4px;">' + codigo + '</div>'
    + '<button onclick="compartilharCodigoIndicacao(this.dataset.c)" data-c="' + codigo + '" style="background:#1976D2;color:#fff;border:none;border-radius:12px;padding:12px 16px;font-size:13px;font-weight:700;cursor:pointer;">Compartilhar</button>'
    + '</div>'
    + '<div style="font-size:12px;color:#888;margin-top:8px;">Ganhe 50 pontos por amigo que assinar o RotaPosto Premium!</div>'
    + '</div>'
    // Últimas ações
    + '<div style="background:#fff;border-radius:16px;padding:16px;">'
    + '<div style="font-size:14px;font-weight:700;color:#333;margin-bottom:12px;">📊 Últimas ações</div>'
    + logHtml
    + '</div>';

  // Usa o rp-subtela padrão — tela cheia, sem iframe
  if (typeof abrirTela === 'function') {
    abrirTela('Pontos & Níveis', html);
  }
}

function _itemPonto(label, pts) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;">'
    + '<span style="font-size:13px;color:#555;">' + label + '</span>'
    + '<span style="font-size:13px;font-weight:700;color:#FF6D00;background:#FFF0E0;border-radius:8px;padding:2px 8px;">+' + pts + '</span>'
    + '</div>';
}
function _nomeAcaoGamif(acao) {
  var nomes = { confirmar_preco:'Confirmou preço', atualizar_preco:'Atualizou preço', foto_totem:'Enviou foto do totem', comentar:'Comentou posto', indicar_amigo:'Indicou amigo' };
  return nomes[acao] || acao;
}

function compartilharCodigoIndicacao(codigo) {
  var texto = '⛽ Economize no combustível com o RotaPosto! Use meu código ' + codigo + ' e veja os melhores preços perto de você: https://rotaposto.com.br';
  if (navigator.share) {
    navigator.share({ title: 'RotaPosto', text: texto }).catch(function(){});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).then(function() { showToast('Código copiado!'); });
  } else {
    showToast('Compartilhe: ' + codigo);
  }
}
</script>`;
}

// ══════════════════════════════════════════════════════════════════════════════
//  CUPOM QR CODE — Geração pelo Usuário Premium
// ══════════════════════════════════════════════════════════════════════════════

export function getCupomQRScripts(): string {
  return `
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
var _cupomAtivo = null;
var _cupomTimer = null;

function abrirGerarCupom(postoId, nomePosto, combustivelSugerido) {
  // Verificar se é Premium
  var statusAssinatura = localStorage.getItem('rp_assinatura_status');
  var keyGamif = null;
  try {
    var u = JSON.parse(localStorage.getItem('rp_user') || 'null');
    if (u) keyGamif = 'rp_gamif_' + u.uid;
  } catch {}
  var premiumGamif = keyGamif ? parseInt(localStorage.getItem(keyGamif + '_premium_gamif_exp') || '0', 10) : 0;
  var isPremium = statusAssinatura === 'ativo' || (premiumGamif > Date.now());

  if (!isPremium) {
    // Mostrar tela de upgrade
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;';
    el.onclick = function(e) { if(e.target===this) this.remove(); };
    el.innerHTML = '<div style="background:#fff;border-radius:24px 24px 0 0;width:100%;padding:28px;text-align:center;">'
      + '<div style="font-size:40px;margin-bottom:12px;">🎟️</div>'
      + '<div style="font-size:18px;font-weight:800;color:#222;margin-bottom:8px;">Recurso Premium</div>'
      + '<div style="font-size:14px;color:#666;margin-bottom:20px;">Gere cupons de desconto em postos parceiros e economize até R$ 0,10/litro. Apenas assinantes Premium.</div>'
      + '<div style="background:#FFF8F0;border-radius:14px;padding:16px;margin-bottom:20px;">'
      + '<div style="font-size:13px;color:#FF6D00;font-weight:700;margin-bottom:8px;">💡 Ou ganhe de graça!</div>'
      + '<div style="font-size:13px;color:#555;">Acumule 501 pontos reportando preços e ganhe 30 dias Premium grátis.</div>'
      + '<button onclick="this.closest(' + String.fromCharCode(39) + '[style*=fixed]' + String.fromCharCode(39) + ').remove();abrirPainelGamificacao();" style="margin-top:12px;background:#FF6D00;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;">Ver meus pontos</button>'
      + '</div>'
      + '<button onclick="abrirModalAssinatura()" style="width:100%;padding:14px;background:#FF6D00;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">Assinar Premium — R$10/mês</button>'
      + '<button onclick="this.closest(' + String.fromCharCode(39) + '[style*=fixed]' + String.fromCharCode(39) + ').remove()" style="width:100%;padding:14px;background:#f5f5f5;border:none;border-radius:14px;font-size:14px;color:#555;cursor:pointer;">Cancelar</button>'
      + '</div>';
    document.body.appendChild(el);
    return;
  }

  var combustiveis = ['Gasolina Comum','Gasolina Aditivada','Etanol','Diesel S10','Diesel Comum','GNV'];
  var optsHtml = combustiveis.map(function(c) {
    return '<option value="' + c + '"' + (c === (combustivelSugerido||'Gasolina Comum') ? ' selected' : '') + '>' + c + '</option>';
  }).join('');

  var modal = document.createElement('div');
  modal.id = 'modal-gerar-cupom';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;';
  modal.onclick = function(e) { if(e.target===this) fecharModalCupom(); };
  modal.innerHTML = '<div style="background:#fff;border-radius:24px 24px 0 0;width:100%;padding:24px;max-height:90vh;overflow-y:auto;">'
    + '<div style="text-align:center;margin-bottom:20px;">'
    + '<div style="font-size:14px;font-weight:600;color:#888;">Gerar cupom em</div>'
    + '<div style="font-size:18px;font-weight:800;color:#222;">' + (nomePosto || 'Posto Parceiro') + '</div>'
    + '</div>'
    // Selecionar combustível
    + '<div style="margin-bottom:16px;">'
    + '<label style="font-size:13px;font-weight:600;color:#555;display:block;margin-bottom:6px;">⛽ Combustível</label>'
    + '<select id="cupom-combustivel" style="width:100%;padding:12px;border:2px solid #eee;border-radius:12px;font-size:15px;background:#fff;">' + optsHtml + '</select>'
    + '</div>'
    + '<div id="cupom-area" style="display:none;"></div>'
    + (function(){ var Q=String.fromCharCode(39); return '<button id="btn-gerar-cupom" onclick="gerarCupomPremium(' + Q + (postoId||'') + Q + ',' + Q + (nomePosto||'Posto Parceiro').replace(/'/g,Q) + Q + ')" '; }())
    + 'style="width:100%;padding:14px;background:#FF6D00;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">🎟️ Gerar Cupom de Desconto</button>'
    + '<button onclick="fecharModalCupom()" style="width:100%;padding:14px;background:#f5f5f5;border:none;border-radius:14px;font-size:14px;color:#555;cursor:pointer;">Cancelar</button>'
    + '</div>';
  document.body.appendChild(modal);
}

function fecharModalCupom() {
  if (_cupomTimer) { clearInterval(_cupomTimer); _cupomTimer = null; }
  var m = document.getElementById('modal-gerar-cupom');
  if (m) m.remove();
}

function gerarCupomPremium(postoId, nomePosto) {
  var comb = document.getElementById('cupom-combustivel');
  var combustivel = comb ? comb['value'] : 'Gasolina Comum';
  var user = null;
  try { user = JSON.parse(localStorage.getItem('rp_user') || 'null'); } catch {}

  var btn = document.getElementById('btn-gerar-cupom');
  if (btn) { btn['disabled'] = true; btn.textContent = 'Gerando...'; }

  fetch('/api/parceiros/cupons/gerar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: user ? user.uid : 'demo_' + Date.now(),
      nomeUsuario: user ? (user.displayName || user.email || 'Assinante') : 'Demo',
      postoId: postoId || 'demo',
      combustivel: combustivel
    })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.ok) {
      _cupomAtivo = data;
      mostrarCupomGerado(data, combustivel, nomePosto);
      // Conceder pontos por confirmar (usar o posto parceiro)
      adicionarPontosGamif('confirmar_preco');
    } else {
      if (btn) { btn['disabled'] = false; btn.textContent = '🎟️ Gerar Cupom de Desconto'; }
      showToast(data.erro || 'Erro ao gerar cupom');
    }
  }).catch(function() {
    // Modo offline: gerar cupom local
    var codigo = String(Math.floor(100000 + Math.random() * 900000));
    var hash = 'RP-DEMO-' + codigo;
    _cupomAtivo = { ok: true, codigo: codigo, hash: hash, combustivel: combustivel, expiracaoSegundos: 300, qrData: hash };
    mostrarCupomGerado(_cupomAtivo, combustivel, nomePosto);
    if (btn) { btn['disabled'] = false; }
  });
}

function mostrarCupomGerado(data, combustivel, nomePosto) {
  var area = document.getElementById('cupom-area');
  var btn = document.getElementById('btn-gerar-cupom');
  if (!area) return;
  if (btn) btn.style.display = 'none';
  var sel = document.getElementById('cupom-combustivel');
  if (sel) sel.parentElement.style.display = 'none';

  var secs = data.expiracaoSegundos || 300;
  area.style.display = 'block';
  area.innerHTML = '<div style="text-align:center;">'
    // QR Code
    + '<div id="qrcode-cupom" style="display:inline-block;padding:16px;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);margin-bottom:16px;"></div>'
    // Código numérico grande
    + '<div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#222;margin-bottom:8px;">' + data.codigo + '</div>'
    + '<div style="font-size:13px;color:#888;margin-bottom:16px;">⛽ ' + combustivel + ' • ' + (nomePosto || 'Posto Parceiro') + '</div>'
    // Timer
    + '<div id="cupom-timer" style="display:inline-flex;align-items:center;gap:8px;background:#FFF0E0;border-radius:12px;padding:8px 16px;margin-bottom:20px;">'
    + '<span style="font-size:20px;">⏱️</span>'
    + '<span id="cupom-timer-text" style="font-size:18px;font-weight:800;color:#FF6D00;">' + _formatarTempoTimer(secs) + '</span>'
    + '<span style="font-size:13px;color:#888;">restantes</span></div>'
    // Instruções
    + '<div style="background:#F0FFF4;border-radius:12px;padding:14px;margin-bottom:16px;text-align:left;">'
    + '<div style="font-size:13px;font-weight:700;color:#2E7D32;margin-bottom:6px;">✅ Como usar:</div>'
    + '<div style="font-size:13px;color:#555;line-height:1.6;">'
    + '1. Mostre o QR Code ou código para o frentista/caixa<br>'
    + '2. O funcionário confirma no sistema do posto<br>'
    + '3. Receba o desconto aplicado automaticamente na bomba'
    + '</div></div>'
    + '</div>';

  // Gerar QR Code
  setTimeout(function() {
    var qrEl = document.getElementById('qrcode-cupom');
    if (qrEl && window['QRCode']) {
      new window['QRCode'](qrEl, { text: data.qrData || data.codigo, width: 160, height: 160, colorDark: '#222', colorLight: '#ffffff' });
    }
  }, 100);

  // Iniciar timer countdown
  var remaining = secs;
  if (_cupomTimer) clearInterval(_cupomTimer);
  _cupomTimer = setInterval(function() {
    remaining--;
    var timerEl = document.getElementById('cupom-timer-text');
    if (timerEl) timerEl.textContent = _formatarTempoTimer(remaining);
    if (remaining <= 60) {
      var timerBox = document.getElementById('cupom-timer');
      if (timerBox) timerBox.style.background = '#FFEBEE';
      if (timerEl) timerEl.style.color = '#D32F2F';
    }
    if (remaining <= 0) {
      clearInterval(_cupomTimer);
      _cupomTimer = null;
      if (area) area.innerHTML = '<div style="text-align:center;padding:20px;">'
        + '<div style="font-size:48px;margin-bottom:8px;">⏰</div>'
        + '<div style="font-size:16px;font-weight:700;color:#D32F2F;">Cupom expirado</div>'
        + '<div style="font-size:13px;color:#888;margin-top:8px;">Gere um novo cupom antes de abastecer.</div>'
        + '<button onclick="fecharModalCupom()" style="margin-top:16px;background:#FF6D00;color:#fff;border:none;border-radius:12px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;">Fechar</button>'
        + '</div>';
    }
  }, 1000);
}

function _formatarTempoTimer(secs) {
  var m = Math.floor(Math.max(0, secs) / 60);
  var s = Math.max(0, secs) % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// ── Integrar pontos quando usuário envia preço ──────────────────────────────
// Interceptar a função enviarPrecoReal para adicionar pontos
(function() {
  var _enviarPrecoRealOriginal = window['enviarPrecoReal'];
  if (typeof _enviarPrecoRealOriginal === 'function') {
    window['enviarPrecoReal'] = function(idx) {
      _enviarPrecoRealOriginal(idx);
      adicionarPontosGamif('atualizar_preco');
    };
  }
})();
</script>`;
}

