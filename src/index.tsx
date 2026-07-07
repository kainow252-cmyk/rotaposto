import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getLandingHTML } from './landing'
import { getLandingOnboardingHTML } from './onboarding'
import { getAppHTML } from './app'
import {
  getAnpXlsxUrlCandidates,
  processarXlsxAnp,
  salvarPrecoKV,
  carregarPrecoKV,
  getSemanaANPAtual,
  type ANPSyncResult
} from './anp_sync'
import {
  buscarPostosANP,
  buscarPostosOSM,
  buscarPostosGooglePlaces,
  geocodeReverso,
  geocodeNominatim,
  calcularRotaOSRM,
  rankearPostosPorIA,
  mergePostos,
  emojiPorBandeira,
  haversine,
  type PostoReal,
  type EconomiaPosto
} from './apis'
import { FIREBASE_CONFIG, GOOGLE_CLIENT_ID, GOOGLE_API_KEY, getFirebaseAuthScripts } from './auth'
import {
  criarAssinaturaPIX,
  verificarPagamento,
  verificarAssinatura,
  cancelarAssinatura,
  parsearWebhook,
  PLANOS
} from './woovi'
import {
  criarAssinaturaCartao,
  consultarAssinaturaMP,
  cancelarAssinaturaMP,
  interpretarWebhookMP,
  verificarPagamentoMP,
  validarAssinaturaWebhookMP,
  MP_PLANOS
} from './mercadopago'
import {
  buscarTodosPostosANP,
  getMapaBrasilHTML,
  getEstatisticasNacionaisANP,
  PRECOS_ANP_POR_UF,
  PRECOS_ANP_POR_MUNICIPIO,
  getPrecoANPPorUF,
  getPrecoANPPorMunicipio,
  getMunicipiosDisponiveis,
  ANP_SEMANA,
} from './brasil'
import { getParceriasLandingHTML, getPainelEmpresaHTML, getPainelLoginHTML, getValidadorHTML } from './parcerias'

// Alias de compatibilidade — mantido para endpoints legados
const getEstatisticasNacionais = getEstatisticasNacionaisANP
const PRECOS_MEDIOS_UF = Object.fromEntries(
  Object.entries(PRECOS_ANP_POR_UF).map(([uf, p]) => [
    uf,
    Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.media]))
  ])
)

// ─── Bindings do Cloudflare ─────────────────────────────────────────────────
// KV removido: plataforma hospedada usa fallback estático para preços ANP
// Assets estáticos servidos automaticamente pelo binding ASSETS
type Bindings = {
  ROTAPOSTO_KV: KVNamespace
  ROTAPOSTO_R2: R2Bucket
  [key: string]: unknown
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

// ─── Proxy de Assets Estáticos ────────────────────────────────────────────────
// O Worker standalone não tem binding ASSETS, então fazemos proxy
// para o Cloudflare Pages que tem os arquivos (icons, static, logo)
const PAGES_ASSETS_URL = 'https://rotaposto.pages.dev'

app.use('/icons/*', async (c) => {
  const url = PAGES_ASSETS_URL + c.req.path
  const res = await fetch(url)
  if (!res.ok) return c.notFound()
  const body = await res.arrayBuffer()
  const ct = res.headers.get('content-type') || 'image/png'
  return new Response(body, {
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    }
  })
})

app.use('/static/*', async (c) => {
  const url = PAGES_ASSETS_URL + c.req.path
  const res = await fetch(url)
  if (!res.ok) return c.notFound()
  const body = await res.arrayBuffer()
  const ct = res.headers.get('content-type') || 'application/octet-stream'
  return new Response(body, {
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    }
  })
})

app.get('/logo-rotaposto.png', async (c) => {
  const res = await fetch(PAGES_ASSETS_URL + '/logo-rotaposto.png')
  if (!res.ok) return c.notFound()
  const body = await res.arrayBuffer()
  return new Response(body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    }
  })
})

// ─── Proxy Firebase Auth Handler (/__/auth/*) ────────────────────────────────
// Firebase signInWithPopup/signInWithRedirect requer que authDomain sirva /__/auth/handler
// rotaposto.com.br não é Firebase Hosting, então fazemos proxy para rotaposto-32e33.firebaseapp.com
// Isso permite usar authDomain: "rotaposto.com.br" e o Google aceita o popup/redirect
app.use('/__/auth/*', async (c) => {
  const firebaseDomain = 'https://rotaposto-32e33.firebaseapp.com'
  const targetUrl = firebaseDomain + c.req.path + (c.req.url.includes('?') ? '?' + c.req.url.split('?')[1] : '')
  const res = await fetch(targetUrl, {
    method: c.req.method,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': c.req.header('accept') || '*/*',
      'Accept-Language': c.req.header('accept-language') || 'pt-BR,pt;q=0.9',
    },
    body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? await c.req.arrayBuffer() : undefined,
  })
  const body = await res.arrayBuffer()
  const ct = res.headers.get('content-type') || 'text/html'
  return new Response(body, {
    status: res.status,
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'no-cache, no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  })
})

// ─── DEBUG: inspecionar bindings + testar R2 read/write no runtime ───────────
// Versão atual do SW — usada pelo SW para auto-verificar se está desatualizado
app.get('/api/sw-version', (c) => {
  return c.json({ version: 'v17', build: '20260706a' })
})

app.get('/api/debug/env', async (c) => {
  const env = c.env as Record<string, unknown>
  const keys = Object.keys(env || {})
  const r2 = env?.ROTAPOSTO_R2 as R2Bucket | undefined
  const kv = env?.ROTAPOSTO_KV

  // Testa write + read no R2
  let r2_write_ok = false
  let r2_read_ok = false
  let r2_write_error = ''
  let r2_read_error = ''
  if (r2) {
    try {
      await r2.put('debug--test', JSON.stringify({ ts: Date.now() }))
      r2_write_ok = true
    } catch (e) { r2_write_error = String(e) }
    try {
      const obj = await r2.get('debug--test')
      r2_read_ok = obj !== null
    } catch (e) { r2_read_error = String(e) }
  }

  return c.json({
    env_keys: keys,
    ROTAPOSTO_R2_type: typeof r2,
    ROTAPOSTO_R2_is_undefined: r2 === undefined,
    ROTAPOSTO_R2_constructor: r2 ? (r2 as object).constructor?.name : null,
    r2_write_ok,
    r2_write_error,
    r2_read_ok,
    r2_read_error,
    ROTAPOSTO_KV_type: typeof kv,
  })
})

// ─── Headers COOP/COEP: necessário para signInWithPopup do Firebase funcionar ─
// Firebase Auth recomenda unsafe-none para evitar warning "window.closed blocked"
// same-origin-allow-popups ainda bloqueia window.closed em Chrome/TWA
app.use('*', async (c, next) => {
  await next()
  // unsafe-none: permite Firebase verificar window.closed no popup OAuth
  // Não afeta segurança: não usamos SharedArrayBuffer nem Atomics
  c.res.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none')
  c.res.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none')
  // Preservar Cache-Control do assetlinks.json (não sobrescrever com cache do CDN)
  if (c.req.path === '/.well-known/assetlinks.json') {
    c.res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    c.res.headers.set('Pragma', 'no-cache')
    c.res.headers.set('Expires', '0')
  }
})

// ─── Cache em memória (válido por 10 min por cidade) ─────────────────────────
interface CacheEntry {
  postos: PostoReal[]
  ts: number
}
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

function getCached(key: string): PostoReal[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.postos
}

function setCached(key: string, postos: PostoReal[]): void {
  cache.set(key, { postos, ts: Date.now() })
  // Limitar tamanho do cache
  if (cache.size > 50) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
    cache.delete(oldest[0])
  }
}

// ─── Cache CombustívelAPI (preços Petrobras) — TTL 2h ────────────────────────
interface CombustivelCacheEntry { data: any; ts: number }
let combustivelCache: CombustivelCacheEntry | null = null
const COMBUSTIVEL_TTL = 2 * 60 * 60 * 1000 // 2 horas

async function fetchPrecosDistribuidora(): Promise<any | null> {
  if (combustivelCache && Date.now() - combustivelCache.ts < COMBUSTIVEL_TTL) {
    return combustivelCache.data
  }
  try {
    const res = await fetch('https://combustivelapi.com.br/api/precos/', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return combustivelCache?.data ?? null
    const json = await res.json() as any
    if (!json?.error && json?.precos) {
      combustivelCache = { data: json, ts: Date.now() }
      return json
    }
    return combustivelCache?.data ?? null
  } catch {
    return combustivelCache?.data ?? null
  }
}

// Converter preço string "6,46" -> número 6.46
function parsePrecoPetrobras(s: string): number | null {
  if (!s) return null
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? null : n
}

// ─── API: Postos próximos (ANP + OSM + IA de Economia) ───────────────────────
app.get('/api/postos', async (c) => {
  const lat = parseFloat(c.req.query('lat') || '-23.5505')
  const lng = parseFloat(c.req.query('lng') || '-46.6333')
  const raio = parseFloat(c.req.query('raio') || '10')
  const combustivel = (c.req.query('combustivel') || 'gasolina') as keyof PostoReal['precos']
  const litros = parseFloat(c.req.query('litros') || '50')
  const consumo = parseFloat(c.req.query('consumo') || '12')

  try {
    // 1. Geocode reverso para obter cidade/UF do GPS
    let uf = 'SP'
    let municipio = 'SAO PAULO'

    const geo = await geocodeReverso(lat, lng)
    if (geo?.uf) uf = geo.uf
    if (geo?.cidade) municipio = geo.cidade

    // Semana ANP dinâmica (KV tem prioridade, fallback calcula pela data atual)
    const kvForSemana = getKV(c.env) || undefined
    const metaSemana = kvForSemana ? await kvForSemana.get('anp:meta', 'json') as any : null
    const semanaANP = metaSemana?.semana
      || (() => { const s = getSemanaANPAtual(); return `${s.inicio} a ${s.fim}` })()

    // 2. Checar cache
    const cacheKey = `${uf}:${municipio}`
    let postosBase = getCached(cacheKey)

    if (!postosBase) {
      // 3. Buscar em paralelo: ANP + Google Places + OSM
      const kv = getKV(c.env) || undefined
      // Chave Places para servidor: secret GOOGLE_PLACES_KEY tem prioridade
      // (sem restrição de referenciador HTTP — própria para chamadas server-side)
      // Fallback: GOOGLE_API_KEY hardcoded (restrita a referenciadores HTTP, pode falhar)
      const googleKey = (c.env as any)?.GOOGLE_PLACES_KEY as string || GOOGLE_API_KEY || ''
      const raioGoogle = Math.min(raio * 1000, 50000) // até 50km para Google
      const raioOSM = Math.min(raio * 1000, 50000)   // até 50km para OSM

      const [anpRes, googleRes, osmRes] = await Promise.allSettled([
        buscarPostosANP(uf, municipio, 1, kv),
        buscarPostosGooglePlaces(lat, lng, raioGoogle, googleKey),
        buscarPostosOSM(lat, lng, raioOSM)
      ])

      const anp = anpRes.status === 'fulfilled' ? anpRes.value : []
      const google = googleRes.status === 'fulfilled' ? googleRes.value : []
      const osm = osmRes.status === 'fulfilled' ? osmRes.value : []


      // 4. Merge deduplicado: ANP(preços reais) + Google(dados ricos) + OSM(cobertura)
      postosBase = mergePostos(anp, osm, 0.08, google)
      setCached(cacheKey, postosBase)
    }

    // 5. Filtrar por raio e presença do combustível solicitado
    const noRaio = postosBase.filter(p => {
      const dist = haversine(lat, lng, p.lat, p.lng)
      return dist <= raio && p.precos[combustivel]
    })

    if (noRaio.length === 0) {
      // Fallback: OSM sem filtro de cidade (busca por coordenadas)
      const osmFallback = await buscarPostosOSM(lat, lng, Math.min(raio * 1000, 50000))
      const fallbackComCombustivel = osmFallback.filter(p => p.precos[combustivel])

      if (fallbackComCombustivel.length === 0) {
        return c.json({ error: 'Nenhum posto encontrado neste raio', postos: [], fonte: 'vazio' })
      }

      const rankeados = rankearPostosPorIA(fallbackComCombustivel, lat, lng, combustivel, litros, consumo)
      return buildResponse(rankeados, combustivel, 'osm_fallback')
    }

    // 6. Ranking com IA de Economia
    const fontes = [...new Set(postosBase.map(p => p.fonte))].join('+')
    const temAnp = postosBase.some(p => p.fonte === 'anp')
    const temGoogle = postosBase.some(p => p.googlePlaceId)
    const fonteLabel = temAnp ? (temGoogle ? 'anp+google+osm' : 'anp+osm') : (temGoogle ? 'google+osm' : 'osm')
    const rankeados = rankearPostosPorIA(noRaio, lat, lng, combustivel, litros, consumo)
    return buildResponse(rankeados, combustivel, fonteLabel)

    function buildResponse(rankeados: EconomiaPosto[], combustivel: keyof PostoReal['precos'], fonte: string) {
      if (rankeados.length === 0) {
        return c.json({ error: 'Nenhum posto com esse combustível', postos: [], fonte })
      }

      const menorPreco = rankeados[0].precos[combustivel]!
      const maiorPreco = Math.max(...rankeados.map(p => p.precos[combustivel] || 0))
      const mediaPreco = rankeados.reduce((s, p) => s + (p.precos[combustivel] || 0), 0) / rankeados.length

      return c.json({
        postos: rankeados.map(p => ({
          id: p.id,
          nome: p.nome,
          bandeira: p.bandeira,
          endereco: p.endereco,
          bairro: p.bairro,
          cidade: p.cidade,
          estado: p.estado,
          lat: p.lat,
          lng: p.lng,
          precos: p.precos,
          atualizadoEm: p.atualizadoEm,
          fontePreco: p.fontePreco,
          fonte: p.fonte,
          // Dados ricos do Google Places
          rating: p.rating,
          totalAvaliacoes: p.totalAvaliacoes,
          telefone: p.telefone,
          aberto: p.aberto,
          fotoUrl: p.fotoUrl,
          googlePlaceId: p.googlePlaceId,
          // Campos calculados
          distancia: Math.round(p.distancia * 100) / 100,
          preco: p.precos[combustivel],
          emoji: emojiPorBandeira(p.bandeira),
          rank: p.rank,
          score: Math.round(p.score * 100) / 100,
          economiaPorLitro: p.economiaPorLitro,
          economiaTanque: p.economiaTanque,
          custoDeslocamento: p.custoDeslocamento,
          melhor: p.rank === 1
        })),
        estatisticas: {
          totalPostos: rankeados.length,
          menorPreco: Math.round(menorPreco * 100) / 100,
          maiorPreco: Math.round(maiorPreco * 100) / 100,
          mediaPreco: Math.round(mediaPreco * 100) / 100,
          combustivel,
          cidade: municipio,
          uf,
          fonte,
          semanaANP
        }
      })
    }
  } catch (e: any) {
    console.error('Erro /api/postos:', e)
    return c.json({ error: 'Erro ao buscar postos: ' + (e?.message || 'erro desconhecido'), postos: [] }, 500)
  }
})

// ─── API: Preços colaborativos (reportar preço) + Gamificação ─────────────────
interface PrecoReporte {
  postoId: string
  postoNome?: string
  combustivel: string
  preco: number
  lat: number
  lng: number
  ts: number
  confirmacoes: number
  userId?: string
  userName?: string
}

interface ContribuicaoUsuario {
  userId: string
  userName: string
  userEmail: string
  totalReportes: number
  numerossorteio: number[]   // números gerados por sorteio
  pontos: number
  ultimoReporte: number
}

// Store em memória (em produção: Cloudflare KV/D1)
const PRECOS_REPORTADOS = new Map<string, PrecoReporte>()
const CONTRIBUICOES_USUARIOS = new Map<string, ContribuicaoUsuario>()
// Contador global de sorteio
let _contadorSorteio = 1000

// Gerar número único de sorteio (6 dígitos)
function gerarNumeroSorteio(): number {
  _contadorSorteio++
  const base = _contadorSorteio
  // Embaralhar com hash simples para não ser sequencial
  const hash = ((base * 2654435769) >>> 0) % 900000 + 100000
  return hash
}

app.post('/api/precos/reportar', async (c) => {
  try {
    const body = await c.req.json()
    const { postoId, postoNome, combustivel, preco, lat, lng, userId, userName } = body

    if (!postoId || !combustivel || !preco || preco < 1 || preco > 30) {
      return c.json({ sucesso: false, mensagem: 'Dados inválidos' }, 400)
    }

    const key = `${postoId}:${combustivel}`
    const existente = PRECOS_REPORTADOS.get(key)
    let isNovoReporte = true

    if (existente) {
      const agora = Date.now()
      const idadeHoras = (agora - existente.ts) / 3600000
      if (idadeHoras < 24) {
        // Se mesmo usuário tentou reportar denovo em menos de 1h, bloquear
        if (userId && existente.userId === userId) {
          const idadeMin = (agora - existente.ts) / 60000
          if (idadeMin < 60) {
            return c.json({ sucesso: false, mensagem: 'Você já reportou este posto recentemente. Aguarde 1 hora.' }, 429)
          }
        }
        // Média ponderada
        existente.preco = Math.round(((existente.preco * existente.confirmacoes + preco) / (existente.confirmacoes + 1)) * 100) / 100
        existente.confirmacoes++
        existente.ts = agora
        if (userName) existente.userName = userName
        PRECOS_REPORTADOS.set(key, existente)
        isNovoReporte = false
      } else {
        // Mais de 24h — resetar
        PRECOS_REPORTADOS.set(key, {
          postoId, postoNome, combustivel,
          preco: Math.round(preco * 100) / 100,
          lat: lat || 0, lng: lng || 0,
          ts: Date.now(), confirmacoes: 1,
          userId, userName
        })
      }
    } else {
      PRECOS_REPORTADOS.set(key, {
        postoId, postoNome, combustivel,
        preco: Math.round(preco * 100) / 100,
        lat: lat || 0, lng: lng || 0,
        ts: Date.now(), confirmacoes: 1,
        userId, userName
      })
    }

    // ── Gamificação: registrar contribuição do usuário ─────────────────────
    let numeroSorteio: number | null = null
    let totalPontos = 0
    let totalNumeros = 0

    if (userId) {
      const contrib = CONTRIBUICOES_USUARIOS.get(userId) || {
        userId,
        userName: userName || 'Usuário',
        userEmail: '',
        totalReportes: 0,
        numerossorteio: [],
        pontos: 0,
        ultimoReporte: 0
      }
      contrib.totalReportes++
      contrib.pontos += isNovoReporte ? 10 : 5  // 10pts novo, 5pts confirmação
      contrib.ultimoReporte = Date.now()
      if (userName) contrib.userName = userName

      // Ganhar número de sorteio a cada reporte (1 número por reporte único)
      if (isNovoReporte) {
        numeroSorteio = gerarNumeroSorteio()
        contrib.numerossorteio.push(numeroSorteio)
        // Máximo 50 números por usuário
        if (contrib.numerossorteio.length > 50) contrib.numerossorteio.shift()
      }

      totalPontos = contrib.pontos
      totalNumeros = contrib.numerossorteio.length
      CONTRIBUICOES_USUARIOS.set(userId, contrib)
    }

    const confirmacoes = PRECOS_REPORTADOS.get(key)?.confirmacoes || 1
    return c.json({
      sucesso: true,
      mensagem: isNovoReporte
        ? 'Preço reportado! Obrigado por colaborar! 🙏'
        : `Preço confirmado! ${confirmacoes} confirmações`,
      confirmacoes,
      gamificacao: userId ? {
        pontosGanhos: isNovoReporte ? 10 : 5,
        totalPontos,
        numeroSorteio,
        totalNumerossorteio: totalNumeros,
        mensagem: numeroSorteio
          ? `🎰 Você ganhou o número ${numeroSorteio} no sorteio!`
          : isNovoReporte ? '🎯 +10 pontos!' : '✅ +5 pontos por confirmação!'
      } : null
    })
  } catch (e: any) {
    return c.json({ sucesso: false, mensagem: 'Erro ao salvar preço' }, 500)
  }
})

// ─── API: Listar preços colaborativos reportados ──────────────────────────────
app.get('/api/precos/reportados', (c) => {
  const reportes = [...PRECOS_REPORTADOS.values()]
    .filter(r => Date.now() - r.ts < 24 * 3600000)
    .sort((a, b) => b.confirmacoes - a.confirmacoes)

  return c.json({
    total: reportes.length,
    reportes: reportes.map(r => ({
      ...r,
      idadeMin: Math.round((Date.now() - r.ts) / 60000)
    }))
  })
})

// ─── API: Ranking de contribuidores (gamificação) ─────────────────────────────
app.get('/api/contribuidores/ranking', (c) => {
  const ranking = [...CONTRIBUICOES_USUARIOS.values()]
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 20)
    .map((u, i) => ({
      posicao: i + 1,
      nome: u.userName,
      pontos: u.pontos,
      reportes: u.totalReportes,
      numerossorteio: u.numerossorteio.length,
      ultimoReporte: Math.round((Date.now() - u.ultimoReporte) / 60000)
    }))
  return c.json({ ranking, total: CONTRIBUICOES_USUARIOS.size })
})

// ─── API: Meus números de sorteio ────────────────────────────────────────────
app.get('/api/meus-numeros/:userId', (c) => {
  const userId = c.req.param('userId')
  const contrib = CONTRIBUICOES_USUARIOS.get(userId)
  if (!contrib) return c.json({ numeros: [], pontos: 0, reportes: 0 })
  return c.json({
    numeros: contrib.numerossorteio,
    pontos: contrib.pontos,
    reportes: contrib.totalReportes,
    nome: contrib.userName
  })
})

// ─── API: Calcular Rota via OSRM ──────────────────────────────────────────────
app.get('/api/rota', async (c) => {
  const origemLat = parseFloat(c.req.query('origemLat') || '')
  const origemLng = parseFloat(c.req.query('origemLng') || '')
  const destinoLat = parseFloat(c.req.query('destinoLat') || '')
  const destinoLng = parseFloat(c.req.query('destinoLng') || '')

  if (isNaN(origemLat) || isNaN(origemLng) || isNaN(destinoLat) || isNaN(destinoLng)) {
    return c.json({ error: 'Parâmetros de rota inválidos' }, 400)
  }

  const rota = await calcularRotaOSRM(origemLat, origemLng, destinoLat, destinoLng)
  if (!rota) return c.json({ error: 'Serviço de rota indisponível' }, 500)

  return c.json({
    distanciaKm: rota.distanciaKm,
    duracaoMin: rota.duracaoMin,
    url_mapa: rota.urlOSM,
    url_google: rota.urlGoogleMaps
  })
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

  const resultados = await geocodeNominatim(q)
  return c.json(resultados.map(r => ({
    // campos legados
    nome: r.nome,
    lat: r.lat,
    lng: r.lng,
    lon: r.lng,            // alias para compatibilidade com Nominatim
    cidade: r.cidade,
    estado: r.estado,
    // campos extras para o autocomplete do Planejar
    display_name: r.nome,  // alias display_name = nome completo
  })))
})

// ─── API: Geocode Reverso ─────────────────────────────────────────────────────
app.get('/api/geocode/reverso', async (c) => {
  const lat = parseFloat(c.req.query('lat') || '')
  const lng = parseFloat(c.req.query('lng') || '')

  if (isNaN(lat) || isNaN(lng)) return c.json({ error: 'Coordenadas inválidas' }, 400)

  const geo = await geocodeReverso(lat, lng)
  if (!geo) return c.json({ error: 'Não foi possível identificar a localização' }, 404)

  return c.json(geo)
})

// ─── API: Geolocate Device — Google Geolocation API com dados do dispositivo ──
// Recebe wifiAccessPoints e cellTowers do browser (via Network Information API)
// e repassa para Google Geolocation API usando a chave segura do servidor.
// Isso dá precisão similar ao Uber (torres + WiFi) sem expor a chave no frontend.
app.post('/api/geolocate-device', async (c) => {
  try {
    const googleKey = (c.env as any)?.GOOGLE_PLACES_KEY as string || GOOGLE_API_KEY || ''
    if (!googleKey) return c.json({ erro: 'Chave não configurada' }, 500)

    const body = await c.req.json() as Record<string, unknown>
    // Montar payload Google Geolocation API
    const payload: Record<string, unknown> = { considerIpAddress: true }
    if (Array.isArray(body.wifiAccessPoints) && body.wifiAccessPoints.length > 0)
      payload.wifiAccessPoints = body.wifiAccessPoints
    if (Array.isArray(body.cellTowers) && body.cellTowers.length > 0)
      payload.cellTowers = body.cellTowers
    if (body.homeMobileCountryCode) payload.homeMobileCountryCode = body.homeMobileCountryCode
    if (body.homeMobileNetworkCode) payload.homeMobileNetworkCode = body.homeMobileNetworkCode

    const gRes = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${googleKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000)
      }
    )
    if (!gRes.ok) {
      const err = await gRes.json() as any
      console.warn('[geolocate-device] Google erro:', gRes.status, JSON.stringify(err).slice(0,200))
      return c.json({ erro: 'Google API indisponível', status: gRes.status }, 502)
    }
    const gd = await gRes.json() as any
    if (!gd.location?.lat) return c.json({ erro: 'Sem localização' }, 404)

    // Geocode reverso para cidade/estado via Nominatim (grátis, sem quota)
    let cidade = '', estado = ''
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${gd.location.lat}&lon=${gd.location.lng}&accept-language=pt-BR`,
        { headers: { 'User-Agent': 'RotaPosto/1.0' }, signal: AbortSignal.timeout(3000) }
      )
      if (nomRes.ok) {
        const nom = await nomRes.json() as any
        cidade = nom.address?.city || nom.address?.town || nom.address?.municipality || ''
        estado = nom.address?.state_code || nom.address?.state || ''
        if (estado.length > 2) {
          // Mapear nome do estado para sigla
          const siglas: Record<string,string> = { 'Espírito Santo':'ES','São Paulo':'SP','Rio de Janeiro':'RJ','Minas Gerais':'MG','Bahia':'BA','Paraná':'PR','Rio Grande do Sul':'RS','Santa Catarina':'SC','Goiás':'GO','Pernambuco':'PE','Ceará':'CE','Pará':'PA','Maranhão':'MA','Amazonas':'AM','Mato Grosso':'MT','Mato Grosso do Sul':'MS','Rio Grande do Norte':'RN','Alagoas':'AL','Piauí':'PI','Paraíba':'PB','Sergipe':'SE','Rondônia':'RO','Tocantins':'TO','Acre':'AC','Amapá':'AP','Roraima':'RR','Distrito Federal':'DF' }
          estado = siglas[estado] || estado.slice(0,2).toUpperCase()
        }
      }
    } catch (_) {}

    return c.json({ lat: gd.location.lat, lng: gd.location.lng, accuracy: gd.accuracy, cidade, estado, fonte: 'google-device' })
  } catch(e) {
    return c.json({ erro: 'Erro interno' }, 500)
  }
})

// ─── API: GeoIP — localização pelo IP + Google Geolocation API ───────────────
// Fallback quando GPS do celular não disponível
// Ordem: Google Geolocation API (IP-only) → ipapi.co → ip-api.com → SP padrão
app.get('/api/geoip', async (c) => {
  const ip = c.req.header('CF-Connecting-IP')
    || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || c.req.header('X-Real-IP')
    || ''

  const isPrivate = !ip || ip.startsWith('127.') || ip.startsWith('10.')
    || ip.startsWith('192.168.') || ip.startsWith('::1') || ip === '::ffff:127.0.0.1'

  if (isPrivate) {
    return c.json({ lat: -23.5505, lng: -46.6333, cidade: 'São Paulo', estado: 'SP', fallback: true })
  }

  const googleKey = (c.env as any)?.GOOGLE_PLACES_KEY as string || GOOGLE_API_KEY || ''

  // 1. Google Geolocation API (considerConsideraIP do cliente — mais preciso que outros serviços)
  if (googleKey) {
    try {
      const geoRes = await fetch(
        `https://www.googleapis.com/geolocation/v1/geolocate?key=${googleKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // considerIpAddress:true usa o IP do request para inferir localização
          body: JSON.stringify({ considerIpAddress: true })
        }
      )
      if (geoRes.ok) {
        const gd = await geoRes.json() as any
        if (gd.location?.lat && gd.location?.lng) {
          // Fazer geocode reverso para obter nome da cidade
          let cidade = '', estado = ''
          try {
            const revRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${gd.location.lat},${gd.location.lng}&result_type=locality|administrative_area_level_2&language=pt-BR&key=${googleKey}`
            )
            if (revRes.ok) {
              const revData = await revRes.json() as any
              const comp = revData.results?.[0]?.address_components || []
              for (const c2 of comp) {
                if (c2.types.includes('administrative_area_level_2') || c2.types.includes('locality')) {
                  if (!cidade) cidade = c2.long_name
                }
                if (c2.types.includes('administrative_area_level_1')) {
                  estado = c2.short_name
                }
              }
            }
          } catch (_) {}
          return c.json({
            lat: gd.location.lat,
            lng: gd.location.lng,
            accuracy: gd.accuracy,
            cidade,
            estado,
            fonte: 'google'
          })
        }
      }
    } catch (_) {}
  }

  // 2. ipapi.co — gratuito, 1000 req/dia
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'RotaPosto/1.0' }
    })
    if (res.ok) {
      const d = await res.json() as any
      if (d.latitude && d.longitude && !d.error) {
        return c.json({
          lat: parseFloat(d.latitude),
          lng: parseFloat(d.longitude),
          cidade: d.city || '',
          estado: d.region_code || '',
          fonte: 'ipapi.co'
        })
      }
    }
  } catch (_) {}

  // 3. ip-api.com — 45 req/min
  try {
    const res2 = await fetch(`http://ip-api.com/json/${ip}?fields=status,lat,lon,city,regionCode&lang=pt-BR`)
    if (res2.ok) {
      const d2 = await res2.json() as any
      if (d2.status === 'success' && d2.lat && d2.lon) {
        return c.json({
          lat: parseFloat(d2.lat),
          lng: parseFloat(d2.lon),
          cidade: d2.city || '',
          estado: d2.regionCode || '',
          fonte: 'ip-api.com'
        })
      }
    }
  } catch (_) {}

  return c.json({ lat: -23.5505, lng: -46.6333, cidade: 'São Paulo', estado: 'SP', fallback: true })
})

// ─── Landing Page ─────────────────────────────────────────────────────────────
app.get('/landing', (c) => {
  return c.html(getLandingHTML())
})

// ═══════════════════════════════════════════════════════════════════════
//  BRASIL – 46.071 POSTOS NACIONAIS
// ═══════════════════════════════════════════════════════════════════════

// ─── Página: Mapa Brasil com todos os postos ANP ──────────────────────────────
app.get('/mapa-brasil', (c) => {
  return c.html(getMapaBrasilHTML())
})

// ─── Helpers KV ───────────────────────────────────────────────────────────────
async function kvGetJson(kv: KVNamespace | undefined, key: string): Promise<any | null> {
  if (!kv) return null
  try {
    // Tenta ler como ArrayBuffer (pode ser gzip ou texto puro)
    const buf = await kv.get(key, 'arrayBuffer')
    if (!buf) return null

    // Detectar gzip: magic bytes 0x1f 0x8b
    const bytes = new Uint8Array(buf)
    let text: string
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      // Descomprimir gzip usando DecompressionStream (disponível no Workers)
      const ds = new DecompressionStream('gzip')
      const writer = ds.writable.getWriter()
      const reader = ds.readable.getReader()
      writer.write(bytes)
      writer.close()
      const chunks: Uint8Array[] = []
      let done = false
      while (!done) {
        const { value, done: d } = await reader.read()
        if (value) chunks.push(value)
        done = d
      }
      const total = chunks.reduce((a, c) => a + c.length, 0)
      const merged = new Uint8Array(total)
      let offset = 0
      for (const c of chunks) { merged.set(c, offset); offset += c.length }
      text = new TextDecoder().decode(merged)
    } else {
      // Texto puro
      text = new TextDecoder().decode(bytes)
    }
    return JSON.parse(text)
  } catch { return null }
}

// Cache em memória para KV (evitar hits desnecessários no CF KV — cota: 100K/dia free)
const kvCache = new Map<string, { data: any; ts: number }>()
const KV_CACHE_TTL = 60 * 60 * 1000 // 1 hora

async function kvGetCached(kv: KVNamespace | undefined, key: string): Promise<any | null> {
  const cached = kvCache.get(key)
  if (cached && Date.now() - cached.ts < KV_CACHE_TTL) return cached.data
  const data = await kvGetJson(kv, key)
  if (data !== null) kvCache.set(key, { data, ts: Date.now() })
  return data
}

// ─── API: Todos os postos do Brasil (paginado) ────────────────────────────────
// GET /api/postos/brasil?pagina=1&tamanhoPagina=500&uf=SP&combustivel=GASOLINA+C+COMUM&bandeira=IPIRANGA
app.get('/api/postos/brasil', async (c) => {
  const pagina = parseInt(c.req.query('pagina') || '1')
  const tamanhoPagina = Math.min(parseInt(c.req.query('tamanhoPagina') || '500'), 5000)
  const uf = c.req.query('uf') || ''
  const combustivel = c.req.query('combustivel') || ''
  const bandeira = c.req.query('bandeira') || ''

  try {
    // 1. Buscar postos cadastrais na ANP (46K com coordenadas)
    const resultado = await buscarTodosPostosANP(uf || undefined, pagina, tamanhoPagina)

    // 2. Filtros
    let postos = resultado.postos
    if (combustivel) {
      postos = postos.filter(p =>
        p.produtos.some(prod => prod.toUpperCase().includes(combustivel.toUpperCase()))
      )
    }
    if (bandeira) {
      postos = postos.filter(p =>
        (p.bandeira || '').toUpperCase().includes(bandeira.toUpperCase())
      )
    }

    // 3. Enriquecer com preços reais do KV (se disponível)
    const kv = (c.env as any)?.PRECOS_ANP as KVNamespace | undefined
    let precosPorCNPJ: Record<string, any> = {}
    let precosUFAtual: Record<string, Record<string, number>> = PRECOS_MEDIOS_UF
    let semanaKV = ''

    if (kv && uf) {
      // Carregar preços do KV para a UF específica
      const kvData = await kvGetCached(kv, `precos:postos:${uf.toUpperCase()}`)
      if (kvData?.postos) {
        precosPorCNPJ = kvData.postos
        semanaKV = kvData.s || ''
      }
      // Carregar médias por município do KV
      const kvMun = await kvGetCached(kv, 'precos:municipios')
      if (kvMun?.m) {
        // Converter para estrutura por UF
        const precosUF: Record<string, number> = {}
        for (const [chave, precos] of Object.entries(kvMun.m as Record<string, any>)) {
          if (chave.startsWith(uf.toUpperCase() + ':')) {
            for (const [prod, val] of Object.entries(precos as Record<string, number>)) {
              if (!precosUF[prod]) precosUF[prod] = val as number
            }
          }
        }
        if (Object.keys(precosUF).length > 0) {
          precosUFAtual = { ...PRECOS_MEDIOS_UF, [uf.toUpperCase()]: precosUF }
        }
      }
    }

    // 4. Montar resposta com preços reais quando disponíveis
    const postosComPrecos = postos.map(p => {
      // CNPJ do posto: tentar match com dados do KV
      const cnpjLimpo = (p.cnpj || '').replace(/\D/g, '').padStart(14, '0')
      const precoKV = precosPorCNPJ[cnpjLimpo]

      // Converter campos comprimidos do KV → formato padrão
      const precosReais = precoKV?.p ? {
        gasolina: precoKV.p.gasolina,
        gasolinaAditivada: precoKV.p.gasolinaAditivada,
        etanol: precoKV.p.etanol,
        diesel: precoKV.p.diesel,
        dieselS10: precoKV.p.dieselS10,
        gnv: precoKV.p.gnv,
        glp: precoKV.p.glp,
        semanaColeta: semanaKV,
        fonte: 'anp-real' as const
      } : null

      return {
        ...p,
        // Preços individuais (KV) têm prioridade sobre médias por UF
        precosReais,
        precosMediosUF: precosUFAtual[p.uf] || null,
        // Flag útil para o frontend
        temPrecoReal: !!precosReais
      }
    })

    const totalComPrecoReal = postosComPrecos.filter(p => p.temPrecoReal).length

    return c.json({
      postos: postosComPrecos,
      totalRegistros: resultado.totalRegistros,
      totalPaginas: resultado.totalPaginas,
      paginaAtual: pagina,
      filtros: { uf, combustivel, bandeira },
      fonte: 'ANP – Agência Nacional do Petróleo',
      semanaPrecos: semanaKV || 'Semana 21-27/06/2026',
      totalComPrecoReal,
      nota: semanaKV
        ? `Preços individuais por posto: ${totalComPrecoReal} de ${postosComPrecos.length} postos. Fonte: ANP planilha semanal ${semanaKV}.`
        : 'Preços médios por UF (ANP). Atualize os preços rodando o sync do GitHub Actions.'
    })
  } catch (e: any) {
    return c.json({ error: 'Erro ao buscar postos: ' + e.message, postos: [] }, 500)
  }
})

// ─── API: Preços por município — dados reais ANP embutidos ───────────────────
// GET /api/precos/municipio?uf=SP&municipio=SAO+PAULO
// GET /api/precos/municipio?uf=SP  (retorna todos municípios da UF)
app.get('/api/precos/municipio', (c) => {
  const uf = (c.req.query('uf') || '').toUpperCase()
  const municipioQuery = (c.req.query('municipio') || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9 ]/g, ' ').trim()

  if (!uf) {
    return c.json({ error: 'Parâmetro uf é obrigatório. Ex: ?uf=SP' }, 400)
  }

  const semana = `${ANP_SEMANA.inicio} a ${ANP_SEMANA.fim}`

  // Sem município → retorna todos da UF
  if (!municipioQuery) {
    const dadosUF = PRECOS_ANP_POR_MUNICIPIO[uf] || {}
    const municipios = getMunicipiosDisponiveis(uf)
    return c.json({
      uf,
      semana,
      fonte: 'anp-embutido',
      municipiosDisponiveis: municipios.length,
      municipios: dadosUF,
      precosMediosUF: getPrecoANPPorUF(uf),
    })
  }

  // Com município → busca exata ou parcial
  const dadosUF = PRECOS_ANP_POR_MUNICIPIO[uf] || {}

  // 1. Busca exata
  if (dadosUF[municipioQuery]) {
    return c.json({
      uf, municipio: municipioQuery,
      precos: dadosUF[municipioQuery],
      precosUF: getPrecoANPPorUF(uf),
      fonte: 'anp-municipio',
      semana,
      disponivel: true,
    })
  }

  // 2. Busca parcial (o município pesquisado é prefixo ou subconjunto)
  const chaves = Object.keys(dadosUF)
  const match = chaves.find(k =>
    k.startsWith(municipioQuery.slice(0, 6)) || // primeiras 6 letras
    k.includes(municipioQuery) ||
    municipioQuery.includes(k)
  )

  if (match) {
    return c.json({
      uf, municipio: match,
      precos: dadosUF[match],
      precosUF: getPrecoANPPorUF(uf),
      fonte: 'anp-municipio-parcial',
      semana,
      disponivel: true,
      municipioOriginal: municipioQuery,
    })
  }

  // 3. Fallback: retorna média da UF
  return c.json({
    uf, municipio: municipioQuery,
    precos: null,
    precosUF: getPrecoANPPorUF(uf),
    fonte: 'anp-media-uf',
    semana,
    disponivel: false,
    municipiosDisponiveisNaUF: getMunicipiosDisponiveis(uf).length,
    mensagem: `Município ${municipioQuery}/${uf} não pesquisado nesta semana. Use precosUF como referência.`,
  })
})

// ─── API: Preços por posto (CNPJ) — do KV ────────────────────────────────────
// GET /api/precos/posto?cnpj=12345678000195&uf=SP
app.get('/api/precos/posto', async (c) => {
  const cnpj = (c.req.query('cnpj') || '').replace(/\D/g, '').padStart(14, '0')
  const uf   = (c.req.query('uf') || '').toUpperCase()

  if (!cnpj || cnpj.length < 14) {
    return c.json({ error: 'CNPJ inválido' }, 400)
  }

  const kv = (c.env as any)?.PRECOS_ANP as KVNamespace | undefined

  // Tentar buscar pelo UF informado ou tentar todas as UFs
  const ufs = uf ? [uf] : Object.keys(PRECOS_MEDIOS_UF)

  for (const u of ufs) {
    const kvData = await kvGetCached(kv, `precos:postos:${u}`)
    if (kvData?.postos?.[cnpj]) {
      const posto = kvData.postos[cnpj]
      return c.json({
        cnpj,
        nome: posto.n,
        municipio: posto.m,
        uf: posto.u,
        bandeira: posto.b,
        precos: posto.p,
        dataColeta: posto.dt,
        semana: kvData.s,
        fonte: 'anp-kv'
      })
    }
  }

  return c.json({ cnpj, precos: null, fonte: 'nao-encontrado', semana: null }, 404)
})

// ─── API: Preços médios nacionais e por UF ────────────────────────────────────
// GET /api/precos/brasil?uf=SP
app.get('/api/precos/brasil', async (c) => {
  const uf = (c.req.query('uf') || '').toUpperCase()
  const stats = getEstatisticasNacionais()

  // Tentar buscar do KV (dados mais recentes)
  const kv = (c.env as any)?.PRECOS_ANP as KVNamespace | undefined
  const meta = await kvGetCached(kv, 'precos:meta')
  const kvMun = await kvGetCached(kv, 'precos:municipios')

  // Recalcular médias por UF a partir do KV (se disponível)
  let precosPorUF = PRECOS_MEDIOS_UF
  let semanaRef = stats.semanaReferencia

  if (kvMun?.m) {
    semanaRef = `${meta?.semanaIni || '21/06/2026'} a ${meta?.semanaFim || '27/06/2026'}`
    // Agregar médias do KV por UF
    const somaPorUF: Record<string, Record<string, number[]>> = {}
    for (const [chave, precos] of Object.entries(kvMun.m as Record<string, Record<string, number>>)) {
      const [u] = chave.split(':')
      if (!somaPorUF[u]) somaPorUF[u] = {}
      for (const [prod, val] of Object.entries(precos)) {
        if (!somaPorUF[u][prod]) somaPorUF[u][prod] = []
        somaPorUF[u][prod].push(val)
      }
    }
    const novosPrecosUF: Record<string, Record<string, number>> = {}
    for (const [u, produtos] of Object.entries(somaPorUF)) {
      novosPrecosUF[u] = {}
      for (const [prod, vals] of Object.entries(produtos)) {
        novosPrecosUF[u][prod] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
      }
    }
    precosPorUF = { ...PRECOS_MEDIOS_UF, ...novosPrecosUF }
  }

  if (uf && precosPorUF[uf]) {
    return c.json({
      uf,
      precos: precosPorUF[uf],
      semana: semanaRef,
      fonte: kvMun?.m ? 'anp-kv' : 'anp-estatico',
      totalPostosPesquisados: meta ? meta.totalPostos : 7250,
      precosMediosNacional: stats.precosMediosNacional
    })
  }

  return c.json({
    ...stats,
    semanaReferencia: semanaRef,
    fonte: kvMun?.m ? 'anp-kv' : 'anp-estatico',
    totalPostosPesquisados: meta?.totalPostos || 7250,
    precosPorUF
  })
})

// ─── API: Estatísticas nacionais ──────────────────────────────────────────────
app.get('/api/brasil/stats', async (c) => {
  const kv = (c.env as any)?.PRECOS_ANP as KVNamespace | undefined
  const meta = await kvGetCached(kv, 'precos:meta')
  const stats = getEstatisticasNacionais()

  // Buscar preços ao vivo da Petrobras (CombustívelAPI) em paralelo
  const petrobras = await fetchPrecosDistribuidora()

  return c.json({
    ...stats,
    ...(meta ? {
      semanaReferencia: `${meta.semanaIni} a ${meta.semanaFim}`,
      totalPostosPesquisados: meta.totalPostos,
      totalMunicipiosPesquisados: meta.totalMunicipios,
      atualizadoEm: meta.atualizadoEm,
      ufsComDados: meta.ufs,
      fonte: 'anp-kv'
    } : {
      fonte: 'anp-estatico'
    }),
    // Preços Petrobras ao vivo (distribuidora)
    ...(petrobras ? {
      petrobras: {
        dataColeta: petrobras.data_coleta,
        precos: petrobras.precos,
        analise: petrobras.analise,
        fonte: 'petrobras-distribuidora'
      }
    } : {})
  })
})

// ─── API: Preços Petrobras ao vivo (CombustívelAPI proxy) ─────────────────────
app.get('/api/combustivel', async (c) => {
  const uf = (c.req.query('uf') || '').toLowerCase()
  const data = await fetchPrecosDistribuidora()

  if (!data) {
    return c.json({ error: true, mensagem: 'Serviço temporariamente indisponível' }, 503)
  }

  // Se pediu UF específica
  if (uf && uf !== 'br') {
    const gasolina = parsePrecoPetrobras(data.precos?.gasolina?.[uf])
    const diesel = parsePrecoPetrobras(data.precos?.diesel?.[uf])

    if (!gasolina && !diesel) {
      return c.json({ error: true, mensagem: `UF '${uf.toUpperCase()}' sem dados disponíveis` }, 404)
    }

    return c.json({
      uf: uf.toUpperCase(),
      dataColeta: data.data_coleta,
      precos: {
        gasolina: gasolina ?? null,
        diesel: diesel ?? null
      },
      fonte: 'petrobras-distribuidora',
      icone: data.icones?.[uf] ?? null
    })
  }

  // Retornar todos os estados com preços formatados como números
  const precosPorUF: Record<string, { gasolina?: number; diesel?: number }> = {}
  const siglas = new Set([
    ...Object.keys(data.precos?.gasolina ?? {}),
    ...Object.keys(data.precos?.diesel ?? {})
  ])
  for (const sigla of siglas) {
    if (sigla === 'br') continue
    precosPorUF[sigla.toUpperCase()] = {
      gasolina: parsePrecoPetrobras(data.precos?.gasolina?.[sigla]) ?? undefined,
      diesel: parsePrecoPetrobras(data.precos?.diesel?.[sigla]) ?? undefined
    }
  }

  return c.json({
    dataColeta: data.data_coleta,
    nacional: {
      gasolina: parsePrecoPetrobras(data.precos?.gasolina?.['br']),
      diesel: parsePrecoPetrobras(data.precos?.diesel?.['br'])
    },
    precosPorUF,
    analise: {
      gasolinaMaisBarata: {
        uf: (data.analise?.estado_mais_barato_gasolina?.sigla ?? '').toUpperCase(),
        preco: parsePrecoPetrobras(data.analise?.estado_mais_barato_gasolina?.preco)
      },
      gasolinaMaisCara: {
        uf: (data.analise?.estado_mais_caro_gasolina?.sigla ?? '').toUpperCase(),
        preco: parsePrecoPetrobras(data.analise?.estado_mais_caro_gasolina?.preco)
      },
      dieselMaisBarato: {
        uf: (data.analise?.estado_mais_barato_diesel?.sigla ?? '').toUpperCase(),
        preco: parsePrecoPetrobras(data.analise?.estado_mais_barato_diesel?.preco)
      },
      dieselMaisCaro: {
        uf: (data.analise?.estado_mais_caro_diesel?.sigla ?? '').toUpperCase(),
        preco: parsePrecoPetrobras(data.analise?.estado_mais_caro_diesel?.preco)
      },
      variacaoGasolina: data.analise?.variacao_percentual_gasolina,
      variacaoDiesel: data.analise?.variacao_percentual_diesel
    },
    fonte: 'petrobras-distribuidora',
    cacheTTL: '2h'
  })
})

// ═══════════════════════════════════════════════════════════════════════
//  ASSINATURAS – Persistência via Cloudflare KV
//  KV key: "assin:{userId}"  → JSON com dados da assinatura
//  KV key: "sub:{subscriptionId}" → userId (para lookup via webhook)
// ═══════════════════════════════════════════════════════════════════════

interface AssinaturaUsuario {
  userId: string
  nome: string
  email: string
  cpf?: string
  plano: string
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED'
  subscriptionId?: string
  qrCode?: string
  brcode?: string
  ativadaEm?: number
  expiraEm?: number
  criadaEm: number
  pagamentos?: number   // contador de pagamentos recebidos
  proximoPagamento?: number  // timestamp do próximo pagamento
}

// Helper: ler assinatura do KV
async function kvGetAssinatura(kv: KVNamespace, userId: string): Promise<AssinaturaUsuario | null> {
  try {
    const raw = await kv.get(`assin:${userId}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// Helper: salvar assinatura no KV (TTL de 2 anos)
async function kvSetAssinatura(kv: KVNamespace, assin: AssinaturaUsuario): Promise<void> {
  await kv.put(`assin:${assin.userId}`, JSON.stringify(assin), {
    expirationTtl: 2 * 365 * 24 * 3600  // 2 anos
  })
  // Index reverso: subscriptionId → userId (para webhook)
  if (assin.subscriptionId) {
    await kv.put(`sub:${assin.subscriptionId}`, assin.userId, {
      expirationTtl: 2 * 365 * 24 * 3600
    })
  }
}

// Helper: buscar userId por subscriptionId (webhook)
async function kvGetUserBySubId(kv: KVNamespace, subscriptionId: string): Promise<string | null> {
  try {
    return await kv.get(`sub:${subscriptionId}`)
  } catch { return null }
}

// Helper: obter KV do env
function getKV(env: any): KVNamespace | null {
  return (env as any)?.ROTAPOSTO_KV || null
}

// ─── API: PIX Recorrente – Criar Assinatura ──────────────────────────────────
app.post('/api/pix/assinar', async (c) => {
  try {
    const body = await c.req.json()
    const { nome, email, cpf, plano, userId } = body as any

    if (!nome || !userId) {
      return c.json({ sucesso: false, mensagem: 'É necessário estar logado para assinar.' }, 400)
    }

    const planoValido = plano in PLANOS ? plano : 'premium'
    const cpfLimpo = (cpf || '').replace(/\D/g, '')
    // CPF é obrigatório na Woovi — retornar erro amigável se não fornecido
    if (cpfLimpo.length !== 11) {
      return c.json({ sucesso: false, mensagem: 'Informe seu CPF para gerar o PIX.', precisaCPF: true }, 400)
    }
    // Email obrigatório pela Woovi: usar fallback se vazio
    const emailFinal = (email || '').trim() || `user-${userId.slice(-8)}@rotaposto.app`
    const kv = getKV(c.env)

    // Verificar se já tem assinatura ativa no KV
    if (kv) {
      const existente = await kvGetAssinatura(kv, userId)
      if (existente?.status === 'ACTIVE') {
        return c.json({
          sucesso: true,
          jaAssinante: true,
          status: 'ACTIVE',
          plano: existente.plano,
          valor: PLANOS[existente.plano]?.valor / 100,
          expiraEm: existente.expiraEm,
          mensagem: 'Voce ja tem uma assinatura ativa!'
        })
      }
      // Se pendente, retornar QR existente em vez de criar novo
      if (existente?.status === 'PENDING' && existente.qrCode) {
        return c.json({
          sucesso: true,
          jaPendente: true,
          plano: planoValido,
          valor: PLANOS[planoValido].valor / 100,
          subscriptionId: existente.subscriptionId,
          qrCode: existente.qrCode,
          brcode: existente.brcode,
          mensagem: 'QR Code ja gerado! Escaneie para pagar.',
          instrucoes: [
            '1. Abra seu app de banco',
            '2. Escaneie o QR Code PIX ou copie o codigo',
            '3. Confirme o pagamento de R$ ' + (PLANOS[planoValido].valor / 100).toFixed(2).replace('.', ','),
            '4. Seu plano Premium sera ativado automaticamente!'
          ]
        })
      }
    }

    // Criar nova assinatura na Woovi
    const resultado = await criarAssinaturaPIX(c.env as any, nome, emailFinal, cpfLimpo, planoValido)

    if (!resultado.sucesso) {
      return c.json({ sucesso: false, mensagem: resultado.error || 'Erro ao gerar PIX' }, 500)
    }

    // Salvar no KV
    const assinatura: AssinaturaUsuario = {
      userId,
      nome,
      email: emailFinal,
      cpf: cpfLimpo,
      plano: planoValido,
      status: 'PENDING',
      subscriptionId: resultado.subscriptionId,
      qrCode: resultado.qrCode,
      brcode: resultado.brcode,
      criadaEm: Date.now(),
      pagamentos: 0
    }

    if (kv) {
      await kvSetAssinatura(kv, assinatura)
    }

    return c.json({
      sucesso: true,
      plano: planoValido,
      valor: PLANOS[planoValido].valor / 100,
      subscriptionId: resultado.subscriptionId,
      qrCode: resultado.qrCode,
      brcode: resultado.brcode,
      demo: resultado.demo || false,
      mensagem: 'QR Code PIX gerado! Escaneie para ativar o plano Premium.',
      instrucoes: [
        '1. Abra seu app de banco',
        '2. Escaneie o QR Code PIX ou copie o codigo',
        '3. Confirme o pagamento de R$ ' + (PLANOS[planoValido].valor / 100).toFixed(2).replace('.', ','),
        '4. Seu plano Premium sera ativado automaticamente!',
        '5. As proximas cobranças serao automaticas todo mes'
      ]
    })
  } catch (e: any) {
    console.error('[PIX assinar]', e)
    return c.json({ sucesso: false, mensagem: 'Erro ao gerar PIX. Tente novamente.' }, 500)
  }
})

// ─── API: Verificar status de assinatura do usuário ─────────────────────────
app.get('/api/assinatura/status/:userId', async (c) => {
  const userId = c.req.param('userId')
  const kv = getKV(c.env)

  if (!kv) {
    return c.json({ status: 'FREE', plano: null, ativa: false, semKV: true })
  }

  const assinatura = await kvGetAssinatura(kv, userId)

  if (!assinatura) {
    return c.json({ status: 'FREE', plano: null, ativa: false })
  }

  // Se pendente: verificar se foi pago via Woovi
  if (assinatura.status === 'PENDING' && assinatura.subscriptionId) {
    const { ativa } = await verificarAssinatura(c.env as any, assinatura.subscriptionId)
    if (ativa) {
      assinatura.status = 'ACTIVE'
      assinatura.ativadaEm = Date.now()
      assinatura.expiraEm = assinatura.plano === 'anual'
        ? Date.now() + 365 * 24 * 3600 * 1000
        : Date.now() + 30 * 24 * 3600 * 1000
      assinatura.pagamentos = (assinatura.pagamentos || 0) + 1
      assinatura.qrCode = undefined
      assinatura.brcode = undefined
      await kvSetAssinatura(kv, assinatura)
    }
  }

  // Checar expiração
  if (assinatura.status === 'ACTIVE' && assinatura.expiraEm && Date.now() > assinatura.expiraEm) {
    // Na assinatura recorrente Woovi, a Woovi renova automaticamente
    // Dar 3 dias de grace period antes de marcar como expirado
    const gracePeriod = 3 * 24 * 3600 * 1000
    if (Date.now() > assinatura.expiraEm + gracePeriod) {
      assinatura.status = 'EXPIRED'
      await kvSetAssinatura(kv, assinatura)
    }
  }

  return c.json({
    status: assinatura.status,
    plano: assinatura.plano,
    ativa: assinatura.status === 'ACTIVE',
    expiraEm: assinatura.expiraEm,
    ativadaEm: assinatura.ativadaEm,
    pagamentos: assinatura.pagamentos || 0,
    proximoPagamento: assinatura.proximoPagamento,
    avisoInadimplencia: assinatura.avisoInadimplencia || false,
    inadimplenciaEm: assinatura.inadimplenciaEm || null,
    // QR Code: retornar se PENDING ou se inadimplente (para renovação)
    qrCode: (assinatura.status === 'PENDING' || assinatura.avisoInadimplencia) ? assinatura.qrCode : null,
    brcode: (assinatura.status === 'PENDING' || assinatura.avisoInadimplencia) ? assinatura.brcode : null,
    subscriptionId: assinatura.status === 'PENDING' ? assinatura.subscriptionId : null
  })
})

// ─── API: Gerar novo QR Code (renovar PIX pendente) ─────────────────────────
app.post('/api/pix/gerar-manual', async (c) => {
  try {
    const body = await c.req.json() as any
    const { nome, email, cpf, plano, userId } = body

    const planoValido = plano in PLANOS ? plano : 'premium'
    const cpfLimpo = (cpf || '').replace(/\D/g, '')
    const kv = getKV(c.env)

    const resultado = await criarAssinaturaPIX(c.env as any, nome || 'Usuario', email || '', cpfLimpo, planoValido)

    if (!resultado.sucesso) {
      return c.json({ sucesso: false, mensagem: resultado.error || 'Erro ao gerar QR' }, 500)
    }

    // Atualizar no KV
    if (kv && userId) {
      const assin = await kvGetAssinatura(kv, userId) || {
        userId, nome: nome || '', email: email || '', cpf: cpfLimpo,
        plano: planoValido, status: 'PENDING' as const, criadaEm: Date.now(), pagamentos: 0
      }
      assin.status = 'PENDING'
      assin.subscriptionId = resultado.subscriptionId
      assin.qrCode = resultado.qrCode
      assin.brcode = resultado.brcode
      await kvSetAssinatura(kv, assin)
    }

    return c.json({
      sucesso: true,
      qrCode: resultado.qrCode,
      brcode: resultado.brcode,
      txid: resultado.subscriptionId,
      valor: PLANOS[planoValido].valor / 100,
      mensagem: 'QR Code gerado! Escaneie para pagar.'
    })
  } catch {
    return c.json({ sucesso: false, mensagem: 'Erro ao gerar QR Code' }, 500)
  }
})

// ─── API: Verificar Pagamento PIX ────────────────────────────────────────────
app.get('/api/pix/verificar/:txid', async (c) => {
  const txid = c.req.param('txid')
  const pago = await verificarPagamento(c.env as any, txid)
  // Se pago, limpar aviso de inadimplência do usuário pelo correlationID
  if (pago) {
    const kv = getKV(c.env)
    if (kv) {
      const userId = await kvGetUserBySubId(kv, txid)
      if (userId) {
        const assin = await kvGetAssinatura(kv, userId)
        if (assin) {
          assin.avisoInadimplencia = false
          await kvSetAssinatura(kv, assin)
        }
      }
    }
  }
  return c.json({ pago, txid })
})

// ─── API: PIX Renovação Manual — gera novo QR para assinante inadimplente ────
// Usado quando a cobrança recorrente falhou e o usuário quer pagar manualmente
app.post('/api/pix/renovar', async (c) => {
  try {
    const body = await c.req.json() as any
    const { userId, nome, email, cpf } = body
    if (!userId) return c.json({ sucesso: false, mensagem: 'userId obrigatório' }, 400)

    const kv = getKV(c.env)
    if (!kv) return c.json({ sucesso: false, mensagem: 'Serviço indisponível' }, 500)

    const assin = await kvGetAssinatura(kv, userId)
    if (!assin) return c.json({ sucesso: false, mensagem: 'Nenhuma assinatura encontrada' }, 404)

    // Só permite renovar se está EXPIRED ou PENDING (não ACTIVE)
    if (assin.status === 'ACTIVE') {
      return c.json({ sucesso: false, mensagem: 'Sua assinatura já está ativa!', jaAtiva: true })
    }

    const planoId = assin.plano && assin.plano !== 'free' ? assin.plano : 'premium'
    const cpfFinal = (cpf || assin.cpf || '').replace(/\D/g, '')
    if (cpfFinal.length !== 11) {
      return c.json({ sucesso: false, mensagem: 'CPF obrigatório para gerar PIX', precisaCPF: true }, 400)
    }
    const nomeFinal = nome || assin.nome || 'Usuário RotaPosto'
    const emailFinal = email || assin.email || `user-${userId.slice(-8)}@rotaposto.app`

    const resultado = await criarAssinaturaPIX(c.env as any, nomeFinal, emailFinal, cpfFinal, planoId)
    if (!resultado.sucesso) {
      return c.json({ sucesso: false, mensagem: resultado.error || 'Erro ao gerar PIX' }, 500)
    }

    // Atualizar KV: status PENDING, novo QR, manter aviso até pagar
    assin.status = 'PENDING'
    assin.qrCode = resultado.qrCode
    assin.brcode = resultado.brcode
    assin.subscriptionId = resultado.subscriptionId
    assin.plano = planoId
    assin.cpf = cpfFinal
    await kvSetAssinatura(kv, assin)

    return c.json({
      sucesso: true,
      qrCode: resultado.qrCode,
      brcode: resultado.brcode,
      subscriptionId: resultado.subscriptionId,
      txid: resultado.chargeId, // Para polling de verificação
      plano: planoId,
      valor: PLANOS[planoId]?.valor ?? 990,
      demo: resultado.demo || false,
      mensagem: 'Novo QR Code gerado! Pague para reativar seu plano.'
    })
  } catch (e: any) {
    console.error('[PIX renovar]', e)
    return c.json({ sucesso: false, mensagem: 'Erro ao gerar PIX de renovação' }, 500)
  }
})

// ─── API: SOS — Guinchos, Borracheiros e Mecânicas próximos ─────────────────
// Usa Google Places API v1 (Nearby Search). Lógica de degustação:
//   - 1ª chamada de qualquer usuário (anon ou free): retorna resultados OK
//   - A partir da 2ª: exige assinatura ACTIVE
// O contador de uso fica em KV: sos_uses:{userId|ip}
app.post('/api/sos/servicos', async (c) => {
  try {
    const body = await c.req.json() as any
    const { lat, lng, tipo = 'guincho', userId } = body

    if (!lat || !lng) return c.json({ erro: 'lat/lng obrigatorios' }, 400)

    const kv = getKV(c.env)
    const googleKey = (c.env as any)?.GOOGLE_PLACES_KEY as string || GOOGLE_API_KEY || ''

    if (!googleKey) return c.json({ erro: 'API key nao configurada' }, 500)

    // ── Verificar degustação ─────────────────────────────────────────────────
    const sessionKey = userId
      ? `sos_uses:${userId}`
      : `sos_uses:ip:${c.req.header('CF-Connecting-IP') || 'anon'}`

    let usosCount = 0
    if (kv) {
      const stored = await kv.get(sessionKey)
      usosCount = stored ? parseInt(stored) : 0
    }

    // Se já usou 1 vez e não é premium → bloquear
    if (usosCount >= 1 && userId) {
      const assin = kv ? await kvGetAssinatura(kv, userId) : null
      const isPremium = assin?.status === 'ACTIVE'
      if (!isPremium) {
        return c.json({ erro: 'premium_required', usos: usosCount }, 403)
      }
    }

    // ── Mapa tipo → query texto + emoji (Places API New só suporta car_repair via nearby)
    // Usamos searchText que retorna resultados muito mais relevantes para guinchos/borracheiros
    const tipoQueryMap: Record<string, { query: string, emoji: string }> = {
      guincho:     { query: 'guincho reboque 24h',         emoji: '🚛' },
      borracheiro: { query: 'borracheiro pneu 24h',        emoji: '🔧' },
      mecanica:    { query: 'mecânica auto elétrica',      emoji: '🔩' },
      todos:       { query: 'guincho reboque borracheiro',  emoji: '🛠️' },
    }
    const tipoInfo = tipoQueryMap[tipo] || tipoQueryMap['todos']

    // ── Chamada Google Places Text Search ────────────────────────────────────
    const url = 'https://places.googleapis.com/v1/places:searchText'
    const reqBody = {
      textQuery: tipoInfo.query,
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 10000 // 10 km
        }
      },
      languageCode: 'pt-BR'
    }
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.rating',
      'places.userRatingCount',
      'places.internationalPhoneNumber',
      'places.nationalPhoneNumber',
      'places.currentOpeningHours',
      'places.businessStatus',
      'places.types'
    ].join(',')

    const gRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleKey,
        'X-Goog-FieldMask': fieldMask,
        'Accept-Language': 'pt-BR'
      },
      body: JSON.stringify(reqBody),
      signal: AbortSignal.timeout(8000)
    })

    // ── Haversine local ──────────────────────────────────────────────────────
    const haversineLocal = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = Math.sin(dLat/2)**2 +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2)**2
      return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1))
    }

    // ── Fallback Nominatim quando Google falha ───────────────────────────────
    const buscarSOSviaNominatim = async (latF: number, lngF: number, tipoF: string) => {
      const queryMap: Record<string, string> = {
        guincho:     'guincho reboque',
        borracheiro: 'borracheiro pneu',
        mecanica:    'mecânica automóvel',
        todos:       'guincho borracheiro mecânica',
      }
      const q = queryMap[tipoF] || queryMap['todos']
      const emojiMap: Record<string, string> = { guincho: '🚛', borracheiro: '🔧', mecanica: '🔩', todos: '🛠️' }
      const emoji = emojiMap[tipoF] || '🛠️'
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=15&countrycodes=br&lat=${latF}&lon=${lngF}&bounded=0`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'RotaPosto/1.0 (rotaposto.app)' },
          signal: AbortSignal.timeout(8000)
        })
        if (!res.ok) return []
        const items = await res.json() as any[]
        return items.map((el: any) => {
          const eLat = parseFloat(el.lat)
          const eLng = parseFloat(el.lon)
          const dist = haversineLocal(latF, lngF, eLat, eLng)
          return {
            id: String(el.place_id),
            nome: el.name || el.display_name?.split(',')[0] || 'Serviço',
            endereco: el.display_name?.split(',').slice(1, 3).join(',').trim() || '',
            lat: eLat,
            lng: eLng,
            distancia_km: dist,
            telefone: null,
            avaliacao: null,
            total_avaliacoes: 0,
            aberto: null,
            status: 'OPERATIONAL',
            emoji
          }
        }).filter((s: any) => s.distancia_km <= 15)
          .sort((a: any, b: any) => a.distancia_km - b.distancia_km)
          .slice(0, 15)
      } catch { return [] }
    }

    let places: any[] = []

    if (!gRes.ok) {
      const errText = await gRes.text()
      console.warn('[SOS] Google Places erro:', gRes.status, '→ usando Nominatim fallback')
      // Tentar Nominatim como fallback
      const nomResults = await buscarSOSviaNominatim(lat, lng, tipo)
      if (nomResults.length === 0) {
        return c.json({ erro: 'Serviço temporariamente indisponível. Tente novamente em instantes.' }, 503)
      }
      // Registrar uso e retornar dados Nominatim
      if (kv) await kv.put(sessionKey, String(usosCount + 1), { expirationTtl: 30 * 24 * 3600 })
      return c.json({ sucesso: true, servicos: nomResults, usos: usosCount + 1, degustacao: usosCount === 0, fonte: 'osm' })
    }

    const gJson = await gRes.json() as any
    places = gJson.places || []

    const servicos = places.map((p: any) => {
      const pLat = p.location?.latitude ?? lat
      const pLng = p.location?.longitude ?? lng
      const distancia = haversineLocal(lat, lng, pLat, pLng)
      const aberto = p.currentOpeningHours?.openNow
      const tel = p.internationalPhoneNumber || p.nationalPhoneNumber || null

      // Emoji baseado no nome (mais preciso que types no searchText)
      const nome = (p.displayName?.text || '').toLowerCase()
      const emoji = nome.includes('guincho') || nome.includes('reboque') ? '🚛'
        : nome.includes('borracheiro') || nome.includes('pneu') ? '🔧'
        : nome.includes('mecân') || nome.includes('auto') ? '🔩'
        : tipoInfo.emoji

      return {
        id: p.id,
        nome: p.displayName?.text || 'Serviço',
        endereco: p.formattedAddress || '',
        lat: pLat,
        lng: pLng,
        distancia_km: distancia,
        telefone: tel,
        avaliacao: p.rating ? parseFloat(p.rating.toFixed(1)) : null,
        total_avaliacoes: p.userRatingCount || 0,
        aberto: aberto ?? null,
        status: p.businessStatus || 'OPERATIONAL',
        emoji
      }
    }).sort((a: any, b: any) => a.distancia_km - b.distancia_km)

    // ── Registrar uso ────────────────────────────────────────────────────────
    if (kv) {
      await kv.put(sessionKey, String(usosCount + 1), { expirationTtl: 30 * 24 * 3600 })
    }

    return c.json({
      sucesso: true,
      servicos,
      usos: usosCount + 1,
      degustacao: usosCount === 0 // true = foi a degustação gratuita
    })

  } catch (err: any) {
    console.error('[SOS] Erro:', err?.message)
    return c.json({ erro: 'Erro interno.' }, 500)
  }
})

// ─── API: Cancelar assinatura ────────────────────────────────────────────────
app.post('/api/assinatura/cancelar', async (c) => {
  try {
    const body = await c.req.json() as any
    const { userId } = body
    if (!userId) return c.json({ sucesso: false, mensagem: 'userId obrigatorio' }, 400)

    const kv = getKV(c.env)
    if (!kv) return c.json({ sucesso: false, mensagem: 'KV nao disponivel' }, 500)

    const assin = await kvGetAssinatura(kv, userId)
    if (!assin) return c.json({ sucesso: false, mensagem: 'Assinatura nao encontrada' }, 404)

    // Cancelar na Woovi
    if (assin.subscriptionId) {
      await cancelarAssinatura(c.env as any, assin.subscriptionId)
    }

    assin.status = 'CANCELLED'
    await kvSetAssinatura(kv, assin)

    return c.json({ sucesso: true, mensagem: 'Assinatura cancelada com sucesso.' })
  } catch {
    return c.json({ sucesso: false, mensagem: 'Erro ao cancelar' }, 500)
  }
})

// ─── API: Webhook Woovi ──────────────────────────────────────────────────────
// Webhooks registrados na Woovi (via API em 2026-06-28):
//   OPENPIX:CHARGE_COMPLETED     → pagamento do 1º e de ciclos seguintes
//   OPENPIX:TRANSACTION_RECEIVED → PIX recebido (redundância)
// Authorization header: "rp-webhook-2026"
app.post('/api/pix/webhook', async (c) => {
  try {
    const body = await c.req.json() as any
    console.log('[Woovi Webhook] evento:', body?.event, 'correlationID:', body?.charge?.correlationID)

    const { evento, correlationID, subscriptionId, status } = parsearWebhook(body)
    const kv = getKV(c.env)

    if (!kv) {
      console.warn('[Woovi] KV nao disponivel no webhook')
      return c.json({ status: 'ok', aviso: 'sem KV' })
    }

    if (status === 'PAGO') {
      const agora = Date.now()

      // ── Verificar se é pagamento de POSTO ──────────────────────────────────
      const postoId = await kv.get(`sub:posto:${subscriptionId}`) ||
                      await kv.get(`sub:posto:${correlationID}`)
      if (postoId) {
        const assinPosto = await kvGetAssinaturaPostoPix(kv, postoId)
        if (assinPosto) {
          const cicloMs = 30 * 24 * 3600 * 1000 // postos são sempre mensais
          const baseExpira = (assinPosto.expiraEm && assinPosto.expiraEm > agora) ? assinPosto.expiraEm : agora
          assinPosto.status = 'ACTIVE'
          assinPosto.ativadaEm = assinPosto.ativadaEm || agora
          assinPosto.expiraEm = baseExpira + cicloMs
          assinPosto.proximoPagamento = assinPosto.expiraEm
          assinPosto.pagamentos = (assinPosto.pagamentos || 0) + 1
          assinPosto.avisoInadimplencia = false
          assinPosto.qrCode = undefined
          assinPosto.brcode = undefined
          await kvSetAssinaturaPostoPix(kv, postoId, assinPosto)
          // Garantir que o plano do posto está correto no cadastro
          const parceiro = await kvGetParceiro(kv, postoId, undefined)
          if (parceiro && (parceiro as any).plano !== assinPosto.plano) {
            (parceiro as any).plano = assinPosto.plano
            await kvSetParceiro(kv, postoId, parceiro as Record<string,unknown>, undefined, undefined)
          }
          console.log(`[Woovi] ✅ Posto ATIVO: ${postoId} - plano ${assinPosto.plano}, expira ${new Date(assinPosto.expiraEm).toISOString()}`)
        }
        return c.json({ status: 'ok', evento, tipo: 'posto', processado: true })
      }

      // ── Pagamento de USUÁRIO DO APP ────────────────────────────────────────
      let userId = await kvGetUserBySubId(kv, subscriptionId) ||
                   await kvGetUserBySubId(kv, correlationID)

      if (!userId) {
        console.warn('[Woovi] userId nao encontrado para sub:', subscriptionId)
        return c.json({ status: 'ok', aviso: 'usuario nao encontrado' })
      }

      const assin = await kvGetAssinatura(kv, userId)
      if (!assin) {
        console.warn('[Woovi] assinatura nao encontrada para userId:', userId)
        return c.json({ status: 'ok' })
      }

      // Ativar/renovar assinatura
      assin.status = 'ACTIVE'
      assin.ativadaEm = assin.ativadaEm || agora
      assin.pagamentos = (assin.pagamentos || 0) + 1
      assin.avisoInadimplencia = false
      assin.qrCode = undefined
      assin.brcode = undefined

      // Calcular próxima expiração
      const cicloMs = assin.plano === 'anual'
        ? 365 * 24 * 3600 * 1000
        : 30 * 24 * 3600 * 1000

      // Se já tem expiraEm no futuro, estender a partir dele; senão, a partir de agora
      const baseExpira = (assin.expiraEm && assin.expiraEm > agora) ? assin.expiraEm : agora
      assin.expiraEm = baseExpira + cicloMs
      assin.proximoPagamento = assin.expiraEm

      await kvSetAssinatura(kv, assin)
      console.log(`[Woovi] ✅ Assinatura ATIVA para ${userId} - pagamento #${assin.pagamentos}, expira em ${new Date(assin.expiraEm).toISOString()}`)

    } else if (status === 'EXPIRADO') {
      // Cobrança expirou sem pagamento → downgrade imediato para FREE + aviso
      const userId = await kvGetUserBySubId(kv, subscriptionId) ||
                     await kvGetUserBySubId(kv, correlationID)
      if (userId) {
        const assin = await kvGetAssinatura(kv, userId)
        if (assin) {
          assin.status = 'EXPIRED'
          assin.plano = 'free'
          assin.avisoInadimplencia = true
          assin.inadimplenciaEm = Date.now()
          assin.qrCode = undefined
          assin.brcode = undefined
          await kvSetAssinatura(kv, assin)
          console.log('[Woovi] ⚠️ Downgrade FREE por inadimplência:', userId)
        }
      }
      // Verificar também postos parceiros
      const postoId = await kv.get(`sub:posto:${subscriptionId}`) ||
                      await kv.get(`sub:posto:${correlationID}`)
      if (postoId) {
        const assinPosto = await kvGetAssinaturaPostoPix(kv, postoId)
        if (assinPosto) {
          assinPosto.status = 'EXPIRED'
          assinPosto.avisoInadimplencia = true
          assinPosto.inadimplenciaEm = Date.now()
          assinPosto.qrCode = undefined
          assinPosto.brcode = undefined
          await kvSetAssinaturaPostoPix(kv, postoId, assinPosto)
          // Rebaixar plano do posto para gratuito
          const parceiro = await kvGetParceiro(kv, postoId, undefined)
          if (parceiro) {
            (parceiro as any).plano = 'posto_gratis'
            await kvSetParceiro(kv, postoId, parceiro as Record<string,unknown>, undefined, undefined)
          }
          console.log('[Woovi] ⚠️ Posto rebaixado para Gratuito por inadimplência:', postoId)
        }
      }
    }

    return c.json({ status: 'ok', evento, processado: status !== 'DESCONHECIDO' })
  } catch (e: any) {
    console.error('[Woovi Webhook] erro:', e.message)
    return c.json({ status: 'ok' })  // Sempre 200 para Woovi não retentar
  }
})

// ─── API: Planos disponíveis ─────────────────────────────────────────────────
app.get('/api/planos', (c) => {
  return c.json({
    planos: Object.values(PLANOS).map(p => ({
      id: p.id,
      nome: p.nome,
      valor: p.valor / 100,
      ciclo: p.ciclo,
      descricao: p.descricao,
      features: p.features
    }))
  })
})

// ─── API: Assinatura Cartão de Crédito (Mercado Pago Recorrente) ─────────────
app.post('/api/pagamento/assinar', async (c) => {
  try {
    const body = await c.req.json() as any
    const { plano, nome, email, cpf, cardToken, userId } = body

    if (!nome || !email || !userId) {
      return c.json({ sucesso: false, mensagem: 'Dados incompletos. Nome, e-mail e login são obrigatórios.' }, 400)
    }
    if (!cardToken) {
      return c.json({ sucesso: false, mensagem: 'Token do cartão não gerado. Use o formulário seguro MP.' }, 400)
    }

    const planoValido = plano in MP_PLANOS ? plano : 'premium'
    const kv = getKV(c.env)

    // Verificar se já tem assinatura ativa (cartão ou PIX)
    if (kv) {
      const existente = await kvGetAssinatura(kv, userId)
      if (existente?.status === 'ACTIVE') {
        return c.json({
          sucesso: true,
          jaAssinante: true,
          plano: existente.plano,
          mensagem: 'Você já tem uma assinatura ativa!'
        })
      }
    }

    // Criar assinatura recorrente no MP
    const resultado = await criarAssinaturaCartao(c.env, {
      cardToken,
      email,
      nome,
      cpf: cpf || '',
      plano: planoValido,
      userId
    })

    if (!resultado.sucesso) {
      return c.json({ sucesso: false, mensagem: resultado.error || 'Erro ao processar cartão. Verifique os dados e tente novamente.' }, 500)
    }

    // Salvar assinatura no KV
    if (kv) {
      const planoInfo = MP_PLANOS[planoValido as keyof typeof MP_PLANOS]
      const assinatura: AssinaturaUsuario = {
        userId,
        nome,
        email,
        cpf: (cpf || '').replace(/\D/g, ''),
        plano: planoValido,
        status: resultado.status === 'authorized' ? 'ACTIVE' : 'PENDING',
        subscriptionId: resultado.subscriptionId!,
        criadaEm: Date.now(),
        expiraEm: Date.now() + 32 * 24 * 3600 * 1000, // +32 dias
        pagamentos: resultado.status === 'authorized' ? 1 : 0
      }
      await kvSetAssinatura(kv, assinatura)
    }

    return c.json({
      sucesso: true,
      plano: planoValido,
      valor: MP_PLANOS[planoValido as keyof typeof MP_PLANOS]?.valor,
      subscriptionId: resultado.subscriptionId,
      status: resultado.status,
      proximaCobranca: resultado.proximaCobranca,
      demo: resultado.demo || false,
      mensagem: resultado.status === 'authorized'
        ? '✅ Pagamento aprovado! RotaPosto Premium ativado!'
        : '⏳ Pagamento em análise. Você receberá confirmação em breve.'
    })

  } catch (e: any) {
    console.error('[MP assinar]', e)
    return c.json({ sucesso: false, mensagem: 'Erro ao processar pagamento. Tente novamente.' }, 500)
  }
})

// ─── Webhook Mercado Pago ─────────────────────────────────────────────────────
app.post('/api/pagamento/webhook', async (c) => {
  try {
    // Clonar request antes de ler body (necessário para validação)
    const rawBody = await c.req.text()
    let body: any
    try { body = JSON.parse(rawBody) } catch { body = {} }

    console.log('[MP Webhook]', JSON.stringify(body).slice(0, 300))

    // ── Validar assinatura HMAC-SHA256 ──────────────────────────────────────
    const webhookSecret = (c.env as any)?.MP_WEBHOOK_SECRET as string | undefined
    if (webhookSecret) {
      const dataId = String(body?.data?.id || body?.data_id || '')
      const assinaturaValida = await validarAssinaturaWebhookMP(
        webhookSecret,
        c.req.raw.headers,
        dataId
      )
      if (!assinaturaValida) {
        console.warn('[MP Webhook] Assinatura inválida — request rejeitado')
        return c.json({ status: 'unauthorized' }, 401)
      }
      console.log('[MP Webhook] Assinatura OK ✅')
    } else {
      console.warn('[MP Webhook] MP_WEBHOOK_SECRET não configurado — validação ignorada')
    }

    const evento = interpretarWebhookMP(body)
    const kv = getKV(c.env)

    if (!kv) return c.json({ status: 'ok' })

    // Pagamento aprovado via subscription
    if (evento.tipo === 'pagamento_aprovado' && evento.subscriptionId) {
      const userId = await kvGetUserBySubId(kv, evento.subscriptionId)
      if (userId) {
        const assin = await kvGetAssinatura(kv, userId)
        if (assin) {
          assin.status = 'ACTIVE'
          assin.pagamentos = (assin.pagamentos || 0) + 1
          assin.expiraEm = Date.now() + 32 * 24 * 3600 * 1000
          await kvSetAssinatura(kv, assin)
          console.log('[MP Webhook] Assinatura ativada para userId:', userId)
        }
      }
    }

    // Pagamento individual aprovado
    if (evento.tipo === 'pagamento_aprovado' && evento.paymentId) {
      const pagInfo = await verificarPagamentoMP(c.env, evento.paymentId)
      if (pagInfo.aprovado && pagInfo.subscriptionId) {
        const userId = await kvGetUserBySubId(kv, pagInfo.subscriptionId)
        if (userId) {
          const assin = await kvGetAssinatura(kv, userId)
          if (assin) {
            assin.status = 'ACTIVE'
            assin.pagamentos = (assin.pagamentos || 0) + 1
            assin.expiraEm = Date.now() + 32 * 24 * 3600 * 1000
            await kvSetAssinatura(kv, assin)
          }
        }
      }
    }

    // Assinatura cancelada
    if (evento.tipo === 'assinatura_cancelada' && evento.subscriptionId) {
      const userId = await kvGetUserBySubId(kv, evento.subscriptionId)
      if (userId) {
        const assin = await kvGetAssinatura(kv, userId)
        if (assin) {
          assin.status = 'CANCELLED'
          await kvSetAssinatura(kv, assin)
          console.log('[MP Webhook] Assinatura cancelada para userId:', userId)
        }
      }
    }

    return c.json({ status: 'ok' })
  } catch (e: any) {
    console.error('[MP Webhook] Erro:', e.message)
    return c.json({ status: 'error' }, 500)
  }
})

// ─── Consultar status da assinatura MP ───────────────────────────────────────
app.get('/api/pagamento/status/:subscriptionId', async (c) => {
  try {
    const subscriptionId = c.req.param('subscriptionId')
    const resultado = await consultarAssinaturaMP(c.env, subscriptionId)
    return c.json({ sucesso: true, ...resultado })
  } catch {
    return c.json({ sucesso: false, mensagem: 'Erro ao consultar status' }, 500)
  }
})

// ─── Cancelar assinatura MP ───────────────────────────────────────────────────
app.post('/api/pagamento/cancelar', async (c) => {
  try {
    const body = await c.req.json() as any
    const { subscriptionId, userId } = body
    if (!subscriptionId || !userId) {
      return c.json({ sucesso: false, mensagem: 'Dados incompletos' }, 400)
    }

    const ok = await cancelarAssinaturaMP(c.env, subscriptionId)

    const kv = getKV(c.env)
    if (kv && ok) {
      const assin = await kvGetAssinatura(kv, userId)
      if (assin) {
        assin.status = 'CANCELLED'
        await kvSetAssinatura(kv, assin)
      }
    }

    return c.json({ sucesso: ok, mensagem: ok ? 'Assinatura cancelada.' : 'Erro ao cancelar.' })
  } catch {
    return c.json({ sucesso: false, mensagem: 'Erro interno' }, 500)
  }
})

// ─── API: Upload de foto de perfil (base64) ───────────────────────────────────
// Armazena temporariamente em memória (produção: usar R2 ou Firebase Storage)
const FOTOS_PERFIL = new Map<string, { url: string; ts: number }>()

app.post('/api/perfil/foto', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, fotoBase64, mimeType } = body

    if (!userId || !fotoBase64) {
      return c.json({ sucesso: false, mensagem: 'Dados incompletos' }, 400)
    }

    // Validar tamanho (max 2MB base64 = ~1.5MB real)
    if (fotoBase64.length > 2 * 1024 * 1024) {
      return c.json({ sucesso: false, mensagem: 'Imagem muito grande. Maximo 1.5MB.' }, 400)
    }

    const mime = mimeType || 'image/jpeg'
    const dataUrl = `data:${mime};base64,${fotoBase64}`
    FOTOS_PERFIL.set(userId, { url: dataUrl, ts: Date.now() })

    return c.json({
      sucesso: true,
      fotoUrl: dataUrl,
      mensagem: 'Foto de perfil atualizada!'
    })
  } catch {
    return c.json({ sucesso: false, mensagem: 'Erro ao salvar foto' }, 500)
  }
})

app.get('/api/perfil/foto/:userId', (c) => {
  const userId = c.req.param('userId')
  const foto = FOTOS_PERFIL.get(userId)
  if (!foto) return c.json({ fotoUrl: null })
  return c.json({ fotoUrl: foto.url, ts: foto.ts })
})

// ─── API: Veículo do usuário — GET e POST ────────────────────────────────────
app.get('/api/usuario/veiculo/:uid', async (c) => {
  const uid = c.req.param('uid')
  if (!uid) return c.json({ veiculo: null })
  const r2 = (c.env as Record<string,unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
  const veiculo = await r2Get(r2, `usuario:${uid}:veiculo`)
  return c.json({ veiculo: veiculo || null })
})

app.post('/api/usuario/veiculo', async (c) => {
  const { uid, type, consumption, tank } = await c.req.json() as {
    uid: string; type: string; consumption: number; tank: number
  }
  if (!uid || !type) return c.json({ erro: 'Dados inválidos' }, 400)
  const r2 = (c.env as Record<string,unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
  await r2Put(r2, `usuario:${uid}:veiculo`, { type, consumption, tank, atualizadoEm: Date.now() })
  return c.json({ ok: true })
})

// ─── API: Firebase Config (segura - não expõe secrets) ───────────────────────
app.get('/api/auth/config', (c) => {
  return c.json({
    firebaseConfig: FIREBASE_CONFIG,
    googleClientId: GOOGLE_CLIENT_ID
  })
})

// ─── API: Sessão Única por Usuário ────────────────────────────────────────────
// Garante que apenas 1 dispositivo por vez pode estar logado.
// Ao logar em novo celular, o token anterior é invalidado → outro celular é deslogado.

// POST /api/auth/session → registra/substitui sessão do usuário
// Body: { uid, deviceId, name?, email?, photo?, provider? }
// Retorna: { sessionToken }
app.post('/api/auth/session', async (c) => {
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ error: 'KV indisponível' }, 503)

  const body = await c.req.json() as any
  const { uid, deviceId, name, email, photo, provider } = body
  if (!uid || !deviceId) return c.json({ error: 'uid e deviceId são obrigatórios' }, 400)

  // Gerar token único para esta sessão
  const sessionToken = crypto.randomUUID()
  const sessionData = {
    token: sessionToken,
    deviceId,
    uid,
    createdAt: Date.now()
  }

  // Armazenar sessão no KV com TTL de 30 dias
  await kv.put(`session:${uid}`, JSON.stringify(sessionData), { expirationTtl: 60 * 60 * 24 * 30 })

  // Salvar/atualizar perfil do usuário no KV (dados reais de nome, email, provider)
  // Preserva telefone e dados extras já existentes
  if (name || email) {
    let perfilExistente: any = {}
    try {
      const rawPerfil = await kv.get(`profile:${uid}`)
      if (rawPerfil) perfilExistente = JSON.parse(rawPerfil)
    } catch {}
    const perfilAtualizado = {
      ...perfilExistente,
      uid,
      name: name || perfilExistente.name || '',
      email: email || perfilExistente.email || '',
      photo: photo || perfilExistente.photo || '',
      provider: provider || perfilExistente.provider || 'email',
      ultimoLogin: Date.now(),
      criadoEm: perfilExistente.criadoEm || Date.now(),
    }
    await kv.put(`profile:${uid}`, JSON.stringify(perfilAtualizado), { expirationTtl: 60 * 60 * 24 * 400 })
  }

  return c.json({ sessionToken, expiresIn: 60 * 60 * 24 * 30 })
})

// POST /api/usuario/dados → salva dados extras do usuário (telefone, CEP, CPF, etc.)
// Body: { uid, telefone?, cep?, cidade?, estado?, nome?, cpf? }
app.post('/api/usuario/dados', async (c) => {
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ ok: false, error: 'KV indisponível' }, 503)
  const body = await c.req.json() as any
  const { uid, telefone, cep, cidade, estado, nome, email, cpf } = body
  if (!uid) return c.json({ ok: false, error: 'uid obrigatório' }, 400)
  // Validar CPF se fornecido
  if (cpf !== undefined && cpf !== '' && cpf.replace(/\D/g, '').length !== 11) {
    return c.json({ ok: false, error: 'CPF inválido' }, 400)
  }
  try {
    let perfil: any = {}
    try {
      const raw = await kv.get(`profile:${uid}`)
      if (raw) perfil = JSON.parse(raw)
    } catch {}
    const cpfLimpo = cpf !== undefined ? cpf.replace(/\D/g, '') : undefined
    const atualizado = {
      ...perfil,
      uid,
      ...(telefone !== undefined && { telefone }),
      ...(cep !== undefined && { cep }),
      ...(cidade !== undefined && { cidade }),
      ...(estado !== undefined && { estado }),
      ...(nome !== undefined && { name: nome }),
      ...(email !== undefined && { email }),
      ...(cpfLimpo !== undefined && cpfLimpo !== '' && { cpf: cpfLimpo }),
      atualizadoEm: Date.now(),
      criadoEm: perfil.criadoEm || Date.now(),
    }
    await kv.put(`profile:${uid}`, JSON.stringify(atualizado), { expirationTtl: 60 * 60 * 24 * 400 })
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// GET /api/usuario/perfil/:uid → retorna perfil seguro do usuário (sem dados sensíveis além do CPF próprio)
app.get('/api/usuario/perfil/:uid', async (c) => {
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ ok: false, error: 'KV indisponível' }, 503)
  const uid = c.req.param('uid')
  if (!uid) return c.json({ ok: false, error: 'uid obrigatório' }, 400)
  try {
    const raw = await kv.get(`profile:${uid}`)
    if (!raw) return c.json({ ok: false, cpf: '', telefone: '', nome: '' }, 404)
    const perfil: any = JSON.parse(raw)
    // Retorna apenas campos não-sensíveis — CPF só é devolvido ao próprio usuário
    return c.json({
      ok: true,
      cpf: perfil.cpf || '',
      telefone: perfil.telefone || '',
      nome: perfil.name || '',
      email: perfil.email || '',
      cep: perfil.cep || '',
      cidade: perfil.cidade || '',
      estado: perfil.estado || '',
    })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// GET /api/auth/session/verify?uid=...&token=...&deviceId=...
// Retorna: { valid: true/false, reason? }
app.get('/api/auth/session/verify', async (c) => {
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ valid: false, reason: 'kv_unavailable' })

  const uid = c.req.query('uid')
  const token = c.req.query('token')
  const deviceId = c.req.query('deviceId')

  if (!uid || !token || !deviceId) return c.json({ valid: false, reason: 'params_missing' })

  const raw = await kv.get(`session:${uid}`)
  if (!raw) return c.json({ valid: false, reason: 'session_not_found' })

  let session: any
  try { session = JSON.parse(raw) } catch { return c.json({ valid: false, reason: 'session_corrupt' }) }

  // Token diferente = outro dispositivo logou depois
  if (session.token !== token) return c.json({ valid: false, reason: 'session_replaced' })
  // DeviceId diferente (extra check)
  if (session.deviceId !== deviceId) return c.json({ valid: false, reason: 'device_mismatch' })

  return c.json({ valid: true })
})

// DELETE /api/auth/session → logout (remove sessão do KV)
// Body: { uid }
app.delete('/api/auth/session', async (c) => {
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ ok: false })

  const body = await c.req.json() as any
  const { uid } = body
  if (!uid) return c.json({ ok: false })

  await kv.delete(`session:${uid}`)
  return c.json({ ok: true })
})

// ─── Digital Asset Links (TWA/Android) ───────────────────────────────────────
app.get('/.well-known/assetlinks.json', (c) => {
  const payload = [
    {
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "br.com.rotaposto.app",
        "sha256_cert_fingerprints": [
          // SHA-256 do Play App Signing (chave gerenciada pelo Google Play)
          "C9:9C:C8:3E:46:B1:FC:A1:B3:D1:E2:D6:93:05:29:1E:5D:C0:A6:B8:72:79:57:28:7D:68:9E:EB:27:71:49:BF",
          // SHA-256 do keystore local (debug/sideload direto)
          "9C:27:9E:1F:5F:BE:A0:4D:93:CC:7D:E2:D0:3A:BA:47:41:59:18:29:1F:DA:5B:88:CB:F8:06:57:26:7C:DB:38"
        ]
      }
    },
    {
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "com.br.rotaposto.parcerias",
        "sha256_cert_fingerprints": [
          // SHA-256 do Play App Signing (Google re-sign)
          "CA:0A:38:FC:17:EC:E0:11:09:98:89:49:28:4F:19:CA:61:ED:7F:21:8D:60:B6:68:A0:1A:8B:DE:54:02:E8:48",
          // SHA-256 do keystore local
          "0C:8C:4C:B5:7B:FC:FB:26:1C:0E:E1:74:A0:23:DD:83:70:3B:CA:34:17:0B:CD:D5:F8:75:51:B9:E3:9D:C0:56"
        ]
      }
    }
  ]
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*'
    }
  })
})

// ─── Frontend Principal ───────────────────────────────────────────────────────
// Rota raiz → onboarding (splash + login) como app nativo
// ─── API: trocar Google OAuth code por id_token via PKCE ─────────────────────
// O frontend envia { code, code_verifier, redirect_uri }
// O servidor troca pelo Google Token Endpoint e retorna { id_token }
app.post('/api/auth/google-code', async (c) => {
  try {
    const { code, code_verifier, redirect_uri } = await c.req.json() as any
    if (!code || !code_verifier) return c.json({ error: 'Parâmetros faltando' }, 400)

    const clientId = '1078426960222-viiv45tf4i508rlvj53202h6kda8ga9b.apps.googleusercontent.com'
    // Client secret do OAuth Web Client (necessário para troca de code)
    const clientSecret = (c.env as any)?.GOOGLE_CLIENT_SECRET as string || ''

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect_uri || 'https://rotaposto.com.br/auth/google/callback',
      grant_type: 'authorization_code',
      code_verifier,
    })

    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = await resp.json() as any
    if (!resp.ok || !data.id_token) {
      return c.json({ error: data.error || 'Falha ao obter token', detail: data.error_description }, 400)
    }
    return c.json({ id_token: data.id_token })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// ─── Callback OAuth Google (WebView nativo) ──────────────────────────────────
// Google redireciona para cá após autenticação com ?code=xxx&state=yyy
// Esta página lê o code, busca o id_token via /api/auth/google-code,
// faz signInWithCredential e redireciona para /app
app.get('/auth/google/callback', (c) => {
  const firebaseScripts = getFirebaseAuthScripts()
  return c.html(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RotaPosto – Entrando...</title>
  <style>
    body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff;font-family:sans-serif;flex-direction:column;gap:16px;}
    .spinner{width:40px;height:40px;border:4px solid #FFE0B2;border-top-color:#FF6D00;border-radius:50%;animation:spin .8s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg);}}
    p{color:#666;font-size:14px;}
    .erro{color:#E53935;font-size:13px;text-align:center;padding:0 24px;max-width:320px;}
  </style>
  ${firebaseScripts}
</head>
<body>
  <div class="spinner"></div>
  <p>Finalizando login...</p>
  <div class="erro" id="erro" style="display:none"></div>
  <script>
    function mostrarErro(msg) {
      document.querySelector('.spinner').style.display = 'none';
      document.querySelector('p').style.display = 'none';
      var el = document.getElementById('erro');
      el.textContent = msg;
      el.style.display = 'block';
      setTimeout(function(){ window.location.href = '/'; }, 4000);
    }

    // Google envia id_token no FRAGMENT (#) — não nos query params
    // Ex: /auth/google/callback#access_token=...&id_token=JWT&token_type=Bearer
    var fragment = window.location.hash.substring(1); // remove o '#'
    var params = {};
    fragment.split('&').forEach(function(part) {
      var eq = part.indexOf('=');
      if (eq > 0) params[decodeURIComponent(part.substring(0,eq))] = decodeURIComponent(part.substring(eq+1));
    });

    // Também verificar erros nos query params (Google às vezes manda erro ali)
    var queryParams = {};
    window.location.search.substring(1).split('&').forEach(function(part) {
      var eq = part.indexOf('=');
      if (eq > 0) queryParams[decodeURIComponent(part.substring(0,eq))] = decodeURIComponent(part.substring(eq+1));
    });

    var idToken = params['id_token'];
    var erro = params['error'] || queryParams['error'];

    if (erro) {
      mostrarErro('Google recusou: ' + erro);
    } else if (!idToken) {
      mostrarErro('Token não recebido. Tente novamente.');
    } else {
      localStorage.removeItem('google_oauth_nonce');
      // Aguardar Firebase carregar e fazer signInWithCredential
      var tentativas = 0;
      var t = setInterval(function() {
        tentativas++;
        if (window._fbAuth && window._fbSignInWithCredential && window._fbGoogleAuthProvider) {
          clearInterval(t);
          var cred = window._fbGoogleAuthProvider.credential(idToken);
          window._fbSignInWithCredential(window._fbAuth, cred)
            .then(function(result) {
              var user = result.user;
              var userData = {
                uid: user.uid,
                name: user.displayName || (user.email||'').split('@')[0] || 'Usuário',
                email: user.email || '',
                photo: user.photoURL || '',
                provider: 'google.com'
              };
              localStorage.setItem('rp_user', JSON.stringify(userData));
              fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid, name: userData.name, email: userData.email, photo: userData.photo })
              }).catch(function(){}).finally(function() {
                var v = localStorage.getItem('rp_vehicle');
                if (v) { window.location.href = '/app'; return; }
                fetch('/api/usuario/veiculo/' + user.uid)
                  .then(function(r){ return r.json(); })
                  .then(function(d) {
                    if (d.veiculo) localStorage.setItem('rp_vehicle', JSON.stringify(d.veiculo));
                    window.location.href = '/app';
                  })
                  .catch(function(){ window.location.href = '/app'; });
              });
            })
            .catch(function(err){ mostrarErro('Erro Firebase: ' + (err.code||err.message)); });
        } else if (tentativas > 60) {
          clearInterval(t);
          mostrarErro('Firebase não carregou. Tente novamente.');
        }
      }, 100);
    }
  </script>
</body>
</html>`)
})

app.get('/', (c) => {
  // Redirecionar domínio antigo para rotaposto.com.br
  const host = c.req.header('host') || ''
  if (host.includes('pages.dev') || host.includes('gensparksite.com')) {
    return c.redirect('https://rotaposto.com.br/', 301)
  }
  const firebaseScripts = getFirebaseAuthScripts()
  return c.html(getLandingOnboardingHTML(firebaseScripts))
})

// /onboarding → mesmo flow
app.get('/onboarding', (c) => {
  const firebaseScripts = getFirebaseAuthScripts()
  return c.html(getLandingOnboardingHTML(firebaseScripts))
})

// /landing → landing page de marketing (só quem quiser)
app.get('/landing', (c) => {
  return c.html(getLandingHTML())
})

app.get('/app', (c) => {
  // Se abrindo via domínio antigo (pages.dev), redirecionar para rotaposto.com.br
  // Isso faz o TWA reconhecer o assetlinks e esconder a barra do Chrome
  const host = c.req.header('host') || ''
  if (host.includes('pages.dev') || host.includes('gensparksite.com')) {
    const url = new URL(c.req.url)
    const dest = 'https://rotaposto.com.br' + url.pathname + url.search
    return c.redirect(dest, 301)
  }
  const firebaseScripts = getFirebaseAuthScripts()
  const gKey = (c.env as any)?.GOOGLE_PLACES_KEY as string || GOOGLE_API_KEY || ''
  return c.html(getAppHTML(firebaseScripts, gKey))
})


// Sempre limpa SW+cache e redireciona para /app com a versão mais recente
// start_url do manifest aponta para cá

// /reset → limpa TODO o cache/SW e redireciona para o app
app.get('/reset', (c) => {
  return c.html(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Atualizando RotaPosto...</title>
<style>
  body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
       min-height:100vh;background:#fff;font-family:sans-serif;text-align:center;padding:20px}
  .logo{font-size:48px;margin-bottom:16px}
  h2{color:#FF6D00;font-weight:800;margin:0 0 8px}
  p{color:#666;font-size:14px;margin:0 0 24px}
  .bar{width:220px;height:6px;background:#eee;border-radius:3px;overflow:hidden}
  .fill{height:100%;background:#FF6D00;border-radius:3px;animation:prog 2s linear forwards}
  @keyframes prog{from{width:0%}to{width:100%}}
</style>
</head><body>
<div class="logo">⛽</div>
<h2>RotaPosto</h2>
<p>Limpando cache e atualizando...</p>
<div class="bar"><div class="fill"></div></div>
<script>
(async function() {
  try {
    // 1. Desregistrar TODOS os service workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) { await reg.unregister(); }
    }
    // 2. Limpar TODOS os caches
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) { await caches.delete(key); }
    }
    // 3. Limpar localStorage de localização (para forçar GPS real)
    localStorage.removeItem('rp_lat');
    localStorage.removeItem('rp_lng');
    localStorage.removeItem('rp_loc_ts');
    localStorage.removeItem('rp_geo_denied');
  } catch(e) { console.warn('reset error:', e); }
  // 4. Redirecionar para o app após 2s
  setTimeout(function() {
    window.location.replace('/app');
  }, 2000);
})();
</script>
</body></html>`)
})

// ══════════════════════════════════════════════════════
//  PWA Manifest — servido via Worker para forçar cache fresco
//  (sobrepõe o arquivo estático do Cloudflare Pages)
// ══════════════════════════════════════════════════════
// ── Manifest do app Empresas (TWA RotaPosto Empresas) ────────────────────────
app.get('/parcerias/manifest.json', (c) => {
  const manifest = {
    name: "RotaPosto Empresas",
    short_name: "RP Empresas",
    description: "Painel de gestão para postos parceiros RotaPosto. Valide cupons, gerencie preços e sua equipe.",
    start_url: "/parcerias/empresa",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0D1117",
    theme_color: "#FF6D00",
    lang: "pt-BR",
    scope: "/parcerias/",
    id: "com.br.rotaposto.parcerias",
    icons: [
      { src: "/icons/empresas-72x72.png",   sizes: "72x72",   type: "image/png", purpose: "any" },
      { src: "/icons/empresas-96x96.png",   sizes: "96x96",   type: "image/png", purpose: "any" },
      { src: "/icons/empresas-128x128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/empresas-144x144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/empresas-152x152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons/empresas-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/empresas-384x384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/empresas-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ],
    screenshots: [],
    categories: ["business", "productivity"],
    prefer_related_applications: false
  }
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    }
  })
})

app.get('/manifest.json', (c) => {
  const manifest = {
    name: "RotaPosto - Combustível Barato",
    short_name: "RotaPosto",
    description: "Encontre os postos mais baratos na sua rota. Guinchos, borracheiros e mecânicas próximos de você.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#FF6D00",
    lang: "pt-BR",
    scope: "/",
    id: "br.com.rotaposto.app",
    icons: [
      { src: "/icons/icon-72x72.png",   sizes: "72x72",   type: "image/png", purpose: "any" },
      { src: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png", purpose: "any" },
      { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ],
    screenshots: [],
    categories: ["travel", "navigation", "utilities"],
    prefer_related_applications: false
  }
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    }
  })
})

// ══════════════════════════════════════════════════════
//  Service Worker — servido pelo Worker (evita cache Pages)
// ══════════════════════════════════════════════════════
app.get('/sw.js', (c) => {
  const swCode = `// RotaPosto — Service Worker PWA v3.0
// REGRA: O SW NUNCA intercepta páginas HTML — apenas assets estáticos (/icons/, /static/)
// Motivo: páginas são server-side no Cloudflare Worker; interceptá-las causa crash no TWA
const CACHE_NAME = 'rotaposto-v3';
const STATIC_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png'
];

// Só assets com extensão estática conhecida
const STATIC_EXTS = ['.png','.jpg','.jpeg','.gif','.svg','.ico',
                     '.woff','.woff2','.ttf','.otf',
                     '.css','.js','.webp','.avif'];

function isStaticAsset(pathname) {
  return STATIC_EXTS.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/icons/') ||
         pathname.startsWith('/static/');
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: interceptar APENAS assets estáticos — NUNCA páginas HTML
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Outro domínio → ignorar
  if (url.hostname !== self.location.hostname) return;

  // API → ignorar
  if (url.pathname.startsWith('/api/')) return;

  // Qualquer URL sem extensão estática = página HTML → NUNCA interceptar
  if (!isStaticAsset(url.pathname)) return;

  // Asset estático: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('', { status: 408, statusText: 'Offline' }));
    })
  );
});`

  return new Response(swCode, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/'
    }
  })
})

// ══════════════════════════════════════════════════════
//  Página de Privacidade (exigida pelo Facebook e Google)
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  B2B Parcerias com Postos
// ══════════════════════════════════════════════════════
app.get('/parcerias', (c) => c.html(getParceriasLandingHTML()))
app.get('/parcerias/login', (c) => c.html(getPainelLoginHTML()))
app.get('/parcerias/empresa', (c) => c.html(getPainelEmpresaHTML()))
app.get('/parcerias/validar', (c) => c.html(getValidadorHTML()))

// ── GET /api/posto/:id — dados públicos do posto ──────────────────────────────
app.get('/api/posto/:id', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const id = c.req.param('id')
    const parceiro = await kvGetParceiro(kv, id, r2) as Record<string, unknown> | null
    if (!parceiro) return c.json({ ok: false, erro: 'Posto não encontrado' }, 404)
    const precos = await kvGetPrecos(kv, id, r2)
    const promos = kv ? JSON.parse(await kv.get(`promos:${id}`) || '[]') : []
    // Expor só campos públicos
    return c.json({
      ok: true,
      posto: {
        id: parceiro.id,
        nomePosto: parceiro.nomePosto,
        bandeira: parceiro.bandeira,
        cidade: parceiro.cidade,
        whatsapp: parceiro.whatsapp,
        horario: parceiro.horario || '',
        servicos: parceiro.servicos || [],
        seloVerificado: parceiro.seloVerificado || false,
        cuponsAtivos: parceiro.cuponsAtivos || false,
        foto: parceiro.foto || '',
        descricao: parceiro.descricao || '',
        lat: parceiro.lat || null,
        lng: parceiro.lng || null,
      },
      precos: precos || {},
      promocoes: promos,
    })
  } catch (e) {
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── GET /posto/:id — página pública do posto (marketplace) ───────────────────
app.get('/posto/:id', async (c) => {
  const id = c.req.param('id')
  const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
  const parceiro = await kvGetParceiro(kv, id, r2) as Record<string, unknown> | null
  const nomePosto = (parceiro?.nomePosto as string) || 'Posto Parceiro RotaPosto'
  const bandeira  = (parceiro?.bandeira  as string) || ''
  const cidade    = (parceiro?.cidade    as string) || ''
  return c.html(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${nomePosto} — RotaPosto</title>
  <meta name="description" content="Veja preços, promoções e cupons do ${nomePosto}${cidade ? ' em ' + cidade : ''} no RotaPosto."/>
  <meta property="og:title" content="${nomePosto} — RotaPosto"/>
  <meta property="og:description" content="Preços, promoções e cupons exclusivos no RotaPosto"/>
  <meta property="og:image" content="https://rotaposto.com.br/logo-rotaposto.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#F5F5F5;color:#1A1A1A;min-height:100vh}
    :root{--laranja:#FF6D00;--laranja-claro:#FFF3E0;--verde:#2E7D32;--border:#E8E8E8}

    /* Header */
    .header{background:linear-gradient(135deg,#FF6D00,#FF8C42);padding:20px 16px 32px;color:#fff;position:relative}
    .header-top{display:flex;align-items:center;gap:12px;margin-bottom:16px}
    .header-back{background:rgba(255,255,255,0.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center}
    .posto-logo{width:64px;height:64px;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
    .posto-info{flex:1}
    .posto-nome{font-size:20px;font-weight:800;line-height:1.2;margin-bottom:4px}
    .posto-sub{font-size:13px;opacity:0.85;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .badge-selo{background:rgba(255,255,255,0.25);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px}
    .share-btn{background:rgba(255,255,255,0.2);border:none;color:#fff;padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px}

    /* Cards */
    .content{padding:16px;max-width:600px;margin:0 auto}
    .card{background:#fff;border-radius:16px;padding:20px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
    .card-title{font-size:14px;font-weight:700;color:#555;margin-bottom:14px;display:flex;align-items:center;gap:8px}

    /* Preços */
    .preco-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)}
    .preco-row:last-child{border-bottom:none;padding-bottom:0}
    .preco-comb{font-size:14px;font-weight:600;color:#333}
    .preco-vals{text-align:right}
    .preco-bomba{font-size:12px;color:#999;text-decoration:line-through}
    .preco-final{font-size:18px;font-weight:800;color:var(--laranja)}
    .preco-desc{font-size:11px;color:var(--verde);font-weight:600}
    .preco-sem-desc{font-size:18px;font-weight:800;color:#333}

    /* Promoções */
    .promo-item{background:linear-gradient(135deg,#FFF3E0,#FFF8F0);border:1.5px solid #FFD0A0;border-radius:14px;padding:16px;margin-bottom:10px}
    .promo-titulo{font-size:15px;font-weight:800;color:#E65100;margin-bottom:4px}
    .promo-desc{font-size:13px;color:#555;margin-bottom:8px;line-height:1.5}
    .promo-footer{display:flex;justify-content:space-between;align-items:center}
    .promo-validade{font-size:11px;color:#999;display:flex;align-items:center;gap:4px}
    .promo-badge{background:#FF6D00;color:#fff;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700}

    /* Ações */
    .acoes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
    .btn-acao{padding:14px;border-radius:14px;border:none;font-size:14px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transition:opacity .15s}
    .btn-acao:active{opacity:.8}
    .btn-acao i{font-size:20px}
    .btn-cupom{background:var(--laranja);color:#fff}
    .btn-wpp{background:#25D366;color:#fff}
    .btn-mapa{background:#1565C0;color:#fff}
    .btn-app{background:#1A1A1A;color:#fff}

    /* Info */
    .info-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;color:#444}
    .info-row:last-child{border-bottom:none;padding-bottom:0}
    .info-row i{width:20px;color:#FF6D00;text-align:center}
    .servicos-wrap{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
    .servico-chip{background:#F5F5F5;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:500;color:#555}

    /* Footer */
    .footer-rp{text-align:center;padding:24px 16px;color:#999;font-size:12px}
    .footer-rp a{color:var(--laranja);text-decoration:none;font-weight:600}

    /* Loader */
    .loader{text-align:center;padding:40px;color:#999}
    .spinner{display:inline-block;width:32px;height:32px;border:3px solid #eee;border-top-color:var(--laranja);border-radius:50%;animation:spin .7s linear infinite;margin-bottom:12px}
    @keyframes spin{to{transform:rotate(360deg)}}

    /* Empty */
    .empty{text-align:center;padding:24px;color:#bbb;font-size:13px}
  </style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <button class="header-back" onclick="history.back()">←</button>
    <div class="posto-logo" id="posto-logo">⛽</div>
    <div class="posto-info">
      <div class="posto-nome" id="posto-nome">Carregando...</div>
      <div class="posto-sub" id="posto-sub"></div>
    </div>
  </div>
  <div style="display:flex;justify-content:flex-end">
    <button class="share-btn" onclick="compartilhar()"><i class="fas fa-share-alt"></i> Compartilhar</button>
  </div>
</div>

<div class="content">

  <!-- Ações rápidas -->
  <div class="acoes" id="acoes-wrap">
    <button class="btn-acao btn-cupom" onclick="abrirCupom()"><i class="fas fa-ticket-alt"></i>Gerar Cupom</button>
    <button class="btn-acao btn-wpp"   id="btn-wpp" onclick="abrirWpp()"><i class="fab fa-whatsapp"></i>WhatsApp</button>
    <button class="btn-acao btn-mapa"  onclick="abrirMapa()"><i class="fas fa-map-marker-alt"></i>Ver no Mapa</button>
    <button class="btn-acao btn-app"   onclick="window.location.href='/app'"><i class="fas fa-gas-pump"></i>Abrir App</button>
  </div>

  <!-- Preços -->
  <div class="card">
    <div class="card-title"><i class="fas fa-tag" style="color:var(--laranja)"></i> Preços hoje</div>
    <div id="precos-wrap"><div class="loader"><div class="spinner"></div><br>Carregando preços...</div></div>
  </div>

  <!-- Promoções -->
  <div class="card" id="card-promos" style="display:none">
    <div class="card-title"><i class="fas fa-percentage" style="color:var(--laranja)"></i> Promoções ativas</div>
    <div id="promos-wrap"></div>
  </div>

  <!-- Info do posto -->
  <div class="card">
    <div class="card-title"><i class="fas fa-store" style="color:var(--laranja)"></i> Informações</div>
    <div id="info-wrap"><div class="loader"><div class="spinner"></div></div></div>
  </div>

  <div class="footer-rp">
    Dados fornecidos pelo próprio posto via <a href="/parcerias">RotaPosto Parceiro</a><br/>
    <a href="/app">⛽ Abrir o RotaPosto e ver todos os postos</a>
  </div>
</div>

<!-- Modal Cupom -->
<div id="modal-cupom" style="display:none;position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.6);display:none;align-items:flex-end">
  <div style="background:#fff;border-radius:24px 24px 0 0;width:100%;padding:24px;text-align:center">
    <div style="font-size:32px;margin-bottom:8px">🎟️</div>
    <div style="font-size:17px;font-weight:800;margin-bottom:6px">Cupom de Desconto</div>
    <div style="font-size:13px;color:#666;margin-bottom:20px">Para usar este cupom, abra o RotaPosto e gere o código diretamente no app.</div>
    <a href="/app" style="display:block;padding:14px;background:var(--laranja);color:#fff;border-radius:14px;font-weight:700;text-decoration:none;margin-bottom:10px;font-size:15px">
      <i class="fas fa-mobile-alt"></i> Abrir RotaPosto App
    </a>
    <button onclick="document.getElementById('modal-cupom').style.display='none'" style="width:100%;padding:12px;background:#f5f5f5;border:none;border-radius:14px;font-size:14px;color:#555;cursor:pointer;font-weight:600">Fechar</button>
  </div>
</div>

<script>
var POSTO_ID = '${id}';
var _posto = null;

// Carregar dados do posto
fetch('/api/posto/' + POSTO_ID)
  .then(function(r){ return r.json(); })
  .then(function(data) {
    if (!data.ok) { document.getElementById('posto-nome').textContent = 'Posto não encontrado'; return; }
    _posto = data.posto;
    renderHeader(data.posto);
    renderPrecos(data.precos, data.posto);
    renderPromos(data.promocoes);
    renderInfo(data.posto);
  })
  .catch(function(){ document.getElementById('precos-wrap').innerHTML = '<div class="empty">Erro ao carregar. Tente novamente.</div>'; });

function renderHeader(p) {
  document.getElementById('posto-nome').textContent = p.nomePosto;
  document.title = p.nomePosto + ' — RotaPosto';
  var sub = document.getElementById('posto-sub');
  var parts = [];
  if (p.bandeira && p.bandeira !== 'Independente') parts.push(p.bandeira);
  if (p.cidade) parts.push('<i class="fas fa-map-marker-alt"></i> ' + p.cidade);
  if (p.seloVerificado) parts.push('<span class="badge-selo">✓ Verificado</span>');
  sub.innerHTML = parts.join(' · ');
  if (p.bandeira) {
    var logos = { 'Petrobras BR':'🟢', 'Shell':'🔴', 'Ipiranga':'🟡', 'Ale':'🔵' };
    document.getElementById('posto-logo').textContent = logos[p.bandeira] || '⛽';
  }
  if (!p.whatsapp) document.getElementById('btn-wpp').style.display = 'none';
}

function renderPrecos(precos, posto) {
  var wrap = document.getElementById('precos-wrap');
  var combs = ['Gasolina Comum','Gasolina Aditivada','Etanol','Diesel S10','Diesel Comum','GNV'];
  var rows = combs.filter(function(c){ return precos && precos[c]; }).map(function(c) {
    var d = precos[c];
    var temDesc = d.desconto > 0;
    return '<div class="preco-row">'
      + '<div class="preco-comb">⛽ ' + c + '</div>'
      + '<div class="preco-vals">'
      + (temDesc ? '<div class="preco-bomba">R$ ' + d.precoBomba.toFixed(3) + '</div>' : '')
      + '<div class="' + (temDesc ? 'preco-final' : 'preco-sem-desc') + '">R$ ' + (d.precoFinal || d.precoBomba).toFixed(3) + '</div>'
      + (temDesc ? '<div class="preco-desc">-R$ ' + d.desconto.toFixed(2) + ' c/ cupom Premium</div>' : '')
      + '</div></div>';
  });
  if (rows.length === 0) {
    wrap.innerHTML = '<div class="empty">⛽ Preços não informados ainda.<br>Consulte o posto pelo WhatsApp.</div>';
  } else {
    wrap.innerHTML = rows.join('');
  }
}

function renderPromos(promos) {
  if (!promos || promos.length === 0) return;
  var ativas = promos.filter(function(p){ return !p.validade || new Date(p.validade) >= new Date(); });
  if (ativas.length === 0) return;
  document.getElementById('card-promos').style.display = 'block';
  var wrap = document.getElementById('promos-wrap');
  wrap.innerHTML = ativas.map(function(p) {
    var validadeStr = p.validade ? 'Válido até ' + new Date(p.validade).toLocaleDateString('pt-BR') : 'Sem prazo';
    return '<div class="promo-item">'
      + '<div class="promo-titulo">🏷️ ' + (p.titulo || 'Promoção') + '</div>'
      + '<div class="promo-desc">' + (p.descricao || '') + '</div>'
      + '<div class="promo-footer">'
      + '<div class="promo-validade"><i class="fas fa-clock"></i> ' + validadeStr + '</div>'
      + (p.destaque ? '<div class="promo-badge">Destaque</div>' : '')
      + '</div></div>';
  }).join('');
}

function renderInfo(p) {
  var wrap = document.getElementById('info-wrap');
  var rows = '';
  if (p.horario) rows += '<div class="info-row"><i class="fas fa-clock"></i> ' + p.horario + '</div>';
  if (p.cidade)  rows += '<div class="info-row"><i class="fas fa-map-marker-alt"></i> ' + p.cidade + '</div>';
  if (p.whatsapp) rows += '<div class="info-row"><i class="fab fa-whatsapp"></i> ' + p.whatsapp + '</div>';
  if (p.descricao) rows += '<div class="info-row"><i class="fas fa-info-circle"></i> ' + p.descricao + '</div>';
  if (p.servicos && p.servicos.length > 0) {
    rows += '<div class="info-row"><i class="fas fa-tools"></i>'
      + '<div><div style="margin-bottom:6px">Serviços</div>'
      + '<div class="servicos-wrap">' + p.servicos.map(function(s){ return '<span class="servico-chip">' + s + '</span>'; }).join('') + '</div>'
      + '</div></div>';
  }
  wrap.innerHTML = rows || '<div class="empty">Informações não cadastradas ainda.</div>';
}

function abrirCupom() {
  document.getElementById('modal-cupom').style.display = 'flex';
}
function abrirWpp() {
  if (!_posto || !_posto.whatsapp) return;
  var num = _posto.whatsapp.replace(/\\D/g,'');
  window.open('https://wa.me/55' + num + '?text=Olá! Vi seu posto no RotaPosto e gostaria de mais informações.','_blank');
}
function abrirMapa() {
  if (_posto && _posto.lat && _posto.lng) {
    window.open('https://www.google.com/maps?q=' + _posto.lat + ',' + _posto.lng,'_blank');
  } else {
    window.open('https://www.google.com/maps/search/' + encodeURIComponent((_posto?.nomePosto||'posto') + ' ' + (_posto?.cidade||'')),'_blank');
  }
}
function compartilhar() {
  var url = window.location.href;
  var txt = 'Veja os preços do ' + ((_posto&&_posto.nomePosto)||'posto') + ' no RotaPosto: ' + url;
  if (navigator.share) { navigator.share({title:'RotaPosto',text:txt,url:url}); }
  else if (navigator.clipboard) { navigator.clipboard.writeText(url).then(function(){ alert('Link copiado!'); }); }
}
</script>
</body>
</html>`)
})

// ══════════════════════════════════════════════════════
//  Página de Privacidade (exigida pelo Facebook e Google)
// ══════════════════════════════════════════════════════
app.get('/privacidade', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Política de Privacidade – RotaPosto</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;color:#1a1a2e;line-height:1.7}
    .container{max-width:820px;margin:0 auto;padding:40px 24px 80px}
    h1{font-size:2rem;font-weight:800;color:#1a1a2e;margin-bottom:6px}
    .updated{color:#888;font-size:.85rem;margin-bottom:40px;border-bottom:1px solid #e5e7eb;padding-bottom:20px}
    h2{font-size:1.1rem;font-weight:700;color:#1a1a2e;margin:36px 0 10px;display:flex;align-items:center;gap:8px}
    h2 .icon{font-size:1.2rem}
    p{color:#444;margin-bottom:12px;font-size:.97rem}
    ul{padding-left:22px;color:#444;margin-bottom:14px;font-size:.97rem}
    ul li{margin-bottom:7px}
    a{color:#FF6D00;text-decoration:none}
    a:hover{text-decoration:underline}
    .header{background:#0B121E;padding:16px 24px;display:flex;align-items:center;gap:12px}
    .header a{color:#fff;font-weight:700;font-size:1.1rem;text-decoration:none}
    .header span{color:#FF6D00;font-size:1.4rem}
    .badge{display:inline-block;background:#FF6D00;color:#fff;font-size:.75rem;font-weight:700;padding:2px 8px;border-radius:99px;vertical-align:middle;margin-left:6px}
    .box{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px 22px;margin-bottom:10px}
    .box-title{font-weight:700;color:#1a1a2e;margin-bottom:6px;font-size:.97rem}
    .tag{display:inline-block;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:6px;font-size:.8rem;padding:2px 8px;margin:2px 2px 2px 0}
    .tag.red{background:#fef2f2;color:#dc2626;border-color:#fecaca}
    table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.9rem}
    th{background:#f1f5f9;text-align:left;padding:8px 12px;color:#374151;font-weight:600}
    td{padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#444;vertical-align:top}
    .footer-note{background:#fff8f0;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;margin-top:40px;font-size:.9rem;color:#92400e}
  </style>
</head>
<body>
  <div class="header">
    <span>⛽</span>
    <a href="/">RotaPosto</a>
  </div>
  <div class="container">
    <h1>Política de Privacidade</h1>
    <p class="updated">Última atualização: julho de 2025 &nbsp;·&nbsp; Versão 2.0 &nbsp;·&nbsp; Aplicável ao app Android e à versão web</p>

    <p>O <strong>RotaPosto</strong> ("nós", "nosso") respeita sua privacidade. Esta política explica de forma clara quais dados coletamos, como usamos e como protegemos suas informações ao utilizar nosso aplicativo Android (<code>br.com.rotaposto.app</code>) e nosso site (<a href="https://rotaposto.pages.dev">rotaposto.pages.dev</a>).</p>

    <h2><span class="icon">📋</span> 1. Dados que Coletamos</h2>
    <div class="box">
      <div class="box-title">Dados de conta (opcional — somente se você fizer login)</div>
      <ul>
        <li>Nome completo</li>
        <li>Endereço de e-mail</li>
        <li>Foto de perfil</li>
        <li>Identificador único (UID) do provedor de autenticação</li>
      </ul>
    </div>
    <div class="box">
      <div class="box-title">Localização (apenas durante o uso)</div>
      <ul>
        <li>Posição geográfica aproximada (GPS) — usada exclusivamente para encontrar postos próximos</li>
        <li>Não rastreamos localização em segundo plano</li>
        <li>Não armazenamos histórico de localização</li>
      </ul>
    </div>
    <div class="box">
      <div class="box-title">Dados do veículo (opcionais, armazenados localmente)</div>
      <ul>
        <li>Tipo de combustível preferido</li>
        <li>Consumo médio do veículo (km/l)</li>
        <li>Capacidade do tanque (litros)</li>
      </ul>
    </div>
    <div class="box">
      <div class="box-title">Contribuições de preços (se você reportar)</div>
      <ul>
        <li>Preço reportado, posto, combustível e data</li>
        <li>Nome de usuário associado ao reporte (para gamificação)</li>
      </ul>
    </div>

    <h2><span class="icon">🎯</span> 2. Como Usamos seus Dados</h2>
    <table>
      <tr><th>Dado</th><th>Finalidade</th></tr>
      <tr><td>Localização</td><td>Exibir postos próximos e calcular distâncias</td></tr>
      <tr><td>E-mail / nome</td><td>Identificar conta, salvar favoritos, gamificação</td></tr>
      <tr><td>Dados do veículo</td><td>Calcular economia de combustível personalizada</td></tr>
      <tr><td>Preços reportados</td><td>Melhorar precisão do app para todos os usuários</td></tr>
    </table>
    <p><strong>Não usamos seus dados para publicidade</strong>. O RotaPosto não exibe anúncios e não vende dados para anunciantes.</p>

    <h2><span class="icon">🔗</span> 3. Compartilhamento de Dados</h2>
    <p>Seus dados pessoais <strong>não são vendidos nem compartilhados comercialmente</strong>. Utilizamos apenas os seguintes serviços terceiros:</p>
    <table>
      <tr><th>Serviço</th><th>Finalidade</th><th>Política</th></tr>
      <tr><td>Google Firebase Auth</td><td>Autenticação segura (login com Google)</td><td><a href="https://policies.google.com/privacy" target="_blank">Ver política</a></td></tr>
      <tr><td>Cloudflare Pages</td><td>Hospedagem do app web</td><td><a href="https://www.cloudflare.com/privacypolicy/" target="_blank">Ver política</a></td></tr>
      <tr><td>ANP (Gov. Federal)</td><td>Dados públicos de preços de combustível</td><td>Dados abertos gov.br</td></tr>
      <tr><td>OpenStreetMap / OSRM</td><td>Mapas e cálculo de rotas</td><td><a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank">Ver política</a></td></tr>
    </table>
    <p>Podemos divulgar dados quando exigido por lei, ordem judicial ou autoridade competente.</p>

    <h2><span class="icon">🔐</span> 4. Segurança dos Dados</h2>
    <ul>
      <li>Toda comunicação é criptografada via <strong>HTTPS/TLS</strong></li>
      <li>Sessões gerenciadas com tokens únicos por dispositivo</li>
      <li>Dados de localização nunca são persistidos em servidor</li>
      <li>Dados de veículo ficam somente no <em>localStorage</em> do seu dispositivo</li>
      <li>Seguimos as diretrizes de segurança do Google para apps Android</li>
    </ul>

    <h2><span class="icon">👤</span> 5. Seus Direitos (LGPD)</h2>
    <p>De acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
    <ul>
      <li><strong>Acessar</strong> seus dados pessoais armazenados</li>
      <li><strong>Corrigir</strong> dados incompletos ou desatualizados</li>
      <li><strong>Excluir</strong> sua conta e todos os dados associados</li>
      <li><strong>Portabilidade</strong> dos seus dados</li>
      <li><strong>Revogar consentimento</strong> a qualquer momento</li>
    </ul>
    <p>Para exercer esses direitos: <a href="mailto:contato@rotaposto.com.br">contato@rotaposto.com.br</a></p>

    <h2><span class="icon">📍</span> 6. Permissões do App Android</h2>
    <table>
      <tr><th>Permissão</th><th>Para que é usada</th><th>Obrigatória?</th></tr>
      <tr><td>ACCESS_FINE_LOCATION</td><td>Localizar postos próximos com precisão</td><td>Não — pode usar busca manual</td></tr>
      <tr><td>ACCESS_COARSE_LOCATION</td><td>Localização aproximada (alternativa ao GPS)</td><td>Não</td></tr>
      <tr><td>INTERNET</td><td>Carregar dados de postos e preços</td><td>Sim — necessário para o app funcionar</td></tr>
    </table>
    <p>Nenhuma permissão é solicitada além das listadas acima. Não acessamos contatos, câmera, microfone, armazenamento externo ou SMS.</p>

    <h2><span class="icon">🍪</span> 7. Armazenamento Local</h2>
    <p>O app usa <em>localStorage</em> e <em>cookies de sessão</em> para:</p>
    <ul>
      <li>Manter sua sessão ativa após o login</li>
      <li>Salvar preferências (combustível favorito, configurações do veículo)</li>
      <li>Lembrar postos favoritados</li>
    </ul>
    <p>Nenhum dado de rastreamento publicitário ou cookie de terceiros é utilizado.</p>

    <h2><span class="icon">🔞</span> 8. Crianças e Adolescentes</h2>
    <p>O RotaPosto é destinado a <strong>usuários com 18 anos ou mais</strong> (motoristas habilitados). Não coletamos intencionalmente dados de menores. Se identificarmos que dados de menor foram coletados sem consentimento parental, os excluiremos imediatamente.</p>

    <h2><span class="icon">📢</span> 9. Anúncios</h2>
    <p>O RotaPosto <strong>não exibe anúncios</strong> e <strong>não utiliza redes de publicidade</strong>. Não há SDKs de anúncios no aplicativo.</p>

    <h2><span class="icon">🔄</span> 10. Alterações nesta Política</h2>
    <p>Podemos atualizar esta política periodicamente. A data de "última atualização" no topo sempre refletirá a versão mais recente. Mudanças significativas serão notificadas dentro do aplicativo.</p>

    <h2><span class="icon">📬</span> 11. Contato e Encarregado de Dados (DPO)</h2>
    <p>Para dúvidas, solicitações ou exercício de direitos LGPD:</p>
    <ul>
      <li>📧 E-mail: <a href="mailto:contato@rotaposto.com.br">contato@rotaposto.com.br</a></li>
      <li>🌐 Site: <a href="https://rotaposto.pages.dev">rotaposto.pages.dev</a></li>
      <li>📱 App Android: <code>br.com.rotaposto.app</code></li>
    </ul>
    <p>Respondemos solicitações em até <strong>15 dias úteis</strong>.</p>

    <div class="footer-note">
      ⚖️ Esta política está em conformidade com a <strong>LGPD (Lei 13.709/2018)</strong>, as <strong>Políticas do Google Play</strong> e o <strong>GDPR</strong> (para usuários europeus). O RotaPosto está registrado no Google Play com o pacote <code>br.com.rotaposto.app</code>.
    </div>
  </div>
</body>
</html>`)
})

// ══════════════════════════════════════════════════════
//  Página de Termos de Uso
// ══════════════════════════════════════════════════════
app.get('/termos', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Termos de Uso – RotaPosto</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9f9f9;color:#222;line-height:1.7}
    .container{max-width:720px;margin:0 auto;padding:32px 24px 64px}
    header{display:flex;align-items:center;gap:12px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #FF6D00}
    .logo{font-size:22px;font-weight:900}.logo .rota{color:#222}.logo .posto{color:#FF6D00}
    h1{font-size:26px;font-weight:800;color:#1A1A1A;margin-bottom:8px}
    .subtitle{font-size:14px;color:#888;margin-bottom:32px}
    h2{font-size:17px;font-weight:700;color:#FF6D00;margin:28px 0 10px;padding-left:12px;border-left:3px solid #FF6D00}
    p{font-size:15px;color:#444;margin-bottom:12px}
    ul{margin:0 0 12px 20px}
    li{font-size:15px;color:#444;margin-bottom:6px}
    a{color:#FF6D00;text-decoration:none}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:13px;color:#aaa;text-align:center}
    .back-btn{display:inline-flex;align-items:center;gap:6px;color:#FF6D00;font-weight:600;font-size:14px;margin-bottom:24px;text-decoration:none}
  </style>
</head>
<body>
<div class="container">
  <header>
    <div class="logo"><span class="rota">Rota</span><span class="posto">Posto</span></div>
  </header>

  <a href="/" class="back-btn">← Voltar</a>

  <h1>Termos de Uso</h1>
  <p class="subtitle">Última atualização: junho de 2025</p>

  <p>Bem-vindo ao <strong>RotaPosto</strong>. Ao usar nosso aplicativo, você concorda com os termos descritos abaixo. Leia com atenção antes de utilizar o serviço.</p>

  <h2>1. Aceitação dos Termos</h2>
  <p>Ao acessar ou usar o RotaPosto, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este serviço.</p>

  <h2>2. Descrição do Serviço</h2>
  <p>O RotaPosto é um aplicativo que auxilia motoristas a localizar postos de combustível próximos com os melhores preços, utilizando dados públicos da ANP (Agência Nacional do Petróleo, Gás Natural e Biocombustíveis) e informações reportadas pela comunidade de usuários.</p>

  <h2>3. Cadastro e Conta</h2>
  <ul>
    <li>O acesso ao serviço requer autenticação via Google ou Facebook.</li>
    <li>Você é responsável por manter a segurança da sua conta.</li>
    <li>É permitida apenas uma sessão ativa por usuário. Ao fazer login em um novo dispositivo, a sessão anterior será encerrada.</li>
    <li>Você deve ter ao menos 18 anos para usar o serviço.</li>
  </ul>

  <h2>4. Uso Aceitável</h2>
  <p>Você concorda em usar o RotaPosto apenas para fins lícitos. É proibido:</p>
  <ul>
    <li>Inserir preços falsos ou informações incorretas sobre postos.</li>
    <li>Usar o serviço para fins comerciais sem autorização prévia.</li>
    <li>Tentar acessar dados de outros usuários.</li>
    <li>Realizar ataques de força bruta, scraping ou qualquer abuso da API.</li>
    <li>Criar contas falsas ou múltiplas contas para um mesmo usuário.</li>
  </ul>

  <h2>5. Precisão das Informações</h2>
  <p>Os preços exibidos são baseados em dados da ANP e reportes da comunidade. O RotaPosto não garante a atualização em tempo real dos preços. Sempre confirme o preço no posto antes de abastecer.</p>

  <h2>6. Dados e Privacidade</h2>
  <p>O uso dos seus dados é regido pela nossa <a href="/privacidade">Política de Privacidade</a>, que é parte integrante destes Termos. Coletamos apenas os dados necessários para o funcionamento do serviço.</p>

  <h2>7. Propriedade Intelectual</h2>
  <p>Todo o conteúdo do RotaPosto — incluindo design, logotipo, código e textos — é propriedade do RotaPosto e protegido por leis de direitos autorais. É proibida a reprodução sem autorização.</p>

  <h2>8. Limitação de Responsabilidade</h2>
  <p>O RotaPosto não se responsabiliza por danos decorrentes de informações imprecisas de preços, falhas de conectividade, ou decisões tomadas com base nos dados exibidos no aplicativo.</p>

  <h2>9. Alterações nos Termos</h2>
  <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entram em vigor imediatamente após a publicação. O uso continuado do serviço após as alterações constitui aceitação dos novos termos.</p>

  <h2>10. Encerramento</h2>
  <p>Podemos suspender ou encerrar sua conta a qualquer momento em caso de violação destes termos, sem aviso prévio.</p>

  <h2>11. Contato</h2>
  <p>Para dúvidas sobre estes Termos de Uso:<br/>
  📧 <a href="mailto:contato@rotaposto.com.br">contato@rotaposto.com.br</a><br/>
  🌐 <a href="https://rotaposto.com.br">rotaposto.com.br</a></p>

  <footer>© 2025 RotaPosto. Todos os direitos reservados.</footer>
</div>
</body>
</html>`)
})

app.get('/app_old', (c) => {
  const firebaseScripts = getFirebaseAuthScripts()
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <meta name="theme-color" content="#FF6D00"/>
  <meta name="description" content="Encontre o posto de combustível mais barato perto de você. Gasolina, Etanol, Diesel e GNV com dados reais ANP."/>
  <!-- PWA -->
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="RotaPosto"/>
  <meta name="application-name" content="RotaPosto"/>
  <meta name="msapplication-TileColor" content="#0D1B2A"/>
  <!-- Open Graph -->
  <meta property="og:title" content="RotaPosto – Ache o Melhor Preço"/>
  <meta property="og:description" content="Posto de combustível mais barato perto de você"/>
  <meta property="og:image" content="/icons/icon-512x512.png"/>
  <meta property="og:type" content="website"/>
  <!-- Google OAuth -->
  <meta name="google-signin-client_id" content="${GOOGLE_CLIENT_ID}"/>
  <title>RotaPosto – Ache o Melhor Preço</title>
  <!-- PWA Manifest + Icons -->
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png"/>
  <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png"/>
  <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png"/>
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <!-- Firebase Auth (modular) -->
  ${firebaseScripts}
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

    /* ── DESKTOP LAYOUT (>= 768px) ───────────────────── */
    #desktop-sidebar { display: none; }
    #desktop-panel { display: none; }

    @media (min-width: 768px) {
      :root { --tab-h: 0px; }
      body {
        max-width: 100%; margin: 0;
        display: flex; background: #0A1520;
      }
      /* Sidebar fixa esquerda */
      #desktop-sidebar {
        display: flex !important; flex-direction: column;
        width: 220px; min-width: 220px;
        height: 100dvh; position: sticky; top: 0;
        background: #0A1520;
        border-right: 1px solid rgba(255,255,255,0.08);
        padding: 24px 0 16px; z-index: 300;
      }
      .sidebar-logo {
        padding: 0 20px 20px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        margin-bottom: 12px;
      }
      .sidebar-logo-inner { display: flex; align-items: center; gap: 10px; }
      .sidebar-logo-icon {
        width: 38px; height: 38px;
        background: linear-gradient(135deg, var(--laranja), var(--amarelo));
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      .sidebar-logo-text { font-size: 20px; font-weight: 900; color: #fff; }
      .sidebar-logo-text span { color: var(--laranja); }
      .sidebar-logo-sub { font-size: 10px; color: rgba(255,255,255,0.35); font-weight: 600; margin-top: 1px; }
      .sidebar-nav-item {
        display: flex; align-items: center; gap: 11px;
        padding: 12px 20px;
        color: rgba(255,255,255,0.45);
        font-size: 12px; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.5px;
        cursor: pointer;
        border-left: 3px solid transparent;
        transition: all 0.2s;
      }
      .sidebar-nav-item i { font-size: 16px; width: 18px; text-align: center; }
      .sidebar-nav-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
      .sidebar-nav-item.active {
        color: var(--laranja); background: rgba(255,109,0,0.10); border-left-color: var(--laranja);
      }
      .sidebar-spacer { flex: 1; }
      .sidebar-user {
        padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.08);
        display: flex; align-items: center; gap: 10px; cursor: pointer;
      }
      .sidebar-user:hover { background: rgba(255,255,255,0.04); }
      .sidebar-user-info { flex: 1; min-width: 0; }
      .sidebar-user-name { font-size: 12px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sidebar-user-plan { font-size: 10px; color: var(--laranja); font-weight: 700; }
      /* Área principal central */
      #app-main {
        flex: 1; min-width: 0;
        background: var(--cinza-bg);
        max-width: 500px;
        height: 100dvh; overflow-y: auto;
        border-right: 1px solid rgba(0,0,0,0.10);
        scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.15) transparent;
      }
      /* Painel direito */
      #desktop-panel {
        display: flex !important; flex-direction: column;
        flex: 1; min-width: 280px;
        height: 100dvh; overflow-y: auto;
        background: #0D1B2A;
        padding: 24px 20px;
        scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
      }
      #desktop-panel h2 {
        font-size: 14px; font-weight: 800;
        color: rgba(255,255,255,0.5);
        text-transform: uppercase; letter-spacing: 1px;
        margin-bottom: 16px;
      }
      /* Header ajustes desktop */
      #header { padding-top: 18px; }
      /* Esconder bottom nav */
      #bottom-nav { display: none !important; }
      /* Views sem padding bottom extra */
      #view-destaque, #view-planejar { padding-bottom: 24px; }
      #view-lista { padding-bottom: 16px; }
      #map-container { height: calc(100dvh - 130px); }
      /* Modal centralizado */
      .modal-overlay { align-items: center; }
      .modal-sheet {
        border-radius: var(--radius);
        max-height: 90dvh;
        animation: fadeScale 0.2s ease;
      }
      @keyframes fadeScale { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
      #toast { bottom: 24px; }
    }
    @media (min-width: 1100px) {
      #desktop-sidebar { width: 240px; min-width: 240px; }
      #app-main { max-width: 540px; }
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
    /* Barra de economia real — ocupa linha inteira */
    .economia-real-bar {
      background: rgba(105,240,174,0.12);
      border: 1px solid rgba(105,240,174,0.25);
      border-radius: 12px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      position: relative; z-index: 1;
    }
    .economia-real-bar .er-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.5px; }
    .economia-real-bar .er-val { font-size: 15px; font-weight: 900; color: #69F0AE; }
    .economia-real-bar .er-detalhe { font-size: 10px; color: rgba(255,255,255,0.35); font-weight: 500; }
    /* Card com score de economia */
    .card-posto .economia-score {
      font-size: 10px; font-weight: 700;
      color: #69F0AE;
      margin-top: 2px;
    }
    .card-posto .economia-score.neutro { color: rgba(0,0,0,0.35); }
    /* Configuração de consumo */
    .consumo-config {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.55);
      margin-bottom: 4px;
    }
    .consumo-select {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 6px;
      cursor: pointer;
      outline: none;
    }

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
    .badge-anp { background: #EEF2FF; color: var(--azul-vivo); }
    .badge-osm { background: var(--laranja-claro); color: #E65100; }
    .badge-ia { background: #F3E5F5; color: #7B1FA2; }

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

    /* ── MODAL LOGIN FIREBASE ── */
    .auth-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.70);
      z-index: 900;
      display: none; align-items: center; justify-content: center;
      padding: 20px;
    }
    .auth-modal-overlay.visible { display: flex; }
    .auth-modal {
      background: var(--branco);
      border-radius: 24px;
      padding: 28px 24px;
      width: 100%; max-width: 380px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      animation: slideUp 0.3s ease;
    }
    .auth-logo { text-align: center; margin-bottom: 20px; }
    .auth-logo img { width: 72px; height: 72px; border-radius: 18px; margin-bottom: 8px; }
    .auth-logo h2 { font-size: 20px; font-weight: 900; color: var(--azul-escuro); }
    .auth-logo p { font-size: 12px; color: var(--cinza-texto); font-weight: 500; margin-top: 2px; }
    .auth-divider { display: flex; align-items: center; gap: 10px; margin: 16px 0; }
    .auth-divider span { font-size: 11px; color: var(--cinza-texto); font-weight: 600; white-space: nowrap; }
    .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: var(--cinza-borda); }
    .btn-social {
      width: 100%; padding: 13px;
      border-radius: 12px; border: 1.5px solid var(--cinza-borda);
      background: var(--branco);
      display: flex; align-items: center; justify-content: center; gap: 10px;
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 700;
      color: var(--texto-principal);
      cursor: pointer; margin-bottom: 10px;
      transition: all 0.2s;
    }
    .btn-social:active { background: var(--cinza-bg); }
    .btn-social img { width: 20px; height: 20px; }
    .btn-social.fb { background: #1877F2; color: white; border-color: #1877F2; }
    .auth-input {
      width: 100%; padding: 12px 14px;
      border: 1.5px solid var(--cinza-borda);
      border-radius: 12px;
      font-family: 'Raleway', sans-serif;
      font-size: 14px; font-weight: 600;
      color: var(--texto-principal);
      background: var(--cinza-bg);
      outline: none; margin-bottom: 10px;
    }
    .auth-input:focus { border-color: var(--azul-vivo); background: var(--branco); }
    .btn-auth-primary {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, var(--azul-escuro), var(--azul-medio));
      color: var(--branco); border: none; border-radius: 12px;
      font-family: 'Raleway', sans-serif;
      font-size: 15px; font-weight: 800;
      cursor: pointer; margin-top: 4px;
      transition: transform 0.15s;
    }
    .btn-auth-primary:active { transform: scale(0.98); }
    .auth-footer { text-align: center; margin-top: 14px; font-size: 11px; color: var(--cinza-texto); font-weight: 500; }
    .auth-footer a { color: var(--azul-vivo); font-weight: 700; text-decoration: none; }

    /* ── BANNER PIX PREMIUM ── */
    #pwa-install-banner {
      position: fixed; bottom: calc(var(--tab-h) + 12px); left: 50%;
      transform: translateX(-50%) translateY(100px);
      width: calc(100% - 32px); max-width: 398px;
      background: linear-gradient(135deg, var(--azul-escuro), #1B3A5C);
      border-radius: 16px;
      padding: 14px 16px;
      display: flex; align-items: center; gap: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.35);
      z-index: 600;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    #pwa-install-banner.visible {
      transform: translateX(-50%) translateY(0);
    }
    #pwa-install-banner img { width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0; }
    #pwa-install-banner .banner-txt { flex: 1; }
    #pwa-install-banner .banner-txt strong { font-size: 13px; font-weight: 800; color: var(--branco); display: block; }
    #pwa-install-banner .banner-txt span { font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 500; }
    .btn-install {
      padding: 9px 16px;
      background: var(--laranja); color: var(--branco);
      border: none; border-radius: 10px;
      font-family: 'Raleway', sans-serif;
      font-size: 12px; font-weight: 800;
      cursor: pointer; white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── MODAL PIX ASSINATURA ── */
    .pix-modal { max-width: 360px; text-align: center; }
    .pix-qr-wrap { 
      background: var(--cinza-bg); border-radius: 16px;
      padding: 20px; margin: 16px 0;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    .pix-qr-wrap img { width: 200px; height: 200px; border-radius: 8px; }
    .pix-copy-btn {
      width: 100%; padding: 12px;
      background: var(--azul-escuro); color: var(--branco);
      border: none; border-radius: 10px;
      font-family: 'Raleway', sans-serif;
      font-size: 13px; font-weight: 800;
      cursor: pointer;
    }
    .pix-steps { text-align: left; }
    .pix-steps li { font-size: 12px; color: var(--cinza-texto); font-weight: 500; margin-bottom: 5px; padding-left: 4px; }

    /* ── AVATAR USUÁRIO ── */
    .user-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--laranja);
    }
    .btn-premium-tag {
      background: linear-gradient(135deg, #FFD600, #FF6D00);
      color: var(--azul-escuro);
      font-size: 9px; font-weight: 900;
      padding: 2px 7px; border-radius: 100px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
  </style>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
</head>
<body>

<!-- ═══ SIDEBAR DESKTOP ═══════════════════════════════════════════════════ -->
<nav id="desktop-sidebar">
  <div class="sidebar-logo">
    <div class="sidebar-logo-inner">
      <div class="sidebar-logo-icon">⛽</div>
      <div>
        <div class="sidebar-logo-text">Rota<span>Posto</span></div>
        <div class="sidebar-logo-sub">Combustível inteligente</div>
      </div>
    </div>
  </div>
  <div class="sidebar-nav-item active" id="snav-destaque" onclick="mudarTab('destaque',null);snavSetActive('snav-destaque')">
    <i class="fas fa-trophy"></i> Melhor Posto
  </div>
  <div class="sidebar-nav-item" id="snav-lista" onclick="mudarTab('lista',null);snavSetActive('snav-lista')">
    <i class="fas fa-list"></i> Lista
  </div>
  <div class="sidebar-nav-item" id="snav-mapa" onclick="mudarTab('mapa',null);snavSetActive('snav-mapa')">
    <i class="fas fa-map"></i> Mapa
  </div>
  <div class="sidebar-nav-item" id="snav-planejar" onclick="mudarTab('planejar',null);snavSetActive('snav-planejar')">
    <i class="fas fa-route"></i> Planejar
  </div>
  <a class="sidebar-nav-item" href="/mapa-brasil" style="text-decoration:none">
    <i class="fas fa-globe-americas" style="color:#00C853"></i> Brasil
  </a>
  <div class="sidebar-spacer"></div>
  <div class="sidebar-user" onclick="abrirLogin()" id="sidebar-user-area">
    <i class="fas fa-user-circle" style="font-size:28px;color:rgba(255,255,255,0.3)"></i>
    <div class="sidebar-user-info">
      <div class="sidebar-user-name" id="sidebar-user-name">Visitante</div>
      <div class="sidebar-user-plan" id="sidebar-user-plan">Entrar</div>
    </div>
  </div>
</nav>

<!-- ═══ CONTEÚDO PRINCIPAL ════════════════════════════════════════════════ -->
<div id="app-main">

<!-- ═══ MODAL LOGIN FIREBASE ═══════════════════════════════════════════════ -->
<div class="auth-modal-overlay" id="auth-modal">
  <div class="auth-modal">
    <div class="auth-logo">
      <img src="/icons/icon-192x192.png" alt="RotaPosto"/>
      <h2>RotaPosto</h2>
      <p id="auth-modal-subtitle">Entre para acessar recursos exclusivos</p>
    </div>

    <!-- Toggle Entrar / Criar conta -->
    <div style="display:flex;background:rgba(255,255,255,0.07);border-radius:12px;padding:4px;margin-bottom:18px;gap:4px">
      <button id="tab-entrar" onclick="setAuthTab('entrar')" style="flex:1;padding:9px;border:none;border-radius:9px;font-size:12px;font-weight:800;cursor:pointer;transition:all 0.2s;background:var(--azul-escuro);color:white">
        Entrar
      </button>
      <button id="tab-criar" onclick="setAuthTab('criar')" style="flex:1;padding:9px;border:none;border-radius:9px;font-size:12px;font-weight:800;cursor:pointer;transition:all 0.2s;background:transparent;color:rgba(255,255,255,0.5)">
        Criar conta
      </button>
    </div>

    <!-- Login Social -->
    <button class="btn-social" id="btn-google-login" onclick="loginGoogle()">
      <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      <span id="btn-google-txt">Continuar com Google</span>
    </button>

    <button class="btn-social fb" id="btn-fb-login" onclick="loginFacebook()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      <span id="btn-fb-txt">Continuar com Facebook</span>
    </button>

    <div class="auth-divider"><span>ou use seu email</span></div>

    <!-- Campo nome (só no modo criar conta) -->
    <input type="text" class="auth-input" id="auth-nome" placeholder="Seu nome" style="display:none"/>
    <input type="email" class="auth-input" id="auth-email" placeholder="seu@email.com"/>
    <input type="password" class="auth-input" id="auth-senha" placeholder="Senha (mín. 6 caracteres)"/>

    <button class="btn-auth-primary" id="btn-auth-submit" onclick="submitAuth()">
      <i class="fas fa-sign-in-alt"></i> Entrar
    </button>

    <div id="auth-erro" style="color:#FF6D00;font-size:12px;font-weight:600;min-height:18px;margin-top:4px;text-align:center"></div>

    <div class="auth-footer">
      <a href="#" onclick="fecharLogin()" style="margin-top:8px;display:block;">Continuar sem login</a>
    </div>
  </div>
</div>

<!-- ═══ MODAL PIX ASSINATURA ════════════════════════════════════════════════ -->
<div class="modal-overlay" id="pix-modal-overlay" onclick="fecharPixModal(event)">
  <div class="modal-sheet pix-modal" id="pix-modal-sheet">
    <div class="modal-handle"></div>
    <div id="pix-modal-content">
      <div style="text-align:center;padding:32px">
        <div class="spinner" style="margin:0 auto 12px;border-top-color:var(--laranja)"></div>
        <p style="font-size:13px;font-weight:700;color:var(--cinza-texto)">Gerando QR Code PIX...</p>
      </div>
    </div>
  </div>
</div>

<!-- ═══ BANNER INSTALL PWA ══════════════════════════════════════════════════ -->
<div id="pwa-install-banner">
  <img src="/icons/icon-192x192.png" alt="RotaPosto"/>
  <div class="banner-txt">
    <strong>Instalar RotaPosto</strong>
    <span>Acesso rápido na tela inicial</span>
  </div>
  <button class="btn-install" id="btn-pwa-install">Instalar</button>
</div>

<!-- Banner Inadimplência App -->
<div id="banner-inadimplencia" style="display:none;position:fixed;top:0;left:0;right:0;z-index:9990;background:linear-gradient(90deg,#b71c1c,#d32f2f);padding:12px 16px;box-shadow:0 4px 20px rgba(0,0,0,0.4)">
  <div style="display:flex;align-items:center;gap:12px;max-width:600px;margin:0 auto">
    <span style="font-size:20px;flex-shrink:0">⚠️</span>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:800;color:#fff">Renovação pendente — plano rebaixado para Gratuito</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:2px">Não conseguimos cobrar sua assinatura. Pague agora para reativar o Premium.</div>
    </div>
    <button onclick="abrirPIXRenovacao()" style="background:#fff;color:#b71c1c;border:none;padding:8px 16px;border-radius:10px;font-weight:900;font-size:12px;cursor:pointer;flex-shrink:0;white-space:nowrap">💳 Pagar agora</button>
    <button onclick="document.getElementById('banner-inadimplencia').style.display='none'" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px;flex-shrink:0">✕</button>
  </div>
</div>

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

<!-- Modal Completar Perfil (pós login social) -->
<div id="modal-completar-perfil" style="display:none;position:fixed;inset:0;z-index:19999;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);align-items:flex-end;justify-content:center;">
  <div style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;padding:0 0 32px;position:relative;max-height:92vh;overflow-y:auto;">
    <div style="display:flex;justify-content:center;padding:12px 0 0;">
      <div style="width:40px;height:4px;background:#E0E0E0;border-radius:2px;"></div>
    </div>
    <div style="padding:20px 24px 0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:44px;height:44px;background:#FFF3E0;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">📋</div>
        <div>
          <h2 style="font-size:18px;font-weight:800;color:#1A1A1A;margin:0;">Complete seu perfil</h2>
          <p style="font-size:13px;color:#757575;margin:0;">Adicione seu contato e endereço</p>
        </div>
      </div>

      <div style="background:#F0FFF4;border:1.5px solid #C6F6D5;border-radius:12px;padding:12px 14px;margin-bottom:18px;font-size:13px;color:#276749;">
        📍 Isso nos ajuda a mostrar postos próximos à sua região padrão e facilitar o preenchimento de dados.
      </div>

      <!-- Telefone -->
      <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px;">📱 Celular / WhatsApp <span style="font-weight:400;color:#AAA;">(opcional)</span></label>
      <input id="cp-telefone" type="tel" placeholder="(11) 99999-9999" maxlength="15"
        oninput="formatarTelefone(this)"
        style="width:100%;padding:13px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;box-sizing:border-box;margin-bottom:14px;font-family:inherit;">

      <!-- CEP -->
      <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px;">📮 CEP <span style="font-weight:400;color:#AAA;">(opcional)</span></label>
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <input id="cp-cep" type="text" placeholder="00000-000" maxlength="8"
          oninput="this.value=this.value.replace(/\D/g,'').slice(0,8)"
          onblur="this.value=_fmtCep(this.value)"
          style="flex:1;padding:13px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;box-sizing:border-box;font-family:inherit;">
        <button onclick="buscarCEP()" style="padding:13px 16px;background:#FF6D00;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;">Buscar</button>
      </div>

      <!-- Rua -->
      <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px;">🏠 Rua / Endereço</label>
      <input id="cp-rua" type="text" placeholder="Rua das Flores, 123"
        style="width:100%;padding:13px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;box-sizing:border-box;margin-bottom:14px;font-family:inherit;">

      <!-- Cidade e Estado -->
      <div style="display:grid;grid-template-columns:1fr 80px;gap:10px;margin-bottom:20px;">
        <div>
          <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px;">🏙️ Cidade</label>
          <input id="cp-cidade" type="text" placeholder="São Paulo"
            style="width:100%;padding:13px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;box-sizing:border-box;font-family:inherit;">
        </div>
        <div>
          <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:6px;">UF</label>
          <input id="cp-estado" type="text" placeholder="SP" maxlength="2"
            oninput="this.value=this.value.toUpperCase()"
            style="width:100%;padding:13px;border:1.5px solid #E0E0E0;border-radius:12px;font-size:15px;box-sizing:border-box;font-family:inherit;text-transform:uppercase;">
        </div>
      </div>

      <!-- Botões -->
      <button onclick="salvarCompletarPerfil()" style="width:100%;padding:16px;background:#FF6D00;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:10px;">
        ✅ Salvar e continuar
      </button>
      <button onclick="pularCompletarPerfil()" style="width:100%;padding:14px;background:transparent;color:#888;border:none;border-radius:16px;font-size:14px;cursor:pointer;">
        Pular por agora
      </button>
    </div>
  </div>
</div>
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
      <!-- Área dinâmica: botão login ou avatar do usuário -->
      <div id="header-auth-area" style="display:flex;align-items:center;gap:6px">
        <button class="btn-icon" onclick="abrirLogin()" title="Entrar">
          <i class="fas fa-user-circle" style="font-size:20px"></i>
        </button>
        <button class="btn-premium-tag" onclick="abrirModalPIX('premium')">
          ⚡ Premium
        </button>
      </div>
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
  <a href="/mapa-brasil" class="tab-btn" style="text-decoration:none;color:inherit">
    <i class="fas fa-globe-americas" style="color:#00C853"></i>Brasil
  </a>
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
      <div id="fonte-info" style="margin-bottom:10px;"></div>
      <div class="preco-destaque" id="banner-preco">
        <span class="cifra">R$</span>
        <span class="valor" id="banner-valor">–,–</span>
        <span class="cents" id="banner-cents"></span>
      </div>
      <!-- Configuração rápida de consumo -->
      <div class="consumo-config" id="consumo-config-bar">
        <i class="fas fa-tachometer-alt" style="color:rgba(255,255,255,0.4)"></i>
        <span>Consumo:</span>
        <select class="consumo-select" id="select-consumo" onchange="atualizarConsumo(this.value)">
          <option value="8">8 km/L (SUV)</option>
          <option value="10">10 km/L (Pickup)</option>
          <option value="12" selected>12 km/L (Sedan)</option>
          <option value="14">14 km/L (Hatch)</option>
          <option value="16">16 km/L (Flex)</option>
          <option value="18">18 km/L (Econômico)</option>
        </select>
        <span style="margin-left:auto;font-size:10px;opacity:0.4">Tanque:</span>
        <select class="consumo-select" id="select-tanque" onchange="atualizarConsumo()">
          <option value="35">35L</option>
          <option value="40">40L</option>
          <option value="50" selected>50L</option>
          <option value="60">60L</option>
          <option value="70">70L</option>
        </select>
      </div>
      <!-- Barra de economia real (vs segundo melhor) -->
      <div class="economia-real-bar" id="economia-real-bar" style="display:none">
        <div>
          <div class="er-label">🧠 Economia real (com deslocamento)</div>
          <div class="er-detalhe" id="stat-custo-desloc">Calculando custo de ir até o posto...</div>
        </div>
        <div class="er-val" id="stat-economia-real">–</div>
      </div>
      <div class="stats-grid" id="banner-stats">
        <div class="stat-box">
          <div class="stat-label">📍 Distância</div>
          <div class="stat-val laranja" id="stat-dist">–</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">⛽ Preço/litro</div>
          <div class="stat-val" id="stat-preco-litro">–</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">💰 Economia/litro</div>
          <div class="stat-val verde" id="stat-eco-litro">–</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">🛢️ Economia tanque</div>
          <div class="stat-val verde" id="stat-eco-tanque">–</div>
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
      <button class="sort-tab" id="sort-score" onclick="ordenarPor('score')">
        🧠 Maior Economia
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
  registrarSW();
  iniciarPWAPrompt();
  iniciarFirebaseAuth();
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
    const consumo = state.consumoKmL || 12;
    const tanque  = state.litrosTanque || 50;
    const url = \`/api/postos?lat=\${state.lat}&lng=\${state.lng}&combustivel=\${state.combustivel}&raio=15&consumo=\${consumo}&litros=\${tanque}\`;
    const res = await fetch(url);
    const data = await res.json();
    state.postos = data.postos || [];
    state.estatisticas = data.estatisticas || {};
    renderizarDestaque();
    renderizarLista();
    atualizarMapa();
    // Atualizar painel desktop com localização atual
    atualizarPainelLocalizacao(data);
  } catch (e) {
    mostrarToast('Erro ao buscar postos');
  } finally {
    ocultarLoading();
  }
}

function atualizarPainelLocalizacao(data) {
  const elC = document.getElementById('dp-cidade');
  const elK = document.getElementById('dp-coords');
  if (!elC || !elK) return;
  const cidade = data.postos && data.postos[0] ? data.postos[0].cidade : '-';
  const uf = data.postos && data.postos[0] ? (data.postos[0].uf || '') : '';
  elC.textContent = cidade + (uf ? ' - ' + uf : '');
  elK.textContent = state.lat.toFixed(4) + ', ' + state.lng.toFixed(4) + ' (' + state.postos.length + ' postos)';
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
  const mediaPreco = state.estatisticas?.mediaPreco || melhor.preco;
  const consumoAtual = parseFloat((document.getElementById('select-consumo'))?.value || '12');
  const tanqueAtual  = parseFloat((document.getElementById('select-tanque') )?.value || '50');

  // Banner
  document.getElementById('banner-nome').textContent = melhor.nome;

  const precoStr = melhor.preco.toFixed(2);
  const [int, dec] = precoStr.split('.');
  document.getElementById('banner-valor').textContent = int + ',';
  document.getElementById('banner-cents').textContent = dec;

  const dist = melhor.distancia < 1
    ? (melhor.distancia * 1000).toFixed(0) + 'm'
    : melhor.distancia.toFixed(1) + 'km';
  document.getElementById('stat-dist').textContent = dist;

  // Preço/litro direto
  const elPrecoLitro = document.getElementById('stat-preco-litro');
  if (elPrecoLitro) elPrecoLitro.textContent = 'R$ ' + melhor.preco.toFixed(2) + '/L';

  // Economia vs segundo colocado
  const econLitro = segundo ? Math.max(0, segundo.preco - melhor.preco) : Math.max(0, mediaPreco - melhor.preco);
  const ecoTanque  = (econLitro * tanqueAtual).toFixed(2);
  document.getElementById('stat-eco-litro').textContent  = econLitro > 0 ? 'R$ ' + econLitro.toFixed(2) + '/L' : '✓ Melhor preço';
  document.getElementById('stat-eco-tanque').textContent = econLitro > 0 ? 'R$ ' + ecoTanque : '–';
  document.getElementById('stat-total').textContent = postos.length + ' postos';

  // ── Economia REAL (custo total: tanque + deslocamento) ───────────────────────
  const barraReal = document.getElementById('economia-real-bar');
  const elEcoReal = document.getElementById('stat-economia-real');
  const elCustoDesloc = document.getElementById('stat-custo-desloc');

  if (melhor.custoDeslocamento !== undefined && barraReal && elEcoReal) {
    const custoDesloc = melhor.custoDeslocamento || 0;
    const ecoTotalReal = melhor.economiaTotalReal || 0;

    barraReal.style.display = 'flex';

    if (elCustoDesloc) {
      elCustoDesloc.textContent =
        custoDesloc > 0
          ? 'Custo de ir ao posto: ~R$ ' + custoDesloc.toFixed(2) + ' (' + dist + ' x 2, ' + consumoAtual + 'km/L)'
          : 'Posto mais proximo - deslocamento minimo';
    }

    if (ecoTotalReal > 0) {
      elEcoReal.textContent = 'Economiza R$ ' + ecoTotalReal.toFixed(2);
      elEcoReal.style.color = '#69F0AE';
    } else {
      elEcoReal.textContent = '✓ Melhor custo total';
      elEcoReal.style.color = '#69F0AE';
    }
  } else if (barraReal) {
    // Calcular na UI mesmo sem score do backend
    const litrosIdaVolta = (melhor.distancia * 2) / consumoAtual;
    const custoDesloc = litrosIdaVolta * melhor.preco;
    barraReal.style.display = 'flex';
    if (elCustoDesloc) {
      elCustoDesloc.textContent = 'Custo de ir ao posto: ~R$ ' + custoDesloc.toFixed(2) + ' (' + dist + ' x 2, ' + consumoAtual + 'km/L)';
    }
    if (elEcoReal) { elEcoReal.textContent = '✓ Melhor custo total'; elEcoReal.style.color = '#69F0AE'; }
  }

  // Endereço + fonte
  const fonte = state.estatisticas?.fonte || 'anp+osm';
  const fonteTxt = fonte.includes('anp') ? '🏛 ANP + OSM' : '🗺 OpenStreetMap';
  const city = state.estatisticas?.cidade || '';
  document.getElementById('banner-end').textContent =
    (melhor.endereco || melhor.bairro || city) + ' · ' + melhor.cidade;

  const fonteEl = document.getElementById('fonte-info');
  if (fonteEl) {
    fonteEl.innerHTML = '<span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.55)">' +
      fonteTxt + ' · ' + postos.length + ' postos · ' + city +
      '</span>';
  }

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
  const isMelhor = i === 0 && (state.ordenacao === 'preco' || state.ordenacao === 'score');
  const isMelhorScore = i === 0 && state.ordenacao === 'score';

  // Badge de fonte de dados
  const fonteBadge = p.fonte === 'anp'
    ? '<span class="badge badge-anp">🏛 ANP</span>'
    : p.fonte === 'osm'
      ? '<span class="badge badge-osm">🗺 OSM</span>'
      : '<span class="badge badge-ia">👥 Colab</span>';

  // Badge score de economia real
  let econScoreHtml = '';
  if (p.economiaTotalReal !== undefined) {
    if (isMelhorScore) {
      econScoreHtml = '<div class="economia-score">\ud83e\udde0 Melhor custo total</div>';
    } else if (p.economiaTotalReal > 0) {
      econScoreHtml = '<div class="economia-score neutro">+R$ ' + p.economiaTotalReal.toFixed(2) + ' a mais no total</div>';
    }
  }

  // Linha de custo deslocamento (só no tab score)
  let deslocHtml = '';
  if (state.ordenacao === 'score' && p.custoDeslocamento !== undefined) {
    deslocHtml = '<div style="font-size:9px;color:rgba(0,0,0,0.35);margin-top:1px">Desloc: ~R$ ' + p.custoDeslocamento.toFixed(2) + '</div>';
  }

  return \`
  <div class="card-posto \${isMelhor ? 'melhor-posto' : ''}" onclick="abrirModalPosto('\${p.id}')" style="animation-delay:\${i * 0.05}s">
    <div class="bandeira-box">
      <span class="bandeira-emoji">\${p.emoji || '⛽'}</span>
      <span class="bandeira-txt">\${p.bandeira.substring(0,7)}</span>
    </div>
    <div class="posto-info">
      <div class="posto-nome">\${p.nome}</div>
      <div class="posto-end">\${p.endereco || p.bairro || p.cidade}</div>
      <div class="posto-tags">
        <span class="badge badge-dist"><i class="fas fa-map-pin"></i> \${dist}</span>
        \${isMelhor && state.ordenacao !== 'score' ? '<span class="badge badge-melhor">⭐ Mais barato</span>' : ''}
        \${isMelhorScore ? '<span class="badge badge-melhor">🧠 Maior economia</span>' : ''}
        \${fonteBadge}
      </div>
    </div>
    <div class="posto-preco-col">
      <div class="preco \${isMelhor ? 'melhor' : ''}">R$ \${p.preco.toFixed(2)}</div>
      \${!isMelhor
        ? '<div class="economia-txt">+R$ ' + economiaPorLitro + '/L</div>'
        : '<div class="economia-txt verde">✓ Melhor preco</div>'}
      \${econScoreHtml}
      \${deslocHtml}
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

    <!-- Crowdsourcing + Gamificação -->
    <div style="margin-top:10px;background:linear-gradient(135deg,rgba(13,27,42,0.8),rgba(26,39,64,0.8));border-radius:14px;border:1.5px solid rgba(255,109,0,0.25);overflow:hidden">
      <!-- Header gamificado -->
      <div style="padding:10px 12px;background:rgba(255,109,0,0.08);border-bottom:1px solid rgba(255,109,0,0.15);display:flex;align-items:center;gap:8px">
        <div style="background:rgba(255,193,7,0.15);border-radius:8px;padding:5px 8px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-ticket-alt" style="color:#FFC107;font-size:11px"></i>
          <span style="font-size:10px;font-weight:800;color:#FFC107">+1 NUMERO SORTEIO</span>
        </div>
        <span style="font-size:10px;color:rgba(255,255,255,0.4)">+10 pontos ao reportar!</span>
      </div>
      <!-- Input de preco -->
      <div style="padding:12px">
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);margin-bottom:8px">
          <i class="fas fa-users" style="color:var(--azul-vivo)"></i> Sabe o preco atual? Ajude e ganhe pontos!
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <div style="position:relative;flex:1">
            <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:800;color:rgba(255,255,255,0.4)">R$</span>
            <input type="number" id="preco-reportar" placeholder="0,00" step="0.01" min="1" max="20"
              style="width:100%;padding:9px 10px 9px 30px;border:1.5px solid rgba(255,255,255,0.12);border-radius:10px;font-family:'Raleway',sans-serif;font-size:15px;font-weight:800;color:white;background:rgba(255,255,255,0.06);outline:none;box-sizing:border-box"
              onfocus="this.style.borderColor='var(--laranja)'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'"/>
          </div>
          <button id="btn-reportar-preco" onclick="reportarPreco('\${posto.id}', '\${state.combustivel}', '\${(posto.nome||'').replace(/'/g,'')}')"
            style="padding:9px 16px;background:linear-gradient(135deg,#FF6D00,#ff8c00);color:white;border:none;border-radius:10px;font-family:'Raleway',sans-serif;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;flex-shrink:0">
            <i class="fas fa-paper-plane"></i> Reportar
          </button>
        </div>
        <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:6px;display:flex;align-items:center;gap:6px">
          <span class="\${posto.fonte === 'anp' ? 'badge badge-anp' : 'badge badge-osm'}">\${posto.fonte?.toUpperCase() || 'ANP'}</span>
          <span>\${posto.fontePreco === 'estimado' ? '📊 Preco estimado ANP' : posto.fontePreco === 'colaborativo' ? \`👥 \${posto.confirmacoesPreco || 1} confirmacoes\` : '📊 Dado ANP'}</span>
        </div>
      </div>
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

  // Sincronizar sidebar desktop
  const snavMap = {destaque:'snav-destaque',lista:'snav-lista',mapa:'snav-mapa',planejar:'snav-planejar'};
  if (snavMap[tab]) snavSetActive(snavMap[tab]);

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
  return [...postos].sort((a, b) => {
    if (state.ordenacao === 'preco')     return a.preco - b.preco;
    if (state.ordenacao === 'score')     return (a.score || 9999) - (b.score || 9999);
    return a.distancia - b.distancia; // distancia
  });
}

function ordenarPor(tipo) {
  state.ordenacao = tipo;
  document.getElementById('sort-preco').classList.toggle('active', tipo === 'preco');
  document.getElementById('sort-dist').classList.toggle('active',  tipo === 'distancia');
  const sortScore = document.getElementById('sort-score');
  if (sortScore) sortScore.classList.toggle('active', tipo === 'score');
  renderizarDestaque();
  renderizarLista();
}

// Atualizar consumo e reprocessar resultados
function atualizarConsumo(val) {
  // Re-buscar postos com novo consumo/tanque
  const consumo = parseFloat((document.getElementById('select-consumo'))?.value || '12');
  const tanque  = parseFloat((document.getElementById('select-tanque') )?.value || '50');
  // Atualizar parâmetros de busca para próxima requisição
  state.consumoKmL = consumo;
  state.litrosTanque = tanque;
  // Re-renderizar com os dados atuais (score é recalculado pelo backend na próxima busca)
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

// ══════════════════════════════════════════════════════════════════════════════
// ═══ SERVICE WORKER + PWA AUTO-UPDATE ════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
let _swRegistration = null;

function registrarSW() {
  if (!('serviceWorker' in navigator)) return;



      // Checar por update imediatamente (importante ao abrir o PWA)
      reg.update().catch(() => {});

      // Quando um novo SW é encontrado
      reg.addEventListener('updatefound', () => {
        const novoSW = reg.installing;
        if (!novoSW) return;

        novoSW.addEventListener('statechange', () => {
          if (novoSW.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Ha um SW antigo ativo — novo SW esperando
              // Auto-aplicar: enviar SKIP_WAITING e recarregar
              novoSW.postMessage({ type: 'SKIP_WAITING' });
            } else {
              // Primeira instalacao
            }
          }
        });
      });
    })
    .catch(err => console.warn('[SW] Falha ao registrar:', err));

  // Escutar mensagem SW_UPDATED (enviada pelo SW apos ativar)
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'SW_UPDATED') {
      // Recarregar silenciosamente para aplicar novo SW
      window.location.reload();
    }
  });

  // Detectar quando o controlador muda (SW novo tomou conta)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ═══ PWA INSTALL PROMPT INTELIGENTE ═══════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
let _pwaPrompt = null;

function _isPWAInstalada() {
  // Modo standalone = PWA aberta como app instalado
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari standalone
  if (window.navigator.standalone === true) return true;
  // Android TWA
  if (document.referrer.includes('android-app://')) return true;
  return false;
}

function iniciarPWAPrompt() {
  const banner = document.getElementById('pwa-install-banner');
  if (!banner) return;

  const jaInstalado = _isPWAInstalada();

  // Se ja instalado: nunca mostrar banner + checar updates
  if (jaInstalado) {
    banner.style.display = 'none';
    // Forcar verificacao de update ao abrir o PWA
    if (_swRegistration) {
      _swRegistration.update().then(() => {
      }).catch(() => {});
    } else {
      // SW ainda nao registrado — aguardar
      setTimeout(() => {
        if (_swRegistration) _swRegistration.update().catch(() => {});
      }, 3000);
    }
    return;
  }

  const btnInstalar = document.getElementById('btn-pwa-install');



  // Botao instalar
  if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
      if (!_pwaPrompt) {
        // iOS/Safari
        mostrarToast('📱 No Safari: Compartilhar → "Adicionar a Tela de Inicio"');
        banner.classList.remove('visible');
        return;
      }
      banner.classList.remove('visible');
      _pwaPrompt.prompt();
      const { outcome } = await _pwaPrompt.userChoice;
      if (outcome === 'accepted') {
        mostrarToast('✅ RotaPosto instalado com sucesso!');
        // Guardar que ja instalou
      }
      _pwaPrompt = null;
    });
  }

  // Fechar banner ao clicar fora
  banner.addEventListener('click', (e) => {
    if (e.target === banner) banner.classList.remove('visible');
  });

}

// ══════════════════════════════════════════════════════════════════════════════
// ═══ FIREBASE AUTH ════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
let _firebaseApp = null;
let _firebaseAuth = null;
let _usuarioLogado = null;

function iniciarFirebaseAuth() {
  // Firebase SDK é um módulo ES6 — pode já estar pronto ou chegar via evento
  if (window._firebaseReady) {
    _configurarAuth();
    return;
  }
  // Escutar evento disparado pelo script type="module"
  window.addEventListener('firebase-ready', () => {
    _configurarAuth();
  }, { once: true });
  // Fallback: polling por 6 segundos
  let tentativas = 0;
  const intervalo = setInterval(() => {
    tentativas++;
    if (window._firebaseReady) {
      clearInterval(intervalo);
      _configurarAuth();
    } else if (tentativas >= 20) {
      clearInterval(intervalo);
      console.warn('[Auth] Firebase SDK não carregou após 6s');
    }
  }, 300);
}

// Estado da assinatura
let _assinaturaStatus = null; // 'FREE' | 'ACTIVE' | 'PENDING' | 'EXPIRED'
let _assinaturaTxid = null;
let _assinaturaQrCode = null;
let _assinaturaBrcode = null;
let _assinaturaPlano = null;
let _assinaturaInadimplente = false;

// Verificar status de assinatura do usuário
async function verificarStatusAssinatura(userId) {
  try {
    const res = await fetch(\`/api/assinatura/status/\${userId}\`);
    const data = await res.json();
    _assinaturaStatus = data.status || 'FREE';
    _assinaturaPlano = data.plano || null;
    _assinaturaTxid = data.txidPendente || null;
    _assinaturaQrCode = data.qrCode || data.qrCodePendente || null;
    _assinaturaBrcode = data.brcode || data.brcodePendente || null;
    _assinaturaInadimplente = !!(data.avisoInadimplencia);
    return data;
  } catch {
    _assinaturaStatus = 'FREE';
    return { status: 'FREE', ativa: false };
  }
}

// Exibir/esconder banner de inadimplência do app
function _atualizarBannerInadimplencia() {
  const banner = document.getElementById('banner-inadimplencia');
  if (!banner) return;
  if (_assinaturaInadimplente || _assinaturaStatus === 'EXPIRED') {
    banner.style.display = 'block';
    // Empurrar conteúdo para baixo
    document.body.style.paddingTop = (parseInt(document.body.style.paddingTop || '0') > 52 ? document.body.style.paddingTop : '52px');
  } else {
    banner.style.display = 'none';
  }
}

// Abrir modal de renovação PIX (pagamento manual após falha na cobrança)
async function abrirPIXRenovacao() {
  const user = _usuarioLogado;
  if (!user) { abrirLogin(); return; }
  const overlay = document.getElementById('pix-modal-overlay');
  const content = document.getElementById('pix-modal-content');
  if (!overlay || !content) return;
  overlay.classList.add('visible');
  content.innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#FF6D00"></i><p style="color:rgba(255,255,255,0.6);margin-top:12px">Gerando PIX de renovação...</p></div>';
  try {
    const res = await fetch('/api/pix/renovar', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ userId: user.uid, nome: user.displayName || '', email: user.email || '', cpf: localStorage.getItem('rp_cpf_' + user.uid) || '' })
    });
    const data = await res.json();
    if (data.precisaCPF) {
      // Pedir CPF antes de gerar
      content.innerHTML = \`
        <div style="padding:24px">
          <h3 style="font-size:16px;font-weight:800;color:white;margin:0 0 8px">♻️ Renovar Assinatura</h3>
          <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:0 0 16px">Informe seu CPF para gerar o PIX de renovação.</p>
          <label style="font-size:11px;color:rgba(255,255,255,0.6);font-weight:600;display:block;margin-bottom:6px">SEU CPF</label>
          <input id="renov-cpf" type="tel" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;padding:12px;font-size:16px;box-sizing:border-box;outline:none"/>
          <p id="renov-cpf-erro" style="color:#FF6D00;font-size:11px;margin:6px 0 0;display:none">CPF inválido.</p>
          <button onclick="_confirmarCPFRenovacao('${user.uid}','${user.displayName||''}','${user.email||''}')" style="width:100%;margin-top:14px;background:#FF6D00;border:none;color:white;font-weight:800;padding:12px;border-radius:12px;cursor:pointer;font-size:14px"><i class="fas fa-qrcode"></i> Gerar PIX</button>
          <button onclick="fecharModalPIX(true)" style="width:100%;margin-top:8px;background:rgba(255,255,255,0.07);border:none;color:rgba(255,255,255,0.5);padding:10px;border-radius:10px;cursor:pointer;font-size:13px">Cancelar</button>
        </div>\`;
      setTimeout(() => { const el = document.getElementById('renov-cpf'); if (el) el.focus(); }, 100);
      return;
    }
    if (!data.sucesso) {
      content.innerHTML = \`<div style="padding:24px;text-align:center"><p style="color:#FF5252;font-weight:700">\${data.mensagem || 'Erro ao gerar PIX'}</p><button onclick="fecharModalPIX(true)" style="margin-top:14px;background:#FF6D00;border:none;color:white;padding:10px 24px;border-radius:10px;cursor:pointer;font-weight:800">Fechar</button></div>\`;
      return;
    }
    _exibirQRRenovacao(data);
  } catch(e) {
    content.innerHTML = \`<div style="padding:24px;text-align:center"><p style="color:#FF5252">Erro de rede. Tente novamente.</p><button onclick="abrirPIXRenovacao()" style="margin-top:12px;background:#FF6D00;border:none;color:white;padding:10px 24px;border-radius:10px;cursor:pointer;font-weight:800">Tentar novamente</button></div>\`;
  }
}

async function _confirmarCPFRenovacao(userId, nome, email) {
  const input = document.getElementById('renov-cpf');
  const erro = document.getElementById('renov-cpf-erro');
  if (!input) return;
  const cpf = input.value.replace(/\\D/g, '');
  if (cpf.length !== 11) { if (erro) { erro.style.display = 'block'; } return; }
  localStorage.setItem('rp_cpf_' + userId, cpf);
  const content = document.getElementById('pix-modal-content');
  if (content) content.innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#FF6D00"></i></div>';
  try {
    const res = await fetch('/api/pix/renovar', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ userId, nome, email, cpf })
    });
    const data = await res.json();
    if (data.sucesso) { _exibirQRRenovacao(data); }
    else if (content) { content.innerHTML = \`<div style="padding:24px;text-align:center"><p style="color:#FF5252">\${data.mensagem}</p><button onclick="fecharModalPIX(true)" style="margin-top:12px;background:#FF6D00;border:none;color:white;padding:10px 24px;border-radius:10px;cursor:pointer;font-weight:800">Fechar</button></div>\`; }
  } catch(e) { if (content) content.innerHTML = '<div style="padding:24px;text-align:center;color:#FF5252">Erro de rede.</div>'; }
}

function _exibirQRRenovacao(data) {
  const content = document.getElementById('pix-modal-content');
  if (!content) return;
  const valorFmt = data.valor ? 'R$ ' + (data.valor / 100).toFixed(2).replace('.', ',') : '';
  content.innerHTML = \`
    <div style="padding:24px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">♻️</div>
      <h3 style="font-size:16px;font-weight:800;color:white;margin:0 0 4px">Renovar Assinatura</h3>
      <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:0 0 16px">Pague o PIX para reativar seu plano Premium \${valorFmt ? '— ' + valorFmt : ''}</p>
      \${data.qrCode ? \`<img src="\${data.qrCode}" style="width:200px;height:200px;border-radius:12px;border:3px solid #FF6D00;margin-bottom:12px"/>\` : ''}
      \${data.brcode ? \`
        <p style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px">Ou copie o código PIX:</p>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px;word-break:break-all;font-size:9px;color:rgba(255,255,255,0.4);margin-bottom:12px;cursor:pointer" onclick="navigator.clipboard.writeText('\${data.brcode}').then(()=>mostrarToast('✅ Código PIX copiado!'))">
          \${data.brcode.substring(0,60)}...<br><span style="color:#FF6D00;font-size:10px;font-weight:700">Toque para copiar</span>
        </div>
      \` : ''}
      \${data.demo ? '<p style="font-size:10px;color:#FFD600;margin-bottom:8px">⚠️ Modo demonstração — PIX não processado</p>' : ''}
      <div style="display:flex;gap:8px">
        <button onclick="fecharModalPIX(true)" style="flex:1;background:rgba(255,255,255,0.07);border:none;color:rgba(255,255,255,0.6);padding:10px;border-radius:10px;cursor:pointer;font-size:13px">Fechar</button>
        \${data.subscriptionId ? \`<button onclick="verificarPagamentoPIX('\${data.subscriptionId}')" style="flex:2;background:#FF6D00;border:none;color:white;font-weight:800;padding:10px;border-radius:10px;cursor:pointer;font-size:13px"><i class="fas fa-check-circle"></i> Já paguei</button>\` : ''}
      </div>
    </div>\`;
}

// Carregar foto de perfil personalizada (salva no servidor)
async function carregarFotoPerfil(userId) {
  try {
    const res = await fetch(\`/api/perfil/foto/\${userId}\`);
    const data = await res.json();
    if (data.fotoUrl) {
      // Salvar no localStorage para acesso rápido
      localStorage.setItem('rp_foto_perfil', data.fotoUrl);
      return data.fotoUrl;
    }
    // Verificar localStorage como fallback
    return localStorage.getItem('rp_foto_perfil') || null;
  } catch {
    return localStorage.getItem('rp_foto_perfil') || null;
  }
}

function _configurarAuth() {
  try {
    if (!window._fbAuth || !window._fbOnAuthStateChanged) {
      console.warn('[Auth] _fbAuth não disponível');
      return;
    }
    _firebaseAuth = window._fbAuth;

    // Observer de estado de autenticação — atualiza UI sempre que o user muda
    window._fbOnAuthStateChanged(_firebaseAuth, async (user) => {
      const eraPrimeiroLogin = !_usuarioLogado && !!user;
      const eraSessaoAtiva   = !!_usuarioLogado && !user; // logout
      _usuarioLogado = user;

      if (user) {
        // Verificar foto personalizada salva no servidor
        const fotoPersonalizada = await carregarFotoPerfil(user.uid);
        if (fotoPersonalizada && !user.photoURL) {
          // Injetar foto personalizada no objeto user temporariamente
          user._fotoLocal = fotoPersonalizada;
        } else if (fotoPersonalizada) {
          user._fotoLocal = fotoPersonalizada;
        }

        _atualizarHeaderAuth(user);
        atualizarSidebarUser(user);
        _atualizarPainelAuthState(user);

        if (eraPrimeiroLogin) {
          fecharLogin();
          mostrarToast('👋 Olá, ' + (user.displayName || user.email || 'usuário') + '!');
          if (window.innerWidth >= 768) carregarPainelDesktop();

          // Verificar se é login social (Google/Facebook) e se ainda não completou o perfil
          const isSocial = user.providerData && user.providerData.some(
            (p) => p.providerId === 'google.com' || p.providerId === 'facebook.com'
          );
          if (isSocial) {
            const perfilCompleto = localStorage.getItem('rp_perfil_completo_' + user.uid);
            if (!perfilCompleto) {
              // Aguardar um momento e mostrar formulário de completar perfil
              setTimeout(() => abrirModalCompletarPerfil(user), 1200);
            }
          }
        }

        // Verificar status de assinatura em background
        verificarStatusAssinatura(user.uid).then(assin => {
          if (assin.status === 'PENDING' && _assinaturaQrCode) {
            _mostrarBadgePendente();
          }
          // Mostrar banner se inadimplente ou expirado
          if (assin.avisoInadimplencia || assin.status === 'EXPIRED') {
            _assinaturaInadimplente = true;
            _atualizarBannerInadimplencia();
          }
        });
      } else {
        _assinaturaStatus = null;
        _atualizarHeaderAuth(null);
        atualizarSidebarUser(null);
        _atualizarPainelAuthState(null);
      }

      if (eraSessaoAtiva) {
        _atualizarPainelAuthState(null);
      }
    });

    // Inicializar a área de auth no header
    _atualizarHeaderAuth(_firebaseAuth.currentUser);
    atualizarSidebarUser(_firebaseAuth.currentUser);
  } catch (err) {
    console.error('[Auth] Erro ao configurar:', err);
  }
}

// Mostrar badge laranja no avatar indicando pagamento pendente
function _mostrarBadgePendente() {
  const avatarBtn = document.querySelector('.user-avatar-btn');
  if (!avatarBtn) return;
  if (document.getElementById('badge-pendente')) return;
  const badge = document.createElement('span');
  badge.id = 'badge-pendente';
  badge.style.cssText = \`
    position:absolute;top:-4px;right:-4px;
    background:#FFC107;color:#000;font-size:9px;font-weight:900;
    border-radius:50%;width:14px;height:14px;display:flex;align-items:center;
    justify-content:center;z-index:10;
  \`;
  badge.textContent = '!';
  badge.title = 'Pagamento pendente';
  avatarBtn.style.position = 'relative';
  avatarBtn.appendChild(badge);
}

function _getFotoUsuario(user) {
  if (!user) return null;
  // Prioridade: foto local salva > photoURL do Firebase > null
  return user._fotoLocal || localStorage.getItem('rp_foto_perfil') || user.photoURL || null;
}

function _getAvatarHTML(user, size = 32) {
  const foto = _getFotoUsuario(user);
  const nome = user?.displayName || user?.email || 'Usuário';
  const iniciais = nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  if (foto) {
    return \`<img src="\${foto}" alt="\${nome}" style="width:\${size}px;height:\${size}px;border-radius:50%;object-fit:cover;border:2px solid var(--laranja)"/>\`;
  }
  return \`<div style="width:\${size}px;height:\${size}px;border-radius:50%;background:var(--laranja);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:\${Math.round(size*0.4)}px;color:white">\${iniciais}</div>\`;
}

function _atualizarHeaderAuth(user) {
  const actionsEl = document.getElementById('header-auth-area');
  if (!actionsEl) return;

  if (user) {
    const nome = user.displayName || user.email || 'Usuário';
    actionsEl.innerHTML = \`
      <button class="btn-icon user-avatar-btn" onclick="toggleMenuUser()" title="\${nome}" style="position:relative">
        \${_getAvatarHTML(user, 32)}
      </button>
      <button class="btn-premium-tag" onclick="abrirModalPIX('premium')">
        ⚡ Premium
      </button>
    \`;
  } else {
    actionsEl.innerHTML = \`
      <button class="btn-icon" onclick="abrirLogin()" title="Entrar">
        <i class="fas fa-user-circle" style="font-size:20px"></i>
      </button>
      <button class="btn-premium-tag" onclick="abrirModalPIX('premium')">
        ⚡ Premium
      </button>
    \`;
  }
}

let _menuUserAberto = false;
function toggleMenuUser() {
  let menu = document.getElementById('user-dropdown-menu');
  if (menu) { menu.remove(); _menuUserAberto = false; return; }
  _menuUserAberto = true;

  const user = _usuarioLogado;
  const foto = _getFotoUsuario(user);
  const nome = user?.displayName || 'Usuário';
  const email = user?.email || '';
  const iniciais = nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Badge de sorteio
  const pontos = parseInt(localStorage.getItem('rp_pontos') || '0');
  const numSorteios = parseInt(localStorage.getItem('rp_numeros_sorteio') || '0');

  menu = document.createElement('div');
  menu.id = 'user-dropdown-menu';
  menu.style.cssText = \`
    position:fixed;top:64px;right:12px;background:#1a2744;border:1px solid rgba(255,255,255,0.1);
    border-radius:16px;padding:0;z-index:9999;min-width:240px;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);overflow:hidden;
  \`;
  menu.innerHTML = \`
    <!-- Header do perfil -->
    <div style="padding:16px;background:linear-gradient(135deg,#0D1B2A,#1a2744);display:flex;gap:12px;align-items:center">
      <div style="position:relative;cursor:pointer" onclick="abrirUploadFoto();document.getElementById('user-dropdown-menu')?.remove()" title="Alterar foto">
        \${foto
          ? \`<img src="\${foto}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid var(--laranja)"/>\`
          : \`<div style="width:48px;height:48px;border-radius:50%;background:var(--laranja);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:white">\${iniciais}</div>\`
        }
        <div style="position:absolute;bottom:0;right:0;background:var(--laranja);border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center">
          <i class="fas fa-camera" style="font-size:8px;color:white"></i>
        </div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:14px;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${nome}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${email}</div>
        <div style="font-size:10px;color:#FFC107;margin-top:2px">
          <i class="fas fa-star"></i> \${pontos} pts &nbsp;·&nbsp;
          <i class="fas fa-ticket-alt"></i> \${numSorteios} números
        </div>
      </div>
    </div>
    <!-- Acoes -->
    <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
      <button onclick="abrirUploadFoto();document.getElementById('user-dropdown-menu')?.remove()" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.8);font-weight:600;padding:9px 14px;border-radius:10px;cursor:pointer;text-align:left;font-size:13px">
        <i class="fas fa-camera" style="color:var(--laranja);margin-right:8px;width:14px"></i> Alterar foto de perfil
      </button>
      <button onclick="abrirMeusNumeros();document.getElementById('user-dropdown-menu')?.remove()" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.8);font-weight:600;padding:9px 14px;border-radius:10px;cursor:pointer;text-align:left;font-size:13px">
        <i class="fas fa-ticket-alt" style="color:#FFC107;margin-right:8px;width:14px"></i> Meus numeros do sorteio
      </button>
      <button onclick="abrirModalPIX('premium');document.getElementById('user-dropdown-menu')?.remove()" style="width:100%;background:linear-gradient(135deg,#FF6D00,#ff8c00);border:none;color:white;font-weight:800;padding:10px 14px;border-radius:10px;cursor:pointer;text-align:left;font-size:13px">
        <i class="fas fa-bolt" style="margin-right:8px"></i> Assinar Premium R$ 9,90/mes
      </button>
      <button onclick="fazerLogout();document.getElementById('user-dropdown-menu')?.remove()" style="width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);font-weight:600;padding:9px 14px;border-radius:10px;cursor:pointer;text-align:left;font-size:13px">
        <i class="fas fa-sign-out-alt" style="margin-right:8px;width:14px"></i> Sair
      </button>
    </div>
  \`;
  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', function fecharMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', fecharMenu);
      }
    });
  }, 100);
}

// ── Upload de foto de perfil ──────────────────────────────────────────────────
function abrirUploadFoto() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    document.body.removeChild(input);

    if (file.size > 2 * 1024 * 1024) {
      mostrarToast('⚠️ Imagem muito grande. Escolha uma imagem menor que 2MB.');
      return;
    }

    mostrarToast('📷 Processando foto...');

    // Redimensionar e converter para base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        // Redimensionar para 200x200
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        // Cortar centro (crop quadrado)
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);

        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        const userId = _usuarioLogado?.uid;
        if (!userId) return;

        try {
          const res = await fetch('/api/perfil/foto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, fotoBase64: base64, mimeType: 'image/jpeg' })
          });
          const data = await res.json();
          if (data.sucesso) {
            // Guardar localmente
            localStorage.setItem('rp_foto_perfil', data.fotoUrl);
            if (_usuarioLogado) {
              _usuarioLogado._fotoLocal = data.fotoUrl;
              _atualizarHeaderAuth(_usuarioLogado);
              atualizarSidebarUser(_usuarioLogado);
            }
            mostrarToast('✅ Foto de perfil atualizada!');
          } else {
            mostrarToast('❌ Erro ao salvar foto');
          }
        } catch {
          mostrarToast('❌ Erro ao enviar foto');
        }
      };
      img.src = e.target['result'];
    };
    reader.readAsDataURL(file);
  });

  input.click();
}

// ── Meus números do sorteio ───────────────────────────────────────────────────
async function abrirMeusNumeros() {
  const user = _usuarioLogado;
  if (!user) { abrirLogin(); return; }

  const overlay = document.getElementById('pix-modal-overlay');
  const content = document.getElementById('pix-modal-content');
  overlay.classList.add('visible');

  content.innerHTML = \`
    <div style="text-align:center;padding:24px">
      <div class="spinner" style="margin:0 auto 16px;border-top-color:#FFC107"></div>
      <p style="font-size:13px;color:rgba(255,255,255,0.5)">Carregando seus numeros...</p>
    </div>
  \`;

  try {
    const res = await fetch(\`/api/meus-numeros/\${user.uid}\`);
    const data = await res.json();
    const numeros = data.numeros || [];
    const pontos = data.pontos || 0;
    const reportes = data.reportes || 0;

    content.innerHTML = \`
      <div style="padding:16px">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:36px;margin-bottom:8px">🎰</div>
          <h3 style="font-size:18px;font-weight:900;color:white;margin:0 0 4px">Meus Numeros do Sorteio</h3>
          <p style="font-size:12px;color:rgba(255,255,255,0.4)">Cada reporte de preco ganha 1 numero!</p>
        </div>

        <!-- Stats -->
        <div style="display:flex;gap:10px;margin-bottom:20px">
          <div style="flex:1;background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.3);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:900;color:#FFC107">\${pontos}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px">pontos</div>
          </div>
          <div style="flex:1;background:rgba(255,109,0,0.1);border:1px solid rgba(255,109,0,0.3);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:900;color:var(--laranja)">\${reportes}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px">reportes</div>
          </div>
          <div style="flex:1;background:rgba(0,200,83,0.1);border:1px solid rgba(0,200,83,0.3);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:900;color:#00C853">\${numeros.length}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px">numeros</div>
          </div>
        </div>

        \${numeros.length > 0 ? \`
          <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:16px">
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Seus numeros da sorte:</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              \${numeros.map(n => \`<span style="background:linear-gradient(135deg,#FF6D00,#ff8c00);color:white;font-weight:900;font-size:13px;padding:6px 10px;border-radius:8px;letter-spacing:1px">\${n}</span>\`).join('')}
            </div>
          </div>
        \` : \`
          <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:24px;text-align:center;margin-bottom:16px">
            <div style="font-size:32px;margin-bottom:8px">🎫</div>
            <p style="font-size:13px;color:rgba(255,255,255,0.4)">Reporte precos nos postos para ganhar numeros!</p>
          </div>
        \`}

        <div style="background:rgba(255,193,7,0.08);border:1px solid rgba(255,193,7,0.2);border-radius:10px;padding:12px;margin-bottom:16px">
          <div style="font-size:11px;color:#FFC107;font-weight:700;margin-bottom:4px">Como funciona:</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);line-height:1.6">
            • Cada reporte novo = +1 numero do sorteio + 10 pontos<br>
            • Confirmar preco existente = +5 pontos<br>
            • Sorteio mensal com premios para os mais ativos!
          </div>
        </div>

        <button onclick="fecharPixModal(null,true)" style="width:100%;background:rgba(255,255,255,0.08);border:none;color:white;font-weight:700;padding:12px;border-radius:12px;cursor:pointer">
          Fechar
        </button>
      </div>
    \`;
  } catch {
    content.innerHTML = \`
      <div style="text-align:center;padding:32px">
        <p style="color:rgba(255,255,255,0.5)">Erro ao carregar dados</p>
        <button onclick="fecharPixModal(null,true)" style="background:var(--laranja);border:none;color:white;padding:10px 20px;border-radius:10px;cursor:pointer;margin-top:12px">Fechar</button>
      </div>
    \`;
  }
}

async function fazerLogout() {
  try {
    if (window._fbSignOut && _firebaseAuth) {
      await window._fbSignOut(_firebaseAuth);
      mostrarToast('👋 Até logo!');
      _usuarioLogado = null;
      _atualizarHeaderAuth(null);
    }
  } catch (err) {
    mostrarToast('Erro ao sair: ' + err.message);
  }
}

// ─── Abrir / Fechar modal de login ────────────────────────────────────────────
function abrirLogin(tab = 'entrar') {
  document.getElementById('auth-modal').classList.add('visible');
  setAuthTab(tab);
}

function fecharLogin() {
  document.getElementById('auth-modal').classList.remove('visible');
  const emailEl = document.getElementById('auth-email');
  const senhaEl = document.getElementById('auth-senha');
  const nomeEl  = document.getElementById('auth-nome') ;
  if (emailEl) emailEl.value = '';
  if (senhaEl) senhaEl.value = '';
  if (nomeEl)  nomeEl.value  = '';
  const erroEl = document.getElementById('auth-erro');
  if (erroEl) erroEl.textContent = '';
}

// ─── Completar Perfil (pós login social) ─────────────────────────────────────
let _cpUser = null;

function abrirModalCompletarPerfil(user) {
  _cpUser = user;
  const modal = document.getElementById('modal-completar-perfil');
  if (!modal) return;
  // Pré-preencher com dados salvos
  const perfil = _getPerfilExtra(user.uid);
  const tel  = document.getElementById('cp-telefone');
  const cep  = document.getElementById('cp-cep');
  const rua  = document.getElementById('cp-rua');
  const cid  = document.getElementById('cp-cidade');
  const est  = document.getElementById('cp-estado');
  if (tel)  tel.value  = perfil.telefone || '';
  if (cep)  cep.value  = perfil.cep      || '';
  if (rua)  rua.value  = perfil.rua      || '';
  if (cid)  cid.value  = perfil.cidade   || '';
  if (est)  est.value  = perfil.estado   || '';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModalCompletarPerfil() {
  const modal = document.getElementById('modal-completar-perfil');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function pularCompletarPerfil() {
  // Marcar como pulado (não pede de novo por 30 dias)
  if (_cpUser) {
    localStorage.setItem('rp_perfil_pulado_' + _cpUser.uid, Date.now().toString());
  }
  fecharModalCompletarPerfil();
}

function salvarCompletarPerfil() {
  if (!_cpUser) { fecharModalCompletarPerfil(); return; }
  const tel  = (document.getElementById('cp-telefone')?.value || '').trim();
  const cep  = (document.getElementById('cp-cep')?.value      || '').trim();
  const rua  = (document.getElementById('cp-rua')?.value      || '').trim();
  const cid  = (document.getElementById('cp-cidade')?.value   || '').trim();
  const est  = (document.getElementById('cp-estado')?.value   || '').trim();
  const perfil = { telefone: tel, cep: cep, rua: rua, cidade: cid, estado: est };
  localStorage.setItem('rp_perfil_extra_' + _cpUser.uid, JSON.stringify(perfil));
  localStorage.setItem('rp_perfil_completo_' + _cpUser.uid, '1');
  // Enviar dados para o servidor (persiste no KV para o admin ver)
  fetch('/api/usuario/dados', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: _cpUser.uid,
      nome: _cpUser.displayName || _cpUser.name || '',
      email: _cpUser.email || '',
      telefone: tel,
      cep: cep,
      cidade: cid,
      estado: est
    })
  }).catch(function(){});
  fecharModalCompletarPerfil();
  mostrarToast('Perfil atualizado! ✓');
}

function _getPerfilExtra(uid) {
  try { return JSON.parse(localStorage.getItem('rp_perfil_extra_' + uid) || '{}'); } catch { return {}; }
}

function formatarTelefone(input) {
  let v = input.value.replace(/\D/g,'');
  if (v.length > 11) v = v.slice(0,11);
  if (v.length > 7)      input.value = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
  else if (v.length > 2) input.value = '(' + v.slice(0,2) + ') ' + v.slice(2);
  else if (v.length > 0) input.value = '(' + v;
}

function formatarCEP(input) {
  // oninput: só filtra dígitos; onblur formata
  input.value = input.value.replace(/\D/g,'').slice(0,8);
}

async function buscarCEP() {
  const cepEl = document.getElementById('cp-cep');
  if (!cepEl) return;
  const cep = cepEl.value.replace(/\D/g,'');
  if (cep.length !== 8) { mostrarToast('CEP inválido'); return; }
  try {
    const r = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
    const d = await r.json();
    if (d.erro) { mostrarToast('CEP não encontrado'); return; }
    const rua  = document.getElementById('cp-rua');
    const cid  = document.getElementById('cp-cidade');
    const est  = document.getElementById('cp-estado');
    if (rua) rua.value   = (d.logradouro || '') + (d.bairro ? ', ' + d.bairro : '');
    if (cid) cid.value   = d.localidade || '';
    if (est) est.value   = d.uf         || '';
    mostrarToast('Endereço preenchido! ✓');
  } catch { mostrarToast('Erro ao buscar CEP'); }
}

// ─── Login com Google ─────────────────────────────────────────────────────────
// ─── Toggle Tab Entrar / Criar Conta ─────────────────────────────────────────
let _authTab = 'entrar';
function setAuthTab(tab) {
  _authTab = tab;
  const tabEntrar = document.getElementById('tab-entrar');
  const tabCriar  = document.getElementById('tab-criar');
  const campoNome = document.getElementById('auth-nome');
  const btnSubmit = document.getElementById('btn-auth-submit');
  const subtitle  = document.getElementById('auth-modal-subtitle');
  const btnGoogleTxt = document.getElementById('btn-google-txt');
  const btnFbTxt  = document.getElementById('btn-fb-txt');
  const erro      = document.getElementById('auth-erro');
  if (erro) erro.textContent = '';

  if (tab === 'criar') {
    tabEntrar.style.background = 'transparent';
    tabEntrar.style.color = 'rgba(255,255,255,0.5)';
    tabCriar.style.background = 'var(--laranja)';
    tabCriar.style.color = 'white';
    if (campoNome) campoNome.style.display = 'block';
    if (btnSubmit) { btnSubmit.innerHTML = '<i class="fas fa-rocket"></i> Criar conta grátis'; }
    if (subtitle)  subtitle.textContent = 'Crie sua conta gratuita agora';
    if (btnGoogleTxt) btnGoogleTxt.textContent = 'Cadastrar com Google';
    if (btnFbTxt)     btnFbTxt.textContent     = 'Cadastrar com Facebook';
  } else {
    tabEntrar.style.background = 'var(--azul-escuro)';
    tabEntrar.style.color = 'white';
    tabCriar.style.background = 'transparent';
    tabCriar.style.color = 'rgba(255,255,255,0.5)';
    if (campoNome) campoNome.style.display = 'none';
    if (btnSubmit) { btnSubmit.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar'; }
    if (subtitle)  subtitle.textContent = 'Entre para acessar recursos exclusivos';
    if (btnGoogleTxt) btnGoogleTxt.textContent = 'Continuar com Google';
    if (btnFbTxt)     btnFbTxt.textContent     = 'Continuar com Facebook';
  }
}

// Botão único que age como Entrar ou Criar conta conforme o tab ativo
async function submitAuth() {
  if (_authTab === 'criar') {
    await registrarEmail();
  } else {
    await loginEmail();
  }
}

async function loginGoogle() {
  if (!window._fbSignInWithPopup || !window._fbGoogleProvider || !_firebaseAuth) {
    mostrarToast('⏳ Carregando Firebase...');
    setTimeout(loginGoogle, 800);
    return;
  }
  const btn = document.getElementById('btn-google-login');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto"></div>';

  try {
    const result = await window._fbSignInWithPopup(_firebaseAuth, window._fbGoogleProvider);
  } catch (err) {
    _mostrarErroAuth(err);
    btn.disabled = false;
    btn.innerHTML = \`<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continuar com Google\`;
  }
}

// ─── Login com Facebook ───────────────────────────────────────────────────────
async function loginFacebook() {
  if (!window._fbSignInWithPopup || !window._fbFacebookProvider || !_firebaseAuth) {
    mostrarToast('⏳ Carregando Firebase...');
    setTimeout(loginFacebook, 800);
    return;
  }
  const btn = document.getElementById('btn-fb-login');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:white;margin:0 auto"></div>';

  try {
    const result = await window._fbSignInWithPopup(_firebaseAuth, window._fbFacebookProvider);
  } catch (err) {
    _mostrarErroAuth(err);
    btn.disabled = false;
    btn.innerHTML = \`<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> Continuar com Facebook\`;
  }
}

// ─── Login com Email/Senha ────────────────────────────────────────────────────
async function loginEmail() {
  if (!window._fbSignInWithEmailAndPassword || !_firebaseAuth) {
    mostrarToast('⏳ Carregando Firebase...');
    return;
  }
  const email = (document.getElementById('auth-email')).value.trim();
  const senha = (document.getElementById('auth-senha')).value;

  if (!email || !senha) {
    _mostrarErroAuth({ code: 'auth/empty-fields' });
    return;
  }

  const btn = document.getElementById('btn-auth-submit');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0 auto"></div>'; }

  try {
    await window._fbSignInWithEmailAndPassword(_firebaseAuth, email, senha);
  } catch (err) {
    _mostrarErroAuth(err);
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar'; }
  }
}

// ─── Registrar com Email/Senha ────────────────────────────────────────────────
async function registrarEmail() {
  if (!window._fbCreateUserWithEmailAndPassword || !_firebaseAuth) {
    mostrarToast('⏳ Carregando Firebase...');
    return;
  }
  const nome  = (document.getElementById('auth-nome'))?.value?.trim() || '';
  const email = (document.getElementById('auth-email')).value.trim();
  const senha = (document.getElementById('auth-senha')).value;

  if (!email || !senha) {
    _mostrarErroAuth({ code: 'auth/empty-fields' });
    return;
  }
  if (senha.length < 6) {
    _mostrarErroAuth({ code: 'auth/weak-password' });
    return;
  }

  const btn = document.getElementById('btn-auth-submit');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0 auto"></div>'; }

  try {
    const result = await window._fbCreateUserWithEmailAndPassword(_firebaseAuth, email, senha);
    // Atualizar displayName se informado
    if (nome && window._fbUpdateProfile) {
      try { await window._fbUpdateProfile(result.user, { displayName: nome }); } catch {}
    }
    mostrarToast('🎉 Conta criada! Bem-vindo(a) ao RotaPosto!');
  } catch (err) {
    _mostrarErroAuth(err);
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rocket"></i> Criar conta grátis'; }
  }
}

// ─── Mensagens de erro amigáveis ──────────────────────────────────────────────
function _mostrarErroAuth(err) {
  const msgs = {
    'auth/user-not-found':     'Usuário não encontrado. Crie uma conta!',
    'auth/wrong-password':     'Senha incorreta. Tente novamente.',
    'auth/email-already-in-use': 'Email já cadastrado. Faça login!',
    'auth/weak-password':      'Senha precisa ter pelo menos 6 caracteres.',
    'auth/invalid-email':      'Email inválido.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
    'auth/empty-fields':       'Preencha email e senha.',
    'auth/too-many-requests':  'Muitas tentativas. Aguarde alguns minutos.',
  };
  const el = document.getElementById('auth-erro');
  if (el) el.textContent = msgs[err.code] || 'Erro: ' + (err.message || err.code);
}

// ══════════════════════════════════════════════════════════════════════════════
// ═══ MODAL PIX ASSINATURA ════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
let _pixPlanoAtivo = 'premium';

async function abrirModalPIX(plano = 'premium') {
  _pixPlanoAtivo = plano;
  const overlay = document.getElementById('pix-modal-overlay');
  const content = document.getElementById('pix-modal-content');
  overlay.classList.add('visible');

  // Mostrar loading
  content.innerHTML = \`
    <div style="text-align:center;padding:32px 16px">
      <div class="spinner" style="margin:0 auto 16px;border-top-color:var(--laranja)"></div>
      <p style="font-size:13px;font-weight:700;color:var(--cinza-texto)">Gerando QR Code PIX...</p>
      <p style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px">Conectando à API Woovi</p>
    </div>
  \`;

  // Coletar dados do usuário
  const usuario = _usuarioLogado;

  // Verificar se está logado antes de chamar a API
  if (!usuario?.uid) {
    content.innerHTML = \`
      <div style="text-align:center;padding:32px 16px">
        <div style="font-size:48px;margin-bottom:12px">🔒</div>
        <p style="font-size:15px;font-weight:700;color:#FF6D00">Faça login primeiro</p>
        <p style="font-size:13px;color:rgba(255,255,255,0.5);margin:10px 0">Você precisa estar logado para assinar o Premium.</p>
        <button onclick="fecharPixModal(null,true)" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:10px 24px;border-radius:10px;cursor:pointer;margin-top:12px">Fechar</button>
      </div>
    \`;
    return;
  }

  const nome = usuario?.displayName || usuario?.email?.split('@')[0] || 'Usuário RotaPosto';
  const email = usuario?.email || '';
  const userId = usuario?.uid || '';
  // Buscar CPF salvo
  const cpfSalvo = localStorage.getItem('rp_cpf') || usuario?.cpf || '';

  // Se não tem CPF, mostrar formulário antes de gerar QR
  if (!cpfSalvo || cpfSalvo.replace(/\\D/g,'').length < 11) {
    _pixMostrarFormularioCPF(plano, nome, email, userId);
    return;
  }

  _pixGerarQRCode(plano, nome, email, userId, cpfSalvo);
}

function _pixMostrarFormularioCPF(plano, nome, email, userId) {
  const content = document.getElementById('pix-modal-content');
  const nomesPlan = { premium: 'Premium Mensal R$ 9,90/mês', anual: 'Anual R$ 89,00/ano' };
  content.innerHTML = \`
    <div style="padding:20px 16px">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:40px;margin-bottom:8px">🔐</div>
        <h3 style="font-size:16px;font-weight:800;color:white;margin:0 0 4px">Dados para o PIX</h3>
        <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:0">Plano: \${nomesPlan[plano] || plano}</p>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;display:block;margin-bottom:6px">SEU CPF (obrigatório para PIX)</label>
        <input id="pix-cpf-input" type="tel" inputmode="numeric" maxlength="14" placeholder="000.000.000-00"
          style="width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:12px 14px;color:white;font-size:15px;font-weight:700;box-sizing:border-box;outline:none;letter-spacing:1px"
          oninput="var v=this.value.replace(/\\D/g,'');if(v.length>3&&v.length<=6)this.value=v.slice(0,3)+'.'+v.slice(3);else if(v.length>6&&v.length<=9)this.value=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);else if(v.length>9)this.value=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9,11);else this.value=v"
          onkeydown="if(event.key==='Enter')_pixConfirmarCPF('\${plano}','\${nome}','\${email}','\${userId}')"
        />
        <p id="pix-cpf-erro" style="font-size:11px;color:#FF6D00;margin:6px 0 0;display:none">CPF inválido. Verifique os 11 dígitos.</p>
      </div>
      <div style="background:rgba(0,200,83,0.08);border:1px solid rgba(0,200,83,0.2);border-radius:10px;padding:10px 12px;margin-bottom:16px">
        <p style="font-size:11px;color:rgba(255,255,255,0.5);margin:0">🔒 Seu CPF é usado apenas para identificação do pagamento PIX. Não compartilhamos seus dados.</p>
      </div>
      <div style="display:flex;gap:10px">
        <button onclick="fecharPixModal(null,true)" style="flex:1;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.6);font-weight:600;padding:12px;border-radius:12px;cursor:pointer">
          Cancelar
        </button>
        <button onclick="_pixConfirmarCPF('\${plano}','\${nome}','\${email}','\${userId}')" style="flex:2;background:var(--laranja);border:none;color:white;font-weight:800;padding:12px;border-radius:12px;cursor:pointer;font-size:14px">
          <i class="fas fa-qrcode"></i> Gerar QR Code PIX
        </button>
      </div>
    </div>
  \`;
  setTimeout(function(){ var el=document.getElementById('pix-cpf-input'); if(el) el.focus(); }, 100);
}

function _pixConfirmarCPF(plano, nome, email, userId) {
  var input = document.getElementById('pix-cpf-input');
  var erro = document.getElementById('pix-cpf-erro');
  if (!input) return;
  var cpf = input.value.replace(/\\D/g, '');
  if (cpf.length !== 11) {
    erro.style.display = 'block';
    input.style.borderColor = '#FF6D00';
    return;
  }
  // Salvar CPF no localStorage para próximas vezes
  localStorage.setItem('rp_cpf', input.value);
  _pixGerarQRCode(plano, nome, email, userId, cpf);
}

async function _pixGerarQRCode(plano, nome, email, userId, cpf) {
  const content = document.getElementById('pix-modal-content');
  // Mostrar loading
  content.innerHTML = \`
    <div style="text-align:center;padding:32px 16px">
      <div class="spinner" style="margin:0 auto 16px;border-top-color:var(--laranja)"></div>
      <p style="font-size:13px;font-weight:700;color:var(--cinza-texto)">Gerando QR Code PIX...</p>
      <p style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px">Conectando à API Woovi</p>
    </div>
  \`;

  try {
    const res = await fetch('/api/pix/assinar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, cpf, plano, userId })
    });
    const data = await res.json();

    if (!data.sucesso) {
      // Se precisa de CPF, mostrar formulário
      if (data.precisaCPF) {
        _pixMostrarFormularioCPF(plano, nome, email, userId);
        return;
      }
      content.innerHTML = \`
        <div style="text-align:center;padding:24px 16px">
          <div style="font-size:48px;margin-bottom:12px">❌</div>
          <p style="font-size:14px;font-weight:700;color:#FF6D00">Erro ao gerar cobrança</p>
          <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:8px 0">\${data.mensagem || data.error || 'Tente novamente.'}</p>
          <div style="display:flex;gap:10px;margin-top:14px">
            <button onclick="fecharPixModal(null,true)" style="flex:1;background:rgba(255,255,255,0.1);border:none;color:white;padding:10px;border-radius:10px;cursor:pointer">Fechar</button>
            <button onclick="_pixGerarQRCode('\${plano}','\${nome}','\${email}','\${userId}','\${cpf}')" style="flex:1;background:var(--laranja);border:none;color:white;font-weight:700;padding:10px;border-radius:10px;cursor:pointer">Tentar novamente</button>
          </div>
        </div>
      \`;
      return;
    }

    const nomesPlan = { premium: 'Premium Mensal', anual: 'Premium Anual' };
    const valoresPlan = { premium: 'R$ 9,90/mês', anual: 'R$ 89,00/ano' };

    content.innerHTML = \`
      <div style="text-align:center;padding:16px">
        <div style="background:linear-gradient(135deg,#0D1B2A,#1a2744);border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(255,109,0,0.3)">
          <div style="font-size:28px;margin-bottom:6px">⚡</div>
          <h3 style="font-size:16px;font-weight:800;color:white;margin:0 0 4px">RotaPosto \${nomesPlan[plano] || plano}</h3>
          <div style="font-size:24px;font-weight:900;color:var(--laranja)">\${valoresPlan[plano] || ''}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px">Sem mensalidade escondida · Cancele quando quiser</div>
        </div>

        \${data.qrCode ? \`
          <div class="pix-qr-wrap">
            <img src="\${data.qrCode}" alt="QR Code PIX" style="width:220px;height:220px;border-radius:12px"/>
          </div>
        \` : ''}

        \${data.brcode ? \`
          <div style="margin:14px 0">
            <p style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px">Ou copie o código PIX:</p>
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;font-size:10px;font-family:monospace;color:rgba(255,255,255,0.8);word-break:break-all;text-align:left;user-select:all;cursor:text;line-height:1.5">
              \${data.brcode}
            </div>
            <button onclick="copiarCodigo('\${data.brcode}')" style="background:var(--laranja);border:none;color:white;font-weight:700;padding:12px 20px;border-radius:10px;cursor:pointer;margin-top:10px;font-size:13px;width:100%;display:flex;align-items:center;justify-content:center;gap:8px">
              <i class="fas fa-copy"></i> Copiar código PIX completo
            </button>
          </div>
        \` : ''}

        \${data.subscriptionId ? \`
          <div style="margin-top:12px;padding:10px;background:rgba(0,200,83,0.1);border-radius:10px;border:1px solid rgba(0,200,83,0.2)">
            <p style="font-size:11px;color:var(--verde);margin:0">✅ Após o pagamento, sua conta é ativada automaticamente</p>
          </div>
        \` : ''}

        <div style="display:flex;gap:10px;margin-top:16px">
          <button onclick="fecharPixModal(null,true)" style="flex:1;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.6);font-weight:600;padding:12px;border-radius:12px;cursor:pointer">
            Agora não
          </button>
          \${data.subscriptionId ? \`
          <button onclick="verificarPagamentoPIX('\${data.subscriptionId}')" style="flex:1;background:var(--laranja);border:none;color:white;font-weight:800;padding:12px;border-radius:12px;cursor:pointer">
            <i class="fas fa-check"></i> Já paguei
          </button>
          \` : ''}
        </div>
      </div>
    \`;

  } catch (err) {
    content.innerHTML = \`
      <div style="text-align:center;padding:24px">
        <div style="font-size:40px;margin-bottom:12px">📵</div>
        <p style="font-weight:700;color:#FF6D00">Sem conexão</p>
        <p style="font-size:12px;color:rgba(255,255,255,0.5)">Verifique sua internet e tente novamente</p>
        <button onclick="abrirModalPIX(_pixPlanoAtivo)" style="background:var(--laranja);border:none;color:white;font-weight:800;padding:10px 24px;border-radius:10px;cursor:pointer;margin-top:14px">
          Tentar novamente
        </button>
      </div>
    \`;
  }
}

async function verificarPagamentoPIX(txid) {
  const content = document.getElementById('pix-modal-content');
  content.innerHTML = \`
    <div style="text-align:center;padding:32px">
      <div class="spinner" style="margin:0 auto 16px;border-top-color:#00C853"></div>
      <p style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.7)">Verificando pagamento...</p>
    </div>
  \`;

  try {
    const res = await fetch('/api/pix/verificar/' + txid);
    const data = await res.json();

    if (data.pago) {
      content.innerHTML = \`
        <div style="text-align:center;padding:32px">
          <div style="font-size:64px;margin-bottom:16px">🎉</div>
          <h3 style="font-size:20px;font-weight:900;color:var(--verde);margin:0 0 8px">Pagamento Confirmado!</h3>
          <p style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:20px">Seja bem-vindo ao RotaPosto Premium! ⚡</p>
          <button onclick="fecharPixModal(null,true)" style="background:var(--verde);border:none;color:white;font-weight:800;padding:14px 32px;border-radius:14px;cursor:pointer;font-size:14px">
            Começar a usar!
          </button>
        </div>
      \`;
      mostrarToast('🎉 Premium ativado! Seja bem-vindo!');
      // Atualizar header
      if (_usuarioLogado) _atualizarHeaderAuth(_usuarioLogado);
    } else {
      content.innerHTML = \`
        <div style="text-align:center;padding:24px">
          <div style="font-size:40px;margin-bottom:12px">⏳</div>
          <p style="font-weight:700;color:#FFC107">Pagamento pendente</p>
          <p style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:16px">Pode levar alguns segundos para confirmar</p>
          <button onclick="abrirModalPIX(_pixPlanoAtivo)" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:10px 20px;border-radius:10px;cursor:pointer;margin-right:8px">
            Ver QR Code
          </button>
          <button onclick="verificarPagamentoPIX('\${txid}')" style="background:var(--laranja);border:none;color:white;font-weight:800;padding:10px 20px;border-radius:10px;cursor:pointer">
            Verificar novamente
          </button>
        </div>
      \`;
    }
  } catch {
    mostrarToast('Erro ao verificar pagamento. Tente novamente.');
    abrirModalPIX(_pixPlanoAtivo);
  }
}

function copiarCodigo(texto) {
  navigator.clipboard.writeText(texto).then(() => {
    mostrarToast('✅ Código PIX copiado!');
  }).catch(() => {
    // Fallback para navegadores antigos
    const el = document.createElement('textarea');
    el.value = texto;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    mostrarToast('✅ Código copiado!');
  });
}

function fecharPixModal(event, forcar = false) {
  if (forcar || !event || event.target === document.getElementById('pix-modal-overlay')) {
    document.getElementById('pix-modal-overlay').classList.remove('visible');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ═══ REPORTAR PREÇO (COLABORATIVO) ════════════════════════════════════════════
async function reportarPreco(postoId, combustivel, postoNome) {
  if (!_usuarioLogado) {
    mostrarToast('⚠️ Faca login para reportar precos e ganhar pontos!');
    abrirLogin();
    return;
  }

  const input = document.getElementById('preco-reportar');
  const preco = parseFloat(input?.value || '');
  if (!preco || preco < 1 || preco > 30) {
    mostrarToast('⚠️ Informe um preco valido (ex: 5.89)');
    return;
  }

  const btnReportar = document.getElementById('btn-reportar-preco');
  if (btnReportar) {
    btnReportar.disabled = true;
    btnReportar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
  }

  try {
    const res = await fetch('/api/precos/reportar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postoId,
        postoNome: postoNome || postoId,
        combustivel,
        preco,
        lat: state.lat,
        lng: state.lng,
        userId: _usuarioLogado.uid,
        userName: _usuarioLogado.displayName || _usuarioLogado.email?.split('@')[0] || 'Usuario'
      })
    });
    const data = await res.json();
    if (data.sucesso) {
      document.getElementById('modal-overlay')?.classList.remove('visible');

      // Gamificacao: salvar pontos localmente
      if (data.gamificacao) {
        localStorage.setItem('rp_pontos', String(data.gamificacao.totalPontos));
        localStorage.setItem('rp_numeros_sorteio', String(data.gamificacao.totalNumerossorteio));

        // Mostrar notificacao especial de sorteio
        if (data.gamificacao.numeroSorteio) {
          setTimeout(() => _mostrarNotificacaoSorteio(data.gamificacao), 400);
        } else {
          mostrarToast('✅ ' + (data.gamificacao.mensagem || data.mensagem));
        }
      } else {
        mostrarToast('✅ ' + data.mensagem);
      }

      setTimeout(() => buscarPostos(), 800);
    } else {
      mostrarToast('❌ ' + data.mensagem);
      if (btnReportar) {
        btnReportar.disabled = false;
        btnReportar.innerHTML = '<i class="fas fa-paper-plane"></i> Reportar';
      }
    }
  } catch {
    mostrarToast('Erro ao reportar preco');
    if (btnReportar) {
      btnReportar.disabled = false;
      btnReportar.innerHTML = '<i class="fas fa-paper-plane"></i> Reportar';
    }
  }
}

// Notificacao animada de numero de sorteio ganho
function _mostrarNotificacaoSorteio(gamif) {
  const notif = document.createElement('div');
  notif.style.cssText = \`
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.8);
    background:linear-gradient(135deg,#1a2744,#0D1B2A);
    border:2px solid #FFC107;border-radius:20px;padding:28px 32px;
    text-align:center;z-index:99999;
    box-shadow:0 20px 60px rgba(0,0,0,0.7),0 0 40px rgba(255,193,7,0.2);
    animation:sorteioAnim 0.4s ease forwards;
    min-width:280px;
  \`;
  notif.innerHTML = \`
    <style>
      @keyframes sorteioAnim { from { transform:translate(-50%,-50%) scale(0.7);opacity:0 } to { transform:translate(-50%,-50%) scale(1);opacity:1 } }
    </style>
    <div style="font-size:48px;margin-bottom:12px">🎰</div>
    <h3 style="font-size:18px;font-weight:900;color:#FFC107;margin:0 0 6px">Numero sorteado!</h3>
    <div style="font-size:36px;font-weight:900;color:white;letter-spacing:4px;margin:12px 0;
      background:linear-gradient(135deg,#FF6D00,#FFC107);-webkit-background-clip:text;-webkit-text-fill-color:transparent">
      \${gamif.numeroSorteio}
    </div>
    <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:0 0 16px">Guarde este numero! Sorteio mensal.</p>
    <div style="display:flex;gap:8px;justify-content:center">
      <div style="background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.3);border-radius:8px;padding:8px 14px;font-size:11px;color:#FFC107">
        <i class="fas fa-star"></i> \${gamif.totalPontos} pontos
      </div>
      <div style="background:rgba(0,200,83,0.1);border:1px solid rgba(0,200,83,0.3);border-radius:8px;padding:8px 14px;font-size:11px;color:#00C853">
        <i class="fas fa-ticket-alt"></i> \${gamif.totalNumerossorteio} numeros
      </div>
    </div>
    <button onclick="this.parentElement.remove()" style="margin-top:16px;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.6);font-size:12px;padding:8px 20px;border-radius:8px;cursor:pointer;width:100%">
      Oba! Fechar
    </button>
  \`;
  document.body.appendChild(notif);
  // Auto-remover após 8s
  setTimeout(() => notif.remove(), 8000);
}

// ── Sidebar desktop: sincronizar nav ──────────────────────────────────────────
function snavSetActive(id) {
  document.querySelectorAll('.sidebar-nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ── Painel direito: carregar dados ────────────────────────────────────────────
async function carregarPainelDesktop() {
  if (window.innerWidth < 768) return;
  try {
    // Buscar stats ANP e preços Petrobras em paralelo
    const [resStats, resCombustivel] = await Promise.allSettled([
      fetch('/api/brasil/stats'),
      fetch('/api/combustivel')
    ]);

    // Stats ANP
    if (resStats.status === 'fulfilled' && resStats.value.ok) {
      const d = await resStats.value.json();
      const elP = document.getElementById('dp-postos');
      const elM = document.getElementById('dp-municipios');
      const elU = document.getElementById('dp-ufs');
      const elSemana = document.getElementById('dp-semana');
      if (elP) elP.textContent = (d.totalPostos||0).toLocaleString('pt-BR');
      if (elM) elM.textContent = (d.totalMunicipios||0).toLocaleString('pt-BR');
      if (elU) elU.textContent = d.ufsComDados ? d.ufsComDados.length : (d.ufs||27);
      if (elSemana && d.semanaReferencia) elSemana.textContent = d.semanaReferencia;
    }

    // Preços Petrobras ao vivo
    if (resCombustivel.status === 'fulfilled' && resCombustivel.value.ok) {
      const cb = await resCombustivel.value.json();
      const el = document.getElementById('dp-precos-uf');
      const elColeta = document.getElementById('dp-coleta');
      const elNac = document.getElementById('dp-nacional');
      const elAnalise = document.getElementById('dp-analise');

      // Data de coleta
      if (elColeta && cb.dataColeta) {
        const dt = new Date(cb.dataColeta.replace(' ', 'T'));
        elColeta.textContent = dt.toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
      }

      // Preço nacional
      if (elNac && cb.nacional) {
        elNac.innerHTML = \`
          <span style="color:rgba(255,255,255,0.5);font-size:12px">Gasolina BR</span>
          <span style="font-weight:900;color:#FFC107;font-size:16px">R$ \${cb.nacional.gasolina?.toFixed(2)}</span>
          <span style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:4px">Diesel BR</span>
          <span style="font-weight:900;color:#42A5F5;font-size:16px">R$ \${cb.nacional.diesel?.toFixed(2)}</span>
        \`;
      }

      // Top UFs com gasolina mais barata (Petrobras distribuidora)
      if (el && cb.precosPorUF) {
        const ufList = Object.entries(cb.precosPorUF)
          .filter(([,v]) => v.gasolina)
          .sort((a,b) => (a[1].gasolina||99) - (b[1].gasolina||99))
          .slice(0, 8);
        el.innerHTML = ufList.map(([uf, v]) => {
          const preco = v.gasolina;
          const nacional = cb.nacional?.gasolina || 6.62;
          const diff = preco - nacional;
          const cor = diff < 0 ? '#69F0AE' : diff > 0.1 ? '#FF6D00' : '#FFC107';
          const seta = diff < -0.05 ? '▼' : diff > 0.05 ? '▲' : '–';
          return \`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span style="font-size:11px;color:rgba(255,255,255,0.55);font-weight:700;width:28px">\${uf}</span>
            <span style="font-size:13px;font-weight:900;color:#fff">R$ \${preco.toFixed(2)}</span>
            <span style="font-size:10px;font-weight:800;color:\${cor}">\${seta} \${Math.abs(diff).toFixed(2)}</span>
          </div>\`;
        }).join('');
      }

      // Análise: melhor/pior UF
      if (elAnalise && cb.analise) {
        const a = cb.analise;
        elAnalise.innerHTML = \`
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <div style="flex:1;min-width:100px;background:rgba(105,240,174,0.1);border-radius:10px;padding:10px;text-align:center">
              <div style="font-size:9px;color:rgba(255,255,255,0.4);font-weight:700;text-transform:uppercase">Mais barata</div>
              <div style="font-size:18px;font-weight:900;color:#69F0AE;margin:4px 0">\${a.gasolinaMaisBarata.uf}</div>
              <div style="font-size:12px;font-weight:800;color:#fff">R$ \${a.gasolinaMaisBarata.preco?.toFixed(2)}</div>
            </div>
            <div style="flex:1;min-width:100px;background:rgba(255,109,0,0.1);border-radius:10px;padding:10px;text-align:center">
              <div style="font-size:9px;color:rgba(255,255,255,0.4);font-weight:700;text-transform:uppercase">Mais cara</div>
              <div style="font-size:18px;font-weight:900;color:#FF6D00;margin:4px 0">\${a.gasolinaMaisCara.uf}</div>
              <div style="font-size:12px;font-weight:800;color:#fff">R$ \${a.gasolinaMaisCara.preco?.toFixed(2)}</div>
            </div>
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,0.35);text-align:center;margin-top:8px">
            Variacao: \${a.variacaoGasolina} entre estados
          </div>
        \`;
      }
    }
  } catch(e) {
    console.warn('[Painel] Erro ao carregar dados:', e);
  }
}

// ── Sidebar: atualizar usuário ─────────────────────────────────────────────────
function atualizarSidebarUser(user) {
  const nm = document.getElementById('sidebar-user-name');
  const pl = document.getElementById('sidebar-user-plan');
  if (!nm || !pl) return;
  if (user) {
    nm.textContent = user.displayName || user.email?.split('@')[0] || 'Usuario';
    const pontos = parseInt(localStorage.getItem('rp_pontos') || '0');
    pl.textContent = pontos > 0 ? \`⭐ \${pontos} pontos\` : '⚡ Premium';
    const area = document.getElementById('sidebar-user-area');
    if (area) {
      const foto = _getFotoUsuario(user);
      const icon = area.querySelector('i');
      const existImg = area.querySelector('img');
      if (foto) {
        if (existImg) {
          existImg.src = foto;
        } else if (icon) {
          icon.outerHTML = \`<img src="\${foto}" style="width:30px;height:30px;border-radius:50%;border:2px solid var(--laranja);object-fit:cover" />\`;
        }
      }
    }
  } else {
    nm.textContent = 'Visitante'; pl.textContent = 'Entrar';
  }
}

// ── Controle de paywall do painel desktop ─────────────────────────────────────
function _atualizarPainelAuthState(user) {
  const painelLock = document.getElementById('dp-paywall-lock');
  const painelContent = document.getElementById('dp-dados-content');
  if (!painelLock || !painelContent) return;
  if (user) {
    // Logado → mostrar dados, ocultar CTA
    painelLock.style.display = 'none';
    painelContent.style.display = 'block';
  } else {
    // Visitante → mostrar CTA, ocultar dados
    painelLock.style.display = 'flex';
    painelContent.style.display = 'none';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Inicializar painel em estado locked (Firebase ainda não está pronto)
  _atualizarPainelAuthState(null);
  // Carregar dados em background (ficam prontos quando usuário logar)
  carregarPainelDesktop();
});
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) carregarPainelDesktop();
});
</script>
</div><!-- /#app-main -->

<!-- ═══ PAINEL DIREITO DESKTOP ════════════════════════════════════════════ -->
<aside id="desktop-panel">
  <h2><i class="fas fa-bolt" style="color:var(--laranja);margin-right:6px"></i>Combustível ao Vivo</h2>

  <!-- ═══ PAYWALL: CTA para visitantes ═══════════════════════════════════════ -->
  <div id="dp-paywall-lock" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 16px;text-align:center;gap:14px">
    <div style="width:64px;height:64px;background:rgba(255,109,0,0.12);border-radius:20px;display:flex;align-items:center;justify-content:center;margin-bottom:4px">
      <i class="fas fa-lock" style="font-size:26px;color:var(--laranja)"></i>
    </div>
    <div style="font-size:16px;font-weight:900;color:#fff;line-height:1.3">
      Preços ao vivo<br>de todo o Brasil
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.6;max-width:200px">
      Crie sua conta grátis e acesse preços Petrobras atualizados por estado em tempo real.
    </div>
    <button onclick="abrirLogin('criar')" style="
      width:100%;padding:14px 20px;
      background:linear-gradient(135deg,#FF6D00,#ff8c00);
      border:none;border-radius:14px;
      color:white;font-size:14px;font-weight:900;
      cursor:pointer;letter-spacing:0.3px;
      box-shadow:0 4px 18px rgba(255,109,0,0.35);
      transition:transform 0.15s,box-shadow 0.15s
    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
      <i class="fas fa-rocket" style="margin-right:8px"></i>Começar Grátis
    </button>
    <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:-4px">
      Sem cartão de crédito · 100% gratuito
    </div>
    <div style="width:100%;height:1px;background:rgba(255,255,255,0.07);margin:4px 0"></div>
    <!-- Preview borrado das features -->
    <div style="width:100%;background:#1B3A5C;border-radius:12px;padding:14px;filter:blur(3px);pointer-events:none;opacity:0.6">
      <div style="font-size:10px;font-weight:800;color:#FFC107;margin-bottom:8px">🔥 PETROBRAS DISTRIBUIDORA</div>
      <div style="color:#fff;font-size:15px;font-weight:900">Gasolina BR  R$ –,––</div>
      <div style="color:#42A5F5;font-size:15px;font-weight:900;margin-top:4px">Diesel BR  R$ –,––</div>
    </div>
    <div style="width:100%;background:#1B3A5C;border-radius:12px;padding:14px;filter:blur(3px);pointer-events:none;opacity:0.5;margin-top:-4px">
      <div style="display:flex;gap:6px">
        <div style="flex:1;background:rgba(105,240,174,0.15);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;color:rgba(255,255,255,0.5)">Mais barata</div>
          <div style="font-size:18px;font-weight:900;color:#69F0AE">MG</div>
          <div style="font-size:12px;color:#fff">R$ –,––</div>
        </div>
        <div style="flex:1;background:rgba(255,109,0,0.15);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;color:rgba(255,255,255,0.5)">Mais cara</div>
          <div style="font-size:18px;font-weight:900;color:#FF6D00">AM</div>
          <div style="font-size:12px;color:#fff">R$ –,––</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ CONTEÚDO: visível apenas para logados ═══════════════════════════════ -->
  <div id="dp-dados-content" style="display:none">

    <!-- Preço nacional Petrobras -->
    <div style="background:#1B3A5C;border-radius:14px;padding:18px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:800;color:#FFC107;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
        <i class="fas fa-fire" style="margin-right:5px"></i>Petrobras Distribuidora
      </div>
      <div id="dp-nacional" style="display:flex;flex-direction:column;gap:4px">
        <span style="color:rgba(255,255,255,0.4);font-size:12px">Carregando...</span>
      </div>
      <div style="font-size:9px;color:rgba(255,255,255,0.25);margin-top:10px">
        Coleta: <span id="dp-coleta">–</span>
      </div>
    </div>

    <!-- Análise melhor/pior UF -->
    <div style="background:#1B3A5C;border-radius:14px;padding:18px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:800;color:var(--laranja);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
        <i class="fas fa-chart-bar" style="margin-right:5px"></i>Gasolina por Estado
      </div>
      <div id="dp-analise">
        <div style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;padding:8px">Carregando...</div>
      </div>
    </div>

    <!-- Tabela de preços por UF -->
    <div style="background:#1B3A5C;border-radius:14px;padding:18px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:800;color:var(--laranja);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
        <i class="fas fa-map-marker-alt" style="margin-right:5px"></i>Gasolina por UF
      </div>
      <div id="dp-precos-uf" style="display:flex;flex-direction:column;gap:2px">
        <div style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;padding:8px">Carregando...</div>
      </div>
    </div>

    <!-- Localização atual -->
    <div style="background:#1B3A5C;border-radius:14px;padding:18px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:800;color:var(--laranja);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">
        <i class="fas fa-location-arrow" style="margin-right:5px"></i>Busca Atual
      </div>
      <div style="font-size:13px;font-weight:700;color:#fff" id="dp-cidade">–</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px" id="dp-coords">Aguardando localização...</div>
    </div>

    <!-- Links -->
    <div style="background:#1B3A5C;border-radius:14px;padding:18px">
      <div style="font-size:10px;font-weight:800;color:var(--laranja);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
        <i class="fas fa-link" style="margin-right:5px"></i>Links
      </div>
      <a href="/mapa-brasil" style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.65);text-decoration:none;font-size:12px;font-weight:700">
        <i class="fas fa-globe-americas" style="color:#00C853;width:16px"></i> Mapa Brasil 46K Postos
      </a>
      <a href="/" style="display:flex;align-items:center;gap:8px;padding:8px 0;color:rgba(255,255,255,0.65);text-decoration:none;font-size:12px;font-weight:700">
        <i class="fas fa-home" style="color:var(--laranja);width:16px"></i> Página Inicial
      </a>
    </div>
  </div><!-- /#dp-dados-content -->

</aside>

</body>
</html>`

  return c.html(html)
})

// ─── Painel Administrativo ────────────────────────────────────────────────────
// ─── GET /api/admin/usuarios ──────────────────────────────────────────────────
// Lista todos os parceiros/postos cadastrados no R2 (prefixo parceiro--)
app.get('/api/admin/usuarios', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)

  const r2 = (c.env as Record<string,unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
  if (!r2) return c.json({ erro: 'R2 não disponível' }, 500)

  try {
    const listed = await r2.list({ prefix: 'parceiro--' })
    const parceiros: unknown[] = []

    for (const obj of listed.objects) {
      try {
        const data = await r2Get(r2, obj.key.replace('parceiro--', 'parceiro:')) as Record<string, unknown> | null
        if (data) {
          parceiros.push({
            id: obj.key.replace('parceiro--', ''),
            nomePosto: data.nomePosto || data.nome || '—',
            email: data.email || '—',
            plano: data.plano || 'gratuito',
            tel: data.tel || '—',
            cidade: data.cidade || '—',
            cnpj: data.cnpj || '—',
            criadoEm: data.criadoEm || obj.uploaded?.toISOString() || '—',
          })
        }
      } catch {}
    }

    return c.json({ total: parceiros.length, parceiros })
  } catch (e) {
    console.error('[admin/usuarios] erro:', e)
    return c.json({ erro: 'Erro ao listar usuários', detalhes: String(e) }, 500)
  }
})

// ─── GET /api/admin/app-usuarios — lista usuários reais (sessões KV + assinaturas) ──
app.get('/api/admin/app-usuarios', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  const r2 = (c.env as Record<string,unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  try {
    // Carregar todos os perfis em memória para cruzamento rápido
    const profilesMap = new Map<string, any>()
    try {
      const listProfiles = await kv.list({ prefix: 'profile:' })
      for (const pk of listProfiles.keys) {
        try {
          const raw = await kv.get(pk.name)
          if (raw) {
            const p = JSON.parse(raw) as any
            const uid = p.uid || pk.name.replace('profile:', '')
            profilesMap.set(uid, p)
          }
        } catch {}
      }
    } catch {}

    const list = await kv.list({ prefix: 'session:' })
    const usuarios: unknown[] = []
    const uidsProcessados = new Set<string>()

    for (const k of list.keys) {
      try {
        const raw = await kv.get(k.name)
        if (!raw) continue
        const sess = JSON.parse(raw) as any
        const uid = sess.uid || k.name.replace('session:', '')
        if (uidsProcessados.has(uid)) continue
        uidsProcessados.add(uid)

        const assinRaw = await kv.get(`assin:${uid}`)
        const assin = assinRaw ? JSON.parse(assinRaw) as any : null
        let veiculo = null
        if (r2) { try { veiculo = await r2Get(r2, `usuario:${uid}:veiculo`) } catch {} }

        // Cruzar com perfil
        const perfil = profilesMap.get(uid) || {}

        usuarios.push({
          uid,
          // Dados do perfil
          nome: perfil.name || sess.displayName || '—',
          email: perfil.email || sess.email || '—',
          telefone: perfil.telefone || '—',
          foto: perfil.photo || sess.photoURL || '',
          provider: perfil.provider || 'email',
          cidade: perfil.cidade || '—',
          estado: perfil.estado || '—',
          cpf: perfil.cpf || '—',
          // Dados de sessão
          deviceId: sess.deviceId || '—',
          loginEm: sess.updatedAt || sess.createdAt ? new Date(sess.updatedAt || sess.createdAt).toISOString() : '—',
          criadoEm: perfil.criadoEm ? new Date(perfil.criadoEm).toISOString() : (sess.createdAt ? new Date(sess.createdAt).toISOString() : '—'),
          // Assinatura
          plano: assin?.status === 'ACTIVE' ? (assin.plano || 'premium') : (assin ? 'free' : 'gratuito'),
          assinatura: assin ? {
            status: assin.status, plano: assin.plano,
            expiraEm: assin.expiraEm, ativadaEm: assin.ativadaEm,
            pagamentos: assin.pagamentos || 0,
            avisoInadimplencia: assin.avisoInadimplencia || false
          } : null,
          veiculo: veiculo || null,
        })
      } catch {}
    }

    // Também incluir usuários que têm perfil mas não têm sessão ativa
    for (const [uid, perfil] of profilesMap.entries()) {
      if (uidsProcessados.has(uid)) continue
      try {
        const assinRaw = await kv.get(`assin:${uid}`)
        const assin = assinRaw ? JSON.parse(assinRaw) as any : null
        usuarios.push({
          uid,
          nome: perfil.name || '—',
          email: perfil.email || '—',
          telefone: perfil.telefone || '—',
          foto: perfil.photo || '',
          provider: perfil.provider || 'email',
          cidade: perfil.cidade || '—',
          estado: perfil.estado || '—',
          cpf: perfil.cpf || '—',
          deviceId: '—',
          loginEm: perfil.ultimoLogin ? new Date(perfil.ultimoLogin).toISOString() : '—',
          criadoEm: perfil.criadoEm ? new Date(perfil.criadoEm).toISOString() : '—',
          plano: assin?.status === 'ACTIVE' ? (assin.plano || 'premium') : (assin ? 'free' : 'gratuito'),
          assinatura: assin ? {
            status: assin.status, plano: assin.plano,
            expiraEm: assin.expiraEm, ativadaEm: assin.ativadaEm,
            pagamentos: assin.pagamentos || 0,
            avisoInadimplencia: assin.avisoInadimplencia || false
          } : null,
          veiculo: null,
        })
      } catch {}
    }

    // Ordenar por loginEm mais recente
    ;(usuarios as any[]).sort((a: any, b: any) => (b.loginEm > a.loginEm ? 1 : -1))

    const premium = (usuarios as any[]).filter((u: any) => u.plano !== 'gratuito' && u.plano !== 'free').length
    return c.json({ total: usuarios.length, premium, gratuito: usuarios.length - premium, usuarios })
  } catch (e) {
    return c.json({ erro: 'Erro', detalhes: String(e) }, 500)
  }
})

// ─── DELETE /api/admin/app-usuarios/:uid — banir/remover sessão ───────────────
app.delete('/api/admin/app-usuarios/:uid', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const uid = c.req.param('uid')
  await kv.delete(`session:${uid}`)
  return c.json({ ok: true, uid })
})

// ─── GET /api/admin/usuarios-dados — lista usuários com dados reais (nome/email/telefone/provider) ──
app.get('/api/admin/usuarios-dados', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  try {
    // Listar todos os perfis (profile:*)
    const listProfiles = await kv.list({ prefix: 'profile:' })
    // Listar todas as sessões para cruzar dados
    const listSessions = await kv.list({ prefix: 'session:' })
    const sessionUids = new Set(listSessions.keys.map((k: any) => k.name.replace('session:', '')))

    const usuarios: unknown[] = []
    for (const k of listProfiles.keys) {
      try {
        const raw = await kv.get(k.name)
        if (!raw) continue
        const perfil = JSON.parse(raw) as any
        const uid = perfil.uid || k.name.replace('profile:', '')
        // Buscar assinatura
        const assinRaw = await kv.get(`assin:${uid}`)
        const assin = assinRaw ? JSON.parse(assinRaw) as any : null
        usuarios.push({
          uid,
          name: perfil.name || '—',
          email: perfil.email || '—',
          telefone: perfil.telefone || '—',
          photo: perfil.photo || '',
          provider: perfil.provider || 'email',
          cidade: perfil.cidade || '—',
          estado: perfil.estado || '—',
          cep: perfil.cep || '—',
          ultimoLogin: perfil.ultimoLogin ? new Date(perfil.ultimoLogin).toISOString() : '—',
          criadoEm: perfil.criadoEm ? new Date(perfil.criadoEm).toISOString() : '—',
          atualizadoEm: perfil.atualizadoEm ? new Date(perfil.atualizadoEm).toISOString() : '—',
          ativo: sessionUids.has(uid),
          plano: assin?.status === 'ACTIVE' ? (assin.plano || 'premium') : 'gratuito',
        })
      } catch {}
    }
    // Ordenar por mais recente primeiro
    usuarios.sort((a: any, b: any) => (b.ultimoLogin > a.ultimoLogin ? 1 : -1))
    return c.json({ total: usuarios.length, usuarios })
  } catch (e) {
    return c.json({ erro: 'Erro', detalhes: String(e) }, 500)
  }
})

// ─── POST /api/admin/usuarios/:uid/editar — editar dados do usuário ───────────
app.post('/api/admin/usuarios/:uid/editar', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const uid = c.req.param('uid')
  const body = await c.req.json() as any
  try {
    let perfil: any = {}
    try {
      const raw = await kv.get(`profile:${uid}`)
      if (raw) perfil = JSON.parse(raw)
    } catch {}
    const campos = ['name', 'email', 'telefone', 'cep', 'cidade', 'estado']
    for (const campo of campos) {
      if (body[campo] !== undefined) perfil[campo] = body[campo]
    }
    perfil.uid = uid
    perfil.editadoPeloAdmin = true
    perfil.editadoEm = Date.now()
    perfil.criadoEm = perfil.criadoEm || Date.now()
    await kv.put(`profile:${uid}`, JSON.stringify(perfil), { expirationTtl: 60 * 60 * 24 * 400 })
    return c.json({ ok: true, uid, perfil })
  } catch (e) {
    return c.json({ erro: String(e) }, 500)
  }
})

// ─── POST /api/admin/usuarios/:uid/permissao — alterar nível de acesso ──────────
app.post('/api/admin/usuarios/:uid/permissao', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const uid = c.req.param('uid')
  const { acao } = await c.req.json() as any

  try {
    // Carregar sessão do usuário
    let sessao: any = {}
    try { const r = await kv.get(`sess:${uid}`); if (r) sessao = JSON.parse(r) } catch {}

    if (acao === 'premium') {
      // Ativar premium manualmente por 30 dias
      let assin: any = {}
      try { const r = await kv.get(`assin:${uid}`); if (r) assin = JSON.parse(r) } catch {}
      assin.userId = uid; assin.plano = 'premium'; assin.status = 'ACTIVE'
      assin.ativadaEm = Date.now(); assin.expiraEm = Date.now() + 30 * 24 * 60 * 60 * 1000
      assin.pagamentos = (assin.pagamentos || 0); assin.ativadoPeloAdmin = true
      await kv.put(`assin:${uid}`, JSON.stringify(assin), { expirationTtl: 60*60*24*400 })
      sessao.bloqueado = false
      await kv.put(`sess:${uid}`, JSON.stringify(sessao), { expirationTtl: 60*60*24*400 })
      return c.json({ sucesso: true, acao, uid })
    }

    if (acao === 'free') {
      // Cancelar assinatura e voltar para free
      let assin: any = {}
      try { const r = await kv.get(`assin:${uid}`); if (r) assin = JSON.parse(r) } catch {}
      assin.status = 'CANCELLED'; assin.canceladaEm = Date.now()
      await kv.put(`assin:${uid}`, JSON.stringify(assin), { expirationTtl: 60*60*24*400 })
      sessao.bloqueado = false
      await kv.put(`sess:${uid}`, JSON.stringify(sessao), { expirationTtl: 60*60*24*400 })
      return c.json({ sucesso: true, acao, uid })
    }

    if (acao === 'bloqueado') {
      sessao.bloqueado = true; sessao.bloqueadoEm = Date.now()
      await kv.put(`sess:${uid}`, JSON.stringify(sessao), { expirationTtl: 60*60*24*400 })
      return c.json({ sucesso: true, acao, uid })
    }

    if (acao === 'desbloquear') {
      sessao.bloqueado = false; delete sessao.bloqueadoEm
      await kv.put(`sess:${uid}`, JSON.stringify(sessao), { expirationTtl: 60*60*24*400 })
      return c.json({ sucesso: true, acao, uid })
    }

    return c.json({ erro: 'Ação inválida: ' + acao }, 400)
  } catch(e) {
    return c.json({ erro: String(e) }, 500)
  }
})

// ─── POST /api/admin/assinatura/:uid/cancelar — cancelar assinatura de usuário ─
app.post('/api/admin/assinatura/:uid/cancelar', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const uid = c.req.param('uid')
  const raw = await kv.get(`assin:${uid}`)
  if (!raw) return c.json({ erro: 'Assinatura não encontrada' }, 404)
  const assin = JSON.parse(raw) as any
  assin.status = 'CANCELLED'
  assin.canceladaEm = Date.now()
  await kv.put(`assin:${uid}`, JSON.stringify(assin), { expirationTtl: 60 * 60 * 24 * 365 })
  return c.json({ ok: true, uid })
})

// ─── POST /api/admin/assinatura/:uid/ativar — ativar premium manualmente ──────
app.post('/api/admin/assinatura/:uid/ativar', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const uid = c.req.param('uid')
  const body = await c.req.json() as any
  const dias = body.dias || 30
  const expiraEm = Date.now() + dias * 86400000
  const raw = await kv.get(`assin:${uid}`)
  const assin = raw ? JSON.parse(raw) as any : { uid, plano: 'manual', subscriptionId: 'admin', pagamentos: 0 }
  assin.status = 'ACTIVE'
  assin.ativadaEm = Date.now()
  assin.expiraEm = expiraEm
  assin.plano = body.plano || assin.plano || 'manual'
  await kv.put(`assin:${uid}`, JSON.stringify(assin), { expirationTtl: 60 * 60 * 24 * 400 })
  return c.json({ ok: true, uid, expiraEm })
})

// ─── GET /api/admin/menu-app — retorna config do menu do app ──────────────────
app.get('/api/admin/menu-app', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ ok: false, error: 'KV indisponível' }, 503)
  try {
    const raw = await kv.get('app:menu-config')
    const itens = raw ? JSON.parse(raw) : null
    return c.json({ ok: true, itens })
  } catch(e) { return c.json({ ok: false, error: String(e) }, 500) }
})

// ─── POST /api/admin/menu-app — salva config do menu do app ───────────────────
app.post('/api/admin/menu-app', async (c) => {
  const body = await c.req.json() as any
  const key = body.key || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ ok: false, error: 'KV indisponível' }, 503)
  try {
    await kv.put('app:menu-config', JSON.stringify(body.itens), { expirationTtl: 60 * 60 * 24 * 365 })
    return c.json({ ok: true })
  } catch(e) { return c.json({ ok: false, error: String(e) }, 500) }
})

// ─── GET /api/app/menu-config — retorna config do menu para o app (público) ───
app.get('/api/app/menu-config', async (c) => {
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ itens: null })
  try {
    const raw = await kv.get('app:menu-config')
    return c.json({ itens: raw ? JSON.parse(raw) : null })
  } catch { return c.json({ itens: null }) }
})

// ─── GET /api/admin/assinaturas — lista todas as assinaturas ──────────────────
app.get('/api/admin/assinaturas', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  try {
    // Pré-carregar perfis para cruzamento
    const profilesMap = new Map<string, any>()
    try {
      const listP = await kv.list({ prefix: 'profile:' })
      for (const pk of listP.keys) {
        try {
          const raw = await kv.get(pk.name)
          if (raw) {
            const p = JSON.parse(raw) as any
            profilesMap.set(p.uid || pk.name.replace('profile:', ''), p)
          }
        } catch {}
      }
    } catch {}

    const list = await kv.list({ prefix: 'assin:' })
    const assinaturas: unknown[] = []
    let ativas = 0, canceladas = 0, expiradas = 0
    for (const k of list.keys) {
      // Ignorar chaves de postos e índices reversos
      if (k.name.startsWith('assin:posto:')) continue
      const raw = await kv.get(k.name)
      if (!raw) continue
      const a = JSON.parse(raw) as any
      const uid = k.name.replace('assin:', '')
      if (a.status === 'ACTIVE') ativas++
      else if (a.status === 'CANCELLED') canceladas++
      else expiradas++
      // Cruzar com perfil
      const perfil = profilesMap.get(uid) || {}
      assinaturas.push({
        uid,
        nome: perfil.name || a.nome || '—',
        email: perfil.email || a.email || '—',
        telefone: perfil.telefone || '—',
        foto: perfil.photo || '',
        cidade: perfil.cidade || '—',
        estado: perfil.estado || '—',
        cpf: perfil.cpf || '—',
        provider: perfil.provider || '—',
        ...a
      })
    }
    // Ordenar: ativas primeiro, depois por data de ativação desc
    ;(assinaturas as any[]).sort((a: any, b: any) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1
      if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1
      return (b.ativadaEm || 0) - (a.ativadaEm || 0)
    })
    return c.json({ total: assinaturas.length, ativas, canceladas, expiradas, assinaturas })
  } catch (e) {
    return c.json({ erro: 'Erro', detalhes: String(e) }, 500)
  }
})

// ─── API Admin: Planos — GET listar, PUT editar, POST criar, DELETE remover ────

const PLANOS_KV_KEY = 'admin:planos_config'

// Planos padrão (fallback quando KV não tem config)
const PLANOS_DEFAULT = [
  {
    id: 'free',
    nome: 'Gratuito',
    emoji: '🆓',
    cor: '#42A5F5',
    valor: 0,
    ciclo: 'forever',
    descricao: 'Acesso básico gratuito para sempre',
    ativo: true,
    destaque: false,
    features: [
      { texto: 'Postos próximos (raio 5km)', incluido: true },
      { texto: 'Preços colaborativos', incluido: true },
      { texto: 'Mapa básico', incluido: true },
      { texto: 'Rota de menor custo', incluido: false },
      { texto: 'Histórico de preços', incluido: false },
      { texto: 'Sem anúncios', incluido: false },
      { texto: 'Suporte prioritário', incluido: false },
      { texto: 'Relatórios avançados', incluido: false },
      { texto: 'Export de dados', incluido: false }
    ]
  },
  {
    id: 'premium',
    nome: 'Premium Mensal',
    emoji: '⭐',
    cor: '#FF6D00',
    valor: 990,
    ciclo: 'monthly',
    descricao: 'Acesso completo com pagamento mensal via PIX ou cartão',
    ativo: true,
    destaque: true,
    features: [
      { texto: 'Todos os postos do Brasil', incluido: true },
      { texto: 'Mapa com preços em tempo real', incluido: true },
      { texto: 'Rota de menor custo', incluido: true },
      { texto: 'Histórico completo', incluido: true },
      { texto: 'Sem anúncios', incluido: true },
      { texto: 'Suporte prioritário', incluido: true },
      { texto: 'Relatórios avançados', incluido: false },
      { texto: 'Export de dados', incluido: false },
      { texto: 'Badge exclusivo', incluido: false }
    ]
  },
  {
    id: 'anual',
    nome: 'Premium Anual',
    emoji: '👑',
    cor: '#FFD600',
    valor: 8900,
    ciclo: 'yearly',
    descricao: 'Plano anual com 2 meses grátis — melhor custo-benefício',
    ativo: true,
    destaque: false,
    features: [
      { texto: 'Tudo do Premium Mensal', incluido: true },
      { texto: '2 meses grátis', incluido: true },
      { texto: 'Rota de menor custo', incluido: true },
      { texto: 'Histórico completo', incluido: true },
      { texto: 'Sem anúncios', incluido: true },
      { texto: 'Relatórios avançados', incluido: true },
      { texto: 'Export de dados', incluido: true },
      { texto: 'Badge exclusivo', incluido: true },
      { texto: 'Suporte máximo', incluido: true }
    ]
  }
]

async function getPlanosConfig(kv: KVNamespace): Promise<any[]> {
  try {
    const raw = await kv.get(PLANOS_KV_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return PLANOS_DEFAULT
}

app.get('/api/admin/planos', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const planos = await getPlanosConfig(kv)
  return c.json({ planos })
})

app.put('/api/admin/planos/:id', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  const planos = await getPlanosConfig(kv)
  const idx = planos.findIndex((p: any) => p.id === id)
  if (idx === -1) return c.json({ erro: 'Plano não encontrado' }, 404)
  planos[idx] = { ...planos[idx], ...body, id }
  await kv.put(PLANOS_KV_KEY, JSON.stringify(planos))
  return c.json({ ok: true, plano: planos[idx] })
})

app.post('/api/admin/planos', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const body = await c.req.json() as any
  const planos = await getPlanosConfig(kv)
  const novoId = body.id || ('plano_' + Date.now())
  if (planos.find((p: any) => p.id === novoId)) return c.json({ erro: 'ID já existe' }, 400)
  const novo = {
    id: novoId,
    nome: body.nome || 'Novo Plano',
    emoji: body.emoji || '📦',
    cor: body.cor || '#FF6D00',
    valor: body.valor ?? 0,
    ciclo: body.ciclo || 'monthly',
    descricao: body.descricao || '',
    ativo: body.ativo ?? true,
    destaque: body.destaque ?? false,
    features: body.features || []
  }
  planos.push(novo)
  await kv.put(PLANOS_KV_KEY, JSON.stringify(planos))
  return c.json({ ok: true, plano: novo })
})

app.delete('/api/admin/planos/:id', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const id = c.req.param('id')
  if (['free','premium','anual'].includes(id)) return c.json({ erro: 'Planos padrão não podem ser removidos' }, 400)
  const planos = await getPlanosConfig(kv)
  const novos = planos.filter((p: any) => p.id !== id)
  await kv.put(PLANOS_KV_KEY, JSON.stringify(novos))
  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PLANOS B2B PARA POSTOS PARCEIROS — sistema separado dos planos do app usuário
// ═══════════════════════════════════════════════════════════════════════════════
const PLANOS_POSTO_KV_KEY = 'admin:planos_posto_config'

const PLANOS_POSTO_DEFAULT = [
  {
    id: 'posto_gratis',
    nome: 'Gratuito',
    emoji: '🆓',
    cor: '#42A5F5',
    valor: 0,
    ciclo: 'forever',
    descricao: 'Perfil básico no app, sem custos',
    ativo: true,
    destaque: false,
    diasTeste: 0,
    beneficios: ['perfil_basico', 'exibir_precos'],
    features: []
  },
  {
    id: 'posto_basico',
    nome: 'Básico',
    emoji: '⭐',
    cor: '#FF6D00',
    valor: 9900,
    ciclo: 'monthly',
    descricao: 'Visibilidade ampliada e selo verificado',
    ativo: true,
    destaque: false,
    diasTeste: 0,
    beneficios: ['perfil_basico', 'exibir_precos', 'selo_verificado', 'relatorio_cliques', 'suporte_prioritario'],
    features: []
  },
  {
    id: 'posto_plus',
    nome: 'Plus',
    emoji: '👑',
    cor: '#FFD600',
    valor: 19900,
    ciclo: 'monthly',
    descricao: 'Destaque máximo, cupons e notificações',
    ativo: true,
    destaque: true,
    diasTeste: 0,
    beneficios: ['perfil_basico', 'exibir_precos', 'selo_verificado', 'pin_dourado', 'topo_lista', 'cupons_ativos', 'notificacoes', 'relatorio_cliques', 'destaque_busca', 'suporte_prioritario'],
    features: []
  }
]

async function getPlanosPostoConfig(kv: KVNamespace): Promise<any[]> {
  try {
    const raw = await kv.get(PLANOS_POSTO_KV_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return PLANOS_POSTO_DEFAULT
}

// GET /api/admin/planos-posto
app.get('/api/admin/planos-posto', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const planos = await getPlanosPostoConfig(kv)
  return c.json({ planos })
})

// POST /api/admin/planos-posto — criar novo plano
app.post('/api/admin/planos-posto', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const body = await c.req.json() as any
  const planos = await getPlanosPostoConfig(kv)
  const novoId = body.id || ('posto_' + Date.now())
  if (planos.find((p: any) => p.id === novoId)) return c.json({ erro: 'ID já existe' }, 400)
  const novo = {
    id: novoId,
    nome: body.nome || 'Novo Plano',
    emoji: body.emoji || '📦',
    cor: body.cor || '#FF6D00',
    valor: body.valor ?? 0,
    ciclo: body.ciclo || 'monthly',
    descricao: body.descricao || '',
    ativo: body.ativo ?? true,
    destaque: body.destaque ?? false,
    diasTeste: body.diasTeste ?? 0,
    beneficios: body.beneficios || [],
    features: body.features || []
  }
  planos.push(novo)
  await kv.put(PLANOS_POSTO_KV_KEY, JSON.stringify(planos))
  return c.json({ ok: true, plano: novo })
})

// PUT /api/admin/planos-posto/:id — atualizar plano existente
app.put('/api/admin/planos-posto/:id', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  const planos = await getPlanosPostoConfig(kv)
  const idx = planos.findIndex((p: any) => p.id === id)
  if (idx === -1) return c.json({ erro: 'Plano não encontrado' }, 404)
  planos[idx] = { ...planos[idx], ...body, id }
  await kv.put(PLANOS_POSTO_KV_KEY, JSON.stringify(planos))
  return c.json({ ok: true, plano: planos[idx] })
})

// DELETE /api/admin/planos-posto/:id — remover plano
app.delete('/api/admin/planos-posto/:id', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)
  const id = c.req.param('id')
  if (['posto_gratis', 'posto_basico', 'posto_plus'].includes(id)) return c.json({ erro: 'Planos padrão não podem ser removidos' }, 400)
  const planos = await getPlanosPostoConfig(kv)
  const novos = planos.filter((p: any) => p.id !== id)
  await kv.put(PLANOS_POSTO_KV_KEY, JSON.stringify(novos))
  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PIX RECORRENTE B2B — POSTOS PARCEIROS
// KV key: "assin:posto:{postoId}" → JSON AssinaturaPostoPix
// KV index reverso: "sub:posto:{subscriptionId}" → postoId
// ═══════════════════════════════════════════════════════════════════════════════

interface AssinaturaPostoPix {
  postoId: string
  nomeFantasia: string
  email: string
  cnpj?: string
  plano: string         // ex: 'posto_basico', 'posto_plus'
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED'
  subscriptionId?: string
  chargeId?: string
  qrCode?: string
  brcode?: string
  criadaEm: number
  ativadaEm?: number
  expiraEm?: number
  proximoPagamento?: number
  pagamentos: number
  avisoInadimplencia?: boolean
  inadimplenciaEm?: number
}

async function kvGetAssinaturaPostoPix(kv: KVNamespace, postoId: string): Promise<AssinaturaPostoPix | null> {
  try {
    const raw = await kv.get(`assin:posto:${postoId}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

async function kvSetAssinaturaPostoPix(kv: KVNamespace, postoId: string, assin: AssinaturaPostoPix) {
  await kv.put(`assin:posto:${postoId}`, JSON.stringify(assin), { expirationTtl: 63072000 }) // 2 anos
  if (assin.subscriptionId) {
    await kv.put(`sub:posto:${assin.subscriptionId}`, postoId, { expirationTtl: 63072000 })
  }
  if (assin.chargeId) {
    await kv.put(`sub:posto:${assin.chargeId}`, postoId, { expirationTtl: 63072000 })
  }
}

// ─── POST /api/pix/posto/assinar — cria assinatura PIX para posto ────────────
app.post('/api/pix/posto/assinar', async (c) => {
  try {
    const body = await c.req.json() as any
    const { postoId, nomeFantasia, email, cnpj, plano } = body
    if (!postoId || !nomeFantasia) {
      return c.json({ sucesso: false, mensagem: 'postoId e nomeFantasia são obrigatórios' }, 400)
    }
    const kv = getKV(c.env)
    if (!kv) return c.json({ sucesso: false, mensagem: 'Serviço indisponível' }, 500)

    // Verificar plano válido (deve ser pago)
    const planosPostoConfig = await getPlanosPostoConfig(kv)
    const planoInfo = planosPostoConfig.find((p: any) => p.id === plano)
    if (!planoInfo || planoInfo.valor === 0) {
      return c.json({ sucesso: false, mensagem: 'Plano inválido ou gratuito' }, 400)
    }

    // Verificar assinatura existente
    const existente = await kvGetAssinaturaPostoPix(kv, postoId)
    if (existente?.status === 'ACTIVE') {
      return c.json({ sucesso: true, jaAssinante: true, plano: existente.plano, expiraEm: existente.expiraEm, mensagem: 'Posto já tem assinatura ativa!' })
    }
    if (existente?.status === 'PENDING' && existente.qrCode) {
      return c.json({ sucesso: true, jaPendente: true, qrCode: existente.qrCode, brcode: existente.brcode, subscriptionId: existente.subscriptionId, plano: existente.plano, valor: planoInfo.valor })
    }

    // CPF/CNPJ para Woovi — usar CNPJ como taxID ou gerar fallback
    const docLimpo = (cnpj || '').replace(/\D/g, '') || postoId.replace(/\D/g, '').slice(0, 14).padEnd(11, '0')
    const emailFinal = (email || '').trim() || `posto-${postoId.slice(-8)}@rotaposto.app`

    const resultado = await criarAssinaturaPIX(c.env as any, nomeFantasia, emailFinal, docLimpo.slice(0, 11), plano)
    if (!resultado.sucesso) {
      return c.json({ sucesso: false, mensagem: resultado.error || 'Erro ao gerar PIX' }, 500)
    }

    const assin: AssinaturaPostoPix = {
      postoId, nomeFantasia, email: emailFinal, cnpj: docLimpo,
      plano, status: 'PENDING',
      subscriptionId: resultado.subscriptionId,
      chargeId: resultado.chargeId,
      qrCode: resultado.qrCode, brcode: resultado.brcode,
      criadaEm: Date.now(), pagamentos: 0
    }
    await kvSetAssinaturaPostoPix(kv, postoId, assin)

    return c.json({
      sucesso: true, qrCode: resultado.qrCode, brcode: resultado.brcode,
      subscriptionId: resultado.subscriptionId, plano, valor: planoInfo.valor,
      demo: resultado.demo || false,
      mensagem: 'QR Code PIX gerado! Pague para ativar o plano ' + planoInfo.nome + '.'
    })
  } catch (e: any) {
    console.error('[PIX posto assinar]', e)
    return c.json({ sucesso: false, mensagem: 'Erro ao gerar PIX' }, 500)
  }
})

// ─── POST /api/pix/posto/renovar — gera novo PIX para posto inadimplente ─────
app.post('/api/pix/posto/renovar', async (c) => {
  try {
    const body = await c.req.json() as any
    const { postoId } = body
    if (!postoId) return c.json({ sucesso: false, mensagem: 'postoId obrigatório' }, 400)
    const kv = getKV(c.env)
    if (!kv) return c.json({ sucesso: false, mensagem: 'Serviço indisponível' }, 500)

    const assin = await kvGetAssinaturaPostoPix(kv, postoId)
    if (!assin) return c.json({ sucesso: false, mensagem: 'Nenhuma assinatura encontrada' }, 404)
    if (assin.status === 'ACTIVE') return c.json({ sucesso: false, mensagem: 'Assinatura já está ativa!', jaAtiva: true })

    const planosConfig = await getPlanosPostoConfig(kv)
    const planoInfo = planosConfig.find((p: any) => p.id === assin.plano) || planosConfig.find((p: any) => p.id === 'posto_basico')
    const docLimpo = (assin.cnpj || postoId.replace(/\D/g, '').slice(0, 11).padEnd(11, '0'))

    const resultado = await criarAssinaturaPIX(c.env as any, assin.nomeFantasia, assin.email, docLimpo.slice(0, 11), assin.plano)
    if (!resultado.sucesso) return c.json({ sucesso: false, mensagem: resultado.error || 'Erro ao gerar PIX' }, 500)

    assin.status = 'PENDING'
    assin.qrCode = resultado.qrCode
    assin.brcode = resultado.brcode
    assin.subscriptionId = resultado.subscriptionId
    assin.chargeId = resultado.chargeId
    await kvSetAssinaturaPostoPix(kv, postoId, assin)

    return c.json({
      sucesso: true, qrCode: resultado.qrCode, brcode: resultado.brcode,
      subscriptionId: resultado.subscriptionId,
      txid: resultado.chargeId, // Para polling de verificação
      plano: assin.plano,
      valor: planoInfo?.valor ?? 9900, demo: resultado.demo || false,
      mensagem: 'Novo QR Code gerado! Pague para reativar o plano do posto.'
    })
  } catch (e: any) {
    return c.json({ sucesso: false, mensagem: 'Erro ao renovar' }, 500)
  }
})

// ─── GET /api/pix/posto/status/:postoId — status da assinatura do posto ──────
app.get('/api/pix/posto/status/:postoId', async (c) => {
  const postoId = c.req.param('postoId')
  const kv = getKV(c.env)
  if (!kv) return c.json({ status: 'UNKNOWN', ativa: false })

  const assin = await kvGetAssinaturaPostoPix(kv, postoId)
  if (!assin) return c.json({ status: 'FREE', plano: 'posto_gratis', ativa: false })

  // Verificar expiração por tempo
  const agora = Date.now()
  const GRACE = 3 * 24 * 3600 * 1000 // 3 dias de carência
  if (assin.status === 'ACTIVE' && assin.expiraEm && agora > assin.expiraEm + GRACE) {
    assin.status = 'EXPIRED'
    assin.avisoInadimplencia = true
    assin.inadimplenciaEm = agora
    await kvSetAssinaturaPostoPix(kv, postoId, assin)
    // Rebaixar plano
    const parceiro = await kvGetParceiro(kv, postoId, undefined)
    if (parceiro) {
      (parceiro as any).plano = 'posto_gratis'
      await kvSetParceiro(kv, postoId, parceiro as Record<string,unknown>, undefined, undefined)
    }
  }

  return c.json({
    status: assin.status, plano: assin.plano, ativa: assin.status === 'ACTIVE',
    expiraEm: assin.expiraEm, pagamentos: assin.pagamentos,
    avisoInadimplencia: assin.avisoInadimplencia || false,
    qrCode: assin.status === 'PENDING' ? assin.qrCode : null,
    brcode: assin.status === 'PENDING' ? assin.brcode : null,
    subscriptionId: assin.status === 'PENDING' ? assin.subscriptionId : null
  })
})

// Atualizar webhook para processar pagamentos de postos também
// (handler unificado — a lógica de EXPIRADO para postos já está no webhook app acima)
// Pagamento PAGO de posto:
// O webhook do Woovi usa /api/pix/webhook — expandir lá o bloco PAGO para verificar postos
// via sub:posto:{id} index

// ─── DELETE /api/admin/postos/:id — remover posto parceiro do R2 ──────────────
app.delete('/api/admin/postos/:id', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const r2 = (c.env as Record<string,unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
  if (!r2) return c.json({ erro: 'R2 não disponível' }, 500)
  const id = c.req.param('id')
  await r2.delete(`parceiro--${id}`)
  return c.json({ ok: true, id })
})

// ─── GET /api/admin/parceiros — lista TODOS os postos (R2 + KV fallback + p_teste persistido) ──
app.get('/api/admin/parceiros', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv  = getKV(c.env as any)
  const r2  = (c.env as Record<string,unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined

  const parceiros: Record<string,unknown>[] = []
  const vistos = new Set<string>()

  // 1. Listar objetos R2 com prefixo parceiro--
  if (r2) {
    try {
      const listed = await r2.list({ prefix: 'parceiro--' })
      for (const obj of listed.objects) {
        const id = obj.key.replace('parceiro--', '')
        if (id.startsWith('email_') || id.startsWith('cnpj_')) continue
        try {
          const data = await r2Get(r2, `parceiro:${id}`) as Record<string,unknown> | null
          if (data && data.id) {
            vistos.add(String(data.id))
            parceiros.push(normalizarParceiro(data, id, obj.uploaded))
          }
        } catch {}
      }
    } catch(e) { console.warn('[admin/parceiros] r2.list erro:', e) }
  }

  // 2. Fallback: varrer KV por parceiro:* (legado)
  if (kv) {
    try {
      const kvList = await kv.list({ prefix: 'parceiro:' })
      for (const k of kvList.keys) {
        const seg = k.name.replace('parceiro:', '')
        if (seg.startsWith('sess_') || seg.startsWith('email_') || seg.startsWith('cnpj_')) continue
        if (vistos.has(seg)) continue
        try {
          const raw = await kv.get(k.name)
          if (!raw) continue
          const data = JSON.parse(raw) as Record<string,unknown>
          if (data && data.id) {
            vistos.add(seg)
            parceiros.push(normalizarParceiro(data, seg, null))
          }
        } catch {}
      }
    } catch {}
  }

  // 3. p_teste: garante que está salvo no R2 (auto-persiste na primeira vez)
  if (!vistos.has('p_teste')) {
    const testeDefault: Record<string,unknown> = {
      id: 'p_teste',
      nomePosto: 'Posto Teste RotaPosto',
      email: 'teste@rotaposto.com.br',
      plano: 'premium',
      tel: '(27) 99999-9999',
      telTelemarketing: '(27) 3000-0000',
      cidade: 'Vitória',
      estado: 'ES',
      bairro: 'Centro',
      cnpj: '00.000.000/0001-00',
      bandeira: 'Independente',
      status: 'ativo',
      seloVerificado: true,
      criadoEm: '2025-01-01T00:00:00.000Z',
      precos: { gasolina: 0, gasolinaAditivada: 0, etanol: 0, diesel: 0, dieselS10: 0, gnv: 0 }
    }
    // Salvar no R2/KV para persistir
    try { await kvSetParceiro(kv, 'p_teste', testeDefault, undefined, r2) } catch {}
    parceiros.push(normalizarParceiro(testeDefault, 'p_teste', null))
  }

  // Ordenar: mais recentes primeiro
  parceiros.sort((a, b) => {
    const da = a.criadoEm ? new Date(String(a.criadoEm)).getTime() : 0
    const db = b.criadoEm ? new Date(String(b.criadoEm)).getTime() : 0
    return db - da
  })

  return c.json({ total: parceiros.length, parceiros })
})

function normalizarParceiro(data: Record<string,unknown>, id: string, uploaded: Date | null | undefined): Record<string,unknown> {
  const precos = (data.precos as Record<string,unknown>) || {}
  return {
    id: String(data.id || id),
    nomePosto:        data.nomePosto        || data.nome || '—',
    email:            data.email            || '—',
    plano:            data.plano            || 'visibilidade',
    tel:              data.tel              || data.whatsapp || '—',
    telTelemarketing: data.telTelemarketing || '—',
    cidade:           data.cidade           || '—',
    estado:           data.estado           || '—',
    bairro:           data.bairro           || '—',
    cnpj:             data.cnpj             || '—',
    bandeira:         data.bandeira         || '—',
    status:           data.status           || 'pendente',
    seloVerificado:   Boolean(data.seloVerificado),
    pinDourado:       Boolean(data.pinDourado),
    topoLista:        Boolean(data.topoLista),
    cuponsAtivos:     Boolean(data.cuponsAtivos),
    criadoEm:         data.criadoEm         || uploaded?.toISOString() || '—',
    atualizadoEm:     data.atualizadoEm     || '—',
    // Preços combustível
    precos: {
      gasolina:         Number(precos.gasolina         || 0),
      gasolinaAditivada:Number(precos.gasolinaAditivada|| 0),
      etanol:           Number(precos.etanol           || 0),
      diesel:           Number(precos.diesel           || 0),
      dieselS10:        Number(precos.dieselS10        || 0),
      gnv:              Number(precos.gnv              || 0),
    },
    // Métricas
    totalCliques:     data.totalCliques     || 0,
    totalCupons:      data.totalCupons      || 0,
    totalImpressoes:  data.totalImpressoes  || 0,
  }
}

// ─── PUT /api/admin/parceiros/:id — editar dados + preços do posto ─────────────
app.put('/api/admin/parceiros/:id', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)
  const kv = getKV(c.env as any)
  const r2 = (c.env as Record<string,unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
  const id = c.req.param('id')
  const body = await c.req.json() as Record<string,unknown>

  // Carregar dados atuais — se não existir, cria novo (upsert para postos vindos da ANP)
  const atual = await kvGetParceiro(kv, id, r2) as Record<string,unknown> | null
  const base: Record<string,unknown> = atual || {
    id,
    criadoEm: new Date().toISOString(),
    status: 'ativo',
    plano: 'visibilidade',
    precos: {},
    totalCliques: 0,
    totalCupons: 0,
    totalImpressoes: 0,
  }

  // Campos editáveis pelo admin
  const campos = [
    'nomePosto','email','tel','telTelemarketing',
    'cidade','estado','bairro','cnpj','bandeira',
    'plano','status','seloVerificado','pinDourado',
    'notificacoesAtivas','cuponsAtivos','topoLista'
  ]
  const atualizado: Record<string,unknown> = { ...base }
  for (const campo of campos) {
    if (campo in body) atualizado[campo] = body[campo]
  }

  // Preços combustível (objeto aninhado)
  if (body.precos && typeof body.precos === 'object') {
    const precosAntigos = (atual.precos as Record<string,unknown>) || {}
    const precosNovos   = body.precos as Record<string,unknown>
    atualizado.precos = {
      gasolina:          Number(precosNovos.gasolina          ?? precosAntigos.gasolina          ?? 0),
      gasolinaAditivada: Number(precosNovos.gasolinaAditivada ?? precosAntigos.gasolinaAditivada ?? 0),
      etanol:            Number(precosNovos.etanol            ?? precosAntigos.etanol            ?? 0),
      diesel:            Number(precosNovos.diesel            ?? precosAntigos.diesel            ?? 0),
      dieselS10:         Number(precosNovos.dieselS10         ?? precosAntigos.dieselS10         ?? 0),
      gnv:               Number(precosNovos.gnv               ?? precosAntigos.gnv               ?? 0),
    }
    atualizado.precosAtualizadoEm = new Date().toISOString()
  }

  atualizado.atualizadoEm = new Date().toISOString()

  await kvSetParceiro(kv, id, atualizado, undefined, r2)
  return c.json({ ok: true, parceiro: normalizarParceiro(atualizado, id, null) })
})

// ─── POST /api/admin/parceiros/:id/convite — gera token de convite para o posto ─
app.post('/api/admin/parceiros/:id/convite', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)

  const kv = getKV(c.env as any)
  const r2 = (c.env as Record<string,unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
  const id  = c.req.param('id')

  const parceiro = await kvGetParceiro(kv, id, r2) as Record<string,unknown> | null
  if (!parceiro) return c.json({ erro: 'Posto não encontrado' }, 404)

  // Gerar token único: 32 chars hex
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2,'0')).join('')

  const convite = {
    token,
    parceiroId: id,
    nomePosto:  parceiro.nomePosto || 'Posto Parceiro',
    cidade:     parceiro.cidade || '',
    estado:     parceiro.estado || '',
    criadoEm:  new Date().toISOString(),
    expiraEm:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
    usado:     false,
  }

  // Salvar convite no KV com TTL de 30 dias
  if (kv) await kv.put(`convite:${token}`, JSON.stringify(convite), { expirationTtl: 30 * 24 * 3600 })

  // Atualizar parceiro com token de convite
  const atualizado = { ...parceiro, conviteToken: token, conviteCriadoEm: convite.criadoEm }
  await kvSetParceiro(kv, id, atualizado, undefined, r2)

  const baseUrl = new URL(c.req.url).origin
  return c.json({ ok: true, token, link: `${baseUrl}/convite/${token}` })
})

// ─── GET /convite/:token — página de boas-vindas do posto parceiro ─────────────
app.get('/convite/:token', async (c) => {
  const kv = getKV(c.env as any)
  const token = c.req.param('token')

  let convite: Record<string,unknown> | null = null
  try {
    const raw = kv ? await kv.get(`convite:${token}`) : null
    if (raw) convite = JSON.parse(raw)
  } catch {}

  const nomePosto = convite ? String(convite.nomePosto || 'Posto Parceiro') : 'Posto Parceiro'
  const cidade    = convite ? String(convite.cidade || '') : ''
  const estado    = convite ? String(convite.estado || '') : ''
  const valido    = !!convite
  const localizacao = [cidade, estado].filter(Boolean).join(', ')

  const playUrl  = 'https://play.google.com/store/apps/details?id=br.com.rotaposto'
  const appleUrl = 'https://apps.apple.com/br/app/rotaposto/id0000000000'
  const baseUrl  = new URL(c.req.url).origin
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(c.req.url)}&bgcolor=0D1B2A&color=FF6D00&qzone=2`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RotaPosto — Convite para ${nomePosto}</title>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Raleway',sans-serif;background:#0D1B2A;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:40px 36px;max-width:480px;width:100%;text-align:center;box-shadow:0 8px 48px rgba(0,0,0,0.5)}
    .logo{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:32px}
    .logo-icon{width:44px;height:44px;background:#FF6D00;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px}
    .logo-text{font-size:22px;font-weight:900;color:#FF6D00}
    .badge-convite{display:inline-flex;align-items:center;gap:6px;background:rgba(0,200,83,0.12);border:1px solid rgba(0,200,83,0.3);color:#00C853;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:20px}
    h1{font-size:24px;font-weight:900;margin-bottom:6px;line-height:1.2}
    .subtitle{font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:28px}
    .posto-box{background:rgba(255,109,0,0.08);border:1.5px solid rgba(255,109,0,0.25);border-radius:14px;padding:18px 20px;margin-bottom:28px;text-align:left}
    .posto-nome{font-size:18px;font-weight:900;color:#FF6D00;margin-bottom:4px}
    .posto-loc{font-size:12px;color:rgba(255,255,255,0.45);display:flex;align-items:center;gap:6px}
    .steps{text-align:left;margin-bottom:28px}
    .step{display:flex;align-items:flex-start;gap:14px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
    .step:last-child{border-bottom:none}
    .step-num{width:28px;height:28px;min-width:28px;background:#FF6D00;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;margin-top:1px}
    .step-text{font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5}
    .step-text strong{color:#fff}
    .btns{display:flex;flex-direction:column;gap:12px;margin-bottom:24px}
    .btn-play{background:#00C853;color:#000;border:none;padding:14px 24px;border-radius:14px;font-family:'Raleway',sans-serif;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;transition:.2s}
    .btn-play:hover{background:#00E676;transform:translateY(-1px)}
    .btn-apple{background:#fff;color:#000;border:none;padding:14px 24px;border-radius:14px;font-family:'Raleway',sans-serif;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;transition:.2s}
    .btn-apple:hover{background:#f0f0f0;transform:translateY(-1px)}
    .qr-section{border-top:1px solid rgba(255,255,255,0.06);padding-top:22px}
    .qr-label{font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px}
    .qr-img{border-radius:12px;border:3px solid rgba(255,109,0,0.3);background:#0D1B2A}
    .invalid-box{background:rgba(255,82,82,0.1);border:1.5px solid rgba(255,82,82,0.3);border-radius:14px;padding:24px;color:#FF5252;font-size:14px;margin-top:16px}
    @media(max-width:400px){.card{padding:28px 20px}.btns{gap:10px}}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">⛽</div>
      <div class="logo-text">RotaPosto</div>
    </div>

    ${valido ? `
    <div class="badge-convite"><i class="fas fa-star"></i> Convite Parceiro</div>
    <h1>Olá, ${nomePosto}!</h1>
    <p class="subtitle">Seu posto foi cadastrado no RotaPosto.<br/>Baixe o app e comece a receber clientes agora!</p>

    <div class="posto-box">
      <div class="posto-nome"><i class="fas fa-gas-pump" style="margin-right:8px;font-size:14px"></i>${nomePosto}</div>
      ${localizacao ? `<div class="posto-loc"><i class="fas fa-map-marker-alt" style="color:#FF6D00"></i>${localizacao}</div>` : ''}
    </div>

    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text"><strong>Baixe o app RotaPosto</strong><br/>Disponível para Android e iPhone gratuitamente.</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text"><strong>Faça login com o e-mail cadastrado</strong><br/>Use o e-mail que você informou ao se cadastrar.</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text"><strong>Acesse o Painel do Posto</strong><br/>Veja seus cliques, atualize preços e gerencie cupons.</div>
      </div>
    </div>

    <div class="btns">
      <a href="${playUrl}" class="btn-play" target="_blank">
        <i class="fab fa-google-play" style="font-size:20px"></i>
        <div style="text-align:left"><div style="font-size:10px;font-weight:600;opacity:.8">Disponível no</div><div>Google Play</div></div>
      </a>
      <a href="${appleUrl}" class="btn-apple" target="_blank">
        <i class="fab fa-apple" style="font-size:22px"></i>
        <div style="text-align:left"><div style="font-size:10px;font-weight:600;opacity:.6">Baixar na</div><div>App Store</div></div>
      </a>
    </div>

    <div class="qr-section">
      <div class="qr-label"><i class="fas fa-qrcode"></i> Ou aponte a câmera para o QR Code</div>
      <img class="qr-img" src="${qrApiUrl}" alt="QR Code" width="160" height="160"/>
      <div style="font-size:10px;color:rgba(255,255,255,0.2);margin-top:10px">Este link expira em 30 dias</div>
    </div>
    ` : `
    <div class="invalid-box">
      <i class="fas fa-exclamation-circle" style="font-size:32px;display:block;margin-bottom:12px"></i>
      <strong>Link inválido ou expirado</strong><br/>
      <span style="font-size:12px;opacity:.7;margin-top:6px;display:block">Solicite um novo convite ao administrador do RotaPosto.</span>
    </div>
    `}

    <div style="margin-top:20px;font-size:10px;color:rgba(255,255,255,0.2)">
      RotaPosto &copy; ${new Date().getFullYear()} — Sua plataforma de postos parceiros
    </div>
  </div>
</body>
</html>`

  return c.html(html)
})

// ─── GET /api/admin/anp-busca — busca postos na API ANP + preços por CNPJ ────
// Usa a mesma função buscarPostosANP() do app (paginação automática + lookup CNPJ)
app.get('/api/admin/anp-busca', async (c) => {
  const key = c.req.query('key') || c.req.header('X-Admin-Key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'
  if (key !== ADMIN_PASS) return c.json({ erro: 'Não autorizado' }, 401)

  const uf        = (c.req.query('uf') || '').toUpperCase().trim()
  // Normalizar município: maiúsculas + sem acento (ANP exige esse formato)
  const municipioRaw = (c.req.query('municipio') || '').trim()
  const municipio = municipioRaw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()

  if (!uf || !municipio) return c.json({ erro: 'UF e municipio obrigatorios' }, 400)

  const kv = getKV(c.env as any)
  const { ANP_SEMANA_POSTOS: _semana } = await import('./precos_anp_posto')

  try {
    // Usa a mesma função do app — já faz paginação automática (até pág 3)
    // e já faz lookup de preços por CNPJ via bundle PRECOS_POR_CNPJ
    const postosReais = await buscarPostosANP(uf, municipio, 1, kv ?? undefined)

    const postos = postosReais.map(p => {
      const cnpjNorm = (p.cnpj || '').replace(/\D/g, '').padStart(14, '0')
      // Formatar CNPJ para exibição: XX.XXX.XXX/XXXX-XX
      const cnpjFmt = cnpjNorm.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
      return {
        cnpj: cnpjNorm,
        cnpjFmt,
        nome: p.nome,
        bandeira: p.bandeira,
        endereco: p.endereco,
        bairro: p.bairro || '',
        municipio: p.cidade,
        uf: p.estado,
        lat: p.lat,
        lng: p.lng,
        produtos: p.produtos || [],
        precos: {
          gasolina:          p.precos?.gasolina          || 0,
          gasolinaAditivada: p.precos?.gasolinaAditivada || 0,
          etanol:            p.precos?.etanol            || 0,
          diesel:            p.precos?.diesel            || 0,
          dieselS10:         p.precos?.dieselS10         || 0,
          gnv:               p.precos?.gnv               || 0,
        },
        temPreco: !!(p.precos?.gasolina || p.precos?.etanol || p.precos?.diesel),
      }
    })

    return c.json({
      postos,
      total: postos.length,
      semana: _semana,
      municipio: municipioRaw,
      uf
    })
  } catch(e: any) {
    return c.json({ erro: 'Erro ao consultar ANP: ' + e.message, postos: [] }, 500)
  }
})

app.get('/admin', (c) => {
  const key = c.req.query('key') || ''
  const ADMIN_PASS = (c.env as Record<string,unknown>)?.ADMIN_PASS as string || 'rotaposto@admin2026'

  // ── Tela de Login ─────────────────────────────────────────────────────────
  if (key !== ADMIN_PASS) {
    const loginHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RotaPosto Admin — Login</title>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Raleway',sans-serif;background:#0D1B2A;color:#E0E7EF;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .login-card{background:#112035;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:48px 40px;width:100%;max-width:400px;text-align:center}
    .logo{font-size:28px;font-weight:900;color:#fff;margin-bottom:4px}.logo span{color:#FF6D00}
    .logo-sub{font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:32px}
    h2{font-size:18px;font-weight:800;color:#fff;margin-bottom:6px}
    p{font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:28px}
    .input-wrap{position:relative;margin-bottom:16px}
    .input-wrap i{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.3);font-size:14px}
    input[type=password]{width:100%;background:#0A1520;border:1.5px solid rgba(255,255,255,0.12);border-radius:10px;padding:13px 14px 13px 40px;color:#fff;font-size:14px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;transition:border-color 0.2s}
    input[type=password]:focus{border-color:#FF6D00}
    input[type=password]::placeholder{color:rgba(255,255,255,0.25)}
    .btn-login{width:100%;background:linear-gradient(135deg,#FF6D00,#e65100);color:#fff;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:800;font-family:'Raleway',sans-serif;cursor:pointer;transition:opacity 0.2s;margin-top:4px}
    .btn-login:hover{opacity:0.9}
    .error-msg{background:rgba(255,82,82,0.12);border:1px solid rgba(255,82,82,0.25);border-radius:8px;padding:10px 14px;font-size:12px;color:#FF5252;font-weight:700;margin-bottom:16px;display:none}
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo">Rota<span>Posto</span></div>
    <div class="logo-sub">PAINEL ADMINISTRATIVO</div>
    <h2>Acesso Restrito</h2>
    <p>Digite a senha para acessar o painel admin</p>
    <div class="error-msg" id="error-msg"><i class="fas fa-exclamation-triangle"></i> Senha incorreta. Tente novamente.</div>
    <form onsubmit="doLogin(event)">
      <div class="input-wrap">
        <i class="fas fa-lock"></i>
        <input type="password" id="senha-input" placeholder="Senha do admin" autocomplete="current-password" autofocus/>
      </div>
      <button type="submit" class="btn-login"><i class="fas fa-sign-in-alt"></i> &nbsp;Entrar</button>
    </form>
  </div>
  <script>
    // Se já há um hash/key salvo, tenta logar
    const saved = sessionStorage.getItem('admin_key');
    if (saved) window.location.href = '/admin?key=' + encodeURIComponent(saved);

    function doLogin(e) {
      e.preventDefault();
      const senha = document.getElementById('senha-input').value.trim();
      if (!senha) return;
      // Testa a senha fazendo um fetch para a API de usuários
      fetch('/api/admin/usuarios?key=' + encodeURIComponent(senha))
        .then(r => {
          if (r.ok) {
            sessionStorage.setItem('admin_key', senha);
            window.location.href = '/admin?key=' + encodeURIComponent(senha);
          } else {
            document.getElementById('error-msg').style.display = 'block';
            document.getElementById('senha-input').value = '';
            document.getElementById('senha-input').focus();
          }
        })
        .catch(() => {
          document.getElementById('error-msg').style.display = 'block';
        });
    }
  </script>
</body>
</html>`
    return c.html(loginHtml)
  }

  const adminKey = encodeURIComponent(key)
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RotaPosto Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Raleway',sans-serif;background:#0D1B2A;color:#E0E7EF;min-height:100vh}
    .sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;background:#0A1520;border-right:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;z-index:100;overflow:hidden}
    .sidebar-logo{padding:18px 16px 14px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0}
    .sidebar-logo h1{font-size:20px;font-weight:900;color:#fff}.sidebar-logo h1 span{color:#FF6D00}
    .sidebar-logo p{font-size:10px;color:rgba(255,255,255,0.4);font-weight:600;margin-top:2px}
    .sidebar-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:4px 0}
    .sidebar-nav::-webkit-scrollbar{width:3px}.sidebar-nav::-webkit-scrollbar-track{background:transparent}.sidebar-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
    .nav-section{padding:10px 16px 3px;font-size:9px;font-weight:800;color:rgba(255,255,255,0.2);text-transform:uppercase;letter-spacing:1px;white-space:nowrap}
    .nav-item{display:flex;align-items:center;gap:9px;padding:9px 16px;color:rgba(255,255,255,0.5);font-size:12.5px;font-weight:700;cursor:pointer;transition:all 0.2s;border-left:3px solid transparent;white-space:nowrap;overflow:hidden}
    .nav-item:hover{color:#fff;background:rgba(255,255,255,0.06)}
    .nav-item.active{color:#FF6D00;background:rgba(255,109,0,0.10);border-left-color:#FF6D00}
    .nav-item i{width:16px;text-align:center;font-size:13px;flex-shrink:0}
    .nav-item-sair{display:flex;align-items:center;gap:9px;padding:9px 16px;color:rgba(255,82,82,0.7);font-size:12.5px;font-weight:700;cursor:pointer;transition:all 0.2s;border-left:3px solid transparent;white-space:nowrap}
    .nav-item-sair:hover{color:#FF5252;background:rgba(255,82,82,0.08);border-left-color:#FF5252}
    .nav-item-sair i{width:16px;text-align:center;font-size:13px;flex-shrink:0}
    .sidebar-footer{border-top:1px solid rgba(255,255,255,0.08);flex-shrink:0;padding-top:4px}
    .main{margin-left:220px;padding:28px 32px;min-height:100vh}
    .page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}
    .page-header h2{font-size:22px;font-weight:900;color:#fff}
    .page-header .badge-live{background:rgba(0,200,83,0.15);color:#00C853;padding:5px 12px;border-radius:100px;font-size:11px;font-weight:800;display:flex;align-items:center;gap:5px}
    .badge-live::before{content:'';width:7px;height:7px;background:#00C853;border-radius:50%;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
    .kpi-card{background:#112035;border-radius:16px;padding:20px;border:1px solid rgba(255,255,255,0.07)}
    .kpi-card .kpi-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:12px}
    .kpi-card .kpi-val{font-size:28px;font-weight:900;color:#fff;line-height:1}
    .kpi-card .kpi-label{font-size:12px;color:rgba(255,255,255,0.45);font-weight:600;margin-top:4px}
    .kpi-card .kpi-delta{font-size:11px;font-weight:700;margin-top:8px}
    .kpi-delta.up{color:#00C853}.kpi-delta.down{color:#FF6D00}
    .section-card{background:#112035;border-radius:16px;border:1px solid rgba(255,255,255,0.07);margin-bottom:20px}
    .section-header{padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
    .section-header h3{font-size:14px;font-weight:800;color:#fff}
    .section-body{padding:22px}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;font-size:10px;font-weight:800;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.8px;padding:0 8px 12px;border-bottom:1px solid rgba(255,255,255,0.07)}
    th:first-child{padding-left:0}
    td{padding:11px 8px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;color:rgba(255,255,255,0.85);font-weight:600;vertical-align:middle}
    td:first-child{padding-left:0}
    tr:last-child td{border-bottom:none}
    .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:800}
    .badge-anp{background:rgba(21,101,192,0.2);color:#42A5F5}
    .badge-osm{background:rgba(255,109,0,0.15);color:#FF8F00}
    .badge-collab{background:rgba(0,200,83,0.15);color:#00C853}
    .badge-premium{background:rgba(255,214,0,0.18);color:#FFD600}
    .badge-free{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4)}
    .badge-active{background:rgba(0,200,83,0.15);color:#00C853}
    .badge-cancelled{background:rgba(255,82,82,0.15);color:#FF5252}
    .badge-expired{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.35)}
    .tabs{display:flex;gap:4px;background:rgba(255,255,255,0.05);border-radius:10px;padding:4px}
    .tab{padding:7px 16px;border-radius:8px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);cursor:pointer;transition:all 0.2s}
    .tab.active{background:#FF6D00;color:#fff}
    .chart-wrap{height:220px;position:relative}
    .stat-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
    .stat-row:last-child{border-bottom:none}
    .stat-row .lbl{font-size:12px;color:rgba(255,255,255,0.5);font-weight:600}
    .stat-row .val{font-size:14px;font-weight:800;color:#fff}
    .btn-refresh{padding:8px 16px;background:rgba(255,109,0,0.15);color:#FF6D00;border:1px solid rgba(255,109,0,0.3);border-radius:8px;font-family:'Raleway',sans-serif;font-size:12px;font-weight:800;cursor:pointer;transition:all 0.2s}
    .btn-refresh:hover{background:rgba(255,109,0,0.25)}
    .btn-danger{padding:6px 12px;background:rgba(255,82,82,0.12);color:#FF5252;border:1px solid rgba(255,82,82,0.25);border-radius:7px;font-family:'Raleway',sans-serif;font-size:11px;font-weight:800;cursor:pointer;transition:all 0.2s;white-space:nowrap}
    .btn-danger:hover{background:rgba(255,82,82,0.22)}
    .btn-success{padding:6px 12px;background:rgba(0,200,83,0.12);color:#00C853;border:1px solid rgba(0,200,83,0.25);border-radius:7px;font-family:'Raleway',sans-serif;font-size:11px;font-weight:800;cursor:pointer;transition:all 0.2s;white-space:nowrap}
    .btn-success:hover{background:rgba(0,200,83,0.22)}
    .btn-info{padding:6px 12px;background:rgba(66,165,245,0.12);color:#42A5F5;border:1px solid rgba(66,165,245,0.25);border-radius:7px;font-family:'Raleway',sans-serif;font-size:11px;font-weight:800;cursor:pointer;transition:all 0.2s;white-space:nowrap}
    .btn-info:hover{background:rgba(66,165,245,0.22)}
    .fonte-bar{display:flex;height:8px;border-radius:100px;overflow:hidden;margin-top:8px;gap:2px}
    .fonte-bar-anp{background:#1565C0;flex:0 0 var(--pct)}
    .fonte-bar-osm{background:#FF6D00;flex:0 0 var(--pct)}
    .fonte-bar-collab{background:#00C853;flex:0 0 var(--pct)}
    #precos-lista{max-height:320px;overflow-y:auto}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}
    .modal-box{background:#112035;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:28px;width:100%;max-width:400px}
    .modal-box h4{font-size:16px;font-weight:800;color:#fff;margin-bottom:8px}
    .modal-box p{font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:20px}
    .modal-box input{width:100%;background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px;color:#fff;font-size:14px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;margin-bottom:12px}
    .modal-box input:focus{border-color:#FF6D00}
    .modal-actions{display:flex;gap:8px;justify-content:flex-end}
    .toast{position:fixed;bottom:24px;right:24px;background:#1A2E44;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 18px;font-size:13px;font-weight:700;color:#fff;z-index:99999;transform:translateY(80px);opacity:0;transition:all 0.3s;pointer-events:none}
    .toast.show{transform:translateY(0);opacity:1}
    .tr-hover:hover{background:rgba(255,255,255,0.03)}
    .cidade-opt{padding:10px 16px;font-size:13px;font-weight:700;color:rgba(255,255,255,0.75);font-family:'Raleway',sans-serif;cursor:pointer;transition:background 0.15s;border-bottom:1px solid rgba(255,255,255,0.05)}
    .cidade-opt:last-child{border-bottom:none}
    .cidade-opt:hover{background:rgba(255,109,0,0.15);color:#FF6D00}
    .cidade-opt.selected{color:#FF6D00;background:rgba(255,109,0,0.08)}
    /* Dados Usuários */
    .provider-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:800}
    .provider-google{background:rgba(66,133,244,0.2);color:#4285F4}
    .provider-facebook{background:rgba(24,119,242,0.2);color:#1877F2}
    .provider-email{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.5)}
    .provider-unknown{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.3)}
    .modal-edit{background:#112035;border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:32px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto}
    .modal-edit h4{font-size:18px;font-weight:900;color:#fff;margin-bottom:4px}
    .modal-edit .sub{font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:24px}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
    .form-group{display:flex;flex-direction:column;gap:5px}
    .form-group label{font-size:10px;font-weight:800;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px}
    .form-group input{background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;color:#fff;font-size:13px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;transition:border-color 0.2s}
    .form-group input:focus{border-color:#FF6D00}
    .form-group input::placeholder{color:rgba(255,255,255,0.2)}
    .form-group input.edited{border-color:rgba(255,109,0,0.5);background:rgba(255,109,0,0.05)}
    .uid-display{background:#0A1520;border:1px dashed rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;font-size:10px;color:rgba(255,255,255,0.3);font-family:monospace;word-break:break-all;margin-bottom:16px}
    .du-search-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  </style>
</head>
<body>
<!-- SIDEBAR -->
<div class="sidebar">
  <div class="sidebar-logo">
    <h1>Rota<span>Posto</span></h1>
    <p>Painel Administrativo</p>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-section">Visão Geral</div>
    <div class="nav-item active" id="nav-dashboard" onclick="showSection('dashboard',this)"><i class="fas fa-tachometer-alt"></i>Dashboard</div>
    <div class="nav-section">App & Usuários</div>
    <div class="nav-item" id="nav-app-usuarios" onclick="showSection('app-usuarios',this)"><i class="fas fa-mobile-alt"></i>Usuários do App</div>
    <div class="nav-item" id="nav-dados-usuarios" onclick="showSection('dados-usuarios',this)"><i class="fas fa-id-card"></i>Dados & Contatos</div>
    <div class="nav-item" id="nav-assinaturas" onclick="showSection('assinaturas',this)"><i class="fas fa-crown"></i>Assinaturas</div>
    <div class="nav-section">Planos & Produtos</div>
    <div class="nav-item" id="nav-planos-app" onclick="showSection('planos-app',this)"><i class="fas fa-mobile-alt"></i>Planos do App</div>
    <div class="nav-item" id="nav-planos" onclick="showSection('planos',this)"><i class="fas fa-box-open"></i>Planos dos Postos</div>
    <div class="nav-item" id="nav-menu-app" onclick="showSection('menu-app',this)"><i class="fas fa-sliders-h"></i>Menu do App</div>
    <div class="nav-section">Postos & Dados</div>
    <div class="nav-item" id="nav-postos-parceiros" onclick="showSection('postos-parceiros',this)"><i class="fas fa-star"></i>Postos Parceiros</div>
    <div class="nav-item" id="nav-postos" onclick="showSection('postos',this)"><i class="fas fa-gas-pump"></i>Postos (Mapa)</div>
    <div class="nav-item" id="nav-precos" onclick="showSection('precos',this)"><i class="fas fa-tag"></i>Preços Reportados</div>
    <div class="nav-item" id="nav-mapa" onclick="showSection('mapa',this)"><i class="fas fa-map"></i>Mapa ao Vivo</div>
  </nav>
  <div class="sidebar-footer">
    <div class="nav-item-sair" onclick="sairAdmin()"><i class="fas fa-sign-out-alt"></i>Sair</div>
    <div style="padding:8px 16px 12px">
      <div style="font-size:10px;color:rgba(255,255,255,0.2);font-weight:600">RotaPosto v2.0</div>
      <div style="font-size:9px;color:rgba(255,255,255,0.12);margin-top:2px" id="last-update">Atualizando...</div>
    </div>
  </div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<!-- MODAL ATIVAR PREMIUM -->
<div class="modal-overlay" id="modal-ativar" style="display:none">
  <div class="modal-box">
    <h4>⭐ Ativar Premium</h4>
    <p id="modal-ativar-desc">Ativar assinatura premium manualmente para o usuário.</p>
    <input type="number" id="modal-ativar-dias" value="30" min="1" max="365" placeholder="Dias de premium"/>
    <select id="modal-ativar-plano" style="width:100%;background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px;color:#fff;font-size:14px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;margin-bottom:12px;cursor:pointer">
      <option value="mensal">Mensal</option>
      <option value="anual">Anual</option>
      <option value="manual">Manual (Admin)</option>
    </select>
    <div class="modal-actions">
      <button class="btn-danger" onclick="fecharModalAtivar()">Cancelar</button>
      <button class="btn-success" onclick="confirmarAtivarPremium()"><i class="fas fa-check"></i> Ativar</button>
    </div>
  </div>
</div>

<!-- MODAL DETALHES USUÁRIO -->
<div class="modal-overlay" id="modal-detalhe" style="display:none">
  <div class="modal-box" style="max-width:500px">
    <h4>👤 Detalhes do Usuário</h4>
    <div id="modal-detalhe-body" style="margin-bottom:20px"></div>
    <div class="modal-actions">
      <button class="btn-info" onclick="fecharModalDetalhe()">Fechar</button>
    </div>
  </div>
</div>

<!-- MODAL EDITAR DADOS DO USUÁRIO -->
<div class="modal-overlay" id="modal-editar-usuario" style="display:none">
  <div class="modal-edit">
    <h4>✏️ Editar Dados do Usuário</h4>
    <p class="sub" id="modal-edit-uid-label">UID: —</p>
    <div class="uid-display" id="modal-edit-uid-box">—</div>
    <div class="form-row">
      <div class="form-group">
        <label>Nome Completo</label>
        <input type="text" id="edit-name" placeholder="Nome do usuário" oninput="this.classList.add('edited')"/>
      </div>
      <div class="form-group">
        <label>E-mail</label>
        <input type="email" id="edit-email" placeholder="email@exemplo.com" oninput="this.classList.add('edited')"/>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Telefone</label>
        <input type="tel" id="edit-telefone" placeholder="(11) 99999-9999" oninput="this.classList.add('edited')"/>
      </div>
      <div class="form-group">
        <label>CEP</label>
        <input type="text" id="edit-cep" placeholder="00000-000" maxlength="8" oninput="epMaskCep(this);this.classList.add('edited')" onblur="epBlurCep(this)"/>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Cidade</label>
        <input type="text" id="edit-cidade" placeholder="Cidade" oninput="this.classList.add('edited')"/>
      </div>
      <div class="form-group">
        <label>Estado (UF)</label>
        <input type="text" id="edit-estado" placeholder="SP" maxlength="2" oninput="this.classList.add('edited')"/>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
      <button class="btn-danger" onclick="fecharModalEditarUsuario()">Cancelar</button>
      <button class="btn-success" id="btn-salvar-usuario" onclick="salvarEdicaoUsuario()"><i class="fas fa-save"></i> Salvar Dados</button>
    </div>
  </div>
</div>

<main class="main">
  <!-- ══ DASHBOARD ══ -->
  <section id="section-dashboard">
    <div class="page-header">
      <h2>📊 Dashboard</h2>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="position:relative" id="cidade-dropdown-wrap">
          <div id="cidade-btn" onclick="toggleCidadeDropdown()" style="display:flex;align-items:center;gap:8px;background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:6px 14px;cursor:pointer;user-select:none;min-width:160px">
            <i class="fas fa-map-marker-alt" style="color:#FF6D00;font-size:12px"></i>
            <span id="cidade-label" style="color:#fff;font-size:12px;font-weight:700;font-family:'Raleway',sans-serif;flex:1">São Paulo, SP</span>
            <i class="fas fa-chevron-down" id="cidade-chevron" style="color:rgba(255,255,255,0.4);font-size:10px;transition:transform 0.2s"></i>
          </div>
          <div id="cidade-menu" style="display:none;position:absolute;top:calc(100% + 6px);right:0;background:#0D2035;border:1px solid rgba(255,255,255,0.12);border-radius:10px;overflow:hidden;z-index:9999;min-width:200px;box-shadow:0 8px 24px rgba(0,0,0,0.5)">
            <div class="cidade-opt" data-val="-23.5505,-46.6333,São Paulo,SP" onclick="selecionarCidade(this)">São Paulo, SP</div>
            <div class="cidade-opt" data-val="-22.9068,-43.1729,Rio de Janeiro,RJ" onclick="selecionarCidade(this)">Rio de Janeiro, RJ</div>
            <div class="cidade-opt" data-val="-19.9167,-43.9345,Belo Horizonte,MG" onclick="selecionarCidade(this)">Belo Horizonte, MG</div>
            <div class="cidade-opt" data-val="-12.9714,-38.5014,Salvador,BA" onclick="selecionarCidade(this)">Salvador, BA</div>
            <div class="cidade-opt" data-val="-15.7801,-47.9292,Brasília,DF" onclick="selecionarCidade(this)">Brasília, DF</div>
            <div class="cidade-opt" data-val="-3.7172,-38.5433,Fortaleza,CE" onclick="selecionarCidade(this)">Fortaleza, CE</div>
            <div class="cidade-opt" data-val="-8.0476,-34.8770,Recife,PE" onclick="selecionarCidade(this)">Recife, PE</div>
            <div class="cidade-opt" data-val="-30.0346,-51.2177,Porto Alegre,RS" onclick="selecionarCidade(this)">Porto Alegre, RS</div>
            <div class="cidade-opt" data-val="-25.4284,-49.2733,Curitiba,PR" onclick="selecionarCidade(this)">Curitiba, PR</div>
            <div class="cidade-opt" data-val="-1.4558,-48.5039,Belém,PA" onclick="selecionarCidade(this)">Belém, PA</div>
          </div>
        </div>
        <div class="badge-live">Sistema ao vivo</div>
      </div>
    </div>

    <div class="kpi-grid" id="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(21,101,192,0.2);color:#42A5F5"><i class="fas fa-gas-pump"></i></div>
        <div class="kpi-val" id="kpi-postos">–</div>
        <div class="kpi-label">Postos Encontrados</div>
        <div class="kpi-delta up" id="kpi-postos-fonte">↑ ANP + OSM</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(0,200,83,0.15);color:#00C853"><i class="fas fa-tag"></i></div>
        <div class="kpi-val" id="kpi-preco-medio">–</div>
        <div class="kpi-label">Preço Médio Gasolina</div>
        <div class="kpi-delta" id="kpi-preco-label">São Paulo, SP</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.2);margin-top:2px" id="kpi-preco-raio">raio 15 km</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(255,109,0,0.15);color:#FF6D00"><i class="fas fa-comments"></i></div>
        <div class="kpi-val" id="kpi-reportes">–</div>
        <div class="kpi-label">Preços Colaborativos</div>
        <div class="kpi-delta up" id="kpi-reportes-24h">Últimas 24h</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(255,214,0,0.15);color:#FFD600"><i class="fas fa-crown"></i></div>
        <div class="kpi-val" id="kpi-assinaturas-ativas">–</div>
        <div class="kpi-label">Assinaturas Ativas</div>
        <div class="kpi-delta up" id="kpi-assinaturas-label">Premium do app</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:20px">
      <div class="section-card">
        <div class="section-header">
          <h3><i class="fas fa-chart-line" style="color:#FF6D00;margin-right:8px"></i>Preços por Combustível</h3>
          <div class="tabs">
            <div class="tab active" onclick="toggleChart('gasolina',this)">Gasolina</div>
            <div class="tab" onclick="toggleChart('etanol',this)">Etanol</div>
            <div class="tab" onclick="toggleChart('diesel',this)">Diesel</div>
          </div>
        </div>
        <div class="section-body">
          <div class="chart-wrap"><canvas id="chart-precos"></canvas></div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h3><i class="fas fa-database" style="color:#42A5F5;margin-right:8px"></i>Fontes de Dados</h3>
        </div>
        <div class="section-body">
          <div class="stat-row">
            <span class="lbl"><span class="badge badge-anp">ANP</span> Postos Cadastrados</span>
            <span class="val" id="stat-anp">–</span>
          </div>
          <div class="stat-row">
            <span class="lbl"><span class="badge badge-osm">OSM</span> OpenStreetMap</span>
            <span class="val" id="stat-osm">–</span>
          </div>
          <div class="stat-row">
            <span class="lbl"><span class="badge badge-collab">👥</span> Colaborativos</span>
            <span class="val" id="stat-collab">–</span>
          </div>
          <div class="fonte-bar" id="fonte-bar" style="margin-top:16px">
            <div class="fonte-bar-anp" style="--pct:60%"></div>
            <div class="fonte-bar-osm" style="--pct:35%"></div>
            <div class="fonte-bar-collab" style="--pct:5%"></div>
          </div>
          <div style="display:flex;gap:12px;margin-top:10px">
            <span style="font-size:10px;color:#42A5F5;font-weight:700">■ ANP</span>
            <span style="font-size:10px;color:#FF8F00;font-weight:700">■ OSM</span>
            <span style="font-size:10px;color:#00C853;font-weight:700">■ Colab</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ══ USUÁRIOS DO APP ══ -->
  <section id="section-app-usuarios" style="display:none">
    <div class="page-header">
      <h2>📱 Usuários do App</h2>
      <div style="display:flex;align-items:center;gap:10px">
        <span id="app-usuarios-count" style="background:rgba(66,165,245,0.12);color:#42A5F5;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:800">–</span>
        <button class="btn-refresh" onclick="carregarAppUsuarios()"><i class="fas fa-sync-alt"></i> Atualizar</button>
      </div>
    </div>
    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px">
      <div class="kpi-card" style="padding:20px;display:flex;align-items:center;gap:16px">
        <div style="width:46px;height:46px;border-radius:13px;background:rgba(66,165,245,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">👥</div>
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Total de Usuários</div>
          <div style="font-size:28px;font-weight:900;color:#fff;line-height:1" id="au-total">–</div>
        </div>
      </div>
      <div class="kpi-card" style="padding:20px;display:flex;align-items:center;gap:16px;border:1px solid rgba(255,214,0,0.2)">
        <div style="width:46px;height:46px;border-radius:13px;background:rgba(255,214,0,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">👑</div>
        <div>
          <div style="font-size:10px;color:#FFD600;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Premium</div>
          <div style="font-size:28px;font-weight:900;color:#FFD600;line-height:1" id="au-premium">–</div>
        </div>
      </div>
      <div class="kpi-card" style="padding:20px;display:flex;align-items:center;gap:16px">
        <div style="width:46px;height:46px;border-radius:13px;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🆓</div>
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Gratuito</div>
          <div style="font-size:28px;font-weight:900;color:rgba(255,255,255,0.55);line-height:1" id="au-gratuito">–</div>
        </div>
      </div>
    </div>
    <div class="section-card">
      <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <h3 style="margin:0;font-size:14px;font-weight:800;color:#fff"><i class="fas fa-users" style="color:#42A5F5;margin-right:8px"></i>Lista de Usuários</h3>
          <span id="au-result-count" style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:600"></span>
        </div>
        <!-- Barra de filtros -->
        <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:center">
          <input id="au-search" type="text" placeholder="🔍 Buscar por nome, e-mail, CPF, cidade ou UID..." oninput="filtrarAppUsuarios()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 12px;color:#fff;font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;min-width:0"/>
          <select id="au-filtro-plano" onchange="filtrarAppUsuarios()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:#fff;font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;cursor:pointer;white-space:nowrap">
            <option value="">Todos os planos</option>
            <option value="premium">👑 Premium</option>
            <option value="gratuito">🆓 Gratuito</option>
          </select>
          <select id="au-filtro-provider" onchange="filtrarAppUsuarios()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:#fff;font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;cursor:pointer;white-space:nowrap">
            <option value="">Todos os provedores</option>
            <option value="google.com">Google</option>
            <option value="facebook.com">Facebook</option>
            <option value="email">E-mail</option>
          </select>
          <select id="au-filtro-estado" onchange="filtrarAppUsuarios()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:#fff;font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;cursor:pointer;white-space:nowrap">
            <option value="">Todos os estados</option>
            <option value="AC">AC</option><option value="AL">AL</option><option value="AM">AM</option><option value="AP">AP</option>
            <option value="BA">BA</option><option value="CE">CE</option><option value="DF">DF</option><option value="ES">ES</option>
            <option value="GO">GO</option><option value="MA">MA</option><option value="MG">MG</option><option value="MS">MS</option>
            <option value="MT">MT</option><option value="PA">PA</option><option value="PB">PB</option><option value="PE">PE</option>
            <option value="PI">PI</option><option value="PR">PR</option><option value="RJ">RJ</option><option value="RN">RN</option>
            <option value="RO">RO</option><option value="RR">RR</option><option value="RS">RS</option><option value="SC">SC</option>
            <option value="SE">SE</option><option value="SP">SP</option><option value="TO">TO</option>
          </select>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table style="min-width:900px;width:100%">
          <thead><tr>
            <th style="width:220px">Cliente</th>
            <th style="text-align:center;width:130px">CPF</th>
            <th style="text-align:center;width:120px">Cidade / UF</th>
            <th style="text-align:center;width:90px">Provider</th>
            <th style="text-align:center;width:90px">Plano</th>
            <th style="text-align:center;width:110px">Cadastro</th>
            <th style="text-align:center;width:110px">Ações</th>
          </tr></thead>
          <tbody id="app-usuarios-tbody">
            <tr><td colspan="7" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- ══ DADOS & CONTATOS DOS USUÁRIOS ══ -->
  <section id="section-dados-usuarios" style="display:none">
    <div class="page-header">
      <h2>🪪 Dados & Contatos</h2>
      <div style="display:flex;align-items:center;gap:10px">
        <span id="du-count" style="background:rgba(66,165,245,0.12);color:#42A5F5;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:800">–</span>
        <button class="btn-refresh" onclick="carregarDadosUsuarios()"><i class="fas fa-sync-alt"></i> Atualizar</button>
      </div>
    </div>
    <!-- KPIs rápidos -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div class="kpi-card" style="padding:16px">
        <div style="font-size:10px;color:rgba(255,255,255,0.35);font-weight:700;margin-bottom:6px">TOTAL CADASTROS</div>
        <div style="font-size:26px;font-weight:900;color:#fff" id="du-total">–</div>
      </div>
      <div class="kpi-card" style="padding:16px">
        <div style="font-size:10px;color:#4285F4;font-weight:700;margin-bottom:6px"><i class="fab fa-google"></i> GOOGLE</div>
        <div style="font-size:26px;font-weight:900;color:#4285F4" id="du-google">–</div>
      </div>
      <div class="kpi-card" style="padding:16px">
        <div style="font-size:10px;color:#1877F2;font-weight:700;margin-bottom:6px"><i class="fab fa-facebook"></i> FACEBOOK</div>
        <div style="font-size:26px;font-weight:900;color:#1877F2" id="du-facebook">–</div>
      </div>
      <div class="kpi-card" style="padding:16px">
        <div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;margin-bottom:6px">✉️ E-MAIL/OUTROS</div>
        <div style="font-size:26px;font-weight:900;color:rgba(255,255,255,0.6)" id="du-email">–</div>
      </div>
    </div>
    <!-- Tabela -->
    <div class="section-card">
      <div class="section-header">
        <h3><i class="fas fa-address-book" style="color:#42A5F5;margin-right:8px"></i>Cadastros com Dados Reais</h3>
        <div class="du-search-row">
          <input id="du-search" type="text" placeholder="🔍 Buscar por nome, e-mail ou telefone..." oninput="filtrarDadosUsuarios()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 12px;color:#fff;font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;width:280px"/>
          <select id="du-filtro-provider" onchange="filtrarDadosUsuarios()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 12px;color:#fff;font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;cursor:pointer">
            <option value="">Todos os provedores</option>
            <option value="google.com">Google</option>
            <option value="facebook.com">Facebook</option>
            <option value="email">E-mail</option>
          </select>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table style="min-width:960px">
          <thead><tr>
            <th>Avatar</th>
            <th>Nome Completo</th>
            <th>E-mail</th>
            <th>Telefone</th>
            <th>Login Via</th>
            <th>Cidade / UF</th>
            <th>Plano</th>
            <th>Último Login</th>
            <th>Ações</th>
          </tr></thead>
          <tbody id="dados-usuarios-tbody">
            <tr><td colspan="9" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>
          </tbody>
        </table>
      </div>
      <div id="du-empty" style="display:none;text-align:center;padding:48px 24px">
        <div style="font-size:48px;margin-bottom:12px">📭</div>
        <div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:6px">Nenhum dado encontrado</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.35);max-width:360px;margin:0 auto">Os dados aparecem aqui quando os usuários fazem login ou preenchem o perfil no app.</div>
      </div>
    </div>
  </section>

  <!-- ══ ASSINATURAS ══ -->
  <section id="section-assinaturas" style="display:none">
    <div class="page-header">
      <h2>👑 Assinaturas Premium</h2>
      <button class="btn-refresh" onclick="carregarAssinaturas()"><i class="fas fa-sync-alt"></i> Atualizar</button>
    </div>
    <!-- Stats de assinaturas -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div class="kpi-card" style="padding:20px;display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0">📋</div>
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.35);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Total</div>
          <div style="font-size:28px;font-weight:900;color:#fff;line-height:1" id="as-total">–</div>
        </div>
      </div>
      <div class="kpi-card" style="padding:20px;display:flex;align-items:center;gap:14px;border:1px solid rgba(0,200,83,0.2)">
        <div style="width:44px;height:44px;border-radius:12px;background:rgba(0,200,83,0.15);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0">✅</div>
        <div>
          <div style="font-size:10px;color:#00C853;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Ativas</div>
          <div style="font-size:28px;font-weight:900;color:#00C853;line-height:1" id="as-ativas">–</div>
        </div>
      </div>
      <div class="kpi-card" style="padding:20px;display:flex;align-items:center;gap:14px;border:1px solid rgba(255,82,82,0.2)">
        <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,82,82,0.15);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0">❌</div>
        <div>
          <div style="font-size:10px;color:#FF5252;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Canceladas</div>
          <div style="font-size:28px;font-weight:900;color:#FF5252;line-height:1" id="as-canceladas">–</div>
        </div>
      </div>
      <div class="kpi-card" style="padding:20px;display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0">⏰</div>
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.35);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Expiradas</div>
          <div style="font-size:28px;font-weight:900;color:rgba(255,255,255,0.4);line-height:1" id="as-expiradas">–</div>
        </div>
      </div>
    </div>
    <div class="section-card">
      <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <h3 style="margin:0;font-size:14px;font-weight:800;color:#fff"><i class="fas fa-list" style="color:#FFD600;margin-right:8px"></i>Todas as Assinaturas</h3>
          <span id="as-result-count" style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:600"></span>
        </div>
        <!-- Barra de filtros assinaturas -->
        <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center">
          <input id="as-search" type="text" placeholder="🔍 Buscar por nome, e-mail ou CPF..." oninput="filtrarAssinaturas()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 12px;color:#fff;font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;min-width:0"/>
          <select id="as-filtro-plano" onchange="filtrarAssinaturas()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:#fff;font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;cursor:pointer;white-space:nowrap">
            <option value="">Todos os planos</option>
            <option value="premium">premium</option>
            <option value="anual">anual</option>
          </select>
          <select id="as-filtro" onchange="filtrarAssinaturas()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:#fff;font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;cursor:pointer;white-space:nowrap">
            <option value="">Todos os status</option>
            <option value="ACTIVE">✅ Ativas</option>
            <option value="CANCELLED">❌ Canceladas</option>
            <option value="EXPIRED">⏰ Expiradas</option>
          </select>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table style="min-width:860px;width:100%">
          <thead><tr>
            <th style="width:230px">Cliente</th>
            <th style="text-align:center;width:100px">CPF</th>
            <th style="text-align:center;width:90px">Plano</th>
            <th style="text-align:center;width:110px">Status</th>
            <th style="text-align:center;width:110px">Ativada em</th>
            <th style="text-align:center;width:110px">Expira em</th>
            <th style="text-align:center;width:70px">Pag.</th>
            <th style="text-align:center;width:120px">Ações</th>
          </tr></thead>
          <tbody id="assinaturas-tbody">
            <tr><td colspan="8" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- ══ POSTOS PARCEIROS ══ -->
  <section id="section-postos-parceiros" style="display:none">
    <div class="page-header">
      <h2>⭐ Postos Parceiros</h2>
      <div style="display:flex;align-items:center;gap:10px">
        <span id="parceiros-count" style="background:rgba(255,214,0,0.12);color:#FFD600;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:800">–</span>
        <button class="btn-refresh" onclick="carregarParceirosCadastrados()"><i class="fas fa-sync-alt"></i> Atualizar</button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="section-card" style="padding:16px 20px;margin-bottom:14px">
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
        <div style="display:flex;align-items:center;gap:6px;background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 12px;flex:1;min-width:160px">
          <i class="fas fa-search" style="color:rgba(255,255,255,0.3);font-size:11px"></i>
          <input id="pc-search" type="text" placeholder="Buscar posto, e-mail, CNPJ..." oninput="filtrarParceiros()" style="background:transparent;border:none;color:#fff;font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;width:100%"/>
        </div>
        <select id="pc-filtro-estado" onchange="filtrarParceiros()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:rgba(255,255,255,0.7);font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;cursor:pointer">
          <option value="">Todos os estados</option>
          <option value="AC">AC</option><option value="AL">AL</option><option value="AM">AM</option>
          <option value="AP">AP</option><option value="BA">BA</option><option value="CE">CE</option>
          <option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option>
          <option value="MA">MA</option><option value="MG">MG</option><option value="MS">MS</option>
          <option value="MT">MT</option><option value="PA">PA</option><option value="PB">PB</option>
          <option value="PE">PE</option><option value="PI">PI</option><option value="PR">PR</option>
          <option value="RJ">RJ</option><option value="RN">RN</option><option value="RO">RO</option>
          <option value="RR">RR</option><option value="RS">RS</option><option value="SC">SC</option>
          <option value="SE">SE</option><option value="SP">SP</option><option value="TO">TO</option>
        </select>
        <input id="pc-filtro-cidade" type="text" placeholder="Cidade..." oninput="filtrarParceiros()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:rgba(255,255,255,0.7);font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;width:130px"/>
        <input id="pc-filtro-bairro" type="text" placeholder="Bairro..." oninput="filtrarParceiros()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:rgba(255,255,255,0.7);font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;width:120px"/>
        <select id="pc-filtro-plano" onchange="filtrarParceiros()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:rgba(255,255,255,0.7);font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;cursor:pointer">
          <option value="">Todos os planos</option>
          <option value="visibilidade">Visibilidade</option>
          <option value="basico">Básico</option>
          <option value="premium">Premium</option>
          <option value="pro">Pro</option>
        </select>
        <select id="pc-filtro-status" onchange="filtrarParceiros()" style="background:#0A1520;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 10px;color:rgba(255,255,255,0.7);font-size:12px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;cursor:pointer">
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="pendente">Pendente</option>
          <option value="suspenso">Suspenso</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button onclick="limparFiltrosParceiros()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);padding:7px 12px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700"><i class="fas fa-times"></i> Limpar</button>
      </div>
      <div id="pc-filtro-resultado" style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:8px;display:none"></div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h3><i class="fas fa-star" style="color:#FFD600;margin-right:8px"></i>Postos cadastrados no app</h3>
      </div>
      <div style="overflow-x:auto">
        <table style="min-width:800px;table-layout:fixed;width:100%">
          <colgroup>
            <col style="width:22%"/>
            <col style="width:16%"/>
            <col style="width:9%"/>
            <col style="width:14%"/>
            <col style="width:9%"/>
            <col style="width:12%"/>
            <col style="width:18%"/>
          </colgroup>
          <thead><tr>
            <th>Posto / Empresa</th>
            <th>E-mail / Tel</th>
            <th style="text-align:center">Plano</th>
            <th style="text-align:center">Cidade / Estado</th>
            <th style="text-align:center">Status</th>
            <th style="text-align:center">Atualizado</th>
            <th style="text-align:center">Ações</th>
          </tr></thead>
          <tbody id="parceiros-tbody">
            <tr><td colspan="7" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Editar Parceiro -->
    <div id="modal-parceiro-edit" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;overflow-y:auto;padding:20px">
      <div style="background:#1A1D23;border:1px solid rgba(255,255,255,0.1);border-radius:18px;max-width:660px;margin:0 auto;padding:28px;position:relative">
        <button onclick="fecharModalParceiro()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.6);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px">✕</button>
        <h3 style="font-size:17px;font-weight:900;color:#fff;margin:0 0 4px"><i class="fas fa-gas-pump" style="color:#FF6D00;margin-right:8px"></i>Editar Posto Parceiro</h3>
        <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:20px;font-family:monospace" id="ep-id-display">ID: —</div>

        <!-- Dados cadastrais -->
        <div style="font-size:10px;font-weight:900;color:#FF6D00;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Dados Cadastrais</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="form-group" style="grid-column:1/-1">
            <label>Nome do Posto *</label>
            <input id="ep-nomePosto" type="text" placeholder="Ex: Posto Central"/>
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input id="ep-email" type="email" placeholder="contato@posto.com.br"/>
          </div>
          <div class="form-group">
            <label>WhatsApp / Tel Principal</label>
            <input id="ep-tel" type="text" placeholder="(27) 99999-9999" maxlength="11" oninput="this.value=this.value.replace(/\D/g,'').slice(0,11)" onblur="this.value=_fmtTel(this.value)"/>
          </div>
          <div class="form-group">
            <label>Tel Telemarketing / Comercial</label>
            <input id="ep-telTelemarketing" type="text" placeholder="(27) 3000-0000" maxlength="11" oninput="this.value=this.value.replace(/\D/g,'').slice(0,11)" onblur="this.value=_fmtTel(this.value)"/>
          </div>
          <div class="form-group">
            <label>CNPJ</label>
            <input id="ep-cnpj" type="text" placeholder="00.000.000/0001-00" maxlength="14" oninput="epMaskCnpj(this)" onblur="epBlurCnpj(this)"/>
          </div>
          <div class="form-group">
            <label>Bandeira</label>
            <select id="ep-bandeira" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;color:#fff;font-size:13px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;width:100%">
              <option value="">Sem bandeira</option><option>Petrobras BR</option><option>Shell</option><option>Ipiranga</option><option>Ale</option><option>Raízen</option><option>Independente</option><option>Outra</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="ep-status" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 14px;color:#fff;font-size:13px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;width:100%">
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="suspenso">Suspenso</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <!-- Endereço completo -->
        <div style="font-size:10px;font-weight:900;color:#42A5F5;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">📍 Endereço e Localização</div>
        <div style="background:rgba(66,165,245,0.04);border:1px solid rgba(66,165,245,0.15);border-radius:12px;padding:16px;margin-bottom:16px">
          <div style="display:grid;grid-template-columns:150px 1fr 80px;gap:10px;margin-bottom:10px">
            <div class="form-group" style="margin-bottom:0">
              <label style="color:rgba(255,255,255,0.45)">CEP</label>
              <input id="ep-cep" type="text" placeholder="29000-000" maxlength="8" oninput="epMaskCep(this)" onblur="epBlurCep(this);epBuscarCep()"/>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label style="color:rgba(255,255,255,0.45)">Rua / Logradouro *</label>
              <input id="ep-rua" type="text" placeholder="Av. Nossa Senhora da Penha"/>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label style="color:rgba(255,255,255,0.45)">Número</label>
              <input id="ep-num" type="text" placeholder="123"/>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 80px;gap:10px;margin-bottom:12px">
            <div class="form-group" style="margin-bottom:0">
              <label style="color:rgba(255,255,255,0.45)">Bairro</label>
              <input id="ep-bairro" type="text" placeholder="Centro"/>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label style="color:rgba(255,255,255,0.45)">Cidade *</label>
              <input id="ep-cidade" type="text" placeholder="Vitória"/>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label style="color:rgba(255,255,255,0.45)">UF *</label>
              <select id="ep-estado" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 8px;color:#fff;font-size:13px;font-family:'Raleway',sans-serif;font-weight:600;outline:none;width:100%">
                <option value="">—</option>
                <option>AC</option><option>AL</option><option>AM</option><option>AP</option>
                <option>BA</option><option>CE</option><option>DF</option><option>ES</option>
                <option>GO</option><option>MA</option><option>MG</option><option>MS</option>
                <option>MT</option><option>PA</option><option>PB</option><option>PE</option>
                <option>PI</option><option>PR</option><option>RJ</option><option>RN</option>
                <option>RO</option><option>RR</option><option>RS</option><option>SC</option>
                <option>SE</option><option>SP</option><option>TO</option>
              </select>
            </div>
          </div>
          <!-- Lat/Lng + botão geocodificar -->
          <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px">
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:110px">
              <label style="color:rgba(255,255,255,0.45)">Latitude</label>
              <input id="ep-lat" type="text" placeholder="-20.12345" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;color:#69F0AE;font-size:12px;font-family:monospace;outline:none;width:100%"/>
            </div>
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:110px">
              <label style="color:rgba(255,255,255,0.45)">Longitude</label>
              <input id="ep-lng" type="text" placeholder="-40.12345" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;color:#69F0AE;font-size:12px;font-family:monospace;outline:none;width:100%"/>
            </div>
            <button onclick="epGeocodificar()" style="background:rgba(66,165,245,0.15);color:#42A5F5;border:1px solid rgba(66,165,245,0.3);padding:10px 14px;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap;flex-shrink:0">
              <i class="fas fa-map-marker-alt"></i> Localizar
            </button>
          </div>
          <div id="ep-geo-status" style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:8px"></div>
          <!-- Mini mapa -->
          <div id="ep-mapa-wrap" style="display:none;border-radius:10px;overflow:hidden;border:1px solid rgba(66,165,245,0.2)">
            <iframe id="ep-mapa-frame" style="width:100%;height:200px;border:none" src="" loading="lazy"></iframe>
            <div style="padding:6px 12px;background:rgba(0,0,0,0.4);font-size:11px;color:#69F0AE;display:flex;align-items:center;gap:6px">
              <i class="fas fa-check-circle"></i> <span id="ep-mapa-label">Localização confirmada</span>
            </div>
          </div>
        </div>

        <!-- ══ PLANO DA EMPRESA ══ -->
        <div style="font-size:10px;font-weight:900;color:#FFD600;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">
          <i class="fas fa-crown" style="margin-right:6px"></i>Plano da Empresa
        </div>
        <div style="background:rgba(255,214,0,0.04);border:1.5px solid rgba(255,214,0,0.18);border-radius:14px;padding:16px;margin-bottom:16px">

          <!-- Select de plano + botão gerenciar -->
          <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:14px">
            <div style="flex:1">
              <label style="font-size:11px;color:rgba(255,255,255,0.45);font-weight:700;display:block;margin-bottom:6px">Plano Contratado</label>
              <select id="ep-plano" onchange="epAtualizarPreviewPlano()" style="width:100%;background:#0A1520;border:1.5px solid rgba(255,214,0,0.3);border-radius:10px;padding:11px 14px;color:#fff;font-size:13px;font-family:'Raleway',sans-serif;font-weight:700;outline:none">
                <option value="">Carregando planos...</option>
              </select>
            </div>
            <button onclick="irParaGerenciarPlanos()" title="Criar ou editar planos" style="background:rgba(255,214,0,0.12);color:#FFD600;border:1px solid rgba(255,214,0,0.3);border-radius:10px;padding:11px 14px;cursor:pointer;font-size:11px;font-weight:800;white-space:nowrap;flex-shrink:0">
              <i class="fas fa-cog"></i> Gerenciar Planos
            </button>
          </div>

          <!-- Preview visual do plano selecionado -->
          <div id="ep-plano-preview" style="display:none">
            <!-- preenchido por epAtualizarPreviewPlano() -->
          </div>
          <div id="ep-plano-vazio" style="color:rgba(255,255,255,0.25);font-size:12px;text-align:center;padding:12px 0;font-style:italic">
            Selecione um plano para ver os benefícios incluídos
          </div>
        </div>

        <!-- Preços combustível -->
        <div style="font-size:10px;font-weight:900;color:#FF6D00;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Preços Combustível <span style="color:rgba(255,255,255,0.25);font-size:9px;text-transform:none;letter-spacing:0">(R$/litro — 0 = não informado)</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;padding:14px;background:rgba(255,109,0,0.05);border-radius:12px;border:1px solid rgba(255,109,0,0.15)">
          <div class="form-group">
            <label style="color:rgba(255,255,255,0.5)">Gasolina Comum</label>
            <input id="ep-preco-gasolina" type="number" step="0.01" min="0" placeholder="0.00" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:800;outline:none;width:100%;font-family:'Raleway',sans-serif"/>
          </div>
          <div class="form-group">
            <label style="color:rgba(255,255,255,0.5)">Gasolina Aditivada</label>
            <input id="ep-preco-gasolinaAditivada" type="number" step="0.01" min="0" placeholder="0.00" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:800;outline:none;width:100%;font-family:'Raleway',sans-serif"/>
          </div>
          <div class="form-group">
            <label style="color:rgba(255,255,255,0.5)">Etanol</label>
            <input id="ep-preco-etanol" type="number" step="0.01" min="0" placeholder="0.00" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:800;outline:none;width:100%;font-family:'Raleway',sans-serif"/>
          </div>
          <div class="form-group">
            <label style="color:rgba(255,255,255,0.5)">Diesel Comum</label>
            <input id="ep-preco-diesel" type="number" step="0.01" min="0" placeholder="0.00" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:800;outline:none;width:100%;font-family:'Raleway',sans-serif"/>
          </div>
          <div class="form-group">
            <label style="color:rgba(255,255,255,0.5)">Diesel S10</label>
            <input id="ep-preco-dieselS10" type="number" step="0.01" min="0" placeholder="0.00" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:800;outline:none;width:100%;font-family:'Raleway',sans-serif"/>
          </div>
          <div class="form-group">
            <label style="color:rgba(255,255,255,0.5)">GNV</label>
            <input id="ep-preco-gnv" type="number" step="0.01" min="0" placeholder="0.00" style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:14px;font-weight:800;outline:none;width:100%;font-family:'Raleway',sans-serif"/>
          </div>
        </div>

        <!-- Flags ocultas (mantidas para compatibilidade, controladas pelo plano) -->
        <input id="ep-seloVerificado" type="checkbox" style="display:none"/>
        <input id="ep-pinDourado"     type="checkbox" style="display:none"/>
        <input id="ep-topoLista"      type="checkbox" style="display:none"/>
        <input id="ep-cuponsAtivos"   type="checkbox" style="display:none"/>

        <!-- ── Área do convite gerado ── -->
        <div id="ep-convite-area" style="display:none;background:rgba(0,200,83,0.07);border:1.5px solid rgba(0,200,83,0.25);border-radius:12px;padding:16px;margin-bottom:4px">
          <div style="font-size:11px;font-weight:700;color:#00C853;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px"><i class="fas fa-link"></i> Link de Convite Gerado</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="ep-convite-link" readonly style="flex:1;background:#0A1520;border:1px solid rgba(0,200,83,0.3);border-radius:8px;padding:8px 12px;color:#69F0AE;font-size:11px;font-family:monospace;outline:none" value=""/>
            <button onclick="copiarConvite()" style="background:rgba(0,200,83,0.15);color:#00C853;border:1px solid rgba(0,200,83,0.3);padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:12px;white-space:nowrap"><i class="fas fa-copy"></i> Copiar</button>
            <button onclick="compartilharWhatsApp()" style="background:rgba(37,211,102,0.15);color:#25D366;border:1px solid rgba(37,211,102,0.3);padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:12px;white-space:nowrap"><i class="fab fa-whatsapp"></i> WhatsApp</button>
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:8px"><i class="fas fa-info-circle"></i> Envie este link para o dono do posto — ele abre a página de boas-vindas e baixa o app já vinculado.</div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button onclick="fecharModalParceiro()" style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.12);padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px">Cancelar</button>
          <button id="ep-deletar-btn" onclick="deletarParceiroModal()" style="background:rgba(255,82,82,0.15);color:#FF5252;border:1px solid rgba(255,82,82,0.3);padding:10px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700"><i class="fas fa-trash"></i> Remover</button>
          <button id="ep-convite-btn" onclick="gerarConviteParceiro()" style="background:rgba(66,165,245,0.15);color:#42A5F5;border:1px solid rgba(66,165,245,0.3);padding:10px 18px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700"><i class="fas fa-paper-plane"></i> Gerar Convite</button>
          <button onclick="salvarParceiroModal()" style="background:#FF6D00;color:white;border:none;padding:10px 24px;border-radius:10px;font-weight:900;font-size:13px;cursor:pointer"><i class="fas fa-save"></i> Salvar</button>
        </div>
      </div>
    </div>

    <!-- ═══ Buscar Posto na ANP ═══ -->
    <div class="section-card" style="margin-top:18px">
      <div class="section-header">
        <h3><i class="fas fa-database" style="color:#42A5F5;margin-right:8px"></i>Buscar Posto na Base ANP</h3>
        <span style="font-size:11px;color:rgba(255,255,255,0.3);font-weight:600">46.000+ postos cadastrados pela ANP — preenche dados automaticamente</span>
      </div>
      <div style="padding:16px 0 8px">
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-bottom:14px">
          <div style="flex:1;min-width:130px">
            <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">Estado (UF) *</div>
            <select id="anp-uf" onchange="anpPopularMunicipios(this.value)" style="background:#0A1520;border:1.5px solid rgba(66,165,245,0.3);border-radius:10px;padding:9px 12px;color:#fff;font-size:13px;font-family:'Raleway',sans-serif;font-weight:700;outline:none;width:100%;cursor:pointer">
              <option value="">Selecione a UF...</option>
              <option value="AC">AC - Acre</option><option value="AL">AL - Alagoas</option>
              <option value="AM">AM - Amazonas</option><option value="AP">AP - Amapá</option>
              <option value="BA">BA - Bahia</option><option value="CE">CE - Ceará</option>
              <option value="DF">DF - Distrito Federal</option><option value="ES">ES - Espírito Santo</option>
              <option value="GO">GO - Goiás</option><option value="MA">MA - Maranhão</option>
              <option value="MG">MG - Minas Gerais</option><option value="MS">MS - Mato Grosso do Sul</option>
              <option value="MT">MT - Mato Grosso</option><option value="PA">PA - Pará</option>
              <option value="PB">PB - Paraíba</option><option value="PE">PE - Pernambuco</option>
              <option value="PI">PI - Piauí</option><option value="PR">PR - Paraná</option>
              <option value="RJ">RJ - Rio de Janeiro</option><option value="RN">RN - Rio Grande do Norte</option>
              <option value="RO">RO - Rondônia</option><option value="RR">RR - Roraima</option>
              <option value="RS">RS - Rio Grande do Sul</option><option value="SC">SC - Santa Catarina</option>
              <option value="SE">SE - Sergipe</option><option value="SP">SP - São Paulo</option>
              <option value="TO">TO - Tocantins</option>
            </select>
          </div>
          <div style="flex:2;min-width:180px">
            <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">Município *</div>
            <select id="anp-municipio" style="background:#0A1520;border:1.5px solid rgba(66,165,245,0.3);border-radius:10px;padding:9px 12px;color:#fff;font-size:13px;font-family:'Raleway',sans-serif;font-weight:700;outline:none;width:100%;cursor:pointer">
              <option value="">Selecione o estado primeiro...</option>
            </select>
          </div>
          <div style="flex:2;min-width:160px">
            <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px">Buscar por Nome / CNPJ</div>
            <input id="anp-busca" type="text" placeholder="Nome do posto ou CNPJ..." style="background:#0A1520;border:1.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:9px 12px;color:#fff;font-size:13px;font-family:'Raleway',sans-serif;font-weight:700;outline:none;width:100%;box-sizing:border-box" oninput="filtrarResultadosANP()"/>
          </div>
          <button onclick="buscarPostosANPAdmin()" style="background:#42A5F5;color:#000;border:none;padding:10px 22px;border-radius:10px;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap;height:38px"><i class="fas fa-search"></i> Buscar na ANP</button>
        </div>
        <div id="anp-resultado-info" style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:10px;display:none"></div>
        <div id="anp-loading" style="display:none;text-align:center;padding:24px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Consultando base ANP...</div>
        <div id="anp-tabela-wrap" style="display:none;overflow-x:auto;max-height:380px;overflow-y:auto;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
          <table style="min-width:700px;table-layout:fixed;width:100%">
            <colgroup>
              <col style="width:28%"/><col style="width:10%"/><col style="width:14%"/>
              <col style="width:12%"/><col style="width:12%"/><col style="width:12%"/><col style="width:12%"/>
            </colgroup>
            <thead><tr style="position:sticky;top:0;background:#0F1923;z-index:1">
              <th>Posto / Endereço</th>
              <th style="text-align:center">Bandeira</th>
              <th style="text-align:center">CNPJ</th>
              <th style="text-align:center">Gasolina</th>
              <th style="text-align:center">Etanol</th>
              <th style="text-align:center">Diesel</th>
              <th style="text-align:center">Ação</th>
            </tr></thead>
            <tbody id="anp-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- ══ POSTOS (MAPA) ══ -->
  <section id="section-postos" style="display:none">
    <div class="page-header">
      <h2>⛽ Postos Encontrados</h2>
      <button class="btn-refresh" onclick="carregarPostos()"><i class="fas fa-sync-alt"></i> Atualizar</button>
    </div>
    <div class="section-card">
      <div class="section-header">
        <h3>Lista de Postos — <span id="postos-cidade-label">São Paulo, SP</span></h3>
        <span style="font-size:12px;color:rgba(255,255,255,0.35);font-weight:600" id="postos-count">Carregando...</span>
      </div>
      <div class="section-body" style="padding:0">
        <div style="overflow-x:auto">
          <table style="min-width:700px">
            <thead><tr>
              <th>Nome</th><th>Bandeira</th><th>Fonte</th>
              <th>Gasolina</th><th>Etanol</th><th>Diesel</th>
              <th>Cidade</th>
            </tr></thead>
            <tbody id="postos-tbody"><tr><td colspan="7" style="text-align:center;padding:32px;color:rgba(255,255,255,0.3)">Carregando postos...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- ══ PREÇOS REPORTADOS ══ -->
  <section id="section-precos" style="display:none">
    <div class="page-header">
      <h2>🎯 Preços Reportados</h2>
      <button class="btn-refresh" onclick="carregarReportes()"><i class="fas fa-sync-alt"></i> Atualizar</button>
    </div>
    <div class="section-card" style="margin-bottom:16px">
      <div class="section-header">
        <h3><i class="fas fa-trophy" style="color:#FFC107;margin-right:6px"></i> Ranking de Colaboradores</h3>
      </div>
      <div class="section-body" style="padding:12px" id="ranking-lista">
        <div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:13px">Carregando ranking...</div>
      </div>
    </div>
    <div class="section-card">
      <div class="section-header">
        <h3>Reportes de Preço (últimas 24h)</h3>
      </div>
      <div class="section-body" style="padding:0" id="precos-lista">
        <table>
          <thead><tr><th>Posto</th><th>Combustível</th><th>Preço</th><th>Conf.</th><th>Há</th></tr></thead>
          <tbody id="reportes-tbody"><tr><td colspan="5" style="text-align:center;padding:32px;color:rgba(255,255,255,0.3)">Nenhum reporte ainda</td></tr></tbody>
        </table>
      </div>
    </div>
  </section>



  <!-- ══ PRODUTOS & PLANOS ══ -->
  <!-- ══ PLANOS DO APP (B2C) ══ -->
  <section id="section-planos-app" style="display:none">
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="margin:0">📱 Planos do App</h2>
        <div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:4px;font-weight:600">Edite os preços e benefícios dos planos exibidos aos usuários finais do RotaPosto</div>
      </div>
      <button onclick="carregarPlanosApp()" style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.12);padding:9px 18px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px">
        <i class="fas fa-sync-alt"></i> Atualizar
      </button>
    </div>

    <!-- Aviso de contexto -->
    <div style="background:rgba(66,165,245,0.08);border:1px solid rgba(66,165,245,0.2);border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
      <i class="fas fa-info-circle" style="color:#42A5F5;font-size:16px;flex-shrink:0"></i>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.6">
        Esses planos são exibidos na tela de assinatura do app para o usuário final. Alterar o preço aqui atualiza o valor cobrado na próxima renovação e na tela de vendas. O plano <strong style="color:#fff">Gratuito</strong> não pode ser removido.
      </div>
    </div>

    <!-- Cards de planos (renderizados via JS) -->
    <div id="planos-app-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px;margin-bottom:24px">
      <div style="color:rgba(255,255,255,0.3);padding:40px;text-align:center;grid-column:1/-1">
        <i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:12px;display:block"></i>Carregando planos...
      </div>
    </div>

    <!-- Toast de feedback -->
    <div id="planos-app-toast" style="display:none;position:fixed;bottom:24px;right:24px;background:#00C853;color:#fff;padding:12px 20px;border-radius:12px;font-weight:700;font-size:13px;z-index:9999;box-shadow:0 4px 20px rgba(0,200,83,0.4);transition:all 0.3s"></div>
  </section>

  <!-- ══ PLANOS DOS POSTOS (B2B) ══ -->
  <section id="section-planos" style="display:none">
    <!-- Header -->
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="margin:0">⛽ Planos para Postos Parceiros</h2>
        <div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:4px;font-weight:600">Gerencie os planos B2B contratados pelos postos cadastrados no RotaPosto</div>
      </div>
      <button onclick="abrirModalNovoPLano()" style="background:var(--laranja);color:white;border:none;padding:10px 20px;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;flex-shrink:0">
        <i class="fas fa-plus"></i> Novo Plano
      </button>
    </div>

    <!-- KPIs: postos por plano -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:28px">
      <div class="kpi-card" style="padding:18px;text-align:center">
        <div style="font-size:22px;margin-bottom:4px">🆓</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:2px;font-weight:700">Gratuito</div>
        <div style="font-size:28px;font-weight:900;color:#42A5F5" id="kpi-postos-gratis">–</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.3)">postos</div>
      </div>
      <div class="kpi-card" style="padding:18px;text-align:center">
        <div style="font-size:22px;margin-bottom:4px">⭐</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:2px;font-weight:700">Básico</div>
        <div style="font-size:28px;font-weight:900;color:#FF6D00" id="kpi-postos-basico">–</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.3)">postos</div>
      </div>
      <div class="kpi-card" style="padding:18px;text-align:center">
        <div style="font-size:22px;margin-bottom:4px">👑</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:2px;font-weight:700">Plus</div>
        <div style="font-size:28px;font-weight:900;color:#FFD600" id="kpi-postos-plus">–</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.3)">postos</div>
      </div>
      <div class="kpi-card" style="padding:18px;text-align:center">
        <div style="font-size:22px;margin-bottom:4px">📦</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:2px;font-weight:700">Outros</div>
        <div style="font-size:28px;font-weight:900;color:rgba(255,255,255,0.45)" id="kpi-postos-outros">–</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.3)">postos</div>
      </div>
    </div>

    <!-- Aviso de contexto -->
    <div style="background:rgba(255,109,0,0.07);border:1px solid rgba(255,109,0,0.2);border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
      <i class="fas fa-gas-pump" style="color:#FF6D00;font-size:16px;flex-shrink:0"></i>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.6">
        Planos B2B exibidos no painel de adesão dos postos parceiros. Edite preço, ciclo, benefícios e configure cada plano diretamente nos cards abaixo.
      </div>
    </div>

    <!-- Grid de cards dos planos editáveis inline (renderizado via JS) -->
    <div id="planos-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px;margin-bottom:28px">
      <div style="text-align:center;padding:40px;color:rgba(255,255,255,0.3);font-size:13px;grid-column:1/-1">
        <i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:12px;display:block"></i>
        Carregando planos...
      </div>
    </div>

    <!-- Toast de feedback -->
    <div id="planos-posto-toast" style="display:none;position:fixed;bottom:24px;right:24px;background:#00C853;color:#fff;padding:12px 20px;border-radius:12px;font-weight:700;font-size:13px;z-index:9999;box-shadow:0 4px 20px rgba(0,200,83,0.4)"></div>

    <!-- Modal SOMENTE para criar novo plano (formulário compacto) -->
    <div id="modal-plano" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;overflow-y:auto;padding:20px">
      <div style="background:#1A1D23;border:1px solid rgba(255,255,255,0.1);border-radius:18px;max-width:600px;margin:0 auto;padding:28px;position:relative">
        <button onclick="fecharModalPlano()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.6);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px">✕</button>
        <h3 id="modal-plano-titulo" style="font-size:18px;font-weight:900;color:#fff;margin:0 0 24px">Editar Plano</h3>

        <!-- Linha 1: Emoji + Nome -->
        <div style="display:grid;grid-template-columns:80px 1fr;gap:12px;margin-bottom:16px">
          <div>
            <label style="font-size:11px;color:rgba(255,255,255,0.5);display:block;margin-bottom:6px">Emoji</label>
            <input id="mp-emoji" type="text" maxlength="4" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px;font-size:22px;text-align:center;box-sizing:border-box" placeholder="⭐"/>
          </div>
          <div>
            <label style="font-size:11px;color:rgba(255,255,255,0.5);display:block;margin-bottom:6px">Nome do Plano *</label>
            <input id="mp-nome" type="text" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px;font-size:14px;box-sizing:border-box" placeholder="Ex: Premium Mensal"/>
          </div>
        </div>

        <!-- Linha 2: Valor + Ciclo + Cor -->
        <div style="display:grid;grid-template-columns:1fr 1fr 80px;gap:12px;margin-bottom:16px">
          <div>
            <label style="font-size:11px;color:rgba(255,255,255,0.5);display:block;margin-bottom:6px">Valor (R$) / mês</label>
            <input id="mp-valor" type="number" min="0" step="0.01" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px;font-size:14px;box-sizing:border-box" placeholder="0.00" oninput="mpAtualizarPeriodo()"/>
          </div>
          <div>
            <label style="font-size:11px;color:rgba(255,255,255,0.5);display:block;margin-bottom:6px">Ciclo de Cobrança</label>
            <select id="mp-ciclo" onchange="mpAtualizarPeriodo()" style="width:100%;background:#1E2128;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px;font-size:13px;box-sizing:border-box">
              <option value="forever">Grátis / Para sempre</option>
              <option value="trial">Período de Teste (grátis)</option>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;color:rgba(255,255,255,0.5);display:block;margin-bottom:6px">Cor</label>
            <input id="mp-cor" type="color" style="width:100%;height:42px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:4px;cursor:pointer;box-sizing:border-box"/>
          </div>
        </div>

        <!-- Dias de teste (só aparece quando ciclo = trial ou forever) -->
        <div id="mp-trial-box" style="display:none;background:rgba(255,214,0,0.07);border:1px solid rgba(255,214,0,0.2);border-radius:10px;padding:14px 16px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:120px">
              <label style="font-size:11px;color:#FFD600;font-weight:700;display:block;margin-bottom:6px"><i class="fas fa-clock"></i> Dias de Teste Gratuito</label>
              <input id="mp-dias-teste" type="number" min="0" max="365" value="30" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,214,0,0.3);color:#FFD600;border-radius:8px;padding:9px 12px;font-size:16px;font-weight:900;box-sizing:border-box"/>
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,0.45);flex:2;min-width:160px">
              Após o período de teste, o posto deverá assinar um plano pago para continuar ativo.
            </div>
          </div>
        </div>

        <!-- Descrição -->
        <div style="margin-bottom:16px">
          <label style="font-size:11px;color:rgba(255,255,255,0.5);display:block;margin-bottom:6px">Descrição</label>
          <input id="mp-descricao" type="text" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:10px;padding:10px;font-size:13px;box-sizing:border-box" placeholder="Descrição exibida no checkout..."/>
        </div>

        <!-- Switches: Ativo + Destaque -->
        <div style="display:flex;gap:20px;margin-bottom:20px">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:rgba(255,255,255,0.7)">
            <input id="mp-ativo" type="checkbox" style="width:18px;height:18px;accent-color:var(--laranja);cursor:pointer"/>
            Plano Ativo
          </label>
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:rgba(255,255,255,0.7)">
            <input id="mp-destaque" type="checkbox" style="width:18px;height:18px;accent-color:#FFD600;cursor:pointer"/>
            Mais Popular (destaque)
          </label>
        </div>

        <!-- Benefícios fixos para postos parceiros -->
        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);margin-bottom:12px"><i class="fas fa-gas-pump" style="color:var(--laranja);margin-right:6px"></i>Benefícios para o Posto Parceiro</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="mp-beneficios-grid">
            <!-- benefícios renderizados via JS -->
          </div>
        </div>

        <!-- Permissões / Features extras -->
        <div style="margin-bottom:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <label style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.8)"><i class="fas fa-list-check" style="color:var(--laranja);margin-right:6px"></i>Recursos Extras / App Usuário</label>
            <button onclick="adicionarFeatureModal()" style="background:rgba(255,109,0,0.15);color:var(--laranja);border:1px solid rgba(255,109,0,0.3);border-radius:8px;padding:5px 12px;font-size:11px;cursor:pointer;font-weight:700">+ Adicionar</button>
          </div>
          <div id="mp-features-list" style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;padding-right:4px">
            <!-- features renderizadas via JS -->
          </div>
        </div>

        <!-- Botões -->
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button onclick="fecharModalPlano()" style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.12);padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px">Cancelar</button>
          <button id="mp-deletar-btn" onclick="deletarPlanoModal()" style="display:none;background:rgba(255,82,82,0.15);color:#FF5252;border:1px solid rgba(255,82,82,0.3);padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700"><i class="fas fa-trash"></i> Excluir</button>
          <button onclick="salvarPlanoModal()" style="background:var(--laranja);color:white;border:none;padding:10px 24px;border-radius:10px;font-weight:900;font-size:13px;cursor:pointer"><i class="fas fa-save"></i> Salvar Plano</button>
        </div>
      </div>
    </div>
  </section>



  <!-- ══ MENU DO APP ══ -->
  <section id="section-menu-app" style="display:none">
    <div class="page-header">
      <h2>📱 Menu do App</h2>
      <button class="btn-refresh" onclick="salvarMenuApp()"><i class="fas fa-save"></i> Salvar</button>
    </div>
    <div class="section-card">
      <div class="section-header"><h3><i class="fas fa-sliders-h" style="color:#FF6D00;margin-right:8px"></i>Itens visíveis no menu do usuário</h3></div>
      <div class="section-body">
        <p style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:20px">Marque quais itens aparecem no menu lateral do app. Alterações salvam imediatamente no KV e refletem para todos os usuários.</p>
        <div id="menu-app-itens" style="display:flex;flex-direction:column;gap:12px">
          <div style="text-align:center;padding:30px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ══ MAPA AO VIVO ══ -->
  <section id="section-mapa" style="display:none">
    <div class="page-header"><h2>🗺️ Mapa ao Vivo</h2></div>
    <div class="section-card">
      <div class="section-body" style="padding:0">
        <div id="admin-map" style="width:100%;height:500px;border-radius:0 0 16px 16px"></div>
      </div>
    </div>
  </section>
</main>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
let adminMap = null;
let chartPrecos = null;
let currentSection = 'dashboard';
const ADMIN_KEY = new URLSearchParams(window.location.search).get('key') || sessionStorage.getItem('admin_key') || '';

// Região selecionada (default: São Paulo)
let adminLat = -23.5505, adminLng = -46.6333, adminCidade = 'São Paulo', adminUF = 'SP';

// Dados em cache
let _appUsuarios = [], _assinaturas = [], _parceiros = [], _planosData = [];

// ── SAIR ────────────────────────────────────────────────────────────────────
function sairAdmin() {
  if (!confirm('Deseja sair do painel admin?')) return;
  sessionStorage.removeItem('admin_key');
  window.location.href = '/admin';
}

// ── TOAST ───────────────────────────────────────────────────────────────────
function showToast(msg, tipo) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = tipo === 'ok' ? 'rgba(0,200,83,0.4)' : tipo === 'err' ? 'rgba(255,82,82,0.4)' : 'rgba(255,255,255,0.1)';
  t.style.color = tipo === 'ok' ? '#69F0AE' : tipo === 'err' ? '#FF5252' : '#fff';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── DROPDOWN DE CIDADE CUSTOMIZADO ──────────────────────────────────────────
function toggleCidadeDropdown() {
  const menu = document.getElementById('cidade-menu');
  const chevron = document.getElementById('cidade-chevron');
  const isOpen = menu.style.display !== 'none';
  menu.style.display = isOpen ? 'none' : 'block';
  chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function selecionarCidade(el) {
  const val = el.dataset.val;
  const parts = val.split(',');
  adminLat = parseFloat(parts[0]); adminLng = parseFloat(parts[1]);
  adminCidade = parts[2]; adminUF = parts[3];

  // Atualiza label do botão
  document.getElementById('cidade-label').textContent = adminCidade + ', ' + adminUF;

  // Marca item selecionado
  document.querySelectorAll('.cidade-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');

  // Fecha menu
  document.getElementById('cidade-menu').style.display = 'none';
  document.getElementById('cidade-chevron').style.transform = '';

  // Atualiza outros labels
  const labelEl = document.getElementById('kpi-preco-label');
  if (labelEl) labelEl.textContent = adminCidade + ', ' + adminUF;
  const postosCidadeEl = document.getElementById('postos-cidade-label');
  if (postosCidadeEl) postosCidadeEl.textContent = adminCidade + ', ' + adminUF;

  // Recarrega seção atual
  if (currentSection === 'dashboard') carregarDashboard();
  else if (currentSection === 'postos') carregarPostos();
  else if (currentSection === 'mapa') iniciarMapaAdmin(true);
}

// Fecha dropdown ao clicar fora
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('cidade-dropdown-wrap');
  if (wrap && !wrap.contains(e.target)) {
    const menu = document.getElementById('cidade-menu');
    const chevron = document.getElementById('cidade-chevron');
    if (menu) menu.style.display = 'none';
    if (chevron) chevron.style.transform = '';
  }
});

function showSection(name, el) {
  document.querySelectorAll('main section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.style.display = 'block';
  if (el) el.classList.add('active');
  currentSection = name;
  if (name === 'mapa') iniciarMapaAdmin(false);
  if (name === 'postos') carregarPostos();
  if (name === 'precos') carregarReportes();
  if (name === 'dashboard') carregarDashboard();
  if (name === 'app-usuarios') carregarAppUsuarios();
  if (name === 'assinaturas') carregarAssinaturas();
  if (name === 'postos-parceiros') carregarParceirosCadastrados();
  if (name === 'dados-usuarios') carregarDadosUsuarios();
  if (name === 'permissoes') carregarPermissoes();
  if (name === 'planos') carregarEstatisticasPlanos();
  if (name === 'planos-app') carregarPlanosApp();
  if (name === 'niveis') carregarEstatisticasNiveis();
  if (name === 'menu-app') carregarMenuApp();
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
async function carregarDashboard() {
  try {
    const [postosRes, reportesRes, assinRes] = await Promise.all([
      fetch(\`/api/postos?lat=\${adminLat}&lng=\${adminLng}&combustivel=gasolina&raio=15\`),
      fetch('/api/precos/reportados'),
      fetch('/api/admin/assinaturas?key=' + encodeURIComponent(ADMIN_KEY))
    ]);
    const postosData = await postosRes.json();
    const reportesData = await reportesRes.json();

    const postos = postosData.postos || [];
    const anp = postos.filter(p => p.fonte === 'anp').length;
    const osm = postos.filter(p => p.fonte === 'osm').length;
    const collab = reportesData.total || 0;

    document.getElementById('kpi-postos').textContent = postos.length;
    document.getElementById('kpi-postos-fonte').textContent = '↑ ANP:' + anp + ' OSM:' + osm;

    if (postosData.estatisticas?.mediaPreco) {
      document.getElementById('kpi-preco-medio').textContent = 'R$ ' + postosData.estatisticas.mediaPreco.toFixed(2);
      document.getElementById('kpi-preco-label').textContent = postosData.estatisticas.cidade + ', ' + postosData.estatisticas.uf;
      document.getElementById('kpi-preco-raio').textContent = 'raio 15 km · ' + adminCidade;
    } else {
      document.getElementById('kpi-preco-label').textContent = adminCidade + ', ' + adminUF;
    }

    document.getElementById('kpi-reportes').textContent = collab;
    document.getElementById('stat-anp').textContent = anp;
    document.getElementById('stat-osm').textContent = osm;
    document.getElementById('stat-collab').textContent = collab;

    if (assinRes.ok) {
      const ad = await assinRes.json();
      document.getElementById('kpi-assinaturas-ativas').textContent = ad.ativas || 0;
      document.getElementById('kpi-assinaturas-label').textContent = (ad.ativas || 0) + ' ativas de ' + (ad.total || 0);
    }

    const total = Math.max(anp + osm, 1);
    const pAnp = Math.round(anp / total * 100), pOsm = Math.round(osm / total * 100), pC = Math.max(0, 100 - pAnp - pOsm);
    document.getElementById('fonte-bar').innerHTML = \`<div class="fonte-bar-anp" style="--pct:\${pAnp}%;flex:0 0 \${pAnp}%"></div><div class="fonte-bar-osm" style="--pct:\${pOsm}%;flex:0 0 \${pOsm}%"></div><div class="fonte-bar-collab" style="--pct:\${pC}%;flex:0 0 \${pC}%"></div>\`;

    const labels = postos.slice(0, 8).map(p => p.bandeira.substring(0, 8));
    const data = postos.slice(0, 8).map(p => p.preco || p.precos?.gasolina || 0);
    renderChart(labels, data, 'Gasolina');
    document.getElementById('last-update').textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-BR') + ' · ' + adminCidade;
  } catch(e) { console.error('Erro dashboard:', e); }
}

function renderChart(labels, data, label) {
  const ctx = document.getElementById('chart-precos').getContext('2d');
  if (chartPrecos) chartPrecos.destroy();
  chartPrecos = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'R$/L ' + label, data, backgroundColor: data.map((v, i) => i === 0 ? 'rgba(0,200,83,0.8)' : 'rgba(21,101,192,0.6)'), borderRadius: 8, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: false, min: 4, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 }, callback: v => 'R$ ' + v.toFixed(2) }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

async function toggleChart(combustivel, el) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const res = await fetch(\`/api/postos?lat=\${adminLat}&lng=\${adminLng}&combustivel=\${combustivel}&raio=15\`);
  const data = await res.json();
  const postos = data.postos || [];
  renderChart(postos.slice(0, 8).map(p => p.bandeira.substring(0, 8)), postos.slice(0, 8).map(p => p.preco || 0), combustivel.charAt(0).toUpperCase() + combustivel.slice(1));
}

// ── USUÁRIOS DO APP ──────────────────────────────────────────────────────────
async function carregarAppUsuarios() {
  const tbody = document.getElementById('app-usuarios-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Buscando usuários...</td></tr>';
  try {
    const res = await fetch('/api/admin/app-usuarios?key=' + encodeURIComponent(ADMIN_KEY));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    _appUsuarios = data.usuarios || [];

    document.getElementById('app-usuarios-count').textContent = _appUsuarios.length + ' usuário(s)';
    document.getElementById('au-total').textContent = _appUsuarios.length;
    document.getElementById('au-premium').textContent = _appUsuarios.filter(u => u.plano !== 'gratuito').length;
    document.getElementById('au-gratuito').textContent = _appUsuarios.filter(u => u.plano === 'gratuito').length;

    renderAppUsuarios(_appUsuarios);
  } catch(e) {
    tbody.innerHTML = \`<tr><td colspan="7" style="text-align:center;padding:40px;color:#FF5252"><i class="fas fa-exclamation-circle"></i> Erro: \${e.message}</td></tr>\`;
  }
}

function _auAvatar(u) {
  const letter = u.nome ? u.nome.charAt(0).toUpperCase() : '?';
  const fallback = '<div style="width:34px;height:34px;border-radius:50%;background:rgba(66,165,245,0.2);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#42A5F5;flex-shrink:0">' + letter + '</div>';
  if (u.foto) return '<img src="' + u.foto + '" onerror="this.parentNode.innerHTML=this.parentNode.dataset.fb" data-fb="' + encodeURIComponent(fallback) + '" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0">';
  return fallback;
}

function _auProviderBadge(p) {
  if (!p) return '<span style="font-size:10px;color:rgba(255,255,255,0.3)">—</span>';
  if (p.includes('google')) return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:#4285F4;background:rgba(66,133,244,0.12);padding:2px 7px;border-radius:100px"><i class="fab fa-google" style="font-size:9px"></i>Google</span>';
  if (p.includes('facebook')) return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:#1877F2;background:rgba(24,119,242,0.12);padding:2px 7px;border-radius:100px"><i class="fab fa-facebook" style="font-size:9px"></i>Facebook</span>';
  return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.07);padding:2px 7px;border-radius:100px"><i class="fas fa-envelope" style="font-size:9px"></i>E-mail</span>';
}

function _auMaskCpf(cpf) {
  if (!cpf) return '—';
  const c = cpf.replace(/\D/g, '');
  if (c.length !== 11) return cpf;
  return c.substring(0, 3) + '.***.***-' + c.substring(9);
}

function renderAppUsuarios(lista) {
  const tbody = document.getElementById('app-usuarios-tbody');
  const countEl = document.getElementById('au-result-count');
  if (countEl) countEl.textContent = lista.length + ' resultado(s)';
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:48px;color:rgba(255,255,255,0.3)">Nenhum usuário encontrado</td></tr>';
    return;
  }
  const fmtDate = (v) => { if (!v || v === '—') return '—'; try { return new Date(v).toLocaleDateString('pt-BR'); } catch { return v; } };
  const planoBadge = (p) => p && p !== 'gratuito' ? '<span class="badge badge-premium">👑 Premium</span>' : '<span class="badge badge-free">Free</span>';

  tbody.innerHTML = lista.map(u => {
    const nome = u.nome || '';
    const email = u.email || '';
    const cpfMask = _auMaskCpf(u.cpf);
    const localidade = [u.cidade, u.estado].filter(Boolean).join(' / ') || '—';
    const dataCadastro = fmtDate(u.criadoEm || u.loginEm);
    const uidSafe = (u.uid || '').replace(/'/g, '');
    return \`<tr class="tr-hover">
      <td>
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          \${_auAvatar(u)}
          <div style="min-width:0">
            <div style="font-size:12px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px" title="\${nome}">\${nome || '<span style="color:rgba(255,255,255,0.3);font-style:italic">Sem nome</span>'}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;margin-top:1px" title="\${email}">\${email || '<span style="font-style:italic">Sem e-mail</span>'}</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.2);font-family:monospace;margin-top:2px;cursor:pointer" onclick="copiarUID('\${uidSafe}')" title="Clique para copiar UID">\${uidSafe.substring(0,14)}…</div>
          </div>
        </div>
      </td>
      <td style="text-align:center"><span style="font-size:11px;font-family:monospace;color:rgba(255,255,255,0.5)">\${cpfMask}</span></td>
      <td style="text-align:center"><span style="font-size:11px;color:rgba(255,255,255,0.6)">\${localidade}</span></td>
      <td style="text-align:center">\${_auProviderBadge(u.provider)}</td>
      <td style="text-align:center">\${planoBadge(u.plano)}</td>
      <td style="text-align:center;font-size:11px;color:rgba(255,255,255,0.4)">\${dataCadastro}</td>
      <td style="text-align:center">
        <div style="display:inline-flex;gap:5px;flex-wrap:nowrap;justify-content:center">
          <button class="btn-info" data-uid="\${uidSafe}" onclick="verDetalheUsuario(this.dataset.uid)" title="Detalhes"><i class="fas fa-eye"></i></button>
          <button class="btn-success" data-uid="\${uidSafe}" onclick="abrirModalAtivar(this.dataset.uid)" title="Ativar Premium"><i class="fas fa-crown"></i></button>
          <button class="btn-danger" data-uid="\${uidSafe}" onclick="banirUsuario(this.dataset.uid)" title="Banir"><i class="fas fa-ban"></i></button>
        </div>
      </td>
    </tr>\`;
  }).join('');
}

function filtrarAppUsuarios() {
  const q = (document.getElementById('au-search').value || '').toLowerCase().trim();
  const plano = document.getElementById('au-filtro-plano').value;
  const provider = document.getElementById('au-filtro-provider').value;
  const estado = document.getElementById('au-filtro-estado').value.toUpperCase();

  let lista = _appUsuarios;

  if (q) {
    lista = lista.filter(u =>
      (u.nome || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.cpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      (u.cidade || '').toLowerCase().includes(q) ||
      (u.uid || '').toLowerCase().includes(q)
    );
  }
  if (plano) {
    if (plano === 'premium') lista = lista.filter(u => u.plano && u.plano !== 'gratuito');
    else lista = lista.filter(u => !u.plano || u.plano === 'gratuito');
  }
  if (provider) lista = lista.filter(u => (u.provider || '').includes(provider));
  if (estado) lista = lista.filter(u => (u.estado || '').toUpperCase() === estado);

  renderAppUsuarios(lista);
}

function copiarUID(uid) {
  navigator.clipboard.writeText(uid).then(() => showToast('UID copiado!', 'ok')).catch(() => {});
}

let _uidAtual = '';
function abrirModalAtivar(uid) {
  _uidAtual = uid;
  const u = _appUsuarios.find(x => x.uid === uid) || _assinaturas.find(x => x.uid === uid);
  const label = (u && u.nome) ? u.nome : uid.substring(0, 18) + '…';
  document.getElementById('modal-ativar-desc').textContent = 'Ativar premium para: ' + label;
  document.getElementById('modal-ativar-dias').value = '30';
  document.getElementById('modal-ativar-plano').value = 'manual';
  document.getElementById('modal-ativar').style.display = 'flex';
}
function fecharModalAtivar() { document.getElementById('modal-ativar').style.display = 'none'; _uidAtual = ''; }

async function confirmarAtivarPremium() {
  if (!_uidAtual) return;
  const dias = parseInt(document.getElementById('modal-ativar-dias').value) || 30;
  const plano = document.getElementById('modal-ativar-plano').value;
  fecharModalAtivar();
  try {
    const res = await fetch('/api/admin/assinatura/' + encodeURIComponent(_uidAtual) + '/ativar?key=' + encodeURIComponent(ADMIN_KEY), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias, plano })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    showToast('✅ Premium ativado por ' + dias + ' dias!', 'ok');
    if (currentSection === 'app-usuarios') carregarAppUsuarios();
    if (currentSection === 'assinaturas') carregarAssinaturas();
  } catch(e) { showToast('❌ Erro: ' + e.message, 'err'); }
}

async function banirUsuario(uid) {
  const u = _appUsuarios.find(x => x.uid === uid);
  const label = (u && u.nome) ? u.nome : uid.substring(0, 18) + '…';
  if (!confirm('Banir usuário ' + label + '? Isso removerá a sessão e deslogará o usuário.')) return;
  try {
    const res = await fetch('/api/admin/app-usuarios/' + encodeURIComponent(uid) + '?key=' + encodeURIComponent(ADMIN_KEY), { method: 'DELETE' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    showToast('✅ Usuário banido!', 'ok');
    carregarAppUsuarios();
  } catch(e) { showToast('❌ Erro: ' + e.message, 'err'); }
}

function verDetalheUsuario(uid) {
  const u = _appUsuarios.find(x => x.uid === uid);
  if (!u) return;
  const fmtDate = (v) => { if (!v || v === '—') return '—'; try { return new Date(v).toLocaleString('pt-BR'); } catch { return v; } };
  const assin = u.assinatura;
  const veiculo = u.veiculo;
  const cpfFull = u.cpf ? u.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—';
  const localidade = [u.cidade, u.estado].filter(Boolean).join(' / ') || '—';
  document.getElementById('modal-detalhe-body').innerHTML = \`
    <div style="display:grid;gap:10px;font-size:13px">
      <div style="background:#0A1520;border-radius:10px;padding:14px;display:flex;align-items:center;gap:14px">
        \${u.foto ? '<img src="' + u.foto + '" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.remove()">' : '<div style="width:52px;height:52px;border-radius:50%;background:rgba(66,165,245,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#42A5F5;flex-shrink:0">' + (u.nome ? u.nome.charAt(0).toUpperCase() : '?') + '</div>'}
        <div>
          <div style="font-weight:800;font-size:15px;color:#fff">\${u.nome || '<em style="opacity:.4">Sem nome</em>'}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px">\${u.email || '—'}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px">\${u.telefone || '—'}</div>
        </div>
      </div>
      <div style="background:#0A1520;border-radius:10px;padding:12px">
        <div style="color:rgba(255,255,255,0.4);font-size:10px;font-weight:800;margin-bottom:8px">DADOS PESSOAIS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
          <div><span style="color:rgba(255,255,255,0.3)">CPF:</span> <span style="color:rgba(255,255,255,0.7);font-family:monospace">\${cpfFull}</span></div>
          <div><span style="color:rgba(255,255,255,0.3)">Localidade:</span> <span style="color:rgba(255,255,255,0.7)">\${localidade}</span></div>
          <div><span style="color:rgba(255,255,255,0.3)">Provider:</span> <span style="color:rgba(255,255,255,0.7)">\${u.provider || '—'}</span></div>
          <div><span style="color:rgba(255,255,255,0.3)">Cadastro:</span> <span style="color:rgba(255,255,255,0.7)">\${fmtDate(u.criadoEm)}</span></div>
        </div>
      </div>
      <div style="background:#0A1520;border-radius:10px;padding:12px">
        <div style="color:rgba(255,255,255,0.4);font-size:10px;font-weight:800;margin-bottom:6px">IDENTIFICAÇÃO</div>
        <div style="font-family:monospace;font-size:10px;color:#42A5F5;word-break:break-all;cursor:pointer" onclick="copiarUID('\${u.uid}')" title="Clique para copiar">\${u.uid} <i class="fas fa-copy" style="font-size:9px;opacity:.5"></i></div>
        <div style="margin-top:4px;color:rgba(255,255,255,0.4);font-size:10px">Device: \${u.deviceId || '—'}</div>
        <div style="margin-top:2px;color:rgba(255,255,255,0.4);font-size:10px">Último login: \${fmtDate(u.loginEm)}</div>
      </div>
      \${assin ? \`<div style="background:#0A1520;border-radius:10px;padding:12px">
        <div style="color:rgba(255,255,255,0.4);font-size:10px;font-weight:800;margin-bottom:6px">ASSINATURA</div>
        <div style="color:\${assin.status==='ACTIVE'?'#69F0AE':'#FF5252'};font-weight:800">\${assin.status}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:4px">Plano: \${assin.plano || '—'}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:11px">Ativada: \${fmtDate(assin.ativadaEm)}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:11px">Expira: \${fmtDate(assin.expiraEm)}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:11px">Pagamentos: \${assin.pagamentos || 0}</div>
      </div>\` : '<div style="background:#0A1520;border-radius:10px;padding:12px;color:rgba(255,255,255,0.3);font-size:12px">Sem assinatura ativa</div>'}
      \${veiculo ? \`<div style="background:#0A1520;border-radius:10px;padding:12px">
        <div style="color:rgba(255,255,255,0.4);font-size:10px;font-weight:800;margin-bottom:6px">VEÍCULO</div>
        <div style="color:rgba(255,255,255,0.85);font-weight:700">\${veiculo.marca || ''} \${veiculo.modelo || ''} \${veiculo.ano || ''}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:11px">Combustível: \${veiculo.combustivel || '—'}</div>
      </div>\` : ''}
    </div>
  \`;
  document.getElementById('modal-detalhe').style.display = 'flex';
}
function fecharModalDetalhe() { document.getElementById('modal-detalhe').style.display = 'none'; }

// ── DADOS & CONTATOS DOS USUÁRIOS ────────────────────────────────────────────
let _dadosUsuarios = [];

async function carregarDadosUsuarios() {
  const tbody = document.getElementById('dados-usuarios-tbody');
  const empty = document.getElementById('du-empty');
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Buscando dados...</td></tr>';
  if (empty) empty.style.display = 'none';
  try {
    const res = await fetch('/api/admin/usuarios-dados?key=' + encodeURIComponent(ADMIN_KEY));
    const data = await res.json();
    if (!res.ok) { showToast('Erro: ' + (data.erro || 'falha'), 'err'); return; }
    _dadosUsuarios = data.usuarios || [];
    document.getElementById('du-count').textContent = _dadosUsuarios.length + ' usuários';
    // KPIs por provider
    const google = _dadosUsuarios.filter(u => u.provider === 'google.com').length;
    const facebook = _dadosUsuarios.filter(u => u.provider === 'facebook.com').length;
    const outros = _dadosUsuarios.length - google - facebook;
    document.getElementById('du-total').textContent = _dadosUsuarios.length;
    document.getElementById('du-google').textContent = google;
    document.getElementById('du-facebook').textContent = facebook;
    document.getElementById('du-email').textContent = outros;
    renderDadosUsuarios(_dadosUsuarios);
  } catch(e) { showToast('Erro de conexão', 'err'); }
}

function renderDadosUsuarios(lista) {
  const tbody = document.getElementById('dados-usuarios-tbody');
  const empty = document.getElementById('du-empty');
  if (!lista.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = lista.map(u => {
    const providerLabel = u.provider === 'google.com'
      ? '<span class="provider-badge provider-google"><i class="fab fa-google"></i> Google</span>'
      : u.provider === 'facebook.com'
      ? '<span class="provider-badge provider-facebook"><i class="fab fa-facebook"></i> Facebook</span>'
      : u.provider === 'password' || u.provider === 'email'
      ? '<span class="provider-badge provider-email"><i class="fas fa-envelope"></i> E-mail</span>'
      : '<span class="provider-badge provider-unknown"><i class="fas fa-question"></i> ' + (u.provider || '?') + '</span>';
    const avatar = u.photo
      ? \`<img src="\${u.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.1)" onerror="this.style.display='none'">\`
      : \`<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,109,0,0.2);color:#FF6D00;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900">\${(u.name||'?').charAt(0).toUpperCase()}</div>\`;
    const loginData = u.ultimoLogin !== '—' ? new Date(u.ultimoLogin).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'2-digit' }) : '—';
    const cidade = u.cidade !== '—' ? (u.cidade + (u.estado !== '—' ? ', ' + u.estado : '')) : '—';
    const plano = u.plano === 'gratuito'
      ? '<span class="badge badge-free">Gratuito</span>'
      : '<span class="badge badge-premium">⭐ Premium</span>';
    return \`<tr class="tr-hover">
      <td>\${avatar}</td>
      <td style="font-weight:800;color:#fff">\${u.name || '<span style="color:rgba(255,255,255,0.3)">—</span>'}</td>
      <td style="color:rgba(255,255,255,0.7)">\${u.email || '—'}</td>
      <td style="color:rgba(255,255,255,0.7)">\${u.telefone !== '—' ? u.telefone : '<span style="color:rgba(255,255,255,0.2)">Não informado</span>'}</td>
      <td>\${providerLabel}</td>
      <td style="color:rgba(255,255,255,0.5);font-size:12px">\${cidade}</td>
      <td>\${plano}</td>
      <td style="color:rgba(255,255,255,0.4);font-size:11px">\${loginData}</td>
      <td><button class="btn-info" onclick="abrirModalEditarUsuario('\${u.uid}')"><i class="fas fa-pen"></i> Editar</button></td>
    </tr>\`;
  }).join('');
}

function filtrarDadosUsuarios() {
  const busca = (document.getElementById('du-search').value || '').toLowerCase();
  const provider = document.getElementById('du-filtro-provider').value;
  const filtrado = _dadosUsuarios.filter(u => {
    const matchBusca = !busca
      || (u.name||'').toLowerCase().includes(busca)
      || (u.email||'').toLowerCase().includes(busca)
      || (u.telefone||'').includes(busca);
    const matchProvider = !provider || u.provider === provider;
    return matchBusca && matchProvider;
  });
  renderDadosUsuarios(filtrado);
}

// ── Modal Editar Usuário ──────────────────────────────────────────────────────
let _editUid = null;

function abrirModalEditarUsuario(uid) {
  const u = _dadosUsuarios.find(x => x.uid === uid);
  if (!u) return;
  _editUid = uid;
  document.getElementById('modal-edit-uid-label').textContent = 'Usuário: ' + (u.name || u.email || uid);
  document.getElementById('modal-edit-uid-box').textContent = uid;
  document.getElementById('edit-name').value = u.name !== '—' ? (u.name || '') : '';
  document.getElementById('edit-email').value = u.email !== '—' ? (u.email || '') : '';
  document.getElementById('edit-telefone').value = u.telefone !== '—' ? (u.telefone || '') : '';
  document.getElementById('edit-cep').value = u.cep !== '—' ? (u.cep || '') : '';
  document.getElementById('edit-cidade').value = u.cidade !== '—' ? (u.cidade || '') : '';
  document.getElementById('edit-estado').value = u.estado !== '—' ? (u.estado || '') : '';
  // Limpar classes edited
  ['edit-name','edit-email','edit-telefone','edit-cep','edit-cidade','edit-estado'].forEach(id => {
    document.getElementById(id).classList.remove('edited');
  });
  document.getElementById('modal-editar-usuario').style.display = 'flex';
}

function fecharModalEditarUsuario() {
  document.getElementById('modal-editar-usuario').style.display = 'none';
  _editUid = null;
}

async function salvarEdicaoUsuario() {
  if (!_editUid) return;
  const btn = document.getElementById('btn-salvar-usuario');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  const payload = {
    name:      document.getElementById('edit-name').value.trim(),
    email:     document.getElementById('edit-email').value.trim(),
    telefone:  document.getElementById('edit-telefone').value.trim(),
    cep:       document.getElementById('edit-cep').value.trim(),
    cidade:    document.getElementById('edit-cidade').value.trim(),
    estado:    document.getElementById('edit-estado').value.trim().toUpperCase(),
  };
  try {
    const res = await fetch('/api/admin/usuarios/' + encodeURIComponent(_editUid) + '/editar?key=' + encodeURIComponent(ADMIN_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      showToast('✅ Dados salvos com sucesso!', 'ok');
      fecharModalEditarUsuario();
      await carregarDadosUsuarios();
    } else {
      showToast('Erro: ' + (data.erro || 'falha ao salvar'), 'err');
    }
  } catch(e) {
    showToast('Erro de conexão', 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Salvar Dados';
  }
}

// ── ASSINATURAS ──────────────────────────────────────────────────────────────
async function carregarAssinaturas() {
  const tbody = document.getElementById('assinaturas-tbody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Buscando assinaturas...</td></tr>';
  try {
    const res = await fetch('/api/admin/assinaturas?key=' + encodeURIComponent(ADMIN_KEY));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    _assinaturas = data.assinaturas || [];

    document.getElementById('as-total').textContent = data.total || 0;
    document.getElementById('as-ativas').textContent = data.ativas || 0;
    document.getElementById('as-canceladas').textContent = data.canceladas || 0;
    document.getElementById('as-expiradas').textContent = data.expiradas || 0;

    renderAssinaturas(_assinaturas);
  } catch(e) {
    tbody.innerHTML = \`<tr><td colspan="8" style="text-align:center;padding:40px;color:#FF5252"><i class="fas fa-exclamation-circle"></i> Erro: \${e.message}</td></tr>\`;
  }
}

function renderAssinaturas(lista) {
  const tbody = document.getElementById('assinaturas-tbody');
  const countEl = document.getElementById('as-result-count');
  if (countEl) countEl.textContent = lista.length + ' resultado(s)';
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)">Nenhuma assinatura encontrada</td></tr>';
    return;
  }
  const fmtDate = (v) => { if (!v) return '—'; try { return new Date(v).toLocaleDateString('pt-BR'); } catch { return v; } };
  const statusBadge = (s) => s === 'ACTIVE' ? '<span class="badge badge-active">✅ Ativa</span>' : s === 'CANCELLED' ? '<span class="badge badge-cancelled">❌ Cancelada</span>' : '<span class="badge badge-expired">⏰ Expirada</span>';
  const planoBadge = (p) => p ? \`<span class="badge badge-premium">\${p}</span>\` : '<span class="badge badge-free">—</span>';
  const isExpired = (ms) => ms && ms < Date.now();

  tbody.innerHTML = lista.map(a => {
    const expirado = isExpired(a.expiraEm);
    const efetivo = a.status === 'ACTIVE' && expirado ? 'EXPIRED' : a.status;
    const nome = a.nome || '';
    const email = a.email || '';
    const cpfMask = _auMaskCpf(a.cpf);
    const uidSafe = (a.uid || '').replace(/'/g, '');
    const avatarLetter = nome ? nome.charAt(0).toUpperCase() : '?';
    const fallbackAvatar = '<div style="width:30px;height:30px;border-radius:50%;background:rgba(255,214,0,0.15);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#FFD600;flex-shrink:0">' + avatarLetter + '</div>';
    const avatarHtml = a.foto
      ? '<img src="' + a.foto + '" onerror="this.parentNode.innerHTML=this.parentNode.dataset.fb" data-fb="' + encodeURIComponent(fallbackAvatar) + '" style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0">'
      : fallbackAvatar;
    return \`<tr class="tr-hover">
      <td>
        <div style="display:flex;align-items:center;gap:9px;min-width:0">
          \${avatarHtml}
          <div style="min-width:0">
            <div style="font-size:12px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px" title="\${nome}">\${nome || '<span style="color:rgba(255,255,255,0.3);font-style:italic">Sem nome</span>'}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px;margin-top:1px" title="\${email}">\${email || '<span style="font-style:italic">Sem e-mail</span>'}</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.2);font-family:monospace;margin-top:2px;cursor:pointer" onclick="copiarUID('\${uidSafe}')" title="Clique para copiar UID">\${uidSafe.substring(0,14)}…</div>
          </div>
        </div>
      </td>
      <td style="text-align:center"><span style="font-size:10px;font-family:monospace;color:rgba(255,255,255,0.45)">\${cpfMask}</span></td>
      <td style="text-align:center">\${planoBadge(a.plano)}</td>
      <td style="text-align:center">\${statusBadge(efetivo)}</td>
      <td style="text-align:center;font-size:11px;color:rgba(255,255,255,0.5)">\${fmtDate(a.ativadaEm)}</td>
      <td style="text-align:center;font-size:11px;\${expirado?'color:#FF5252':'color:#69F0AE'}">\${fmtDate(a.expiraEm)}</td>
      <td style="text-align:center;font-size:12px;color:rgba(255,255,255,0.6)">\${a.pagamentos || 0}</td>
      <td style="text-align:center">
        <div style="display:inline-flex;gap:5px;flex-wrap:nowrap;justify-content:center">
          \${efetivo === 'ACTIVE' ? '<button class="btn-danger" data-uid="' + uidSafe + '" onclick="cancelarAssinatura(this.dataset.uid)"><i class="fas fa-times"></i> Cancelar</button>' : ''}
          <button class="btn-success" data-uid="\${uidSafe}" onclick="abrirModalAtivar(this.dataset.uid)"><i class="fas fa-redo"></i> Reativar</button>
        </div>
      </td>
    </tr>\`;
  }).join('');
}

function filtrarAssinaturas() {
  const q = (document.getElementById('as-search').value || '').toLowerCase().trim();
  const status = document.getElementById('as-filtro').value;
  const plano = document.getElementById('as-filtro-plano').value;

  let lista = _assinaturas;

  if (q) {
    lista = lista.filter(a =>
      (a.nome || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.cpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      (a.uid || '').toLowerCase().includes(q)
    );
  }
  if (status) {
    const isExpired = (ms) => ms && ms < Date.now();
    lista = lista.filter(a => {
      const efetivo = a.status === 'ACTIVE' && isExpired(a.expiraEm) ? 'EXPIRED' : a.status;
      return efetivo === status;
    });
  }
  if (plano) lista = lista.filter(a => (a.plano || '') === plano);

  renderAssinaturas(lista);
}

async function cancelarAssinatura(uid) {
  const a = _assinaturas.find(x => x.uid === uid);
  const label = (a && a.nome) ? a.nome : uid.substring(0, 18) + '…';
  if (!confirm('Cancelar assinatura de ' + label + '?')) return;
  try {
    const res = await fetch('/api/admin/assinatura/' + encodeURIComponent(uid) + '/cancelar?key=' + encodeURIComponent(ADMIN_KEY), { method: 'POST' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    showToast('✅ Assinatura cancelada!', 'ok');
    carregarAssinaturas();
  } catch(e) { showToast('❌ Erro: ' + e.message, 'err'); }
}

// ── POSTOS PARCEIROS ─────────────────────────────────────────────────────────
// ── POSTOS PARCEIROS ─────────────────────────────────────────────────────────
async function carregarParceirosCadastrados() {
  const tbody = document.getElementById('parceiros-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Buscando parceiros...</td></tr>';
  try {
    const res = await fetch('/api/admin/parceiros?key=' + encodeURIComponent(ADMIN_KEY));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    _parceiros = data.parceiros || [];
    document.getElementById('parceiros-count').textContent = _parceiros.length + ' parceiro(s)';
    filtrarParceiros();
  } catch(e) {
    tbody.innerHTML = \`<tr><td colspan="7" style="text-align:center;padding:40px;color:#FF5252"><i class="fas fa-exclamation-circle"></i> Erro: \${e.message}</td></tr>\`;
  }
}

function renderParceiros(lista) {
  const tbody = document.getElementById('parceiros-tbody');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:48px;color:rgba(255,255,255,0.3)"><i class="fas fa-store-slash" style="font-size:28px;display:block;margin-bottom:10px;opacity:0.3"></i>Nenhum posto encontrado com esses filtros</td></tr>';
    return;
  }
  const planoBadge = (p) => {
    // Busca nos planos dinâmicos do KV primeiro
    const planoObj = (_planosData || []).find(x => x.id === p);
    if (planoObj) {
      const cor = planoObj.cor || '#FF6D00';
      const emoji = planoObj.emoji || '';
      return \`<span style="background:\${cor}22;color:\${cor};padding:3px 9px;border-radius:100px;font-size:10px;font-weight:800;white-space:nowrap">\${emoji} \${planoObj.nome}</span>\`;
    }
    // Fallback para planos legado
    const mapLegado = { premium:'#FFD600', pro:'#FF6D00', basico:'#69F0AE', visibilidade:'#42A5F5', free:'#42A5F5', gratuito:'#42A5F5' };
    const cor = mapLegado[(p||'').toLowerCase()] || 'rgba(255,255,255,0.3)';
    return \`<span style="background:\${cor}22;color:\${cor};padding:3px 9px;border-radius:100px;font-size:10px;font-weight:800;text-transform:uppercase">\${p||'—'}</span>\`;
  };
  const statusBadge = (s) => {
    const map = { ativo:'#00C853', pendente:'#FFD600', suspenso:'#FF6D00', cancelado:'#FF5252' };
    const cor = map[(s||'').toLowerCase()] || 'rgba(255,255,255,0.3)';
    return \`<span style="background:\${cor}22;color:\${cor};padding:3px 8px;border-radius:100px;font-size:10px;font-weight:800">\${s||'—'}</span>\`;
  };
  const fmtDate = (v) => { if (!v || v === '—') return '—'; try { return new Date(v).toLocaleDateString('pt-BR'); } catch { return String(v); } };
  const fmtPreco = (v) => v > 0 ? 'R$ ' + Number(v).toFixed(2) : '—';

  tbody.innerHTML = lista.map(u => {
    const nomeEsc = (u.nomePosto||'').replace(/'/g, '&#39;');
    const pr = u.precos || {};
    const temPrecos = pr.gasolina > 0 || pr.etanol > 0 || pr.diesel > 0;
    const precosTag = temPrecos
      ? \`<div style="font-size:9px;color:rgba(255,165,0,0.8);margin-top:2px">⛽ G:\${fmtPreco(pr.gasolina)} E:\${fmtPreco(pr.etanol)}</div>\`
      : '';
    const dataExib = u.atualizadoEm && u.atualizadoEm !== '—' ? u.atualizadoEm : u.criadoEm;
    return \`<tr class="tr-hover">
      <td style="overflow:hidden">
        <div style="font-weight:800;color:#fff;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${u.nomePosto||'—'}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:1px;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">ID: \${u.id}</div>
        \${precosTag}
      </td>
      <td style="overflow:hidden">
        <div style="font-size:11px;color:rgba(255,255,255,0.55);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${u.email||'—'}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${u.tel !== '—' ? u.tel : (u.telTelemarketing !== '—' ? u.telTelemarketing : '—')}</div>
      </td>
      <td style="text-align:center">\${planoBadge(u.plano)}</td>
      <td style="text-align:center;overflow:hidden">
        <div style="font-size:11px;color:rgba(255,255,255,0.55);white-space:nowrap">\${u.cidade||'—'}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.3)">\${u.estado !== '—' ? u.estado : ''}\${u.bairro !== '—' ? ' · ' + u.bairro : ''}</div>
      </td>
      <td style="text-align:center">\${statusBadge(u.status)}</td>
      <td style="text-align:center;font-size:11px;color:rgba(255,255,255,0.4)">\${fmtDate(dataExib)}</td>
      <td style="text-align:center">
        <div style="display:inline-flex;gap:5px;justify-content:center">
          <button class="btn-info" data-pid="\${u.id}" onclick="abrirModalEditarParceiro(this.dataset.pid)" title="Editar posto"><i class="fas fa-pen"></i></button>
          <button class="btn-danger" data-pid="\${u.id}" data-pnome="\${nomeEsc}" onclick="deletarParceiro(this.dataset.pid, this.dataset.pnome)" title="Remover posto"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>\`;
  }).join('');
}

function filtrarParceiros() {
  const q       = (document.getElementById('pc-search').value || '').toLowerCase();
  const estado  = (document.getElementById('pc-filtro-estado').value || '').toLowerCase();
  const cidade  = (document.getElementById('pc-filtro-cidade').value || '').toLowerCase();
  const bairro  = (document.getElementById('pc-filtro-bairro').value || '').toLowerCase();
  const plano   = (document.getElementById('pc-filtro-plano').value || '').toLowerCase();
  const status  = (document.getElementById('pc-filtro-status').value || '').toLowerCase();

  const filtrado = _parceiros.filter(p => {
    if (q && !(
      (p.nomePosto||'').toLowerCase().includes(q) ||
      (p.email||'').toLowerCase().includes(q) ||
      (p.cnpj||'').toLowerCase().includes(q) ||
      (p.id||'').toLowerCase().includes(q)
    )) return false;
    if (estado && (p.estado||'').toLowerCase() !== estado) return false;
    if (cidade && !(p.cidade||'').toLowerCase().includes(cidade)) return false;
    if (bairro && !(p.bairro||'').toLowerCase().includes(bairro)) return false;
    if (plano  && (p.plano||'').toLowerCase() !== plano)  return false;
    if (status && (p.status||'').toLowerCase() !== status) return false;
    return true;
  });

  const temFiltro = q || estado || cidade || bairro || plano || status;
  const resultEl = document.getElementById('pc-filtro-resultado');
  if (temFiltro) {
    resultEl.style.display = 'block';
    resultEl.textContent = filtrado.length + ' de ' + _parceiros.length + ' posto(s) encontrado(s)';
  } else {
    resultEl.style.display = 'none';
  }

  renderParceiros(filtrado);
}

function limparFiltrosParceiros() {
  document.getElementById('pc-search').value = '';
  document.getElementById('pc-filtro-estado').value = '';
  document.getElementById('pc-filtro-cidade').value = '';
  document.getElementById('pc-filtro-bairro').value = '';
  document.getElementById('pc-filtro-plano').value = '';
  document.getElementById('pc-filtro-status').value = '';
  document.getElementById('pc-filtro-resultado').style.display = 'none';
  renderParceiros(_parceiros);
}

// ─── Modal Editar Parceiro ────────────────────────────────────────────────────
let _parceiroEditandoId = null;

// Popula o select de planos do modal de posto com os planos B2B de postos
async function popularSelectPlanosModal(planoAtual) {
  const sel = document.getElementById('ep-plano');
  if (!sel) return;
  // Usa _planosData (planos de postos) — carrega da rota planos-posto se vazio
  let planos = _planosData || [];
  if (!planos.length) {
    try {
      const r = await fetch('/api/admin/planos-posto?key=' + encodeURIComponent(ADMIN_KEY));
      const d = await r.json();
      planos = d.planos || [];
      _planosData = planos;
    } catch {}
  }
  if (!planos.length) {
    // Fallback estático
    sel.innerHTML = '<option value="visibilidade">Visibilidade (Grátis)</option>'
      + '<option value="basico">Básico</option>'
      + '<option value="premium">Premium</option>'
      + '<option value="pro">Pro</option>';
  } else {
    sel.innerHTML = planos.filter(p => p.ativo !== false).map(p => {
      const valorFmt = p.valor === 0 ? 'Grátis' : 'R$ ' + (p.valor / 100).toFixed(2).replace('.',',') + '/' + (p.ciclo === 'monthly' ? 'mês' : p.ciclo === 'yearly' ? 'ano' : p.ciclo === 'trial' ? 'teste' : '∞');
      return '<option value="' + p.id + '">' + (p.emoji || '') + ' ' + p.nome + ' — ' + valorFmt + '</option>';
    }).join('');
  }
  if (planoAtual) sel.value = planoAtual;
  if (!sel.value && sel.options.length) sel.value = sel.options[0].value;
  // Atualiza preview logo após popular
  epAtualizarPreviewPlano();
}

// Atualiza o preview visual de benefícios ao trocar o plano no modal do posto
function epAtualizarPreviewPlano() {
  const sel     = document.getElementById('ep-plano');
  const preview = document.getElementById('ep-plano-preview');
  const vazio   = document.getElementById('ep-plano-vazio');
  if (!sel || !preview || !vazio) return;

  const planoId = sel.value;
  const plano   = (_planosData || []).find(x => x.id === planoId);

  if (!plano) {
    preview.style.display = 'none';
    vazio.style.display   = 'block';
    return;
  }

  vazio.style.display   = 'none';
  preview.style.display = 'block';

  const cor        = plano.cor || '#FF6D00';
  const beneficios = Array.isArray(plano.beneficios) ? plano.beneficios : [];
  const features   = Array.isArray(plano.features)   ? plano.features   : [];
  const valorFmt   = plano.valor === 0 ? 'Grátis' : 'R$ ' + (plano.valor / 100).toFixed(2).replace('.', ',');
  const cicloLabel = { forever:'para sempre', monthly:'/mês', yearly:'/ano', trial:'período de teste' };
  const cicloFmt   = cicloLabel[plano.ciclo] || plano.ciclo;

  // Badge de período
  let periodoBadge = '';
  if (plano.ciclo === 'trial' && plano.diasTeste > 0) {
    periodoBadge = '<span style="background:rgba(255,214,0,0.15);color:#FFD600;border:1px solid rgba(255,214,0,0.3);border-radius:100px;padding:2px 10px;font-size:10px;font-weight:800">⏱️ ' + plano.diasTeste + ' dias de teste</span>';
  } else if (plano.ciclo === 'forever') {
    periodoBadge = '<span style="background:rgba(0,200,83,0.12);color:#00C853;border:1px solid rgba(0,200,83,0.25);border-radius:100px;padding:2px 10px;font-size:10px;font-weight:800">♾️ Para sempre</span>';
  } else if (plano.valor > 0) {
    periodoBadge = '<span style="background:rgba(66,165,245,0.1);color:#42A5F5;border:1px solid rgba(66,165,245,0.2);border-radius:100px;padding:2px 10px;font-size:10px;font-weight:800">💳 ' + cicloFmt + '</span>';
  }

  // Benefícios fixos do plano
  const bAtivos = BENEFICIOS_POSTO.filter(b => beneficios.includes(b.id));
  const bHTML = bAtivos.length > 0
    ? bAtivos.map(b =>
        '<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:rgba(255,255,255,0.8)">'
        + '<i class="' + b.icon + '" style="color:' + cor + ';width:14px;text-align:center;font-size:11px;flex-shrink:0"></i>'
        + '<span>' + b.label + '</span>'
        + '</div>'
      ).join('')
    : '';

  // Features extras (legado)
  const fAtivos = features.filter(f => f.incluido);
  const fHTML = fAtivos.length > 0
    ? fAtivos.map(f =>
        '<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:rgba(255,255,255,0.65)">'
        + '<i class="fas fa-check" style="color:' + cor + ';width:14px;text-align:center;font-size:10px;flex-shrink:0"></i>'
        + '<span>' + f.texto + '</span>'
        + '</div>'
      ).join('')
    : '';

  const totalBeneficios = bAtivos.length + fAtivos.length;

  preview.innerHTML =
    // Cabeçalho do plano
    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">'
    + '<div style="display:flex;align-items:center;gap:10px">'
    +   '<div style="font-size:28px;line-height:1">' + (plano.emoji || '📦') + '</div>'
    +   '<div>'
    +     '<div style="font-size:14px;font-weight:900;color:#fff">' + plano.nome + '</div>'
    +     '<div style="font-size:18px;font-weight:900;color:' + cor + ';line-height:1.2">' + valorFmt
    +       (plano.valor > 0 ? '<span style="font-size:11px;color:rgba(255,255,255,0.35)"> ' + cicloFmt + '</span>' : '')
    +     '</div>'
    +   '</div>'
    + '</div>'
    + periodoBadge
    + '</div>'
    // Benefícios
    + (totalBeneficios > 0
      ? '<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:12px">'
        + '<div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Benefícios incluídos</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' + bHTML + fHTML + '</div>'
        + '</div>'
      : '<div style="color:rgba(255,255,255,0.25);font-size:11px;font-style:italic;text-align:center;padding:8px">Nenhum benefício configurado neste plano</div>'
    )
    ;
}

// Navega para a aba de Produtos & Planos e fecha o modal do posto
function irParaGerenciarPlanos() {
  fecharModalParceiro();
  setTimeout(() => {
    const navBtn = document.getElementById('nav-planos');
    if (navBtn) navBtn.click();
  }, 150);
}

// Navega para Produtos & Planos e abre o modal de edição do plano específico
function irParaEditarPlano(planoId) {
  fecharModalParceiro();
  setTimeout(() => {
    const navBtn = document.getElementById('nav-planos');
    if (navBtn) navBtn.click();
    setTimeout(() => { abrirModalEditarPlano(planoId); }, 400);
  }, 150);
}

function abrirModalEditarParceiro(id) {
  const p = _parceiros.find(x => x.id === id);
  if (!p) return;
  _parceiroEditandoId = id;
  const pr = p.precos || {};
  const end = p.endereco || {};

  document.getElementById('ep-id-display').textContent = 'ID: ' + id;
  document.getElementById('ep-nomePosto').value          = p.nomePosto        !== '—' ? (p.nomePosto        || '') : '';
  document.getElementById('ep-email').value              = p.email            !== '—' ? (p.email            || '') : '';
  document.getElementById('ep-tel').value                = p.tel              !== '—' ? (p.tel              || '') : '';
  document.getElementById('ep-telTelemarketing').value   = p.telTelemarketing !== '—' ? (p.telTelemarketing || '') : '';
  document.getElementById('ep-cnpj').value               = p.cnpj             !== '—' ? (p.cnpj             || '') : '';
  document.getElementById('ep-status').value             = p.status           || 'pendente';
  // Bandeira — select
  const epBand = document.getElementById('ep-bandeira');
  const bandVal = p.bandeira !== '—' ? (p.bandeira || '') : '';
  for (let o of epBand.options) { if (o.value === bandVal || o.text === bandVal) { o.selected = true; break; } }
  // Endereço
  document.getElementById('ep-cep').value    = end.cep    || (p.cep    !== '—' ? (p.cep    || '') : '');
  document.getElementById('ep-rua').value    = end.rua    || (p.rua    !== '—' ? (p.rua    || '') : '');
  document.getElementById('ep-num').value    = end.numero || '';
  document.getElementById('ep-bairro').value = end.bairro || (p.bairro !== '—' ? (p.bairro || '') : '');
  document.getElementById('ep-cidade').value = end.cidade || (p.cidade !== '—' ? (p.cidade || '') : '');
  const epEst = document.getElementById('ep-estado');
  const estVal = end.estado || (p.estado !== '—' ? (p.estado || '') : '');
  for (let o of epEst.options) { if (o.value === estVal || o.text === estVal) { o.selected = true; break; } }
  // Lat / Lng
  document.getElementById('ep-lat').value = p.lat ? String(p.lat) : '';
  document.getElementById('ep-lng').value = p.lng ? String(p.lng) : '';
  // Mapa — se tem coords, mostrar
  const epMapaWrap = document.getElementById('ep-mapa-wrap');
  epMapaWrap.style.display = 'none';
  document.getElementById('ep-geo-status').textContent = '';
  if (p.lat && p.lng) {
    _epAtualizarMapa(p.lat, p.lng, [end.rua || p.rua, end.numero, end.cidade || p.cidade].filter(Boolean).join(', '));
  }
  document.getElementById('ep-seloVerificado').checked   = !!p.seloVerificado;
  document.getElementById('ep-pinDourado').checked       = !!p.pinDourado;
  document.getElementById('ep-topoLista').checked        = !!p.topoLista;
  document.getElementById('ep-cuponsAtivos').checked     = !!p.cuponsAtivos;
  // Preços
  document.getElementById('ep-preco-gasolina').value          = pr.gasolina          > 0 ? pr.gasolina          : '';
  document.getElementById('ep-preco-gasolinaAditivada').value = pr.gasolinaAditivada > 0 ? pr.gasolinaAditivada : '';
  document.getElementById('ep-preco-etanol').value            = pr.etanol            > 0 ? pr.etanol            : '';
  document.getElementById('ep-preco-diesel').value            = pr.diesel            > 0 ? pr.diesel            : '';
  document.getElementById('ep-preco-dieselS10').value         = pr.dieselS10         > 0 ? pr.dieselS10         : '';
  document.getElementById('ep-preco-gnv').value               = pr.gnv               > 0 ? pr.gnv               : '';

  popularSelectPlanosModal(p.plano || '');
  document.getElementById('ep-deletar-btn').style.display = (id === 'p_teste') ? 'none' : 'inline-flex';
  document.getElementById('modal-parceiro-edit').style.display = 'block';
  document.getElementById('modal-parceiro-edit').scrollTop = 0;
}

// ── Helpers de formatação (aplicados no onblur) ───────────
// oninput: APENAS filtra não-dígitos — sem reformatar durante digitação
// onblur:  aplica máscara completa — sem bug de cursor
function _fmtCnpj(raw) {
  const v = (raw||'').replace(/\D/g,'').slice(0,14);
  if (v.length === 14) return v.slice(0,2)+'.'+v.slice(2,5)+'.'+v.slice(5,8)+'/'+v.slice(8,12)+'-'+v.slice(12);
  return v;
}
function _fmtCep(raw) {
  const v = (raw||'').replace(/\D/g,'').slice(0,8);
  return v.length === 8 ? v.slice(0,5)+'-'+v.slice(5) : v;
}
function _fmtTel(raw) {
  const v = (raw||'').replace(/\D/g,'').slice(0,11);
  if (v.length === 11) return '('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
  if (v.length === 10) return '('+v.slice(0,2)+') '+v.slice(2,6)+'-'+v.slice(6);
  return v;
}
// oninput — só dígitos, sem reformatar
function epMaskCnpj(inp) { inp.value = inp.value.replace(/\D/g,'').slice(0,14); }
function epBlurCnpj(inp)  { inp.value = _fmtCnpj(inp.value); }
function epMaskCep(inp)   { inp.value = inp.value.replace(/\D/g,'').slice(0,8); }
function epBlurCep(inp)   { inp.value = _fmtCep(inp.value); }

async function epBuscarCep() {
  const cep = (document.getElementById('ep-cep').value||'').replace(/\D/g,'');
  if (cep.length !== 8) return;
  const stat = document.getElementById('ep-geo-status');
  stat.textContent = '🔍 Buscando CEP...';
  try {
    const r = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
    const d = await r.json();
    if (d.erro) { stat.textContent = '❌ CEP não encontrado.'; return; }
    document.getElementById('ep-rua').value    = d.logradouro || '';
    document.getElementById('ep-bairro').value = d.bairro     || '';
    document.getElementById('ep-cidade').value = d.localidade || '';
    const epEst = document.getElementById('ep-estado');
    for (let o of epEst.options) { if (o.value === d.uf || o.text === d.uf) { o.selected = true; break; } }
    stat.textContent = '✅ CEP encontrado. Adicione o número e clique em Localizar.';
    stat.style.color = '#69F0AE';
  } catch { stat.textContent = '❌ Erro ao buscar CEP.'; }
}

async function epGeocodificar() {
  const rua    = document.getElementById('ep-rua').value.trim();
  const num    = document.getElementById('ep-num').value.trim();
  const cidade = document.getElementById('ep-cidade').value.trim();
  const estado = document.getElementById('ep-estado').value.trim();
  const stat   = document.getElementById('ep-geo-status');
  if (!rua || !cidade) { stat.textContent = '⚠️ Preencha a rua e cidade antes de localizar.'; stat.style.color='#FF5252'; return; }
  const endStr = [rua, num, cidade, estado, 'Brasil'].filter(Boolean).join(', ');
  stat.textContent = '🔍 Geocodificando...'; stat.style.color = 'rgba(255,255,255,0.4)';
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(endStr);
    const r = await fetch(url, { headers: { 'Accept-Language':'pt-BR' } });
    const d = await r.json();
    if (!d.length) { stat.textContent = '❌ Endereço não localizado. Tente ajustar a rua ou cidade.'; stat.style.color='#FF5252'; return; }
    const lat = parseFloat(d[0].lat);
    const lng = parseFloat(d[0].lon);
    document.getElementById('ep-lat').value = lat.toFixed(6);
    document.getElementById('ep-lng').value = lng.toFixed(6);
    stat.textContent = '✅ Localizado: ' + lat.toFixed(5) + ', ' + lng.toFixed(5);
    stat.style.color = '#69F0AE';
    _epAtualizarMapa(lat, lng, endStr);
  } catch(e) { stat.textContent = '❌ Erro: ' + e.message; stat.style.color = '#FF5252'; }
}

function _epAtualizarMapa(lat, lng, label) {
  const wrap = document.getElementById('ep-mapa-wrap');
  const frame = document.getElementById('ep-mapa-frame');
  const lbl = document.getElementById('ep-mapa-label');
  if (!wrap || !frame) return;
  frame.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
    (lng-0.003) + '%2C' + (lat-0.003) + '%2C' + (lng+0.003) + '%2C' + (lat+0.003) +
    '&layer=mapnik&marker=' + lat + '%2C' + lng;
  if (lbl) lbl.textContent = label || 'Localização confirmada';
  wrap.style.display = 'block';
}

function fecharModalParceiro() {
  document.getElementById('modal-parceiro-edit').style.display = 'none';
  document.getElementById('ep-convite-area').style.display = 'none';
  document.getElementById('ep-convite-link').value = '';
  _parceiroEditandoId = null;
}

async function salvarParceiroModal() {
  if (!_parceiroEditandoId) return;
  const btn = document.querySelector('#modal-parceiro-edit button[onclick="salvarParceiroModal()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; }

  const fv = (id) => document.getElementById(id).value.trim();
  const fn = (id) => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? 0 : v; };

  // Derivar flags de configuração a partir dos benefícios do plano selecionado
  const planoSel   = document.getElementById('ep-plano').value;
  const planoObj   = (_planosData || []).find(x => x.id === planoSel);
  const bPlano     = Array.isArray(planoObj?.beneficios) ? planoObj.beneficios : [];
  const temBeneficio = (id) => bPlano.includes(id);

  const latVal = fv('ep-lat');
  const lngVal = fv('ep-lng');
  const body = {
    nomePosto:        fv('ep-nomePosto'),
    email:            fv('ep-email'),
    tel:              fv('ep-tel'),
    telTelemarketing: fv('ep-telTelemarketing'),
    bandeira:         document.getElementById('ep-bandeira').value,
    cnpj:             fv('ep-cnpj'),
    plano:            planoSel,
    status:           document.getElementById('ep-status').value,
    // Endereço estruturado
    endereco: {
      cep:    fv('ep-cep'),
      rua:    fv('ep-rua'),
      numero: fv('ep-num'),
      bairro: fv('ep-bairro'),
      cidade: fv('ep-cidade'),
      estado: document.getElementById('ep-estado').value
    },
    // Manter campos legados para compatibilidade
    cidade:   fv('ep-cidade'),
    estado:   document.getElementById('ep-estado').value,
    bairro:   fv('ep-bairro'),
    // Flags derivadas automaticamente dos benefícios do plano
    seloVerificado:   temBeneficio('selo_verificado'),
    pinDourado:       temBeneficio('pin_dourado'),
    topoLista:        temBeneficio('topo_lista'),
    cuponsAtivos:     temBeneficio('cupons_ativos'),
    notificacoesAtivas: temBeneficio('notificacoes'),
    precos: {
      gasolina:          fn('ep-preco-gasolina'),
      gasolinaAditivada: fn('ep-preco-gasolinaAditivada'),
      etanol:            fn('ep-preco-etanol'),
      diesel:            fn('ep-preco-diesel'),
      dieselS10:         fn('ep-preco-dieselS10'),
      gnv:               fn('ep-preco-gnv'),
    }
  };
  if (latVal && lngVal) { body.lat = parseFloat(latVal); body.lng = parseFloat(lngVal); }

  try {
    const res = await fetch('/api/admin/parceiros/' + encodeURIComponent(_parceiroEditandoId) + '?key=' + encodeURIComponent(ADMIN_KEY), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || data.erro) throw new Error(data.erro || 'Erro ao salvar');
    showToast('✅ Posto atualizado com sucesso!', 'ok');
    fecharModalParceiro();
    await carregarParceirosCadastrados();
  } catch(e) {
    showToast('❌ Erro: ' + e.message, 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Salvar'; }
  }
}

async function gerarConviteParceiro() {
  if (!_parceiroEditandoId) { showToast('⚠️ Preencha os dados do posto primeiro', ''); return; }
  const btn = document.getElementById('ep-convite-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; }
  try {
    // 1. Salvar o posto automaticamente antes de gerar o convite
    const fv = (id) => (document.getElementById(id)||{value:''}).value.trim();
    const fn = (id) => { const v = parseFloat((document.getElementById(id)||{value:'0'}).value); return isNaN(v) ? 0 : v; };
    const planoSel2  = (document.getElementById('ep-plano')||{value:''}).value;
    const planoObj2  = (_planosData || []).find(x => x.id === planoSel2);
    const bPlano2    = Array.isArray(planoObj2?.beneficios) ? planoObj2.beneficios : [];
    const tem2 = (id) => bPlano2.includes(id);
    const body = {
      nomePosto: fv('ep-nomePosto'), email: fv('ep-email'), tel: fv('ep-tel'),
      telTelemarketing: fv('ep-telTelemarketing'), cidade: fv('ep-cidade'),
      estado: (document.getElementById('ep-estado')||{value:''}).value,
      bairro: fv('ep-bairro'), bandeira: fv('ep-bandeira'), cnpj: fv('ep-cnpj'),
      plano:  planoSel2,
      status: (document.getElementById('ep-status')||{value:'ativo'}).value,
      seloVerificado:    tem2('selo_verificado'),
      pinDourado:        tem2('pin_dourado'),
      topoLista:         tem2('topo_lista'),
      cuponsAtivos:      tem2('cupons_ativos'),
      notificacoesAtivas: tem2('notificacoes'),
      precos: {
        gasolina: fn('ep-preco-gasolina'), gasolinaAditivada: fn('ep-preco-gasolinaAditivada'),
        etanol: fn('ep-preco-etanol'), diesel: fn('ep-preco-diesel'),
        dieselS10: fn('ep-preco-dieselS10'), gnv: fn('ep-preco-gnv'),
      }
    };
    const resSalvar = await fetch('/api/admin/parceiros/' + encodeURIComponent(_parceiroEditandoId) + '?key=' + encodeURIComponent(ADMIN_KEY), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const dataSalvar = await resSalvar.json();
    if (!resSalvar.ok || dataSalvar.erro) throw new Error(dataSalvar.erro || 'Erro ao salvar posto');

    // 2. Agora gerar o convite
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando convite...';
    const res = await fetch('/api/admin/parceiros/' + encodeURIComponent(_parceiroEditandoId) + '/convite?key=' + encodeURIComponent(ADMIN_KEY), { method: 'POST' });
    const data = await res.json();
    if (!res.ok || data.erro) throw new Error(data.erro || 'Erro ao gerar convite');

    // 3. Mostrar link gerado
    const area = document.getElementById('ep-convite-area');
    document.getElementById('ep-convite-link').value = data.link;
    area.style.display = 'block';
    area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast('✅ Posto salvo e convite gerado!', 'ok');
    carregarParceirosCadastrados();
  } catch(e) {
    showToast('❌ Erro: ' + e.message, 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gerar Convite'; }
  }
}

function copiarConvite() {
  const link = document.getElementById('ep-convite-link').value;
  if (!link) return;
  navigator.clipboard.writeText(link).then(() => showToast('✅ Link copiado!', 'ok')).catch(() => {
    document.getElementById('ep-convite-link').select();
    document.execCommand('copy');
    showToast('✅ Link copiado!', 'ok');
  });
}

function compartilharWhatsApp() {
  const link = document.getElementById('ep-convite-link').value;
  if (!link) return;
  const p = _parceiros.find(x => x.id === _parceiroEditandoId);
  const nome = p ? p.nomePosto : 'seu posto';
  const texto = 'Ola! ' + nome + ' foi cadastrado no RotaPosto. Acesse o link abaixo para confirmar seu cadastro e baixar o app: ' + link;
  window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
}

async function deletarParceiroModal() {
  if (!_parceiroEditandoId) return;
  const p = _parceiros.find(x => x.id === _parceiroEditandoId);
  await deletarParceiro(_parceiroEditandoId, p ? p.nomePosto : _parceiroEditandoId);
  fecharModalParceiro();
}

async function deletarParceiro(id, nome) {
  if (id === 'p_teste') { showToast('⚠️ Posto de teste nao pode ser removido', ''); return; }
  if (!confirm('Remover o posto "' + nome + '"? Esta acao e irreversivel.')) return;
  try {
    const res = await fetch('/api/admin/postos/' + encodeURIComponent(id) + '?key=' + encodeURIComponent(ADMIN_KEY), { method: 'DELETE' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    showToast('✅ Posto removido!', 'ok');
    carregarParceirosCadastrados();
  } catch(e) { showToast('❌ Erro: ' + e.message, 'err'); }
}

// ─── Busca ANP ───────────────────────────────────────────────────────────────
let _anpResultados = [];

// Mapa completo UF → municípios (382 cidades da base ANP com preços)
const ANP_MUNICIPIOS_POR_UF = {
  AC: ["ACRELANDIA", "ASSIS BRASIL", "BRASILEIA", "BUJARI", "CAPIXABA", "CRUZEIRO DO SUL", "EPITACIOLANDIA", "FEIJO", "JORDAO", "MANCIO LIMA", "MANOEL URBANO", "MARECHAL THAUMATURGO", "PLACIDO DE CASTRO", "PORTO ACRE", "PORTO WALTER", "RIO BRANCO", "RODRIGUES ALVES", "SANTA ROSA DO PURUS", "SENA MADUREIRA", "SENADOR GUIOMARD", "TARAUACA", "XAPURI"],
  AL: ["AGUA BRANCA", "ANADIA", "ARAPIRACA", "ATALAIA", "BARRA DE SANTO ANTONIO", "BARRA DE SAO MIGUEL", "BATALHA", "BELEM", "BELO MONTE", "BOCA DA MATA", "BRANQUINHA", "CACIMBINHAS", "CAJUEIRO", "CAMPESTRE", "CAMPO ALEGRE", "CAMPO GRANDE", "CANAPI", "CAPELA", "CARNEIROS", "CHA PRETA", "COITE DO NOIA", "COLONIA LEOPOLDINA", "COQUEIRO SECO", "CORURIPE", "CRAIBAS", "DELMIRO GOUVEIA", "DOIS RIACHOS", "ESTRELA DE ALAGOAS", "FEIRA GRANDE", "FELIZ DESERTO", "FLEXEIRAS", "GIRAU DO PONCIANO", "IBATEGUARA", "IGACI", "IGREJA NOVA", "INHAPI", "JACARE DOS HOMENS", "JACUIPE", "JAPARATINGA", "JARAMATAIA", "JEQUIA DA PRAIA", "JOAQUIM GOMES", "JUNDIA", "JUNQUEIRO", "LAGOA DA CANOA", "LIMOEIRO DE ANADIA", "MACEIO", "MAJOR ISIDORO", "MAR VERMELHO", "MARAGOGI", "MARAVILHA", "MARECHAL DEODORO", "MARIBONDO", "MATA GRANDE", "MATRIZ DE CAMARAGIBE", "MESSIAS", "MINADOR DO NEGRAO", "MONTEIROPOLIS", "MURICI", "NOVO LINO", "OLHO D'AGUA DAS FLORES", "OLHO D'AGUA DO CASADO", "OLHO D'AGUA GRANDE", "OLIVENCA", "OURO BRANCO", "PALMEIRA DOS INDIOS", "PAO DE ACUCAR", "PARICONHA", "PARIPUEIRA", "PASSO DE CAMARAGIBE", "PAULO JACINTO", "PENEDO", "PIACABUCU", "PILAR", "PIRANHAS", "POCO DAS TRINCHEIRAS", "PORTO CALVO", "PORTO DE PEDRAS", "PORTO REAL DO COLEGIO", "QUEBRANGULO", "RIO LARGO", "ROTEIRO", "SANTA LUZIA DO NORTE", "SANTANA DO IPANEMA", "SANTANA DO MUNDAU", "SAO JOSE DA LAJE", "SAO JOSE DA TAPERA", "SAO LUIS DO QUITUNDE", "SAO MIGUEL DOS CAMPOS", "SAO MIGUEL DOS MILAGRES", "SAO SEBASTIAO", "SATUBA", "SENADOR RUI PALMEIRA", "TAQUARANA", "TEOTONIO VILELA", "TRAIPU", "UNIAO DOS PALMARES", "VICOSA"],
  AM: ["ALVARAES", "AMATURA", "ANAMA", "ANORI", "APUI", "ATALAIA DO NORTE", "AUTAZES", "BARCELOS", "BARREIRINHA", "BENJAMIN CONSTANT", "BERURI", "BOA VISTA DO RAMOS", "BOCA DO ACRE", "BORBA", "CAAPIRANGA", "CANUTAMA", "CARAUARI", "CAREIRO", "CAREIRO DA VARZEA", "COARI", "CODAJAS", "EIRUNEPE", "ENVIRA", "FONTE BOA", "GUAJARA", "HUMAITA", "IPIXUNA", "IRANDUBA", "ITACOATIARA", "ITAMARATI", "ITAPIRANGA", "JAPURA", "JURUA", "JUTAI", "LABREA", "MANACAPURU", "MANAQUIRI", "MANAUS", "MANICORE", "MARAA", "MAUES", "NHAMUNDA", "NOVA OLINDA DO NORTE", "NOVO AIRAO", "NOVO ARIPUANA", "PARINTINS", "PAUINI", "PRESIDENTE FIGUEIREDO", "RIO PRETO DA EVA", "SANTA ISABEL DO RIO NEGRO", "SANTO ANTONIO DO ICA", "SAO GABRIEL DA CACHOEIRA", "SAO PAULO DE OLIVENCA", "SAO SEBASTIAO DO UATUMA", "SILVES", "TABATINGA", "TAPAUA", "TEFE", "TONANTINS", "UARINI", "URUCARA", "URUCURITUBA"],
  AP: ["AMAPA", "CALCOENE", "CUTIAS", "FERREIRA GOMES", "ITAUBAL", "LARANJAL DO JARI", "MACAPA", "MAZAGAO", "OIAPOQUE", "PEDRA BRANCA DO AMAPARI", "PORTO GRANDE", "PRACUUBA", "SANTANA", "SERRA DO NAVIO", "TARTARUGALZINHO", "VITORIA DO JARI"],
  BA: ["ABAIRA", "ABARE", "ACAJUTIBA", "ADUSTINA", "AGUA FRIA", "AIQUARA", "ALAGOINHAS", "ALCOBACA", "ALMADINA", "AMARGOSA", "AMELIA RODRIGUES", "AMERICA DOURADA", "ANAGE", "ANDARAI", "ANDORINHA", "ANGICAL", "ANGUERA", "ANTAS", "ANTONIO CARDOSO", "ANTONIO GONCALVES", "APORA", "APUAREMA", "ARACAS", "ARACATU", "ARACI", "ARAMARI", "ARATACA", "ARATUIPE", "AURELINO LEAL", "BAIANOPOLIS", "BAIXA GRANDE", "BANZAE", "BARRA", "BARRA DA ESTIVA", "BARRA DO CHOCA", "BARRA DO MENDES", "BARRA DO ROCHA", "BARREIRAS", "BARRO ALTO", "BARRO PRETO", "BARROCAS", "BELMONTE", "BELO CAMPO", "BIRITINGA", "BOA NOVA", "BOA VISTA DO TUPIM", "BOM JESUS DA LAPA", "BOM JESUS DA SERRA", "BONINAL", "BONITO", "BOQUIRA", "BOTUPORA", "BREJOES", "BREJOLANDIA", "BROTAS DE MACAUBAS", "BRUMADO", "BUERAREMA", "BURITIRAMA", "CAATIBA", "CABACEIRAS DO PARAGUACU", "CACHOEIRA", "CACULE", "CAEM", "CAETANOS", "CAETITE", "CAFARNAUM", "CAIRU", "CALDEIRAO GRANDE", "CAMACAN", "CAMACARI", "CAMAMU", "CAMPO ALEGRE DE LOURDES", "CAMPO FORMOSO", "CANAPOLIS", "CANARANA", "CANAVIEIRAS", "CANDEAL", "CANDEIAS", "CANDIBA", "CANDIDO SALES", "CANSANCAO", "CANUDOS", "CAPELA DO ALTO ALEGRE", "CAPIM GROSSO", "CARAIBAS", "CARAVELAS", "CARDEAL DA SILVA", "CARINHANHA", "CASA NOVA", "CASTRO ALVES", "CATOLANDIA", "CATU", "CATURAMA", "CENTRAL", "CHORROCHO", "CICERO DANTAS", "CIPO", "COARACI", "COCOS", "CONCEICAO DA FEIRA", "CONCEICAO DO ALMEIDA", "CONCEICAO DO COITE", "CONCEICAO DO JACUIPE", "CONDE", "CONDEUBA", "CONTENDAS DO SINCORA", "CORACAO DE MARIA", "CORDEIROS", "CORIBE", "CORONEL JOAO SA", "CORRENTINA", "COTEGIPE", "CRAVOLANDIA", "CRISOPOLIS", "CRISTOPOLIS", "CRUZ DAS ALMAS", "CURACA", "DARIO MEIRA", "DIAS D'AVILA", "DOM BASILIO", "DOM MACEDO COSTA", "ELISIO MEDRADO", "ENCRUZILHADA", "ENTRE RIOS", "ERICO CARDOSO", "ESPLANADA", "EUCLIDES DA CUNHA", "EUNAPOLIS", "FATIMA", "FEIRA DA MATA", "FEIRA DE SANTANA", "FILADELFIA", "FIRMINO ALVES", "FLORESTA AZUL", "FORMOSA DO RIO PRETO", "GANDU", "GAVIAO", "GENTIO DO OURO", "GLORIA", "GONGOGI", "GOVERNADOR MANGABEIRA", "GUAJERU", "GUANAMBI", "GUARATINGA", "HELIOPOLIS", "IACU", "IBIASSUCE", "IBICARAI", "IBICOARA", "IBICUI", "IBIPEBA", "IBIPITANGA", "IBIQUERA", "IBIRAPITANGA", "IBIRAPUA", "IBIRATAIA", "IBITIARA", "IBITITA", "IBOTIRAMA", "ICHU", "IGAPORA", "IGRAPIUNA", "IGUAI", "ILHEUS", "INHAMBUPE", "IPECAETA", "IPIAU", "IPIRA", "IPUPIARA", "IRAJUBA", "IRAMAIA", "IRAQUARA", "IRARA", "IRECE", "ITABELA", "ITABERABA", "ITABUNA", "ITACARE", "ITAETE", "ITAGI", "ITAGIBA", "ITAGIMIRIM", "ITAGUACU DA BAHIA", "ITAJU DO COLONIA", "ITAJUIPE", "ITAMARAJU", "ITAMARI", "ITAMBE", "ITANHEM", "ITAPARICA", "ITAPE", "ITAPEBI", "ITAPETINGA", "ITAPICURU", "ITAPITANGA", "ITAQUARA", "ITARANTIM", "ITATIM", "ITIRUCU", "ITIUBA", "ITORORO", "ITUACU", "ITUBERA", "IUIU", "JABORANDI", "JACARACI", "JACOBINA", "JAGUAQUARA", "JAGUARARI", "JAGUARIPE", "JANDAIRA", "JEQUIE", "JEQUIRICA", "JEREMOABO", "JITAUNA", "JOAO DOURADO", "JUAZEIRO", "JUCURUCU", "JUSSARA", "JUSSARI", "JUSSIAPE", "LAFAIETE COUTINHO", "LAGOA REAL", "LAJE", "LAJEDAO", "LAJEDINHO", "LAJEDO DO TABOCAL", "LAMARAO", "LAPAO", "LAURO DE FREITAS", "LENCOIS", "LICINIO DE ALMEIDA", "LIVRAMENTO DE NOSSA SENHORA", "LUIS EDUARDO MAGALHAES", "MACAJUBA", "MACARANI", "MACAUBAS", "MACURURE", "MADRE DE DEUS", "MAETINGA", "MAIQUINIQUE", "MAIRI", "MALHADA", "MALHADA DE PEDRAS", "MANOEL VITORINO", "MANSIDAO", "MARACAS", "MARAGOGIPE", "MARAU", "MARCIONILIO SOUZA", "MASCOTE", "MATA DE SAO JOAO", "MATINA", "MEDEIROS NETO", "MIGUEL CALMON", "MILAGRES", "MIRANGABA", "MIRANTE", "MONTE SANTO", "MORPARA", "MORRO DO CHAPEU", "MORTUGABA", "MUCUGE", "MUCURI", "MULUNGU DO MORRO", "MUNDO NOVO", "MUNIZ FERREIRA", "MUQUEM DE SAO FRANCISCO", "MURITIBA", "MUTUIPE", "NAZARE", "NILO PECANHA", "NORDESTINA", "NOVA CANAA", "NOVA FATIMA", "NOVA IBIA", "NOVA ITARANA", "NOVA REDENCAO", "NOVA SOURE", "NOVA VICOSA", "NOVO HORIZONTE", "NOVO TRIUNFO", "OLINDINA", "OLIVEIRA DOS BREJINHOS", "OURICANGAS", "OUROLANDIA", "PALMAS DE MONTE ALTO", "PALMEIRAS", "PARAMIRIM", "PARATINGA", "PARIPIRANGA", "PAU BRASIL", "PAULO AFONSO", "PE DE SERRA", "PEDRAO", "PEDRO ALEXANDRE", "PIATA", "PILAO ARCADO", "PINDAI", "PINDOBACU", "PINTADAS", "PIRAI DO NORTE", "PIRIPA", "PIRITIBA", "PLANALTINO", "PLANALTO", "POCOES", "POJUCA", "PONTO NOVO", "PORTO SEGURO", "POTIRAGUA", "PRADO", "PRESIDENTE DUTRA", "PRESIDENTE JANIO QUADROS", "PRESIDENTE TANCREDO NEVES", "QUEIMADAS", "QUIJINGUE", "QUIXABEIRA", "RAFAEL JAMBEIRO", "REMANSO", "RETIROLANDIA", "RIACHAO DAS NEVES", "RIACHAO DO JACUIPE", "RIACHO DE SANTANA", "RIBEIRA DO AMPARO", "RIBEIRA DO POMBAL", "RIBEIRAO DO LARGO", "RIO DE CONTAS", "RIO DO ANTONIO", "RIO DO PIRES", "RIO REAL", "RODELAS", "RUY BARBOSA", "SALINAS DA MARGARIDA", "SALVADOR", "SANTA BARBARA", "SANTA BRIGIDA", "SANTA CRUZ CABRALIA", "SANTA CRUZ DA VITORIA", "SANTA INES", "SANTA LUZIA", "SANTA MARIA DA VITORIA", "SANTA RITA DE CASSIA", "SANTA TERESINHA", "SANTALUZ", "SANTANA", "SANTANOPOLIS", "SANTO AMARO", "SANTO ANTONIO DE JESUS", "SANTO ESTEVAO", "SAO DESIDERIO", "SAO DOMINGOS", "SAO FELIPE", "SAO FELIX", "SAO FELIX DO CORIBE", "SAO FRANCISCO DO CONDE", "SAO GABRIEL", "SAO GONCALO DOS CAMPOS", "SAO JOSE DA VITORIA", "SAO JOSE DO JACUIPE", "SAO MIGUEL DAS MATAS", "SAO SEBASTIAO DO PASSE", "SAPEACU", "SATIRO DIAS", "SAUBARA", "SAUDE", "SEABRA", "SEBASTIAO LARANJEIRAS", "SENHOR DO BONFIM", "SENTO SE", "SERRA DO RAMALHO", "SERRA DOURADA", "SERRA PRETA", "SERRINHA", "SERROLANDIA", "SIMOES FILHO", "SITIO DO MATO", "SITIO DO QUINTO", "SOBRADINHO", "SOUTO SOARES", "TABOCAS DO BREJO VELHO", "TANHACU", "TANQUE NOVO", "TANQUINHO", "TAPEROA", "TAPIRAMUTA", "TEIXEIRA DE FREITAS", "TEODORO SAMPAIO", "TEOFILANDIA", "TEOLANDIA", "TERRA NOVA", "TREMEDAL", "TUCANO", "UAUA", "UBAIRA", "UBAITABA", "UBATA", "UIBAI", "UMBURANAS", "UNA", "URANDI", "URUCUCA", "UTINGA", "VALENCA", "VALENTE", "VARZEA DA ROCA", "VARZEA DO POCO", "VARZEA NOVA", "VARZEDO", "VERA CRUZ", "VEREDA", "VITORIA DA CONQUISTA", "WAGNER", "WANDERLEY", "WENCESLAU GUIMARAES", "XIQUE-XIQUE"],
  CE: ["ABAIARA", "ACARAPE", "ACARAU", "ACOPIARA", "AIUABA", "ALCANTARAS", "ALTANEIRA", "ALTO SANTO", "AMONTADA", "ANTONINA DO NORTE", "APUIARES", "AQUIRAZ", "ARACATI", "ARACOIABA", "ARARENDA", "ARARIPE", "ARATUBA", "ARNEIROZ", "ASSARE", "AURORA", "BAIXIO", "BANABUIU", "BARBALHA", "BARREIRA", "BARRO", "BARROQUINHA", "BATURITE", "BEBERIBE", "BELA CRUZ", "BOA VIAGEM", "BREJO SANTO", "CAMOCIM", "CAMPOS SALES", "CANINDE", "CAPISTRANO", "CARIDADE", "CARIRE", "CARIRIACU", "CARIUS", "CARNAUBAL", "CASCAVEL", "CATARINA", "CATUNDA", "CAUCAIA", "CEDRO", "CHAVAL", "CHORO", "CHOROZINHO", "COREAU", "CRATEUS", "CRATO", "CROATA", "CRUZ", "DEPUTADO IRAPUAN PINHEIRO", "ERERE", "EUSEBIO", "FARIAS BRITO", "FORQUILHA", "FORTALEZA", "FORTIM", "FRECHEIRINHA", "GENERAL SAMPAIO", "GRACA", "GRANJA", "GRANJEIRO", "GROAIRAS", "GUAIUBA", "GUARACIABA DO NORTE", "HIDROLANDIA", "HORIZONTE", "IBARETAMA", "IBIAPINA", "IBICUITINGA", "ICAPUI", "ICO", "IGUATU", "INDEPENDENCIA", "IPAPORANGA", "IPAUMIRIM", "IPU", "IPUEIRAS", "IRACEMA", "IRAUCUBA", "ITAICABA", "ITAITINGA", "ITAPAJE", "ITAPIPOCA", "ITAPIUNA", "ITAREMA", "ITATIRA", "JAGUARETAMA", "JAGUARIBARA", "JAGUARIBE", "JAGUARUANA", "JARDIM", "JATI", "JIJOCA DE JERICOACOARA", "JUAZEIRO DO NORTE", "JUCAS", "LAVRAS DA MANGABEIRA", "LIMOEIRO DO NORTE", "MADALENA", "MARACANAU", "MARANGUAPE", "MARCO", "MARTINOPOLE", "MASSAPE", "MAURITI", "MERUOCA", "MILAGRES", "MILHA", "MIRAIMA", "MISSAO VELHA", "MOMBACA", "MONSENHOR TABOSA", "MORADA NOVA", "MORAUJO", "MORRINHOS", "MUCAMBO", "MULUNGU", "NOVA OLINDA", "NOVA RUSSAS", "NOVO ORIENTE", "OCARA", "OROS", "PACAJUS", "PACATUBA", "PACOTI", "PACUJA", "PALHANO", "PALMACIA", "PARACURU", "PARAIPABA", "PARAMBU", "PARAMOTI", "PEDRA BRANCA", "PENAFORTE", "PENTECOSTE", "PEREIRO", "PINDORETAMA", "PIQUET CARNEIRO", "PIRES FERREIRA", "PORANGA", "PORTEIRAS", "POTENGI", "POTIRETAMA", "QUITERIANOPOLIS", "QUIXADA", "QUIXELO", "QUIXERAMOBIM", "QUIXERE", "REDENCAO", "RERIUTABA", "RUSSAS", "SABOEIRO", "SALITRE", "SANTA QUITERIA", "SANTANA DO ACARAU", "SANTANA DO CARIRI", "SAO BENEDITO", "SAO GONCALO DO AMARANTE", "SAO JOAO DO JAGUARIBE", "SAO LUIS DO CURU", "SENADOR POMPEU", "SENADOR SA", "SOBRAL", "SOLONOPOLE", "TABULEIRO DO NORTE", "TAMBORIL", "TARRAFAS", "TAUA", "TEJUCUOCA", "TIANGUA", "TRAIRI", "TURURU", "UBAJARA", "UMARI", "UMIRIM", "URUBURETAMA", "URUOCA", "VARJOTA", "VARZEA ALEGRE", "VICOSA DO CEARA"],
  DF: ["BRASILIA"],
  ES: ["AFONSO CLAUDIO", "AGUA DOCE DO NORTE", "AGUIA BRANCA", "ALEGRE", "ALFREDO CHAVES", "ALTO RIO NOVO", "ANCHIETA", "APIACA", "ARACRUZ", "ATILIO VIVACQUA", "BAIXO GUANDU", "BARRA DE SAO FRANCISCO", "BOA ESPERANCA", "BOM JESUS DO NORTE", "BREJETUBA", "CACHOEIRO DE ITAPEMIRIM", "CARIACICA", "CASTELO", "COLATINA", "CONCEICAO DA BARRA", "CONCEICAO DO CASTELO", "DIVINO DE SAO LOURENCO", "DOMINGOS MARTINS", "DORES DO RIO PRETO", "ECOPORANGA", "FUNDAO", "GOVERNADOR LINDENBERG", "GUACUI", "GUARAPARI", "IBATIBA", "IBIRACU", "IBITIRAMA", "ICONHA", "IRUPI", "ITAGUACU", "ITAPEMIRIM", "ITARANA", "IUNA", "JAGUARE", "JERONIMO MONTEIRO", "JOAO NEIVA", "LARANJA DA TERRA", "LINHARES", "MANTENOPOLIS", "MARATAIZES", "MARECHAL FLORIANO", "MARILANDIA", "MIMOSO DO SUL", "MONTANHA", "MUCURICI", "MUNIZ FREIRE", "MUQUI", "NOVA VENECIA", "PANCAS", "PEDRO CANARIO", "PINHEIROS", "PIUMA", "PONTO BELO", "PRESIDENTE KENNEDY", "RIO BANANAL", "RIO NOVO DO SUL", "SANTA LEOPOLDINA", "SANTA MARIA DE JETIBA", "SANTA TERESA", "SAO DOMINGOS DO NORTE", "SAO GABRIEL DA PALHA", "SAO JOSE DO CALCADO", "SAO MATEUS", "SAO ROQUE DO CANAA", "SERRA", "SOORETAMA", "VARGEM ALTA", "VENDA NOVA DO IMIGRANTE", "VIANA", "VILA PAVAO", "VILA VALERIO", "VILA VELHA", "VITORIA"],
  GO: ["ABADIA DE GOIAS", "ABADIANIA", "ACREUNA", "ADELANDIA", "AGUA FRIA DE GOIAS", "AGUA LIMPA", "AGUAS LINDAS DE GOIAS", "ALEXANIA", "ALOANDIA", "ALTO HORIZONTE", "ALTO PARAISO DE GOIAS", "ALVORADA DO NORTE", "AMARALINA", "AMERICANO DO BRASIL", "AMORINOPOLIS", "ANAPOLIS", "ANHANGUERA", "ANICUNS", "APARECIDA DE GOIANIA", "APARECIDA DO RIO DOCE", "APORE", "ARACU", "ARAGARCAS", "ARAGOIANIA", "ARAGUAPAZ", "ARENOPOLIS", "ARUANA", "AURILANDIA", "AVELINOPOLIS", "BALIZA", "BARRO ALTO", "BELA VISTA DE GOIAS", "BOM JARDIM DE GOIAS", "BOM JESUS", "BONFINOPOLIS", "BONOPOLIS", "BRAZABRANTES", "BRITANIA", "BURITI ALEGRE", "BURITI DE GOIAS", "BURITINOPOLIS", "CABECEIRAS", "CACHOEIRA ALTA", "CACHOEIRA DE GOIAS", "CACHOEIRA DOURADA", "CACU", "CAIAPONIA", "CALDAS NOVAS", "CALDAZINHA", "CAMPESTRE DE GOIAS", "CAMPINACU", "CAMPINORTE", "CAMPO ALEGRE DE GOIAS", "CAMPO LIMPO DE GOIAS", "CAMPOS BELOS", "CAMPOS VERDES", "CARMO DO RIO VERDE", "CASTELANDIA", "CATALAO", "CATURAI", "CAVALCANTE", "CERES", "CEZARINA", "CHAPADAO DO CEU", "CIDADE OCIDENTAL", "COCALZINHO DE GOIAS", "COLINAS DO SUL", "CORREGO DO OURO", "CORUMBA DE GOIAS", "CORUMBAIBA", "CRISTALINA", "CRISTIANOPOLIS", "CRIXAS", "CROMINIA", "CUMARI", "DAMIANOPOLIS", "DAMOLANDIA", "DAVINOPOLIS", "DIORAMA", "DIVINOPOLIS DE GOIAS", "DOVERLANDIA", "EDEALINA", "EDEIA", "ESTRELA DO NORTE", "FAINA", "FAZENDA NOVA", "FIRMINOPOLIS", "FLORES DE GOIAS", "FORMOSA", "FORMOSO", "GAMELEIRA DE GOIAS", "GOIANAPOLIS", "GOIANDIRA", "GOIANESIA", "GOIANIA", "GOIANIRA", "GOIAS", "GOIATUBA", "GOUVELANDIA", "GUAPO", "GUARAITA", "GUARANI DE GOIAS", "GUARINOS", "HEITORAI", "HIDROLANDIA", "HIDROLINA", "IACIARA", "INACIOLANDIA", "INDIARA", "INHUMAS", "IPAMERI", "IPIRANGA DE GOIAS", "IPORA", "ISRAELANDIA", "ITABERAI", "ITAGUARI", "ITAGUARU", "ITAJA", "ITAPACI", "ITAPIRAPUA", "ITAPURANGA", "ITARUMA", "ITAUCU", "ITUMBIARA", "IVOLANDIA", "JANDAIA", "JARAGUA", "JATAI", "JAUPACI", "JESUPOLIS", "JOVIANIA", "JUSSARA", "LAGOA SANTA", "LEOPOLDO DE BULHOES", "LUZIANIA", "MAIRIPOTABA", "MAMBAI", "MARA ROSA", "MARZAGAO", "MATRINCHA", "MAURILANDIA", "MIMOSO DE GOIAS", "MINACU", "MINEIROS", "MOIPORA", "MONTE ALEGRE DE GOIAS", "MONTES CLAROS DE GOIAS", "MONTIVIDIU", "MONTIVIDIU DO NORTE", "MORRINHOS", "MORRO AGUDO DE GOIAS", "MOSSAMEDES", "MOZARLANDIA", "MUNDO NOVO", "MUTUNOPOLIS", "NAZARIO", "NEROPOLIS", "NIQUELANDIA", "NOVA AMERICA", "NOVA AURORA", "NOVA CRIXAS", "NOVA GLORIA", "NOVA IGUACU DE GOIAS", "NOVA ROMA", "NOVA VENEZA", "NOVO BRASIL", "NOVO GAMA", "NOVO PLANALTO", "ORIZONA", "OURO VERDE DE GOIAS", "OUVIDOR", "PADRE BERNARDO", "PALESTINA DE GOIAS", "PALMEIRAS DE GOIAS", "PALMELO", "PALMINOPOLIS", "PANAMA", "PARANAIGUARA", "PARAUNA", "PEROLANDIA", "PETROLINA DE GOIAS", "PILAR DE GOIAS", "PIRACANJUBA", "PIRANHAS", "PIRENOPOLIS", "PIRES DO RIO", "PLANALTINA", "PONTALINA", "PORANGATU", "PORTEIRAO", "PORTELANDIA", "POSSE", "PROFESSOR JAMIL", "QUIRINOPOLIS", "RIALMA", "RIANAPOLIS", "RIO QUENTE", "RIO VERDE", "RUBIATABA", "SANCLERLANDIA", "SANTA BARBARA DE GOIAS", "SANTA CRUZ DE GOIAS", "SANTA FE DE GOIAS", "SANTA HELENA DE GOIAS", "SANTA ISABEL", "SANTA RITA DO ARAGUAIA", "SANTA RITA DO NOVO DESTINO", "SANTA ROSA DE GOIAS", "SANTA TEREZA DE GOIAS", "SANTA TEREZINHA DE GOIAS", "SANTO ANTONIO DA BARRA", "SANTO ANTONIO DE GOIAS", "SANTO ANTONIO DO DESCOBERTO", "SAO DOMINGOS", "SAO FRANCISCO DE GOIAS", "SAO JOAO D'ALIANCA", "SAO JOAO DA PARAUNA", "SAO LUIS DE MONTES BELOS", "SAO LUIZ DO NORTE", "SAO MIGUEL DO ARAGUAIA", "SAO MIGUEL DO PASSA QUATRO", "SAO PATRICIO", "SAO SIMAO", "SENADOR CANEDO", "SERRANOPOLIS", "SILVANIA", "SIMOLANDIA", "SITIO D'ABADIA", "TAQUARAL DE GOIAS", "TERESINA DE GOIAS", "TEREZOPOLIS DE GOIAS", "TRES RANCHOS", "TRINDADE", "TROMBAS", "TURVANIA", "TURVELANDIA", "UIRAPURU", "URUACU", "URUANA", "URUTAI", "VALPARAISO DE GOIAS", "VARJAO", "VIANOPOLIS", "VICENTINOPOLIS", "VILA BOA", "VILA PROPICIO"],
  MA: ["ACAILANDIA", "AFONSO CUNHA", "AGUA DOCE DO MARANHAO", "ALCANTARA", "ALDEIAS ALTAS", "ALTAMIRA DO MARANHAO", "ALTO ALEGRE DO MARANHAO", "ALTO ALEGRE DO PINDARE", "ALTO PARNAIBA", "AMAPA DO MARANHAO", "AMARANTE DO MARANHAO", "ANAJATUBA", "ANAPURUS", "APICUM-ACU", "ARAGUANA", "ARAIOSES", "ARAME", "ARARI", "AXIXA", "BACABAL", "BACABEIRA", "BACURI", "BACURITUBA", "BALSAS", "BARAO DE GRAJAU", "BARRA DO CORDA", "BARREIRINHAS", "BELA VISTA DO MARANHAO", "BELAGUA", "BENEDITO LEITE", "BEQUIMAO", "BERNARDO DO MEARIM", "BOA VISTA DO GURUPI", "BOM JARDIM", "BOM JESUS DAS SELVAS", "BOM LUGAR", "BREJO", "BREJO DE AREIA", "BURITI", "BURITI BRAVO", "BURITICUPU", "BURITIRANA", "CACHOEIRA GRANDE", "CAJAPIO", "CAJARI", "CAMPESTRE DO MARANHAO", "CANDIDO MENDES", "CANTANHEDE", "CAPINZAL DO NORTE", "CAROLINA", "CARUTAPERA", "CAXIAS", "CEDRAL", "CENTRAL DO MARANHAO", "CENTRO DO GUILHERME", "CENTRO NOVO DO MARANHAO", "CHAPADINHA", "CIDELANDIA", "CODO", "COELHO NETO", "COLINAS", "CONCEICAO DO LAGO-ACU", "COROATA", "CURURUPU", "DAVINOPOLIS", "DOM PEDRO", "DUQUE BACELAR", "ESPERANTINOPOLIS", "ESTREITO", "FEIRA NOVA DO MARANHAO", "FERNANDO FALCAO", "FORMOSA DA SERRA NEGRA", "FORTALEZA DOS NOGUEIRAS", "FORTUNA", "GODOFREDO VIANA", "GONCALVES DIAS", "GOVERNADOR ARCHER", "GOVERNADOR EDISON LOBAO", "GOVERNADOR EUGENIO BARROS", "GOVERNADOR LUIZ ROCHA", "GOVERNADOR NEWTON BELLO", "GOVERNADOR NUNES FREIRE", "GRACA ARANHA", "GRAJAU", "GUIMARAES", "HUMBERTO DE CAMPOS", "ICATU", "IGARAPE DO MEIO", "IGARAPE GRANDE", "IMPERATRIZ", "ITAIPAVA DO GRAJAU", "ITAPECURU MIRIM", "ITINGA DO MARANHAO", "JATOBA", "JENIPAPO DOS VIEIRAS", "JOAO LISBOA", "JOSELANDIA", "JUNCO DO MARANHAO", "LAGO DA PEDRA", "LAGO DO JUNCO", "LAGO DOS RODRIGUES", "LAGO VERDE", "LAGOA DO MATO", "LAGOA GRANDE DO MARANHAO", "LAJEADO NOVO", "LIMA CAMPOS", "LORETO", "LUIS DOMINGUES", "MAGALHAES DE ALMEIDA", "MARACACUME", "MARAJA DO SENA", "MARANHAOZINHO", "MATA ROMA", "MATINHA", "MATOES", "MATOES DO NORTE", "MILAGRES DO MARANHAO", "MIRADOR", "MIRANDA DO NORTE", "MIRINZAL", "MONCAO", "MONTES ALTOS", "MORROS", "NINA RODRIGUES", "NOVA COLINAS", "NOVA IORQUE", "NOVA OLINDA DO MARANHAO", "OLHO D'AGUA DAS CUNHAS", "OLINDA NOVA DO MARANHAO", "PACO DO LUMIAR", "PALMEIRANDIA", "PARAIBANO", "PARNARAMA", "PASSAGEM FRANCA", "PASTOS BONS", "PAULINO NEVES", "PAULO RAMOS", "PEDREIRAS", "PEDRO DO ROSARIO", "PENALVA", "PERI MIRIM", "PERITORO", "PINDARE MIRIM", "PINHEIRO", "PIO XII", "PIRAPEMAS", "POCAO DE PEDRAS", "PORTO FRANCO", "PORTO RICO DO MARANHAO", "PRESIDENTE DUTRA", "PRESIDENTE JUSCELINO", "PRESIDENTE MEDICI", "PRESIDENTE SARNEY", "PRESIDENTE VARGAS", "RAPOSA", "RIACHAO", "RIBAMAR FIQUENE", "ROSARIO", "SAMBAIBA", "SANTA FILOMENA DO MARANHAO", "SANTA HELENA", "SANTA INES", "SANTA LUZIA", "SANTA LUZIA DO PARUA", "SANTA QUITERIA DO MARANHAO", "SANTA RITA", "SANTANA DO MARANHAO", "SANTO AMARO DO MARANHAO", "SANTO ANTONIO DOS LOPES", "SAO BENEDITO DO RIO PRETO", "SAO BENTO", "SAO BERNARDO", "SAO DOMINGOS DO AZEITAO", "SAO DOMINGOS DO MARANHAO", "SAO FELIX DE BALSAS", "SAO FRANCISCO DO BREJAO", "SAO FRANCISCO DO MARANHAO", "SAO JOAO BATISTA", "SAO JOAO DO CARU", "SAO JOAO DO PARAISO", "SAO JOAO DO SOTER", "SAO JOAO DOS PATOS", "SAO JOSE DE RIBAMAR", "SAO JOSE DOS BASILIOS", "SAO LUIS", "SAO LUIS GONZAGA DO MARANHAO", "SAO MATEUS DO MARANHAO", "SAO PEDRO DA AGUA BRANCA", "SAO PEDRO DOS CRENTES", "SAO RAIMUNDO DAS MANGABEIRAS", "SAO RAIMUNDO DO DOCA BEZERRA", "SAO ROBERTO", "SAO VICENTE FERRER", "SATUBINHA", "SENADOR ALEXANDRE COSTA", "SENADOR LA ROCQUE", "SERRANO DO MARANHAO", "SITIO NOVO", "SUCUPIRA DO NORTE", "SUCUPIRA DO RIACHAO", "TASSO FRAGOSO", "TIMBIRAS", "TIMON", "TRIZIDELA DO VALE", "TUFILANDIA", "TUNTUM", "TURIACU", "TURILANDIA", "TUTOIA", "URBANO SANTOS", "VARGEM GRANDE", "VIANA", "VILA NOVA DOS MARTIRIOS", "VITORIA DO MEARIM", "VITORINO FREIRE", "ZE DOCA"],
  MG: ["ABADIA DOS DOURADOS", "ABAETE", "ABRE CAMPO", "ACAIACA", "ACUCENA", "AGUA BOA", "AGUA COMPRIDA", "AGUANIL", "AGUAS FORMOSAS", "AGUAS VERMELHAS", "AIMORES", "AIURUOCA", "ALAGOA", "ALBERTINA", "ALEM PARAIBA", "ALFENAS", "ALFREDO VASCONCELOS", "ALMENARA", "ALPERCATA", "ALPINOPOLIS", "ALTEROSA", "ALTO CAPARAO", "ALTO JEQUITIBA", "ALTO RIO DOCE", "ALVARENGA", "ALVINOPOLIS", "ALVORADA DE MINAS", "AMPARO DO SERRA", "ANDRADAS", "ANDRELANDIA", "ANGELANDIA", "ANTONIO CARLOS", "ANTONIO DIAS", "ANTONIO PRADO DE MINAS", "ARACAI", "ARACUAI", "ARAGUARI", "ARANTINA", "ARAPONGA", "ARAPORA", "ARAPUA", "ARAUJOS", "ARAXA", "ARCEBURGO", "ARCOS", "AREADO", "ARGIRITA", "ARICANDUVA", "ARINOS", "ASTOLFO DUTRA", "ATALEIA", "AUGUSTO DE LIMA", "BAEPENDI", "BALDIM", "BAMBUI", "BANDEIRA", "BANDEIRA DO SUL", "BARAO DE COCAIS", "BARAO DE MONTE ALTO", "BARBACENA", "BARRA LONGA", "BARROSO", "BELA VISTA DE MINAS", "BELMIRO BRAGA", "BELO HORIZONTE", "BELO ORIENTE", "BELO VALE", "BERILO", "BERIZAL", "BERTOPOLIS", "BETIM", "BIAS FORTES", "BICAS", "BIQUINHAS", "BOA ESPERANCA", "BOCAINA DE MINAS", "BOCAIUVA", "BOM DESPACHO", "BOM JARDIM DE MINAS", "BOM JESUS DA PENHA", "BOM JESUS DO AMPARO", "BOM JESUS DO GALHO", "BOM REPOUSO", "BOM SUCESSO", "BONFIM", "BONFINOPOLIS DE MINAS", "BONITO DE MINAS", "BORDA DA MATA", "BOTELHOS", "BOTUMIRIM", "BRAS PIRES", "BRASILANDIA DE MINAS", "BRASILIA DE MINAS", "BRAUNAS", "BRAZOPOLIS", "BRUMADINHO", "BUENO BRANDAO", "BUENOPOLIS", "BUGRE", "BURITIS", "BURITIZEIRO", "CABECEIRA GRANDE", "CABO VERDE", "CACHOEIRA DA PRATA", "CACHOEIRA DE MINAS", "CACHOEIRA DE PAJEU", "CACHOEIRA DOURADA", "CAETANOPOLIS", "CAETE", "CAIANA", "CAJURI", "CALDAS", "CAMACHO", "CAMANDUCAIA", "CAMBUI", "CAMBUQUIRA", "CAMPANARIO", "CAMPANHA", "CAMPESTRE", "CAMPINA VERDE", "CAMPO AZUL", "CAMPO BELO", "CAMPO DO MEIO", "CAMPO FLORIDO", "CAMPOS ALTOS", "CAMPOS GERAIS", "CANA VERDE", "CANAA", "CANAPOLIS", "CANDEIAS", "CANTAGALO", "CAPARAO", "CAPELA NOVA", "CAPELINHA", "CAPETINGA", "CAPIM BRANCO", "CAPINOPOLIS", "CAPITAO ANDRADE", "CAPITAO ENEAS", "CAPITOLIO", "CAPUTIRA", "CARAI", "CARANAIBA", "CARANDAI", "CARANGOLA", "CARATINGA", "CARBONITA", "CAREACU", "CARLOS CHAGAS", "CARMESIA", "CARMO DA CACHOEIRA", "CARMO DA MATA", "CARMO DE MINAS", "CARMO DO CAJURU", "CARMO DO PARANAIBA", "CARMO DO RIO CLARO", "CARMOPOLIS DE MINAS", "CARNEIRINHO", "CARRANCAS", "CARVALHOPOLIS", "CARVALHOS", "CASA GRANDE", "CASCALHO RICO", "CASSIA", "CATAGUASES", "CATAS ALTAS", "CATAS ALTAS DA NORUEGA", "CATUJI", "CATUTI", "CAXAMBU", "CEDRO DO ABAETE", "CENTRAL DE MINAS", "CENTRALINA", "CHACARA", "CHALE", "CHAPADA DO NORTE", "CHAPADA GAUCHA", "CHIADOR", "CIPOTANEA", "CLARAVAL", "CLARO DOS POCOES", "CLAUDIO", "COIMBRA", "COLUNA", "COMENDADOR GOMES", "COMERCINHO", "CONCEICAO DA APARECIDA", "CONCEICAO DA BARRA DE MINAS", "CONCEICAO DAS ALAGOAS", "CONCEICAO DAS PEDRAS", "CONCEICAO DE IPANEMA", "CONCEICAO DO MATO DENTRO", "CONCEICAO DO PARA", "CONCEICAO DO RIO VERDE", "CONCEICAO DOS OUROS", "CONEGO MARINHO", "CONFINS", "CONGONHAL", "CONGONHAS", "CONGONHAS DO NORTE", "CONQUISTA", "CONSELHEIRO LAFAIETE", "CONSELHEIRO PENA", "CONSOLACAO", "CONTAGEM", "COQUEIRAL", "CORACAO DE JESUS", "CORDISBURGO", "CORDISLANDIA", "CORINTO", "COROACI", "COROMANDEL", "CORONEL FABRICIANO", "CORONEL MURTA", "CORONEL PACHECO", "CORONEL XAVIER CHAVES", "CORREGO DANTA", "CORREGO DO BOM JESUS", "CORREGO FUNDO", "CORREGO NOVO", "COUTO DE MAGALHAES DE MINAS", "CRISOLITA", "CRISTAIS", "CRISTALIA", "CRISTIANO OTONI", "CRISTINA", "CRUCILANDIA", "CRUZEIRO DA FORTALEZA", "CRUZILIA", "CUPARAQUE", "CURRAL DE DENTRO", "CURVELO", "DATAS", "DELFIM MOREIRA", "DELFINOPOLIS", "DELTA", "DESCOBERTO", "DESTERRO DE ENTRE RIOS", "DESTERRO DO MELO", "DIAMANTINA", "DIOGO DE VASCONCELOS", "DIONISIO", "DIVINESIA", "DIVINO", "DIVINO DAS LARANJEIRAS", "DIVINOLANDIA DE MINAS", "DIVINOPOLIS", "DIVISA ALEGRE", "DIVISA NOVA", "DIVISOPOLIS", "DOM BOSCO", "DOM CAVATI", "DOM JOAQUIM", "DOM SILVERIO", "DOM VICOSO", "DONA EUZEBIA", "DORES DE CAMPOS", "DORES DE GUANHAES", "DORES DO INDAIA", "DORES DO TURVO", "DOURADOQUARA", "DURANDE", "ELOI MENDES", "ENGENHEIRO CALDAS", "ENGENHEIRO NAVARRO", "ENTRE FOLHAS", "ENTRE RIOS DE MINAS", "ERVALIA", "ESMERALDAS", "ESPERA FELIZ", "ESPINOSA", "ESPIRITO SANTO DO DOURADO", "ESTIVA", "ESTRELA DALVA", "ESTRELA DO INDAIA", "ESTRELA DO SUL", "EUGENOPOLIS", "EWBANK DA CAMARA", "EXTREMA", "FAMA", "FARIA LEMOS", "FELICIO DOS SANTOS", "FELISBURGO", "FELIXLANDIA", "FERNANDES TOURINHO", "FERROS", "FERVEDOURO", "FLORESTAL", "FORMIGA", "FORMOSO", "FORTALEZA DE MINAS", "FORTUNA DE MINAS", "FRANCISCO BADARO", "FRANCISCO DUMONT", "FRANCISCO SA", "FRANCISCOPOLIS", "FREI GASPAR", "FREI INOCENCIO", "FREI LAGONEGRO", "FRONTEIRA", "FRONTEIRA DOS VALES", "FRUTA DE LEITE", "FRUTAL", "FUNILANDIA", "GALILEIA", "GAMELEIRAS", "GOIABEIRA", "GOIANA", "GONCALVES", "GONZAGA", "GOUVEIA", "GOVERNADOR VALADARES", "GRAO MOGOL", "GRUPIARA", "GUANHAES", "GUAPE", "GUARACIABA", "GUARACIAMA", "GUARANESIA", "GUARANI", "GUARARA", "GUARDA-MOR", "GUAXUPE", "GUIDOVAL", "GUIMARANIA", "GUIRICEMA", "GURINHATA", "HELIODORA", "IAPU", "IBERTIOGA", "IBIA", "IBIAI", "IBIRACATU", "IBIRACI", "IBIRITE", "IBITIURA DE MINAS", "IBITURUNA", "ICARAI DE MINAS", "IGARAPE", "IGARATINGA", "IGUATAMA", "IJACI", "ILICINEA", "IMBE DE MINAS", "INCONFIDENTES", "INDAIABIRA", "INDIANOPOLIS", "INGAI", "INHAPIM", "INHAUMA", "INIMUTABA", "IPABA", "IPANEMA", "IPATINGA", "IPIACU", "IPUIUNA", "IRAI DE MINAS", "ITABIRA", "ITABIRINHA", "ITABIRITO", "ITACAMBIRA", "ITACARAMBI", "ITAGUARA", "ITAIPE", "ITAJUBA", "ITAMARANDIBA", "ITAMARATI DE MINAS", "ITAMBACURI", "ITAMBE DO MATO DENTRO", "ITAMOGI", "ITAMONTE", "ITANHANDU", "ITANHOMI", "ITAOBIM", "ITAPAGIPE", "ITAPECERICA", "ITAPEVA", "ITATIAIUCU", "ITAU DE MINAS", "ITAUNA", "ITAVERAVA", "ITINGA", "ITUETA", "ITUIUTABA", "ITUMIRIM", "ITURAMA", "ITUTINGA", "JABOTICATUBAS", "JACINTO", "JACUI", "JACUTINGA", "JAGUARACU", "JAIBA", "JAMPRUCA", "JANAUBA", "JANUARIA", "JAPARAIBA", "JAPONVAR", "JECEABA", "JENIPAPO DE MINAS", "JEQUERI", "JEQUITAI", "JEQUITIBA", "JEQUITINHONHA", "JESUANIA", "JOAIMA", "JOANESIA", "JOAO MONLEVADE", "JOAO PINHEIRO", "JOAQUIM FELICIO", "JORDANIA", "JOSE GONCALVES DE MINAS", "JOSE RAYDAN", "JUATUBA", "JUIZ DE FORA", "JURAMENTO", "JURUAIA", "JUVENILIA", "LADAINHA", "LAGAMAR", "LAGOA DA PRATA", "LAGOA DOS PATOS", "LAGOA DOURADA", "LAGOA FORMOSA", "LAGOA GRANDE", "LAGOA SANTA", "LAJINHA", "LAMBARI", "LAMIM", "LARANJAL", "LASSANCE", "LAVRAS", "LEANDRO FERREIRA", "LEME DO PRADO", "LEOPOLDINA", "LIBERDADE", "LIMA DUARTE", "LIMEIRA DO OESTE", "LONTRA", "LUISBURGO", "LUISLANDIA", "LUMINARIAS", "LUZ", "MACHACALIS", "MACHADO", "MADRE DE DEUS DE MINAS", "MALACACHETA", "MAMONAS", "MANGA", "MANHUACU", "MANHUMIRIM", "MANTENA", "MAR DE ESPANHA", "MARAVILHAS", "MARIA DA FE", "MARIANA", "MARILAC", "MARIO CAMPOS", "MARIPA DE MINAS", "MARLIERIA", "MARMELOPOLIS", "MARTINHO CAMPOS", "MARTINS SOARES", "MATA VERDE", "MATERLANDIA", "MATEUS LEME", "MATHIAS LOBATO", "MATIAS BARBOSA", "MATIAS CARDOSO", "MATIPO", "MATO VERDE", "MATOZINHOS", "MATUTINA", "MEDEIROS", "MEDINA", "MENDES PIMENTEL", "MERCES", "MESQUITA", "MINAS NOVAS", "MINDURI", "MIRABELA", "MIRADOURO", "MIRAI", "MIRAVANIA", "MOEDA", "MOEMA", "MONJOLOS", "MONSENHOR PAULO", "MONTALVANIA", "MONTE ALEGRE DE MINAS", "MONTE AZUL", "MONTE BELO", "MONTE CARMELO", "MONTE FORMOSO", "MONTE SANTO DE MINAS", "MONTE SIAO", "MONTES CLAROS", "MONTEZUMA", "MORADA NOVA DE MINAS", "MORRO DA GARCA", "MORRO DO PILAR", "MUNHOZ", "MURIAE", "MUTUM", "MUZAMBINHO", "NACIP RAYDAN", "NANUQUE", "NAQUE", "NATALANDIA", "NATERCIA", "NAZARENO", "NEPOMUCENO", "NINHEIRA", "NOVA BELEM", "NOVA ERA", "NOVA LIMA", "NOVA MODICA", "NOVA PONTE", "NOVA PORTEIRINHA", "NOVA RESENDE", "NOVA SERRANA", "NOVA UNIAO", "NOVO CRUZEIRO", "NOVO ORIENTE DE MINAS", "NOVORIZONTE", "OLARIA", "OLHOS D'AGUA", "OLIMPIO NORONHA", "OLIVEIRA", "OLIVEIRA FORTES", "ONCA DE PITANGUI", "ORATORIOS", "ORIZANIA", "OURO BRANCO", "OURO FINO", "OURO PRETO", "OURO VERDE DE MINAS", "PADRE CARVALHO", "PADRE PARAISO", "PAI PEDRO", "PAINEIRAS", "PAINS", "PAIVA", "PALMA", "PALMOPOLIS", "PAPAGAIOS", "PARA DE MINAS", "PARACATU", "PARAGUACU", "PARAISOPOLIS", "PARAOPEBA", "PASSA QUATRO", "PASSA TEMPO", "PASSA VINTE", "PASSABEM", "PASSOS", "PATIS", "PATOS DE MINAS", "PATROCINIO", "PATROCINIO DO MURIAE", "PAULA CANDIDO", "PAULISTAS", "PAVAO", "PECANHA", "PEDRA AZUL", "PEDRA BONITA", "PEDRA DO ANTA", "PEDRA DO INDAIA", "PEDRA DOURADA", "PEDRALVA", "PEDRAS DE MARIA DA CRUZ", "PEDRINOPOLIS", "PEDRO LEOPOLDO", "PEDRO TEIXEIRA", "PEQUERI", "PEQUI", "PERDIGAO", "PERDIZES", "PERDOES", "PERIQUITO", "PESCADOR", "PIAU", "PIEDADE DE CARATINGA", "PIEDADE DE PONTE NOVA", "PIEDADE DO RIO GRANDE", "PIEDADE DOS GERAIS", "PIMENTA", "PINGO-D'AGUA", "PINTOPOLIS", "PIRACEMA", "PIRAJUBA", "PIRANGA", "PIRANGUCU", "PIRANGUINHO", "PIRAPETINGA", "PIRAPORA", "PIRAUBA", "PITANGUI", "PIUMHI", "PLANURA", "POCO FUNDO", "POCOS DE CALDAS", "POCRANE", "POMPEU", "PONTE NOVA", "PONTO CHIQUE", "PONTO DOS VOLANTES", "PORTEIRINHA", "PORTO FIRME", "POTE", "POUSO ALEGRE", "POUSO ALTO", "PRADOS", "PRATA", "PRATAPOLIS", "PRATINHA", "PRESIDENTE BERNARDES", "PRESIDENTE JUSCELINO", "PRESIDENTE KUBITSCHEK", "PRESIDENTE OLEGARIO", "PRUDENTE DE MORAIS", "QUARTEL GERAL", "QUELUZITO", "RAPOSOS", "RAUL SOARES", "RECREIO", "REDUTO", "RESENDE COSTA", "RESPLENDOR", "RESSAQUINHA", "RIACHINHO", "RIACHO DOS MACHADOS", "RIBEIRAO DAS NEVES", "RIBEIRAO VERMELHO", "RIO ACIMA", "RIO CASCA", "RIO DO PRADO", "RIO DOCE", "RIO ESPERA", "RIO MANSO", "RIO NOVO", "RIO PARANAIBA", "RIO PARDO DE MINAS", "RIO PIRACICABA", "RIO POMBA", "RIO PRETO", "RIO VERMELHO", "RITAPOLIS", "RODEIRO", "ROMARIA", "ROSARIO DA LIMEIRA", "RUBELITA", "RUBIM", "SABARA", "SABINOPOLIS", "SACRAMENTO", "SALINAS", "SALTO DA DIVISA", "SANTA BARBARA", "SANTA BARBARA DO LESTE", "SANTA BARBARA DO MONTE VERDE", "SANTA BARBARA DO TUGURIO", "SANTA CRUZ DE MINAS", "SANTA CRUZ DE SALINAS", "SANTA CRUZ DO ESCALVADO", "SANTA EFIGENIA DE MINAS", "SANTA FE DE MINAS", "SANTA HELENA DE MINAS", "SANTA JULIANA", "SANTA LUZIA", "SANTA MARGARIDA", "SANTA MARIA DE ITABIRA", "SANTA MARIA DO SALTO", "SANTA MARIA DO SUACUI", "SANTA RITA DE CALDAS", "SANTA RITA DE IBITIPOCA", "SANTA RITA DE JACUTINGA", "SANTA RITA DE MINAS", "SANTA RITA DO ITUETO", "SANTA RITA DO SAPUCAI", "SANTA ROSA DA SERRA", "SANTA VITORIA", "SANTANA DA VARGEM", "SANTANA DE CATAGUASES", "SANTANA DE PIRAPAMA", "SANTANA DO DESERTO", "SANTANA DO GARAMBEU", "SANTANA DO JACARE", "SANTANA DO MANHUACU", "SANTANA DO PARAISO", "SANTANA DO RIACHO", "SANTANA DOS MONTES", "SANTO ANTONIO DO AMPARO", "SANTO ANTONIO DO AVENTUREIRO", "SANTO ANTONIO DO GRAMA", "SANTO ANTONIO DO ITAMBE", "SANTO ANTONIO DO JACINTO", "SANTO ANTONIO DO MONTE", "SANTO ANTONIO DO RETIRO", "SANTO ANTONIO DO RIO ABAIXO", "SANTO HIPOLITO", "SANTOS DUMONT", "SAO BENTO ABADE", "SAO BRAS DO SUACUI", "SAO DOMINGOS DAS DORES", "SAO DOMINGOS DO PRATA", "SAO FELIX DE MINAS", "SAO FRANCISCO", "SAO FRANCISCO DE PAULA", "SAO FRANCISCO DE SALES", "SAO FRANCISCO DO GLORIA", "SAO GERALDO", "SAO GERALDO DA PIEDADE", "SAO GERALDO DO BAIXIO", "SAO GONCALO DO ABAETE", "SAO GONCALO DO PARA", "SAO GONCALO DO RIO ABAIXO", "SAO GONCALO DO RIO PRETO", "SAO GONCALO DO SAPUCAI", "SAO GOTARDO", "SAO JOAO BATISTA DO GLORIA", "SAO JOAO DA LAGOA", "SAO JOAO DA MATA", "SAO JOAO DA PONTE", "SAO JOAO DAS MISSOES", "SAO JOAO DEL REI", "SAO JOAO DO MANHUACU", "SAO JOAO DO MANTENINHA", "SAO JOAO DO ORIENTE", "SAO JOAO DO PACUI", "SAO JOAO DO PARAISO", "SAO JOAO EVANGELISTA", "SAO JOAO NEPOMUCENO", "SAO JOAQUIM DE BICAS", "SAO JOSE DA BARRA", "SAO JOSE DA LAPA", "SAO JOSE DA SAFIRA", "SAO JOSE DA VARGINHA", "SAO JOSE DO ALEGRE", "SAO JOSE DO DIVINO", "SAO JOSE DO GOIABAL", "SAO JOSE DO JACURI", "SAO JOSE DO MANTIMENTO", "SAO LOURENCO", "SAO MIGUEL DO ANTA", "SAO PEDRO DA UNIAO", "SAO PEDRO DO SUACUI", "SAO PEDRO DOS FERROS", "SAO ROMAO", "SAO ROQUE DE MINAS", "SAO SEBASTIAO DA BELA VISTA", "SAO SEBASTIAO DA VARGEM ALEGRE", "SAO SEBASTIAO DO ANTA", "SAO SEBASTIAO DO MARANHAO", "SAO SEBASTIAO DO OESTE", "SAO SEBASTIAO DO PARAISO", "SAO SEBASTIAO DO RIO VERDE", "SAO THOME DAS LETRAS", "SAO TIAGO", "SAO TOMAS DE AQUINO", "SAO VICENTE DE MINAS", "SAPUCAI-MIRIM", "SARDOA", "SARZEDO", "SEM PEIXE", "SENADOR AMARAL", "SENADOR CORTES", "SENADOR FIRMINO", "SENADOR JOSE BENTO", "SENADOR MODESTINO GONCALVES", "SENHORA DE OLIVEIRA", "SENHORA DO PORTO", "SENHORA DOS REMEDIOS", "SERICITA", "SERITINGA", "SERRA AZUL DE MINAS", "SERRA DO SALITRE", "SERRA DOS AIMORES", "SERRANIA", "SERRANOPOLIS DE MINAS", "SERRANOS", "SERRO", "SETE LAGOAS", "SETUBINHA", "SILVEIRANIA", "SILVIANOPOLIS", "SIMAO PEREIRA", "SIMONESIA", "SOBRALIA", "SOLEDADE DE MINAS", "TABULEIRO", "TAIOBEIRAS", "TAPARUBA", "TAPIRA", "TAPIRAI", "TAQUARACU DE MINAS", "TARUMIRIM", "TEIXEIRAS", "TEOFILO OTONI", "TIMOTEO", "TIRADENTES", "TIROS", "TOCANTINS", "TOCOS DO MOJI", "TOLEDO", "TOMBOS", "TRES CORACOES", "TRES MARIAS", "TRES PONTAS", "TUMIRITINGA", "TUPACIGUARA", "TURMALINA", "TURVOLANDIA", "UBA", "UBAI", "UBAPORANGA", "UBERABA", "UBERLANDIA", "UMBURATIBA", "UNAI", "UNIAO DE MINAS", "URUANA DE MINAS", "URUCANIA", "URUCUIA", "VARGEM ALEGRE", "VARGEM BONITA", "VARGEM GRANDE DO RIO PARDO", "VARGINHA", "VARJAO DE MINAS", "VARZEA DA PALMA", "VARZELANDIA", "VAZANTE", "VERDELANDIA", "VEREDINHA", "VERISSIMO", "VERMELHO NOVO", "VESPASIANO", "VICOSA", "VIEIRAS", "VIRGEM DA LAPA", "VIRGINIA", "VIRGINOPOLIS", "VIRGOLANDIA", "VISCONDE DO RIO BRANCO", "VOLTA GRANDE", "WENCESLAU BRAZ"],
  MS: ["AGUA CLARA", "ALCINOPOLIS", "AMAMBAI", "ANASTACIO", "ANAURILANDIA", "ANGELICA", "ANTONIO JOAO", "APARECIDA DO TABOADO", "AQUIDAUANA", "ARAL MOREIRA", "BANDEIRANTES", "BATAGUASSU", "BATAYPORA", "BELA VISTA", "BODOQUENA", "BONITO", "BRASILANDIA", "CAARAPO", "CAMAPUA", "CAMPO GRANDE", "CARACOL", "CASSILANDIA", "CHAPADAO DO SUL", "CORGUINHO", "CORONEL SAPUCAIA", "CORUMBA", "COSTA RICA", "COXIM", "DEODAPOLIS", "DOIS IRMAOS DO BURITI", "DOURADINA", "DOURADOS", "ELDORADO", "FATIMA DO SUL", "FIGUEIRAO", "GLORIA DE DOURADOS", "GUIA LOPES DA LAGUNA", "IGUATEMI", "INOCENCIA", "ITAPORA", "ITAQUIRAI", "IVINHEMA", "JAPORA", "JARAGUARI", "JARDIM", "JATEI", "JUTI", "LADARIO", "LAGUNA CARAPA", "MARACAJU", "MIRANDA", "MUNDO NOVO", "NAVIRAI", "NIOAQUE", "NOVA ALVORADA DO SUL", "NOVA ANDRADINA", "NOVO HORIZONTE DO SUL", "PARAISO DAS AGUAS", "PARANAIBA", "PARANHOS", "PEDRO GOMES", "PONTA PORA", "PORTO MURTINHO", "RIBAS DO RIO PARDO", "RIO BRILHANTE", "RIO NEGRO", "RIO VERDE DE MATO GROSSO", "ROCHEDO", "SANTA RITA DO PARDO", "SAO GABRIEL DO OESTE", "SELVIRIA", "SETE QUEDAS", "SIDROLANDIA", "SONORA", "TACURU", "TAQUARUSSU", "TERENOS", "TRES LAGOAS", "VICENTINA"],
  MT: ["ACORIZAL", "AGUA BOA", "ALTA FLORESTA", "ALTO ARAGUAIA", "ALTO BOA VISTA", "ALTO GARCAS", "ALTO PARAGUAI", "ALTO TAQUARI", "APIACAS", "ARAGUAIANA", "ARAGUAINHA", "ARAPUTANGA", "ARENAPOLIS", "ARIPUANA", "BARAO DE MELGACO", "BARRA DO BUGRES", "BARRA DO GARCAS", "BOM JESUS DO ARAGUAIA", "BRASNORTE", "CACERES", "CAMPINAPOLIS", "CAMPO NOVO DO PARECIS", "CAMPO VERDE", "CAMPOS DE JULIO", "CANABRAVA DO NORTE", "CANARANA", "CARLINDA", "CASTANHEIRA", "CHAPADA DOS GUIMARAES", "CLAUDIA", "COCALINHO", "COLIDER", "COLNIZA", "COMODORO", "CONFRESA", "CONQUISTA D'OESTE", "COTRIGUACU", "CUIABA", "CURVELANDIA", "DENISE", "DIAMANTINO", "DOM AQUINO", "FELIZ NATAL", "FIGUEIROPOLIS D'OESTE", "GAUCHA DO NORTE", "GENERAL CARNEIRO", "GLORIA D'OESTE", "GUARANTA DO NORTE", "GUIRATINGA", "INDIAVAI", "IPIRANGA DO NORTE", "ITANHANGA", "ITAUBA", "ITIQUIRA", "JACIARA", "JANGADA", "JAURU", "JUARA", "JUINA", "JURUENA", "JUSCIMEIRA", "LAMBARI D'OESTE", "LUCAS DO RIO VERDE", "LUCIARA", "MARCELANDIA", "MATUPA", "MIRASSOL D'OESTE", "NOBRES", "NORTELANDIA", "NOSSA SENHORA DO LIVRAMENTO", "NOVA BANDEIRANTES", "NOVA BRASILANDIA", "NOVA CANAA DO NORTE", "NOVA GUARITA", "NOVA LACERDA", "NOVA MARILANDIA", "NOVA MARINGA", "NOVA MONTE VERDE", "NOVA MUTUM", "NOVA NAZARE", "NOVA OLIMPIA", "NOVA SANTA HELENA", "NOVA UBIRATA", "NOVA XAVANTINA", "NOVO HORIZONTE DO NORTE", "NOVO MUNDO", "NOVO SANTO ANTONIO", "NOVO SAO JOAQUIM", "PARANAITA", "PARANATINGA", "PEDRA PRETA", "PEIXOTO DE AZEVEDO", "PLANALTO DA SERRA", "POCONE", "PONTAL DO ARAGUAIA", "PONTE BRANCA", "PONTES E LACERDA", "PORTO ALEGRE DO NORTE", "PORTO DOS GAUCHOS", "PORTO ESPERIDIAO", "PORTO ESTRELA", "POXOREU", "PRIMAVERA DO LESTE", "QUERENCIA", "RESERVA DO CABACAL", "RIBEIRAO CASCALHEIRA", "RIBEIRAOZINHO", "RIO BRANCO", "RONDOLANDIA", "RONDONOPOLIS", "ROSARIO OESTE", "SALTO DO CEU", "SANTA CARMEM", "SANTA CRUZ DO XINGU", "SANTA RITA DO TRIVELATO", "SANTA TEREZINHA", "SANTO AFONSO", "SANTO ANTONIO DO LESTE", "SANTO ANTONIO DO LEVERGER", "SAO FELIX DO ARAGUAIA", "SAO JOSE DO POVO", "SAO JOSE DO RIO CLARO", "SAO JOSE DO XINGU", "SAO JOSE DOS QUATRO MARCOS", "SAO PEDRO DA CIPA", "SAPEZAL", "SERRA NOVA DOURADA", "SINOP", "SORRISO", "TABAPORA", "TANGARA DA SERRA", "TAPURAH", "TERRA NOVA DO NORTE", "TESOURO", "TORIXOREU", "UNIAO DO SUL", "VALE DE SAO DOMINGOS", "VARZEA GRANDE", "VERA", "VILA BELA DA SANTISSIMA TRINDADE", "VILA RICA"],
  PA: ["ABAETETUBA", "ABEL FIGUEIREDO", "ACARA", "AFUA", "AGUA AZUL DO NORTE", "ALENQUER", "ALMEIRIM", "ALTAMIRA", "ANAJAS", "ANANINDEUA", "ANAPU", "AUGUSTO CORREA", "AURORA DO PARA", "AVEIRO", "BAGRE", "BAIAO", "BANNACH", "BARCARENA", "BELEM", "BELTERRA", "BENEVIDES", "BOM JESUS DO TOCANTINS", "BONITO", "BRAGANCA", "BRASIL NOVO", "BREJO GRANDE DO ARAGUAIA", "BREU BRANCO", "BREVES", "BUJARU", "CACHOEIRA DO ARARI", "CACHOEIRA DO PIRIA", "CAMETA", "CANAA DOS CARAJAS", "CAPANEMA", "CAPITAO POCO", "CASTANHAL", "CHAVES", "COLARES", "CONCEICAO DO ARAGUAIA", "CONCORDIA DO PARA", "CUMARU DO NORTE", "CURIONOPOLIS", "CURRALINHO", "CURUA", "CURUCA", "DOM ELISEU", "ELDORADO DO CARAJAS", "FLORESTA DO ARAGUAIA", "GARRAFAO DO NORTE", "GOIANESIA DO PARA", "GURUPA", "IGARAPE-ACU", "IGARAPE-MIRI", "INHANGAPI", "IPIXUNA DO PARA", "IRITUIA", "ITAITUBA", "ITUPIRANGA", "JACAREACANGA", "JACUNDA", "JURUTI", "LIMOEIRO DO AJURU", "MAE DO RIO", "MAGALHAES BARATA", "MARABA", "MARACANA", "MARAPANIM", "MARITUBA", "MEDICILANDIA", "MELGACO", "MOCAJUBA", "MOJU", "MOJUI DOS CAMPOS", "MONTE ALEGRE", "MUANA", "NOVA ESPERANCA DO PIRIA", "NOVA IPIXUNA", "NOVA TIMBOTEUA", "NOVO PROGRESSO", "NOVO REPARTIMENTO", "OBIDOS", "OEIRAS DO PARA", "ORIXIMINA", "OUREM", "OURILANDIA DO NORTE", "PACAJA", "PALESTINA DO PARA", "PARAGOMINAS", "PARAUAPEBAS", "PAU D'ARCO", "PEIXE-BOI", "PICARRA", "PLACAS", "PONTA DE PEDRAS", "PORTEL", "PORTO DE MOZ", "PRAINHA", "PRIMAVERA", "QUATIPURU", "REDENCAO", "RIO MARIA", "RONDON DO PARA", "RUROPOLIS", "SALINOPOLIS", "SALVATERRA", "SANTA BARBARA DO PARA", "SANTA ISABEL DO PARA", "SANTA LUZIA DO PARA", "SANTA MARIA DAS BARREIRAS", "SANTA MARIA DO PARA", "SANTANA DO ARAGUAIA", "SANTAREM", "SANTAREM NOVO", "SANTO ANTONIO DO TAUA", "SAO CAETANO DE ODIVELAS", "SAO DOMINGOS DO ARAGUAIA", "SAO DOMINGOS DO CAPIM", "SAO FELIX DO XINGU", "SAO FRANCISCO DO PARA", "SAO GERALDO DO ARAGUAIA", "SAO JOAO DA PONTA", "SAO JOAO DE PIRABAS", "SAO JOAO DO ARAGUAIA", "SAO MIGUEL DO GUAMA", "SAO SEBASTIAO DA BOA VISTA", "SAPUCAIA", "SENADOR JOSE PORFIRIO", "SOURE", "TAILANDIA", "TERRA ALTA", "TERRA SANTA", "TOME-ACU", "TRACUATEUA", "TRAIRAO", "TUCUMA", "TUCURUI", "ULIANOPOLIS", "URUARA", "VIGIA", "VISEU", "VITORIA DO XINGU", "XINGUARA"],
  PB: ["AGUA BRANCA", "AGUIAR", "ALAGOA GRANDE", "ALAGOA NOVA", "ALAGOINHA", "ALCANTIL", "ALGODAO DE JANDAIRA", "ALHANDRA", "AMPARO", "APARECIDA", "ARACAGI", "ARARA", "ARARUNA", "AREIA", "AREIA DE BARAUNAS", "AREIAL", "AROEIRAS", "ASSUNCAO", "BAIA DA TRAICAO", "BANANEIRAS", "BARAUNA", "BARRA DE SANTA ROSA", "BARRA DE SANTANA", "BARRA DE SAO MIGUEL", "BAYEUX", "BELEM", "BELEM DO BREJO DO CRUZ", "BERNARDINO BATISTA", "BOA VENTURA", "BOA VISTA", "BOM JESUS", "BOM SUCESSO", "BONITO DE SANTA FE", "BOQUEIRAO", "BORBOREMA", "BREJO DO CRUZ", "BREJO DOS SANTOS", "CAAPORA", "CABACEIRAS", "CABEDELO", "CACHOEIRA DOS INDIOS", "CACIMBA DE AREIA", "CACIMBA DE DENTRO", "CACIMBAS", "CAICARA", "CAJAZEIRAS", "CAJAZEIRINHAS", "CALDAS BRANDAO", "CAMALAU", "CAMPINA GRANDE", "CAPIM", "CARAUBAS", "CARRAPATEIRA", "CASSERENGUE", "CATINGUEIRA", "CATOLE DO ROCHA", "CATURITE", "CONCEICAO", "CONDADO", "CONDE", "CONGO", "COREMAS", "COXIXOLA", "CRUZ DO ESPIRITO SANTO", "CUBATI", "CUITE", "CUITE DE MAMANGUAPE", "CUITEGI", "CURRAL DE CIMA", "CURRAL VELHO", "DAMIAO", "DESTERRO", "DIAMANTE", "DONA INES", "DUAS ESTRADAS", "EMAS", "ESPERANCA", "FAGUNDES", "FREI MARTINHO", "GADO BRAVO", "GUARABIRA", "GURINHEM", "GURJAO", "IBIARA", "IGARACY", "IMACULADA", "INGA", "ITABAIANA", "ITAPORANGA", "ITAPOROROCA", "ITATUBA", "JACARAU", "JERICO", "JOAO PESSOA", "JOCA CLAUDINO", "JUAREZ TAVORA", "JUAZEIRINHO", "JUNCO DO SERIDO", "JURIPIRANGA", "JURU", "LAGOA", "LAGOA DE DENTRO", "LAGOA SECA", "LASTRO", "LIVRAMENTO", "LOGRADOURO", "LUCENA", "MAE D'AGUA", "MALTA", "MAMANGUAPE", "MANAIRA", "MARCACAO", "MARI", "MARIZOPOLIS", "MASSARANDUBA", "MATARACA", "MATINHAS", "MATO GROSSO", "MATUREIA", "MOGEIRO", "MONTADAS", "MONTE HOREBE", "MONTEIRO", "MULUNGU", "NATUBA", "NAZAREZINHO", "NOVA FLORESTA", "NOVA OLINDA", "NOVA PALMEIRA", "OLHO D'AGUA", "OLIVEDOS", "OURO VELHO", "PARARI", "PASSAGEM", "PATOS", "PAULISTA", "PEDRA BRANCA", "PEDRA LAVRADA", "PEDRAS DE FOGO", "PEDRO REGIS", "PIANCO", "PICUI", "PILAR", "PILOES", "PILOEZINHOS", "PIRPIRITUBA", "PITIMBU", "POCINHOS", "POCO DANTAS", "POCO DE JOSE DE MOURA", "POMBAL", "PRATA", "PRINCESA ISABEL", "PUXINANA", "QUEIMADAS", "QUIXABA", "REMIGIO", "RIACHAO", "RIACHAO DO BACAMARTE", "RIACHAO DO POCO", "RIACHO DE SANTO ANTONIO", "RIACHO DOS CAVALOS", "RIO TINTO", "SALGADO DE SAO FELIX", "SANTA CECILIA", "SANTA CRUZ", "SANTA HELENA", "SANTA INES", "SANTA LUZIA", "SANTA RITA", "SANTA TERESINHA", "SANTANA DE MANGUEIRA", "SANTANA DOS GARROTES", "SANTO ANDRE", "SAO BENTINHO", "SAO BENTO", "SAO DOMINGOS", "SAO DOMINGOS DO CARIRI", "SAO FRANCISCO", "SAO JOAO DO CARIRI", "SAO JOAO DO RIO DO PEIXE", "SAO JOAO DO TIGRE", "SAO JOSE DA LAGOA TAPADA", "SAO JOSE DE CAIANA", "SAO JOSE DE ESPINHARAS", "SAO JOSE DE PIRANHAS", "SAO JOSE DE PRINCESA", "SAO JOSE DO BONFIM", "SAO JOSE DO BREJO DO CRUZ", "SAO JOSE DO SABUGI", "SAO JOSE DOS CORDEIROS", "SAO JOSE DOS RAMOS", "SAO MAMEDE", "SAO MIGUEL DE TAIPU", "SAO SEBASTIAO DE LAGOA DE ROCA", "SAO SEBASTIAO DO UMBUZEIRO", "SAO VICENTE DO SERIDO", "SAPE", "SERRA BRANCA", "SERRA DA RAIZ", "SERRA GRANDE", "SERRA REDONDA", "SERRARIA", "SOBRADO", "SOLANEA", "SOLEDADE", "SOSSEGO", "SOUSA", "SUME", "TACIMA", "TAPEROA", "TAVARES", "TEIXEIRA", "TENORIO", "TRIUNFO", "UIRAUNA", "UMBUZEIRO", "VARZEA", "VIEIROPOLIS", "VISTA SERRANA", "ZABELE"],
  PE: ["ABREU E LIMA", "AFOGADOS DA INGAZEIRA", "AFRANIO", "AGRESTINA", "AGUA PRETA", "AGUAS BELAS", "ALAGOINHA", "ALIANCA", "ALTINHO", "AMARAJI", "ANGELIM", "ARACOIABA", "ARARIPINA", "ARCOVERDE", "BARRA DE GUABIRABA", "BARREIROS", "BELEM DE MARIA", "BELEM DO SAO FRANCISCO", "BELO JARDIM", "BETANIA", "BEZERROS", "BODOCO", "BOM CONSELHO", "BOM JARDIM", "BONITO", "BREJAO", "BREJINHO", "BREJO DA MADRE DE DEUS", "BUENOS AIRES", "BUIQUE", "CABO DE SANTO AGOSTINHO", "CABROBO", "CACHOEIRINHA", "CAETES", "CALCADO", "CALUMBI", "CAMARAGIBE", "CAMOCIM DE SAO FELIX", "CAMUTANGA", "CANHOTINHO", "CAPOEIRAS", "CARNAIBA", "CARNAUBEIRA DA PENHA", "CARPINA", "CARUARU", "CASINHAS", "CATENDE", "CEDRO", "CHA DE ALEGRIA", "CHA GRANDE", "CONDADO", "CORRENTES", "CORTES", "CUMARU", "CUPIRA", "CUSTODIA", "DORMENTES", "ESCADA", "EXU", "FEIRA NOVA", "FERNANDO DE NORONHA", "FERREIROS", "FLORES", "FLORESTA", "FREI MIGUELINHO", "GAMELEIRA", "GARANHUNS", "GLORIA DO GOITA", "GOIANA", "GRANITO", "GRAVATA", "IATI", "IBIMIRIM", "IBIRAJUBA", "IGARASSU", "IGUARACY", "ILHA DE ITAMARACA", "INAJA", "INGAZEIRA", "IPOJUCA", "IPUBI", "ITACURUBA", "ITAIBA", "ITAMBE", "ITAPETIM", "ITAPISSUMA", "ITAQUITINGA", "JABOATAO DOS GUARARAPES", "JAQUEIRA", "JATAUBA", "JATOBA", "JOAO ALFREDO", "JOAQUIM NABUCO", "JUCATI", "JUPI", "JUREMA", "LAGOA DE ITAENGA", "LAGOA DO CARRO", "LAGOA DO OURO", "LAGOA DOS GATOS", "LAGOA GRANDE", "LAJEDO", "LIMOEIRO", "MACAPARANA", "MACHADOS", "MANARI", "MARAIAL", "MIRANDIBA", "MOREILANDIA", "MORENO", "NAZARE DA MATA", "OLINDA", "OROBO", "OROCO", "OURICURI", "PALMARES", "PALMEIRINA", "PANELAS", "PARANATAMA", "PARNAMIRIM", "PASSIRA", "PAUDALHO", "PAULISTA", "PEDRA", "PESQUEIRA", "PETROLANDIA", "PETROLINA", "POCAO", "POMBOS", "PRIMAVERA", "QUIPAPA", "QUIXABA", "RECIFE", "RIACHO DAS ALMAS", "RIBEIRAO", "RIO FORMOSO", "SAIRE", "SALGADINHO", "SALGUEIRO", "SALOA", "SANHARO", "SANTA CRUZ", "SANTA CRUZ DA BAIXA VERDE", "SANTA CRUZ DO CAPIBARIBE", "SANTA FILOMENA", "SANTA MARIA DA BOA VISTA", "SANTA MARIA DO CAMBUCA", "SANTA TEREZINHA", "SAO BENEDITO DO SUL", "SAO BENTO DO UNA", "SAO CAITANO", "SAO JOAO", "SAO JOAQUIM DO MONTE", "SAO JOSE DA COROA GRANDE", "SAO JOSE DO BELMONTE", "SAO JOSE DO EGITO", "SAO LOURENCO DA MATA", "SAO VICENTE FERRER", "SERRA TALHADA", "SERRITA", "SERTANIA", "SIRINHAEM", "SOLIDAO", "SURUBIM", "TABIRA", "TACAIMBO", "TACARATU", "TAMANDARE", "TAQUARITINGA DO NORTE", "TEREZINHA", "TERRA NOVA", "TIMBAUBA", "TORITAMA", "TRACUNHAEM", "TRINDADE", "TRIUNFO", "TUPANATINGA", "TUPARETAMA", "VENTUROSA", "VERDEJANTE", "VERTENTE DO LERIO", "VERTENTES", "VICENCIA", "VITORIA DE SANTO ANTAO", "XEXEU"],
  PI: ["ACAUA", "AGRICOLANDIA", "AGUA BRANCA", "ALAGOINHA DO PIAUI", "ALEGRETE DO PIAUI", "ALTO LONGA", "ALTOS", "ALVORADA DO GURGUEIA", "AMARANTE", "ANGICAL DO PIAUI", "ANISIO DE ABREU", "ANTONIO ALMEIDA", "AROAZES", "AROEIRAS DO ITAIM", "ARRAIAL", "ASSUNCAO DO PIAUI", "AVELINO LOPES", "BAIXA GRANDE DO RIBEIRO", "BARRA D'ALCANTARA", "BARRAS", "BARREIRAS DO PIAUI", "BARRO DURO", "BATALHA", "BELA VISTA DO PIAUI", "BELEM DO PIAUI", "BENEDITINOS", "BERTOLINIA", "BETANIA DO PIAUI", "BOA HORA", "BOCAINA", "BOM JESUS", "BOM PRINCIPIO DO PIAUI", "BONFIM DO PIAUI", "BOQUEIRAO DO PIAUI", "BRASILEIRA", "BREJO DO PIAUI", "BURITI DOS LOPES", "BURITI DOS MONTES", "CABECEIRAS DO PIAUI", "CAJAZEIRAS DO PIAUI", "CAJUEIRO DA PRAIA", "CALDEIRAO GRANDE DO PIAUI", "CAMPINAS DO PIAUI", "CAMPO ALEGRE DO FIDALGO", "CAMPO GRANDE DO PIAUI", "CAMPO LARGO DO PIAUI", "CAMPO MAIOR", "CANAVIEIRA", "CANTO DO BURITI", "CAPITAO DE CAMPOS", "CAPITAO GERVASIO OLIVEIRA", "CARACOL", "CARAUBAS DO PIAUI", "CARIDADE DO PIAUI", "CASTELO DO PIAUI", "CAXINGO", "COCAL", "COCAL DE TELHA", "COCAL DOS ALVES", "COIVARAS", "COLONIA DO GURGUEIA", "COLONIA DO PIAUI", "CONCEICAO DO CANINDE", "CORONEL JOSE DIAS", "CORRENTE", "CRISTALANDIA DO PIAUI", "CRISTINO CASTRO", "CURIMATA", "CURRAL NOVO DO PIAUI", "CURRALINHOS", "DEMERVAL LOBAO", "DIRCEU ARCOVERDE", "DOM EXPEDITO LOPES", "DOM INOCENCIO", "DOMINGOS MOURAO", "ELESBAO VELOSO", "ELISEU MARTINS", "ESPERANTINA", "FARTURA DO PIAUI", "FLORES DO PIAUI", "FLORESTA DO PIAUI", "FLORIANO", "FRANCINOPOLIS", "FRANCISCO AYRES", "FRANCISCO MACEDO", "FRANCISCO SANTOS", "FRONTEIRAS", "GEMINIANO", "GILBUES", "GUADALUPE", "GUARIBAS", "HUGO NAPOLEAO", "ILHA GRANDE", "INHUMA", "IPIRANGA DO PIAUI", "ISAIAS COELHO", "ITAINOPOLIS", "ITAUEIRA", "JACOBINA DO PIAUI", "JAICOS", "JARDIM DO MULATO", "JATOBA DO PIAUI", "JERUMENHA", "JOAO COSTA", "JOAQUIM PIRES", "JOCA MARQUES", "JOSE DE FREITAS", "JUAZEIRO DO PIAUI", "JULIO BORGES", "JUREMA", "LAGOA ALEGRE", "LAGOA DE SAO FRANCISCO", "LAGOA DO BARRO DO PIAUI", "LAGOA DO PIAUI", "LAGOA DO SITIO", "LAGOINHA DO PIAUI", "LANDRI SALES", "LUIS CORREIA", "LUZILANDIA", "MADEIRO", "MANOEL EMIDIO", "MARCOLANDIA", "MARCOS PARENTE", "MASSAPE DO PIAUI", "MATIAS OLIMPIO", "MIGUEL ALVES", "MIGUEL LEAO", "MILTON BRANDAO", "MONSENHOR GIL", "MONSENHOR HIPOLITO", "MONTE ALEGRE DO PIAUI", "MORRO CABECA NO TEMPO", "MORRO DO CHAPEU DO PIAUI", "MURICI DOS PORTELAS", "NAZARE DO PIAUI", "NAZARIA", "NOSSA SENHORA DE NAZARE", "NOSSA SENHORA DOS REMEDIOS", "NOVA SANTA RITA", "NOVO ORIENTE DO PIAUI", "NOVO SANTO ANTONIO", "OEIRAS", "PADRE MARCOS", "PAES LANDIM", "PAJEU DO PIAUI", "PALMEIRA DO PIAUI", "PALMEIRAIS", "PAQUETA", "PARNAGUA", "PARNAIBA", "PASSAGEM FRANCA DO PIAUI", "PATOS DO PIAUI", "PAU D'ARCO DO PIAUI", "PAULISTANA", "PAVUSSU", "PEDRO II", "PEDRO LAURENTINO", "PICOS", "PIMENTEIRAS", "PIO IX", "PIRACURUCA", "PIRIPIRI", "PORTO", "PORTO ALEGRE DO PIAUI", "PRATA DO PIAUI", "QUEIMADA NOVA", "REDENCAO DO GURGUEIA", "REGENERACAO", "RIACHO FRIO", "RIBEIRA DO PIAUI", "RIBEIRO GONCALVES", "RIO GRANDE DO PIAUI", "SANTA CRUZ DO PIAUI", "SANTA CRUZ DOS MILAGRES", "SANTA FILOMENA", "SANTA LUZ", "SANTA ROSA DO PIAUI", "SANTANA DO PIAUI", "SANTO ANTONIO DE LISBOA", "SANTO INACIO DO PIAUI", "SAO BRAZ DO PIAUI", "SAO FELIX DO PIAUI", "SAO FRANCISCO DE ASSIS DO PIAUI", "SAO FRANCISCO DO PIAUI", "SAO GONCALO DO GURGUEIA", "SAO GONCALO DO PIAUI", "SAO JOAO DA CANABRAVA", "SAO JOAO DA FRONTEIRA", "SAO JOAO DA SERRA", "SAO JOAO DA VARJOTA", "SAO JOAO DO ARRAIAL", "SAO JOAO DO PIAUI", "SAO JOSE DO DIVINO", "SAO JOSE DO PEIXE", "SAO JOSE DO PIAUI", "SAO JULIAO", "SAO LOURENCO DO PIAUI", "SAO LUIS DO PIAUI", "SAO MIGUEL DA BAIXA GRANDE", "SAO MIGUEL DO FIDALGO", "SAO MIGUEL DO TAPUIO", "SAO PEDRO DO PIAUI", "SAO RAIMUNDO NONATO", "SEBASTIAO BARROS", "SEBASTIAO LEAL", "SIGEFREDO PACHECO", "SIMOES", "SIMPLICIO MENDES", "SOCORRO DO PIAUI", "SUSSUAPARA", "TAMBORIL DO PIAUI", "TANQUE DO PIAUI", "TERESINA", "UNIAO", "URUCUI", "VALENCA DO PIAUI", "VARZEA BRANCA", "VARZEA GRANDE", "VERA MENDES", "VILA NOVA DO PIAUI", "WALL FERRAZ"],
  PR: ["ABATIA", "ADRIANOPOLIS", "AGUDOS DO SUL", "ALMIRANTE TAMANDARE", "ALTAMIRA DO PARANA", "ALTO PARAISO", "ALTO PARANA", "ALTO PIQUIRI", "ALTONIA", "ALVORADA DO SUL", "AMAPORA", "AMPERE", "ANAHY", "ANDIRA", "ANGULO", "ANTONINA", "ANTONIO OLINTO", "APUCARANA", "ARAPONGAS", "ARAPOTI", "ARAPUA", "ARARUNA", "ARAUCARIA", "ARIRANHA DO IVAI", "ASSAI", "ASSIS CHATEAUBRIAND", "ASTORGA", "ATALAIA", "BALSA NOVA", "BANDEIRANTES", "BARBOSA FERRAZ", "BARRA DO JACARE", "BARRACAO", "BELA VISTA DA CAROBA", "BELA VISTA DO PARAISO", "BITURUNA", "BOA ESPERANCA", "BOA ESPERANCA DO IGUACU", "BOA VENTURA DE SAO ROQUE", "BOA VISTA DA APARECIDA", "BOCAIUVA DO SUL", "BOM JESUS DO SUL", "BOM SUCESSO", "BOM SUCESSO DO SUL", "BORRAZOPOLIS", "BRAGANEY", "BRASILANDIA DO SUL", "CAFEARA", "CAFELANDIA", "CAFEZAL DO SUL", "CALIFORNIA", "CAMBARA", "CAMBE", "CAMBIRA", "CAMPINA DA LAGOA", "CAMPINA DO SIMAO", "CAMPINA GRANDE DO SUL", "CAMPO BONITO", "CAMPO DO TENENTE", "CAMPO LARGO", "CAMPO MAGRO", "CAMPO MOURAO", "CANDIDO DE ABREU", "CANDOI", "CANTAGALO", "CAPANEMA", "CAPITAO LEONIDAS MARQUES", "CARAMBEI", "CARLOPOLIS", "CASCAVEL", "CASTRO", "CATANDUVAS", "CENTENARIO DO SUL", "CERRO AZUL", "CEU AZUL", "CHOPINZINHO", "CIANORTE", "CIDADE GAUCHA", "CLEVELANDIA", "COLOMBO", "COLORADO", "CONGONHINHAS", "CONSELHEIRO MAIRINCK", "CONTENDA", "CORBELIA", "CORNELIO PROCOPIO", "CORONEL DOMINGOS SOARES", "CORONEL VIVIDA", "CORUMBATAI DO SUL", "CRUZ MACHADO", "CRUZEIRO DO IGUACU", "CRUZEIRO DO OESTE", "CRUZEIRO DO SUL", "CRUZMALTINA", "CURITIBA", "CURIUVA", "DIAMANTE D'OESTE", "DIAMANTE DO NORTE", "DIAMANTE DO SUL", "DOIS VIZINHOS", "DOURADINA", "DOUTOR CAMARGO", "DOUTOR ULYSSES", "ENEAS MARQUES", "ENGENHEIRO BELTRAO", "ENTRE RIOS DO OESTE", "ESPERANCA NOVA", "ESPIGAO ALTO DO IGUACU", "FAROL", "FAXINAL", "FAZENDA RIO GRANDE", "FENIX", "FERNANDES PINHEIRO", "FIGUEIRA", "FLOR DA SERRA DO SUL", "FLORAI", "FLORESTA", "FLORESTOPOLIS", "FLORIDA", "FORMOSA DO OESTE", "FOZ DO IGUACU", "FOZ DO JORDAO", "FRANCISCO ALVES", "FRANCISCO BELTRAO", "GENERAL CARNEIRO", "GODOY MOREIRA", "GOIOERE", "GOIOXIM", "GRANDES RIOS", "GUAIRA", "GUAIRACA", "GUAMIRANGA", "GUAPIRAMA", "GUAPOREMA", "GUARACI", "GUARANIACU", "GUARAPUAVA", "GUARAQUECABA", "GUARATUBA", "HONORIO SERPA", "IBAITI", "IBEMA", "IBIPORA", "ICARAIMA", "IGUARACU", "IGUATU", "IMBAU", "IMBITUVA", "INACIO MARTINS", "INAJA", "INDIANOPOLIS", "IPIRANGA", "IPORA", "IRACEMA DO OESTE", "IRATI", "IRETAMA", "ITAGUAJE", "ITAIPULANDIA", "ITAMBARACA", "ITAMBE", "ITAPEJARA D'OESTE", "ITAPERUCU", "ITAUNA DO SUL", "IVAI", "IVAIPORA", "IVATE", "IVATUBA", "JABOTI", "JACAREZINHO", "JAGUAPITA", "JAGUARIAIVA", "JANDAIA DO SUL", "JANIOPOLIS", "JAPIRA", "JAPURA", "JARDIM ALEGRE", "JATAIZINHO", "JESUITAS", "JOAQUIM TAVORA", "JUNDIAI DO SUL", "JURANDA", "JUSSARA", "KALORE", "LAPA", "LARANJAL", "LARANJEIRAS DO SUL", "LEOPOLIS", "LIDIANOPOLIS", "LINDOESTE", "LOANDA", "LOBATO", "LONDRINA", "LUIZIANA", "LUNARDELLI", "LUPIONOPOLIS", "MALLET", "MAMBORE", "MANDAGUACU", "MANDAGUARI", "MANDIRITUBA", "MANFRINOPOLIS", "MANGUEIRINHA", "MANOEL RIBAS", "MARECHAL CANDIDO RONDON", "MARIA HELENA", "MARIALVA", "MARILANDIA DO SUL", "MARILENA", "MARILUZ", "MARINGA", "MARIOPOLIS", "MARIPA", "MARMELEIRO", "MARQUINHO", "MARUMBI", "MATELANDIA", "MATINHOS", "MATO RICO", "MAUA DA SERRA", "MEDIANEIRA", "MERCEDES", "MIRADOR", "MIRASELVA", "MISSAL", "MOREIRA SALES", "MORRETES", "MUNHOZ DE MELO", "NOSSA SENHORA DAS GRACAS", "NOVA ALIANCA DO IVAI", "NOVA AMERICA DA COLINA", "NOVA AURORA", "NOVA CANTU", "NOVA ESPERANCA", "NOVA ESPERANCA DO SUDOESTE", "NOVA FATIMA", "NOVA LARANJEIRAS", "NOVA LONDRINA", "NOVA OLIMPIA", "NOVA PRATA DO IGUACU", "NOVA SANTA BARBARA", "NOVA SANTA ROSA", "NOVA TEBAS", "NOVO ITACOLOMI", "ORTIGUEIRA", "OURIZONA", "OURO VERDE DO OESTE", "PAICANDU", "PALMAS", "PALMEIRA", "PALMITAL", "PALOTINA", "PARAISO DO NORTE", "PARANACITY", "PARANAGUA", "PARANAPOEMA", "PARANAVAI", "PATO BRAGADO", "PATO BRANCO", "PAULA FREITAS", "PAULO FRONTIN", "PEABIRU", "PEROBAL", "PEROLA", "PEROLA D'OESTE", "PIEN", "PINHAIS", "PINHAL DE SAO BENTO", "PINHALAO", "PINHAO", "PIRAI DO SUL", "PIRAQUARA", "PITANGA", "PITANGUEIRAS", "PLANALTINA DO PARANA", "PLANALTO", "PONTA GROSSA", "PONTAL DO PARANA", "PORECATU", "PORTO AMAZONAS", "PORTO BARREIRO", "PORTO RICO", "PORTO VITORIA", "PRADO FERREIRA", "PRANCHITA", "PRESIDENTE CASTELO BRANCO", "PRIMEIRO DE MAIO", "PRUDENTOPOLIS", "QUARTO CENTENARIO", "QUATIGUA", "QUATRO BARRAS", "QUATRO PONTES", "QUEDAS DO IGUACU", "QUERENCIA DO NORTE", "QUINTA DO SOL", "QUITANDINHA", "RAMILANDIA", "RANCHO ALEGRE", "RANCHO ALEGRE D'OESTE", "REALEZA", "REBOUCAS", "RENASCENCA", "RESERVA", "RESERVA DO IGUACU", "RIBEIRAO CLARO", "RIBEIRAO DO PINHAL", "RIO AZUL", "RIO BOM", "RIO BONITO DO IGUACU", "RIO BRANCO DO IVAI", "RIO BRANCO DO SUL", "RIO NEGRO", "ROLANDIA", "RONCADOR", "RONDON", "ROSARIO DO IVAI", "SABAUDIA", "SALGADO FILHO", "SALTO DO ITARARE", "SALTO DO LONTRA", "SANTA AMELIA", "SANTA CECILIA DO PAVAO", "SANTA CRUZ DE MONTE CASTELO", "SANTA FE", "SANTA HELENA", "SANTA INES", "SANTA ISABEL DO IVAI", "SANTA IZABEL DO OESTE", "SANTA LUCIA", "SANTA MARIA DO OESTE", "SANTA MARIANA", "SANTA MONICA", "SANTA TEREZA DO OESTE", "SANTA TEREZINHA DE ITAIPU", "SANTANA DO ITARARE", "SANTO ANTONIO DA PLATINA", "SANTO ANTONIO DO CAIUA", "SANTO ANTONIO DO PARAISO", "SANTO ANTONIO DO SUDOESTE", "SANTO INACIO", "SAO CARLOS DO IVAI", "SAO JERONIMO DA SERRA", "SAO JOAO", "SAO JOAO DO CAIUA", "SAO JOAO DO IVAI", "SAO JOAO DO TRIUNFO", "SAO JORGE D'OESTE", "SAO JORGE DO IVAI", "SAO JORGE DO PATROCINIO", "SAO JOSE DA BOA VISTA", "SAO JOSE DAS PALMEIRAS", "SAO JOSE DOS PINHAIS", "SAO MANOEL DO PARANA", "SAO MATEUS DO SUL", "SAO MIGUEL DO IGUACU", "SAO PEDRO DO IGUACU", "SAO PEDRO DO IVAI", "SAO PEDRO DO PARANA", "SAO SEBASTIAO DA AMOREIRA", "SAO TOME", "SAPOPEMA", "SARANDI", "SAUDADE DO IGUACU", "SENGES", "SERRANOPOLIS DO IGUACU", "SERTANEJA", "SERTANOPOLIS", "SIQUEIRA CAMPOS", "SULINA", "TAMARANA", "TAMBOARA", "TAPEJARA", "TAPIRA", "TEIXEIRA SOARES", "TELEMACO BORBA", "TERRA BOA", "TERRA RICA", "TERRA ROXA", "TIBAGI", "TIJUCAS DO SUL", "TOLEDO", "TOMAZINA", "TRES BARRAS DO PARANA", "TUNAS DO PARANA", "TUNEIRAS DO OESTE", "TUPASSI", "TURVO", "UBIRATA", "UMUARAMA", "UNIAO DA VITORIA", "UNIFLOR", "URAI", "VENTANIA", "VERA CRUZ DO OESTE", "VERE", "VIRMOND", "VITORINO", "WENCESLAU BRAZ", "XAMBRE"],
  RJ: ["ANGRA DOS REIS", "APERIBE", "ARARUAMA", "AREAL", "ARMACAO DOS BUZIOS", "ARRAIAL DO CABO", "BARRA DO PIRAI", "BARRA MANSA", "BELFORD ROXO", "BOM JARDIM", "BOM JESUS DO ITABAPOANA", "CABO FRIO", "CACHOEIRAS DE MACACU", "CAMBUCI", "CAMPOS DOS GOYTACAZES", "CANTAGALO", "CARAPEBUS", "CARDOSO MOREIRA", "CARMO", "CASIMIRO DE ABREU", "COMENDADOR LEVY GASPARIAN", "CONCEICAO DE MACABU", "CORDEIRO", "DUAS BARRAS", "DUQUE DE CAXIAS", "ENGENHEIRO PAULO DE FRONTIN", "GUAPIMIRIM", "IGUABA GRANDE", "ITABORAI", "ITAGUAI", "ITALVA", "ITAOCARA", "ITAPERUNA", "ITATIAIA", "JAPERI", "LAJE DO MURIAE", "MACAE", "MACUCO", "MAGE", "MANGARATIBA", "MARICA", "MENDES", "MESQUITA", "MIGUEL PEREIRA", "MIRACEMA", "NATIVIDADE", "NILOPOLIS", "NITEROI", "NOVA FRIBURGO", "NOVA IGUACU", "PARACAMBI", "PARAIBA DO SUL", "PARATY", "PATY DO ALFERES", "PETROPOLIS", "PINHEIRAL", "PIRAI", "PORCIUNCULA", "PORTO REAL", "QUATIS", "QUEIMADOS", "QUISSAMA", "RESENDE", "RIO BONITO", "RIO CLARO", "RIO DAS FLORES", "RIO DAS OSTRAS", "RIO DE JANEIRO", "SANTA MARIA MADALENA", "SANTO ANTONIO DE PADUA", "SAO FIDELIS", "SAO FRANCISCO DE ITABAPOANA", "SAO GONCALO", "SAO JOAO DA BARRA", "SAO JOAO DE MERITI", "SAO JOSE DE UBA", "SAO JOSE DO VALE DO RIO PRETO", "SAO PEDRO DA ALDEIA", "SAO SEBASTIAO DO ALTO", "SAPUCAIA", "SAQUAREMA", "SEROPEDICA", "SILVA JARDIM", "SUMIDOURO", "TANGUA", "TERESOPOLIS", "TRAJANO DE MORAES", "TRES RIOS", "VALENCA", "VARRE-SAI", "VASSOURAS", "VOLTA REDONDA"],
  RN: ["ACARI", "ACU", "AFONSO BEZERRA", "ALEXANDRIA", "ALMINO AFONSO", "ALTO DO RODRIGUES", "ANGICOS", "ANTONIO MARTINS", "APODI", "AREIA BRANCA", "AREZ", "BAIA FORMOSA", "BARAUNA", "BARCELONA", "BENTO FERNANDES", "BOA SAUDE", "BOM JESUS", "BREJINHO", "CAICARA DO NORTE", "CAICARA DO RIO DO VENTO", "CAICO", "CAMPO GRANDE", "CAMPO REDONDO", "CANGUARETAMA", "CARAUBAS", "CARNAUBA DOS DANTAS", "CARNAUBAIS", "CEARA-MIRIM", "CERRO CORA", "CORONEL EZEQUIEL", "CORONEL JOAO PESSOA", "CRUZETA", "CURRAIS NOVOS", "DOUTOR SEVERIANO", "ENCANTO", "EQUADOR", "ESPIRITO SANTO", "EXTREMOZ", "FELIPE GUERRA", "FERNANDO PEDROZA", "FLORANIA", "FRANCISCO DANTAS", "FRUTUOSO GOMES", "GALINHOS", "GOIANINHA", "GOVERNADOR DIX-SEPT ROSADO", "GROSSOS", "GUAMARE", "IELMO MARINHO", "IPANGUACU", "IPUEIRA", "ITAJA", "ITAU", "JACANA", "JANDAIRA", "JANDUIS", "JAPI", "JARDIM DE PIRANHAS", "JARDIM DO SERIDO", "JOAO CAMARA", "JOAO DIAS", "JOSE DA PENHA", "JUCURUTU", "LAGOA D'ANTA", "LAGOA DE PEDRAS", "LAGOA DE VELHOS", "LAGOA NOVA", "LAGOA SALGADA", "LAJES", "LAJES PINTADAS", "LUCRECIA", "LUIS GOMES", "MACAIBA", "MACAU", "MAJOR SALES", "MARCELINO VIEIRA", "MARTINS", "MAXARANGUAPE", "MESSIAS TARGINO", "MONTANHAS", "MONTE ALEGRE", "MONTE DAS GAMELEIRAS", "MOSSORO", "NATAL", "NISIA FLORESTA", "NOVA CRUZ", "OLHO-D'AGUA DO BORGES", "OURO BRANCO", "PARANA", "PARAU", "PARAZINHO", "PARELHAS", "PARNAMIRIM", "PASSA E FICA", "PASSAGEM", "PATU", "PAU DOS FERROS", "PEDRA GRANDE", "PEDRO AVELINO", "PEDRO VELHO", "PENDENCIAS", "PILOES", "POCO BRANCO", "PORTALEGRE", "PORTO DO MANGUE", "PUREZA", "RAFAEL FERNANDES", "RAFAEL GODEIRO", "RIACHO DA CRUZ", "RIACHO DE SANTANA", "RIACHUELO", "RIO DO FOGO", "RODOLFO FERNANDES", "SANTA CRUZ", "SANTA MARIA", "SANTANA DO MATOS", "SANTANA DO SERIDO", "SANTO ANTONIO", "SAO BENTO DO NORTE", "SAO BENTO DO TRAIRI", "SAO FERNANDO", "SAO FRANCISCO DO OESTE", "SAO GONCALO DO AMARANTE", "SAO JOAO DO SABUGI", "SAO JOSE DE MIPIBU", "SAO JOSE DO CAMPESTRE", "SAO JOSE DO SERIDO", "SAO MIGUEL", "SAO MIGUEL DO GOSTOSO", "SAO PAULO DO POTENGI", "SAO PEDRO", "SAO RAFAEL", "SAO TOME", "SAO VICENTE", "SENADOR ELOI DE SOUZA", "SENADOR GEORGINO AVELINO", "SERRA CAIADA", "SERRA DE SAO BENTO", "SERRA DO MEL", "SERRA NEGRA DO NORTE", "SERRINHA", "SERRINHA DOS PINTOS", "SEVERIANO MELO", "SITIO NOVO", "TABOLEIRO GRANDE", "TAIPU", "TANGARA", "TENENTE ANANIAS", "TENENTE LAURENTINO CRUZ", "TIBAU", "TIBAU DO SUL", "TOUROS", "TRIUNFO POTIGUAR", "UMARIZAL", "UPANEMA", "VARZEA", "VENHA-VER", "VERA CRUZ", "VICOSA", "VILA FLOR"],
  RO: ["ALTA FLORESTA D'OESTE", "ALTO ALEGRE DOS PARECIS", "ALTO PARAISO", "ALVORADA D'OESTE", "ARIQUEMES", "BURITIS", "CABIXI", "CACAULANDIA", "CACOAL", "CAMPO NOVO DE RONDONIA", "CANDEIAS DO JAMARI", "CASTANHEIRAS", "CEREJEIRAS", "CHUPINGUAIA", "COLORADO DO OESTE", "CORUMBIARA", "COSTA MARQUES", "CUJUBIM", "ESPIGAO DO OESTE", "GOVERNADOR JORGE TEIXEIRA", "GUAJARA-MIRIM", "ITAPUA DO OESTE", "JARU", "JI-PARANA", "MACHADINHO D'OESTE", "MINISTRO ANDREAZZA", "MIRANTE DA SERRA", "MONTE NEGRO", "NOVA BRASILANDIA D'OESTE", "NOVA MAMORE", "NOVA UNIAO", "NOVO HORIZONTE DO OESTE", "OURO PRETO DO OESTE", "PARECIS", "PIMENTA BUENO", "PIMENTEIRAS DO OESTE", "PORTO VELHO", "PRESIDENTE MEDICI", "PRIMAVERA DE RONDONIA", "RIO CRESPO", "ROLIM DE MOURA", "SANTA LUZIA D'OESTE", "SAO FELIPE D'OESTE", "SAO FRANCISCO DO GUAPORE", "SAO MIGUEL DO GUAPORE", "SERINGUEIRAS", "TEIXEIROPOLIS", "THEOBROMA", "URUPA", "VALE DO ANARI", "VALE DO PARAISO", "VILHENA"],
  RR: ["ALTO ALEGRE", "AMAJARI", "BOA VISTA", "BONFIM", "CANTA", "CARACARAI", "CAROEBE", "IRACEMA", "MUCAJAI", "NORMANDIA", "PACARAIMA", "RORAINOPOLIS", "SAO JOAO DA BALIZA", "SAO LUIZ", "UIRAMUTA"],
  RS: ["ACEGUA", "AGUA SANTA", "AGUDO", "AJURICABA", "ALECRIM", "ALEGRETE", "ALEGRIA", "ALMIRANTE TAMANDARE DO SUL", "ALPESTRE", "ALTO ALEGRE", "ALTO FELIZ", "ALVORADA", "AMARAL FERRADOR", "AMETISTA DO SUL", "ANDRE DA ROCHA", "ANTA GORDA", "ANTONIO PRADO", "ARAMBARE", "ARARICA", "ARATIBA", "ARROIO DO MEIO", "ARROIO DO PADRE", "ARROIO DO SAL", "ARROIO DO TIGRE", "ARROIO DOS RATOS", "ARROIO GRANDE", "ARVOREZINHA", "AUGUSTO PESTANA", "AUREA", "BAGE", "BALNEARIO PINHAL", "BARAO", "BARAO DE COTEGIPE", "BARAO DO TRIUNFO", "BARRA DO GUARITA", "BARRA DO QUARAI", "BARRA DO RIBEIRO", "BARRA DO RIO AZUL", "BARRA FUNDA", "BARRACAO", "BARROS CASSAL", "BENJAMIN CONSTANT DO SUL", "BENTO GONCALVES", "BOA VISTA DAS MISSOES", "BOA VISTA DO BURICA", "BOA VISTA DO CADEADO", "BOA VISTA DO INCRA", "BOA VISTA DO SUL", "BOM JESUS", "BOM PRINCIPIO", "BOM PROGRESSO", "BOM RETIRO DO SUL", "BOQUEIRAO DO LEAO", "BOSSOROCA", "BOZANO", "BRAGA", "BROCHIER", "BUTIA", "CACAPAVA DO SUL", "CACEQUI", "CACHOEIRA DO SUL", "CACHOEIRINHA", "CACIQUE DOBLE", "CAIBATE", "CAICARA", "CAMAQUA", "CAMARGO", "CAMBARA DO SUL", "CAMPESTRE DA SERRA", "CAMPINA DAS MISSOES", "CAMPINAS DO SUL", "CAMPO BOM", "CAMPO NOVO", "CAMPOS BORGES", "CANDELARIA", "CANDIDO GODOI", "CANDIOTA", "CANELA", "CANGUCU", "CANOAS", "CANUDOS DO VALE", "CAPAO BONITO DO SUL", "CAPAO DA CANOA", "CAPAO DO CIPO", "CAPAO DO LEAO", "CAPELA DE SANTANA", "CAPITAO", "CAPIVARI DO SUL", "CARAA", "CARAZINHO", "CARLOS BARBOSA", "CASCA", "CASEIROS", "CATUIPE", "CAXIAS DO SUL", "CENTENARIO", "CERRITO", "CERRO BRANCO", "CERRO GRANDE", "CERRO GRANDE DO SUL", "CERRO LARGO", "CHAPADA", "CHARQUEADAS", "CHARRUA", "CHIAPETTA", "CHUI", "CHUVISCA", "CIDREIRA", "CIRIACO", "COLINAS", "COLORADO", "CONDOR", "CONSTANTINA", "COQUEIRO BAIXO", "COQUEIROS DO SUL", "CORONEL BARROS", "CORONEL BICACO", "CORONEL PILAR", "COTIPORA", "COXILHA", "CRISSIUMAL", "CRISTAL", "CRISTAL DO SUL", "CRUZ ALTA", "CRUZALTENSE", "CRUZEIRO DO SUL", "DAVID CANABARRO", "DERRUBADAS", "DEZESSEIS DE NOVEMBRO", "DILERMANDO DE AGUIAR", "DOIS IRMAOS", "DOIS IRMAOS DAS MISSOES", "DOIS LAJEADOS", "DOM FELICIANO", "DOM PEDRITO", "DOM PEDRO DE ALCANTARA", "DONA FRANCISCA", "DOUTOR MAURICIO CARDOSO", "DOUTOR RICARDO", "ELDORADO DO SUL", "ENCANTADO", "ENCRUZILHADA DO SUL", "ENGENHO VELHO", "ENTRE RIOS DO SUL", "ENTRE-IJUIS", "EREBANGO", "ERECHIM", "ERNESTINA", "ERVAL GRANDE", "ERVAL SECO", "ESMERALDA", "ESPERANCA DO SUL", "ESPUMOSO", "ESTACAO", "ESTANCIA VELHA", "ESTEIO", "ESTRELA", "ESTRELA VELHA", "EUGENIO DE CASTRO", "FAGUNDES VARELA", "FARROUPILHA", "FAXINAL DO SOTURNO", "FAXINALZINHO", "FAZENDA VILANOVA", "FELIZ", "FLORES DA CUNHA", "FLORIANO PEIXOTO", "FONTOURA XAVIER", "FORMIGUEIRO", "FORQUETINHA", "FORTALEZA DOS VALOS", "FREDERICO WESTPHALEN", "GARIBALDI", "GARRUCHOS", "GAURAMA", "GENERAL CAMARA", "GENTIL", "GETULIO VARGAS", "GIRUA", "GLORINHA", "GRAMADO", "GRAMADO DOS LOUREIROS", "GRAMADO XAVIER", "GRAVATAI", "GUABIJU", "GUAIBA", "GUAPORE", "GUARANI DAS MISSOES", "HARMONIA", "HERVAL", "HERVEIRAS", "HORIZONTINA", "HULHA NEGRA", "HUMAITA", "IBARAMA", "IBIACA", "IBIRAIARAS", "IBIRAPUITA", "IBIRUBA", "IGREJINHA", "IJUI", "ILOPOLIS", "IMBE", "IMIGRANTE", "INDEPENDENCIA", "INHACORA", "IPE", "IPIRANGA DO SUL", "IRAI", "ITAARA", "ITACURUBI", "ITAPUCA", "ITAQUI", "ITATI", "ITATIBA DO SUL", "IVORA", "IVOTI", "JABOTICABA", "JACUIZINHO", "JACUTINGA", "JAGUARAO", "JAGUARI", "JAQUIRANA", "JARI", "JOIA", "JULIO DE CASTILHOS", "LAGOA BONITA DO SUL", "LAGOA DOS TRES CANTOS", "LAGOA VERMELHA", "LAGOAO", "LAJEADO", "LAJEADO DO BUGRE", "LAVRAS DO SUL", "LIBERATO SALZANO", "LINDOLFO COLLOR", "LINHA NOVA", "MACAMBARA", "MACHADINHO", "MAMPITUBA", "MANOEL VIANA", "MAQUINE", "MARATA", "MARAU", "MARCELINO RAMOS", "MARIANA PIMENTEL", "MARIANO MORO", "MARQUES DE SOUZA", "MATA", "MATO CASTELHANO", "MATO LEITAO", "MATO QUEIMADO", "MAXIMILIANO DE ALMEIDA", "MINAS DO LEAO", "MIRAGUAI", "MONTAURI", "MONTE ALEGRE DOS CAMPOS", "MONTE BELO DO SUL", "MONTENEGRO", "MORMACO", "MORRINHOS DO SUL", "MORRO REDONDO", "MORRO REUTER", "MOSTARDAS", "MUCUM", "MUITOS CAPOES", "MULITERNO", "NAO-ME-TOQUE", "NICOLAU VERGUEIRO", "NONOAI", "NOVA ALVORADA", "NOVA ARACA", "NOVA BASSANO", "NOVA BOA VISTA", "NOVA BRESCIA", "NOVA CANDELARIA", "NOVA ESPERANCA DO SUL", "NOVA HARTZ", "NOVA PADUA", "NOVA PALMA", "NOVA PETROPOLIS", "NOVA PRATA", "NOVA RAMADA", "NOVA ROMA DO SUL", "NOVA SANTA RITA", "NOVO BARREIRO", "NOVO CABRAIS", "NOVO HAMBURGO", "NOVO MACHADO", "NOVO TIRADENTES", "NOVO XINGU", "OSORIO", "PAIM FILHO", "PALMARES DO SUL", "PALMEIRA DAS MISSOES", "PALMITINHO", "PANAMBI", "PANTANO GRANDE", "PARAI", "PARAISO DO SUL", "PARECI NOVO", "PAROBE", "PASSA SETE", "PASSO DO SOBRADO", "PASSO FUNDO", "PAULO BENTO", "PAVERAMA", "PEDRAS ALTAS", "PEDRO OSORIO", "PEJUCARA", "PELOTAS", "PICADA CAFE", "PINHAL", "PINHAL DA SERRA", "PINHAL GRANDE", "PINHEIRINHO DO VALE", "PINHEIRO MACHADO", "PINTO BANDEIRA", "PIRAPO", "PIRATINI", "PLANALTO", "POCO DAS ANTAS", "PONTAO", "PONTE PRETA", "PORTAO", "PORTO ALEGRE", "PORTO LUCENA", "PORTO MAUA", "PORTO VERA CRUZ", "PORTO XAVIER", "POUSO NOVO", "PRESIDENTE LUCENA", "PROGRESSO", "PROTASIO ALVES", "PUTINGA", "QUARAI", "QUATRO IRMAOS", "QUEVEDOS", "QUINZE DE NOVEMBRO", "REDENTORA", "RELVADO", "RESTINGA SECA", "RIO DOS INDIOS", "RIO GRANDE", "RIO PARDO", "RIOZINHO", "ROCA SALES", "RODEIO BONITO", "ROLADOR", "ROLANTE", "RONDA ALTA", "RONDINHA", "ROQUE GONZALES", "ROSARIO DO SUL", "SAGRADA FAMILIA", "SALDANHA MARINHO", "SALTO DO JACUI", "SALVADOR DAS MISSOES", "SALVADOR DO SUL", "SANANDUVA", "SANTA BARBARA DO SUL", "SANTA CECILIA DO SUL", "SANTA CLARA DO SUL", "SANTA CRUZ DO SUL", "SANTA MARGARIDA DO SUL", "SANTA MARIA", "SANTA MARIA DO HERVAL", "SANTA ROSA", "SANTA TEREZA", "SANTA VITORIA DO PALMAR", "SANTANA DA BOA VISTA", "SANTANA DO LIVRAMENTO", "SANTIAGO", "SANTO ANGELO", "SANTO ANTONIO DA PATRULHA", "SANTO ANTONIO DAS MISSOES", "SANTO ANTONIO DO PALMA", "SANTO ANTONIO DO PLANALTO", "SANTO AUGUSTO", "SANTO CRISTO", "SANTO EXPEDITO DO SUL", "SAO BORJA", "SAO DOMINGOS DO SUL", "SAO FRANCISCO DE ASSIS", "SAO FRANCISCO DE PAULA", "SAO GABRIEL", "SAO JERONIMO", "SAO JOAO DA URTIGA", "SAO JOAO DO POLESINE", "SAO JORGE", "SAO JOSE DAS MISSOES", "SAO JOSE DO HERVAL", "SAO JOSE DO HORTENCIO", "SAO JOSE DO INHACORA", "SAO JOSE DO NORTE", "SAO JOSE DO OURO", "SAO JOSE DO SUL", "SAO JOSE DOS AUSENTES", "SAO LEOPOLDO", "SAO LOURENCO DO SUL", "SAO LUIZ GONZAGA", "SAO MARCOS", "SAO MARTINHO", "SAO MARTINHO DA SERRA", "SAO MIGUEL DAS MISSOES", "SAO NICOLAU", "SAO PAULO DAS MISSOES", "SAO PEDRO DA SERRA", "SAO PEDRO DAS MISSOES", "SAO PEDRO DO BUTIA", "SAO PEDRO DO SUL", "SAO SEBASTIAO DO CAI", "SAO SEPE", "SAO VALENTIM", "SAO VALENTIM DO SUL", "SAO VALERIO DO SUL", "SAO VENDELINO", "SAO VICENTE DO SUL", "SAPIRANGA", "SAPUCAIA DO SUL", "SARANDI", "SEBERI", "SEDE NOVA", "SEGREDO", "SELBACH", "SENADOR SALGADO FILHO", "SENTINELA DO SUL", "SERAFINA CORREA", "SERIO", "SERTAO", "SERTAO SANTANA", "SETE DE SETEMBRO", "SEVERIANO DE ALMEIDA", "SILVEIRA MARTINS", "SINIMBU", "SOBRADINHO", "SOLEDADE", "TABAI", "TAPEJARA", "TAPERA", "TAPES", "TAQUARA", "TAQUARI", "TAQUARUCU DO SUL", "TAVARES", "TENENTE PORTELA", "TERRA DE AREIA", "TEUTONIA", "TIO HUGO", "TIRADENTES DO SUL", "TOROPI", "TORRES", "TRAMANDAI", "TRAVESSEIRO", "TRES ARROIOS", "TRES CACHOEIRAS", "TRES COROAS", "TRES DE MAIO", "TRES FORQUILHAS", "TRES PALMEIRAS", "TRES PASSOS", "TRINDADE DO SUL", "TRIUNFO", "TUCUNDUVA", "TUNAS", "TUPANCI DO SUL", "TUPANCIRETA", "TUPANDI", "TUPARENDI", "TURUCU", "UBIRETAMA", "UNIAO DA SERRA", "UNISTALDA", "URUGUAIANA", "VACARIA", "VALE DO SOL", "VALE REAL", "VALE VERDE", "VANINI", "VENANCIO AIRES", "VERA CRUZ", "VERANOPOLIS", "VESPASIANO CORREA", "VIADUTOS", "VIAMAO", "VICENTE DUTRA", "VICTOR GRAEFF", "VILA FLORES", "VILA LANGARO", "VILA MARIA", "VILA NOVA DO SUL", "VISTA ALEGRE", "VISTA ALEGRE DO PRATA", "VISTA GAUCHA", "VITORIA DAS MISSOES", "WESTFALIA", "XANGRI-LA"],
  SC: ["ABDON BATISTA", "ABELARDO LUZ", "AGROLANDIA", "AGRONOMICA", "AGUA DOCE", "AGUAS DE CHAPECO", "AGUAS FRIAS", "AGUAS MORNAS", "ALFREDO WAGNER", "ALTO BELA VISTA", "ANCHIETA", "ANGELINA", "ANITA GARIBALDI", "ANITAPOLIS", "ANTONIO CARLOS", "APIUNA", "ARABUTA", "ARAQUARI", "ARARANGUA", "ARMAZEM", "ARROIO TRINTA", "ARVOREDO", "ASCURRA", "ATALANTA", "AURORA", "BALNEARIO ARROIO DO SILVA", "BALNEARIO BARRA DO SUL", "BALNEARIO CAMBORIU", "BALNEARIO GAIVOTA", "BALNEARIO PICARRAS", "BALNEARIO RINCAO", "BANDEIRANTE", "BARRA BONITA", "BARRA VELHA", "BELA VISTA DO TOLDO", "BELMONTE", "BENEDITO NOVO", "BIGUACU", "BLUMENAU", "BOCAINA DO SUL", "BOM JARDIM DA SERRA", "BOM JESUS", "BOM JESUS DO OESTE", "BOM RETIRO", "BOMBINHAS", "BOTUVERA", "BRACO DO NORTE", "BRACO DO TROMBUDO", "BRUNOPOLIS", "BRUSQUE", "CACADOR", "CAIBI", "CALMON", "CAMBORIU", "CAMPO ALEGRE", "CAMPO BELO DO SUL", "CAMPO ERE", "CAMPOS NOVOS", "CANELINHA", "CANOINHAS", "CAPAO ALTO", "CAPINZAL", "CAPIVARI DE BAIXO", "CATANDUVAS", "CAXAMBU DO SUL", "CELSO RAMOS", "CERRO NEGRO", "CHAPADAO DO LAGEADO", "CHAPECO", "COCAL DO SUL", "CONCORDIA", "CORDILHEIRA ALTA", "CORONEL FREITAS", "CORONEL MARTINS", "CORREIA PINTO", "CORUPA", "CRICIUMA", "CUNHA PORA", "CUNHATAI", "CURITIBANOS", "DESCANSO", "DIONISIO CERQUEIRA", "DONA EMMA", "DOUTOR PEDRINHO", "ENTRE RIOS", "ERMO", "ERVAL VELHO", "FAXINAL DOS GUEDES", "FLOR DO SERTAO", "FLORIANOPOLIS", "FORMOSA DO SUL", "FORQUILHINHA", "FRAIBURGO", "FREI ROGERIO", "GALVAO", "GAROPABA", "GARUVA", "GASPAR", "GOVERNADOR CELSO RAMOS", "GRAO PARA", "GRAVATAL", "GUABIRUBA", "GUARACIABA", "GUARAMIRIM", "GUARUJA DO SUL", "GUATAMBU", "HERVAL D'OESTE", "IBIAM", "IBICARE", "IBIRAMA", "ICARA", "ILHOTA", "IMARUI", "IMBITUBA", "IMBUIA", "INDAIAL", "IOMERE", "IPIRA", "IPORA DO OESTE", "IPUACU", "IPUMIRIM", "IRACEMINHA", "IRANI", "IRATI", "IRINEOPOLIS", "ITA", "ITAIOPOLIS", "ITAJAI", "ITAPEMA", "ITAPIRANGA", "ITAPOA", "ITUPORANGA", "JABORA", "JACINTO MACHADO", "JAGUARUNA", "JARAGUA DO SUL", "JARDINOPOLIS", "JOACABA", "JOINVILLE", "JOSE BOITEUX", "JUPIA", "LACERDOPOLIS", "LAGES", "LAGUNA", "LAJEADO GRANDE", "LAURENTINO", "LAURO MULLER", "LEBON REGIS", "LEOBERTO LEAL", "LINDOIA DO SUL", "LONTRAS", "LUIZ ALVES", "LUZERNA", "MACIEIRA", "MAFRA", "MAJOR GERCINO", "MAJOR VIEIRA", "MARACAJA", "MARAVILHA", "MAREMA", "MASSARANDUBA", "MATOS COSTA", "MELEIRO", "MIRIM DOCE", "MODELO", "MONDAI", "MONTE CARLO", "MONTE CASTELO", "MORRO DA FUMACA", "MORRO GRANDE", "NAVEGANTES", "NOVA ERECHIM", "NOVA ITABERABA", "NOVA TRENTO", "NOVA VENEZA", "NOVO HORIZONTE", "ORLEANS", "OTACILIO COSTA", "OURO", "OURO VERDE", "PAIAL", "PAINEL", "PALHOCA", "PALMA SOLA", "PALMEIRA", "PALMITOS", "PAPANDUVA", "PARAISO", "PASSO DE TORRES", "PASSOS MAIA", "PAULO LOPES", "PEDRAS GRANDES", "PENHA", "PERITIBA", "PESCARIA BRAVA", "PETROLANDIA", "PINHALZINHO", "PINHEIRO PRETO", "PIRATUBA", "PLANALTO ALEGRE", "POMERODE", "PONTE ALTA", "PONTE ALTA DO NORTE", "PONTE SERRADA", "PORTO BELO", "PORTO UNIAO", "POUSO REDONDO", "PRAIA GRANDE", "PRESIDENTE CASTELLO BRANCO", "PRESIDENTE GETULIO", "PRESIDENTE NEREU", "PRINCESA", "QUILOMBO", "RANCHO QUEIMADO", "RIO DAS ANTAS", "RIO DO CAMPO", "RIO DO OESTE", "RIO DO SUL", "RIO DOS CEDROS", "RIO FORTUNA", "RIO NEGRINHO", "RIO RUFINO", "RIQUEZA", "RODEIO", "ROMELANDIA", "SALETE", "SALTINHO", "SALTO VELOSO", "SANGAO", "SANTA CECILIA", "SANTA HELENA", "SANTA ROSA DE LIMA", "SANTA ROSA DO SUL", "SANTA TEREZINHA", "SANTA TEREZINHA DO PROGRESSO", "SANTIAGO DO SUL", "SANTO AMARO DA IMPERATRIZ", "SAO BENTO DO SUL", "SAO BERNARDINO", "SAO BONIFACIO", "SAO CARLOS", "SAO CRISTOVAO DO SUL", "SAO DOMINGOS", "SAO FRANCISCO DO SUL", "SAO JOAO BATISTA", "SAO JOAO DO ITAPERIU", "SAO JOAO DO OESTE", "SAO JOAO DO SUL", "SAO JOAQUIM", "SAO JOSE", "SAO JOSE DO CEDRO", "SAO JOSE DO CERRITO", "SAO LOURENCO DO OESTE", "SAO LUDGERO", "SAO MARTINHO", "SAO MIGUEL DA BOA VISTA", "SAO MIGUEL DO OESTE", "SAO PEDRO DE ALCANTARA", "SAUDADES", "SCHROEDER", "SEARA", "SERRA ALTA", "SIDEROPOLIS", "SOMBRIO", "SUL BRASIL", "TAIO", "TANGARA", "TIGRINHOS", "TIJUCAS", "TIMBE DO SUL", "TIMBO", "TIMBO GRANDE", "TRES BARRAS", "TREVISO", "TREZE DE MAIO", "TREZE TILIAS", "TROMBUDO CENTRAL", "TUBARAO", "TUNAPOLIS", "TURVO", "UNIAO DO OESTE", "URUBICI", "URUPEMA", "URUSSANGA", "VARGEAO", "VARGEM", "VARGEM BONITA", "VIDAL RAMOS", "VIDEIRA", "VITOR MEIRELES", "WITMARSUM", "XANXERE", "XAVANTINA", "XAXIM", "ZORTEA"],
  SE: ["AQUIDABA", "ARACAJU", "ARAUA", "AREIA BRANCA", "BARRA DOS COQUEIROS", "BOQUIM", "CAMPO DO BRITO", "CANINDE DE SAO FRANCISCO", "CAPELA", "CARIRA", "CARMOPOLIS", "CEDRO DE SAO JOAO", "CRISTINAPOLIS", "CUMBE", "DIVINA PASTORA", "ESTANCIA", "FEIRA NOVA", "FREI PAULO", "GARARU", "GRACCHO CARDOSO", "ILHA DAS FLORES", "INDIAROBA", "ITABAIANA", "ITABAIANINHA", "ITABI", "ITAPORANGA D'AJUDA", "JAPARATUBA", "JAPOATA", "LAGARTO", "LARANJEIRAS", "MACAMBIRA", "MALHADA DOS BOIS", "MALHADOR", "MARUIM", "MOITA BONITA", "MONTE ALEGRE DE SERGIPE", "MURIBECA", "NEOPOLIS", "NOSSA SENHORA APARECIDA", "NOSSA SENHORA DA GLORIA", "NOSSA SENHORA DAS DORES", "NOSSA SENHORA DE LOURDES", "NOSSA SENHORA DO SOCORRO", "PACATUBA", "PEDRA MOLE", "PEDRINHAS", "PINHAO", "PIRAMBU", "POCO REDONDO", "POCO VERDE", "PORTO DA FOLHA", "PROPRIA", "RIACHAO DO DANTAS", "RIACHUELO", "RIBEIROPOLIS", "ROSARIO DO CATETE", "SALGADO", "SANTA LUZIA DO ITANHY", "SANTO AMARO DAS BROTAS", "SAO CRISTOVAO", "SAO DOMINGOS", "SAO MIGUEL DO ALEIXO", "SIMAO DIAS", "SIRIRI", "TOBIAS BARRETO", "TOMAR DO GERU", "UMBAUBA"],
  SP: ["ADAMANTINA", "ADOLFO", "AGUAI", "AGUAS DA PRATA", "AGUAS DE LINDOIA", "AGUAS DE SANTA BARBARA", "AGUAS DE SAO PEDRO", "AGUDOS", "ALAMBARI", "ALFREDO MARCONDES", "ALTAIR", "ALTINOPOLIS", "ALTO ALEGRE", "ALUMINIO", "ALVARES FLORENCE", "ALVARES MACHADO", "ALVARO DE CARVALHO", "ALVINLANDIA", "AMERICANA", "AMERICO BRASILIENSE", "AMERICO DE CAMPOS", "AMPARO", "ANALANDIA", "ANDRADINA", "ANGATUBA", "ANHEMBI", "ANHUMAS", "APARECIDA", "APARECIDA D'OESTE", "APIAI", "ARACARIGUAMA", "ARACATUBA", "ARACOIABA DA SERRA", "ARAMINA", "ARANDU", "ARAPEI", "ARARAQUARA", "ARARAS", "ARCO-IRIS", "AREALVA", "AREIAS", "AREIOPOLIS", "ARIRANHA", "ARTUR NOGUEIRA", "ARUJA", "ASPASIA", "ASSIS", "ATIBAIA", "AURIFLAMA", "AVAI", "AVANHANDAVA", "AVARE", "BADY BASSITT", "BALBINOS", "BALSAMO", "BANANAL", "BARBOSA", "BARIRI", "BARRA BONITA", "BARRA DO CHAPEU", "BARRA DO TURVO", "BARRETOS", "BARRINHA", "BARUERI", "BASTOS", "BATATAIS", "BAURU", "BEBEDOURO", "BENTO DE ABREU", "BERNARDINO DE CAMPOS", "BERTIOGA", "BILAC", "BIRIGUI", "BIRITIBA-MIRIM", "BOA ESPERANCA DO SUL", "BOCAINA", "BOFETE", "BOITUVA", "BOM JESUS DOS PERDOES", "BORACEIA", "BORBOREMA", "BOREBI", "BOTUCATU", "BRAGANCA PAULISTA", "BRAUNA", "BREJO ALEGRE", "BRODOWSKI", "BROTAS", "BURI", "BURITAMA", "BURITIZAL", "CABREUVA", "CACAPAVA", "CACHOEIRA PAULISTA", "CACONDE", "CAFELANDIA", "CAIEIRAS", "CAIUA", "CAJAMAR", "CAJATI", "CAJOBI", "CAJURU", "CAMPINA DO MONTE ALEGRE", "CAMPINAS", "CAMPO LIMPO PAULISTA", "CAMPOS DO JORDAO", "CANANEIA", "CANAS", "CANDIDO MOTA", "CANDIDO RODRIGUES", "CANITAR", "CAPAO BONITO", "CAPELA DO ALTO", "CAPIVARI", "CARAGUATATUBA", "CARAPICUIBA", "CARDOSO", "CASA BRANCA", "CASSIA DOS COQUEIROS", "CASTILHO", "CATANDUVA", "CATIGUA", "CEDRAL", "CERQUEIRA CESAR", "CERQUILHO", "CESARIO LANGE", "CHARQUEADA", "CHAVANTES", "CLEMENTINA", "COLINA", "COLOMBIA", "CONCHAL", "CONCHAS", "CORDEIROPOLIS", "COROADOS", "CORONEL MACEDO", "CORUMBATAI", "COSMOPOLIS", "COSMORAMA", "COTIA", "CRAVINHOS", "CRISTAIS PAULISTA", "CRUZALIA", "CRUZEIRO", "CUBATAO", "CUNHA", "DESCALVADO", "DIADEMA", "DIRCE REIS", "DIVINOLANDIA", "DOBRADA", "DOIS CORREGOS", "DOLCINOPOLIS", "DOURADO", "DRACENA", "DUARTINA", "DUMONT", "ECHAPORA", "ELDORADO", "ELIAS FAUSTO", "ELISIARIO", "EMBU DAS ARTES", "EMBU-GUACU", "EMILIANOPOLIS", "ENGENHEIRO COELHO", "ESPIRITO SANTO DO PINHAL", "ESPIRITO SANTO DO TURVO", "ESTIVA GERBI", "ESTRELA D'OESTE", "EUCLIDES DA CUNHA PAULISTA", "FARTURA", "FERNANDO PRESTES", "FERNANDOPOLIS", "FERNAO", "FERRAZ DE VASCONCELOS", "FLORA RICA", "FLOREAL", "FLORIDA PAULISTA", "FLORINIA", "FRANCA", "FRANCISCO MORATO", "FRANCO DA ROCHA", "GABRIEL MONTEIRO", "GALIA", "GARCA", "GASTAO VIDIGAL", "GAVIAO PEIXOTO", "GETULINA", "GLICERIO", "GUAICARA", "GUAIMBE", "GUAIRA", "GUAPIACU", "GUAPIARA", "GUARA", "GUARACAI", "GUARACI", "GUARANI D'OESTE", "GUARANTA", "GUARARAPES", "GUARAREMA", "GUARATINGUETA", "GUAREI", "GUARIBA", "GUARUJA", "GUARULHOS", "GUATAPARA", "GUZOLANDIA", "HERCULANDIA", "HOLAMBRA", "HORTOLANDIA", "IACANGA", "IACRI", "IARAS", "IBATE", "IBIRA", "IBIRAREMA", "IBITINGA", "IBIUNA", "ICEM", "IEPE", "IGARACU DO TIETE", "IGARAPAVA", "IGARATA", "IGUAPE", "ILHA COMPRIDA", "ILHA SOLTEIRA", "ILHABELA", "INDAIATUBA", "INDIANA", "INUBIA PAULISTA", "IPERO", "IPEUNA", "IPIGUA", "IPORANGA", "IPUA", "IRACEMAPOLIS", "IRAPUA", "IRAPURU", "ITABERA", "ITAI", "ITAJOBI", "ITAJU", "ITANHAEM", "ITAPECERICA DA SERRA", "ITAPETININGA", "ITAPEVA", "ITAPEVI", "ITAPIRA", "ITAPIRAPUA PAULISTA", "ITAPOLIS", "ITAPORANGA", "ITAPUI", "ITAPURA", "ITAQUAQUECETUBA", "ITARARE", "ITARIRI", "ITATIBA", "ITATINGA", "ITIRAPINA", "ITIRAPUA", "ITOBI", "ITU", "ITUPEVA", "ITUVERAVA", "JABORANDI", "JABOTICABAL", "JACAREI", "JACI", "JACUPIRANGA", "JAGUARIUNA", "JALES", "JANDIRA", "JARDINOPOLIS", "JARINU", "JAU", "JOANOPOLIS", "JOSE BONIFACIO", "JULIO MESQUITA", "JUNDIAI", "JUNQUEIROPOLIS", "JUQUIA", "JUQUITIBA", "LARANJAL PAULISTA", "LAVRINHAS", "LEME", "LENCOIS PAULISTA", "LIMEIRA", "LINDOIA", "LINS", "LORENA", "LOUVEIRA", "LUCELIA", "LUCIANOPOLIS", "LUIS ANTONIO", "LUIZIANIA", "LUTECIA", "MACATUBA", "MACAUBAL", "MACEDONIA", "MAGDA", "MAIRINQUE", "MAIRIPORA", "MANDURI", "MARABA PAULISTA", "MARACAI", "MARAPOAMA", "MARILIA", "MARTINOPOLIS", "MATAO", "MAUA", "MENDONCA", "MERIDIANO", "MIGUELOPOLIS", "MINEIROS DO TIETE", "MIRA ESTRELA", "MIRACATU", "MIRANDOPOLIS", "MIRANTE DO PARANAPANEMA", "MIRASSOL", "MIRASSOLANDIA", "MOCOCA", "MOGI DAS CRUZES", "MOGI GUACU", "MOGI MIRIM", "MONCOES", "MONGAGUA", "MONTE ALEGRE DO SUL", "MONTE ALTO", "MONTE APRAZIVEL", "MONTE AZUL PAULISTA", "MONTE CASTELO", "MONTE MOR", "MORRO AGUDO", "MORUNGABA", "MURUTINGA DO SUL", "NANTES", "NARANDIBA", "NATIVIDADE DA SERRA", "NAZARE PAULISTA", "NEVES PAULISTA", "NHANDEARA", "NIPOA", "NOVA ALIANCA", "NOVA CAMPINA", "NOVA GRANADA", "NOVA GUATAPORANGA", "NOVA INDEPENDENCIA", "NOVA LUZITANIA", "NOVA ODESSA", "NOVAIS", "NOVO HORIZONTE", "NUPORANGA", "OLIMPIA", "ONDA VERDE", "ORIENTE", "ORINDIUVA", "ORLANDIA", "OSASCO", "OSVALDO CRUZ", "OURINHOS", "OURO VERDE", "OUROESTE", "PACAEMBU", "PALESTINA", "PALMARES PAULISTA", "PALMEIRA D'OESTE", "PALMITAL", "PANORAMA", "PARAGUACU PAULISTA", "PARAIBUNA", "PARAISO", "PARANAPANEMA", "PARANAPUA", "PARAPUA", "PARDINHO", "PARIQUERA-ACU", "PATROCINIO PAULISTA", "PAULICEIA", "PAULINIA", "PAULISTANIA", "PAULO DE FARIA", "PEDERNEIRAS", "PEDRA BELA", "PEDREGULHO", "PEDREIRA", "PENAPOLIS", "PEREIRA BARRETO", "PEREIRAS", "PERUIBE", "PIACATU", "PIEDADE", "PILAR DO SUL", "PINDAMONHANGABA", "PINDORAMA", "PINHALZINHO", "PIQUEROBI", "PIQUETE", "PIRACAIA", "PIRACICABA", "PIRAJU", "PIRAJUI", "PIRANGI", "PIRAPOZINHO", "PIRASSUNUNGA", "PIRATININGA", "PITANGUEIRAS", "PLANALTO", "POA", "POLONI", "POMPEIA", "PONGAI", "PONTALINDA", "PONTES GESTAL", "POPULINA", "PORTO FELIZ", "PORTO FERREIRA", "POTIM", "POTIRENDABA", "PRACINHA", "PRADOPOLIS", "PRAIA GRANDE", "PRATANIA", "PRESIDENTE ALVES", "PRESIDENTE BERNARDES", "PRESIDENTE EPITACIO", "PRESIDENTE PRUDENTE", "PRESIDENTE VENCESLAU", "PROMISSAO", "QUADRA", "QUATA", "QUEIROZ", "QUELUZ", "QUINTANA", "RANCHARIA", "REGENTE FEIJO", "REGINOPOLIS", "REGISTRO", "RESTINGA", "RIBEIRA", "RIBEIRAO BONITO", "RIBEIRAO BRANCO", "RIBEIRAO CORRENTE", "RIBEIRAO PIRES", "RIBEIRAO PRETO", "RIFAINA", "RINCAO", "RINOPOLIS", "RIO CLARO", "RIO DAS PEDRAS", "RIOLANDIA", "RIVERSUL", "ROSANA", "ROSEIRA", "RUBIACEA", "RUBINEIA", "SABINO", "SALES", "SALES OLIVEIRA", "SALESOPOLIS", "SALTINHO", "SALTO", "SALTO DE PIRAPORA", "SANDOVALINA", "SANTA ADELIA", "SANTA ALBERTINA", "SANTA BARBARA D'OESTE", "SANTA CRUZ DA ESPERANCA", "SANTA CRUZ DAS PALMEIRAS", "SANTA CRUZ DO RIO PARDO", "SANTA ERNESTINA", "SANTA FE DO SUL", "SANTA GERTRUDES", "SANTA ISABEL", "SANTA LUCIA", "SANTA MARIA DA SERRA", "SANTA MERCEDES", "SANTA RITA D'OESTE", "SANTA RITA DO PASSA QUATRO", "SANTA ROSA DE VITERBO", "SANTANA DE PARNAIBA", "SANTO ANASTACIO", "SANTO ANDRE", "SANTO ANTONIO DA ALEGRIA", "SANTO ANTONIO DE POSSE", "SANTO ANTONIO DO ARACANGUA", "SANTO ANTONIO DO JARDIM", "SANTO ANTONIO DO PINHAL", "SANTO EXPEDITO", "SANTOS", "SAO BENTO DO SAPUCAI", "SAO BERNARDO DO CAMPO", "SAO CAETANO DO SUL", "SAO CARLOS", "SAO JOAO DA BOA VISTA", "SAO JOAQUIM DA BARRA", "SAO JOSE DA BELA VISTA", "SAO JOSE DO BARREIRO", "SAO JOSE DO RIO PARDO", "SAO JOSE DO RIO PRETO", "SAO JOSE DOS CAMPOS", "SAO LOURENCO DA SERRA", "SAO MANUEL", "SAO MIGUEL ARCANJO", "SAO PAULO", "SAO PEDRO", "SAO PEDRO DO TURVO", "SAO ROQUE", "SAO SEBASTIAO", "SAO SEBASTIAO DA GRAMA", "SAO SIMAO", "SAO VICENTE", "SARAPUI", "SARUTAIA", "SEBASTIANOPOLIS DO SUL", "SERRA AZUL", "SERRA NEGRA", "SERRANA", "SERTAOZINHO", "SEVERINIA", "SILVEIRAS", "SOCORRO", "SOROCABA", "SUD MENNUCCI", "SUMARE", "SUZANAPOLIS", "SUZANO", "TABAPUA", "TABATINGA", "TABOAO DA SERRA", "TACIBA", "TAGUAI", "TAIACU", "TAIUVA", "TAMBAU", "TANABI", "TAPIRATIBA", "TAQUARAL", "TAQUARITINGA", "TAQUARITUBA", "TAQUARIVAI", "TARABAI", "TARUMA", "TATUI", "TAUBATE", "TEJUPA", "TEODORO SAMPAIO", "TERRA ROXA", "TIETE", "TIMBURI", "TORRE DE PEDRA", "TORRINHA", "TREMEMBE", "TRES FRONTEIRAS", "TUIUTI", "TUPA", "TUPI PAULISTA", "TURIUBA", "TURMALINA", "UBARANA", "UBATUBA", "UCHOA", "URANIA", "URUPES", "VALENTIM GENTIL", "VALINHOS", "VALPARAISO", "VARGEM", "VARGEM GRANDE DO SUL", "VARGEM GRANDE PAULISTA", "VARZEA PAULISTA", "VERA CRUZ", "VINHEDO", "VIRADOURO", "VITORIA BRASIL", "VOTORANTIM", "VOTUPORANGA", "ZACARIAS"],
  TO: ["ABREULANDIA", "AGUIARNOPOLIS", "ALIANCA DO TOCANTINS", "ALMAS", "ALVORADA", "ANANAS", "ANGICO", "APARECIDA DO RIO NEGRO", "ARAGOMINAS", "ARAGUACEMA", "ARAGUACU", "ARAGUAINA", "ARAGUANA", "ARAGUATINS", "ARAPOEMA", "ARRAIAS", "AUGUSTINOPOLIS", "AURORA DO TOCANTINS", "AXIXA DO TOCANTINS", "BABACULANDIA", "BANDEIRANTES DO TOCANTINS", "BARRA DO OURO", "BARROLANDIA", "BERNARDO SAYAO", "BRASILANDIA DO TOCANTINS", "BREJINHO DE NAZARE", "BURITI DO TOCANTINS", "CACHOEIRINHA", "CAMPOS LINDOS", "CARIRI DO TOCANTINS", "CARMOLANDIA", "CARRASCO BONITO", "CASEARA", "CENTENARIO", "CHAPADA DA NATIVIDADE", "CHAPADA DE AREIA", "COLINAS DO TOCANTINS", "COLMEIA", "COMBINADO", "CONCEICAO DO TOCANTINS", "COUTO DE MAGALHAES", "CRISTALANDIA", "CRIXAS DO TOCANTINS", "DARCINOPOLIS", "DIANOPOLIS", "DIVINOPOLIS DO TOCANTINS", "DOIS IRMAOS DO TOCANTINS", "DUERE", "ESPERANTINA", "FATIMA", "FIGUEIROPOLIS", "FILADELFIA", "FORMOSO DO ARAGUAIA", "FORTALEZA DO TABOCAO", "GOIANORTE", "GOIATINS", "GUARAI", "GURUPI", "ITACAJA", "ITAGUATINS", "ITAPIRATINS", "ITAPORA DO TOCANTINS", "JAU DO TOCANTINS", "JUARINA", "LAGOA DA CONFUSAO", "LAGOA DO TOCANTINS", "LAJEADO", "LIZARDA", "LUZINOPOLIS", "MARIANOPOLIS DO TOCANTINS", "MATEIROS", "MAURILANDIA DO TOCANTINS", "MIRACEMA DO TOCANTINS", "MIRANORTE", "MONTE DO CARMO", "MONTE SANTO DO TOCANTINS", "MURICILANDIA", "NATIVIDADE", "NAZARE", "NOVA OLINDA", "NOVA ROSALANDIA", "NOVO ACORDO", "NOVO ALEGRE", "NOVO JARDIM", "PALMAS", "PALMEIRANTE", "PALMEIRAS DO TOCANTINS", "PALMEIROPOLIS", "PARAISO DO TOCANTINS", "PARANA", "PAU D'ARCO", "PEDRO AFONSO", "PEIXE", "PEQUIZEIRO", "PINDORAMA DO TOCANTINS", "PIRAQUE", "PIUM", "PONTE ALTA DO BOM JESUS", "PONTE ALTA DO TOCANTINS", "PORTO ALEGRE DO TOCANTINS", "PORTO NACIONAL", "PRAIA NORTE", "PRESIDENTE KENNEDY", "PUGMIL", "RECURSOLANDIA", "RIACHINHO", "RIO DA CONCEICAO", "RIO DOS BOIS", "RIO SONO", "SAMPAIO", "SANDOLANDIA", "SANTA FE DO ARAGUAIA", "SANTA MARIA DO TOCANTINS", "SANTA RITA DO TOCANTINS", "SANTA ROSA DO TOCANTINS", "SANTA TEREZA DO TOCANTINS", "SANTA TEREZINHA DO TOCANTINS", "SAO BENTO DO TOCANTINS", "SAO FELIX DO TOCANTINS", "SAO MIGUEL DO TOCANTINS", "SAO SALVADOR DO TOCANTINS", "SAO SEBASTIAO DO TOCANTINS", "SAO VALERIO", "SILVANOPOLIS", "SITIO NOVO DO TOCANTINS", "SUCUPIRA", "TAGUATINGA", "TAIPAS DO TOCANTINS", "TALISMA", "TOCANTINIA", "TOCANTINOPOLIS", "TUPIRAMA", "TUPIRATINS", "WANDERLANDIA", "XAMBIOA"],
};

function anpPopularMunicipios(uf) {
  const sel = document.getElementById('anp-municipio');
  const muns = ANP_MUNICIPIOS_POR_UF[uf] || [];
  if (!uf || !muns.length) {
    sel.innerHTML = '<option value="">Selecione o estado primeiro...</option>';
    return;
  }
  // Capitalizar para exibição: "VITORIA" → "Vitoria"
  const cap = s => s.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  sel.innerHTML = '<option value="">Selecione o município...</option>'
    + muns.sort().map(m => \`<option value="\${m}">\${cap(m)}</option>\`).join('');
}

async function buscarPostosANPAdmin() {
  const uf        = document.getElementById('anp-uf').value.trim();
  const municipio = document.getElementById('anp-municipio').value.trim();
  if (!uf || !municipio) { showToast('⚠️ Selecione o estado e o municipio', ''); return; }

  const loading = document.getElementById('anp-loading');
  const wrap    = document.getElementById('anp-tabela-wrap');
  const info    = document.getElementById('anp-resultado-info');

  loading.style.display = 'block';
  wrap.style.display    = 'none';
  info.style.display    = 'none';

  try {
    const res = await fetch('/api/admin/anp-busca?key=' + encodeURIComponent(ADMIN_KEY)
      + '&uf=' + encodeURIComponent(uf)
      + '&municipio=' + encodeURIComponent(municipio));
    const data = await res.json();
    if (!res.ok || data.erro) throw new Error(data.erro || 'Erro ANP');

    _anpResultados = data.postos || [];
    info.style.display = 'block';
    info.innerHTML = \`<i class="fas fa-check-circle" style="color:#00C853"></i> <strong style="color:#fff">\${_anpResultados.length}</strong> postos encontrados em <strong style="color:#42A5F5">\${municipio} - \${uf}</strong>\`
      + (data.semana ? \` &nbsp;·&nbsp; Preços ANP: <span style="color:#FFD600">\${data.semana}</span>\` : '');
    filtrarResultadosANP();
    wrap.style.display = 'block';
  } catch(e) {
    info.style.display = 'block';
    info.innerHTML = \`<i class="fas fa-exclamation-circle" style="color:#FF5252"></i> Erro: \${e.message}\`;
  } finally {
    loading.style.display = 'none';
  }
}

function filtrarResultadosANP() {
  const q = (document.getElementById('anp-busca').value || '').toLowerCase();
  const lista = q ? _anpResultados.filter(p =>
    (p.nome||'').toLowerCase().includes(q) ||
    (p.cnpj||'').includes(q) ||
    (p.cnpjFmt||'').includes(q) ||
    (p.bandeira||'').toLowerCase().includes(q) ||
    (p.bairro||'').toLowerCase().includes(q)
  ) : _anpResultados;
  renderTabelaANP(lista);
}

function renderTabelaANP(lista) {
  const tbody = document.getElementById('anp-tbody');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:rgba(255,255,255,0.3)">Nenhum posto encontrado</td></tr>';
    return;
  }
  const fmtR = (v) => v > 0 ? \`<span style="color:#69F0AE;font-weight:800">R$ \${Number(v).toFixed(2)}</span>\` : \`<span style="color:rgba(255,255,255,0.2)">—</span>\`;
  const normBandeira = (b) => {
    const s = (b||'').toUpperCase();
    if (s.includes('PETROBRAS') || s.includes('BR ')) return 'Petrobras';
    if (s.includes('SHELL')) return 'Shell';
    if (s.includes('IPIRANGA')) return 'Ipiranga';
    if (s.includes('RAIZEN')) return 'Raízen';
    if (s.includes('VIBRA')) return 'Vibra';
    if (s.includes('BRANCA') || s.includes('INDEPEND')) return 'Independente';
    return b || '—';
  };

  tbody.innerHTML = lista.map(p => {
    const jaCadastrado = _parceiros.some(x => x.cnpj && x.cnpj.replace(/\\D/g,'') === p.cnpj);
    const btnLabel = jaCadastrado
      ? \`<button onclick="abrirModalEditarPorCNPJ('\${p.cnpj}')" style="background:rgba(255,214,0,0.15);color:#FFD600;border:1px solid rgba(255,214,0,0.3);padding:5px 10px;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700"><i class="fas fa-pen"></i> Editar</button>\`
      : \`<button data-anp-idx="\${lista.indexOf(p)}" onclick="preencherModalComANP(this.dataset.anpIdx)" style="background:rgba(0,200,83,0.15);color:#00C853;border:1px solid rgba(0,200,83,0.3);padding:5px 10px;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700"><i class="fas fa-plus"></i> Usar dados</button>\`;
    return \`<tr class="tr-hover">
      <td style="overflow:hidden">
        <div style="font-weight:800;font-size:12px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${p.nome}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${p.endereco || '—'}\${p.bairro ? ' · ' + p.bairro : ''}</div>
      </td>
      <td style="text-align:center;font-size:11px;color:rgba(255,165,0,0.8);font-weight:700">\${normBandeira(p.bandeira)}</td>
      <td style="text-align:center;font-size:10px;color:rgba(255,255,255,0.4);font-family:monospace">\${p.cnpjFmt || p.cnpj}</td>
      <td style="text-align:center">\${fmtR(p.precos.gasolina)}</td>
      <td style="text-align:center">\${fmtR(p.precos.etanol)}</td>
      <td style="text-align:center">\${fmtR(p.precos.diesel || p.precos.dieselS10)}</td>
      <td style="text-align:center">\${btnLabel}</td>
    </tr>\`;
  }).join('');
}

function preencherModalComANP(idxStr) {
  const lista = _anpResultados.filter(p => {
    const q = (document.getElementById('anp-busca').value || '').toLowerCase();
    return !q || (p.nome||'').toLowerCase().includes(q) || (p.cnpj||'').includes(q);
  });
  const p = lista[parseInt(idxStr)];
  if (!p) return;

  // Preencher campos do modal com dados ANP
  document.getElementById('ep-nomePosto').value        = p.nome || '';
  document.getElementById('ep-cnpj').value             = p.cnpjFmt || p.cnpj || '';
  document.getElementById('ep-cidade').value           = p.municipio || '';
  document.getElementById('ep-estado').value           = p.uf || '';
  document.getElementById('ep-bairro').value           = p.bairro || '';
  document.getElementById('ep-bandeira').value         = p.bandeira || '';

  // Preços ANP (só preenche se existir)
  if (p.precos) {
    if (p.precos.gasolina > 0)          document.getElementById('ep-preco-gasolina').value          = p.precos.gasolina;
    if (p.precos.gasolinaAditivada > 0) document.getElementById('ep-preco-gasolinaAditivada').value = p.precos.gasolinaAditivada;
    if (p.precos.etanol > 0)            document.getElementById('ep-preco-etanol').value            = p.precos.etanol;
    if (p.precos.diesel > 0)            document.getElementById('ep-preco-diesel').value            = p.precos.diesel;
    if (p.precos.dieselS10 > 0)         document.getElementById('ep-preco-dieselS10').value         = p.precos.dieselS10;
    if (p.precos.gnv > 0)               document.getElementById('ep-preco-gnv').value               = p.precos.gnv;
  }

  // Gerar ID único baseado no CNPJ
  _parceiroEditandoId = 'posto_' + p.cnpj;
  document.getElementById('ep-id-display').textContent = 'ID: ' + _parceiroEditandoId + '  (novo — dados da ANP)';
  document.getElementById('ep-email').value = '';
  document.getElementById('ep-tel').value   = '';
  document.getElementById('ep-telTelemarketing').value = '';
  document.getElementById('ep-status').value = 'ativo';
  document.getElementById('ep-seloVerificado').checked = false;
  document.getElementById('ep-pinDourado').checked     = false;
  document.getElementById('ep-topoLista').checked      = false;
  document.getElementById('ep-cuponsAtivos').checked   = false;
  popularSelectPlanosModal('');  // seleciona o primeiro plano disponível
  document.getElementById('ep-deletar-btn').style.display = 'none';
  document.getElementById('modal-parceiro-edit').style.display = 'block';
  document.getElementById('modal-parceiro-edit').scrollTop = 0;
  showToast('Dados da ANP preenchidos! Confira e salve.', 'ok');
}

function abrirModalEditarPorCNPJ(cnpj) {
  const p = _parceiros.find(x => x.cnpj && x.cnpj.replace(/\\D/g,'') === cnpj);
  if (p) abrirModalEditarParceiro(p.id);
}

// ── POSTOS (MAPA/API) ────────────────────────────────────────────────────────
async function carregarPostos() {
  const tbody = document.getElementById('postos-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:rgba(255,255,255,0.3)">Buscando postos em ' + adminCidade + '...</td></tr>';
  const cidadeLabel = document.getElementById('postos-cidade-label');
  if (cidadeLabel) cidadeLabel.textContent = adminCidade + ', ' + adminUF;
  try {
    const res = await fetch(\`/api/postos?lat=\${adminLat}&lng=\${adminLng}&combustivel=gasolina&raio=15\`);
    const data = await res.json();
    const postos = data.postos || [];
    document.getElementById('postos-count').textContent = postos.length + ' postos';
    tbody.innerHTML = postos.map(p => {
      const fonteBadge = p.fonte === 'anp' ? '<span class="badge badge-anp">ANP</span>' : p.fonte === 'osm' ? '<span class="badge badge-osm">OSM</span>' : '<span class="badge badge-collab">Colab</span>';
      return \`<tr><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${p.nome}</td><td>\${p.bandeira}</td><td>\${fonteBadge}</td><td style="color:#69F0AE;font-weight:800">\${p.precos?.gasolina ? 'R$ ' + p.precos.gasolina.toFixed(2) : '–'}</td><td>\${p.precos?.etanol ? 'R$ ' + p.precos.etanol.toFixed(2) : '–'}</td><td>\${p.precos?.diesel ? 'R$ ' + p.precos.diesel.toFixed(2) : '–'}</td><td style="color:rgba(255,255,255,0.5)">\${p.cidade}</td></tr>\`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:rgba(255,255,255,0.3)">Nenhum posto encontrado</td></tr>';
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:#FF6D00;text-align:center;padding:24px">Erro ao carregar postos</td></tr>';
  }
}

// ── PREÇOS REPORTADOS ────────────────────────────────────────────────────────
async function carregarReportes() {
  const tbody = document.getElementById('reportes-tbody');
  const rankingEl = document.getElementById('ranking-lista');
  const [resReportes, resRanking] = await Promise.allSettled([fetch('/api/precos/reportados'), fetch('/api/contribuidores/ranking')]);
  if (rankingEl && resRanking.status === 'fulfilled' && resRanking.value.ok) {
    try {
      const rk = await resRanking.value.json();
      const ranking = rk.ranking || [];
      const medalhas = ['🥇', '🥈', '🥉'];
      rankingEl.innerHTML = ranking.length > 0
        ? ranking.slice(0, 10).map((u, i) => \`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;\${i < ranking.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.05)' : ''}"><div style="font-size:16px;min-width:22px">\${medalhas[i] || '<span style=\\"font-size:12px;color:rgba(255,255,255,0.3)\\">' + (i+1) + 'º</span>'}</div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${u.nome}</div><div style="font-size:10px;color:rgba(255,255,255,0.4)">\${u.reportes} reportes</div></div><div style="text-align:right"><div style="font-size:12px;font-weight:900;color:#FFC107">\${u.pontos} pts</div></div></div>\`).join('')
        : '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:13px">Seja o primeiro a reportar!</div>';
    } catch {}
  }
  if (!tbody) return;
  try {
    if (resReportes.status === 'rejected') throw new Error('failed');
    const data = await resReportes.value.json();
    const reportes = data.reportes || [];
    tbody.innerHTML = reportes.length > 0
      ? reportes.map(r => \`<tr><td style="font-size:11px;color:rgba(255,255,255,0.6)">\${r.postoNome || r.postoId}</td><td><span class="badge badge-collab">\${r.combustivel}</span></td><td style="font-weight:800;color:#69F0AE">R$ \${r.preco.toFixed(2)}</td><td style="color:#FFD600;font-size:12px">\${r.confirmacoes}x</td><td style="color:rgba(255,255,255,0.4);font-size:11px">\${r.idadeMin}min</td></tr>\`).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:32px;color:rgba(255,255,255,0.3)">Nenhum reporte nas últimas 24h</td></tr>';
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:rgba(255,255,255,0.3)">Nenhum reporte ainda</td></tr>';
  }
}

// ── MAPA AO VIVO ─────────────────────────────────────────────────────────────
function iniciarMapaAdmin(reset) {
  if (adminMap && !reset) { adminMap.invalidateSize(); return; }
  if (adminMap && reset) { adminMap.remove(); adminMap = null; }
  adminMap = L.map('admin-map').setView([adminLat, adminLng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(adminMap);

  // Marcador da localização do admin
  const userIcon = L.divIcon({ html: '<div style="width:14px;height:14px;background:#1565C0;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 3px rgba(21,101,192,0.35)"></div>', className: '', iconAnchor: [7,7] });
  L.marker([adminLat, adminLng], { icon: userIcon }).addTo(adminMap).bindPopup('<strong>Sua localização</strong>');

  // Botão "Minha localização"
  const btnGeo = L.control({ position: 'topright' });
  btnGeo.onAdd = function() {
    const btn = L.DomUtil.create('button');
    btn.innerHTML = '📍 Minha localização';
    btn.style.cssText = 'background:#FF6D00;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3)';
    L.DomEvent.on(btn, 'click', function() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(function(pos) {
        adminLat = pos.coords.latitude; adminLng = pos.coords.longitude;
        adminMap.setView([adminLat, adminLng], 13);
        iniciarMapaAdmin(true);
      }, null, { timeout: 6000 });
    });
    return btn;
  };
  btnGeo.addTo(adminMap);

  fetch(\`/api/postos?lat=\${adminLat}&lng=\${adminLng}&combustivel=gasolina&raio=15\`)
    .then(r => r.json())
    .then(data => {
      (data.postos || []).forEach(p => {
        const cor = p.fonte === 'anp' ? '#1565C0' : '#FF6D00';
        const icon = L.divIcon({ html: \`<div style="background:\${cor};color:white;padding:3px 7px;border-radius:8px;font-size:10px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid white;white-space:nowrap">R$\${p.preco?.toFixed(2)}</div>\`, className: '', iconAnchor: [20, 12] });
        L.marker([p.lat, p.lng], { icon }).addTo(adminMap).bindPopup(\`<strong>\${p.nome}</strong><br>\${p.bandeira} · \${p.fonte?.toUpperCase()}<br>R$ \${p.preco?.toFixed(2)}\`);
      });
    });
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.getElementById('last-update').textContent = 'Carregando...';

// Tenta geolocalizar o admin antes de carregar dados
function _initComGeo() {
  if (!navigator.geolocation) { carregarDashboard(); return; }
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      adminLat = pos.coords.latitude;
      adminLng = pos.coords.longitude;
      // Geocode reverso para pegar cidade/UF
      fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + adminLat + '&lon=' + adminLng + '&accept-language=pt-BR')
        .then(r => r.json())
        .then(geo => {
          const addr = geo.address || {};
          adminCidade = addr.city || addr.town || addr.municipality || addr.village || 'Sua localização';
          adminUF     = addr.state_code || addr['ISO3166-2-lvl4']?.split('-')[1] || '';
          // Atualiza labels
          const lbl = adminCidade + (adminUF ? ', ' + adminUF : '');
          const cidEl = document.getElementById('cidade-label');
          if (cidEl) cidEl.textContent = lbl;
          const kpiEl = document.getElementById('kpi-preco-label');
          if (kpiEl) kpiEl.textContent = lbl;
          const pcEl = document.getElementById('postos-cidade-label');
          if (pcEl) pcEl.textContent = lbl;
        })
        .catch(() => {
          const cidEl = document.getElementById('cidade-label');
          if (cidEl) cidEl.textContent = 'Sua localização';
        })
        .finally(() => { carregarDashboard(); });
    },
    function() { carregarDashboard(); }, // negou permissão → usa SP
    { timeout: 6000, maximumAge: 300000 }
  );
}
_initComGeo();
setInterval(() => { if (currentSection === 'dashboard') carregarDashboard(); }, 5 * 60000);

// ── PERMISSÕES ───────────────────────────────────────────────────────────────
let _permissoes = [];
let _permissoesFiltro = 'todos';

async function carregarPermissoes() {
  const tbody = document.getElementById('permissoes-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)"><i class="fas fa-spinner fa-spin"></i> Carregando permissões...</td></tr>';
  try {
    // Carregar usuários + assinaturas juntos
    const [usRes, asRes] = await Promise.all([
      fetch('/api/admin/usuarios?key=' + encodeURIComponent(ADMIN_KEY)),
      fetch('/api/admin/assinaturas?key=' + encodeURIComponent(ADMIN_KEY))
    ]);
    const usData = await usRes.json();
    const asData = await asRes.json();
    const assinMap = {};
    (asData.assinaturas || []).forEach(a => { assinMap[a.userId] = a; });
    // Tentar também dados de perfil
    let perfisMap = {};
    try {
      const dpRes = await fetch('/api/admin/usuarios-dados?key=' + encodeURIComponent(ADMIN_KEY));
      const dpData = await dpRes.json();
      (dpData.usuarios || []).forEach(u => { perfisMap[u.uid] = u; });
    } catch(e) {}

    _permissoes = (usData.usuarios || []).map(u => {
      const assin = assinMap[u.uid];
      const perfil = perfisMap[u.uid];
      return {
        uid: u.uid,
        nome: perfil?.nome || perfil?.name || u.uid.slice(0,10),
        email: perfil?.email || '–',
        provider: perfil?.provider || 'email',
        plano: assin?.plano || 'free',
        status: assin?.status || 'FREE',
        bloqueado: u.bloqueado || false,
        nivel: u.bloqueado ? 'bloqueado' : (assin?.status === 'ACTIVE' ? 'premium' : 'free')
      };
    });

    document.getElementById('perm-count').textContent = _permissoes.length + ' usuários';
    renderPermissoes(_permissoes);
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#FF5252">Erro ao carregar: ' + e.message + '</td></tr>';
  }
}

function renderPermissoes(lista) {
  const tbody = document.getElementById('permissoes-tbody');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)">Nenhum usuário encontrado</td></tr>';
    return;
  }
  const providerIcon = p => p === 'google.com' ? '<i class="fab fa-google" style="color:#4285F4"></i>' : p === 'facebook.com' ? '<i class="fab fa-facebook" style="color:#1877F2"></i>' : '<i class="fas fa-envelope" style="color:#aaa"></i>';
  const nivelBadge = n => {
    if (n === 'admin')    return '<span style="background:rgba(255,214,0,0.15);color:#FFD600;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:800">👑 Admin</span>';
    if (n === 'premium')  return '<span style="background:rgba(255,109,0,0.15);color:#FF6D00;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:800">⭐ Premium</span>';
    if (n === 'bloqueado')return '<span style="background:rgba(255,82,82,0.15);color:#FF5252;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:800">🚫 Bloqueado</span>';
    return '<span style="background:rgba(66,165,245,0.12);color:#42A5F5;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:800">🆓 Free</span>';
  };
  tbody.innerHTML = lista.map(u => \`
    <tr>
      <td style="font-size:11px;color:rgba(255,255,255,0.5);max-width:130px;overflow:hidden;text-overflow:ellipsis">\${u.nome}</td>
      <td style="font-size:11px;color:rgba(255,255,255,0.4)">\${u.email}</td>
      <td style="text-align:center">\${providerIcon(u.provider)}</td>
      <td>\${nivelBadge(u.nivel)}</td>
      <td style="font-size:11px;color:rgba(255,255,255,0.5)">\${u.plano || 'free'}</td>
      <td><span style="font-size:10px;font-weight:700;color:\${u.bloqueado?'#FF5252':'#00C853'}">\${u.bloqueado?'🚫 Bloqueado':'✅ Ativo'}</span></td>
      <td>
        <select onchange="alterarPermissao('\${u.uid}',this.value)" style="background:#0A1520;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:5px 10px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;outline:none">
          <option value="" disabled selected>Alterar...</option>
          <option value="premium">⭐ Dar Premium</option>
          <option value="free">🆓 Rebaixar Free</option>
          <option value="bloqueado">🚫 Bloquear</option>
          <option value="desbloquear">✅ Desbloquear</option>
        </select>
      </td>
    </tr>
  \`).join('');
}

function filtrarPermissoesPor(tipo) {
  _permissoesFiltro = tipo;
  document.querySelectorAll('[id^="pf-"]').forEach(b => {
    b.style.background = 'rgba(255,255,255,0.05)';
    b.style.borderColor = 'rgba(255,255,255,0.1)';
    b.style.color = 'rgba(255,255,255,0.5)';
  });
  const btn = document.getElementById('pf-' + tipo);
  if (btn) { btn.style.background = 'rgba(255,109,0,0.2)'; btn.style.borderColor = 'rgba(255,109,0,0.4)'; btn.style.color = '#FF6D00'; }
  const filtrado = tipo === 'todos' ? _permissoes : _permissoes.filter(u => u.nivel === tipo);
  renderPermissoes(filtrado);
}

function filtrarPermissoes() {
  const q = document.getElementById('perm-search').value.toLowerCase();
  const lista = _permissoesFiltro === 'todos' ? _permissoes : _permissoes.filter(u => u.nivel === _permissoesFiltro);
  renderPermissoes(lista.filter(u => u.uid.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.nome.toLowerCase().includes(q)));
}

async function alterarPermissao(uid, acao) {
  if (!acao) return;
  if (!confirm('Confirmar ação "' + acao + '" para o usuário ' + uid.slice(0,12) + '...?')) return;
  try {
    const res = await fetch('/api/admin/usuarios/' + uid + '/permissao?key=' + encodeURIComponent(ADMIN_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao })
    });
    const data = await res.json();
    if (data.sucesso) {
      showToast('✅ Permissão atualizada!', 'ok');
      carregarPermissoes();
    } else {
      showToast('Erro: ' + (data.erro || 'falha'), 'err');
    }
  } catch(e) {
    showToast('Erro de conexão', 'err');
  }
}

// ── PLANOS E NÍVEIS ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
//  PRODUTOS & PLANOS — Admin
// ════════════════════════════════════════════════════════════

// ─── PLANOS DO APP (B2C) — edição de preços e benefícios ────────────────────
let _planosAppData = [];

async function carregarPlanosApp() {
  const grid = document.getElementById('planos-app-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="color:rgba(255,255,255,0.3);padding:40px;text-align:center;grid-column:1/-1"><i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:12px;display:block"></i>Carregando...</div>';
  try {
    const res = await fetch('/api/admin/planos?key=' + encodeURIComponent(ADMIN_KEY));
    const data = await res.json();
    _planosAppData = data.planos || [];
    renderPlanosAppGrid();
  } catch(e) {
    grid.innerHTML = '<div style="color:#FF5252;padding:40px;text-align:center;grid-column:1/-1"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar: ' + e.message + '</div>';
  }
}

function renderPlanosAppGrid() {
  const grid = document.getElementById('planos-app-grid');
  if (!grid || !_planosAppData.length) return;
  const CICLO_OPTS = [
    { v:'forever', l:'Grátis (sem cobrança)' },
    { v:'monthly', l:'Mensal' },
    { v:'yearly',  l:'Anual' },
    { v:'weekly',  l:'Semanal' }
  ];
  grid.innerHTML = _planosAppData.map((p, i) => {
    const isGratis = p.id === 'free';
    const valorReais = p.valor === 0 ? '0,00' : (p.valor / 100).toFixed(2).replace('.', ',');
    const cicloOpts = CICLO_OPTS.map(o => '<option value="' + o.v + '"' + (p.ciclo === o.v ? ' selected' : '') + '>' + o.l + '</option>').join('');
    const featuresHtml = (p.features || []).map((f, fi) =>
      '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">'
      + '<input type="checkbox" id="paf-' + i + '-' + fi + '" ' + (f.incluido ? 'checked' : '') + ' onchange="toggleFeatureApp(' + i + ',' + fi + ',this.checked)" style="accent-color:' + p.cor + ';width:16px;height:16px;cursor:pointer;flex-shrink:0">'
      + '<input type="text" value="' + f.texto.replace(/"/g, '&quot;') + '" oninput="editarTextoFeatureApp(' + i + ',' + fi + ',this.value)" style="background:transparent;border:none;color:rgba(255,255,255,0.75);font-size:12px;flex:1;outline:none;font-family:inherit" placeholder="Benefício...">'
      + '<button onclick="removerFeatureApp(' + i + ',' + fi + ')" style="background:none;border:none;color:rgba(255,82,82,0.5);cursor:pointer;padding:2px;font-size:11px" title="Remover"><i class="fas fa-times"></i></button>'
      + '</div>'
    ).join('');
    return '<div class="kpi-card" style="padding:0;overflow:hidden;border:1px solid rgba(255,255,255,0.08);position:relative">'
      // Faixa colorida no topo
      + '<div style="height:5px;background:' + p.cor + ';width:100%"></div>'
      // Cabeçalho do card
      + '<div style="padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,0.07)">'
      +   '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
      +     '<span style="font-size:26px">' + (p.emoji || '📦') + '</span>'
      +     '<div style="flex:1">'
      +       '<input id="pa-nome-' + i + '" type="text" value="' + p.nome.replace(/"/g, '&quot;') + '" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:15px;font-weight:800;padding:6px 10px;width:100%;font-family:inherit;outline:none" placeholder="Nome do plano">'
      +     '</div>'
      +     (p.destaque ? '<span style="background:#FF6D00;color:#fff;font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px;flex-shrink:0">DESTAQUE</span>' : '')
      +   '</div>'
      +   '<input id="pa-desc-' + i + '" type="text" value="' + (p.descricao||'').replace(/"/g, '&quot;') + '" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(255,255,255,0.55);font-size:12px;padding:7px 10px;width:100%;font-family:inherit;outline:none;box-sizing:border-box" placeholder="Descrição curta...">'
      + '</div>'
      // Preço
      + '<div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
      +   '<div style="flex:1;min-width:120px">'
      +     '<div style="font-size:10px;color:rgba(255,255,255,0.35);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Preço (R$ centavos)</div>'
      +     '<div style="display:flex;align-items:center;gap:6px">'
      +       '<span style="color:rgba(255,255,255,0.4);font-size:13px;font-weight:700">R$</span>'
      +       '<input id="pa-valor-' + i + '" type="number" min="0" step="1" value="' + p.valor + '" ' + (isGratis ? 'disabled' : '') + ' style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:20px;font-weight:900;padding:8px 12px;width:120px;font-family:inherit;outline:none;' + (isGratis ? 'opacity:0.4;cursor:not-allowed' : '') + '">'
      +       '<span style="color:rgba(255,255,255,0.3);font-size:11px">(ex: 990 = R$9,90)</span>'
      +     '</div>'
      +   '</div>'
      +   '<div style="min-width:140px">'
      +     '<div style="font-size:10px;color:rgba(255,255,255,0.35);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Ciclo de cobrança</div>'
      +     '<select id="pa-ciclo-' + i + '" ' + (isGratis ? 'disabled' : '') + ' style="background:#0A1520;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:13px;font-weight:600;padding:9px 12px;font-family:inherit;outline:none;cursor:pointer;' + (isGratis ? 'opacity:0.4;cursor:not-allowed' : '') + '">' + cicloOpts + '</select>'
      +   '</div>'
      + '</div>'
      // Benefícios / features
      + '<div style="padding:16px 20px">'
      +   '<div style="font-size:10px;color:rgba(255,255,255,0.35);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Benefícios exibidos no app</div>'
      +   '<div id="pa-features-' + i + '">' + featuresHtml + '</div>'
      +   '<button onclick="adicionarFeatureApp(' + i + ')" style="margin-top:10px;background:rgba(255,255,255,0.05);border:1px dashed rgba(255,255,255,0.15);border-radius:8px;color:rgba(255,255,255,0.4);font-size:12px;padding:7px 14px;cursor:pointer;width:100%;font-family:inherit"><i class="fas fa-plus" style="margin-right:6px"></i>Adicionar benefício</button>'
      + '</div>'
      // Rodapé com botão salvar
      + '<div style="padding:14px 20px;background:rgba(0,0,0,0.15);display:flex;justify-content:flex-end;gap:8px">'
      +   (p.id !== 'free' && p.id !== 'premium' && p.id !== 'anual'
          ? '<button onclick="deletarPlanoApp(' + JSON.stringify(p.id) + ')" style="background:rgba(255,82,82,0.12);color:#FF5252;border:1px solid rgba(255,82,82,0.25);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700"><i class="fas fa-trash"></i></button>'
          : '')
      +   '<button onclick="salvarPlanoApp(' + i + ',' + JSON.stringify(p.id) + ')" style="background:' + p.cor + ';color:#fff;border:none;padding:9px 22px;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer"><i class="fas fa-save" style="margin-right:6px"></i>Salvar</button>'
      + '</div>'
      + '</div>';
  }).join('');
}

function toggleFeatureApp(planoIdx, featIdx, checked) {
  if (_planosAppData[planoIdx] && _planosAppData[planoIdx].features[featIdx] !== undefined) {
    _planosAppData[planoIdx].features[featIdx].incluido = checked;
  }
}

function editarTextoFeatureApp(planoIdx, featIdx, texto) {
  if (_planosAppData[planoIdx] && _planosAppData[planoIdx].features[featIdx] !== undefined) {
    _planosAppData[planoIdx].features[featIdx].texto = texto;
  }
}

function removerFeatureApp(planoIdx, featIdx) {
  if (!_planosAppData[planoIdx]) return;
  _planosAppData[planoIdx].features.splice(featIdx, 1);
  renderPlanosAppGrid();
}

function adicionarFeatureApp(planoIdx) {
  if (!_planosAppData[planoIdx]) return;
  _planosAppData[planoIdx].features.push({ texto: '', incluido: true });
  renderPlanosAppGrid();
  // Focar no novo input
  setTimeout(() => {
    const container = document.getElementById('pa-features-' + planoIdx);
    if (container) {
      const inputs = container.querySelectorAll('input[type=text]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }
  }, 50);
}

async function salvarPlanoApp(idx, id) {
  const nomeEl  = document.getElementById('pa-nome-' + idx);
  const descEl  = document.getElementById('pa-desc-' + idx);
  const valorEl = document.getElementById('pa-valor-' + idx);
  const cicloEl = document.getElementById('pa-ciclo-' + idx);
  if (!nomeEl) return;
  const body = {
    nome:     nomeEl.value.trim(),
    descricao: descEl ? descEl.value.trim() : '',
    valor:    parseInt(valorEl ? valorEl.value : '0') || 0,
    ciclo:    cicloEl ? cicloEl.value : 'monthly',
    features: _planosAppData[idx] ? _planosAppData[idx].features : []
  };
  try {
    const res = await fetch('/api/admin/planos/' + encodeURIComponent(id) + '?key=' + encodeURIComponent(ADMIN_KEY), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.ok) {
      mostrarToastPlanosApp('✅ Plano "' + body.nome + '" salvo com sucesso!', '#00C853');
      await carregarPlanosApp();
    } else {
      mostrarToastPlanosApp('❌ Erro: ' + (data.erro || 'Falha ao salvar'), '#FF5252');
    }
  } catch(e) {
    mostrarToastPlanosApp('❌ Erro de rede: ' + e.message, '#FF5252');
  }
}

async function deletarPlanoApp(id) {
  if (!confirm('Remover o plano "' + id + '"? Esta ação não pode ser desfeita.')) return;
  try {
    const res = await fetch('/api/admin/planos/' + encodeURIComponent(id) + '?key=' + encodeURIComponent(ADMIN_KEY), { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      mostrarToastPlanosApp('🗑️ Plano removido.', '#FF6D00');
      await carregarPlanosApp();
    } else {
      mostrarToastPlanosApp('❌ Erro: ' + (data.erro || 'Falha ao remover'), '#FF5252');
    }
  } catch(e) {
    mostrarToastPlanosApp('❌ Erro: ' + e.message, '#FF5252');
  }
}

function mostrarToastPlanosApp(msg, cor) {
  const t = document.getElementById('planos-app-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = cor || '#00C853';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3500);
}

// ─── PLANOS DOS POSTOS (B2B) ────────────────────────────────────────────────
// _planosData declarado globalmente acima (junto com _parceiros)
let _planoEditandoId = null;  // id do plano em edição (null = novo)

const CICLO_LABEL = { forever: 'Grátis', monthly: '/mês', yearly: '/ano', weekly: '/semana' };


async function carregarEstatisticasPlanos() {
  // 1. KPIs de postos por plano
  try {
    const parcsRes = await fetch('/api/admin/parceiros?key=' + encodeURIComponent(ADMIN_KEY));
    const parcsData = await parcsRes.json();
    const parceiros = parcsData.parceiros || [];
    const contarPlano = (id) => parceiros.filter(p => (p.plano || 'posto_gratis') === id).length;
    const nGratis  = contarPlano('posto_gratis')  || contarPlano('visibilidade') || contarPlano('free');
    const nBasico  = contarPlano('posto_basico')  || contarPlano('basico');
    const nPlus    = contarPlano('posto_plus')    || contarPlano('plus');
    const nOutros  = parceiros.length - nGratis - nBasico - nPlus;
    const sg = document.getElementById('kpi-postos-gratis');
    const sb = document.getElementById('kpi-postos-basico');
    const sp = document.getElementById('kpi-postos-plus');
    const so = document.getElementById('kpi-postos-outros');
    if (sg) sg.textContent = nGratis;
    if (sb) sb.textContent = nBasico;
    if (sp) sp.textContent = nPlus;
    if (so) so.textContent = Math.max(0, nOutros);
  } catch(e) { console.warn('kpis-postos:', e); }

  // 2. Carregar e renderizar cards dos planos de postos
  await carregarPlanosGrid();
}

async function carregarPlanosGrid() {
  const grid = document.getElementById('planos-grid');
  if (!grid) return;
  try {
    // Carrega planos B2B de postos (separado dos planos do app)
    const res = await fetch('/api/admin/planos-posto?key=' + encodeURIComponent(ADMIN_KEY));
    const data = await res.json();
    _planosData = data.planos || [];
    renderizarPlanosGrid();
  } catch(e) {
    grid.innerHTML = '<div style="color:#FF5252;padding:20px;text-align:center">Erro ao carregar planos: ' + e.message + '</div>';
  }
}

// ─── Benefícios fixos disponíveis para planos de postos parceiros ────────────
const BENEFICIOS_POSTO = [
  { id: 'perfil_basico',       label: 'Perfil básico no app',                   icon: 'fas fa-store' },
  { id: 'exibir_precos',       label: 'Exibir preços no mapa',                  icon: 'fas fa-tag' },
  { id: 'selo_verificado',     label: 'Selo Verificado ✅',                      icon: 'fas fa-badge-check' },
  { id: 'pin_dourado',         label: 'Pin Dourado no mapa 📍',                 icon: 'fas fa-map-pin' },
  { id: 'topo_lista',          label: 'Topo da lista de resultados',             icon: 'fas fa-arrow-up' },
  { id: 'cupons_ativos',       label: 'Gerar cupons de desconto 🎟️',           icon: 'fas fa-ticket-alt' },
  { id: 'notificacoes',        label: 'Notificações aos usuários próximos',      icon: 'fas fa-bell' },
  { id: 'relatorio_cliques',   label: 'Relatório de cliques e visitas',          icon: 'fas fa-chart-bar' },
  { id: 'destaque_busca',      label: 'Destaque na busca por cidade',            icon: 'fas fa-search-plus' },
  { id: 'suporte_prioritario', label: 'Suporte prioritário',                    icon: 'fas fa-headset' },
  { id: 'api_precos',          label: 'Atualização automática de preços via API', icon: 'fas fa-sync' },
  { id: 'multiplos_usuarios',  label: 'Múltiplos usuários por posto',           icon: 'fas fa-users' },
];

function renderizarPlanosGrid() {
  const grid = document.getElementById('planos-grid');
  if (!grid) return;
  if (!_planosData.length) {
    grid.innerHTML = '<div style="color:rgba(255,255,255,0.3);padding:40px;text-align:center;grid-column:1/-1">Nenhum plano cadastrado</div>';
    return;
  }
  const CICLO_OPTS_POSTO = [
    { v:'forever', l:'Grátis / Para sempre' },
    { v:'trial',   l:'Período de Teste (grátis)' },
    { v:'monthly', l:'Mensal' },
    { v:'yearly',  l:'Anual' }
  ];
  grid.innerHTML = _planosData.map((p, i) => {
    const cor = p.cor || '#FF6D00';
    const isGratis = p.ciclo === 'forever';
    const cicloOpts = CICLO_OPTS_POSTO.map(o => '<option value="' + o.v + '"' + (p.ciclo === o.v ? ' selected' : '') + '>' + o.l + '</option>').join('');
    const beneficiosPlano = Array.isArray(p.beneficios) ? p.beneficios : [];
    // Checkboxes de benefícios fixos
    const benefCheckboxes = BENEFICIOS_POSTO.map(b =>
      '<label style="display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.04);border:1px solid ' + (beneficiosPlano.includes(b.id) ? cor + '55' : 'rgba(255,255,255,0.07)') + ';border-radius:8px;padding:7px 10px;cursor:pointer" id="pp-blabel-' + i + '-' + b.id + '">'
      + '<input type="checkbox" data-plano-idx="' + i + '" data-bid="' + b.id + '" ' + (beneficiosPlano.includes(b.id) ? 'checked' : '') + ' onchange="toggleBeneficioPostoCard(parseInt(this.dataset.planoIdx),this.dataset.bid,this.checked,this)" style="accent-color:' + cor + ';width:14px;height:14px;flex-shrink:0;cursor:pointer">'
      + '<i class="' + b.icon + '" style="color:rgba(255,255,255,0.35);font-size:11px;flex-shrink:0"></i>'
      + '<span style="font-size:11px;color:rgba(255,255,255,0.7)">' + b.label + '</span>'
      + '</label>'
    ).join('');
    const isProtected = ['posto_gratis','posto_basico','posto_plus'].includes(p.id);
    return '<div class="kpi-card" style="padding:0;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">'
      // Faixa colorida no topo
      + '<div style="height:5px;background:' + cor + ';width:100%"></div>'
      // Cabeçalho — emoji + nome + status
      + '<div style="padding:16px 18px 12px;border-bottom:1px solid rgba(255,255,255,0.07)">'
      +   '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
      +     '<input id="pp-emoji-' + i + '" type="text" maxlength="4" value="' + (p.emoji||'📦') + '" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:22px;text-align:center;padding:5px;width:48px;font-family:inherit;outline:none">'
      +     '<input id="pp-nome-' + i + '" type="text" value="' + p.nome.replace(/"/g,'&quot;') + '" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:15px;font-weight:800;padding:7px 10px;font-family:inherit;outline:none" placeholder="Nome do plano">'
      +     '<input id="pp-cor-' + i + '" type="color" value="' + cor + '" title="Cor do plano" style="width:36px;height:36px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;background:rgba(255,255,255,0.04);padding:3px;cursor:pointer;flex-shrink:0">'
      +   '</div>'
      +   '<input id="pp-desc-' + i + '" type="text" value="' + (p.descricao||'').replace(/"/g,'&quot;') + '" style="width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(255,255,255,0.5);font-size:12px;padding:7px 10px;font-family:inherit;outline:none;box-sizing:border-box" placeholder="Descrição do plano...">'
      + '</div>'
      // Preço + ciclo + dias de teste
      + '<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.07)">'
      +   '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">'
      +     '<div style="flex:1;min-width:110px">'
      +       '<div style="font-size:10px;color:rgba(255,255,255,0.35);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px">Preço (centavos)</div>'
      +       '<div style="display:flex;align-items:center;gap:5px">'
      +         '<span style="color:rgba(255,255,255,0.35);font-size:13px;font-weight:700">R$</span>'
      +         '<input id="pp-valor-' + i + '" type="number" min="0" step="1" value="' + p.valor + '" ' + (isGratis ? 'disabled' : '') + ' style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:18px;font-weight:900;padding:7px 10px;width:100px;font-family:inherit;outline:none;' + (isGratis ? 'opacity:0.35;cursor:not-allowed' : '') + '">'
      +       '</div>'
      +       '<div style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:3px">ex: 9900 = R$99,00</div>'
      +     '</div>'
      +     '<div style="min-width:160px">'
      +       '<div style="font-size:10px;color:rgba(255,255,255,0.35);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px">Ciclo</div>'
      +       '<select id="pp-ciclo-' + i + '" onchange="ppToggleTrialBox(' + i + ')" style="background:#0A1520;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:12px;font-weight:600;padding:8px 10px;font-family:inherit;outline:none;cursor:pointer;width:100%">' + cicloOpts + '</select>'
      +     '</div>'
      +   '</div>'
      +   '<div id="pp-trial-box-' + i + '" style="display:' + (['trial','forever'].includes(p.ciclo) ? 'flex' : 'none') + ';align-items:center;gap:8px;background:rgba(255,214,0,0.07);border:1px solid rgba(255,214,0,0.2);border-radius:8px;padding:10px 12px">'
      +     '<i class="fas fa-clock" style="color:#FFD600;font-size:12px;flex-shrink:0"></i>'
      +     '<span style="font-size:11px;color:#FFD600;font-weight:700;flex-shrink:0">Dias de teste:</span>'
      +     '<input id="pp-dias-' + i + '" type="number" min="0" max="365" value="' + (p.diasTeste||0) + '" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,214,0,0.3);border-radius:6px;color:#FFD600;font-size:14px;font-weight:900;padding:5px 8px;width:70px;font-family:inherit;outline:none">'
      +     '<span style="font-size:10px;color:rgba(255,255,255,0.35)">(0 = sem trial)</span>'
      +   '</div>'
      + '</div>'
      // Switches ativo + destaque
      + '<div style="padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;gap:20px">'
      +   '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:rgba(255,255,255,0.65)">'
      +     '<input id="pp-ativo-' + i + '" type="checkbox" ' + (p.ativo ? 'checked' : '') + ' style="accent-color:#00C853;width:16px;height:16px;cursor:pointer"> Plano Ativo'
      +   '</label>'
      +   '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:rgba(255,255,255,0.65)">'
      +     '<input id="pp-destaque-' + i + '" type="checkbox" ' + (p.destaque ? 'checked' : '') + ' style="accent-color:#FFD600;width:16px;height:16px;cursor:pointer"> Mais Popular'
      +   '</label>'
      + '</div>'
      // Benefícios fixos checkboxes
      + '<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.07)">'
      +   '<div style="font-size:10px;color:rgba(255,255,255,0.35);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px"><i class="fas fa-gas-pump" style="color:' + cor + ';margin-right:5px"></i>Benefícios do Posto Parceiro</div>'
      +   '<div id="pp-bens-' + i + '" style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' + benefCheckboxes + '</div>'
      + '</div>'
      // Rodapé salvar/excluir
      + '<div style="padding:12px 18px;background:rgba(0,0,0,0.15);display:flex;justify-content:flex-end;gap:8px">'
      +   (!isProtected ? '<button onclick="deletarPlanoPostoInline(' + JSON.stringify(p.id) + ')" style="background:rgba(255,82,82,0.12);color:#FF5252;border:1px solid rgba(255,82,82,0.25);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700"><i class="fas fa-trash"></i></button>' : '')
      +   '<button onclick="salvarPlanoPostoInline(' + i + ',' + JSON.stringify(p.id) + ')" style="background:' + cor + ';color:#fff;border:none;padding:8px 22px;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer"><i class="fas fa-save" style="margin-right:6px"></i>Salvar</button>'
      + '</div>'
      + '</div>';
  }).join('');
}

// Atualiza visibilidade da caixa de dias de teste ao mudar o ciclo
function ppToggleTrialBox(i) {
  const ciclo = document.getElementById('pp-ciclo-' + i);
  const box   = document.getElementById('pp-trial-box-' + i);
  if (!ciclo || !box) return;
  box.style.display = ['trial','forever'].includes(ciclo.value) ? 'flex' : 'none';
  const valorEl = document.getElementById('pp-valor-' + i);
  if (valorEl) {
    const isFree = ciclo.value === 'forever';
    valorEl.disabled = isFree;
    valorEl.style.opacity = isFree ? '0.35' : '1';
    valorEl.style.cursor  = isFree ? 'not-allowed' : 'text';
  }
}

// Toggle benefício no array em memória E atualiza borda do label
function toggleBeneficioPostoCard(planoIdx, bid, checked, inputEl) {
  if (!_planosData[planoIdx]) return;
  if (!Array.isArray(_planosData[planoIdx].beneficios)) _planosData[planoIdx].beneficios = [];
  if (checked) {
    if (!_planosData[planoIdx].beneficios.includes(bid)) _planosData[planoIdx].beneficios.push(bid);
  } else {
    _planosData[planoIdx].beneficios = _planosData[planoIdx].beneficios.filter(b => b !== bid);
  }
  // Atualiza borda do label
  const label = inputEl ? inputEl.closest('label') : null;
  if (label) {
    const cor = (document.getElementById('pp-cor-' + planoIdx) || {value:'#FF6D00'}).value;
    label.style.borderColor = checked ? cor + '55' : 'rgba(255,255,255,0.07)';
  }
}

// Salvar plano de posto inline (PUT)
async function salvarPlanoPostoInline(idx, id) {
  const nome  = (document.getElementById('pp-nome-' + idx)||{value:''}).value.trim();
  if (!nome) { alert('Informe o nome do plano.'); return; }
  const ciclo = (document.getElementById('pp-ciclo-' + idx)||{value:'monthly'}).value;
  const body = {
    nome,
    emoji:     (document.getElementById('pp-emoji-' + idx)||{value:'📦'}).value.trim() || '📦',
    cor:       (document.getElementById('pp-cor-' + idx)||{value:'#FF6D00'}).value,
    valor:     parseInt((document.getElementById('pp-valor-' + idx)||{value:'0'}).value) || 0,
    ciclo,
    descricao: (document.getElementById('pp-desc-' + idx)||{value:''}).value.trim(),
    ativo:     (document.getElementById('pp-ativo-' + idx)||{checked:true}).checked,
    destaque:  (document.getElementById('pp-destaque-' + idx)||{checked:false}).checked,
    diasTeste: (['trial','forever'].includes(ciclo)) ? parseInt((document.getElementById('pp-dias-' + idx)||{value:'0'}).value)||0 : 0,
    beneficios: _planosData[idx] ? (_planosData[idx].beneficios || []) : []
  };
  try {
    const res = await fetch('/api/admin/planos-posto/' + encodeURIComponent(id) + '?key=' + encodeURIComponent(ADMIN_KEY), {
      method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.ok) {
      mostrarToastPostos('✅ Plano "' + nome + '" salvo!', '#00C853');
      await carregarEstatisticasPlanos();
    } else {
      mostrarToastPostos('❌ Erro: ' + (data.erro||'Falha ao salvar'), '#FF5252');
    }
  } catch(e) { mostrarToastPostos('❌ Erro: ' + e.message, '#FF5252'); }
}

// Excluir plano de posto inline
async function deletarPlanoPostoInline(id) {
  if (!confirm('Excluir o plano "' + id + '"? Esta ação não pode ser desfeita.')) return;
  try {
    const res = await fetch('/api/admin/planos-posto/' + encodeURIComponent(id) + '?key=' + encodeURIComponent(ADMIN_KEY), { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      mostrarToastPostos('🗑️ Plano excluído.', '#FF6D00');
      await carregarEstatisticasPlanos();
    } else {
      mostrarToastPostos('❌ Erro: ' + (data.erro||'Falha'), '#FF5252');
    }
  } catch(e) { mostrarToastPostos('❌ ' + e.message, '#FF5252'); }
}

function mostrarToastPostos(msg, cor) {
  const t = document.getElementById('planos-posto-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = cor || '#00C853';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3500);
}

function renderizarBeneficiosModal(selecionados = []) {
  const grid = document.getElementById('mp-beneficios-grid');
  if (!grid) return;
  grid.innerHTML = BENEFICIOS_POSTO.map(b =>
    \`<label style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid \${selecionados.includes(b.id) ? 'rgba(255,109,0,0.35)' : 'rgba(255,255,255,0.08)'};border-radius:9px;padding:9px 12px;cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='rgba(255,109,0,0.3)'" onmouseout="this.style.borderColor=this.querySelector('input').checked?'rgba(255,109,0,0.35)':'rgba(255,255,255,0.08)'">
      <input type="checkbox" data-bid="\${b.id}" class="beneficio-check" style="accent-color:var(--laranja);width:15px;height:15px;flex-shrink:0" \${selecionados.includes(b.id) ? 'checked' : ''} onchange="this.closest('label').style.borderColor=this.checked?'rgba(255,109,0,0.35)':'rgba(255,255,255,0.08)'"/>
      <i class="\${b.icon}" style="color:rgba(255,255,255,0.4);font-size:11px;flex-shrink:0"></i>
      <span style="font-size:11px;color:rgba(255,255,255,0.75)">\${b.label}</span>
    </label>\`
  ).join('');
}

function coletarBeneficiosModal() {
  return Array.from(document.querySelectorAll('#mp-beneficios-grid .beneficio-check'))
    .filter(el => el.checked)
    .map(el => el.dataset.bid);
}

function mpAtualizarPeriodo() {
  const ciclo = document.getElementById('mp-ciclo').value;
  const box   = document.getElementById('mp-trial-box');
  if (ciclo === 'trial' || ciclo === 'forever') {
    box.style.display = 'block';
    if (ciclo === 'forever') document.getElementById('mp-dias-teste').value = '0';
  } else {
    box.style.display = 'none';
  }
}

// ─── Modal: abrir para editar plano existente ────────────────────────────────
function abrirModalEditarPlano(id) {
  const p = _planosData.find(x => x.id === id);
  if (!p) return;
  _planoEditandoId = id;
  document.getElementById('modal-plano-titulo').textContent = '✏️ Editar Plano — ' + p.nome;
  document.getElementById('mp-emoji').value     = p.emoji || '📦';
  document.getElementById('mp-nome').value      = p.nome || '';
  document.getElementById('mp-valor').value     = p.valor ? (p.valor / 100).toFixed(2) : '0';
  document.getElementById('mp-ciclo').value     = p.ciclo || 'monthly';
  document.getElementById('mp-cor').value       = p.cor || '#FF6D00';
  document.getElementById('mp-descricao').value = p.descricao || '';
  document.getElementById('mp-ativo').checked   = !!p.ativo;
  document.getElementById('mp-destaque').checked = !!p.destaque;
  if (document.getElementById('mp-dias-teste')) document.getElementById('mp-dias-teste').value = p.diasTeste || 30;
  const btnDel = document.getElementById('mp-deletar-btn');
  btnDel.style.display = ['posto_gratis','posto_basico','posto_plus','free','premium','anual'].includes(id) ? 'none' : 'inline-flex';
  renderizarBeneficiosModal(p.beneficios || []);
  renderizarFeaturesModal(p.features || []);
  mpAtualizarPeriodo();
  document.getElementById('modal-plano').style.display = 'block';
}

// ─── Modal: abrir para criar novo plano ─────────────────────────────────────
function abrirModalNovoPLano() {
  _planoEditandoId = null;
  document.getElementById('modal-plano-titulo').textContent = '➕ Novo Plano para Postos';
  document.getElementById('mp-emoji').value     = '⭐';
  document.getElementById('mp-nome').value      = '';
  document.getElementById('mp-valor').value     = '0';
  document.getElementById('mp-ciclo').value     = 'trial';
  document.getElementById('mp-cor').value       = '#FF6D00';
  document.getElementById('mp-descricao').value = '';
  document.getElementById('mp-ativo').checked    = true;
  document.getElementById('mp-destaque').checked = false;
  document.getElementById('mp-deletar-btn').style.display = 'none';
  if (document.getElementById('mp-dias-teste')) document.getElementById('mp-dias-teste').value = 30;
  // Benefícios padrão para novo plano
  renderizarBeneficiosModal(['perfil_basico','exibir_precos','relatorio_cliques']);
  renderizarFeaturesModal([]);
  mpAtualizarPeriodo();
  document.getElementById('modal-plano').style.display = 'block';
}

function fecharModalPlano() {
  document.getElementById('modal-plano').style.display = 'none';
  _planoEditandoId = null;
}

// ─── Renderizar lista de features no modal ───────────────────────────────────
function renderizarFeaturesModal(features) {
  const list = document.getElementById('mp-features-list');
  if (!list) return;
  list.innerHTML = features.map((f, i) =>
    '<div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9px;padding:8px 10px">'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0">'
    +   '<input type="checkbox" data-fi="' + i + '" class="feat-check" style="accent-color:var(--laranja);width:16px;height:16px;flex-shrink:0"' + (f.incluido ? ' checked' : '') + '/>'
    +   '<input type="text" data-fi="' + i + '" class="feat-txt" value="' + f.texto.replace(/"/g, '&quot;') + '" style="flex:1;background:transparent;border:none;color:#fff;font-size:12px;outline:none;min-width:0"/>'
    + '</label>'
    + '<button data-fi="' + i + '" onclick="removerFeatureModal(parseInt(this.dataset.fi))" style="background:rgba(255,82,82,0.12);color:#FF5252;border:none;border-radius:6px;width:24px;height:24px;cursor:pointer;font-size:12px;flex-shrink:0">✕</button>'
    + '</div>'
  ).join('');
}

function adicionarFeatureModal() {
  const features = coletarFeaturesModal();
  features.push({ texto: 'Novo recurso', incluido: true });
  renderizarFeaturesModal(features);
  // Focar no último input adicionado
  const inputs = document.querySelectorAll('#mp-features-list .feat-txt');
  if (inputs.length) { inputs[inputs.length - 1].focus(); inputs[inputs.length - 1].select(); }
}

function removerFeatureModal(idx) {
  const features = coletarFeaturesModal();
  features.splice(idx, 1);
  renderizarFeaturesModal(features);
}

function coletarFeaturesModal() {
  const checks = document.querySelectorAll('#mp-features-list .feat-check');
  const texts  = document.querySelectorAll('#mp-features-list .feat-txt');
  const features = [];
  for (let i = 0; i < texts.length; i++) {
    features.push({ texto: texts[i].value.trim() || 'Recurso', incluido: checks[i].checked });
  }
  return features;
}

// ─── Salvar plano (criar ou editar) ─────────────────────────────────────────
async function salvarPlanoModal() {
  const nome = document.getElementById('mp-nome').value.trim();
  if (!nome) { alert('Informe o nome do plano.'); return; }
  const valorStr = document.getElementById('mp-valor').value;
  const valorCentavos = Math.round(parseFloat(valorStr || '0') * 100);
  const ciclo = document.getElementById('mp-ciclo').value;
  const body = {
    nome,
    emoji:     document.getElementById('mp-emoji').value.trim() || '📦',
    cor:       document.getElementById('mp-cor').value || '#FF6D00',
    valor:     valorCentavos,
    ciclo,
    descricao: document.getElementById('mp-descricao').value.trim(),
    ativo:     document.getElementById('mp-ativo').checked,
    destaque:  document.getElementById('mp-destaque').checked,
    diasTeste: (ciclo === 'trial' || ciclo === 'forever') ? parseInt(document.getElementById('mp-dias-teste')?.value || '0') : 0,
    beneficios: coletarBeneficiosModal(),
    features:  coletarFeaturesModal()
  };
  const btn = document.querySelector('#modal-plano button[onclick="salvarPlanoModal()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
  try {
    let res;
    if (_planoEditandoId) {
      res = await fetch('/api/admin/planos-posto/' + encodeURIComponent(_planoEditandoId) + '?key=' + encodeURIComponent(ADMIN_KEY), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
    } else {
      // Gerar id a partir do nome
      body.id = 'posto_' + nome.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now();
      res = await fetch('/api/admin/planos-posto?key=' + encodeURIComponent(ADMIN_KEY), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
    }
    const data = await res.json();
    if (!res.ok || data.erro) throw new Error(data.erro || 'Erro ao salvar');
    fecharModalPlano();
    await carregarEstatisticasPlanos();
    mostrarToastPostos('✅ Plano salvo com sucesso!', '#00C853');
  } catch(e) {
    alert('Erro ao salvar plano: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Salvar Plano'; }
  }
}

// ─── Deletar plano ───────────────────────────────────────────────────────────
async function deletarPlanoModal() {
  if (!_planoEditandoId) return;
  const p = _planosData.find(x => x.id === _planoEditandoId);
  if (!confirm('Excluir o plano "' + (p ? p.nome : _planoEditandoId) + '"? Esta ação não pode ser desfeita.')) return;
  try {
    const res = await fetch('/api/admin/planos-posto/' + encodeURIComponent(_planoEditandoId) + '?key=' + encodeURIComponent(ADMIN_KEY), {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok || data.erro) throw new Error(data.erro || 'Erro ao excluir');
    fecharModalPlano();
    await carregarEstatisticasPlanos();
    mostrarToastPostos('🗑️ Plano excluído.', '#FF5252');
  } catch(e) {
    alert('Erro: ' + e.message);
  }
}

// ─── Toast helper ────────────────────────────────────────────────────────────
function _mostrarToast(msg, cor) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:' + cor + ';color:#fff;font-weight:700;font-size:13px;padding:12px 24px;border-radius:100px;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.4);pointer-events:none;transition:opacity 0.5s';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2500);
}

async function carregarEstatisticasNiveis() {
  try {
    const [usRes, asRes] = await Promise.all([
      fetch('/api/admin/usuarios?key=' + encodeURIComponent(ADMIN_KEY)),
      fetch('/api/admin/assinaturas?key=' + encodeURIComponent(ADMIN_KEY))
    ]);
    const usData = await usRes.json();
    const asData = await asRes.json();
    const usuarios = usData.usuarios || [];
    const assinaturas = asData.assinaturas || [];
    const assinAtivas = assinaturas.filter(a => a.status === 'ACTIVE').length;
    const bloqueados = usuarios.filter(u => u.bloqueado).length;
    const free = usuarios.length - assinAtivas - bloqueados;
    const nc = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    nc('nivel-admin-count', '1'); // você é o admin
    nc('nivel-premium-count', assinAtivas);
    nc('nivel-free-count', Math.max(0, free));
    nc('nivel-bloqueado-count', bloqueados);
  } catch(e) { console.warn('carregarEstatisticasNiveis:', e); }
}

// ── MENU DO APP ──────────────────────────────────────────────────────────────
const MENU_APP_ITENS_PADRAO = [
  { id: 'minhaConta',      label: 'Minha conta',         icone: '👤', ativo: true },
  { id: 'meusVeiculos',    label: 'Meus veículos',        icone: '🚗', ativo: true },
  { id: 'assinatura',      label: 'Assinatura',           icone: '💳', ativo: true },
  { id: 'formasPagamento', label: 'Formas de pagamento',  icone: '💰', ativo: true },
  { id: 'notificacoes',    label: 'Notificações',         icone: '🔔', ativo: true },
  { id: 'pontosNiveis',    label: 'Pontos & Níveis',      icone: '⭐', ativo: true },
  { id: 'indiqueGanhe',    label: 'Indique e ganhe',      icone: '🎁', ativo: true },
  { id: 'ajudaSuporte',    label: 'Ajuda e suporte',      icone: '❓', ativo: true },
  { id: 'configuracoes',   label: 'Configurações',        icone: '⚙️', ativo: true },
];

let _menuAppItens = [];

async function carregarMenuApp() {
  const el = document.getElementById('menu-app-itens');
  if (!el) return;
  try {
    const res = await fetch('/api/admin/menu-app?key=' + encodeURIComponent(ADMIN_KEY));
    const data = await res.json();
    _menuAppItens = data.itens || MENU_APP_ITENS_PADRAO;
    renderMenuAppItens(_menuAppItens);
  } catch(e) {
    _menuAppItens = MENU_APP_ITENS_PADRAO;
    renderMenuAppItens(_menuAppItens);
  }
}

function renderMenuAppItens(itens) {
  const el = document.getElementById('menu-app-itens');
  if (!el) return;
  el.innerHTML = itens.map(item => \`
    <div style="display:flex;align-items:center;justify-content:space-between;background:#0A1520;border-radius:12px;padding:14px 18px;border:1px solid rgba(255,255,255,\${item.ativo?'0.12':'0.05'});transition:border-color 0.2s" id="menu-row-\${item.id}">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:22px;opacity:\${item.ativo?'1':'0.35'};transition:opacity 0.2s" id="menu-icone-\${item.id}">\${item.icone}</span>
        <div>
          <div style="font-size:14px;font-weight:700;color:\${item.ativo?'#fff':'rgba(255,255,255,0.35)'};transition:color 0.2s" id="menu-label-\${item.id}">\${item.label}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.25);margin-top:2px">ID: \${item.id}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:11px;font-weight:700;color:\${item.ativo?'#FF6D00':'rgba(255,255,255,0.25)'};min-width:40px;text-align:right;transition:color 0.2s" id="menu-status-\${item.id}">\${item.ativo?'Visível':'Oculto'}</span>
        <div onclick="toggleMenuitem('\${item.id}')" id="menu-track-\${item.id}"
          style="position:relative;width:46px;height:26px;border-radius:13px;background:\${item.ativo?'#FF6D00':'rgba(255,255,255,0.1)'};cursor:pointer;transition:background 0.25s;flex-shrink:0">
          <div id="menu-knob-\${item.id}"
            style="position:absolute;top:3px;left:\${item.ativo?'23px':'3px'};width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);transition:left 0.25s;pointer-events:none"></div>
        </div>
      </div>
    </div>
  \`).join('');
}

function toggleMenuitem(id) {
  const track  = document.getElementById('menu-track-' + id);
  const knob   = document.getElementById('menu-knob-' + id);
  const status = document.getElementById('menu-status-' + id);
  const label  = document.getElementById('menu-label-' + id);
  const icone  = document.getElementById('menu-icone-' + id);
  const row    = document.getElementById('menu-row-' + id);
  if (!track) return;
  const ativo = track.dataset.ativo !== 'false' && knob.style.left !== '3px';
  const novoAtivo = !ativo;
  // Atualiza visual
  track.style.background    = novoAtivo ? '#FF6D00' : 'rgba(255,255,255,0.1)';
  knob.style.left           = novoAtivo ? '23px' : '3px';
  status.textContent        = novoAtivo ? 'Visível' : 'Oculto';
  status.style.color        = novoAtivo ? '#FF6D00' : 'rgba(255,255,255,0.25)';
  label.style.color         = novoAtivo ? '#fff' : 'rgba(255,255,255,0.35)';
  icone.style.opacity       = novoAtivo ? '1' : '0.35';
  row.style.borderColor     = novoAtivo ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
  // Salva estado no input hidden para o salvarMenuApp ler
  let inp = document.getElementById('menu-toggle-' + id);
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.id   = 'menu-toggle-' + id;
    inp.style.display = 'none';
    document.body.appendChild(inp);
  }
  inp.checked = novoAtivo;
}

async function salvarMenuApp() {
  const base = _menuAppItens.length ? _menuAppItens : MENU_APP_ITENS_PADRAO;
  const itens = base.map(item => {
    const knob = document.getElementById('menu-knob-' + item.id);
    // knob em left:23px = ativo, left:3px = inativo
    const ativo = knob ? knob.style.left === '23px' : item.ativo;
    return { ...item, ativo };
  });
  const btn = document.querySelector('#section-menu-app .btn-refresh');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; }
  try {
    const res = await fetch('/api/admin/menu-app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: ADMIN_KEY, itens })
    });
    const data = await res.json();
    if (data.ok) {
      _menuAppItens = itens;
      showToast('✅ Menu salvo com sucesso!', 'ok');
    } else {
      showToast('❌ Erro ao salvar: ' + (data.error || ''), 'err');
    }
  } catch(e) {
    showToast('❌ Erro de conexão', 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Salvar'; }
  }
}
</script>
</body>
</html>`

  return c.html(html)
})

// ─── POST /api/admin/sync-anp ─────────────────────────────────────────────────
// Baixa o XLSX mais recente da ANP, processa e salva no KV.
// Pode ser chamado manualmente pelo admin ou pelo cron automático.
app.post('/api/admin/sync-anp', async (c) => {
  const kv = getKV(c.env)
  if (!kv) return c.json({ erro: 'KV não disponível — verifique binding ROTAPOSTO_KV' }, 500)

  const candidates = getAnpXlsxUrlCandidates(4)
  const erros: string[] = []

  for (const { url, semana } of candidates) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'RotaPosto/1.0' },
        signal: AbortSignal.timeout(45000)
      })
      if (!res.ok) {
        erros.push(`${semana}: HTTP ${res.status}`)
        continue
      }
      const buf = await res.arrayBuffer()
      if (buf.byteLength < 10000) {
        erros.push(`${semana}: arquivo muito pequeno (${buf.byteLength} bytes)`)
        continue
      }
      const result = await processarXlsxAnp(buf, semana)
      result.url = url
      await salvarPrecoKV(kv, result)
      return c.json({
        ok: true,
        semana,
        totalPostos: result.totalPostos,
        url,
        ts: result.ts
      })
    } catch (e: any) {
      const msg = e?.message || String(e)
      console.error(`[ANP Sync] Erro ${semana}:`, msg)
      erros.push(`${semana}: ${msg}`)
    }
  }

  return c.json({ erro: 'Nenhum arquivo ANP acessível', detalhes: erros }, 404)
})

// ─── GET /api/admin/sync-anp/status ───────────────────────────────────────────
// Retorna info sobre o último sync realizado (metadados do KV).
app.get('/api/admin/sync-anp/status', async (c) => {
  const kv = getKV(c.env)
  if (!kv) return c.json({ erro: 'KV não disponível' }, 500)

  try {
    const metaRaw = await kv.get('precos:meta', 'text')
    const semanaAtual = getSemanaANPAtual()

    if (!metaRaw) {
      return c.json({
        status: 'sem_dados',
        semanaAtual: semanaAtual.semana,
        urlAtual: semanaAtual.url,
        mensagem: 'Nenhum sync realizado ainda. Chame POST /api/admin/sync-anp'
      })
    }

    const meta = JSON.parse(metaRaw)
    return c.json({
      status: 'ok',
      semanaKV: meta.semana,
      totalPostos: meta.totalPostos,
      atualizadoEm: meta.updatedAt,
      semanaAtual: semanaAtual.semana,
      urlAtual: semanaAtual.url,
      dadosAtuais: meta.semana === semanaAtual.semana
    })
  } catch (e: any) {
    return c.json({ erro: 'Erro ao ler metadados', detalhe: e?.message }, 500)
  }
})

// ─── Cron handler: todo sábado ao meio-dia sincroniza ANP automaticamente ─────
async function syncAnpScheduled(kv: KVNamespace | undefined): Promise<void> {
  if (!kv) {
    console.error('[ANP Cron] KV não disponível')
    return
  }

  const candidates = getAnpXlsxUrlCandidates(2)
  for (const { url, semana } of candidates) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'RotaPosto/1.0' },
        signal: AbortSignal.timeout(60000)
      })
      if (!res.ok) {
        console.warn(`[ANP Cron] HTTP ${res.status} para ${url}`)
        continue
      }
      const buf = await res.arrayBuffer()
      if (buf.byteLength < 10000) continue
      const result = await processarXlsxAnp(buf, semana)
      result.url = url
      await salvarPrecoKV(kv, result)
      return
    } catch (e) {
      console.error(`[ANP Cron] Erro tentando ${url}:`, e)
    }
  }
  console.error('[ANP Cron] ❌ Falhou para todas as URLs candidatas')
}

// ══════════════════════════════════════════════════════════════════════════════
//  APIs B2B Parcerias com Postos
// ══════════════════════════════════════════════════════════════════════════════

// ── Helpers R2-as-KV (storage persistente via R2) ────────────────────────────
// O binding ROTAPOSTO_R2 é um R2Bucket usado como key-value store
// Chave → objeto JSON no R2. Funciona como KV sem TTL nativo.

// Sanitiza chave para R2: substitui ':' por '--' (R2 aceita ':' mas pode causar problemas)
function r2Key(key: string): string {
  return key.replace(/:/g, '--')
}

async function r2Get(r2: R2Bucket | undefined, key: string): Promise<unknown> {
  if (!r2) return null
  try {
    const obj = await r2.get(r2Key(key))
    if (!obj) return null
    const text = await obj.text()
    return JSON.parse(text)
  } catch (e) {
    console.error('[r2Get] erro key=' + key, e)
    return null
  }
}

async function r2Put(r2: R2Bucket | undefined, key: string, data: unknown): Promise<void> {
  if (!r2) { console.warn('[r2Put] r2 undefined, pulando key=' + key); return }
  try {
    await r2.put(r2Key(key), JSON.stringify(data), { httpMetadata: { contentType: 'application/json' } })
  } catch (e) {
    console.error('[r2Put] erro key=' + key, e)
  }
}

async function r2Delete(r2: R2Bucket | undefined, key: string): Promise<void> {
  if (!r2) return
  try { await r2.delete(key) } catch {}
}

// Wrappers compatíveis com a interface KV anterior
async function kvGetParceiro(kv: KVNamespace | undefined, id: string, r2?: R2Bucket) {
  // Tenta R2 primeiro (storage principal), fallback para KV legado
  const r2val = await r2Get(r2, `parceiro:${id}`)
  if (r2val !== null) return r2val
  if (!kv) return null
  try { return JSON.parse(await kv.get(`parceiro:${id}`) || 'null') } catch { return null }
}
async function kvSetParceiro(kv: KVNamespace | undefined, id: string, data: Record<string, unknown>, _ttl?: number, r2?: R2Bucket) {
  await r2Put(r2, `parceiro:${id}`, data)
  if (kv) try { await kv.put(`parceiro:${id}`, JSON.stringify(data)) } catch {}
}
async function kvGetCupom(kv: KVNamespace | undefined, codigo: string, r2?: R2Bucket) {
  const r2val = await r2Get(r2, `cupom:${codigo}`)
  if (r2val !== null) return r2val
  if (!kv) return null
  try { return JSON.parse(await kv.get(`cupom:${codigo}`) || 'null') } catch { return null }
}
async function kvSetCupom(kv: KVNamespace | undefined, codigo: string, data: Record<string, unknown>, ttl = 600, r2?: R2Bucket) {
  await r2Put(r2, `cupom:${codigo}`, data)
  if (kv) try { await kv.put(`cupom:${codigo}`, JSON.stringify(data), { expirationTtl: ttl }) } catch {}
}
async function kvGetPrecos(kv: KVNamespace | undefined, postoId: string, r2?: R2Bucket) {
  const r2val = await r2Get(r2, `precos:${postoId}`)
  if (r2val !== null) return r2val
  if (!kv) return null
  try { return JSON.parse(await kv.get(`precos:${postoId}`) || 'null') } catch { return null }
}
async function kvGetLeads(kv: KVNamespace | undefined, r2?: R2Bucket): Promise<unknown[]> {
  const r2val = await r2Get(r2, 'parceiros:leads')
  if (Array.isArray(r2val)) return r2val
  if (!kv) return []
  try { return JSON.parse(await kv.get('parceiros:leads') || '[]') } catch { return [] }
}
function gerarCodigo6(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}
function gerarIdParceiro(): string {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
function hashSimples(senha: string): string {
  let h = 0
  for (let i = 0; i < senha.length; i++) { h = (Math.imul(31, h) + senha.charCodeAt(i)) | 0 }
  return Math.abs(h).toString(16)
}

// ── POST /api/parceiros/cadastro ──────────────────────────────────────────────
app.post('/api/parceiros/cadastro', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const body = await c.req.json() as Record<string, string>
    const { cnpj, nome, whatsapp, email, nomePosto, bandeira, plano, cidade, senha } = body

    if (!cnpj || !nome || !email || !nomePosto) {
      return c.json({ ok: false, erro: 'Campos obrigatórios: cnpj, nome, email, nomePosto' }, 400)
    }

    // Verificar se CNPJ já cadastrado
    const cnpjKey = cnpj.replace(/\D/g, '')
    const existente = await kvGetParceiro(kv, `cnpj_${cnpjKey}`, r2)
    if (existente) {
      return c.json({ ok: false, erro: 'CNPJ já cadastrado. Faça login no painel.' }, 409)
    }

    const id = gerarIdParceiro()
    const senhaHash = hashSimples(senha || cnpjKey.slice(-6))
    const agora = new Date().toISOString()

    const parceiro = {
      id, cnpj: cnpjKey, nome, whatsapp: whatsapp || '', email,
      nomePosto, bandeira: bandeira || 'Independente',
      plano: plano || 'visibilidade', cidade: cidade || '',
      senhaHash, status: 'pendente', criadoEm: agora,
      // Configurações padrão
      pinDourado: false, seloVerificado: false, cuponsAtivos: false,
      notificacoesAtivas: false, topoLista: false,
      // Métricas zeradas
      totalCliques: 0, totalCupons: 0, totalImpressoes: 0
    }

    await kvSetParceiro(kv, id, parceiro, undefined, r2)
    await kvSetParceiro(kv, `cnpj_${cnpjKey}`, { id, email })
    await kvSetParceiro(kv, `email_${email}`, { id, cnpj: cnpjKey })

    // Salvar no índice de leads para admin visualizar
    const leads = await kvGetLeads(kv, r2) as Record<string, unknown>[]
    leads.push({ id, nomePosto, cnpj: cnpjKey, email, plano, cidade, criadoEm: agora })
    if (kv) await kv.put('parceiros:leads', JSON.stringify(leads.slice(-500)))

    return c.json({
      ok: true,
      id,
      mensagem: `Cadastro recebido! Entraremos em contato em até 24h via WhatsApp ou e-mail (${email}).`,
      proximosPasso: 'Acesse /parcerias/empresa com seu e-mail e CNPJ para configurar seu painel.'
    })
  } catch (e) {
    console.error('[parceiros/cadastro]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── POST /api/parceiros/login ─────────────────────────────────────────────────
app.post('/api/parceiros/login', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
    const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const body = await c.req.json() as Record<string, string>
    const { email, senha } = body

    if (!email || !senha) {
      return c.json({ ok: false, sucesso: false, mensagem: 'E-mail e senha obrigatórios' }, 400)
    }

    // ── Conta de teste hardcoded (funciona sem KV) ────────────────────────────
    if (email === 'teste@rotaposto.com.br' && senha === 'teste123') {
      const token = `sess_teste_${Date.now().toString(36)}`
      if (kv) await kv.put(`parceiro:sess_${token}`, JSON.stringify({ parceiroId: 'p_teste', email, exp: Date.now() + 86400000 }), { expirationTtl: 86400 })
      return c.json({
        ok: true, sucesso: true, token,
        sessao: {
          token, postoId: 'p_teste', postoNome: 'Posto Teste RotaPosto',
          plano: 'premium', email, cargo: 'gerente',
          tel: '(27) 99999-9999', bandeira: 'Independente',
          cidade: 'Vitória - ES', horario: '24 horas', seloVerificado: true
        }
      })
    }

    // ── Verificar se é funcionário de algum posto ─────────────────────────────
    if (kv) {
      const funcRef = await kv.get(`func_email:${email}`)
      if (funcRef) {
        const funcData = JSON.parse(funcRef) as Record<string, unknown>
        const senhaHash = hashSimples(senha)
        if (funcData.senhaHash === senhaHash) {
          const postoId = String(funcData.postoId)
          // Buscar dados do posto para preencher a sessão
          const posto = await kvGetParceiro(kv, postoId, r2) as Record<string, unknown> | null
          const token = `sess_func_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
          await kv.put(`parceiro:sess_${token}`, JSON.stringify({
            parceiroId: postoId, funcionarioId: funcData.id, cargo: funcData.cargo, email, exp: Date.now() + 86400000
          }), { expirationTtl: 86400 })
          return c.json({
            ok: true, sucesso: true, token,
            sessao: {
              token,
              postoId,
              postoNome: posto ? String((posto as Record<string,unknown>).nomePosto || 'Posto') : 'Posto',
              plano: posto ? String((posto as Record<string,unknown>).plano || 'visibilidade') : 'visibilidade',
              email,
              nome: String(funcData.nome || ''),
              cargo: String(funcData.cargo || 'frentista'),
              bandeira: posto ? String((posto as Record<string,unknown>).bandeira || '') : '',
              cidade: posto ? String((posto as Record<string,unknown>).cidade || '') : ''
            }
          })
        } else {
          return c.json({ ok: false, sucesso: false, mensagem: 'Senha incorreta.' }, 401)
        }
      }
    }

    // ── Login gerente (dono do posto) ─────────────────────────────────────────
    const ref = await kvGetParceiro(kv, `email_${email}`, r2)
    if (!ref) {
      return c.json({ ok: false, sucesso: false, mensagem: 'E-mail não encontrado. Cadastre seu posto primeiro.' }, 404)
    }

    const parceiro = await kvGetParceiro(kv, (ref as Record<string, string>).id, r2)
    if (!parceiro) {
      return c.json({ ok: false, sucesso: false, mensagem: 'Conta não encontrada' }, 404)
    }

    const p = parceiro as Record<string, unknown>
    const senhaHash = hashSimples(senha)
    if (p.senhaHash !== senhaHash) {
      const cnpjSenha = hashSimples(String(p.cnpj).slice(-6))
      if (senhaHash !== cnpjSenha) {
        return c.json({ ok: false, sucesso: false, mensagem: 'E-mail ou senha incorretos.' }, 401)
      }
    }

    const token = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
    if (kv) await kv.put(`parceiro:sess_${token}`, JSON.stringify({ parceiroId: p.id, email, cargo: 'gerente', exp: Date.now() + 86400000 }), { expirationTtl: 86400 })

    return c.json({
      ok: true, sucesso: true, token,
      sessao: {
        token,
        postoId: p.id, postoNome: p.nomePosto,
        plano: p.plano, email,
        cargo: 'gerente',
        bandeira: p.bandeira, cidade: p.cidade,
        seloVerificado: p.seloVerificado
      }
    })
  } catch (e) {
    console.error('[parceiros/login]', e)
    return c.json({ ok: false, sucesso: false, mensagem: 'Erro interno' }, 500)
  }
})

// ── POST /api/parceiros/equipe/convidar ───────────────────────────────────────
app.post('/api/parceiros/equipe/convidar', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
    if (!kv) return c.json({ ok: false, erro: 'KV indisponível' }, 503)

    const token = c.req.header('Authorization')?.replace('Bearer ', '') || ''
    if (!token) return c.json({ ok: false, erro: 'Não autorizado' }, 401)

    // Verificar sessão e que é gerente
    const sessRaw = await kv.get(`parceiro:sess_${token}`)
    if (!sessRaw) return c.json({ ok: false, erro: 'Sessão inválida ou expirada' }, 401)
    const sess = JSON.parse(sessRaw) as Record<string, unknown>
    if (sess.cargo && sess.cargo !== 'gerente') return c.json({ ok: false, erro: 'Apenas gerentes podem cadastrar funcionários' }, 403)

    const body = await c.req.json() as Record<string, string>
    const { nome, email, senha, cargo, postoId } = body

    if (!nome || !email || !senha || !cargo || !postoId) {
      return c.json({ ok: false, erro: 'Campos obrigatórios: nome, email, senha, cargo, postoId' }, 400)
    }
    const cargosValidos = ['caixa', 'frentista']
    if (!cargosValidos.includes(cargo)) {
      return c.json({ ok: false, erro: 'Cargo inválido. Use: caixa ou frentista' }, 400)
    }

    // Verificar se e-mail já existe como gerente ou funcionário
    const jaGerente = await kv.get(`parceiro:email_${email}`)
    const jaFuncionario = await kv.get(`func_email:${email}`)
    if (jaGerente || jaFuncionario) {
      return c.json({ ok: false, erro: 'Este e-mail já está cadastrado no sistema.' }, 409)
    }

    const funcId = `func_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const senhaHash = hashSimples(senha)
    const funcData = { id: funcId, nome, email, cargo, postoId, senhaHash, criadoEm: new Date().toISOString() }

    // Salvar dados do funcionário indexados por e-mail
    await kv.put(`func_email:${email}`, JSON.stringify(funcData))

    // Adicionar ao array de equipe do posto
    const equipeRaw = await kv.get(`equipe:${postoId}`)
    const equipe = equipeRaw ? JSON.parse(equipeRaw) as Record<string, unknown>[] : []
    equipe.push({ id: funcId, nome, email, cargo, criadoEm: funcData.criadoEm })
    await kv.put(`equipe:${postoId}`, JSON.stringify(equipe))

    return c.json({ ok: true, id: funcId, mensagem: 'Funcionário cadastrado com sucesso.' })
  } catch (e) {
    console.error('[equipe/convidar]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── GET /api/parceiros/equipe ─────────────────────────────────────────────────
app.get('/api/parceiros/equipe', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
    if (!kv) return c.json({ ok: false, erro: 'KV indisponível' }, 503)

    const token = c.req.header('Authorization')?.replace('Bearer ', '') || ''
    const postoId = c.req.query('postoId') || ''
    if (!token || !postoId) return c.json({ ok: false, erro: 'token e postoId obrigatórios' }, 400)

    const sessRaw = await kv.get(`parceiro:sess_${token}`)
    if (!sessRaw) return c.json({ ok: false, erro: 'Sessão inválida' }, 401)
    const sess = JSON.parse(sessRaw) as Record<string, unknown>
    if (String(sess.parceiroId) !== postoId && sess.cargo !== 'gerente') {
      return c.json({ ok: false, erro: 'Sem permissão' }, 403)
    }

    const equipeRaw = await kv.get(`equipe:${postoId}`)
    const funcionarios = equipeRaw ? JSON.parse(equipeRaw) as Record<string, unknown>[] : []
    return c.json({ ok: true, funcionarios })
  } catch (e) {
    console.error('[equipe/listar]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── DELETE /api/parceiros/equipe/:id ─────────────────────────────────────────
app.delete('/api/parceiros/equipe/:id', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
    if (!kv) return c.json({ ok: false, erro: 'KV indisponível' }, 503)

    const token = c.req.header('Authorization')?.replace('Bearer ', '') || ''
    if (!token) return c.json({ ok: false, erro: 'Não autorizado' }, 401)

    const sessRaw = await kv.get(`parceiro:sess_${token}`)
    if (!sessRaw) return c.json({ ok: false, erro: 'Sessão inválida' }, 401)
    const sess = JSON.parse(sessRaw) as Record<string, unknown>
    if (sess.cargo && sess.cargo !== 'gerente') return c.json({ ok: false, erro: 'Apenas gerentes podem remover funcionários' }, 403)

    const funcId = c.req.param('id')
    const body = await c.req.json() as Record<string, string>
    const postoId = body.postoId || String(sess.parceiroId)

    // Buscar equipe do posto para achar o e-mail do funcionário
    const equipeRaw = await kv.get(`equipe:${postoId}`)
    if (!equipeRaw) return c.json({ ok: false, erro: 'Funcionário não encontrado' }, 404)

    const equipe = JSON.parse(equipeRaw) as Record<string, unknown>[]
    const func = equipe.find(f => f.id === funcId)
    if (!func) return c.json({ ok: false, erro: 'Funcionário não encontrado' }, 404)

    // Remover índice por e-mail
    if (func.email) await kv.delete(`func_email:${func.email}`)

    // Remover do array de equipe
    const novaEquipe = equipe.filter(f => f.id !== funcId)
    await kv.put(`equipe:${postoId}`, JSON.stringify(novaEquipe))

    return c.json({ ok: true, mensagem: 'Funcionário removido com sucesso.' })
  } catch (e) {
    console.error('[equipe/remover]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── GET /api/parceiros/dashboard ──────────────────────────────────────────────
app.get('/api/parceiros/dashboard', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const postoId = c.req.query('postoId') || ''
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.query('token') || ''

    if (!postoId && !token) {
      return c.json({ ok: false, erro: 'postoId ou token obrigatório' }, 400)
    }

    let parceiroId = postoId
    if (token && !postoId) {
      const sess = await kvGetParceiro(kv, `sess_${token}`, r2) as Record<string, unknown> | null
      if (!sess || (sess.exp as number) < Date.now()) {
        return c.json({ ok: false, erro: 'Sessão expirada' }, 401)
      }
      parceiroId = String(sess.parceiroId)
    }

    const parceiro = await kvGetParceiro(kv, parceiroId, r2) as Record<string, unknown> | null
    if (!parceiro) {
      // Retornar dados demo se posto não encontrado (para teste do painel)
      return c.json({
        ok: true, demo: true,
        metricas: { cliques: 147, cupons: 23, impressoes: 892, conversao: 2.6 },
        cuponsRecentes: [
          { codigo: '843912', usuario: 'Carlos M.', combustivel: 'Gasolina Aditivada', valor: 5.80, status: 'UTILIZADO', dataUso: new Date(Date.now() - 3600000).toISOString() },
          { codigo: '291847', usuario: 'Ana P.', combustivel: 'Etanol', valor: 4.10, status: 'UTILIZADO', dataUso: new Date(Date.now() - 7200000).toISOString() },
          { codigo: '573920', usuario: 'Marcos L.', combustivel: 'Gasolina Comum', valor: 5.65, status: 'EXPIRADO', dataUso: null },
        ],
        evolucaoSemanal: [12, 18, 9, 23, 31, 15, 22]
      })
    }

    // Buscar cupons utilizados recentemente (últimos 20)
    const historico = await kv?.get(`historico:${parceiroId}`) || '[]'
    let cuponsRecentes = []
    try { cuponsRecentes = JSON.parse(historico).slice(-20).reverse() } catch {}

    // Calcular métricas do mês atual
    const agora = new Date()
    const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
    const metricasKey = `metricas:${parceiroId}:${mesAtual}`
    let metricas = { cliques: 0, cupons: 0, impressoes: 0, conversao: 0 }
    try {
      const m = await kv?.get(metricasKey)
      if (m) metricas = { ...metricas, ...JSON.parse(m) }
    } catch {}

    // Evolução últimos 7 dias (simulado se sem dados reais)
    const evolucaoSemanal = [
      metricas.cliques > 0 ? Math.floor(metricas.cliques / 7) : 8,
      metricas.cliques > 0 ? Math.floor(metricas.cliques / 6) : 12,
      metricas.cliques > 0 ? Math.floor(metricas.cliques / 8) : 7,
      metricas.cliques > 0 ? Math.floor(metricas.cliques / 5) : 15,
      metricas.cliques > 0 ? Math.floor(metricas.cliques / 4) : 19,
      metricas.cliques > 0 ? Math.floor(metricas.cliques / 6) : 11,
      metricas.cliques > 0 ? Math.floor(metricas.cliques / 3) : 18,
    ]

    return c.json({
      ok: true,
      parceiro: { id: parceiro.id, nomePosto: parceiro.nomePosto, bandeira: parceiro.bandeira, plano: parceiro.plano, status: parceiro.status },
      metricas,
      cuponsRecentes,
      evolucaoSemanal
    })
  } catch (e) {
    console.error('[parceiros/dashboard]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── GET /api/parceiros/perfil ─────────────────────────────────────────────────
app.get('/api/parceiros/perfil', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
    const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const postoId = c.req.query('postoId') || ''
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || ''
    let parceiroId = postoId
    if (token && !postoId) {
      const sess = await kvGetParceiro(kv, `sess_${token}`, r2) as Record<string, unknown> | null
      if (!sess || (sess.exp as number) < Date.now()) return c.json({ ok: false, erro: 'Sessão expirada' }, 401)
      parceiroId = String(sess.parceiroId)
    }
    if (!parceiroId) return c.json({ ok: false, erro: 'postoId obrigatório' }, 400)
    const parceiro = await kvGetParceiro(kv, parceiroId, r2) as Record<string, unknown> | null
    if (!parceiro) return c.json({ ok: false, erro: 'Posto não encontrado' }, 404)
    return c.json({
      ok: true,
      posto: {
        id: parceiroId,
        nome: parceiro.nomePosto, bandeira: parceiro.bandeira, tel: parceiro.tel,
        horario: parceiro.horario, email: parceiro.email, cnpj: parceiro.cnpj,
        endereco: parceiro.endereco || {},
        lat: parceiro.lat, lng: parceiro.lng,
        servicos: parceiro.servicos || [],
        plano: parceiro.plano, status: parceiro.status
      }
    })
  } catch(e) {
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── POST /api/parceiros/perfil ────────────────────────────────────────────────
app.post('/api/parceiros/perfil', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
    const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || ''
    const body = await c.req.json() as Record<string, unknown>
    const postoId = String(body.postoId || '')

    // Auth via token ou postoId direto
    let parceiroId = postoId
    if (token) {
      const sess = await kvGetParceiro(kv, `sess_${token}`, r2) as Record<string, unknown> | null
      if (!sess || (sess.exp as number) < Date.now()) return c.json({ ok: false, erro: 'Sessão expirada' }, 401)
      parceiroId = String(sess.parceiroId)
    }
    if (!parceiroId) return c.json({ ok: false, erro: 'postoId obrigatório' }, 400)

    const parceiro = await kvGetParceiro(kv, parceiroId, r2) as Record<string, unknown> | null
    if (!parceiro) return c.json({ ok: false, erro: 'Posto não encontrado' }, 404)

    // Atualizar campos
    const updated: Record<string, unknown> = {
      ...parceiro,
      nomePosto: body.nome || parceiro.nomePosto,
      bandeira: body.bandeira || parceiro.bandeira,
      tel: body.tel ?? parceiro.tel,
      horario: body.horario ?? parceiro.horario,
      email: body.email ?? parceiro.email,
      cnpj: body.cnpj ?? parceiro.cnpj,
      endereco: body.endereco ?? parceiro.endereco,
      servicos: body.servicos ?? parceiro.servicos,
      atualizadoEm: new Date().toISOString()
    }
    if (body.lat) updated.lat = body.lat
    if (body.lng) updated.lng = body.lng

    await kvSetParceiro(kv, parceiroId, updated, r2)

    // Se tiver lat/lng, atualizar também no R2/KV de postos para o mapa do app
    if (body.lat && body.lng) {
      try {
        const postoKey = `posto:${parceiroId}`
        const postoData = await kv?.get(postoKey)
        if (postoData) {
          const posto = JSON.parse(postoData) as Record<string, unknown>
          posto.lat = body.lat; posto.lng = body.lng
          posto.nome = body.nome || posto.nome
          posto.bandeira = body.bandeira || posto.bandeira
          posto.tel = body.tel || posto.tel
          posto.horario = body.horario || posto.horario
          posto.endereco = body.endereco || posto.endereco
          await kv?.put(postoKey, JSON.stringify(posto))
        }
      } catch {}
    }

    return c.json({ ok: true, mensagem: 'Perfil atualizado com sucesso!' })
  } catch(e) {
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── POST /api/parceiros/cupons/validar ────────────────────────────────────────
app.post('/api/parceiros/cupons/validar', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const body = await c.req.json() as Record<string, string>
    const { codigo, postoId } = body

    if (!codigo || codigo.length < 6) {
      return c.json({ valido: false, mensagem: 'Código inválido. Digite os 6 dígitos.' }, 400)
    }

    const codigoLimpo = codigo.replace(/\D/g, '').padStart(6, '0').slice(-6)
    const cupom = await kvGetCupom(kv, codigoLimpo, r2) as Record<string, unknown> | null

    if (!cupom) {
      return c.json({ valido: false, mensagem: 'Cupom não encontrado ou expirado.' }, 404)
    }

    // Verificar status
    if (cupom.status === 'UTILIZADO') {
      return c.json({
        valido: false,
        mensagem: '❌ Este cupom já foi utilizado!',
        dataUso: cupom.dataUso
      }, 400)
    }

    if (cupom.status === 'EXPIRADO') {
      return c.json({ valido: false, mensagem: '⏰ Cupom expirado! O cliente deve gerar um novo.' }, 400)
    }

    // Verificar tempo (5 minutos = 300 segundos)
    const agora = Date.now()
    const criadoEm = Number(cupom.criadoEm) || 0
    const deltaSegundos = (agora - criadoEm) / 1000
    if (deltaSegundos > 300) {
      if (kv) await kvSetCupom(kv, codigoLimpo, { ...cupom, status: 'EXPIRADO' }, 3600, r2)
      return c.json({ valido: false, mensagem: '⏰ Cupom expirado (5 minutos)! Peça ao cliente gerar outro.' }, 400)
    }

    // Buscar preços do posto para calcular desconto
    const precos = postoId ? await kvGetPrecos(kv, postoId, r2) as Record<string, unknown> | null : null
    const combustivel = String(cupom.combustivel || 'Gasolina Comum')
    let precoBomba = 5.90
    let desconto = 0.10
    let precoFinal = precoBomba - desconto

    if (precos) {
      const p = precos as Record<string, Record<string, number>>
      const dadosComb = p[combustivel]
      if (dadosComb) {
        precoBomba = dadosComb.precoBomba || precoBomba
        desconto = dadosComb.desconto || desconto
        precoFinal = precoBomba - desconto
      }
    }

    // Para cupons tipo POSTO: decrementar usos; tipo USUARIO: marcar UTILIZADO
    const tipo = String((cupom as Record<string,unknown>).tipo || 'USUARIO')
    let cupomAtualizado: Record<string,unknown>
    if (tipo === 'POSTO') {
      const usosRestantes = Math.max(0, Number((cupom as Record<string,unknown>).usosRestantes || 1) - 1)
      cupomAtualizado = { ...cupom, usosRestantes, dataUltUso: new Date().toISOString(), postoId: postoId || '',
        status: usosRestantes <= 0 ? 'ESGOTADO' : 'ATIVO' }
      const ttlRestante = Math.max(60, Math.floor((Number((cupom as Record<string,unknown>).expiraEm || 0) - Date.now()) / 1000))
      await kvSetCupom(kv, codigoLimpo, cupomAtualizado, ttlRestante, r2)
      // Atualizar também na lista do posto
      if (postoId && kv) {
        const listaKey = `posto_cupons:${postoId}`
        try {
          const listaRaw = await kv.get(listaKey)
          if (listaRaw) {
            const lista = JSON.parse(listaRaw) as Record<string,unknown>[]
            const idx = lista.findIndex(x => x.codigo === codigoLimpo)
            if (idx >= 0) lista[idx] = cupomAtualizado
            await kv.put(listaKey, JSON.stringify(lista), { expirationTtl: 86400 * 7 })
          }
        } catch {}
      }
      // Usar desconto do próprio cupom criado pelo posto
      desconto = Number((cupom as Record<string,unknown>).desconto || desconto)
      precoFinal = precoBomba - desconto
    } else {
      cupomAtualizado = { ...cupom, status: 'UTILIZADO', dataUso: new Date().toISOString(), postoId: postoId || '' }
      await kvSetCupom(kv, codigoLimpo, cupomAtualizado, 86400, r2)
    }

    // Registrar no histórico do posto
    if (postoId && kv) {
      const histKey = `historico:${postoId}`
      let hist = []
      try { hist = JSON.parse(await kv.get(histKey) || '[]') } catch {}
      hist.push({
        codigo: codigoLimpo,
        usuario: cupom.nomeUsuario || 'Assinante Premium',
        combustivel,
        precoBomba,
        desconto,
        precoFinal,
        dataUso: cupomAtualizado.dataUso,
        status: 'UTILIZADO'
      })
      await kv.put(histKey, JSON.stringify(hist.slice(-200)), { expirationTtl: 2592000 }) // 30 dias
    }

    // Atualizar métricas do posto
    if (postoId && kv) {
      const mesAtual = new Date().toISOString().slice(0, 7)
      const metKey = `metricas:${postoId}:${mesAtual}`
      let met = { cliques: 0, cupons: 0, impressoes: 0, conversao: 0 }
      try { met = { ...met, ...JSON.parse(await kv.get(metKey) || '{}') } } catch {}
      met.cupons++
      await kv.put(metKey, JSON.stringify(met), { expirationTtl: 2678400 }) // 31 dias
    }

    return c.json({
      valido: true,
      mensagem: '✅ CUPOM CONFIRMADO!',
      usuario: cupom.nomeUsuario || 'Assinante Premium',
      uid: cupom.uid || '',
      combustivel,
      precoBomba: precoBomba.toFixed(2),
      desconto: desconto.toFixed(2),
      precoFinal: precoFinal.toFixed(2),
      instrucao: `Aplique R$ ${precoFinal.toFixed(2)}/litro na bomba de ${combustivel}`
    })
  } catch (e) {
    console.error('[parceiros/cupons/validar]', e)
    return c.json({ valido: false, mensagem: 'Erro interno ao validar cupom' }, 500)
  }
})

// ── GET /api/parceiros/cupons ─────────────────────────────────────────────────
app.get('/api/parceiros/cupons', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const postoId = c.req.query('postoId') || ''
    const status = c.req.query('status') || '' // GERADO | UTILIZADO | EXPIRADO
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.query('token') || ''

    let parceiroId = postoId
    if (!parceiroId && token) {
      const sess = await kvGetParceiro(kv, `sess_${token}`, r2) as Record<string, unknown> | null
      if (sess && (sess.exp as number) > Date.now()) parceiroId = String(sess.parceiroId)
    }
    if (!parceiroId) return c.json({ ok: false, erro: 'postoId obrigatório' }, 400)

    const histKey = `historico:${parceiroId}`
    let hist: Record<string, unknown>[] = []
    try { hist = JSON.parse(await kv?.get(histKey) || '[]') } catch {}

    if (status) hist = hist.filter(h => h.status === status)

    return c.json({
      ok: true,
      total: hist.length,
      cupons: hist.slice(-100).reverse(),
      resumo: {
        total: hist.length,
        utilizados: hist.filter(h => h.status === 'UTILIZADO').length,
        expirados: hist.filter(h => h.status === 'EXPIRADO').length,
      }
    })
  } catch (e) {
    console.error('[parceiros/cupons]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── POST /api/parceiros/precos ────────────────────────────────────────────────
app.post('/api/parceiros/precos', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const body = await c.req.json() as Record<string, unknown>
    const { postoId, token, precos } = body as { postoId: string; token: string; precos: Record<string, { precoBomba: number; desconto: number }> }

    // Autenticação
    let parceiroId = postoId
    if (!parceiroId && token) {
      const sess = await kvGetParceiro(kv, `sess_${token}`, r2) as Record<string, unknown> | null
      if (sess && (sess.exp as number) > Date.now()) parceiroId = String(sess.parceiroId)
    }
    if (!parceiroId) return c.json({ ok: false, erro: 'postoId obrigatório' }, 400)
    if (!precos || typeof precos !== 'object') return c.json({ ok: false, erro: 'precos obrigatório' }, 400)

    // Calcular preço final de cada combustível
    const precosCalculados: Record<string, unknown> = {}
    for (const [comb, dados] of Object.entries(precos)) {
      const bomba = Number(dados.precoBomba) || 0
      const desc = Number(dados.desconto) || 0
      precosCalculados[comb] = {
        precoBomba: bomba,
        desconto: desc,
        precoFinal: +(bomba - desc).toFixed(3),
        atualizadoEm: new Date().toISOString()
      }
    }

    if (kv) await kv.put(`precos:${parceiroId}`, JSON.stringify(precosCalculados), { expirationTtl: 172800 }) // 2 dias

    // Notificar usuários que monitoram este posto (simulado — em produção usaria FCM)

    return c.json({
      ok: true,
      mensagem: 'Preços atualizados com sucesso!',
      precos: precosCalculados
    })
  } catch (e) {
    console.error('[parceiros/precos]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── POST /api/parceiros/notificacoes/enviar ───────────────────────────────────
app.post('/api/parceiros/notificacoes/enviar', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const body = await c.req.json() as Record<string, unknown>
    const { postoId, token, tipo, titulo, mensagem, raioKm, combustivel, preco } = body as {
      postoId: string; token: string; tipo: string
      titulo: string; mensagem: string
      raioKm?: number; combustivel?: string; preco?: number
    }

    // Autenticação
    let parceiroId = postoId
    if (!parceiroId && token) {
      const sess = await kvGetParceiro(kv, `sess_${token}`, r2) as Record<string, unknown> | null
      if (sess && (sess.exp as number) > Date.now()) parceiroId = String(sess.parceiroId)
    }
    if (!parceiroId) return c.json({ ok: false, erro: 'postoId obrigatório' }, 400)

    const parceiro = await kvGetParceiro(kv, parceiroId, r2) as Record<string, unknown> | null
    const nomePosto = parceiro?.nomePosto || 'Posto Parceiro'

    // Montar payload da notificação
    const tiposNotif: Record<string, { titulo: string; corpo: string }> = {
      'proximidade': {
        titulo: titulo || `⛽ Desconto Exclusivo perto de você!`,
        corpo: mensagem || `${nomePosto} tem ${combustivel || 'combustível'} a R$ ${preco?.toFixed(2) || '...'} para assinantes. Aproveite!`
      },
      'preco_caiu': {
        titulo: titulo || `📉 O preço caiu!`,
        corpo: mensagem || `${nomePosto} baixou o preço de ${combustivel || 'combustível'} para R$ ${preco?.toFixed(2) || '...'}. Toque para ver a rota!`
      },
      'novo_posto': {
        titulo: titulo || `🎉 Novo Posto Premium na área!`,
        corpo: mensagem || `${nomePosto} agora faz parte do RotaPosto. Economize até R$ 0,15 por litro!`
      },
      'manual': {
        titulo: titulo || `📢 ${nomePosto}`,
        corpo: mensagem || 'Temos uma novidade para você!'
      }
    }

    const notif = tiposNotif[tipo] || tiposNotif['manual']

    // Log da notificação (em produção: integrar Firebase FCM ou OneSignal)
    const logKey = `notif:${parceiroId}`
    let logs: Record<string, unknown>[] = []
    try { logs = JSON.parse(await kv?.get(logKey) || '[]') } catch {}
    logs.push({
      tipo, titulo: notif.titulo, corpo: notif.corpo,
      raioKm: raioKm || 1, combustivel, preco,
      enviadoEm: new Date().toISOString(),
      estimativaAlcance: Math.floor(50 + Math.random() * 200) // Simulado
    })
    if (kv) await kv.put(logKey, JSON.stringify(logs.slice(-50)), { expirationTtl: 2592000 })

    return c.json({
      ok: true,
      mensagem: 'Notificação registrada para envio!',
      notificacao: notif,
      tipo,
      estimativaAlcance: logs[logs.length - 1]?.estimativaAlcance,
      obs: 'Integração FCM/OneSignal ativa em produção com plano Parceiro Premium ou superior.'
    })
  } catch (e) {
    console.error('[parceiros/notificacoes]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── GET /api/parceiros/promocoes ─────────────────────────────────────────────
app.get('/api/parceiros/promocoes', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || ''
    let postoId = c.req.query('postoId') || ''

    if (!postoId && token && kv) {
      const sess = await kvGetParceiro(kv, `sess_${token}`, r2) as Record<string, unknown> | null
      if (sess && (sess.exp as number) > Date.now()) postoId = String(sess.parceiroId)
    }
    if (!postoId) return c.json({ ok: false, erro: 'postoId obrigatório' }, 400)

    let promos: unknown[] = []
    const promosData = await r2Get(r2, `promos:${postoId}`)
    if (Array.isArray(promosData)) promos = promosData
    else { try { promos = JSON.parse(await kv?.get(`promos:${postoId}`) || '[]') } catch {} }

    // Filtrar expiradas
    const hoje = new Date().toISOString().slice(0, 10)
    const ativas = promos.filter((p: unknown) => {
      const pObj = p as Record<string, string>
      return !pObj.validade || pObj.validade >= hoje
    })

    return c.json({ ok: true, promocoes: ativas })
  } catch (e) {
    console.error('[parceiros/promocoes GET]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── POST /api/parceiros/promocoes ────────────────────────────────────────────
// Adiciona uma promoção ou substitui o array inteiro (cuando body.promocoes presente)
app.post('/api/parceiros/promocoes', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const body = await c.req.json() as Record<string, unknown>
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || ''
    let postoId = (body.postoId as string) || ''

    if (!postoId && token && kv) {
      const sess = await kvGetParceiro(kv, `sess_${token}`, r2) as Record<string, unknown> | null
      if (sess && (sess.exp as number) > Date.now()) postoId = String(sess.parceiroId)
    }
    if (!postoId) return c.json({ ok: false, erro: 'postoId obrigatório' }, 400)

    let promos: unknown[] = []
    const promosExist = await r2Get(r2, `promos:${postoId}`)
    if (Array.isArray(promosExist)) promos = promosExist
    else { try { promos = JSON.parse(await kv?.get(`promos:${postoId}`) || '[]') } catch {} }

    if (body.promocoes !== undefined) {
      // Substituição completa do array (usado ao excluir)
      promos = body.promocoes as unknown[]
    } else if (body.promocao) {
      // Adicionar nova promoção no início
      promos = [body.promocao, ...promos]
      // Limitar a 20 promoções
      if (promos.length > 20) promos = promos.slice(0, 20)
    }

    // Salvar no R2 (persistência real) e KV como fallback
    await r2Put(r2, `promos:${postoId}`, promos)
    if (kv) await kv.put(`promos:${postoId}`, JSON.stringify(promos), { expirationTtl: 7776000 }).catch(() => {})

    return c.json({ ok: true, promocoes: promos })
  } catch (e) {
    console.error('[parceiros/promocoes POST]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── POST /api/parceiros/cupons/criar ─────────────────────────────────────────
// Chamado pelo POSTO para criar um cupom de desconto para clientes usarem
app.post('/api/parceiros/cupons/criar', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
    const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined

    // Verificar autenticação
    const auth = c.req.header('Authorization') || ''
    const token = auth.replace('Bearer ', '').trim()
    if (!token) return c.json({ ok: false, erro: 'Não autorizado.' }, 401)

    const body = await c.req.json() as Record<string, unknown>
    const { postoId, combustivel, desconto, validadeMinutos, usos, obs } = body as {
      postoId: string, combustivel: string, desconto: number,
      validadeMinutos: number, usos: number, obs: string
    }

    if (!postoId) return c.json({ ok: false, erro: 'postoId obrigatório.' }, 400)
    if (!desconto || desconto <= 0 || desconto > 5) return c.json({ ok: false, erro: 'Desconto inválido (0,01 a 5,00).' }, 400)

    const validMin  = Math.min(Math.max(Number(validadeMinutos) || 1440, 5), 10080)
    const usosTotal = Math.min(Math.max(Number(usos) || 1, 1), 999)

    // Gerar código de 6 dígitos único
    const codigo = String(Math.floor(100000 + Math.random() * 900000))
    const agora = Date.now()
    const expiraEm = agora + validMin * 60 * 1000

    // Texto legível da validade
    const validadeTexto = validMin < 60 ? validMin + ' min'
      : validMin < 1440 ? Math.round(validMin/60) + 'h'
      : validMin < 10080 ? Math.round(validMin/1440) + (Math.round(validMin/1440) === 1 ? ' dia' : ' dias')
      : Math.round(validMin/10080) + ' semana(s)'

    const cupom = {
      codigo,
      postoId,
      tipo: 'POSTO',   // criado pelo posto (diferente de 'USUARIO' criado pelo consumidor)
      combustivel: combustivel || 'Gasolina Comum',
      desconto: Number(desconto),
      usos: usosTotal,
      usosRestantes: usosTotal,
      obs: obs || '',
      status: 'ATIVO',
      criadoEm: agora,
      expiraEm,
      validadeTexto
    }

    // Salvar no KV com TTL em segundos
    const ttlSeg = validMin * 60 + 300 // margem de 5 min extra
    await kvSetCupom(kv, codigo, cupom, ttlSeg, r2)

    // Também indexar na lista de cupons do posto
    const listaKey = `posto_cupons:${postoId}`
    let lista: unknown[] = []
    try {
      const listaRaw = kv ? await kv.get(listaKey) : null
      if (listaRaw) lista = JSON.parse(listaRaw)
    } catch {}
    // Manter só os últimos 50 cupons
    lista = [cupom, ...lista].slice(0, 50)
    if (kv) await kv.put(listaKey, JSON.stringify(lista), { expirationTtl: 86400 * 7 })

    return c.json({ ok: true, codigo, validadeTexto, expiraEm })
  } catch (e) {
    console.error('[parceiros/cupons/criar]', e)
    return c.json({ ok: false, erro: 'Erro interno.' }, 500)
  }
})

// ── GET /api/parceiros/cupons/posto ──────────────────────────────────────────
// Lista cupons criados pelo posto
app.get('/api/parceiros/cupons/posto', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
    const postoId = c.req.query('postoId') || ''
    if (!postoId) return c.json({ cupons: [] })

    const listaKey = `posto_cupons:${postoId}`
    const listaRaw = kv ? await kv.get(listaKey) : null
    const lista = listaRaw ? JSON.parse(listaRaw) as Record<string,unknown>[] : []

    // Marcar expirados
    const agora = Date.now()
    const atualizados = lista.map(c => ({
      ...c,
      status: Number((c as Record<string,unknown>).expiraEm) < agora ? 'EXPIRADO'
            : Number((c as Record<string,unknown>).usosRestantes) <= 0 ? 'ESGOTADO'
            : (c as Record<string,unknown>).status || 'ATIVO'
    }))

    return c.json({ cupons: atualizados })
  } catch (e) {
    console.error('[parceiros/cupons/posto]', e)
    return c.json({ cupons: [] })
  }
})

// ── POST /api/parceiros/cupons/gerar ─────────────────────────────────────────
// Chamado pelo app consumidor (usuário Premium) para gerar cupom
app.post('/api/parceiros/cupons/gerar', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const body = await c.req.json() as Record<string, string>
    const { uid, nomeUsuario, postoId, combustivel } = body

    if (!uid) return c.json({ ok: false, erro: 'uid obrigatório' }, 400)

    // Verificar se usuário Premium (consulta KV)
    const userKey = `user_sub:${uid}`
    const subData = kv ? await kv.get(userKey) : null
    // Em produção verificaria o status; aqui permitimos para demo
    // if (!subData) return c.json({ ok: false, erro: 'Apenas assinantes Premium podem gerar cupons.' }, 403)

    // Verificar se usuário já tem cupom ativo
    const cupomAtivoKey = `cupom_ativo:${uid}`
    const cupomAtivo = await kvGetCupom(kv, `ativo_${uid}`, r2)
    if (cupomAtivo && (cupomAtivo as Record<string, unknown>).status === 'GERADO') {
      return c.json({
        ok: false,
        erro: 'Você já tem um cupom ativo. Use ou aguarde ele expirar.',
        codigo: (cupomAtivo as Record<string, string>).codigo
      }, 409)
    }

    const codigo = gerarCodigo6()
    const hash = `RP-${(postoId || 'POSTO').slice(0, 8).toUpperCase()}-USR${uid.slice(-4).toUpperCase()}-${codigo}`
    const agora = Date.now()
    const expiracaoMs = agora + 300000 // 5 minutos

    const cupom = {
      codigo, hash, uid,
      nomeUsuario: nomeUsuario || 'Assinante Premium',
      postoId: postoId || '',
      combustivel: combustivel || 'Gasolina Comum',
      status: 'GERADO',
      criadoEm: agora,
      expiraEm: expiracaoMs
    }

    // TTL 600s (10min) para dar margem extra além dos 5min
    await kvSetCupom(kv, codigo, cupom, 600, r2)
    await kvSetCupom(kv, `ativo_${uid}`, cupom, 600, r2)

    // Incrementar métrica de cupons gerados do posto
    if (postoId && kv) {
      const mesAtual = new Date().toISOString().slice(0, 7)
      const metKey = `metricas:${postoId}:${mesAtual}`
      let met = { cliques: 0, cupons: 0, impressoes: 0, conversao: 0 }
      try { met = { ...met, ...JSON.parse(await kv.get(metKey) || '{}') } } catch {}
      met.cliques++
      await kv.put(metKey, JSON.stringify(met), { expirationTtl: 2678400 })
    }

    return c.json({
      ok: true,
      codigo,
      hash,
      combustivel: cupom.combustivel,
      expiracaoMs,
      expiracaoSegundos: 300,
      qrData: hash // Dados para gerar QR Code no frontend
    })
  } catch (e) {
    console.error('[parceiros/cupons/gerar]', e)
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── GET /api/parceiros/config ─────────────────────────────────────────────────
// Buscar configurações do posto (pino, cupons, etc.)
app.get('/api/parceiros/config', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const postoId = c.req.query('postoId') || ''
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.query('token') || ''

    let parceiroId = postoId
    if (!parceiroId && token) {
      const sess = await kvGetParceiro(kv, `sess_${token}`, r2) as Record<string, unknown> | null
      if (sess && (sess.exp as number) > Date.now()) parceiroId = String(sess.parceiroId)
    }
    if (!parceiroId) return c.json({ ok: false, erro: 'postoId obrigatório' }, 400)

    const parceiro = await kvGetParceiro(kv, parceiroId, r2) as Record<string, unknown> | null
    if (!parceiro) return c.json({ ok: false, erro: 'Posto não encontrado' }, 404)

    return c.json({
      ok: true,
      config: {
        pinDourado: parceiro.pinDourado || false,
        seloVerificado: parceiro.seloVerificado || false,
        cuponsAtivos: parceiro.cuponsAtivos || false,
        notificacoesAtivas: parceiro.notificacoesAtivas || false,
        topoLista: parceiro.topoLista || false,
        geofencingRaio: parceiro.geofencingRaio || 800,
        geofencingLimiteDiario: parceiro.geofencingLimiteDiario || 2,
        geofencingTexto: parceiro.geofencingTexto || '',
      }
    })
  } catch (e) {
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})

// ── POST /api/parceiros/config ────────────────────────────────────────────────
app.post('/api/parceiros/config', async (c) => {
  try {
    const kv = (c.env as Record<string, unknown>)?.ROTAPOSTO_KV as KVNamespace | undefined
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
    const body = await c.req.json() as Record<string, unknown>
    const { postoId, token, config } = body as { postoId: string; token: string; config: Record<string, unknown> }

    let parceiroId = postoId
    if (!parceiroId && token) {
      const sess = await kvGetParceiro(kv, `sess_${token}`, r2) as Record<string, unknown> | null
      if (sess && (sess.exp as number) > Date.now()) parceiroId = String(sess.parceiroId)
    }
    if (!parceiroId) return c.json({ ok: false, erro: 'postoId obrigatório' }, 400)

    const parceiro = await kvGetParceiro(kv, parceiroId, r2) as Record<string, unknown> | null
    if (!parceiro) return c.json({ ok: false, erro: 'Posto não encontrado' }, 404)

    const atualizado = { ...parceiro, ...config, id: parceiroId }
    await kvSetParceiro(kv, parceiroId, atualizado, undefined, r2)

    return c.json({ ok: true, mensagem: 'Configurações salvas!' })
  } catch (e) {
    return c.json({ ok: false, erro: 'Erro interno' }, 500)
  }
})


// ─── Download APK direto ──────────────────────────────────────────────────────
app.get('/download/apk', async (c) => {
  const r2 = (c.env as Record<string, unknown>)?.ROTAPOSTO_R2 as R2Bucket | undefined
  if (!r2) return c.text('R2 indisponível', 503)
  const obj = await r2.get('apk/RotaPosto-latest.apk')
  if (!obj) return c.text('APK não encontrado', 404)
  const headers = new Headers()
  headers.set('Content-Type', 'application/vnd.android.package-archive')
  headers.set('Content-Disposition', 'attachment; filename="RotaPosto-v1.1.3.apk"')
  headers.set('Cache-Control', 'no-cache')
  return new Response(obj.body, { headers })
})

// ─── Export: fetch handler + scheduled (cron) ─────────────────────────────────
export default {
  fetch: app.fetch,
  async scheduled(event: { cron: string; scheduledTime: number }, env: Record<string, unknown>, ctx: { waitUntil: (p: Promise<unknown>) => void }): Promise<void> {
    const kv = (env?.ROTAPOSTO_KV as KVNamespace | undefined)
    const r2 = (env?.ROTAPOSTO_R2 as R2Bucket | undefined)
    ctx.waitUntil(syncAnpScheduled(kv))
  }
}
