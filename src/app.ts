// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – App Principal (Telas 7-12)
//  Design pixel-perfect conforme referências do usuário
//  Tema: BRANCO com laranja #FF6D00, mapa claro
// ═══════════════════════════════════════════════════════════════════════

export function getAppHTML(firebaseScripts: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
  <meta name="theme-color" content="#FFFFFF"/>
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  ${firebaseScripts}
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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
      width: 42px; height: 42px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: none; border: 1px solid var(--border);
      border-radius: 10px; cursor: pointer; color: var(--gray-dark);
    }

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
      flex: 1; overflow: hidden; position: relative;
    }

    .view { display: none; width: 100%; height: 100%; position: absolute; inset: 0; }
    .view.active { display: flex; flex-direction: column; }

    /* ══════════════════════════════════════════════
       TELA 7: MAPA
    ══════════════════════════════════════════════ */
    #view-mapa {
      position: relative;
    }

    #map-leaflet {
      flex: 1; width: 100%;
      min-height: 0;
    }

    /* Card inferior: Melhor posto próximo */
    #map-card {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: var(--white);
      border-radius: var(--radius) var(--radius) 0 0;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.12);
      padding: 16px 20px calc(var(--sab) + 16px);
      z-index: 500;
    }

    .map-card-label {
      font-size: 12px; font-weight: 600;
      color: var(--gray); margin-bottom: 10px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .btn-close-card {
      width: 28px; height: 28px;
      background: var(--gray-bg); border: none; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--gray);
    }

    .map-posto-row {
      display: flex; align-items: center; gap: 14px;
    }

    .posto-logo-circle {
      width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; flex-shrink: 0;
      border: 2px solid var(--border);
      overflow: hidden; background: var(--white);
    }
    .posto-logo-circle img {
      width: 100%; height: 100%; object-fit: contain;
    }

    .map-posto-info { flex: 1; min-width: 0; }
    .map-posto-nome {
      font-size: 16px; font-weight: 800; color: var(--black);
      margin-bottom: 4px;
    }
    .map-posto-preco {
      font-size: 22px; font-weight: 900; color: var(--orange);
      margin-bottom: 2px;
    }
    .map-posto-dist {
      font-size: 13px; color: var(--gray); font-weight: 500;
    }

    .btn-ir-ata-la {
      padding: 12px 20px;
      background: var(--orange); border: none; border-radius: 12px;
      color: var(--white); font-family: 'Inter', sans-serif;
      font-size: 15px; font-weight: 700;
      cursor: pointer; flex-shrink: 0;
      transition: opacity 0.2s;
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
      overflow-y: auto;
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
      font-size: 15px; font-weight: 700; color: var(--black);
      margin-bottom: 4px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
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
      font-size: 17px; font-weight: 800; color: var(--black);
      white-space: nowrap;
    }
    .posto-item-preco .preco-unit {
      font-size: 12px; font-weight: 500; color: var(--gray);
    }
    .posto-item-preco .dist-txt {
      font-size: 12px; color: var(--gray);
      margin-top: 3px;
    }
    .posto-item-preco .preco-estimado {
      color: #999;
    }

    /* ══════════════════════════════════════════════
       TELA 9: DETALHES DO POSTO
    ══════════════════════════════════════════════ */
    #view-detalhes {
      overflow-y: auto;
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
      padding: 36px 20px 20px;
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
      overflow-y: auto;
    }

    #plan-header {
      display: flex; align-items: center; gap: 14px;
      padding: calc(var(--sat) + 16px) 20px 16px;
      border-bottom: 1px solid var(--border);
    }
    #plan-title {
      font-size: 18px; font-weight: 800; color: var(--black);
    }
    .btn-back-plan {
      width: 38px; height: 38px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer; color: var(--black);
    }

    #plan-body { padding: 20px; }

    /* Campos de rota */
    .route-fields {
      background: var(--gray-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden; margin-bottom: 16px;
    }
    .route-field {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px;
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
      cursor: pointer; transition: opacity 0.2s;
    }
    .btn-iniciar-nav:active { opacity: 0.85; }

    /* ══════════════════════════════════════════════
       TELA 11: RELATÓRIOS
    ══════════════════════════════════════════════ */
    #view-relatorios {
      overflow-y: auto; background: var(--white);
    }

    #rel-header {
      padding: calc(var(--sat) + 20px) 20px 0;
      text-align: center;
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
    #view-perfil {
      overflow-y: auto;
      background: var(--gray-bg);
    }

    /* Header dark perfil */
    #perfil-header {
      background: #1A1A2E;
      padding: calc(var(--sat) + 28px) 20px 28px;
      display: flex; align-items: center; gap: 16px;
    }

    #perfil-avatar {
      width: 72px; height: 72px; border-radius: 50%;
      object-fit: cover; flex-shrink: 0;
      background: #333;
      border: 3px solid rgba(255,255,255,0.2);
    }

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
      position: relative; z-index: 300;
      flex-shrink: 0;
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
    .nav-item.active { color: var(--orange); }

    /* ══════════════════════════════════════════════
       UTILITÁRIOS
    ══════════════════════════════════════════════ */
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
    #modal-assinatura { animation: fadeInModal 0.25s ease; }
    @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
    #assin-sheet { animation: slideUpSheet 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    @keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
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
      <button class="btn-filter" onclick="showToast('Filtros em breve')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
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
      <div id="map-card">
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
          <button class="btn-ir-ata-la" onclick="irAteLa()">Ir até lá</button>
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
          <button class="btn-ir-la" onclick="irAteLa()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Ir até lá
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
            <div class="route-field-content">
              <div class="route-field-label">De</div>
              <div class="route-field-val" id="plan-origin">Minha localização</div>
            </div>
            <button class="btn-target" onclick="showToast('Usar localização atual')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="1"/><line x1="12" y1="23" x2="12" y2="21"/><line x1="3" y1="12" x2="1" y2="12"/><line x1="23" y1="12" x2="21" y2="12"/></svg>
            </button>
          </div>
          <div class="route-field">
            <div class="route-dot-dest"></div>
            <div class="route-field-content">
              <div class="route-field-label">Para</div>
              <div class="route-field-val" id="plan-dest">Posto Shell</div>
            </div>
            <button class="btn-target" onclick="showToast('Alterar destino')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="1"/><line x1="12" y1="23" x2="12" y2="21"/><line x1="3" y1="12" x2="1" y2="12"/><line x1="23" y1="12" x2="21" y2="12"/></svg>
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="route-stats-badge">
          <div class="route-stats-label">Melhor rota</div>
          <div class="route-stats-vals">
            <div class="route-stat" id="plan-dist">1,2 km</div>
            <div class="route-stat-sep"></div>
            <div class="route-stat" id="plan-time">3 min</div>
          </div>
        </div>

        <!-- Mapa rota -->
        <div id="plan-map"></div>

        <!-- Card posto -->
        <div class="plan-posto-card">
          <div class="plan-posto-logo" id="plan-logo">🐚</div>
          <div class="plan-posto-info">
            <div class="plan-posto-nome" id="plan-nome">Posto Shell</div>
            <div class="plan-posto-end" id="plan-end">Av. Rebouças, 1234 – Pinheiros</div>
          </div>
          <div>
            <div class="plan-posto-preco" id="plan-preco">R$ 5,67<span class="plan-preco-unit">/L</span></div>
          </div>
        </div>

        <button class="btn-iniciar-nav" onclick="iniciarNavegacao()">Iniciar navegação</button>
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

    <!-- TELA 12: PERFIL -->
    <div id="view-perfil" class="view">
      <div id="perfil-header">
        <img id="perfil-avatar" src="https://i.pravatar.cc/150?u=joao" alt="Foto perfil"/>
        <div id="perfil-info">
          <div id="perfil-ola">Olá, <span id="perfil-nome">João</span>!</div>
          <div id="perfil-badge-premium" class="badge-premium" style="display:none;">👑 Premium</div>
          <div id="perfil-plano-status" style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:2px;">Conta gratuita</div>
        </div>
      </div>

      <div id="perfil-menu-list">
        ${buildMenuItem('person', 'Minha conta', "abrirMinhaConta()")}
        ${buildMenuItem('car', 'Meus veículos', "abrirMeusVeiculos()")}
        ${buildMenuItem('card', 'Assinatura', "goToAssinatura()")}
        ${buildMenuItem('creditcard', 'Formas de pagamento', "abrirFormasPagamento()")}
        ${buildMenuItem('bell', 'Notificações', "abrirNotificacoes()")}
        ${buildMenuItem('gift', 'Indique e ganhe', "abrirIndiqueGanhe()")}
        ${buildMenuItem('help', 'Ajuda e suporte', "abrirAjuda()")}
        ${buildMenuItem('settings', 'Configurações', "abrirConfiguracoes()")}
        <div id="menu-item-instalar" style="display:none;">${buildMenuItem('download', 'Instalar app', "instalarOuMostrarPWA()")}</div>
        <div class="menu-item menu-item-sair" onclick="doLogout()">
          <div class="menu-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </div>
          <span class="menu-item-label">Sair</span>
        </div>
      </div>
    </div>

  </div><!-- #app-content -->

  <!-- ══════════════════════════════════
       BOTTOM NAV
  ══════════════════════════════════ -->
  <nav id="bottom-nav">
    <button class="nav-item" id="nav-melhor" onclick="goToView('mapa')">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      Melhor
    </button>
    <button class="nav-item" id="nav-lista" onclick="goToView('lista')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      Lista
    </button>
    <button class="nav-item" id="nav-mapa" onclick="goToView('mapa')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
      Mapa
    </button>
    <button class="nav-item" id="nav-planejar" onclick="goToView('planejar')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      Planejar
    </button>
    <button class="nav-item" id="nav-perfil" onclick="goToView('perfil')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      Perfil
    </button>
  </nav>

  <!-- Utilitários -->
  <div id="app-toast"></div>
  <div id="app-loading"><div class="app-spinner"></div></div>

  <!-- ══ MODAL ASSINATURA PIX ══ -->
  <div id="modal-assinatura" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);overflow-y:auto;">
    <div style="min-height:100%;display:flex;align-items:flex-end;justify-content:center;padding-top:60px;">
      <div id="assin-sheet" style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;padding:0 0 40px;position:relative;">

        <!-- Handle bar -->
        <div style="display:flex;justify-content:center;padding:12px 0 0;">
          <div style="width:40px;height:4px;background:#E0E0E0;border-radius:2px;"></div>
        </div>

        <!-- Fechar -->
        <button onclick="fecharAssinatura()" style="position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;padding:8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <!-- Step 1: Escolher plano -->
        <div id="assin-step1">
          <div style="padding:20px 24px 0;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
              <div style="width:40px;height:40px;background:#FFF3E0;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">👑</div>
              <div>
                <h2 style="font-size:18px;font-weight:700;color:#1A1A1A;margin:0;">RotaPosto Premium</h2>
                <p style="font-size:13px;color:#757575;margin:0;">Assine e economize muito mais!</p>
              </div>
            </div>

            <!-- Features -->
            <div style="background:#F8F9FA;border-radius:16px;padding:16px;margin:16px 0;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
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
            <button onclick="iniciarPagamentoPIX()" style="width:100%;padding:16px;background:#FF6D00;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;">
              <svg width="22" height="22" viewBox="0 0 512 512" fill="currentColor"><path d="M242.4 292.5C247.8 287.1 255.1 284.1 262.5 284.1C269.9 284.1 277.2 287.1 282.6 292.5L350.2 360.1C355.6 365.5 358.7 372.8 358.7 380.2C358.7 387.6 355.6 394.9 350.2 400.3L282.6 467.9C277.2 473.3 269.9 476.4 262.5 476.4C255.1 476.4 247.8 473.3 242.4 467.9L174.8 400.3C169.4 394.9 166.3 387.6 166.3 380.2C166.3 372.8 169.4 365.5 174.8 360.1L242.4 292.5zM374.7 111.7C380.1 106.3 387.4 103.2 394.8 103.2C402.2 103.2 409.5 106.3 414.9 111.7L482.5 179.3C487.9 184.7 491 192 491 199.4C491 206.8 487.9 214.1 482.5 219.5L414.9 287.1C409.5 292.5 402.2 295.6 394.8 295.6C387.4 295.6 380.1 292.5 374.7 287.1L307.1 219.5C301.7 214.1 298.6 206.8 298.6 199.4C298.6 192 301.7 184.7 307.1 179.3L374.7 111.7zM110.1 111.7C115.5 106.3 122.8 103.2 130.2 103.2C137.6 103.2 144.9 106.3 150.3 111.7L217.9 179.3C223.3 184.7 226.4 192 226.4 199.4C226.4 206.8 223.3 214.1 217.9 219.5L150.3 287.1C144.9 292.5 137.6 295.6 130.2 295.6C122.8 295.6 115.5 292.5 110.1 287.1L42.5 219.5C37.1 214.1 34 206.8 34 199.4C34 192 37.1 184.7 42.5 179.3L110.1 111.7z"/></svg>
              Pagar com PIX
            </button>
            <p style="text-align:center;font-size:11px;color:#9E9E9E;margin-top:10px;">
              Pagamento 100% seguro • Cancele quando quiser
            </p>
          </div>
        </div>

        <!-- Step 2: QR Code PIX -->
        <div id="assin-step2" style="display:none;padding:20px 24px;">
          <h2 style="font-size:18px;font-weight:700;color:#1A1A1A;text-align:center;margin:0 0 4px;">Pague com PIX</h2>
          <p id="assin-step2-desc" style="text-align:center;font-size:13px;color:#757575;margin:0 0 20px;">Escaneie o QR Code para ativar o Premium</p>

          <!-- QR Code -->
          <div style="display:flex;justify-content:center;margin-bottom:16px;">
            <div style="background:#fff;border:2px solid #E0E0E0;border-radius:20px;padding:16px;">
              <img id="assin-qr-img" src="" alt="QR Code PIX" style="width:200px;height:200px;display:block;" />
            </div>
          </div>

          <!-- Valor destaque -->
          <div style="text-align:center;margin-bottom:16px;">
            <span id="assin-valor-label" style="font-size:28px;font-weight:800;color:#FF6D00;"></span>
            <span id="assin-ciclo-label" style="font-size:14px;color:#757575;"></span>
          </div>

          <!-- Copiar código -->
          <div style="background:#F5F5F5;border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:8px;">
            <span id="assin-brcode-txt" style="font-size:11px;color:#424242;word-break:break-all;flex:1;font-family:monospace;max-height:44px;overflow:hidden;"></span>
            <button onclick="copiarCodigo()" style="background:#FF6D00;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;">
              Copiar
            </button>
          </div>

          <!-- Status -->
          <div id="assin-status-box" style="background:#FFF3E0;border:1px solid #FFB300;border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
            <div id="assin-status-dot" style="width:10px;height:10px;border-radius:50%;background:#FFB300;flex-shrink:0;animation:pulse-dot 1.5s infinite;"></div>
            <span id="assin-status-txt" style="font-size:13px;color:#E65100;font-weight:600;">Aguardando pagamento...</span>
          </div>

          <!-- Instrucoes -->
          <div style="font-size:12px;color:#757575;line-height:1.6;margin-bottom:16px;">
            <b style="color:#1A1A1A;">Como pagar:</b><br/>
            1. Abra seu app de banco<br/>
            2. Vá em Pix > Pagar com QR Code ou Copia e Cola<br/>
            3. Confirme o pagamento<br/>
            4. Seu Premium é ativado automaticamente!
          </div>

          <!-- Botão voltar -->
          <button onclick="voltarStep1()" style="width:100%;padding:14px;background:#F5F5F5;color:#757575;border:none;border-radius:16px;font-size:14px;font-weight:600;cursor:pointer;">
            Escolher outro plano
          </button>
        </div>

        <!-- Step 3: Ativado! -->
        <div id="assin-step3" style="display:none;padding:32px 24px;text-align:center;">
          <div style="width:80px;height:80px;background:#E8F5E9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;margin:0 auto 20px;">🎉</div>
          <h2 style="font-size:22px;font-weight:800;color:#1A1A1A;margin:0 0 8px;">Premium ativado!</h2>
          <p style="font-size:14px;color:#757575;margin:0 0 24px;">Bem-vindo ao RotaPosto Premium!<br/>Aproveite todos os benefícios.</p>
          <div id="assin-expira-label" style="background:#F1F8E9;border-radius:12px;padding:12px;margin-bottom:24px;font-size:13px;color:#558B2F;font-weight:600;"></div>
          <button onclick="fecharAssinatura()" style="width:100%;padding:16px;background:#FF6D00;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;">
            Aproveitar o Premium!
          </button>
        </div>

      </div>
    </div>
  </div>
  <!-- /MODAL ASSINATURA -->

</div><!-- #app-root -->

<script>
  // ══════════════════════════════════════════════════════
  //  ESTADO
  // ══════════════════════════════════════════════════════
  let currentView = 'mapa';
  let mapMain = null, mapPlan = null;
  let userLat = -23.5505, userLng = -46.6333;
  let postosData = [];
  let selectedFuel = 'gasolina';
  let selectedPosto = null;
  let currentMonthIdx = 4; // Maio 2024
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // ── Usuário logado ──
  const userStr = localStorage.getItem('rp_user');
  let currentUser = null;
  try { currentUser = userStr ? JSON.parse(userStr) : null; } catch {}

  // ══════════════════════════════════════════════════════
  //  NAVEGAÇÃO
  // ══════════════════════════════════════════════════════
  function goToView(viewId) {
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

    // Bottom nav: atualizar ativo
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const navMap = { mapa: 'mapa', lista: 'lista', planejar: 'planejar', relatorios: 'perfil', perfil: 'perfil', detalhes: 'lista' };
    const navId = navMap[viewId] || viewId;
    const navBtn = document.getElementById('nav-' + navId);
    if (navBtn) navBtn.classList.add('active');

    // Melhor → mapa com nav melhor
    if (viewId === 'mapa') {
      document.getElementById('nav-melhor').classList.add('active');
      document.getElementById('nav-mapa').classList.remove('active');
    }

    currentView = viewId;

    // Init mapa quando necessário
    if (viewId === 'mapa' && !mapMain) initMapMain();
    if (viewId === 'planejar' && !mapPlan) initMapPlan();
    if (viewId === 'lista') renderLista();
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

    // Ponto do usuário
    const userIcon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#1565C0;border:3px solid white;box-shadow:0 0 0 6px rgba(21,101,192,0.2)"></div>',
      iconSize: [16, 16], iconAnchor: [8, 8]
    });
    L.marker([userLat, userLng], { icon: userIcon }).addTo(mapMain);

    // Carregar postos
    loadPostos();
  }

  async function loadPostos() {
    try {
      const url = '/api/postos?lat='+userLat+'&lng='+userLng+'&raio=5&combustivel='+selectedFuel+'&litros=50&consumo=12';
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.postos && data.postos.length > 0) {
        postosData = data.postos;
        addMapMarkers();
        updateMapCard(data.postos[0]);
      }
    } catch(e) {
      // Dados demo
      postosData = getDemoPostos();
      addMapMarkers();
      updateMapCard(postosData[0]);
    }
  }

  function addMapMarkers() {
    if (!mapMain) return;
    // Limpar marcadores antigos
    mapMain.eachLayer(layer => {
      if (layer._isBalloon) mapMain.removeLayer(layer);
    });

    postosData.slice(0, 8).forEach((p, i) => {
      const preco = p.preco || p.precos?.[selectedFuel];
      if (!preco) return;

      const precoFmt = 'R$ ' + preco.toFixed(2).replace('.', ',');
      const cor = i === 0 ? '#00A651' : (preco > 6.5 ? '#E53935' : '#FF6D00');

      const icon = L.divIcon({
        className: '',
        html: '<div style="padding:5px 10px;border-radius:6px;background:'+cor+';color:white;font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.25);white-space:nowrap;font-family:Inter,sans-serif">'+precoFmt+'</div>',
        iconSize: [80, 30], iconAnchor: [40, 30]
      });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(mapMain);
      marker._isBalloon = true;
      marker.on('click', () => {
        updateMapCard(p);
        selectedPosto = p;
      });
    });
  }

  function updateMapCard(p) {
    selectedPosto = p;
    const preco = p.preco || p.precos?.[selectedFuel];
    const precoFmt = preco ? 'R$ ' + preco.toFixed(2).replace('.', ',') + ' /L' : '-';
    const dist = p.distancia ? p.distancia.toFixed(1) + ' km' : '-';
    const tempo = p.distancia ? Math.round(p.distancia * 3) + ' min' : '-';

    document.getElementById('map-card-logo').textContent = getEmoji(p.bandeira || p.nome);
    document.getElementById('map-card-nome').textContent = p.nome;
    document.getElementById('map-card-preco').textContent = precoFmt;
    document.getElementById('map-card-dist').textContent = dist + ' • ' + tempo;
    document.getElementById('map-card').style.display = 'block';
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

    // Marcador origem (vermelho)
    const originIcon = L.divIcon({
      className: '',
      html: '<svg width="28" height="36" viewBox="0 0 28 36" fill="none"><path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="#E53935"/><circle cx="14" cy="14" r="6" fill="white"/></svg>',
      iconSize: [28, 36], iconAnchor: [14, 36]
    });
    L.marker([userLat, userLng], { icon: originIcon }).addTo(mapPlan);

    // Marcador destino (verde)
    const destIcon = L.divIcon({
      className: '',
      html: '<svg width="28" height="36" viewBox="0 0 28 36" fill="none"><path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="#00A651"/><circle cx="14" cy="14" r="6" fill="white"/></svg>',
      iconSize: [28, 36], iconAnchor: [14, 36]
    });
    L.marker([destLat, destLng], { icon: destIcon }).addTo(mapPlan);

    // Linha de rota azul
    const routeLine = L.polyline([[userLat, userLng], [destLat, destLng]], {
      color: '#1565C0', weight: 4, dashArray: '8, 4', opacity: 0.8
    }).addTo(mapPlan);

    mapPlan.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

    // Atualizar info do card
    if (dest) {
      const preco = dest.preco || dest.precos?.[selectedFuel];
      document.getElementById('plan-logo').textContent = getEmoji(dest.bandeira || dest.nome);
      document.getElementById('plan-nome').textContent = dest.nome;
      document.getElementById('plan-end').textContent = dest.endereco || dest.nome;
      document.getElementById('plan-preco').innerHTML = preco
        ? 'R$ ' + preco.toFixed(2).replace('.', ',') + '<span class="plan-preco-unit">/L</span>'
        : '-';
      const dist = dest.distancia ? dest.distancia.toFixed(1) : '1,2';
      const tempo = dest.distancia ? Math.round(dest.distancia * 3) : 3;
      document.getElementById('plan-dist').textContent = dist.replace('.',',') + ' km';
      document.getElementById('plan-time').textContent = tempo + ' min';
    }
  }

  // ══════════════════════════════════════════════════════
  //  LISTA DE POSTOS (Tela 8)
  // ══════════════════════════════════════════════════════
  function renderLista() {
    const container = document.getElementById('lista-postos');
    const empty = document.getElementById('lista-empty');
    const postos = postosData.length > 0 ? postosData : getDemoPostos();

    if (postos.length === 0) { empty.style.display = 'block'; container.innerHTML = ''; return; }
    empty.style.display = 'none';

    // ── Detectar preços iguais (média ANP municipal) ──
    const amostra = postos.slice(0, 5);
    const precos5 = amostra.map(p => p.preco || p.precos?.[selectedFuel]).filter(v => v > 0);
    const todosIguais = precos5.length > 1 && precos5.every(v => Math.abs(v - precos5[0]) < 0.01);
    const temFonteANP = postos.some(p => p.fontePreco && p.fontePreco !== 'colaborativo');

    // Banner aviso ANP municipal (quando todos os preços são iguais)
    let avisoANP = '';
    if (todosIguais || temFonteANP) {
      avisoANP = '<div style="margin:0 0 10px;padding:10px 14px;background:#FFF8E1;border-radius:12px;border-left:3px solid #FFA000;display:flex;align-items:flex-start;gap:8px;">'
        + '<span style="font-size:16px;margin-top:1px;">📊</span>'
        + '<div style="font-size:12px;color:#7A5200;line-height:1.5;">'
        + '<b>Preços estimados pela ANP</b><br/>'
        + 'Os valores são médias municipais. Podem variar por posto. '
        + '<span style="color:#FF6D00;font-weight:600;cursor:pointer;" onclick="reportarPrecoProximo()">Sabe o preço real? Informe!</span>'
        + '</div>'
        + '</div>';
    }

    const cards = postos.slice(0, 15).map((p, i) => {
      const preco = p.preco || p.precos?.[selectedFuel];
      const precoFmt = preco ? 'R$ ' + preco.toFixed(2).replace('.', ',') : '-';
      const dist = p.distancia ? p.distancia.toFixed(1).replace('.',',') + ' km' : '-';
      const tempo = p.distancia ? Math.round(p.distancia * 3) + ' min' : '-';
      const rating = (4.0 + Math.random() * 0.9).toFixed(1);
      const emoji = getEmoji(p.bandeira || p.nome);
      const isBest = i === 0;
      // Badge fonte do preço
      const isColaborativo = p.fontePreco === 'colaborativo';
      const badgeFonte = isColaborativo
        ? '<span style="font-size:10px;color:#00A651;font-weight:600;">👥 Colaborativo</span>'
        : '<span style="font-size:10px;color:#999;">📊 ANP</span>';

      return '<div class="posto-item" onclick="openDetalhes(' + i + ')">'
        + '<div class="posto-brand-logo">' + emoji + '</div>'
        + '<div class="posto-item-info">'
        +   '<div class="posto-item-nome">' + p.nome + '</div>'
        +   '<div class="posto-item-rating">'
        +     '<span class="star-icon">★</span>'
        +     '<span class="rating-val">' + rating + '</span>'
        +     (isBest ? '<div class="green-dot"></div>' : '')
        +     '&nbsp;' + badgeFonte
        +   '</div>'
        + '</div>'
        + '<div class="posto-item-preco">'
        +   '<div class="preco-val' + (todosIguais && !isColaborativo ? ' preco-estimado' : '') + '">' + precoFmt + '<span class="preco-unit">/L</span></div>'
        +   '<div class="dist-txt">' + dist + ' • ' + tempo + '</div>'
        + '</div>'
        + '</div>';
    }).join('');

    container.innerHTML = avisoANP + cards;
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

  function enviarPrecoReal() {
    const inp = document.getElementById('inp-preco-real') as HTMLInputElement;
    const val = parseFloat(inp ? inp.value : '0');
    if (!val || val < 2 || val > 15) { showToast('Informe um preço válido (ex: 5.89)'); return; }
    const p = postosData[0];
    if (!p) { fecharModal(); return; }
    // Chamar API de reporte colaborativo
    fetch('/api/precos/reportar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postoId: p.id, postoNome: p.nome, combustivel: selectedFuel, preco: val, lat: userLat, lng: userLng, ts: Date.now() })
    }).then(r => r.json()).then(() => {
      fecharModal();
      showToast('Preço enviado! Obrigado 🙌');
    }).catch(() => {
      fecharModal();
      showToast('Preço enviado! Obrigado 🙌');
    });
  }

  function openDetalhes(idx) {
    const p = postosData[idx] || getDemoPostos()[idx];
    if (!p) return;
    selectedPosto = p;

    const preco = p.preco || p.precos?.[selectedFuel];

    document.getElementById('det-logo-badge').textContent = getEmoji(p.bandeira || p.nome);
    document.getElementById('det-nome').textContent = p.nome;
    document.getElementById('det-endereco').textContent = (p.endereco || '') + (p.bairro ? ' - ' + p.bairro : '') + ', ' + (p.cidade || '') + (p.estado ? ' - ' + p.estado : '');
    document.getElementById('det-comb-preco').textContent = preco ? 'R$ ' + preco.toFixed(2).replace('.', ',') + ' /L' : '-';

    // Combustíveis
    const list = document.getElementById('det-fuel-list');
    const fuels = [
      ['Etanol', p.precos?.etanol],
      ['Diesel S10', p.precos?.dieselS10 || p.precos?.diesel],
      ['GNV', p.precos?.gnv],
      ['Gasolina Aditivada', p.precos?.gasolinaAditivada],
    ].filter(f => f[1]);
    list.innerHTML = fuels.map(f =>
      '<div class="det-fuel-row"><span class="det-fuel-nome">'+f[0]+'</span><span class="det-fuel-price">R$ '+f[1].toFixed(2).replace('.',',')+'</span></div>'
    ).join('') || '<div class="det-fuel-row"><span class="det-fuel-nome" style="color:var(--gray)">Preços não disponíveis</span></div>';

    // Planejar: atualizar dest
    document.getElementById('plan-dest').textContent = p.nome;
    if (mapPlan) { mapPlan.remove(); mapPlan = null; }

    goToView('detalhes');
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
    if (n.includes('RAIZEN') || n.includes('RAÍZEN')) return '🟣';
    if (n.includes('ALE') || n.includes('ALÉ')) return '🔴';
    if (n.includes('TEXACO')) return '⭐';
    if (n.includes('ESSO')) return '🔷';
    if (n.includes('BANDEIRANTE')) return '🏁';
    return '⛽';
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

  function irAteLa() {
    if (!selectedPosto) { showToast('Selecione um posto'); return; }
    const url = 'https://www.google.com/maps/dir/?api=1&destination=' + selectedPosto.lat + ',' + selectedPosto.lng;
    window.open(url, '_blank');
  }

  function openMaps() { irAteLa(); }
  function shareStation() {
    if (navigator.share && selectedPosto) {
      navigator.share({ title: selectedPosto.nome, text: 'Confira esse posto no RotaPosto!', url: window.location.href }).catch(()=>{});
    } else showToast('Link copiado!');
  }
  function toggleFavorite() { showToast('Adicionado aos favoritos ❤️'); }

  function iniciarNavegacao() {
    const dest = selectedPosto || getDemoPostos()[0];
    window.open('https://www.google.com/maps/dir/?api=1&destination=' + dest.lat + ',' + dest.lng + '&travelmode=driving', '_blank');
  }

  async function onSearchInput(val) {
    if (val.length < 3) return;
  }

  async function doSearch() {
    const val = document.getElementById('search-input').value.trim();
    if (!val) return;
    showLoading(true);
    try {
      const res = await fetch('/api/geocode?q=' + encodeURIComponent(val));
      const data = await res.json();
      showLoading(false);
      if (data && data.length > 0) {
        userLat = data[0].lat; userLng = data[0].lng;
        if (mapMain) {
          mapMain.setView([userLat, userLng], 14);
          loadPostos();
        }
        showToast('Buscando postos em ' + (data[0].nome || val) + '...');
      } else showToast('Local não encontrado');
    } catch { showLoading(false); showToast('Erro na busca'); }
  }

  function toggleMenu() { goToView('perfil'); }

  function goToVehicle() { abrirMeusVeiculos(); }

  // ── Modal helpers ──────────────────────────────────────────────────────────
  function fecharModal() {
    var el = document.getElementById('rp-modal-overlay');
    if (el) el.remove();
  }

  function abrirModal(titulo, conteudoHTML) {
    var old = document.getElementById('rp-modal-overlay');
    if (old) old.remove();
    var overlay = document.createElement('div');
    overlay.id = 'rp-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 0.2s';
    overlay.innerHTML = '<div id="rp-modal" style="background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;padding:24px 24px calc(env(safe-area-inset-bottom,0px) + 24px);max-height:85vh;overflow-y:auto;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">'
      + '<h2 style="font-size:18px;font-weight:800;color:#1A1A1A;margin:0;">' + titulo + '</h2>'
      + '<button onclick="fecharModal()" style="background:#F5F5F5;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">✕</button>'
      + '</div>'
      + conteudoHTML
      + '</div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // ── Minha Conta ───────────────────────────────────────────────────────────
  function abrirMinhaConta() {
    var u = currentUser || {};
    var nome = u.name || 'Usuário';
    var email = u.email || '—';
    var foto = u.photo || '';
    var provider = u.provider === 'google.com' ? 'Google' : u.provider === 'facebook.com' ? 'Facebook' : 'E-mail';
    var html = '<div style="text-align:center;margin-bottom:24px;">'
      + (foto ? '<img src="' + foto + '" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:12px;border:3px solid #FF6D00;">' : '<div style="width:72px;height:72px;border-radius:50%;background:#FF6D00;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;color:#fff;font-weight:700;">' + nome.charAt(0).toUpperCase() + '</div>')
      + '<div style="font-size:18px;font-weight:700;color:#1A1A1A;">' + nome + '</div>'
      + '<div style="font-size:13px;color:#888;margin-top:4px;">' + email + '</div>'
      + '</div>'
      + '<div style="background:#F9F9F9;border-radius:16px;padding:16px;margin-bottom:16px;">'
      + '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;"><span style="font-size:14px;color:#888;">Login via</span><span style="font-size:14px;font-weight:600;color:#1A1A1A;">' + provider + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;padding:10px 0;"><span style="font-size:14px;color:#888;">ID da conta</span><span style="font-size:11px;font-weight:500;color:#888;">' + (u.uid || '—').slice(0,16) + '...</span></div>'
      + '</div>'
      + '<button onclick="doLogout();fecharModal();" style="width:100%;padding:14px;background:#FFF0F0;color:#E53935;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;">Sair da conta</button>';
    abrirModal('Minha Conta', html);
  }

  // ── Meus Veículos ─────────────────────────────────────────────────────────
  function abrirMeusVeiculos() {
    var veh = null;
    try { veh = JSON.parse(localStorage.getItem('rp_vehicle') || 'null'); } catch(e) {}
    var tipo = veh ? (veh.type || 'Carro de passeio') : 'Não configurado';
    var consumo = veh ? (veh.consumption || 12) + ' km/L' : '—';
    var tanque = veh ? (veh.tank || 50) + ' litros' : '—';
    var html = '<div style="background:#FFF8F0;border-radius:16px;padding:20px;margin-bottom:20px;text-align:center;">'
      + '<div style="font-size:40px;margin-bottom:8px;">🚗</div>'
      + '<div style="font-size:16px;font-weight:700;color:#1A1A1A;">' + tipo + '</div>'
      + '</div>'
      + '<div style="background:#F9F9F9;border-radius:16px;padding:16px;margin-bottom:20px;">'
      + '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;"><span style="font-size:14px;color:#888;">Consumo médio</span><span style="font-size:14px;font-weight:600;color:#1A1A1A;">' + consumo + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;padding:10px 0;"><span style="font-size:14px;color:#888;">Tanque</span><span style="font-size:14px;font-weight:600;color:#1A1A1A;">' + tanque + '</span></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
      + '<button onclick="editarVeiculo(&quot;tipo&quot;)" style="padding:14px;background:#F5F5F5;color:#1A1A1A;border:none;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;">Alterar tipo</button>'
      + '<button onclick="editarVeiculo(&quot;consumo&quot;)" style="padding:14px;background:#FF6D00;color:#fff;border:none;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;">Editar consumo</button>'
      + '</div>';
    abrirModal('Meus Veículos', html);
  }

  function editarVeiculo(campo) {
    var veh = null;
    try { veh = JSON.parse(localStorage.getItem('rp_vehicle') || '{}'); } catch(e) { veh = {}; }
    if (campo === 'tipo') {
      var tipos = ['Carro de passeio','SUV / Picape','Moto','Caminhão / Van','Elétrico / Híbrido'];
      var opts = tipos.map(function(t) { return '<option' + (veh.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('');
      var html = '<label style="font-size:14px;font-weight:600;color:#555;display:block;margin-bottom:8px;">Tipo de veículo</label>'
        + '<select id="veh-edit-tipo" style="width:100%;padding:14px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;margin-bottom:20px;">' + opts + '</select>'
        + '<button onclick="salvarVeiculoCampo(&quot;tipo&quot;)" style="width:100%;padding:14px;background:#FF6D00;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;">Salvar</button>';
      abrirModal('Tipo de Veículo', html);
    } else {
      var html = '<label style="font-size:14px;font-weight:600;color:#555;display:block;margin-bottom:8px;">Consumo médio (km/L)</label>'
        + '<input id="veh-edit-consumo" type="number" min="4" max="50" value="' + (veh.consumption || 12) + '" style="width:100%;padding:14px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;margin-bottom:8px;">'
        + '<label style="font-size:14px;font-weight:600;color:#555;display:block;margin-bottom:8px;margin-top:12px;">Capacidade do tanque (litros)</label>'
        + '<input id="veh-edit-tanque" type="number" min="20" max="200" value="' + (veh.tank || 50) + '" style="width:100%;padding:14px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;margin-bottom:20px;">'
        + '<button onclick="salvarVeiculoCampo(&quot;consumo&quot;)" style="width:100%;padding:14px;background:#FF6D00;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;">Salvar</button>';
      abrirModal('Consumo do Veículo', html);
    }
  }

  function salvarVeiculoCampo(campo) {
    var veh = null;
    try { veh = JSON.parse(localStorage.getItem('rp_vehicle') || '{}'); } catch(e) { veh = {}; }
    if (campo === 'tipo') {
      var sel = document.getElementById('veh-edit-tipo');
      if (sel) veh.type = sel.value;
    } else {
      var c = document.getElementById('veh-edit-consumo');
      var t = document.getElementById('veh-edit-tanque');
      if (c) veh.consumption = parseInt(c.value) || 12;
      if (t) veh.tank = parseInt(t.value) || 50;
    }
    localStorage.setItem('rp_vehicle', JSON.stringify(veh));
    document.getElementById('rp-modal-overlay')?.remove();
    showToast('Veículo atualizado! ✓');
  }

  // ── Formas de Pagamento ───────────────────────────────────────────────────
  function abrirFormasPagamento() {
    var html = '<div style="background:#FFF8F0;border-radius:16px;padding:20px;margin-bottom:20px;text-align:center;">'
      + '<div style="font-size:36px;margin-bottom:8px;">💳</div>'
      + '<div style="font-size:15px;color:#555;line-height:1.6;">O RotaPosto utiliza <strong>PIX recorrente</strong> como forma de pagamento para assinaturas Premium.</div>'
      + '</div>'
      + '<div style="background:#F9F9F9;border-radius:16px;padding:16px;margin-bottom:20px;">'
      + '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #eee;">'
      + '<div style="width:40px;height:40px;background:#00C853;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🔑</div>'
      + '<div><div style="font-size:14px;font-weight:700;color:#1A1A1A;">PIX Recorrente</div><div style="font-size:12px;color:#888;">Cobrança automática mensal ou anual</div></div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;">'
      + '<div style="width:40px;height:40px;background:#E8F5E9;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🔒</div>'
      + '<div><div style="font-size:14px;font-weight:700;color:#1A1A1A;">Pagamento seguro</div><div style="font-size:12px;color:#888;">Processado via OpenPix/Woovi</div></div>'
      + '</div>'
      + '</div>'
      + '<button onclick="fecharModal();goToAssinatura();" style="width:100%;padding:14px;background:#FF6D00;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;">Ver planos Premium</button>';
    abrirModal('Formas de Pagamento', html);
  }

  // ── Notificações ──────────────────────────────────────────────────────────
  function abrirNotificacoes() {
    var ativas = Notification.permission === 'granted';
    var html = '<div style="background:#F9F9F9;border-radius:16px;padding:20px;margin-bottom:20px;text-align:center;">'
      + '<div style="font-size:40px;margin-bottom:8px;">' + (ativas ? '🔔' : '🔕') + '</div>'
      + '<div style="font-size:16px;font-weight:700;color:#1A1A1A;margin-bottom:4px;">' + (ativas ? 'Notificações ativas' : 'Notificações desativadas') + '</div>'
      + '<div style="font-size:13px;color:#888;">Status: ' + Notification.permission + '</div>'
      + '</div>'
      + '<div style="background:#F9F9F9;border-radius:16px;padding:16px;margin-bottom:20px;">'
      + '<div style="font-size:13px;color:#555;line-height:1.7;">Receba alertas quando:<br>• Preços próximos de você caírem<br>• Postos favoritos atualizarem preços<br>• Novas promoções na sua região</div>'
      + '</div>'
      + (!ativas ? '<button onclick="pedirPermissaoNotificacao()" style="width:100%;padding:14px;background:#FF6D00;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;">Ativar notificações</button>'
      : '<div style="text-align:center;font-size:13px;color:#888;padding:12px;">Para desativar, acesse as configurações do seu navegador.</div>');
    abrirModal('Notificações', html);
  }

  function pedirPermissaoNotificacao() {
    if (!('Notification' in window)) { showToast('Notificações não suportadas'); return; }
    Notification.requestPermission().then(function(result) {
      document.getElementById('rp-modal-overlay')?.remove();
      if (result === 'granted') showToast('Notificações ativadas! 🔔');
      else showToast('Permissão negada pelo navegador');
    });
  }

  // ── Indique e Ganhe ───────────────────────────────────────────────────────
  function abrirIndiqueGanhe() {
    var u = currentUser || {};
    var link = 'https://rotaposto.com.br?ref=' + (u.uid || 'usuario').slice(0, 8);
    var html = '<div style="background:linear-gradient(135deg,#FF6D00,#FF8F00);border-radius:16px;padding:20px;margin-bottom:20px;text-align:center;color:#fff;">'
      + '<div style="font-size:40px;margin-bottom:8px;">🎁</div>'
      + '<div style="font-size:18px;font-weight:800;margin-bottom:6px;">Convide amigos!</div>'
      + '<div style="font-size:13px;opacity:0.9;">Você e seu amigo ganham<br><strong>7 dias de Premium grátis</strong></div>'
      + '</div>'
      + '<div style="background:#F9F9F9;border-radius:16px;padding:16px;margin-bottom:16px;">'
      + '<div style="font-size:12px;color:#888;margin-bottom:6px;">Seu link de indicação</div>'
      + '<div style="font-size:13px;font-weight:600;color:#FF6D00;word-break:break-all;">' + link + '</div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
      + '<button onclick="copiarLinkIndicacao(this.dataset.link)" data-link="' + link + '" style="padding:14px;background:#F5F5F5;color:#1A1A1A;border:none;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;">📋 Copiar link</button>'
      + '<button onclick="compartilharIndicacao(this.dataset.link)" data-link="' + link + '" style="padding:14px;background:#FF6D00;color:#fff;border:none;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;">📤 Compartilhar</button>'
      + '</div>';
    abrirModal('Indique e Ganhe', html);
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
    var html = faqs.map(function(f) {
      return '<details style="border:1px solid #E0E0E0;border-radius:12px;margin-bottom:10px;overflow:hidden;">'
        + '<summary style="padding:14px 16px;font-size:14px;font-weight:600;color:#1A1A1A;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;">'
        + f[0] + '<span style="color:#FF6D00;font-size:18px;line-height:1;">+</span></summary>'
        + '<div style="padding:0 16px 14px;font-size:14px;color:#555;line-height:1.6;">' + f[1] + '</div>'
        + '</details>';
    }).join('')
    + '<div style="background:#FFF8F0;border-radius:16px;padding:16px;margin-top:8px;text-align:center;">'
    + '<div style="font-size:13px;color:#555;margin-bottom:12px;">Não encontrou o que procura?</div>'
    + '<a href="mailto:contato@rotaposto.com.br" style="display:inline-block;padding:12px 24px;background:#FF6D00;color:#fff;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;">📧 Falar com suporte</a>'
    + '</div>';
    abrirModal('Ajuda e Suporte', html);
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
      + '<div style="font-size:11px;color:#aaa;">RotaPosto v1.0 • <a href="/termos" target="_blank" style="color:#FF6D00;">Termos</a> • <a href="/privacidade" target="_blank" style="color:#FF6D00;">Privacidade</a></div>'
      + '</div>';
    abrirModal('Configurações', html);
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
    document.getElementById('rp-modal-overlay')?.remove();
    showToast('Dados locais limpos ✓');
  }

  // ══════════════════════════════════════════════════════
  //  ASSINATURA PIX RECORRENTE – FLUXO COMPLETO
  // ══════════════════════════════════════════════════════
  let planoSelecionado = 'premium';
  let assinaturaInterval = null;
  let assinaturaSubscriptionId = null;

  function goToAssinatura() {
    // Verificar status atual antes de abrir
    if (currentUser?.uid) {
      fetch('/api/assinatura/status/' + currentUser.uid)
        .then(r => r.json())
        .then(data => {
          if (data.ativa) {
            // Já é premium – mostrar step3 direto
            abrirModalAssinatura();
            mostrarStep3(data);
          } else if (data.status === 'PENDING' && data.qrCode) {
            // Tem pagamento pendente – mostrar QR existente
            abrirModalAssinatura();
            mostrarQRCode(data.qrCode, data.brcode, data.subscriptionId, planoSelecionado);
          } else {
            abrirModalAssinatura();
          }
        })
        .catch(() => abrirModalAssinatura());
    } else {
      abrirModalAssinatura();
    }
  }

  function abrirModalAssinatura() {
    document.getElementById('modal-assinatura').style.display = 'block';
    document.body.style.overflow = 'hidden';
    mostrarStep1();
  }

  function fecharAssinatura() {
    document.getElementById('modal-assinatura').style.display = 'none';
    document.body.style.overflow = '';
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
    selecionarPlano('premium'); // reset
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
      const body = {
        nome: currentUser.name || currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
        email: currentUser.email || '',
        cpf: currentUser.cpf || localStorage.getItem('rp_cpf') || '',
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
        mostrarQRCode(data.qrCode, data.brcode, data.subscriptionId, planoSelecionado);
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

  function mostrarQRCode(qrCode, brcode, subscriptionId, plano) {
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

    // Polling: verificar pagamento a cada 5s
    if (assinaturaInterval) clearInterval(assinaturaInterval);
    assinaturaInterval = setInterval(() => verificarPagamentoPIX(), 5000);
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
  // ══════════════════════════════════════════════════════
  //  PWA – Instalar atalho + Auto-update silencioso
  // ══════════════════════════════════════════════════════
  let _deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    _deferredPrompt = e;
    // Mostrar item "Instalar app" no menu perfil sempre que o evento disparar
    const menuItem = document.getElementById('menu-item-instalar');
    if (menuItem) menuItem.style.display = 'block';
    // Só mostrar banner automático se não está instalado e não dispensou recentemente
    const jaEstaInstalado = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator['standalone'] === true);
    const dispensado = localStorage.getItem('rp_pwa_dispensado');
    // Resetar flag de dispensado após 7 dias para dar nova chance
    const dispensadoTs = localStorage.getItem('rp_pwa_dispensado_ts');
    if (dispensado && dispensadoTs && (Date.now() - parseInt(dispensadoTs)) > 7 * 24 * 3600 * 1000) {
      localStorage.removeItem('rp_pwa_dispensado');
      localStorage.removeItem('rp_pwa_dispensado_ts');
    }
    const dispensadoAtual = localStorage.getItem('rp_pwa_dispensado');
    if (!jaEstaInstalado && !dispensadoAtual) {
      setTimeout(mostrarBannerInstalar, 3000);
    }
  });

  function mostrarBannerInstalar() {
    if (document.getElementById('pwa-install-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = 'position:fixed;bottom:80px;left:16px;right:16px;z-index:9999;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.18);padding:16px;display:flex;align-items:center;gap:12px;animation:slideUp 0.3s ease';
    // Construir banner via DOM (sem innerHTML com aspas problemáticas)
    const img = document.createElement('img');
    img.src = '/icons/icon-96x96.png';
    img.style.cssText = 'width:44px;height:44px;border-radius:10px;flex-shrink:0';
    img.addEventListener('error', function() { img.style.display = 'none'; });

    const txtWrap = document.createElement('div');
    txtWrap.style.flex = '1';
    const txtTitle = document.createElement('div');
    txtTitle.style.cssText = 'font-weight:700;font-size:14px;color:#1A1A1A';
    txtTitle.textContent = 'Adicionar \u00e0 tela inicial';
    const txtSub = document.createElement('div');
    txtSub.style.cssText = 'font-size:12px;color:#888;margin-top:1px';
    txtSub.textContent = 'Acesso r\u00e1pido ao RotaPosto';
    txtWrap.appendChild(txtTitle);
    txtWrap.appendChild(txtSub);

    const btnDismiss = document.createElement('button');
    btnDismiss.style.cssText = 'background:none;border:none;padding:6px;cursor:pointer;color:#bbb;font-size:18px';
    btnDismiss.textContent = '\u2715';
    btnDismiss.addEventListener('click', function() {
      document.getElementById('pwa-install-banner')?.remove();
      localStorage.setItem('rp_pwa_dispensado', '1');
      localStorage.setItem('rp_pwa_dispensado_ts', String(Date.now()));
    });

    const btnInstall = document.createElement('button');
    btnInstall.style.cssText = 'background:#FF6D00;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;flex-shrink:0';
    btnInstall.textContent = 'Instalar';
    btnInstall.addEventListener('click', instalarAppPWA);

    banner.appendChild(img);
    banner.appendChild(txtWrap);
    banner.appendChild(btnDismiss);
    banner.appendChild(btnInstall);
    document.body.appendChild(banner);
  }

  function instalarAppPWA() {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then(function(r) {
      if (r.outcome === 'accepted') {
        localStorage.setItem('rp_pwa_instalado', '1');
        document.getElementById('pwa-install-banner')?.remove();
        // Ocultar menu item pois já instalou
        const menuItem = document.getElementById('menu-item-instalar');
        if (menuItem) menuItem.style.display = 'none';
        showToast('RotaPosto instalado! \u2713');
      }
      _deferredPrompt = null;
    });
  }

  function verificarMenuInstalar() {
    // Verificar se app já está rodando como PWA instalado
    const jaInstalado = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator['standalone'] === true)
      || localStorage.getItem('rp_pwa_instalado') === '1';
    if (jaInstalado) {
      // App já instalado: ocultar item do menu
      const menuItem = document.getElementById('menu-item-instalar');
      if (menuItem) menuItem.style.display = 'none';
    } else {
      // Ainda não instalado: sempre mostrar item de instalar no menu perfil
      const menuItem = document.getElementById('menu-item-instalar');
      if (menuItem) menuItem.style.display = 'block';
    }
  }

  function instalarOuMostrarPWA() {
    if (_deferredPrompt) {
      // Tem prompt disponível — instalar direto
      localStorage.removeItem('rp_pwa_dispensado');
      localStorage.removeItem('rp_pwa_dispensado_ts');
      instalarAppPWA();
    } else {
      // Sem prompt (já instalado ou não suportado) — dar instrução
      const jaInstalado = window.matchMedia('(display-mode: standalone)').matches
        || (window.navigator['standalone'] === true);
      if (jaInstalado) {
        showToast('App já está instalado! ✓');
      } else {
        var html = '<div style="text-align:center;padding:8px 0;">'
          + '<div style="font-size:40px;margin-bottom:12px;">📲</div>'
          + '<div style="font-size:15px;font-weight:700;color:#1A1A1A;margin-bottom:16px;">Adicionar à tela inicial</div>'
          + '<div style="background:#F5F5F5;border-radius:14px;padding:14px;font-size:13px;color:#555;line-height:1.7;text-align:left;">'
          + '<b>Android (Chrome):</b><br/>Menu ⋮ → "Adicionar à tela inicial"<br/><br/>'
          + '<b>iPhone (Safari):</b><br/>Compartilhar □↑ → "Adicionar à Tela de Início"'
          + '</div>'
          + '</div>';
        abrirModal('Instalar RotaPosto', html);
      }
    }
  }

  window.addEventListener('appinstalled', function() {
    localStorage.setItem('rp_pwa_instalado', '1');
    document.getElementById('pwa-install-banner')?.remove();
    verificarMenuInstalar();
    showToast('App instalado com sucesso! ✓');
  });

  (function init() {
    // ── Registrar SW v6 com auto-update silencioso ──
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        // Checar updates a cada 60s
        setInterval(() => reg.update(), 60000);

        // Novo SW disponível → ativar imediatamente
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              newSW.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch(() => {});

      // SW trocou → recarregar página silenciosamente
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
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
            // Mostrar aviso e redirecionar
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

    // Atualizar nome do usuário no perfil
    if (currentUser) {
      const nome = currentUser.name || currentUser.email?.split('@')[0] || 'Usuário';
      document.getElementById('perfil-nome').textContent = nome;
      if (currentUser.photo) {
        document.getElementById('perfil-avatar').src = currentUser.photo;
      }
    }

    // Iniciar na view mapa (com header)
    goToView('mapa');

    // Verificar se item "Instalar app" deve aparecer no menu
    verificarMenuInstalar();

    // Verificar status de assinatura
    setTimeout(() => verificarStatusAssinatura(), 1000);

    // Obter localização
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        if (mapMain) {
          mapMain.setView([userLat, userLng], 14);
          loadPostos();
        }
      }, null, { timeout: 8000 });
    }
  })();
</script>
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
