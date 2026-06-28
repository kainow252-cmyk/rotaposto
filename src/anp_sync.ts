// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Sync automático XLSX ANP → KV
//  Baixa o arquivo semanal de preços por posto revendedor da ANP,
//  parseia via ZIP/XML (OOXML) sem dependências externas e salva no KV.
//  Chave KV: "precos:cnpj:v2" → { semana, postos: {cnpj → precos}, ts }
// ═══════════════════════════════════════════════════════════════════════

// Mapeamento estado nome → UF sigla
const ESTADO_UF: Record<string, string> = {
  'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPA': 'AP', 'AMAZONAS': 'AM', 'BAHIA': 'BA',
  'CEARA': 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPIRITO SANTO': 'ES', 'GOIAS': 'GO',
  'MARANHAO': 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS',
  'MINAS GERAIS': 'MG', 'PARA': 'PA', 'PARAIBA': 'PB', 'PARANA': 'PR',
  'PERNAMBUCO': 'PE', 'PIAUI': 'PI', 'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN',
  'RIO GRANDE DO SUL': 'RS', 'RONDONIA': 'RO', 'RORAIMA': 'RR', 'SANTA CATARINA': 'SC',
  'SAO PAULO': 'SP', 'SERGIPE': 'SE', 'TOCANTINS': 'TO',
}

// Colunas do XLSX (header na linha 10, índice 0)
// Col 0=CNPJ, 1=RAZÃO, 2=FANTASIA, 3=ENDEREÇO, 4=NÚMERO, 5=COMPL, 6=BAIRRO,
// 7=CEP, 8=MUNICÍPIO, 9=ESTADO, 10=BANDEIRA, 11=PRODUTO, 12=UNIDADE, 13=PREÇO, 14=DATA
const COL_CNPJ = 0
const COL_MUNICIPIO = 8
const COL_ESTADO = 9
const COL_PRODUTO = 11
const COL_PRECO = 13

// Mapeamento produto ANP → campo interno
const PRODUTO_MAP: Record<string, string> = {
  'GASOLINA COMUM': 'g',
  'GASOLINA C COMUM': 'g',
  'GASOLINA ADITIVADA': 'ga',
  'GASOLINA C ADITIVADA': 'ga',
  'ETANOL': 'e',
  'ETANOL HIDRATADO': 'e',
  'DIESEL S500': 'd',
  'DIESEL': 'd',
  'DIESEL S10': 'ds',
  'GNV': 'n',
  'GLP': 'l',
}

export interface PrecoPostoKV {
  u: string   // UF sigla
  m: string   // município
  g?: number  // gasolina
  ga?: number // gasolinaAditivada
  e?: number  // etanol
  d?: number  // diesel
  ds?: number // dieselS10
  n?: number  // gnv
  l?: number  // glp
}

export interface ANPSyncResult {
  semana: string
  totalPostos: number
  postos: Record<string, PrecoPostoKV>
  ts: number
  url: string
}

// ─── Gerar URL do XLSX da semana mais recente ──────────────────────────────
// A ANP publica toda semana (geralmente sábado) com o padrão:
// revendas_lpc_{YYYY-MM-DD}_{YYYY-MM-DD}.xlsx
// A data de início é sempre domingo e a data de fim é sábado.
function getAnpXlsxUrl(dataRef?: Date): { url: string; semana: string } {
  const now = dataRef || new Date()

  // Encontrar o domingo mais recente (início da semana ANP)
  const dow = now.getUTCDay() // 0=dom, 6=sab
  // A semana ANP vai de domingo a sábado
  // Publicada na quinta/sexta da semana SEGUINTE
  // Então: pegar a semana que terminou no sábado mais recente
  const diasAteSabado = dow === 0 ? 6 : (dow === 6 ? 0 : 6 - dow)
  const sabado = new Date(now)
  sabado.setUTCDate(now.getUTCDate() - diasAteSabado - (dow === 6 ? 0 : dow + 1))

  // domingo = sabado - 6
  const domingo = new Date(sabado)
  domingo.setUTCDate(sabado.getUTCDate() - 6)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const ini = fmt(domingo)
  const fim = fmt(sabado)
  const semana = `${ini} a ${fim}`
  const url = `https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/${ini.slice(0, 4)}/revendas_lpc_${ini}_${fim}.xlsx`
  return { url, semana }
}

// ─── Listar últimas N URLs candidatas (para tentar em ordem) ───────────────
export function getAnpXlsxUrlCandidates(n = 4): Array<{ url: string; semana: string }> {
  const candidates = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const ref = new Date(now)
    ref.setUTCDate(now.getUTCDate() - i * 7)
    candidates.push(getAnpXlsxUrl(ref))
  }
  // Dedup por semana
  const seen = new Set<string>()
  return candidates.filter(c => {
    if (seen.has(c.semana)) return false
    seen.add(c.semana)
    return true
  })
}

// ─── Parser XLSX via ZIP+XML (sem dependências) ────────────────────────────
// XLSX é um ZIP. Precisamos extrair xl/sharedStrings.xml e xl/worksheets/sheet1.xml
// Cloudflare Workers tem DecompressionStream mas NÃO tem ZIP nativo.
// Usamos a API de DecompressionStream para inflate raw e um mini parser de ZIP.

// Mini parser de ZIP (PKZIP local file headers)
function parseZipEntries(buf: ArrayBuffer): Map<string, ArrayBuffer> {
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)
  const entries = new Map<string, ArrayBuffer>()

  let offset = 0
  while (offset + 30 < bytes.length) {
    // Local file header signature: 0x04034b50
    if (view.getUint32(offset, true) !== 0x04034b50) break

    const compression = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const fnLen = view.getUint16(offset + 26, true)
    const extraLen = view.getUint16(offset + 28, true)
    const nameBytes = bytes.slice(offset + 30, offset + 30 + fnLen)
    const name = new TextDecoder().decode(nameBytes)
    const dataStart = offset + 30 + fnLen + extraLen
    const compressedData = buf.slice(dataStart, dataStart + compressedSize)

    entries.set(name, compressedData)  // guarda comprimido + flag
    // Guardar se está comprimido (8 = deflate, 0 = store)
    entries.set(name + ':method', new Uint8Array([compression]).buffer)

    offset = dataStart + compressedSize

    // Se compressedSize == 0 temos data descriptor, avançar
    if (compressedSize === 0) {
      // Procurar próximo header
      while (offset + 4 < bytes.length) {
        if (view.getUint32(offset, true) === 0x04034b50 ||
            view.getUint32(offset, true) === 0x02014b50) break
        offset++
      }
    }
  }
  return entries
}

async function inflateRaw(data: ArrayBuffer): Promise<ArrayBuffer> {
  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  const reader = ds.readable.getReader()
  writer.write(new Uint8Array(data))
  writer.close()
  const chunks: Uint8Array[] = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  const total = chunks.reduce((a, c) => a + c.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) { out.set(c, off); off += c.length }
  return out.buffer
}

async function extractXml(entries: Map<string, ArrayBuffer>, name: string): Promise<string | null> {
  const data = entries.get(name)
  if (!data) return null
  const methodBuf = entries.get(name + ':method')
  const method = methodBuf ? new Uint8Array(methodBuf)[0] : 8
  let raw: ArrayBuffer
  if (method === 8) {
    try { raw = await inflateRaw(data) } catch { return null }
  } else {
    raw = data
  }
  return new TextDecoder('utf-8').decode(raw)
}

// Parser XML simples para extrair células do sheet XLSX
function parseSharedStrings(xml: string): string[] {
  const strs: string[] = []
  // <si><t>...</t></si> ou <si><t xml:space="preserve">...</t></si>
  const siRe = /<si[^>]*>([\s\S]*?)<\/si>/g
  let m
  while ((m = siRe.exec(xml)) !== null) {
    const inner = m[1]
    // Concatenar todos os <t>...</t> dentro de <si>
    const tRe = /<t[^>]*>([^<]*)<\/t>/g
    let tm
    let val = ''
    while ((tm = tRe.exec(inner)) !== null) {
      val += tm[1]
    }
    // Unescape XML entities
    val = val.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    strs.push(val)
  }
  return strs
}

interface XlsxCell {
  col: number
  type: string  // 's'=string, 'n'=number, ''=number
  value: string
}

function parseWorksheet(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = []
  // Extrair linhas: <row r="N">...</row>
  const rowRe = /<row[^>]+r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g
  let rm
  while ((rm = rowRe.exec(xml)) !== null) {
    const rowIdx = parseInt(rm[1]) - 1
    const rowXml = rm[2]
    const cells: Record<number, string> = {}

    // Extrair células: <c r="A1" t="s"><v>0</v></c>
    const cellRe = /<c\s+r="([A-Z]+)(\d+)"([^>]*)>\s*(?:<v>([^<]*)<\/v>)?\s*<\/c>/g
    let cm
    while ((cm = cellRe.exec(rowXml)) !== null) {
      const colStr = cm[1]
      const attrs = cm[3]
      const rawVal = cm[4] || ''
      // Converter col letter → index
      let colIdx = 0
      for (let i = 0; i < colStr.length; i++) {
        colIdx = colIdx * 26 + (colStr.charCodeAt(i) - 64)
      }
      colIdx -= 1  // 0-based

      // Tipo: t="s" = shared string, t="str" = formula string, else number
      const isShared = attrs.includes('t="s"')
      const isStr = attrs.includes('t="str"')
      let val = rawVal
      if (isShared && rawVal !== '') {
        val = sharedStrings[parseInt(rawVal)] || ''
      }
      cells[colIdx] = val
    }

    // Preencher array com os valores até o maior índice
    const maxCol = Math.max(...Object.keys(cells).map(Number), 14)
    const row: string[] = new Array(maxCol + 1).fill('')
    for (const [col, val] of Object.entries(cells)) {
      row[parseInt(col)] = val
    }
    rows[rowIdx] = row
  }
  return rows.filter(Boolean)
}

// ─── Função principal: baixar + processar XLSX ANP ─────────────────────────
export async function processarXlsxAnp(
  xlsxBuf: ArrayBuffer,
  semana: string
): Promise<ANPSyncResult> {
  // 1. Parsear ZIP
  const entries = parseZipEntries(xlsxBuf)

  // 2. Extrair sharedStrings e worksheet
  const [ssXml, wsXml] = await Promise.all([
    extractXml(entries, 'xl/sharedStrings.xml'),
    extractXml(entries, 'xl/worksheets/sheet1.xml'),
  ])

  if (!ssXml || !wsXml) {
    throw new Error('Não foi possível extrair XML do XLSX')
  }

  const sharedStrings = parseSharedStrings(ssXml)
  const rows = parseWorksheet(wsXml, sharedStrings)

  // 3. Processar dados (header na linha 10, índice 9)
  const postos: Record<string, PrecoPostoKV> = {}
  let linhasProcessadas = 0

  for (let i = 10; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[COL_CNPJ]) continue

    const cnpjRaw = row[COL_CNPJ].replace(/\D/g, '').padStart(14, '0')
    if (cnpjRaw.length !== 14 || cnpjRaw === '00000000000000') continue

    const produtoRaw = (row[COL_PRODUTO] || '').toUpperCase().trim()
    const precoRaw = row[COL_PRECO]
    const preco = parseFloat(precoRaw)
    if (!preco || preco < 1 || preco > 50) continue

    const estadoNome = (row[COL_ESTADO] || '').toUpperCase().trim()
    const municipio = (row[COL_MUNICIPIO] || '').toUpperCase().trim()

    // Mapear produto
    let campo: string | null = null
    for (const [k, v] of Object.entries(PRODUTO_MAP)) {
      if (produtoRaw.includes(k)) { campo = v; break }
    }
    if (!campo) continue

    const uf = ESTADO_UF[estadoNome] || estadoNome.slice(0, 2)
    if (!postos[cnpjRaw]) {
      postos[cnpjRaw] = { u: uf, m: municipio }
    }
    ;(postos[cnpjRaw] as any)[campo] = Math.round(preco * 100) / 100
    linhasProcessadas++
  }

  return {
    semana,
    totalPostos: Object.keys(postos).length,
    postos,
    ts: Date.now(),
    url: '',
  }
}

// ─── Salvar no KV ─────────────────────────────────────────────────────────
// Divide em chunks de UF para não exceder o limite de 25MB do KV por valor
export async function salvarPrecoKV(
  kv: KVNamespace,
  result: ANPSyncResult
): Promise<void> {
  // Salvar dados completos comprimidos
  const payload = JSON.stringify({
    semana: result.semana,
    ts: result.ts,
    totalPostos: result.totalPostos,
    postos: result.postos,
  })

  // Comprimir com gzip
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  const reader = cs.readable.getReader()
  writer.write(new TextEncoder().encode(payload))
  writer.close()
  const chunks: Uint8Array[] = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  const total = chunks.reduce((a, c) => a + c.length, 0)
  const compressed = new Uint8Array(total)
  let off = 0
  for (const c of chunks) { compressed.set(c, off); off += c.length }

  // Salvar no KV com TTL de 10 dias
  await kv.put('precos:cnpj:v2', compressed.buffer, {
    expirationTtl: 10 * 24 * 60 * 60,
    metadata: { semana: result.semana, totalPostos: result.totalPostos, ts: result.ts }
  })

  // Salvar metadados separados (pequeno, sem TTL)
  await kv.put('precos:meta', JSON.stringify({
    semana: result.semana,
    totalPostos: result.totalPostos,
    ts: result.ts,
    updatedAt: new Date().toISOString(),
  }))
}

// ─── Carregar do KV ────────────────────────────────────────────────────────
export async function carregarPrecoKV(
  kv: KVNamespace | undefined
): Promise<ANPSyncResult | null> {
  if (!kv) return null
  try {
    const buf = await kv.get('precos:cnpj:v2', 'arrayBuffer')
    if (!buf) return null

    const bytes = new Uint8Array(buf)
    let text: string
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      const ds = new DecompressionStream('gzip')
      const writer = ds.writable.getWriter()
      const reader = ds.readable.getReader()
      writer.write(bytes); writer.close()
      const chunks: Uint8Array[] = []
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }
      const total = chunks.reduce((a, c) => a + c.length, 0)
      const merged = new Uint8Array(total)
      let off = 0
      for (const c of chunks) { merged.set(c, off); off += c.length }
      text = new TextDecoder().decode(merged)
    } else {
      text = new TextDecoder().decode(bytes)
    }
    return JSON.parse(text)
  } catch { return null }
}

// ─── Status da semana ANP atual ────────────────────────────────────────────
export function getSemanaANPAtual(): { inicio: string; fim: string; url: string } {
  const candidates = getAnpXlsxUrlCandidates(1)
  const c = candidates[0]
  const parts = c.semana.split(' a ')
  return { inicio: parts[0], fim: parts[1], url: c.url }
}
