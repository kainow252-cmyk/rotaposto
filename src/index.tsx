import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

app.use('*', cors())
app.use('/static/*', serveStatic({ root: './' }))

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Posto {
  id: string
  nome: string
  bandeira: string
  endereco: string
  cidade: string
  estado: string
  lat: number
  lng: number
  precos: Record<string, number>
  atualizadoEm: string
}

// ─── Dados simulados (baseados em postos reais ANP) ──────────────────────────
const POSTOS_MOCK: Posto[] = [
  {
    id: '1',
    nome: 'Auto Posto Ipiranga Centro',
    bandeira: 'Ipiranga',
    endereco: 'Av. Paulista, 1578',
    cidade: 'São Paulo',
    estado: 'SP',
    lat: -23.5630,
    lng: -46.6543,
    precos: { gasolina: 6.19, etanol: 4.39, diesel: 5.89, gnv: 4.29 },
    atualizadoEm: '2025-06-25'
  },
  {
    id: '2',
    nome: 'Posto Shell Consolação',
    bandeira: 'Shell',
    endereco: 'R. da Consolação, 2300',
    cidade: 'São Paulo',
    estado: 'SP',
    lat: -23.5512,
    lng: -46.6601,
    precos: { gasolina: 5.97, etanol: 4.19, diesel: 5.79, gnv: 4.15 },
    atualizadoEm: '2025-06-25'
  },
  {
    id: '3',
    nome: 'Posto BR Higienópolis',
    bandeira: 'BR',
    endereco: 'Av. Angélica, 900',
    cidade: 'São Paulo',
    estado: 'SP',
    lat: -23.5481,
    lng: -46.6520,
    precos: { gasolina: 5.69, etanol: 3.99, diesel: 5.59, gnv: 3.99 },
    atualizadoEm: '2025-06-26'
  },
  {
    id: '4',
    nome: 'Raízen Avenida Brasil',
    bandeira: 'Raízen',
    endereco: 'Av. Brasil, 1200',
    cidade: 'São Paulo',
    estado: 'SP',
    lat: -23.5699,
    lng: -46.6421,
    precos: { gasolina: 6.09, etanol: 4.29, diesel: 5.75, gnv: 4.09 },
    atualizadoEm: '2025-06-26'
  },
  {
    id: '5',
    nome: 'Posto Bandeirante Liberdade',
    bandeira: 'Bandeirante',
    endereco: 'R. Galvão Bueno, 350',
    cidade: 'São Paulo',
    estado: 'SP',
    lat: -23.5598,
    lng: -46.6360,
    precos: { gasolina: 5.85, etanol: 4.09, diesel: 5.65, gnv: 4.05 },
    atualizadoEm: '2025-06-24'
  },
  {
    id: '6',
    nome: 'Auto Posto Pantanal',
    bandeira: 'Independente',
    endereco: 'R. Vergueiro, 4200',
    cidade: 'São Paulo',
    estado: 'SP',
    lat: -23.5831,
    lng: -46.6342,
    precos: { gasolina: 5.79, etanol: 4.05, diesel: 5.55, gnv: 3.95 },
    atualizadoEm: '2025-06-26'
  },
  {
    id: '7',
    nome: 'Posto Petrobras Ibirapuera',
    bandeira: 'BR',
    endereco: 'Av. Ibirapuera, 2907',
    cidade: 'São Paulo',
    estado: 'SP',
    lat: -23.5962,
    lng: -46.6547,
    precos: { gasolina: 6.29, etanol: 4.49, diesel: 5.99, gnv: 4.39 },
    atualizadoEm: '2025-06-25'
  },
  {
    id: '8',
    nome: 'Auto Posto Esso Moema',
    bandeira: 'Esso',
    endereco: 'Av. Santo Amaro, 1100',
    cidade: 'São Paulo',
    estado: 'SP',
    lat: -23.5912,
    lng: -46.6631,
    precos: { gasolina: 5.99, etanol: 4.25, diesel: 5.72, gnv: 4.19 },
    atualizadoEm: '2025-06-26'
  }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getBandeiraEmoji(bandeira: string): string {
  const map: Record<string, string> = {
    'BR': '🟢', 'Ipiranga': '🟡', 'Shell': '🔴', 'Esso': '🔵',
    'Raízen': '🟠', 'Bandeirante': '⚪', 'Independente': '⚫'
  }
  return map[bandeira] || '⚫'
}

// ─── API: Postos próximos ─────────────────────────────────────────────────────
app.get('/api/postos', (c) => {
  const lat = parseFloat(c.req.query('lat') || '-23.5505')
  const lng = parseFloat(c.req.query('lng') || '-46.6333')
  const raio = parseFloat(c.req.query('raio') || '10')
  const combustivel = c.req.query('combustivel') || 'gasolina'

  const postos = POSTOS_MOCK
    .map(p => ({
      ...p,
      distancia: haversine(lat, lng, p.lat, p.lng),
      preco: p.precos[combustivel] || null,
      emoji: getBandeiraEmoji(p.bandeira)
    }))
    .filter(p => p.distancia <= raio && p.preco !== null)
    .sort((a, b) => (a.preco || 0) - (b.preco || 0))

  if (postos.length === 0) {
    return c.json({ error: 'Nenhum posto encontrado neste raio', postos: [] })
  }

  const menorPreco = postos[0].preco!
  const maiorPreco = postos[postos.length - 1].preco!

  return c.json({
    postos: postos.map((p, i) => ({
      ...p,
      rank: i + 1,
      economia: i === 0 ? 0 : Math.round((p.preco! - menorPreco) * 100) / 100,
      melhor: i === 0
    })),
    estatisticas: {
      totalPostos: postos.length,
      menorPreco,
      maiorPreco,
      mediaPreco: Math.round((postos.reduce((s, p) => s + p.preco!, 0) / postos.length) * 100) / 100,
      combustivel
    }
  })
})

// ─── API: Calcular Rota via OSRM ──────────────────────────────────────────────
app.get('/api/rota', async (c) => {
  const origemLat = c.req.query('origemLat')
  const origemLng = c.req.query('origemLng')
  const destinoLat = c.req.query('destinoLat')
  const destinoLng = c.req.query('destinoLng')

  if (!origemLat || !origemLng || !destinoLat || !destinoLng) {
    return c.json({ error: 'Parâmetros de rota inválidos' }, 400)
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=false&steps=false`
    const res = await fetch(url)
    const data = await res.json() as any

    if (data.code !== 'Ok') {
      return c.json({ error: 'Erro ao calcular rota' }, 500)
    }

    const rota = data.routes[0]
    return c.json({
      distanciaKm: Math.round(rota.distance / 1000 * 10) / 10,
      duracaoMin: Math.round(rota.duration / 60),
      url_mapa: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origemLat}%2C${origemLng}%3B${destinoLat}%2C${destinoLng}`
    })
  } catch (e) {
    return c.json({ error: 'Serviço de rota indisponível' }, 500)
  }
})

// ─── API: Calcular Economia ───────────────────────────────────────────────────
app.get('/api/economia', (c) => {
  const precoAtual = parseFloat(c.req.query('precoAtual') || '0')
  const melhorPreco = parseFloat(c.req.query('melhorPreco') || '0')
  const litros = parseFloat(c.req.query('litros') || '50')
  const consumo = parseFloat(c.req.query('consumo') || '12')

  const economiaPorLitro = Math.max(0, precoAtual - melhorPreco)
  const economiaTanque = Math.round(economiaPorLitro * litros * 100) / 100
  const kmTanque = litros * consumo

  return c.json({
    economiaPorLitro: Math.round(economiaPorLitro * 100) / 100,
    economiaTanque,
    kmTanque,
    valorTotalAtual: Math.round(precoAtual * litros * 100) / 100,
    valorTotalMelhor: Math.round(melhorPreco * litros * 100) / 100
  })
})

// ─── API: Busca por cidade (Nominatim) ───────────────────────────────────────
app.get('/api/geocode', async (c) => {
  const q = c.req.query('q') || ''
  if (!q) return c.json({ error: 'Query vazia' }, 400)

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Brasil')}&format=json&limit=5&countrycodes=br`
    const res = await fetch(url, { headers: { 'User-Agent': 'RotaPosto/1.0' } })
    const data = await res.json() as any[]

    return c.json(data.map(r => ({
      nome: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon)
    })))
  } catch {
    return c.json({ error: 'Erro ao buscar localização' }, 500)
  }
})

// ─── Frontend Principal ───────────────────────────────────────────────────────
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <meta name="theme-color" content="#0D1B2A"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <title>RotaPosto – Ache o Melhor Preço</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
    :root {
      --azul-escuro: #0D1B2A;
      --azul-medio: #1B3A5C;
      --azul-vivo: #1565C0;
      --verde: #00C853;
      --verde-claro: #E8F5E9;
      --laranja: #FF6D00;
      --laranja-claro: #FFF3E0;
      --amarelo: #FFD600;
      --branco: #FFFFFF;
      --cinza-bg: #F5F7FA;
      --cinza-card: #FFFFFF;
      --cinza-borda: #E0E7EF;
      --cinza-texto: #8898AA;
      --texto-principal: #0D1B2A;
      --texto-secundario: #4A6080;
      --sombra: 0 4px 24px rgba(13,27,42,0.10);
      --sombra-forte: 0 8px 32px rgba(13,27,42,0.18);
      --radius: 18px;
      --radius-sm: 12px;
      --tab-h: 70px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

    body {
      font-family: 'Raleway', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--cinza-bg);
      color: var(--texto-principal);
      min-height: 100dvh;
      max-width: 430px;
      margin: 0 auto;
      position: relative;
      overflow-x: hidden;
    }

    /* ── HEADER ── */
    #header {
      background: var(--azul-escuro);
      padding: 52px 20px 16px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 12px rgba(0,0,0,0.25);
    }
    #header .top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    #header .logo {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    #header .logo-icon {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, var(--laranja), var(--amarelo));
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    #header .logo-text {
      font-size: 22px;
      font-weight: 900;
      color: var(--branco);
      letter-spacing: -0.5px;
    }
    #header .logo-text span { color: var(--laranja); }
    #header .header-actions {
      display: flex; gap: 8px;
    }
    #header .btn-icon {
      width: 38px; height: 38px;
      background: rgba(255,255,255,0.10);
      border: none; border-radius: 50%;
      color: var(--branco);
      font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    #header .btn-icon:active { background: rgba(255,255,255,0.20); }

    /* ── BARRA DE BUSCA ── */
    .search-bar {
      display: flex; gap: 8px;
    }
    .search-wrap {
      flex: 1;
      position: relative;
    }
    .search-wrap i {
      position: absolute; left: 13px; top: 50%;
      transform: translateY(-50%);
      color: var(--cinza-texto); font-size: 14px;
    }
    .search-wrap input {
      width: 100%;
      padding: 11px 12px 11px 36px;
      background: rgba(255,255,255,0.12);
      border: 1.5px solid rgba(255,255,255,0.18);
      border-radius: 12px;
      color: var(--branco);
      font-family: 'Raleway', sans-serif;
      font-size: 14px;
      font-weight: 500;
      outline: none;
    }
    .search-wrap input::placeholder { color: rgba(255,255,255,0.45); }
    .search-wrap input:focus { border-color: var(--laranja); background: rgba(255,255,255,0.16); }
    .btn-localizar {
      padding: 11px 14px;
      background: linear-gradient(135deg, var(--laranja), #FF8F00);
      border: none; border-radius: 12px;
      color: var(--branco); font-size: 15px;
      cursor: pointer;
      white-space: nowrap;
      font-weight: 700;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn-localizar:active { transform: scale(0.96); }

    /* Sugestões geocode */
    #sugestoes {
      position: absolute;
      top: calc(100% + 6px); left: 0; right: 0;
      background: var(--branco);
      border-radius: var(--radius-sm);
      box-shadow: var(--sombra-forte);
      z-index: 200;
      overflow: hidden;
      display: none;
    }
    #sugestoes.visible { display: block; }
    .sugestao-item {
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 1px solid var(--cinza-borda);
      color: var(--texto-principal);
    }
    .sugestao-item:last-child { border-bottom: none; }
    .sugestao-item:active { background: var(--cinza-bg); }

    /* ── TABS DE CONTEÚDO ── */
    #tab-bar {
      display: flex;
      background: var(--azul-escuro);
      padding: 0 8px 4px;
    }
    .tab-btn {
      flex: 1;
      display: flex; flex-direction: column; align-items: center;
      gap: 2px;
      padding: 7px 4px;
      border: none; background: none;
      color: rgba(255,255,255,0.45);
      font-family: 'Raleway', sans-serif;
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.3px;
      cursor: pointer;
      border-radius: 10px;
      transition: color 0.2s, background 0.2s;
      text-transform: uppercase;
    }
    .tab-btn i { font-size: 18px; }
    .tab-btn.active {
      color: var(--laranja);
      background: rgba(255,109,0,0.12);
    }

    /* ── FILTROS ── */
    .filtros-wrap {
      background: var(--branco);
      padding: 12px 16px;
      border-bottom: 1px solid var(--cinza-borda);
      display: flex; gap: 8px; overflow-x: auto;
      scrollbar-width: none;
    }
    .filtros-wrap::-webkit-scrollbar { display: none; }
    .chip {
      display: flex; align-items: center; gap: 5px;
      padding: 7px 14px;
      border-radius: 100px;
      border: 1.5px solid var(--cinza-borda);
      background: var(--branco);
      color: var(--texto-secundario);
      font-family: 'Raleway', sans-serif;
      font-size: 12px; font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .chip.active {
      background: var(--azul-escuro);
      border-color: var(--azul-escuro);
      color: var(--branco);
    }
    .chip i { font-size: 12px; }

    /* ── VIEWS ── */
    .view { display: none; }
    .view.active { display: block; }

    /* ── VIEW: DESTAQUE / MELHOR POSTO ── */
    #view-destaque {
      padding: 16px;
      padding-bottom: calc(var(--tab-h) + 16px);
    }

    .banner-economia {
      background: linear-gradient(135deg, var(--azul-escuro) 0%, var(--azul-medio) 100%);
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 16px;
      position: relative;
      overflow: hidden;
    }
    .banner-economia::before {
      content: '';
      position: absolute;
      top: -30px; right: -30px;
      width: 120px; height: 120px;
      background: rgba(255,109,0,0.12);
      border-radius: 50%;
    }
    .banner-economia::after {
      content: '';
      position: absolute;
      bottom: -50px; left: -20px;
      width: 160px; height: 160px;
      background: rgba(255,214,0,0.06);
      border-radius: 50%;
    }
    .banner-economia .label {
      font-size: 11px;
      font-weight: 700;
      color: var(--laranja);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .banner-economia h2 {
      font-size: 15px;
      font-weight: 800;
      color: var(--branco);
      margin-bottom: 4px;
    }
    .banner-economia .endereco {
      font-size: 12px;
      color: rgba(255,255,255,0.60);
      margin-bottom: 16px;
    }
    .preco-destaque {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-bottom: 16px;
    }
    .preco-destaque .cifra { font-size: 16px; font-weight: 800; color: rgba(255,255,255,0.8); }
    .preco-destaque .valor { font-size: 48px; font-weight: 900; color: var(--branco); line-height: 1; }
    .preco-destaque .cents { font-size: 22px; font-weight: 700; color: var(--branco); align-self: flex-end; margin-bottom: 4px; }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .stat-box {
      background: rgba(255,255,255,0.10);
      border-radius: 12px;
      padding: 10px 12px;
    }
    .stat-box .stat-label { font-size: 10px; color: rgba(255,255,255,0.55); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-box .stat-val { font-size: 16px; font-weight: 800; color: var(--branco); margin-top: 2px; }
    .stat-box .stat-val.verde { color: #69F0AE; }
    .stat-box .stat-val.laranja { color: var(--amarelo); }

    .btn-ir {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, var(--laranja), #FF8F00);
      border: none; border-radius: 14px;
      color: var(--branco);
      font-family: 'Raleway', sans-serif;
      font-size: 15px; font-weight: 800;
      letter-spacing: 0.5px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 16px rgba(255,109,0,0.40);
      position: relative; z-index: 1;
    }
    .btn-ir:active { transform: scale(0.98); box-shadow: 0 2px 8px rgba(255,109,0,0.30); }

    /* Seção título */
    .secao-titulo {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
      padding: 0 2px;
    }
    .secao-titulo h3 { font-size: 15px; font-weight: 800; color: var(--texto-principal); }
    .secao-titulo a { font-size: 12px; font-weight: 700; color: var(--azul-vivo); text-decoration: none; }

    /* Card posto destaque */
    .card-posto {
      background: var(--cinza-card);
      border-radius: var(--radius);
      padding: 14px 16px;
      margin-bottom: 10px;
      border: 1.5px solid var(--cinza-borda);
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: box-shadow 0.2s, border-color 0.2s;
      box-shadow: var(--sombra);
    }
    .card-posto:active { box-shadow: var(--sombra-forte); border-color: var(--azul-vivo); }
    .card-posto.melhor-posto {
      border-color: var(--verde);
      box-shadow: 0 4px 20px rgba(0,200,83,0.15);
    }

    .bandeira-box {
      width: 46px; height: 52px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--azul-escuro), var(--azul-medio));
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 2px;
      flex-shrink: 0;
    }
    .bandeira-box .bandeira-emoji { font-size: 18px; }
    .bandeira-box .bandeira-txt {
      font-size: 7px; font-weight: 800;
      color: rgba(255,255,255,0.7);
      text-align: center;
      line-height: 1.2;
    }

    .posto-info { flex: 1; min-width: 0; }
    .posto-nome {
      font-size: 13px; font-weight: 800;
      color: var(--texto-principal);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      text-transform: uppercase;
    }
    .posto-end {
      font-size: 11px;
      color: var(--cinza-texto);
      font-weight: 500;
      margin: 2px 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .posto-tags {
      display: flex; gap: 4px; align-items: center; flex-wrap: wrap;
    }
    .badge {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 7px;
      border-radius: 100px;
      font-size: 10px; font-weight: 700;
    }
    .badge-dist { background: #EEF2FF; color: var(--azul-vivo); }
    .badge-combustivel { background: var(--laranja-claro); color: var(--laranja); }
    .badge-melhor { background: var(--verde-claro); color: #2E7D32; }
    .badge-atualizado { background: #F3F4F6; color: var(--cinza-texto); }

    .posto-preco-col {
      text-align: right;
      flex-shrink: 0;
    }
    .posto-preco-col .preco {
      font-size: 22px;
      font-weight: 900;
      color: var(--azul-vivo);
      line-height: 1;
    }
    .posto-preco-col .preco.melhor { color: #2E7D32; }
    .posto-preco-col .economia-txt {
      font-size: 10px;
      font-weight: 700;
      color: #E53935;
      margin-top: 2px;
    }
    .posto-preco-col .economia-txt.verde { color: #2E7D32; }

    /* ── SORT TABS ── */
    .sort-tabs {
      display: flex;
      gap: 6px;
      padding: 0 2px 12px;
    }
    .sort-tab {
      flex: 1;
      padding: 8px 12px;
      border-radius: 100px;
      border: 1.5px solid var(--cinza-borda);
      background: var(--branco);
      font-family: 'Raleway', sans-serif;
      font-size: 12px; font-weight: 700;
      color: var(--texto-secundario);
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }
    .sort-tab.active {
      background: var(--azul-escuro);
      border-color: var(--azul-escuro);
      color: var(--branco);
    }

    /* ── VIEW: LISTA ── */
    #view-lista {
      padding-bottom: calc(var(--tab-h) + 16px);
    }
    #view-lista .filtros-wrap { margin: 0; }
    #lista-postos { padding: 12px 16px; }

    /* ── VIEW: MAPA ── */
    #view-mapa {
      padding-bottom: var(--tab-h);
    }
    #map-container {
      width: 100%;
      height: calc(100dvh - 200px);
      min-height: 360px;
      background: #D1E8FF;
      position: relative;
    }
    #map { width: 100%; height: 100%; }
    .map-overlay {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      background: var(--branco);
      border-radius: var(--radius) var(--radius) 0 0;
      padding: 14px 16px;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.12);
      z-index: 10;
    }

    /* ── VIEW: PLANEJAR ── */
    #view-planejar {
      padding: 16px;
      padding-bottom: calc(var(--tab-h) + 16px);
    }
    .planner-card {
      background: var(--branco);
      border-radius: var(--radius);
      padding: 18px;
      box-shadow: var(--sombra);
      border: 1.5px solid var(--cinza-borda);
      margin-bottom: 14px;
    }
    .planner-card h3 {
      font-size: 14px; font-weight: 800;
      color: var(--texto-principal);
      margin-bottom: 14px;
      display: flex; align-items: center; gap: 7px;
    }
    .planner-card h3 i { color: var(--laranja); font-size: 16px; }
    .form-group {
      margin-bottom: 12px;
    }
    .form-group label {
      display: block;
      font-size: 11px; font-weight: 700;
      color: var(--texto-secundario);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 11px 13px;
      border: 1.5px solid var(--cinza-borda);
      border-radius: 10px;
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 600;
      color: var(--texto-principal);
      background: var(--cinza-bg);
      outline: none;
      transition: border-color 0.2s;
    }
    .form-group input:focus, .form-group select:focus {
      border-color: var(--azul-vivo);
      background: var(--branco);
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    .resultado-economia {
      background: linear-gradient(135deg, #0D1B2A, #1B3A5C);
      border-radius: var(--radius);
      padding: 18px;
      display: none;
    }
    .resultado-economia.visible { display: block; }
    .resultado-economia h3 {
      font-size: 13px; font-weight: 800;
      color: rgba(255,255,255,0.7);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 14px;
    }
    .eco-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .eco-row:last-child { border-bottom: none; }
    .eco-row .eco-label { font-size: 12px; color: rgba(255,255,255,0.6); font-weight: 600; }
    .eco-row .eco-val { font-size: 15px; font-weight: 800; color: var(--branco); }
    .eco-row .eco-val.verde { color: #69F0AE; font-size: 20px; }

    /* ── BOTTOM NAV FIXO ── */
    #bottom-nav {
      position: fixed;
      bottom: 0; left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 430px;
      height: var(--tab-h);
      background: var(--azul-escuro);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 6px 8px env(safe-area-inset-bottom, 8px);
      z-index: 200;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .nav-btn {
      display: flex; flex-direction: column;
      align-items: center; gap: 3px;
      padding: 6px 14px;
      border: none; background: none;
      color: rgba(255,255,255,0.40);
      font-family: 'Raleway', sans-serif;
      font-size: 9px; font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 12px;
      transition: all 0.2s;
      position: relative;
    }
    .nav-btn i { font-size: 20px; }
    .nav-btn.active { color: var(--laranja); background: rgba(255,109,0,0.12); }
    .nav-btn .badge-count {
      position: absolute; top: 2px; right: 8px;
      background: var(--laranja);
      color: var(--branco);
      font-size: 8px; font-weight: 800;
      width: 16px; height: 16px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }

    /* ── LOADING ── */
    .loading-overlay {
      position: fixed; inset: 0;
      background: rgba(13,27,42,0.85);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 16px;
      z-index: 999;
      display: none;
    }
    .loading-overlay.visible { display: flex; }
    .spinner {
      width: 48px; height: 48px;
      border: 4px solid rgba(255,255,255,0.15);
      border-top-color: var(--laranja);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-overlay p {
      color: var(--branco);
      font-size: 14px; font-weight: 700;
    }

    /* ── TOAST ── */
    #toast {
      position: fixed;
      bottom: calc(var(--tab-h) + 14px);
      left: 50%; transform: translateX(-50%) translateY(20px);
      background: var(--azul-escuro);
      color: var(--branco);
      padding: 10px 20px;
      border-radius: 100px;
      font-size: 13px; font-weight: 700;
      box-shadow: var(--sombra-forte);
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      z-index: 500;
      white-space: nowrap;
      pointer-events: none;
    }
    #toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* ── MODAL POSTO DETALHE ── */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 800;
      display: none;
      align-items: flex-end;
    }
    .modal-overlay.visible { display: flex; }
    .modal-sheet {
      width: 100%;
      max-width: 430px;
      margin: 0 auto;
      background: var(--branco);
      border-radius: var(--radius) var(--radius) 0 0;
      padding: 20px;
      max-height: 85dvh;
      overflow-y: auto;
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .modal-handle {
      width: 40px; height: 4px;
      background: var(--cinza-borda);
      border-radius: 2px;
      margin: 0 auto 16px;
    }
    .modal-bandeira-row {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 14px;
    }
    .modal-bandeira-box {
      width: 52px; height: 52px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--azul-escuro), var(--azul-medio));
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 2px;
    }
    .modal-nome { font-size: 16px; font-weight: 900; color: var(--texto-principal); }
    .modal-sub { font-size: 12px; color: var(--cinza-texto); font-weight: 500; }

    .preco-combustiveis {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px; margin-bottom: 16px;
    }
    .preco-item {
      background: var(--cinza-bg);
      border-radius: 12px;
      padding: 10px 12px;
      border: 1.5px solid transparent;
    }
    .preco-item.selecionado {
      border-color: var(--azul-vivo);
      background: #EEF2FF;
    }
    .preco-item.mais-barato { border-color: var(--verde); background: var(--verde-claro); }
    .preco-item .comb-nome { font-size: 10px; font-weight: 700; color: var(--cinza-texto); text-transform: uppercase; }
    .preco-item .comb-preco { font-size: 18px; font-weight: 900; color: var(--texto-principal); margin-top: 2px; }
    .preco-item .comb-preco.verde { color: #2E7D32; }

    .modal-btns {
      display: flex; gap: 8px;
    }
    .modal-btn {
      flex: 1; padding: 13px;
      border-radius: 12px; border: none;
      font-family: 'Raleway', sans-serif;
      font-size: 13px; font-weight: 800;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: transform 0.15s;
    }
    .modal-btn:active { transform: scale(0.97); }
    .modal-btn-primario {
      background: linear-gradient(135deg, var(--laranja), #FF8F00);
      color: var(--branco);
      box-shadow: 0 4px 14px rgba(255,109,0,0.35);
    }
    .modal-btn-sec {
      background: var(--cinza-bg);
      color: var(--texto-principal);
      border: 1.5px solid var(--cinza-borda);
    }

    /* Animação entrada cards */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .card-posto { animation: fadeInUp 0.3s ease both; }

    /* Vazio */
    .empty-state {
      text-align: center;
      padding: 48px 20px;
    }
    .empty-state i { font-size: 52px; color: var(--cinza-borda); margin-bottom: 14px; display: block; }
    .empty-state h3 { font-size: 16px; font-weight: 800; color: var(--texto-principal); margin-bottom: 6px; }
    .empty-state p { font-size: 13px; color: var(--cinza-texto); font-weight: 500; line-height: 1.6; }

    /* Leaflet override */
    .leaflet-container { font-family: 'Raleway', sans-serif !important; }
    .popup-posto { min-width: 160px; }
    .popup-posto strong { display: block; font-size: 12px; font-weight: 800; margin-bottom: 4px; }
    .popup-posto .pop-preco { font-size: 20px; font-weight: 900; color: var(--azul-vivo); }
    .popup-posto .pop-dist { font-size: 11px; color: var(--cinza-texto); }
    .popup-posto .pop-btn {
      display: block; width: 100%;
      margin-top: 8px; padding: 7px;
      background: var(--laranja); color: var(--branco);
      border: none; border-radius: 8px;
      font-family: 'Raleway', sans-serif;
      font-size: 11px; font-weight: 800;
      cursor: pointer;
    }
  </style>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
</head>
<body>

<!-- Loading -->
<div class="loading-overlay" id="loading">
  <div class="spinner"></div>
  <p>Buscando postos...</p>
</div>

<!-- Toast -->
<div id="toast"></div>

<!-- Modal Detalhe -->
<div class="modal-overlay" id="modal-overlay" onclick="fecharModal(event)">
  <div class="modal-sheet" id="modal-sheet">
    <div class="modal-handle"></div>
    <div id="modal-content"></div>
  </div>
</div>

<!-- Header -->
<header id="header">
  <div class="top-row">
    <div class="logo">
      <div class="logo-icon">⛽</div>
      <div class="logo-text">Rota<span>Posto</span></div>
    </div>
    <div class="header-actions">
      <button class="btn-icon" onclick="usarLocalizacao()" title="Usar minha localização">
        <i class="fas fa-crosshairs"></i>
      </button>
      <button class="btn-icon" onclick="abrirFiltros()" title="Configurações">
        <i class="fas fa-sliders-h"></i>
      </button>
    </div>
  </div>
  <div class="search-bar">
    <div class="search-wrap">
      <i class="fas fa-search"></i>
      <input type="text" id="busca-input" placeholder="Buscar cidade ou endereço..." autocomplete="off"/>
      <div id="sugestoes"></div>
    </div>
    <button class="btn-localizar" onclick="buscarPorInput()">
      <i class="fas fa-map-marker-alt"></i> Buscar
    </button>
  </div>
</header>

<!-- Tab bar header -->
<div id="tab-bar">
  <button class="tab-btn active" onclick="mudarTab('destaque', this)">
    <i class="fas fa-trophy"></i>Melhor
  </button>
  <button class="tab-btn" onclick="mudarTab('lista', this)">
    <i class="fas fa-list"></i>Lista
  </button>
  <button class="tab-btn" onclick="mudarTab('mapa', this)">
    <i class="fas fa-map"></i>Mapa
  </button>
  <button class="tab-btn" onclick="mudarTab('planejar', this)">
    <i class="fas fa-route"></i>Planejar
  </button>
</div>

<!-- ===== VIEW: DESTAQUE ===== -->
<div class="view active" id="view-destaque">
  <!-- Filtros combustível -->
  <div class="filtros-wrap">
    <button class="chip active" onclick="mudarCombustivel('gasolina', this)">
      <i class="fas fa-gas-pump"></i> Gasolina
    </button>
    <button class="chip" onclick="mudarCombustivel('etanol', this)">
      🌿 Etanol
    </button>
    <button class="chip" onclick="mudarCombustivel('diesel', this)">
      🚛 Diesel
    </button>
    <button class="chip" onclick="mudarCombustivel('gnv', this)">
      💨 GNV
    </button>
  </div>

  <div style="padding: 14px 16px 0;">
    <!-- Banner melhor posto -->
    <div class="banner-economia" id="banner-melhor">
      <div class="label">⭐ Melhor Posto Próximo</div>
      <h2 id="banner-nome">Buscando postos...</h2>
      <div class="endereco" id="banner-end">Ative a localização para começar</div>
      <div class="preco-destaque" id="banner-preco">
        <span class="cifra">R$</span>
        <span class="valor" id="banner-valor">–,–</span>
        <span class="cents" id="banner-cents"></span>
      </div>
      <div class="stats-grid" id="banner-stats">
        <div class="stat-box">
          <div class="stat-label">📍 Distância</div>
          <div class="stat-val laranja" id="stat-dist">–</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">💰 Você economiza</div>
          <div class="stat-val verde" id="stat-eco-litro">–</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">🛢️ Economia no tanque</div>
          <div class="stat-val verde" id="stat-eco-tanque">–</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">📊 Postos encontrados</div>
          <div class="stat-val" id="stat-total">–</div>
        </div>
      </div>
      <button class="btn-ir" id="btn-ir-melhor" onclick="irAoMelhorPosto()">
        <i class="fas fa-directions"></i> Ir até lá
      </button>
    </div>

    <!-- Lista top postos -->
    <div class="secao-titulo">
      <h3>📋 Ranking de Preços</h3>
      <a href="#" onclick="mudarTabNome('lista')">Ver todos →</a>
    </div>
    <div class="sort-tabs">
      <button class="sort-tab active" id="sort-preco" onclick="ordenarPor('preco')">
        💰 Menor Preço
      </button>
      <button class="sort-tab" id="sort-dist" onclick="ordenarPor('distancia')">
        📍 Mais Próximo
      </button>
    </div>
    <div id="lista-destaque"></div>
  </div>
</div>

<!-- ===== VIEW: LISTA ===== -->
<div class="view" id="view-lista">
  <div class="filtros-wrap">
    <button class="chip active" onclick="mudarCombustivelLista('gasolina', this)">⛽ Gasolina</button>
    <button class="chip" onclick="mudarCombustivelLista('etanol', this)">🌿 Etanol</button>
    <button class="chip" onclick="mudarCombustivelLista('diesel', this)">🚛 Diesel</button>
    <button class="chip" onclick="mudarCombustivelLista('gnv', this)">💨 GNV</button>
  </div>
  <div id="lista-postos" style="padding: 12px 16px;"></div>
</div>

<!-- ===== VIEW: MAPA ===== -->
<div class="view" id="view-mapa">
  <div id="map-container">
    <div id="map"></div>
  </div>
  <div class="map-overlay" id="map-overlay">
    <p style="font-size:13px; font-weight:700; color: var(--cinza-texto); text-align:center;">
      <i class="fas fa-map-marker-alt" style="color:var(--laranja)"></i>
      Toque em um posto no mapa para ver os preços
    </p>
  </div>
</div>

<!-- ===== VIEW: PLANEJAR ===== -->
<div class="view" id="view-planejar">
  <div class="planner-card">
    <h3><i class="fas fa-calculator"></i> Calculadora de Economia</h3>
    
    <div class="form-group">
      <label>Preço atual que você abastece (R$/L)</label>
      <input type="number" id="preco-atual" placeholder="Ex: 6.19" step="0.01" min="0"/>
    </div>
    <div class="form-group">
      <label>Melhor preço encontrado (R$/L)</label>
      <input type="number" id="melhor-preco" placeholder="Ex: 5.69" step="0.01" min="0"/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Litros no tanque cheio</label>
        <input type="number" id="litros-tanque" placeholder="Ex: 50" min="1" value="50"/>
      </div>
      <div class="form-group">
        <label>Consumo médio (km/L)</label>
        <input type="number" id="consumo-km" placeholder="Ex: 12" min="1" value="12"/>
      </div>
    </div>
    <button class="btn-ir" onclick="calcularEconomia()">
      <i class="fas fa-calculator"></i> Calcular Economia
    </button>
  </div>

  <div class="resultado-economia" id="resultado-economia">
    <h3>📊 Resultado da Simulação</h3>
    <div class="eco-row">
      <span class="eco-label">💰 Economia por litro</span>
      <span class="eco-val verde" id="eco-por-litro">–</span>
    </div>
    <div class="eco-row">
      <span class="eco-label">🛢️ Economia no tanque cheio</span>
      <span class="eco-val verde" id="eco-tanque">–</span>
    </div>
    <div class="eco-row">
      <span class="eco-label">💸 Valor atual (tanque cheio)</span>
      <span class="eco-val" id="eco-atual-total">–</span>
    </div>
    <div class="eco-row">
      <span class="eco-label">✅ Valor com melhor preço</span>
      <span class="eco-val" id="eco-melhor-total">–</span>
    </div>
    <div class="eco-row">
      <span class="eco-label">🚗 Autonomia estimada</span>
      <span class="eco-val" id="eco-km">–</span>
    </div>
  </div>

  <div class="planner-card" style="margin-top:14px;">
    <h3><i class="fas fa-route"></i> Calcular Rota até Posto</h3>
    <p style="font-size:12px; color: var(--cinza-texto); font-weight:500; margin-bottom:12px;">
      Clique em um posto na lista ou no mapa e use "Ir até lá" para traçar a rota.
    </p>
    <div id="rota-resultado" style="display:none;">
      <div class="eco-row" style="border-color:var(--cinza-borda);">
        <span style="font-size:12px;color:var(--cinza-texto);font-weight:600;">📍 Distância até o posto</span>
        <span style="font-size:15px;font-weight:800;" id="rota-dist">–</span>
      </div>
      <div class="eco-row" style="border-color:var(--cinza-borda);">
        <span style="font-size:12px;color:var(--cinza-texto);font-weight:600;">⏱️ Tempo estimado</span>
        <span style="font-size:15px;font-weight:800;" id="rota-tempo">–</span>
      </div>
      <button class="btn-ir" style="margin-top:12px;" onclick="abrirRotaOSM()">
        <i class="fas fa-external-link-alt"></i> Abrir no OpenStreetMap
      </button>
    </div>
  </div>
</div>

<!-- Bottom Nav -->
<nav id="bottom-nav">
  <button class="nav-btn active" id="nav-destaque" onclick="mudarNavTab('destaque')">
    <i class="fas fa-trophy"></i>
    Melhor
  </button>
  <button class="nav-btn" id="nav-lista" onclick="mudarNavTab('lista')">
    <i class="fas fa-list"></i>
    Lista
  </button>
  <button class="nav-btn" id="nav-mapa" onclick="mudarNavTab('mapa')">
    <i class="fas fa-map"></i>
    Mapa
  </button>
  <button class="nav-btn" id="nav-planejar" onclick="mudarNavTab('planejar')">
    <i class="fas fa-route"></i>
    Planejar
  </button>
</nav>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
// ═══ STATE ════════════════════════════════════════════════════════════════════
const state = {
  lat: -23.5505,
  lng: -46.6333,
  combustivel: 'gasolina',
  postos: [],
  tabAtiva: 'destaque',
  ordenacao: 'preco',
  map: null,
  marcadores: [],
  postoSelecionado: null,
  rotaUrl: null
};

// ═══ INIT ═════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  iniciarMapa();
  usarLocalizacao();
  configurarBusca();
});

// ═══ GEOLOCALIZAÇÃO ══════════════════════════════════════════════════════════
function usarLocalizacao() {
  if (!navigator.geolocation) {
    mostrarToast('Geolocalização não disponível');
    buscarPostos();
    return;
  }
  mostrarLoading('Obtendo sua localização...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.lat = pos.coords.latitude;
      state.lng = pos.coords.longitude;
      if (state.map) state.map.setView([state.lat, state.lng], 14);
      buscarPostos();
      mostrarToast('📍 Localização obtida!');
    },
    () => {
      ocultarLoading();
      mostrarToast('Localização negada, usando São Paulo');
      buscarPostos();
    },
    { timeout: 8000 }
  );
}

// ═══ BUSCA GEOCODE ════════════════════════════════════════════════════════════
function configurarBusca() {
  const input = document.getElementById('busca-input');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { ocultarSugestoes(); return; }
    timer = setTimeout(() => buscarGeocodeAutocomplete(q), 500);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { ocultarSugestoes(); buscarPorInput(); }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) ocultarSugestoes();
  });
}

async function buscarGeocodeAutocomplete(q) {
  try {
    const res = await fetch('/api/geocode?q=' + encodeURIComponent(q));
    const data = await res.json();
    mostrarSugestoes(data);
  } catch {}
}

function mostrarSugestoes(sugestoes) {
  const el = document.getElementById('sugestoes');
  if (!sugestoes.length) { el.classList.remove('visible'); return; }
  el.innerHTML = sugestoes.map((s, i) =>
    \`<div class="sugestao-item" onclick="selecionarSugestao(\${i})">
      <i class="fas fa-map-pin" style="color:var(--laranja);margin-right:6px;"></i>
      \${s.nome.split(',').slice(0, 3).join(', ')}
    </div>\`
  ).join('');
  el._sugestoes = sugestoes;
  el.classList.add('visible');
}

function selecionarSugestao(i) {
  const s = document.getElementById('sugestoes')._sugestoes[i];
  state.lat = s.lat;
  state.lng = s.lng;
  document.getElementById('busca-input').value = s.nome.split(',').slice(0, 2).join(', ');
  ocultarSugestoes();
  if (state.map) state.map.setView([state.lat, state.lng], 14);
  buscarPostos();
}

function ocultarSugestoes() {
  document.getElementById('sugestoes').classList.remove('visible');
}

function buscarPorInput() {
  ocultarSugestoes();
  buscarGeocodeAutocomplete(document.getElementById('busca-input').value);
  setTimeout(() => {
    const s = document.getElementById('sugestoes')._sugestoes;
    if (s && s.length) selecionarSugestao(0);
  }, 600);
}

// ═══ BUSCAR POSTOS ════════════════════════════════════════════════════════════
async function buscarPostos() {
  mostrarLoading('Buscando postos...');
  try {
    const url = \`/api/postos?lat=\${state.lat}&lng=\${state.lng}&combustivel=\${state.combustivel}&raio=15\`;
    const res = await fetch(url);
    const data = await res.json();
    state.postos = data.postos || [];
    state.estatisticas = data.estatisticas || {};
    renderizarDestaque();
    renderizarLista();
    atualizarMapa();
  } catch (e) {
    mostrarToast('Erro ao buscar postos');
  } finally {
    ocultarLoading();
  }
}

// ═══ RENDER DESTAQUE ══════════════════════════════════════════════════════════
function renderizarDestaque() {
  const postos = ordenarPostos(state.postos);
  if (!postos.length) {
    document.getElementById('banner-nome').textContent = 'Nenhum posto encontrado';
    document.getElementById('banner-end').textContent = 'Tente aumentar o raio de busca';
    document.getElementById('lista-destaque').innerHTML = gerarEmptyState();
    return;
  }

  const melhor = postos[0];
  const segundo = postos.find((p, i) => i > 0);
  const mediaPreco = state.estatisticas.mediaPreco || melhor.preco;

  // Banner
  document.getElementById('banner-nome').textContent = melhor.nome;
  document.getElementById('banner-end').textContent = melhor.endereco + ' · ' + melhor.cidade;

  const precoStr = melhor.preco.toFixed(2);
  const [int, dec] = precoStr.split('.');
  document.getElementById('banner-valor').textContent = int + ',';
  document.getElementById('banner-cents').textContent = dec;

  const dist = melhor.distancia < 1
    ? (melhor.distancia * 1000).toFixed(0) + 'm'
    : melhor.distancia.toFixed(1) + 'km';
  document.getElementById('stat-dist').textContent = dist;

  const econLitro = segundo ? (segundo.preco - melhor.preco) : (mediaPreco - melhor.preco);
  const ecoTanque = (econLitro * 50).toFixed(2);
  document.getElementById('stat-eco-litro').textContent = 'R$ ' + econLitro.toFixed(2) + '/L';
  document.getElementById('stat-eco-tanque').textContent = 'R$ ' + ecoTanque;
  document.getElementById('stat-total').textContent = postos.length + ' postos';

  // Lista ranking (top 5)
  const top = postos.slice(0, 5);
  document.getElementById('lista-destaque').innerHTML = top.map((p, i) =>
    gerarCardPosto(p, i, melhor.preco)
  ).join('');
}

// ═══ RENDER LISTA ═════════════════════════════════════════════════════════════
function renderizarLista() {
  const postos = ordenarPostos(state.postos);
  const container = document.getElementById('lista-postos');
  if (!postos.length) {
    container.innerHTML = gerarEmptyState(); return;
  }
  const menorPreco = postos.sort((a, b) => a.preco - b.preco)[0].preco;
  container.innerHTML = ordenarPostos(state.postos).map((p, i) =>
    gerarCardPosto(p, i, menorPreco)
  ).join('');
}

function gerarCardPosto(p, i, menorPreco) {
  const dist = p.distancia < 1
    ? (p.distancia * 1000).toFixed(0) + 'm'
    : p.distancia.toFixed(1) + 'km';

  const economiaPorLitro = (p.preco - menorPreco).toFixed(2);
  const isMelhor = i === 0 && state.ordenacao === 'preco';

  return \`
  <div class="card-posto \${isMelhor ? 'melhor-posto' : ''}" onclick="abrirModalPosto('\${p.id}')" style="animation-delay:\${i * 0.05}s">
    <div class="bandeira-box">
      <span class="bandeira-emoji">\${p.emoji || '⛽'}</span>
      <span class="bandeira-txt">\${p.bandeira.substring(0,7)}</span>
    </div>
    <div class="posto-info">
      <div class="posto-nome">\${p.nome}</div>
      <div class="posto-end">\${p.endereco}</div>
      <div class="posto-tags">
        <span class="badge badge-dist"><i class="fas fa-map-pin"></i> \${dist}</span>
        \${isMelhor ? '<span class="badge badge-melhor">⭐ Mais barato</span>' : ''}
        <span class="badge badge-atualizado">\${formatarData(p.atualizadoEm)}</span>
      </div>
    </div>
    <div class="posto-preco-col">
      <div class="preco \${isMelhor ? 'melhor' : ''}">R$ \${p.preco.toFixed(2)}</div>
      \${!isMelhor ? \`<div class="economia-txt">+R$ \${economiaPorLitro}/L</div>\` : '<div class="economia-txt verde">✓ Melhor preço</div>'}
    </div>
  </div>\`;
}

function gerarEmptyState() {
  return \`<div class="empty-state">
    <i class="fas fa-gas-pump"></i>
    <h3>Nenhum posto encontrado</h3>
    <p>Tente buscar uma cidade ou ative a geolocalização para encontrar postos próximos.</p>
  </div>\`;
}

// ═══ MAPA ════════════════════════════════════════════════════════════════════
function iniciarMapa() {
  if (state.map) return;
  state.map = L.map('map', {
    center: [state.lat, state.lng],
    zoom: 13,
    zoomControl: true
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(state.map);
}

function atualizarMapa() {
  if (!state.map) return;
  state.marcadores.forEach(m => state.map.removeLayer(m));
  state.marcadores = [];

  // Marcador do usuário
  const userIcon = L.divIcon({
    html: '<div style="width:18px;height:18px;background:#1565C0;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
    iconSize: [18, 18], iconAnchor: [9, 9], className: ''
  });
  L.marker([state.lat, state.lng], { icon: userIcon })
    .addTo(state.map)
    .bindPopup('<strong>📍 Você está aqui</strong>');

  // Marcadores dos postos
  state.postos.forEach((p, i) => {
    const isMelhor = i === 0 && state.ordenacao === 'preco';
    const cor = isMelhor ? '#00C853' : '#1565C0';
    const icon = L.divIcon({
      html: \`<div style="background:\${cor};color:white;padding:4px 7px;border-radius:8px;font-size:11px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;border:2px solid white;">R$ \${p.preco.toFixed(2)}</div>\`,
      className: '', iconAnchor: [20, 20]
    });

    const dist = p.distancia < 1
      ? (p.distancia * 1000).toFixed(0) + 'm'
      : p.distancia.toFixed(1) + 'km';

    const marcador = L.marker([p.lat, p.lng], { icon })
      .addTo(state.map)
      .bindPopup(\`<div class="popup-posto">
        <strong>\${p.nome}</strong>
        <div class="pop-preco">R$ \${p.preco.toFixed(2)}</div>
        <div class="pop-dist">📍 \${dist} de você</div>
        <button class="pop-btn" onclick="abrirModalPosto('\${p.id}')">Ver detalhes</button>
      </div>\`);
    state.marcadores.push(marcador);
  });

  if (state.postos.length > 0) {
    state.map.setView([state.lat, state.lng], 14);
  }
}

// ═══ MODAL POSTO ══════════════════════════════════════════════════════════════
function abrirModalPosto(id) {
  const posto = state.postos.find(p => p.id === id);
  if (!posto) return;
  state.postoSelecionado = posto;

  const combustiveis = [
    { key: 'gasolina', nome: 'Gasolina', icon: '⛽' },
    { key: 'etanol', nome: 'Etanol', icon: '🌿' },
    { key: 'diesel', nome: 'Diesel', icon: '🚛' },
    { key: 'gnv', nome: 'GNV', icon: '💨' }
  ];

  const menorPreco = Math.min(...state.postos.map(p => p.preco));
  const dist = posto.distancia < 1
    ? (posto.distancia * 1000).toFixed(0) + 'm'
    : posto.distancia.toFixed(1) + 'km';

  document.getElementById('modal-content').innerHTML = \`
    <div class="modal-bandeira-row">
      <div class="modal-bandeira-box">
        <span style="font-size:22px">\${posto.emoji}</span>
        <span style="font-size:9px;color:rgba(255,255,255,0.7);font-weight:800">\${posto.bandeira.substring(0,7)}</span>
      </div>
      <div>
        <div class="modal-nome">\${posto.nome}</div>
        <div class="modal-sub"><i class="fas fa-map-pin" style="color:var(--laranja)"></i> \${posto.endereco}, \${posto.cidade} • \${dist}</div>
        <div class="modal-sub">📅 Atualizado em \${formatarData(posto.atualizadoEm)}</div>
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;color:var(--cinza-texto);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Preços por Combustível</div>
    <div class="preco-combustiveis">
      \${combustiveis.map(c => {
        const preco = posto.precos[c.key];
        if (!preco) return '';
        const ativo = c.key === state.combustivel;
        const barato = preco === menorPreco;
        return \`<div class="preco-item \${ativo ? 'selecionado' : ''} \${barato ? 'mais-barato' : ''}">
          <div class="comb-nome">\${c.icon} \${c.nome}</div>
          <div class="comb-preco \${barato ? 'verde' : ''}">R$ \${preco.toFixed(2)}</div>
        </div>\`;
      }).join('')}
    </div>

    <div class="modal-btns">
      <button class="modal-btn modal-btn-primario" onclick="irAtePosto()">
        <i class="fas fa-directions"></i> Ir até lá
      </button>
      <button class="modal-btn modal-btn-sec" onclick="calcularRotaPosto()">
        <i class="fas fa-route"></i> Ver rota
      </button>
    </div>
  \`;

  document.getElementById('modal-overlay').classList.add('visible');
}

function fecharModal(e) {
  if (e.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').classList.remove('visible');
  }
}

function irAtePosto() {
  if (!state.postoSelecionado) return;
  const p = state.postoSelecionado;
  const url = \`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=\${state.lat}%2C\${state.lng}%3B\${p.lat}%2C\${p.lng}\`;
  window.open(url, '_blank');
  document.getElementById('modal-overlay').classList.remove('visible');
  mostrarToast('Abrindo rota no mapa...');
}

function irAoMelhorPosto() {
  const melhor = ordenarPostos(state.postos)[0];
  if (!melhor) { mostrarToast('Nenhum posto encontrado'); return; }
  state.postoSelecionado = melhor;
  irAtePosto();
}

async function calcularRotaPosto() {
  if (!state.postoSelecionado) return;
  const p = state.postoSelecionado;
  document.getElementById('modal-overlay').classList.remove('visible');
  mostrarLoading('Calculando rota...');
  try {
    const url = \`/api/rota?origemLat=\${state.lat}&origemLng=\${state.lng}&destinoLat=\${p.lat}&destinoLng=\${p.lng}\`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.distanciaKm) {
      state.rotaUrl = data.url_mapa;
      document.getElementById('rota-dist').textContent = data.distanciaKm + ' km';
      document.getElementById('rota-tempo').textContent = data.duracaoMin + ' minutos';
      document.getElementById('rota-resultado').style.display = 'block';
      mudarNavTab('planejar');
      mostrarToast('Rota calculada! Veja na aba Planejar');
    }
  } catch {
    mostrarToast('Erro ao calcular rota');
  } finally {
    ocultarLoading();
  }
}

function abrirRotaOSM() {
  if (state.rotaUrl) window.open(state.rotaUrl, '_blank');
}

// ═══ CALCULADORA ══════════════════════════════════════════════════════════════
async function calcularEconomia() {
  const precoAtual = parseFloat(document.getElementById('preco-atual').value);
  const melhorPreco = parseFloat(document.getElementById('melhor-preco').value);
  const litros = parseFloat(document.getElementById('litros-tanque').value);
  const consumo = parseFloat(document.getElementById('consumo-km').value);

  if (!precoAtual || !melhorPreco) {
    mostrarToast('Informe os preços para calcular');
    return;
  }

  try {
    const url = \`/api/economia?precoAtual=\${precoAtual}&melhorPreco=\${melhorPreco}&litros=\${litros}&consumo=\${consumo}\`;
    const res = await fetch(url);
    const data = await res.json();

    document.getElementById('eco-por-litro').textContent = 'R$ ' + data.economiaPorLitro.toFixed(2);
    document.getElementById('eco-tanque').textContent = 'R$ ' + data.economiaTanque.toFixed(2);
    document.getElementById('eco-atual-total').textContent = 'R$ ' + data.valorTotalAtual.toFixed(2);
    document.getElementById('eco-melhor-total').textContent = 'R$ ' + data.valorTotalMelhor.toFixed(2);
    document.getElementById('eco-km').textContent = data.kmTanque.toFixed(0) + ' km';

    document.getElementById('resultado-economia').classList.add('visible');
    mostrarToast('💰 Cálculo realizado!');

    // Preenche automaticamente com o melhor posto
    if (state.postos.length > 0) {
      const melhor = state.postos.sort((a, b) => a.preco - b.preco)[0];
      document.getElementById('melhor-preco').value = melhor.preco.toFixed(2);
    }
  } catch {
    mostrarToast('Erro ao calcular');
  }
}

// ═══ TABS ═════════════════════════════════════════════════════════════════════
function mudarTab(tab, btn) {
  mudarNavTab(tab);
}

function mudarNavTab(tab) {
  state.tabAtiva = tab;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('view-' + tab).classList.add('active');
  document.getElementById('nav-' + tab).classList.add('active');

  const tabIdx = ['destaque','lista','mapa','planejar'].indexOf(tab);
  document.querySelectorAll('.tab-btn')[tabIdx]?.classList.add('active');

  if (tab === 'mapa') {
    setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 200);
  }
}

function mudarTabNome(tab) {
  mudarNavTab(tab);
}

// ═══ COMBUSTÍVEL ══════════════════════════════════════════════════════════════
function mudarCombustivel(comb, btn) {
  state.combustivel = comb;
  document.querySelectorAll('#view-destaque .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  buscarPostos();
}

function mudarCombustivelLista(comb, btn) {
  state.combustivel = comb;
  document.querySelectorAll('#view-lista .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  buscarPostos();
}

// ═══ ORDENAÇÃO ════════════════════════════════════════════════════════════════
function ordenarPostos(postos) {
  if (!postos) return [];
  return [...postos].sort((a, b) =>
    state.ordenacao === 'preco' ? a.preco - b.preco : a.distancia - b.distancia
  );
}

function ordenarPor(tipo) {
  state.ordenacao = tipo;
  document.getElementById('sort-preco').classList.toggle('active', tipo === 'preco');
  document.getElementById('sort-dist').classList.toggle('active', tipo === 'distancia');
  renderizarDestaque();
  renderizarLista();
}

// ═══ UTILS ════════════════════════════════════════════════════════════════════
function mostrarLoading(msg) {
  const el = document.getElementById('loading');
  el.querySelector('p').textContent = msg || 'Carregando...';
  el.classList.add('visible');
}

function ocultarLoading() {
  document.getElementById('loading').classList.remove('visible');
}

function mostrarToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2800);
}

function formatarData(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function abrirFiltros() {
  mostrarToast('⚙️ Configurações em breve');
}
</script>
</body>
</html>`

  return c.html(html)
})

export default app
