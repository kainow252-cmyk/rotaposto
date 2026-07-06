export function getLandingHTML(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="theme-color" content="#0B121E"/>
  <meta name="description" content="RotaPosto – O caminho mais inteligente para economizar combustível. Encontre os melhores preços, compare e trace rotas."/>
  <meta property="og:title" content="RotaPosto – Economize Sempre"/>
  <meta property="og:description" content="Encontre os melhores preços perto de você. Dados oficiais da ANP."/>
  <title>RotaPosto – Economize Sempre</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
/* ══════════════════════════════════════════════════
   TOKENS
══════════════════════════════════════════════════ */
:root{
  --bg:#0B121E;
  --bg2:#0D1929;
  --surface:#111827;
  --surface2:#1A2540;
  --card:#141C2F;
  --border:rgba(255,255,255,0.07);
  --border2:rgba(255,255,255,0.13);
  --orange:#FF6D00;
  --orange2:#FF8C00;
  --green:#22C55E;
  --green2:#16A34A;
  --text:#F1F5F9;
  --text2:#94A3B8;
  --text3:#475569;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html{scroll-behavior:smooth}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);overflow-x:hidden}
a{text-decoration:none;color:inherit}
button{font-family:'Inter',sans-serif;cursor:pointer}

/* ── NAV ── */
.nav{
  position:fixed;top:0;left:0;right:0;z-index:100;
  height:64px;display:flex;align-items:center;justify-content:space-between;
  padding:0 40px;
  background:rgba(11,18,30,0.9);
  backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
}
.nav-logo{display:flex;align-items:center;gap:10px}
.nav-logo-icon{
  width:40px;height:40px;border-radius:12px;
  background:linear-gradient(135deg,#FF6D00,#FF8C00);
  display:flex;align-items:center;justify-content:center;
  font-size:20px;
  box-shadow:0 4px 16px rgba(255,109,0,0.45);
}
.nav-logo-text{font-size:22px;font-weight:800;letter-spacing:-0.3px}
.nav-logo-text b{color:var(--orange)}
.nav-links{display:flex;align-items:center;gap:28px}
.nav-links a{font-size:13.5px;font-weight:600;color:var(--text2);transition:color .2s}
.nav-links a:hover{color:var(--text)}
.nav-actions{display:flex;gap:10px;align-items:center}
.btn-ghost{
  padding:9px 18px;border:1.5px solid var(--border2);border-radius:10px;
  background:transparent;font-size:13px;font-weight:700;color:var(--text2);
  transition:all .2s;
}
.btn-ghost:hover{border-color:var(--orange);color:var(--orange)}
.btn-primary{
  padding:10px 22px;
  background:linear-gradient(135deg,var(--orange),var(--orange2));
  border:none;border-radius:10px;
  font-size:13px;font-weight:800;color:#fff;
  box-shadow:0 4px 16px rgba(255,109,0,0.4);
  transition:transform .15s,box-shadow .15s;
}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(255,109,0,0.55)}
@media(max-width:768px){
  .nav-links{display:none}
  .btn-ghost{display:none}
  .nav{padding:0 20px}
}

/* ── TICKER ── */
.ticker{
  overflow:hidden;
  background:linear-gradient(90deg,var(--orange),var(--orange2));
  padding:10px 0;margin-top:64px;
}
.ticker-track{
  display:flex;gap:0;white-space:nowrap;
  animation:tick 25s linear infinite;width:max-content;
}
.ticker-item{
  display:inline-flex;align-items:center;gap:6px;
  font-size:12.5px;font-weight:700;color:#fff;
  padding:0 32px;
}
.ticker-sep{color:rgba(255,255,255,0.45)}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* ══════════════════════════════════════════════════
   HERO — 2 colunas (esquerda texto + direita phones)
══════════════════════════════════════════════════ */
.hero{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:0;
  align-items:center;
  max-width:1160px;
  margin:0 auto;
  padding:60px 40px 70px;
  position:relative;
  min-height:calc(100vh - 74px);
}
/* subtle map-contour background */
.hero::before{
  content:'';
  position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse 900px 600px at 75% 30%,rgba(255,109,0,0.055) 0%,transparent 65%),
    radial-gradient(ellipse 700px 500px at 15% 70%,rgba(26,60,120,0.1) 0%,transparent 65%);
}
/* grid dots */
.hero-grid{
  position:absolute;inset:0;pointer-events:none;overflow:hidden;
  background-image:
    radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px);
  background-size:36px 36px;
  mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black,transparent);
}
.hero-left{position:relative;z-index:1}
.hero-eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  padding:6px 14px;
  background:rgba(255,109,0,0.1);
  border:1px solid rgba(255,109,0,0.25);
  border-radius:100px;
  font-size:11px;font-weight:800;letter-spacing:1.2px;
  color:var(--orange);text-transform:uppercase;
  margin-bottom:22px;
}
.eyebrow-dot{
  width:7px;height:7px;border-radius:50%;
  background:var(--orange);
  animation:blink 2s ease-in-out infinite;
}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.hero-h1{
  font-size:clamp(34px,4vw,56px);
  font-weight:900;
  line-height:1.09;
  letter-spacing:-1.5px;
  margin-bottom:24px;
}
.hero-h1 .hl{color:var(--orange)}
/* 4 bullets */
.bullets{display:flex;flex-direction:column;gap:13px;margin-bottom:32px}
.bullet{display:flex;align-items:center;gap:12px;font-size:14.5px;font-weight:500;color:var(--text2)}
.bullet-icon{
  width:32px;height:32px;flex-shrink:0;border-radius:50%;
  border:1.5px solid rgba(255,109,0,0.4);
  background:rgba(255,109,0,0.08);
  display:flex;align-items:center;justify-content:center;
  font-size:14px;color:var(--orange);
}
/* CTA buttons */
.hero-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:36px}
.btn-cta-pri{
  padding:15px 30px;
  background:linear-gradient(135deg,var(--orange),var(--orange2));
  border:none;border-radius:12px;
  font-size:15px;font-weight:800;color:#fff;
  display:inline-flex;align-items:center;gap:8px;
  box-shadow:0 6px 24px rgba(255,109,0,0.42);
  transition:transform .15s,box-shadow .15s;
}
.btn-cta-pri:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(255,109,0,0.55)}
.btn-cta-sec{
  padding:15px 26px;
  background:rgba(255,255,255,0.06);
  border:1.5px solid var(--border2);
  border-radius:12px;
  font-size:15px;font-weight:700;color:var(--text);
  display:inline-flex;align-items:center;gap:8px;
  transition:background .2s,border-color .2s;
}
.btn-cta-sec:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,.25)}
/* Store badges */
.store-row{display:flex;gap:12px;flex-wrap:wrap}
.store-badge{
  display:inline-flex;align-items:center;gap:9px;
  padding:10px 16px;
  background:rgba(255,255,255,0.05);
  border:1px solid var(--border2);
  border-radius:11px;
  transition:border-color .2s,background .2s;
}
.store-badge:hover{border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.09)}
.store-badge-icon{font-size:24px;line-height:1}
.store-badge-text .sub{font-size:9.5px;color:var(--text2);display:block;font-weight:500}
.store-badge-text .name{font-size:14px;font-weight:800;color:var(--text);display:block}

/* ══════════════════════════════════════════════════
   HERO RIGHT — PHONES MOCKUPS
══════════════════════════════════════════════════ */
.hero-right{
  position:relative;z-index:1;
  display:flex;justify-content:center;align-items:flex-end;
  height:580px;
}
.phones-wrap{
  position:relative;
  width:420px;height:580px;
}
/* Glow */
.phones-wrap::before{
  content:'';
  position:absolute;
  bottom:-40px;left:50%;transform:translateX(-50%);
  width:300px;height:80px;
  background:radial-gradient(ellipse,rgba(255,109,0,0.25),transparent 70%);
  pointer-events:none;
}

/* ── BASE PHONE SHELL ── */
.phone{
  position:absolute;
  width:215px;
  border-radius:38px;
  border:2px solid rgba(255,255,255,0.15);
  overflow:hidden;
  background:var(--bg2);
  box-shadow:0 40px 80px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.07);
}

/* PHONE MAIN (mapa) — centro, frente */
.phone-main{
  left:50%;transform:translateX(-60%);
  bottom:0;z-index:3;
  width:225px;
  border-color:rgba(255,255,255,0.22);
  box-shadow:0 50px 100px rgba(0,0,0,0.75),0 0 0 1px rgba(255,255,255,0.06),inset 0 1px 0 rgba(255,255,255,0.1);
}
/* PHONE BACK (lista) — direita, atrás, rotacionado */
.phone-back{
  right:4%;
  bottom:24px;z-index:2;
  width:198px;
  transform:rotate(5deg);
  filter:brightness(0.65) blur(0.3px);
}

/* ── STATUS BAR ── */
.sbar{
  display:flex;justify-content:space-between;align-items:center;
  padding:8px 14px 2px;
  font-size:9.5px;font-weight:700;color:rgba(255,255,255,.85);
  background:var(--bg2);
}
/* ── TOP BAR APP ── */
.tbar{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 12px;
  background:var(--surface);
  border-bottom:1px solid var(--border);
}
.tbar-logo{font-size:13px;font-weight:800;display:flex;align-items:center;gap:4px}
.tbar-logo b{color:var(--orange)}
.tbar-icons{display:flex;gap:5px}
.tbar-icon{
  width:26px;height:26px;border-radius:7px;
  background:var(--surface2);
  display:flex;align-items:center;justify-content:center;
  font-size:11px;position:relative;
}
.notif-dot{
  position:absolute;top:-2px;right:-2px;
  width:7px;height:7px;border-radius:50%;
  background:var(--orange);border:1.5px solid var(--bg2);
}
/* ── SEARCH BAR ── */
.search-bar{
  margin:7px 10px;
  background:var(--surface2);
  border:1px solid var(--border);
  border-radius:9px;
  padding:6px 10px;
  display:flex;align-items:center;gap:6px;
  font-size:9px;color:var(--text2);
}
.search-bar i{font-size:8px}
/* ── MAP ── */
.phone-map{
  height:205px;
  background:linear-gradient(160deg,#0C1F35 0%,#08141F 100%);
  position:relative;overflow:hidden;
}
.map-grid{
  position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,0.045) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,0.045) 1px,transparent 1px);
  background-size:28px 28px;
}
/* roads */
.road-h{position:absolute;width:100%;height:1.5px;background:rgba(255,255,255,0.07)}
.road-v{position:absolute;height:100%;width:1.5px;background:rgba(255,255,255,0.07)}
/* neighborhood labels */
.nbhood{
  position:absolute;
  font-size:6.5px;font-weight:700;
  color:rgba(255,255,255,0.2);
  letter-spacing:0.6px;text-transform:uppercase;
}
/* price pin */
.pin{
  position:absolute;
  padding:4px 8px;
  border-radius:10px;
  font-size:9.5px;font-weight:800;
  color:#fff;white-space:nowrap;
  box-shadow:0 2px 8px rgba(0,0,0,.5);
}
.pin.g{background:var(--green)}
.pin.o{background:var(--orange)}
.pin.w{background:rgba(255,255,255,0.14);backdrop-filter:blur(6px);color:rgba(255,255,255,.9)}
/* user location dot */
.udot{
  position:absolute;
  width:13px;height:13px;border-radius:50%;
  background:#3B82F6;border:2.5px solid #fff;
  box-shadow:0 0 0 6px rgba(59,130,246,0.22);
}
/* ── FUEL TABS ── */
.fuel-tabs{
  display:flex;gap:5px;overflow-x:auto;
  padding:7px 10px;
  background:var(--surface);
  border-top:1px solid var(--border);
  scrollbar-width:none;
}
.fuel-tabs::-webkit-scrollbar{display:none}
.ftab{
  padding:4px 10px;border-radius:100px;
  font-size:9px;font-weight:700;
  white-space:nowrap;border:1px solid var(--border);
  color:var(--text2);flex-shrink:0;
}
.ftab.active{background:var(--orange);border-color:var(--orange);color:#fff}
/* ── STATION ROW ── */
.st-row{
  display:flex;align-items:center;gap:8px;
  padding:8px 10px;border-bottom:1px solid var(--border);
}
.st-logo{
  width:30px;height:30px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:900;color:#fff;flex-shrink:0;
}
.st-info{flex:1;min-width:0}
.st-name{font-size:10px;font-weight:700;color:var(--text)}
.st-meta{font-size:8px;color:var(--text2);margin-top:1px}
.st-stars{font-size:7px;color:#FBBF24;letter-spacing:1px}
.st-price-col{text-align:right}
.st-price{font-size:13px;font-weight:900;color:var(--text)}
.st-badge{
  display:inline-block;
  font-size:7px;font-weight:800;
  background:var(--green);color:#fff;
  padding:1.5px 5px;border-radius:4px;
  margin-top:2px;
}
/* ── BOTTOM NAV ── */
.bnav{
  display:flex;
  background:var(--bg2);
  border-top:1px solid var(--border);
  padding:7px 0 10px;
}
.bnav-item{
  flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;
  font-size:7.5px;font-weight:700;
  color:var(--text3);text-transform:uppercase;letter-spacing:.2px;
}
.bnav-item i{font-size:14px}
.bnav-item.active{color:var(--orange)}

/* floating chips */
.chip{
  position:absolute;
  background:rgba(11,18,30,0.92);
  border:1px solid var(--border2);
  border-radius:14px;padding:9px 13px;
  backdrop-filter:blur(12px);
  font-size:12px;font-weight:700;
  white-space:nowrap;z-index:10;
  box-shadow:0 8px 24px rgba(0,0,0,.45);
}
.chip-a{left:-22px;top:22%;animation:floatY 3.5s ease-in-out infinite}
.chip-b{right:-14px;top:56%;animation:floatY 3.5s ease-in-out infinite 1.75s}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

@media(max-width:1024px){
  .hero{grid-template-columns:1fr;padding:48px 24px 56px;text-align:center;min-height:auto}
  .bullets{align-items:center}
  .hero-ctas,.store-row{justify-content:center}
  .hero-right{margin-top:48px;height:500px}
  .phones-wrap{width:360px;height:500px}
  .phone-main{left:50%;transform:translateX(-56%)}
  .chip-a,.chip-b{display:none}
}
@media(max-width:500px){
  .hero-right{height:420px}
  .phones-wrap{width:300px;height:420px}
  .phone-main{width:190px}
  .phone-back{width:166px}
}

/* ══════════════════════════════════════════════════
   STATS BAND
══════════════════════════════════════════════════ */
.stats-band{
  background:var(--surface);
  border-top:1px solid var(--border);
  border-bottom:1px solid var(--border);
  padding:34px 24px;
}
.stats-inner{max-width:960px;margin:0 auto;display:flex;flex-wrap:wrap}
.stat{
  flex:1;min-width:150px;text-align:center;padding:14px 20px;
  position:relative;
}
.stat:not(:last-child)::after{
  content:'';position:absolute;right:0;top:18%;bottom:18%;
  width:1px;background:var(--border);
}
.stat-n{font-size:clamp(26px,3.5vw,40px);font-weight:900;color:var(--orange);line-height:1;margin-bottom:5px}
.stat-l{font-size:11.5px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px}
@media(max-width:640px){.stat::after{display:none}}

/* ══════════════════════════════════════════════════
   FEATURE CARDS (4 cards com telas reais)
══════════════════════════════════════════════════ */
.features{max-width:1160px;margin:0 auto;padding:80px 40px}
.sec-label{
  display:inline-flex;align-items:center;gap:6px;
  padding:5px 14px;
  background:rgba(255,109,0,0.1);
  border:1px solid rgba(255,109,0,0.2);
  border-radius:100px;
  font-size:11px;font-weight:800;letter-spacing:.8px;
  color:var(--orange);text-transform:uppercase;
  margin-bottom:18px;
}
.sec-h2{font-size:clamp(26px,3.8vw,44px);font-weight:900;letter-spacing:-1px;line-height:1.1;margin-bottom:10px}
.sec-sub{font-size:16px;font-weight:500;color:var(--text2);max-width:520px;line-height:1.7;margin-bottom:52px}
.feat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.fc{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:20px;overflow:hidden;
  transition:transform .25s,border-color .25s,box-shadow .25s;
}
.fc:hover{
  transform:translateY(-6px);
  border-color:rgba(255,109,0,0.28);
  box-shadow:0 20px 50px rgba(0,0,0,.4);
}
/* card screen area */
.fc-screen{
  background:var(--bg2);
  border-bottom:1px solid var(--border);
  overflow:hidden;
  font-size:0;/* collapse whitespace */
}
/* card body */
.fc-body{padding:18px 16px}
.fc-title{font-size:14px;font-weight:800;margin-bottom:5px}
.fc-desc{font-size:12.5px;color:var(--text2);line-height:1.65}
@media(max-width:1024px){.feat-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.feat-grid{grid-template-columns:1fr};.features{padding:56px 20px}}

/* ══════════════════════════════════════════════════
   HOW IT WORKS
══════════════════════════════════════════════════ */
.how{
  background:var(--surface);
  border-top:1px solid var(--border);
  border-bottom:1px solid var(--border);
  padding:80px 40px;
}
.how-inner{max-width:1100px;margin:0 auto}
.how-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;margin-top:52px}
.steps{display:flex;flex-direction:column;gap:0}
.step{display:flex;gap:18px;padding:22px 0;position:relative}
.step:not(:last-child)::before{
  content:'';position:absolute;left:17px;top:56px;bottom:0;
  width:2px;background:linear-gradient(rgba(255,109,0,.3),rgba(255,109,0,.05));
}
.step-n{
  width:36px;height:36px;flex-shrink:0;border-radius:10px;
  background:linear-gradient(135deg,var(--orange),var(--orange2));
  display:flex;align-items:center;justify-content:center;
  font-size:16px;font-weight:900;
  box-shadow:0 4px 14px rgba(255,109,0,.38);
}
.step-b h3{font-size:16px;font-weight:800;margin-bottom:4px}
.step-b p{font-size:13.5px;color:var(--text2);line-height:1.7}
/* mini phone */
.how-phone-wrap{display:flex;justify-content:center}
.how-phone{
  width:230px;border-radius:38px;
  border:2.5px solid var(--border2);
  overflow:hidden;
  box-shadow:0 40px 80px rgba(0,0,0,.6);
}
@media(max-width:768px){
  .how-grid{grid-template-columns:1fr}
  .how-phone-wrap{display:none}
  .how{padding:56px 20px}
}

/* ══════════════════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════════════════ */
.test-sec{max-width:1160px;margin:0 auto;padding:80px 40px}
.test-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.test-card{
  background:var(--card);border:1px solid var(--border);
  border-radius:18px;padding:24px;
  transition:border-color .2s,transform .2s;
}
.test-card:hover{border-color:var(--border2);transform:translateY(-3px)}
.test-stars{color:#FBBF24;font-size:14px;letter-spacing:2px;margin-bottom:12px}
.test-text{font-size:14px;font-weight:500;color:rgba(255,255,255,.78);line-height:1.75;font-style:italic;margin-bottom:18px}
.test-author{display:flex;align-items:center;gap:10px}
.test-av{
  width:40px;height:40px;border-radius:50%;
  background:var(--surface2);border:1.5px solid var(--border2);
  display:flex;align-items:center;justify-content:center;
  font-size:15px;font-weight:800;color:var(--orange);
}
.test-name{font-size:13px;font-weight:800}
.test-role{font-size:11px;color:var(--text2);margin-top:2px}
@media(max-width:768px){.test-grid{grid-template-columns:1fr};.test-sec{padding:56px 20px}}

/* ══════════════════════════════════════════════════
   PRICING
══════════════════════════════════════════════════ */
.pricing{
  background:var(--surface);
  border-top:1px solid var(--border);
  border-bottom:1px solid var(--border);
  padding:80px 40px;
}
.pricing-inner{max-width:1100px;margin:0 auto;text-align:center}
.plans{display:flex;flex-wrap:wrap;gap:20px;justify-content:center;margin-top:52px}
.plan{
  background:var(--bg2);border:1.5px solid var(--border);
  border-radius:22px;padding:30px 26px;width:285px;text-align:left;
  position:relative;transition:transform .25s,border-color .25s;
}
.plan:hover{transform:translateY(-5px)}
.plan.pop{
  border-color:var(--orange);
  background:rgba(255,109,0,0.05);
  box-shadow:0 8px 40px rgba(255,109,0,0.18);
}
.plan-best{
  position:absolute;top:-13px;left:50%;transform:translateX(-50%);
  background:linear-gradient(135deg,var(--orange),var(--orange2));
  padding:4px 16px;border-radius:100px;
  font-size:11px;font-weight:800;color:#fff;white-space:nowrap;
}
.plan-name{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text2);margin-bottom:8px}
.plan-price{display:flex;align-items:baseline;gap:2px;margin-bottom:6px}
.plan-cifra{font-size:16px;font-weight:700;color:var(--text2)}
.plan-val{font-size:52px;font-weight:900;line-height:1}
.plan-cents{font-size:24px;font-weight:700;align-self:flex-end;margin-bottom:7px}
.plan-per{font-size:13px;font-weight:600;color:var(--text2);align-self:flex-end;margin-bottom:5px}
.plan-desc{font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.6}
.plan-feats{list-style:none;display:flex;flex-direction:column;gap:9px;margin-bottom:24px}
.plan-feats li{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:rgba(255,255,255,.8)}
.fi-ok{color:var(--green)}
.fi-no{color:rgba(255,255,255,.2)}
.fi-no+span{color:rgba(255,255,255,.25)}
.btn-plan-pri{
  width:100%;padding:13px;border:none;border-radius:11px;
  background:linear-gradient(135deg,var(--orange),var(--orange2));
  font-size:14px;font-weight:800;color:#fff;
  display:flex;align-items:center;justify-content:center;gap:6px;
  box-shadow:0 4px 18px rgba(255,109,0,.38);
  transition:transform .15s,box-shadow .15s;
}
.btn-plan-pri:hover{transform:translateY(-2px);box-shadow:0 8px 26px rgba(255,109,0,.5)}
.btn-plan-sec{
  width:100%;padding:13px;border:1.5px solid var(--border2);border-radius:11px;
  background:rgba(255,255,255,.05);font-size:14px;font-weight:800;color:var(--text);
  display:flex;align-items:center;justify-content:center;gap:6px;
  transition:background .2s;
}
.btn-plan-sec:hover{background:rgba(255,255,255,.1)}
.plan-guar{
  text-align:center;margin-top:12px;
  font-size:11.5px;color:var(--text2);
  display:flex;align-items:center;justify-content:center;gap:5px;
}
@media(max-width:640px){.pricing{padding:56px 20px}}

/* ══════════════════════════════════════════════════
   FAQ
══════════════════════════════════════════════════ */
.faq-sec{max-width:720px;margin:0 auto;padding:80px 40px;text-align:center}
.faq-list{display:flex;flex-direction:column;gap:10px;margin-top:40px;text-align:left}
.faq-item{background:var(--card);border:1px solid var(--border);border-radius:13px;overflow:hidden}
.faq-q{
  width:100%;padding:17px 18px;background:none;border:none;text-align:left;
  cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;
  font-family:'Inter',sans-serif;font-size:14px;font-weight:700;color:var(--text);
}
.faq-q i{color:var(--orange);transition:transform .25s;flex-shrink:0;font-size:12px}
.faq-q.open i{transform:rotate(45deg)}
.faq-a{
  padding:0 18px;max-height:0;overflow:hidden;
  font-size:13.5px;color:var(--text2);line-height:1.75;
  transition:max-height .35s ease,padding .35s ease;
}
.faq-a.open{max-height:300px;padding:0 18px 16px}
@media(max-width:640px){.faq-sec{padding:56px 20px}}

/* ══════════════════════════════════════════════════
   FINAL CTA
══════════════════════════════════════════════════ */
.cta-final{
  padding:88px 40px;text-align:center;position:relative;overflow:hidden;
}
.cta-final::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse 700px 400px at 50% 50%,rgba(255,109,0,0.07),transparent 70%);
}
.cta-final h2{font-size:clamp(28px,4vw,50px);font-weight:900;letter-spacing:-1.5px;margin-bottom:14px;position:relative}
.cta-final p{font-size:17px;color:var(--text2);max-width:460px;margin:0 auto 32px;line-height:1.75;position:relative}
.cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;position:relative}
@media(max-width:640px){.cta-final{padding:64px 20px}}

/* ══════════════════════════════════════════════════
   TRUST BAR
══════════════════════════════════════════════════ */
.trust{
  background:var(--surface);
  border-top:1px solid var(--border);
  padding:30px 24px;
}
.trust-inner{max-width:960px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:center}
.trust-item{
  flex:1;min-width:180px;
  display:flex;align-items:center;gap:12px;
  padding:12px 20px;position:relative;
}
.trust-item:not(:last-child)::after{
  content:'';position:absolute;right:0;top:16%;bottom:16%;
  width:1px;background:var(--border);
}
.trust-icon{
  width:40px;height:40px;flex-shrink:0;border-radius:11px;
  background:rgba(255,109,0,0.09);
  border:1px solid rgba(255,109,0,0.16);
  display:flex;align-items:center;justify-content:center;
  font-size:16px;color:var(--orange);
}
.trust-title{font-size:13px;font-weight:800;color:var(--text)}
.trust-sub{font-size:11px;color:var(--text2);margin-top:2px}
@media(max-width:768px){
  .trust-item::after{display:none}
  .trust-inner{gap:8px}
}

/* ══════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════ */
.footer{
  background:rgba(0,0,0,.35);
  border-top:1px solid var(--border);
  padding:36px 40px 28px;text-align:center;
}
.footer-logo{
  font-size:21px;font-weight:900;
  display:flex;align-items:center;gap:8px;justify-content:center;
  margin-bottom:14px;
}
.footer-logo-icon{
  width:34px;height:34px;border-radius:9px;
  background:linear-gradient(135deg,var(--orange),var(--orange2));
  display:flex;align-items:center;justify-content:center;font-size:16px;
}
.footer-logo b{color:var(--orange)}
.footer-links{display:flex;flex-wrap:wrap;gap:18px;justify-content:center;margin:14px 0}
.footer-links a{font-size:13px;font-weight:600;color:var(--text2);transition:color .2s}
.footer-links a:hover{color:var(--orange)}
.footer-copy{font-size:12px;color:var(--text3)}
@media(max-width:640px){.footer{padding:28px 20px}}

/* ══════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════ */
.modal-bg{
  position:fixed;inset:0;z-index:9000;
  background:rgba(0,0,0,.78);
  display:none;align-items:center;justify-content:center;padding:20px;
}
.modal-bg.open{display:flex}
.modal-box{
  background:#0C1829;border:1px solid var(--border2);
  border-radius:24px;padding:30px;
  width:100%;max-width:420px;position:relative;
  animation:mIn .28s ease;
}
@keyframes mIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
.modal-close{
  position:absolute;top:14px;right:14px;
  width:28px;height:28px;border-radius:50%;
  background:rgba(255,255,255,.06);border:none;
  color:var(--text2);font-size:13px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:background .2s;
}
.modal-close:hover{background:rgba(255,255,255,.13)}
.modal-hd{text-align:center;margin-bottom:22px}
.modal-hd h3{font-size:19px;font-weight:900;margin-bottom:4px}
.modal-price{font-size:40px;font-weight:900;color:var(--orange)}
.modal-price sup{font-size:17px;vertical-align:super}
.modal-price sub{font-size:13px;vertical-align:bottom;color:var(--text2);font-weight:600}
.f-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--text2);margin-bottom:5px;display:block}
.f-input{
  width:100%;padding:11px 13px;margin-bottom:12px;
  background:rgba(255,255,255,.05);
  border:1.5px solid var(--border);border-radius:10px;
  color:var(--text);font-family:'Inter',sans-serif;font-size:13.5px;outline:none;
  transition:border-color .2s;
}
.f-input:focus{border-color:var(--orange)}
.f-input::placeholder{color:var(--text3)}
.f-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sec-title-sm{
  font-size:10px;font-weight:800;text-transform:uppercase;
  letter-spacing:.8px;color:var(--text2);margin:14px 0 9px;
}
.btn-pay{
  width:100%;padding:14px;margin-top:6px;
  background:linear-gradient(135deg,var(--orange),var(--orange2));
  border:none;border-radius:11px;
  color:#fff;font-family:'Inter',sans-serif;font-size:14.5px;font-weight:800;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
  box-shadow:0 4px 20px rgba(255,109,0,.38);transition:transform .15s,box-shadow .15s;
}
.btn-pay:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(255,109,0,.5)}
.btn-pay:disabled{opacity:.6;cursor:not-allowed;transform:none}
.pay-sec{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:9px;font-size:11px;color:var(--text3)}
.pay-sec i{color:var(--green)}
.pay-result{display:none;text-align:center;padding:18px 0}
.pay-result.ok{display:block}
.pay-result i{font-size:50px;color:var(--green);margin-bottom:12px;display:block}
.pay-result h3{font-size:19px;font-weight:800;margin-bottom:8px}
.pay-result p{font-size:13.5px;color:var(--text2);line-height:1.6}

/* ── SCROLL REVEAL ── */
.rv{opacity:0;transform:translateY(22px);transition:opacity .6s ease,transform .6s ease}
.rv.in{opacity:1;transform:translateY(0)}
  </style>
  <!-- Mercado Pago JS SDK v2 -->
  <script src="https://sdk.mercadopago.com/js/v2"></script>
</head>
<body>

<!-- ━━━ NAV ━━━ -->
<nav class="nav">
  <div class="nav-logo">
    <div class="nav-logo-icon">⛽</div>
    <div class="nav-logo-text">Rota<b>Posto</b></div>
  </div>
  <div class="nav-links">
    <a href="#funcionalidades">Funcionalidades</a>
    <a href="#como-funciona">Como Funciona</a>
    <a href="#pricing">Planos</a>
    <a href="#faq">FAQ</a>
  </div>
  <div class="nav-actions">
    <button class="btn-ghost" onclick="ir('entrar')">Entrar</button>
    <button class="btn-primary" onclick="ir('comecar')">Cadastre-se agora</button>
  </div>
</nav>

<!-- ━━━ TICKER ━━━ -->
<div class="ticker">
  <div class="ticker-track">
    <span class="ticker-item">⛽ Gasolina a partir de R$&nbsp;5,67 <span class="ticker-sep">•</span></span>
    <span class="ticker-item">🌿 Etanol a partir de R$&nbsp;3,89 <span class="ticker-sep">•</span></span>
    <span class="ticker-item">🚛 Diesel S10 a partir de R$&nbsp;6,19 <span class="ticker-sep">•</span></span>
    <span class="ticker-item">💨 GNV a partir de R$&nbsp;4,49 <span class="ticker-sep">•</span></span>
    <span class="ticker-item">💰 Economize até R$&nbsp;0,80/L <span class="ticker-sep">•</span></span>
    <span class="ticker-item">📍 46.071 postos mapeados no Brasil <span class="ticker-sep">•</span></span>
    <span class="ticker-item">📊 Dados ANP — Semana 21–27/Jun/2026 <span class="ticker-sep">•</span></span>
    <span class="ticker-item">⛽ Gasolina a partir de R$&nbsp;5,67 <span class="ticker-sep">•</span></span>
    <span class="ticker-item">🌿 Etanol a partir de R$&nbsp;3,89 <span class="ticker-sep">•</span></span>
    <span class="ticker-item">🚛 Diesel S10 a partir de R$&nbsp;6,19 <span class="ticker-sep">•</span></span>
    <span class="ticker-item">💨 GNV a partir de R$&nbsp;4,49 <span class="ticker-sep">•</span></span>
    <span class="ticker-item">💰 Economize até R$&nbsp;0,80/L <span class="ticker-sep">•</span></span>
    <span class="ticker-item">📍 46.071 postos mapeados no Brasil <span class="ticker-sep">•</span></span>
    <span class="ticker-item">📊 Dados ANP — Semana 21–27/Jun/2026 <span class="ticker-sep">•</span></span>
  </div>
</div>

<!-- ━━━ HERO ━━━ -->
<section class="hero">
  <div class="hero-grid"></div>

  <!-- LEFT -->
  <div class="hero-left">
    <div class="hero-eyebrow">
      <div class="eyebrow-dot"></div>
      ECONOMIZE SEMPRE
    </div>
    <h1 class="hero-h1">
      O caminho<br/>
      <span class="hl">mais inteligente</span><br/>
      para economizar<br/>
      combustível
    </h1>
    <div class="bullets">
      <div class="bullet">
        <div class="bullet-icon"><i class="fas fa-map-marker-alt"></i></div>
        Encontre os melhores preços perto de você
      </div>
      <div class="bullet">
        <div class="bullet-icon"><i class="fas fa-exchange-alt"></i></div>
        Compare e economize em cada abastecimento
      </div>
      <div class="bullet">
        <div class="bullet-icon"><i class="fas fa-route"></i></div>
        Rota rápida e precisa até o posto escolhido
      </div>
      <div class="bullet">
        <div class="bullet-icon"><i class="fas fa-chart-bar"></i></div>
        Histórico de gastos e relatórios completos
      </div>
    </div>
    <div class="hero-ctas">
      <button class="btn-cta-pri" onclick="ir('comecar')">
        <i class="fas fa-rocket"></i> Cadastre-se agora
      </button>
      <button class="btn-cta-sec" onclick="ir('entrar')">
        <i class="fas fa-user"></i> Já tenho uma conta
      </button>
    </div>
    <div class="store-row">
      <a class="store-badge" href="#" aria-label="Google Play">
        <span class="store-badge-icon">▶️</span>
        <span class="store-badge-text">
          <span class="sub">DISPONÍVEL NO</span>
          <span class="name">Google Play</span>
        </span>
      </a>
      <a class="store-badge" href="#" aria-label="App Store">
        <span class="store-badge-icon">🍎</span>
        <span class="store-badge-text">
          <span class="sub">Disponível na</span>
          <span class="name">App Store</span>
        </span>
      </a>
    </div>
  </div>

  <!-- RIGHT — PHONES -->
  <div class="hero-right">
    <div class="phones-wrap">

      <!-- BACK PHONE: lista de postos -->
      <div class="phone phone-back">
        <div class="sbar"><span>9:41</span><span style="font-size:8px">▼ ◀ ██</span></div>
        <div class="tbar">
          <div class="tbar-logo">Rota<b>Posto</b></div>
          <div class="tbar-icons">
            <div class="tbar-icon">🔔</div>
          </div>
        </div>
        <!-- Fuel filter pills -->
        <div style="display:flex;gap:5px;padding:6px 9px;background:var(--surface);border-bottom:1px solid var(--border);font-size:0">
          <span style="display:inline-block;padding:3px 9px;background:var(--orange);border-radius:100px;font-size:9px;font-weight:700;color:#fff">Gasolina</span>
          <span style="display:inline-block;padding:3px 9px;border:1px solid var(--border);border-radius:100px;font-size:9px;font-weight:700;color:var(--text2)">Etanol</span>
          <span style="display:inline-block;padding:3px 9px;border:1px solid var(--border);border-radius:100px;font-size:9px;font-weight:700;color:var(--text2)">Diesel</span>
          <span style="display:inline-block;padding:3px 9px;border:1px solid var(--border);border-radius:100px;font-size:9px;font-weight:700;color:var(--text2)">GNV</span>
        </div>
        <!-- Station list -->
        <div class="st-row">
          <div class="st-logo" style="background:linear-gradient(135deg,#F7C948,#E59400)">S</div>
          <div class="st-info">
            <div class="st-name">Posto Shell</div>
            <div class="st-meta">1,2 km · 3 min</div>
            <div class="st-stars">★★★★★ <span style="color:var(--text2);font-size:7px">4,6</span></div>
          </div>
          <div class="st-price-col">
            <div class="st-price">R$ 5,67</div>
            <div class="st-badge">MELHOR PREÇO</div>
          </div>
        </div>
        <div class="st-row">
          <div class="st-logo" style="background:linear-gradient(135deg,#F7941D,#C85A00)">i</div>
          <div class="st-info">
            <div class="st-name">Posto Ipiranga</div>
            <div class="st-meta">1,4 km · 4 min</div>
            <div class="st-stars">★★★★☆ <span style="color:var(--text2);font-size:7px">4,4</span></div>
          </div>
          <div class="st-price-col">
            <div class="st-price" style="font-size:11px;color:var(--text2)">R$ 5,74</div>
          </div>
        </div>
        <div class="st-row">
          <div class="st-logo" style="background:linear-gradient(135deg,#1B6620,#2E8B27)">BR</div>
          <div class="st-info">
            <div class="st-name">Posto BR</div>
            <div class="st-meta">1,6 km · 5 min</div>
            <div class="st-stars">★★★★☆ <span style="color:var(--text2);font-size:7px">4,2</span></div>
          </div>
          <div class="st-price-col">
            <div class="st-price" style="font-size:11px;color:var(--text2)">R$ 5,79</div>
          </div>
        </div>
        <div class="st-row">
          <div class="st-logo" style="background:linear-gradient(135deg,#0D47A1,#1565C0)">ALE</div>
          <div class="st-info">
            <div class="st-name">Posto Ale</div>
            <div class="st-meta">2,1 km · 6 min</div>
            <div class="st-stars">★★★★☆ <span style="color:var(--text2);font-size:7px">4,1</span></div>
          </div>
          <div class="st-price-col">
            <div class="st-price" style="font-size:11px;color:var(--text2)">R$ 5,89</div>
          </div>
        </div>
        <div class="bnav">
          <div class="bnav-item"><i class="fas fa-trophy"></i>Melhor</div>
          <div class="bnav-item active"><i class="fas fa-list"></i>Lista</div>
          <div class="bnav-item"><i class="fas fa-map"></i>Mapa</div>
          <div class="bnav-item"><i class="fas fa-route"></i>Planejar</div>
        </div>
      </div>

      <!-- MAIN PHONE: mapa com preços -->
      <div class="phone phone-main">
        <div class="sbar"><span>9:41</span><span style="font-size:8px">▼ ◀ ██</span></div>
        <div class="tbar">
          <div class="tbar-logo">Rota<b>Posto</b></div>
          <div class="tbar-icons">
            <div class="tbar-icon">☰</div>
            <div class="tbar-icon" style="position:relative">
              🔔<span class="notif-dot"></span>
            </div>
          </div>
        </div>
        <!-- Search -->
        <div class="search-bar">
          <i class="fas fa-search"></i>
          <span>Buscar cidade ou endereço</span>
          <i class="fas fa-sliders-h" style="margin-left:auto;font-size:8px"></i>
        </div>
        <!-- Map -->
        <div class="phone-map">
          <div class="map-grid"></div>
          <!-- Roads -->
          <div class="road-h" style="top:30%;transform:rotate(-7deg)"></div>
          <div class="road-h" style="top:62%;transform:rotate(4deg)"></div>
          <div class="road-v" style="left:38%"></div>
          <div class="road-v" style="left:68%"></div>
          <!-- Neighborhoods -->
          <div class="nbhood" style="top:8%;left:5%">VILA MADALENA</div>
          <div class="nbhood" style="top:8%;right:6%">JARDINS</div>
          <div class="nbhood" style="top:38%;left:5%">PINHEIROS</div>
          <div class="nbhood" style="top:50%;right:5%">ITAIM BIBI</div>
          <div class="nbhood" style="bottom:8%;left:30%">MOEMA</div>
          <!-- Price pins -->
          <div class="pin g" style="top:14%;left:7%">R$ 5,67</div>
          <div class="pin o" style="top:10%;right:7%">R$ 5,79</div>
          <div class="pin w" style="top:38%;left:4%">R$ 5,89</div>
          <div class="pin o" style="top:54%;right:6%">R$ 5,74</div>
          <div class="pin g" style="bottom:16%;left:15%">R$ 5,63</div>
          <!-- User dot -->
          <div class="udot" style="top:44%;left:42%"></div>
        </div>
        <!-- Fuel tabs -->
        <div class="fuel-tabs">
          <div class="ftab active">Gasolina</div>
          <div class="ftab">Etanol</div>
          <div class="ftab">Diesel</div>
          <div class="ftab">GNV</div>
        </div>
        <!-- Bottom nav -->
        <div class="bnav">
          <div class="bnav-item active"><i class="fas fa-star"></i>Melhor</div>
          <div class="bnav-item"><i class="fas fa-list"></i>Lista</div>
          <div class="bnav-item"><i class="fas fa-map"></i>Mapa</div>
          <div class="bnav-item"><i class="fas fa-route"></i>Planejar</div>
          <div class="bnav-item"><i class="fas fa-user"></i>Perfil</div>
        </div>
      </div>

      <!-- Floating chips -->
      <div class="chip chip-a">
        💰 Economia: <strong style="color:#22C55E">R$&nbsp;0,80/L</strong>
      </div>
      <div class="chip chip-b">
        📍 <strong>1,2&nbsp;km</strong> · 3 min
      </div>
    </div>
  </div>
</section>

<!-- ━━━ STATS ━━━ -->
<div class="stats-band">
  <div class="stats-inner">
    <div class="stat rv"><div class="stat-n">46K+</div><div class="stat-l">Postos no Brasil</div></div>
    <div class="stat rv"><div class="stat-n">R$0,80</div><div class="stat-l">Economia/Litro</div></div>
    <div class="stat rv"><div class="stat-n">7</div><div class="stat-l">Tipos de Combustível</div></div>
    <div class="stat rv"><div class="stat-n">100%</div><div class="stat-l">Dados Oficiais ANP</div></div>
  </div>
</div>

<!-- ━━━ FEATURES ━━━ -->
<section class="features" id="funcionalidades">
  <div class="sec-label rv"><i class="fas fa-star"></i>&nbsp;Funcionalidades</div>
  <h2 class="sec-h2 rv">Tudo o que você precisa<br/>para economizar sempre</h2>
  <p class="sec-sub rv">Do preço mais baixo à rota inteligente — tudo num só lugar.</p>

  <div class="feat-grid">

    <!-- Card 1: Melhores preços -->
    <div class="fc rv">
      <div class="fc-screen" style="font-size:initial">
        <!-- Mini tela: Detalhes do posto -->
        <div style="background:var(--surface);padding:8px 11px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px">
          <span style="font-size:8.5px;color:var(--text2)">← Detalhes do posto</span>
        </div>
        <!-- Posto header -->
        <div style="padding:9px 11px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
            <div style="width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#F7C948,#E59400);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff">S</div>
            <div>
              <div style="font-size:11px;font-weight:800;color:var(--text)">Posto Shell</div>
              <div style="font-size:8.5px;color:var(--text2)">Av. Rebouças, 1234 · Pinheiros, SP</div>
              <div style="font-size:7.5px;color:#FBBF24">★★★★★ <span style="color:var(--text2)">4,6 (128 avaliações)</span></div>
            </div>
          </div>
          <!-- Price highlight -->
          <div style="background:rgba(255,109,0,0.1);border:1px solid rgba(255,109,0,0.2);border-radius:9px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div>
              <div style="font-size:19px;font-weight:900;color:var(--orange);line-height:1">R$ 5,67 <span style="font-size:9px;color:var(--text2);">/L</span></div>
              <div style="font-size:8px;color:var(--text2);margin-top:2px">Gasolina Comum</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:8px;color:var(--text2)">📍 1,2 km</div>
              <div style="font-size:8px;color:var(--text2)">⏱ 3 min</div>
              <div style="font-size:8px;color:var(--green);font-weight:700">aberto agora</div>
            </div>
          </div>
        </div>
        <!-- Preços dos combustíveis -->
        <div style="padding:7px 11px">
          <div style="font-size:8.5px;font-weight:700;color:var(--text2);margin-bottom:5px">Preços dos combustíveis</div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:9px;color:var(--text2)">Gasolina Comum</span>
            <span style="font-size:9px;font-weight:800;color:var(--text)">R$ 5,67</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:9px;color:var(--text2)">Etanol</span>
            <span style="font-size:9px;font-weight:800;color:var(--text)">R$ 3,89</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:9px;color:var(--text2)">Diesel S10</span>
            <span style="font-size:9px;font-weight:800;color:var(--text)">R$ 6,19</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0">
            <span style="font-size:9px;color:var(--text2)">GNV</span>
            <span style="font-size:9px;font-weight:800;color:var(--text)">R$ 4,49</span>
          </div>
        </div>
        <!-- Botão ir ao posto -->
        <div style="padding:7px 10px">
          <div style="background:var(--orange);border-radius:8px;padding:7px;text-align:center;font-size:9.5px;font-weight:800;color:#fff">
            <i class="fas fa-directions" style="font-size:8px"></i> Ir até o posto
          </div>
        </div>
      </div>
      <div class="fc-body">
        <div class="fc-title">Melhores preços</div>
        <div class="fc-desc">Encontre o menor preço perto de você com dados reais atualizados semanalmente pela ANP.</div>
      </div>
    </div>

    <!-- Card 2: Mapa inteligente -->
    <div class="fc rv">
      <div class="fc-screen" style="font-size:initial">
        <!-- search -->
        <div style="background:var(--surface);padding:7px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px">
          <div style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:5px 9px;display:flex;align-items:center;gap:5px">
            <i class="fas fa-search" style="font-size:8px;color:var(--text2)"></i>
            <span style="font-size:8.5px;color:var(--text2)">Buscar nesta área</span>
          </div>
          <div style="width:25px;height:25px;background:var(--surface2);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0">🎯</div>
        </div>
        <!-- Map -->
        <div style="height:145px;background:linear-gradient(160deg,#0C1F35,#08141F);position:relative;overflow:hidden">
          <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.045) 1px,transparent 1px);background-size:24px 24px"></div>
          <div style="position:absolute;width:100%;height:1.5px;background:rgba(255,255,255,0.07);top:35%;transform:rotate(-6deg)"></div>
          <div style="position:absolute;height:100%;width:1.5px;background:rgba(255,255,255,0.07);top:0;left:42%"></div>
          <div style="position:absolute;top:5%;left:3%;font-size:6.5px;font-weight:700;color:rgba(255,255,255,0.2);letter-spacing:.6px">PINHEIROS</div>
          <div style="position:absolute;bottom:8%;right:5%;font-size:6.5px;font-weight:700;color:rgba(255,255,255,0.2);letter-spacing:.6px">JARDINS</div>
          <div style="position:absolute;top:12%;left:6%;padding:4px 8px;background:var(--green);border-radius:9px;font-size:9.5px;font-weight:800;color:#fff">R$ 5,67</div>
          <div style="position:absolute;top:9%;right:8%;padding:4px 8px;background:var(--orange);border-radius:9px;font-size:9.5px;font-weight:800;color:#fff">R$ 5,79</div>
          <div style="position:absolute;top:50%;left:4%;padding:4px 8px;background:rgba(255,255,255,0.15);border-radius:9px;font-size:9.5px;font-weight:800;color:#fff;backdrop-filter:blur(4px)">R$ 5,89</div>
          <div style="position:absolute;bottom:22%;right:7%;padding:4px 8px;background:var(--orange);border-radius:9px;font-size:9.5px;font-weight:800;color:#fff">R$ 5,74</div>
          <div style="position:absolute;top:43%;left:40%;width:11px;height:11px;border-radius:50%;background:#3B82F6;border:2px solid #fff;box-shadow:0 0 0 5px rgba(59,130,246,0.22)"></div>
        </div>
        <!-- Melhor posto bar -->
        <div style="margin:8px 9px 0;background:rgba(255,109,0,0.09);border:1px solid rgba(255,109,0,0.18);border-radius:9px;padding:7px 9px;display:flex;align-items:center;gap:7px">
          <div style="width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#F7C948,#E59400);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;flex-shrink:0">S</div>
          <div style="flex:1">
            <div style="font-size:8px;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;font-weight:700">Melhor posto próximo</div>
            <div style="font-size:10px;font-weight:800;color:var(--text)">Posto Shell · R$ 5,67/L</div>
            <div style="font-size:8px;color:var(--text2)">1,2 km · 3 min</div>
          </div>
          <div style="font-size:12px;color:var(--orange)">›</div>
        </div>
        <!-- Botão iniciar rota -->
        <div style="margin:7px 9px 9px">
          <div style="background:var(--orange);border-radius:8px;padding:7px;text-align:center;font-size:9.5px;font-weight:800;color:#fff">
            <i class="fas fa-play" style="font-size:8px"></i> Iniciar rota
          </div>
        </div>
      </div>
      <div class="fc-body">
        <div class="fc-title">Mapa inteligente</div>
        <div class="fc-desc">Visualize postos no mapa com preços nos pins e escolha o melhor com um toque.</div>
      </div>
    </div>

    <!-- Card 3: Planeje sua rota -->
    <div class="fc rv">
      <div class="fc-screen" style="font-size:initial">
        <!-- header -->
        <div style="background:var(--surface);padding:8px 11px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px">
          <i class="fas fa-chevron-left" style="font-size:9px;color:var(--text2)"></i>
          <span style="font-size:10px;font-weight:800;color:var(--text)">Planejar rota</span>
        </div>
        <!-- origem / destino -->
        <div style="padding:8px 10px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:5px">
          <div style="display:flex;align-items:center;gap:7px;background:var(--surface2);border-radius:8px;padding:6px 9px">
            <div style="width:9px;height:9px;border-radius:50%;background:#3B82F6;border:1.5px solid #fff;flex-shrink:0"></div>
            <span style="font-size:9px;color:var(--text2)">Minha localização</span>
          </div>
          <div style="display:flex;align-items:center;gap:7px;background:var(--surface2);border-radius:8px;padding:6px 9px">
            <div style="width:9px;height:9px;border-radius:50%;background:var(--orange);flex-shrink:0"></div>
            <span style="font-size:9px;color:var(--text)">Posto Shell · Av. Rebouças, 1234</span>
          </div>
        </div>
        <!-- Route map -->
        <div style="height:105px;background:linear-gradient(160deg,#0C1F35,#08141F);position:relative;overflow:hidden">
          <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px);background-size:20px 20px"></div>
          <!-- route line -->
          <div style="position:absolute;width:2.5px;height:62px;background:linear-gradient(180deg,#3B82F6,var(--orange));left:50%;top:14%;transform:translateX(-50%);border-radius:2px"></div>
          <div style="position:absolute;width:10px;height:10px;border-radius:50%;background:#3B82F6;border:2px solid #fff;left:50%;top:13%;transform:translateX(-50%)"></div>
          <div style="position:absolute;left:50%;bottom:16%;transform:translateX(-50%);font-size:14px">📍</div>
        </div>
        <!-- stats -->
        <div style="display:flex;background:var(--surface);border-top:1px solid var(--border)">
          <div style="flex:1;text-align:center;padding:8px;border-right:1px solid var(--border)">
            <div style="font-size:16px;font-weight:900;color:var(--text)">1,2 km</div>
            <div style="font-size:7.5px;color:var(--text2);font-weight:600">DISTÂNCIA</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px">
            <div style="font-size:16px;font-weight:900;color:var(--text)">3 min</div>
            <div style="font-size:7.5px;color:var(--text2);font-weight:600">TEMPO</div>
          </div>
        </div>
        <!-- Melhor rota bar -->
        <div style="padding:7px 9px;border-top:1px solid var(--border)">
          <div style="font-size:8px;color:var(--text2);margin-bottom:3px">Melhor rota</div>
          <div style="font-size:9px;color:var(--text2)">via Av. Rebouças</div>
        </div>
        <!-- CTA -->
        <div style="margin:0 9px 9px">
          <div style="background:var(--orange);border-radius:8px;padding:7px;text-align:center;font-size:9.5px;font-weight:800;color:#fff">
            <i class="fas fa-navigation" style="font-size:8px"></i> Iniciar navegação
          </div>
        </div>
      </div>
      <div class="fc-body">
        <div class="fc-title">Planeje sua rota</div>
        <div class="fc-desc">Rota rápida e segura até o posto escolhido, integrada ao seu navegador preferido.</div>
      </div>
    </div>

    <!-- Card 4: Histórico e relatórios -->
    <div class="fc rv">
      <div class="fc-screen" style="font-size:initial">
        <!-- header -->
        <div style="background:var(--surface);padding:8px 11px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)">
          <span style="font-size:10px;font-weight:800;color:var(--text)">Relatórios</span>
          <div style="display:flex;gap:3px">
            <span style="padding:2px 7px;border-radius:6px;font-size:8px;font-weight:700;color:var(--text2);border:1px solid var(--border)">Semana</span>
            <span style="padding:2px 7px;border-radius:6px;font-size:8px;font-weight:700;color:#fff;background:var(--orange)">Mês</span>
            <span style="padding:2px 7px;border-radius:6px;font-size:8px;font-weight:700;color:var(--text2);border:1px solid var(--border)">Ano</span>
          </div>
        </div>
        <!-- period -->
        <div style="padding:5px 11px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:8.5px;font-weight:700;color:var(--text2)">Janeiro 2024</span>
          <span style="font-size:10px;color:var(--orange)">›</span>
        </div>
        <!-- total saved -->
        <div style="text-align:center;padding:10px 11px 7px;border-bottom:1px solid var(--border)">
          <div style="font-size:8.5px;color:var(--text2);font-weight:600">Total economizado</div>
          <div style="font-size:26px;font-weight:900;color:var(--green);line-height:1.1">R$ 289,60</div>
        </div>
        <!-- stats grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border)">
          <div style="background:var(--bg2);padding:7px 10px;text-align:center">
            <div style="font-size:14px;font-weight:900;color:var(--text)">8</div>
            <div style="font-size:7.5px;color:var(--text2)">Abastecimentos</div>
          </div>
          <div style="background:var(--bg2);padding:7px 10px;text-align:center">
            <div style="font-size:12px;font-weight:900;color:var(--text)">R$ 412,30</div>
            <div style="font-size:7.5px;color:var(--text2)">Gasto total</div>
          </div>
          <div style="background:var(--bg2);padding:7px 10px;text-align:center">
            <div style="font-size:12px;font-weight:900;color:var(--green)">R$ 0,36</div>
            <div style="font-size:7.5px;color:var(--text2)">Economia por litro</div>
          </div>
          <div style="background:var(--bg2);padding:7px 10px;text-align:center">
            <div style="font-size:11px;font-weight:900;color:var(--orange)">Posto Shell</div>
            <div style="font-size:7.5px;color:var(--text2)">Posto favorito</div>
          </div>
        </div>
        <!-- postos mais abastecidos -->
        <div style="padding:7px 10px;border-top:1px solid var(--border)">
          <div style="font-size:8px;font-weight:700;color:var(--text2);margin-bottom:4px">Postos mais abastecidos</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
            <div style="display:flex;align-items:center;gap:5px">
              <div style="width:14px;height:14px;border-radius:4px;background:linear-gradient(135deg,#F7C948,#E59400);font-size:6px;font-weight:900;color:#fff;display:flex;align-items:center;justify-content:center">S</div>
              <span style="font-size:8.5px;color:var(--text)">Posto Shell</span>
            </div>
            <span style="font-size:8.5px;color:var(--text2)">3 vezes</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:5px">
              <div style="width:14px;height:14px;border-radius:4px;background:linear-gradient(135deg,#F7941D,#C85A00);font-size:6px;font-weight:900;color:#fff;display:flex;align-items:center;justify-content:center">i</div>
              <span style="font-size:8.5px;color:var(--text)">Posto Ipiranga</span>
            </div>
            <span style="font-size:8.5px;color:var(--text2)">2 vezes</span>
          </div>
        </div>
      </div>
      <div class="fc-body">
        <div class="fc-title">Histórico e relatórios</div>
        <div class="fc-desc">Acompanhe seus gastos e economias com relatórios mensais completos.</div>
      </div>
    </div>

  </div>
</section>

<!-- ━━━ HOW IT WORKS ━━━ -->
<div class="how" id="como-funciona">
  <div class="how-inner">
    <div class="sec-label rv"><i class="fas fa-play-circle"></i>&nbsp;Simples assim</div>
    <h2 class="sec-h2 rv">Como funciona</h2>
    <p class="sec-sub rv">Em menos de 30 segundos você já sabe onde abastecer e quanto vai economizar.</p>
    <div class="how-grid">
      <div class="steps">
        <div class="step rv">
          <div class="step-n">1</div>
          <div class="step-b">
            <h3>Cadastre-se e permita a localização</h3>
            <p>Crie sua conta em segundos com Google, Apple ou e-mail e permita o acesso à localização para encontrar postos próximos.</p>
          </div>
        </div>
        <div class="step rv">
          <div class="step-n">2</div>
          <div class="step-b">
            <h3>Configure seu veículo</h3>
            <p>Informe o tipo e o tamanho do tanque para calcular sua economia real em reais a cada abastecimento.</p>
          </div>
        </div>
        <div class="step rv">
          <div class="step-n">3</div>
          <div class="step-b">
            <h3>Compare e escolha o posto</h3>
            <p>Selecione o combustível. O app ordena do mais barato ao mais caro e mostra a economia no tanque cheio.</p>
          </div>
        </div>
        <div class="step rv">
          <div class="step-n">4</div>
          <div class="step-b">
            <h3>Siga a rota e economize</h3>
            <p>Toque em "Ir até lá" e siga a rota. Chegue ao posto mais barato e economize de verdade todo dia.</p>
          </div>
        </div>
      </div>
      <!-- mini phone -->
      <div class="how-phone-wrap">
        <div class="how-phone">
          <div style="background:var(--bg2)">
            <div class="sbar"><span>9:41</span><span style="font-size:8px">▼ ◀ ██</span></div>
            <div class="tbar">
              <div class="tbar-logo">Rota<b>Posto</b></div>
              <div class="tbar-icons"><div class="tbar-icon">🔔</div></div>
            </div>
            <div class="search-bar">
              <i class="fas fa-search"></i><span>Buscar cidade ou endereço</span>
            </div>
            <div class="phone-map" style="height:170px">
              <div class="map-grid"></div>
              <div class="road-h" style="top:35%;transform:rotate(-6deg)"></div>
              <div class="road-v" style="left:40%"></div>
              <div class="pin g" style="top:14%;left:7%">R$ 5,67</div>
              <div class="pin o" style="top:9%;right:7%">R$ 5,74</div>
              <div class="pin w" style="top:46%;left:4%">R$ 5,89</div>
              <div class="pin o" style="bottom:20%;right:7%">R$ 5,79</div>
              <div class="udot" style="top:42%;left:43%"></div>
            </div>
            <!-- Melhor posto próximo -->
            <div style="background:rgba(255,109,0,0.09);border:1px solid rgba(255,109,0,0.18);margin:9px;border-radius:10px;padding:9px 10px;display:flex;align-items:center;gap:8px">
              <div style="width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#F7C948,#E59400);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff">S</div>
              <div style="flex:1">
                <div style="font-size:8px;color:var(--text2);text-transform:uppercase;letter-spacing:.3px">Melhor posto próximo</div>
                <div style="font-size:11px;font-weight:800;color:var(--text)">Posto Shell</div>
                <div style="font-size:12px;font-weight:900;color:var(--orange)">R$ 5,67 /L</div>
              </div>
              <div style="font-size:12px;color:var(--orange)">✕</div>
            </div>
            <div style="margin:0 9px 9px">
              <div style="background:var(--orange);border-radius:9px;padding:9px;text-align:center;font-size:10px;font-weight:800;color:#fff">
                <i class="fas fa-directions" style="font-size:9px"></i> Ir até lá
              </div>
            </div>
            <div class="bnav">
              <div class="bnav-item active"><i class="fas fa-star"></i>Melhor</div>
              <div class="bnav-item"><i class="fas fa-list"></i>Lista</div>
              <div class="bnav-item"><i class="fas fa-map"></i>Mapa</div>
              <div class="bnav-item"><i class="fas fa-route"></i>Planejar</div>
              <div class="bnav-item"><i class="fas fa-user"></i>Perfil</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ━━━ TESTIMONIALS ━━━ -->
<section class="test-sec" id="depoimentos">
  <div class="sec-label rv"><i class="fas fa-comment-alt"></i>&nbsp;Depoimentos</div>
  <h2 class="sec-h2 rv">O que dizem os motoristas</h2>
  <p class="sec-sub rv">Quem usa o RotaPosto economiza de verdade em cada abastecimento.</p>
  <div class="test-grid">
    <div class="test-card rv">
      <div class="test-stars">★★★★★</div>
      <p class="test-text">"Economizei R$28 na última vez que abasteci o tanque cheio. O app me mostrou um posto que eu nem sabia que existia a 2km de casa com o preço R$0,56 mais barato."</p>
      <div class="test-author">
        <div class="test-av">M</div>
        <div><div class="test-name">Marcos Oliveira</div><div class="test-role">Motorista de app · São Paulo/SP</div></div>
      </div>
    </div>
    <div class="test-card rv">
      <div class="test-stars">★★★★★</div>
      <p class="test-text">"Faço 3.000km por mês de trabalho. Com o RotaPosto começo a semana sabendo exatamente onde abastecer. Pago o plano em um único abastecimento."</p>
      <div class="test-author">
        <div class="test-av">A</div>
        <div><div class="test-name">Ana Souza</div><div class="test-role">Representante Comercial · Campinas/SP</div></div>
      </div>
    </div>
    <div class="test-card rv">
      <div class="test-stars">★★★★☆</div>
      <p class="test-text">"O alerta de preço é incrível. Recebo notificação quando meu posto favorito baixa o preço. Nunca mais paguei mais caro do que precisava."</p>
      <div class="test-author">
        <div class="test-av">R</div>
        <div><div class="test-name">Rafael Costa</div><div class="test-role">Motorista Particular · Rio de Janeiro/RJ</div></div>
      </div>
    </div>
  </div>
</section>

<!-- ━━━ PRICING ━━━ -->
<div class="pricing" id="pricing">
  <div class="pricing-inner">
    <div class="sec-label rv"><i class="fas fa-tag"></i>&nbsp;Planos</div>
    <h2 class="sec-h2 rv">Simples, sem surpresas</h2>
    <p class="sec-sub rv" style="margin:0 auto">Comece grátis, faça upgrade quando quiser.</p>
    <div class="plans">
      <div class="plan rv">
        <div class="plan-name">Gratuito</div>
        <div class="plan-price">
          <span class="plan-cifra">R$</span>
          <span class="plan-val">0</span>
          <span class="plan-per">/mês</span>
        </div>
        <p class="plan-desc">Para quem quer testar e já economizar algo.</p>
        <ul class="plan-feats">
          <li><i class="fas fa-check fi-ok"></i> Busca de postos próximos</li>
          <li><i class="fas fa-check fi-ok"></i> Mapa interativo</li>
          <li><i class="fas fa-check fi-ok"></i> Menor preço do dia</li>
          <li><i class="fas fa-times fi-no"></i> <span>Alertas de preço</span></li>
          <li><i class="fas fa-times fi-no"></i> <span>Histórico de 30 dias</span></li>
          <li><i class="fas fa-times fi-no"></i> <span>Relatórios de economia</span></li>
        </ul>
        <button class="btn-plan-sec" onclick="ir('comecar')"><i class="fas fa-play"></i> Começar grátis</button>
      </div>
      <div class="plan pop rv">
        <div class="plan-best">⭐ Mais Popular</div>
        <div class="plan-name" style="color:var(--orange)">Premium</div>
        <div class="plan-price">
          <span class="plan-cifra">R$</span>
          <span class="plan-val" style="color:var(--orange)">9</span>
          <span class="plan-cents" style="color:var(--orange)">,90</span>
          <span class="plan-per">/mês</span>
        </div>
        <p class="plan-desc">Ideal para quem abastece toda semana e quer economizar de verdade.</p>
        <ul class="plan-feats">
          <li><i class="fas fa-check fi-ok"></i> Tudo do plano grátis</li>
          <li><i class="fas fa-check fi-ok"></i> <strong>Alertas quando o preço cair</strong></li>
          <li><i class="fas fa-check fi-ok"></i> <strong>Histórico de 30 dias</strong></li>
          <li><i class="fas fa-check fi-ok"></i> <strong>Favoritos ilimitados</strong></li>
          <li><i class="fas fa-check fi-ok"></i> <strong>Calculadora avançada</strong></li>
          <li><i class="fas fa-check fi-ok"></i> <strong>Suporte prioritário</strong></li>
        </ul>
        <button class="btn-plan-pri" onclick="abrirModal('premium')"><i class="fas fa-bolt"></i> Assinar por R$9,90/mês</button>
        <div class="plan-guar"><i class="fas fa-shield-alt" style="color:var(--green)"></i> 7 dias de garantia · Cancele quando quiser</div>
      </div>
      <div class="plan rv">
        <div class="plan-name">Anual</div>
        <div class="plan-price">
          <span class="plan-cifra">R$</span>
          <span class="plan-val">89</span>
          <span class="plan-per">/ano</span>
        </div>
        <p class="plan-desc">Economize 25% pagando o ano. Equivale a R$7,42/mês.</p>
        <ul class="plan-feats">
          <li><i class="fas fa-check fi-ok"></i> Tudo do Premium</li>
          <li><i class="fas fa-check fi-ok"></i> <strong style="color:#FBBF24">25% de desconto</strong></li>
          <li><i class="fas fa-check fi-ok"></i> Histórico ilimitado</li>
          <li><i class="fas fa-check fi-ok"></i> Acesso antecipado</li>
          <li><i class="fas fa-check fi-ok"></i> Relatório mensal</li>
          <li><i class="fas fa-check fi-ok"></i> Suporte VIP</li>
        </ul>
        <button class="btn-plan-sec" onclick="abrirModal('anual')"><i class="fas fa-star"></i> Assinar Anual</button>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;font-size:13px;color:var(--text2);display:flex;align-items:center;justify-content:center;gap:6px">
      <i class="fas fa-lock" style="color:var(--green)"></i>
      Pagamento 100% seguro · Cartão, Pix ou Boleto · Cancele a qualquer momento
    </div>
  </div>
</div>

<!-- ━━━ FAQ ━━━ -->
<section class="faq-sec" id="faq">
  <div class="sec-label rv"><i class="fas fa-question-circle"></i>&nbsp;Dúvidas</div>
  <h2 class="sec-h2 rv">Perguntas Frequentes</h2>
  <p class="sec-sub rv" style="margin:0 auto">Ainda com dúvidas? A gente responde.</p>
  <div class="faq-list">
    <div class="faq-item rv">
      <button class="faq-q" onclick="faq(this)">De onde vêm os preços dos postos?<i class="fas fa-plus"></i></button>
      <div class="faq-a">Os preços são baseados no levantamento semanal oficial da ANP (Agência Nacional do Petróleo), que coleta dados de mais de 46.000 postos em todo o Brasil. Os dados são atualizados automaticamente toda semana.</div>
    </div>
    <div class="faq-item rv">
      <button class="faq-q" onclick="faq(this)">O cadastro é realmente gratuito?<i class="fas fa-plus"></i></button>
      <div class="faq-a">Sim! Você cria sua conta sem pagar nada e já tem acesso às funcionalidades básicas. Para recursos avançados como alertas e relatórios, pode assinar o Premium a partir de R$9,90/mês — quando quiser e sem compromisso.</div>
    </div>
    <div class="faq-item rv">
      <button class="faq-q" onclick="faq(this)">Posso cancelar a assinatura quando quiser?<i class="fas fa-plus"></i></button>
      <div class="faq-a">Sim! Cancele a qualquer momento direto no app, sem burocracia. Seu acesso premium continua até o final do período pago. Também oferecemos 7 dias de garantia — se não gostar, devolvemos 100% do valor.</div>
    </div>
    <div class="faq-item rv">
      <button class="faq-q" onclick="faq(this)">O app funciona em todo o Brasil?<i class="fas fa-plus"></i></button>
      <div class="faq-a">Sim! A ANP coleta dados em mais de 2.000 municípios brasileiros. Capitais e grandes cidades têm cobertura semanal completa. Cidades menores exibem a referência de preços por UF.</div>
    </div>
    <div class="faq-item rv">
      <button class="faq-q" onclick="faq(this)">Quais formas de pagamento são aceitas?<i class="fas fa-plus"></i></button>
      <div class="faq-a">Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex), Pix e boleto bancário, tudo processado com segurança pelo MercadoPago.</div>
    </div>
  </div>
</section>

<!-- ━━━ FINAL CTA ━━━ -->
<div class="cta-final">
  <div class="sec-label rv" style="display:inline-flex"><i class="fas fa-rocket"></i>&nbsp;Comece hoje</div>
  <h2 class="rv" style="margin-top:18px">Pare de pagar caro<br/>no combustível</h2>
  <p class="rv">O brasileiro abastece em média 3x por mês. Com o RotaPosto você pode economizar R$75 ou mais todo mês.</p>
  <div class="cta-btns rv">
    <button class="btn-cta-pri" onclick="ir('comecar')"><i class="fas fa-rocket"></i> Cadastre-se agora</button>
    <button class="btn-cta-sec" onclick="ir('entrar')"><i class="fas fa-user"></i> Já tenho uma conta</button>
  </div>
</div>

<!-- ━━━ TRUST BAR ━━━ -->
<div class="trust">
  <div class="trust-inner">
    <div class="trust-item rv">
      <div class="trust-icon"><i class="fas fa-sync-alt"></i></div>
      <div><div class="trust-title">Atualização diária</div><div class="trust-sub">dos preços</div></div>
    </div>
    <div class="trust-item rv">
      <div class="trust-icon"><i class="fas fa-database"></i></div>
      <div><div class="trust-title">Dados oficiais</div><div class="trust-sub">da ANP</div></div>
    </div>
    <div class="trust-item rv">
      <div class="trust-icon"><i class="fas fa-shield-alt"></i></div>
      <div><div class="trust-title">100% seguro</div><div class="trust-sub">e confiável</div></div>
    </div>
    <div class="trust-item rv">
      <div class="trust-icon"><i class="fas fa-car"></i></div>
      <div><div class="trust-title">Feito para quem</div><div class="trust-sub">dirige e economiza</div></div>
    </div>
  </div>
</div>

<!-- ━━━ FOOTER ━━━ -->
<footer class="footer">
  <div class="footer-logo">
    <div class="footer-logo-icon">⛽</div>
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

<!-- ━━━ MODAL ━━━ -->
<div class="modal-bg" id="modal">
  <div class="modal-box">
    <button class="modal-close" onclick="fecharModal()"><i class="fas fa-times"></i></button>
    <div id="pay-form">
      <div class="modal-hd">
        <h3 id="m-plan-name">RotaPosto Premium</h3>
        <div class="modal-price"><sup>R$</sup><span id="m-plan-val">9,90</span><sub>/mês</sub></div>
      </div>
      <div class="sec-title-sm">Seus dados</div>
      <label class="f-label">Nome completo</label>
      <input class="f-input" type="text" id="pay-nome" placeholder="João da Silva" autocomplete="name"/>
      <label class="f-label">E-mail</label>
      <input class="f-input" type="email" id="pay-email" placeholder="seu@email.com" autocomplete="email"/>
      <label class="f-label">CPF</label>
      <input class="f-input" type="text" id="pay-cpf" placeholder="000.000.000-00" maxlength="14" oninput="mCPF(this)"/>
      <div class="sec-title-sm" style="margin-top:14px">Cartão de crédito</div>
      <label class="f-label">Número do cartão</label>
      <input class="f-input" type="text" id="pay-card" placeholder="0000 0000 0000 0000" maxlength="19" oninput="mCard(this)"/>
      <div class="f-row">
        <div><label class="f-label">Validade</label><input class="f-input" type="text" id="pay-val" placeholder="MM/AA" maxlength="5" oninput="mVal(this)"/></div>
        <div><label class="f-label">CVV</label><input class="f-input" type="text" id="pay-cvv" placeholder="123" maxlength="4"/></div>
      </div>
      <button class="btn-pay" id="btn-pagar" onclick="pagar()">
        <i class="fas fa-lock"></i> Pagar R$<span id="btn-val">9,90</span>
      </button>
      <div class="pay-sec"><i class="fas fa-shield-alt"></i> Pagamento 100% seguro via MercadoPago</div>
    </div>
    <div class="pay-result" id="pay-ok">
      <i class="fas fa-check-circle"></i>
      <h3>Assinatura confirmada! 🎉</h3>
      <p>Bem-vindo ao RotaPosto Premium!<br/>Você já pode acessar todas as funcionalidades.</p>
      <br/>
      <button class="btn-plan-pri" style="width:100%;justify-content:center;margin-top:6px" onclick="window.location.href='/app'">
        <i class="fas fa-rocket"></i> Acessar o App
      </button>
    </div>
  </div>
</div>

<script>
// ── nav redirect ──────────────────────────────────────────────
function ir(modo){window.location.href='/app?modo='+(modo||'comecar')}

// ── modal ─────────────────────────────────────────────────────
let plano='premium';
const planos={premium:{nome:'RotaPosto Premium',val:'9,90'},anual:{nome:'RotaPosto Anual',val:'89,00'}};

function abrirModal(p){
  plano=p;
  const d=planos[p];
  document.getElementById('m-plan-name').textContent=d.nome;
  document.getElementById('m-plan-val').textContent=d.val;
  document.getElementById('btn-val').textContent=d.val;
  document.getElementById('pay-form').style.display='block';
  document.getElementById('pay-ok').classList.remove('ok');
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow='hidden';
}
function fecharModal(){
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow='';
}
document.getElementById('modal').addEventListener('click',function(e){if(e.target===this)fecharModal()});

// ── masks ─────────────────────────────────────────────────────
function mCPF(el){
  let v=el.value.replace(/\\D/g,'');
  if(v.length>11)v=v.slice(0,11);
  v=v.replace(/(\\d{3})(\\d)/,'$1.$2').replace(/(\\d{3})(\\d)/,'$1.$2').replace(/(\\d{3})(\\d{1,2})$/,'$1-$2');
  el.value=v;
}
function mCard(el){
  let v=el.value.replace(/\\D/g,'').slice(0,16);
  el.value=v.replace(/(\\d{4})/g,'$1 ').trim();
}
function mVal(el){
  let v=el.value.replace(/\\D/g,'').slice(0,4);
  if(v.length>=3)v=v.slice(0,2)+'/'+v.slice(2);
  el.value=v;
}

// ── Mercado Pago SDK ──────────────────────────────────────────────────────────
const MP_PUBLIC_KEY='APP_USR-b1c14564-1b89-4dde-8b54-1c3bf64ab8a3';
let _mp=null;
function getMP(){
  if(!_mp){
    if(typeof MercadoPago==='undefined'){throw new Error('SDK Mercado Pago não carregou. Verifique sua conexão.');}
    _mp=new MercadoPago(MP_PUBLIC_KEY,{locale:'pt-BR'});
  }
  return _mp;
}

// ── pagamento ─────────────────────────────────────────────────────────────────
async function pagar(){
  const nome=document.getElementById('pay-nome').value.trim();
  const email=document.getElementById('pay-email').value.trim();
  const cpf=document.getElementById('pay-cpf').value.replace(/\D/g,'');
  const card=document.getElementById('pay-card').value.replace(/\s/g,'');
  const val=document.getElementById('pay-val').value;
  const cvv=document.getElementById('pay-cvv').value;
  if(!nome||!email||cpf.length!==11){alert('Preencha nome, e-mail e CPF corretamente.');return}
  if(card.length<16||!val||cvv.length<3){alert('Dados do cartão incompletos.');return}
  const btn=document.getElementById('btn-pagar');
  btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Processando...';
  try{
    // 1. Tokenizar cartão via SDK Mercado Pago (nunca envia dados brutos ao backend)
    const[m,a]=val.split('/');
    const mp=getMP();
    let cardToken;
    try{
      cardToken=await mp.createCardToken({
        cardNumber:card,
        cardholderName:nome,
        cardExpirationMonth:m.padStart(2,'0'),
        cardExpirationYear:'20'+a,
        securityCode:cvv,
        identificationType:'CPF',
        identificationNumber:cpf
      });
    }catch(tokenErr){
      const cause=tokenErr?.cause;
      const msg=cause&&Array.isArray(cause)
        ?cause.map(e=>e.description||e.message||e.code).filter(Boolean).join('; ')
        :(tokenErr?.message||'Dados do cartão inválidos. Verifique o número, validade e CVV.');
      alert('Erro no cartão: '+msg);
      btn.disabled=false;btn.innerHTML='<i class="fas fa-lock"></i> Pagar R$'+planos[plano].val;
      return;
    }
    if(!cardToken||!cardToken.id){
      alert('Não foi possível tokenizar o cartão. Verifique os dados e tente novamente.');
      btn.disabled=false;btn.innerHTML='<i class="fas fa-lock"></i> Pagar R$'+planos[plano].val;
      return;
    }
    // 2. userId salvo no localStorage pelo app após login
    const userId=localStorage.getItem('rp_uid')||'';
    // 3. Enviar somente o token ao backend — dados do cartão nunca saem do browser
    const res=await fetch('/api/pagamento/assinar',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({plano,nome,email,cpf,cardToken:cardToken.id,userId})});
    const data=await res.json();
    if(data.sucesso){
      document.getElementById('pay-form').style.display='none';
      document.getElementById('pay-ok').classList.add('ok');
      localStorage.setItem('rp_premium','1');
      if(data.subscriptionId)localStorage.setItem('rp_sub_id',data.subscriptionId);
    }else{
      alert('Erro: '+(data.mensagem||'Tente novamente.'));
      btn.disabled=false;btn.innerHTML='<i class="fas fa-lock"></i> Pagar R$'+planos[plano].val;
    }
  }catch(e){
    console.error('[pagar]',e);
    alert('Erro de conexão. Tente novamente.');
    btn.disabled=false;btn.innerHTML='<i class="fas fa-lock"></i> Pagar R$'+planos[plano].val;
  }
}

// ── faq ───────────────────────────────────────────────────────────
function faq(btn){
  const a=btn.nextElementSibling;
  const open=a.classList.contains('open');
  document.querySelectorAll('.faq-q').forEach(q=>{q.classList.remove('open');q.nextElementSibling.classList.remove('open')});
  if(!open){btn.classList.add('open');a.classList.add('open')}
}

// ── scroll reveal ─────────────────────────────────────────────
const obs=new IntersectionObserver(es=>{
  es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target)}})
},{threshold:0.1});
document.querySelectorAll('.rv').forEach(el=>obs.observe(el));
</script>
</body>
</html>`;
}
