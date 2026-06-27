export function getLandingHTML(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="theme-color" content="#0D1B2A"/>
  <meta name="description" content="RotaPosto – Encontre o posto mais barato perto de você, calcule sua economia e trace rotas inteligentes. A partir de R$9,90/mês."/>
  <meta property="og:title" content="RotaPosto – Economize no Combustível Todo Dia"/>
  <meta property="og:description" content="Encontre o posto mais barato, calcule economia no tanque e trace rotas inteligentes. A partir de R$9,90/mês."/>
  <title>RotaPosto – Economize no Combustível</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <script src="https://sdk.mercadopago.com/js/v2"></script>
  <style>
    :root {
      --azul: #0D1B2A;
      --azul2: #1B3A5C;
      --azul3: #1565C0;
      --laranja: #FF6D00;
      --laranja2: #FF8F00;
      --amarelo: #FFD600;
      --verde: #00C853;
      --branco: #fff;
      --cinza: #F5F7FA;
      --cinza2: #E0E7EF;
      --cinza3: #8898AA;
      --text: #0D1B2A;
      --text2: #4A6080;
    }
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html{scroll-behavior:smooth}
    body{font-family:'Raleway',sans-serif;background:var(--azul);color:var(--branco);overflow-x:hidden}
    a{text-decoration:none;color:inherit}

    /* ── NAV ── */
    nav{
      position:fixed;top:0;left:0;right:0;z-index:1000;
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 24px;
      background:rgba(13,27,42,0.92);
      backdrop-filter:blur(12px);
      border-bottom:1px solid rgba(255,255,255,0.06);
    }
    .nav-logo{display:flex;align-items:center;gap:10px}
    .nav-logo-icon{
      width:36px;height:36px;
      background:linear-gradient(135deg,var(--laranja),var(--amarelo));
      border-radius:10px;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
    }
    .nav-logo-text{font-size:20px;font-weight:900;letter-spacing:-0.5px}
    .nav-logo-text span{color:var(--laranja)}
    .nav-links{display:flex;align-items:center;gap:24px}
    .nav-links a{font-size:13px;font-weight:700;color:rgba(255,255,255,0.65);transition:color 0.2s}
    .nav-links a:hover{color:var(--branco)}
    .nav-cta{
      padding:10px 20px;
      background:linear-gradient(135deg,var(--laranja),var(--laranja2));
      border-radius:100px;
      font-size:13px;font-weight:800;
      color:var(--branco);
      box-shadow:0 4px 16px rgba(255,109,0,0.4);
      transition:transform 0.15s,box-shadow 0.15s;
    }
    .nav-cta:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(255,109,0,0.5)}
    @media(max-width:640px){
      .nav-links{display:none}
      nav{padding:14px 20px}
    }

    /* ── HERO ── */
    #hero{
      min-height:100dvh;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      text-align:center;
      padding:100px 24px 60px;
      position:relative;
      overflow:hidden;
    }
    .hero-bg{
      position:absolute;inset:0;
      background:radial-gradient(ellipse 80% 60% at 50% 0%, rgba(21,101,192,0.25) 0%, transparent 70%),
                 radial-gradient(ellipse 50% 40% at 80% 80%, rgba(255,109,0,0.12) 0%, transparent 60%);
    }
    .hero-grid{
      position:absolute;inset:0;
      background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),
                       linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);
      background-size:60px 60px;
    }
    .hero-badge{
      display:inline-flex;align-items:center;gap:6px;
      padding:6px 14px;
      background:rgba(255,109,0,0.15);
      border:1px solid rgba(255,109,0,0.35);
      border-radius:100px;
      font-size:12px;font-weight:700;color:var(--laranja);
      letter-spacing:0.5px;
      margin-bottom:24px;
      position:relative;
    }
    .hero-h1{
      font-size:clamp(36px,8vw,72px);
      font-weight:900;
      line-height:1.05;
      letter-spacing:-2px;
      max-width:860px;
      position:relative;
      margin-bottom:20px;
    }
    .hero-h1 .laranja{
      color:var(--laranja);
      position:relative;
    }
    .hero-h1 .laranja::after{
      content:'';
      position:absolute;bottom:-4px;left:0;right:0;
      height:4px;
      background:linear-gradient(90deg,var(--laranja),transparent);
      border-radius:2px;
    }
    .hero-sub{
      font-size:clamp(15px,2.5vw,19px);
      font-weight:500;
      color:rgba(255,255,255,0.65);
      max-width:560px;
      line-height:1.7;
      margin-bottom:36px;
      position:relative;
    }
    .hero-btns{
      display:flex;flex-wrap:wrap;gap:12px;justify-content:center;
      position:relative;
      margin-bottom:60px;
    }
    .btn-hero-pri{
      padding:16px 32px;
      background:linear-gradient(135deg,var(--laranja),var(--laranja2));
      border-radius:14px;border:none;
      color:var(--branco);font-family:'Raleway',sans-serif;
      font-size:16px;font-weight:800;
      cursor:pointer;
      display:flex;align-items:center;gap:8px;
      box-shadow:0 6px 24px rgba(255,109,0,0.45);
      transition:transform 0.15s,box-shadow 0.15s;
    }
    .btn-hero-pri:hover{transform:translateY(-3px);box-shadow:0 10px 32px rgba(255,109,0,0.55)}
    .btn-hero-sec{
      padding:16px 28px;
      background:rgba(255,255,255,0.08);
      border:1.5px solid rgba(255,255,255,0.18);
      border-radius:14px;
      color:var(--branco);font-family:'Raleway',sans-serif;
      font-size:15px;font-weight:700;
      cursor:pointer;
      display:flex;align-items:center;gap:8px;
      transition:background 0.2s,border-color 0.2s;
    }
    .btn-hero-sec:hover{background:rgba(255,255,255,0.13);border-color:rgba(255,255,255,0.3)}

    /* Mock phone */
    .hero-phone-wrap{
      position:relative;
      width:280px;height:560px;
      margin:0 auto;
    }
    .phone-frame{
      width:100%;height:100%;
      background:linear-gradient(160deg,#1B3A5C,#0D1B2A);
      border-radius:40px;
      border:2px solid rgba(255,255,255,0.12);
      box-shadow:0 40px 80px rgba(0,0,0,0.6),0 0 0 8px rgba(255,255,255,0.04),inset 0 1px 0 rgba(255,255,255,0.1);
      overflow:hidden;
      position:relative;
    }
    .phone-notch{
      width:90px;height:28px;
      background:#0D1B2A;
      border-radius:0 0 20px 20px;
      margin:0 auto 0;
      position:relative;z-index:2;
    }
    .phone-content{padding:0 12px 12px}
    .ph-header{
      background:linear-gradient(135deg,#0D1B2A,#1B3A5C);
      border-radius:16px;
      padding:12px;
      margin-bottom:10px;
    }
    .ph-title{font-size:9px;font-weight:700;color:var(--laranja);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:4px}
    .ph-name{font-size:12px;font-weight:800;color:var(--branco)}
    .ph-addr{font-size:9px;color:rgba(255,255,255,0.5);margin-bottom:10px}
    .ph-preco{
      display:flex;align-items:baseline;gap:3px;margin-bottom:10px
    }
    .ph-r{font-size:11px;font-weight:700;color:rgba(255,255,255,0.7)}
    .ph-val{font-size:36px;font-weight:900;color:var(--branco);line-height:1}
    .ph-cents{font-size:16px;font-weight:700;color:var(--branco);align-self:flex-end;margin-bottom:3px}
    .ph-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}
    .ph-stat{background:rgba(255,255,255,0.08);border-radius:8px;padding:7px 8px}
    .ph-stat-l{font-size:7px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.3px}
    .ph-stat-v{font-size:13px;font-weight:900;color:var(--branco)}
    .ph-stat-v.g{color:#69F0AE}
    .ph-stat-v.o{color:var(--amarelo)}
    .ph-btn{
      width:100%;padding:10px;
      background:linear-gradient(135deg,var(--laranja),var(--laranja2));
      border:none;border-radius:10px;
      color:var(--branco);font-family:'Raleway',sans-serif;
      font-size:11px;font-weight:800;
      display:flex;align-items:center;justify-content:center;gap:5px;
    }
    .ph-nav{
      position:absolute;bottom:0;left:0;right:0;
      background:#0D1B2A;
      border-top:1px solid rgba(255,255,255,0.06);
      display:flex;padding:8px 4px 12px;
    }
    .ph-nav-btn{
      flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;
      font-size:6px;font-weight:800;color:rgba(255,255,255,0.35);text-transform:uppercase;
    }
    .ph-nav-btn i{font-size:14px}
    .ph-nav-btn.active{color:var(--laranja)}

    /* Floating chips */
    .float-chip{
      position:absolute;
      background:rgba(13,27,42,0.90);
      border:1px solid rgba(255,255,255,0.12);
      border-radius:14px;
      padding:10px 14px;
      backdrop-filter:blur(8px);
      font-size:12px;font-weight:700;
      white-space:nowrap;
      animation:float 4s ease-in-out infinite;
    }
    .float-chip.left{left:-80px;top:30%;animation-delay:0s}
    .float-chip.right{right:-70px;top:55%;animation-delay:1.5s}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @media(max-width:640px){.float-chip{display:none}}

    /* ── STATS BAND ── */
    .stats-band{
      background:rgba(255,255,255,0.04);
      border-top:1px solid rgba(255,255,255,0.06);
      border-bottom:1px solid rgba(255,255,255,0.06);
      padding:32px 24px;
    }
    .stats-inner{
      max-width:900px;margin:0 auto;
      display:flex;flex-wrap:wrap;gap:16px;
      justify-content:center;
    }
    .stat-item{
      text-align:center;
      padding:16px 32px;
      flex:1;min-width:160px;
    }
    .stat-item .sv{font-size:clamp(28px,5vw,42px);font-weight:900;color:var(--laranja)}
    .stat-item .sl{font-size:12px;font-weight:700;color:rgba(255,255,255,0.55);margin-top:4px;text-transform:uppercase;letter-spacing:0.5px}

    /* ── SECTIONS ── */
    section{padding:80px 24px;max-width:1100px;margin:0 auto}
    .section-tag{
      display:inline-flex;align-items:center;gap:6px;
      padding:5px 12px;
      background:rgba(255,109,0,0.12);
      border:1px solid rgba(255,109,0,0.25);
      border-radius:100px;
      font-size:11px;font-weight:800;color:var(--laranja);
      letter-spacing:0.8px;text-transform:uppercase;
      margin-bottom:16px;
    }
    .section-h2{font-size:clamp(28px,5vw,48px);font-weight:900;line-height:1.1;letter-spacing:-1px;margin-bottom:14px}
    .section-sub{font-size:16px;font-weight:500;color:rgba(255,255,255,0.6);max-width:560px;line-height:1.7;margin-bottom:48px}

    /* ── FEATURES ── */
    .features-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
      gap:20px;
    }
    .feat-card{
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.08);
      border-radius:24px;
      padding:28px 24px;
      transition:background 0.25s,border-color 0.25s,transform 0.25s;
    }
    .feat-card:hover{
      background:rgba(255,255,255,0.07);
      border-color:rgba(255,109,0,0.3);
      transform:translateY(-4px);
    }
    .feat-icon{
      width:52px;height:52px;
      border-radius:16px;
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
      margin-bottom:16px;
    }
    .feat-card h3{font-size:18px;font-weight:800;margin-bottom:8px}
    .feat-card p{font-size:14px;font-weight:500;color:rgba(255,255,255,0.6);line-height:1.7}

    /* ── HOW IT WORKS ── */
    .steps{
      display:flex;flex-direction:column;gap:0;
      max-width:700px;margin:0 auto;
    }
    .step{
      display:flex;gap:24px;padding:28px 0;
      position:relative;
    }
    .step:not(:last-child)::after{
      content:'';
      position:absolute;
      left:23px;top:72px;bottom:0;
      width:2px;
      background:linear-gradient(rgba(255,109,0,0.4),rgba(255,109,0,0.1));
    }
    .step-num{
      width:48px;height:48px;flex-shrink:0;
      border-radius:50%;
      background:linear-gradient(135deg,var(--laranja),var(--laranja2));
      display:flex;align-items:center;justify-content:center;
      font-size:20px;font-weight:900;
      box-shadow:0 4px 16px rgba(255,109,0,0.4);
    }
    .step-body h3{font-size:18px;font-weight:800;margin-bottom:6px}
    .step-body p{font-size:14px;font-weight:500;color:rgba(255,255,255,0.6);line-height:1.7}

    /* ── PRICING ── */
    #pricing{
      padding:80px 24px;
      background:rgba(255,255,255,0.02);
      border-top:1px solid rgba(255,255,255,0.05);
      border-bottom:1px solid rgba(255,255,255,0.05);
    }
    #pricing .inner{max-width:1100px;margin:0 auto;text-align:center}
    .plans-wrap{
      display:flex;flex-wrap:wrap;gap:20px;justify-content:center;margin-top:48px;
    }
    .plan-card{
      background:rgba(255,255,255,0.04);
      border:1.5px solid rgba(255,255,255,0.10);
      border-radius:28px;
      padding:32px 28px;
      width:300px;
      text-align:left;
      position:relative;
      transition:transform 0.25s,border-color 0.25s;
    }
    .plan-card:hover{transform:translateY(-6px)}
    .plan-card.destaque{
      border-color:var(--laranja);
      background:rgba(255,109,0,0.06);
      box-shadow:0 8px 40px rgba(255,109,0,0.2);
    }
    .plan-badge{
      position:absolute;top:-14px;left:50%;transform:translateX(-50%);
      background:linear-gradient(135deg,var(--laranja),var(--laranja2));
      padding:5px 16px;border-radius:100px;
      font-size:11px;font-weight:800;color:var(--branco);
      white-space:nowrap;
    }
    .plan-name{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.5);margin-bottom:8px}
    .plan-preco{
      display:flex;align-items:baseline;gap:4px;margin-bottom:6px;
    }
    .plan-preco .cifra{font-size:16px;font-weight:700;color:rgba(255,255,255,0.7)}
    .plan-preco .valor{font-size:52px;font-weight:900;line-height:1}
    .plan-preco .cents{font-size:24px;font-weight:700;align-self:flex-end;margin-bottom:6px}
    .plan-preco .periodo{font-size:13px;font-weight:600;color:rgba(255,255,255,0.45);align-self:flex-end;margin-bottom:4px}
    .plan-desc{font-size:13px;font-weight:500;color:rgba(255,255,255,0.5);margin-bottom:20px;line-height:1.6}
    .plan-features{list-style:none;margin-bottom:24px;display:flex;flex-direction:column;gap:10px}
    .plan-features li{
      display:flex;align-items:center;gap:10px;
      font-size:13px;font-weight:600;color:rgba(255,255,255,0.75);
    }
    .plan-features li i{width:18px;text-align:center}
    .plan-features li .check{color:var(--verde)}
    .plan-features li .x{color:rgba(255,255,255,0.25)}
    .btn-assinar{
      width:100%;padding:14px;
      border-radius:14px;border:none;
      font-family:'Raleway',sans-serif;
      font-size:14px;font-weight:800;
      cursor:pointer;
      display:flex;align-items:center;justify-content:center;gap:7px;
      transition:transform 0.15s,box-shadow 0.15s;
    }
    .btn-assinar.pri{
      background:linear-gradient(135deg,var(--laranja),var(--laranja2));
      color:var(--branco);
      box-shadow:0 4px 20px rgba(255,109,0,0.4);
    }
    .btn-assinar.pri:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(255,109,0,0.5)}
    .btn-assinar.sec{
      background:rgba(255,255,255,0.07);
      border:1.5px solid rgba(255,255,255,0.15);
      color:var(--branco);
    }
    .btn-assinar.sec:hover{background:rgba(255,255,255,0.12)}
    .plan-guarantee{
      text-align:center;margin-top:24px;
      font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);
      display:flex;align-items:center;justify-content:center;gap:6px;
    }

    /* ── TESTIMONIALS ── */
    .test-grid{
      display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
      gap:20px;
    }
    .test-card{
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.08);
      border-radius:20px;
      padding:24px;
    }
    .test-stars{color:var(--amarelo);font-size:14px;letter-spacing:2px;margin-bottom:12px}
    .test-text{font-size:14px;font-weight:500;color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:16px;font-style:italic}
    .test-author{display:flex;align-items:center;gap:10px}
    .test-avatar{
      width:40px;height:40px;border-radius:50%;
      background:linear-gradient(135deg,var(--azul2),var(--azul3));
      display:flex;align-items:center;justify-content:center;
      font-size:16px;font-weight:800;
    }
    .test-info .name{font-size:13px;font-weight:800}
    .test-info .role{font-size:11px;color:rgba(255,255,255,0.45);font-weight:600}

    /* ── FAQ ── */
    .faq-list{max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
    .faq-item{
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.08);
      border-radius:16px;
      overflow:hidden;
    }
    .faq-q{
      width:100%;padding:18px 20px;
      background:none;border:none;
      text-align:left;cursor:pointer;
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      font-family:'Raleway',sans-serif;
      font-size:14px;font-weight:700;color:var(--branco);
    }
    .faq-q i{color:var(--laranja);transition:transform 0.25s;flex-shrink:0}
    .faq-q.open i{transform:rotate(45deg)}
    .faq-a{
      padding:0 20px;
      max-height:0;overflow:hidden;
      font-size:14px;font-weight:500;color:rgba(255,255,255,0.6);
      line-height:1.7;
      transition:max-height 0.35s ease,padding 0.35s ease;
    }
    .faq-a.open{max-height:300px;padding:0 20px 18px}

    /* ── FINAL CTA ── */
    #cta-final{
      padding:80px 24px;
      text-align:center;
      position:relative;overflow:hidden;
      background:linear-gradient(135deg,rgba(21,101,192,0.15) 0%,rgba(255,109,0,0.08) 100%);
    }
    #cta-final h2{font-size:clamp(28px,5vw,52px);font-weight:900;letter-spacing:-1.5px;margin-bottom:16px}
    #cta-final p{font-size:17px;font-weight:500;color:rgba(255,255,255,0.65);max-width:500px;margin:0 auto 36px;line-height:1.7}

    /* ── FOOTER ── */
    footer{
      background:rgba(0,0,0,0.3);
      border-top:1px solid rgba(255,255,255,0.06);
      padding:40px 24px;
      text-align:center;
    }
    footer .footer-logo{font-size:20px;font-weight:900;margin-bottom:10px}
    footer .footer-logo span{color:var(--laranja)}
    footer p{font-size:12px;font-weight:600;color:rgba(255,255,255,0.3)}
    footer .footer-links{
      display:flex;flex-wrap:wrap;gap:16px;justify-content:center;
      margin:16px 0;
    }
    footer .footer-links a{font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);transition:color 0.2s}
    footer .footer-links a:hover{color:var(--laranja)}

    /* ── MODAL PAGAMENTO ── */
    .modal-bg{
      position:fixed;inset:0;
      background:rgba(0,0,0,0.75);
      z-index:9000;
      display:flex;align-items:center;justify-content:center;
      padding:20px;
      display:none;
    }
    .modal-bg.open{display:flex}
    .modal-box{
      background:#0D2136;
      border:1px solid rgba(255,255,255,0.12);
      border-radius:28px;
      padding:32px;
      width:100%;max-width:440px;
      position:relative;
      animation:modalIn 0.3s ease;
    }
    @keyframes modalIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
    .modal-close{
      position:absolute;top:16px;right:16px;
      width:32px;height:32px;border-radius:50%;
      background:rgba(255,255,255,0.08);border:none;
      color:rgba(255,255,255,0.6);font-size:16px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
    }
    .modal-close:hover{background:rgba(255,255,255,0.15);color:var(--branco)}
    .modal-plan-header{
      text-align:center;margin-bottom:24px;
    }
    .modal-plan-header h3{font-size:20px;font-weight:900;margin-bottom:4px}
    .modal-plan-header .price{font-size:42px;font-weight:900;color:var(--laranja)}
    .modal-plan-header .price sup{font-size:18px;vertical-align:super}
    .modal-plan-header .price sub{font-size:14px;vertical-align:bottom;color:rgba(255,255,255,0.5);font-weight:600}
    .modal-section-title{
      font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;
      color:rgba(255,255,255,0.4);margin-bottom:12px;
    }
    .form-field{
      margin-bottom:14px;
    }
    .form-field label{
      display:block;font-size:11px;font-weight:700;
      color:rgba(255,255,255,0.5);text-transform:uppercase;
      letter-spacing:0.5px;margin-bottom:6px;
    }
    .form-field input{
      width:100%;padding:12px 14px;
      background:rgba(255,255,255,0.06);
      border:1.5px solid rgba(255,255,255,0.12);
      border-radius:12px;
      color:var(--branco);font-family:'Raleway',sans-serif;
      font-size:14px;font-weight:600;outline:none;
      transition:border-color 0.2s;
    }
    .form-field input:focus{border-color:var(--laranja)}
    .form-field input::placeholder{color:rgba(255,255,255,0.25)}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .btn-pay{
      width:100%;padding:15px;margin-top:8px;
      background:linear-gradient(135deg,var(--laranja),var(--laranja2));
      border:none;border-radius:14px;
      color:var(--branco);font-family:'Raleway',sans-serif;
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
      margin-top:12px;
      font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);
    }
    .pay-security i{color:var(--verde)}
    .pay-methods{
      display:flex;justify-content:center;gap:10px;flex-wrap:wrap;
      margin-top:12px;
    }
    .pay-method-badge{
      padding:5px 10px;
      background:rgba(255,255,255,0.07);
      border:1px solid rgba(255,255,255,0.12);
      border-radius:8px;
      font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);
    }
    .pay-result{display:none;text-align:center;padding:24px 0}
    .pay-result.success{display:block}
    .pay-result i{font-size:56px;color:var(--verde);margin-bottom:14px;display:block}
    .pay-result h3{font-size:20px;font-weight:800;margin-bottom:8px}
    .pay-result p{font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6}

    /* ── SCROLL ANIM ── */
    .reveal{opacity:0;transform:translateY(28px);transition:opacity 0.6s ease,transform 0.6s ease}
    .reveal.visible{opacity:1;transform:translateY(0)}

    /* ── TICKER ── */
    .ticker-wrap{
      overflow:hidden;padding:14px 0;
      background:linear-gradient(90deg,var(--laranja),var(--laranja2));
    }
    .ticker{
      display:flex;gap:48px;
      animation:ticker 20s linear infinite;
      white-space:nowrap;
    }
    .ticker-item{font-size:13px;font-weight:800;letter-spacing:0.3px}
    @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
  </style>
</head>
<body>

<!-- NAV -->
<nav>
  <div class="nav-logo">
    <div class="nav-logo-icon">⛽</div>
    <div class="nav-logo-text">Rota<span>Posto</span></div>
  </div>
  <div class="nav-links">
    <a href="#funcionalidades">Funcionalidades</a>
    <a href="#como-funciona">Como Funciona</a>
    <a href="#pricing">Preços</a>
    <a href="#faq">FAQ</a>
    <a href="/app" style="color:rgba(255,255,255,0.65)">Acessar App</a>
  </div>
  <a class="nav-cta" href="#pricing">Começar Agora →</a>
</nav>

<!-- TICKER -->
<div class="ticker-wrap" style="margin-top:70px">
  <div class="ticker">
    <span class="ticker-item">⛽ Gasolina desde R$5,69</span>
    <span class="ticker-item">🌿 Etanol desde R$3,99</span>
    <span class="ticker-item">🚛 Diesel desde R$5,55</span>
    <span class="ticker-item">💨 GNV desde R$3,95</span>
    <span class="ticker-item">💰 Economize até R$25 por abastecimento</span>
    <span class="ticker-item">📍 8 postos mapeados em São Paulo</span>
    <span class="ticker-item">⛽ Gasolina desde R$5,69</span>
    <span class="ticker-item">🌿 Etanol desde R$3,99</span>
    <span class="ticker-item">🚛 Diesel desde R$5,55</span>
    <span class="ticker-item">💨 GNV desde R$3,95</span>
    <span class="ticker-item">💰 Economize até R$25 por abastecimento</span>
    <span class="ticker-item">📍 8 postos mapeados em São Paulo</span>
  </div>
</div>

<!-- HERO -->
<div id="hero">
  <div class="hero-bg"></div>
  <div class="hero-grid"></div>

  <div class="hero-badge">
    <i class="fas fa-star" style="font-size:10px"></i>
    Novo · Economize todo dia no combustível
  </div>

  <h1 class="hero-h1">
    Encontre o <span class="laranja">posto mais barato</span> perto de você
  </h1>

  <p class="hero-sub">
    O RotaPosto compara os preços em tempo real, calcula quanto você economiza no tanque e traça a rota mais inteligente até o posto.
  </p>

  <div class="hero-btns">
    <button class="btn-hero-pri" onclick="abrirModal('premium')">
      <i class="fas fa-bolt"></i> Assinar por R$9,90/mês
    </button>
    <a href="/app" class="btn-hero-sec">
      <i class="fas fa-play"></i> Ver Demo Grátis
    </a>
  </div>

  <!-- Phone Mock -->
  <div class="hero-phone-wrap">
    <div class="phone-frame">
      <div class="phone-notch"></div>
      <div class="phone-content">
        <div class="ph-header">
          <div class="ph-title">⭐ Melhor posto próximo</div>
          <div class="ph-name">Posto BR Higienópolis</div>
          <div class="ph-addr">Av. Angélica, 900 · São Paulo</div>
          <div class="ph-preco">
            <span class="ph-r">R$</span>
            <span class="ph-val">5,</span>
            <span class="ph-cents">69</span>
          </div>
          <div class="ph-grid">
            <div class="ph-stat">
              <div class="ph-stat-l">📍 Distância</div>
              <div class="ph-stat-v o">1.9km</div>
            </div>
            <div class="ph-stat">
              <div class="ph-stat-l">💰 Economia/L</div>
              <div class="ph-stat-v g">R$ 0.50</div>
            </div>
            <div class="ph-stat">
              <div class="ph-stat-l">🛢 No tanque</div>
              <div class="ph-stat-v g">R$ 25.00</div>
            </div>
            <div class="ph-stat">
              <div class="ph-stat-l">⛽ Postos</div>
              <div class="ph-stat-v">8 postos</div>
            </div>
          </div>
          <button class="ph-btn">
            <i class="fas fa-directions" style="font-size:10px"></i> Ir até lá
          </button>
        </div>
      </div>
      <div class="ph-nav">
        <div class="ph-nav-btn active"><i class="fas fa-trophy"></i>Melhor</div>
        <div class="ph-nav-btn"><i class="fas fa-list"></i>Lista</div>
        <div class="ph-nav-btn"><i class="fas fa-map"></i>Mapa</div>
        <div class="ph-nav-btn"><i class="fas fa-route"></i>Planejar</div>
      </div>
    </div>

    <div class="float-chip left">
      💰 Economia: <strong style="color:#69F0AE">R$ 25,00</strong>
    </div>
    <div class="float-chip right">
      📍 <strong>1.9km</strong> do posto
    </div>
  </div>
</div>

<!-- STATS BAND -->
<div class="stats-band">
  <div class="stats-inner">
    <div class="stat-item reveal">
      <div class="sv">+1M</div>
      <div class="sl">Preços Monitorados/mês</div>
    </div>
    <div class="stat-item reveal">
      <div class="sv">R$25</div>
      <div class="sl">Economia média/tanque</div>
    </div>
    <div class="stat-item reveal">
      <div class="sv">8+</div>
      <div class="sl">Combustíveis mapeados</div>
    </div>
    <div class="stat-item reveal">
      <div class="sv">100%</div>
      <div class="sl">Dados da ANP</div>
    </div>
  </div>
</div>

<!-- FEATURES -->
<section id="funcionalidades">
  <div class="section-tag"><i class="fas fa-star"></i> Funcionalidades</div>
  <h2 class="section-h2 reveal">Tudo que você precisa<br/>para economizar</h2>
  <p class="section-sub reveal">Do ranking de preços à rota inteligente — tudo em um só lugar.</p>

  <div class="features-grid">
    <div class="feat-card reveal">
      <div class="feat-icon" style="background:rgba(255,109,0,0.15)">💰</div>
      <h3>Menor Preço em Tempo Real</h3>
      <p>Compare os preços de gasolina, etanol, diesel e GNV dos postos mais próximos, atualizados semanalmente pela ANP.</p>
    </div>
    <div class="feat-card reveal">
      <div class="feat-icon" style="background:rgba(0,200,83,0.15)">🛢️</div>
      <h3>Calculadora de Economia</h3>
      <p>Informe o tamanho do seu tanque e veja exatamente quanto você economiza por litro e no tanque cheio ao escolher o melhor posto.</p>
    </div>
    <div class="feat-card reveal">
      <div class="feat-icon" style="background:rgba(21,101,192,0.2)">🗺️</div>
      <h3>Mapa Interativo</h3>
      <p>Veja todos os postos no mapa com os preços exibidos direto nos pins. Toque em qualquer posto para ver todos os combustíveis disponíveis.</p>
    </div>
    <div class="feat-card reveal">
      <div class="feat-icon" style="background:rgba(255,214,0,0.15)">🔔</div>
      <h3>Alertas de Preço</h3>
      <p>Receba uma notificação assim que um posto favorito baixar o preço. Nunca mais pague mais caro do que precisa.</p>
    </div>
    <div class="feat-card reveal">
      <div class="feat-icon" style="background:rgba(255,109,0,0.12)">🚗</div>
      <h3>Rota Inteligente</h3>
      <p>Trace a rota mais eficiente até o posto mais barato usando OpenStreetMap. Integração com Google Maps em 1 toque.</p>
    </div>
    <div class="feat-card reveal">
      <div class="feat-icon" style="background:rgba(0,200,83,0.12)">📊</div>
      <h3>Histórico de Preços</h3>
      <p>Veja a variação de preços dos postos ao longo das últimas semanas e antecipe o melhor momento para abastecer.</p>
    </div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section id="como-funciona" style="text-align:center">
  <div class="section-tag"><i class="fas fa-play-circle"></i> Simples assim</div>
  <h2 class="section-h2 reveal">Como funciona</h2>
  <p class="section-sub reveal" style="margin:0 auto 48px">Em menos de 30 segundos você já sabe onde abastecer.</p>
  <div class="steps">
    <div class="step reveal">
      <div class="step-num">1</div>
      <div class="step-body">
        <h3>Ative a localização ou busque sua cidade</h3>
        <p>O RotaPosto usa sua localização GPS ou busca por cidade para encontrar os postos mais próximos de você com os melhores preços.</p>
      </div>
    </div>
    <div class="step reveal">
      <div class="step-num">2</div>
      <div class="step-body">
        <h3>Escolha o tipo de combustível</h3>
        <p>Selecione gasolina, etanol, diesel ou GNV. O app ordena os postos do mais barato ao mais caro e calcula a economia em tempo real.</p>
      </div>
    </div>
    <div class="step reveal">
      <div class="step-num">3</div>
      <div class="step-body">
        <h3>Veja quanto você economiza no tanque</h3>
        <p>Com base no seu consumo e no tamanho do tanque, o app mostra exatamente quanto você vai economizar ao escolher o posto ideal.</p>
      </div>
    </div>
    <div class="step reveal">
      <div class="step-num">4</div>
      <div class="step-body">
        <h3>Toque em "Ir até lá" e economize</h3>
        <p>A rota é traçada automaticamente. Você chega ao posto, abastece pelo menor preço e economiza real no seu dia a dia.</p>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<div id="pricing">
  <div class="inner">
    <div class="section-tag"><i class="fas fa-tag"></i> Planos</div>
    <h2 class="section-h2 reveal">Simples, sem surpresas</h2>
    <p class="section-sub reveal" style="margin:0 auto">Comece grátis, faça upgrade quando quiser.</p>

    <div class="plans-wrap">
      <!-- Plano Grátis -->
      <div class="plan-card reveal">
        <div class="plan-name">Gratuito</div>
        <div class="plan-preco">
          <span class="cifra">R$</span>
          <span class="valor">0</span>
          <span class="periodo">/mês</span>
        </div>
        <div class="plan-desc">Para quem quer testar e já economizar algo.</div>
        <ul class="plan-features">
          <li><i class="fas fa-check check"></i> Busca de postos próximos</li>
          <li><i class="fas fa-check check"></i> Mapa interativo</li>
          <li><i class="fas fa-check check"></i> Menor preço do dia</li>
          <li><i class="fas fa-times x"></i> <span style="color:rgba(255,255,255,0.3)">Alertas de preço</span></li>
          <li><i class="fas fa-times x"></i> <span style="color:rgba(255,255,255,0.3)">Histórico de preços</span></li>
          <li><i class="fas fa-times x"></i> <span style="color:rgba(255,255,255,0.3)">Favoritos ilimitados</span></li>
        </ul>
        <a href="/app" class="btn-assinar sec">
          <i class="fas fa-play"></i> Usar Grátis
        </a>
      </div>

      <!-- Plano Premium -->
      <div class="plan-card destaque reveal">
        <div class="plan-badge">⭐ Mais Popular</div>
        <div class="plan-name" style="color:var(--laranja)">Premium</div>
        <div class="plan-preco">
          <span class="cifra">R$</span>
          <span class="valor" style="color:var(--laranja)">9</span>
          <span class="cents" style="color:var(--laranja)">,90</span>
          <span class="periodo">/mês</span>
        </div>
        <div class="plan-desc">Ideal para quem abastece toda semana e quer economizar de verdade.</div>
        <ul class="plan-features">
          <li><i class="fas fa-check check"></i> Tudo do plano grátis</li>
          <li><i class="fas fa-check check"></i> <strong>Alertas quando o preço cair</strong></li>
          <li><i class="fas fa-check check"></i> <strong>Histórico de 30 dias</strong></li>
          <li><i class="fas fa-check check"></i> <strong>Favoritos ilimitados</strong></li>
          <li><i class="fas fa-check check"></i> <strong>Calculadora avançada</strong></li>
          <li><i class="fas fa-check check"></i> <strong>Suporte prioritário</strong></li>
        </ul>
        <button class="btn-assinar pri" onclick="abrirModal('premium')">
          <i class="fas fa-bolt"></i> Assinar Agora
        </button>
        <div class="plan-guarantee" style="margin-top:14px">
          <i class="fas fa-shield-alt" style="color:var(--verde)"></i>
          7 dias de garantia · Cancele quando quiser
        </div>
      </div>

      <!-- Plano Anual -->
      <div class="plan-card reveal">
        <div class="plan-name">Anual</div>
        <div class="plan-preco">
          <span class="cifra">R$</span>
          <span class="valor">89</span>
          <span class="periodo">/ano</span>
        </div>
        <div class="plan-desc">Economize 25% pagando o ano inteiro. Equivale a R$7,42/mês.</div>
        <ul class="plan-features">
          <li><i class="fas fa-check check"></i> Tudo do Premium</li>
          <li><i class="fas fa-check check"></i> <strong style="color:var(--amarelo)">25% de desconto</strong></li>
          <li><i class="fas fa-check check"></i> Histórico ilimitado</li>
          <li><i class="fas fa-check check"></i> Acesso antecipado a novidades</li>
          <li><i class="fas fa-check check"></i> Relatório mensal de economia</li>
          <li><i class="fas fa-check check"></i> Suporte VIP</li>
        </ul>
        <button class="btn-assinar sec" onclick="abrirModal('anual')">
          <i class="fas fa-star"></i> Assinar Anual
        </button>
      </div>
    </div>

    <div class="plan-guarantee" style="margin-top:32px;font-size:13px">
      <i class="fas fa-lock" style="color:var(--verde)"></i>
      Pagamento 100% seguro via MercadoPago · Cartão, Pix ou Boleto · Cancele a qualquer momento
    </div>
  </div>
</div>

<!-- TESTIMONIALS -->
<section id="depoimentos">
  <div class="section-tag"><i class="fas fa-comment"></i> Depoimentos</div>
  <h2 class="section-h2 reveal">O que dizem os motoristas</h2>
  <p class="section-sub reveal">Mais de 1.200 motoristas já economizando com o RotaPosto.</p>
  <div class="test-grid">
    <div class="test-card reveal">
      <div class="test-stars">★★★★★</div>
      <div class="test-text">"Economizei R$28 na última vez que abasteci o tanque cheio. O app me mostrou um posto que eu nem sabia que existia a 2km de casa com o preço R$0,56 mais barato."</div>
      <div class="test-author">
        <div class="test-avatar">M</div>
        <div class="test-info">
          <div class="name">Marcos Oliveira</div>
          <div class="role">Motorista de app · São Paulo/SP</div>
        </div>
      </div>
    </div>
    <div class="test-card reveal">
      <div class="test-stars">★★★★★</div>
      <div class="test-text">"Faço 3.000km por mês de trabalho. Com o RotaPosto começo a semana sabendo exatamente onde abastecer na rota. Pago o plano em um único abastecimento."</div>
      <div class="test-author">
        <div class="test-avatar">A</div>
        <div class="test-info">
          <div class="name">Ana Souza</div>
          <div class="role">Representante Comercial · Campinas/SP</div>
        </div>
      </div>
    </div>
    <div class="test-card reveal">
      <div class="test-stars">★★★★☆</div>
      <div class="test-text">"O alerta de preço é sensacional. Recebo notificação quando meu posto favorito baixa o preço. Já evitei pagar mais caro três vezes essa semana."</div>
      <div class="test-author">
        <div class="test-avatar">R</div>
        <div class="test-info">
          <div class="name">Rafael Costa</div>
          <div class="role">Motorista Particular · Rio de Janeiro/RJ</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section id="faq" style="text-align:center">
  <div class="section-tag"><i class="fas fa-question-circle"></i> Dúvidas</div>
  <h2 class="section-h2 reveal">Perguntas Frequentes</h2>
  <p class="section-sub reveal" style="margin:0 auto 40px">Ainda com dúvidas? A gente responde.</p>
  <div class="faq-list">
    <div class="faq-item reveal">
      <button class="faq-q" onclick="toggleFaq(this)">
        De onde vêm os preços dos postos?
        <i class="fas fa-plus"></i>
      </button>
      <div class="faq-a">
        Os preços são baseados no levantamento semanal da ANP (Agência Nacional do Petróleo, Gás Natural e Biocombustíveis), que coleta preços de mais de 2.000 municípios brasileiros toda semana. Os dados são atualizados automaticamente.
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
        Quais formas de pagamento são aceitas?
        <i class="fas fa-plus"></i>
      </button>
      <div class="faq-a">
        Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex), Pix e boleto bancário, tudo processado com segurança pelo MercadoPago.
      </div>
    </div>
    <div class="faq-item reveal">
      <button class="faq-q" onclick="toggleFaq(this)">
        O app funciona em todo o Brasil?
        <i class="fas fa-plus"></i>
      </button>
      <div class="faq-a">
        Sim! A ANP coleta dados em mais de 2.000 municípios brasileiros. Postos de cidades menores podem ter menos atualizações, mas as capitais e grandes cidades têm cobertura semanal.
      </div>
    </div>
    <div class="faq-item reveal">
      <button class="faq-q" onclick="toggleFaq(this)">
        O plano grátis tem limitações?
        <i class="fas fa-plus"></i>
      </button>
      <div class="faq-a">
        O plano grátis permite buscar postos próximos, ver o mapa e conferir o menor preço do dia. Para alertas de preço, histórico e favoritos ilimitados, você precisa do plano Premium (R$9,90/mês).
      </div>
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<div id="cta-final">
  <div class="section-tag"><i class="fas fa-rocket"></i> Comece hoje</div>
  <h2 class="reveal">Pare de pagar caro no combustível</h2>
  <p class="reveal">O brasileiro abastece em média 3 vezes por mês. Com o RotaPosto, você pode economizar R$75 ou mais todo mês.</p>
  <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
    <button class="btn-hero-pri" onclick="abrirModal('premium')" style="font-size:15px;padding:15px 28px">
      <i class="fas fa-bolt"></i> Assinar por R$9,90/mês
    </button>
    <a href="/app" class="btn-hero-sec" style="font-size:15px;padding:15px 24px">
      <i class="fas fa-play"></i> Testar Grátis
    </a>
  </div>
</div>

<!-- FOOTER -->
<footer>
  <div class="footer-logo">Rota<span>Posto</span></div>
  <div class="footer-links">
    <a href="#funcionalidades">Funcionalidades</a>
    <a href="#pricing">Preços</a>
    <a href="/app">App</a>
    <a href="#faq">FAQ</a>
    <a href="mailto:contato@rotaposto.com.br">Contato</a>
  </div>
  <p>© 2025 RotaPosto. Dados de preços fornecidos pela ANP. Mapas por OpenStreetMap.</p>
  <p style="margin-top:6px">Pagamentos processados com segurança pelo <strong>MercadoPago</strong>.</p>
</footer>

<!-- MODAL PAGAMENTO -->
<div class="modal-bg" id="modal-pagamento">
  <div class="modal-box">
    <button class="modal-close" onclick="fecharModal()"><i class="fas fa-times"></i></button>

    <!-- Formulário -->
    <div id="pay-form">
      <div class="modal-plan-header">
        <h3 id="modal-plan-name">RotaPosto Premium</h3>
        <div class="price"><sup>R$</sup><span id="modal-plan-valor">9,90</span><sub>/mês</sub></div>
      </div>

      <div class="modal-section-title">Seus dados</div>
      <div class="form-field">
        <label>Nome completo</label>
        <input type="text" id="pay-nome" placeholder="João da Silva" autocomplete="name"/>
      </div>
      <div class="form-field">
        <label>E-mail</label>
        <input type="email" id="pay-email" placeholder="seu@email.com" autocomplete="email"/>
      </div>
      <div class="form-field">
        <label>CPF</label>
        <input type="text" id="pay-cpf" placeholder="000.000.000-00" maxlength="14" oninput="mascaraCPF(this)"/>
      </div>

      <div class="modal-section-title" style="margin-top:16px">Cartão de crédito</div>
      <div class="form-field">
        <label>Número do cartão</label>
        <input type="text" id="pay-card" placeholder="0000 0000 0000 0000" maxlength="19" oninput="mascaraCartao(this)"/>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Validade</label>
          <input type="text" id="pay-validade" placeholder="MM/AA" maxlength="5" oninput="mascaraValidade(this)"/>
        </div>
        <div class="form-field">
          <label>CVV</label>
          <input type="text" id="pay-cvv" placeholder="123" maxlength="4"/>
        </div>
      </div>

      <button class="btn-pay" id="btn-pagar" onclick="processarPagamento()">
        <i class="fas fa-lock"></i> Pagar R$<span id="btn-valor">9,90</span>
      </button>

      <div class="pay-security">
        <i class="fas fa-shield-alt"></i> Pagamento 100% seguro via MercadoPago
      </div>
      <div class="pay-methods">
        <span class="pay-method-badge">💳 Cartão</span>
        <span class="pay-method-badge">📱 Pix</span>
        <span class="pay-method-badge">📄 Boleto</span>
      </div>
    </div>

    <!-- Sucesso -->
    <div class="pay-result" id="pay-success">
      <i class="fas fa-check-circle"></i>
      <h3>Assinatura confirmada! 🎉</h3>
      <p>Bem-vindo ao RotaPosto Premium! <br/>Você já pode acessar todas as funcionalidades.</p>
      <br/>
      <a href="/app" class="btn-assinar pri" style="display:flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;padding:13px;border-radius:12px;font-size:14px;font-weight:800;background:linear-gradient(135deg,#FF6D00,#FF8F00);color:#fff;box-shadow:0 4px 20px rgba(255,109,0,0.4)">
        <i class="fas fa-rocket"></i> Acessar o App
      </a>
    </div>
  </div>
</div>

<script>
// ─── PLANO SELECIONADO ────────────────────────────────────────────────────────
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
document.getElementById('modal-pagamento').addEventListener('click', function(e){
  if (e.target === this) fecharModal();
});

// ─── MÁSCARAS ─────────────────────────────────────────────────────────────────
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

// ─── PROCESSAR PAGAMENTO ──────────────────────────────────────────────────────
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
      plano: planoAtual,
      nome, email, cpf,
      cartao: {
        numero: card,
        mes: parseInt(mesVal),
        ano: parseInt('20' + anoVal),
        cvv
      }
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

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');
  // fecha todos
  document.querySelectorAll('.faq-q').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling.classList.remove('open');
  });
  if (!isOpen) {
    btn.classList.add('open');
    answer.classList.add('open');
  }
}

// ─── SCROLL REVEAL ────────────────────────────────────────────────────────────
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
</script>
</body>
</html>`
}
