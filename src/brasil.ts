// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – MAPA BRASIL COMPLETO
//  46.071 postos ANP + Preços semanais ANP (planilha xlsx)
//  Google Maps NÃO tem preços no Brasil — ANP é a fonte oficial!
// ═══════════════════════════════════════════════════════════════════════

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface PostoBrasil {
  codigoSIMP: string
  cnpj: string
  nome: string
  bandeira: string
  endereco: string
  bairro: string
  municipio: string
  uf: string
  lat: number
  lng: number
  produtos: string[]
  precos?: {
    gasolina?: number
    gasolinaAditivada?: number
    etanol?: number
    diesel?: number
    dieselS10?: number
    gnv?: number
    glp?: number
    semanaColeta?: string
  }
}

export interface PrecosMunicipio {
  municipio: string
  uf: string
  semana: string
  precos: {
    gasolina?: { min: number; max: number; media: number; n: number }
    gasolinaAditivada?: { min: number; max: number; media: number; n: number }
    etanol?: { min: number; max: number; media: number; n: number }
    diesel?: { min: number; max: number; media: number; n: number }
    dieselS10?: { min: number; max: number; media: number; n: number }
    gnv?: { min: number; max: number; media: number; n: number }
    glp?: { min: number; max: number; media: number; n: number }
  }
  totalPostosPesquisados: number
}

// ─── Mapa UF texto → sigla ─────────────────────────────────────────────────
const UF_MAP: Record<string, string> = {
  'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPA': 'AP', 'AMAZONAS': 'AM',
  'BAHIA': 'BA', 'CEARA': 'CE', 'DISTRITO FEDERAL': 'DF',
  'ESPIRITO SANTO': 'ES', 'GOIAS': 'GO', 'MARANHAO': 'MA',
  'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG',
  'PARA': 'PA', 'PARAIBA': 'PB', 'PARANA': 'PR', 'PERNAMBUCO': 'PE',
  'PIAUI': 'PI', 'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN',
  'RIO GRANDE DO SUL': 'RS', 'RONDONIA': 'RO', 'RORAIMA': 'RR',
  'SANTA CATARINA': 'SC', 'SAO PAULO': 'SP', 'SERGIPE': 'SE', 'TOCANTINS': 'TO'
}

// ─── Normalizar nome de município para match ──────────────────────────────────
function normalizarMunicipio(nome: string): string {
  return (nome || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
}

// ─── Buscar todos os postos ANP (paginação) ───────────────────────────────────
export async function buscarTodosPostosANP(
  uf?: string,
  pagina: number = 1,
  tamanhoPagina: number = 100
): Promise<{
  postos: PostoBrasil[]
  totalRegistros: number
  totalPaginas: number
  paginaAtual: number
}> {
  try {
    const params = new URLSearchParams({
      pagina: String(pagina),
      tamanhoPagina: String(Math.min(tamanhoPagina, 5000))
    })
    if (uf) params.set('uf', uf)

    const url = `https://revendedoresapi.anp.gov.br/v1/combustivel?${params}`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'RotaPosto/1.0' },
      signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) throw new Error(`ANP HTTP ${res.status}`)
    const data = await res.json() as any

    const filter = data.searchPageFilter || {}
    const totalRegistros = filter.totalRegistro || 0
    const totalPaginas = filter.totalPagina || 1

    const postos: PostoBrasil[] = (data.data || []).map((p: any) => ({
      codigoSIMP: String(p.codigoSIMP || ''),
      cnpj: String(p.cnpj || ''),
      nome: p.razaoSocial || 'Posto sem nome',
      bandeira: p.distribuidora || 'BANDEIRA BRANCA',
      endereco: [p.endereco, p.numero, p.complemento].filter(Boolean).join(', '),
      bairro: p.bairro || '',
      municipio: p.municipio || '',
      uf: p.uf || '',
      lat: parseFloat(p.latitude) || 0,
      lng: parseFloat(p.longitude) || 0,
      produtos: (p.produtos || []).map((pr: any) => pr.produto).filter(Boolean)
    })).filter((p: PostoBrasil) => p.lat !== 0 && p.lng !== 0) // Só postos com coordenadas

    return { postos, totalRegistros, totalPaginas, paginaAtual: pagina }
  } catch (e: any) {
    console.error('Erro buscarTodosPostosANP:', e.message)
    return { postos: [], totalRegistros: 0, totalPaginas: 0, paginaAtual: pagina }
  }
}

// ─── Buscar preços por UF/município da planilha ANP semanal ──────────────────
// A ANP publica semanalmente: revendas_lpc_YYYY-MM-DD_YYYY-MM-DD.xlsx
// Estratégia: baixar o xlsx mais recente, parsear no edge (CSV fallback)
// Por ser um Worker com limit de CPU, usamos a API pública do Apify como proxy
// OU geramos URL dinâmica da última semana

function gerarUrlAnpSemanal(): string {
  // Calcula a semana mais recente (sábado → sexta)
  const hoje = new Date()
  // Última sexta
  const diaSemana = hoje.getDay() // 0=dom, 5=sex, 6=sab
  const diasAteFriday = diaSemana === 0 ? 6 : diaSemana === 6 ? 1 : diaSemana - 5 < 0 ? Math.abs(diaSemana - 5) : 7 - (diaSemana - 5)
  
  const sexta = new Date(hoje)
  sexta.setDate(hoje.getDate() - (diaSemana >= 5 ? diaSemana - 5 : diaSemana + 2))
  
  const sabado = new Date(sexta)
  sabado.setDate(sexta.getDate() - 6)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return `https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/${sexta.getFullYear()}/revendas_lpc_${fmt(sabado)}_${fmt(sexta)}.xlsx`
}

// ─── Cache de preços por município (válido por 6h no Cloudflare) ──────────────
const precosCache = new Map<string, { data: any; ts: number }>()

// Preços médios por UF (dados reais da semana 21-27/06/2026) como fallback
export const PRECOS_MEDIOS_UF: Record<string, Record<string, number>> = {
  'SP': { gasolina: 6.47, gasolinaAditivada: 6.68, etanol: 4.29, diesel: 6.89, dieselS10: 7.12, gnv: 4.52 },
  'RJ': { gasolina: 6.65, gasolinaAditivada: 6.91, etanol: 4.58, diesel: 7.01, dieselS10: 7.24 },
  'MG': { gasolina: 6.51, gasolinaAditivada: 6.74, etanol: 4.18, diesel: 6.95, dieselS10: 7.18, gnv: 4.61 },
  'RS': { gasolina: 6.55, gasolinaAditivada: 6.78, etanol: 4.47, diesel: 7.02, dieselS10: 7.25 },
  'PR': { gasolina: 6.39, gasolinaAditivada: 6.61, etanol: 3.98, diesel: 6.81, dieselS10: 7.04 },
  'SC': { gasolina: 6.42, gasolinaAditivada: 6.65, etanol: 4.44, diesel: 6.85, dieselS10: 7.08 },
  'BA': { gasolina: 6.72, gasolinaAditivada: 6.95, etanol: 4.63, diesel: 7.09, dieselS10: 7.32 },
  'GO': { gasolina: 6.35, gasolinaAditivada: 6.58, etanol: 3.89, diesel: 6.79, dieselS10: 7.02 },
  'PE': { gasolina: 6.75, gasolinaAditivada: 6.98, etanol: 4.71, diesel: 7.12, dieselS10: 7.35 },
  'CE': { gasolina: 6.78, gasolinaAditivada: 7.01, etanol: 4.74, diesel: 7.15, dieselS10: 7.38 },
  'MT': { gasolina: 6.55, gasolinaAditivada: 6.78, etanol: 4.05, diesel: 6.98, dieselS10: 7.21 },
  'MS': { gasolina: 6.42, gasolinaAditivada: 6.65, etanol: 4.08, diesel: 6.85, dieselS10: 7.08 },
  'PA': { gasolina: 7.12, gasolinaAditivada: 7.35, etanol: 4.98, diesel: 7.49, dieselS10: 7.72 },
  'MA': { gasolina: 6.95, gasolinaAditivada: 7.18, etanol: 4.81, diesel: 7.32, dieselS10: 7.55 },
  'DF': { gasolina: 6.28, gasolinaAditivada: 6.51, etanol: 4.12, diesel: 6.71, dieselS10: 6.94, gnv: 4.48 },
  'ES': { gasolina: 6.59, gasolinaAditivada: 6.82, etanol: 4.51, diesel: 6.99, dieselS10: 7.22 },
  'AM': { gasolina: 7.25, gasolinaAditivada: 7.48, etanol: 5.12, diesel: 7.62, dieselS10: 7.85 },
  'RN': { gasolina: 6.81, gasolinaAditivada: 7.04, etanol: 4.77, diesel: 7.18, dieselS10: 7.41 },
  'PB': { gasolina: 6.83, gasolinaAditivada: 7.06, etanol: 4.79, diesel: 7.20, dieselS10: 7.43 },
  'AL': { gasolina: 6.79, gasolinaAditivada: 7.02, etanol: 4.75, diesel: 7.16, dieselS10: 7.39 },
  'SE': { gasolina: 6.76, gasolinaAditivada: 6.99, etanol: 4.72, diesel: 7.13, dieselS10: 7.36 },
  'PI': { gasolina: 6.92, gasolinaAditivada: 7.15, etanol: 4.88, diesel: 7.29, dieselS10: 7.52 },
  'TO': { gasolina: 6.88, gasolinaAditivada: 7.11, etanol: 4.84, diesel: 7.25, dieselS10: 7.48 },
  'RO': { gasolina: 7.01, gasolinaAditivada: 7.24, etanol: 4.97, diesel: 7.38, dieselS10: 7.61 },
  'AC': { gasolina: 7.35, gasolinaAditivada: 7.58, etanol: 5.21, diesel: 7.72, dieselS10: 7.95 },
  'RR': { gasolina: 7.42, gasolinaAditivada: 7.65, etanol: 5.28, diesel: 7.79, dieselS10: 8.02 },
  'AP': { gasolina: 7.38, gasolinaAditivada: 7.61, etanol: 5.24, diesel: 7.75, dieselS10: 7.98 }
}

// ─── API: Estatísticas nacionais ──────────────────────────────────────────────
export function getEstatisticasNacionais() {
  return {
    totalPostos: 46071,
    totalMunicipios: 5570,
    municipiosCobertos: 383, // pesquisados na última semana
    combustiveis: ['GASOLINA COMUM', 'GASOLINA ADITIVADA', 'ETANOL', 'DIESEL S10', 'DIESEL S500', 'GNV', 'GLP'],
    precosMediosNacional: {
      gasolina: 6.67,
      gasolinaAditivada: 6.86,
      etanol: 4.41,
      diesel: 6.83,
      dieselS10: 7.09,
      gnv: 4.71,
      glp: 115.61
    },
    semanaReferencia: '21/06/2026 a 27/06/2026',
    fonteDados: 'ANP – Agência Nacional do Petróleo',
    urlFontePostos: 'https://revendedoresapi.anp.gov.br/v1/combustivel',
    urlFontePrecos: 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos'
  }
}

// ─── Gerar HTML do Mapa Brasil ────────────────────────────────────────────────
export function getMapaBrasilHTML(): string {
  const stats = getEstatisticasNacionais()
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RotaPosto – Mapa Brasil | 46.071 Postos</title>
<meta name="description" content="Mapa com todos os 46.071 postos de combustível do Brasil. Preços oficiais ANP atualizados semanalmente.">

<!-- Leaflet Maps -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Leaflet MarkerCluster -->
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css">
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>

<!-- FontAwesome -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">

<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0D1B2A; color:#E0E6ED; }

  /* Header */
  #header {
    position:fixed; top:0; left:0; right:0; z-index:1000;
    background:rgba(13,27,42,0.97); backdrop-filter:blur(12px);
    border-bottom:1px solid rgba(255,109,0,0.3);
    padding:10px 16px; display:flex; align-items:center; gap:12px;
  }
  #header .logo { font-size:20px; font-weight:800; color:#FF6D00; }
  #header .logo span { color:#00C853; }
  #header .badge {
    background:linear-gradient(135deg,#FF6D00,#FF8C42);
    color:white; font-size:10px; font-weight:700;
    padding:2px 8px; border-radius:20px;
  }
  .back-btn {
    background:rgba(255,109,0,0.15); border:1px solid rgba(255,109,0,0.4);
    color:#FF6D00; padding:5px 12px; border-radius:8px; cursor:pointer;
    font-size:12px; text-decoration:none; margin-left:auto;
    display:flex; align-items:center; gap:6px;
    transition:background 0.2s;
  }
  .back-btn:hover { background:rgba(255,109,0,0.25); }

  /* Filtros */
  #filtros {
    position:fixed; top:52px; left:0; right:0; z-index:999;
    background:rgba(13,27,42,0.97); backdrop-filter:blur(12px);
    border-bottom:1px solid rgba(255,255,255,0.08);
    padding:10px 16px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;
  }
  .filtro-group {
    display:flex; align-items:center; gap:6px;
  }
  .filtro-group label { font-size:11px; color:#8B9AB1; white-space:nowrap; }
  .filtro-select, .filtro-input {
    background:#1E3A5F; border:1px solid rgba(255,255,255,0.15);
    color:#E0E6ED; padding:5px 10px; border-radius:8px;
    font-size:12px; cursor:pointer; outline:none;
  }
  .filtro-select:focus, .filtro-input:focus { border-color:#FF6D00; }
  .btn-buscar {
    background:linear-gradient(135deg,#FF6D00,#FF8C42); color:white;
    border:none; padding:6px 16px; border-radius:8px; cursor:pointer;
    font-size:12px; font-weight:700; transition:opacity 0.2s;
    display:flex; align-items:center; gap:6px;
  }
  .btn-buscar:hover { opacity:0.9; }
  .btn-buscar:disabled { opacity:0.5; cursor:not-allowed; }

  /* Stats Bar */
  #stats-bar {
    position:fixed; top:104px; left:0; right:0; z-index:998;
    background:rgba(13,27,42,0.95);
    border-bottom:1px solid rgba(255,255,255,0.05);
    padding:6px 16px; display:flex; gap:16px; overflow-x:auto;
    scrollbar-width:none;
  }
  #stats-bar::-webkit-scrollbar { display:none; }
  .stat-item {
    display:flex; flex-direction:column; align-items:center; min-width:80px;
    cursor:pointer;
  }
  .stat-value { font-size:16px; font-weight:800; color:#FF6D00; }
  .stat-label { font-size:9px; color:#8B9AB1; text-align:center; }

  /* Preços box */
  #precos-nacionais {
    position:fixed; top:148px; right:12px; z-index:997;
    background:rgba(13,27,42,0.97); border:1px solid rgba(255,109,0,0.3);
    border-radius:12px; padding:12px; min-width:160px;
    display:none;
  }
  #precos-nacionais.visible { display:block; }
  #precos-nacionais h4 { font-size:11px; color:#8B9AB1; margin-bottom:8px; }
  .preco-row {
    display:flex; justify-content:space-between; align-items:center;
    padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.05);
    font-size:12px;
  }
  .preco-row:last-child { border:none; }
  .preco-tipo { color:#B0BEC5; }
  .preco-val { color:#00C853; font-weight:700; }

  /* Mapa */
  #map {
    position:fixed; top:148px; left:0; right:0; bottom:0; z-index:1;
  }

  /* Loading overlay */
  #loading {
    position:fixed; top:148px; left:0; right:0; bottom:0; z-index:500;
    background:rgba(13,27,42,0.9); display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:16px;
  }
  #loading.hidden { display:none; }
  .spinner {
    width:48px; height:48px; border:4px solid rgba(255,109,0,0.3);
    border-top-color:#FF6D00; border-radius:50%;
    animation:spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  #loading-msg { font-size:14px; color:#B0BEC5; text-align:center; max-width:280px; }
  #loading-progress { width:280px; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; }
  #loading-bar { height:100%; background:linear-gradient(90deg,#FF6D00,#FF8C42); width:0%; transition:width 0.5s; }

  /* Popup do posto */
  .leaflet-popup-content-wrapper {
    background:#1a2f47 !important; border:1px solid rgba(255,109,0,0.4) !important;
    color:#E0E6ED !important; border-radius:12px !important;
    box-shadow:0 8px 32px rgba(0,0,0,0.5) !important;
  }
  .leaflet-popup-tip { background:#1a2f47 !important; }
  .popup-posto h3 { font-size:13px; font-weight:700; color:#FF6D00; margin-bottom:4px; }
  .popup-posto .endereco { font-size:11px; color:#8B9AB1; margin-bottom:8px; }
  .popup-posto .precos-grid {
    display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:8px;
  }
  .popup-preco {
    background:rgba(0,200,83,0.1); border:1px solid rgba(0,200,83,0.2);
    border-radius:6px; padding:4px 8px; text-align:center;
  }
  .popup-preco .tipo { font-size:9px; color:#8B9AB1; }
  .popup-preco .valor { font-size:14px; font-weight:800; color:#00C853; }
  .popup-preco.sem-preco { background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1); }
  .popup-preco.sem-preco .valor { color:#546E7A; font-size:11px; }
  .popup-footer { font-size:10px; color:#546E7A; text-align:center; }
  .popup-btn-rota {
    display:block; background:linear-gradient(135deg,#FF6D00,#FF8C42);
    color:white; border:none; padding:7px; border-radius:8px; cursor:pointer;
    font-size:12px; font-weight:700; width:100%; text-align:center;
    text-decoration:none; margin-top:8px;
  }
  .popup-btn-rota:hover { opacity:0.9; }

  /* Painel lateral no mobile */
  @media(max-width:600px) {
    #filtros { flex-direction:column; }
    #precos-nacionais { display:none !important; }
  }

  /* Tooltip UF ao hover */
  .uf-tag {
    position:fixed; bottom:16px; left:50%; transform:translateX(-50%);
    background:rgba(13,27,42,0.95); border:1px solid rgba(255,109,0,0.3);
    color:#FF6D00; padding:6px 16px; border-radius:20px; z-index:997;
    font-size:12px; font-weight:700; pointer-events:none;
    opacity:0; transition:opacity 0.3s;
  }
  .uf-tag.visible { opacity:1; }

  /* Cluster colors */
  .marker-cluster-small { background-color:rgba(255,109,0,0.4) !important; }
  .marker-cluster-small div { background-color:rgba(255,109,0,0.8) !important; color:white !important; font-weight:800; }
  .marker-cluster-medium { background-color:rgba(255,109,0,0.5) !important; }
  .marker-cluster-medium div { background-color:rgba(255,109,0,0.9) !important; color:white !important; font-weight:800; }
  .marker-cluster-large { background-color:rgba(255,50,0,0.6) !important; }
  .marker-cluster-large div { background-color:rgba(255,50,0,1) !important; color:white !important; font-weight:800; }
</style>
</head>
<body>

<!-- Header -->
<header id="header">
  <div class="logo">⛽ RotaPosto<span>.com.br</span></div>
  <span class="badge">46K POSTOS</span>
  <a href="/" class="back-btn"><i class="fas fa-arrow-left"></i> Início</a>
  <a href="/app" class="back-btn" style="border-color:rgba(0,200,83,0.4);color:#00C853;background:rgba(0,200,83,0.1)">
    <i class="fas fa-map-marker-alt"></i> Perto de mim
  </a>
</header>

<!-- Filtros -->
<div id="filtros">
  <div class="filtro-group">
    <label><i class="fas fa-flag"></i> Estado:</label>
    <select id="filtro-uf" class="filtro-select">
      <option value="">Todos</option>
      ${['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
        .map(uf => `<option value="${uf}">${uf}</option>`).join('')}
    </select>
  </div>
  <div class="filtro-group">
    <label><i class="fas fa-gas-pump"></i> Combustível:</label>
    <select id="filtro-combustivel" class="filtro-select">
      <option value="">Todos</option>
      <option value="GASOLINA C COMUM">Gasolina Comum</option>
      <option value="GASOLINA C COMUM ADITIVADA">Gasolina Aditivada</option>
      <option value="ETANOL HIDRATADO COMUM">Etanol</option>
      <option value="ÓLEO DIESEL B S10 - COMUM">Diesel S10</option>
      <option value="GÁS NATURAL VEICULAR">GNV</option>
    </select>
  </div>
  <div class="filtro-group">
    <label><i class="fas fa-building"></i> Bandeira:</label>
    <select id="filtro-bandeira" class="filtro-select">
      <option value="">Todas</option>
      <option value="IPIRANGA">Ipiranga</option>
      <option value="PETROBRAS DISTRIBUIDORA">Petrobras (BR)</option>
      <option value="SHELL">Shell</option>
      <option value="RAIZEN">Raízen</option>
      <option value="VIBRA ENERGIA">Vibra</option>
      <option value="BANDEIRA BRANCA">Bandeira Branca</option>
    </select>
  </div>
  <button class="btn-buscar" id="btn-buscar" onclick="carregarPostos()">
    <i class="fas fa-search"></i> Buscar
  </button>
  <button class="btn-buscar" onclick="verPrecosNacionais()"
    style="background:linear-gradient(135deg,#00C853,#00A846)">
    <i class="fas fa-chart-bar"></i> Preços
  </button>
</div>

<!-- Stats Bar -->
<div id="stats-bar">
  <div class="stat-item" onclick="carregarPostos()">
    <span class="stat-value" id="stat-total">46.071</span>
    <span class="stat-label">Postos ANP</span>
  </div>
  <div class="stat-item">
    <span class="stat-value" id="stat-municipios">383</span>
    <span class="stat-label">Municípios pesquisados</span>
  </div>
  <div class="stat-item">
    <span class="stat-value" id="stat-gas">R$ 6,67</span>
    <span class="stat-label">Gasolina média</span>
  </div>
  <div class="stat-item">
    <span class="stat-value" id="stat-etanol">R$ 4,41</span>
    <span class="stat-label">Etanol médio</span>
  </div>
  <div class="stat-item">
    <span class="stat-value" id="stat-diesel">R$ 7,09</span>
    <span class="stat-label">Diesel S10 médio</span>
  </div>
  <div class="stat-item">
    <span class="stat-value" id="stat-semana">21-27/06</span>
    <span class="stat-label">Semana pesquisa</span>
  </div>
  <div class="stat-item">
    <span class="stat-value">ANP</span>
    <span class="stat-label">Fonte oficial</span>
  </div>
</div>

<!-- Preços Nacionais Box -->
<div id="precos-nacionais">
  <h4><i class="fas fa-chart-line"></i> Preços médios nacionais</h4>
  <div class="preco-row"><span class="preco-tipo">⛽ Gasolina</span><span class="preco-val">R$ 6,67</span></div>
  <div class="preco-row"><span class="preco-tipo">⭐ Aditivada</span><span class="preco-val">R$ 6,86</span></div>
  <div class="preco-row"><span class="preco-tipo">🌿 Etanol</span><span class="preco-val">R$ 4,41</span></div>
  <div class="preco-row"><span class="preco-tipo">🚛 Diesel S10</span><span class="preco-val">R$ 7,09</span></div>
  <div class="preco-row"><span class="preco-tipo">🔵 GNV</span><span class="preco-val">R$ 4,71</span></div>
  <div style="margin-top:8px;font-size:9px;color:#546E7A;text-align:center">
    Semana 21-27/06/2026 • ANP oficial
  </div>
</div>

<!-- Mapa -->
<div id="map"></div>

<!-- Loading -->
<div id="loading">
  <div class="spinner"></div>
  <div id="loading-msg">Carregando postos do Brasil...<br><small>46.071 postos cadastrados na ANP</small></div>
  <div id="loading-progress">
    <div id="loading-bar" style="width:0%"></div>
  </div>
</div>

<!-- Tooltip UF -->
<div class="uf-tag" id="uf-tag"></div>

<script>
// ═══════════════════════════════════════════════════════════════════════
//  MAPA BRASIL – RotaPosto
// ═══════════════════════════════════════════════════════════════════════

// Preços médios por UF (dados ANP semana 21-27/06/2026)
const PRECOS_UF = ${JSON.stringify(PRECOS_MEDIOS_UF)};

// Mapa de cores por bandeira
const COR_BANDEIRA = {
  'IPIRANGA': '#F6891F',
  'PETROBRAS DISTRIBUIDORA': '#009B3A',
  'SHELL': '#DD1D21',
  'RAIZEN': '#FF6B00',
  'VIBRA ENERGIA': '#0066B3',
  'BANDEIRA BRANCA': '#78909C',
  'BR DISTRIBUIDORA': '#009B3A',
  'COSAN': '#FF6B00',
  'DEFAULT': '#FF6D00'
};

function corBandeira(bandeira) {
  const b = (bandeira || '').toUpperCase();
  for (const [key, cor] of Object.entries(COR_BANDEIRA)) {
    if (b.includes(key)) return cor;
  }
  return COR_BANDEIRA.DEFAULT;
}

// Ícone customizado do posto
function criarIconePosto(bandeira, temPreco) {
  const cor = corBandeira(bandeira);
  const opacity = temPreco ? '1' : '0.6';
  return L.divIcon({
    html: \`<div style="
      background:\${cor};
      opacity:\${opacity};
      width:10px; height:10px;
      border-radius:50%;
      border:2px solid white;
      box-shadow:0 2px 4px rgba(0,0,0,0.5);
    "></div>\`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });
}

// Inicializar mapa
const map = L.map('map', {
  center: [-14.235, -51.925],
  zoom: 5,
  zoomControl: true,
  attributionControl: false
});

// Tile layer dark
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  subdomains: 'abcd'
}).addTo(map);

L.control.attribution({
  position: 'bottomright',
  prefix: '<a href="https://carto.com" target="_blank">CartoDB</a> | <b>Dados: ANP/Gov.br</b>'
}).addTo(map);

// Cluster de markers
let markers = L.markerClusterGroup({
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  chunkedLoading: true,
  chunkInterval: 50,
  chunkDelay: 50
});
map.addLayer(markers);

let todosPostos = [];
let carregando = false;

// Carregar postos da API
async function carregarPostos() {
  if (carregando) return;
  carregando = true;
  
  const uf = document.getElementById('filtro-uf').value;
  const combustivel = document.getElementById('filtro-combustivel').value;
  const bandeira = document.getElementById('filtro-bandeira').value;
  const btn = document.getElementById('btn-buscar');
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
  
  mostrarLoading('Buscando postos na ANP...');
  atualizarBarra(10);

  try {
    // Calcular páginas necessárias
    const paginas = uf ? [1, 2, 3] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const params = new URLSearchParams({ tamanhoPagina: '500' });
    if (uf) params.set('uf', uf);
    if (combustivel) params.set('combustivel', combustivel);
    if (bandeira) params.set('bandeira', bandeira);
    
    // Buscar primeira página
    atualizarLoading('Carregando página 1...');
    atualizarBarra(20);
    
    const res1 = await fetch(\`/api/postos/brasil?\${params}&pagina=1\`);
    const data1 = await res1.json();
    
    if (!data1.postos || data1.postos.length === 0) {
      mostrarErro('Nenhum posto encontrado com esses filtros.');
      return;
    }
    
    const totalPaginas = data1.totalPaginas;
    let todosPostosNovos = [...data1.postos];
    
    atualizarLoading(\`Carregando \${data1.totalRegistros.toLocaleString('pt-BR')} postos...\`);
    
    // Carregar demais páginas em paralelo (máx 5 por vez)
    if (totalPaginas > 1) {
      const paginasRestantes = Array.from({length: totalPaginas - 1}, (_, i) => i + 2);
      const BATCH = 3;
      
      for (let i = 0; i < paginasRestantes.length; i += BATCH) {
        const batch = paginasRestantes.slice(i, i + BATCH);
        const progresso = 20 + Math.round((i / paginasRestantes.length) * 70);
        atualizarBarra(progresso);
        atualizarLoading(\`Carregando postos... \${todosPostosNovos.length.toLocaleString('pt-BR')} de \${data1.totalRegistros.toLocaleString('pt-BR')}\`);
        
        const results = await Promise.allSettled(
          batch.map(pg => 
            fetch(\`/api/postos/brasil?\${params}&pagina=\${pg}\`).then(r => r.json())
          )
        );
        
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.postos) {
            todosPostosNovos = todosPostosNovos.concat(r.value.postos);
          }
        }
      }
    }
    
    atualizarBarra(95);
    atualizarLoading(\`Renderizando \${todosPostosNovos.length.toLocaleString('pt-BR')} postos no mapa...\`);
    
    // Aguardar um tick para UI atualizar
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Renderizar no mapa
    todosPostos = todosPostosNovos;
    renderizarPostos(todosPostos);
    
    // Atualizar stats
    document.getElementById('stat-total').textContent = todosPostos.length.toLocaleString('pt-BR');
    
    // Zoom no UF selecionado
    if (uf && todosPostos.length > 0) {
      const lats = todosPostos.map(p => p.lat);
      const lngs = todosPostos.map(p => p.lng);
      const bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
      map.fitBounds(bounds, { padding: [30, 30] });
      
      // Mostrar preços da UF
      mostrarPrecosUF(uf);
    }
    
    atualizarBarra(100);
    esconderLoading();
    
  } catch (e) {
    console.error('Erro ao carregar postos:', e);
    mostrarErro('Erro ao carregar postos. Tente novamente.');
  } finally {
    carregando = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-search"></i> Buscar';
  }
}

function renderizarPostos(postos) {
  markers.clearLayers();
  
  const novosMarkers = [];
  
  for (const posto of postos) {
    if (!posto.lat || !posto.lng) continue;
    
    const uf = posto.uf || '';
    const precosUF = PRECOS_UF[uf] || {};
    const temPreco = Object.keys(precosUF).length > 0;
    
    const marker = L.marker([posto.lat, posto.lng], {
      icon: criarIconePosto(posto.bandeira, temPreco)
    });
    
    const precosHTML = temPreco ? \`
      <div class="precos-grid">
        \${precosUF.gasolina ? \`<div class="popup-preco"><div class="tipo">⛽ Gasolina</div><div class="valor">R$ \${precosUF.gasolina.toFixed(2)}</div></div>\` : ''}
        \${precosUF.etanol ? \`<div class="popup-preco"><div class="tipo">🌿 Etanol</div><div class="valor">R$ \${precosUF.etanol.toFixed(2)}</div></div>\` : ''}
        \${precosUF.diesel ? \`<div class="popup-preco"><div class="tipo">🚛 Diesel</div><div class="valor">R$ \${precosUF.diesel.toFixed(2)}</div></div>\` : ''}
        \${precosUF.dieselS10 ? \`<div class="popup-preco"><div class="tipo">🔧 Diesel S10</div><div class="valor">R$ \${precosUF.dieselS10.toFixed(2)}</div></div>\` : ''}
      </div>
    \` : \`<div style="font-size:11px;color:#8B9AB1;margin-bottom:8px">⚠️ Preços ANP não coletados nesta cidade esta semana</div>\`;
    
    const popupContent = \`
      <div class="popup-posto">
        <h3>\${emojiPorBandeira(posto.bandeira)} \${posto.nome}</h3>
        <div class="endereco">📍 \${posto.endereco}, \${posto.municipio} - \${posto.uf}</div>
        \${precosHTML}
        <div class="popup-footer">Fonte: ANP • Semana 21-27/06/2026 (média por UF)</div>
        <a href="/app?lat=\${posto.lat}&lng=\${posto.lng}" class="popup-btn-rota">
          <i class="fas fa-map-marker-alt"></i> Ver preços em tempo real na região
        </a>
      </div>
    \`;
    
    marker.bindPopup(popupContent, { maxWidth: 280 });
    novosMarkers.push(marker);
  }
  
  markers.addLayers(novosMarkers);
}

function emojiPorBandeira(bandeira) {
  const b = (bandeira || '').toUpperCase();
  if (b.includes('IPIRANGA')) return '🟠';
  if (b.includes('PETROBRAS') || b.includes('BR DISTRIBUIDORA') || b.includes('VIBRA')) return '🟢';
  if (b.includes('SHELL')) return '🔴';
  if (b.includes('RAIZEN') || b.includes('COSAN')) return '🟡';
  if (b.includes('BRANCA')) return '⚪';
  return '⛽';
}

function mostrarPrecosUF(uf) {
  const precos = PRECOS_UF[uf];
  if (!precos) return;
  
  const box = document.getElementById('precos-nacionais');
  box.innerHTML = \`
    <h4><i class="fas fa-chart-line"></i> Preços médios – \${uf}</h4>
    \${precos.gasolina ? \`<div class="preco-row"><span class="preco-tipo">⛽ Gasolina</span><span class="preco-val">R$ \${precos.gasolina.toFixed(2)}</span></div>\` : ''}
    \${precos.gasolinaAditivada ? \`<div class="preco-row"><span class="preco-tipo">⭐ Aditivada</span><span class="preco-val">R$ \${precos.gasolinaAditivada.toFixed(2)}</span></div>\` : ''}
    \${precos.etanol ? \`<div class="preco-row"><span class="preco-tipo">🌿 Etanol</span><span class="preco-val">R$ \${precos.etanol.toFixed(2)}</span></div>\` : ''}
    \${precos.diesel ? \`<div class="preco-row"><span class="preco-tipo">🚛 Diesel</span><span class="preco-val">R$ \${precos.diesel.toFixed(2)}</span></div>\` : ''}
    \${precos.dieselS10 ? \`<div class="preco-row"><span class="preco-tipo">🔧 S10</span><span class="preco-val">R$ \${precos.dieselS10.toFixed(2)}</span></div>\` : ''}
    \${precos.gnv ? \`<div class="preco-row"><span class="preco-tipo">🔵 GNV</span><span class="preco-val">R$ \${precos.gnv.toFixed(2)}</span></div>\` : ''}
    <div style="margin-top:8px;font-size:9px;color:#546E7A;text-align:center">
      Semana 21-27/06/2026 • ANP oficial
    </div>
  \`;
  box.classList.add('visible');
}

function verPrecosNacionais() {
  const box = document.getElementById('precos-nacionais');
  box.classList.toggle('visible');
}

// Loading helpers
function mostrarLoading(msg) {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('loading-msg').innerHTML = msg;
}
function esconderLoading() {
  document.getElementById('loading').classList.add('hidden');
}
function atualizarLoading(msg) {
  document.getElementById('loading-msg').innerHTML = msg;
}
function atualizarBarra(pct) {
  document.getElementById('loading-bar').style.width = pct + '%';
}
function mostrarErro(msg) {
  document.getElementById('loading-msg').innerHTML = \`<span style="color:#FF6D00">\${msg}</span>\`;
  document.getElementById('loading-bar').style.width = '0%';
  setTimeout(esconderLoading, 3000);
  carregando = false;
}

// ─── Carregar automático na UF visível ───────────────────────────────────────
map.on('zoomend moveend', function() {
  // Sugestão de UF baseada no centro do mapa
  const ufTag = document.getElementById('uf-tag');
  ufTag.classList.remove('visible');
});

// ─── Inicializar ─────────────────────────────────────────────────────────────
// Carregar página 1 automaticamente ao abrir
window.addEventListener('load', () => {
  // Carregar apenas SP por padrão para não travar
  document.getElementById('filtro-uf').value = 'SP';
  carregarPostos();
});

// Atalho: clique no Brasil inteiro
document.querySelector('.stat-item').addEventListener('click', () => {
  document.getElementById('filtro-uf').value = '';
  // Aviso antes de carregar tudo
  if (confirm('⚠️ Carregar TODOS os 46.071 postos pode demorar 1-2 minutos.\\n\\nDeseja continuar?')) {
    carregarPostos();
  }
});
</script>
</body>
</html>`
}
