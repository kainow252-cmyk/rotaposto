import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getLandingHTML } from './landing'
import { getLandingOnboardingHTML } from './onboarding'
import {
  buscarPostosANP,
  buscarPostosOSM,
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
import { criarAssinaturaPIX, verificarPagamento, PLANOS } from './woovi'

const app = new Hono()

app.use('*', cors())
app.use('/static/*', serveStatic({ root: './' }))
app.use('/icons/*', serveStatic({ root: './public' }))
app.get('/manifest.json', serveStatic({ path: './public/manifest.json' }))
app.get('/sw.js', serveStatic({ path: './public/sw.js' }))
app.get('/logo-rotaposto.png', serveStatic({ path: './public/logo-rotaposto.png' }))

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
      // 3. Buscar em paralelo: ANP + OSM
      const [anpPostos, osmPostos] = await Promise.allSettled([
        buscarPostosANP(uf, municipio),
        buscarPostosOSM(lat, lng, Math.min(raio * 1000, 8000))
      ])

      const anp = anpPostos.status === 'fulfilled' ? anpPostos.value : []
      const osm = osmPostos.status === 'fulfilled' ? osmPostos.value : []

      // 4. Merge deduplicado
      postosBase = mergePostos(anp, osm)
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
    const rankeados = rankearPostosPorIA(noRaio, lat, lng, combustivel, litros, consumo)
    return buildResponse(rankeados, combustivel, postosBase.some(p => p.fonte === 'anp') ? 'anp+osm' : 'osm')

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

// ─── API: Preços colaborativos (reportar preço) ───────────────────────────────
interface PrecoReporte {
  postoId: string
  combustivel: string
  preco: number
  lat: number
  lng: number
  ts: number
  confirmacoes: number
}

// Store em memória (em produção: Cloudflare KV/D1)
const PRECOS_REPORTADOS = new Map<string, PrecoReporte>()

app.post('/api/precos/reportar', async (c) => {
  try {
    const body = await c.req.json()
    const { postoId, combustivel, preco, lat, lng } = body

    if (!postoId || !combustivel || !preco || preco < 1 || preco > 30) {
      return c.json({ sucesso: false, mensagem: 'Dados inválidos' }, 400)
    }

    const key = `${postoId}:${combustivel}`
    const existente = PRECOS_REPORTADOS.get(key)

    if (existente) {
      // Atualizar com média ponderada se há confirmações recentes
      const agora = Date.now()
      const idadeHoras = (agora - existente.ts) / 3600000
      if (idadeHoras < 24) {
        // Média com peso para o mais recente
        existente.preco = Math.round(((existente.preco * existente.confirmacoes + preco) / (existente.confirmacoes + 1)) * 100) / 100
        existente.confirmacoes++
        existente.ts = agora
        PRECOS_REPORTADOS.set(key, existente)
        return c.json({ sucesso: true, mensagem: `Preço confirmado! ${existente.confirmacoes} confirmações`, confirmacoes: existente.confirmacoes })
      }
    }

    // Novo reporte
    PRECOS_REPORTADOS.set(key, {
      postoId, combustivel,
      preco: Math.round(preco * 100) / 100,
      lat: lat || 0,
      lng: lng || 0,
      ts: Date.now(),
      confirmacoes: 1
    })

    return c.json({
      sucesso: true,
      mensagem: 'Preço reportado com sucesso! Obrigado por colaborar. 🙏',
      confirmacoes: 1
    })
  } catch (e: any) {
    return c.json({ sucesso: false, mensagem: 'Erro ao salvar preço' }, 500)
  }
})

// ─── API: Listar preços colaborativos reportados ──────────────────────────────
app.get('/api/precos/reportados', (c) => {
  const reportes = [...PRECOS_REPORTADOS.values()]
    .filter(r => Date.now() - r.ts < 24 * 3600000) // últimas 24h
    .sort((a, b) => b.confirmacoes - a.confirmacoes)

  return c.json({
    total: reportes.length,
    reportes: reportes.map(r => ({
      ...r,
      idadeMin: Math.round((Date.now() - r.ts) / 60000)
    }))
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

// ─── API: Pagamento / Assinatura MercadoPago ─────────────────────────────────
app.post('/api/pagamento/assinar', async (c) => {
  try {
    const body = await c.req.json()
    const { plano, nome, email, cpf, cartao } = body

    if (!nome || !email || !cpf || !cartao?.numero) {
      return c.json({ sucesso: false, mensagem: 'Dados incompletos' }, 400)
    }

    // MP Access Token (produção: use wrangler secret)
    const MP_ACCESS_TOKEN = (c.env as any)?.MP_ACCESS_TOKEN || 'TEST-access-token'

    // 1. Criar customer no MP
    let customerId: string | null = null
    try {
      const custRes = await fetch('https://api.mercadopago.com/v1/customers/search?email=' + encodeURIComponent(email), {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
      })
      const custData = await custRes.json() as any
      if (custData?.results?.length > 0) {
        customerId = custData.results[0].id
      } else {
        const newCust = await fetch('https://api.mercadopago.com/v1/customers', {
          method: 'POST',
          headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, first_name: nome.split(' ')[0], last_name: nome.split(' ').slice(1).join(' '), identification: { type: 'CPF', number: cpf } })
        })
        const custJson = await newCust.json() as any
        customerId = custJson?.id || null
      }
    } catch {}

    // 2. Tokenizar cartão
    const valores: Record<string, number> = { premium: 9.90, anual: 89.00 }
    const valor = valores[plano] || 9.90

    // 3. Criar preferência de pagamento
    const prefPayload = {
      items: [{
        id: `rp-${plano}`,
        title: plano === 'anual' ? 'RotaPosto Anual' : 'RotaPosto Premium',
        description: plano === 'anual' ? 'Assinatura anual RotaPosto' : 'Assinatura mensal RotaPosto Premium',
        quantity: 1,
        unit_price: valor,
        currency_id: 'BRL'
      }],
      payer: {
        name: nome,
        email,
        identification: { type: 'CPF', number: cpf }
      },
      auto_return: 'approved',
      back_urls: {
        success: 'https://rotaposto.com.br/obrigado',
        failure: 'https://rotaposto.com.br/erro',
        pending: 'https://rotaposto.com.br/pendente'
      },
      statement_descriptor: 'ROTAPOSTO',
      external_reference: `rp-${plano}-${Date.now()}`,
      metadata: { plano, customer_id: customerId }
    }

    const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `rp-${cpf}-${Date.now()}`
      },
      body: JSON.stringify(prefPayload)
    })
    const prefData = await prefRes.json() as any

    if (prefData?.id) {
      return c.json({
        sucesso: true,
        preferencia_id: prefData.id,
        checkout_url: prefData.init_point,
        mensagem: 'Assinatura criada com sucesso!'
      })
    }

    // Fallback: simular aprovação em sandbox/dev
    if (!MP_ACCESS_TOKEN || MP_ACCESS_TOKEN === 'TEST-access-token') {
      return c.json({
        sucesso: true,
        preferencia_id: `mock-${Date.now()}`,
        mensagem: 'Assinatura confirmada (modo demo)!',
        demo: true
      })
    }

    return c.json({ sucesso: false, mensagem: prefData?.message || 'Erro ao criar assinatura' }, 500)
  } catch (e: any) {
    return c.json({ sucesso: false, mensagem: 'Erro interno. Tente novamente.' }, 500)
  }
})

// ─── API: Webhook MercadoPago ─────────────────────────────────────────────────
app.post('/api/pagamento/webhook', async (c) => {
  const body = await c.req.json() as any
  console.log('MP Webhook:', JSON.stringify(body))
  return c.json({ status: 'ok' })
})

// ─── API: PIX Recorrente (Woovi/OpenPix) ─────────────────────────────────────
app.post('/api/pix/assinar', async (c) => {
  try {
    const body = await c.req.json()
    const { nome, email, cpf, plano } = body

    if (!nome || !email) {
      return c.json({ sucesso: false, mensagem: 'Nome e email são obrigatórios' }, 400)
    }

    const planoValido = plano in PLANOS ? plano : 'premium'
    // CPF é opcional — em demo mode não é necessário
    const cpfLimpo = (cpf || '').replace(/\D/g, '')
    const resultado = await criarAssinaturaPIX(c.env as any, nome, email, cpfLimpo, planoValido)

    if (resultado.error) {
      return c.json({ sucesso: false, mensagem: resultado.error }, 500)
    }

    return c.json({
      sucesso: true,
      plano: planoValido,
      valor: PLANOS[planoValido].valor / 100,
      subscriptionId: resultado.subscriptionId,
      qrCode: resultado.qrCode,
      brcode: resultado.brcode,
      mensagem: 'QR Code PIX gerado! Escaneie para ativar o plano Premium.',
      instrucoes: [
        '1. Abra seu app de banco',
        '2. Escaneie o QR Code ou copie o código PIX',
        '3. Confirme o pagamento',
        '4. Seu plano será ativado automaticamente em até 1 minuto'
      ]
    })
  } catch (e: any) {
    return c.json({ sucesso: false, mensagem: 'Erro ao gerar PIX. Tente novamente.' }, 500)
  }
})

// ─── API: Verificar Pagamento PIX ─────────────────────────────────────────────
app.get('/api/pix/verificar/:txid', async (c) => {
  const txid = c.req.param('txid')
  const pago = await verificarPagamento(c.env as any, txid)
  return c.json({ pago, txid })
})

// ─── API: Webhook Woovi ───────────────────────────────────────────────────────
app.post('/api/pix/webhook', async (c) => {
  const body = await c.req.json() as any
  console.log('[Woovi Webhook]', JSON.stringify(body))
  // Aqui: ativar assinatura do usuário via Firebase Firestore
  // body.charge.status === 'COMPLETED' → ativar premium
  return c.json({ status: 'ok' })
})

// ─── API: Firebase Config (segura - não expõe secrets) ───────────────────────
app.get('/api/auth/config', (c) => {
  return c.json({
    firebaseConfig: FIREBASE_CONFIG,
    googleClientId: GOOGLE_CLIENT_ID
  })
})

// ─── Frontend Principal ───────────────────────────────────────────────────────
// Rota raiz → nova landing onboarding profissional (igual ShareWallet)
app.get('/', (c) => {
  const firebaseScripts = getFirebaseAuthScripts()
  return c.html(getLandingOnboardingHTML(firebaseScripts))
})

// /landing → mantém a landing page de marketing com planos (mantida como alias)

app.get('/app', (c) => {
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

<!-- ═══ MODAL LOGIN FIREBASE ═══════════════════════════════════════════════ -->
<div class="auth-modal-overlay" id="auth-modal">
  <div class="auth-modal">
    <div class="auth-logo">
      <img src="/icons/icon-192x192.png" alt="RotaPosto"/>
      <h2>RotaPosto</h2>
      <p>Entre para salvar seus postos favoritos</p>
    </div>

    <!-- Login Social -->
    <button class="btn-social" id="btn-google-login" onclick="loginGoogle()">
      <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Continuar com Google
    </button>

    <button class="btn-social fb" id="btn-fb-login" onclick="loginFacebook()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      Continuar com Facebook
    </button>

    <div class="auth-divider"><span>ou use seu email</span></div>

    <input type="email" class="auth-input" id="auth-email" placeholder="seu@email.com"/>
    <input type="password" class="auth-input" id="auth-senha" placeholder="Senha"/>
    <button class="btn-auth-primary" onclick="loginEmail()">
      <i class="fas fa-sign-in-alt"></i> Entrar
    </button>

    <div id="auth-erro" style="color:#FF6D00;font-size:12px;font-weight:600;min-height:18px;margin-top:4px;text-align:center"></div>

    <div class="auth-footer">
      Não tem conta? <a href="#" onclick="registrarEmail()">Criar conta grátis</a><br>
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
  document.getElementById('banner-end').textContent = (melhor.endereco || melhor.bairro || '') + ' · ' + melhor.cidade;

  const precoStr = melhor.preco.toFixed(2);
  const [int, dec] = precoStr.split('.');
  document.getElementById('banner-valor').textContent = int + ',';
  document.getElementById('banner-cents').textContent = dec;

  const dist = melhor.distancia < 1
    ? (melhor.distancia * 1000).toFixed(0) + 'm'
    : melhor.distancia.toFixed(1) + 'km';
  document.getElementById('stat-dist').textContent = dist;

  const econLitro = segundo ? Math.max(0, segundo.preco - melhor.preco) : Math.max(0, mediaPreco - melhor.preco);
  const ecoTanque = (econLitro * 50).toFixed(2);
  document.getElementById('stat-eco-litro').textContent = 'R$ ' + econLitro.toFixed(2) + '/L';
  document.getElementById('stat-eco-tanque').textContent = 'R$ ' + ecoTanque;
  document.getElementById('stat-total').textContent = postos.length + ' postos';

  // Badge de fonte
  const fonte = state.estatisticas?.fonte || 'anp+osm';
  const fonteTxt = fonte.includes('anp') ? '🏛 ANP + OSM' : '🗺 OpenStreetMap';
  const city = state.estatisticas?.cidade || '';
  document.getElementById('banner-end').textContent =
    (melhor.endereco || melhor.bairro || city) + ' · ' + melhor.cidade;

  // Info fonte (insere depois do banner)
  const fonteEl = document.getElementById('fonte-info');
  if (fonteEl) {
    fonteEl.innerHTML = \`<span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.55)">
      \${fonteTxt} · \${postos.length} postos · \${city}
    </span>\`;
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
  const isMelhor = i === 0 && state.ordenacao === 'preco';

  // Badge de fonte de dados
  const fonteBadge = p.fonte === 'anp'
    ? '<span class="badge badge-anp">🏛 ANP</span>'
    : p.fonte === 'osm'
      ? '<span class="badge badge-osm">🗺 OSM</span>'
      : '<span class="badge badge-ia">👥 Colab</span>';

  // Score IA se disponível
  const scoreBadge = p.score
    ? \`<span class="badge badge-ia" title="Score IA de economia">🤖 \${p.score.toFixed(0)}</span>\`
    : '';

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
        \${isMelhor ? '<span class="badge badge-melhor">⭐ Mais barato</span>' : ''}
        \${fonteBadge}
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

    <div style="margin-top:10px;padding:10px;background:var(--cinza-bg);border-radius:12px;border:1.5px dashed var(--cinza-borda)">
      <div style="font-size:11px;font-weight:700;color:var(--cinza-texto);margin-bottom:7px;">
        <i class="fas fa-users" style="color:var(--azul-vivo)"></i> Você sabe o preço atual? Ajude a comunidade!
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <input type="number" id="preco-reportar" placeholder="R$ preço/litro" step="0.01" min="1" max="20"
          style="flex:1;padding:8px 10px;border:1.5px solid var(--cinza-borda);border-radius:8px;font-family:'Raleway',sans-serif;font-size:13px;font-weight:700;color:var(--texto-principal);background:var(--branco);outline:none"/>
        <button onclick="reportarPreco('\${posto.id}', '\${state.combustivel}')"
          style="padding:8px 14px;background:var(--azul-vivo);color:white;border:none;border-radius:8px;font-family:'Raleway',sans-serif;font-size:12px;font-weight:800;cursor:pointer;">
          <i class="fas fa-paper-plane"></i> Enviar
        </button>
      </div>
      <div style="font-size:10px;color:var(--cinza-texto);margin-top:5px;">
        Fonte: <span class="\${posto.fonte === 'anp' ? 'badge badge-anp' : 'badge badge-osm'}">\${posto.fonte?.toUpperCase() || 'ANP'}</span>
        · Preço: \${posto.fontePreco === 'estimado' ? '📊 estimado (ANP médio)' : '👥 colaborativo'}
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

// ══════════════════════════════════════════════════════════════════════════════
// ═══ SERVICE WORKER ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
function registrarSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[SW] Registrado com sucesso:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const novoSW = reg.installing;
          novoSW.addEventListener('statechange', () => {
            if (novoSW.state === 'installed' && navigator.serviceWorker.controller) {
              mostrarToast('🔄 Atualização disponível! Recarregue a página.');
            }
          });
        });
      })
      .catch(err => console.warn('[SW] Falha ao registrar:', err));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ═══ PWA INSTALL PROMPT ═══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
let _pwaPrompt = null;

function iniciarPWAPrompt() {
  const banner = document.getElementById('pwa-install-banner');
  const btnInstalar = document.getElementById('btn-pwa-install');

  // Detectar se já está instalado (modo standalone)
  const jaInstalado = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (jaInstalado) {
    banner.style.display = 'none';
    return;
  }

  // Escutar o evento beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _pwaPrompt = e;
    // Mostrar banner após 3 segundos
    setTimeout(() => banner.classList.add('visible'), 3000);
  });

  // Botão instalar
  if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
      if (!_pwaPrompt) {
        // iOS/Safari — não tem beforeinstallprompt
        mostrarToast('📱 No Safari: Menu → "Adicionar à Tela de Início"');
        return;
      }
      banner.classList.remove('visible');
      _pwaPrompt.prompt();
      const { outcome } = await _pwaPrompt.userChoice;
      console.log('[PWA] Resultado:', outcome);
      if (outcome === 'accepted') {
        mostrarToast('✅ App instalado com sucesso!');
      }
      _pwaPrompt = null;
    });
  }

  // Fechar banner ao clicar fora
  banner.addEventListener('click', (e) => {
    if (e.target === banner) banner.classList.remove('visible');
  });

  // Detectar instalação concluída
  window.addEventListener('appinstalled', () => {
    banner.classList.remove('visible');
    mostrarToast('🎉 RotaPosto instalado!');
    _pwaPrompt = null;
  });

  // iOS: mostrar instrução após 5s se não houver beforeinstallprompt
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS && !jaInstalado) {
    setTimeout(() => {
      banner.classList.add('visible');
      document.getElementById('btn-pwa-install').textContent = 'Ver como';
      document.getElementById('btn-pwa-install').onclick = () => {
        mostrarToast('📱 Toque em Compartilhar → "Adicionar à Tela de Início"');
        banner.classList.remove('visible');
      };
    }, 5000);
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

function _configurarAuth() {
  try {
    if (!window._fbAuth || !window._fbOnAuthStateChanged) {
      console.warn('[Auth] _fbAuth não disponível');
      return;
    }
    _firebaseAuth = window._fbAuth;

    // Observer de estado de autenticação — atualiza UI sempre que o user muda
    window._fbOnAuthStateChanged(_firebaseAuth, (user) => {
      const eraPrimeiroLogin = !_usuarioLogado && !!user;
      _usuarioLogado = user;
      _atualizarHeaderAuth(user);
      if (eraPrimeiroLogin) {
        fecharLogin();
        mostrarToast('👋 Olá, ' + (user.displayName || user.email || 'usuário') + '!');
      }
    });

    // Inicializar a área de auth no header
    _atualizarHeaderAuth(_firebaseAuth.currentUser);
    console.log('[Auth] Firebase Auth configurado ✓');
  } catch (err) {
    console.error('[Auth] Erro ao configurar:', err);
  }
}

function _atualizarHeaderAuth(user) {
  const actionsEl = document.getElementById('header-auth-area');
  if (!actionsEl) return;

  if (user) {
    const foto = user.photoURL || '';
    const nome = user.displayName || user.email || 'Usuário';
    const iniciais = nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    actionsEl.innerHTML = \`
      <button class="btn-icon user-avatar-btn" onclick="toggleMenuUser()" title="\${nome}">
        \${foto
          ? \`<img src="\${foto}" alt="\${nome}" class="user-avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid var(--laranja)"/>\`
          : \`<div class="user-avatar" style="width:32px;height:32px;border-radius:50%;background:var(--laranja);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:white">\${iniciais}</div>\`
        }
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
  // Menu dropdown simples
  let menu = document.getElementById('user-dropdown-menu');
  if (menu) { menu.remove(); _menuUserAberto = false; return; }
  _menuUserAberto = true;

  const user = _usuarioLogado;
  menu = document.createElement('div');
  menu.id = 'user-dropdown-menu';
  menu.style.cssText = \`
    position:fixed;top:64px;right:12px;background:#1a2744;border:1px solid rgba(255,255,255,0.1);
    border-radius:16px;padding:16px;z-index:9999;min-width:220px;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
  \`;
  menu.innerHTML = \`
    <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1)">
      <div style="font-weight:800;font-size:14px;color:white">\${user?.displayName || 'Usuário'}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5)">\${user?.email || ''}</div>
    </div>
    <button onclick="abrirModalPIX('premium');document.getElementById('user-dropdown-menu')?.remove()" style="width:100%;background:linear-gradient(135deg,#FF6D00,#ff8c00);border:none;color:white;font-weight:800;padding:10px 16px;border-radius:10px;cursor:pointer;margin-bottom:8px">
      ⚡ Assinar Premium
    </button>
    <button onclick="fazerLogout();document.getElementById('user-dropdown-menu')?.remove()" style="width:100%;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.7);font-weight:600;padding:10px 16px;border-radius:10px;cursor:pointer">
      <i class="fas fa-sign-out-alt"></i> Sair
    </button>
  \`;
  document.body.appendChild(menu);

  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', function fecharMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', fecharMenu);
      }
    });
  }, 100);
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
function abrirLogin() {
  document.getElementById('auth-modal').classList.add('visible');
}

function fecharLogin() {
  document.getElementById('auth-modal').classList.remove('visible');
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-senha').value = '';
  document.getElementById('auth-erro').textContent = '';
}

// ─── Login com Google ─────────────────────────────────────────────────────────
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
  const email = document.getElementById('auth-email').value.trim();
  const senha = document.getElementById('auth-senha').value;

  if (!email || !senha) {
    _mostrarErroAuth({ code: 'auth/empty-fields' });
    return;
  }

  const btn = document.querySelector('.btn-auth-primary');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0 auto"></div>';

  try {
    await window._fbSignInWithEmailAndPassword(_firebaseAuth, email, senha);
    console.log('[Auth] Login email OK');
  } catch (err) {
    _mostrarErroAuth(err);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
  }
}

// ─── Registrar com Email/Senha ────────────────────────────────────────────────
async function registrarEmail() {
  if (!window._fbCreateUserWithEmailAndPassword || !_firebaseAuth) {
    mostrarToast('⏳ Carregando Firebase...');
    return;
  }
  const email = document.getElementById('auth-email').value.trim();
  const senha = document.getElementById('auth-senha').value;

  if (!email || !senha) {
    _mostrarErroAuth({ code: 'auth/empty-fields' });
    return;
  }
  if (senha.length < 6) {
    _mostrarErroAuth({ code: 'auth/weak-password' });
    return;
  }

  const btn = document.querySelector('.btn-auth-primary');
  btn.disabled = true;
  btn.textContent = 'Criando conta...';

  try {
    const result = await window._fbCreateUserWithEmailAndPassword(_firebaseAuth, email, senha);
    console.log('[Auth] Conta criada:', result.user.uid);
    mostrarToast('🎉 Conta criada com sucesso!');
  } catch (err) {
    _mostrarErroAuth(err);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
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
async function reportarPreco(postoId, combustivel) {
  const input = document.getElementById('preco-reportar');
  const preco = parseFloat(input.value);
  if (!preco || preco < 1 || preco > 30) {
    mostrarToast('⚠️ Informe um preço válido (ex: 5.89)');
    return;
  }

  try {
    const res = await fetch('/api/precos/reportar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postoId, combustivel, preco, lat: state.lat, lng: state.lng })
    });
    const data = await res.json();
    if (data.sucesso) {
      mostrarToast('✅ ' + data.mensagem);
      document.getElementById('modal-overlay').classList.remove('visible');
      // Refresh postos após reporte
      setTimeout(() => buscarPostos(), 800);
    } else {
      mostrarToast('❌ ' + data.mensagem);
    }
  } catch {
    mostrarToast('Erro ao reportar preço');
  }
}
</script>
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
      <h2>💬 Preços Colaborativos</h2>
      <button class="btn-refresh" onclick="carregarReportes()"><i class="fas fa-sync-alt"></i> Atualizar</button>
    </div>
    <div class="section-card">
      <div class="section-header">
        <h3>Reportes de Preço (últimas 24h)</h3>
      </div>
      <div class="section-body" style="padding:0" id="precos-lista">
        <table>
          <thead><tr><th>Posto ID</th><th>Combustível</th><th>Preço</th><th>Confirmações</th><th>Tempo</th></tr></thead>
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
  try {
    const res = await fetch('/api/precos/reportados');
    const data = await res.json();
    const reportes = data.reportes || [];

    tbody.innerHTML = reportes.length > 0
      ? reportes.map(r => \`<tr>
          <td style="font-size:11px;color:rgba(255,255,255,0.5)">\${r.postoId}</td>
          <td><span class="badge badge-collab">\${r.combustivel}</span></td>
          <td style="font-weight:800;color:#69F0AE">R$ \${r.preco.toFixed(2)}</td>
          <td style="color:#FFD600">⭐ \${r.confirmacoes}x</td>
          <td style="color:rgba(255,255,255,0.4);font-size:12px">há \${r.idadeMin} min</td>
        </tr>\`).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:32px;color:rgba(255,255,255,0.3)">Nenhum reporte nas últimas 24h</td></tr>';
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

export default app
