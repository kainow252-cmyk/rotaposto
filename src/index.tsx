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
  [key: string]: unknown
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

// ─── Headers COOP/COEP: necessário para signInWithPopup do Firebase funcionar ─
// sem isso, o Cloudflare Pages aplica COOP: same-origin que bloqueia popups OAuth
app.use('*', async (c, next) => {
  await next()
  c.res.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  c.res.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none')
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
      const raioGoogle = Math.min(raio * 1000, 20000) // máx 20km para Google
      const raioOSM = Math.min(raio * 1000, 8000)

      const [anpRes, googleRes, osmRes] = await Promise.allSettled([
        buscarPostosANP(uf, municipio, 1, kv),
        buscarPostosGooglePlaces(lat, lng, raioGoogle, googleKey),
        buscarPostosOSM(lat, lng, raioOSM)
      ])

      const anp = anpRes.status === 'fulfilled' ? anpRes.value : []
      const google = googleRes.status === 'fulfilled' ? googleRes.value : []
      const osm = osmRes.status === 'fulfilled' ? osmRes.value : []

      console.log(`[Postos] ANP=${anp.length} Google=${google.length} OSM=${osm.length} → ${uf}/${municipio}`)

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
      const osmFallback = await buscarPostosOSM(lat, lng, Math.min(raio * 1000, 5000))
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
          fonte
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
    nome: r.nome,
    lat: r.lat,
    lng: r.lng,
    cidade: r.cidade,
    estado: r.estado
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
    // Se pendente, retornar QR para o usuário pagar
    qrCode: assinatura.status === 'PENDING' ? assinatura.qrCode : null,
    brcode: assinatura.status === 'PENDING' ? assinatura.brcode : null,
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
  return c.json({ pago, txid })
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
      // Buscar userId pelo subscriptionId
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
      const agora = Date.now()
      assin.status = 'ACTIVE'
      assin.ativadaEm = assin.ativadaEm || agora
      assin.pagamentos = (assin.pagamentos || 0) + 1
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
      // Cobrança expirou sem pagamento — marcar como EXPIRED no KV
      const userId = await kvGetUserBySubId(kv, subscriptionId) ||
                     await kvGetUserBySubId(kv, correlationID)
      if (userId) {
        const assin = await kvGetAssinatura(kv, userId)
        if (assin && assin.status === 'PENDING') {
          assin.status = 'EXPIRED'
          await kvSetAssinatura(kv, assin)
          console.log('[Woovi] Cobrança EXPIRADA para:', userId)
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

// ─── API: Pagamento via cartão (MercadoPago) ─────────────────────────────────
app.post('/api/pagamento/assinar', async (c) => {
  try {
    const body = await c.req.json() as any
    const { plano, nome, email, cpf } = body

    if (!nome || !email || !cpf) {
      return c.json({ sucesso: false, mensagem: 'Dados incompletos' }, 400)
    }

    const MP_ACCESS_TOKEN = (c.env as any)?.MP_ACCESS_TOKEN || ''
    const valores: Record<string, number> = { premium: 9.90, anual: 89.00 }
    const valor = valores[plano] || 9.90

    if (!MP_ACCESS_TOKEN) {
      return c.json({
        sucesso: true,
        mensagem: 'Modo demo – use PIX para assinar de verdade!',
        recomendacao: 'PIX e mais facil e rapido. Use /api/pix/assinar',
        demo: true
      })
    }

    // Criar preferencia MP
    const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{ id: `rp-${plano}`, title: PLANOS[plano]?.nome || 'RotaPosto Premium',
          quantity: 1, unit_price: valor, currency_id: 'BRL' }],
        payer: { name: nome, email },
        back_urls: {
          success: 'https://rotaposto.com.br/app',
          failure: 'https://rotaposto.com.br/app',
          pending: 'https://rotaposto.com.br/app'
        },
        external_reference: `rp-${plano}-${Date.now()}`
      })
    })
    const prefData = await prefRes.json() as any

    if (prefData?.id) {
      return c.json({ sucesso: true, preferencia_id: prefData.id, checkout_url: prefData.init_point })
    }
    return c.json({ sucesso: false, mensagem: 'Erro ao criar preferencia MP' }, 500)
  } catch {
    return c.json({ sucesso: false, mensagem: 'Erro interno' }, 500)
  }
})

app.post('/api/pagamento/webhook', async (c) => {
  const body = await c.req.json() as any
  console.log('MP Webhook:', JSON.stringify(body))
  return c.json({ status: 'ok' })
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
// Body: { uid, deviceId }
// Retorna: { sessionToken }
app.post('/api/auth/session', async (c) => {
  const kv = getKV(c.env as any)
  if (!kv) return c.json({ error: 'KV indisponível' }, 503)

  const body = await c.req.json() as any
  const { uid, deviceId } = body
  if (!uid || !deviceId) return c.json({ error: 'uid e deviceId são obrigatórios' }, 400)

  // Gerar token único para esta sessão
  const sessionToken = crypto.randomUUID()
  const sessionData = {
    token: sessionToken,
    deviceId,
    uid,
    createdAt: Date.now()
  }

  // Armazenar no KV com TTL de 30 dias
  // Chave: session:{uid} — sobrescreve qualquer sessão anterior
  await kv.put(`session:${uid}`, JSON.stringify(sessionData), { expirationTtl: 60 * 60 * 24 * 30 })

  return c.json({ sessionToken, expiresIn: 60 * 60 * 24 * 30 })
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

// ─── Frontend Principal ───────────────────────────────────────────────────────
// Rota raiz → onboarding (splash + login) como app nativo
app.get('/', (c) => {
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
  const firebaseScripts = getFirebaseAuthScripts()
  return c.html(getAppHTML(firebaseScripts))
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
    .container{max-width:800px;margin:0 auto;padding:40px 24px}
    h1{font-size:2rem;font-weight:700;color:#1a1a2e;margin-bottom:8px}
    .updated{color:#666;font-size:.9rem;margin-bottom:40px}
    h2{font-size:1.2rem;font-weight:600;color:#1a1a2e;margin:32px 0 12px}
    p{color:#444;margin-bottom:12px}
    ul{padding-left:20px;color:#444;margin-bottom:12px}
    ul li{margin-bottom:6px}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    .header{background:#1a1a2e;padding:16px 24px;display:flex;align-items:center;gap:12px}
    .header a{color:#fff;font-weight:600;font-size:1.1rem;text-decoration:none}
    .header span{color:#f59e0b;font-size:1.3rem}
  </style>
</head>
<body>
  <div class="header">
    <span>⛽</span>
    <a href="/">RotaPosto</a>
  </div>
  <div class="container">
    <h1>Política de Privacidade</h1>
    <p class="updated">Última atualização: junho de 2025</p>

    <p>O <strong>RotaPosto</strong> respeita a sua privacidade. Esta política descreve como coletamos, usamos e protegemos suas informações ao utilizar nosso aplicativo.</p>

    <h2>1. Informações que Coletamos</h2>
    <p>Quando você usa o RotaPosto, podemos coletar:</p>
    <ul>
      <li><strong>Dados de conta:</strong> nome, e-mail e foto de perfil (via login com Google ou Facebook)</li>
      <li><strong>Localização:</strong> sua posição geográfica para encontrar postos próximos (apenas durante o uso)</li>
      <li><strong>Veículo:</strong> tipo de veículo, consumo e tanque para calcular economia</li>
      <li><strong>Uso do app:</strong> postos visitados, buscas realizadas e contribuições de preço</li>
    </ul>

    <h2>2. Como Usamos suas Informações</h2>
    <ul>
      <li>Exibir postos de combustível próximos à sua localização</li>
      <li>Calcular economia e menor preço de abastecimento</li>
      <li>Personalizar sua experiência no aplicativo</li>
      <li>Melhorar a precisão dos dados de preços</li>
    </ul>

    <h2>3. Compartilhamento de Dados</h2>
    <p>Não vendemos, alugamos nem compartilhamos seus dados pessoais com terceiros, exceto:</p>
    <ul>
      <li><strong>Google Firebase:</strong> autenticação e armazenamento seguro de sessão</li>
      <li><strong>ANP (Agência Nacional do Petróleo):</strong> dados públicos de preços utilizados no app</li>
      <li>Quando exigido por lei ou ordem judicial</li>
    </ul>

    <h2>4. Login com Redes Sociais</h2>
    <p>O RotaPosto permite login via <strong>Google</strong> e <strong>Facebook</strong>. Ao usar esses serviços, você concorda com as políticas de privacidade deles. Coletamos apenas nome, e-mail e foto de perfil.</p>

    <h2>5. Segurança</h2>
    <p>Utilizamos criptografia e boas práticas de segurança para proteger seus dados. Sessões são gerenciadas com tokens únicos por dispositivo.</p>

    <h2>6. Seus Direitos</h2>
    <ul>
      <li>Acessar, corrigir ou excluir seus dados pessoais</li>
      <li>Solicitar portabilidade dos dados</li>
      <li>Revogar consentimento a qualquer momento</li>
    </ul>
    <p>Para exercer esses direitos, entre em contato: <a href="mailto:contato@rotaposto.com.br">contato@rotaposto.com.br</a></p>

    <h2>7. Cookies e Armazenamento Local</h2>
    <p>Usamos <em>localStorage</em> e cookies para manter sua sessão ativa e salvar preferências do app. Nenhum dado de rastreamento publicitário é utilizado.</p>

    <h2>8. Menores de Idade</h2>
    <p>O RotaPosto não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de menores.</p>

    <h2>9. Alterações nesta Política</h2>
    <p>Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas dentro do aplicativo.</p>

    <h2>10. Contato</h2>
    <p>Em caso de dúvidas sobre esta política de privacidade:<br/>
    📧 <a href="mailto:contato@rotaposto.com.br">contato@rotaposto.com.br</a><br/>
    🌐 <a href="https://rotaposto.com.br">rotaposto.com.br</a></p>
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
  <meta name="theme-color" content="#0D1B2A"/>
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
  <link rel="manifest" href="/manifest.json"/>
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
function atualizarConsumo(val?) {
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

  navigator.serviceWorker.register('/sw.js')
    .then(reg => {
      _swRegistration = reg;
      console.log('[SW] Registrado ok:', reg.scope);

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
              console.log('[SW] Novo SW instalado — aplicando auto-update...');
              novoSW.postMessage({ type: 'SKIP_WAITING' });
            } else {
              // Primeira instalacao
              console.log('[SW] SW instalado pela primeira vez');
            }
          }
        });
      });
    })
    .catch(err => console.warn('[SW] Falha ao registrar:', err));

  // Escutar mensagem SW_UPDATED (enviada pelo SW apos ativar)
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'SW_UPDATED') {
      console.log('[SW] Update recebido:', event.data.version);
      // Recarregar silenciosamente para aplicar novo SW
      window.location.reload();
    }
  });

  // Detectar quando o controlador muda (SW novo tomou conta)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Controller mudou — recarregando');
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
    console.log('[PWA] App instalado — modo standalone ativo');
    // Forcar verificacao de update ao abrir o PWA
    if (_swRegistration) {
      _swRegistration.update().then(() => {
        console.log('[PWA] Verificacao de update concluida');
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

  // Escutar o evento beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _pwaPrompt = e;
    // Mostrar banner apos 4 segundos (nao intrusivo)
    setTimeout(() => {
      if (!_isPWAInstalada()) banner.classList.add('visible');
    }, 4000);
  });

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
      console.log('[PWA] Resultado:', outcome);
      if (outcome === 'accepted') {
        mostrarToast('✅ RotaPosto instalado com sucesso!');
        // Guardar que ja instalou
        localStorage.setItem('rp_pwa_installed', '1');
      }
      _pwaPrompt = null;
    });
  }

  // Fechar banner ao clicar fora
  banner.addEventListener('click', (e) => {
    if (e.target === banner) banner.classList.remove('visible');
  });

  // Detectar instalacao concluida
  window.addEventListener('appinstalled', () => {
    banner.classList.remove('visible');
    banner.style.display = 'none';
    mostrarToast('🎉 RotaPosto instalado!');
    _pwaPrompt = null;
    localStorage.setItem('rp_pwa_installed', '1');
  });

  // iOS: mostrar instrucao manual apos 6s se nao houver beforeinstallprompt
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window['MSStream'];
  const jaInstalou = localStorage.getItem('rp_pwa_installed') === '1';
  if (isIOS && !jaInstalado && !jaInstalou) {
    setTimeout(() => {
      banner.classList.add('visible');
      const btnText = document.getElementById('btn-pwa-install');
      if (btnText) {
        btnText.textContent = 'Como instalar';
        btnText.onclick = () => {
          mostrarToast('📱 Toque em Compartilhar → "Adicionar a Tela de Inicio"');
          banner.classList.remove('visible');
        };
      }
    }, 6000);
  }
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

// Verificar status de assinatura do usuário
async function verificarStatusAssinatura(userId) {
  try {
    const res = await fetch(\`/api/assinatura/status/\${userId}\`);
    const data = await res.json();
    _assinaturaStatus = data.status || 'FREE';
    _assinaturaTxid = data.txidPendente || null;
    _assinaturaQrCode = data.qrCodePendente || null;
    _assinaturaBrcode = data.brcodePendente || null;
    return data;
  } catch {
    _assinaturaStatus = 'FREE';
    return { status: 'FREE', ativa: false };
  }
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
        }

        // Verificar status de assinatura em background
        verificarStatusAssinatura(user.uid).then(assin => {
          // Se expirada ou pendente há muito tempo, mostrar aviso (não bloquear totalmente)
          // O app é gratuito — premium é opcional; não bloqueamos o acesso básico
          if (assin.status === 'PENDING' && _assinaturaQrCode) {
            // Mostrar badge pendente no avatar
            _mostrarBadgePendente();
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
    console.log('[Auth] Firebase Auth configurado ok');
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
    console.log('[Auth] Login Google OK:', result.user.email);
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
    console.log('[Auth] Login Facebook OK:', result.user.email);
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
    console.log('[Auth] Login email OK');
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
    console.log('[Auth] Conta criada:', result.user.uid);
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
  const nome = usuario?.displayName || 'Usuário RotaPosto';
  const email = usuario?.email || 'usuario@rotaposto.com.br';
  const cpf = '';  // Pode ser pedido em formulário futuro

  try {
    const res = await fetch('/api/pix/assinar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, cpf, plano })
    });
    const data = await res.json();

    if (data.error) {
      content.innerHTML = \`
        <div style="text-align:center;padding:24px 16px">
          <div style="font-size:48px;margin-bottom:12px">❌</div>
          <p style="font-size:14px;font-weight:700;color:#FF6D00">Erro ao gerar cobrança</p>
          <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:8px 0">\${data.error}</p>
          <button onclick="fecharPixModal(null,true)" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:10px 24px;border-radius:10px;cursor:pointer;margin-top:12px">Fechar</button>
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
            <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:10px 12px;font-size:11px;font-family:monospace;color:rgba(255,255,255,0.7);word-break:break-all;text-align:left;max-height:80px;overflow:hidden">
              \${data.brcode.substring(0, 120)}...
            </div>
            <button onclick="copiarCodigo('\${data.brcode}')" style="background:rgba(255,255,255,0.1);border:none;color:white;font-weight:700;padding:10px 20px;border-radius:10px;cursor:pointer;margin-top:10px;font-size:13px">
              <i class="fas fa-copy"></i> Copiar código PIX
            </button>
          </div>
        \` : ''}

        \${data.txid ? \`
          <div style="margin-top:12px;padding:10px;background:rgba(0,200,83,0.1);border-radius:10px;border:1px solid rgba(0,200,83,0.2)">
            <p style="font-size:11px;color:var(--verde);margin:0">✅ Após o pagamento, sua conta é ativada automaticamente</p>
          </div>
        \` : ''}

        <div style="display:flex;gap:10px;margin-top:16px">
          <button onclick="fecharPixModal(null,true)" style="flex:1;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.6);font-weight:600;padding:12px;border-radius:12px;cursor:pointer">
            Agora não
          </button>
          \${data.txid ? \`
          <button onclick="verificarPagamentoPIX('\${data.txid}')" style="flex:1;background:var(--laranja);border:none;color:white;font-weight:800;padding:12px;border-radius:12px;cursor:pointer">
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
app.get('/admin', (c) => {
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
    .sidebar{position:fixed;left:0;top:0;bottom:0;width:240px;background:#0A1520;border-right:1px solid rgba(255,255,255,0.08);padding:24px 0;display:flex;flex-direction:column}
    .sidebar-logo{padding:0 20px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}
    .sidebar-logo h1{font-size:22px;font-weight:900;color:#fff}.sidebar-logo h1 span{color:#FF6D00}
    .sidebar-logo p{font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;margin-top:2px}
    .nav-item{display:flex;align-items:center;gap:10px;padding:12px 20px;color:rgba(255,255,255,0.5);font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;border-left:3px solid transparent}
    .nav-item:hover{color:#fff;background:rgba(255,255,255,0.06)}
    .nav-item.active{color:#FF6D00;background:rgba(255,109,0,0.10);border-left-color:#FF6D00}
    .nav-item i{width:18px;text-align:center;font-size:14px}
    .main{margin-left:240px;padding:28px 32px;min-height:100vh}
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
    .section-header{padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between}
    .section-header h3{font-size:14px;font-weight:800;color:#fff}
    .section-body{padding:22px}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;font-size:10px;font-weight:800;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.8px;padding:0 0 12px;border-bottom:1px solid rgba(255,255,255,0.07)}
    td{padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;color:rgba(255,255,255,0.85);font-weight:600;vertical-align:middle}
    tr:last-child td{border-bottom:none}
    .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:800}
    .badge-anp{background:rgba(21,101,192,0.2);color:#42A5F5}
    .badge-osm{background:rgba(255,109,0,0.15);color:#FF8F00}
    .badge-collab{background:rgba(0,200,83,0.15);color:#00C853}
    .badge-premium{background:rgba(255,214,0,0.15);color:#FFD600}
    .badge-free{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4)}
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
    .fonte-bar{display:flex;height:8px;border-radius:100px;overflow:hidden;margin-top:8px;gap:2px}
    .fonte-bar-anp{background:#1565C0;flex:0 0 var(--pct)}
    .fonte-bar-osm{background:#FF6D00;flex:0 0 var(--pct)}
    .fonte-bar-collab{background:#00C853;flex:0 0 var(--pct)}
    #precos-lista{max-height:320px;overflow-y:auto}
  </style>
</head>
<body>
<div class="sidebar">
  <div class="sidebar-logo">
    <h1>Rota<span>Posto</span></h1>
    <p>Painel Administrativo</p>
  </div>
  <nav style="margin-top:16px;flex:1">
    <div class="nav-item active" onclick="showSection('dashboard')"><i class="fas fa-tachometer-alt"></i>Dashboard</div>
    <div class="nav-item" onclick="showSection('postos')"><i class="fas fa-gas-pump"></i>Postos</div>
    <div class="nav-item" onclick="showSection('precos')"><i class="fas fa-tag"></i>Preços Reportados</div>
    <div class="nav-item" onclick="showSection('usuarios')"><i class="fas fa-users"></i>Usuários</div>
    <div class="nav-item" onclick="showSection('mapa')"><i class="fas fa-map"></i>Mapa ao Vivo</div>
    <div class="nav-item" onclick="showSection('receita')"><i class="fas fa-dollar-sign"></i>Receita</div>
  </nav>
  <div style="padding:16px 20px;border-top:1px solid rgba(255,255,255,0.08)">
    <div style="font-size:11px;color:rgba(255,255,255,0.25);font-weight:600;">RotaPosto v2.0</div>
    <div style="font-size:10px;color:rgba(255,255,255,0.15);margin-top:2px" id="last-update">Atualizando...</div>
  </div>
</div>

<main class="main">
  <!-- Dashboard -->
  <section id="section-dashboard">
    <div class="page-header">
      <h2>📊 Dashboard</h2>
      <div class="badge-live">Sistema ao vivo</div>
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
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(255,109,0,0.15);color:#FF6D00"><i class="fas fa-comments"></i></div>
        <div class="kpi-val" id="kpi-reportes">–</div>
        <div class="kpi-label">Preços Colaborativos</div>
        <div class="kpi-delta up" id="kpi-reportes-24h">Últimas 24h</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(255,214,0,0.15);color:#FFD600"><i class="fas fa-crown"></i></div>
        <div class="kpi-val">–</div>
        <div class="kpi-label">Assinantes Premium</div>
        <div class="kpi-delta down">🔒 Firebase Auth</div>
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

  <!-- Postos -->
  <section id="section-postos" style="display:none">
    <div class="page-header">
      <h2>⛽ Postos Encontrados</h2>
      <button class="btn-refresh" onclick="carregarPostos()"><i class="fas fa-sync-alt"></i> Atualizar</button>
    </div>
    <div class="section-card">
      <div class="section-header">
        <h3>Lista de Postos (São Paulo)</h3>
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

  <!-- Preços Reportados -->
  <section id="section-precos" style="display:none">
    <div class="page-header">
      <h2>🎯 Colabore & Ganhe</h2>
      <button class="btn-refresh" onclick="carregarReportes()"><i class="fas fa-sync-alt"></i> Atualizar</button>
    </div>

    <!-- Banner gamificacao -->
    <div style="background:linear-gradient(135deg,#1a2744,#0D1B2A);border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(255,193,7,0.3)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="font-size:28px">🎰</div>
        <div>
          <div style="font-size:14px;font-weight:900;color:white">Sorteio Mensal RotaPosto!</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px">Reporte precos nos postos e concorra a premios!</div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <div style="flex:1;background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.25);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:11px;color:#FFC107;font-weight:800">📊 Novo reporte</div>
          <div style="font-size:12px;color:white;margin-top:4px">+10 pts + 1 numero</div>
        </div>
        <div style="flex:1;background:rgba(0,200,83,0.1);border:1px solid rgba(0,200,83,0.25);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:11px;color:#00C853;font-weight:800">✅ Confirmacao</div>
          <div style="font-size:12px;color:white;margin-top:4px">+5 pontos</div>
        </div>
      </div>
    </div>

    <!-- Ranking de contribuidores -->
    <div class="section-card" style="margin-bottom:16px">
      <div class="section-header">
        <h3><i class="fas fa-trophy" style="color:#FFC107;margin-right:6px"></i> Ranking de Colaboradores</h3>
      </div>
      <div class="section-body" style="padding:12px" id="ranking-lista">
        <div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:13px">Carregando ranking...</div>
      </div>
    </div>

    <!-- Lista de reportes -->
    <div class="section-card">
      <div class="section-header">
        <h3>Reportes de Preco (ultimas 24h)</h3>
      </div>
      <div class="section-body" style="padding:0" id="precos-lista">
        <table>
          <thead><tr><th>Posto</th><th>Combustivel</th><th>Preco</th><th>Conf.</th><th>Ha</th></tr></thead>
          <tbody id="reportes-tbody"><tr><td colspan="5" style="text-align:center;padding:32px;color:rgba(255,255,255,0.3)">Nenhum reporte ainda</td></tr></tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Usuários (placeholder) -->
  <section id="section-usuarios" style="display:none">
    <div class="page-header"><h2>👥 Usuários</h2></div>
    <div class="section-card">
      <div class="section-body" style="text-align:center;padding:60px">
        <i class="fas fa-lock" style="font-size:48px;color:rgba(255,255,255,0.15);display:block;margin-bottom:16px"></i>
        <h3 style="font-size:18px;font-weight:800;color:rgba(255,255,255,0.6)">Requer Firebase Auth</h3>
        <p style="color:rgba(255,255,255,0.3);font-size:13px;margin-top:8px">Integração com Firebase Authentication em desenvolvimento</p>
      </div>
    </div>
  </section>

  <!-- Mapa ao Vivo -->
  <section id="section-mapa" style="display:none">
    <div class="page-header"><h2>🗺️ Mapa ao Vivo</h2></div>
    <div class="section-card">
      <div class="section-body" style="padding:0">
        <div id="admin-map" style="width:100%;height:500px;border-radius:0 0 16px 16px"></div>
      </div>
    </div>
  </section>

  <!-- Receita -->
  <section id="section-receita" style="display:none">
    <div class="page-header"><h2>💰 Receita</h2></div>
    <div class="section-card">
      <div class="section-body" style="text-align:center;padding:60px">
        <i class="fas fa-credit-card" style="font-size:48px;color:rgba(255,255,255,0.15);display:block;margin-bottom:16px"></i>
        <h3 style="font-size:18px;font-weight:800;color:rgba(255,255,255,0.6)">Requer MercadoPago API</h3>
        <p style="color:rgba(255,255,255,0.3);font-size:13px;margin-top:8px">Configure MP_ACCESS_TOKEN para ver dados de assinaturas</p>
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

function showSection(name) {
  document.querySelectorAll('main section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + name).style.display = 'block';
  event.currentTarget.classList.add('active');
  currentSection = name;

  if (name === 'mapa') iniciarMapaAdmin();
  if (name === 'postos') carregarPostos();
  if (name === 'precos') carregarReportes();
  if (name === 'dashboard') carregarDashboard();
}

async function carregarDashboard() {
  try {
    const [postosRes, reportesRes] = await Promise.all([
      fetch('/api/postos?lat=-23.5505&lng=-46.6333&combustivel=gasolina&raio=15'),
      fetch('/api/precos/reportados')
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
    }

    document.getElementById('kpi-reportes').textContent = collab;
    document.getElementById('stat-anp').textContent = anp;
    document.getElementById('stat-osm').textContent = osm;
    document.getElementById('stat-collab').textContent = collab;

    const total = Math.max(anp + osm, 1);
    const pAnp = Math.round(anp / total * 100);
    const pOsm = Math.round(osm / total * 100);
    const pC = Math.max(0, 100 - pAnp - pOsm);
    const bar = document.getElementById('fonte-bar');
    bar.innerHTML = \`<div class="fonte-bar-anp" style="--pct:\${pAnp}%;flex:0 0 \${pAnp}%"></div>
      <div class="fonte-bar-osm" style="--pct:\${pOsm}%;flex:0 0 \${pOsm}%"></div>
      <div class="fonte-bar-collab" style="--pct:\${pC}%;flex:0 0 \${pC}%"></div>\`;

    // Gráfico de preços
    const labels = postos.slice(0, 8).map(p => p.bandeira.substring(0, 8));
    const data = postos.slice(0, 8).map(p => p.preco || p.precos?.gasolina || 0);
    renderChart(labels, data, 'Gasolina');

    document.getElementById('last-update').textContent = 'Atualizado: ' + new Date().toLocaleTimeString('pt-BR');
  } catch(e) {
    console.error('Erro dashboard:', e);
  }
}

function renderChart(labels, data, label) {
  const ctx = document.getElementById('chart-precos').getContext('2d');
  if (chartPrecos) chartPrecos.destroy();
  chartPrecos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'R$/L ' + label,
        data,
        backgroundColor: data.map((v, i) => i === 0 ? 'rgba(0,200,83,0.8)' : 'rgba(21,101,192,0.6)'),
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: false, min: 4,
          ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 },
            callback: v => 'R$ ' + v.toFixed(2) },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } },
          grid: { display: false } }
      }
    }
  });
}

async function toggleChart(combustivel, el) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const res = await fetch('/api/postos?lat=-23.5505&lng=-46.6333&combustivel=' + combustivel + '&raio=15');
  const data = await res.json();
  const postos = data.postos || [];
  const labels = postos.slice(0, 8).map(p => p.bandeira.substring(0, 8));
  const values = postos.slice(0, 8).map(p => p.preco || 0);
  renderChart(labels, values, combustivel.charAt(0).toUpperCase() + combustivel.slice(1));
}

async function carregarPostos() {
  const tbody = document.getElementById('postos-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:rgba(255,255,255,0.3)">Buscando postos na ANP e OSM...</td></tr>';
  try {
    const res = await fetch('/api/postos?lat=-23.5505&lng=-46.6333&combustivel=gasolina&raio=15');
    const data = await res.json();
    const postos = data.postos || [];
    document.getElementById('postos-count').textContent = postos.length + ' postos';

    tbody.innerHTML = postos.map(p => {
      const fonteBadge = p.fonte === 'anp' ? '<span class="badge badge-anp">ANP</span>' :
        p.fonte === 'osm' ? '<span class="badge badge-osm">OSM</span>' :
        '<span class="badge badge-collab">Colab</span>';
      return \`<tr>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${p.nome}</td>
        <td>\${p.bandeira}</td>
        <td>\${fonteBadge}</td>
        <td style="color:#69F0AE;font-weight:800">\${p.precos?.gasolina ? 'R$ ' + p.precos.gasolina.toFixed(2) : '–'}</td>
        <td>\${p.precos?.etanol ? 'R$ ' + p.precos.etanol.toFixed(2) : '–'}</td>
        <td>\${p.precos?.diesel ? 'R$ ' + p.precos.diesel.toFixed(2) : '–'}</td>
        <td style="color:rgba(255,255,255,0.5)">\${p.cidade}</td>
      </tr>\`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:rgba(255,255,255,0.3)">Nenhum posto encontrado</td></tr>';
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:#FF6D00;text-align:center;padding:24px">Erro ao carregar postos</td></tr>';
  }
}

async function carregarReportes() {
  const tbody = document.getElementById('reportes-tbody');
  const rankingEl = document.getElementById('ranking-lista');

  // Carregar ranking e reportes em paralelo
  const [resReportes, resRanking] = await Promise.allSettled([
    fetch('/api/precos/reportados'),
    fetch('/api/contribuidores/ranking')
  ]);

  // Ranking de colaboradores
  if (rankingEl && resRanking.status === 'fulfilled' && resRanking.value.ok) {
    try {
      const rk = await resRanking.value.json();
      const ranking = rk.ranking || [];
      const medalhas = ['🥇', '🥈', '🥉'];

      rankingEl.innerHTML = ranking.length > 0
        ? ranking.slice(0, 10).map((u, i) => \`
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;\${i < ranking.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.05)' : ''}">
              <div style="font-size:16px;min-width:22px">\${medalhas[i] || \`<span style="font-size:12px;color:rgba(255,255,255,0.3)">\${i+1}º</span>\`}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${u.nome}</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.4)">\${u.reportes} reportes · \${u.ultimoReporte}min atras</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:12px;font-weight:900;color:#FFC107">\${u.pontos} pts</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.3)">\${u.numerossorteio} nums</div>
              </div>
            </div>
          \`).join('')
        : '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:13px">Seja o primeiro a reportar precos!</div>';
    } catch {}
  }

  // Reportes de preco
  if (!tbody) return;
  try {
    if (resReportes.status === 'rejected') throw new Error('failed');
    const data = await resReportes.value.json();
    const reportes = data.reportes || [];

    tbody.innerHTML = reportes.length > 0
      ? reportes.map(r => \`<tr>
          <td style="font-size:11px;color:rgba(255,255,255,0.6);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${r.postoNome || r.postoId}</td>
          <td><span class="badge badge-collab">\${r.combustivel}</span></td>
          <td style="font-weight:800;color:#69F0AE">R$ \${r.preco.toFixed(2)}</td>
          <td style="color:#FFD600;font-size:12px">\${r.confirmacoes}x</td>
          <td style="color:rgba(255,255,255,0.4);font-size:11px">\${r.idadeMin}min</td>
        </tr>\`).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:32px;color:rgba(255,255,255,0.3)">Nenhum reporte nas ultimas 24h</td></tr>';
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:rgba(255,255,255,0.3)">Nenhum reporte ainda</td></tr>';
  }
}

function iniciarMapaAdmin() {
  if (adminMap) { adminMap.invalidateSize(); return; }
  adminMap = L.map('admin-map').setView([-23.5505, -46.6333], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(adminMap);

  // Carregar postos no mapa
  fetch('/api/postos?lat=-23.5505&lng=-46.6333&combustivel=gasolina&raio=15')
    .then(r => r.json())
    .then(data => {
      (data.postos || []).forEach(p => {
        const cor = p.fonte === 'anp' ? '#1565C0' : '#FF6D00';
        const icon = L.divIcon({
          html: \`<div style="background:\${cor};color:white;padding:3px 7px;border-radius:8px;font-size:10px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid white;white-space:nowrap">R$\${p.preco?.toFixed(2)}</div>\`,
          className: '', iconAnchor: [20, 12]
        });
        L.marker([p.lat, p.lng], { icon })
          .addTo(adminMap)
          .bindPopup(\`<strong>\${p.nome}</strong><br>\${p.bandeira} · \${p.fonte?.toUpperCase()}<br>R$ \${p.preco?.toFixed(2)}\`);
      });
    });
}

// Init
carregarDashboard();
document.getElementById('last-update').textContent = 'Carregando...';
// Auto-refresh a cada 5 minutos
setInterval(() => { if (currentSection === 'dashboard') carregarDashboard(); }, 5 * 60000);
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
      console.log(`[ANP Sync] Tentando: ${url}`)
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
      console.log(`[ANP Sync] ✅ ${semana} → ${result.totalPostos} postos salvos`)
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

// ─── Firebase Auth handler proxy ─────────────────────────────────────────────
// O signInWithPopup com authDomain customizado precisa que /__/auth/* seja
// servido pelo domínio. Fazemos proxy para o Firebase Hosting padrão.
app.get('/__/auth/*', async (c) => {
  const url = new URL(c.req.url)
  const firebaseUrl = `https://rotaposto-32e33.firebaseapp.com${url.pathname}${url.search}`
  const resp = await fetch(firebaseUrl, {
    headers: {
      'User-Agent': c.req.header('User-Agent') || 'Mozilla/5.0',
      'Accept': c.req.header('Accept') || 'text/html',
    }
  })
  const body = await resp.arrayBuffer()
  return new Response(body, {
    status: resp.status,
    headers: {
      'Content-Type': resp.headers.get('Content-Type') || 'text/html',
      'Cache-Control': 'no-cache',
    }
  })
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
      console.log(`[ANP Cron] Baixando: ${url}`)
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
      console.log(`[ANP Cron] ✅ Sync OK: ${semana} — ${result.totalPostos} postos`)
      return
    } catch (e) {
      console.error(`[ANP Cron] Erro tentando ${url}:`, e)
    }
  }
  console.error('[ANP Cron] ❌ Falhou para todas as URLs candidatas')
}

// ─── Export: fetch handler + scheduled (cron) ─────────────────────────────────
export default {
  fetch: app.fetch,
  async scheduled(event: { cron: string; scheduledTime: number }, env: Record<string, unknown>, ctx: { waitUntil: (p: Promise<unknown>) => void }): Promise<void> {
    console.log(`[ANP Cron] Disparado: ${event.cron} às ${new Date(event.scheduledTime).toISOString()}`)
    const kv = (env?.ROTAPOSTO_KV as KVNamespace | undefined)
    ctx.waitUntil(syncAnpScheduled(kv))
  }
}
