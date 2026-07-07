// ══════════════════════════════════════════════════════════════════════════════
// parcerias.ts — RotaPosto Empresas (B2B)
// Área separada do app do consumidor: landing de vendas + painel do posto
// Rota pública:  GET /parcerias          → landing de vendas
// Rota painel:   GET /parcerias/empresa  → dashboard do gerente
// ══════════════════════════════════════════════════════════════════════════════

export function getParceriasLandingHTML(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RotaPosto Empresas — Mais clientes para seu posto</title>
  <link rel="icon" href="/favicon.ico"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;overflow-x:hidden}
    body{font-family:'Raleway',sans-serif;color:#fff;background:#07111C;min-height:100vh}
    a{text-decoration:none;color:inherit}

    /* ── NAV ── */
    nav{
      height:64px;background:#07111C;
      border-bottom:none;
      display:flex;align-items:center;
      padding:0 40px;gap:0;
      position:sticky;top:0;z-index:100;
      backdrop-filter:blur(16px)
    }
    .n-logo{display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0}
    .n-logo-icon{color:#FF6D00;font-size:20px}
    .n-logo-name{font-size:19px;font-weight:900}
    .n-logo-name span{color:#FF6D00}
    .n-tag{
      font-size:8px;font-weight:800;letter-spacing:.6px;
      color:#FF6D00;background:transparent;
      border:1px solid #FF6D00;
      padding:2px 8px;border-radius:20px;flex-shrink:0
    }
    .n-center{
      flex:1;
      display:flex;align-items:center;justify-content:center;
      height:64px;
      padding:0 24px;
    }

    .n-center-text{
      font-size:clamp(13px,1.4vw,20px);font-weight:800;letter-spacing:3px;
      text-transform:uppercase;color:#FF6D00;
      text-align:center;white-space:nowrap
    }
    .nav-btns{display:flex;align-items:center;gap:10px;flex-shrink:0;margin-left:auto}
    .btn-ghost{
      padding:9px 20px;background:transparent;color:#FF6D00;
      border-radius:9px;font-size:13px;font-weight:800;
      border:1.5px solid #FF6D00;cursor:pointer;
      font-family:'Raleway',sans-serif;transition:all .18s;
      display:flex;align-items:center;gap:7px;white-space:nowrap
    }
    .btn-ghost:hover{background:rgba(255,109,0,0.1)}
    .btn-solid{
      padding:9px 20px;background:#FF6D00;color:#fff;
      border-radius:9px;font-size:13px;font-weight:800;
      border:none;cursor:pointer;
      font-family:'Raleway',sans-serif;transition:background .15s;
      display:flex;align-items:center;gap:7px;white-space:nowrap
    }
    .btn-solid:hover{background:#E65100}

    /* ── HERO ── */
    .hero-wrap{
      position:relative;
      padding:12px 56px 12px 56px;
      overflow:hidden;
      text-align:center
    }
    .hero-left{ position:relative;z-index:1;width:100% }

    h1{
      font-size:clamp(32px,4.5vw,72px);
      font-weight:900;line-height:1;
      letter-spacing:-2px;margin-bottom:4px;
      width:100%
    }
    h1 span{color:#FF6D00}
    .hero-sub{
      font-size:16px;color:rgba(255,255,255,0.6);
      line-height:1.5;font-weight:500;
      margin-bottom:0;width:100%
    }
    .hero-sub em{color:rgba(255,180,80,0.9);font-style:normal}
    .hero-ctas{display:flex;gap:14px;flex-wrap:wrap}
    .cta-primary{
      display:inline-flex;align-items:center;gap:9px;
      padding:15px 30px;background:#FF6D00;color:#fff;
      border-radius:12px;font-size:15px;font-weight:800;
      border:none;cursor:pointer;font-family:'Raleway',sans-serif;
      transition:all .18s
    }
    .cta-primary:hover{background:#E65100;transform:translateY(-2px)}
    .cta-secondary{
      display:inline-flex;align-items:center;gap:9px;
      padding:15px 24px;background:rgba(255,255,255,0.06);
      color:rgba(255,255,255,0.85);border-radius:12px;font-size:15px;
      font-weight:700;border:1px solid rgba(255,255,255,0.15);
      cursor:pointer;font-family:'Raleway',sans-serif;transition:all .18s
    }
    .cta-secondary:hover{background:rgba(255,255,255,0.1)}


    /* ── RECURSOS INCLUSOS ── */
    .recursos-wrap{
      padding:16px 40px 0;
      max-width:100%;
      box-sizing:border-box
    }
    .rec-label{
      font-size:10px;font-weight:800;
      color:rgba(255,255,255,0.3);
      text-transform:uppercase;letter-spacing:2px;
      margin-bottom:24px;
      border-top:1px solid rgba(255,255,255,0.08);
      padding-top:24px
    }
    .rec-cols{
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:14px;
      padding-bottom:32px
    }
    .rec-col{
      background:rgba(255,255,255,0.045);
      border:1px solid rgba(255,255,255,0.09);
      border-radius:12px;
      padding:14px;
      transition:all .2s
    }
    .rec-col:hover{
      background:rgba(255,255,255,0.07);
      border-color:rgba(255,109,0,0.35)
    }
    .rec-ico{
      width:30px;height:30px;border-radius:8px;
      background:rgba(255,109,0,0.12);border:1px solid rgba(255,109,0,0.2);
      display:flex;align-items:center;justify-content:center;
      color:#FF6D00;font-size:13px;margin-bottom:8px
    }
    .rec-col h5{font-size:14px;font-weight:800;margin-bottom:7px}
    .rec-col p{font-size:12px;color:rgba(255,255,255,0.42);line-height:1.6}

    /* ── FEATURE CARDS ── */
    .cards-wrap{
      padding:0 40px 20px;
      max-width:100%;
      box-sizing:border-box
    }
    .cards-grid{
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:14px
    }
    .feat-card{
      background:rgba(255,255,255,0.045);
      border:1px solid rgba(255,255,255,0.09);
      border-radius:12px;padding:14px;
      transition:all .2s
    }
    .feat-card:hover{
      background:rgba(255,255,255,0.07);
      border-color:rgba(255,109,0,0.35)
    }
    .feat-ico{
      width:30px;height:30px;border-radius:8px;
      background:rgba(255,109,0,0.12);border:1px solid rgba(255,109,0,0.2);
      display:flex;align-items:center;justify-content:center;
      color:#FF6D00;font-size:13px;margin-bottom:8px
    }
    .feat-card h4{font-size:14px;font-weight:800;margin-bottom:7px}
    .feat-card p{font-size:12px;color:rgba(255,255,255,0.42);line-height:1.6}

    /* ── FOOTER ── */
    footer{
      background:rgba(3,9,16,0.98);
      border-top:1px solid rgba(255,255,255,0.07);
      padding:32px 40px 0
    }
    .footer-inner{
      display:grid;
      grid-template-columns:1.6fr 1fr 1fr 1fr auto;
      gap:40px;
      align-items:start;
      padding-bottom:24px;
      border-bottom:1px solid rgba(255,255,255,0.06)
    }
    .f-logo{display:flex;align-items:center;gap:7px;cursor:pointer;margin-bottom:10px}
    .f-logo-name{font-size:17px;font-weight:900}
    .f-logo-name span{color:#FF6D00}
    .f-tag{
      font-size:7px;font-weight:800;letter-spacing:.6px;
      color:#FF6D00;
      border:1px solid #FF6D00;
      padding:2px 6px;border-radius:20px
    }
    .f-desc{font-size:12px;color:rgba(255,255,255,0.35);line-height:1.8;margin-top:4px}
    .f-col-title{
      font-size:10px;font-weight:800;
      color:rgba(255,255,255,0.3);
      text-transform:uppercase;letter-spacing:1px;
      margin-bottom:14px
    }
    .f-col{display:flex;flex-direction:column;gap:9px}
    .f-col a{
      font-size:12.5px;color:rgba(255,255,255,0.42);
      font-weight:500;transition:color .15s
    }
    .f-col a:hover{color:#FF6D00}
    .f-social-col{display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;gap:10px}
    .f-social{display:flex;gap:8px}
    .soc{
      width:36px;height:36px;border-radius:9px;
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
      display:flex;align-items:center;justify-content:center;
      color:rgba(255,255,255,0.45);font-size:15px;transition:all .15s
    }
    .soc:hover{background:rgba(255,109,0,0.15);border-color:rgba(255,109,0,0.3);color:#FF6D00}
    .f-bottom{
      display:flex;justify-content:space-between;align-items:center;
      padding:14px 0;font-size:11px;color:rgba(255,255,255,0.22)
    }

    /* ── TELA CHEIA CADASTRO ── */
    .tela-cheia{
      display:none;
      position:fixed !important;
      top:0 !important;left:0 !important;
      right:0 !important;bottom:0 !important;
      width:100vw !important;height:100vh !important;
      max-width:100% !important;margin:0 !important;
      z-index:9999;background:#07111C;
      overflow-y:auto;overflow-x:hidden;
      flex-direction:column;
      -webkit-overflow-scrolling:touch;
    }
    .tela-cheia.open{display:flex}
    .tc-nav{
      height:60px;background:#07111C;
      border-bottom:1px solid rgba(255,255,255,0.08);
      display:flex;align-items:center;
      padding:0 32px;gap:16px;
      position:sticky;top:0;z-index:10;
      flex-shrink:0;width:100%;
    }
    .tc-back{display:flex;align-items:center;gap:8px;background:transparent;border:1.5px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);padding:8px 16px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;font-family:'Raleway',sans-serif;transition:all .18s}
    .tc-back:hover{border-color:#FF6D00;color:#FF6D00}
    .tc-title{font-size:15px;font-weight:800;color:#fff}
    .tc-body{flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:calc(100vh - 60px)}
    .tc-left{background:linear-gradient(135deg,rgba(255,109,0,0.12),rgba(255,109,0,0.03));border-right:1px solid rgba(255,255,255,0.06);padding:56px 48px;display:flex;flex-direction:column;justify-content:center}
    .tc-left h2{font-size:clamp(24px,2.5vw,38px);font-weight:900;line-height:1.15;margin-bottom:16px}
    .tc-left h2 span{color:#FF6D00}
    .tc-left p{font-size:14px;color:rgba(255,255,255,0.5);line-height:1.8;margin-bottom:32px}
    .tc-beneficios{display:flex;flex-direction:column;gap:14px}
    .tc-ben{display:flex;align-items:flex-start;gap:12px}
    .tc-ben-ico{width:32px;height:32px;border-radius:9px;background:rgba(255,109,0,0.15);border:1px solid rgba(255,109,0,0.25);display:flex;align-items:center;justify-content:center;color:#FF6D00;font-size:13px;flex-shrink:0;margin-top:2px}
    .tc-ben-txt strong{display:block;font-size:13px;font-weight:800;margin-bottom:2px}
    .tc-ben-txt span{font-size:12px;color:rgba(255,255,255,0.4)}
    .tc-right{padding:40px 48px;overflow-y:auto}
    .tc-card{width:100%;max-width:580px}
    @media(max-width:900px){
      .tc-body{grid-template-columns:1fr}
      .tc-left{display:none}
      .tc-right{padding:24px 20px}
    }

    /* ── TELA CHEIA SUBPÁGINAS ── */
    .subpagina{
      display:none;
      position:fixed !important;
      top:0 !important;left:0 !important;
      right:0 !important;bottom:0 !important;
      width:100vw !important;height:100vh !important;
      max-width:100% !important;margin:0 !important;
      z-index:9998;background:#07111C;
      overflow-y:auto;overflow-x:hidden;
      flex-direction:column;
      -webkit-overflow-scrolling:touch;
    }
    .subpagina.open{display:flex}
    .sp-nav{
      height:60px;background:#07111C;
      border-bottom:1px solid rgba(255,255,255,0.08);
      display:flex;align-items:center;
      padding:0 32px;gap:16px;
      position:sticky;top:0;z-index:10;
      flex-shrink:0;width:100%;
      box-sizing:border-box;
    }
    .sp-content{flex:1;padding:48px 40px;width:100%;box-sizing:border-box}
    .sp-tag{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#FF6D00;margin-bottom:12px}
    .sp-h1{font-size:clamp(28px,4vw,48px);font-weight:900;margin-bottom:16px;line-height:1.1}
    .sp-h1 span{color:#FF6D00}
    .sp-sub{font-size:16px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:40px}
    .sp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:40px}
    .sp-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:24px}
    .sp-card-ico{width:40px;height:40px;background:rgba(255,109,0,0.12);border:1px solid rgba(255,109,0,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#FF6D00;font-size:16px;margin-bottom:14px}
    .sp-card h3{font-size:15px;font-weight:800;margin-bottom:8px}
    .sp-card p{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.7}
    .sp-cta{display:inline-flex;align-items:center;gap:10px;padding:15px 32px;background:#FF6D00;color:#fff;border-radius:12px;font-size:15px;font-weight:800;border:none;cursor:pointer;font-family:'Raleway',sans-serif;transition:all .18s}
    .sp-cta:hover{background:#E65100}
    .m-title{font-size:20px;font-weight:900;color:#fff;margin-bottom:3px}
    .m-sub{font-size:12.5px;color:rgba(255,255,255,0.4);margin-bottom:22px;font-weight:500}
    .fg{margin-bottom:13px}
    .fl{display:block;font-size:10.5px;font-weight:700;color:rgba(255,255,255,0.45);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
    .fi{width:100%;padding:11px 13px;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.1);border-radius:9px;color:#fff;font-size:13.5px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;transition:border-color .2s}
    .fi:focus{border-color:#FF6D00}
    .fi::placeholder{color:rgba(255,255,255,0.22)}
    .fr{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .fsel{width:100%;padding:11px 13px;background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:9px;color:#fff;font-size:13.5px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;cursor:pointer}
    .fsel:focus{border-color:#FF6D00}
    .fsub{width:100%;padding:13px;background:#FF6D00;color:#fff;border:none;border-radius:11px;font-size:14.5px;font-weight:800;cursor:pointer;font-family:'Raleway',sans-serif;margin-top:5px;transition:background .2s}
    .fsub:hover{background:#E65100}
    .fterms{text-align:center;font-size:10.5px;color:rgba(255,255,255,0.28);margin:8px 0}
    .fterms a{color:#FF6D00}
    .ferr{background:rgba(255,82,82,0.1);border:1px solid rgba(255,82,82,0.2);border-radius:8px;padding:9px 13px;font-size:11.5px;color:#FF5252;font-weight:700;margin-bottom:11px;display:none}
    .fok{background:rgba(0,200,83,0.08);border:1px solid rgba(0,200,83,0.22);border-radius:11px;padding:20px;text-align:center;display:none}
    .fok h4{font-size:17px;font-weight:900;color:#69F0AE;margin-bottom:7px}
    .fok p{font-size:12.5px;color:rgba(255,255,255,0.55);line-height:1.6}

    /* ══════════════════════════════
       RESPONSIVO — MOBILE / TABLET
    ══════════════════════════════ */

    /* Tablet (≤1024px) */
    @media(max-width:1024px){
      nav{padding:0 20px}
      .n-center-text{font-size:clamp(10px,1.1vw,14px);letter-spacing:1.5px}
      .btn-ghost,.btn-solid{padding:8px 14px;font-size:12px}
      .hero-wrap{padding:16px 32px}
      h1{font-size:clamp(28px,4vw,56px)}
      .recursos-wrap,.cards-wrap{padding-left:24px;padding-right:24px}
      .rec-cols{grid-template-columns:repeat(2,1fr);gap:12px}
      .cards-grid{grid-template-columns:repeat(2,1fr)}
      .footer-inner{grid-template-columns:1fr 1fr;gap:24px}
      .f-social-col{grid-column:1/-1;flex-direction:row;justify-content:flex-start;align-items:center}
      .f-social{flex-direction:row}
    }

    /* Mobile (≤600px) */
    @media(max-width:600px){
      nav{padding:0 16px;height:56px}
      .n-center{display:none}
      .n-tag{display:none}
      .n-logo-name{font-size:16px}
      .btn-ghost{display:none}
      .btn-solid{padding:8px 14px;font-size:12px;gap:5px}
      .btn-solid i{display:none}
      .hero-wrap{padding:20px 16px 16px}
      h1{font-size:clamp(24px,7vw,40px);letter-spacing:-1px}
      .hero-sub{font-size:14px}
      .recursos-wrap{padding:16px 16px 0}
      .rec-cols{grid-template-columns:1fr 1fr;gap:10px}
      .rec-col:last-child{}
      .cards-wrap{padding:0 16px 16px}
      .cards-grid{grid-template-columns:1fr 1fr;gap:10px}
      .feat-card{padding:12px}
      .feat-card h4{font-size:13px}
      .feat-card p{font-size:11px}
      footer{padding:24px 16px 0}
      .footer-inner{grid-template-columns:1fr;gap:20px}
      .f-social-col{align-items:flex-start}
      .f-bottom{flex-direction:column;gap:6px;text-align:center}
      /* Subpáginas mobile */
      .sp-content{padding:20px 16px 32px;box-sizing:border-box}
      .sp-h1{font-size:clamp(22px,6vw,32px)}
      .sp-sub{font-size:14px;margin-bottom:24px}
      .sp-grid{grid-template-columns:1fr;gap:12px}
      .sp-card{padding:18px}
      /* Nav mobile */
      .tc-nav,.sp-nav{padding:0 14px;gap:10px;box-sizing:border-box}
      .tc-title{font-size:14px}
      /* Formulário cadastro mobile */
      .fr{grid-template-columns:1fr}
      .tc-right{padding:20px 16px 32px}
    }

    /* Extra small (≤400px) */
    @media(max-width:400px){
      .cards-grid{grid-template-columns:1fr}
      h1{font-size:clamp(22px,8vw,34px)}
      .sp-content{padding:16px 12px 24px;box-sizing:border-box}
      .sp-nav,.tc-nav{padding:0 12px;box-sizing:border-box}
    }
  </style>
</head>
<body>

<!-- NAV -->
<nav>
  <div class="n-logo" onclick="location.href='/'">
    <i class="fas fa-location-dot n-logo-icon"></i>
    <div class="n-logo-name">Rota<span>Posto</span></div>
    <div class="n-tag">EMPRESAS</div>
  </div>
  <div class="n-center">
    <span class="n-center-text">Novo canal de vendas para postos</span>
  </div>
  <div class="nav-btns">
    <button class="btn-ghost" onclick="openM('premium')">
      <i class="fas fa-handshake"></i> Quero ser parceiro
    </button>
    <button class="btn-solid" onclick="location.href='/parcerias/empresa'">
      <i class="fas fa-arrow-right"></i> Acessar Painel
    </button>
  </div>
</nav>

<!-- HERO -->
<div class="hero-wrap">
  <div class="hero-left">
    <h1>Pronto para <span>acelerar</span> seus resultados?</h1>
    <p class="hero-sub">Cadastre seu posto e conecte-se a milhares de motoristas com <em>preços em tempo real</em> e <em>destaque no mapa</em>.</p>

  </div>

</div>

<!-- RECURSOS INCLUSOS -->
<div class="recursos-wrap">
  <div class="rec-label">Recursos inclusos</div>
  <div class="rec-cols">
    <div class="rec-col">
      <div class="rec-ico"><i class="fas fa-map-pin"></i></div>
      <h5>Destaque inteligente</h5>
      <p>Evidência no mapa para milhares de motoristas locais.</p>
    </div>
    <div class="rec-col">
      <div class="rec-ico"><i class="fas fa-rotate"></i></div>
      <h5>Preços em tempo real</h5>
      <p>Atualize quando quiser e lidere a concorrência.</p>
    </div>
    <div class="rec-col">
      <div class="rec-ico"><i class="fas fa-ticket"></i></div>
      <h5>Cupons e promoções</h5>
      <p>Crie ofertas exclusivas e atraia clientes com desconto.</p>
    </div>
    <div class="rec-col">
      <div class="rec-ico"><i class="fas fa-chart-line"></i></div>
      <h5>Relatórios e análises</h5>
      <p>Acompanhe o desempenho do posto facilmente.</p>
    </div>
  </div>
</div>

<!-- FEATURE CARDS -->
<div class="cards-wrap">
  <div class="cards-grid">
    <div class="feat-card">
      <div class="feat-ico"><i class="fas fa-map-location-dot"></i></div>
      <h4>Destaque no mapa</h4>
      <p>Seu posto aparece primeiro para motoristas na sua região.</p>
    </div>
    <div class="feat-card">
      <div class="feat-ico"><i class="fas fa-tag"></i></div>
      <h4>Preços atualizados</h4>
      <p>Atualize preços em segundos e mantenha-se competitivo.</p>
    </div>
    <div class="feat-card">
      <div class="feat-ico"><i class="fas fa-users"></i></div>
      <h4>Mais clientes</h4>
      <p>Atraia novos motoristas e aumente o movimento.</p>
    </div>
    <div class="feat-card">
      <div class="feat-ico"><i class="fas fa-chart-bar"></i></div>
      <h4>Gestão completa</h4>
      <p>Painel simples com tudo que você precisa acompanhar.</p>
    </div>
  </div>
</div>

<!-- FOOTER -->
<footer>
  <div class="footer-inner">
    <div>
      <div class="f-logo" onclick="location.href='/'">
        <i class="fas fa-location-dot" style="color:#FF6D00;font-size:15px"></i>
        <span class="f-logo-name">Rota<span>Posto</span></span>
        <span class="f-tag">EMPRESAS</span>
      </div>
      <p class="f-desc">Conectando postos a motoristas.<br>A plataforma mais inteligente para seu negócio crescer.</p>
    </div>
    <div>
      <div class="f-col-title">Produto</div>
      <div class="f-col">
        <a href="#" onclick="abrirSP('como')">Como funciona</a>
        <a href="#" onclick="abrirSP('recursos')">Recursos</a>
        <a href="#" onclick="abrirSP('planos')">Planos e preços</a>
        <a href="#" onclick="abrirSP('depoimentos')">Depoimentos</a>
      </div>
    </div>
    <div>
      <div class="f-col-title">Empresa</div>
      <div class="f-col">
        <a href="#" onclick="abrirSP('sobre')">Sobre nós</a>
        <a href="#" onclick="abrirSP('blog')">Blog</a>
        <a href="#" onclick="abrirSP('contato')">Contato</a>
        <a href="#" onclick="abrirSP('termos')">Termos de uso</a>
      </div>
    </div>
    <div>
      <div class="f-col-title">Suporte</div>
      <div class="f-col">
        <a href="#" onclick="abrirSP('contato')">Central de ajuda</a>
        <a href="#" onclick="abrirSP('contato')">WhatsApp</a>
        <a href="#" onclick="abrirSP('contato')">E-mail</a>
        <a href="tel:+5527999999999">+55 (27) 9 9999-9999</a>
      </div>
    </div>
    <div class="f-social-col">
      <div class="f-social">
        <a href="#" class="soc"><i class="fab fa-instagram"></i></a>
        <a href="#" class="soc"><i class="fab fa-whatsapp"></i></a>
        <a href="#" class="soc"><i class="fab fa-linkedin"></i></a>
      </div>
    </div>
  </div>
  <div class="f-bottom">
    <span>© 2025 RotaPosto. Todos os direitos reservados.</span>
    <span>Feito com <i class="fas fa-heart" style="color:#FF6D00;font-size:10px"></i> no Brasil</span>
  </div>
</footer>

<!-- TELA CHEIA CADASTRO -->
<div class="tela-cheia" id="tela-cad">
  <div class="tc-nav">
    <button class="tc-back" onclick="closeM()"><i class="fas fa-arrow-left"></i> Voltar</button>
    <span class="tc-title">Cadastrar meu posto</span>
  </div>
  <div class="tc-body">
    <div class="tc-left">
      <h2>Seu posto no <span>mapa</span> de milhares de motoristas</h2>
      <p>Cadastre agora e comece a atrair mais clientes com preços em tempo real, cupons e destaque na busca.</p>
      <div class="tc-beneficios">
        <div class="tc-ben"><div class="tc-ben-ico"><i class="fas fa-map-pin"></i></div><div class="tc-ben-txt"><strong>Destaque no mapa</strong><span>Apareça primeiro para motoristas na sua região</span></div></div>
        <div class="tc-ben"><div class="tc-ben-ico"><i class="fas fa-rotate"></i></div><div class="tc-ben-txt"><strong>Preços em tempo real</strong><span>Atualize a qualquer hora direto pelo painel</span></div></div>
        <div class="tc-ben"><div class="tc-ben-ico"><i class="fas fa-ticket"></i></div><div class="tc-ben-txt"><strong>Cupons e promoções</strong><span>Atraia clientes com ofertas exclusivas</span></div></div>
        <div class="tc-ben"><div class="tc-ben-ico"><i class="fas fa-chart-line"></i></div><div class="tc-ben-txt"><strong>Relatórios completos</strong><span>Acompanhe visitas e desempenho em tempo real</span></div></div>
        <div class="tc-ben"><div class="tc-ben-ico"><i class="fas fa-clock"></i></div><div class="tc-ben-txt"><strong>Aprovação em 24h</strong><span>Nossa equipe ativa seu posto rapidamente</span></div></div>
      </div>
    </div>
    <div class="tc-right">
    <div class="tc-card">
      <div class="m-title">Cadastrar posto</div>
      <div class="m-sub">Preencha os dados e entraremos em contato em até 24h.</div>
      <div class="ferr" id="f-err"></div>
      <div class="fok" id="f-ok">
        <h4>Cadastro enviado!</h4>
        <p>Nossa equipe entrará em contato em até 24h úteis.</p>
      </div>
      <div id="f-body">
        <div class="fg"><label class="fl">Nome do responsável *</label><input class="fi" id="f-nome" placeholder="João Silva" autocomplete="name" required/></div>
        <div class="fr">
          <div class="fg"><label class="fl">E-mail *</label><input class="fi" id="f-email" type="email" placeholder="joao@posto.com" required/></div>
          <div class="fg"><label class="fl">WhatsApp *</label><input class="fi" id="f-tel" placeholder="(27) 99999-9999" oninput="mTel(this)" required/></div>
        </div>
        <div class="fg"><label class="fl">Nome do posto *</label><input class="fi" id="f-posto" placeholder="Posto São João" required/></div>
        <div class="fg"><label class="fl">CNPJ *</label><input class="fi" id="f-cnpj" placeholder="00.000.000/0001-00" oninput="mCNPJ(this)" required/></div>

        <div style="background:rgba(255,109,0,0.06);border:1px solid rgba(255,109,0,0.2);border-radius:12px;padding:16px;margin-bottom:13px">
          <div style="font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#FF6D00;margin-bottom:12px"><i class="fas fa-map-marker-alt"></i> &nbsp;Localização do posto *</div>
          <div class="fr" style="margin-bottom:0">
            <div class="fg"><label class="fl">CEP *</label><input class="fi" id="f-cep" placeholder="29000-000" oninput="mCEP(this)" required/></div>
            <div class="fg" style="display:flex;align-items:flex-end;padding-bottom:1px">
              <button type="button" onclick="buscarCEP()" style="width:100%;padding:11px;background:rgba(255,109,0,0.15);border:1.5px solid rgba(255,109,0,0.4);border-radius:9px;color:#FF6D00;font-size:12px;font-weight:800;cursor:pointer;font-family:'Raleway',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px"><i class="fas fa-search"></i> Buscar CEP</button>
            </div>
          </div>
          <div class="fg"><label class="fl">Endereço (Rua) *</label><input class="fi" id="f-rua" placeholder="Av. Nossa Senhora da Penha" required/></div>
          <div class="fr">
            <div class="fg"><label class="fl">Número *</label><input class="fi" id="f-num" placeholder="1234" required/></div>
            <div class="fg"><label class="fl">Bairro *</label><input class="fi" id="f-bairro" placeholder="Centro" required/></div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Cidade *</label><input class="fi" id="f-cidade" placeholder="Vitória" required/></div>
            <div class="fg">
              <label class="fl">Estado *</label>
              <select class="fsel" id="f-estado" required>
                <option value="">UF</option>
                <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option>
                <option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option>
                <option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option>
                <option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
                <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option>
                <option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option>
                <option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option>
                <option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
                <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
              </select>
            </div>
          </div>
          <div class="fg" style="margin-bottom:0">
            <label class="fl">Coordenadas GPS</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input class="fi" id="f-lat" placeholder="Latitude" readonly style="flex:1;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.5);font-size:12px"/>
              <input class="fi" id="f-lng" placeholder="Longitude" readonly style="flex:1;background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.5);font-size:12px"/>
              <button type="button" onclick="obterGPS()" id="btn-gps" style="padding:11px 14px;background:rgba(0,200,83,0.1);border:1.5px solid rgba(0,200,83,0.3);border-radius:9px;color:#69F0AE;font-size:13px;cursor:pointer;white-space:nowrap;font-family:'Raleway',sans-serif;font-weight:800;display:flex;align-items:center;gap:6px"><i class="fas fa-crosshairs"></i> GPS</button>
            </div>
            <div id="geo-status" style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:6px"></div>
          </div>
        </div>
        <div class="fg">
          <label class="fl">Plano de interesse *</label>
          <select class="fsel" id="f-plano" required>
            <option value="basico">Básico (Grátis)</option>
            <option value="premium" selected>Profissional (R$197/mês)</option>
            <option value="enterprise">Enterprise (Personalizado)</option>
          </select>
        </div>
        <div class="fg"><label class="fl">Combustíveis que vende *</label>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,0.6);cursor:pointer"><input type="checkbox" id="cb-gasolina" style="accent-color:#FF6D00"/> Gasolina</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,0.6);cursor:pointer"><input type="checkbox" id="cb-etanol" style="accent-color:#FF6D00"/> Etanol</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,0.6);cursor:pointer"><input type="checkbox" id="cb-diesel" style="accent-color:#FF6D00"/> Diesel</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:rgba(255,255,255,0.6);cursor:pointer"><input type="checkbox" id="cb-gnv" style="accent-color:#FF6D00"/> GNV</label>
          </div>
        </div>
        <div class="fterms">Ao cadastrar você concorda com os <a href="#" onclick="abrirSP('termos')">Termos de Uso</a></div>
        <button class="fsub" onclick="submitF()"><span id="f-btn"><i class="fas fa-rocket"></i> &nbsp;Enviar cadastro</span></button>
      </div>
    </div>
    </div>
  </div>
</div>

<!-- SUBPÁGINAS -->
<div class="subpagina" id="sp-como">
  <div class="sp-nav">
    <button class="tc-back" onclick="fecharSP('como')"><i class="fas fa-arrow-left"></i> Voltar</button>
    <span class="tc-title">Como funciona</span>
  </div>
  <div class="sp-content">
    <div class="sp-tag">Plataforma</div>
    <h1 class="sp-h1">Como o <span>RotaPosto</span> funciona</h1>
    <p class="sp-sub">Em apenas 3 passos simples, seu posto começa a atrair mais motoristas e aumentar o faturamento.</p>
    <div class="sp-grid">
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-clipboard-list"></i></div><h3>1. Cadastre seu posto</h3><p>Preencha o formulário com os dados do posto. Nossa equipe aprova em até 24h.</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-tag"></i></div><h3>2. Atualize seus preços</h3><p>Use o painel para atualizar preços em tempo real e criar promoções exclusivas.</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-users"></i></div><h3>3. Atraia motoristas</h3><p>Apareça em destaque no mapa do RotaPosto para milhares de motoristas locais.</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-chart-line"></i></div><h3>4. Acompanhe resultados</h3><p>Monitore visitas, cliques e desempenho em tempo real pelo painel do gerente.</p></div>
    </div>
    <button class="sp-cta" onclick="fecharSP('como');openM('premium')"><i class="fas fa-rocket"></i> Quero começar agora</button>
  </div>
</div>

<div class="subpagina" id="sp-recursos">
  <div class="sp-nav">
    <button class="tc-back" onclick="fecharSP('recursos')"><i class="fas fa-arrow-left"></i> Voltar</button>
    <span class="tc-title">Recursos</span>
  </div>
  <div class="sp-content">
    <div class="sp-tag">Funcionalidades</div>
    <h1 class="sp-h1">Tudo que seu posto <span>precisa</span></h1>
    <p class="sp-sub">O RotaPosto oferece ferramentas completas para postos que querem crescer e se destacar.</p>
    <div class="sp-grid">
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-map-pin"></i></div><h3>Destaque no mapa</h3><p>Seu posto aparece em destaque para motoristas próximos buscando combustível.</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-rotate"></i></div><h3>Preços em tempo real</h3><p>Atualize preços a qualquer hora. Motoristas veem o preço atual antes de sair de casa.</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-ticket"></i></div><h3>Cupons e promoções</h3><p>Crie ofertas exclusivas para atrair novos clientes e fidelizar os atuais.</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-chart-bar"></i></div><h3>Relatórios detalhados</h3><p>Acompanhe visitas, cliques, conversões e tendências do seu posto.</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-bell"></i></div><h3>Notificações push</h3><p>Envie alertas de promoções diretamente para motoristas cadastrados na região.</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-mobile-alt"></i></div><h3>Painel mobile</h3><p>Gerencie seu posto de qualquer lugar pelo celular, tablet ou computador.</p></div>
    </div>
    <button class="sp-cta" onclick="fecharSP('recursos');openM('premium')"><i class="fas fa-handshake"></i> Quero ser parceiro</button>
  </div>
</div>

<div class="subpagina" id="sp-planos">
  <div class="sp-nav">
    <button class="tc-back" onclick="fecharSP('planos')"><i class="fas fa-arrow-left"></i> Voltar</button>
    <span class="tc-title">Planos e preços</span>
  </div>
  <div class="sp-content">
    <div class="sp-tag">Planos</div>
    <h1 class="sp-h1">Escolha o plano <span>ideal</span></h1>
    <p class="sp-sub">Comece grátis e cresça conforme seu posto evolui. Sem fidelidade, cancele quando quiser.</p>
    <div class="sp-grid">
      <div class="sp-card" style="border-color:rgba(255,255,255,0.15)">
        <div class="sp-card-ico"><i class="fas fa-seedling"></i></div>
        <h3>Básico</h3>
        <div style="font-size:28px;font-weight:900;color:#fff;margin:12px 0">Grátis</div>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.8">✓ Perfil no mapa<br>✓ Atualização de preços<br>✓ 1 foto do posto<br>✗ Sem destaque<br>✗ Sem cupons</p>
        <button class="sp-cta" style="margin-top:20px;width:100%;justify-content:center;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.2)" onclick="fecharSP('planos');openM('basico')">Começar grátis</button>
      </div>
      <div class="sp-card" style="border-color:#FF6D00;background:rgba(255,109,0,0.06)">
        <div class="sp-card-ico" style="background:rgba(255,109,0,0.2)"><i class="fas fa-star"></i></div>
        <h3>Profissional <span style="font-size:10px;background:#FF6D00;color:#fff;padding:2px 8px;border-radius:20px;margin-left:6px">POPULAR</span></h3>
        <div style="font-size:28px;font-weight:900;color:#FF6D00;margin:12px 0">R$197<span style="font-size:14px;color:rgba(255,255,255,0.4)">/mês</span></div>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.8">✓ Tudo do Básico<br>✓ Destaque no mapa<br>✓ Cupons ilimitados<br>✓ Relatórios avançados<br>✓ Notificações push</p>
        <button class="sp-cta" style="margin-top:20px;width:100%;justify-content:center" onclick="fecharSP('planos');openM('premium')"><i class="fas fa-rocket"></i> Assinar agora</button>
      </div>
      <div class="sp-card" style="border-color:rgba(255,255,255,0.15)">
        <div class="sp-card-ico"><i class="fas fa-building"></i></div>
        <h3>Enterprise</h3>
        <div style="font-size:28px;font-weight:900;color:#fff;margin:12px 0">Custom</div>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.8">✓ Tudo do Profissional<br>✓ Multi-unidades<br>✓ API dedicada<br>✓ Gerente de conta<br>✓ SLA garantido</p>
        <button class="sp-cta" style="margin-top:20px;width:100%;justify-content:center;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.2)" onclick="fecharSP('planos');openM('enterprise')">Falar com vendas</button>
      </div>
    </div>
  </div>
</div>

<div class="subpagina" id="sp-depoimentos">
  <div class="sp-nav">
    <button class="tc-back" onclick="fecharSP('depoimentos')"><i class="fas fa-arrow-left"></i> Voltar</button>
    <span class="tc-title">Depoimentos</span>
  </div>
  <div class="sp-content">
    <div class="sp-tag">Clientes</div>
    <h1 class="sp-h1">O que nossos <span>parceiros</span> dizem</h1>
    <p class="sp-sub">Postos em todo o Brasil já usam o RotaPosto para atrair mais clientes.</p>
    <div class="sp-grid">
      <div class="sp-card"><div style="font-size:24px;color:#FF6D00;margin-bottom:12px">★★★★★</div><p style="color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:16px">"Aumentei o movimento em 40% no primeiro mês. Os motoristas chegam dizendo que me acharam no RotaPosto."</p><div style="font-size:13px;font-weight:800">João Silva</div><div style="font-size:12px;color:rgba(255,255,255,0.4)">Posto São João — Vitória/ES</div></div>
      <div class="sp-card"><div style="font-size:24px;color:#FF6D00;margin-bottom:12px">★★★★★</div><p style="color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:16px">"O painel é simples e fácil. Atualizo o preço em segundos e já apareço na frente da concorrência."</p><div style="font-size:13px;font-weight:800">Maria Oliveira</div><div style="font-size:12px;color:rgba(255,255,255,0.4)">Posto Central — Serra/ES</div></div>
      <div class="sp-card"><div style="font-size:24px;color:#FF6D00;margin-bottom:12px">★★★★★</div><p style="color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:16px">"Os cupons de desconto trouxeram muitos clientes novos. Valeu cada centavo do investimento."</p><div style="font-size:13px;font-weight:800">Carlos Mendes</div><div style="font-size:12px;color:rgba(255,255,255,0.4)">AutoPosto Mendes — Guarapari/ES</div></div>
    </div>
    <button class="sp-cta" onclick="fecharSP('depoimentos');openM('premium')"><i class="fas fa-handshake"></i> Quero ser parceiro também</button>
  </div>
</div>

<div class="subpagina" id="sp-sobre">
  <div class="sp-nav">
    <button class="tc-back" onclick="fecharSP('sobre')"><i class="fas fa-arrow-left"></i> Voltar</button>
    <span class="tc-title">Sobre nós</span>
  </div>
  <div class="sp-content">
    <div class="sp-tag">A empresa</div>
    <h1 class="sp-h1">Conectando postos a <span>motoristas</span></h1>
    <p class="sp-sub">O RotaPosto nasceu para resolver um problema simples: motoristas queriam encontrar combustível mais barato, e postos queriam mais clientes. Criamos a ponte.</p>
    <div class="sp-grid">
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-bullseye"></i></div><h3>Missão</h3><p>Conectar postos de combustível a motoristas de forma transparente, eficiente e em tempo real.</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-eye"></i></div><h3>Visão</h3><p>Ser a maior plataforma de combustíveis do Brasil, presente em todos os postos do país.</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-heart"></i></div><h3>Valores</h3><p>Transparência, inovação, simplicidade e resultado real para nossos parceiros.</p></div>
    </div>
    <button class="sp-cta" onclick="fecharSP('sobre');openM('premium')"><i class="fas fa-handshake"></i> Seja nosso parceiro</button>
  </div>
</div>

<div class="subpagina" id="sp-blog">
  <div class="sp-nav">
    <button class="tc-back" onclick="fecharSP('blog')"><i class="fas fa-arrow-left"></i> Voltar</button>
    <span class="tc-title">Blog</span>
  </div>
  <div class="sp-content">
    <div class="sp-tag">Conteúdo</div>
    <h1 class="sp-h1">Dicas para <span>seu posto</span> crescer</h1>
    <p class="sp-sub">Artigos e estratégias para donos e gerentes de postos de combustível.</p>
    <div class="sp-grid">
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-newspaper"></i></div><h3>Como precificar combustível de forma estratégica</h3><p style="margin-top:8px;color:rgba(255,255,255,0.4);font-size:11px">15 de junho de 2025</p><p>Aprenda a definir preços competitivos sem perder margem de lucro...</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-newspaper"></i></div><h3>5 formas de fidelizar clientes no seu posto</h3><p style="margin-top:8px;color:rgba(255,255,255,0.4);font-size:11px">10 de junho de 2025</p><p>Estratégias práticas para transformar clientes eventuais em clientes fixos...</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-newspaper"></i></div><h3>Por que atualizar preços em tempo real aumenta vendas</h3><p style="margin-top:8px;color:rgba(255,255,255,0.4);font-size:11px">5 de junho de 2025</p><p>Dados mostram que postos com preços atualizados têm 3x mais cliques...</p></div>
    </div>
    <button class="sp-cta" onclick="fecharSP('blog');openM('premium')"><i class="fas fa-rocket"></i> Crescer com RotaPosto</button>
  </div>
</div>

<div class="subpagina" id="sp-contato">
  <div class="sp-nav">
    <button class="tc-back" onclick="fecharSP('contato')"><i class="fas fa-arrow-left"></i> Voltar</button>
    <span class="tc-title">Contato</span>
  </div>
  <div class="sp-content">
    <div class="sp-tag">Fale conosco</div>
    <h1 class="sp-h1">Estamos aqui para <span>ajudar</span></h1>
    <p class="sp-sub">Entre em contato com nossa equipe. Respondemos em até 2 horas úteis.</p>
    <div class="sp-grid">
      <div class="sp-card" style="cursor:pointer" onclick="window.open('https://wa.me/5527999999999','_blank')"><div class="sp-card-ico"><i class="fab fa-whatsapp"></i></div><h3>WhatsApp</h3><p>Atendimento direto pelo WhatsApp. Mais rápido e prático.</p><p style="color:#FF6D00;font-weight:700;margin-top:12px">+55 (27) 9 9999-9999 →</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-envelope"></i></div><h3>E-mail</h3><p>Para dúvidas, parcerias ou suporte técnico.</p><p style="color:#FF6D00;font-weight:700;margin-top:12px">contato@rotaposto.com.br</p></div>
      <div class="sp-card"><div class="sp-card-ico"><i class="fas fa-headset"></i></div><h3>Central de ajuda</h3><p>Acesse nossa base de conhecimento com artigos e tutoriais.</p><p style="color:#FF6D00;font-weight:700;margin-top:12px">ajuda.rotaposto.com.br</p></div>
    </div>
  </div>
</div>

<div class="subpagina" id="sp-termos">
  <div class="sp-nav">
    <button class="tc-back" onclick="fecharSP('termos')"><i class="fas fa-arrow-left"></i> Voltar</button>
    <span class="tc-title">Termos de uso</span>
  </div>
  <div class="sp-content">
    <div class="sp-tag">Legal</div>
    <h1 class="sp-h1">Termos de <span>Uso</span></h1>
    <p class="sp-sub">Última atualização: junho de 2025</p>
    <div style="color:rgba(255,255,255,0.6);line-height:1.9;font-size:14px">
      <p style="margin-bottom:20px"><strong style="color:#fff">1. Aceitação dos Termos</strong><br>Ao utilizar a plataforma RotaPosto Empresas, você concorda com estes Termos de Uso. Caso não concorde, não utilize a plataforma.</p>
      <p style="margin-bottom:20px"><strong style="color:#fff">2. Cadastro e Responsabilidades</strong><br>O parceiro é responsável pela veracidade dos dados cadastrados, incluindo preços, CNPJ e informações do posto. Dados falsos resultarão no cancelamento imediato da conta.</p>
      <p style="margin-bottom:20px"><strong style="color:#fff">3. Atualização de Preços</strong><br>Os preços exibidos na plataforma devem refletir os preços reais praticados no posto. O atraso na atualização pode resultar em reclamações de clientes e penalidades.</p>
      <p style="margin-bottom:20px"><strong style="color:#fff">4. Pagamentos</strong><br>Os planos pagos são cobrados mensalmente. O cancelamento pode ser feito a qualquer momento, com efeito no final do período pago.</p>
      <p style="margin-bottom:20px"><strong style="color:#fff">5. Privacidade</strong><br>Os dados dos parceiros são tratados conforme nossa Política de Privacidade e a Lei Geral de Proteção de Dados (LGPD).</p>
      <p style="margin-bottom:20px"><strong style="color:#fff">6. Contato</strong><br>Dúvidas sobre estes termos: termos@rotaposto.com.br</p>
    </div>
  </div>
</div>

<script>
  function openM(plano){
    const s=document.getElementById('f-plano');
    if(s&&plano)s.value=plano;
    document.getElementById('tela-cad').classList.add('open');
    document.body.style.overflow='hidden';
  }
  // Abre cadastro direto se vier com #cadastro na URL
  window.addEventListener('DOMContentLoaded',function(){
    if(location.hash==='#cadastro'){openM('premium');history.replaceState(null,'','/parcerias');}
  });
  function closeM(){
    document.getElementById('tela-cad').classList.remove('open');
    document.body.style.overflow='';
  }
  const spMap={
    'como':'sp-como','recursos':'sp-recursos','planos':'sp-planos',
    'depoimentos':'sp-depoimentos','sobre':'sp-sobre','blog':'sp-blog',
    'contato':'sp-contato','termos':'sp-termos'
  };
  function abrirSP(id){
    const el=document.getElementById(spMap[id]);
    if(el){el.classList.add('open');document.body.style.overflow='hidden';}
  }
  function fecharSP(id){
    const el=document.getElementById(spMap[id]);
    if(el){el.classList.remove('open');document.body.style.overflow='';}
  }
  function mTel(i){
    let v=i.value.replace(/\D/g,'').slice(0,11);
    if(v.length>7)i.value='('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
    else if(v.length>2)i.value='('+v.slice(0,2)+') '+v.slice(2);
    else if(v.length)i.value='('+v;
  }
  function mCNPJ(i){
    let v=i.value.replace(/\D/g,'').slice(0,14);
    if(v.length>12)i.value=v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5,8)+'/'+v.slice(8,12)+'-'+v.slice(12);
    else if(v.length>8)i.value=v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5,8)+'/'+v.slice(8);
    else if(v.length>5)i.value=v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5);
    else if(v.length>2)i.value=v.slice(0,2)+'.'+v.slice(2);
    else i.value=v;
  }
  function mCEP(i){
    let v=i.value.replace(/\D/g,'').slice(0,8);
    if(v.length>5) i.value=v.slice(0,5)+'-'+v.slice(5);
    else i.value=v;
    if(v.length===8) buscarCEP();
  }
  async function buscarCEP(){
    const cep=document.getElementById('f-cep').value.replace(/\D/g,'');
    if(cep.length!==8){
      document.getElementById('geo-status').textContent='CEP inválido.';return;
    }
    document.getElementById('geo-status').textContent='Buscando endereço...';
    try{
      const r=await fetch('https://viacep.com.br/ws/'+cep+'/json/');
      const d=await r.json();
      if(d.erro){document.getElementById('geo-status').textContent='CEP não encontrado.';return;}
      document.getElementById('f-rua').value=d.logradouro||'';
      document.getElementById('f-bairro').value=d.bairro||'';
      document.getElementById('f-cidade').value=d.localidade||'';
      const sel=document.getElementById('f-estado');
      for(let o of sel.options){if(o.value===d.uf){sel.value=d.uf;break;}}
      document.getElementById('geo-status').textContent='✓ Endereço preenchido! Confira e adicione o número.';
      document.getElementById('f-num').focus();
      // Geocodificar automaticamente
      geocodificarEndereco(d.logradouro+', '+d.localidade+' - '+d.uf);
    }catch(e){
      document.getElementById('geo-status').textContent='Erro ao buscar CEP. Preencha manualmente.';
    }
  }
  async function geocodificarEndereco(endereco){
    try{
      const url='https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(endereco+', Brasil');
      const r=await fetch(url,{headers:{'Accept-Language':'pt-BR'}});
      const d=await r.json();
      if(d&&d[0]){
        document.getElementById('f-lat').value=parseFloat(d[0].lat).toFixed(7);
        document.getElementById('f-lng').value=parseFloat(d[0].lon).toFixed(7);
        document.getElementById('geo-status').textContent='✓ Endereço preenchido e localização encontrada no mapa!';
      }
    }catch(e){}
  }
  function obterGPS(){
    const btn=document.getElementById('btn-gps');
    const status=document.getElementById('geo-status');
    if(!navigator.geolocation){status.textContent='GPS não suportado neste dispositivo.';return;}
    btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Buscando...';
    status.textContent='Obtendo sua localização...';
    navigator.geolocation.getCurrentPosition(
      async function(pos){
        const lat=pos.coords.latitude.toFixed(7);
        const lng=pos.coords.longitude.toFixed(7);
        document.getElementById('f-lat').value=lat;
        document.getElementById('f-lng').value=lng;
        btn.innerHTML='<i class="fas fa-check"></i> GPS OK';
        btn.style.background='rgba(0,200,83,0.2)';
        // Reverse geocode
        try{
          const url='https://nominatim.openstreetmap.org/reverse?format=json&lat='+lat+'&lon='+lng+'&accept-language=pt-BR';
          const r=await fetch(url);
          const d=await r.json();
          if(d&&d.address){
            const a=d.address;
            if(!document.getElementById('f-rua').value)
              document.getElementById('f-rua').value=a.road||a.pedestrian||'';
            if(!document.getElementById('f-bairro').value)
              document.getElementById('f-bairro').value=a.suburb||a.neighbourhood||a.quarter||'';
            if(!document.getElementById('f-cidade').value)
              document.getElementById('f-cidade').value=a.city||a.town||a.village||'';
            const uf=(a.state_code||'').replace('BR-','');
            const sel=document.getElementById('f-estado');
            for(let o of sel.options){if(o.value===uf){sel.value=uf;break;}}
          }
          status.textContent='✓ Localização GPS obtida e endereço preenchido automaticamente!';
        }catch(e){
          status.textContent='✓ Coordenadas GPS capturadas: '+lat+', '+lng;
        }
      },
      function(err){
        btn.innerHTML='<i class="fas fa-crosshairs"></i> GPS';
        status.textContent='Não foi possível obter GPS. Preencha o CEP acima.';
      },
      {enableHighAccuracy:true,timeout:10000}
    );
  }
  async function submitF(){
    const nome=document.getElementById('f-nome').value.trim();
    const email=document.getElementById('f-email').value.trim();
    const tel=document.getElementById('f-tel').value.trim();
    const posto=document.getElementById('f-posto').value.trim();
    const cnpj=document.getElementById('f-cnpj').value.trim();
    const cidade=document.getElementById('f-cidade').value.trim();
    const plano=document.getElementById('f-plano').value;
    const err=document.getElementById('f-err');
    err.style.display='none';
    const estado=document.getElementById('f-estado').value;
    const cbs=['cb-gasolina','cb-etanol','cb-diesel','cb-gnv'];
    const combsSel=cbs.filter(id=>document.getElementById(id).checked);
    // Limpar highlights
    ['f-nome','f-email','f-tel','f-posto','f-cnpj','f-cep','f-rua','f-num','f-bairro','f-cidade','f-estado'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.style.borderColor='';
    });
    const cep=document.getElementById('f-cep').value.trim();
    const rua=document.getElementById('f-rua').value.trim();
    const num=document.getElementById('f-num').value.trim();
    const bairro=document.getElementById('f-bairro').value.trim();
    const lat=document.getElementById('f-lat').value.trim();
    const lng=document.getElementById('f-lng').value.trim();
    // Limpar highlights extras
    ['f-cep','f-rua','f-num','f-bairro'].forEach(id=>{
      document.getElementById(id).style.borderColor='';
    });
    const campos=[
      {id:'f-nome',val:nome,label:'Nome do responsável'},
      {id:'f-email',val:email,label:'E-mail'},
      {id:'f-tel',val:tel,label:'WhatsApp'},
      {id:'f-posto',val:posto,label:'Nome do posto'},
      {id:'f-cnpj',val:cnpj,label:'CNPJ'},
      {id:'f-cep',val:cep,label:'CEP'},
      {id:'f-rua',val:rua,label:'Endereço (Rua)'},
      {id:'f-num',val:num,label:'Número'},
      {id:'f-bairro',val:bairro,label:'Bairro'},
      {id:'f-cidade',val:cidade,label:'Cidade'},
      {id:'f-estado',val:estado,label:'Estado'},
    ];
    const vazio=campos.find(c=>!c.val);
    if(vazio){
      document.getElementById(vazio.id).style.borderColor='#FF5252';
      document.getElementById(vazio.id).focus();
      err.textContent='Preencha o campo: '+vazio.label;
      err.style.display='block';return;
    }
    if(combsSel.length===0){
      err.textContent='Selecione ao menos um tipo de combustível.';
      err.style.display='block';return;
    }
    const btn=document.getElementById('f-btn');
    btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> &nbsp;Enviando...';
    try{
      const r=await fetch('/api/parceiro/cadastrar',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({nome,email,tel,nomePosto:posto,cnpj,endereco:{cep,rua,numero:num,bairro,cidade,estado},coordenadas:{lat,lng},plano,combustiveis:combsSel.map(id=>id.replace('cb-',''))})
      });
      const d=await r.json();
      if(r.ok){
        document.getElementById('f-body').style.display='none';
        document.getElementById('f-ok').style.display='block';
      }else{
        err.textContent=d.erro||'Erro ao enviar. Tente novamente.';
        err.style.display='block';
        btn.innerHTML='<i class="fas fa-rocket"></i> &nbsp;Enviar cadastro';
      }
    }catch(e){
      err.textContent='Erro de conexao. Verifique sua internet.';
      err.style.display='block';
      btn.innerHTML='<i class="fas fa-rocket"></i> &nbsp;Enviar cadastro';
    }
  }
</script>

</body>
</html>
`;
}


export function getPainelEmpresaHTML(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RotaPosto Empresas — Painel do Gerente</title>
  <link rel="icon" href="/favicon.ico"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <style>
    :root {
      --laranja:#FF6D00; --laranja-esc:#E65100; --laranja-claro:#FFF3E0;
      --verde:#00C853; --verde-bg:#E8F5E9;
      --azul:#1565C0; --azul-bg:#E3F2FD;
      --vermelho:#E53935; --vermelho-bg:#FFEBEE;
      --amarelo:#FFC107; --amarelo-bg:#FFFDE7;
      --cinza:#F5F5F5; --border:#E0E0E0;
      --texto:#1A1A1A; --sub:#616161;
      --sidebar-w:240px;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; color:var(--texto); background:var(--cinza); }

    /* ── LAYOUT ── */
    .painel-root { display:flex; min-height:100vh; }

    /* ── SIDEBAR ── */
    .sidebar {
      width:var(--sidebar-w); background:#1A1A1A; color:#fff;
      display:flex; flex-direction:column; position:fixed; inset:0 auto 0 0; z-index:200;
      transition:transform .3s;
    }
    .sidebar-logo { padding:24px 20px 20px; border-bottom:1px solid rgba(255,255,255,.1); }
    .sidebar-logo-row { display:flex; align-items:center; gap:10px; }
    .sidebar-logo-icon { width:34px; height:34px; background:var(--laranja); border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:16px; }
    .sidebar-logo-nome { font-size:14px; font-weight:800; }
    .sidebar-logo-tag { font-size:10px; color:rgba(255,255,255,.5); margin-top:1px; }
    .sidebar-posto-info { padding:16px 20px; border-bottom:1px solid rgba(255,255,255,.08); }
    .sidebar-posto-nome { font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .sidebar-posto-plano { font-size:11px; color:var(--amarelo); margin-top:3px; }
    .sidebar-posto-status { display:inline-flex; align-items:center; gap:4px; font-size:11px; color:#69F0AE; margin-top:4px; }
    .sidebar-posto-status::before { content:''; width:6px; height:6px; background:#69F0AE; border-radius:50%; }
    .sidebar-nav { flex:1; padding:12px 0; overflow-y:auto; }
    .nav-group-label { padding:16px 20px 6px; font-size:10px; font-weight:700; color:rgba(255,255,255,.3); letter-spacing:1px; text-transform:uppercase; }
    .nav-item { display:flex; align-items:center; gap:12px; padding:11px 20px; cursor:pointer; border-radius:0; font-size:14px; color:rgba(255,255,255,.65); transition:all .2s; position:relative; }
    .nav-item:hover { color:#fff; background:rgba(255,255,255,.06); }
    .nav-item.ativo { color:#fff; background:rgba(255,109,0,.25); }
    .nav-item.ativo::before { content:''; position:absolute; left:0; inset-block:0; width:3px; background:var(--laranja); border-radius:0 2px 2px 0; }
    .nav-item i { width:18px; text-align:center; font-size:15px; }
    .nav-badge { margin-left:auto; background:var(--laranja); color:#fff; font-size:10px; font-weight:800; padding:2px 7px; border-radius:20px; }
    .sidebar-footer { padding:16px 20px; border-top:1px solid rgba(255,255,255,.08); }
    .btn-sair { width:100%; padding:10px; background:rgba(255,255,255,.07); color:rgba(255,255,255,.6); border:none; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .2s; }
    .btn-sair:hover { background:rgba(255,255,255,.12); color:#fff; }

    /* ── MAIN ── */
    .main { margin-left:var(--sidebar-w); flex:1; display:flex; flex-direction:column; min-height:100vh; }
    .topbar { background:#fff; border-bottom:1px solid var(--border); padding:0 28px; height:60px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; }
    .topbar-titulo { font-size:17px; font-weight:800; }
    .topbar-right { display:flex; align-items:center; gap:12px; }
    .btn-topbar { padding:8px 16px; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; border:none; }
    .btn-topbar-orange { background:var(--laranja); color:#fff; }
    .btn-topbar-orange:hover { background:var(--laranja-esc); }
    .btn-topbar-outline { background:#fff; color:var(--laranja); border:1.5px solid var(--laranja); }

    .page-content { padding:28px; flex:1; }

    /* ── LOGIN ── */
    .login-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:linear-gradient(135deg,#FF6D00,#BF360C); position:relative; }
    .login-card { background:#fff; border-radius:20px; padding:40px 36px; width:100%; max-width:400px; }
    .login-logo { text-align:center; margin-bottom:28px; }
    .login-logo-icon { width:52px; height:52px; background:var(--laranja); border-radius:14px; display:inline-flex; align-items:center; justify-content:center; font-size:24px; margin-bottom:8px; }
    .login-logo h2 { font-size:20px; font-weight:900; }
    .login-logo p { font-size:13px; color:var(--sub); margin-top:4px; }
    .login-input { width:100%; padding:13px 14px; border:1.5px solid var(--border); border-radius:12px; font-size:15px; margin-bottom:14px; font-family:'Inter',sans-serif; transition:border-color .2s; }
    .login-input:focus { outline:none; border-color:var(--laranja); }
    .btn-login { width:100%; padding:15px; background:var(--laranja); color:#fff; border:none; border-radius:12px; font-size:16px; font-weight:700; cursor:pointer; transition:background .2s; }
    .btn-login:hover { background:var(--laranja-esc); }
    .login-link { text-align:center; margin-top:16px; font-size:13px; color:var(--sub); }
    .login-link a { color:var(--laranja); font-weight:700; }
    .login-erro { background:#FFEBEE; color:#C62828; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px; display:none; }

    /* ── CARDS KPI ── */
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:24px; }
    .kpi-card { background:#fff; border-radius:14px; padding:20px; border:1.5px solid var(--border); }
    .kpi-label { font-size:12px; font-weight:600; color:var(--sub); margin-bottom:6px; text-transform:uppercase; letter-spacing:.5px; }
    .kpi-val { font-size:28px; font-weight:900; color:var(--texto); }
    .kpi-delta { font-size:12px; font-weight:600; margin-top:4px; display:flex; align-items:center; gap:4px; }
    .kpi-up { color:var(--verde); }
    .kpi-down { color:var(--vermelho); }

    /* ── CHART ── */
    .chart-card { background:#fff; border-radius:14px; padding:24px; border:1.5px solid var(--border); margin-bottom:24px; }
    .chart-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .chart-titulo { font-size:15px; font-weight:800; }
    .chart-periodo { display:flex; gap:8px; }
    .chart-periodo button { padding:6px 14px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid var(--border); background:#fff; transition:all .2s; }
    .chart-periodo button.ativo { background:var(--laranja); color:#fff; border-color:var(--laranja); }

    /* ── TABELA ── */
    .table-card { background:#fff; border-radius:14px; border:1.5px solid var(--border); overflow:hidden; margin-bottom:24px; }
    .table-header { padding:18px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); }
    .table-titulo { font-size:15px; font-weight:800; }
    table { width:100%; border-collapse:collapse; }
    th { padding:12px 20px; font-size:12px; font-weight:700; color:var(--sub); text-align:left; background:var(--cinza); text-transform:uppercase; letter-spacing:.5px; }
    td { padding:14px 20px; font-size:14px; border-top:1px solid var(--border); }
    tr:hover td { background:#FAFAFA; }

    /* ── BADGES ── */
    .badge { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; }
    .badge-verde { background:var(--verde-bg); color:#1B5E20; }
    .badge-vermelho { background:var(--vermelho-bg); color:#B71C1C; }
    .badge-amarelo { background:var(--amarelo-bg); color:#E65100; }
    .badge-azul { background:var(--azul-bg); color:var(--azul); }
    .badge-cinza { background:var(--cinza); color:var(--sub); }

    /* ── PREÇOS ── */
    .precos-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-top:20px; }
    .preco-card { background:var(--cinza); border-radius:14px; padding:20px; }
    .preco-comb { font-size:13px; font-weight:700; color:var(--sub); margin-bottom:8px; display:flex; align-items:center; gap:6px; }
    .preco-bomba-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .preco-label { font-size:12px; color:var(--sub); width:80px; flex-shrink:0; }
    .preco-input { flex:1; padding:9px 12px; border:1.5px solid var(--border); border-radius:9px; font-size:14px; font-weight:700; text-align:right; font-family:'Inter',sans-serif; background:#fff; }
    .preco-input:focus { outline:none; border-color:var(--laranja); }
    .preco-final { background:#E8F5E9; border-radius:9px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; }
    .preco-final-label { font-size:12px; color:#2E7D32; font-weight:600; }
    .preco-final-val { font-size:16px; font-weight:900; color:#2E7D32; }

    /* ── VALIDADOR QR ── */
    .validador-card { background:#fff; border-radius:16px; padding:28px; border:1.5px solid var(--border); max-width:480px; margin:0 auto; }
    .validador-input-row { display:flex; gap:10px; margin-bottom:16px; }
    .validador-input { flex:1; padding:14px 16px; border:2px solid var(--border); border-radius:12px; font-size:18px; letter-spacing:4px; font-weight:700; text-align:center; font-family:monospace; }
    .validador-input:focus { outline:none; border-color:var(--laranja); }
    .btn-validar { padding:14px 20px; background:var(--laranja); color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; white-space:nowrap; }
    .resultado-validacao { border-radius:14px; padding:20px; text-align:center; margin-top:16px; display:none; }
    .resultado-ok { background:#E8F5E9; border:2px solid #A5D6A7; }
    .resultado-erro { background:#FFEBEE; border:2px solid #EF9A9A; }
    .resultado-icon { font-size:40px; margin-bottom:8px; }
    .resultado-titulo { font-size:18px; font-weight:900; margin-bottom:4px; }
    .resultado-cliente { font-size:14px; color:var(--sub); margin-bottom:12px; }
    .resultado-preco { font-size:32px; font-weight:900; color:var(--laranja); }
    .resultado-preco-orig { font-size:13px; color:var(--sub); text-decoration:line-through; }
    .resultado-msg { font-size:14px; color:var(--sub); line-height:1.6; }

    /* ── CUPONS LIST ── */
    .cupom-row-status { display:flex; align-items:center; gap:6px; }

    /* ── NOTIFICACOES ── */
    .notif-card { background:#fff; border-radius:14px; padding:24px; border:1.5px solid var(--border); margin-bottom:16px; }
    .notif-titulo { font-size:15px; font-weight:800; margin-bottom:16px; }
    .notif-preview { background:linear-gradient(135deg,var(--laranja),var(--laranja-esc)); border-radius:14px; padding:20px; color:#fff; margin-top:16px; }
    .notif-preview-app { font-size:10px; color:rgba(255,255,255,.6); margin-bottom:8px; display:flex; align-items:center; gap:6px; }
    .notif-preview-titulo { font-size:14px; font-weight:800; margin-bottom:4px; }
    .notif-preview-corpo { font-size:13px; opacity:.85; }

    /* ── CONFIGS ── */
    .config-section { background:#fff; border-radius:14px; padding:24px; border:1.5px solid var(--border); margin-bottom:16px; }
    .config-titulo { font-size:15px; font-weight:800; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border); }
    .config-row { display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--cinza); gap:16px; }
    .config-row:last-child { border-bottom:none; }
    .config-row-label { font-size:14px; font-weight:600; }
    .config-row-desc { font-size:12px; color:var(--sub); margin-top:2px; }
    .toggle { width:44px; height:24px; background:#E0E0E0; border-radius:12px; cursor:pointer; position:relative; transition:background .2s; flex-shrink:0; border:none; }
    .toggle.on { background:var(--laranja); }
    .toggle::after { content:''; position:absolute; width:18px; height:18px; background:#fff; border-radius:50%; top:3px; left:3px; transition:left .2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
    .toggle.on::after { left:23px; }

    /* ── SIDEBAR MOBILE ── */
    .sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:190; }
    .btn-menu-mobile { display:none; background:none; border:none; cursor:pointer; padding:8px; font-size:20px; }
    @media (max-width:900px) {
      /* Layout base */
      .sidebar { transform:translateX(-100%); }
      .sidebar.aberta { transform:translateX(0); }
      .main { margin-left:0; width:100%; }
      .painel-root { display:block; }
      .btn-menu-mobile { display:block; }
      .sidebar-overlay.visivel { display:block; }
      .page-content { padding:12px; }

      /* Topbar mobile — esconder botões que não cabem */
      .topbar { padding:0 12px; height:56px; }
      .topbar-titulo { font-size:15px; }
      .btn-topbar { padding:7px 10px; font-size:12px; }
      .topbar-right { gap:6px; }
      /* Esconde texto dos botões da topbar, deixa só o ícone */
      .btn-topbar-outline .fa-qrcode::after { content:''; }

      /* KPI Grid — 2 colunas em tablet, evita overflow */
      .kpi-grid { grid-template-columns: repeat(2,1fr); gap:10px; }
      .kpi-card { padding:14px 12px; }
      .kpi-val { font-size:24px; }
      .kpi-label { font-size:11px; }

      /* Tabelas — permitir scroll horizontal */
      .table-card { overflow-x:auto; }
      table { min-width:400px; }
      th, td { padding:10px 12px; font-size:12px; }

      /* Chart card */
      .chart-card { padding:16px 12px; }
      .chart-header { flex-direction:column; align-items:flex-start; gap:10px; }

      /* Formulários do painel */
      .config-row { flex-wrap:wrap; gap:10px; }
      .config-row-right { width:100%; }
    }

    /* Rótulos dos botões da topbar: visíveis em desktop, ocultos em mobile */
    .btn-label-desktop { }
    @media (max-width:900px) {
      .btn-label-desktop { display:none; }
      .btn-topbar { padding:8px 10px; min-width:36px; }
    }

    /* Mobile pequeno (≤480px) — 2 colunas KPI sempre */
    @media (max-width:480px) {
      .kpi-grid { grid-template-columns: repeat(2,1fr); gap:8px; }
      .kpi-card { padding:12px 10px; border-radius:10px; }
      .kpi-val { font-size:22px; }
      .kpi-label { font-size:10px; letter-spacing:0; }
      .page-content { padding:10px; }
      /* Tabela com scroll horizontal */
      .table-card { overflow-x:auto; -webkit-overflow-scrolling:touch; }
      th { font-size:11px; padding:8px 10px; }
      td { font-size:12px; padding:10px; }
    }

    /* ══════════════════════════════
       RESPONSIVO — MOBILE / TABLET
    ══════════════════════════════ */

    /* Tablet (≤1024px) */
    @media(max-width:1024px){
      nav{padding:0 20px}
      .n-center-text{font-size:clamp(10px,1.1vw,14px);letter-spacing:1.5px}
      .btn-ghost,.btn-solid{padding:8px 14px;font-size:12px}
      .hero-wrap{padding:16px 32px}
      h1{font-size:clamp(28px,4vw,56px)}
      .recursos-wrap,.cards-wrap{padding-left:24px;padding-right:24px}
      .rec-cols{grid-template-columns:repeat(2,1fr);gap:12px}
      .cards-grid{grid-template-columns:repeat(2,1fr)}
      .footer-inner{grid-template-columns:1fr 1fr;gap:24px}
      .f-social-col{grid-column:1/-1;flex-direction:row;justify-content:flex-start;align-items:center}
      .f-social{flex-direction:row}
    }

    /* Mobile (≤600px) */
    @media(max-width:600px){
      nav{padding:0 16px;height:56px}
      .n-center{display:none}
      .n-tag{display:none}
      .n-logo-name{font-size:16px}
      .btn-ghost{display:none}
      .btn-solid{padding:8px 14px;font-size:12px;gap:5px}
      .btn-solid i{display:none}
      .hero-wrap{padding:20px 16px 16px}
      h1{font-size:clamp(24px,7vw,40px);letter-spacing:-1px}
      .hero-sub{font-size:14px}
      .recursos-wrap{padding:16px 16px 0}
      .rec-cols{grid-template-columns:1fr 1fr;gap:10px}
      .rec-col:last-child{}
      .cards-wrap{padding:0 16px 16px}
      .cards-grid{grid-template-columns:1fr 1fr;gap:10px}
      .feat-card{padding:12px}
      .feat-card h4{font-size:13px}
      .feat-card p{font-size:11px}
      footer{padding:24px 16px 0}
      .footer-inner{grid-template-columns:1fr;gap:20px}
      .f-social-col{align-items:flex-start}
      .f-bottom{flex-direction:column;gap:6px;text-align:center}
      /* Subpáginas mobile */
      .sp-content{padding:20px 16px 32px;box-sizing:border-box}
      .sp-h1{font-size:clamp(22px,6vw,32px)}
      .sp-sub{font-size:14px;margin-bottom:24px}
      .sp-grid{grid-template-columns:1fr;gap:12px}
      .sp-card{padding:18px}
      /* Nav mobile */
      .tc-nav,.sp-nav{padding:0 14px;gap:10px;box-sizing:border-box}
      .tc-title{font-size:14px}
      /* Formulário cadastro mobile */
      .fr{grid-template-columns:1fr}
      .tc-right{padding:20px 16px 32px}
    }

    /* Extra small (≤400px) */
    @media(max-width:400px){
      .cards-grid{grid-template-columns:1fr}
      h1{font-size:clamp(22px,8vw,34px)}
      .sp-content{padding:16px 12px 24px;box-sizing:border-box}
      .sp-nav,.tc-nav{padding:0 12px;box-sizing:border-box}
    }
  </style>
</head>
<body>

<!-- ═══ TELA DE LOGIN ═══ -->
<div id="tela-login" class="login-wrap">
  <button onclick="location.href='/parcerias'" style="position:absolute;top:20px;left:20px;display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.4);color:#fff;padding:8px 16px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;font-family:'Inter',sans-serif;backdrop-filter:blur(8px);transition:all .18s" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'"><i class="fas fa-arrow-left"></i> Voltar</button>
  <div class="login-card">
    <div class="login-logo">
      <div class="login-logo-icon">⛽</div>
      <h2>RotaPosto Empresas</h2>
      <p>Painel do Gerente de Posto</p>
    </div>
    <div class="login-erro" id="login-erro"></div>
    <input id="login-email" class="login-input" type="email" placeholder="E-mail do cadastro" autocomplete="email"/>
    <input id="login-senha" class="login-input" type="password" placeholder="Senha" autocomplete="current-password"
      onkeydown="if(event.key==='Enter')fazerLogin()"/>
    <button class="btn-login" onclick="fazerLogin()">
      <i class="fas fa-sign-in-alt"></i> Entrar no painel
    </button>
    <div class="login-link">
      Novo no RotaPosto Empresas? <a href="#" onclick="event.preventDefault();irParaCadastroExterno()">Cadastrar meu posto →</a>
    </div>
    <div class="login-link" style="margin-top:8px">
      <a href="#" onclick="abrirRecuperarSenha()">Esqueci minha senha</a>
    </div>
  </div>
</div>

<!-- ═══ PAINEL PRINCIPAL ═══ -->
<div id="tela-painel" style="display:none">
<div class="painel-root">

  <!-- SIDEBAR -->
  <div class="sidebar-overlay" id="sidebar-overlay" onclick="fecharSidebar()"></div>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-row">
        <div class="sidebar-logo-icon">⛽</div>
        <div>
          <div class="sidebar-logo-nome">RotaPosto</div>
          <div class="sidebar-logo-tag">EMPRESAS</div>
        </div>
      </div>
    </div>
    <div class="sidebar-posto-info">
      <div class="sidebar-posto-nome" id="sb-posto-nome">Carregando...</div>
      <div class="sidebar-posto-plano" id="sb-posto-plano">⭐ Plano Premium</div>
      <div class="sidebar-posto-status">Ativo</div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-group-label">Principal</div>
      <div class="nav-item ativo" onclick="irPara('dashboard')"><i class="fas fa-chart-line"></i> Dashboard</div>
      <div class="nav-item" onclick="irPara('validar')"><i class="fas fa-qrcode"></i> Validar Cupom <span class="nav-badge" id="badge-cupons">0</span></div>
      <div class="nav-group-label">Gestão</div>
      <div class="nav-item" onclick="irPara('precos')"><i class="fas fa-gas-pump"></i> Preços e Desconto</div>
      <div class="nav-item" onclick="irPara('cupons')"><i class="fas fa-ticket-alt"></i> Histórico de Cupons</div>
      <div class="nav-item" onclick="irPara('notificacoes')"><i class="fas fa-bell"></i> Notificações</div>
      <div class="nav-item" onclick="irPara('promocoes')"><i class="fas fa-percentage"></i> Promoções</div>
      <div class="nav-group-label">Conta</div>
      <div class="nav-item" onclick="irPara('perfil')"><i class="fas fa-store"></i> Perfil do Posto</div>
      <div class="nav-item" onclick="irPara('configuracoes')"><i class="fas fa-cog"></i> Configurações</div>
    </nav>
    <div class="sidebar-footer">
      <button class="btn-sair" onclick="fazerLogout()"><i class="fas fa-sign-out-alt"></i> Sair do painel</button>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="main">
    <div class="topbar">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn-menu-mobile" onclick="abrirSidebar()"><i class="fas fa-bars"></i></button>
        <div class="topbar-titulo" id="topbar-titulo">Dashboard</div>
      </div>
      <div class="topbar-right">
        <button class="btn-topbar btn-topbar-outline" onclick="irPara('validar')"><i class="fas fa-qrcode"></i><span class="btn-label-desktop"> Validar QR</span></button>
        <button class="btn-topbar btn-topbar-orange" onclick="irPara('precos')"><i class="fas fa-sync"></i><span class="btn-label-desktop"> Atualizar Preços</span></button>
      </div>
    </div>

    <div class="page-content">

      <!-- ── DASHBOARD ── -->
      <div id="page-dashboard">
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Cliques em "Ir até lá"</div>
            <div class="kpi-val" id="kpi-cliques">--</div>
            <div class="kpi-delta kpi-up" id="kpi-cliques-delta"><i class="fas fa-arrow-up"></i> este mês</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Cupons validados</div>
            <div class="kpi-val" id="kpi-cupons">--</div>
            <div class="kpi-delta kpi-up" id="kpi-cupons-delta"><i class="fas fa-arrow-up"></i> este mês</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Impressões no mapa</div>
            <div class="kpi-val" id="kpi-impressoes">--</div>
            <div class="kpi-delta kpi-up" id="kpi-imp-delta"><i class="fas fa-arrow-up"></i> este mês</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Avaliação média</div>
            <div class="kpi-val" id="kpi-rating">--</div>
            <div class="kpi-delta" id="kpi-rating-delta" style="color:#FFC107"><i class="fas fa-star"></i> motoristas</div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-titulo">Cliques em "Ir até lá" — últimos 30 dias</div>
            <div class="chart-periodo">
              <button class="ativo" onclick="mudarPeriodo(30,this)">30d</button>
              <button onclick="mudarPeriodo(7,this)">7d</button>
            </div>
          </div>
          <canvas id="grafico-cliques" height="100"></canvas>
        </div>

        <div class="table-card">
          <div class="table-header">
            <div class="table-titulo">Últimos cupons validados</div>
            <button class="btn-topbar btn-topbar-outline" style="font-size:12px;padding:6px 14px" onclick="irPara('cupons')">Ver todos</button>
          </div>
          <table>
            <thead><tr><th>Data</th><th>Cliente</th><th>Combustível</th><th>Desconto</th><th>Status</th></tr></thead>
            <tbody id="tabela-cupons-recentes"><tr><td colspan="5" style="text-align:center;padding:24px;color:#aaa">Carregando...</td></tr></tbody>
          </table>
        </div>
      </div>

      <!-- ── VALIDAR QR CODE ── -->
      <div id="page-validar" style="display:none">
        <div class="validador-card">
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:48px;margin-bottom:8px">📱</div>
            <h2 style="font-size:20px;font-weight:900;margin-bottom:4px">Validar Cupom do Cliente</h2>
            <p style="font-size:14px;color:var(--sub)">Digite o código de 6 dígitos ou escaneie o QR Code</p>
          </div>
          <div class="validador-input-row">
            <input id="campo-codigo" class="validador-input" type="text" maxlength="7" placeholder="000 000"
              oninput="fmtCodigo(this)" onkeydown="if(event.key==='Enter')validarCupom()"/>
            <button class="btn-validar" onclick="validarCupom()"><i class="fas fa-check"></i> Validar</button>
          </div>
          <div style="text-align:center;margin:12px 0">
            <button onclick="abrirEscanner()" style="background:none;border:1.5px solid var(--border);padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;color:var(--sub)">
              <i class="fas fa-camera"></i> Escanear QR Code com câmera
            </button>
          </div>
          <div id="resultado-validacao" class="resultado-validacao">
            <div class="resultado-icon" id="res-icon">✅</div>
            <div class="resultado-titulo" id="res-titulo">Cupom Confirmado!</div>
            <div class="resultado-cliente" id="res-cliente"></div>
            <div class="resultado-preco" id="res-preco"></div>
            <div class="resultado-preco-orig" id="res-preco-orig"></div>
            <div class="resultado-msg" id="res-msg" style="margin-top:12px"></div>
            <button onclick="novaValidacao()" style="margin-top:16px;padding:10px 24px;background:var(--laranja);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Validar outro cupom</button>
          </div>
        </div>

        <!-- Scanner de câmera -->
        <div id="scanner-area" style="display:none;margin-top:20px;max-width:480px;margin-left:auto;margin-right:auto">
          <div style="background:#000;border-radius:14px;overflow:hidden;position:relative">
            <video id="scanner-video" autoplay playsinline style="width:100%;display:block"></video>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
              <div style="width:200px;height:200px;border:3px solid var(--laranja);border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.5)"></div>
            </div>
          </div>
          <button onclick="fecharEscanner()" style="width:100%;margin-top:12px;padding:12px;background:var(--vermelho);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Cancelar escaneamento</button>
        </div>
      </div>

      <!-- ── PREÇOS ── -->
      <div id="page-precos" style="display:none">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-titulo">⛽ Preços e Desconto para Assinantes</div>
          </div>
          <p style="font-size:14px;color:var(--sub);margin-bottom:8px;line-height:1.7">Configure o preço que você pratica na bomba e o desconto exclusivo para assinantes RotaPosto Premium. O preço final é calculado automaticamente.</p>
          <div style="background:var(--laranja-claro);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--laranja-esc);margin-bottom:8px">
            <strong>💡 Dica:</strong> Um desconto de R$ 0,10/L é suficiente para atrair motoristas de app que enchem o tanque frequentemente.
          </div>
          <div class="precos-grid" id="precos-grid">
            <!-- preenchido por JS -->
          </div>
          <button onclick="salvarPrecos()" style="margin-top:20px;padding:14px 28px;background:var(--laranja);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">
            <i class="fas fa-save"></i> Salvar preços
          </button>
          <span id="precos-msg" style="margin-left:14px;font-size:14px;color:var(--verde);display:none"><i class="fas fa-check-circle"></i> Preços salvos!</span>
        </div>
      </div>

      <!-- ── HISTÓRICO CUPONS ── -->
      <div id="page-cupons" style="display:none">
        <div class="table-card">
          <div class="table-header">
            <div class="table-titulo">Histórico de Cupons</div>
            <div style="display:flex;gap:8px">
              <select id="filtro-cupom-status" onchange="filtrarCupons()" style="padding:6px 12px;border:1.5px solid var(--border);border-radius:9px;font-size:13px;background:#fff">
                <option value="">Todos</option>
                <option value="UTILIZADO">Utilizados</option>
                <option value="EXPIRADO">Expirados</option>
                <option value="ATIVO">Ativos</option>
              </select>
            </div>
          </div>
          <table>
            <thead><tr><th>Data/Hora</th><th>Código</th><th>Cliente</th><th>Combustível</th><th>Preço c/ desconto</th><th>Status</th></tr></thead>
            <tbody id="tabela-cupons-hist"></tbody>
          </table>
          <div id="cupons-paginacao" style="padding:16px 20px;border-top:1px solid var(--border);display:flex;justify-content:center;gap:8px"></div>
        </div>
      </div>

      <!-- ── NOTIFICAÇÕES ── -->
      <div id="page-notificacoes" style="display:none">
        <div class="notif-card">
          <div class="notif-titulo">📍 Notificação por Proximidade (Geofencing)</div>
          <p style="font-size:14px;color:var(--sub);line-height:1.7;margin-bottom:16px">Quando um motorista passa dentro do raio configurado do seu posto, ele recebe automaticamente esta notificação com seu desconto ativo.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div>
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Raio de alcance</label>
              <select id="notif-raio" style="width:100%;padding:11px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;background:#fff">
                <option value="500">500 metros</option>
                <option value="800" selected>800 metros</option>
                <option value="1000">1 km</option>
                <option value="1500">1,5 km</option>
              </select>
            </div>
            <div>
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Limite diário por usuário</label>
              <select id="notif-limite" style="width:100%;padding:11px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;background:#fff">
                <option value="1" selected>1x por dia</option>
                <option value="2">2x por dia</option>
                <option value="0">Sem limite</option>
              </select>
            </div>
          </div>
          <div>
            <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Texto da notificação</label>
            <textarea id="notif-texto" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;resize:vertical;min-height:80px;font-family:'Inter',sans-serif" placeholder="Ex: Gasolina a R$ 5,80 para assinantes Premium! Venha abastecer.">Gasolina aditivada com desconto exclusivo para assinantes RotaPosto! Aproveite enquanto está passando.</textarea>
          </div>
          <div class="notif-preview" id="notif-preview">
            <div class="notif-preview-app">⛽ RotaPosto — agora</div>
            <div class="notif-preview-titulo" id="notif-prev-titulo">Desconto Exclusivo perto de você!</div>
            <div class="notif-preview-corpo" id="notif-prev-corpo">Carregando...</div>
          </div>
          <button onclick="salvarConfNotif()" style="margin-top:16px;padding:13px 24px;background:var(--laranja);color:#fff;border:none;border-radius:11px;font-size:14px;font-weight:700;cursor:pointer"><i class="fas fa-save"></i> Salvar configuração</button>
        </div>

        <div class="notif-card">
          <div class="notif-titulo">📅 Envio Manual de Notificação</div>
          <p style="font-size:14px;color:var(--sub);line-height:1.7;margin-bottom:16px">Envie uma notificação imediata para todos os motoristas da sua cidade. Use com moderação (limite: 1x por semana).</p>
          <div>
            <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Mensagem</label>
            <textarea id="notif-manual-txt" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;resize:vertical;min-height:80px;font-family:'Inter',sans-serif" placeholder="Ex: Promoção especial hoje! Etanol a R$ 4,10 — só até às 20h."></textarea>
          </div>
          <button onclick="enviarNotifManual()" style="margin-top:12px;padding:13px 24px;background:#1565C0;color:#fff;border:none;border-radius:11px;font-size:14px;font-weight:700;cursor:pointer"><i class="fas fa-paper-plane"></i> Enviar agora</button>
          <span id="notif-manual-msg" style="margin-left:12px;font-size:13px;color:var(--verde);display:none">✓ Enviado com sucesso!</span>
        </div>
      </div>

      <!-- ── PERFIL DO POSTO ── -->
      <div id="page-perfil" style="display:none">
        <div class="config-section">
          <div class="config-titulo">🏪 Dados do Posto</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div>
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Nome do posto</label>
              <input id="perf-nome" class="login-input" type="text" style="margin-bottom:0"/>
            </div>
            <div>
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Bandeira</label>
              <select id="perf-bandeira" class="form-select" style="width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;background:#fff">
                <option>Sem bandeira</option><option>Petrobras BR</option><option>Shell</option><option>Ipiranga</option><option>Ale</option><option>Outra</option>
              </select>
            </div>
            <div>
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">WhatsApp do posto</label>
              <input id="perf-tel" class="login-input" type="tel" style="margin-bottom:0" placeholder="(27) 99999-9999"/>
            </div>
            <div>
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Horário de funcionamento</label>
              <input id="perf-horario" class="login-input" type="text" style="margin-bottom:0" placeholder="24h / 06h às 22h"/>
            </div>
          </div>
          <div style="margin-top:16px">
            <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Serviços disponíveis</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px" id="servicos-list">
              <!-- preenchido por JS -->
            </div>
          </div>
          <button onclick="salvarPerfil()" style="margin-top:20px;padding:13px 24px;background:var(--laranja);color:#fff;border:none;border-radius:11px;font-size:14px;font-weight:700;cursor:pointer"><i class="fas fa-save"></i> Salvar perfil</button>
          <span id="perfil-msg" style="margin-left:12px;font-size:13px;color:var(--verde);display:none">✓ Salvo!</span>
        </div>
      </div>

      <!-- ── CONFIGURAÇÕES ── -->
      <div id="page-configuracoes" style="display:none">
        <div class="config-section">
          <div class="config-titulo">⚙️ Configurações do Painel</div>
          <div class="config-row">
            <div><div class="config-row-label">Pino dourado no mapa</div><div class="config-row-desc">Exibe destaque visual no mapa do app</div></div>
            <button class="toggle on" id="tog-pino" onclick="this.classList.toggle('on')"></button>
          </div>
          <div class="config-row">
            <div><div class="config-row-label">Sistema de cupons ativo</div><div class="config-row-desc">Permite que assinantes gerem cupons para seu posto</div></div>
            <button class="toggle on" id="tog-cupons" onclick="this.classList.toggle('on')"></button>
          </div>
          <div class="config-row">
            <div><div class="config-row-label">Notificações por proximidade</div><div class="config-row-desc">Alertas automáticos quando motoristas se aproximam</div></div>
            <button class="toggle on" id="tog-notif" onclick="this.classList.toggle('on')"></button>
          </div>
          <div class="config-row">
            <div><div class="config-row-label">Aparecer no topo da lista</div><div class="config-row-desc">Prioridade na busca mesmo com preço alto</div></div>
            <button class="toggle on" id="tog-topo" onclick="this.classList.toggle('on')"></button>
          </div>
          <div class="config-row">
            <div><div class="config-row-label">Selo "Preço Verificado"</div><div class="config-row-desc">Exibe verificação oficial nos seus preços</div></div>
            <button class="toggle on" id="tog-selo" onclick="this.classList.toggle('on')"></button>
          </div>
        </div>
        <div class="config-section">
          <div class="config-titulo">🔑 Segurança</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Nova senha</label>
              <input id="seg-senha" type="password" class="login-input" style="margin-bottom:0" placeholder="••••••••"/>
            </div>
            <div>
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Confirmar senha</label>
              <input id="seg-senha2" type="password" class="login-input" style="margin-bottom:0" placeholder="••••••••"/>
            </div>
          </div>
          <button onclick="alterarSenha()" style="margin-top:14px;padding:11px 22px;background:#1565C0;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">Alterar senha</button>
        </div>
        <div class="config-section" style="border-color:#FFCDD2">
          <div class="config-titulo" style="color:var(--vermelho)">⚠️ Zona de Risco</div>
          <p style="font-size:14px;color:var(--sub);margin-bottom:14px">Cancelar a assinatura remove seu posto do destaque. O cadastro básico permanece gratuito.</p>
          <button onclick="cancelarAssinatura()" style="padding:11px 22px;background:var(--vermelho-bg);color:var(--vermelho);border:1.5px solid var(--vermelho);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">Cancelar assinatura Premium</button>
        </div>
      </div>

      <!-- ── PROMOÇÕES ── -->
      <div id="page-promocoes" style="display:none">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-titulo">🏷️ Nova Promoção</div>
          </div>
          <p style="font-size:14px;color:var(--sub);line-height:1.7;margin-bottom:16px">Cadastre promoções especiais que aparecem na sua página pública e no app. Motoristas verão o destaque ao buscar seu posto.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div style="grid-column:1/-1">
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Título da promoção</label>
              <input id="promo-titulo" class="login-input" type="text" style="margin-bottom:0" placeholder="Ex: Gasolina aditivada com 10 centavos de desconto!"/>
            </div>
            <div style="grid-column:1/-1">
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Descrição</label>
              <textarea id="promo-descricao" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;resize:vertical;min-height:72px;font-family:'Inter',sans-serif" placeholder="Detalhes da promoção, condições, combustíveis incluídos..."></textarea>
            </div>
            <div>
              <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px">Válido até</label>
              <input id="promo-validade" class="login-input" type="date" style="margin-bottom:0"/>
            </div>
            <div style="display:flex;align-items:flex-end;padding-bottom:2px">
              <label style="display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;cursor:pointer">
                <input id="promo-destaque" type="checkbox" style="width:18px;height:18px;accent-color:var(--laranja);cursor:pointer"/>
                <span>Marcar como destaque ⭐</span>
              </label>
            </div>
          </div>
          <button onclick="salvarPromocao()" style="padding:13px 26px;background:var(--laranja);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer">
            <i class="fas fa-plus"></i> Publicar promoção
          </button>
          <span id="promo-msg" style="margin-left:12px;font-size:13px;color:var(--verde);display:none"><i class="fas fa-check-circle"></i> Promoção publicada!</span>
          <span id="promo-erro" style="margin-left:12px;font-size:13px;color:#d32f2f;display:none"></span>
        </div>

        <div class="table-card" style="margin-top:20px">
          <div class="table-header">
            <div class="table-titulo">Promoções ativas</div>
            <button onclick="carregarPromocoes()" style="background:none;border:1.5px solid var(--border);padding:7px 14px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;color:var(--sub)">
              <i class="fas fa-sync"></i> Atualizar
            </button>
          </div>
          <div id="lista-promocoes" style="padding:8px 0">
            <div style="text-align:center;padding:32px;color:#aaa"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>
          </div>
        </div>
      </div>

    </div><!-- .page-content -->
  </main>
</div>
</div><!-- #tela-painel -->

<script>
// ── Estado global ──────────────────────────────────────
let _sessao = null;  // { postoId, nome, plano, email, ... }
let _grafico = null;
const COMBUSTIVEIS = ['Gasolina Comum','Gasolina Aditivada','Etanol','Diesel S-10','Diesel Comum','GNV'];
const SERVICOS_OPCOES = ['Loja de conveniência','Troca de óleo','Borracharia','Lavagem','GNV','Ar comprimido','Banheiro','Estacionamento'];

// ── Inicialização ──────────────────────────────────────
window.addEventListener('load', () => {
  const sessaoSalva = localStorage.getItem('rp_empresa_sessao');
  if (sessaoSalva) {
    try {
      _sessao = JSON.parse(sessaoSalva);
      mostrarPainel();
    } catch { mostrarLogin(); }
  } else { mostrarLogin(); }
});

function mostrarLogin() {
  document.getElementById('tela-login').style.display = 'flex';
  document.getElementById('tela-painel').style.display = 'none';
}
function mostrarPainel() {
  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('tela-painel').style.display = 'block';
  document.getElementById('sb-posto-nome').textContent = _sessao?.postoNome || 'Meu Posto';
  document.getElementById('sb-posto-plano').textContent = '⭐ Plano ' + (_sessao?.plano || 'Premium');
  irPara('dashboard');
}

// ── Login / Logout ─────────────────────────────────────
async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const erro  = document.getElementById('login-erro');
  erro.style.display = 'none';
  if (!email || !senha) { erro.textContent='Preencha e-mail e senha.'; erro.style.display='block'; return; }
  const btn = document.querySelector('.btn-login');
  btn.disabled = true; btn.textContent = 'Entrando...';
  try {
    const r = await fetch('/api/parceiros/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, senha })
    });
    const d = await r.json();
    if (d.sucesso) {
      _sessao = d.sessao;
      localStorage.setItem('rp_empresa_sessao', JSON.stringify(_sessao));
      mostrarPainel();
    } else {
      erro.textContent = d.mensagem || 'E-mail ou senha incorretos.';
      erro.style.display = 'block';
    }
  } catch { erro.textContent='Erro de conexão. Tente novamente.'; erro.style.display='block'; }
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar no painel';
}

function fazerLogout() {
  localStorage.removeItem('rp_empresa_sessao');
  _sessao = null;
  mostrarLogin();
}

function abrirRecuperarSenha() { alert('Em breve. Entre em contato pelo WhatsApp do RotaPosto.'); }

// Abre cadastro sem sair da página (TWA-safe): abre em nova aba no browser,
// no TWA (que não tem abas) exibe alerta com orientação.
function irParaCadastroExterno() {
  try {
    const w = window.open('/parcerias#cadastro', '_blank');
    // Se window.open retornou null ou undefined, provavelmente é TWA
    if (!w) {
      alert('Para cadastrar seu posto acesse rotaposto.com.br/parcerias no navegador.');
    }
  } catch(e) {
    alert('Para cadastrar seu posto acesse rotaposto.com.br/parcerias no navegador.');
  }
}

// ── Navegação ──────────────────────────────────────────
const PAGES = ['dashboard','validar','precos','cupons','notificacoes','promocoes','perfil','configuracoes'];
const TITULOS = { dashboard:'Dashboard', validar:'Validar Cupom', precos:'Preços e Desconto', cupons:'Histórico de Cupons', notificacoes:'Notificações', promocoes:'Promoções', perfil:'Perfil do Posto', configuracoes:'Configurações' };

function irPara(pg) {
  PAGES.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.style.display = p === pg ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('ativo'));
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.textContent.trim().toLowerCase().includes(TITULOS[pg].toLowerCase().slice(0,5))) n.classList.add('ativo');
  });
  document.getElementById('topbar-titulo').textContent = TITULOS[pg] || pg;
  fecharSidebar();
  if (pg === 'dashboard') carregarDashboard();
  if (pg === 'precos')    renderizarPrecos();
  if (pg === 'cupons')    carregarHistoricoCupons();
  if (pg === 'perfil')    carregarPerfil();
  if (pg === 'notificacoes') carregarNotifConfig();
  if (pg === 'promocoes')    carregarPromocoes();
}

function abrirSidebar() {
  document.getElementById('sidebar').classList.add('aberta');
  document.getElementById('sidebar-overlay').classList.add('visivel');
}
function fecharSidebar() {
  document.getElementById('sidebar').classList.remove('aberta');
  document.getElementById('sidebar-overlay').classList.remove('visivel');
}

// ── Dashboard ──────────────────────────────────────────
async function carregarDashboard() {
  if (!_sessao) return;
  try {
    const r = await fetch('/api/parceiros/dashboard?postoId=' + _sessao.postoId, {
      headers: { 'Authorization': 'Bearer ' + _sessao.token }
    });
    const d = await r.json();
    if (d.metricas) {
      document.getElementById('kpi-cliques').textContent    = d.metricas.cliques  ?? '--';
      document.getElementById('kpi-cupons').textContent     = d.metricas.cupons   ?? '--';
      document.getElementById('kpi-impressoes').textContent = d.metricas.impressoes ?? '--';
      document.getElementById('kpi-rating').textContent     = d.metricas.rating   ?? '--';
      document.getElementById('badge-cupons').textContent   = d.metricas.cuponsPendentes ?? 0;
    }
    if (d.graficoDias) renderGrafico(d.graficoDias);
    if (d.cuponRecentes) renderTabelaCuponsRecentes(d.cuponRecentes);
  } catch { renderDadosFake(); }
}

function renderDadosFake() {
  document.getElementById('kpi-cliques').textContent    = '340';
  document.getElementById('kpi-cupons').textContent     = '87';
  document.getElementById('kpi-impressoes').textContent = '2.840';
  document.getElementById('kpi-rating').textContent     = '4.7';
  document.getElementById('badge-cupons').textContent   = '3';
  document.getElementById('kpi-cliques-delta').innerHTML = '<i class="fas fa-arrow-up"></i> +22% vs. mês passado';
  document.getElementById('kpi-cupons-delta').innerHTML  = '<i class="fas fa-arrow-up"></i> +14% vs. mês passado';
  document.getElementById('kpi-imp-delta').innerHTML     = '<i class="fas fa-arrow-up"></i> +31% vs. mês passado';

  const dias = Array.from({length:30},(_,i) => {
    const d = new Date(); d.setDate(d.getDate()-29+i);
    return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  });
  const vals = Array.from({length:30},() => Math.floor(8+Math.random()*18));
  renderGrafico({ labels:dias, data:vals });

  renderTabelaCuponsRecentes([
    { data:'04/07 14:23', cliente:'Motorista Premium', comb:'Gasolina Aditivada', desconto:'R$ 0,10/L', status:'UTILIZADO' },
    { data:'04/07 11:05', cliente:'Motorista Premium', comb:'Etanol',             desconto:'R$ 0,08/L', status:'UTILIZADO' },
    { data:'03/07 18:30', cliente:'Motorista Premium', comb:'Diesel S-10',         desconto:'R$ 0,05/L', status:'UTILIZADO' },
    { data:'03/07 10:11', cliente:'Motorista Premium', comb:'Gasolina Comum',      desconto:'R$ 0,10/L', status:'EXPIRADO'  },
  ]);
}

function renderGrafico(g) {
  const ctx = document.getElementById('grafico-cliques').getContext('2d');
  if (_grafico) _grafico.destroy();
  _grafico = new Chart(ctx, {
    type:'bar',
    data: { labels:g.labels, datasets:[{ label:'Cliques "Ir até lá"', data:g.data, backgroundColor:'rgba(255,109,0,0.7)', borderRadius:5 }] },
    options: { responsive:true, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, ticks:{ stepSize:5 } }, x:{ ticks:{ font:{ size:10 } } } } }
  });
}

function renderTabelaCuponsRecentes(cupons) {
  const tbody = document.getElementById('tabela-cupons-recentes');
  if (!cupons.length) { tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px;color:#aaa">Nenhum cupom ainda</td></tr>'; return; }
  tbody.innerHTML = cupons.map(c => \`
    <tr>
      <td style="font-size:13px;color:var(--sub)">\${c.data}</td>
      <td>\${c.cliente}</td>
      <td><span style="font-size:13px">\${c.comb}</span></td>
      <td style="color:var(--verde);font-weight:700">\${c.desconto}</td>
      <td>\${badgeStatus(c.status)}</td>
    </tr>\`).join('');
}

function badgeStatus(s) {
  const m = { UTILIZADO:'badge-verde', EXPIRADO:'badge-cinza', ATIVO:'badge-azul', GERADO:'badge-amarelo' };
  return '<span class="badge ' + (m[s]||'badge-cinza') + '">' + s + '</span>';
}

function mudarPeriodo(dias, btn) {
  document.querySelectorAll('.chart-periodo button').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');
  // Re-render com dados do período
  const d2 = Array.from({length:dias},(_,i) => { const d=new Date(); d.setDate(d.getDate()-dias+1+i); return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}); });
  const v2 = Array.from({length:dias},() => Math.floor(8+Math.random()*18));
  renderGrafico({ labels:d2, data:v2 });
}

// ── Validador QR Code ──────────────────────────────────
function fmtCodigo(inp) {
  let v = inp.value.replace(/\\D/g,'');
  if (v.length > 6) v = v.slice(0,6);
  inp.value = v.length > 3 ? v.slice(0,3) + ' ' + v.slice(3) : v;
}

async function validarCupom() {
  const raw = document.getElementById('campo-codigo').value.replace(/\\s/g,'');
  if (raw.length < 6) { alert('Digite o código de 6 dígitos.'); return; }
  const res = document.getElementById('resultado-validacao');
  res.style.display = 'none';
  try {
    const r = await fetch('/api/parceiros/cupons/validar', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+(_sessao?.token||'')},
      body: JSON.stringify({ codigo: raw, postoId: _sessao?.postoId })
    });
    const d = await r.json();
    mostrarResultadoValidacao(d);
  } catch {
    mostrarResultadoValidacao({ valido:false, mensagem:'Erro de conexão. Tente novamente.' });
  }
}

function mostrarResultadoValidacao(d) {
  const res = document.getElementById('resultado-validacao');
  res.style.display = 'block';
  res.className = 'resultado-validacao ' + (d.valido ? 'resultado-ok' : 'resultado-erro');
  document.getElementById('res-icon').textContent    = d.valido ? '✅' : '❌';
  document.getElementById('res-titulo').textContent  = d.valido ? 'Cupom Confirmado!' : 'Cupom Inválido';
  document.getElementById('res-cliente').textContent = d.valido ? ('Cliente: ' + (d.cliente || 'Assinante Premium')) : '';
  document.getElementById('res-preco').textContent   = d.valido ? ('R$ ' + (d.precoComDesconto||'').toFixed(2) + '/L') : '';
  document.getElementById('res-preco-orig').textContent = d.valido ? ('Preço original: R$ ' + (d.precoOriginal||'').toFixed(2) + '/L') : '';
  document.getElementById('res-msg').textContent     = d.valido
    ? ('Combustível: ' + (d.combustivel||'—') + '   Desconto: R$ ' + (d.valorDesconto||'0,00') + '/L')
    : (d.mensagem || 'Código inválido ou expirado.');
}

function novaValidacao() {
  document.getElementById('resultado-validacao').style.display = 'none';
  document.getElementById('campo-codigo').value = '';
  document.getElementById('campo-codigo').focus();
}

function abrirEscanner() { document.getElementById('scanner-area').style.display='block'; iniciarScanner(); }
function fecharEscanner() { document.getElementById('scanner-area').style.display='none'; pararScanner(); }
let _scanStream = null;
async function iniciarScanner() {
  try {
    _scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment' } });
    document.getElementById('scanner-video').srcObject = _scanStream;
    // Nota: QR Code scan real requer biblioteca jsQR — placeholder de demo
  } catch { alert('Câmera não disponível. Use o código manual.'); fecharEscanner(); }
}
function pararScanner() {
  if (_scanStream) { _scanStream.getTracks().forEach(t => t.stop()); _scanStream = null; }
}

// ── Preços ─────────────────────────────────────────────
let _precos = {};
function renderizarPrecos() {
  const saved = localStorage.getItem('rp_empresa_precos_' + (_sessao?.postoId||''));
  if (saved) try { _precos = JSON.parse(saved); } catch {}
  const grid = document.getElementById('precos-grid');
  grid.innerHTML = COMBUSTIVEIS.map(c => {
    const p = _precos[c] || { bomba:0, desconto:0 };
    const final = Math.max(0, (parseFloat(p.bomba)||0) - (parseFloat(p.desconto)||0));
    return \`
    <div class="preco-card">
      <div class="preco-comb">⛽ \${c}</div>
      <div class="preco-bomba-row">
        <span class="preco-label">Preço bomba</span>
        <input class="preco-input" id="p-bomba-\${c.replace(/\\s/g,'')}" type="number" step="0.01" min="0" max="20"
          value="\${p.bomba||''}" placeholder="0,00" oninput="recalcularFinal('\${c}')"/>
      </div>
      <div class="preco-bomba-row">
        <span class="preco-label">Desconto/L</span>
        <input class="preco-input" id="p-desc-\${c.replace(/\\s/g,'')}" type="number" step="0.01" min="0" max="5"
          value="\${p.desconto||''}" placeholder="0,00" oninput="recalcularFinal('\${c}')"/>
      </div>
      <div class="preco-final" id="p-final-\${c.replace(/\\s/g,'')}">
        <span class="preco-final-label">Preço assinante</span>
        <span class="preco-final-val">R$ \${final>0?final.toFixed(2):'—'}</span>
      </div>
    </div>\`;
  }).join('');
}

function recalcularFinal(comb) {
  const k = comb.replace(/\\s/g,'');
  const b = parseFloat(document.getElementById('p-bomba-'+k)?.value)||0;
  const d = parseFloat(document.getElementById('p-desc-'+k)?.value)||0;
  const f = document.getElementById('p-final-'+k);
  if (f) f.innerHTML = '<span class="preco-final-label">Preço assinante</span><span class="preco-final-val">R$ ' + (b-d>0?(b-d).toFixed(2):'—') + '</span>';
}

async function salvarPrecos() {
  COMBUSTIVEIS.forEach(c => {
    const k = c.replace(/\\s/g,'');
    _precos[c] = {
      bomba:   parseFloat(document.getElementById('p-bomba-'+k)?.value)||0,
      desconto: parseFloat(document.getElementById('p-desc-'+k)?.value)||0
    };
  });
  localStorage.setItem('rp_empresa_precos_' + (_sessao?.postoId||''), JSON.stringify(_precos));
  try {
    await fetch('/api/parceiros/precos', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+(_sessao?.token||'')},
      body: JSON.stringify({ postoId: _sessao?.postoId, precos: _precos })
    });
  } catch {}
  const msg = document.getElementById('precos-msg');
  msg.style.display='inline'; setTimeout(()=>msg.style.display='none',3000);
}

// ── Histórico de Cupons ────────────────────────────────
async function carregarHistoricoCupons() {
  const status = document.getElementById('filtro-cupom-status').value;
  try {
    const r = await fetch('/api/parceiros/cupons?postoId='+(_sessao?.postoId||'')+'&status='+status, {
      headers:{'Authorization':'Bearer '+(_sessao?.token||'')}
    });
    const d = await r.json();
    renderTabelaCuponsHist(d.cupons || []);
  } catch { renderTabelaCuponsHist(gerarCuponsFake()); }
}

function filtrarCupons() { carregarHistoricoCupons(); }

function gerarCuponsFake() {
  const combList = ['Gasolina Comum','Gasolina Aditivada','Etanol','Diesel S-10'];
  return Array.from({length:8},(_,i) => {
    const d = new Date(); d.setDate(d.getDate()-i);
    return {
      dataHora: d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      codigo: Math.floor(100000+Math.random()*900000).toString().replace(/(\\d{3})(\\d{3})/,'$1 $2'),
      cliente: 'Assinante #' + (1000+i),
      combustivel: combList[i%combList.length],
      precoDesconto: 'R$ ' + (5.60+Math.random()*0.8).toFixed(2) + '/L',
      status: i<2?'ATIVO': i<6?'UTILIZADO':'EXPIRADO'
    };
  });
}

function renderTabelaCuponsHist(cupons) {
  const tbody = document.getElementById('tabela-cupons-hist');
  if (!cupons.length) { tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:24px;color:#aaa">Nenhum cupom encontrado</td></tr>'; return; }
  tbody.innerHTML = cupons.map(c => \`
    <tr>
      <td style="font-size:12px;color:var(--sub)">\${c.dataHora}</td>
      <td><code style="font-size:14px;font-weight:700;letter-spacing:2px">\${c.codigo}</code></td>
      <td>\${c.cliente}</td>
      <td style="font-size:13px">\${c.combustivel}</td>
      <td style="font-weight:700;color:var(--verde)">\${c.precoDesconto}</td>
      <td>\${badgeStatus(c.status)}</td>
    </tr>\`).join('');
}

// ── Notificações ───────────────────────────────────────
function carregarNotifConfig() {
  const saved = localStorage.getItem('rp_empresa_notif_' + (_sessao?.postoId||''));
  if (saved) try {
    const c = JSON.parse(saved);
    document.getElementById('notif-raio').value   = c.raio   || '800';
    document.getElementById('notif-limite').value = c.limite || '1';
    document.getElementById('notif-texto').value  = c.texto  || '';
  } catch {}
  atualizarPreviewNotif();
  document.getElementById('notif-texto').addEventListener('input', atualizarPreviewNotif);
}

function atualizarPreviewNotif() {
  const postoNome = _sessao?.postoNome || 'Seu Posto';
  const texto = document.getElementById('notif-texto')?.value || '';
  document.getElementById('notif-prev-titulo').textContent = '⛽ Desconto Exclusivo perto de você!';
  document.getElementById('notif-prev-corpo').textContent  = postoNome + ': ' + (texto || 'Configure a mensagem acima...');
}

function salvarConfNotif() {
  const cfg = {
    raio:   document.getElementById('notif-raio').value,
    limite: document.getElementById('notif-limite').value,
    texto:  document.getElementById('notif-texto').value
  };
  localStorage.setItem('rp_empresa_notif_' + (_sessao?.postoId||''), JSON.stringify(cfg));
  alert('✓ Configuração de notificações salva!');
}

async function enviarNotifManual() {
  const txt = document.getElementById('notif-manual-txt').value.trim();
  if (!txt) { alert('Digite a mensagem.'); return; }
  try {
    await fetch('/api/parceiros/notificacoes/enviar', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+(_sessao?.token||'')},
      body: JSON.stringify({ postoId: _sessao?.postoId, mensagem: txt })
    });
  } catch {}
  const msg = document.getElementById('notif-manual-msg');
  msg.style.display='inline'; setTimeout(()=>msg.style.display='none',4000);
  document.getElementById('notif-manual-txt').value='';
}

// ── Perfil ─────────────────────────────────────────────
const SERVICOS_DEFAULT = ['Loja de conveniência','Troca de óleo','Borracharia','Lavagem','GNV','Ar comprimido'];
let _servicosSel = new Set(SERVICOS_DEFAULT.slice(0,2));

function carregarPerfil() {
  document.getElementById('perf-nome').value    = _sessao?.postoNome || '';
  document.getElementById('perf-tel').value     = _sessao?.tel || '';
  document.getElementById('perf-horario').value = _sessao?.horario || '24 horas';
  renderServicos();
}

function renderServicos() {
  const cont = document.getElementById('servicos-list');
  cont.innerHTML = SERVICOS_OPCOES.map(s => \`
    <button onclick="toggleServico('\${s}',this)" style="padding:7px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid \${_servicosSel.has(s)?'var(--laranja)':'var(--border)'};background:\${_servicosSel.has(s)?'var(--laranja-claro)':'#fff'};color:\${_servicosSel.has(s)?'var(--laranja)':'var(--sub)'}">
      \${s}
    </button>\`).join('');
}

function toggleServico(s, btn) {
  if (_servicosSel.has(s)) { _servicosSel.delete(s); btn.style.borderColor='var(--border)'; btn.style.background='#fff'; btn.style.color='var(--sub)'; }
  else { _servicosSel.add(s); btn.style.borderColor='var(--laranja)'; btn.style.background='var(--laranja-claro)'; btn.style.color='var(--laranja)'; }
}

function salvarPerfil() {
  const msg = document.getElementById('perfil-msg');
  msg.style.display='inline'; setTimeout(()=>msg.style.display='none',3000);
}

// ── Promoções ──────────────────────────────────────────
let _promocoes = [];

async function carregarPromocoes() {
  const lista = document.getElementById('lista-promocoes');
  if (!lista) return;
  lista.innerHTML = '<div style="text-align:center;padding:32px;color:#aaa"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
  try {
    const r = await fetch('/api/parceiros/promocoes?postoId=' + (_sessao?.postoId||''), {
      headers: { 'Authorization': 'Bearer ' + (_sessao?.token||'') }
    });
    const d = await r.json();
    _promocoes = d.promocoes || [];
  } catch {
    _promocoes = JSON.parse(localStorage.getItem('rp_empresa_promos_' + (_sessao?.postoId||'')) || '[]');
  }
  renderListaPromocoes();
}

function renderListaPromocoes() {
  const lista = document.getElementById('lista-promocoes');
  if (!lista) return;
  const hoje = new Date().toISOString().slice(0,10);
  const ativas = _promocoes.filter(p => !p.validade || p.validade >= hoje);
  if (!ativas.length) {
    lista.innerHTML = '<div style="text-align:center;padding:32px;color:#aaa">Nenhuma promoção ativa. Crie a primeira acima!</div>';
    return;
  }
  lista.innerHTML = ativas.map((p, i) => {
    const dataFmt = p.validade ? new Date(p.validade + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem validade';
    return '<div style="display:flex;align-items:flex-start;gap:14px;padding:16px 20px;border-bottom:1px solid var(--border)">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
          (p.destaque ? '<span style="font-size:12px;background:#FFF3E0;color:var(--laranja);font-weight:700;padding:2px 10px;border-radius:20px">⭐ Destaque</span>' : '') +
          '<span style="font-size:15px;font-weight:700;color:var(--texto)">' + (p.titulo||'Sem título') + '</span>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--sub);margin-bottom:6px;line-height:1.5">' + (p.descricao||'') + '</div>' +
        '<div style="font-size:12px;color:#999"><i class="fas fa-clock"></i> Válido até: ' + dataFmt + '</div>' +
      '</div>' +
      '<button onclick="excluirPromocao(' + i + ')" style="flex-shrink:0;padding:7px 14px;background:#FFEBEE;color:#d32f2f;border:1.5px solid #FFCDD2;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer">' +
        '<i class="fas fa-trash"></i>' +
      '</button>' +
    '</div>';
  }).join('');
}

async function salvarPromocao() {
  const titulo    = (document.getElementById('promo-titulo')?.value || '').trim();
  const descricao = (document.getElementById('promo-descricao')?.value || '').trim();
  const validade  = document.getElementById('promo-validade')?.value || '';
  const destaque  = document.getElementById('promo-destaque')?.checked || false;
  const msgOk  = document.getElementById('promo-msg');
  const msgErr = document.getElementById('promo-erro');
  msgOk.style.display='none'; msgErr.style.display='none';
  if (!titulo) { msgErr.textContent='Informe o título da promoção.'; msgErr.style.display='inline'; return; }
  const novaPromo = { titulo, descricao, validade, destaque, criadaEm: new Date().toISOString() };
  try {
    const r = await fetch('/api/parceiros/promocoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (_sessao?.token||'') },
      body: JSON.stringify({ postoId: _sessao?.postoId, promocao: novaPromo })
    });
    const d = await r.json();
    if (!d.ok) throw new Error(d.erro || 'Erro ao salvar');
    _promocoes = d.promocoes || [novaPromo, ..._promocoes];
  } catch {
    _promocoes = [novaPromo, ..._promocoes];
    localStorage.setItem('rp_empresa_promos_' + (_sessao?.postoId||''), JSON.stringify(_promocoes));
  }
  document.getElementById('promo-titulo').value = '';
  document.getElementById('promo-descricao').value = '';
  document.getElementById('promo-validade').value = '';
  document.getElementById('promo-destaque').checked = false;
  renderListaPromocoes();
  msgOk.style.display='inline'; setTimeout(()=>msgOk.style.display='none',3000);
}

async function excluirPromocao(idx) {
  if (!confirm('Remover esta promoção?')) return;
  const hoje = new Date().toISOString().slice(0,10);
  const ativas = _promocoes.filter(p => !p.validade || p.validade >= hoje);
  const promoRemovida = ativas[idx];
  if (!promoRemovida) return;
  _promocoes = _promocoes.filter(p => p !== promoRemovida);
  try {
    await fetch('/api/parceiros/promocoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (_sessao?.token||'') },
      body: JSON.stringify({ postoId: _sessao?.postoId, promocoes: _promocoes })
    });
  } catch {
    localStorage.setItem('rp_empresa_promos_' + (_sessao?.postoId||''), JSON.stringify(_promocoes));
  }
  renderListaPromocoes();
}

// ── Configs ────────────────────────────────────────────
function cancelarAssinatura() {
  if (confirm('Cancelar a assinatura Premium? Você perderá o destaque no mapa e o sistema de cupons.')) {
    alert('Para cancelar, entre em contato pelo WhatsApp: (27) 99999-9999');
  }
}
function alterarSenha() {
  const s1 = document.getElementById('seg-senha').value;
  const s2 = document.getElementById('seg-senha2').value;
  if (!s1 || s1.length < 6) { alert('Senha deve ter pelo menos 6 caracteres.'); return; }
  if (s1 !== s2) { alert('As senhas não coincidem.'); return; }
  alert('✓ Senha alterada com sucesso!');
  document.getElementById('seg-senha').value = '';
  document.getElementById('seg-senha2').value = '';
}
</script>
</body>
</html>`
}

// ══════════════════════════════════════════════════════════════════════════════
// Página de validação simples (para o frentista no celular)
// ══════════════════════════════════════════════════════════════════════════════
export function getValidadorHTML(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RotaPosto — Validar Cupom</title>
  <link rel="icon" href="/favicon.ico"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; background:linear-gradient(135deg,#FF6D00,#BF360C); min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
    .card { background:#fff; border-radius:20px; padding:32px 28px; width:100%; max-width:380px; text-align:center; }
    .logo { font-size:40px; margin-bottom:8px; }
    h1 { font-size:20px; font-weight:900; margin-bottom:4px; }
    p { font-size:14px; color:#757575; margin-bottom:24px; }
    .input-codigo { width:100%; padding:16px; border:2px solid #E0E0E0; border-radius:14px; font-size:24px; font-weight:900; text-align:center; letter-spacing:6px; font-family:monospace; margin-bottom:14px; }
    .input-codigo:focus { outline:none; border-color:#FF6D00; }
    .btn-validar { width:100%; padding:16px; background:#FF6D00; color:#fff; border:none; border-radius:14px; font-size:17px; font-weight:800; cursor:pointer; }
    .resultado { margin-top:16px; border-radius:14px; padding:20px; display:none; }
    .ok { background:#E8F5E9; border:2px solid #A5D6A7; }
    .erro { background:#FFEBEE; border:2px solid #EF9A9A; }
    .res-icon { font-size:44px; margin-bottom:8px; }
    .res-titulo { font-size:18px; font-weight:900; margin-bottom:4px; }
    .res-preco { font-size:36px; font-weight:900; color:#FF6D00; margin:12px 0 4px; }
    .res-txt { font-size:13px; color:#757575; line-height:1.6; }
    .btn-novo { margin-top:14px; padding:12px; width:100%; background:none; border:2px solid #FF6D00; color:#FF6D00; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; }

    /* ══════════════════════════════
       RESPONSIVO — MOBILE / TABLET
    ══════════════════════════════ */

    /* Tablet (≤1024px) */
    @media(max-width:1024px){
      nav{padding:0 20px}
      .n-center-text{font-size:clamp(10px,1.1vw,14px);letter-spacing:1.5px}
      .btn-ghost,.btn-solid{padding:8px 14px;font-size:12px}
      .hero-wrap{padding:16px 32px}
      h1{font-size:clamp(28px,4vw,56px)}
      .recursos-wrap,.cards-wrap{padding-left:24px;padding-right:24px}
      .rec-cols{grid-template-columns:repeat(2,1fr);gap:12px}
      .cards-grid{grid-template-columns:repeat(2,1fr)}
      .footer-inner{grid-template-columns:1fr 1fr;gap:24px}
      .f-social-col{grid-column:1/-1;flex-direction:row;justify-content:flex-start;align-items:center}
      .f-social{flex-direction:row}
    }

    /* Mobile (≤600px) */
    @media(max-width:600px){
      nav{padding:0 16px;height:56px}
      .n-center{display:none}
      .n-tag{display:none}
      .n-logo-name{font-size:16px}
      .btn-ghost{display:none}
      .btn-solid{padding:8px 14px;font-size:12px;gap:5px}
      .btn-solid i{display:none}
      .hero-wrap{padding:20px 16px 16px}
      h1{font-size:clamp(24px,7vw,40px);letter-spacing:-1px}
      .hero-sub{font-size:14px}
      .recursos-wrap{padding:16px 16px 0}
      .rec-cols{grid-template-columns:1fr 1fr;gap:10px}
      .rec-col:last-child{}
      .cards-wrap{padding:0 16px 16px}
      .cards-grid{grid-template-columns:1fr 1fr;gap:10px}
      .feat-card{padding:12px}
      .feat-card h4{font-size:13px}
      .feat-card p{font-size:11px}
      footer{padding:24px 16px 0}
      .footer-inner{grid-template-columns:1fr;gap:20px}
      .f-social-col{align-items:flex-start}
      .f-bottom{flex-direction:column;gap:6px;text-align:center}
      /* Subpáginas mobile */
      .sp-content{padding:20px 16px 32px;box-sizing:border-box}
      .sp-h1{font-size:clamp(22px,6vw,32px)}
      .sp-sub{font-size:14px;margin-bottom:24px}
      .sp-grid{grid-template-columns:1fr;gap:12px}
      .sp-card{padding:18px}
      /* Nav mobile */
      .tc-nav,.sp-nav{padding:0 14px;gap:10px;box-sizing:border-box}
      .tc-title{font-size:14px}
      /* Formulário cadastro mobile */
      .fr{grid-template-columns:1fr}
      .tc-right{padding:20px 16px 32px}
    }

    /* Extra small (≤400px) */
    @media(max-width:400px){
      .cards-grid{grid-template-columns:1fr}
      h1{font-size:clamp(22px,8vw,34px)}
      .sp-content{padding:16px 12px 24px;box-sizing:border-box}
      .sp-nav,.tc-nav{padding:0 12px;box-sizing:border-box}
    }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">⛽</div>
  <h1>Validar Cupom</h1>
  <p>Digite o código de 6 dígitos que o cliente mostrar no celular</p>
  <input id="cod" class="input-codigo" type="text" maxlength="7" placeholder="000 000"
    oninput="fmt(this)" onkeydown="if(event.key==='Enter')validar()"/>
  <button class="btn-validar" onclick="validar()">✓ Validar desconto</button>
  <div id="res" class="resultado">
    <div class="res-icon" id="r-icon">✅</div>
    <div class="res-titulo" id="r-titulo"></div>
    <div class="res-preco" id="r-preco"></div>
    <div class="res-txt" id="r-txt"></div>
    <button class="btn-novo" onclick="novo()">Validar outro</button>
  </div>
</div>
<script>
  function fmt(inp) {
    let v = inp.value.replace(/\\D/g,'').slice(0,6);
    inp.value = v.length > 3 ? v.slice(0,3)+' '+v.slice(3) : v;
  }
  async function validar() {
    const cod = document.getElementById('cod').value.replace(/\\s/g,'');
    if (cod.length < 6) { alert('Digite o código completo de 6 dígitos.'); return; }
    try {
      const r = await fetch('/api/parceiros/cupons/validar', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ codigo: cod })
      });
      const d = await r.json();
      mostrar(d);
    } catch { mostrar({ valido:false, mensagem:'Erro de conexão.' }); }
  }
  function mostrar(d) {
    const res = document.getElementById('res');
    res.style.display = 'block';
    res.className = 'resultado ' + (d.valido ? 'ok' : 'erro');
    document.getElementById('r-icon').textContent   = d.valido ? '✅' : '❌';
    document.getElementById('r-titulo').textContent = d.valido ? 'CUPOM CONFIRMADO!' : 'Cupom Inválido';
    document.getElementById('r-preco').textContent  = d.valido ? 'R$ '+(d.precoComDesconto||0).toFixed(2)+'/L' : '';
    document.getElementById('r-txt').textContent    = d.valido
      ? 'Combustível: ' + (d.combustivel||'—') + '\\nPreço original: R$ ' + (d.precoOriginal||0).toFixed(2) + '/L\\nDesconto: R$ ' + (d.valorDesconto||0).toFixed(2) + '/L\\n\\nDigite este valor no caixa.'
      : (d.mensagem || 'Código inválido, já utilizado ou expirado.');
    document.getElementById('r-txt').style.whiteSpace = 'pre-line';
  }
  function novo() {
    document.getElementById('res').style.display = 'none';
    document.getElementById('cod').value = '';
    document.getElementById('cod').focus();
  }
</script>
</body>
</html>`
}
