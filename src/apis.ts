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
  avaliacao?: number
  totalAvaliacoes?: number
  osmId?: number
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

// ─── 1. API ANP – Postos Cadastrados ─────────────────────────────────────────
export async function buscarPostosANP(uf: string, municipio: string, pagina = 1): Promise<PostoReal[]> {
  try {
    const url = `https://revendedoresapi.anp.gov.br/v1/combustivel?uf=${encodeURIComponent(uf)}&municipio=${encodeURIComponent(municipio)}&numeropagina=${pagina}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RotaPosto/1.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return []
    const json = await res.json() as any

    if (!json.succeeded || !Array.isArray(json.data)) return []

    return json.data
      .filter((p: any) => p.latitude && p.longitude && parseFloat(p.latitude) !== 0)
      .map((p: any): PostoReal => {
        const bandeira = normalizarBandeira(p.distribuidora || '')
        const produtos: string[] = (p.produtos || []).map((pr: any) => pr.produto)
        const ufPosto = (p.uf || uf).toUpperCase()
        const munPosto = p.municipio || municipio
        // Preços reais ANP — por município quando disponível, senão média da UF
        const precos = estimarPrecosPorMunicipio(ufPosto, munPosto)

        return {
          id: `anp-${p.codigoSIMP || p.cnpj}`,
          fonte: 'anp',
          cnpj: p.cnpj,
          codigoSIMP: p.codigoSIMP,
          nome: p.razaoSocial || 'Posto ' + bandeira,
          bandeira,
          distribuidora: p.distribuidora,
          endereco: p.endereco || '',
          bairro: p.bairro,
          cidade: munPosto,
          estado: ufPosto,
          cep: p.cep,
          lat: parseFloat(p.latitude),
          lng: parseFloat(p.longitude),
          precos,
          produtos,
          atualizadoEm: new Date().toISOString().split('T')[0],
          fontePreco: (precos as any)._fonte || 'anp_media_uf',
          confirmacoesPreco: 0
        }
      })
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

// ─── 8. Merge de fontes (ANP + OSM) ──────────────────────────────────────────
export function mergePostos(anp: PostoReal[], osm: PostoReal[], raioDeduplicacao = 0.08): PostoReal[] {
  const todos: PostoReal[] = [...anp]
  const usados = new Set<number>()

  for (const osmPosto of osm) {
    let duplicado = false
    for (let i = 0; i < anp.length; i++) {
      const dist = haversine(osmPosto.lat, osmPosto.lng, anp[i].lat, anp[i].lng)
      if (dist < raioDeduplicacao) {
        duplicado = true
        // Enriquecer o posto ANP com dados OSM
        if (!anp[i].osmId) {
          anp[i].osmId = osmPosto.osmId
          anp[i].tags = osmPosto.tags
          if (!anp[i].bairro && osmPosto.bairro) anp[i].bairro = osmPosto.bairro
        }
        break
      }
    }
    if (!duplicado) todos.push(osmPosto)
  }

  return todos
}
