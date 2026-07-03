// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Camada de integração com APIs externas
//  ANP (postos + preços) · Overpass/OSM · OSRM · Nominatim
// ═══════════════════════════════════════════════════════════════════════

export interface PostoReal {
  id: string
  fonte: 'anp' | 'osm' | 'colaborativo'
  cnpj?: string
  codigoSIMP?: string
  nome: string
  bandeira: string
  distribuidora?: string
  endereco: string
  bairro?: string
  cidade: string
  estado: string
  cep?: string
  lat: number
  lng: number
  telefone?: string
  precos: {
    gasolina?: number
    gasolinaAditivada?: number
    etanol?: number
    diesel?: number
    dieselS10?: number
    gnv?: number
    glp?: number
  }
  produtos?: string[]
  atualizadoEm: string
  fontePreco?: 'anp' | 'colaborativo' | 'estimado'
  confirmacoesPreco?: number
  rating?: number
  avaliacao?: number
  totalAvaliacoes?: number
  osmId?: number
  googlePlaceId?: string
  aberto?: boolean
  businessStatus?: string
  fotoUrl?: string
  tags?: Record<string, string>
}

export interface RotaInfo {
  distanciaKm: number
  duracaoMin: number
  urlOSM: string
  urlGoogleMaps: string
}

export interface EconomiaPosto extends PostoReal {
  distancia: number
  custoCombustivelTotal: number
  custoDeslocamento: number
  economiaTotalReal: number
  economiaPorLitro: number
  economiaTanque: number
  score: number  // IA de economia: quanto menor, melhor
  rank: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function normalizarBandeira(str: string): string {
  const s = (str || '').toUpperCase()
  if (s.includes('VIBRA') || s.includes('PETROBRAS') || s.includes('BR ') || s === 'BR') return 'BR'
  if (s.includes('IPIRANGA')) return 'Ipiranga'
  if (s.includes('SHELL')) return 'Shell'
  if (s.includes('RAIZEN') || s.includes('RAÍZEN')) return 'Raízen'
  if (s.includes('ESSO')) return 'Esso'
  if (s.includes('ALE') || s.includes('ALÉ')) return 'Ale'
  if (s.includes('PETRO') && s.includes('BRAS')) return 'Petrobrás'
  if (s.includes('BANDEIRA BRANCA') || s.includes('INDEPEND')) return 'Independente'
  if (s.includes('COSAN')) return 'Raízen'
  if (s.includes('ULTRAGAS') || s.includes('ULTRAGAZ')) return 'Ultragaz'
  return str || 'Independente'
}

export function emojiPorBandeira(bandeira: string): string {
  const m: Record<string, string> = {
    'BR': '🟢', 'Ipiranga': '🟡', 'Shell': '🔴', 'Esso': '🔵',
    'Raízen': '🟠', 'Ale': '🟣', 'Independente': '⚫', 'Ultragaz': '🟤'
  }
  return m[bandeira] || '⛽'
}

function normalizarProduto(produto: string): keyof PostoReal['precos'] | null {
  const p = produto.toUpperCase()
  if (p.includes('GASOLINA') && (p.includes('ADITIVADA') || p.includes('PREMIUM'))) return 'gasolinaAditivada'
  if (p.includes('GASOLINA')) return 'gasolina'
  if (p.includes('ETANOL') || p.includes('ÁLCOOL') || p.includes('ALCOOL') || p.includes('E100')) return 'etanol'
  if (p.includes('DIESEL') && p.includes('S10')) return 'dieselS10'
  if (p.includes('DIESEL')) return 'diesel'
  if (p.includes('GNV') || p.includes('GÁS NATURAL') || p.includes('GAS NATURAL')) return 'gnv'
  if (p.includes('GLP') || p.includes('AUTOMOTIVO')) return 'glp'
  return null
}

// ─── Preços reais ANP por UF — semana 21-27/06/2026 ─────────────────────────
// Dados extraídos da planilha semanal oficial gov.br/anp
// Estrutura: { gasolina: {media,min,max,postos}, ... }
import { PRECOS_ANP_POR_UF, getPrecoANPPorMunicipio, ANP_SEMANA } from './brasil'
import { getPrecosPorCNPJ, expandirPrecos, ANP_SEMANA_POSTOS } from './precos_anp_posto'
import { carregarPrecoKV, type ANPSyncResult } from './anp_sync'

// Cache em memória dos dados KV (evita re-ler KV a cada requisição)
let _kvCache: ANPSyncResult | null = null
let _kvCacheTs = 0
const KV_CACHE_TTL = 10 * 60 * 1000 // 10 minutos

/** Retorna dados KV frescos (cache em memória por 10min) */
async function getKVData(kv: KVNamespace | undefined): Promise<ANPSyncResult | null> {
  if (!kv) return null
  const now = Date.now()
  if (_kvCache && (now - _kvCacheTs) < KV_CACHE_TTL) return _kvCache
  try {
    const data = await carregarPrecoKV(kv)
    if (data) { _kvCache = data; _kvCacheTs = now }
    return data
  } catch { return null }
}

/** Busca preço de um CNPJ: KV (semanal fresco) → bundle estático → null */
async function getPrecoParaCNPJ(
  cnpj: string,
  kvData: ANPSyncResult | null
): Promise<{ precos: Record<string, number>; semana: string; fonte: 'kv' | 'bundle' } | null> {
  if (!cnpj) return null

  // Tier 1: dados KV (mais frescos — semana atual)
  if (kvData?.postos?.[cnpj]) {
    const p = kvData.postos[cnpj]
    const precos: Record<string, number> = {}
    if (p.g)  precos.gasolina = p.g
    if (p.ga) precos.gasolinaAditivada = p.ga
    if (p.e)  precos.etanol = p.e
    if (p.d)  precos.diesel = p.d
    if (p.ds) precos.dieselS10 = p.ds
    if (p.n)  precos.gnv = p.n
    if (p.l)  precos.glp = p.l
    if (Object.keys(precos).length > 0) {
      return { precos, semana: kvData.semana, fonte: 'kv' }
    }
  }

  // Tier 2: bundle estático compilado (semana do build)
  const bundled = getPrecosPorCNPJ(cnpj)
  if (bundled && (bundled.g || bundled.e || bundled.d || bundled.ds)) {
    return { precos: expandirPrecos(bundled) as Record<string, number>, semana: ANP_SEMANA_POSTOS, fonte: 'bundle' }
  }

  return null
}

/**
 * Retorna preços reais ANP para a UF do posto.
 * Usa media por UF como estimativa quando não há dados por município.
 * Marca a fonte como 'anp_media_uf' para distinguir de dados crowdsourced.
 */
function estimarPrecosPorUF(uf: string): PostoReal['precos'] {
  const dados = PRECOS_ANP_POR_UF[uf.toUpperCase()]
  if (!dados) {
    // Fallback: média nacional aproximada
    return { gasolina: 6.81, gasolinaAditivada: 6.97, etanol: 4.82, diesel: 7.02, dieselS10: 7.14 }
  }
  return {
    gasolina: dados.gasolina?.media,
    gasolinaAditivada: dados.gasolinaAditivada?.media,
    etanol: dados.etanol?.media,
    diesel: dados.diesel?.media,
    dieselS10: dados.dieselS10?.media,
    gnv: dados.gnv?.media,
    glp: dados.glp?.media,
  }
}

/**
 * Retorna preços ANP por município quando disponível, cai na média UF.
 * @param uf - sigla do estado (ex: 'SP')
 * @param municipio - nome do município (ex: 'São Paulo')
 */
export function estimarPrecosPorMunicipio(uf: string, municipio: string): PostoReal['precos'] & { _semana?: string; _fonte?: string } {
  const dadosMun = getPrecoANPPorMunicipio(uf, municipio)
  if (dadosMun && Object.keys(dadosMun).length > 0) {
    return {
      gasolina: dadosMun.gasolina?.media,
      gasolinaAditivada: dadosMun.gasolinaAditivada?.media,
      etanol: dadosMun.etanol?.media,
      diesel: dadosMun.diesel?.media,
      dieselS10: dadosMun.dieselS10?.media,
      gnv: dadosMun.gnv?.media,
      glp: dadosMun.glp?.media,
      _semana: `${ANP_SEMANA.inicio} a ${ANP_SEMANA.fim}`,
      _fonte: 'anp_municipio',
    }
  }
  // Fallback: média por UF
  return { ...estimarPrecosPorUF(uf), _semana: `${ANP_SEMANA.inicio} a ${ANP_SEMANA.fim}`, _fonte: 'anp_media_uf' }
}

// ─── 1. API ANP – Postos Cadastrados (multi-página) ──────────────────────────
// Busca até 3 páginas em paralelo (≤210 postos) para cobrir cidades grandes
export async function buscarPostosANP(uf: string, municipio: string, pagina = 1, kv?: KVNamespace): Promise<PostoReal[]> {
  try {
    // Pré-carrega dados KV uma vez para toda a lista
    const kvData = await getKVData(kv)
    const semanaKV = kvData?.semana || null

    // Buscar página 1 primeiro para saber se há mais páginas
    const fetchPagina = async (pag: number) => {
      const url = `https://revendedoresapi.anp.gov.br/v1/combustivel?uf=${encodeURIComponent(uf)}&municipio=${encodeURIComponent(municipio)}&numeropagina=${pag}`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'RotaPosto/1.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      })
      if (!res.ok) return []
      const json = await res.json() as any
      if (!json.succeeded || !Array.isArray(json.data)) return []
      return json.data
    }

    // Sempre busca pág 1; se retornar 70 (página cheia), busca pág 2 e 3 em paralelo
    const pag1 = await fetchPagina(pagina)
    let todosRaw = [...pag1]

    if (pag1.length >= 70) {
      // Cidade grande: buscar mais páginas em paralelo (máx pág 3)
      const [pag2, pag3] = await Promise.all([
        fetchPagina(pagina + 1).catch(() => [] as any[]),
        fetchPagina(pagina + 2).catch(() => [] as any[])
      ])
      todosRaw = [...pag1, ...pag2, ...pag3]
    }

    const postosValidos = todosRaw.filter((p: any) =>
      p.latitude && p.longitude && parseFloat(p.latitude) !== 0
    )

    return (await Promise.all(postosValidos.map(async (p: any): Promise<PostoReal> => {
      const bandeira  = normalizarBandeira(p.distribuidora || '')
      const produtos: string[] = (p.produtos || []).map((pr: any) => pr.produto)
      const ufPosto   = (p.uf || uf).toUpperCase()
      const munPosto  = p.municipio || municipio

      // ── Tier 1 & 2: preço real por CNPJ (KV semana atual → bundle semana build) ──
      const cnpjNorm = (p.cnpj || '').replace(/[^0-9]/g, '').padStart(14, '0')
      const real = await getPrecoParaCNPJ(cnpjNorm, kvData)

      let precos: PostoReal['precos']
      let fontePreco: PostoReal['fontePreco']
      let atualizadoEm: string

      if (real) {
        precos      = real.precos as PostoReal['precos']
        fontePreco  = 'anp'
        atualizadoEm = real.fonte === 'kv'
          ? `📡 ${semanaKV} (tempo real)`
          : `📋 ${ANP_SEMANA_POSTOS} (histórico)`
      } else {
        // ── Tier 3: média municipal (estimativa precisa por cidade) ──
        const precosMun = estimarPrecosPorMunicipio(ufPosto, munPosto)
        precos      = precosMun
        fontePreco  = 'estimado'
        atualizadoEm = `📊 Média ${ANP_SEMANA.inicio} a ${ANP_SEMANA.fim}`
      }

      return {
        id:           `anp-${p.codigoSIMP || p.cnpj}`,
        fonte:        'anp',
        cnpj:         p.cnpj,
        codigoSIMP:   p.codigoSIMP,
        nome:         p.razaoSocial || 'Posto ' + bandeira,
        bandeira,
        distribuidora: p.distribuidora,
        endereco:     p.endereco || '',
        bairro:       p.bairro,
        cidade:       munPosto,
        estado:       ufPosto,
        cep:          p.cep,
        lat:          parseFloat(p.latitude),
        lng:          parseFloat(p.longitude),
        precos,
        produtos,
        atualizadoEm,
        fontePreco,
        confirmacoesPreco: 0
      }
    }))) as PostoReal[]
  } catch (e) {
    console.error('Erro ANP:', e)
    return []
  }
}

// ─── 2. API ANP – GLP ─────────────────────────────────────────────────────────
export async function buscarPostosGLP(uf: string, municipio: string): Promise<PostoReal[]> {
  try {
    const url = `https://revendedoresapi.anp.gov.br/v1/glp?uf=${encodeURIComponent(uf)}&municipio=${encodeURIComponent(municipio)}&numeropagina=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RotaPosto/1.0' },
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return []
    const json = await res.json() as any
    if (!json.succeeded || !Array.isArray(json.data)) return []

    return json.data
      .filter((p: any) => p.latitude && p.longitude)
      .map((p: any): PostoReal => ({
        id: `anp-glp-${p.codigoSIMP}`,
        fonte: 'anp',
        cnpj: p.cnpj,
        nome: p.razaoSocial || 'Posto GLP',
        bandeira: normalizarBandeira(p.distribuidora || ''),
        endereco: p.endereco || '',
        cidade: p.municipio,
        estado: p.uf,
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
        precos: { glp: 4.50 },
        atualizadoEm: new Date().toISOString().split('T')[0],
        fontePreco: 'estimado'
      }))
  } catch {
    return []
  }
}

// ─── 3. Overpass API (OpenStreetMap) ─────────────────────────────────────────
export async function buscarPostosOSM(lat: number, lng: number, raioMetros = 5000): Promise<PostoReal[]> {
  try {
    const query = `[out:json][timeout:15];node["amenity"="fuel"](around:${raioMetros},${lat},${lng});out body 50;`
    const body = 'data=' + encodeURIComponent(query)

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RotaPosto/1.0 (rotaposto.com.br)'
      },
      body,
      signal: AbortSignal.timeout(12000)
    })

    if (!res.ok) return []
    const json = await res.json() as any

    return (json.elements || []).map((el: any): PostoReal => {
      const tags = el.tags || {}
      const bandeira = normalizarBandeira(tags.brand || tags.operator || tags.name || '')
      // Preços reais ANP por município (OSM pode ter addr:city e addr:state)
      // tags OSM: addr:state = 'SP', addr:city = 'São Paulo'
      const ufOsm = (tags['addr:state'] || '').toUpperCase()
      const munOsm = tags['addr:city'] || tags['addr:suburb'] || ''
      // Se a UF estiver disponível no OSM → preços reais ANP
      // Se não → deixa sem preços (usuário pode reportar via crowdsourcing)
      const precos = ufOsm ? estimarPrecosPorMunicipio(ufOsm, munOsm) : {}

      // Extrair preços específicos do OSM quando disponíveis
      if (tags['fuel:octane_95'] === 'yes' || tags['fuel:octane_87'] === 'yes') {
        // preços disponíveis nos tags do OSM (raramente preenchido)
      }

      return {
        id: `osm-${el.id}`,
        fonte: 'osm',
        osmId: el.id,
        nome: tags.name || tags.brand || 'Posto de Combustível',
        bandeira,
        endereco: [
          tags['addr:street'],
          tags['addr:housenumber']
        ].filter(Boolean).join(', ') || 'Endereço não informado',
        bairro: tags['addr:suburb'] || tags['addr:neighbourhood'],
        cidade: tags['addr:city'] || '',
        estado: tags['addr:state'] || '',
        cep: tags['addr:postcode'],
        lat: el.lat,
        lng: el.lon,
        precos,
        atualizadoEm: new Date().toISOString().split('T')[0],
        fontePreco: 'estimado',
        tags
      }
    })
  } catch (e) {
    console.error('Erro Overpass:', e)
    return []
  }
}

// ─── 3b. Google Places API v1 (Nearby Search) ────────────────────────────────
// Usa a nova API v1 do Google Places para buscar postos com dados ricos:
// nome real, endereço formatado, avaliação, telefone, horário, foto
// Docs: https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places
//
// CAMPOS retornados por campo mask (economizando cota):
//   displayName, formattedAddress, location, rating, userRatingCount,
//   internationalPhoneNumber, currentOpeningHours, businessStatus,
//   photos (referência), addressComponents, types
export async function buscarPostosGooglePlaces(
  lat: number,
  lng: number,
  raioMetros: number,
  apiKey: string,
  kvData?: ANPSyncResult | null
): Promise<PostoReal[]> {
  if (!apiKey) return []

  try {
    // Google Places API v1 — Nearby Search (POST)
    const url = 'https://places.googleapis.com/v1/places:searchNearby'

    const body = {
      includedTypes: ['gas_station'],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(raioMetros, 50000) // máx 50km pela API
        }
      },
      // Ordenar por distância ao centro
      rankPreference: 'DISTANCE'
    }

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.rating',
      'places.userRatingCount',
      'places.internationalPhoneNumber',
      'places.currentOpeningHours',
      'places.businessStatus',
      'places.addressComponents',
      'places.types',
      'places.photos'
    ].join(',')

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
        'Accept-Language': 'pt-BR'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    })

    if (!res.ok) {
      console.warn(`[Google Places] HTTP ${res.status}`)
      return []
    }

    const json = await res.json() as any
    const places: any[] = json.places || []

    if (places.length === 0) return []

    return places.map((place: any): PostoReal => {
      // Extrair componentes de endereço
      const components: any[] = place.addressComponents || []
      const getComp = (type: string) =>
        components.find((c: any) => c.types?.includes(type))?.longText || ''
      const getCompShort = (type: string) =>
        components.find((c: any) => c.types?.includes(type))?.shortText || ''

      const rua = getComp('route')
      const numero = getComp('street_number')
      const bairro = getComp('sublocality_level_1') || getComp('sublocality') || getComp('neighborhood')
      const cidade = getComp('administrative_area_level_2') || getComp('locality')
      const estado = getComp('administrative_area_level_1')
      const ufSigla = getCompShort('administrative_area_level_1')
      const cep = getComp('postal_code')

      const endereco = [rua, numero].filter(Boolean).join(', ') || place.formattedAddress || ''

      const nome = place.displayName?.text || 'Posto de Combustível'
      const bandeira = normalizarBandeira(nome)

      // Normalizar UF para 2 letras
      const ufMap: Record<string, string> = {
        'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA',
        'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO',
        'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
        'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
        'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
        'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
        'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
      }
      const uf = (ufSigla.length === 2 ? ufSigla : ufMap[estado] || 'SP').toUpperCase()
      const cidadeNorm = cidade.toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

      // Tentar preço real via KV pelo nome/localização (não há CNPJ no Places)
      // Usar preço municipal estimado + classificar como estimado
      const precos = estimarPrecosPorMunicipio(uf, cidadeNorm)

      // Foto de referência (URL via Photos API v1)
      let fotoUrl: string | undefined
      if (place.photos?.length > 0) {
        const photoRef = place.photos[0].name
        fotoUrl = `https://places.googleapis.com/v1/${photoRef}/media?key=${apiKey}&maxWidthPx=400`
      }

      // Status de funcionamento
      const aberto = place.currentOpeningHours?.openNow
      const businessStatus = place.businessStatus

      return {
        id: `google-${place.id}`,
        fonte: 'osm', // Tratado como fonte externa sem CNPJ
        googlePlaceId: place.id,
        nome,
        bandeira,
        endereco,
        bairro: bairro || undefined,
        cidade,
        estado: uf,
        cep: cep || undefined,
        lat: place.location?.latitude || lat,
        lng: place.location?.longitude || lng,
        precos,
        atualizadoEm: new Date().toISOString().split('T')[0],
        fontePreco: 'estimado',
        confirmacoesPreco: 0,
        // Dados extras do Google
        rating: place.rating,
        totalAvaliacoes: place.userRatingCount,
        telefone: place.internationalPhoneNumber,
        aberto: aberto !== undefined ? aberto : undefined,
        businessStatus: businessStatus || undefined,
        fotoUrl
      }
    })
  } catch (e) {
    console.error('[Google Places] Erro:', e)
    return []
  }
}

// ─── 4. Geocode Nominatim ────────────────────────────────────────────────────
export async function geocodeNominatim(q: string): Promise<Array<{ nome: string; lat: number; lng: number; estado?: string; cidade?: string }>> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Brasil')}&format=json&limit=5&countrycodes=br&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RotaPosto/1.0 (rotaposto.com.br)' },
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return []
    const data = await res.json() as any[]

    return data.map(r => ({
      nome: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      cidade: r.address?.city || r.address?.town || r.address?.village || '',
      estado: r.address?.state_code || r.address?.state || ''
    }))
  } catch {
    return []
  }
}

// ─── 5. Geocode Reverso ──────────────────────────────────────────────────────
export async function geocodeReverso(lat: number, lng: number): Promise<{ cidade: string; estado: string; uf: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RotaPosto/1.0 (rotaposto.com.br)' },
      signal: AbortSignal.timeout(6000)
    })
    if (!res.ok) return null
    const data = await res.json() as any
    const addr = data.address || {}

    // Normalizar nome da cidade para ANP (tudo maiúsculas, sem acentos)
    const normalizarCidade = (s: string) => s
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
    const cidade = normalizarCidade(addr.city || addr.town || addr.village || addr.municipality || '')
    const estado = addr.state || ''

    // Tentar extrair UF de várias formas que Nominatim retorna
    let uf = (addr.state_code || addr['ISO3166-2-lvl4'] || '').replace('BR-', '').trim()

    // Mapeamento fallback por nome do estado
    if (!uf && estado) {
      const estados: Record<string, string> = {
        'São Paulo': 'SP', 'Rio de Janeiro': 'RJ', 'Minas Gerais': 'MG',
        'Bahia': 'BA', 'Paraná': 'PR', 'Rio Grande do Sul': 'RS',
        'Pernambuco': 'PE', 'Ceará': 'CE', 'Pará': 'PA', 'Goiás': 'GO',
        'Santa Catarina': 'SC', 'Maranhão': 'MA', 'Amazonas': 'AM',
        'Espírito Santo': 'ES', 'Mato Grosso': 'MT', 'Rio Grande do Norte': 'RN',
        'Piauí': 'PI', 'Alagoas': 'AL', 'Mato Grosso do Sul': 'MS',
        'Paraíba': 'PB', 'Sergipe': 'SE', 'Rondônia': 'RO', 'Tocantins': 'TO',
        'Acre': 'AC', 'Amapá': 'AP', 'Roraima': 'RR', 'Distrito Federal': 'DF'
      }
      uf = estados[estado] || ''
    }

    return { cidade, estado, uf }
  } catch {
    return null
  }
}

// ─── 6. Rota OSRM ─────────────────────────────────────────────────────────────
export async function calcularRotaOSRM(
  origemLat: number, origemLng: number,
  destinoLat: number, destinoLng: number
): Promise<RotaInfo | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=false&steps=false`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json() as any
    if (data.code !== 'Ok' || !data.routes?.[0]) return null

    const rota = data.routes[0]
    return {
      distanciaKm: Math.round(rota.distance / 1000 * 10) / 10,
      duracaoMin: Math.round(rota.duration / 60),
      urlOSM: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origemLat}%2C${origemLng}%3B${destinoLat}%2C${destinoLng}`,
      urlGoogleMaps: `https://www.google.com/maps/dir/${origemLat},${origemLng}/${destinoLat},${destinoLng}`
    }
  } catch {
    return null
  }
}

// ─── 7. IA de Economia ───────────────────────────────────────────────────────
// Calcula o "score real" do posto: considera preço + custo de deslocamento
// Fórmula: custo_total = (preco × litros_tanque) + (dist_km / consumo × preco_combustivel)
export function calcularScoreEconomia(
  posto: PostoReal,
  userLat: number,
  userLng: number,
  combustivel: keyof PostoReal['precos'],
  litrosTanque: number,
  consumoKmL: number
): EconomiaPosto {
  const distancia = haversine(userLat, userLng, posto.lat, posto.lng)
  const preco = posto.precos[combustivel] || 0

  // Custo do combustível para encher o tanque
  const custoCombustivelTotal = preco * litrosTanque

  // Custo estimado para ir até o posto (gasolina como base de deslocamento)
  const precoBaseDeslocamento = posto.precos.gasolina || preco || 5.80
  const litrosDeslocamento = (distancia * 2) / consumoKmL  // ida e volta
  const custoDeslocamento = litrosDeslocamento * precoBaseDeslocamento

  // Score final: quanto o motorista vai gastar de verdade
  const score = custoCombustivelTotal + custoDeslocamento

  return {
    ...posto,
    distancia,
    custoCombustivelTotal,
    custoDeslocamento: Math.round(custoDeslocamento * 100) / 100,
    economiaTotalReal: 0,  // calculado depois, comparando com outros postos
    economiaPorLitro: 0,
    economiaTanque: 0,
    score,
    rank: 0
  }
}

// Ranking com score de IA
export function rankearPostosPorIA(
  postos: PostoReal[],
  userLat: number,
  userLng: number,
  combustivel: keyof PostoReal['precos'],
  litrosTanque = 50,
  consumoKmL = 12
): EconomiaPosto[] {
  const comScore = postos
    .filter(p => p.precos[combustivel])
    .map(p => calcularScoreEconomia(p, userLat, userLng, combustivel, litrosTanque, consumoKmL))
    .sort((a, b) => a.score - b.score)

  if (comScore.length === 0) return []

  const melhorScore = comScore[0].score
  const melhorPreco = Math.min(...comScore.map(p => p.precos[combustivel] || Infinity))

  return comScore.map((p, i) => ({
    ...p,
    rank: i + 1,
    economiaTotalReal: Math.max(0, Math.round((melhorScore - p.score) * 100) / 100),
    economiaPorLitro: Math.max(0, Math.round(((p.precos[combustivel] || 0) - melhorPreco) * 100) / 100),
    economiaTanque: Math.max(0, Math.round(((p.precos[combustivel] || 0) - melhorPreco) * litrosTanque * 100) / 100)
  }))
}

// ─── 8. Merge de fontes (ANP + Google Places + OSM) ──────────────────────────
// Estratégia de merge:
//   1. ANP é a fonte principal (tem CNPJ + preços reais)
//   2. Google Places enriquece com dados ricos (rating, foto, telefone, horário)
//      ou adiciona postos novos que a ANP não retornou
//   3. OSM adiciona postos restantes fora do raio das fontes primárias
// Deduplicação por distância (~80m padrão, 50m para Google que é mais preciso)
export function mergePostos(
  anp: PostoReal[],
  osm: PostoReal[],
  raioDeduplicacao = 0.08,
  google: PostoReal[] = []
): PostoReal[] {
  // Começar com ANP (maior confiabilidade de dados fiscais/preços)
  const todos: PostoReal[] = [...anp]

  // Enriquecer postos ANP com dados do Google Places (rating, foto, aberto, telefone)
  for (const gPosto of google) {
    let encontrado = false
    for (let i = 0; i < todos.length; i++) {
      const dist = haversine(gPosto.lat, gPosto.lng, todos[i].lat, todos[i].lng)
      if (dist < 0.05) { // 50m — Google tem coordenadas mais precisas
        encontrado = true
        // Enriquecer posto existente com dados do Google (sem sobrescrever preços ANP)
        if (!todos[i].googlePlaceId) todos[i].googlePlaceId = gPosto.googlePlaceId
        if (!todos[i].rating && gPosto.rating) todos[i].rating = gPosto.rating
        if (!todos[i].totalAvaliacoes && gPosto.totalAvaliacoes) todos[i].totalAvaliacoes = gPosto.totalAvaliacoes
        if (!todos[i].telefone && gPosto.telefone) todos[i].telefone = gPosto.telefone
        if (gPosto.aberto !== undefined) todos[i].aberto = gPosto.aberto
        if (!todos[i].fotoUrl && gPosto.fotoUrl) todos[i].fotoUrl = gPosto.fotoUrl
        // Se o Google tem endereço mais completo e o ANP não tem bairro
        if (!todos[i].bairro && gPosto.bairro) todos[i].bairro = gPosto.bairro
        break
      }
    }
    // Posto do Google não encontrado na ANP → adicionar como novo
    if (!encontrado) todos.push(gPosto)
  }

  // Por último: OSM preenche postos ainda não cobertos
  for (const osmPosto of osm) {
    let duplicado = false
    for (let i = 0; i < todos.length; i++) {
      const dist = haversine(osmPosto.lat, osmPosto.lng, todos[i].lat, todos[i].lng)
      if (dist < raioDeduplicacao) {
        duplicado = true
        if (!todos[i].osmId) todos[i].osmId = osmPosto.osmId
        if (!todos[i].tags) todos[i].tags = osmPosto.tags
        if (!todos[i].bairro && osmPosto.bairro) todos[i].bairro = osmPosto.bairro
        break
      }
    }
    if (!duplicado) todos.push(osmPosto)
  }

  return todos
}
