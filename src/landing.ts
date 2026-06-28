export function getLandingHTML(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="theme-color" content="#0A0F1E"/>
  <meta name="description" content="RotaPosto – O caminho mais inteligente para economizar combustível. Encontre os melhores preços perto de você, compare postos e trace rotas rápidas."/>
  <meta property="og:title" content="RotaPosto – Economize Sempre"/>
  <meta property="og:description" content="Encontre os melhores preços, compare e economize em cada abastecimento. Dados oficiais da ANP."/>
  <meta property="og:image" content="https://rotaposto.com.br/og-image.png"/>
  <title>RotaPosto – Economize Sempre</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
    /* ═══════════════════════════════════════════
       BASE & TOKENS
    ═══════════════════════════════════════════ */
    :root {
      --bg:       #0A0F1E;
      --bg2:      #0D1321;
      --bg3:      #111827;
      --surface:  #141C2F;
      --surface2: #1A2540;
      --border:   rgba(255,255,255,0.08);
      --border2:  rgba(255,255,255,0.14);
      --orange:   #FF6D00;
      --orange2:  #FF8F00;
      --orange3:  #FFA726;
      --green:    #22C55E;
      --green2:   #16A34A;
      --red:      #EF4444;
      --text:     #F8FAFC;
      --text2:    #94A3B8;
      --text3:    #64748B;
    }
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html{scroll-behavior:smooth;font-size:16px}
    body{
      font-family:'Inter',sans-serif;
      background:var(--bg);
      color:var(--text);
      overflow-x:hidden;
      line-height:1.6;
    }
    a{text-decoration:none;color:inherit}
    button{font-family:'Inter',sans-serif;cursor:pointer}

    /* ═══════════════════════════════════════════
       NAVBAR
    ═══════════════════════════════════════════ */
    .navbar{
      position:fixed;top:0;left:0;right:0;z-index:1000;
      display:flex;align-items:center;justify-content:space-between;
      padding:0 32px;height:68px;
      background:rgba(10,15,30,0.88);
      backdrop-filter:blur(20px);
      -webkit-backdrop-filter:blur(20px);
      border-bottom:1px solid var(--border);
    }
    .navbar-logo{display:flex;align-items:center;gap:10px}
    .navbar-logo-icon{
      width:38px;height:38px;
      background:linear-gradient(135deg,var(--orange),var(--orange2));
      border-radius:11px;
      display:flex;align-items:center;justify-content:center;
      font-size:19px;
      box-shadow:0 4px 14px rgba(255,109,0,0.4);
    }
    .navbar-logo-text{font-size:21px;font-weight:800;letter-spacing:-0.5px}
    .navbar-logo-text b{color:var(--orange)}
    .navbar-links{display:flex;align-items:center;gap:28px}
    .navbar-links a{
      font-size:13.5px;font-weight:600;
      color:var(--text2);
      transition:color 0.2s;
    }
    .navbar-links a:hover{color:var(--text)}
    .navbar-cta{
      display:flex;align-items:center;gap:10px;
    }
    .btn-nav-ghost{
      padding:9px 18px;
      background:transparent;
      border:1.5px solid var(--border2);
      border-radius:10px;
      font-size:13px;font-weight:700;
      color:var(--text2);
      transition:all 0.2s;
    }
    .btn-nav-ghost:hover{border-color:var(--orange);color:var(--orange)}
    .btn-nav-primary{
      padding:9px 20px;
      background:linear-gradient(135deg,var(--orange),var(--orange2));
      border:none;
      border-radius:10px;
      font-size:13px;font-weight:800;
      color:#fff;
      box-shadow:0 4px 16px rgba(255,109,0,0.38);
      transition:transform 0.15s,box-shadow 0.15s;
    }
    .btn-nav-primary:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(255,109,0,0.5)}
    @media(max-width:768px){
      .navbar-links{display:none}
      .btn-nav-ghost{display:none}
      .navbar{padding:0 20px}
    }

    /* ═══════════════════════════════════════════
       TICKER
    ═══════════════════════════════════════════ */
    .ticker-bar{
      overflow:hidden;
      background:linear-gradient(90deg,var(--orange),var(--orange2));
      padding:11px 0;
      margin-top:68px;
    }
    .ticker-track{
      display:flex;gap:56px;
      animation:tickerAnim 22s linear infinite;
      white-space:nowrap;
      width:max-content;
    }
    .ticker-item{
      font-size:12.5px;font-weight:700;
      color:#fff;letter-spacing:0.2px;
    }
    .ticker-dot{color:rgba(255,255,255,0.5);margin-left:28px}
    @keyframes tickerAnim{from{transform:translateX(0)}to{transform:translateX(-50%)}}

    /* ═══════════════════════════════════════════
       HERO
    ═══════════════════════════════════════════ */
    .hero{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:40px;
      align-items:center;
      max-width:1200px;
      margin:0 auto;
      padding:72px 40px 80px;
      position:relative;
    }
    .hero-bg-glow{
      position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:0;
      background:
        radial-gradient(ellipse 700px 500px at 70% 20%, rgba(255,109,0,0.07) 0%, transparent 60%),
        radial-gradient(ellipse 600px 400px at 20% 80%, rgba(30,58,138,0.12) 0%, transparent 60%);
    }
    .hero-map-grid{
      position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden;
      background-image:
        linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px);
      background-size:48px 48px;
      mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%);
    }
    .hero-left{position:relative;z-index:1}
    .hero-eyebrow{
      display:inline-flex;align-items:center;gap:7px;
      padding:5px 14px;
      background:rgba(255,109,0,0.12);
      border:1px solid rgba(255,109,0,0.28);
      border-radius:100px;
      font-size:12px;font-weight:700;
      color:var(--orange);
      letter-spacing:0.6px;
      margin-bottom:24px;
    }
    .hero-eyebrow .dot{
      width:7px;height:7px;border-radius:50%;
      background:var(--orange);
      animation:pulse 2s ease-in-out infinite;
    }
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)}}
    .hero-h1{
      font-size:clamp(36px,4.5vw,58px);
      font-weight:900;
      line-height:1.08;
      letter-spacing:-1.5px;
      margin-bottom:20px;
    }
    .hero-h1 .hl{
      color:var(--orange);
      position:relative;display:inline;
    }
    .hero-bullets{
      display:flex;flex-direction:column;gap:12px;
      margin-bottom:32px;
    }
    .hero-bullet{
      display:flex;align-items:center;gap:10px;
      font-size:15px;font-weight:500;color:var(--text2);
    }
    .hero-bullet-icon{
      width:28px;height:28px;flex-shrink:0;
      border-radius:8px;
      background:rgba(255,109,0,0.12);
      border:1px solid rgba(255,109,0,0.2);
      display:flex;align-items:center;justify-content:center;
      font-size:13px;color:var(--orange);
    }
    .hero-ctas{
      display:flex;flex-wrap:wrap;gap:12px;margin-bottom:40px;
    }
    .btn-cta-primary{
      padding:15px 30px;
      background:linear-gradient(135deg,var(--orange),var(--orange2));
      border:none;
      border-radius:13px;
      font-size:15px;font-weight:800;
      color:#fff;
      display:inline-flex;align-items:center;gap:8px;
      box-shadow:0 6px 28px rgba(255,109,0,0.42);
      transition:transform 0.15s,box-shadow 0.15s;
    }
    .btn-cta-primary:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(255,109,0,0.55)}
    .btn-cta-secondary{
      padding:15px 26px;
      background:rgba(255,255,255,0.06);
      border:1.5px solid var(--border2);
      border-radius:13px;
      font-size:15px;font-weight:700;
      color:var(--text);
      display:inline-flex;align-items:center;gap:8px;
      transition:background 0.2s,border-color 0.2s;
    }
    .btn-cta-secondary:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.25)}
    .store-badges{
      display:flex;gap:12px;flex-wrap:wrap;
    }
    .store-badge{
      display:inline-flex;align-items:center;gap:8px;
      padding:10px 16px;
      background:rgba(255,255,255,0.05);
      border:1px solid var(--border2);
      border-radius:12px;
      font-size:11px;font-weight:600;
      color:var(--text2);
      transition:border-color 0.2s,background 0.2s;
    }
    .store-badge:hover{border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.09)}
    .store-badge .badge-icon{font-size:22px}
    .store-badge-text .badge-sub{font-size:9px;font-weight:500;color:var(--text3);display:block}
    .store-badge-text .badge-name{font-size:13px;font-weight:800;color:var(--text);display:block;margin-top:1px}

    /* ═══════════════════════════════════════════
       PHONE MOCKUPS (HERO)
    ═══════════════════════════════════════════ */
    .hero-right{
      position:relative;z-index:1;
      display:flex;justify-content:center;align-items:flex-end;
      gap:-30px;
      min-height:520px;
    }
    .phones-container{
      position:relative;
      width:100%;
      max-width:440px;
      height:520px;
      display:flex;align-items:flex-end;justify-content:center;
    }
    /* Phone base style */
    .ph{
      position:absolute;
      width:210px;
      border-radius:36px;
      border:2.5px solid rgba(255,255,255,0.14);
      overflow:hidden;
      box-shadow:0 40px 80px rgba(0,0,0,0.65),0 0 0 1px rgba(255,255,255,0.05);
    }
    .ph-main{
      left:50%;transform:translateX(-50%);
      bottom:0;
      width:220px;
      z-index:3;
      border-color:rgba(255,255,255,0.2);
      box-shadow:0 50px 100px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.08);
    }
    .ph-back{
      right:6%;
      bottom:30px;
      width:195px;
      z-index:2;
      transform:rotate(6deg);
      filter:brightness(0.7);
    }
    /* Phone screen content */
    .ph-screen{background:var(--bg2)}
    .ph-statusbar{
      display:flex;justify-content:space-between;align-items:center;
      padding:8px 14px 4px;
      font-size:9px;font-weight:700;
      color:rgba(255,255,255,0.9);
      background:var(--bg2);
    }
    .ph-topbar{
      display:flex;align-items:center;justify-content:space-between;
      padding:8px 12px;
      background:var(--surface);
      border-bottom:1px solid var(--border);
    }
    .ph-topbar-logo{
      font-size:13px;font-weight:800;
      display:flex;align-items:center;gap:5px;
    }
    .ph-topbar-logo span{color:var(--orange)}
    .ph-topbar-icon{
      width:26px;height:26px;border-radius:8px;
      background:var(--surface2);
      display:flex;align-items:center;justify-content:center;
      font-size:11px;
    }
    /* Map area */
    .ph-map{
      position:relative;
      height:200px;
      background:linear-gradient(180deg,#0D2137 0%,#0A1929 100%);
      overflow:hidden;
    }
    .ph-map-roads{
      position:absolute;inset:0;
      background-image:
        linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px),
        linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);
      background-size:32px 32px,32px 32px,8px 8px,8px 8px;
    }
    /* Map diagonal roads */
    .ph-road{
      position:absolute;
      height:2px;
      background:rgba(255,255,255,0.1);
      transform-origin:left center;
    }
    /* Price bubbles on map */
    .ph-bubble{
      position:absolute;
      padding:4px 8px;
      border-radius:12px;
      font-size:10px;font-weight:800;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    }
    .ph-bubble::after{
      content:'';
      position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
      border:4px solid transparent;
      border-top-width:0;
    }
    .ph-bubble.green{background:var(--green);color:#fff}
    .ph-bubble.green::after{border-bottom-color:var(--green)}
    .ph-bubble.orange{background:var(--orange);color:#fff}
    .ph-bubble.orange::after{border-bottom-color:var(--orange)}
    .ph-bubble.gray{background:rgba(255,255,255,0.15);color:#fff;backdrop-filter:blur(4px)}
    /* User dot */
    .ph-user-dot{
      position:absolute;
      width:14px;height:14px;
      border-radius:50%;
      background:#3B82F6;
      border:2.5px solid #fff;
      box-shadow:0 0 0 6px rgba(59,130,246,0.2);
    }
    /* Fuel tabs */
    .ph-fuel-tabs{
      display:flex;gap:6px;
      padding:8px 10px;
      background:var(--surface);
      border-top:1px solid var(--border);
      overflow-x:auto;
    }
    .ph-fuel-tab{
      padding:4px 10px;
      border-radius:100px;
      font-size:9.5px;font-weight:700;
      white-space:nowrap;
      border:1px solid var(--border);
      color:var(--text2);
    }
    .ph-fuel-tab.active{
      background:var(--orange);
      border-color:var(--orange);
      color:#fff;
    }
    /* Station list */
    .ph-station{
      display:flex;align-items:center;gap:8px;
      padding:9px 12px;
      border-bottom:1px solid var(--border);
    }
    .ph-station-logo{
      width:30px;height:30px;border-radius:8px;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:900;
      color:#fff;flex-shrink:0;
    }
    .ph-station-info{flex:1;min-width:0}
    .ph-station-name{font-size:10px;font-weight:700;color:var(--text)}
    .ph-station-dist{font-size:8.5px;color:var(--text2)}
    .ph-station-stars{font-size:7px;color:var(--orange3);letter-spacing:1px}
    .ph-station-price{text-align:right}
    .ph-station-price .price{font-size:13px;font-weight:900;color:var(--text)}
    .ph-station-price .badge{
      font-size:7.5px;font-weight:700;
      background:var(--green);
      color:#fff;
      padding:1.5px 5px;border-radius:5px;
      display:block;margin-top:2px;text-align:center;
    }
    /* Bottom nav */
    .ph-bottom-nav{
      display:flex;
      background:var(--bg2);
      border-top:1px solid var(--border);
      padding:8px 0 12px;
    }
    .ph-nav-item{
      flex:1;
      display:flex;flex-direction:column;align-items:center;gap:3px;
      font-size:7.5px;font-weight:700;
      color:var(--text3);
      text-transform:uppercase;letter-spacing:0.3px;
    }
    .ph-nav-item i{font-size:15px}
    .ph-nav-item.active{color:var(--orange)}

    /* Floating label chips */
    .float-chip{
      position:absolute;
      background:rgba(13,19,33,0.92);
      border:1px solid var(--border2);
      border-radius:14px;
      padding:9px 13px;
      backdrop-filter:blur(12px);
      font-size:12px;font-weight:700;
      white-space:nowrap;
      z-index:10;
      box-shadow:0 8px 24px rgba(0,0,0,0.4);
    }
    .fc-economy{
      left:-30px;top:20%;
      animation:floatY 3.5s ease-in-out infinite;
    }
    .fc-dist{
      right:-25px;top:55%;
      animation:floatY 3.5s ease-in-out infinite 1.75s;
    }
    @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
    @media(max-width:1024px){
      .hero{grid-template-columns:1fr;padding:48px 24px 60px;text-align:center}
      .hero-bullets{align-items:center}
      .hero-ctas,.store-badges{justify-content:center}
      .hero-right{margin-top:40px}
      .fc-economy,.fc-dist{display:none}
    }
    @media(max-width:480px){
      .phones-container{height:420px}
      .ph-main{width:190px}
      .ph-back{width:165px}
    }

    /* ═══════════════════════════════════════════
       STATS BAND
    ═══════════════════════════════════════════ */
    .stats-band{
      background:var(--surface);
      border-top:1px solid var(--border);
      border-bottom:1px solid var(--border);
      padding:36px 24px;
    }
    .stats-inner{
      max-width:960px;margin:0 auto;
      display:flex;flex-wrap:wrap;gap:0;
    }
    .stat-item{
      flex:1;min-width:160px;
      text-align:center;
      padding:16px 24px;
      position:relative;
    }
    .stat-item:not(:last-child)::after{
      content:'';
      position:absolute;right:0;top:20%;bottom:20%;
      width:1px;background:var(--border);
    }
    .stat-num{
      font-size:clamp(28px,4vw,42px);
      font-weight:900;
      color:var(--orange);
      line-height:1;
      margin-bottom:6px;
    }
    .stat-label{
      font-size:12px;font-weight:600;
      color:var(--text2);
      text-transform:uppercase;letter-spacing:0.5px;
    }
    @media(max-width:640px){
      .stat-item::after{display:none}
      .stats-inner{gap:4px}
    }

    /* ═══════════════════════════════════════════
       FEATURE CARDS GRID (4 cards com mockups)
    ═══════════════════════════════════════════ */
    .features-section{
      max-width:1200px;margin:0 auto;
      padding:80px 40px;
    }
    .section-label{
      display:inline-flex;align-items:center;gap:6px;
      padding:5px 13px;
      background:rgba(255,109,0,0.1);
      border:1px solid rgba(255,109,0,0.22);
      border-radius:100px;
      font-size:11px;font-weight:800;
      color:var(--orange);
      letter-spacing:0.8px;text-transform:uppercase;
      margin-bottom:18px;
    }
    .section-title{
      font-size:clamp(28px,4vw,46px);
      font-weight:900;
      line-height:1.1;
      letter-spacing:-1px;
      margin-bottom:12px;
    }
    .section-sub{
      font-size:17px;font-weight:500;
      color:var(--text2);
      max-width:520px;
      line-height:1.7;
      margin-bottom:52px;
    }
    .feat-grid{
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:18px;
    }
    .feat-card{
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:22px;
      overflow:hidden;
      transition:transform 0.25s,border-color 0.25s,box-shadow 0.25s;
    }
    .feat-card:hover{
      transform:translateY(-6px);
      border-color:rgba(255,109,0,0.3);
      box-shadow:0 20px 50px rgba(0,0,0,0.4),0 0 0 1px rgba(255,109,0,0.12);
    }
    .feat-screen{
      height:200px;
      background:var(--bg2);
      position:relative;
      overflow:hidden;
    }
    /* Screen 1: Melhores preços */
    .fs-prices .fs-header{
      background:var(--surface);
      padding:10px 12px 8px;
      border-bottom:1px solid var(--border);
    }
    .fs-prices .fs-header-title{font-size:11px;font-weight:800;color:var(--text)}
    .fs-prices .fs-header-sub{font-size:9px;color:var(--text2)}
    .fs-row{
      display:flex;align-items:center;gap:8px;
      padding:8px 12px;
      border-bottom:1px solid var(--border);
    }
    .fs-logo{
      width:26px;height:26px;border-radius:7px;
      display:flex;align-items:center;justify-content:center;
      font-size:10px;font-weight:900;color:#fff;flex-shrink:0;
    }
    .fs-info{flex:1}
    .fs-name{font-size:9.5px;font-weight:700;color:var(--text)}
    .fs-meta{font-size:8px;color:var(--text2)}
    .fs-stars{font-size:7px;color:var(--orange3)}
    .fs-price-col{text-align:right}
    .fs-price{font-size:13px;font-weight:900;color:var(--text)}
    .fs-best{
      display:inline-block;
      font-size:7px;font-weight:800;
      background:var(--green);color:#fff;
      padding:1px 5px;border-radius:4px;margin-top:1px;
    }
    .fs-second .fs-price{color:var(--text2);font-size:11px}
    /* Screen 2: Mapa */
    .fs-map{
      height:200px;
      background:linear-gradient(160deg,#0D2137,#091622);
      position:relative;overflow:hidden;
    }
    .fs-map-grid{
      position:absolute;inset:0;
      background-image:
        linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px);
      background-size:24px 24px;
    }
    .fs-map .mb{
      position:absolute;
      padding:4px 8px;
      border-radius:10px;
      font-size:9px;font-weight:800;
      color:#fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    }
    .fs-map .mb.g{background:var(--green)}
    .fs-map .mb.o{background:var(--orange)}
    .fs-map .mb.r{background:rgba(255,255,255,0.18);backdrop-filter:blur(4px)}
    .fs-map .udot{
      position:absolute;width:10px;height:10px;
      border-radius:50%;background:#3B82F6;
      border:2px solid #fff;
      box-shadow:0 0 0 5px rgba(59,130,246,0.2);
    }
    /* Screen 3: Rota */
    .fs-route-header{
      background:var(--surface);padding:9px 12px;
      border-bottom:1px solid var(--border);
      font-size:10px;font-weight:800;color:var(--text);
    }
    .fs-route-map{
      height:110px;
      background:linear-gradient(160deg,#0D2137,#091622);
      position:relative;overflow:hidden;
    }
    .fs-route-map .rg{
      position:absolute;inset:0;
      background-image:
        linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px);
      background-size:20px 20px;
    }
    .fs-route-line{
      position:absolute;
      width:2.5px;height:70px;
      background:linear-gradient(180deg,#3B82F6,var(--orange));
      left:50%;top:15%;transform:translateX(-50%);
      border-radius:2px;
    }
    .fs-route-start{
      position:absolute;width:10px;height:10px;
      border-radius:50%;background:#3B82F6;
      border:2px solid #fff;left:50%;top:14%;
      transform:translateX(-50%);
    }
    .fs-route-end{
      position:absolute;
      left:50%;bottom:20%;transform:translateX(-50%);
      font-size:16px;
    }
    .fs-route-info{
      display:flex;gap:0;
      background:var(--surface);
      border-top:1px solid var(--border);
    }
    .fs-route-stat{
      flex:1;text-align:center;padding:8px 4px;
      border-right:1px solid var(--border);
    }
    .fs-route-stat:last-child{border:none}
    .fs-route-stat .rv{font-size:13px;font-weight:900;color:var(--orange)}
    .fs-route-stat .rl{font-size:7.5px;color:var(--text2);font-weight:600}
    .fs-route-btn{
      margin:8px 12px;padding:7px;
      background:var(--orange);
      border-radius:10px;border:none;
      font-size:10px;font-weight:800;color:#fff;
      width:calc(100% - 24px);text-align:center;
    }
    /* Screen 4: Relatórios */
    .fs-report-header{
      background:var(--surface);padding:9px 12px;
      display:flex;align-items:center;justify-content:space-between;
      border-bottom:1px solid var(--border);
    }
    .fs-report-title{font-size:10px;font-weight:800;color:var(--text)}
    .fs-tabs-mini{display:flex;gap:4px}
    .fs-tab-mini{
      padding:2px 7px;border-radius:6px;
      font-size:8px;font-weight:700;color:var(--text2);
      background:transparent;border:1px solid var(--border);
    }
    .fs-tab-mini.active{background:var(--orange);border-color:var(--orange);color:#fff}
    .fs-report-saving{
      text-align:center;padding:12px 12px 8px;
      border-bottom:1px solid var(--border);
    }
    .fs-saving-label{font-size:8.5px;color:var(--text2);font-weight:600}
    .fs-saving-value{font-size:22px;font-weight:900;color:var(--green);line-height:1.1}
    .fs-saving-sub{font-size:7.5px;color:var(--text2)}
    .fs-report-stats{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border)}
    .fs-report-stat{
      background:var(--bg2);padding:7px 10px;
      text-align:center;
    }
    .fs-rs-v{font-size:12px;font-weight:800;color:var(--text)}
    .fs-rs-l{font-size:7.5px;color:var(--text2)}

    .feat-body{padding:20px}
    .feat-body h3{font-size:16px;font-weight:800;margin-bottom:6px}
    .feat-body p{font-size:13px;color:var(--text2);line-height:1.65}

    @media(max-width:1024px){.feat-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:640px){
      .feat-grid{grid-template-columns:1fr}
      .features-section{padding:60px 20px}
    }

    /* ═══════════════════════════════════════════
       HOW IT WORKS
    ═══════════════════════════════════════════ */
    .how-section{
      background:var(--surface);
      border-top:1px solid var(--border);
      border-bottom:1px solid var(--border);
      padding:80px 40px;
    }
    .how-inner{max-width:1100px;margin:0 auto}
    .how-grid{
      display:grid;grid-template-columns:1fr 1fr;
      gap:60px;align-items:center;
      margin-top:52px;
    }
    .steps-list{display:flex;flex-direction:column;gap:0}
    .step{
      display:flex;gap:20px;
      padding:24px 0;
      position:relative;
    }
    .step:not(:last-child)::before{
      content:'';
      position:absolute;
      left:19px;top:60px;bottom:0;
      width:2px;
      background:linear-gradient(rgba(255,109,0,0.3),rgba(255,109,0,0.05));
    }
    .step-num{
      width:40px;height:40px;flex-shrink:0;
      border-radius:12px;
      background:linear-gradient(135deg,var(--orange),var(--orange2));
      display:flex;align-items:center;justify-content:center;
      font-size:17px;font-weight:900;
      box-shadow:0 4px 14px rgba(255,109,0,0.4);
    }
    .step-body h3{font-size:17px;font-weight:800;margin-bottom:5px}
    .step-body p{font-size:14px;color:var(--text2);line-height:1.7}
    /* Mini phone for how it works */
    .how-phone-wrap{
      display:flex;justify-content:center;align-items:center;
    }
    .how-phone{
      width:230px;
      border-radius:38px;
      border:2.5px solid var(--border2);
      overflow:hidden;
      box-shadow:0 40px 80px rgba(0,0,0,0.6);
    }
    .how-screen-header{
      background:var(--surface);
      padding:10px 14px 8px;
      display:flex;align-items:center;gap:8px;
      border-bottom:1px solid var(--border);
    }
    .how-screen-logo{font-size:13px;font-weight:800}
    .how-screen-logo b{color:var(--orange)}
    .how-screen-map{
      height:180px;
      background:linear-gradient(160deg,#0D2137,#091622);
      position:relative;overflow:hidden;
    }
    .how-map-grid{
      position:absolute;inset:0;
      background-image:
        linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px);
      background-size:22px 22px;
    }
    .how-best-bar{
      background:linear-gradient(135deg,rgba(255,109,0,0.15),rgba(255,109,0,0.05));
      border:1px solid rgba(255,109,0,0.2);
      margin:10px;
      border-radius:12px;
      padding:10px 12px;
      display:flex;align-items:center;gap:10px;
    }
    .how-best-logo{
      width:32px;height:32px;border-radius:9px;
      background:linear-gradient(135deg,#F7C948,#F39200);
      display:flex;align-items:center;justify-content:center;
      font-size:14px;font-weight:900;color:#fff;
    }
    .how-best-info{flex:1}
    .how-best-name{font-size:11px;font-weight:800;color:var(--text)}
    .how-best-addr{font-size:9px;color:var(--text2)}
    .how-best-price{font-size:16px;font-weight:900;color:var(--orange)}
    .how-goto-btn{
      margin:0 10px 10px;padding:9px;
      background:var(--orange);
      border:none;border-radius:10px;
      font-size:11px;font-weight:800;color:#fff;
      width:calc(100% - 20px);
      display:flex;align-items:center;justify-content:center;gap:6px;
    }
    @media(max-width:768px){
      .how-grid{grid-template-columns:1fr;gap:40px}
      .how-section{padding:60px 20px}
      .how-phone-wrap{display:none}
    }

    /* ═══════════════════════════════════════════
       TESTIMONIALS
    ═══════════════════════════════════════════ */
    .test-section{
      max-width:1200px;margin:0 auto;
      padding:80px 40px;
    }
    .test-grid{
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:18px;
    }
    .test-card{
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:20px;
      padding:24px;
      transition:border-color 0.2s,transform 0.2s;
    }
    .test-card:hover{border-color:var(--border2);transform:translateY(-3px)}
    .test-stars{color:var(--orange3);font-size:14px;letter-spacing:2px;margin-bottom:12px}
    .test-text{
      font-size:14px;font-weight:500;
      color:rgba(255,255,255,0.78);
      line-height:1.75;
      font-style:italic;
      margin-bottom:18px;
    }
    .test-author{display:flex;align-items:center;gap:10px}
    .test-avatar{
      width:40px;height:40px;border-radius:50%;
      background:linear-gradient(135deg,var(--surface2),var(--bg2));
      border:1.5px solid var(--border2);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;font-weight:800;color:var(--orange);
    }
    .test-name{font-size:13px;font-weight:800}
    .test-role{font-size:11px;color:var(--text2);margin-top:1px}
    @media(max-width:768px){
      .test-grid{grid-template-columns:1fr}
      .test-section{padding:60px 20px}
    }

    /* ═══════════════════════════════════════════
       PRICING
    ═══════════════════════════════════════════ */
    .pricing-section{
      background:var(--surface);
      border-top:1px solid var(--border);
      border-bottom:1px solid var(--border);
      padding:80px 40px;
    }
    .pricing-inner{max-width:1100px;margin:0 auto;text-align:center}
    .plans-wrap{
      display:flex;flex-wrap:wrap;gap:20px;
      justify-content:center;margin-top:52px;
    }
    .plan-card{
      background:var(--bg2);
      border:1.5px solid var(--border);
      border-radius:24px;
      padding:32px 28px;
      width:290px;text-align:left;
      position:relative;
      transition:transform 0.25s,border-color 0.25s,box-shadow 0.25s;
    }
    .plan-card:hover{transform:translateY(-5px)}
    .plan-card.popular{
      border-color:var(--orange);
      background:rgba(255,109,0,0.05);
      box-shadow:0 8px 40px rgba(255,109,0,0.18);
    }
    .plan-badge-pop{
      position:absolute;top:-13px;left:50%;transform:translateX(-50%);
      background:linear-gradient(135deg,var(--orange),var(--orange2));
      padding:4px 16px;border-radius:100px;
      font-size:11px;font-weight:800;color:#fff;
      white-space:nowrap;
    }
    .plan-name{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text2);margin-bottom:8px}
    .plan-price-wrap{display:flex;align-items:baseline;gap:3px;margin-bottom:6px}
    .plan-cifra{font-size:16px;font-weight:700;color:var(--text2)}
    .plan-valor{font-size:52px;font-weight:900;line-height:1}
    .plan-cents{font-size:24px;font-weight:700;align-self:flex-end;margin-bottom:7px}
    .plan-period{font-size:13px;font-weight:600;color:var(--text2);align-self:flex-end;margin-bottom:5px}
    .plan-desc{font-size:13px;color:var(--text2);margin-bottom:22px;line-height:1.6}
    .plan-features{list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:26px}
    .plan-features li{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.8)}
    .plan-features li .fi{width:16px;text-align:center}
    .fi.ok{color:var(--green)}
    .fi.no{color:rgba(255,255,255,0.2)}
    .fi.no ~ span{color:rgba(255,255,255,0.25)}
    .btn-plan{
      width:100%;padding:13px;border-radius:12px;border:none;
      font-family:'Inter',sans-serif;font-size:14px;font-weight:800;
      display:flex;align-items:center;justify-content:center;gap:6px;
      transition:transform 0.15s,box-shadow 0.15s;
    }
    .btn-plan.pri{
      background:linear-gradient(135deg,var(--orange),var(--orange2));
      color:#fff;box-shadow:0 4px 18px rgba(255,109,0,0.4);
    }
    .btn-plan.pri:hover{transform:translateY(-2px);box-shadow:0 8px 26px rgba(255,109,0,0.5)}
    .btn-plan.sec{
      background:rgba(255,255,255,0.06);
      border:1.5px solid var(--border2);color:var(--text);
    }
    .btn-plan.sec:hover{background:rgba(255,255,255,0.11)}
    .plan-guarantee{
      text-align:center;margin-top:12px;
      font-size:11.5px;color:var(--text2);
      display:flex;align-items:center;justify-content:center;gap:5px;
    }
    @media(max-width:640px){.pricing-section{padding:60px 20px}}

    /* ═══════════════════════════════════════════
       FAQ
    ═══════════════════════════════════════════ */
    .faq-section{max-width:740px;margin:0 auto;padding:80px 40px;text-align:center}
    .faq-list{display:flex;flex-direction:column;gap:10px;margin-top:40px;text-align:left}
    .faq-item{
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:14px;overflow:hidden;
    }
    .faq-q{
      width:100%;padding:18px 20px;
      background:none;border:none;text-align:left;
      cursor:pointer;
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      font-family:'Inter',sans-serif;
      font-size:14px;font-weight:700;color:var(--text);
    }
    .faq-q i{color:var(--orange);transition:transform 0.25s;flex-shrink:0;font-size:13px}
    .faq-q.open i{transform:rotate(45deg)}
    .faq-a{
      padding:0 20px;max-height:0;overflow:hidden;
      font-size:14px;color:var(--text2);line-height:1.75;
      transition:max-height 0.35s ease,padding 0.35s ease;
    }
    .faq-a.open{max-height:300px;padding:0 20px 18px}
    @media(max-width:640px){.faq-section{padding:60px 20px}}

    /* ═══════════════════════════════════════════
       FINAL CTA
    ═══════════════════════════════════════════ */
    .cta-section{
      padding:90px 40px;
      text-align:center;
      position:relative;overflow:hidden;
    }
    .cta-glow{
      position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(ellipse 700px 400px at 50% 50%,rgba(255,109,0,0.08) 0%,transparent 70%);
    }
    .cta-section h2{
      font-size:clamp(30px,4.5vw,52px);
      font-weight:900;
      letter-spacing:-1.5px;
      margin-bottom:16px;
      position:relative;
    }
    .cta-section p{
      font-size:17px;color:var(--text2);
      max-width:480px;margin:0 auto 36px;
      line-height:1.75;position:relative;
    }
    .cta-btns{
      display:flex;flex-wrap:wrap;gap:12px;
      justify-content:center;position:relative;
    }
    @media(max-width:640px){.cta-section{padding:70px 20px}}

    /* ═══════════════════════════════════════════
       TRUST BAR
    ═══════════════════════════════════════════ */
    .trust-bar{
      background:var(--surface);
      border-top:1px solid var(--border);
      padding:32px 24px;
    }
    .trust-inner{
      max-width:960px;margin:0 auto;
      display:flex;flex-wrap:wrap;gap:0;
      justify-content:center;
    }
    .trust-item{
      flex:1;min-width:180px;
      display:flex;align-items:center;gap:12px;
      padding:12px 20px;
      position:relative;
    }
    .trust-item:not(:last-child)::after{
      content:'';
      position:absolute;right:0;top:15%;bottom:15%;
      width:1px;background:var(--border);
    }
    .trust-icon{
      width:40px;height:40px;flex-shrink:0;
      border-radius:11px;
      background:rgba(255,109,0,0.1);
      border:1px solid rgba(255,109,0,0.18);
      display:flex;align-items:center;justify-content:center;
      font-size:17px;color:var(--orange);
    }
    .trust-text .trust-title{font-size:13px;font-weight:800;color:var(--text)}
    .trust-text .trust-sub{font-size:11px;color:var(--text2);margin-top:2px}
    @media(max-width:768px){
      .trust-item::after{display:none}
      .trust-inner{gap:8px}
    }

    /* ═══════════════════════════════════════════
       FOOTER
    ═══════════════════════════════════════════ */
    .footer{
      background:rgba(0,0,0,0.4);
      border-top:1px solid var(--border);
      padding:40px 40px 32px;
      text-align:center;
    }
    .footer-logo{
      font-size:22px;font-weight:900;
      display:flex;align-items:center;gap:8px;
      justify-content:center;margin-bottom:16px;
    }
    .footer-logo .logo-icon{
      width:34px;height:34px;
      background:linear-gradient(135deg,var(--orange),var(--orange2));
      border-radius:9px;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
    }
    .footer-logo b{color:var(--orange)}
    .footer-links{
      display:flex;flex-wrap:wrap;gap:20px;
      justify-content:center;margin:16px 0;
    }
    .footer-links a{
      font-size:13px;font-weight:600;
      color:var(--text2);
      transition:color 0.2s;
    }
    .footer-links a:hover{color:var(--orange)}
    .footer-copy{font-size:12px;color:var(--text3)}
    @media(max-width:640px){.footer{padding:32px 20px}}

    /* ═══════════════════════════════════════════
       MODAL
    ═══════════════════════════════════════════ */
    .modal-bg{
      position:fixed;inset:0;z-index:9000;
      background:rgba(0,0,0,0.75);
      display:none;align-items:center;justify-content:center;
      padding:20px;
    }
    .modal-bg.open{display:flex}
    .modal-box{
      background:#0D1929;
      border:1px solid var(--border2);
      border-radius:26px;
      padding:32px;
      width:100%;max-width:420px;
      position:relative;
      animation:modalIn 0.28s ease;
    }
    @keyframes modalIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
    .modal-close{
      position:absolute;top:16px;right:16px;
      width:30px;height:30px;border-radius:50%;
      background:rgba(255,255,255,0.07);border:none;
      color:var(--text2);font-size:14px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:background 0.2s;
    }
    .modal-close:hover{background:rgba(255,255,255,0.14);color:var(--text)}
    .modal-header{text-align:center;margin-bottom:24px}
    .modal-header h3{font-size:20px;font-weight:900;margin-bottom:4px}
    .modal-price{font-size:42px;font-weight:900;color:var(--orange)}
    .modal-price sup{font-size:18px;vertical-align:super}
    .modal-price sub{font-size:14px;vertical-align:bottom;color:var(--text2);font-weight:600}
    .field-label{
      font-size:10.5px;font-weight:800;text-transform:uppercase;
      letter-spacing:0.6px;color:var(--text2);margin-bottom:6px;
      display:block;
    }
    .field-input{
      width:100%;padding:12px 14px;margin-bottom:13px;
      background:rgba(255,255,255,0.05);
      border:1.5px solid var(--border);
      border-radius:11px;
      color:var(--text);font-family:'Inter',sans-serif;
      font-size:14px;font-weight:500;outline:none;
      transition:border-color 0.2s;
    }
    .field-input:focus{border-color:var(--orange)}
    .field-input::placeholder{color:var(--text3)}
    .field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .section-label-sm{
      font-size:10px;font-weight:800;text-transform:uppercase;
      letter-spacing:0.8px;color:var(--text2);
      margin:14px 0 10px;
    }
    .btn-pay{
      width:100%;padding:14px;margin-top:6px;
      background:linear-gradient(135deg,var(--orange),var(--orange2));
      border:none;border-radius:12px;
      color:#fff;font-family:'Inter',sans-serif;
      font-size:15px;font-weight:800;
      cursor:pointer;
      display:flex;align-items:center;justify-content:center;gap:8px;
      box-shadow:0 4px 20px rgba(255,109,0,0.4);
      transition:transform 0.15s,box-shadow 0.15s;
    }
    .btn-pay:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(255,109,0,0.5)}
    .btn-pay:disabled{opacity:0.6;cursor:not-allowed;transform:none}
    .pay-security{
      display:flex;align-items:center;justify-content:center;gap:6px;
      margin-top:10px;font-size:11px;color:var(--text3);
    }
    .pay-security i{color:var(--green)}
    .pay-result{display:none;text-align:center;padding:20px 0}
    .pay-result.success{display:block}
    .pay-result i{font-size:52px;color:var(--green);margin-bottom:14px;display:block}
    .pay-result h3{font-size:20px;font-weight:800;margin-bottom:8px}
    .pay-result p{font-size:14px;color:var(--text2);line-height:1.6}

    /* ═══════════════════════════════════════════
       SCROLL REVEAL
    ═══════════════════════════════════════════ */
    .reveal{opacity:0;transform:translateY(24px);transition:opacity 0.6s ease,transform 0.6s ease}
    .reveal.visible{opacity:1;transform:translateY(0)}
  </style>
</head>
<body>

<!-- ━━━━━━━━━━━━━━━━━ NAVBAR ━━━━━━━━━━━━━━━━━ -->
<nav class="navbar">
  <div class="navbar-logo">
    <div class="navbar-logo-icon">⛽</div>
    <div class="navbar-logo-text">Rota<b>Posto</b></div>
  </div>
  <div class="navbar-links">
    <a href="#funcionalidades">Funcionalidades</a>
    <a href="#como-funciona">Como Funciona</a>
    <a href="#pricing">Planos</a>
    <a href="#faq">FAQ</a>
  </div>
  <div class="navbar-cta">
    <button class="btn-nav-ghost" onclick="abrirLogin('entrar')">Entrar</button>
    <button class="btn-nav-primary" onclick="abrirLogin('comecar')">Cadastre-se agora</button>
  </div>
</nav>

<!-- ━━━━━━━━━━━━━━━━━ TICKER ━━━━━━━━━━━━━━━━━ -->
<div class="ticker-bar">
  <div class="ticker-track">
    <span class="ticker-item">⛽ Gasolina a partir de R$5,67<span class="ticker-dot">•</span></span>
    <span class="ticker-item">🌿 Etanol a partir de R$3,89<span class="ticker-dot">•</span></span>
    <span class="ticker-item">🚛 Diesel S10 a partir de R$6,19<span class="ticker-dot">•</span></span>
    <span class="ticker-item">💨 GNV a partir de R$4,49<span class="ticker-dot">•</span></span>
    <span class="ticker-item">💰 Economize até R$0,80/L escolhendo o posto certo<span class="ticker-dot">•</span></span>
    <span class="ticker-item">📍 46.071 postos mapeados no Brasil<span class="ticker-dot">•</span></span>
    <span class="ticker-item">📊 Dados oficiais ANP — Semana 21–27 Jun 2026<span class="ticker-dot">•</span></span>
    <span class="ticker-item">⛽ Gasolina a partir de R$5,67<span class="ticker-dot">•</span></span>
    <span class="ticker-item">🌿 Etanol a partir de R$3,89<span class="ticker-dot">•</span></span>
    <span class="ticker-item">🚛 Diesel S10 a partir de R$6,19<span class="ticker-dot">•</span></span>
    <span class="ticker-item">💨 GNV a partir de R$4,49<span class="ticker-dot">•</span></span>
    <span class="ticker-item">💰 Economize até R$0,80/L escolhendo o posto certo<span class="ticker-dot">•</span></span>
    <span class="ticker-item">📍 46.071 postos mapeados no Brasil<span class="ticker-dot">•</span></span>
    <span class="ticker-item">📊 Dados oficiais ANP — Semana 21–27 Jun 2026<span class="ticker-dot">•</span></span>
  </div>
</div>

<!-- ━━━━━━━━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━━━ -->
<div class="hero-bg-glow"></div>
<div style="max-width:1200px;margin:0 auto;position:relative">
  <div class="hero-map-grid"></div>
</div>

<section class="hero">
  <!-- HERO LEFT -->
  <div class="hero-left">
    <div class="hero-eyebrow">
      <div class="dot"></div>
      ECONOMIZE SEMPRE
    </div>

    <h1 class="hero-h1">
      O caminho<br/>
      <span class="hl">mais inteligente</span><br/>
      para economizar<br/>
      combustível
    </h1>

    <div class="hero-bullets">
      <div class="hero-bullet">
        <div class="hero-bullet-icon"><i class="fas fa-map-marker-alt"></i></div>
        Encontre os melhores preços perto de você
      </div>
      <div class="hero-bullet">
        <div class="hero-bullet-icon"><i class="fas fa-exchange-alt"></i></div>
        Compare e economize em cada abastecimento
      </div>
      <div class="hero-bullet">
        <div class="hero-bullet-icon"><i class="fas fa-route"></i></div>
        Rota rápida e precisa até o posto escolhido
      </div>
      <div class="hero-bullet">
        <div class="hero-bullet-icon"><i class="fas fa-chart-line"></i></div>
        Histórico de gastos e relatórios completos
      </div>
    </div>

    <div class="hero-ctas">
      <button class="btn-cta-primary" onclick="abrirLogin('comecar')">
        <i class="fas fa-rocket"></i> Cadastre-se agora
      </button>
      <button class="btn-cta-secondary" onclick="abrirLogin('entrar')">
        <i class="fas fa-user"></i> Já tenho uma conta
      </button>
    </div>

    <div class="store-badges">
      <a class="store-badge" href="#" aria-label="Disponível no Google Play">
        <span class="badge-icon">▶️</span>
        <span class="store-badge-text">
          <span class="badge-sub">DISPONÍVEL NO</span>
          <span class="badge-name">Google Play</span>
        </span>
      </a>
      <a class="store-badge" href="#" aria-label="Disponível na App Store">
        <span class="badge-icon">🍎</span>
        <span class="store-badge-text">
          <span class="badge-sub">Disponível na</span>
          <span class="badge-name">App Store</span>
        </span>
      </a>
    </div>
  </div>

  <!-- HERO RIGHT — PHONE MOCKUPS -->
  <div class="hero-right">
    <div class="phones-container">

      <!-- BACK PHONE — Lista de postos -->
      <div class="ph ph-back">
        <div class="ph-screen">
          <div class="ph-statusbar">
            <span>9:41</span><span>▼ ◀ ██</span>
          </div>
          <div class="ph-topbar">
            <div class="ph-topbar-logo">Rota<span>Posto</span></div>
            <div style="display:flex;gap:6px">
              <div class="ph-topbar-icon">🔔</div>
            </div>
          </div>
          <div class="ph-fuel-tabs">
            <div class="ph-fuel-tab active">Gasolina</div>
            <div class="ph-fuel-tab">Etanol</div>
            <div class="ph-fuel-tab">Diesel</div>
            <div class="ph-fuel-tab">GNV</div>
          </div>
          <div class="ph-station">
            <div class="ph-station-logo" style="background:linear-gradient(135deg,#F7C948,#F39200)">S</div>
            <div class="ph-station-info">
              <div class="ph-station-name">Posto Shell</div>
              <div class="ph-station-dist">1,2 km · 3 min</div>
              <div class="ph-station-stars">★★★★★</div>
            </div>
            <div class="ph-station-price">
              <div class="price">R$ 5,67</div>
              <div class="badge">MELHOR PREÇO</div>
            </div>
          </div>
          <div class="ph-station">
            <div class="ph-station-logo" style="background:linear-gradient(135deg,#F7941D,#E05A00)">I</div>
            <div class="ph-station-info">
              <div class="ph-station-name">Posto Ipiranga</div>
              <div class="ph-station-dist">1,4 km · 4 min</div>
              <div class="ph-station-stars">★★★★☆</div>
            </div>
            <div class="ph-station-price">
              <div class="price" style="font-size:11px;color:var(--text2)">R$ 5,74</div>
            </div>
          </div>
          <div class="ph-station">
            <div class="ph-station-logo" style="background:linear-gradient(135deg,#1B5E20,#388E3C)">BR</div>
            <div class="ph-station-info">
              <div class="ph-station-name">Posto BR</div>
              <div class="ph-station-dist">1,6 km · 5 min</div>
              <div class="ph-station-stars">★★★★☆</div>
            </div>
            <div class="ph-station-price">
              <div class="price" style="font-size:11px;color:var(--text2)">R$ 5,79</div>
            </div>
          </div>
          <div class="ph-bottom-nav">
            <div class="ph-nav-item"><i class="fas fa-trophy"></i>Melhor</div>
            <div class="ph-nav-item active"><i class="fas fa-list"></i>Lista</div>
            <div class="ph-nav-item"><i class="fas fa-map"></i>Mapa</div>
            <div class="ph-nav-item"><i class="fas fa-route"></i>Planejar</div>
          </div>
        </div>
      </div>

      <!-- MAIN PHONE — Mapa com preços -->
      <div class="ph ph-main">
        <div class="ph-screen">
          <div class="ph-statusbar">
            <span>9:41</span><span>▼ ◀ ██</span>
          </div>
          <div class="ph-topbar">
            <div class="ph-topbar-logo">Rota<span>Posto</span></div>
            <div style="display:flex;gap:6px">
              <div class="ph-topbar-icon" style="position:relative">
                🔔
                <span style="position:absolute;top:-2px;right:-2px;width:7px;height:7px;background:var(--orange);border-radius:50%;border:1.5px solid var(--bg2)"></span>
              </div>
            </div>
          </div>
          <!-- Search bar -->
          <div style="padding:8px 10px;background:var(--surface);border-bottom:1px solid var(--border)">
            <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:7px 10px;display:flex;align-items:center;gap:6px">
              <i class="fas fa-search" style="font-size:9px;color:var(--text2)"></i>
              <span style="font-size:9.5px;color:var(--text2)">Buscar cidade ou endereço</span>
            </div>
          </div>
          <!-- Map -->
          <div class="ph-map">
            <div class="ph-map-roads"></div>
            <!-- Roads -->
            <div class="ph-road" style="width:100%;top:35%;left:0;transform:rotate(-8deg)"></div>
            <div class="ph-road" style="width:60%;top:60%;left:20%;transform:rotate(5deg)"></div>
            <div class="ph-road" style="width:2px;height:100%;top:0;left:40%;background:rgba(255,255,255,0.08)"></div>
            <!-- Neighborhoods -->
            <div style="position:absolute;top:10%;left:5%;font-size:7px;color:rgba(255,255,255,0.25);font-weight:700;letter-spacing:0.5px">VILA MADALENA</div>
            <div style="position:absolute;top:55%;left:60%;font-size:7px;color:rgba(255,255,255,0.25);font-weight:700;letter-spacing:0.5px">JARDINS</div>
            <div style="position:absolute;top:75%;left:10%;font-size:7px;color:rgba(255,255,255,0.25);font-weight:700;letter-spacing:0.5px">PINHEIROS</div>
            <div style="position:absolute;bottom:18%;left:50%;font-size:7px;color:rgba(255,255,255,0.25);font-weight:700;letter-spacing:0.5px">MOEMA</div>
            <!-- Price bubbles -->
            <div class="ph-bubble green" style="top:15%;left:8%">R$ 5,67</div>
            <div class="ph-bubble orange" style="top:12%;right:12%">R$ 5,79</div>
            <div class="ph-bubble gray" style="top:40%;left:5%">R$ 5,89</div>
            <div class="ph-bubble orange" style="top:50%;right:8%">R$ 5,74</div>
            <div class="ph-bubble green" style="bottom:20%;left:12%">R$ 5,63</div>
            <!-- User dot -->
            <div class="ph-user-dot" style="top:45%;left:45%"></div>
          </div>
          <div class="ph-fuel-tabs">
            <div class="ph-fuel-tab active">Gasolina</div>
            <div class="ph-fuel-tab">Etanol</div>
            <div class="ph-fuel-tab">Diesel</div>
            <div class="ph-fuel-tab">GNV</div>
          </div>
          <div class="ph-bottom-nav">
            <div class="ph-nav-item active"><i class="fas fa-trophy"></i>Melhor</div>
            <div class="ph-nav-item"><i class="fas fa-list"></i>Lista</div>
            <div class="ph-nav-item"><i class="fas fa-map"></i>Mapa</div>
            <div class="ph-nav-item"><i class="fas fa-route"></i>Planejar</div>
            <div class="ph-nav-item"><i class="fas fa-user"></i>Perfil</div>
          </div>
        </div>
      </div>

      <!-- Floating chips -->
      <div class="float-chip fc-economy">
        💰 Economia: <strong style="color:#22C55E">R$ 0,80/L</strong>
      </div>
      <div class="float-chip fc-dist">
        📍 <strong>1,2 km</strong> · 3 min
      </div>

    </div>
  </div>
</section>

<!-- ━━━━━━━━━━━━━━━━━ STATS BAND ━━━━━━━━━━━━━━━━━ -->
<div class="stats-band">
  <div class="stats-inner">
    <div class="stat-item reveal">
      <div class="stat-num">46K+</div>
      <div class="stat-label">Postos no Brasil</div>
    </div>
    <div class="stat-item reveal">
      <div class="stat-num">R$0,80</div>
      <div class="stat-label">Economia/Litro</div>
    </div>
    <div class="stat-item reveal">
      <div class="stat-num">7</div>
      <div class="stat-label">Tipos de Combustível</div>
    </div>
    <div class="stat-item reveal">
      <div class="stat-num">100%</div>
      <div class="stat-label">Dados Oficiais ANP</div>
    </div>
  </div>
</div>

<!-- ━━━━━━━━━━━━━━━━━ FEATURES ━━━━━━━━━━━━━━━━━ -->
<section class="features-section" id="funcionalidades">
  <div class="section-label reveal"><i class="fas fa-star"></i> Funcionalidades</div>
  <h2 class="section-title reveal">Tudo o que você precisa<br/>para economizar sempre</h2>
  <p class="section-sub reveal">Do preço mais baixo à rota inteligente — tudo num só lugar.</p>

  <div class="feat-grid">

    <!-- Card 1: Melhores preços -->
    <div class="feat-card reveal">
      <div class="feat-screen fs-prices">
        <div class="fs-header" style="background:var(--surface);padding:10px 12px 8px;border-bottom:1px solid var(--border)">
          <div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.6);margin-bottom:2px">← Detalhes do posto</div>
        </div>
        <!-- Station header -->
        <div style="padding:10px 12px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#F7C948,#F39200);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff">S</div>
            <div>
              <div style="font-size:11px;font-weight:800;color:var(--text)">Posto Shell</div>
              <div style="font-size:8.5px;color:var(--text2)">Av. Rebouças, 1234 · Pinheiros</div>
              <div style="font-size:7.5px;color:var(--orange3)">★★★★★ <span style="color:var(--text2)">(128 avaliações)</span></div>
            </div>
          </div>
          <div style="background:rgba(255,109,0,0.12);border:1px solid rgba(255,109,0,0.2);border-radius:10px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:7.5px;color:var(--text2);font-weight:600">Gasolina Comum</div>
              <div style="font-size:20px;font-weight:900;color:var(--orange);line-height:1">R$ 5,67</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:7.5px;color:var(--text2)">📍 1,2 km</div>
              <div style="font-size:7.5px;color:var(--text2)">⏱ 3 min</div>
            </div>
          </div>
        </div>
        <!-- Prices list -->
        <div style="padding:6px 12px">
          <div style="font-size:8.5px;font-weight:700;color:var(--text2);margin-bottom:6px">Preços dos combustíveis</div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:9px;color:var(--text2)">Gasolina Comum</span>
            <span style="font-size:9px;font-weight:800;color:var(--text)">R$ 5,67</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:9px;color:var(--text2)">Etanol</span>
            <span style="font-size:9px;font-weight:800;color:var(--text)">R$ 3,89</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0">
            <span style="font-size:9px;color:var(--text2)">Diesel S10</span>
            <span style="font-size:9px;font-weight:800;color:var(--text)">R$ 6,19</span>
          </div>
        </div>
      </div>
      <div class="feat-body">
        <h3>Melhores preços</h3>
        <p>Encontre o menor preço perto de você com dados reais da ANP, atualizados semanalmente para todo o Brasil.</p>
      </div>
    </div>

    <!-- Card 2: Mapa inteligente -->
    <div class="feat-card reveal">
      <div class="feat-screen">
        <!-- Map header -->
        <div style="background:var(--surface);padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:5px 9px;display:flex;align-items:center;gap:5px;flex:1;margin-right:8px">
            <i class="fas fa-search" style="font-size:8px;color:var(--text2)"></i>
            <span style="font-size:8.5px;color:var(--text2)">Buscar nesta área</span>
          </div>
          <div style="width:26px;height:26px;background:var(--surface2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px">🎯</div>
        </div>
        <!-- Map with price bubbles -->
        <div class="fs-map" style="height:140px">
          <div class="fs-map-grid"></div>
          <div style="position:absolute;top:3%;left:3%;font-size:7px;color:rgba(255,255,255,0.2);font-weight:700">PINHEIROS</div>
          <div style="position:absolute;bottom:5%;right:5%;font-size:7px;color:rgba(255,255,255,0.2);font-weight:700">JARDINS</div>
          <!-- Roads -->
          <div style="position:absolute;width:100%;height:1.5px;background:rgba(255,255,255,0.07);top:40%;left:0;transform:rotate(-5deg)"></div>
          <div style="position:absolute;width:1.5px;height:100%;background:rgba(255,255,255,0.07);top:0;left:45%"></div>
          <div class="fs-map .mb g" style="position:absolute;top:15%;left:10%;padding:4px 8px;background:var(--green);border-radius:10px;font-size:9px;font-weight:800;color:#fff">R$ 5,67</div>
          <div class="fs-map .mb o" style="position:absolute;top:10%;right:12%;padding:4px 8px;background:var(--orange);border-radius:10px;font-size:9px;font-weight:800;color:#fff">R$ 5,79</div>
          <div class="fs-map .mb r" style="position:absolute;top:50%;left:5%;padding:4px 8px;background:rgba(255,255,255,0.15);border-radius:10px;font-size:9px;font-weight:800;color:#fff;backdrop-filter:blur(4px)">R$ 5,89</div>
          <div class="fs-map .mb o" style="position:absolute;bottom:22%;right:8%;padding:4px 8px;background:var(--orange);border-radius:10px;font-size:9px;font-weight:800;color:#fff">R$ 5,74</div>
          <div class="fs-map .udot" style="position:absolute;top:45%;left:42%;width:10px;height:10px;border-radius:50%;background:#3B82F6;border:2px solid #fff;box-shadow:0 0 0 5px rgba(59,130,246,0.2)"></div>
        </div>
        <!-- Best nearby bar -->
        <div style="margin:8px 10px;background:linear-gradient(135deg,rgba(255,109,0,0.12),rgba(255,109,0,0.04));border:1px solid rgba(255,109,0,0.2);border-radius:10px;padding:8px 10px;display:flex;align-items:center;gap:8px">
          <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#F7C948,#F39200);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;flex-shrink:0">S</div>
          <div style="flex:1">
            <div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.3px">Melhor posto próximo</div>
            <div style="font-size:10px;font-weight:800;color:var(--text)">Posto Shell · R$ 5,67/L</div>
          </div>
          <div style="font-size:9px;font-weight:800;color:var(--orange)">→</div>
        </div>
      </div>
      <div class="feat-body">
        <h3>Mapa inteligente</h3>
        <p>Visualize todos os postos no mapa com os preços direto nos pins. Toque para ver todos os combustíveis disponíveis.</p>
      </div>
    </div>

    <!-- Card 3: Planeje sua rota -->
    <div class="feat-card reveal">
      <div class="feat-screen">
        <div class="fs-route-header">← Planejar rota</div>
        <!-- Route info -->
        <div style="padding:8px 12px;border-bottom:1px solid var(--border)">
          <div style="display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;align-items:center;gap:7px;background:var(--surface);border-radius:8px;padding:5px 8px">
              <div style="width:8px;height:8px;border-radius:50%;background:#3B82F6;border:1.5px solid #fff;flex-shrink:0"></div>
              <span style="font-size:8.5px;color:var(--text2)">Minha localização</span>
            </div>
            <div style="display:flex;align-items:center;gap:7px;background:var(--surface);border-radius:8px;padding:5px 8px">
              <div style="width:8px;height:8px;border-radius:50%;background:var(--orange);flex-shrink:0"></div>
              <span style="font-size:8.5px;color:var(--text)">Posto Shell · Av. Rebouças</span>
            </div>
          </div>
        </div>
        <!-- Route map -->
        <div class="fs-route-map">
          <div class="rg"></div>
          <div class="fs-route-line"></div>
          <div class="fs-route-start"></div>
          <div class="fs-route-end" style="font-size:14px">📍</div>
        </div>
        <!-- Distance/time -->
        <div style="display:flex;gap:0;background:var(--surface);border-top:1px solid var(--border)">
          <div style="flex:1;text-align:center;padding:8px;border-right:1px solid var(--border)">
            <div style="font-size:16px;font-weight:900;color:var(--orange)">1,2 km</div>
            <div style="font-size:8px;color:var(--text2);font-weight:600">DISTÂNCIA</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px">
            <div style="font-size:16px;font-weight:900;color:var(--orange)">3 min</div>
            <div style="font-size:8px;color:var(--text2);font-weight:600">TEMPO</div>
          </div>
        </div>
        <!-- CTA button -->
        <div style="margin:8px 10px">
          <div style="background:var(--orange);border-radius:9px;padding:7px;text-align:center;font-size:9.5px;font-weight:800;color:#fff">
            <i class="fas fa-navigation"></i> Iniciar navegação
          </div>
        </div>
      </div>
      <div class="feat-body">
        <h3>Planeje sua rota</h3>
        <p>Trace a rota mais eficiente até o posto mais barato. Rota rápida e segura integrada ao seu navegador preferido.</p>
      </div>
    </div>

    <!-- Card 4: Histórico e relatórios -->
    <div class="feat-card reveal">
      <div class="feat-screen">
        <div style="background:var(--surface);padding:9px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)">
          <div style="font-size:10px;font-weight:800;color:var(--text)">Meus relatórios</div>
          <div style="display:flex;gap:4px">
            <div style="padding:2px 7px;border-radius:6px;font-size:8px;font-weight:700;color:var(--text2);background:transparent;border:1px solid var(--border)">Sem</div>
            <div style="padding:2px 7px;border-radius:6px;font-size:8px;font-weight:700;color:#fff;background:var(--orange);border:1px solid var(--orange)">Mês</div>
            <div style="padding:2px 7px;border-radius:6px;font-size:8px;font-weight:700;color:var(--text2);background:transparent;border:1px solid var(--border)">Ano</div>
          </div>
        </div>
        <!-- Period -->
        <div style="padding:6px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:8.5px;font-weight:700;color:var(--text2)">Janeiro 2024</span>
          <span style="font-size:8.5px;color:var(--orange)">→</span>
        </div>
        <!-- Total saved -->
        <div style="text-align:center;padding:12px 12px 8px;border-bottom:1px solid var(--border)">
          <div style="font-size:8.5px;color:var(--text2);font-weight:600;margin-bottom:3px">Total economizado</div>
          <div style="font-size:26px;font-weight:900;color:var(--green);line-height:1">R$ 289,60</div>
        </div>
        <!-- Stats 2x2 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border)">
          <div style="background:var(--bg2);padding:8px 10px;text-align:center">
            <div style="font-size:13px;font-weight:900;color:var(--text)">8</div>
            <div style="font-size:7.5px;color:var(--text2)">Abastecimentos</div>
          </div>
          <div style="background:var(--bg2);padding:8px 10px;text-align:center">
            <div style="font-size:13px;font-weight:900;color:var(--text)">R$ 412,30</div>
            <div style="font-size:7.5px;color:var(--text2)">Gasto total</div>
          </div>
          <div style="background:var(--bg2);padding:8px 10px;text-align:center">
            <div style="font-size:13px;font-weight:900;color:var(--green)">R$ 0,36</div>
            <div style="font-size:7.5px;color:var(--text2)">Economia/litro</div>
          </div>
          <div style="background:var(--bg2);padding:8px 10px;text-align:center">
            <div style="font-size:13px;font-weight:900;color:var(--orange)">Shell</div>
            <div style="font-size:7.5px;color:var(--text2)">Posto favorito</div>
          </div>
        </div>
      </div>
      <div class="feat-body">
        <h3>Histórico e relatórios</h3>
        <p>Acompanhe seus gastos e economias com relatórios mensais. Saiba exatamente quanto você economizou.</p>
      </div>
    </div>

  </div>
</section>

<!-- ━━━━━━━━━━━━━━━━━ HOW IT WORKS ━━━━━━━━━━━━━━━━━ -->
<div class="how-section" id="como-funciona">
  <div class="how-inner">
    <div class="section-label reveal"><i class="fas fa-play-circle"></i> Simples assim</div>
    <h2 class="section-title reveal">Como funciona</h2>
    <p class="section-sub reveal">Em menos de 30 segundos você já sabe onde abastecer e quanto vai economizar.</p>
    <div class="how-grid">
      <div class="steps-list">
        <div class="step reveal">
          <div class="step-num">1</div>
          <div class="step-body">
            <h3>Cadastre-se e permita a localização</h3>
            <p>Crie sua conta em segundos e permita o acesso à localização para encontrar os postos mais próximos de você.</p>
          </div>
        </div>
        <div class="step reveal">
          <div class="step-num">2</div>
          <div class="step-body">
            <h3>Configure seu veículo</h3>
            <p>Informe o tipo de veículo e o tamanho do tanque para calcular sua economia real em cada abastecimento.</p>
          </div>
        </div>
        <div class="step reveal">
          <div class="step-num">3</div>
          <div class="step-body">
            <h3>Escolha o combustível e compare</h3>
            <p>Selecione o combustível desejado. O app ordena os postos do mais barato ao mais caro com a economia em reais.</p>
          </div>
        </div>
        <div class="step reveal">
          <div class="step-num">4</div>
          <div class="step-body">
            <h3>Vá ao posto e economize</h3>
            <p>Toque em "Ir até lá" e siga a rota. Chegue ao posto com o menor preço e economize de verdade no seu dia a dia.</p>
          </div>
        </div>
      </div>
      <!-- Mini phone illustration -->
      <div class="how-phone-wrap">
        <div class="how-phone">
          <div style="background:var(--bg2)">
            <div class="ph-statusbar">
              <span>9:41</span><span>▼ ◀ ██</span>
            </div>
            <div class="how-screen-header">
              <div class="how-screen-logo">Rota<b>Posto</b></div>
              <div style="margin-left:auto;display:flex;gap:6px">
                <div class="ph-topbar-icon">🔔</div>
              </div>
            </div>
            <div class="how-screen-map">
              <div class="how-map-grid"></div>
              <div style="position:absolute;top:15%;left:12%;padding:5px 9px;background:var(--green);border-radius:10px;font-size:10px;font-weight:800;color:#fff">R$ 5,67</div>
              <div style="position:absolute;top:10%;right:10%;padding:5px 9px;background:var(--orange);border-radius:10px;font-size:10px;font-weight:800;color:#fff">R$ 5,74</div>
              <div style="position:absolute;top:50%;left:5%;padding:5px 9px;background:rgba(255,255,255,0.15);border-radius:10px;font-size:10px;font-weight:800;color:#fff;backdrop-filter:blur(4px)">R$ 5,89</div>
              <div style="position:absolute;bottom:25%;right:10%;padding:5px 9px;background:var(--orange);border-radius:10px;font-size:10px;font-weight:800;color:#fff">R$ 5,79</div>
              <div style="position:absolute;top:40%;left:45%;width:12px;height:12px;border-radius:50%;background:#3B82F6;border:2px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,0.22)"></div>
            </div>
            <div class="how-best-bar">
              <div class="how-best-logo">S</div>
              <div class="how-best-info">
                <div class="how-best-name">Posto Shell</div>
                <div class="how-best-addr">1,2 km · 3 min</div>
              </div>
              <div class="how-best-price">R$ 5,67</div>
            </div>
            <button class="how-goto-btn">
              <i class="fas fa-directions"></i> Ir até lá
            </button>
            <div class="ph-bottom-nav">
              <div class="ph-nav-item active"><i class="fas fa-trophy"></i>Melhor</div>
              <div class="ph-nav-item"><i class="fas fa-list"></i>Lista</div>
              <div class="ph-nav-item"><i class="fas fa-map"></i>Mapa</div>
              <div class="ph-nav-item"><i class="fas fa-route"></i>Planejar</div>
              <div class="ph-nav-item"><i class="fas fa-user"></i>Perfil</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ━━━━━━━━━━━━━━━━━ TESTIMONIALS ━━━━━━━━━━━━━━━━━ -->
<section class="test-section" id="depoimentos">
  <div class="section-label reveal"><i class="fas fa-comment-alt"></i> Depoimentos</div>
  <h2 class="section-title reveal">O que dizem os motoristas</h2>
  <p class="section-sub reveal">Quem já usa o RotaPosto economiza de verdade todo dia.</p>
  <div class="test-grid">
    <div class="test-card reveal">
      <div class="test-stars">★★★★★</div>
      <p class="test-text">"Economizei R$28 na última vez que abasteci o tanque cheio. O app me mostrou um posto que eu nem sabia que existia a 2km de casa com o preço R$0,56 mais barato."</p>
      <div class="test-author">
        <div class="test-avatar">M</div>
        <div>
          <div class="test-name">Marcos Oliveira</div>
          <div class="test-role">Motorista de app · São Paulo/SP</div>
        </div>
      </div>
    </div>
    <div class="test-card reveal">
      <div class="test-stars">★★★★★</div>
      <p class="test-text">"Faço 3.000km por mês de trabalho. Com o RotaPosto começo a semana sabendo exatamente onde abastecer na rota. Pago o plano em um único abastecimento."</p>
      <div class="test-author">
        <div class="test-avatar">A</div>
        <div>
          <div class="test-name">Ana Souza</div>
          <div class="test-role">Representante Comercial · Campinas/SP</div>
        </div>
      </div>
    </div>
    <div class="test-card reveal">
      <div class="test-stars">★★★★☆</div>
      <p class="test-text">"O alerta de preço é incrível. Recebo notificação quando meu posto favorito baixa o preço. Nunca mais paguei mais caro do que precisava."</p>
      <div class="test-author">
        <div class="test-avatar">R</div>
        <div>
          <div class="test-name">Rafael Costa</div>
          <div class="test-role">Motorista Particular · Rio de Janeiro/RJ</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ━━━━━━━━━━━━━━━━━ PRICING ━━━━━━━━━━━━━━━━━ -->
<div class="pricing-section" id="pricing">
  <div class="pricing-inner">
    <div class="section-label reveal"><i class="fas fa-tag"></i> Planos</div>
    <h2 class="section-title reveal">Simples, sem surpresas</h2>
    <p class="section-sub reveal" style="margin:0 auto 0">Comece grátis, faça upgrade quando quiser.</p>

    <div class="plans-wrap">

      <!-- Free -->
      <div class="plan-card reveal">
        <div class="plan-name">Gratuito</div>
        <div class="plan-price-wrap">
          <span class="plan-cifra">R$</span>
          <span class="plan-valor">0</span>
          <span class="plan-period">/mês</span>
        </div>
        <p class="plan-desc">Para quem quer testar e já economizar algo.</p>
        <ul class="plan-features">
          <li><i class="fas fa-check fi ok"></i> Busca de postos próximos</li>
          <li><i class="fas fa-check fi ok"></i> Mapa interativo</li>
          <li><i class="fas fa-check fi ok"></i> Menor preço do dia</li>
          <li><i class="fas fa-times fi no"></i> <span>Alertas de preço</span></li>
          <li><i class="fas fa-times fi no"></i> <span>Histórico de 30 dias</span></li>
          <li><i class="fas fa-times fi no"></i> <span>Relatórios de economia</span></li>
        </ul>
        <button class="btn-plan sec" onclick="abrirLogin('comecar')">
          <i class="fas fa-play"></i> Começar grátis
        </button>
      </div>

      <!-- Premium -->
      <div class="plan-card popular reveal">
        <div class="plan-badge-pop">⭐ Mais Popular</div>
        <div class="plan-name" style="color:var(--orange)">Premium</div>
        <div class="plan-price-wrap">
          <span class="plan-cifra">R$</span>
          <span class="plan-valor" style="color:var(--orange)">9</span>
          <span class="plan-cents" style="color:var(--orange)">,90</span>
          <span class="plan-period">/mês</span>
        </div>
        <p class="plan-desc">Ideal para quem abastece toda semana e quer economizar de verdade.</p>
        <ul class="plan-features">
          <li><i class="fas fa-check fi ok"></i> Tudo do plano grátis</li>
          <li><i class="fas fa-check fi ok"></i> <strong>Alertas quando o preço cair</strong></li>
          <li><i class="fas fa-check fi ok"></i> <strong>Histórico de 30 dias</strong></li>
          <li><i class="fas fa-check fi ok"></i> <strong>Favoritos ilimitados</strong></li>
          <li><i class="fas fa-check fi ok"></i> <strong>Calculadora avançada</strong></li>
          <li><i class="fas fa-check fi ok"></i> <strong>Suporte prioritário</strong></li>
        </ul>
        <button class="btn-plan pri" onclick="abrirModal('premium')">
          <i class="fas fa-bolt"></i> Assinar por R$9,90/mês
        </button>
        <div class="plan-guarantee">
          <i class="fas fa-shield-alt" style="color:var(--green)"></i>
          7 dias de garantia · Cancele quando quiser
        </div>
      </div>

      <!-- Anual -->
      <div class="plan-card reveal">
        <div class="plan-name">Anual</div>
        <div class="plan-price-wrap">
          <span class="plan-cifra">R$</span>
          <span class="plan-valor">89</span>
          <span class="plan-period">/ano</span>
        </div>
        <p class="plan-desc">Economize 25% pagando o ano inteiro. Equivale a R$7,42/mês.</p>
        <ul class="plan-features">
          <li><i class="fas fa-check fi ok"></i> Tudo do Premium</li>
          <li><i class="fas fa-check fi ok"></i> <strong style="color:var(--orange3)">25% de desconto</strong></li>
          <li><i class="fas fa-check fi ok"></i> Histórico ilimitado</li>
          <li><i class="fas fa-check fi ok"></i> Acesso antecipado a novidades</li>
          <li><i class="fas fa-check fi ok"></i> Relatório mensal de economia</li>
          <li><i class="fas fa-check fi ok"></i> Suporte VIP</li>
        </ul>
        <button class="btn-plan sec" onclick="abrirModal('anual')">
          <i class="fas fa-star"></i> Assinar Anual
        </button>
      </div>

    </div>
    <div style="text-align:center;margin-top:28px;font-size:13px;color:var(--text2);display:flex;align-items:center;justify-content:center;gap:6px">
      <i class="fas fa-lock" style="color:var(--green)"></i>
      Pagamento 100% seguro · Cartão, Pix ou Boleto · Cancele a qualquer momento
    </div>
  </div>
</div>

<!-- ━━━━━━━━━━━━━━━━━ FAQ ━━━━━━━━━━━━━━━━━ -->
<section class="faq-section" id="faq">
  <div class="section-label reveal"><i class="fas fa-question-circle"></i> Dúvidas</div>
  <h2 class="section-title reveal">Perguntas Frequentes</h2>
  <p class="section-sub reveal" style="margin:0 auto">Ainda com dúvidas? A gente responde.</p>
  <div class="faq-list">
    <div class="faq-item reveal">
      <button class="faq-q" onclick="toggleFaq(this)">
        De onde vêm os preços dos postos?
        <i class="fas fa-plus"></i>
      </button>
      <div class="faq-a">
        Os preços são baseados no levantamento semanal oficial da ANP (Agência Nacional do Petróleo, Gás Natural e Biocombustíveis), que coleta dados de mais de 46.000 postos em todo o Brasil. Os dados são atualizados automaticamente toda semana.
      </div>
    </div>
    <div class="faq-item reveal">
      <button class="faq-q" onclick="toggleFaq(this)">
        O cadastro é realmente gratuito?
        <i class="fas fa-plus"></i>
      </button>
      <div class="faq-a">
        Sim! Você cria sua conta sem pagar nada e já tem acesso às funcionalidades básicas. Caso queira recursos avançados como alertas de preço, histórico e relatórios, pode assinar o Premium a partir de R$9,90/mês — quando quiser e sem compromisso.
      </div>
    </div>
    <div class="faq-item reveal">
      <button class="faq-q" onclick="toggleFaq(this)">
        Posso cancelar a assinatura quando quiser?
        <i class="fas fa-plus"></i>
      </button>
      <div class="faq-a">
        Sim! Você pode cancelar a qualquer momento direto no app, sem burocracia. Seu acesso premium continua até o final do período pago. Também oferecemos 7 dias de garantia — se não gostar, devolvemos 100% do valor.
      </div>
    </div>
    <div class="faq-item reveal">
      <button class="faq-q" onclick="toggleFaq(this)">
        O app funciona em todo o Brasil?
        <i class="fas fa-plus"></i>
      </button>
      <div class="faq-a">
        Sim! A ANP coleta dados em mais de 2.000 municípios brasileiros. Capitais e grandes cidades têm cobertura semanal completa. Cidades menores podem ter menos atualizações, mas os preços por UF são sempre exibidos como referência.
      </div>
    </div>
    <div class="faq-item reveal">
      <button class="faq-q" onclick="toggleFaq(this)">
        Quais formas de pagamento são aceitas?
        <i class="fas fa-plus"></i>
      </button>
      <div class="faq-a">
        Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex), Pix e boleto bancário, tudo processado com segurança pelo MercadoPago.
      </div>
    </div>
  </div>
</section>

<!-- ━━━━━━━━━━━━━━━━━ FINAL CTA ━━━━━━━━━━━━━━━━━ -->
<div class="cta-section">
  <div class="cta-glow"></div>
  <div class="section-label reveal" style="display:inline-flex"><i class="fas fa-rocket"></i> Comece hoje</div>
  <h2 class="reveal" style="margin-top:18px">Pare de pagar caro<br/>no combustível</h2>
  <p class="reveal">O brasileiro abastece em média 3 vezes por mês. Com o RotaPosto, você pode economizar R$75 ou mais todo mês — sem esforço.</p>
  <div class="cta-btns reveal">
    <button class="btn-cta-primary" onclick="abrirLogin('comecar')">
      <i class="fas fa-rocket"></i> Cadastre-se agora
    </button>
    <button class="btn-cta-secondary" onclick="abrirLogin('entrar')">
      <i class="fas fa-user"></i> Já tenho uma conta
    </button>
  </div>
</div>

<!-- ━━━━━━━━━━━━━━━━━ TRUST BAR ━━━━━━━━━━━━━━━━━ -->
<div class="trust-bar">
  <div class="trust-inner">
    <div class="trust-item reveal">
      <div class="trust-icon"><i class="fas fa-sync-alt"></i></div>
      <div class="trust-text">
        <div class="trust-title">Atualização diária</div>
        <div class="trust-sub">dos preços</div>
      </div>
    </div>
    <div class="trust-item reveal">
      <div class="trust-icon"><i class="fas fa-database"></i></div>
      <div class="trust-text">
        <div class="trust-title">Dados oficiais</div>
        <div class="trust-sub">da ANP</div>
      </div>
    </div>
    <div class="trust-item reveal">
      <div class="trust-icon"><i class="fas fa-shield-alt"></i></div>
      <div class="trust-text">
        <div class="trust-title">100% seguro</div>
        <div class="trust-sub">e confiável</div>
      </div>
    </div>
    <div class="trust-item reveal">
      <div class="trust-icon"><i class="fas fa-car"></i></div>
      <div class="trust-text">
        <div class="trust-title">Feito para quem</div>
        <div class="trust-sub">dirige e economiza</div>
      </div>
    </div>
  </div>
</div>

<!-- ━━━━━━━━━━━━━━━━━ FOOTER ━━━━━━━━━━━━━━━━━ -->
<footer class="footer">
  <div class="footer-logo">
    <div class="logo-icon">⛽</div>
    Rota<b>Posto</b>
  </div>
  <div class="footer-links">
    <a href="#funcionalidades">Funcionalidades</a>
    <a href="#como-funciona">Como Funciona</a>
    <a href="#pricing">Planos</a>
    <a href="#faq">FAQ</a>
    <a href="/app">Acessar App</a>
    <a href="mailto:contato@rotaposto.com.br">Contato</a>
  </div>
  <p class="footer-copy">© 2026 RotaPosto. Dados fornecidos pela ANP. Mapas por OpenStreetMap.</p>
</footer>

<!-- ━━━━━━━━━━━━━━━━━ MODAL PAGAMENTO ━━━━━━━━━━━━━━━━━ -->
<div class="modal-bg" id="modal-pagamento">
  <div class="modal-box">
    <button class="modal-close" onclick="fecharModal()"><i class="fas fa-times"></i></button>
    <div id="pay-form">
      <div class="modal-header">
        <h3 id="modal-plan-name">RotaPosto Premium</h3>
        <div class="modal-price"><sup>R$</sup><span id="modal-plan-valor">9,90</span><sub>/mês</sub></div>
      </div>
      <div class="section-label-sm">Seus dados</div>
      <label class="field-label">Nome completo</label>
      <input class="field-input" type="text" id="pay-nome" placeholder="João da Silva" autocomplete="name"/>
      <label class="field-label">E-mail</label>
      <input class="field-input" type="email" id="pay-email" placeholder="seu@email.com" autocomplete="email"/>
      <label class="field-label">CPF</label>
      <input class="field-input" type="text" id="pay-cpf" placeholder="000.000.000-00" maxlength="14" oninput="mascaraCPF(this)"/>
      <div class="section-label-sm" style="margin-top:16px">Cartão de crédito</div>
      <label class="field-label">Número do cartão</label>
      <input class="field-input" type="text" id="pay-card" placeholder="0000 0000 0000 0000" maxlength="19" oninput="mascaraCartao(this)"/>
      <div class="field-row">
        <div>
          <label class="field-label">Validade</label>
          <input class="field-input" type="text" id="pay-validade" placeholder="MM/AA" maxlength="5" oninput="mascaraValidade(this)"/>
        </div>
        <div>
          <label class="field-label">CVV</label>
          <input class="field-input" type="text" id="pay-cvv" placeholder="123" maxlength="4"/>
        </div>
      </div>
      <button class="btn-pay" id="btn-pagar" onclick="processarPagamento()">
        <i class="fas fa-lock"></i> Pagar R$<span id="btn-valor">9,90</span>
      </button>
      <div class="pay-security">
        <i class="fas fa-shield-alt"></i> Pagamento 100% seguro via MercadoPago
      </div>
    </div>
    <div class="pay-result" id="pay-success">
      <i class="fas fa-check-circle"></i>
      <h3>Assinatura confirmada! 🎉</h3>
      <p>Bem-vindo ao RotaPosto Premium!<br/>Você já pode acessar todas as funcionalidades.</p>
      <br/>
      <button class="btn-cta-primary" style="width:100%;justify-content:center;margin-top:8px" onclick="window.location.href='/app'">
        <i class="fas fa-rocket"></i> Acessar o App
      </button>
    </div>
  </div>
</div>

<script>
// ── PLANO ────────────────────────────────────────────────────────────────────
let planoAtual = 'premium';
const planos = {
  premium: { nome: 'RotaPosto Premium', valor: '9,90', valorNum: 9.90 },
  anual:   { nome: 'RotaPosto Anual',   valor: '89,00', valorNum: 89.00 }
};

function abrirModal(plano) {
  planoAtual = plano;
  const p = planos[plano];
  document.getElementById('modal-plan-name').textContent = p.nome;
  document.getElementById('modal-plan-valor').textContent = p.valor;
  document.getElementById('btn-valor').textContent = p.valor;
  document.getElementById('pay-form').style.display = 'block';
  document.getElementById('pay-success').classList.remove('success');
  document.getElementById('modal-pagamento').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  document.getElementById('modal-pagamento').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('modal-pagamento').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});

// ── MÁSCARAS ─────────────────────────────────────────────────────────────────
function mascaraCPF(el) {
  let v = el.value.replace(/\\D/g,'');
  if (v.length > 11) v = v.substring(0,11);
  v = v.replace(/(\\d{3})(\\d)/,'$1.$2');
  v = v.replace(/(\\d{3})(\\d)/,'$1.$2');
  v = v.replace(/(\\d{3})(\\d{1,2})$/,'$1-$2');
  el.value = v;
}
function mascaraCartao(el) {
  let v = el.value.replace(/\\D/g,'').substring(0,16);
  v = v.replace(/(\\d{4})/g,'$1 ').trim();
  el.value = v;
}
function mascaraValidade(el) {
  let v = el.value.replace(/\\D/g,'').substring(0,4);
  if (v.length >= 3) v = v.substring(0,2) + '/' + v.substring(2);
  el.value = v;
}

// ── PAGAMENTO ─────────────────────────────────────────────────────────────────
async function processarPagamento() {
  const nome  = document.getElementById('pay-nome').value.trim();
  const email = document.getElementById('pay-email').value.trim();
  const cpf   = document.getElementById('pay-cpf').value.replace(/\\D/g,'');
  const card  = document.getElementById('pay-card').value.replace(/\\s/g,'');
  const val   = document.getElementById('pay-validade').value;
  const cvv   = document.getElementById('pay-cvv').value;

  if (!nome || !email || cpf.length !== 11) {
    alert('Preencha nome, e-mail e CPF corretamente.');
    return;
  }
  if (card.length < 16 || !val || cvv.length < 3) {
    alert('Dados do cartão incompletos.');
    return;
  }

  const btn = document.getElementById('btn-pagar');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

  try {
    const [mesVal, anoVal] = val.split('/');
    const body = {
      plano: planoAtual, nome, email, cpf,
      cartao: { numero: card, mes: parseInt(mesVal), ano: parseInt('20' + anoVal), cvv }
    };
    const res = await fetch('/api/pagamento/assinar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.sucesso) {
      document.getElementById('pay-form').style.display = 'none';
      document.getElementById('pay-success').classList.add('success');
      localStorage.setItem('rp_premium', '1');
    } else {
      alert('Erro no pagamento: ' + (data.mensagem || 'Tente novamente.'));
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-lock"></i> Pagar R$' + planos[planoAtual].valor;
    }
  } catch (e) {
    alert('Erro de conexão. Tente novamente.');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-lock"></i> Pagar R$' + planos[planoAtual].valor;
  }
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-q').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling.classList.remove('open');
  });
  if (!isOpen) {
    btn.classList.add('open');
    answer.classList.add('open');
  }
}

// ── SCROLL REVEAL ─────────────────────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.10 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── NAV ATIVO ─────────────────────────────────────────────────────────────────
function abrirLogin(modo) {
  // Redireciona para o app com parâmetro de modo
  window.location.href = '/app?modo=' + (modo || 'comecar');
}
</script>
</body>
</html>`;
}
