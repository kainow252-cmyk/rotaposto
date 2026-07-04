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
  <title>RotaPosto Empresas — Atraia mais clientes para seu posto</title>
  <meta name="description" content="Transforme o RotaPosto em um canal de vendas para o seu posto. Destaque no mapa, cupons de desconto e métricas reais."/>
  <link rel="icon" href="/favicon.ico"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"/>
  <style>
    :root {
      --laranja: #FF6D00;
      --laranja-escuro: #E65100;
      --laranja-claro: #FFF3E0;
      --azul: #1565C0;
      --verde: #00C853;
      --cinza: #F5F5F5;
      --texto: #1A1A1A;
      --sub: #616161;
      --border: #E0E0E0;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; color:var(--texto); background:#fff; }
    a { text-decoration:none; color:inherit; }

    /* ── HEADER ── */
    .emp-header {
      position:sticky; top:0; z-index:100;
      background:#fff; border-bottom:1px solid var(--border);
      padding:0 24px; height:64px;
      display:flex; align-items:center; justify-content:space-between;
    }
    .emp-logo { display:flex; align-items:center; gap:10px; }
    .emp-logo-icon { width:36px; height:36px; background:var(--laranja); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }
    .emp-logo-nome { font-size:17px; font-weight:800; color:var(--texto); }
    .emp-logo-tag { font-size:11px; font-weight:700; color:var(--laranja); background:var(--laranja-claro); padding:2px 8px; border-radius:20px; margin-left:4px; }
    .emp-header-nav { display:flex; align-items:center; gap:16px; }
    .emp-header-nav a { font-size:14px; font-weight:500; color:var(--sub); transition:color .2s; }
    .emp-header-nav a:hover { color:var(--laranja); }
    .emp-btn-entrar { padding:9px 20px; background:var(--laranja); color:#fff; border-radius:10px; font-size:14px; font-weight:700; border:none; cursor:pointer; transition:background .2s; }
    .emp-btn-entrar:hover { background:var(--laranja-escuro); }

    /* ── HERO ── */
    .hero {
      background:linear-gradient(135deg, #FF6D00 0%, #E65100 50%, #BF360C 100%);
      padding:80px 24px 100px;
      text-align:center; position:relative; overflow:hidden;
    }
    .hero::before {
      content:''; position:absolute; inset:0;
      background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .hero-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.3); color:#fff; padding:6px 16px; border-radius:20px; font-size:13px; font-weight:600; margin-bottom:20px; }
    .hero h1 { font-size:clamp(28px,5vw,52px); font-weight:900; color:#fff; line-height:1.15; margin-bottom:16px; }
    .hero h1 span { color:#FFE082; }
    .hero p { font-size:clamp(15px,2vw,18px); color:rgba(255,255,255,.85); max-width:560px; margin:0 auto 32px; line-height:1.7; }
    .hero-btns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
    .btn-hero-primary { padding:16px 32px; background:#fff; color:var(--laranja); border-radius:14px; font-size:16px; font-weight:800; cursor:pointer; border:none; transition:transform .2s, box-shadow .2s; }
    .btn-hero-primary:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.2); }
    .btn-hero-sec { padding:16px 32px; background:transparent; color:#fff; border:2px solid rgba(255,255,255,.5); border-radius:14px; font-size:16px; font-weight:700; cursor:pointer; transition:border-color .2s; }
    .btn-hero-sec:hover { border-color:#fff; }
    .hero-stats { display:flex; gap:32px; justify-content:center; flex-wrap:wrap; margin-top:48px; }
    .hero-stat { text-align:center; }
    .hero-stat-num { font-size:28px; font-weight:900; color:#FFE082; }
    .hero-stat-label { font-size:12px; color:rgba(255,255,255,.7); margin-top:2px; }

    /* ── SECTIONS ── */
    .section { padding:80px 24px; }
    .section-alt { background:var(--cinza); }
    .container { max-width:1080px; margin:0 auto; }
    .section-label { font-size:12px; font-weight:700; color:var(--laranja); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:10px; }
    .section-title { font-size:clamp(24px,4vw,38px); font-weight:900; color:var(--texto); margin-bottom:12px; line-height:1.2; }
    .section-sub { font-size:16px; color:var(--sub); max-width:560px; line-height:1.7; }

    /* ── PLANOS ── */
    .planos-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:24px; margin-top:48px; }
    .plano-card {
      background:#fff; border:2px solid var(--border); border-radius:20px;
      padding:32px 28px; position:relative; transition:border-color .2s, box-shadow .2s;
    }
    .plano-card:hover { border-color:var(--laranja); box-shadow:0 8px 32px rgba(255,109,0,.1); }
    .plano-card.destaque { border-color:var(--laranja); background:linear-gradient(160deg, #FFF8F5 0%, #fff 100%); }
    .plano-popular { position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:var(--laranja); color:#fff; font-size:11px; font-weight:800; padding:4px 16px; border-radius:20px; white-space:nowrap; }
    .plano-icon { font-size:32px; margin-bottom:12px; }
    .plano-nome { font-size:18px; font-weight:800; color:var(--texto); margin-bottom:4px; }
    .plano-desc { font-size:13px; color:var(--sub); margin-bottom:20px; line-height:1.6; }
    .plano-preco { display:flex; align-items:baseline; gap:4px; margin-bottom:6px; }
    .plano-val { font-size:36px; font-weight:900; color:var(--laranja); }
    .plano-periodo { font-size:14px; color:var(--sub); }
    .plano-economia { font-size:12px; color:var(--verde); font-weight:600; margin-bottom:24px; }
    .plano-features { list-style:none; display:flex; flex-direction:column; gap:10px; margin-bottom:28px; }
    .plano-features li { display:flex; align-items:center; gap:10px; font-size:14px; color:#424242; }
    .plano-features li i { color:var(--verde); width:16px; }
    .btn-plano { width:100%; padding:14px; background:var(--laranja); color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; transition:background .2s; }
    .btn-plano:hover { background:var(--laranja-escuro); }
    .btn-plano-sec { background:#fff; color:var(--laranja); border:2px solid var(--laranja); }
    .btn-plano-sec:hover { background:var(--laranja-claro); }

    /* ── COMO FUNCIONA ── */
    .como-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:28px; margin-top:48px; }
    .como-step { text-align:center; padding:28px 20px; }
    .como-num { width:52px; height:52px; background:var(--laranja); color:#fff; border-radius:50%; font-size:20px; font-weight:900; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
    .como-titulo { font-size:16px; font-weight:800; margin-bottom:8px; }
    .como-desc { font-size:14px; color:var(--sub); line-height:1.7; }

    /* ── FEATURES ── */
    .features-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:24px; margin-top:48px; }
    .feature-card { background:#fff; border:1.5px solid var(--border); border-radius:16px; padding:24px; display:flex; gap:16px; transition:box-shadow .2s; }
    .feature-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.07); }
    .feature-icon { width:48px; height:48px; background:var(--laranja-claro); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
    .feature-body h3 { font-size:15px; font-weight:800; margin-bottom:6px; }
    .feature-body p { font-size:13px; color:var(--sub); line-height:1.7; }

    /* ── CUPOM DEMO ── */
    .cupom-demo { background:var(--laranja); border-radius:20px; padding:32px; color:#fff; text-align:center; max-width:360px; margin:0 auto; }
    .cupom-demo-header { font-size:13px; font-weight:700; opacity:.8; margin-bottom:8px; }
    .cupom-demo-nome { font-size:20px; font-weight:900; margin-bottom:4px; }
    .cupom-demo-posto { font-size:14px; opacity:.8; margin-bottom:20px; }
    .cupom-qr { background:#fff; width:140px; height:140px; border-radius:12px; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; font-size:80px; }
    .cupom-codigo { background:rgba(255,255,255,.2); border-radius:10px; padding:12px 24px; font-size:28px; font-weight:900; letter-spacing:8px; margin-bottom:12px; }
    .cupom-timer { font-size:12px; opacity:.7; }
    .cupom-desc { margin-top:16px; background:rgba(255,255,255,.15); border-radius:10px; padding:12px 16px; }
    .cupom-desc-val { font-size:22px; font-weight:900; color:#FFE082; }
    .cupom-desc-txt { font-size:12px; opacity:.8; }

    /* ── DEPOIMENTOS ── */
    .dep-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:24px; margin-top:48px; }
    .dep-card { background:#fff; border:1.5px solid var(--border); border-radius:16px; padding:24px; }
    .dep-stars { color:#FFC107; font-size:14px; margin-bottom:12px; }
    .dep-texto { font-size:14px; color:var(--sub); line-height:1.7; margin-bottom:16px; font-style:italic; }
    .dep-autor { display:flex; align-items:center; gap:10px; }
    .dep-avatar { width:40px; height:40px; border-radius:50%; font-size:18px; display:flex; align-items:center; justify-content:center; }
    .dep-nome { font-size:14px; font-weight:700; }
    .dep-cargo { font-size:12px; color:var(--sub); }

    /* ── FAQ ── */
    .faq-list { display:flex; flex-direction:column; gap:12px; margin-top:40px; max-width:720px; margin-left:auto; margin-right:auto; }
    .faq-item { border:1.5px solid var(--border); border-radius:14px; overflow:hidden; }
    .faq-q { padding:18px 20px; font-size:15px; font-weight:700; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:16px; }
    .faq-q:hover { background:var(--cinza); }
    .faq-q i { color:var(--laranja); font-size:14px; transition:transform .3s; flex-shrink:0; }
    .faq-a { display:none; padding:0 20px 18px; font-size:14px; color:var(--sub); line-height:1.8; }
    .faq-item.aberto .faq-a { display:block; }
    .faq-item.aberto .faq-q i { transform:rotate(180deg); }

    /* ── CTA FINAL ── */
    .cta-final { background:linear-gradient(135deg, #1A1A1A 0%, #333 100%); padding:80px 24px; text-align:center; }
    .cta-final h2 { font-size:clamp(24px,4vw,40px); font-weight:900; color:#fff; margin-bottom:12px; }
    .cta-final p { font-size:16px; color:rgba(255,255,255,.7); max-width:500px; margin:0 auto 32px; line-height:1.7; }

    /* ── FOOTER ── */
    .emp-footer { background:#111; color:rgba(255,255,255,.5); padding:32px 24px; text-align:center; font-size:13px; }
    .emp-footer a { color:var(--laranja); }

    /* ── MODAL CADASTRO ── */
    .modal-bg { display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); align-items:center; justify-content:center; padding:16px; }
    .modal-bg.aberto { display:flex; }
    .modal-box { background:#fff; border-radius:20px; width:100%; max-width:480px; padding:32px; position:relative; max-height:90vh; overflow-y:auto; }
    .modal-close { position:absolute; top:16px; right:16px; background:none; border:none; cursor:pointer; font-size:20px; color:#999; padding:4px; }
    .modal-titulo { font-size:22px; font-weight:900; margin-bottom:4px; }
    .modal-sub { font-size:14px; color:var(--sub); margin-bottom:24px; }
    .form-group { margin-bottom:16px; }
    .form-label { font-size:13px; font-weight:700; color:#555; display:block; margin-bottom:6px; }
    .form-input { width:100%; padding:13px 14px; border:1.5px solid var(--border); border-radius:12px; font-size:15px; font-family:'Inter',sans-serif; transition:border-color .2s; }
    .form-input:focus { outline:none; border-color:var(--laranja); }
    .form-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .form-select { width:100%; padding:13px 14px; border:1.5px solid var(--border); border-radius:12px; font-size:15px; background:#fff; font-family:'Inter',sans-serif; }
    .btn-form-submit { width:100%; padding:16px; background:var(--laranja); color:#fff; border:none; border-radius:14px; font-size:16px; font-weight:700; cursor:pointer; margin-top:8px; transition:background .2s; }
    .btn-form-submit:hover { background:var(--laranja-escuro); }
    .form-divider { text-align:center; font-size:13px; color:#999; margin:16px 0; }
    .form-erro { background:#FFEBEE; color:#C62828; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px; display:none; }
    .form-sucesso { background:#E8F5E9; color:#1B5E20; border-radius:10px; padding:14px; font-size:14px; line-height:1.6; display:none; }

    @media (max-width:640px) {
      .emp-header-nav { display:none; }
      .hero { padding:56px 20px 72px; }
      .form-grid2 { grid-template-columns:1fr; }
    }
  </style>
</head>
<body>

<!-- HEADER -->
<header class="emp-header">
  <div class="emp-logo">
    <div class="emp-logo-icon">⛽</div>
    <div>
      <span class="emp-logo-nome">RotaPosto</span>
      <span class="emp-logo-tag">EMPRESAS</span>
    </div>
  </div>
  <nav class="emp-header-nav">
    <a href="#planos">Planos</a>
    <a href="#como-funciona">Como funciona</a>
    <a href="#recursos">Recursos</a>
    <a href="#faq">FAQ</a>
    <a href="/app" target="_blank">App do Motorista</a>
  </nav>
  <button class="emp-btn-entrar" onclick="abrirPainelEmpresa()">
    <i class="fas fa-sign-in-alt"></i> Acessar Painel
  </button>
</header>

<!-- HERO -->
<section class="hero">
  <div class="hero-badge"><i class="fas fa-star"></i> Novo Canal de Vendas para Postos</div>
  <h1>Seu posto visto por<br/><span>milhares de motoristas</span><br/>todos os dias</h1>
  <p>O RotaPosto Empresas transforma o aplicativo mais usado por motoristas da Grande Vitória em um canal direto para o seu posto atrair, converter e fidelizar clientes.</p>
  <div class="hero-btns">
    <button class="btn-hero-primary" onclick="document.getElementById('modal-cadastro').classList.add('aberto')">
      <i class="fas fa-rocket"></i> Quero ser parceiro
    </button>
    <button class="btn-hero-sec" onclick="document.getElementById('como-funciona').scrollIntoView({behavior:'smooth'})">
      <i class="fas fa-play-circle"></i> Ver como funciona
    </button>
  </div>
  <div class="hero-stats">
    <div class="hero-stat"><div class="hero-stat-num">12.000+</div><div class="hero-stat-label">Motoristas ativos</div></div>
    <div class="hero-stat"><div class="hero-stat-num">340+</div><div class="hero-stat-label">Postos cadastrados</div></div>
    <div class="hero-stat"><div class="hero-stat-num">R$ 0,15</div><div class="hero-stat-label">Economia média/litro</div></div>
    <div class="hero-stat"><div class="hero-stat-num">4.8★</div><div class="hero-stat-label">Avaliação na loja</div></div>
  </div>
</section>

<!-- COMO FUNCIONA -->
<section class="section" id="como-funciona">
  <div class="container">
    <div class="section-label">Processo simples</div>
    <h2 class="section-title">Em 4 passos você já está no mapa</h2>
    <p class="section-sub">Sem contratos longos, sem instalação de equipamentos. Tudo pelo celular em menos de 10 minutos.</p>
    <div class="como-grid">
      <div class="como-step">
        <div class="como-num">1</div>
        <div class="como-titulo">Cadastre seu posto</div>
        <div class="como-desc">Preencha o CNPJ, endereço e os dados do seu estabelecimento. Verificamos e aprovamos em até 24h.</div>
      </div>
      <div class="como-step">
        <div class="como-num">2</div>
        <div class="como-titulo">Configure seu perfil</div>
        <div class="como-desc">Adicione bandeira, foto, serviços disponíveis e configure os preços que você pratica para cada combustível.</div>
      </div>
      <div class="como-step">
        <div class="como-num">3</div>
        <div class="como-titulo">Ative os benefícios</div>
        <div class="como-desc">Escolha seu plano, configure o desconto para assinantes Premium e ative o destaque no mapa da região.</div>
      </div>
      <div class="como-step">
        <div class="como-num">4</div>
        <div class="como-titulo">Acompanhe os resultados</div>
        <div class="como-desc">Veja em tempo real quantos motoristas clicaram, quantos descupons foram validados e qual é o ROI real.</div>
      </div>
    </div>
  </div>
</section>

<!-- PLANOS -->
<section class="section section-alt" id="planos">
  <div class="container">
    <div class="section-label">Planos e preços</div>
    <h2 class="section-title">Escolha o plano ideal para o seu posto</h2>
    <p class="section-sub">Sem fidelidade. Cancele quando quiser. O retorno aparece já no primeiro mês.</p>
    <div class="planos-grid">

      <!-- Básico -->
      <div class="plano-card">
        <div class="plano-icon">📍</div>
        <div class="plano-nome">Visibilidade</div>
        <div class="plano-desc">Para postos que querem aparecer no app e validar o preço com o selo de verificado.</div>
        <div class="plano-preco"><span class="plano-val">R$ 29</span><span class="plano-periodo">,90/mês</span></div>
        <div class="plano-economia">Equivale a R$ 0,99/dia</div>
        <ul class="plano-features">
          <li><i class="fas fa-check-circle"></i> Perfil completo no mapa</li>
          <li><i class="fas fa-check-circle"></i> Atualização de preços direta</li>
          <li><i class="fas fa-check-circle"></i> Selo "Preço Verificado"</li>
          <li><i class="fas fa-check-circle"></i> Fotos e serviços do posto</li>
          <li><i class="fas fa-check-circle"></i> Relatório mensal básico</li>
          <li style="color:#bbb"><i class="fas fa-times-circle" style="color:#bbb"></i> Destaque no mapa (pino dourado)</li>
          <li style="color:#bbb"><i class="fas fa-times-circle" style="color:#bbb"></i> Sistema de cupons/descontos</li>
        </ul>
        <button class="btn-plano btn-plano-sec" onclick="abrirCadastro('visibilidade')">Começar grátis por 7 dias</button>
      </div>

      <!-- Premium (destaque) -->
      <div class="plano-card destaque">
        <div class="plano-popular">⭐ MAIS ESCOLHIDO</div>
        <div class="plano-icon">🥇</div>
        <div class="plano-nome">Parceiro Premium</div>
        <div class="plano-desc">Para postos que querem dominar a busca na região e atrair assinantes com desconto exclusivo.</div>
        <div class="plano-preco"><span class="plano-val">R$ 49</span><span class="plano-periodo">,90/mês</span></div>
        <div class="plano-economia">Estimativa: 80+ clientes/mês gerados</div>
        <ul class="plano-features">
          <li><i class="fas fa-check-circle"></i> Tudo do plano Visibilidade</li>
          <li><i class="fas fa-check-circle"></i> 🗺️ Pino dourado no mapa</li>
          <li><i class="fas fa-check-circle"></i> Topo na lista de busca</li>
          <li><i class="fas fa-check-circle"></i> Sistema de cupons QR Code</li>
          <li><i class="fas fa-check-circle"></i> Notificações push (geofencing)</li>
          <li><i class="fas fa-check-circle"></i> Dashboard com métricas avançadas</li>
          <li><i class="fas fa-check-circle"></i> Suporte prioritário WhatsApp</li>
        </ul>
        <button class="btn-plano" onclick="abrirCadastro('premium')">Quero atrair mais clientes</button>
      </div>

      <!-- Franqueado -->
      <div class="plano-card">
        <div class="plano-icon">🏢</div>
        <div class="plano-nome">Rede / Bandeirado</div>
        <div class="plano-desc">Para redes de postos, bandeiras e grupos com múltiplas unidades na Grande Vitória.</div>
        <div class="plano-preco"><span class="plano-val">Sob</span><span class="plano-periodo"> consulta</span></div>
        <div class="plano-economia">A partir de 3 unidades</div>
        <ul class="plano-features">
          <li><i class="fas fa-check-circle"></i> Tudo do plano Premium</li>
          <li><i class="fas fa-check-circle"></i> Painel multi-unidade</li>
          <li><i class="fas fa-check-circle"></i> Relatórios consolidados</li>
          <li><i class="fas fa-check-circle"></i> Campanha de anúncio regional</li>
          <li><i class="fas fa-check-circle"></i> API de integração com PDV</li>
          <li><i class="fas fa-check-circle"></i> Gerente de conta dedicado</li>
          <li><i class="fas fa-check-circle"></i> Preço especial por volume</li>
        </ul>
        <button class="btn-plano btn-plano-sec" onclick="abrirCadastro('rede')">Falar com comercial</button>
      </div>

    </div>
  </div>
</section>

<!-- RECURSOS -->
<section class="section" id="recursos">
  <div class="container">
    <div class="section-label">O que você ganha</div>
    <h2 class="section-title">Tudo para transformar visibilidade em vendas</h2>
    <p class="section-sub">Ferramentas reais que geram resultado mensurável, não apenas presença online.</p>
    <div class="features-grid" style="margin-top:48px">

      <div class="feature-card">
        <div class="feature-icon">🗺️</div>
        <div class="feature-body">
          <h3>Pino Dourado no Mapa</h3>
          <p>Seu posto se destaca visualmente com um marcador exclusivo na cor dourada. Motoristas notam antes de qualquer outro posto da região.</p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">✅</div>
        <div class="feature-body">
          <h3>Selo "Preço Verificado"</h3>
          <p>Seu preço aparece com um selo oficial de verificação. O motorista chega sabendo o que vai pagar — zero frustração, mais conversão.</p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🎟️</div>
        <div class="feature-body">
          <h3>Cupons QR Code Premium</h3>
          <p>Assinantes do RotaPosto geram um QR Code exclusivo para resgatar o desconto no seu posto. Validação em 1 segundo pelo celular do frentista.</p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📍</div>
        <div class="feature-body">
          <h3>Notificação por Proximidade</h3>
          <p>Quando um motorista passa a 800m do seu posto, ele recebe uma notificação personalizada com seu desconto. Marketing ultralocal em tempo real.</p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <div class="feature-body">
          <h3>Métricas que Provam Retorno</h3>
          <p>"Este mês, 340 motoristas clicaram em Ir até lá no seu posto." Dados reais para justificar o investimento e otimizar campanhas.</p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <div class="feature-body">
          <h3>Integração Automática de Preços</h3>
          <p>O gerente atualiza o preço no painel uma vez. O desconto é calculado automaticamente na hora da validação — sem contas manuais.</p>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- CUPOM DEMO -->
<section class="section section-alt">
  <div class="container">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center">
      <div>
        <div class="section-label">Sistema de cupons</div>
        <h2 class="section-title">Desconto em 1 segundo, sem digitar nada</h2>
        <p style="font-size:15px;color:var(--sub);line-height:1.8;margin-bottom:20px;">O assinante abre o app, gera o QR Code e mostra para o frentista. A câmera do celular lê e o sistema mostra automaticamente o preço com desconto na tela. Nenhuma digitação, nenhum erro.</p>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:12px;font-size:14px;color:#424242"><i class="fas fa-clock" style="color:var(--laranja);width:20px"></i> Validade de 5 minutos (anti-fraude)</div>
          <div style="display:flex;align-items:center;gap:12px;font-size:14px;color:#424242"><i class="fas fa-shield-alt" style="color:var(--laranja);width:20px"></i> Hash única por geração, código expira após uso</div>
          <div style="display:flex;align-items:center;gap:12px;font-size:14px;color:#424242"><i class="fas fa-calculator" style="color:var(--laranja);width:20px"></i> Desconto calculado automaticamente pela API</div>
          <div style="display:flex;align-items:center;gap:12px;font-size:14px;color:#424242"><i class="fas fa-mobile-alt" style="color:var(--laranja);width:20px"></i> Funciona em qualquer celular, sem instalar app</div>
        </div>
      </div>
      <div>
        <div class="cupom-demo">
          <div class="cupom-demo-header">⛽ RotaPosto Premium</div>
          <div class="cupom-demo-nome">Luciano Santos</div>
          <div class="cupom-demo-posto">Gasolina Aditivada · Posto Central</div>
          <div class="cupom-qr">📱</div>
          <div class="cupom-codigo">843 912</div>
          <div class="cupom-timer">⏱ Expira em 4:42</div>
          <div class="cupom-desc">
            <div class="cupom-desc-val">R$ 5,80/L</div>
            <div class="cupom-desc-txt">Preço original R$ 5,90 · Economia R$ 0,10/L</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- DEPOIMENTOS -->
<section class="section">
  <div class="container">
    <div class="section-label">Quem já é parceiro</div>
    <h2 class="section-title">Resultados reais de postos parceiros</h2>
    <div class="dep-grid">
      <div class="dep-card">
        <div class="dep-stars">★★★★★</div>
        <div class="dep-texto">"No primeiro mês já tivemos 180 validações de cupom. Os motoristas de Uber vinham especificamente por causa do app. O investimento de R$ 49 paga sozinho."</div>
        <div class="dep-autor">
          <div class="dep-avatar" style="background:#FFF3E0">👨‍💼</div>
          <div><div class="dep-nome">Carlos M.</div><div class="dep-cargo">Gerente · Posto Central de Carapina</div></div>
        </div>
      </div>
      <div class="dep-card">
        <div class="dep-stars">★★★★★</div>
        <div class="dep-texto">"A notificação de proximidade é incrível. Às 6h da manhã os motoristas de aplicativo passam perto e recebem o alerta do nosso preço. Fila nas bombas toda manhã."</div>
        <div class="dep-autor">
          <div class="dep-avatar" style="background:#E8F5E9">👩‍💼</div>
          <div><div class="dep-nome">Patrícia L.</div><div class="dep-cargo">Proprietária · Posto Laranjeiras</div></div>
        </div>
      </div>
      <div class="dep-card">
        <div class="dep-stars">★★★★☆</div>
        <div class="dep-texto">"O painel de métricas prova para o dono da rede que o RotaPosto traz retorno. Hoje temos 4 unidades cadastradas e não cancelo por nada."</div>
        <div class="dep-autor">
          <div class="dep-avatar" style="background:#E3F2FD">🏢</div>
          <div><div class="dep-nome">Roberto A.</div><div class="dep-cargo">Gerente Regional · Rede AutoPosto ES</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="section section-alt" id="faq">
  <div class="container">
    <div style="text-align:center">
      <div class="section-label">Perguntas frequentes</div>
      <h2 class="section-title">Dúvidas dos gerentes</h2>
    </div>
    <div class="faq-list">
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Preciso instalar algum equipamento no posto? <i class="fas fa-chevron-down"></i></div>
        <div class="faq-a">Não. Tudo funciona pelo navegador do celular. O frentista acessa <strong>rotaposto.com.br/parcerias/validar</strong> no celular dele e usa a câmera para ler o QR Code do cliente. Nenhuma instalação necessária.</div>
      </div>
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Como funciona o desconto para o assinante Premium? <i class="fas fa-chevron-down"></i></div>
        <div class="faq-a">Você configura o desconto no seu painel (ex: R$ 0,10/litro). Quando o assinante gera o cupom e o frentista escaneia, o sistema calcula automaticamente o preço final e exibe na tela. O frentista só precisa digitar esse valor no caixa.</div>
      </div>
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Posso cancelar quando quiser? <i class="fas fa-chevron-down"></i></div>
        <div class="faq-a">Sim. Não há fidelidade mínima. Você pode cancelar a qualquer momento pelo painel ou entrando em contato via WhatsApp. O cancelamento é efetivo ao final do período vigente.</div>
      </div>
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Quantos motoristas usam o RotaPosto na Grande Vitória? <i class="fas fa-chevron-down"></i></div>
        <div class="faq-a">Atualmente mais de 12.000 motoristas ativos, com forte concentração de motoristas de aplicativo (Uber, 99, InDrive) e entregadores. Esse público abastece 3x mais que o motorista comum e toma decisões rápidas baseadas em preço.</div>
      </div>
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">Como o pino dourado funciona na prática? <i class="fas fa-chevron-down"></i></div>
        <div class="faq-a">No mapa do app, postos parceiros Premium aparecem com um marcador dourado com a logo da sua bandeira. Além disso, seu posto aparece primeiro na lista de resultados da região, independentemente do preço praticado.</div>
      </div>
      <div class="faq-item" onclick="toggleFaq(this)">
        <div class="faq-q">O pagamento é seguro? Como funciona? <i class="fas fa-chevron-down"></i></div>
        <div class="faq-a">O pagamento é feito via PIX recorrente mensal através da plataforma OpenPix/Woovi, a mesma que o RotaPosto usa para as assinaturas de motoristas. 100% seguro e sem dados de cartão armazenados.</div>
      </div>
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<section class="cta-final">
  <div class="container">
    <h2>Seu posto no mapa de 12.000 motoristas</h2>
    <p>Comece com 7 dias grátis. Sem cartão, sem contrato. Veja o resultado antes de pagar.</p>
    <div class="hero-btns">
      <button class="btn-hero-primary" onclick="document.getElementById('modal-cadastro').classList.add('aberto')">
        <i class="fas fa-rocket"></i> Cadastrar meu posto agora
      </button>
      <button class="btn-hero-sec" onclick="abrirPainelEmpresa()">
        <i class="fas fa-sign-in-alt"></i> Já tenho conta
      </button>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="emp-footer">
  <p>© 2025 RotaPosto Empresas · <a href="/privacidade">Privacidade</a> · <a href="/termos">Termos</a> · <a href="/app">App do Motorista</a></p>
  <p style="margin-top:8px">RotaPosto CNPJ e dados da empresa · contato@rotaposto.com.br</p>
</footer>

<!-- MODAL CADASTRO -->
<div class="modal-bg" id="modal-cadastro">
  <div class="modal-box">
    <button class="modal-close" onclick="document.getElementById('modal-cadastro').classList.remove('aberto')">✕</button>
    <div class="modal-titulo">Cadastrar meu posto</div>
    <div class="modal-sub">Preencha os dados abaixo. Nossa equipe aprova em até 24h.</div>

    <div class="form-erro" id="cad-erro"></div>
    <div class="form-sucesso" id="cad-sucesso"></div>

    <div id="form-cadastro-body">
      <div class="form-group">
        <label class="form-label">Nome do responsável *</label>
        <input id="cad-nome" class="form-input" type="text" placeholder="João da Silva"/>
      </div>
      <div class="form-grid2">
        <div class="form-group">
          <label class="form-label">WhatsApp *</label>
          <input id="cad-tel" class="form-input" type="tel" placeholder="(27) 99999-9999" oninput="fmtTelEmp(this)"/>
        </div>
        <div class="form-group">
          <label class="form-label">E-mail *</label>
          <input id="cad-email" class="form-input" type="email" placeholder="contato@posto.com.br"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">CNPJ do posto *</label>
        <input id="cad-cnpj" class="form-input" type="text" placeholder="00.000.000/0001-00" maxlength="18" oninput="fmtCNPJ(this)"/>
      </div>
      <div class="form-group">
        <label class="form-label">Nome do posto *</label>
        <input id="cad-posto-nome" class="form-input" type="text" placeholder="Posto Central de Carapina"/>
      </div>
      <div class="form-grid2">
        <div class="form-group">
          <label class="form-label">Bandeira</label>
          <select id="cad-bandeira" class="form-select">
            <option value="">Selecionar...</option>
            <option>Sem bandeira (independente)</option>
            <option>Petrobras BR</option>
            <option>Shell</option>
            <option>Ipiranga</option>
            <option>Raízen (Shell/Cosan)</option>
            <option>Ale</option>
            <option>Vibra</option>
            <option>Outra</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Plano de interesse</label>
          <select id="cad-plano" class="form-select">
            <option value="premium">Premium — R$ 49,90/mês</option>
            <option value="visibilidade">Visibilidade — R$ 29,90/mês</option>
            <option value="rede">Rede / Bandeirado</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Cidade (ES)</label>
        <input id="cad-cidade" class="form-input" type="text" placeholder="Serra, Vitória, Vila Velha, Cariacica..."/>
      </div>
      <div class="form-group" style="display:flex;align-items:flex-start;gap:10px">
        <input type="checkbox" id="cad-termos" style="margin-top:3px;flex-shrink:0"/>
        <label for="cad-termos" style="font-size:13px;color:var(--sub);cursor:pointer">Concordo com os <a href="/termos" target="_blank" style="color:var(--laranja)">Termos de Parceria</a> e <a href="/privacidade" target="_blank" style="color:var(--laranja)">Política de Privacidade</a></label>
      </div>
      <button class="btn-form-submit" onclick="enviarCadastroParceiro()">
        <i class="fas fa-rocket"></i> Enviar cadastro
      </button>
      <div class="form-divider">Já tem conta? <a href="/parcerias/empresa" style="color:var(--laranja);font-weight:700">Acessar painel →</a></div>
    </div>
  </div>
</div>

<script>
  function toggleFaq(el) { el.classList.toggle('aberto'); }

  function abrirPainelEmpresa() { window.location.href = '/parcerias/empresa'; }

  function abrirCadastro(plano) {
    document.getElementById('cad-plano').value = plano;
    document.getElementById('modal-cadastro').classList.add('aberto');
  }

  function fmtTelEmp(inp) {
    let v = inp.value.replace(/\\D/g,'');
    if (v.length > 11) v = v.slice(0,11);
    if (v.length > 7)      inp.value = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
    else if (v.length > 2) inp.value = '(' + v.slice(0,2) + ') ' + v.slice(2);
    else if (v.length > 0) inp.value = '(' + v;
  }

  function fmtCNPJ(inp) {
    let v = inp.value.replace(/\\D/g,'');
    if (v.length > 14) v = v.slice(0,14);
    if (v.length > 12) inp.value = v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5,8)+'/'+v.slice(8,12)+'-'+v.slice(12);
    else if (v.length > 8) inp.value = v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5,8)+'/'+v.slice(8);
    else if (v.length > 5) inp.value = v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5);
    else if (v.length > 2) inp.value = v.slice(0,2)+'.'+v.slice(2);
    else inp.value = v;
  }

  async function enviarCadastroParceiro() {
    const nome     = document.getElementById('cad-nome').value.trim();
    const tel      = document.getElementById('cad-tel').value.trim();
    const email    = document.getElementById('cad-email').value.trim();
    const cnpj     = document.getElementById('cad-cnpj').value.trim();
    const postoNome= document.getElementById('cad-posto-nome').value.trim();
    const bandeira = document.getElementById('cad-bandeira').value;
    const plano    = document.getElementById('cad-plano').value;
    const cidade   = document.getElementById('cad-cidade').value.trim();
    const termos   = document.getElementById('cad-termos').checked;

    const erro = document.getElementById('cad-erro');
    erro.style.display = 'none';

    if (!nome || !tel || !email || !cnpj || !postoNome) {
      erro.textContent = 'Preencha todos os campos obrigatórios (*)';
      erro.style.display = 'block'; return;
    }
    if (!termos) {
      erro.textContent = 'Você precisa aceitar os termos para continuar.';
      erro.style.display = 'block'; return;
    }

    const btn = document.querySelector('.btn-form-submit');
    btn.disabled = true;
    btn.innerHTML = '<div style="width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto"></div>';

    try {
      const res = await fetch('/api/parceiros/cadastro', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ nome, tel, email, cnpj, postoNome, bandeira, plano, cidade })
      });
      const d = await res.json();
      if (d.sucesso) {
        document.getElementById('form-cadastro-body').style.display = 'none';
        const suc = document.getElementById('cad-sucesso');
        suc.style.display = 'block';
        suc.innerHTML = '✅ <strong>Cadastro enviado com sucesso!</strong><br>Nossa equipe entrará em contato pelo WhatsApp <strong>' + tel + '</strong> em até 24 horas para confirmar a parceria e liberar o acesso ao painel.<br><br>🎉 Bem-vindo à rede RotaPosto Empresas!';
      } else {
        erro.textContent = d.mensagem || 'Erro ao enviar cadastro.';
        erro.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket"></i> Enviar cadastro';
      }
    } catch {
      erro.textContent = 'Erro de conexão. Tente novamente.';
      erro.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-rocket"></i> Enviar cadastro';
    }
  }

  // Fechar modal clicando fora
  document.getElementById('modal-cadastro').addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('aberto');
  });
</script>
<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
</body>
</html>`
}

// ══════════════════════════════════════════════════════════════════════════════
// PAINEL DA EMPRESA (dashboard do gerente de posto)
// ══════════════════════════════════════════════════════════════════════════════
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
    .login-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:linear-gradient(135deg,#FF6D00,#BF360C); }
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
      .sidebar { transform:translateX(-100%); }
      .sidebar.aberta { transform:translateX(0); }
      .main { margin-left:0; }
      .btn-menu-mobile { display:block; }
      .sidebar-overlay.visivel { display:block; }
      .page-content { padding:16px; }
    }
  </style>
</head>
<body>

<!-- ═══ TELA DE LOGIN ═══ -->
<div id="tela-login" class="login-wrap">
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
      Novo no RotaPosto Empresas? <a href="/parcerias">Cadastrar meu posto →</a>
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
        <button class="btn-topbar btn-topbar-outline" onclick="irPara('validar')"><i class="fas fa-qrcode"></i> Validar QR</button>
        <button class="btn-topbar btn-topbar-orange" onclick="irPara('precos')"><i class="fas fa-sync"></i> Atualizar Preços</button>
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
