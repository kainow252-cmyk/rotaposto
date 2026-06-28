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

// ─── Dados reais ANP – Semana 2026-06-21 a 2026-06-27 ─────────────────────────
// Fonte: ANP Levantamento de Preços de Combustíveis (planilha semanal oficial)
// 27 UFs + 382 municípios — preços em R$/litro (GLP em R$/13kg)

export const ANP_SEMANA = {
  inicio: '2026-06-21',
  fim: '2026-06-27',
  fonte: 'ANP Levantamento de Preços de Combustíveis',
}

export type PrecoProduto = { media: number; min: number; max: number; postos: number }
export type PrecosPorProduto = Partial<Record<'gasolina'|'gasolinaAditivada'|'etanol'|'diesel'|'dieselS10'|'gnv'|'glp', PrecoProduto>>

// Preços médios reais por UF (27 estados + DF)
export const PRECOS_ANP_POR_UF: Record<string, PrecosPorProduto> = {
  'AC': {
    etanol: { media: 5.28, min: 4.79, max: 6.6, postos: 8 },
    gasolinaAditivada: { media: 7.47, min: 7.18, max: 8.46, postos: 9 },
    gasolina: { media: 7.5, min: 7.14, max: 8.46, postos: 9 },
    glp: { media: 123.91, min: 115.0, max: 135.0, postos: 23 },
    diesel: { media: 7.98, min: 7.59, max: 8.75, postos: 8 },
    dieselS10: { media: 8.34, min: 7.75, max: 9.27, postos: 8 }
  },
  'AL': {
    etanol: { media: 4.8, min: 4.25, max: 5.99, postos: 49 },
    gasolinaAditivada: { media: 6.9, min: 6.49, max: 8.04, postos: 38 },
    gasolina: { media: 6.66, min: 6.17, max: 7.67, postos: 55 },
    glp: { media: 106.84, min: 86.99, max: 120.0, postos: 41 },
    gnv: { media: 4.19, min: 3.99, max: 4.94, postos: 12 },
    diesel: { media: 7.44, min: 6.79, max: 8.99, postos: 7 },
    dieselS10: { media: 7.05, min: 6.79, max: 8.26, postos: 24 }
  },
  'AM': {
    etanol: { media: 4.99, min: 4.79, max: 5.59, postos: 33 },
    gasolinaAditivada: { media: 7.1, min: 6.75, max: 8.99, postos: 43 },
    gasolina: { media: 7.03, min: 6.75, max: 8.99, postos: 53 },
    glp: { media: 128.31, min: 120.0, max: 146.0, postos: 77 },
    gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
    diesel: { media: 7.09, min: 6.99, max: 7.59, postos: 13 },
    dieselS10: { media: 7.13, min: 6.99, max: 8.99, postos: 39 }
  },
  'AP': {
    etanol: { media: 5.86, min: 5.84, max: 5.89, postos: 2 },
    gasolinaAditivada: { media: 6.78, min: 6.74, max: 6.85, postos: 5 },
    gasolina: { media: 6.5, min: 6.43, max: 6.75, postos: 21 },
    glp: { media: 127.82, min: 115.0, max: 140.0, postos: 14 },
    dieselS10: { media: 7.14, min: 6.9, max: 7.69, postos: 7 }
  },
  'BA': {
    etanol: { media: 4.88, min: 4.2, max: 5.99, postos: 188 },
    gasolinaAditivada: { media: 7.17, min: 6.65, max: 8.04, postos: 140 },
    gasolina: { media: 7.07, min: 6.39, max: 7.96, postos: 207 },
    glp: { media: 116.18, min: 92.0, max: 150.0, postos: 125 },
    gnv: { media: 4.44, min: 4.3, max: 6.19, postos: 6 },
    diesel: { media: 7.24, min: 6.54, max: 8.89, postos: 136 },
    dieselS10: { media: 7.4, min: 6.78, max: 8.99, postos: 163 }
  },
  'CE': {
    etanol: { media: 5.02, min: 4.79, max: 5.99, postos: 120 },
    gasolinaAditivada: { media: 6.99, min: 6.69, max: 7.99, postos: 116 },
    gasolina: { media: 6.85, min: 6.63, max: 7.9, postos: 133 },
    glp: { media: 116.85, min: 97.0, max: 135.0, postos: 76 },
    gnv: { media: 5.15, min: 5.15, max: 5.15, postos: 7 },
    diesel: { media: 7.32, min: 6.68, max: 7.89, postos: 18 },
    dieselS10: { media: 7.03, min: 6.15, max: 7.99, postos: 122 }
  },
  'DF': {
    etanol: { media: 4.1, min: 3.89, max: 4.55, postos: 25 },
    gasolinaAditivada: { media: 6.61, min: 6.19, max: 7.12, postos: 41 },
    gasolina: { media: 6.41, min: 6.09, max: 6.69, postos: 50 },
    glp: { media: 107.11, min: 95.0, max: 115.99, postos: 33 },
    diesel: { media: 6.99, min: 6.64, max: 7.32, postos: 13 },
    dieselS10: { media: 7.02, min: 6.94, max: 7.29, postos: 15 }
  },
  'ES': {
    etanol: { media: 4.78, min: 4.45, max: 5.39, postos: 60 },
    gasolinaAditivada: { media: 6.9, min: 6.35, max: 7.6, postos: 71 },
    gasolina: { media: 6.68, min: 6.29, max: 7.45, postos: 83 },
    glp: { media: 105.36, min: 92.99, max: 120.0, postos: 64 },
    gnv: { media: 4.29, min: 4.27, max: 4.59, postos: 10 },
    diesel: { media: 6.85, min: 6.47, max: 7.39, postos: 30 },
    dieselS10: { media: 6.96, min: 6.65, max: 7.49, postos: 52 }
  },
  'GO': {
    etanol: { media: 4.29, min: 3.44, max: 4.74, postos: 175 },
    gasolinaAditivada: { media: 6.97, min: 6.18, max: 7.59, postos: 107 },
    gasolina: { media: 6.76, min: 5.99, max: 6.99, postos: 177 },
    glp: { media: 114.25, min: 84.0, max: 138.0, postos: 152 },
    diesel: { media: 6.4, min: 5.59, max: 7.95, postos: 101 },
    dieselS10: { media: 6.83, min: 6.39, max: 7.99, postos: 136 }
  },
  'MA': {
    etanol: { media: 5.12, min: 4.78, max: 6.5, postos: 57 },
    gasolinaAditivada: { media: 6.9, min: 6.54, max: 7.9, postos: 59 },
    gasolina: { media: 6.85, min: 6.05, max: 7.89, postos: 101 },
    glp: { media: 125.37, min: 99.99, max: 140.0, postos: 86 },
    diesel: { media: 6.94, min: 6.35, max: 7.68, postos: 50 },
    dieselS10: { media: 7.1, min: 6.63, max: 7.89, postos: 90 }
  },
  'MG': {
    etanol: { media: 4.15, min: 3.49, max: 5.12, postos: 461 },
    gasolinaAditivada: { media: 6.55, min: 5.92, max: 8.25, postos: 319 },
    gasolina: { media: 6.29, min: 5.72, max: 7.19, postos: 487 },
    glp: { media: 111.48, min: 87.0, max: 140.0, postos: 390 },
    gnv: { media: 5.17, min: 4.79, max: 5.69, postos: 8 },
    diesel: { media: 6.58, min: 5.59, max: 7.59, postos: 232 },
    dieselS10: { media: 6.92, min: 6.19, max: 8.19, postos: 342 }
  },
  'MS': {
    etanol: { media: 4.01, min: 3.78, max: 4.97, postos: 31 },
    gasolinaAditivada: { media: 6.67, min: 6.25, max: 7.49, postos: 38 },
    gasolina: { media: 6.49, min: 6.17, max: 7.29, postos: 49 },
    glp: { media: 119.0, min: 100.0, max: 151.0, postos: 53 },
    gnv: { media: 4.69, min: 4.59, max: 4.79, postos: 2 },
    diesel: { media: 6.69, min: 6.15, max: 7.58, postos: 26 },
    dieselS10: { media: 7.01, min: 6.69, max: 7.69, postos: 26 }
  },
  'MT': {
    etanol: { media: 3.79, min: 3.4, max: 4.49, postos: 86 },
    gasolinaAditivada: { media: 6.94, min: 6.53, max: 7.48, postos: 54 },
    gasolina: { media: 6.81, min: 6.33, max: 7.48, postos: 86 },
    glp: { media: 127.63, min: 95.0, max: 145.0, postos: 75 },
    gnv: { media: 3.99, min: 3.99, max: 3.99, postos: 3 },
    diesel: { media: 6.84, min: 6.1, max: 7.39, postos: 48 },
    dieselS10: { media: 7.05, min: 6.57, max: 7.98, postos: 55 }
  },
  'PA': {
    etanol: { media: 5.01, min: 4.19, max: 6.09, postos: 50 },
    gasolinaAditivada: { media: 6.89, min: 6.17, max: 7.64, postos: 70 },
    gasolina: { media: 6.71, min: 5.99, max: 7.7, postos: 103 },
    glp: { media: 116.98, min: 85.0, max: 140.0, postos: 99 },
    diesel: { media: 7.2, min: 6.26, max: 8.75, postos: 48 },
    dieselS10: { media: 7.34, min: 6.28, max: 8.8, postos: 72 }
  },
  'PB': {
    etanol: { media: 4.73, min: 4.57, max: 5.39, postos: 57 },
    gasolinaAditivada: { media: 6.74, min: 6.48, max: 7.19, postos: 46 },
    gasolina: { media: 6.51, min: 6.27, max: 7.19, postos: 66 },
    glp: { media: 109.39, min: 92.99, max: 122.0, postos: 57 },
    gnv: { media: 4.85, min: 4.85, max: 5.21, postos: 12 },
    diesel: { media: 6.85, min: 6.28, max: 7.4, postos: 29 },
    dieselS10: { media: 7.14, min: 6.88, max: 7.49, postos: 51 }
  },
  'PE': {
    etanol: { media: 5.17, min: 4.69, max: 6.59, postos: 149 },
    gasolinaAditivada: { media: 7.15, min: 6.49, max: 7.78, postos: 126 },
    gasolina: { media: 6.98, min: 6.48, max: 7.99, postos: 176 },
    glp: { media: 103.82, min: 90.0, max: 130.0, postos: 103 },
    gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 28 },
    diesel: { media: 7.55, min: 6.76, max: 7.69, postos: 12 },
    dieselS10: { media: 7.03, min: 6.69, max: 7.99, postos: 150 }
  },
  'PI': {
    etanol: { media: 4.93, min: 4.34, max: 5.4, postos: 41 },
    gasolinaAditivada: { media: 7.1, min: 6.7, max: 7.69, postos: 40 },
    gasolina: { media: 6.83, min: 5.79, max: 7.69, postos: 59 },
    glp: { media: 114.66, min: 100.0, max: 137.99, postos: 42 },
    diesel: { media: 7.2, min: 6.46, max: 7.89, postos: 26 },
    dieselS10: { media: 7.35, min: 6.97, max: 7.9, postos: 41 }
  },
  'PR': {
    etanol: { media: 4.28, min: 3.55, max: 4.99, postos: 291 },
    gasolinaAditivada: { media: 6.9, min: 6.12, max: 7.6, postos: 241 },
    gasolina: { media: 6.74, min: 6.09, max: 7.39, postos: 293 },
    glp: { media: 112.55, min: 94.99, max: 140.0, postos: 251 },
    gnv: { media: 4.54, min: 4.39, max: 4.73, postos: 7 },
    diesel: { media: 6.4, min: 5.67, max: 7.66, postos: 143 },
    dieselS10: { media: 6.94, min: 6.37, max: 7.99, postos: 206 }
  },
  'RJ': {
    etanol: { media: 4.83, min: 4.19, max: 5.89, postos: 245 },
    gasolinaAditivada: { media: 6.9, min: 6.09, max: 8.19, postos: 263 },
    gasolina: { media: 6.69, min: 5.99, max: 7.99, postos: 288 },
    glp: { media: 103.47, min: 80.0, max: 151.99, postos: 139 },
    gnv: { media: 4.37, min: 3.97, max: 6.49, postos: 137 },
    diesel: { media: 6.98, min: 6.19, max: 8.35, postos: 104 },
    dieselS10: { media: 7.16, min: 5.69, max: 8.69, postos: 182 }
  },
  'RN': {
    etanol: { media: 5.51, min: 5.29, max: 6.29, postos: 29 },
    gasolinaAditivada: { media: 6.99, min: 6.45, max: 7.29, postos: 24 },
    gasolina: { media: 6.96, min: 6.45, max: 7.59, postos: 31 },
    glp: { media: 105.91, min: 99.9, max: 122.0, postos: 23 },
    gnv: { media: 5.09, min: 5.09, max: 5.09, postos: 2 },
    diesel: { media: 7.08, min: 6.79, max: 7.59, postos: 19 },
    dieselS10: { media: 7.26, min: 6.97, max: 7.99, postos: 23 }
  },
  'RO': {
    etanol: { media: 5.57, min: 5.19, max: 5.99, postos: 33 },
    gasolinaAditivada: { media: 7.49, min: 7.14, max: 7.99, postos: 48 },
    gasolina: { media: 7.39, min: 7.04, max: 7.89, postos: 53 },
    glp: { media: 126.59, min: 110.0, max: 150.0, postos: 50 },
    diesel: { media: 7.24, min: 6.57, max: 7.94, postos: 38 },
    dieselS10: { media: 7.37, min: 6.75, max: 7.98, postos: 46 }
  },
  'RR': {
    etanol: { media: 5.44, min: 5.43, max: 5.45, postos: 8 },
    gasolinaAditivada: { media: 7.78, min: 7.7, max: 7.84, postos: 15 },
    gasolina: { media: 7.69, min: 7.69, max: 7.7, postos: 15 },
    glp: { media: 142.81, min: 130.0, max: 156.0, postos: 21 },
    diesel: { media: 7.47, min: 7.4, max: 7.64, postos: 12 },
    dieselS10: { media: 7.51, min: 7.45, max: 7.7, postos: 11 }
  },
  'RS': {
    etanol: { media: 4.66, min: 4.15, max: 5.99, postos: 152 },
    gasolinaAditivada: { media: 6.62, min: 5.97, max: 7.66, postos: 299 },
    gasolina: { media: 6.42, min: 5.69, max: 7.66, postos: 318 },
    glp: { media: 117.46, min: 95.0, max: 146.0, postos: 271 },
    gnv: { media: 5.1, min: 4.64, max: 5.81, postos: 17 },
    diesel: { media: 6.6, min: 5.69, max: 7.99, postos: 180 },
    dieselS10: { media: 6.82, min: 6.09, max: 8.04, postos: 214 }
  },
  'SC': {
    etanol: { media: 4.5, min: 3.89, max: 6.36, postos: 115 },
    gasolinaAditivada: { media: 6.63, min: 6.01, max: 7.19, postos: 167 },
    gasolina: { media: 6.5, min: 5.99, max: 7.09, postos: 172 },
    glp: { media: 122.93, min: 100.0, max: 145.0, postos: 94 },
    gnv: { media: 4.58, min: 4.29, max: 4.99, postos: 26 },
    diesel: { media: 6.73, min: 6.09, max: 7.85, postos: 67 },
    dieselS10: { media: 6.97, min: 6.46, max: 8.38, postos: 117 }
  },
  'SE': {
    etanol: { media: 5.55, min: 5.39, max: 5.7, postos: 22 },
    gasolinaAditivada: { media: 7.21, min: 6.99, max: 7.53, postos: 36 },
    gasolina: { media: 7.12, min: 6.99, max: 7.19, postos: 40 },
    glp: { media: 113.01, min: 105.0, max: 118.0, postos: 37 },
    gnv: { media: 4.83, min: 4.83, max: 4.85, postos: 7 },
    diesel: { media: 6.97, min: 6.78, max: 7.79, postos: 17 },
    dieselS10: { media: 6.97, min: 6.87, max: 7.39, postos: 19 }
  },
  'SP': {
    etanol: { media: 3.82, min: 2.99, max: 6.39, postos: 1116 },
    gasolinaAditivada: { media: 6.76, min: 5.99, max: 9.89, postos: 870 },
    gasolina: { media: 6.45, min: 5.49, max: 9.69, postos: 1124 },
    glp: { media: 115.76, min: 79.0, max: 150.0, postos: 653 },
    gnv: { media: 4.88, min: 3.79, max: 5.99, postos: 47 },
    diesel: { media: 6.74, min: 5.89, max: 8.69, postos: 403 },
    dieselS10: { media: 7.08, min: 6.09, max: 9.79, postos: 785 }
  },
  'TO': {
    etanol: { media: 5.06, min: 4.4, max: 6.03, postos: 29 },
    gasolinaAditivada: { media: 7.18, min: 6.89, max: 7.59, postos: 20 },
    gasolina: { media: 7.04, min: 6.69, max: 7.87, postos: 32 },
    glp: { media: 133.5, min: 125.0, max: 146.0, postos: 28 },
    diesel: { media: 7.05, min: 6.59, max: 7.99, postos: 17 },
    dieselS10: { media: 6.99, min: 6.69, max: 7.49, postos: 28 }
  },
}

// Preços médios reais por município (382 cidades pesquisadas)
export const PRECOS_ANP_POR_MUNICIPIO: Record<string, Record<string, PrecosPorProduto>> = {
  'AC': {
    'CRUZEIRO DO SUL': {
      etanol: { media: 6.6, min: 6.6, max: 6.6, postos: 1 },
      gasolinaAditivada: { media: 8.46, min: 8.46, max: 8.46, postos: 1 },
      gasolina: { media: 8.46, min: 8.46, max: 8.46, postos: 1 },
      diesel: { media: 8.75, min: 8.75, max: 8.75, postos: 1 },
      dieselS10: { media: 9.27, min: 9.27, max: 9.27, postos: 1 }
    },
    'RIO BRANCO': {
      etanol: { media: 5.21, min: 4.79, max: 5.89, postos: 7 },
      gasolinaAditivada: { media: 7.39, min: 7.18, max: 7.49, postos: 8 },
      gasolina: { media: 7.3, min: 7.14, max: 7.49, postos: 8 },
      diesel: { media: 7.82, min: 7.59, max: 8.2, postos: 7 },
      dieselS10: { media: 8.06, min: 7.75, max: 8.29, postos: 7 }
    },
  },
  'AL': {
    'ARAPIRACA': {
      etanol: { media: 5.11, min: 4.89, max: 5.79, postos: 13 },
      gasolinaAditivada: { media: 7.06, min: 6.78, max: 7.19, postos: 9 },
      gasolina: { media: 6.97, min: 6.78, max: 6.99, postos: 15 },
      gnv: { media: 3.99, min: 3.99, max: 3.99, postos: 1 },
      diesel: { media: 7.79, min: 7.79, max: 7.79, postos: 2 },
      dieselS10: { media: 7.31, min: 7.17, max: 7.49, postos: 4 }
    },
    'DELMIRO GOUVEIA': {
      etanol: { media: 5.37, min: 4.88, max: 5.49, postos: 10 },
      gasolinaAditivada: { media: 7.74, min: 7.32, max: 8.04, postos: 6 },
      gasolina: { media: 7.61, min: 7.32, max: 7.67, postos: 10 },
      diesel: { media: 8.26, min: 7.56, max: 8.99, postos: 3 },
      dieselS10: { media: 8.18, min: 7.89, max: 8.26, postos: 5 }
    },
    'MACEIO': {
      etanol: { media: 4.73, min: 4.25, max: 4.99, postos: 17 },
      gasolinaAditivada: { media: 6.84, min: 6.49, max: 7.09, postos: 16 },
      gasolina: { media: 6.52, min: 6.17, max: 6.79, postos: 19 },
      gnv: { media: 4.19, min: 4.19, max: 4.19, postos: 9 },
      dieselS10: { media: 6.91, min: 6.79, max: 7.29, postos: 7 }
    },
    'PALMEIRA DOS INDIOS': {
      etanol: { media: 5.59, min: 5.35, max: 5.99, postos: 6 },
      gasolinaAditivada: { media: 7.04, min: 6.9, max: 7.15, postos: 6 },
      gasolina: { media: 6.91, min: 6.8, max: 6.99, postos: 8 },
      gnv: { media: 4.94, min: 4.94, max: 4.94, postos: 1 },
      diesel: { media: 7.49, min: 7.49, max: 7.49, postos: 1 },
      dieselS10: { media: 7.51, min: 7.2, max: 7.65, postos: 5 }
    },
    'RIO LARGO': {
      etanol: { media: 4.82, min: 4.79, max: 4.89, postos: 3 },
      gasolinaAditivada: { media: 6.99, min: 6.99, max: 6.99, postos: 1 },
      gasolina: { media: 6.57, min: 6.55, max: 6.59, postos: 3 },
      gnv: { media: 4.19, min: 4.19, max: 4.19, postos: 1 },
      diesel: { media: 6.79, min: 6.79, max: 6.79, postos: 1 },
      dieselS10: { media: 6.89, min: 6.79, max: 6.99, postos: 3 }
    },
  },
  'AM': {
    'MANACAPURU': {
      etanol: { media: 5.43, min: 5.35, max: 5.59, postos: 6 },
      gasolinaAditivada: { media: 6.9, min: 6.75, max: 6.99, postos: 5 },
      gasolina: { media: 6.83, min: 6.75, max: 7.18, postos: 7 },
      diesel: { media: 7.59, min: 7.59, max: 7.59, postos: 3 },
      dieselS10: { media: 7.65, min: 7.57, max: 8.05, postos: 7 }
    },
    'MANAUS': {
      etanol: { media: 4.99, min: 4.79, max: 5.29, postos: 27 },
      gasolinaAditivada: { media: 7.09, min: 6.89, max: 7.19, postos: 32 },
      gasolina: { media: 6.98, min: 6.89, max: 6.99, postos: 39 },
      gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      diesel: { media: 7.08, min: 6.99, max: 7.29, postos: 10 },
      dieselS10: { media: 7.08, min: 6.99, max: 7.29, postos: 25 }
    },
    'PARINTINS': {
      gasolinaAditivada: { media: 8.99, min: 8.99, max: 8.99, postos: 6 },
      gasolina: { media: 8.99, min: 8.99, max: 8.99, postos: 7 },
      dieselS10: { media: 8.49, min: 8.29, max: 8.99, postos: 7 }
    },
  },
  'AP': {
    'MACAPA': {
      etanol: { media: 5.86, min: 5.84, max: 5.89, postos: 2 },
      gasolinaAditivada: { media: 6.77, min: 6.74, max: 6.84, postos: 3 },
      gasolina: { media: 6.48, min: 6.43, max: 6.75, postos: 17 },
      dieselS10: { media: 7.18, min: 6.9, max: 7.69, postos: 6 }
    },
    'SANTANA': {
      gasolinaAditivada: { media: 6.81, min: 6.78, max: 6.85, postos: 2 },
      gasolina: { media: 6.61, min: 6.43, max: 6.75, postos: 4 },
      dieselS10: { media: 6.98, min: 6.98, max: 6.98, postos: 1 }
    },
  },
  'BA': {
    'ALAGOINHAS': {
      etanol: { media: 4.86, min: 4.81, max: 4.91, postos: 7 },
      gasolinaAditivada: { media: 6.99, min: 6.91, max: 7.14, postos: 7 },
      gasolina: { media: 6.95, min: 6.91, max: 7.01, postos: 8 },
      gnv: { media: 4.34, min: 4.3, max: 4.39, postos: 2 },
      diesel: { media: 7.15, min: 6.99, max: 7.42, postos: 6 },
      dieselS10: { media: 7.37, min: 7.23, max: 7.48, postos: 6 }
    },
    'BARREIRAS': {
      etanol: { media: 4.4, min: 4.2, max: 5.14, postos: 6 },
      gasolinaAditivada: { media: 7.0, min: 6.88, max: 7.19, postos: 10 },
      gasolina: { media: 6.93, min: 6.78, max: 7.09, postos: 7 },
      diesel: { media: 7.39, min: 6.89, max: 7.59, postos: 8 },
      dieselS10: { media: 7.5, min: 7.09, max: 7.69, postos: 11 }
    },
    'BRUMADO': {
      etanol: { media: 5.84, min: 5.57, max: 5.99, postos: 14 },
      gasolinaAditivada: { media: 7.91, min: 7.84, max: 8.04, postos: 9 },
      gasolina: { media: 7.8, min: 7.49, max: 7.94, postos: 14 },
      diesel: { media: 7.66, min: 7.29, max: 8.89, postos: 10 },
      dieselS10: { media: 7.69, min: 7.29, max: 8.99, postos: 13 }
    },
    'EUNAPOLIS': {
      etanol: { media: 5.24, min: 5.15, max: 5.38, postos: 6 },
      gasolinaAditivada: { media: 7.48, min: 7.25, max: 7.74, postos: 6 },
      gasolina: { media: 7.35, min: 7.25, max: 7.44, postos: 6 },
      diesel: { media: 7.58, min: 7.57, max: 7.59, postos: 4 },
      dieselS10: { media: 7.78, min: 7.67, max: 8.09, postos: 6 }
    },
    'FEIRA DE SANTANA': {
      etanol: { media: 4.76, min: 4.62, max: 5.97, postos: 14 },
      gasolinaAditivada: { media: 6.97, min: 6.83, max: 7.09, postos: 9 },
      gasolina: { media: 6.87, min: 6.83, max: 6.93, postos: 16 },
      gnv: { media: 4.49, min: 4.49, max: 4.49, postos: 3 },
      diesel: { media: 7.13, min: 6.54, max: 7.59, postos: 7 },
      dieselS10: { media: 7.18, min: 6.78, max: 7.69, postos: 11 }
    },
    'GUANAMBI': {
      etanol: { media: 4.78, min: 4.5, max: 4.99, postos: 8 },
      gasolinaAditivada: { media: 7.35, min: 7.29, max: 7.47, postos: 3 },
      gasolina: { media: 7.29, min: 7.2, max: 7.35, postos: 8 },
      diesel: { media: 7.57, min: 7.3, max: 7.75, postos: 7 },
      dieselS10: { media: 7.74, min: 7.4, max: 7.93, postos: 7 }
    },
    'ILHEUS': {
      etanol: { media: 4.98, min: 4.97, max: 4.99, postos: 9 },
      gasolinaAditivada: { media: 7.23, min: 7.14, max: 7.46, postos: 9 },
      gasolina: { media: 7.15, min: 7.14, max: 7.16, postos: 9 },
      diesel: { media: 7.67, min: 7.67, max: 7.67, postos: 2 },
      dieselS10: { media: 7.75, min: 7.69, max: 7.99, postos: 5 }
    },
    'IPIRA': {
      etanol: { media: 4.84, min: 4.49, max: 5.34, postos: 7 },
      gasolinaAditivada: { media: 7.05, min: 6.89, max: 7.34, postos: 3 },
      gasolina: { media: 6.96, min: 6.89, max: 7.24, postos: 7 },
      diesel: { media: 7.63, min: 7.19, max: 7.92, postos: 3 },
      dieselS10: { media: 7.59, min: 7.19, max: 7.99, postos: 2 }
    },
    'IRECE': {
      etanol: { media: 4.94, min: 4.75, max: 5.12, postos: 5 },
      gasolinaAditivada: { media: 7.28, min: 7.0, max: 7.95, postos: 5 },
      gasolina: { media: 7.05, min: 6.94, max: 7.15, postos: 7 },
      diesel: { media: 7.82, min: 7.59, max: 8.0, postos: 7 },
      dieselS10: { media: 7.92, min: 7.69, max: 8.1, postos: 8 }
    },
    'ITABUNA': {
      etanol: { media: 4.93, min: 4.93, max: 4.93, postos: 1 },
      gasolinaAditivada: { media: 7.14, min: 7.14, max: 7.14, postos: 1 },
      gasolina: { media: 7.13, min: 7.13, max: 7.13, postos: 1 },
      diesel: { media: 6.79, min: 6.79, max: 6.79, postos: 1 },
      dieselS10: { media: 7.09, min: 7.09, max: 7.09, postos: 1 }
    },
    'ITAMARAJU': {
      etanol: { media: 4.96, min: 4.92, max: 5.02, postos: 8 },
      gasolinaAditivada: { media: 7.4, min: 7.29, max: 7.46, postos: 5 },
      gasolina: { media: 7.26, min: 7.23, max: 7.29, postos: 8 },
      diesel: { media: 6.97, min: 6.89, max: 7.19, postos: 5 },
      dieselS10: { media: 7.28, min: 7.12, max: 7.42, postos: 7 }
    },
    'JACOBINA': {
      etanol: { media: 4.74, min: 4.65, max: 4.95, postos: 10 },
      gasolinaAditivada: { media: 6.97, min: 6.93, max: 7.08, postos: 9 },
      gasolina: { media: 6.96, min: 6.93, max: 6.99, postos: 10 },
      diesel: { media: 7.47, min: 7.24, max: 7.64, postos: 8 },
      dieselS10: { media: 7.71, min: 7.55, max: 7.99, postos: 9 }
    },
    'JAGUAQUARA': {
      etanol: { media: 5.04, min: 4.69, max: 5.59, postos: 7 },
      gasolinaAditivada: { media: 7.49, min: 7.49, max: 7.49, postos: 1 },
      gasolina: { media: 6.89, min: 6.39, max: 7.39, postos: 7 },
      diesel: { media: 7.27, min: 6.89, max: 7.89, postos: 6 },
      dieselS10: { media: 7.45, min: 7.19, max: 7.99, postos: 6 }
    },
    'JEQUIE': {
      etanol: { media: 4.62, min: 4.29, max: 4.99, postos: 11 },
      gasolinaAditivada: { media: 6.97, min: 6.65, max: 7.29, postos: 5 },
      gasolina: { media: 6.79, min: 6.65, max: 6.99, postos: 11 },
      diesel: { media: 7.59, min: 7.25, max: 7.89, postos: 7 },
      dieselS10: { media: 7.73, min: 7.43, max: 8.29, postos: 8 }
    },
    'JUAZEIRO': {
      etanol: { media: 5.38, min: 5.16, max: 5.47, postos: 7 },
      gasolinaAditivada: { media: 7.54, min: 7.39, max: 7.69, postos: 4 },
      gasolina: { media: 7.36, min: 7.2, max: 7.59, postos: 8 },
      diesel: { media: 7.03, min: 6.95, max: 7.39, postos: 5 },
      dieselS10: { media: 7.27, min: 6.95, max: 7.79, postos: 7 }
    },
    'LIVRAMENTO DE NOSSA SENHORA': {
      etanol: { media: 5.8, min: 5.68, max: 5.99, postos: 5 },
      gasolinaAditivada: { media: 7.79, min: 7.76, max: 7.85, postos: 4 },
      gasolina: { media: 7.8, min: 7.76, max: 7.96, postos: 6 },
      diesel: { media: 7.72, min: 7.49, max: 8.09, postos: 4 },
      dieselS10: { media: 7.85, min: 7.59, max: 8.29, postos: 5 }
    },
    'PAULO AFONSO': {
      etanol: { media: 4.88, min: 4.78, max: 5.27, postos: 6 },
      gasolinaAditivada: { media: 6.86, min: 6.8, max: 6.98, postos: 8 },
      gasolina: { media: 6.77, min: 6.72, max: 6.98, postos: 8 },
      diesel: { media: 7.27, min: 7.25, max: 7.29, postos: 3 },
      dieselS10: { media: 7.33, min: 7.25, max: 7.57, postos: 4 }
    },
    'POCOES': {
      etanol: { media: 4.81, min: 4.75, max: 4.99, postos: 8 },
      gasolinaAditivada: { media: 7.0, min: 6.95, max: 7.05, postos: 2 },
      gasolina: { media: 7.04, min: 6.95, max: 7.19, postos: 8 },
      diesel: { media: 6.98, min: 6.78, max: 7.19, postos: 7 },
      dieselS10: { media: 7.06, min: 6.88, max: 7.19, postos: 5 }
    },
    'PORTO SEGURO': {
      etanol: { media: 5.25, min: 5.1, max: 5.35, postos: 6 },
      gasolinaAditivada: { media: 7.44, min: 7.19, max: 7.55, postos: 5 },
      gasolina: { media: 7.3, min: 7.12, max: 7.45, postos: 6 },
      diesel: { media: 8.13, min: 7.69, max: 8.45, postos: 4 },
      dieselS10: { media: 8.41, min: 8.19, max: 8.55, postos: 4 }
    },
    'SANTO ANTONIO DE JESUS': {
      etanol: { media: 5.36, min: 5.26, max: 5.39, postos: 6 },
      gasolinaAditivada: { media: 7.4, min: 7.35, max: 7.49, postos: 5 },
      gasolina: { media: 7.36, min: 7.35, max: 7.39, postos: 6 },
      diesel: { media: 7.25, min: 7.09, max: 7.39, postos: 5 },
      dieselS10: { media: 7.41, min: 7.29, max: 7.49, postos: 6 }
    },
    'SENHOR DO BONFIM': {
      etanol: { media: 5.11, min: 4.87, max: 5.59, postos: 10 },
      gasolinaAditivada: { media: 7.33, min: 7.18, max: 7.89, postos: 5 },
      gasolina: { media: 7.35, min: 7.17, max: 7.59, postos: 12 },
      diesel: { media: 7.75, min: 7.48, max: 7.99, postos: 9 },
      dieselS10: { media: 7.88, min: 7.69, max: 7.99, postos: 7 }
    },
    'SERRINHA': {
      etanol: { media: 4.69, min: 4.52, max: 4.99, postos: 8 },
      gasolinaAditivada: { media: 6.99, min: 6.79, max: 7.34, postos: 6 },
      gasolina: { media: 6.93, min: 6.78, max: 7.19, postos: 9 },
      diesel: { media: 7.14, min: 6.92, max: 7.59, postos: 6 },
      dieselS10: { media: 7.37, min: 7.08, max: 7.79, postos: 7 }
    },
    'TEIXEIRA DE FREITAS': {
      etanol: { media: 4.87, min: 4.75, max: 4.99, postos: 2 },
      gasolinaAditivada: { media: 6.95, min: 6.95, max: 6.95, postos: 1 },
      gasolina: { media: 7.21, min: 6.85, max: 7.39, postos: 3 },
      diesel: { media: 6.77, min: 6.77, max: 6.77, postos: 1 },
      dieselS10: { media: 7.26, min: 6.87, max: 7.65, postos: 2 }
    },
    'VALENCA': {
      etanol: { media: 5.22, min: 5.18, max: 5.39, postos: 6 },
      gasolinaAditivada: { media: 7.38, min: 7.28, max: 7.59, postos: 6 },
      gasolina: { media: 7.3, min: 7.28, max: 7.39, postos: 7 },
      diesel: { media: 7.04, min: 6.79, max: 7.85, postos: 5 },
      dieselS10: { media: 7.29, min: 6.99, max: 7.99, postos: 7 }
    },
    'VITORIA DA CONQUISTA': {
      etanol: { media: 4.89, min: 4.85, max: 4.99, postos: 11 },
      gasolinaAditivada: { media: 7.01, min: 6.85, max: 7.19, postos: 12 },
      gasolina: { media: 6.91, min: 6.85, max: 6.99, postos: 15 },
      gnv: { media: 6.19, min: 6.19, max: 6.19, postos: 1 },
      diesel: { media: 7.09, min: 6.89, max: 7.59, postos: 6 },
      dieselS10: { media: 7.42, min: 7.09, max: 8.29, postos: 9 }
    },
  },
  'CE': {
    'CANINDE': {
      etanol: { media: 5.35, min: 5.25, max: 5.47, postos: 6 },
      gasolinaAditivada: { media: 6.99, min: 6.99, max: 6.99, postos: 4 },
      gasolina: { media: 6.9, min: 6.63, max: 6.98, postos: 7 },
      dieselS10: { media: 7.2, min: 6.99, max: 7.28, postos: 7 }
    },
    'CAUCAIA': {
      etanol: { media: 4.99, min: 4.87, max: 5.29, postos: 13 },
      gasolinaAditivada: { media: 6.86, min: 6.73, max: 7.15, postos: 11 },
      gasolina: { media: 6.67, min: 6.63, max: 6.89, postos: 14 },
      gnv: { media: 5.15, min: 5.15, max: 5.15, postos: 1 },
      dieselS10: { media: 6.83, min: 6.65, max: 7.14, postos: 13 }
    },
    'CRATEUS': {
      etanol: { media: 5.91, min: 5.79, max: 5.98, postos: 3 },
      gasolinaAditivada: { media: 7.34, min: 6.99, max: 7.99, postos: 5 },
      gasolina: { media: 7.22, min: 6.99, max: 7.9, postos: 6 },
      diesel: { media: 6.85, min: 6.68, max: 7.17, postos: 4 },
      dieselS10: { media: 7.32, min: 7.17, max: 7.58, postos: 4 }
    },
    'FORTALEZA': {
      etanol: { media: 4.95, min: 4.79, max: 5.49, postos: 47 },
      gasolinaAditivada: { media: 6.88, min: 6.69, max: 7.23, postos: 39 },
      gasolina: { media: 6.74, min: 6.65, max: 6.93, postos: 43 },
      gnv: { media: 5.15, min: 5.15, max: 5.15, postos: 6 },
      dieselS10: { media: 6.81, min: 6.15, max: 7.09, postos: 38 }
    },
    'ICO': {
      etanol: { media: 5.66, min: 5.25, max: 5.89, postos: 7 },
      gasolinaAditivada: { media: 7.2, min: 7.07, max: 7.3, postos: 6 },
      gasolina: { media: 7.15, min: 7.07, max: 7.29, postos: 9 },
      diesel: { media: 7.68, min: 7.49, max: 7.89, postos: 4 },
      dieselS10: { media: 7.79, min: 7.48, max: 7.99, postos: 7 }
    },
    'IGUATU': {
      etanol: { media: 5.32, min: 4.99, max: 5.59, postos: 6 },
      gasolinaAditivada: { media: 7.54, min: 7.47, max: 7.59, postos: 7 },
      gasolina: { media: 7.48, min: 7.47, max: 7.49, postos: 10 },
      diesel: { media: 7.42, min: 7.29, max: 7.59, postos: 3 },
      dieselS10: { media: 7.57, min: 7.35, max: 7.99, postos: 10 }
    },
    'ITAPIPOCA': {
      etanol: { media: 5.73, min: 5.68, max: 5.88, postos: 9 },
      gasolinaAditivada: { media: 7.55, min: 7.49, max: 7.88, postos: 9 },
      gasolina: { media: 7.49, min: 7.49, max: 7.51, postos: 7 },
      dieselS10: { media: 7.66, min: 7.57, max: 7.69, postos: 9 }
    },
    'JUAZEIRO DO NORTE': {
      etanol: { media: 5.5, min: 5.15, max: 5.99, postos: 11 },
      gasolinaAditivada: { media: 7.3, min: 7.24, max: 7.49, postos: 15 },
      gasolina: { media: 7.24, min: 6.94, max: 7.29, postos: 14 },
      diesel: { media: 6.85, min: 6.75, max: 7.13, postos: 5 },
      dieselS10: { media: 7.33, min: 7.05, max: 7.99, postos: 13 }
    },
    'LIMOEIRO DO NORTE': {
      etanol: { media: 5.6, min: 5.39, max: 5.79, postos: 6 },
      gasolinaAditivada: { media: 7.09, min: 6.79, max: 7.19, postos: 8 },
      gasolina: { media: 7.07, min: 6.79, max: 7.19, postos: 9 },
      diesel: { media: 7.56, min: 7.54, max: 7.59, postos: 2 },
      dieselS10: { media: 7.49, min: 7.35, max: 7.69, postos: 8 }
    },
    'QUIXADA': {
      etanol: { media: 5.19, min: 4.99, max: 5.39, postos: 5 },
      gasolinaAditivada: { media: 6.83, min: 6.77, max: 6.89, postos: 4 },
      gasolina: { media: 6.75, min: 6.67, max: 7.09, postos: 6 },
      dieselS10: { media: 7.01, min: 6.79, max: 7.59, postos: 5 }
    },
    'SOBRAL': {
      etanol: { media: 5.48, min: 5.29, max: 5.69, postos: 7 },
      gasolinaAditivada: { media: 7.3, min: 7.15, max: 7.49, postos: 8 },
      gasolina: { media: 7.15, min: 7.09, max: 7.19, postos: 8 },
      dieselS10: { media: 7.35, min: 7.19, max: 7.49, postos: 8 }
    },
  },
  'DF': {
    'BRASILIA': {
      etanol: { media: 4.1, min: 3.89, max: 4.55, postos: 25 },
      gasolinaAditivada: { media: 6.61, min: 6.19, max: 7.12, postos: 41 },
      gasolina: { media: 6.41, min: 6.09, max: 6.69, postos: 50 },
      diesel: { media: 6.99, min: 6.64, max: 7.32, postos: 13 },
      dieselS10: { media: 7.02, min: 6.94, max: 7.29, postos: 15 }
    },
  },
  'ES': {
    'ARACRUZ': {
      gasolinaAditivada: { media: 6.99, min: 6.99, max: 6.99, postos: 1 },
      gasolina: { media: 6.69, min: 6.69, max: 6.69, postos: 1 },
      diesel: { media: 6.99, min: 6.99, max: 6.99, postos: 1 },
      dieselS10: { media: 7.09, min: 7.09, max: 7.09, postos: 1 }
    },
    'CACHOEIRO DE ITAPEMIRIM': {
      etanol: { media: 5.0, min: 4.59, max: 5.39, postos: 10 },
      gasolinaAditivada: { media: 7.41, min: 7.19, max: 7.6, postos: 8 },
      gasolina: { media: 7.18, min: 6.89, max: 7.45, postos: 12 },
      gnv: { media: 4.59, min: 4.59, max: 4.59, postos: 2 },
      diesel: { media: 6.83, min: 6.59, max: 7.39, postos: 10 },
      dieselS10: { media: 6.96, min: 6.69, max: 7.49, postos: 9 }
    },
    'CARIACICA': {
      etanol: { media: 4.7, min: 4.49, max: 4.89, postos: 11 },
      gasolinaAditivada: { media: 6.66, min: 6.35, max: 7.07, postos: 9 },
      gasolina: { media: 6.48, min: 6.29, max: 6.69, postos: 12 },
      gnv: { media: 4.28, min: 4.27, max: 4.29, postos: 4 },
      diesel: { media: 6.67, min: 6.59, max: 6.76, postos: 4 },
      dieselS10: { media: 6.84, min: 6.69, max: 6.99, postos: 8 }
    },
    'COLATINA': {
      etanol: { media: 4.88, min: 4.69, max: 4.99, postos: 3 },
      gasolinaAditivada: { media: 6.79, min: 6.69, max: 6.99, postos: 6 },
      gasolina: { media: 6.68, min: 6.55, max: 6.89, postos: 8 },
      diesel: { media: 6.86, min: 6.78, max: 6.89, postos: 5 },
      dieselS10: { media: 6.96, min: 6.84, max: 6.99, postos: 5 }
    },
    'GUARAPARI': {
      etanol: { media: 5.17, min: 5.15, max: 5.19, postos: 4 },
      gasolinaAditivada: { media: 7.15, min: 6.83, max: 7.39, postos: 8 },
      gasolina: { media: 6.75, min: 6.68, max: 6.79, postos: 8 },
      diesel: { media: 7.09, min: 7.09, max: 7.09, postos: 1 },
      dieselS10: { media: 7.25, min: 7.09, max: 7.39, postos: 3 }
    },
    'SAO MATEUS': {
      gasolina: { media: 6.79, min: 6.79, max: 6.79, postos: 1 },
      dieselS10: { media: 6.99, min: 6.99, max: 6.99, postos: 1 }
    },
    'SERRA': {
      etanol: { media: 4.79, min: 4.65, max: 5.09, postos: 11 },
      gasolinaAditivada: { media: 6.89, min: 6.54, max: 7.14, postos: 12 },
      gasolina: { media: 6.63, min: 6.39, max: 6.69, postos: 13 },
      gnv: { media: 4.29, min: 4.29, max: 4.29, postos: 2 },
      diesel: { media: 6.83, min: 6.78, max: 6.89, postos: 4 },
      dieselS10: { media: 6.89, min: 6.69, max: 6.99, postos: 9 }
    },
    'VILA VELHA': {
      etanol: { media: 4.66, min: 4.45, max: 4.99, postos: 12 },
      gasolinaAditivada: { media: 6.94, min: 6.79, max: 7.09, postos: 15 },
      gasolina: { media: 6.66, min: 6.49, max: 6.69, postos: 16 },
      gnv: { media: 4.29, min: 4.29, max: 4.29, postos: 1 },
      diesel: { media: 6.68, min: 6.47, max: 6.89, postos: 5 },
      dieselS10: { media: 6.83, min: 6.65, max: 6.99, postos: 13 }
    },
    'VITORIA': {
      etanol: { media: 4.71, min: 4.55, max: 4.99, postos: 9 },
      gasolinaAditivada: { media: 6.76, min: 6.38, max: 7.04, postos: 12 },
      gasolina: { media: 6.6, min: 6.38, max: 6.69, postos: 12 },
      gnv: { media: 4.29, min: 4.29, max: 4.29, postos: 1 },
      dieselS10: { media: 6.91, min: 6.87, max: 6.99, postos: 3 }
    },
  },
  'GO': {
    'AGUAS LINDAS DE GOIAS': {
      etanol: { media: 3.88, min: 3.85, max: 3.99, postos: 7 },
      gasolinaAditivada: { media: 6.53, min: 6.45, max: 6.72, postos: 6 },
      gasolina: { media: 6.46, min: 6.45, max: 6.49, postos: 8 },
      diesel: { media: 6.84, min: 6.49, max: 7.59, postos: 6 },
      dieselS10: { media: 6.9, min: 6.79, max: 6.99, postos: 7 }
    },
    'ANAPOLIS': {
      etanol: { media: 4.11, min: 4.08, max: 4.47, postos: 13 },
      gasolinaAditivada: { media: 7.02, min: 6.89, max: 7.14, postos: 11 },
      gasolina: { media: 6.89, min: 6.89, max: 6.97, postos: 13 },
      diesel: { media: 6.12, min: 5.87, max: 6.69, postos: 7 },
      dieselS10: { media: 6.78, min: 6.49, max: 7.29, postos: 12 }
    },
    'APARECIDA DE GOIANIA': {
      etanol: { media: 4.5, min: 4.39, max: 4.59, postos: 19 },
      gasolinaAditivada: { media: 6.97, min: 6.79, max: 7.59, postos: 9 },
      gasolina: { media: 6.84, min: 6.69, max: 6.99, postos: 19 },
      diesel: { media: 6.29, min: 5.99, max: 7.95, postos: 14 },
      dieselS10: { media: 6.72, min: 6.39, max: 7.99, postos: 16 }
    },
    'CALDAS NOVAS': {
      etanol: { media: 4.02, min: 3.96, max: 4.29, postos: 9 },
      gasolinaAditivada: { media: 6.99, min: 6.85, max: 7.26, postos: 9 },
      gasolina: { media: 6.95, min: 6.72, max: 6.99, postos: 10 },
      diesel: { media: 6.53, min: 6.39, max: 6.89, postos: 6 },
      dieselS10: { media: 6.87, min: 6.77, max: 6.99, postos: 5 }
    },
    'CATALAO': {
      etanol: { media: 4.03, min: 3.79, max: 4.39, postos: 10 },
      gasolinaAditivada: { media: 6.73, min: 6.18, max: 7.09, postos: 6 },
      gasolina: { media: 6.57, min: 6.18, max: 6.79, postos: 10 },
      diesel: { media: 6.66, min: 6.39, max: 6.99, postos: 5 },
      dieselS10: { media: 7.07, min: 6.71, max: 7.59, postos: 6 }
    },
    'FORMOSA': {
      etanol: { media: 3.8, min: 3.69, max: 3.97, postos: 5 },
      gasolinaAditivada: { media: 6.52, min: 6.19, max: 6.79, postos: 3 },
      gasolina: { media: 6.24, min: 5.99, max: 6.59, postos: 6 },
      diesel: { media: 6.24, min: 6.19, max: 6.29, postos: 3 },
      dieselS10: { media: 6.91, min: 6.79, max: 6.99, postos: 5 }
    },
    'GOIANIA': {
      etanol: { media: 4.41, min: 3.84, max: 4.74, postos: 44 },
      gasolinaAditivada: { media: 7.1, min: 6.69, max: 7.57, postos: 30 },
      gasolina: { media: 6.84, min: 6.59, max: 6.97, postos: 44 },
      diesel: { media: 6.47, min: 5.99, max: 7.15, postos: 14 },
      dieselS10: { media: 6.82, min: 6.39, max: 7.79, postos: 40 }
    },
    'GOIATUBA': {
      etanol: { media: 3.63, min: 3.44, max: 3.8, postos: 4 },
      gasolina: { media: 6.63, min: 6.49, max: 6.79, postos: 4 },
      diesel: { media: 6.8, min: 6.05, max: 7.39, postos: 4 },
      dieselS10: { media: 6.49, min: 6.49, max: 6.49, postos: 1 }
    },
    'ITUMBIARA': {
      etanol: { media: 3.91, min: 3.59, max: 3.99, postos: 9 },
      gasolinaAditivada: { media: 6.61, min: 6.61, max: 6.61, postos: 1 },
      gasolina: { media: 6.52, min: 6.19, max: 6.59, postos: 9 },
      diesel: { media: 5.97, min: 5.59, max: 6.27, postos: 7 },
      dieselS10: { media: 6.82, min: 6.55, max: 6.99, postos: 8 }
    },
    'LUZIANIA': {
      etanol: { media: 4.23, min: 4.09, max: 4.49, postos: 10 },
      gasolinaAditivada: { media: 6.77, min: 6.65, max: 6.87, postos: 5 },
      gasolina: { media: 6.65, min: 6.49, max: 6.69, postos: 10 },
      diesel: { media: 6.57, min: 6.29, max: 6.79, postos: 8 },
      dieselS10: { media: 6.73, min: 6.69, max: 6.79, postos: 7 }
    },
    'MINEIROS': {
      etanol: { media: 4.37, min: 4.29, max: 4.39, postos: 6 },
      gasolinaAditivada: { media: 7.15, min: 7.05, max: 7.19, postos: 5 },
      gasolina: { media: 6.97, min: 6.89, max: 6.99, postos: 6 },
      diesel: { media: 6.49, min: 6.19, max: 6.99, postos: 6 },
      dieselS10: { media: 6.91, min: 6.59, max: 7.19, postos: 5 }
    },
    'PORANGATU': {
      etanol: { media: 4.46, min: 4.34, max: 4.69, postos: 8 },
      gasolinaAditivada: { media: 6.89, min: 6.84, max: 6.95, postos: 3 },
      gasolina: { media: 6.83, min: 6.74, max: 6.89, postos: 7 },
      diesel: { media: 6.45, min: 5.99, max: 7.09, postos: 5 },
      dieselS10: { media: 7.02, min: 6.85, max: 7.19, postos: 5 }
    },
    'RIO VERDE': {
      etanol: { media: 3.87, min: 3.64, max: 3.99, postos: 14 },
      gasolinaAditivada: { media: 6.92, min: 6.69, max: 7.19, postos: 6 },
      gasolina: { media: 6.73, min: 6.32, max: 6.89, postos: 14 },
      diesel: { media: 6.45, min: 6.05, max: 6.64, postos: 6 },
      dieselS10: { media: 6.96, min: 6.89, max: 7.19, postos: 7 }
    },
    'TRINDADE': {
      etanol: { media: 4.39, min: 4.24, max: 4.54, postos: 8 },
      gasolinaAditivada: { media: 7.14, min: 6.89, max: 7.44, postos: 4 },
      gasolina: { media: 6.86, min: 6.84, max: 6.89, postos: 8 },
      diesel: { media: 6.25, min: 5.99, max: 6.49, postos: 7 },
      dieselS10: { media: 6.68, min: 6.54, max: 6.97, postos: 7 }
    },
    'VALPARAISO DE GOIAS': {
      etanol: { media: 4.19, min: 4.09, max: 4.49, postos: 9 },
      gasolinaAditivada: { media: 6.9, min: 6.59, max: 7.15, postos: 9 },
      gasolina: { media: 6.65, min: 6.55, max: 6.95, postos: 9 },
      diesel: { media: 6.79, min: 6.29, max: 7.49, postos: 3 },
      dieselS10: { media: 6.85, min: 6.79, max: 6.99, postos: 5 }
    },
  },
  'MA': {
    'ACAILANDIA': {
      gasolinaAditivada: { media: 7.02, min: 7.02, max: 7.02, postos: 1 },
      gasolina: { media: 6.89, min: 6.89, max: 6.89, postos: 1 },
      dieselS10: { media: 7.0, min: 7.0, max: 7.0, postos: 1 }
    },
    'BACABAL': {
      gasolinaAditivada: { media: 7.25, min: 7.19, max: 7.29, postos: 3 },
      gasolina: { media: 7.09, min: 6.79, max: 7.29, postos: 8 },
      diesel: { media: 6.85, min: 6.79, max: 6.99, postos: 3 },
      dieselS10: { media: 7.13, min: 6.89, max: 7.41, postos: 7 }
    },
    'BALSAS': {
      etanol: { media: 5.67, min: 5.15, max: 6.5, postos: 7 },
      gasolinaAditivada: { media: 7.43, min: 7.2, max: 7.89, postos: 3 },
      gasolina: { media: 7.4, min: 7.2, max: 7.89, postos: 9 },
      diesel: { media: 7.22, min: 6.79, max: 7.57, postos: 10 },
      dieselS10: { media: 7.32, min: 6.85, max: 7.89, postos: 10 }
    },
    'BARRA DO CORDA': {
      gasolinaAditivada: { media: 7.34, min: 7.25, max: 7.39, postos: 4 },
      gasolina: { media: 7.04, min: 6.05, max: 7.36, postos: 5 },
      diesel: { media: 7.12, min: 6.7, max: 7.68, postos: 3 },
      dieselS10: { media: 7.26, min: 7.05, max: 7.69, postos: 5 }
    },
    'CODO': {
      etanol: { media: 5.71, min: 5.35, max: 6.07, postos: 5 },
      gasolinaAditivada: { media: 7.83, min: 7.64, max: 7.9, postos: 5 },
      gasolina: { media: 7.78, min: 7.5, max: 7.88, postos: 7 },
      diesel: { media: 7.49, min: 7.44, max: 7.6, postos: 5 },
      dieselS10: { media: 7.69, min: 7.59, max: 7.8, postos: 7 }
    },
    'IMPERATRIZ': {
      etanol: { media: 5.36, min: 4.99, max: 5.79, postos: 13 },
      gasolinaAditivada: { media: 6.81, min: 6.54, max: 6.99, postos: 7 },
      gasolina: { media: 6.66, min: 6.34, max: 6.99, postos: 16 },
      diesel: { media: 6.86, min: 6.75, max: 6.99, postos: 7 },
      dieselS10: { media: 7.16, min: 6.75, max: 7.59, postos: 13 }
    },
    'PINHEIRO': {
      etanol: { media: 5.65, min: 5.29, max: 5.84, postos: 3 },
      gasolinaAditivada: { media: 7.18, min: 7.1, max: 7.25, postos: 5 },
      gasolina: { media: 7.12, min: 7.09, max: 7.25, postos: 6 },
      diesel: { media: 7.32, min: 7.2, max: 7.45, postos: 5 },
      dieselS10: { media: 7.61, min: 7.29, max: 7.84, postos: 5 }
    },
    'PRESIDENTE DUTRA': {
      etanol: { media: 5.85, min: 5.49, max: 6.1, postos: 6 },
      gasolinaAditivada: { media: 7.25, min: 7.2, max: 7.47, postos: 9 },
      gasolina: { media: 7.16, min: 6.85, max: 7.32, postos: 17 },
      diesel: { media: 6.89, min: 6.52, max: 7.08, postos: 10 },
      dieselS10: { media: 6.99, min: 6.63, max: 7.25, postos: 13 }
    },
    'SAO JOSE DE RIBAMAR': {
      etanol: { media: 5.04, min: 4.98, max: 5.2, postos: 7 },
      gasolinaAditivada: { media: 6.92, min: 6.86, max: 6.99, postos: 7 },
      gasolina: { media: 6.75, min: 6.47, max: 6.89, postos: 10 },
      diesel: { media: 6.72, min: 6.45, max: 6.99, postos: 2 },
      dieselS10: { media: 7.08, min: 6.88, max: 7.49, postos: 9 }
    },
    'SAO LUIS': {
      etanol: { media: 5.01, min: 4.78, max: 5.38, postos: 16 },
      gasolinaAditivada: { media: 6.84, min: 6.68, max: 6.99, postos: 15 },
      gasolina: { media: 6.75, min: 6.49, max: 6.98, postos: 22 },
      diesel: { media: 6.74, min: 6.35, max: 7.15, postos: 5 },
      dieselS10: { media: 7.0, min: 6.64, max: 7.49, postos: 20 }
    },
  },
  'MG': {
    'ALFENAS': {
      etanol: { media: 4.2, min: 4.06, max: 4.39, postos: 9 },
      gasolinaAditivada: { media: 6.71, min: 6.48, max: 6.89, postos: 8 },
      gasolina: { media: 6.52, min: 6.36, max: 6.69, postos: 9 },
      diesel: { media: 6.57, min: 6.29, max: 6.85, postos: 2 },
      dieselS10: { media: 7.08, min: 6.69, max: 7.44, postos: 7 }
    },
    'ARAGUARI': {
      etanol: { media: 3.99, min: 3.99, max: 3.99, postos: 2 },
      gasolinaAditivada: { media: 6.15, min: 6.15, max: 6.15, postos: 1 },
      gasolina: { media: 6.49, min: 6.05, max: 6.94, postos: 2 },
      diesel: { media: 6.11, min: 5.84, max: 6.39, postos: 2 },
      dieselS10: { media: 6.48, min: 6.38, max: 6.59, postos: 2 }
    },
    'ARAXA': {
      etanol: { media: 4.53, min: 4.39, max: 5.12, postos: 10 },
      gasolinaAditivada: { media: 6.62, min: 6.19, max: 7.48, postos: 8 },
      gasolina: { media: 6.46, min: 6.19, max: 6.99, postos: 10 },
      diesel: { media: 6.4, min: 6.19, max: 6.69, postos: 8 },
      dieselS10: { media: 6.76, min: 6.55, max: 6.89, postos: 9 }
    },
    'BARBACENA': {
      etanol: { media: 4.36, min: 4.28, max: 4.59, postos: 7 },
      gasolinaAditivada: { media: 7.16, min: 6.99, max: 7.29, postos: 4 },
      gasolina: { media: 6.8, min: 6.78, max: 6.89, postos: 8 }
    },
    'BELO HORIZONTE': {
      etanol: { media: 4.01, min: 3.59, max: 4.79, postos: 41 },
      gasolinaAditivada: { media: 6.43, min: 5.92, max: 6.99, postos: 39 },
      gasolina: { media: 6.11, min: 5.72, max: 6.89, postos: 41 },
      gnv: { media: 5.17, min: 4.95, max: 5.39, postos: 2 },
      diesel: { media: 6.6, min: 6.38, max: 6.99, postos: 4 },
      dieselS10: { media: 6.91, min: 6.69, max: 7.49, postos: 18 }
    },
    'BETIM': {
      etanol: { media: 3.89, min: 3.67, max: 3.99, postos: 14 },
      gasolinaAditivada: { media: 6.21, min: 5.99, max: 6.44, postos: 8 },
      gasolina: { media: 6.1, min: 5.87, max: 6.29, postos: 14 },
      diesel: { media: 6.38, min: 6.29, max: 6.49, postos: 6 },
      dieselS10: { media: 6.8, min: 6.69, max: 7.19, postos: 9 }
    },
    'BOM DESPACHO': {
      etanol: { media: 4.1, min: 3.97, max: 4.65, postos: 7 },
      gasolinaAditivada: { media: 6.35, min: 6.25, max: 6.45, postos: 6 },
      gasolina: { media: 6.21, min: 6.17, max: 6.25, postos: 8 },
      diesel: { media: 6.61, min: 6.45, max: 6.79, postos: 5 },
      dieselS10: { media: 6.9, min: 6.79, max: 6.99, postos: 6 }
    },
    'CAMPO BELO': {
      etanol: { media: 3.95, min: 3.79, max: 3.99, postos: 6 },
      gasolinaAditivada: { media: 6.49, min: 6.49, max: 6.49, postos: 1 },
      gasolina: { media: 6.52, min: 6.49, max: 6.72, postos: 7 },
      diesel: { media: 6.69, min: 6.49, max: 6.89, postos: 2 },
      dieselS10: { media: 7.36, min: 7.19, max: 7.69, postos: 4 }
    },
    'CARATINGA': {
      etanol: { media: 4.31, min: 4.19, max: 4.45, postos: 7 },
      gasolinaAditivada: { media: 6.62, min: 6.49, max: 6.69, postos: 3 },
      gasolina: { media: 6.52, min: 6.45, max: 6.79, postos: 7 },
      diesel: { media: 6.62, min: 6.59, max: 6.69, postos: 3 },
      dieselS10: { media: 6.94, min: 6.79, max: 7.19, postos: 4 }
    },
    'CONGONHAS': {
      etanol: { media: 4.36, min: 4.28, max: 4.49, postos: 6 },
      gasolinaAditivada: { media: 6.59, min: 6.59, max: 6.59, postos: 2 },
      gasolina: { media: 6.35, min: 6.19, max: 6.59, postos: 6 },
      diesel: { media: 6.51, min: 6.39, max: 6.65, postos: 5 },
      dieselS10: { media: 6.77, min: 6.49, max: 7.09, postos: 6 }
    },
    'CONSELHEIRO LAFAIETE': {
      etanol: { media: 4.24, min: 3.99, max: 4.39, postos: 7 },
      gasolinaAditivada: { media: 6.69, min: 6.49, max: 6.99, postos: 5 },
      gasolina: { media: 6.56, min: 6.39, max: 6.59, postos: 7 },
      diesel: { media: 6.25, min: 5.59, max: 6.59, postos: 3 },
      dieselS10: { media: 7.16, min: 6.79, max: 7.69, postos: 7 }
    },
    'CONTAGEM': {
      etanol: { media: 3.87, min: 3.65, max: 3.99, postos: 18 },
      gasolinaAditivada: { media: 6.32, min: 6.05, max: 6.69, postos: 9 },
      gasolina: { media: 6.01, min: 5.89, max: 6.29, postos: 19 },
      gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      diesel: { media: 6.45, min: 6.25, max: 6.89, postos: 10 },
      dieselS10: { media: 6.78, min: 6.64, max: 6.99, postos: 11 }
    },
    'CORONEL FABRICIANO': {
      etanol: { media: 4.09, min: 4.03, max: 4.29, postos: 5 },
      gasolinaAditivada: { media: 6.69, min: 6.64, max: 6.79, postos: 3 },
      gasolina: { media: 6.36, min: 6.24, max: 6.49, postos: 7 },
      diesel: { media: 6.56, min: 6.49, max: 6.75, postos: 4 },
      dieselS10: { media: 6.81, min: 6.79, max: 6.86, postos: 3 }
    },
    'CURVELO': {
      etanol: { media: 4.14, min: 3.87, max: 4.39, postos: 8 },
      gasolinaAditivada: { media: 6.57, min: 6.36, max: 6.69, postos: 6 },
      gasolina: { media: 6.42, min: 6.34, max: 6.51, postos: 7 },
      diesel: { media: 6.58, min: 6.36, max: 6.79, postos: 6 },
      dieselS10: { media: 6.87, min: 6.69, max: 7.09, postos: 6 }
    },
    'DIVINOPOLIS': {
      etanol: { media: 3.99, min: 3.69, max: 4.49, postos: 14 },
      gasolinaAditivada: { media: 6.38, min: 6.24, max: 6.53, postos: 6 },
      gasolina: { media: 6.24, min: 6.09, max: 6.49, postos: 14 },
      diesel: { media: 6.79, min: 6.79, max: 6.79, postos: 3 },
      dieselS10: { media: 7.06, min: 6.99, max: 7.19, postos: 7 }
    },
    'FORMIGA': {
      etanol: { media: 4.09, min: 3.89, max: 4.49, postos: 7 },
      gasolinaAditivada: { media: 6.55, min: 6.39, max: 6.69, postos: 5 },
      gasolina: { media: 6.45, min: 6.39, max: 6.59, postos: 8 },
      diesel: { media: 6.84, min: 6.35, max: 7.39, postos: 3 },
      dieselS10: { media: 7.03, min: 6.35, max: 7.59, postos: 7 }
    },
    'GOVERNADOR VALADARES': {
      etanol: { media: 4.16, min: 3.85, max: 4.69, postos: 9 },
      gasolinaAditivada: { media: 6.53, min: 6.28, max: 6.77, postos: 5 },
      gasolina: { media: 6.25, min: 6.14, max: 6.49, postos: 9 },
      diesel: { media: 6.87, min: 6.75, max: 6.99, postos: 2 },
      dieselS10: { media: 7.23, min: 6.95, max: 7.39, postos: 6 }
    },
    'GUAXUPE': {
      etanol: { media: 3.99, min: 3.97, max: 4.09, postos: 8 },
      gasolinaAditivada: { media: 6.5, min: 6.29, max: 6.69, postos: 5 },
      gasolina: { media: 6.34, min: 6.27, max: 6.59, postos: 8 },
      diesel: { media: 6.54, min: 6.24, max: 6.99, postos: 4 },
      dieselS10: { media: 6.79, min: 6.55, max: 7.29, postos: 6 }
    },
    'IPATINGA': {
      etanol: { media: 4.33, min: 3.95, max: 4.59, postos: 6 },
      gasolinaAditivada: { media: 6.7, min: 6.59, max: 6.79, postos: 6 },
      gasolina: { media: 6.42, min: 6.19, max: 6.49, postos: 9 },
      diesel: { media: 6.55, min: 6.55, max: 6.56, postos: 3 },
      dieselS10: { media: 6.85, min: 6.85, max: 6.86, postos: 4 }
    },
    'ITAJUBA': {
      etanol: { media: 4.29, min: 4.29, max: 4.29, postos: 2 },
      gasolinaAditivada: { media: 6.71, min: 6.55, max: 6.89, postos: 3 },
      gasolina: { media: 6.49, min: 6.49, max: 6.49, postos: 3 },
      diesel: { media: 6.93, min: 6.89, max: 6.98, postos: 2 },
      dieselS10: { media: 7.24, min: 7.09, max: 7.54, postos: 3 }
    },
    'ITAUNA': {
      etanol: { media: 4.12, min: 3.98, max: 4.29, postos: 8 },
      gasolinaAditivada: { media: 6.52, min: 6.39, max: 6.79, postos: 5 },
      gasolina: { media: 6.18, min: 6.09, max: 6.29, postos: 8 },
      diesel: { media: 6.55, min: 6.49, max: 6.69, postos: 3 },
      dieselS10: { media: 6.89, min: 6.75, max: 7.09, postos: 8 }
    },
    'ITUIUTABA': {
      etanol: { media: 3.81, min: 3.78, max: 3.99, postos: 10 },
      gasolinaAditivada: { media: 6.4, min: 6.29, max: 6.52, postos: 2 },
      gasolina: { media: 6.27, min: 6.24, max: 6.29, postos: 10 },
      diesel: { media: 6.35, min: 6.18, max: 6.49, postos: 5 },
      dieselS10: { media: 6.98, min: 6.79, max: 7.78, postos: 10 }
    },
    'JANAUBA': {
      etanol: { media: 4.25, min: 3.95, max: 4.69, postos: 8 },
      gasolinaAditivada: { media: 6.8, min: 6.36, max: 7.39, postos: 3 },
      gasolina: { media: 6.47, min: 6.16, max: 7.19, postos: 8 },
      diesel: { media: 7.1, min: 6.75, max: 7.59, postos: 7 },
      dieselS10: { media: 7.35, min: 7.09, max: 8.19, postos: 7 }
    },
    'JANUARIA': {
      etanol: { media: 4.46, min: 3.99, max: 4.59, postos: 8 },
      gasolinaAditivada: { media: 6.69, min: 6.69, max: 6.69, postos: 2 },
      gasolina: { media: 6.59, min: 6.59, max: 6.59, postos: 8 },
      diesel: { media: 6.96, min: 6.89, max: 7.09, postos: 8 },
      dieselS10: { media: 7.3, min: 7.29, max: 7.39, postos: 7 }
    },
    'JOAO MONLEVADE': {
      etanol: { media: 4.33, min: 4.18, max: 4.49, postos: 7 },
      gasolinaAditivada: { media: 6.69, min: 6.44, max: 6.85, postos: 6 },
      gasolina: { media: 6.56, min: 6.44, max: 6.64, postos: 8 },
      diesel: { media: 6.68, min: 6.59, max: 6.79, postos: 4 },
      dieselS10: { media: 7.02, min: 6.69, max: 7.12, postos: 6 }
    },
    'JUIZ DE FORA': {
      etanol: { media: 4.7, min: 3.99, max: 4.89, postos: 14 },
      gasolinaAditivada: { media: 6.85, min: 6.64, max: 6.99, postos: 14 },
      gasolina: { media: 6.63, min: 6.49, max: 6.69, postos: 17 },
      gnv: { media: 4.79, min: 4.79, max: 4.79, postos: 1 },
      diesel: { media: 6.67, min: 6.34, max: 6.79, postos: 7 },
      dieselS10: { media: 6.98, min: 6.84, max: 7.59, postos: 13 }
    },
    'LAVRAS': {
      etanol: { media: 4.08, min: 3.59, max: 4.39, postos: 8 },
      gasolinaAditivada: { media: 6.61, min: 6.19, max: 6.84, postos: 9 },
      gasolina: { media: 6.39, min: 6.09, max: 6.59, postos: 10 },
      dieselS10: { media: 7.06, min: 6.69, max: 7.59, postos: 4 }
    },
    'LEOPOLDINA': {
      etanol: { media: 4.85, min: 4.55, max: 4.95, postos: 7 },
      gasolinaAditivada: { media: 7.14, min: 7.11, max: 7.15, postos: 6 },
      gasolina: { media: 6.89, min: 6.65, max: 6.95, postos: 8 },
      diesel: { media: 6.68, min: 6.55, max: 6.79, postos: 4 },
      dieselS10: { media: 6.88, min: 6.79, max: 6.95, postos: 5 }
    },
    'MONTE CARMELO': {
      etanol: { media: 3.9, min: 3.68, max: 4.15, postos: 8 },
      gasolinaAditivada: { media: 6.31, min: 6.19, max: 6.49, postos: 4 },
      gasolina: { media: 6.14, min: 5.98, max: 6.29, postos: 7 },
      diesel: { media: 6.89, min: 6.89, max: 6.89, postos: 1 },
      dieselS10: { media: 6.6, min: 6.2, max: 6.99, postos: 5 }
    },
    'MONTES CLAROS': {
      etanol: { media: 4.21, min: 3.99, max: 4.59, postos: 14 },
      gasolinaAditivada: { media: 6.42, min: 6.32, max: 6.72, postos: 10 },
      gasolina: { media: 6.2, min: 5.89, max: 6.35, postos: 14 },
      diesel: { media: 6.61, min: 6.45, max: 6.89, postos: 12 },
      dieselS10: { media: 6.95, min: 6.65, max: 7.59, postos: 11 }
    },
    'MURIAE': {
      etanol: { media: 4.88, min: 4.87, max: 4.89, postos: 7 },
      gasolinaAditivada: { media: 6.98, min: 6.85, max: 7.28, postos: 7 },
      gasolina: { media: 6.87, min: 6.85, max: 6.89, postos: 8 },
      diesel: { media: 6.78, min: 6.78, max: 6.79, postos: 3 },
      dieselS10: { media: 6.88, min: 6.88, max: 6.89, postos: 4 }
    },
    'OLIVEIRA': {
      etanol: { media: 4.0, min: 3.69, max: 4.29, postos: 7 },
      gasolinaAditivada: { media: 6.55, min: 6.39, max: 6.69, postos: 4 },
      gasolina: { media: 6.41, min: 6.08, max: 6.69, postos: 8 },
      diesel: { media: 6.8, min: 6.39, max: 7.29, postos: 6 },
      dieselS10: { media: 7.07, min: 6.79, max: 7.39, postos: 5 }
    },
    'OURO PRETO': {
      etanol: { media: 4.41, min: 4.39, max: 4.49, postos: 5 },
      gasolinaAditivada: { media: 6.44, min: 6.33, max: 6.49, postos: 4 },
      gasolina: { media: 6.33, min: 6.33, max: 6.35, postos: 6 },
      diesel: { media: 6.96, min: 6.8, max: 7.19, postos: 3 },
      dieselS10: { media: 7.25, min: 7.19, max: 7.29, postos: 4 }
    },
    'PARA DE MINAS': {
      etanol: { media: 4.05, min: 3.97, max: 4.39, postos: 6 },
      gasolinaAditivada: { media: 6.78, min: 6.39, max: 8.25, postos: 8 },
      gasolina: { media: 6.39, min: 6.35, max: 6.44, postos: 8 },
      diesel: { media: 6.54, min: 6.39, max: 6.79, postos: 7 },
      dieselS10: { media: 6.87, min: 6.69, max: 7.24, postos: 6 }
    },
    'PARACATU': {
      etanol: { media: 4.01, min: 3.89, max: 4.18, postos: 8 },
      gasolinaAditivada: { media: 6.54, min: 6.44, max: 6.64, postos: 4 },
      gasolina: { media: 6.36, min: 6.25, max: 6.49, postos: 8 },
      diesel: { media: 6.59, min: 6.25, max: 6.78, postos: 6 },
      dieselS10: { media: 6.92, min: 6.65, max: 7.1, postos: 7 }
    },
    'PASSOS': {
      etanol: { media: 4.45, min: 4.29, max: 4.79, postos: 10 },
      gasolinaAditivada: { media: 6.56, min: 6.29, max: 6.99, postos: 6 },
      gasolina: { media: 6.44, min: 6.29, max: 6.79, postos: 10 },
      diesel: { media: 6.71, min: 6.59, max: 6.79, postos: 8 },
      dieselS10: { media: 7.07, min: 6.89, max: 7.59, postos: 9 }
    },
    'PATROCINIO': {
      etanol: { media: 4.52, min: 4.25, max: 4.79, postos: 7 },
      gasolinaAditivada: { media: 6.68, min: 6.19, max: 7.09, postos: 6 },
      gasolina: { media: 6.59, min: 6.19, max: 6.89, postos: 8 },
      diesel: { media: 6.99, min: 6.55, max: 7.39, postos: 8 },
      dieselS10: { media: 7.25, min: 6.75, max: 7.69, postos: 6 }
    },
    'POCOS DE CALDAS': {
      etanol: { media: 4.21, min: 3.89, max: 4.59, postos: 10 },
      gasolinaAditivada: { media: 6.7, min: 6.49, max: 6.89, postos: 6 },
      gasolina: { media: 6.58, min: 6.49, max: 6.69, postos: 10 },
      diesel: { media: 6.92, min: 6.69, max: 6.99, postos: 6 },
      dieselS10: { media: 7.33, min: 6.79, max: 7.69, postos: 10 }
    },
    'SABARA': {
      etanol: { media: 4.09, min: 3.95, max: 4.49, postos: 8 },
      gasolinaAditivada: { media: 6.31, min: 6.27, max: 6.39, postos: 4 },
      gasolina: { media: 6.04, min: 5.95, max: 6.29, postos: 8 },
      gnv: { media: 5.69, min: 5.69, max: 5.69, postos: 1 },
      diesel: { media: 6.49, min: 6.49, max: 6.49, postos: 1 },
      dieselS10: { media: 6.95, min: 6.69, max: 7.19, postos: 7 }
    },
    'SAO JOAO DEL REI': {
      etanol: { media: 4.56, min: 4.54, max: 4.59, postos: 6 },
      gasolinaAditivada: { media: 6.9, min: 6.75, max: 7.09, postos: 4 },
      gasolina: { media: 6.49, min: 6.4, max: 6.59, postos: 8 },
      diesel: { media: 6.65, min: 6.54, max: 6.94, postos: 5 },
      dieselS10: { media: 6.95, min: 6.89, max: 7.09, postos: 6 }
    },
    'SAO SEBASTIAO DO PARAISO': {
      etanol: { media: 3.96, min: 3.78, max: 4.89, postos: 8 },
      gasolinaAditivada: { media: 6.68, min: 6.59, max: 6.79, postos: 4 },
      gasolina: { media: 6.61, min: 6.58, max: 6.69, postos: 8 },
      diesel: { media: 6.78, min: 6.69, max: 6.99, postos: 7 },
      dieselS10: { media: 6.98, min: 6.92, max: 6.99, postos: 7 }
    },
    'SETE LAGOAS': {
      etanol: { media: 3.88, min: 3.69, max: 3.99, postos: 11 },
      gasolinaAditivada: { media: 6.24, min: 6.04, max: 6.39, postos: 12 },
      gasolina: { media: 6.14, min: 6.04, max: 6.19, postos: 14 },
      gnv: { media: 5.24, min: 5.19, max: 5.29, postos: 2 },
      diesel: { media: 6.37, min: 6.15, max: 6.89, postos: 7 },
      dieselS10: { media: 6.81, min: 6.54, max: 7.19, postos: 7 }
    },
    'TEOFILO OTONI': {
      etanol: { media: 4.11, min: 3.89, max: 4.39, postos: 10 },
      gasolinaAditivada: { media: 6.36, min: 6.18, max: 6.49, postos: 4 },
      gasolina: { media: 6.26, min: 6.18, max: 6.39, postos: 10 },
      gnv: { media: 5.45, min: 5.45, max: 5.45, postos: 1 },
      diesel: { media: 6.97, min: 6.89, max: 6.99, postos: 6 },
      dieselS10: { media: 7.18, min: 7.05, max: 7.29, postos: 8 }
    },
    'TIMOTEO': {
      etanol: { media: 4.09, min: 3.97, max: 4.45, postos: 7 },
      gasolinaAditivada: { media: 6.48, min: 6.39, max: 6.66, postos: 3 },
      gasolina: { media: 6.35, min: 6.27, max: 6.46, postos: 7 },
      diesel: { media: 6.49, min: 6.49, max: 6.49, postos: 4 },
      dieselS10: { media: 6.79, min: 6.79, max: 6.79, postos: 4 }
    },
    'TRES CORACOES': {
      etanol: { media: 4.72, min: 4.59, max: 4.89, postos: 8 },
      gasolinaAditivada: { media: 7.0, min: 6.99, max: 7.03, postos: 5 },
      gasolina: { media: 6.83, min: 6.79, max: 6.89, postos: 8 },
      diesel: { media: 7.14, min: 6.79, max: 7.36, postos: 5 },
      dieselS10: { media: 7.34, min: 6.99, max: 7.85, postos: 7 }
    },
    'UBERABA': {
      etanol: { media: 3.86, min: 3.58, max: 4.94, postos: 16 },
      gasolinaAditivada: { media: 6.45, min: 5.93, max: 7.44, postos: 11 },
      gasolina: { media: 6.1, min: 5.89, max: 6.59, postos: 15 },
      diesel: { media: 6.4, min: 5.99, max: 7.14, postos: 8 },
      dieselS10: { media: 6.98, min: 6.47, max: 7.99, postos: 16 }
    },
    'UBERLANDIA': {
      etanol: { media: 4.54, min: 4.15, max: 4.89, postos: 21 },
      gasolinaAditivada: { media: 6.79, min: 6.55, max: 7.09, postos: 18 },
      gasolina: { media: 6.56, min: 6.29, max: 6.89, postos: 20 },
      diesel: { media: 6.59, min: 6.19, max: 7.25, postos: 7 },
      dieselS10: { media: 6.83, min: 6.49, max: 6.99, postos: 13 }
    },
    'UNAI': {
      etanol: { media: 4.16, min: 3.89, max: 4.29, postos: 4 },
      gasolinaAditivada: { media: 6.58, min: 6.57, max: 6.59, postos: 2 },
      gasolina: { media: 6.33, min: 6.09, max: 6.48, postos: 4 },
      diesel: { media: 6.38, min: 5.89, max: 6.88, postos: 4 },
      dieselS10: { media: 6.45, min: 6.19, max: 6.89, postos: 3 }
    },
    'VARGINHA': {
      etanol: { media: 3.92, min: 3.49, max: 4.49, postos: 10 },
      gasolinaAditivada: { media: 6.57, min: 6.29, max: 6.79, postos: 7 },
      gasolina: { media: 6.24, min: 5.99, max: 6.69, postos: 10 },
      diesel: { media: 7.14, min: 6.99, max: 7.29, postos: 2 },
      dieselS10: { media: 7.0, min: 6.74, max: 7.39, postos: 7 }
    },
    'VICOSA': {
      etanol: { media: 4.41, min: 3.99, max: 4.7, postos: 7 },
      gasolinaAditivada: { media: 6.88, min: 6.75, max: 6.99, postos: 6 },
      gasolina: { media: 6.67, min: 6.49, max: 6.99, postos: 8 },
      diesel: { media: 7.19, min: 7.19, max: 7.19, postos: 1 },
      dieselS10: { media: 7.28, min: 6.99, max: 7.49, postos: 5 }
    },
  },
  'MS': {
    'CAMPO GRANDE': {
      etanol: { media: 3.93, min: 3.78, max: 4.19, postos: 15 },
      gasolinaAditivada: { media: 6.59, min: 6.25, max: 6.99, postos: 19 },
      gasolina: { media: 6.36, min: 6.17, max: 6.49, postos: 23 },
      gnv: { media: 4.69, min: 4.59, max: 4.79, postos: 2 },
      diesel: { media: 6.65, min: 6.47, max: 7.15, postos: 12 },
      dieselS10: { media: 6.98, min: 6.69, max: 7.29, postos: 12 }
    },
    'CORUMBA': {
      etanol: { media: 4.91, min: 4.85, max: 4.97, postos: 2 },
      gasolinaAditivada: { media: 7.2, min: 7.15, max: 7.27, postos: 6 },
      gasolina: { media: 7.1, min: 7.05, max: 7.17, postos: 7 },
      diesel: { media: 7.48, min: 7.39, max: 7.58, postos: 2 },
      dieselS10: { media: 7.69, min: 7.69, max: 7.69, postos: 1 }
    },
    'DOURADOS': {
      etanol: { media: 4.31, min: 4.2, max: 4.69, postos: 10 },
      gasolinaAditivada: { media: 6.87, min: 6.63, max: 7.49, postos: 9 },
      gasolina: { media: 6.74, min: 6.63, max: 7.29, postos: 15 },
      diesel: { media: 6.71, min: 6.15, max: 7.19, postos: 8 },
      dieselS10: { media: 7.04, min: 6.75, max: 7.49, postos: 10 }
    },
    'PONTA PORA': {
      etanol: { media: 3.97, min: 3.97, max: 3.99, postos: 4 },
      gasolinaAditivada: { media: 6.73, min: 6.66, max: 6.96, postos: 4 },
      gasolina: { media: 6.79, min: 6.66, max: 6.99, postos: 4 },
      diesel: { media: 6.95, min: 6.77, max: 7.45, postos: 4 },
      dieselS10: { media: 7.38, min: 7.37, max: 7.42, postos: 3 }
    },
  },
  'MT': {
    'ALTA FLORESTA': {
      etanol: { media: 3.93, min: 3.73, max: 3.99, postos: 8 },
      gasolinaAditivada: { media: 7.36, min: 7.3, max: 7.48, postos: 5 },
      gasolina: { media: 7.31, min: 7.25, max: 7.48, postos: 7 },
      diesel: { media: 7.23, min: 6.93, max: 7.38, postos: 8 },
      dieselS10: { media: 7.81, min: 7.68, max: 7.98, postos: 5 }
    },
    'CACERES': {
      etanol: { media: 3.86, min: 3.85, max: 3.89, postos: 8 },
      gasolinaAditivada: { media: 6.68, min: 6.53, max: 6.79, postos: 6 },
      gasolina: { media: 6.58, min: 6.53, max: 6.69, postos: 8 },
      diesel: { media: 6.73, min: 6.59, max: 6.95, postos: 5 },
      dieselS10: { media: 6.99, min: 6.85, max: 7.35, postos: 8 }
    },
    'CUIABA': {
      etanol: { media: 3.75, min: 3.63, max: 3.89, postos: 19 },
      gasolinaAditivada: { media: 6.8, min: 6.57, max: 6.99, postos: 10 },
      gasolina: { media: 6.71, min: 6.57, max: 6.79, postos: 19 },
      gnv: { media: 3.99, min: 3.99, max: 3.99, postos: 1 },
      diesel: { media: 6.74, min: 6.39, max: 6.99, postos: 7 },
      dieselS10: { media: 6.95, min: 6.57, max: 7.37, postos: 7 }
    },
    'RONDONOPOLIS': {
      etanol: { media: 3.93, min: 3.4, max: 3.99, postos: 15 },
      gasolinaAditivada: { media: 7.11, min: 6.98, max: 7.29, postos: 9 },
      gasolina: { media: 6.94, min: 6.4, max: 6.99, postos: 16 },
      diesel: { media: 6.81, min: 6.1, max: 7.18, postos: 12 },
      dieselS10: { media: 7.06, min: 6.6, max: 7.29, postos: 14 }
    },
    'SINOP': {
      etanol: { media: 3.91, min: 3.43, max: 4.49, postos: 11 },
      gasolinaAditivada: { media: 6.98, min: 6.78, max: 7.19, postos: 8 },
      gasolina: { media: 6.79, min: 6.33, max: 7.09, postos: 11 },
      diesel: { media: 6.85, min: 6.23, max: 7.39, postos: 6 },
      dieselS10: { media: 7.25, min: 6.77, max: 7.69, postos: 7 }
    },
    'SORRISO': {
      etanol: { media: 3.93, min: 3.79, max: 3.99, postos: 8 },
      gasolinaAditivada: { media: 7.13, min: 6.99, max: 7.29, postos: 7 },
      gasolina: { media: 6.98, min: 6.69, max: 7.09, postos: 8 },
      diesel: { media: 7.1, min: 6.55, max: 7.39, postos: 3 },
      dieselS10: { media: 7.49, min: 7.09, max: 7.69, postos: 5 }
    },
    'VARZEA GRANDE': {
      etanol: { media: 3.67, min: 3.63, max: 3.83, postos: 17 },
      gasolinaAditivada: { media: 6.83, min: 6.69, max: 6.99, postos: 9 },
      gasolina: { media: 6.68, min: 6.55, max: 6.85, postos: 17 },
      gnv: { media: 3.99, min: 3.99, max: 3.99, postos: 2 },
      diesel: { media: 6.78, min: 6.49, max: 6.99, postos: 7 },
      dieselS10: { media: 6.93, min: 6.77, max: 7.29, postos: 9 }
    },
  },
  'PA': {
    'ABAETETUBA': {
      gasolinaAditivada: { media: 7.22, min: 6.99, max: 7.55, postos: 3 },
      gasolina: { media: 6.92, min: 6.79, max: 7.19, postos: 6 },
      diesel: { media: 6.94, min: 6.26, max: 7.63, postos: 2 },
      dieselS10: { media: 7.15, min: 6.7, max: 7.79, postos: 5 }
    },
    'ALENQUER': {
      etanol: { media: 5.7, min: 5.7, max: 5.7, postos: 1 },
      gasolinaAditivada: { media: 7.09, min: 6.89, max: 7.29, postos: 2 },
      gasolina: { media: 6.88, min: 6.88, max: 6.89, postos: 2 },
      diesel: { media: 6.99, min: 6.99, max: 6.99, postos: 2 },
      dieselS10: { media: 7.49, min: 7.49, max: 7.5, postos: 2 }
    },
    'ALTAMIRA': {
      etanol: { media: 5.67, min: 5.35, max: 5.82, postos: 5 },
      gasolinaAditivada: { media: 7.28, min: 6.95, max: 7.44, postos: 5 },
      gasolina: { media: 7.3, min: 6.95, max: 7.7, postos: 10 },
      diesel: { media: 7.76, min: 7.1, max: 8.75, postos: 9 },
      dieselS10: { media: 8.05, min: 7.59, max: 8.8, postos: 9 }
    },
    'ANANINDEUA': {
      etanol: { media: 4.66, min: 4.19, max: 5.49, postos: 7 },
      gasolinaAditivada: { media: 6.48, min: 6.17, max: 6.89, postos: 9 },
      gasolina: { media: 6.35, min: 6.15, max: 6.67, postos: 11 },
      dieselS10: { media: 6.79, min: 6.28, max: 7.59, postos: 7 }
    },
    'BELEM': {
      etanol: { media: 4.98, min: 4.55, max: 5.39, postos: 8 },
      gasolinaAditivada: { media: 7.01, min: 6.29, max: 7.64, postos: 13 },
      gasolina: { media: 6.61, min: 5.99, max: 6.99, postos: 19 },
      dieselS10: { media: 6.97, min: 6.81, max: 7.39, postos: 8 }
    },
    'CASTANHAL': {
      etanol: { media: 5.19, min: 4.99, max: 5.29, postos: 4 },
      gasolinaAditivada: { media: 6.63, min: 6.55, max: 6.79, postos: 4 },
      gasolina: { media: 6.57, min: 6.49, max: 6.69, postos: 8 },
      diesel: { media: 6.81, min: 6.79, max: 6.89, postos: 5 },
      dieselS10: { media: 6.82, min: 6.32, max: 6.99, postos: 5 }
    },
    'CONCEICAO DO ARAGUAIA': {
      etanol: { media: 5.62, min: 5.49, max: 5.75, postos: 2 },
      gasolinaAditivada: { media: 7.16, min: 7.01, max: 7.29, postos: 3 },
      gasolina: { media: 7.11, min: 6.99, max: 7.22, postos: 6 },
      diesel: { media: 7.29, min: 7.09, max: 7.65, postos: 4 },
      dieselS10: { media: 7.57, min: 7.29, max: 7.85, postos: 5 }
    },
    'MARABA': {
      etanol: { media: 5.21, min: 4.94, max: 5.39, postos: 9 },
      gasolinaAditivada: { media: 6.89, min: 6.46, max: 7.29, postos: 9 },
      gasolina: { media: 6.76, min: 6.31, max: 7.12, postos: 15 },
      diesel: { media: 6.98, min: 6.29, max: 7.49, postos: 10 },
      dieselS10: { media: 7.15, min: 6.91, max: 7.45, postos: 10 }
    },
    'PARAGOMINAS': {
      etanol: { media: 5.09, min: 4.69, max: 5.49, postos: 2 },
      gasolinaAditivada: { media: 7.17, min: 6.89, max: 7.59, postos: 6 },
      gasolina: { media: 7.1, min: 6.79, max: 7.46, postos: 7 },
      diesel: { media: 6.64, min: 6.29, max: 6.99, postos: 2 },
      dieselS10: { media: 7.09, min: 6.89, max: 7.39, postos: 6 }
    },
    'PARAUAPEBAS': {
      etanol: { media: 5.26, min: 4.95, max: 6.09, postos: 6 },
      gasolinaAditivada: { media: 7.29, min: 6.99, max: 7.57, postos: 6 },
      gasolina: { media: 7.14, min: 6.89, max: 7.29, postos: 7 },
      diesel: { media: 7.72, min: 7.49, max: 7.99, postos: 4 },
      dieselS10: { media: 7.76, min: 7.39, max: 8.11, postos: 6 }
    },
    'SANTAREM': {
      etanol: { media: 4.68, min: 4.47, max: 4.99, postos: 6 },
      gasolinaAditivada: { media: 6.93, min: 6.65, max: 7.59, postos: 10 },
      gasolina: { media: 6.79, min: 6.57, max: 7.09, postos: 12 },
      diesel: { media: 7.19, min: 6.95, max: 7.59, postos: 10 },
      dieselS10: { media: 7.33, min: 6.99, max: 7.65, postos: 9 }
    },
  },
  'PB': {
    'BAYEUX': {
      etanol: { media: 4.73, min: 4.59, max: 4.89, postos: 8 },
      gasolinaAditivada: { media: 6.63, min: 6.49, max: 6.79, postos: 4 },
      gasolina: { media: 6.41, min: 6.29, max: 6.49, postos: 8 },
      gnv: { media: 4.85, min: 4.85, max: 4.86, postos: 4 },
      diesel: { media: 6.89, min: 6.89, max: 6.89, postos: 1 },
      dieselS10: { media: 6.98, min: 6.88, max: 7.09, postos: 7 }
    },
    'CABEDELO': {
      etanol: { media: 4.84, min: 4.57, max: 5.13, postos: 7 },
      gasolinaAditivada: { media: 6.63, min: 6.48, max: 6.79, postos: 6 },
      gasolina: { media: 6.5, min: 6.35, max: 6.79, postos: 7 },
      gnv: { media: 4.85, min: 4.85, max: 4.85, postos: 1 },
      diesel: { media: 6.88, min: 6.76, max: 6.99, postos: 4 },
      dieselS10: { media: 7.22, min: 6.99, max: 7.48, postos: 5 }
    },
    'CAMPINA GRANDE': {
      etanol: { media: 4.76, min: 4.59, max: 4.79, postos: 16 },
      gasolinaAditivada: { media: 6.74, min: 6.59, max: 6.79, postos: 12 },
      gasolina: { media: 6.59, min: 6.49, max: 6.75, postos: 16 },
      gnv: { media: 5.21, min: 5.21, max: 5.21, postos: 3 },
      diesel: { media: 6.84, min: 6.59, max: 7.09, postos: 12 },
      dieselS10: { media: 7.19, min: 7.09, max: 7.49, postos: 15 }
    },
    'JOAO PESSOA': {
      etanol: { media: 4.69, min: 4.57, max: 4.89, postos: 15 },
      gasolinaAditivada: { media: 6.73, min: 6.55, max: 6.96, postos: 13 },
      gasolina: { media: 6.41, min: 6.27, max: 6.55, postos: 19 },
      gnv: { media: 4.85, min: 4.85, max: 4.86, postos: 4 },
      diesel: { media: 6.68, min: 6.28, max: 7.07, postos: 5 },
      dieselS10: { media: 7.04, min: 6.95, max: 7.19, postos: 11 }
    },
    'PATOS': {
      etanol: { media: 4.98, min: 4.89, max: 5.19, postos: 7 },
      gasolinaAditivada: { media: 6.95, min: 6.79, max: 7.19, postos: 6 },
      gasolina: { media: 6.89, min: 6.79, max: 6.99, postos: 9 },
      diesel: { media: 6.91, min: 6.79, max: 7.09, postos: 5 },
      dieselS10: { media: 7.38, min: 7.25, max: 7.49, postos: 6 }
    },
    'SOUSA': {
      etanol: { media: 5.29, min: 5.09, max: 5.39, postos: 4 },
      gasolinaAditivada: { media: 7.02, min: 6.89, max: 7.19, postos: 5 },
      gasolina: { media: 6.95, min: 6.75, max: 7.19, postos: 7 },
      diesel: { media: 7.29, min: 7.19, max: 7.4, postos: 2 },
      dieselS10: { media: 7.35, min: 7.27, max: 7.44, postos: 7 }
    },
  },
  'PE': {
    'ARARIPINA': {
      etanol: { media: 5.59, min: 5.59, max: 5.6, postos: 4 },
      gasolinaAditivada: { media: 7.59, min: 7.49, max: 7.72, postos: 8 },
      gasolina: { media: 7.58, min: 7.49, max: 7.68, postos: 10 },
      dieselS10: { media: 6.99, min: 6.77, max: 7.41, postos: 9 }
    },
    'ARCOVERDE': {
      etanol: { media: 5.09, min: 5.04, max: 5.19, postos: 6 },
      gasolinaAditivada: { media: 6.91, min: 6.89, max: 7.04, postos: 7 },
      gasolina: { media: 6.87, min: 6.79, max: 6.89, postos: 8 },
      diesel: { media: 7.08, min: 7.08, max: 7.08, postos: 1 },
      dieselS10: { media: 7.07, min: 6.99, max: 7.1, postos: 8 }
    },
    'BELO JARDIM': {
      etanol: { media: 4.88, min: 4.79, max: 4.95, postos: 8 },
      gasolinaAditivada: { media: 6.7, min: 6.49, max: 6.99, postos: 5 },
      gasolina: { media: 6.55, min: 6.49, max: 6.77, postos: 8 },
      gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 1 },
      diesel: { media: 6.89, min: 6.89, max: 6.89, postos: 1 },
      dieselS10: { media: 6.91, min: 6.79, max: 7.09, postos: 7 }
    },
    'CABO DE SANTO AGOSTINHO': {
      etanol: { media: 5.15, min: 5.15, max: 5.19, postos: 6 },
      gasolinaAditivada: { media: 7.12, min: 7.02, max: 7.27, postos: 5 },
      gasolina: { media: 6.96, min: 6.92, max: 7.06, postos: 8 },
      gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 3 },
      dieselS10: { media: 6.98, min: 6.84, max: 7.29, postos: 8 }
    },
    'CARUARU': {
      etanol: { media: 4.99, min: 4.89, max: 5.64, postos: 16 },
      gasolinaAditivada: { media: 6.94, min: 6.65, max: 7.19, postos: 11 },
      gasolina: { media: 6.85, min: 6.58, max: 6.99, postos: 17 },
      gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 1 },
      dieselS10: { media: 7.01, min: 6.79, max: 7.49, postos: 16 }
    },
    'GARANHUNS': {
      etanol: { media: 4.88, min: 4.83, max: 4.99, postos: 8 },
      gasolinaAditivada: { media: 6.94, min: 6.74, max: 7.04, postos: 7 },
      gasolina: { media: 6.75, min: 6.73, max: 6.79, postos: 10 },
      dieselS10: { media: 6.93, min: 6.85, max: 6.99, postos: 6 }
    },
    'GOIANA': {
      etanol: { media: 5.15, min: 5.15, max: 5.19, postos: 7 },
      gasolinaAditivada: { media: 7.07, min: 6.89, max: 7.19, postos: 5 },
      gasolina: { media: 6.85, min: 6.85, max: 6.89, postos: 7 },
      gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 3 },
      diesel: { media: 6.79, min: 6.76, max: 6.86, postos: 3 },
      dieselS10: { media: 6.78, min: 6.76, max: 6.86, postos: 6 }
    },
    'IGARASSU': {
      etanol: { media: 5.2, min: 5.15, max: 5.45, postos: 8 },
      gasolinaAditivada: { media: 7.11, min: 7.05, max: 7.25, postos: 4 },
      gasolina: { media: 6.95, min: 6.95, max: 6.99, postos: 8 },
      gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 4 },
      dieselS10: { media: 6.86, min: 6.79, max: 6.99, postos: 8 }
    },
    'LAJEDO': {
      etanol: { media: 4.99, min: 4.69, max: 5.6, postos: 6 },
      gasolinaAditivada: { media: 6.82, min: 6.69, max: 6.89, postos: 4 },
      gasolina: { media: 6.73, min: 6.69, max: 6.79, postos: 11 },
      dieselS10: { media: 6.95, min: 6.69, max: 7.09, postos: 11 }
    },
    'OLINDA': {
      etanol: { media: 5.14, min: 5.14, max: 5.15, postos: 10 },
      gasolinaAditivada: { media: 7.03, min: 6.95, max: 7.1, postos: 7 },
      gasolina: { media: 6.94, min: 6.94, max: 6.95, postos: 10 },
      gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 1 },
      dieselS10: { media: 7.09, min: 6.87, max: 7.49, postos: 7 }
    },
    'PAULISTA': {
      etanol: { media: 5.15, min: 5.11, max: 5.18, postos: 9 },
      gasolinaAditivada: { media: 7.11, min: 7.03, max: 7.17, postos: 7 },
      gasolina: { media: 6.94, min: 6.81, max: 6.98, postos: 9 },
      gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 2 },
      dieselS10: { media: 6.88, min: 6.78, max: 6.99, postos: 9 }
    },
    'PETROLINA': {
      etanol: { media: 5.54, min: 5.47, max: 5.69, postos: 17 },
      gasolinaAditivada: { media: 7.58, min: 7.44, max: 7.78, postos: 17 },
      gasolina: { media: 7.55, min: 7.44, max: 7.59, postos: 17 },
      diesel: { media: 7.55, min: 7.27, max: 7.69, postos: 7 },
      dieselS10: { media: 7.58, min: 7.27, max: 7.69, postos: 14 }
    },
    'RECIFE': {
      etanol: { media: 5.17, min: 5.1, max: 5.27, postos: 26 },
      gasolinaAditivada: { media: 7.13, min: 6.95, max: 7.29, postos: 26 },
      gasolina: { media: 6.96, min: 6.8, max: 6.99, postos: 28 },
      gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 11 },
      dieselS10: { media: 6.95, min: 6.75, max: 7.19, postos: 17 }
    },
    'SALGUEIRO': {
      etanol: { media: 5.55, min: 5.43, max: 5.69, postos: 5 },
      gasolinaAditivada: { media: 7.19, min: 7.14, max: 7.32, postos: 7 },
      gasolina: { media: 7.18, min: 7.14, max: 7.36, postos: 8 },
      dieselS10: { media: 7.01, min: 6.79, max: 7.59, postos: 7 }
    },
    'SERRA TALHADA': {
      etanol: { media: 5.54, min: 4.99, max: 6.59, postos: 5 },
      gasolinaAditivada: { media: 6.89, min: 6.89, max: 6.89, postos: 1 },
      gasolina: { media: 6.85, min: 6.48, max: 7.99, postos: 9 },
      dieselS10: { media: 7.07, min: 6.78, max: 7.99, postos: 9 }
    },
    'VITORIA DE SANTO ANTAO': {
      etanol: { media: 4.92, min: 4.89, max: 5.19, postos: 8 },
      gasolinaAditivada: { media: 6.92, min: 6.78, max: 7.09, postos: 5 },
      gasolina: { media: 6.8, min: 6.78, max: 6.99, postos: 8 },
      gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 2 },
      dieselS10: { media: 6.81, min: 6.79, max: 6.99, postos: 8 }
    },
  },
  'PI': {
    'PARNAIBA': {
      etanol: { media: 4.91, min: 4.79, max: 4.99, postos: 7 },
      gasolinaAditivada: { media: 7.02, min: 6.92, max: 7.28, postos: 7 },
      gasolina: { media: 6.99, min: 6.89, max: 7.19, postos: 12 },
      diesel: { media: 6.9, min: 6.46, max: 7.29, postos: 6 },
      dieselS10: { media: 7.22, min: 6.99, max: 7.65, postos: 7 }
    },
    'PICOS': {
      etanol: { media: 5.26, min: 5.0, max: 5.4, postos: 4 },
      gasolinaAditivada: { media: 6.86, min: 6.7, max: 7.02, postos: 6 },
      gasolina: { media: 6.67, min: 6.5, max: 6.92, postos: 10 },
      diesel: { media: 7.08, min: 6.79, max: 7.49, postos: 6 },
      dieselS10: { media: 7.16, min: 6.97, max: 7.39, postos: 9 }
    },
    'PIRIPIRI': {
      etanol: { media: 5.07, min: 4.99, max: 5.23, postos: 3 },
      gasolinaAditivada: { media: 7.41, min: 6.99, max: 7.69, postos: 5 },
      gasolina: { media: 7.25, min: 6.9, max: 7.69, postos: 8 },
      diesel: { media: 7.49, min: 7.45, max: 7.6, postos: 5 },
      dieselS10: { media: 7.56, min: 7.39, max: 7.9, postos: 8 }
    },
    'TERESINA': {
      etanol: { media: 4.91, min: 4.34, max: 5.29, postos: 27 },
      gasolinaAditivada: { media: 7.13, min: 6.79, max: 7.49, postos: 22 },
      gasolina: { media: 6.8, min: 5.79, max: 6.99, postos: 29 },
      diesel: { media: 7.28, min: 6.84, max: 7.89, postos: 9 },
      dieselS10: { media: 7.42, min: 6.99, max: 7.89, postos: 17 }
    },
  },
  'PR': {
    'APUCARANA': {
      etanol: { media: 4.12, min: 4.07, max: 4.39, postos: 9 },
      gasolinaAditivada: { media: 6.71, min: 6.64, max: 6.79, postos: 9 },
      gasolina: { media: 6.53, min: 6.47, max: 6.69, postos: 9 },
      diesel: { media: 6.84, min: 6.79, max: 6.89, postos: 6 },
      dieselS10: { media: 7.07, min: 6.89, max: 7.27, postos: 9 }
    },
    'ARAPONGAS': {
      etanol: { media: 3.99, min: 3.89, max: 4.19, postos: 9 },
      gasolinaAditivada: { media: 6.73, min: 6.49, max: 6.89, postos: 9 },
      gasolina: { media: 6.5, min: 6.39, max: 6.59, postos: 9 },
      diesel: { media: 6.32, min: 5.79, max: 6.99, postos: 6 },
      dieselS10: { media: 7.11, min: 6.49, max: 7.79, postos: 7 }
    },
    'ARAUCARIA': {
      etanol: { media: 4.6, min: 4.49, max: 4.69, postos: 8 },
      gasolinaAditivada: { media: 6.86, min: 6.49, max: 6.99, postos: 4 },
      gasolina: { media: 6.74, min: 6.49, max: 6.89, postos: 8 },
      diesel: { media: 6.61, min: 6.55, max: 6.65, postos: 3 },
      dieselS10: { media: 6.91, min: 6.69, max: 7.39, postos: 4 }
    },
    'CAMBE': {
      etanol: { media: 4.0, min: 3.77, max: 4.29, postos: 8 },
      gasolinaAditivada: { media: 7.14, min: 6.99, max: 7.39, postos: 4 },
      gasolina: { media: 6.71, min: 6.39, max: 6.89, postos: 8 },
      diesel: { media: 6.65, min: 5.99, max: 6.99, postos: 6 },
      dieselS10: { media: 7.07, min: 6.89, max: 7.19, postos: 3 }
    },
    'CAMPO LARGO': {
      etanol: { media: 4.58, min: 4.29, max: 4.79, postos: 8 },
      gasolinaAditivada: { media: 6.8, min: 6.45, max: 7.19, postos: 7 },
      gasolina: { media: 6.69, min: 6.37, max: 6.99, postos: 8 },
      diesel: { media: 6.27, min: 6.19, max: 6.49, postos: 5 },
      dieselS10: { media: 6.83, min: 6.5, max: 6.89, postos: 7 }
    },
    'CAMPO MOURAO': {
      etanol: { media: 3.75, min: 3.67, max: 3.99, postos: 6 },
      gasolinaAditivada: { media: 6.48, min: 6.15, max: 6.69, postos: 6 },
      gasolina: { media: 6.33, min: 6.15, max: 6.49, postos: 5 },
      diesel: { media: 6.45, min: 5.84, max: 6.99, postos: 4 },
      dieselS10: { media: 6.99, min: 6.44, max: 7.29, postos: 6 }
    },
    'CASCAVEL': {
      etanol: { media: 4.0, min: 3.77, max: 4.19, postos: 17 },
      gasolinaAditivada: { media: 6.76, min: 6.49, max: 7.08, postos: 17 },
      gasolina: { media: 6.53, min: 6.29, max: 6.79, postos: 17 },
      diesel: { media: 6.38, min: 5.79, max: 7.19, postos: 9 },
      dieselS10: { media: 6.85, min: 6.44, max: 7.07, postos: 16 }
    },
    'CASTRO': {
      etanol: { media: 4.75, min: 4.36, max: 4.99, postos: 6 },
      gasolinaAditivada: { media: 7.22, min: 6.99, max: 7.59, postos: 8 },
      gasolina: { media: 7.08, min: 6.87, max: 7.39, postos: 8 },
      diesel: { media: 6.53, min: 6.19, max: 6.99, postos: 6 },
      dieselS10: { media: 7.15, min: 6.89, max: 7.39, postos: 6 }
    },
    'CIANORTE': {
      etanol: { media: 3.89, min: 3.79, max: 3.99, postos: 5 },
      gasolinaAditivada: { media: 6.61, min: 6.39, max: 6.79, postos: 4 },
      gasolina: { media: 6.56, min: 6.39, max: 6.69, postos: 5 },
      diesel: { media: 6.36, min: 6.34, max: 6.39, postos: 2 },
      dieselS10: { media: 6.76, min: 6.64, max: 6.89, postos: 2 }
    },
    'COLOMBO': {
      etanol: { media: 4.76, min: 4.42, max: 4.99, postos: 10 },
      gasolinaAditivada: { media: 7.13, min: 6.79, max: 7.29, postos: 6 },
      gasolina: { media: 6.86, min: 6.75, max: 6.99, postos: 10 },
      gnv: { media: 4.54, min: 4.54, max: 4.54, postos: 1 },
      diesel: { media: 6.46, min: 6.19, max: 6.99, postos: 7 },
      dieselS10: { media: 6.9, min: 6.49, max: 7.19, postos: 8 }
    },
    'CORNELIO PROCOPIO': {
      etanol: { media: 4.47, min: 4.39, max: 4.56, postos: 2 },
      gasolinaAditivada: { media: 6.84, min: 6.79, max: 6.89, postos: 2 },
      gasolina: { media: 6.77, min: 6.69, max: 6.86, postos: 2 },
      diesel: { media: 6.89, min: 6.89, max: 6.89, postos: 1 }
    },
    'CURITIBA': {
      etanol: { media: 4.83, min: 4.39, max: 4.99, postos: 41 },
      gasolinaAditivada: { media: 7.2, min: 6.67, max: 7.45, postos: 30 },
      gasolina: { media: 6.94, min: 6.53, max: 6.99, postos: 48 },
      gnv: { media: 4.54, min: 4.49, max: 4.59, postos: 2 },
      diesel: { media: 6.17, min: 5.79, max: 6.39, postos: 4 },
      dieselS10: { media: 7.14, min: 6.37, max: 7.74, postos: 24 }
    },
    'FOZ DO IGUACU': {
      etanol: { media: 3.87, min: 3.74, max: 3.99, postos: 14 },
      gasolinaAditivada: { media: 6.59, min: 6.19, max: 7.32, postos: 14 },
      gasolina: { media: 6.44, min: 6.19, max: 6.69, postos: 13 },
      diesel: { media: 6.84, min: 6.49, max: 7.29, postos: 7 },
      dieselS10: { media: 7.13, min: 6.79, max: 7.59, postos: 11 }
    },
    'FRANCISCO BELTRAO': {
      etanol: { media: 4.08, min: 3.99, max: 4.39, postos: 8 },
      gasolinaAditivada: { media: 6.49, min: 6.12, max: 6.69, postos: 7 },
      gasolina: { media: 6.34, min: 6.09, max: 6.59, postos: 8 },
      diesel: { media: 6.44, min: 6.29, max: 6.64, postos: 3 },
      dieselS10: { media: 6.87, min: 6.69, max: 7.39, postos: 7 }
    },
    'GUARAPUAVA': {
      etanol: { media: 3.82, min: 3.57, max: 4.69, postos: 14 },
      gasolinaAditivada: { media: 6.56, min: 6.29, max: 6.99, postos: 12 },
      gasolina: { media: 6.4, min: 6.29, max: 6.79, postos: 14 },
      diesel: { media: 6.22, min: 5.87, max: 6.89, postos: 8 },
      dieselS10: { media: 6.86, min: 6.49, max: 7.29, postos: 11 }
    },
    'LONDRINA': {
      etanol: { media: 3.96, min: 3.67, max: 4.59, postos: 18 },
      gasolinaAditivada: { media: 6.81, min: 6.27, max: 7.6, postos: 17 },
      gasolina: { media: 6.58, min: 6.27, max: 7.38, postos: 18 },
      diesel: { media: 6.44, min: 6.09, max: 6.89, postos: 8 },
      dieselS10: { media: 7.12, min: 6.89, max: 7.29, postos: 9 }
    },
    'MARINGA': {
      etanol: { media: 4.01, min: 3.93, max: 4.29, postos: 16 },
      gasolinaAditivada: { media: 7.09, min: 6.93, max: 7.29, postos: 16 },
      gasolina: { media: 6.97, min: 6.93, max: 6.99, postos: 17 },
      diesel: { media: 6.72, min: 6.39, max: 6.99, postos: 3 },
      dieselS10: { media: 7.08, min: 6.45, max: 7.79, postos: 13 }
    },
    'PARANAGUA': {
      etanol: { media: 4.51, min: 4.28, max: 4.79, postos: 7 },
      gasolinaAditivada: { media: 7.13, min: 6.83, max: 7.29, postos: 6 },
      gasolina: { media: 6.69, min: 6.29, max: 6.89, postos: 9 },
      diesel: { media: 6.55, min: 6.14, max: 6.89, postos: 5 },
      dieselS10: { media: 7.09, min: 6.54, max: 7.99, postos: 6 }
    },
    'PARANAVAI': {
      etanol: { media: 3.77, min: 3.55, max: 4.19, postos: 8 },
      gasolinaAditivada: { media: 6.8, min: 6.53, max: 7.15, postos: 5 },
      gasolina: { media: 6.71, min: 6.55, max: 6.89, postos: 5 },
      diesel: { media: 6.47, min: 5.67, max: 6.99, postos: 4 },
      dieselS10: { media: 6.99, min: 6.47, max: 7.53, postos: 5 }
    },
    'PATO BRANCO': {
      etanol: { media: 4.53, min: 4.49, max: 4.59, postos: 8 },
      gasolinaAditivada: { media: 6.78, min: 6.39, max: 6.99, postos: 8 },
      gasolina: { media: 6.62, min: 6.39, max: 6.79, postos: 8 },
      diesel: { media: 6.68, min: 6.55, max: 6.79, postos: 3 },
      dieselS10: { media: 7.35, min: 6.69, max: 7.99, postos: 4 }
    },
    'PONTA GROSSA': {
      etanol: { media: 4.08, min: 3.79, max: 4.39, postos: 16 },
      gasolinaAditivada: { media: 6.67, min: 6.19, max: 6.99, postos: 15 },
      gasolina: { media: 6.44, min: 6.19, max: 6.59, postos: 16 },
      gnv: { media: 4.56, min: 4.39, max: 4.73, postos: 2 },
      diesel: { media: 6.24, min: 5.79, max: 6.95, postos: 9 },
      dieselS10: { media: 6.77, min: 6.39, max: 6.99, postos: 16 }
    },
    'SANTO ANTONIO DA PLATINA': {
      etanol: { media: 4.47, min: 4.24, max: 4.69, postos: 5 },
      gasolinaAditivada: { media: 6.86, min: 6.84, max: 6.89, postos: 2 },
      gasolina: { media: 6.85, min: 6.74, max: 6.99, postos: 5 },
      diesel: { media: 6.32, min: 5.99, max: 6.99, postos: 4 },
      dieselS10: { media: 6.67, min: 6.54, max: 6.89, postos: 3 }
    },
    'SAO JOSE DOS PINHAIS': {
      etanol: { media: 4.79, min: 4.59, max: 4.99, postos: 14 },
      gasolinaAditivada: { media: 7.07, min: 6.89, max: 7.39, postos: 8 },
      gasolina: { media: 6.88, min: 6.64, max: 6.99, postos: 13 },
      gnv: { media: 4.54, min: 4.49, max: 4.59, postos: 2 },
      diesel: { media: 6.26, min: 5.69, max: 6.89, postos: 8 },
      dieselS10: { media: 6.83, min: 6.37, max: 7.49, postos: 9 }
    },
    'TOLEDO': {
      etanol: { media: 3.99, min: 3.59, max: 4.62, postos: 13 },
      gasolinaAditivada: { media: 6.66, min: 6.29, max: 7.36, postos: 11 },
      gasolina: { media: 6.57, min: 6.29, max: 7.15, postos: 10 },
      diesel: { media: 6.38, min: 5.99, max: 7.29, postos: 8 },
      dieselS10: { media: 6.91, min: 6.49, max: 7.69, postos: 9 }
    },
    'UMUARAMA': {
      etanol: { media: 4.01, min: 3.91, max: 4.24, postos: 13 },
      gasolinaAditivada: { media: 6.71, min: 6.54, max: 7.09, postos: 8 },
      gasolina: { media: 6.59, min: 6.49, max: 6.89, postos: 12 },
      diesel: { media: 6.03, min: 5.71, max: 6.69, postos: 7 },
      dieselS10: { media: 6.64, min: 6.45, max: 6.89, postos: 7 }
    },
    'UNIAO DA VITORIA': {
      etanol: { media: 4.73, min: 4.19, max: 4.99, postos: 8 },
      gasolinaAditivada: { media: 6.91, min: 6.53, max: 7.19, postos: 6 },
      gasolina: { media: 6.81, min: 6.38, max: 6.99, postos: 8 },
      diesel: { media: 7.1, min: 5.89, max: 7.66, postos: 7 },
      dieselS10: { media: 7.53, min: 6.89, max: 7.88, postos: 4 }
    },
  },
  'RJ': {
    'ANGRA DOS REIS': {
      etanol: { media: 5.64, min: 5.59, max: 5.73, postos: 4 },
      gasolinaAditivada: { media: 7.29, min: 7.18, max: 7.55, postos: 7 },
      gasolina: { media: 7.12, min: 6.93, max: 7.39, postos: 8 },
      gnv: { media: 5.89, min: 5.89, max: 5.89, postos: 1 },
      diesel: { media: 7.41, min: 7.29, max: 7.49, postos: 3 },
      dieselS10: { media: 7.82, min: 7.79, max: 7.85, postos: 3 }
    },
    'ARARUAMA': {
      etanol: { media: 5.01, min: 4.59, max: 5.49, postos: 7 },
      gasolinaAditivada: { media: 6.99, min: 6.89, max: 7.09, postos: 6 },
      gasolina: { media: 6.97, min: 6.89, max: 7.09, postos: 7 },
      gnv: { media: 6.03, min: 5.79, max: 6.28, postos: 2 },
      diesel: { media: 6.91, min: 6.87, max: 6.99, postos: 3 },
      dieselS10: { media: 7.34, min: 6.99, max: 7.59, postos: 7 }
    },
    'BARRA DO PIRAI': {
      etanol: { media: 5.09, min: 4.89, max: 5.29, postos: 3 },
      gasolinaAditivada: { media: 7.04, min: 6.89, max: 7.17, postos: 4 },
      gasolina: { media: 6.91, min: 6.79, max: 6.99, postos: 4 },
      gnv: { media: 4.94, min: 4.89, max: 4.99, postos: 2 },
      diesel: { media: 7.6, min: 7.59, max: 7.64, postos: 3 },
      dieselS10: { media: 7.5, min: 6.99, max: 7.69, postos: 4 }
    },
    'BARRA MANSA': {
      etanol: { media: 4.85, min: 4.69, max: 5.19, postos: 9 },
      gasolinaAditivada: { media: 6.96, min: 6.69, max: 7.09, postos: 9 },
      gasolina: { media: 6.89, min: 6.59, max: 6.99, postos: 10 },
      gnv: { media: 4.59, min: 4.44, max: 4.89, postos: 3 },
      diesel: { media: 7.26, min: 6.89, max: 8.35, postos: 6 },
      dieselS10: { media: 7.39, min: 6.99, max: 8.69, postos: 7 }
    },
    'BELFORD ROXO': {
      etanol: { media: 4.8, min: 4.39, max: 5.19, postos: 7 },
      gasolinaAditivada: { media: 6.69, min: 6.49, max: 6.99, postos: 8 },
      gasolina: { media: 6.52, min: 6.29, max: 6.79, postos: 8 },
      gnv: { media: 4.4, min: 4.18, max: 4.59, postos: 5 },
      diesel: { media: 6.89, min: 6.89, max: 6.89, postos: 2 },
      dieselS10: { media: 6.96, min: 6.69, max: 7.14, postos: 6 }
    },
    'CABO FRIO': {
      etanol: { media: 5.15, min: 4.98, max: 5.38, postos: 8 },
      gasolinaAditivada: { media: 7.1, min: 6.79, max: 7.38, postos: 8 },
      gasolina: { media: 6.9, min: 6.78, max: 6.98, postos: 8 },
      gnv: { media: 4.98, min: 4.98, max: 4.99, postos: 6 },
      diesel: { media: 7.42, min: 7.29, max: 7.59, postos: 3 },
      dieselS10: { media: 7.29, min: 7.19, max: 7.49, postos: 3 }
    },
    'ITABORAI': {
      etanol: { media: 4.67, min: 4.39, max: 5.19, postos: 8 },
      gasolinaAditivada: { media: 6.71, min: 6.39, max: 7.3, postos: 8 },
      gasolina: { media: 6.64, min: 6.36, max: 7.19, postos: 10 },
      gnv: { media: 4.39, min: 4.08, max: 4.77, postos: 9 },
      diesel: { media: 6.7, min: 6.55, max: 6.89, postos: 8 },
      dieselS10: { media: 6.9, min: 6.24, max: 7.29, postos: 9 }
    },
    'ITAPERUNA': {
      etanol: { media: 4.78, min: 4.75, max: 4.85, postos: 6 },
      gasolinaAditivada: { media: 6.96, min: 6.85, max: 7.09, postos: 6 },
      gasolina: { media: 6.88, min: 6.77, max: 6.99, postos: 6 },
      gnv: { media: 6.49, min: 6.49, max: 6.49, postos: 1 },
      diesel: { media: 7.34, min: 7.19, max: 7.39, postos: 4 },
      dieselS10: { media: 7.5, min: 7.39, max: 7.59, postos: 6 }
    },
    'MACAE': {
      etanol: { media: 5.31, min: 5.25, max: 5.49, postos: 7 },
      gasolinaAditivada: { media: 7.03, min: 6.75, max: 7.29, postos: 9 },
      gasolina: { media: 6.8, min: 6.69, max: 6.99, postos: 9 },
      gnv: { media: 4.88, min: 4.85, max: 4.95, postos: 4 },
      diesel: { media: 7.53, min: 7.49, max: 7.65, postos: 4 },
      dieselS10: { media: 7.7, min: 7.55, max: 7.79, postos: 5 }
    },
    'MARICA': {
      etanol: { media: 4.39, min: 4.39, max: 4.39, postos: 1 },
      gasolinaAditivada: { media: 7.04, min: 6.89, max: 7.19, postos: 2 },
      gasolina: { media: 6.94, min: 6.89, max: 6.99, postos: 2 },
      diesel: { media: 6.89, min: 6.89, max: 6.89, postos: 1 },
      dieselS10: { media: 6.99, min: 6.99, max: 6.99, postos: 1 }
    },
    'NITEROI': {
      etanol: { media: 4.7, min: 4.49, max: 5.19, postos: 15 },
      gasolinaAditivada: { media: 6.77, min: 6.49, max: 6.89, postos: 15 },
      gasolina: { media: 6.62, min: 6.36, max: 6.89, postos: 17 },
      gnv: { media: 4.31, min: 3.99, max: 4.49, postos: 7 },
      diesel: { media: 6.99, min: 6.89, max: 7.29, postos: 4 },
      dieselS10: { media: 7.0, min: 6.79, max: 7.39, postos: 10 }
    },
    'NOVA FRIBURGO': {
      etanol: { media: 5.01, min: 4.77, max: 5.49, postos: 10 },
      gasolinaAditivada: { media: 7.19, min: 6.85, max: 7.49, postos: 9 },
      gasolina: { media: 7.03, min: 6.85, max: 7.25, postos: 11 },
      diesel: { media: 7.22, min: 6.69, max: 7.89, postos: 6 },
      dieselS10: { media: 7.49, min: 6.99, max: 7.99, postos: 6 }
    },
    'NOVA IGUACU': {
      etanol: { media: 4.82, min: 4.59, max: 5.07, postos: 13 },
      gasolinaAditivada: { media: 6.77, min: 6.39, max: 7.69, postos: 14 },
      gasolina: { media: 6.55, min: 6.29, max: 6.99, postos: 14 },
      gnv: { media: 4.41, min: 4.19, max: 4.67, postos: 8 },
      diesel: { media: 6.83, min: 6.59, max: 7.02, postos: 3 },
      dieselS10: { media: 7.17, min: 6.69, max: 7.99, postos: 12 }
    },
    'PETROPOLIS': {
      etanol: { media: 5.54, min: 5.49, max: 5.69, postos: 13 },
      gasolinaAditivada: { media: 7.33, min: 7.18, max: 7.49, postos: 14 },
      gasolina: { media: 7.23, min: 7.16, max: 7.29, postos: 14 },
      gnv: { media: 5.17, min: 5.09, max: 5.19, postos: 5 },
      diesel: { media: 6.82, min: 6.69, max: 6.89, postos: 5 },
      dieselS10: { media: 6.93, min: 6.79, max: 6.99, postos: 11 }
    },
    'RESENDE': {
      etanol: { media: 4.68, min: 4.39, max: 5.19, postos: 8 },
      gasolinaAditivada: { media: 6.83, min: 6.57, max: 7.14, postos: 7 },
      gasolina: { media: 6.64, min: 6.37, max: 6.99, postos: 8 },
      gnv: { media: 4.21, min: 4.09, max: 4.39, postos: 6 },
      diesel: { media: 6.31, min: 6.19, max: 6.39, postos: 4 },
      dieselS10: { media: 7.0, min: 6.54, max: 7.59, postos: 8 }
    },
    'RIO BONITO': {
      etanol: { media: 4.76, min: 4.38, max: 4.99, postos: 6 },
      gasolinaAditivada: { media: 6.94, min: 6.85, max: 7.08, postos: 5 },
      gasolina: { media: 6.8, min: 6.69, max: 6.89, postos: 6 },
      gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      diesel: { media: 7.05, min: 6.78, max: 7.49, postos: 3 },
      dieselS10: { media: 7.26, min: 6.99, max: 7.59, postos: 4 }
    },
    'RIO DE JANEIRO': {
      etanol: { media: 4.82, min: 4.29, max: 5.89, postos: 64 },
      gasolinaAditivada: { media: 6.85, min: 6.09, max: 8.19, postos: 70 },
      gasolina: { media: 6.58, min: 5.99, max: 7.99, postos: 81 },
      gnv: { media: 4.32, min: 3.97, max: 4.79, postos: 52 },
      diesel: { media: 7.11, min: 6.49, max: 7.87, postos: 13 },
      dieselS10: { media: 7.13, min: 5.69, max: 7.99, postos: 41 }
    },
    'SANTO ANTONIO DE PADUA': {
      etanol: { media: 4.56, min: 4.19, max: 5.09, postos: 10 },
      gasolinaAditivada: { media: 6.76, min: 6.57, max: 7.09, postos: 9 },
      gasolina: { media: 6.72, min: 6.45, max: 6.89, postos: 10 },
      gnv: { media: 5.98, min: 5.98, max: 5.98, postos: 1 },
      diesel: { media: 7.02, min: 6.65, max: 7.99, postos: 7 },
      dieselS10: { media: 7.37, min: 6.99, max: 7.99, postos: 7 }
    },
    'SAO GONCALO': {
      etanol: { media: 4.75, min: 4.39, max: 5.24, postos: 11 },
      gasolinaAditivada: { media: 6.81, min: 6.59, max: 6.89, postos: 15 },
      gasolina: { media: 6.69, min: 6.39, max: 6.89, postos: 17 },
      gnv: { media: 4.33, min: 4.09, max: 4.49, postos: 7 },
      diesel: { media: 6.98, min: 6.89, max: 7.25, postos: 8 },
      dieselS10: { media: 7.0, min: 6.79, max: 7.29, postos: 7 }
    },
    'SAO JOAO DE MERITI': {
      etanol: { media: 4.62, min: 4.39, max: 4.79, postos: 10 },
      gasolinaAditivada: { media: 6.61, min: 6.29, max: 6.89, postos: 10 },
      gasolina: { media: 6.44, min: 6.29, max: 6.79, postos: 10 },
      gnv: { media: 4.35, min: 4.07, max: 4.69, postos: 7 },
      diesel: { media: 6.83, min: 6.79, max: 6.87, postos: 2 },
      dieselS10: { media: 6.82, min: 6.59, max: 6.99, postos: 5 }
    },
    'SAQUAREMA': {
      etanol: { media: 5.03, min: 4.98, max: 5.09, postos: 2 },
      gasolinaAditivada: { media: 7.11, min: 7.09, max: 7.14, postos: 2 },
      gasolina: { media: 6.98, min: 6.98, max: 6.99, postos: 2 },
      gnv: { media: 5.98, min: 5.79, max: 6.17, postos: 2 },
      diesel: { media: 7.37, min: 7.37, max: 7.37, postos: 1 },
      dieselS10: { media: 7.63, min: 7.59, max: 7.67, postos: 2 }
    },
    'TRES RIOS': {
      etanol: { media: 4.96, min: 4.89, max: 5.09, postos: 7 },
      gasolinaAditivada: { media: 7.06, min: 6.84, max: 7.19, postos: 7 },
      gasolina: { media: 6.9, min: 6.69, max: 6.99, postos: 7 },
      gnv: { media: 5.95, min: 5.89, max: 5.99, postos: 3 },
      diesel: { media: 6.83, min: 6.64, max: 7.18, postos: 3 },
      dieselS10: { media: 6.91, min: 6.79, max: 6.99, postos: 4 }
    },
    'VALENCA': {
      etanol: { media: 4.98, min: 4.89, max: 5.09, postos: 6 },
      gasolinaAditivada: { media: 6.9, min: 6.69, max: 7.18, postos: 8 },
      gasolina: { media: 6.8, min: 6.69, max: 6.98, postos: 8 },
      gnv: { media: 5.98, min: 5.98, max: 5.98, postos: 1 },
      diesel: { media: 7.02, min: 6.99, max: 7.05, postos: 5 },
      dieselS10: { media: 7.31, min: 7.29, max: 7.39, postos: 5 }
    },
    'VOLTA REDONDA': {
      etanol: { media: 4.99, min: 4.68, max: 5.15, postos: 10 },
      gasolinaAditivada: { media: 7.0, min: 6.89, max: 7.19, postos: 11 },
      gasolina: { media: 6.92, min: 6.64, max: 6.99, postos: 11 },
      gnv: { media: 4.89, min: 4.89, max: 4.89, postos: 4 },
      diesel: { media: 7.04, min: 6.79, max: 7.19, postos: 3 },
      dieselS10: { media: 7.29, min: 6.98, max: 7.49, postos: 9 }
    },
  },
  'RN': {
    'CAICO': {
      etanol: { media: 6.03, min: 5.95, max: 6.29, postos: 6 },
      gasolinaAditivada: { media: 6.86, min: 6.45, max: 7.29, postos: 5 },
      gasolina: { media: 6.77, min: 6.45, max: 7.59, postos: 8 },
      diesel: { media: 7.57, min: 7.49, max: 7.59, postos: 6 },
      dieselS10: { media: 7.65, min: 7.59, max: 7.99, postos: 8 }
    },
    'MOSSORO': {
      etanol: { media: 5.57, min: 5.39, max: 5.87, postos: 14 },
      gasolinaAditivada: { media: 7.07, min: 6.99, max: 7.19, postos: 10 },
      gasolina: { media: 6.98, min: 6.98, max: 6.99, postos: 14 },
      gnv: { media: 5.09, min: 5.09, max: 5.09, postos: 1 },
      diesel: { media: 7.06, min: 6.79, max: 7.19, postos: 8 },
      dieselS10: { media: 7.17, min: 6.97, max: 7.3, postos: 8 }
    },
    'NATAL': {
      etanol: { media: 5.49, min: 5.29, max: 5.69, postos: 7 },
      gasolinaAditivada: { media: 6.96, min: 6.62, max: 7.19, postos: 7 },
      gasolina: { media: 6.95, min: 6.62, max: 7.15, postos: 7 },
      gnv: { media: 5.09, min: 5.09, max: 5.09, postos: 1 },
      diesel: { media: 7.05, min: 6.89, max: 7.29, postos: 3 },
      dieselS10: { media: 7.44, min: 7.39, max: 7.69, postos: 6 }
    },
    'PARNAMIRIM': {
      etanol: { media: 5.49, min: 5.49, max: 5.49, postos: 2 },
      gasolinaAditivada: { media: 7.04, min: 6.99, max: 7.09, postos: 2 },
      gasolina: { media: 6.99, min: 6.99, max: 6.99, postos: 2 },
      diesel: { media: 6.99, min: 6.99, max: 6.99, postos: 2 },
      dieselS10: { media: 6.99, min: 6.99, max: 6.99, postos: 1 }
    },
  },
  'RO': {
    'CACOAL': {
      etanol: { media: 5.46, min: 5.38, max: 5.69, postos: 7 },
      gasolinaAditivada: { media: 7.31, min: 7.22, max: 7.37, postos: 7 },
      gasolina: { media: 7.21, min: 7.18, max: 7.24, postos: 8 },
      diesel: { media: 7.07, min: 6.6, max: 7.48, postos: 7 },
      dieselS10: { media: 7.28, min: 6.99, max: 7.59, postos: 5 }
    },
    'JI-PARANA': {
      etanol: { media: 5.36, min: 5.19, max: 5.74, postos: 4 },
      gasolinaAditivada: { media: 7.43, min: 7.14, max: 7.98, postos: 10 },
      gasolina: { media: 7.15, min: 7.04, max: 7.39, postos: 11 },
      diesel: { media: 7.39, min: 6.57, max: 7.94, postos: 10 },
      dieselS10: { media: 7.62, min: 6.98, max: 7.98, postos: 9 }
    },
    'PIMENTA BUENO': {
      etanol: { media: 5.79, min: 5.79, max: 5.79, postos: 6 },
      gasolinaAditivada: { media: 7.47, min: 7.43, max: 7.49, postos: 7 },
      gasolina: { media: 7.38, min: 7.37, max: 7.39, postos: 8 },
      diesel: { media: 7.06, min: 6.9, max: 7.15, postos: 6 },
      dieselS10: { media: 7.16, min: 7.15, max: 7.17, postos: 8 }
    },
    'PORTO VELHO': {
      etanol: { media: 5.57, min: 5.3, max: 5.99, postos: 12 },
      gasolinaAditivada: { media: 7.6, min: 7.45, max: 7.99, postos: 16 },
      gasolina: { media: 7.49, min: 7.35, max: 7.89, postos: 19 },
      diesel: { media: 7.26, min: 6.59, max: 7.84, postos: 11 },
      dieselS10: { media: 7.35, min: 6.75, max: 7.89, postos: 18 }
    },
    'VILHENA': {
      etanol: { media: 5.79, min: 5.6, max: 5.99, postos: 4 },
      gasolinaAditivada: { media: 7.42, min: 7.24, max: 7.49, postos: 8 },
      gasolina: { media: 7.38, min: 7.33, max: 7.4, postos: 7 },
      diesel: { media: 7.24, min: 6.95, max: 7.44, postos: 4 },
      dieselS10: { media: 7.35, min: 7.0, max: 7.44, postos: 6 }
    },
  },
  'RR': {
    'BOA VISTA': {
      etanol: { media: 5.44, min: 5.43, max: 5.45, postos: 8 },
      gasolinaAditivada: { media: 7.78, min: 7.7, max: 7.84, postos: 15 },
      gasolina: { media: 7.69, min: 7.69, max: 7.7, postos: 15 },
      diesel: { media: 7.47, min: 7.4, max: 7.64, postos: 12 },
      dieselS10: { media: 7.51, min: 7.45, max: 7.7, postos: 11 }
    },
  },
  'RS': {
    'ALEGRETE': {
      etanol: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      gasolinaAditivada: { media: 6.86, min: 6.69, max: 6.99, postos: 6 },
      gasolina: { media: 6.69, min: 6.49, max: 6.89, postos: 6 },
      diesel: { media: 6.71, min: 6.19, max: 6.99, postos: 5 },
      dieselS10: { media: 6.86, min: 6.59, max: 7.01, postos: 3 }
    },
    'ALVORADA': {
      etanol: { media: 4.74, min: 4.49, max: 4.99, postos: 2 },
      gasolinaAditivada: { media: 6.65, min: 6.39, max: 6.89, postos: 5 },
      gasolina: { media: 6.37, min: 6.19, max: 6.59, postos: 6 },
      diesel: { media: 6.43, min: 6.36, max: 6.49, postos: 4 },
      dieselS10: { media: 6.72, min: 6.69, max: 6.79, postos: 3 }
    },
    'BAGE': {
      etanol: { media: 5.41, min: 5.29, max: 5.67, postos: 6 },
      gasolinaAditivada: { media: 7.52, min: 7.36, max: 7.66, postos: 9 },
      gasolina: { media: 7.31, min: 7.06, max: 7.66, postos: 9 },
      diesel: { media: 7.52, min: 7.25, max: 7.91, postos: 6 },
      dieselS10: { media: 7.56, min: 7.35, max: 8.04, postos: 5 }
    },
    'BENTO GONCALVES': {
      etanol: { media: 4.75, min: 4.29, max: 4.99, postos: 5 },
      gasolinaAditivada: { media: 6.64, min: 6.39, max: 6.69, postos: 10 },
      gasolina: { media: 6.37, min: 6.3, max: 6.39, postos: 10 },
      gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      diesel: { media: 6.37, min: 5.99, max: 6.79, postos: 7 },
      dieselS10: { media: 6.67, min: 6.49, max: 6.89, postos: 8 }
    },
    'CACHOEIRA DO SUL': {
      etanol: { media: 4.82, min: 4.66, max: 4.99, postos: 2 },
      gasolinaAditivada: { media: 6.47, min: 6.35, max: 6.59, postos: 8 },
      gasolina: { media: 6.23, min: 5.99, max: 6.29, postos: 8 },
      diesel: { media: 6.53, min: 6.28, max: 6.79, postos: 6 },
      dieselS10: { media: 6.65, min: 6.59, max: 6.89, postos: 5 }
    },
    'CACHOEIRINHA': {
      etanol: { media: 4.49, min: 4.49, max: 4.49, postos: 1 },
      gasolinaAditivada: { media: 6.71, min: 6.49, max: 6.79, postos: 5 },
      gasolina: { media: 6.44, min: 6.29, max: 6.49, postos: 5 },
      diesel: { media: 6.62, min: 6.49, max: 6.69, postos: 3 },
      dieselS10: { media: 6.65, min: 6.59, max: 6.79, postos: 3 }
    },
    'CANOAS': {
      etanol: { media: 4.57, min: 4.29, max: 5.19, postos: 7 },
      gasolinaAditivada: { media: 6.66, min: 6.34, max: 6.96, postos: 12 },
      gasolina: { media: 6.54, min: 6.39, max: 6.96, postos: 16 },
      gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      diesel: { media: 6.52, min: 5.99, max: 6.99, postos: 6 },
      dieselS10: { media: 6.9, min: 6.49, max: 7.96, postos: 6 }
    },
    'CAXIAS DO SUL': {
      etanol: { media: 4.94, min: 4.19, max: 5.39, postos: 7 },
      gasolinaAditivada: { media: 6.52, min: 6.29, max: 6.69, postos: 18 },
      gasolina: { media: 6.29, min: 6.19, max: 6.49, postos: 19 },
      gnv: { media: 5.81, min: 5.81, max: 5.81, postos: 1 },
      diesel: { media: 6.58, min: 5.99, max: 6.89, postos: 6 },
      dieselS10: { media: 6.73, min: 6.09, max: 6.99, postos: 10 }
    },
    'CRUZ ALTA': {
      gasolinaAditivada: { media: 5.98, min: 5.98, max: 5.98, postos: 2 },
      gasolina: { media: 5.98, min: 5.98, max: 5.98, postos: 2 },
      diesel: { media: 6.59, min: 6.59, max: 6.59, postos: 1 },
      dieselS10: { media: 6.79, min: 6.79, max: 6.79, postos: 2 }
    },
    'ERECHIM': {
      etanol: { media: 5.19, min: 4.8, max: 5.79, postos: 3 },
      gasolinaAditivada: { media: 6.59, min: 6.24, max: 6.89, postos: 11 },
      gasolina: { media: 6.35, min: 6.09, max: 6.7, postos: 11 },
      diesel: { media: 6.67, min: 6.14, max: 7.18, postos: 10 },
      dieselS10: { media: 6.89, min: 6.65, max: 7.25, postos: 10 }
    },
    'ESTEIO': {
      etanol: { media: 4.72, min: 4.39, max: 4.89, postos: 3 },
      gasolinaAditivada: { media: 6.67, min: 6.33, max: 6.96, postos: 6 },
      gasolina: { media: 6.46, min: 6.36, max: 6.66, postos: 7 },
      gnv: { media: 4.69, min: 4.69, max: 4.69, postos: 1 },
      diesel: { media: 6.65, min: 6.29, max: 6.89, postos: 3 },
      dieselS10: { media: 6.79, min: 6.49, max: 6.99, postos: 3 }
    },
    'GRAMADO': {
      etanol: { media: 5.24, min: 4.99, max: 5.49, postos: 4 },
      gasolinaAditivada: { media: 7.02, min: 6.89, max: 7.19, postos: 7 },
      gasolina: { media: 6.8, min: 6.69, max: 6.99, postos: 7 }
    },
    'GRAVATAI': {
      etanol: { media: 4.19, min: 4.19, max: 4.19, postos: 1 },
      gasolinaAditivada: { media: 6.77, min: 6.66, max: 6.89, postos: 5 },
      gasolina: { media: 6.49, min: 6.46, max: 6.59, postos: 5 },
      gnv: { media: 4.89, min: 4.89, max: 4.89, postos: 1 },
      diesel: { media: 6.35, min: 5.99, max: 6.79, postos: 3 },
      dieselS10: { media: 6.65, min: 6.49, max: 6.99, postos: 3 }
    },
    'GUAIBA': {
      etanol: { media: 4.58, min: 4.34, max: 4.89, postos: 7 },
      gasolinaAditivada: { media: 6.31, min: 6.17, max: 6.47, postos: 8 },
      gasolina: { media: 6.18, min: 6.05, max: 6.27, postos: 8 },
      diesel: { media: 6.52, min: 6.39, max: 6.69, postos: 7 },
      dieselS10: { media: 6.69, min: 6.59, max: 6.79, postos: 8 }
    },
    'IJUI': {
      etanol: { media: 5.06, min: 4.59, max: 5.83, postos: 3 },
      gasolinaAditivada: { media: 6.54, min: 6.29, max: 6.88, postos: 6 },
      gasolina: { media: 6.33, min: 5.87, max: 6.76, postos: 6 },
      diesel: { media: 6.64, min: 6.09, max: 7.19, postos: 7 },
      dieselS10: { media: 6.82, min: 6.29, max: 7.29, postos: 6 }
    },
    'LAJEADO': {
      etanol: { media: 5.06, min: 4.99, max: 5.19, postos: 5 },
      gasolinaAditivada: { media: 6.5, min: 6.4, max: 6.69, postos: 10 },
      gasolina: { media: 6.31, min: 6.23, max: 6.43, postos: 10 },
      diesel: { media: 6.41, min: 6.18, max: 6.65, postos: 6 },
      dieselS10: { media: 6.7, min: 6.35, max: 6.99, postos: 9 }
    },
    'NOVO HAMBURGO': {
      etanol: { media: 4.3, min: 4.15, max: 4.79, postos: 7 },
      gasolinaAditivada: { media: 6.55, min: 6.45, max: 6.79, postos: 11 },
      gasolina: { media: 6.46, min: 6.45, max: 6.49, postos: 12 },
      diesel: { media: 5.87, min: 5.79, max: 5.99, postos: 5 },
      dieselS10: { media: 6.42, min: 6.15, max: 6.89, postos: 11 }
    },
    'OSORIO': {
      etanol: { media: 4.47, min: 4.15, max: 4.79, postos: 2 },
      gasolinaAditivada: { media: 6.45, min: 6.19, max: 6.79, postos: 3 },
      gasolina: { media: 6.29, min: 6.19, max: 6.39, postos: 3 },
      diesel: { media: 5.92, min: 5.69, max: 6.09, postos: 3 },
      dieselS10: { media: 6.32, min: 6.15, max: 6.49, postos: 3 }
    },
    'PELOTAS': {
      etanol: { media: 4.79, min: 4.49, max: 4.89, postos: 7 },
      gasolinaAditivada: { media: 6.82, min: 6.29, max: 6.99, postos: 16 },
      gasolina: { media: 6.63, min: 6.29, max: 6.89, postos: 17 },
      diesel: { media: 6.88, min: 6.37, max: 7.69, postos: 11 },
      dieselS10: { media: 7.09, min: 6.69, max: 7.79, postos: 14 }
    },
    'PORTO ALEGRE': {
      etanol: { media: 4.56, min: 4.15, max: 5.39, postos: 24 },
      gasolinaAditivada: { media: 6.49, min: 5.97, max: 6.89, postos: 31 },
      gasolina: { media: 6.3, min: 5.69, max: 6.59, postos: 36 },
      gnv: { media: 4.81, min: 4.64, max: 4.99, postos: 7 },
      diesel: { media: 6.27, min: 5.86, max: 6.69, postos: 3 },
      dieselS10: { media: 6.6, min: 6.35, max: 6.89, postos: 13 }
    },
    'SANTA CRUZ DO SUL': {
      etanol: { media: 5.17, min: 4.89, max: 5.93, postos: 4 },
      gasolinaAditivada: { media: 6.84, min: 6.64, max: 6.99, postos: 14 },
      gasolina: { media: 6.64, min: 6.44, max: 6.69, postos: 14 },
      diesel: { media: 6.63, min: 6.16, max: 6.89, postos: 10 },
      dieselS10: { media: 6.99, min: 6.79, max: 7.39, postos: 11 }
    },
    'SANTA MARIA': {
      etanol: { media: 5.05, min: 4.89, max: 5.39, postos: 8 },
      gasolinaAditivada: { media: 6.65, min: 6.29, max: 7.09, postos: 13 },
      gasolina: { media: 6.37, min: 5.98, max: 6.69, postos: 14 },
      diesel: { media: 7.23, min: 6.29, max: 7.99, postos: 9 },
      dieselS10: { media: 7.37, min: 6.59, max: 7.99, postos: 11 }
    },
    'SANTA ROSA': {
      etanol: { media: 5.19, min: 4.99, max: 5.39, postos: 2 },
      gasolinaAditivada: { media: 6.88, min: 6.79, max: 7.15, postos: 7 },
      gasolina: { media: 6.7, min: 6.59, max: 6.83, postos: 7 },
      diesel: { media: 6.58, min: 6.09, max: 6.89, postos: 7 },
      dieselS10: { media: 6.79, min: 6.29, max: 7.05, postos: 6 }
    },
    'SANTANA DO LIVRAMENTO': {
      etanol: { media: 5.87, min: 5.49, max: 5.99, postos: 7 },
      gasolinaAditivada: { media: 7.09, min: 6.93, max: 7.19, postos: 9 },
      gasolina: { media: 6.95, min: 6.79, max: 7.09, postos: 9 },
      diesel: { media: 7.14, min: 6.89, max: 7.19, postos: 6 },
      dieselS10: { media: 7.2, min: 6.99, max: 7.29, postos: 8 }
    },
    'SANTO ANGELO': {
      etanol: { media: 5.18, min: 4.69, max: 5.99, postos: 5 },
      gasolinaAditivada: { media: 6.89, min: 6.58, max: 7.44, postos: 8 },
      gasolina: { media: 6.73, min: 6.5, max: 7.29, postos: 8 },
      diesel: { media: 6.72, min: 6.45, max: 7.19, postos: 7 },
      dieselS10: { media: 6.96, min: 6.78, max: 7.39, postos: 7 }
    },
    'SAO GABRIEL': {
      etanol: { media: 4.84, min: 4.84, max: 4.84, postos: 1 },
      gasolinaAditivada: { media: 6.76, min: 6.57, max: 6.96, postos: 7 },
      gasolina: { media: 6.58, min: 6.47, max: 6.66, postos: 7 },
      diesel: { media: 6.71, min: 6.38, max: 7.74, postos: 5 },
      dieselS10: { media: 7.04, min: 6.69, max: 7.84, postos: 6 }
    },
    'SAO LEOPOLDO': {
      etanol: { media: 4.5, min: 4.29, max: 4.59, postos: 5 },
      gasolinaAditivada: { media: 6.66, min: 6.45, max: 6.79, postos: 9 },
      gasolina: { media: 6.45, min: 6.29, max: 6.49, postos: 10 },
      gnv: { media: 4.94, min: 4.89, max: 4.99, postos: 2 },
      diesel: { media: 6.3, min: 5.95, max: 6.79, postos: 6 },
      dieselS10: { media: 6.55, min: 6.25, max: 6.89, postos: 7 }
    },
    'SAO LUIZ GONZAGA': {
      etanol: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      gasolinaAditivada: { media: 6.84, min: 6.74, max: 6.99, postos: 3 },
      gasolina: { media: 6.69, min: 6.59, max: 6.79, postos: 3 },
      diesel: { media: 6.77, min: 6.65, max: 6.89, postos: 3 },
      dieselS10: { media: 6.91, min: 6.75, max: 6.99, postos: 3 }
    },
    'SAPIRANGA': {
      etanol: { media: 4.41, min: 4.15, max: 4.69, postos: 5 },
      gasolinaAditivada: { media: 6.52, min: 6.39, max: 6.69, postos: 7 },
      gasolina: { media: 6.4, min: 6.27, max: 6.49, postos: 8 },
      diesel: { media: 6.11, min: 5.79, max: 6.39, postos: 4 },
      dieselS10: { media: 6.6, min: 6.35, max: 6.89, postos: 4 }
    },
    'SAPUCAIA DO SUL': {
      etanol: { media: 4.52, min: 4.26, max: 4.69, postos: 5 },
      gasolinaAditivada: { media: 6.54, min: 6.43, max: 6.76, postos: 6 },
      gasolina: { media: 6.43, min: 6.29, max: 6.49, postos: 8 },
      gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      diesel: { media: 6.26, min: 6.19, max: 6.34, postos: 2 },
      dieselS10: { media: 6.59, min: 6.39, max: 6.79, postos: 2 }
    },
    'TORRES': {
      etanol: { media: 4.89, min: 4.89, max: 4.89, postos: 4 },
      gasolinaAditivada: { media: 6.69, min: 6.49, max: 6.79, postos: 5 },
      gasolina: { media: 6.45, min: 6.29, max: 6.49, postos: 5 },
      gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      diesel: { media: 6.59, min: 6.29, max: 6.89, postos: 4 },
      dieselS10: { media: 6.81, min: 6.69, max: 6.99, postos: 4 }
    },
    'URUGUAIANA': {
      etanol: { media: 5.29, min: 5.29, max: 5.29, postos: 1 },
      gasolinaAditivada: { media: 6.72, min: 6.49, max: 7.02, postos: 8 },
      gasolina: { media: 6.52, min: 6.32, max: 6.73, postos: 8 },
      diesel: { media: 7.05, min: 6.67, max: 7.29, postos: 3 },
      dieselS10: { media: 7.33, min: 6.87, max: 7.77, postos: 7 }
    },
    'VACARIA': {
      etanol: { media: 5.14, min: 4.74, max: 5.65, postos: 4 },
      gasolinaAditivada: { media: 6.81, min: 6.59, max: 6.94, postos: 8 },
      gasolina: { media: 6.62, min: 6.59, max: 6.69, postos: 8 },
      diesel: { media: 6.55, min: 6.24, max: 6.75, postos: 8 },
      dieselS10: { media: 6.73, min: 6.49, max: 6.89, postos: 8 }
    },
    'VIAMAO': {
      etanol: { media: 5.15, min: 4.89, max: 5.29, postos: 3 },
      gasolinaAditivada: { media: 6.33, min: 5.99, max: 6.89, postos: 6 },
      gasolina: { media: 6.04, min: 5.96, max: 6.19, postos: 6 },
      gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      diesel: { media: 6.74, min: 6.39, max: 6.89, postos: 4 },
      dieselS10: { media: 6.87, min: 6.59, max: 6.99, postos: 5 }
    },
  },
  'SC': {
    'ARARANGUA': {
      etanol: { media: 4.72, min: 4.59, max: 4.79, postos: 3 },
      gasolinaAditivada: { media: 6.83, min: 6.65, max: 6.99, postos: 8 },
      gasolina: { media: 6.56, min: 6.35, max: 6.79, postos: 8 },
      diesel: { media: 6.69, min: 6.69, max: 6.69, postos: 4 },
      dieselS10: { media: 6.79, min: 6.79, max: 6.79, postos: 5 }
    },
    'BLUMENAU': {
      etanol: { media: 4.53, min: 4.16, max: 5.09, postos: 10 },
      gasolinaAditivada: { media: 6.79, min: 6.34, max: 7.19, postos: 11 },
      gasolina: { media: 6.66, min: 6.34, max: 7.09, postos: 16 },
      gnv: { media: 4.59, min: 4.59, max: 4.59, postos: 1 },
      diesel: { media: 6.89, min: 6.79, max: 6.99, postos: 2 },
      dieselS10: { media: 6.98, min: 6.56, max: 7.39, postos: 7 }
    },
    'BRUSQUE': {
      etanol: { media: 4.45, min: 4.29, max: 4.69, postos: 6 },
      gasolinaAditivada: { media: 6.65, min: 6.34, max: 6.89, postos: 9 },
      gasolina: { media: 6.48, min: 6.34, max: 6.59, postos: 9 },
      gnv: { media: 4.54, min: 4.53, max: 4.55, postos: 3 },
      dieselS10: { media: 7.48, min: 7.18, max: 7.89, postos: 4 }
    },
    'CACADOR': {
      etanol: { media: 4.97, min: 4.79, max: 5.19, postos: 7 },
      gasolinaAditivada: { media: 6.8, min: 6.59, max: 7.19, postos: 8 },
      gasolina: { media: 6.71, min: 6.59, max: 6.99, postos: 8 },
      diesel: { media: 6.87, min: 6.69, max: 7.22, postos: 6 },
      dieselS10: { media: 7.19, min: 6.99, max: 7.79, postos: 8 }
    },
    'CHAPECO': {
      etanol: { media: 4.98, min: 4.69, max: 6.36, postos: 9 },
      gasolinaAditivada: { media: 6.61, min: 6.39, max: 6.99, postos: 13 },
      gasolina: { media: 6.5, min: 6.39, max: 6.94, postos: 13 },
      diesel: { media: 6.71, min: 6.55, max: 6.98, postos: 5 },
      dieselS10: { media: 6.95, min: 6.59, max: 7.6, postos: 13 }
    },
    'CONCORDIA': {
      etanol: { media: 5.39, min: 4.79, max: 5.73, postos: 6 },
      gasolinaAditivada: { media: 6.84, min: 6.49, max: 7.19, postos: 8 },
      gasolina: { media: 6.71, min: 6.54, max: 6.79, postos: 7 },
      diesel: { media: 7.28, min: 6.79, max: 7.72, postos: 6 },
      dieselS10: { media: 7.37, min: 6.69, max: 7.74, postos: 6 }
    },
    'CRICIUMA': {
      etanol: { media: 4.75, min: 4.59, max: 4.99, postos: 5 },
      gasolinaAditivada: { media: 6.91, min: 6.77, max: 7.18, postos: 14 },
      gasolina: { media: 6.77, min: 6.75, max: 6.88, postos: 14 },
      gnv: { media: 4.59, min: 4.59, max: 4.59, postos: 4 },
      diesel: { media: 6.83, min: 6.09, max: 7.4, postos: 8 },
      dieselS10: { media: 7.16, min: 6.64, max: 8.38, postos: 11 }
    },
    'FLORIANOPOLIS': {
      etanol: { media: 4.45, min: 4.22, max: 5.09, postos: 12 },
      gasolinaAditivada: { media: 6.78, min: 6.44, max: 7.19, postos: 16 },
      gasolina: { media: 6.61, min: 6.44, max: 6.99, postos: 16 },
      gnv: { media: 4.59, min: 4.59, max: 4.59, postos: 1 },
      dieselS10: { media: 7.06, min: 6.99, max: 7.29, postos: 4 }
    },
    'ITAJAI': {
      etanol: { media: 4.48, min: 4.29, max: 4.85, postos: 13 },
      gasolinaAditivada: { media: 6.78, min: 6.34, max: 6.99, postos: 13 },
      gasolina: { media: 6.64, min: 6.34, max: 6.79, postos: 14 },
      gnv: { media: 4.95, min: 4.92, max: 4.99, postos: 2 },
      diesel: { media: 6.78, min: 6.39, max: 7.18, postos: 5 },
      dieselS10: { media: 7.08, min: 6.69, max: 7.59, postos: 12 }
    },
    'JOINVILLE': {
      etanol: { media: 4.44, min: 4.27, max: 4.97, postos: 15 },
      gasolinaAditivada: { media: 6.26, min: 6.01, max: 6.99, postos: 19 },
      gasolina: { media: 6.06, min: 5.99, max: 6.19, postos: 19 },
      gnv: { media: 4.72, min: 4.59, max: 4.99, postos: 3 },
      diesel: { media: 6.65, min: 6.55, max: 6.87, postos: 5 },
      dieselS10: { media: 6.88, min: 6.65, max: 7.09, postos: 13 }
    },
    'LAGUNA': {
      etanol: { media: 4.68, min: 4.43, max: 5.03, postos: 3 },
      gasolinaAditivada: { media: 6.82, min: 6.49, max: 7.19, postos: 6 },
      gasolina: { media: 6.7, min: 6.29, max: 6.99, postos: 5 },
      gnv: { media: 4.8, min: 4.76, max: 4.84, postos: 2 },
      diesel: { media: 6.66, min: 6.34, max: 7.47, postos: 4 },
      dieselS10: { media: 7.08, min: 6.54, max: 7.66, postos: 5 }
    },
    'MAFRA': {
      etanol: { media: 3.89, min: 3.89, max: 3.89, postos: 1 },
      gasolinaAditivada: { media: 6.51, min: 6.19, max: 6.79, postos: 4 },
      gasolina: { media: 6.31, min: 6.19, max: 6.49, postos: 4 },
      diesel: { media: 6.64, min: 6.39, max: 6.89, postos: 2 },
      dieselS10: { media: 6.82, min: 6.69, max: 6.99, postos: 3 }
    },
    'SAO JOSE': {
      etanol: { media: 4.33, min: 4.21, max: 4.59, postos: 13 },
      gasolinaAditivada: { media: 6.66, min: 6.44, max: 6.94, postos: 14 },
      gasolina: { media: 6.46, min: 6.44, max: 6.49, postos: 14 },
      gnv: { media: 4.44, min: 4.29, max: 4.49, postos: 4 },
      diesel: { media: 7.21, min: 6.89, max: 7.85, postos: 3 },
      dieselS10: { media: 6.79, min: 6.49, max: 6.99, postos: 3 }
    },
    'TUBARAO': {
      etanol: { media: 4.66, min: 4.56, max: 4.78, postos: 5 },
      gasolinaAditivada: { media: 6.63, min: 6.49, max: 6.99, postos: 9 },
      gasolina: { media: 6.47, min: 6.37, max: 6.79, postos: 10 },
      gnv: { media: 4.56, min: 4.56, max: 4.56, postos: 6 },
      diesel: { media: 6.3, min: 6.19, max: 6.68, postos: 6 },
      dieselS10: { media: 6.51, min: 6.46, max: 6.78, postos: 9 }
    },
    'VIDEIRA': {
      etanol: { media: 4.99, min: 4.69, max: 5.49, postos: 3 },
      gasolinaAditivada: { media: 6.69, min: 6.26, max: 6.89, postos: 7 },
      gasolina: { media: 6.58, min: 6.26, max: 6.79, postos: 7 },
      diesel: { media: 6.95, min: 6.64, max: 7.19, postos: 5 },
      dieselS10: { media: 7.16, min: 6.64, max: 7.69, postos: 6 }
    },
    'XANXERE': {
      etanol: { media: 4.79, min: 4.59, max: 4.89, postos: 4 },
      gasolinaAditivada: { media: 6.49, min: 6.09, max: 6.77, postos: 8 },
      gasolina: { media: 6.34, min: 5.99, max: 6.58, postos: 8 },
      diesel: { media: 6.75, min: 6.49, max: 6.89, postos: 6 },
      dieselS10: { media: 6.97, min: 6.59, max: 7.19, postos: 8 }
    },
  },
  'SE': {
    'ARACAJU': {
      etanol: { media: 5.54, min: 5.5, max: 5.69, postos: 9 },
      gasolinaAditivada: { media: 7.26, min: 7.12, max: 7.53, postos: 15 },
      gasolina: { media: 7.14, min: 7.12, max: 7.19, postos: 16 },
      gnv: { media: 4.83, min: 4.83, max: 4.85, postos: 5 },
      diesel: { media: 6.98, min: 6.98, max: 6.98, postos: 1 },
      dieselS10: { media: 6.87, min: 6.87, max: 6.87, postos: 2 }
    },
    'ITABAIANA': {
      etanol: { media: 5.7, min: 5.7, max: 5.7, postos: 2 },
      gasolinaAditivada: { media: 7.08, min: 7.05, max: 7.25, postos: 6 },
      gasolina: { media: 7.05, min: 7.05, max: 7.05, postos: 8 },
      diesel: { media: 6.94, min: 6.78, max: 7.79, postos: 7 },
      dieselS10: { media: 6.88, min: 6.87, max: 6.98, postos: 7 }
    },
    'LAGARTO': {
      etanol: { media: 5.41, min: 5.39, max: 5.49, postos: 5 },
      gasolinaAditivada: { media: 7.09, min: 6.99, max: 7.33, postos: 8 },
      gasolina: { media: 6.99, min: 6.99, max: 6.99, postos: 8 },
      diesel: { media: 6.84, min: 6.78, max: 6.99, postos: 7 },
      dieselS10: { media: 6.9, min: 6.87, max: 6.98, postos: 5 }
    },
    'NOSSA SENHORA DO SOCORRO': {
      etanol: { media: 5.62, min: 5.5, max: 5.69, postos: 6 },
      gasolinaAditivada: { media: 7.24, min: 7.19, max: 7.37, postos: 7 },
      gasolina: { media: 7.17, min: 7.12, max: 7.19, postos: 8 },
      gnv: { media: 4.83, min: 4.83, max: 4.83, postos: 2 },
      diesel: { media: 7.18, min: 7.18, max: 7.19, postos: 2 },
      dieselS10: { media: 7.28, min: 7.18, max: 7.39, postos: 5 }
    },
  },
  'SP': {
    'ADAMANTINA': {
      etanol: { media: 3.39, min: 3.23, max: 3.75, postos: 8 },
      gasolinaAditivada: { media: 6.48, min: 6.28, max: 6.81, postos: 7 },
      gasolina: { media: 6.41, min: 6.28, max: 6.65, postos: 8 },
      diesel: { media: 6.25, min: 6.08, max: 6.76, postos: 4 },
      dieselS10: { media: 6.94, min: 6.68, max: 7.39, postos: 7 }
    },
    'AMERICANA': {
      etanol: { media: 3.81, min: 3.59, max: 3.99, postos: 6 },
      gasolinaAditivada: { media: 6.68, min: 6.39, max: 7.09, postos: 5 },
      gasolina: { media: 6.43, min: 6.19, max: 6.79, postos: 6 },
      gnv: { media: 5.59, min: 5.59, max: 5.59, postos: 1 },
      diesel: { media: 7.09, min: 7.09, max: 7.09, postos: 1 },
      dieselS10: { media: 7.24, min: 6.87, max: 7.99, postos: 5 }
    },
    'ARACATUBA': {
      etanol: { media: 3.36, min: 3.04, max: 3.89, postos: 14 },
      gasolinaAditivada: { media: 6.58, min: 6.19, max: 6.89, postos: 10 },
      gasolina: { media: 6.26, min: 5.79, max: 6.69, postos: 13 },
      diesel: { media: 6.92, min: 6.29, max: 7.49, postos: 6 },
      dieselS10: { media: 6.75, min: 6.23, max: 7.29, postos: 10 }
    },
    'ARARAQUARA': {
      etanol: { media: 3.66, min: 2.99, max: 4.19, postos: 17 },
      gasolinaAditivada: { media: 6.6, min: 6.19, max: 7.09, postos: 10 },
      gasolina: { media: 6.28, min: 5.49, max: 6.89, postos: 17 },
      gnv: { media: 4.7, min: 4.7, max: 4.7, postos: 1 },
      diesel: { media: 6.58, min: 6.25, max: 7.15, postos: 8 },
      dieselS10: { media: 7.03, min: 6.34, max: 7.89, postos: 12 }
    },
    'ARARAS': {
      etanol: { media: 3.85, min: 3.77, max: 3.99, postos: 9 },
      gasolinaAditivada: { media: 6.67, min: 6.37, max: 6.87, postos: 7 },
      gasolina: { media: 6.52, min: 6.27, max: 6.67, postos: 11 },
      diesel: { media: 6.86, min: 6.67, max: 7.05, postos: 7 },
      dieselS10: { media: 7.03, min: 6.77, max: 7.45, postos: 7 }
    },
    'ASSIS': {
      etanol: { media: 3.68, min: 3.24, max: 3.99, postos: 10 },
      gasolinaAditivada: { media: 7.29, min: 7.29, max: 7.29, postos: 4 },
      gasolina: { media: 6.65, min: 6.04, max: 6.99, postos: 10 },
      dieselS10: { media: 7.08, min: 6.34, max: 7.69, postos: 8 }
    },
    'ATIBAIA': {
      etanol: { media: 4.5, min: 3.99, max: 4.99, postos: 14 },
      gasolinaAditivada: { media: 7.0, min: 6.49, max: 7.39, postos: 13 },
      gasolina: { media: 6.82, min: 6.49, max: 7.29, postos: 13 },
      diesel: { media: 6.72, min: 6.19, max: 7.19, postos: 5 },
      dieselS10: { media: 7.39, min: 6.77, max: 7.89, postos: 10 }
    },
    'BARRETOS': {
      etanol: { media: 3.55, min: 2.99, max: 3.79, postos: 10 },
      gasolinaAditivada: { media: 6.79, min: 6.39, max: 7.19, postos: 5 },
      gasolina: { media: 6.48, min: 5.97, max: 6.99, postos: 10 },
      diesel: { media: 6.89, min: 6.09, max: 7.69, postos: 3 },
      dieselS10: { media: 7.01, min: 6.59, max: 7.49, postos: 8 }
    },
    'BARUERI': {
      etanol: { media: 4.33, min: 3.59, max: 5.99, postos: 14 },
      gasolinaAditivada: { media: 7.05, min: 6.39, max: 7.99, postos: 13 },
      gasolina: { media: 6.78, min: 6.19, max: 7.99, postos: 14 },
      diesel: { media: 6.5, min: 6.19, max: 6.84, postos: 3 },
      dieselS10: { media: 6.99, min: 6.64, max: 7.39, postos: 9 }
    },
    'BAURU': {
      etanol: { media: 3.57, min: 3.01, max: 3.89, postos: 17 },
      gasolinaAditivada: { media: 6.64, min: 6.45, max: 6.79, postos: 5 },
      gasolina: { media: 6.33, min: 5.81, max: 6.69, postos: 17 },
      diesel: { media: 6.56, min: 6.39, max: 6.79, postos: 3 },
      dieselS10: { media: 6.79, min: 6.31, max: 6.99, postos: 5 }
    },
    'BEBEDOURO': {
      etanol: { media: 3.79, min: 3.64, max: 3.99, postos: 6 },
      gasolinaAditivada: { media: 6.58, min: 6.34, max: 6.99, postos: 5 },
      gasolina: { media: 6.49, min: 6.34, max: 6.73, postos: 8 },
      diesel: { media: 6.59, min: 6.09, max: 6.89, postos: 4 },
      dieselS10: { media: 6.96, min: 6.75, max: 7.69, postos: 5 }
    },
    'BIRIGUI': {
      etanol: { media: 3.41, min: 3.29, max: 3.59, postos: 10 },
      gasolinaAditivada: { media: 6.89, min: 6.59, max: 7.19, postos: 7 },
      gasolina: { media: 6.59, min: 6.39, max: 6.79, postos: 10 },
      diesel: { media: 6.49, min: 6.09, max: 7.09, postos: 6 },
      dieselS10: { media: 6.85, min: 6.59, max: 7.29, postos: 5 }
    },
    'BRAGANCA PAULISTA': {
      etanol: { media: 3.99, min: 3.69, max: 4.44, postos: 10 },
      gasolinaAditivada: { media: 6.79, min: 6.49, max: 7.29, postos: 8 },
      gasolina: { media: 6.47, min: 6.29, max: 6.59, postos: 10 },
      diesel: { media: 6.83, min: 6.29, max: 7.88, postos: 4 },
      dieselS10: { media: 7.28, min: 6.69, max: 7.98, postos: 7 }
    },
    'CACAPAVA': {
      etanol: { media: 4.24, min: 3.77, max: 4.99, postos: 7 },
      gasolinaAditivada: { media: 6.6, min: 6.07, max: 7.19, postos: 8 },
      gasolina: { media: 6.46, min: 6.07, max: 6.89, postos: 8 },
      gnv: { media: 5.49, min: 5.49, max: 5.49, postos: 1 },
      diesel: { media: 6.41, min: 6.19, max: 6.79, postos: 4 },
      dieselS10: { media: 7.1, min: 6.59, max: 8.19, postos: 8 }
    },
    'CAMPINAS': {
      etanol: { media: 3.8, min: 3.15, max: 4.59, postos: 25 },
      gasolinaAditivada: { media: 6.67, min: 5.99, max: 7.15, postos: 22 },
      gasolina: { media: 6.43, min: 5.99, max: 6.95, postos: 25 },
      gnv: { media: 5.19, min: 4.99, max: 5.39, postos: 2 },
      diesel: { media: 7.2, min: 6.79, max: 7.89, postos: 10 },
      dieselS10: { media: 7.22, min: 6.55, max: 8.14, postos: 20 }
    },
    'CARAGUATATUBA': {
      etanol: { media: 4.15, min: 3.87, max: 4.45, postos: 9 },
      gasolinaAditivada: { media: 6.89, min: 6.57, max: 7.29, postos: 9 },
      gasolina: { media: 6.75, min: 6.57, max: 6.99, postos: 9 },
      diesel: { media: 7.11, min: 6.89, max: 7.3, postos: 4 },
      dieselS10: { media: 7.61, min: 7.39, max: 7.69, postos: 7 }
    },
    'CARAPICUIBA': {
      etanol: { media: 4.14, min: 3.49, max: 6.39, postos: 10 },
      gasolinaAditivada: { media: 6.74, min: 6.39, max: 7.39, postos: 7 },
      gasolina: { media: 6.41, min: 6.09, max: 6.99, postos: 10 },
      diesel: { media: 6.99, min: 6.99, max: 6.99, postos: 1 },
      dieselS10: { media: 7.19, min: 6.99, max: 7.49, postos: 7 }
    },
    'COTIA': {
      etanol: { media: 3.87, min: 3.68, max: 4.29, postos: 12 },
      gasolinaAditivada: { media: 6.74, min: 6.19, max: 7.49, postos: 11 },
      gasolina: { media: 6.37, min: 5.89, max: 6.99, postos: 12 },
      diesel: { media: 6.92, min: 6.49, max: 7.79, postos: 5 },
      dieselS10: { media: 6.98, min: 6.69, max: 7.59, postos: 8 }
    },
    'CRUZEIRO': {
      etanol: { media: 3.9, min: 3.82, max: 3.99, postos: 6 },
      gasolinaAditivada: { media: 6.6, min: 6.34, max: 6.79, postos: 6 },
      gasolina: { media: 6.44, min: 6.29, max: 6.65, postos: 7 },
      gnv: { media: 5.49, min: 5.49, max: 5.49, postos: 2 },
      diesel: { media: 7.21, min: 6.99, max: 7.44, postos: 2 },
      dieselS10: { media: 7.37, min: 6.99, max: 7.85, postos: 5 }
    },
    'CUBATAO': {
      etanol: { media: 4.58, min: 4.49, max: 4.79, postos: 8 },
      gasolinaAditivada: { media: 7.14, min: 6.89, max: 7.29, postos: 6 },
      gasolina: { media: 6.85, min: 6.76, max: 6.98, postos: 8 },
      diesel: { media: 7.48, min: 7.48, max: 7.49, postos: 3 },
      dieselS10: { media: 7.76, min: 7.49, max: 7.92, postos: 6 }
    },
    'DIADEMA': {
      etanol: { media: 3.83, min: 3.49, max: 4.59, postos: 14 },
      gasolinaAditivada: { media: 6.79, min: 6.19, max: 7.69, postos: 12 },
      gasolina: { media: 6.33, min: 5.99, max: 6.99, postos: 14 },
      diesel: { media: 6.43, min: 6.17, max: 6.69, postos: 2 },
      dieselS10: { media: 7.03, min: 6.59, max: 7.69, postos: 10 }
    },
    'EMBU DAS ARTES': {
      etanol: { media: 4.06, min: 3.78, max: 4.39, postos: 8 },
      gasolinaAditivada: { media: 6.96, min: 6.44, max: 7.49, postos: 7 },
      gasolina: { media: 6.63, min: 6.28, max: 6.99, postos: 8 },
      diesel: { media: 7.05, min: 6.68, max: 7.34, postos: 4 },
      dieselS10: { media: 7.22, min: 6.78, max: 7.84, postos: 4 }
    },
    'FRANCA': {
      etanol: { media: 3.86, min: 3.77, max: 3.99, postos: 19 },
      gasolinaAditivada: { media: 6.93, min: 6.74, max: 7.19, postos: 13 },
      gasolina: { media: 6.75, min: 6.59, max: 6.79, postos: 19 },
      diesel: { media: 6.57, min: 6.13, max: 6.89, postos: 10 },
      dieselS10: { media: 6.86, min: 6.66, max: 6.99, postos: 15 }
    },
    'GARCA': {
      etanol: { media: 3.74, min: 3.39, max: 3.99, postos: 8 },
      gasolinaAditivada: { media: 6.55, min: 6.49, max: 6.69, postos: 5 },
      gasolina: { media: 6.46, min: 6.29, max: 6.49, postos: 8 },
      diesel: { media: 6.66, min: 6.59, max: 6.89, postos: 4 },
      dieselS10: { media: 6.94, min: 6.69, max: 6.99, postos: 6 }
    },
    'GUARATINGUETA': {
      etanol: { media: 4.04, min: 3.82, max: 4.29, postos: 9 },
      gasolinaAditivada: { media: 6.69, min: 6.24, max: 6.84, postos: 6 },
      gasolina: { media: 6.59, min: 6.19, max: 6.79, postos: 9 },
      gnv: { media: 5.39, min: 5.39, max: 5.39, postos: 1 },
      diesel: { media: 6.69, min: 6.19, max: 7.59, postos: 3 },
      dieselS10: { media: 7.15, min: 6.49, max: 7.69, postos: 6 }
    },
    'GUARUJA': {
      etanol: { media: 4.67, min: 3.59, max: 6.29, postos: 8 },
      gasolinaAditivada: { media: 7.33, min: 6.69, max: 9.89, postos: 7 },
      gasolina: { media: 6.99, min: 6.08, max: 9.69, postos: 10 },
      diesel: { media: 6.97, min: 6.75, max: 7.19, postos: 3 },
      dieselS10: { media: 7.69, min: 6.76, max: 9.79, postos: 9 }
    },
    'GUARULHOS': {
      etanol: { media: 3.87, min: 3.49, max: 5.29, postos: 24 },
      gasolinaAditivada: { media: 6.76, min: 6.24, max: 8.27, postos: 18 },
      gasolina: { media: 6.48, min: 6.19, max: 7.27, postos: 24 },
      gnv: { media: 5.06, min: 4.99, max: 5.29, postos: 4 },
      diesel: { media: 6.87, min: 6.56, max: 7.39, postos: 8 },
      dieselS10: { media: 7.04, min: 6.49, max: 7.69, postos: 21 }
    },
    'HORTOLANDIA': {
      etanol: { media: 3.99, min: 3.89, max: 4.09, postos: 10 },
      gasolinaAditivada: { media: 6.57, min: 6.35, max: 6.89, postos: 9 },
      gasolina: { media: 6.36, min: 6.19, max: 6.49, postos: 10 },
      diesel: { media: 6.54, min: 6.39, max: 6.89, postos: 7 },
      dieselS10: { media: 7.0, min: 6.69, max: 7.49, postos: 9 }
    },
    'IBITINGA': {
      etanol: { media: 3.6, min: 3.19, max: 3.99, postos: 8 },
      gasolinaAditivada: { media: 6.57, min: 6.19, max: 6.89, postos: 8 },
      gasolina: { media: 6.47, min: 6.19, max: 6.79, postos: 8 },
      diesel: { media: 6.59, min: 6.09, max: 7.35, postos: 7 },
      dieselS10: { media: 7.17, min: 6.59, max: 7.79, postos: 8 }
    },
    'ITANHAEM': {
      etanol: { media: 4.03, min: 3.69, max: 4.29, postos: 8 },
      gasolinaAditivada: { media: 7.03, min: 6.39, max: 7.6, postos: 7 },
      gasolina: { media: 6.61, min: 6.29, max: 6.99, postos: 8 },
      diesel: { media: 7.03, min: 6.89, max: 7.29, postos: 3 },
      dieselS10: { media: 7.22, min: 6.59, max: 7.99, postos: 6 }
    },
    'ITAPECERICA DA SERRA': {
      etanol: { media: 3.89, min: 3.58, max: 4.59, postos: 8 },
      gasolinaAditivada: { media: 6.55, min: 6.17, max: 7.19, postos: 7 },
      gasolina: { media: 6.38, min: 5.97, max: 6.79, postos: 8 },
      diesel: { media: 6.65, min: 6.59, max: 6.69, postos: 3 },
      dieselS10: { media: 6.89, min: 6.69, max: 7.34, postos: 8 }
    },
    'ITAPIRA': {
      etanol: { media: 4.06, min: 3.79, max: 4.29, postos: 8 },
      gasolinaAditivada: { media: 6.98, min: 6.49, max: 7.19, postos: 6 },
      gasolina: { media: 6.63, min: 6.29, max: 6.89, postos: 8 },
      diesel: { media: 6.71, min: 6.27, max: 7.09, postos: 5 },
      dieselS10: { media: 7.06, min: 6.59, max: 7.54, postos: 6 }
    },
    'ITAPOLIS': {
      etanol: { media: 3.48, min: 3.24, max: 3.89, postos: 6 },
      gasolinaAditivada: { media: 6.52, min: 6.39, max: 6.79, postos: 3 },
      gasolina: { media: 6.38, min: 6.19, max: 6.69, postos: 6 },
      diesel: { media: 6.73, min: 6.59, max: 6.99, postos: 4 },
      dieselS10: { media: 6.86, min: 6.67, max: 7.09, postos: 5 }
    },
    'ITAQUAQUECETUBA': {
      etanol: { media: 3.74, min: 3.39, max: 3.99, postos: 10 },
      gasolinaAditivada: { media: 6.6, min: 6.09, max: 6.89, postos: 9 },
      gasolina: { media: 6.4, min: 6.04, max: 6.59, postos: 10 },
      gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      diesel: { media: 6.85, min: 6.09, max: 7.19, postos: 6 },
      dieselS10: { media: 6.92, min: 6.46, max: 7.19, postos: 7 }
    },
    'ITATIBA': {
      etanol: { media: 3.72, min: 3.49, max: 3.99, postos: 11 },
      gasolinaAditivada: { media: 6.78, min: 6.49, max: 7.15, postos: 4 },
      gasolina: { media: 6.5, min: 6.19, max: 6.69, postos: 11 },
      gnv: { media: 4.59, min: 3.99, max: 5.19, postos: 2 },
      diesel: { media: 6.66, min: 6.09, max: 6.99, postos: 7 },
      dieselS10: { media: 7.06, min: 6.49, max: 7.79, postos: 10 }
    },
    'ITU': {
      etanol: { media: 3.55, min: 3.19, max: 3.89, postos: 10 },
      gasolinaAditivada: { media: 6.52, min: 6.29, max: 6.79, postos: 8 },
      gasolina: { media: 6.27, min: 5.79, max: 6.69, postos: 10 },
      gnv: { media: 3.89, min: 3.79, max: 3.99, postos: 2 },
      diesel: { media: 6.36, min: 5.89, max: 6.79, postos: 4 },
      dieselS10: { media: 6.72, min: 6.09, max: 7.18, postos: 8 }
    },
    'JABOTICABAL': {
      etanol: { media: 4.01, min: 3.99, max: 4.09, postos: 9 },
      gasolinaAditivada: { media: 6.76, min: 6.65, max: 7.19, postos: 6 },
      gasolina: { media: 6.69, min: 6.65, max: 6.79, postos: 7 },
      diesel: { media: 7.07, min: 6.39, max: 7.49, postos: 5 },
      dieselS10: { media: 7.15, min: 6.98, max: 7.59, postos: 8 }
    },
    'JACAREI': {
      etanol: { media: 3.75, min: 3.59, max: 3.89, postos: 14 },
      gasolinaAditivada: { media: 6.49, min: 6.14, max: 6.69, postos: 12 },
      gasolina: { media: 6.19, min: 5.95, max: 6.39, postos: 14 },
      gnv: { media: 5.39, min: 5.39, max: 5.39, postos: 1 },
      diesel: { media: 6.51, min: 6.29, max: 6.79, postos: 4 },
      dieselS10: { media: 6.95, min: 6.69, max: 7.19, postos: 6 }
    },
    'JALES': {
      etanol: { media: 3.72, min: 3.39, max: 3.89, postos: 8 },
      gasolinaAditivada: { media: 6.75, min: 6.29, max: 6.99, postos: 5 },
      gasolina: { media: 6.55, min: 6.09, max: 6.79, postos: 7 },
      diesel: { media: 6.73, min: 5.99, max: 6.99, postos: 7 },
      dieselS10: { media: 6.97, min: 6.49, max: 7.19, postos: 7 }
    },
    'JAU': {
      etanol: { media: 3.71, min: 3.25, max: 3.99, postos: 10 },
      gasolinaAditivada: { media: 6.82, min: 6.44, max: 6.99, postos: 7 },
      gasolina: { media: 6.58, min: 6.19, max: 6.79, postos: 10 },
      diesel: { media: 6.86, min: 6.69, max: 7.09, postos: 4 },
      dieselS10: { media: 7.29, min: 7.09, max: 7.49, postos: 4 }
    },
    'JOSE BONIFACIO': {
      etanol: { media: 3.47, min: 3.19, max: 3.69, postos: 8 },
      gasolinaAditivada: { media: 6.74, min: 6.59, max: 6.84, postos: 4 },
      gasolina: { media: 6.51, min: 6.29, max: 6.69, postos: 7 },
      diesel: { media: 6.34, min: 5.99, max: 6.69, postos: 6 },
      dieselS10: { media: 6.7, min: 6.59, max: 6.99, postos: 4 }
    },
    'JUNDIAI': {
      etanol: { media: 3.9, min: 3.49, max: 4.09, postos: 16 },
      gasolinaAditivada: { media: 6.7, min: 6.39, max: 7.17, postos: 16 },
      gasolina: { media: 6.48, min: 6.37, max: 6.65, postos: 17 },
      gnv: { media: 5.34, min: 5.29, max: 5.39, postos: 2 },
      diesel: { media: 6.61, min: 6.17, max: 7.09, postos: 7 },
      dieselS10: { media: 7.1, min: 6.67, max: 7.49, postos: 13 }
    },
    'LEME': {
      etanol: { media: 4.19, min: 4.19, max: 4.19, postos: 1 },
      gasolinaAditivada: { media: 6.79, min: 6.79, max: 6.79, postos: 1 },
      gasolina: { media: 6.49, min: 6.49, max: 6.49, postos: 1 }
    },
    'LIMEIRA': {
      etanol: { media: 3.9, min: 3.39, max: 4.99, postos: 12 },
      gasolinaAditivada: { media: 6.86, min: 6.49, max: 7.49, postos: 9 },
      gasolina: { media: 6.48, min: 5.89, max: 6.89, postos: 12 },
      diesel: { media: 6.68, min: 5.99, max: 7.19, postos: 9 },
      dieselS10: { media: 7.06, min: 6.49, max: 7.59, postos: 10 }
    },
    'LINS': {
      etanol: { media: 3.15, min: 3.06, max: 3.39, postos: 10 },
      gasolinaAditivada: { media: 6.28, min: 6.06, max: 6.59, postos: 3 },
      gasolina: { media: 6.18, min: 6.06, max: 6.29, postos: 10 },
      diesel: { media: 6.43, min: 6.29, max: 6.53, postos: 4 },
      dieselS10: { media: 6.77, min: 6.49, max: 6.99, postos: 8 }
    },
    'MAUA': {
      etanol: { media: 3.79, min: 3.42, max: 4.29, postos: 10 },
      gasolinaAditivada: { media: 6.64, min: 6.09, max: 7.09, postos: 11 },
      gasolina: { media: 6.34, min: 6.07, max: 6.59, postos: 11 },
      gnv: { media: 5.99, min: 5.99, max: 5.99, postos: 1 },
      diesel: { media: 6.85, min: 5.99, max: 7.29, postos: 3 },
      dieselS10: { media: 7.21, min: 6.47, max: 7.59, postos: 9 }
    },
    'MOCOCA': {
      etanol: { media: 4.31, min: 4.16, max: 4.39, postos: 8 },
      gasolinaAditivada: { media: 6.93, min: 6.89, max: 6.99, postos: 4 },
      gasolina: { media: 6.76, min: 6.66, max: 6.89, postos: 8 },
      diesel: { media: 6.54, min: 5.99, max: 6.99, postos: 5 },
      dieselS10: { media: 7.05, min: 6.69, max: 7.49, postos: 6 }
    },
    'MOGI GUACU': {
      etanol: { media: 3.88, min: 3.59, max: 4.19, postos: 8 },
      gasolinaAditivada: { media: 6.59, min: 6.29, max: 6.79, postos: 8 },
      gasolina: { media: 6.43, min: 6.19, max: 6.69, postos: 9 },
      gnv: { media: 3.99, min: 3.99, max: 3.99, postos: 1 },
      diesel: { media: 6.69, min: 6.49, max: 6.89, postos: 3 },
      dieselS10: { media: 7.05, min: 6.89, max: 7.29, postos: 5 }
    },
    'MOGI MIRIM': {
      etanol: { media: 3.86, min: 3.39, max: 4.49, postos: 7 },
      gasolinaAditivada: { media: 6.72, min: 6.59, max: 7.09, postos: 6 },
      gasolina: { media: 6.45, min: 5.99, max: 6.99, postos: 8 },
      diesel: { media: 6.56, min: 5.99, max: 7.09, postos: 4 },
      dieselS10: { media: 6.84, min: 6.39, max: 7.29, postos: 6 }
    },
    'MONTE ALTO': {
      etanol: { media: 3.93, min: 3.89, max: 4.09, postos: 8 },
      gasolinaAditivada: { media: 6.96, min: 6.59, max: 7.19, postos: 5 },
      gasolina: { media: 6.71, min: 6.49, max: 6.99, postos: 7 },
      diesel: { media: 6.55, min: 6.49, max: 6.68, postos: 3 },
      dieselS10: { media: 6.93, min: 6.68, max: 7.15, postos: 6 }
    },
    'OLIMPIA': {
      etanol: { media: 3.49, min: 3.35, max: 3.99, postos: 8 },
      gasolinaAditivada: { media: 6.75, min: 6.51, max: 7.39, postos: 7 },
      gasolina: { media: 6.49, min: 6.27, max: 6.99, postos: 8 },
      diesel: { media: 6.85, min: 6.38, max: 7.89, postos: 7 },
      dieselS10: { media: 7.24, min: 6.79, max: 7.99, postos: 6 }
    },
    'OSASCO': {
      etanol: { media: 3.81, min: 3.49, max: 4.39, postos: 19 },
      gasolinaAditivada: { media: 6.73, min: 6.19, max: 7.47, postos: 15 },
      gasolina: { media: 6.33, min: 5.89, max: 6.59, postos: 19 },
      gnv: { media: 5.49, min: 5.49, max: 5.49, postos: 1 },
      diesel: { media: 6.86, min: 6.69, max: 7.09, postos: 4 },
      dieselS10: { media: 7.04, min: 6.69, max: 7.69, postos: 12 }
    },
    'OURINHOS': {
      etanol: { media: 3.74, min: 3.49, max: 3.99, postos: 2 },
      gasolinaAditivada: { media: 7.09, min: 7.09, max: 7.09, postos: 1 },
      gasolina: { media: 6.79, min: 6.59, max: 6.99, postos: 2 },
      dieselS10: { media: 7.29, min: 7.29, max: 7.29, postos: 1 }
    },
    'PAULINIA': {
      etanol: { media: 3.74, min: 3.49, max: 3.89, postos: 9 },
      gasolinaAditivada: { media: 6.53, min: 6.22, max: 6.69, postos: 8 },
      gasolina: { media: 6.3, min: 6.09, max: 6.69, postos: 9 },
      diesel: { media: 6.24, min: 6.09, max: 6.39, postos: 2 },
      dieselS10: { media: 6.89, min: 6.59, max: 7.44, postos: 6 }
    },
    'PIRACICABA': {
      etanol: { media: 3.79, min: 3.47, max: 4.19, postos: 16 },
      gasolinaAditivada: { media: 6.68, min: 6.29, max: 7.09, postos: 16 },
      gasolina: { media: 6.46, min: 6.14, max: 6.89, postos: 17 },
      diesel: { media: 6.55, min: 6.29, max: 6.99, postos: 8 },
      dieselS10: { media: 6.92, min: 6.69, max: 7.39, postos: 10 }
    },
    'PIRASSUNUNGA': {
      etanol: { media: 3.78, min: 3.67, max: 3.99, postos: 7 },
      gasolinaAditivada: { media: 6.49, min: 6.29, max: 6.69, postos: 5 },
      gasolina: { media: 6.34, min: 6.27, max: 6.39, postos: 7 },
      diesel: { media: 6.54, min: 6.49, max: 6.6, postos: 2 },
      dieselS10: { media: 6.91, min: 6.59, max: 7.27, postos: 3 }
    },
    'POA': {
      etanol: { media: 3.98, min: 3.57, max: 4.19, postos: 8 },
      gasolinaAditivada: { media: 6.94, min: 6.54, max: 7.29, postos: 6 },
      gasolina: { media: 6.67, min: 6.39, max: 6.94, postos: 8 },
      gnv: { media: 4.85, min: 4.85, max: 4.85, postos: 1 },
      diesel: { media: 6.59, min: 6.59, max: 6.59, postos: 1 },
      dieselS10: { media: 7.65, min: 7.29, max: 7.99, postos: 5 }
    },
    'PORTO FERREIRA': {
      etanol: { media: 4.12, min: 3.97, max: 4.33, postos: 6 },
      gasolinaAditivada: { media: 7.06, min: 6.79, max: 7.19, postos: 4 },
      gasolina: { media: 6.72, min: 6.51, max: 6.93, postos: 7 },
      gnv: { media: 3.99, min: 3.99, max: 3.99, postos: 1 },
      diesel: { media: 6.65, min: 6.35, max: 6.99, postos: 4 },
      dieselS10: { media: 7.19, min: 6.85, max: 7.69, postos: 6 }
    },
    'PRAIA GRANDE': {
      etanol: { media: 4.25, min: 3.64, max: 5.19, postos: 13 },
      gasolinaAditivada: { media: 7.05, min: 6.24, max: 7.29, postos: 10 },
      gasolina: { media: 6.68, min: 6.09, max: 7.19, postos: 13 },
      diesel: { media: 6.94, min: 6.89, max: 6.99, postos: 2 },
      dieselS10: { media: 7.33, min: 6.79, max: 7.99, postos: 10 }
    },
    'PRESIDENTE PRUDENTE': {
      etanol: { media: 3.43, min: 3.19, max: 3.79, postos: 16 },
      gasolinaAditivada: { media: 6.89, min: 6.47, max: 7.19, postos: 9 },
      gasolina: { media: 6.51, min: 5.99, max: 6.89, postos: 15 },
      diesel: { media: 6.8, min: 6.49, max: 7.07, postos: 7 },
      dieselS10: { media: 7.01, min: 6.79, max: 7.37, postos: 9 }
    },
    'RIBEIRAO PIRES': {
      etanol: { media: 3.93, min: 3.55, max: 4.19, postos: 8 },
      gasolinaAditivada: { media: 6.81, min: 6.69, max: 6.99, postos: 7 },
      gasolina: { media: 6.44, min: 6.25, max: 6.56, postos: 8 },
      diesel: { media: 6.88, min: 6.66, max: 6.99, postos: 3 },
      dieselS10: { media: 7.15, min: 6.69, max: 7.39, postos: 8 }
    },
    'RIBEIRAO PRETO': {
      etanol: { media: 3.97, min: 3.87, max: 4.49, postos: 24 },
      gasolinaAditivada: { media: 6.83, min: 6.57, max: 7.59, postos: 14 },
      gasolina: { media: 6.72, min: 6.57, max: 7.19, postos: 23 },
      diesel: { media: 6.97, min: 6.29, max: 7.49, postos: 8 },
      dieselS10: { media: 7.07, min: 6.59, max: 7.59, postos: 13 }
    },
    'RIO CLARO': {
      etanol: { media: 3.73, min: 3.19, max: 3.99, postos: 13 },
      gasolinaAditivada: { media: 6.44, min: 6.09, max: 6.69, postos: 10 },
      gasolina: { media: 6.18, min: 5.89, max: 6.39, postos: 13 },
      diesel: { media: 6.72, min: 5.99, max: 7.29, postos: 7 },
      dieselS10: { media: 6.99, min: 6.39, max: 7.4, postos: 9 }
    },
    'SANTO ANDRE': {
      etanol: { media: 3.92, min: 3.47, max: 4.59, postos: 19 },
      gasolinaAditivada: { media: 6.76, min: 6.07, max: 7.49, postos: 18 },
      gasolina: { media: 6.4, min: 5.97, max: 6.69, postos: 19 },
      gnv: { media: 5.44, min: 5.19, max: 5.99, postos: 4 },
      diesel: { media: 7.12, min: 6.59, max: 7.59, postos: 6 },
      dieselS10: { media: 7.19, min: 6.89, max: 7.69, postos: 14 }
    },
    'SANTOS': {
      etanol: { media: 4.22, min: 3.57, max: 5.29, postos: 15 },
      gasolinaAditivada: { media: 6.92, min: 6.28, max: 7.59, postos: 13 },
      gasolina: { media: 6.61, min: 6.07, max: 7.39, postos: 15 },
      diesel: { media: 6.89, min: 6.39, max: 7.89, postos: 3 },
      dieselS10: { media: 7.33, min: 6.69, max: 8.29, postos: 9 }
    },
    'SAO BERNARDO DO CAMPO': {
      etanol: { media: 4.22, min: 3.77, max: 4.99, postos: 19 },
      gasolinaAditivada: { media: 7.12, min: 6.42, max: 7.69, postos: 18 },
      gasolina: { media: 6.73, min: 6.37, max: 7.89, postos: 19 },
      gnv: { media: 4.99, min: 4.99, max: 4.99, postos: 1 },
      diesel: { media: 7.42, min: 6.99, max: 7.67, postos: 4 },
      dieselS10: { media: 7.47, min: 6.89, max: 7.87, postos: 13 }
    },
    'SAO CAETANO DO SUL': {
      etanol: { media: 4.0, min: 3.39, max: 4.69, postos: 11 },
      gasolinaAditivada: { media: 6.84, min: 6.12, max: 7.39, postos: 10 },
      gasolina: { media: 6.52, min: 5.84, max: 7.09, postos: 11 },
      diesel: { media: 6.43, min: 6.37, max: 6.49, postos: 2 },
      dieselS10: { media: 7.13, min: 6.47, max: 7.99, postos: 7 }
    },
    'SAO CARLOS': {
      etanol: { media: 3.66, min: 3.09, max: 3.99, postos: 15 },
      gasolinaAditivada: { media: 6.69, min: 6.29, max: 7.49, postos: 12 },
      gasolina: { media: 6.46, min: 5.89, max: 7.09, postos: 15 },
      diesel: { media: 6.47, min: 6.39, max: 6.59, postos: 5 },
      dieselS10: { media: 6.98, min: 6.29, max: 7.49, postos: 10 }
    },
    'SAO JOAO DA BOA VISTA': {
      etanol: { media: 3.84, min: 3.59, max: 4.39, postos: 7 },
      gasolinaAditivada: { media: 6.55, min: 6.17, max: 6.99, postos: 6 },
      gasolina: { media: 6.51, min: 6.17, max: 6.79, postos: 8 },
      diesel: { media: 6.44, min: 6.17, max: 6.89, postos: 5 },
      dieselS10: { media: 6.77, min: 6.47, max: 6.89, postos: 4 }
    },
    'SAO JOSE DO RIO PRETO': {
      etanol: { media: 3.22, min: 3.02, max: 3.69, postos: 19 },
      gasolinaAditivada: { media: 6.91, min: 6.59, max: 7.19, postos: 9 },
      gasolina: { media: 6.39, min: 5.92, max: 6.89, postos: 19 },
      diesel: { media: 6.6, min: 6.09, max: 7.09, postos: 9 },
      dieselS10: { media: 6.92, min: 6.39, max: 7.69, postos: 12 }
    },
    'SAO JOSE DOS CAMPOS': {
      etanol: { media: 3.83, min: 3.44, max: 4.39, postos: 19 },
      gasolinaAditivada: { media: 6.39, min: 6.04, max: 6.89, postos: 16 },
      gasolina: { media: 6.21, min: 5.89, max: 6.59, postos: 19 },
      gnv: { media: 4.64, min: 4.59, max: 4.69, postos: 2 },
      diesel: { media: 6.45, min: 6.19, max: 6.98, postos: 3 },
      dieselS10: { media: 6.8, min: 6.44, max: 7.19, postos: 13 }
    },
    'SAO PAULO': {
      etanol: { media: 3.85, min: 3.29, max: 5.99, postos: 209 },
      gasolinaAditivada: { media: 6.76, min: 6.09, max: 8.89, postos: 178 },
      gasolina: { media: 6.42, min: 5.64, max: 8.49, postos: 210 },
      gnv: { media: 5.05, min: 4.56, max: 5.99, postos: 11 },
      diesel: { media: 6.77, min: 6.37, max: 7.49, postos: 33 },
      dieselS10: { media: 7.08, min: 6.39, max: 9.19, postos: 143 }
    },
    'SAO VICENTE': {
      etanol: { media: 4.0, min: 3.69, max: 4.59, postos: 9 },
      gasolinaAditivada: { media: 6.77, min: 6.14, max: 7.39, postos: 8 },
      gasolina: { media: 6.52, min: 6.09, max: 6.99, postos: 8 },
      diesel: { media: 6.81, min: 6.29, max: 7.39, postos: 4 },
      dieselS10: { media: 7.14, min: 6.54, max: 7.29, postos: 5 }
    },
    'SERTAOZINHO': {
      etanol: { media: 3.97, min: 3.93, max: 3.99, postos: 9 },
      gasolinaAditivada: { media: 6.75, min: 6.69, max: 6.84, postos: 4 },
      gasolina: { media: 6.67, min: 6.63, max: 6.69, postos: 9 },
      diesel: { media: 6.69, min: 6.59, max: 6.89, postos: 4 },
      dieselS10: { media: 6.97, min: 6.89, max: 7.09, postos: 5 }
    },
    'SOROCABA': {
      etanol: { media: 3.72, min: 3.39, max: 4.09, postos: 19 },
      gasolinaAditivada: { media: 6.67, min: 6.29, max: 7.09, postos: 13 },
      gasolina: { media: 6.45, min: 5.99, max: 6.75, postos: 19 },
      diesel: { media: 6.63, min: 6.15, max: 6.89, postos: 7 },
      dieselS10: { media: 6.92, min: 6.59, max: 7.79, postos: 11 }
    },
    'SUMARE': {
      etanol: { media: 3.79, min: 3.29, max: 4.19, postos: 12 },
      gasolinaAditivada: { media: 6.57, min: 6.19, max: 6.89, postos: 9 },
      gasolina: { media: 6.32, min: 5.99, max: 6.79, postos: 12 },
      diesel: { media: 6.52, min: 6.19, max: 6.89, postos: 8 },
      dieselS10: { media: 6.85, min: 6.54, max: 7.19, postos: 9 }
    },
    'SUZANO': {
      etanol: { media: 3.66, min: 3.49, max: 3.99, postos: 9 },
      gasolinaAditivada: { media: 6.77, min: 6.29, max: 7.19, postos: 6 },
      gasolina: { media: 6.33, min: 5.89, max: 6.89, postos: 10 },
      gnv: { media: 5.23, min: 4.97, max: 5.49, postos: 2 },
      diesel: { media: 6.67, min: 6.08, max: 7.29, postos: 7 },
      dieselS10: { media: 6.8, min: 6.49, max: 7.49, postos: 8 }
    },
    'TABOAO DA SERRA': {
      etanol: { media: 3.92, min: 3.29, max: 5.99, postos: 8 },
      gasolinaAditivada: { media: 6.81, min: 6.09, max: 8.49, postos: 6 },
      gasolina: { media: 6.38, min: 5.59, max: 7.99, postos: 8 },
      diesel: { media: 7.49, min: 6.29, max: 8.69, postos: 2 },
      dieselS10: { media: 7.13, min: 6.54, max: 7.75, postos: 4 }
    },
    'TAUBATE': {
      etanol: { media: 3.73, min: 3.42, max: 4.09, postos: 14 },
      gasolinaAditivada: { media: 6.28, min: 6.14, max: 6.49, postos: 11 },
      gasolina: { media: 6.05, min: 5.84, max: 6.29, postos: 15 },
      gnv: { media: 5.49, min: 5.49, max: 5.49, postos: 2 },
      diesel: { media: 6.54, min: 6.19, max: 6.79, postos: 4 },
      dieselS10: { media: 6.84, min: 6.49, max: 7.39, postos: 11 }
    },
    'VALINHOS': {
      etanol: { media: 3.76, min: 3.49, max: 4.09, postos: 9 },
      gasolinaAditivada: { media: 6.65, min: 6.09, max: 7.03, postos: 10 },
      gasolina: { media: 6.43, min: 6.09, max: 6.69, postos: 10 },
      diesel: { media: 6.84, min: 6.49, max: 7.29, postos: 4 },
      dieselS10: { media: 6.99, min: 6.69, max: 7.49, postos: 5 }
    },
    'VARZEA PAULISTA': {
      etanol: { media: 3.87, min: 3.69, max: 3.99, postos: 8 },
      gasolinaAditivada: { media: 6.62, min: 6.39, max: 6.84, postos: 6 },
      gasolina: { media: 6.41, min: 6.19, max: 6.49, postos: 8 },
      diesel: { media: 6.53, min: 6.37, max: 6.99, postos: 4 },
      dieselS10: { media: 7.01, min: 6.79, max: 7.35, postos: 6 }
    },
    'VOTORANTIM': {
      etanol: { media: 3.57, min: 3.19, max: 4.15, postos: 8 },
      gasolinaAditivada: { media: 6.75, min: 6.24, max: 7.15, postos: 6 },
      gasolina: { media: 6.45, min: 5.79, max: 6.69, postos: 8 },
      diesel: { media: 6.74, min: 5.89, max: 7.35, postos: 3 },
      dieselS10: { media: 6.63, min: 6.14, max: 7.09, postos: 6 }
    },
    'VOTUPORANGA': {
      etanol: { media: 3.54, min: 3.35, max: 3.9, postos: 9 },
      gasolinaAditivada: { media: 7.1, min: 6.49, max: 9.19, postos: 5 },
      gasolina: { media: 6.61, min: 6.39, max: 7.39, postos: 8 },
      diesel: { media: 6.37, min: 6.19, max: 6.69, postos: 4 },
      dieselS10: { media: 6.92, min: 6.79, max: 7.09, postos: 3 }
    },
  },
  'TO': {
    'ARAGUAINA': {
      etanol: { media: 4.79, min: 4.79, max: 4.79, postos: 1 },
      gasolina: { media: 6.89, min: 6.89, max: 6.89, postos: 1 },
      dieselS10: { media: 6.79, min: 6.79, max: 6.79, postos: 1 }
    },
    'GURUPI': {
      etanol: { media: 5.3, min: 5.18, max: 5.39, postos: 8 },
      gasolinaAditivada: { media: 7.49, min: 7.49, max: 7.49, postos: 1 },
      gasolina: { media: 7.43, min: 7.27, max: 7.87, postos: 9 },
      diesel: { media: 7.23, min: 6.59, max: 7.99, postos: 7 },
      dieselS10: { media: 7.3, min: 6.86, max: 7.49, postos: 7 }
    },
    'PALMAS': {
      etanol: { media: 5.07, min: 4.69, max: 5.49, postos: 14 },
      gasolinaAditivada: { media: 7.12, min: 6.98, max: 7.59, postos: 11 },
      gasolina: { media: 7.01, min: 6.89, max: 7.29, postos: 14 },
      diesel: { media: 7.16, min: 6.97, max: 7.49, postos: 5 },
      dieselS10: { media: 7.17, min: 6.94, max: 7.49, postos: 13 }
    },
    'PARAISO DO TOCANTINS': {
      etanol: { media: 5.13, min: 4.4, max: 6.03, postos: 6 },
      gasolinaAditivada: { media: 7.08, min: 6.89, max: 7.39, postos: 8 },
      gasolina: { media: 6.96, min: 6.69, max: 7.19, postos: 8 },
      diesel: { media: 6.8, min: 6.69, max: 6.89, postos: 5 },
      dieselS10: { media: 6.93, min: 6.69, max: 7.19, postos: 7 }
    },
  },
}


// ─── Helpers de consulta ANP ──────────────────────────────────────────────────

/** Retorna preços médios por UF. Ex: getPrecoANPPorUF('SP').gasolina?.media */
export function getPrecoANPPorUF(uf: string): PrecosPorProduto {
  return PRECOS_ANP_POR_UF[uf.toUpperCase()] || {}
}

/** Retorna preços médios por município (nome em MAIÚSCULAS sem acento). */
export function getPrecoANPPorMunicipio(uf: string, municipio: string): PrecosPorProduto {
  const norm = municipio.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ').trim()
  const ufData = PRECOS_ANP_POR_MUNICIPIO[uf.toUpperCase()] || {}
  // Tentativa exata
  if (ufData[norm]) return ufData[norm]
  // Tentativa por prefixo (ex: "SAO PAULO" bate "SAO PAULO DO POTENGI")
  const chaves = Object.keys(ufData)
  const match = chaves.find(k => k === norm || k.startsWith(norm) || norm.startsWith(k))
  return match ? ufData[match] : {}
}

/** Para exibição: preço médio simples R$/litro da gasolina por UF */
export function getPrecoGasolinaPorUF(uf: string): number | null {
  return PRECOS_ANP_POR_UF[uf]?.gasolina?.media ?? null
}

/** Lista municípios disponíveis para uma UF */
export function getMunicipiosDisponiveis(uf: string): string[] {
  return Object.keys(PRECOS_ANP_POR_MUNICIPIO[uf.toUpperCase()] || {})
}

/** Gera URL dinâmica da planilha resumo semanal ANP (semana atual) */
export function gerarUrlResumoPlanilhaANP(): string {
  const hoje = new Date()
  const dow = hoje.getDay() // 0=dom, 6=sab
  // Última sexta-feira concluída
  const diasAteSexta = dow === 5 ? 0 : dow === 6 ? 1 : (dow + 2) % 7
  const sexta = new Date(hoje)
  sexta.setDate(hoje.getDate() - diasAteSexta)
  const sabado = new Date(sexta)
  sabado.setDate(sexta.getDate() - 6)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const ano = sexta.getFullYear()
  return `https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/${ano}/resumo_semanal_lpc_${fmt(sabado)}_${fmt(sexta)}.xlsx`
}

/** Estatísticas nacionais calculadas dos dados reais ANP */
export function getEstatisticasNacionaisANP() {
  const ufs = Object.keys(PRECOS_ANP_POR_UF)
  const medias = ufs.map(uf => PRECOS_ANP_POR_UF[uf].gasolina?.media).filter(Boolean) as number[]
  const mediaGasolinaBrasil = medias.length ? +(medias.reduce((a,b) => a+b, 0) / medias.length).toFixed(2) : 6.67
  const municipiosCobertos = Object.values(PRECOS_ANP_POR_MUNICIPIO).reduce((acc, muns) => acc + Object.keys(muns).length, 0)
  return {
    totalPostos: 46071,
    totalMunicipios: 5570,
    municipiosCobertos,
    ufsCobertos: ufs.length,
    semanaReferencia: `${ANP_SEMANA.inicio} a ${ANP_SEMANA.fim}`,
    mediaGasolinaBrasil,
    fonteDados: 'ANP – Agência Nacional do Petróleo',
  }
}


// ─── Gerar HTML do Mapa Brasil ────────────────────────────────────────────────
export function getMapaBrasilHTML(): string {
  const stats = getEstatisticasNacionaisANP()
  
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
</div>

<!-- Stats Bar -->
<div id="stats-bar">
  <div class="stat-item" onclick="carregarPostos()">
    <span class="stat-value" id="stat-total">46.071</span>
    <span class="stat-label">Postos ANP</span>
  </div>
  <div class="stat-item">
    <span class="stat-value" id="stat-municipios">382</span>
    <span class="stat-label">Municípios pesquisados</span>
  </div>
  <div class="stat-item">
    <span class="stat-value" id="stat-gas">R$ 6,81</span>
    <span class="stat-label">Gasolina média</span>
  </div>
  <div class="stat-item">
    <span class="stat-value" id="stat-etanol">R$ 4,82</span>
    <span class="stat-label">Etanol médio</span>
  </div>
  <div class="stat-item">
    <span class="stat-value" id="stat-diesel">R$ 7,14</span>
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
  <div class="preco-row"><span class="preco-tipo">⛽ Gasolina</span><span class="preco-val">R$ 6,81</span></div>
  <div class="preco-row"><span class="preco-tipo">⭐ Aditivada</span><span class="preco-val">R$ 6,97</span></div>
  <div class="preco-row"><span class="preco-tipo">🌿 Etanol</span><span class="preco-val">R$ 4,82</span></div>
  <div class="preco-row"><span class="preco-tipo">🚛 Diesel S10</span><span class="preco-val">R$ 7,14</span></div>
  <div class="preco-row"><span class="preco-tipo">🔵 GNV</span><span class="preco-val">R$ 4,70</span></div>
  <div style="margin-top:8px;font-size:9px;color:#546E7A;text-align:center">
    Semana ${ANP_SEMANA.inicio} a ${ANP_SEMANA.fim} • ANP oficial
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

// Preços reais ANP por UF (27 estados) — semana ${ANP_SEMANA.inicio} a ${ANP_SEMANA.fim}
// Cada produto: { media, min, max, postos }
const PRECOS_UF_RAW = ${JSON.stringify(PRECOS_ANP_POR_UF)};
// Compatibilidade: mapa simples uf -> { gasolina: number, ... }
const PRECOS_UF = Object.fromEntries(
  Object.entries(PRECOS_UF_RAW).map(([uf, p]) => [uf, Object.fromEntries(
    Object.entries(p).map(([k, v]) => [k, v.media])
  )])
);

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
        \${precosUF.gnv ? \`<div class="popup-preco"><div class="tipo">🔵 GNV</div><div class="valor">R$ \${precosUF.gnv.toFixed(2)}</div></div>\` : ''}
        \${precosUF.glp ? \`<div class="popup-preco"><div class="tipo">🏮 GLP</div><div class="valor">R$ \${precosUF.glp.toFixed(2)}/13kg</div></div>\` : ''}
      </div>
    \` : \`<div style="font-size:11px;color:#8B9AB1;margin-bottom:8px">⚠️ Preços ANP não coletados nesta cidade esta semana</div>\`;
    
    const popupContent = \`
      <div class="popup-posto">
        <h3>\${emojiPorBandeira(posto.bandeira)} \${posto.nome}</h3>
        <div class="endereco">📍 \${posto.endereco}, \${posto.municipio} - \${posto.uf}</div>
        \${precosHTML}
        <div class="popup-footer">Fonte: ANP • Semana ${ANP_SEMANA.inicio} → ${ANP_SEMANA.fim} • ANP oficial</div>
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
