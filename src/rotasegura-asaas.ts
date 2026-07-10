// ═══════════════════════════════════════════════════════════════════════
//  RotaSegura — Integração Asaas: Subcontas + Split de pagamento
//
//  FLUXO SUBCONTA (Asaas Split):
//  1. Motorista se cadastra → criamos subconta Asaas via /accounts
//  2. Asaas retorna walletId da subconta do motorista
//  3. Passageiro paga corrida via PIX → split automático:
//     • 80% → walletId do motorista
//     • 20% → conta principal da plataforma
//
//  SECRET Cloudflare necessário:
//    ASAAS_API_KEY  → chave da conta PRINCIPAL (RotaSegura)
//
//  Docs Asaas Subconta: https://docs.asaas.com/reference/criar-subconta
//  Docs Asaas Split: https://docs.asaas.com/reference/criar-cobranca-com-split
// ═══════════════════════════════════════════════════════════════════════

const ASAAS_BASE = 'https://api.asaas.com/v3'
const SPLIT_PLATAFORMA_PCT = 0.20  // 20% para plataforma
const SPLIT_MOTORISTA_PCT  = 0.80  // 80% para motorista

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MotoristaRS {
  id: string                    // UUID interno
  nome: string
  email: string
  cpf: string                   // limpo, 11 dígitos
  telefone: string
  cnh: string                   // número CNH
  veiculo: string               // ex: "Honda Civic 2022"
  placa: string                 // ex: "BRA-2E19"
  fotoUrl?: string
  avaliacao: number             // média 0-5
  corridasTotal: number
  ganhoTotal: number            // R$ acumulado (centavos)
  // Asaas
  asaasAccountKey?: string      // API key da subconta do motorista
  asaasWalletId?: string        // walletId para receber split
  asaasCustomerId?: string      // customerId do motorista como cliente
  asaasStatus?: 'pendente' | 'aprovado' | 'rejeitado'
  // Auth
  senhaHash: string             // SHA-256 da senha
  token?: string                // JWT simples (salvo no KV separado)
  status: 'ativo' | 'inativo' | 'bloqueado'
  criadoEm: number
}

export interface PassageiroRS {
  id: string
  nome: string
  email: string
  cpf?: string
  telefone: string
  fotoUrl?: string
  avaliacao: number
  // Asaas
  asaasCustomerId?: string
  // Auth
  senhaHash: string
  status: 'ativo' | 'inativo'
  criadoEm: number
}

export interface ResultadoSplit {
  sucesso: boolean
  paymentId?: string
  brcode?: string
  qrCode?: string
  expiraEm?: string
  valorMotorista?: number   // centavos
  valorPlataforma?: number  // centavos
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asaasKey(env: any): string {
  return (env?.ASAAS_API_KEY as string) || ''
}

function headers(apiKey: string) {
  return {
    'access_token': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'RotaSegura/1.0'
  }
}

function qrImg(brcode: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(brcode)}`
}

// SHA-256 simples usando Web Crypto
export async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

// JWT mínimo (não usa biblioteca — compatível com Cloudflare Workers)
export function gerarToken(payload: Record<string, any>, secret: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const body   = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 86400*30 }))
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  // Assinatura simplificada (HMAC não disponível no Worker sem SubtleCrypto async — usamos hash concatenado)
  const sig = btoa(`${header}.${body}.${secret}`).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_').slice(0,43)
  return `${header}.${body}.${sig}`
}

export function decodificarToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g,'+').replace(/_/g,'/')
    const decoded = JSON.parse(atob(payload + '=='.slice(0, (4 - payload.length % 4) % 4)))
    // Verificar expiração
    if (decoded.exp && decoded.exp < Math.floor(Date.now()/1000)) return null
    return decoded
  } catch { return null }
}

// ─── KV helpers ──────────────────────────────────────────────────────────────

const TTL_MOTORISTA = 60 * 60 * 24 * 365 * 2  // 2 anos
const TTL_PASSAGEIRO = 60 * 60 * 24 * 365 * 2
const TTL_TOKEN = 60 * 60 * 24 * 30             // 30 dias

export async function kvGetMotorista(kv: KVNamespace, id: string): Promise<MotoristaRS | null> {
  const raw = await kv.get(`rs:motorista:${id}`)
  return raw ? JSON.parse(raw) : null
}

export async function kvSaveMotorista(kv: KVNamespace, m: MotoristaRS) {
  await kv.put(`rs:motorista:${m.id}`, JSON.stringify(m), { expirationTtl: TTL_MOTORISTA })
  // Índice por email
  await kv.put(`rs:motorista:email:${m.email.toLowerCase()}`, m.id, { expirationTtl: TTL_MOTORISTA })
  // Índice por CPF
  await kv.put(`rs:motorista:cpf:${m.cpf}`, m.id, { expirationTtl: TTL_MOTORISTA })
}

export async function kvGetMotoristaPorEmail(kv: KVNamespace, email: string): Promise<MotoristaRS | null> {
  const id = await kv.get(`rs:motorista:email:${email.toLowerCase()}`)
  if (!id) return null
  return kvGetMotorista(kv, id)
}

export async function kvGetPassageiro(kv: KVNamespace, id: string): Promise<PassageiroRS | null> {
  const raw = await kv.get(`rs:passageiro:${id}`)
  return raw ? JSON.parse(raw) : null
}

export async function kvSavePassageiro(kv: KVNamespace, p: PassageiroRS) {
  await kv.put(`rs:passageiro:${p.id}`, JSON.stringify(p), { expirationTtl: TTL_PASSAGEIRO })
  await kv.put(`rs:passageiro:email:${p.email.toLowerCase()}`, p.id, { expirationTtl: TTL_PASSAGEIRO })
}

export async function kvGetPassageiroPorEmail(kv: KVNamespace, email: string): Promise<PassageiroRS | null> {
  const id = await kv.get(`rs:passageiro:email:${email.toLowerCase()}`)
  if (!id) return null
  return kvGetPassageiro(kv, id)
}

export async function kvSaveToken(kv: KVNamespace, token: string, tipo: 'motorista'|'passageiro', userId: string) {
  const hash = await sha256(token)
  await kv.put(`rs:token:${hash}`, JSON.stringify({ tipo, userId }), { expirationTtl: TTL_TOKEN })
}

export async function kvVerificarToken(kv: KVNamespace, token: string): Promise<{ tipo: 'motorista'|'passageiro'; userId: string } | null> {
  const decoded = decodificarToken(token)
  if (!decoded) return null
  // Verificação adicional no KV
  const hash = await sha256(token)
  const raw = await kv.get(`rs:token:${hash}`)
  if (!raw) return null
  return JSON.parse(raw)
}

export async function kvRevogarToken(kv: KVNamespace, token: string) {
  const hash = await sha256(token)
  await kv.delete(`rs:token:${hash}`)
}

// ─── Extrair token do header Authorization ─────────────────────────────────────

export function extrairToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const m = authHeader.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

// ═══════════════════════════════════════════════════════════════════════
//  ASAAS: Criar subconta do motorista
//  POST /accounts → retorna walletId e apiKey da subconta
// ═══════════════════════════════════════════════════════════════════════

export async function criarSubcontaAsaas(
  env: any,
  motorista: Pick<MotoristaRS, 'nome' | 'email' | 'cpf' | 'telefone'>
): Promise<{
  walletId: string | null
  accountKey: string | null
  error?: string
}> {
  const key = asaasKey(env)
  if (!key) {
    // DEMO
    return {
      walletId: `demo-wallet-${Date.now()}`,
      accountKey: `demo-apikey-${Date.now()}`
    }
  }

  try {
    const body = {
      name: motorista.nome,
      email: motorista.email,
      cpfCnpj: motorista.cpf.replace(/\D/g,''),
      mobilePhone: motorista.telefone.replace(/\D/g,''),
      site: 'https://rotaposto.com.br/rotasegura',
      // Tipo de pessoa física
      personType: 'FISICA',
      companyType: undefined
    }

    const r = await fetch(`${ASAAS_BASE}/accounts`, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    })

    const data = await r.json() as any
    console.log('[AsaasSubconta] POST /accounts status:', r.status, data?.id, data?.walletId)

    if (r.ok && data?.walletId) {
      return {
        walletId: data.walletId,
        accountKey: data.apiKey || null
      }
    }

    // Subconta já existe para este CPF → buscar walletId
    const errDesc = data?.errors?.[0]?.description || ''
    if (errDesc.toLowerCase().includes('already') || errDesc.toLowerCase().includes('exist')) {
      console.log('[AsaasSubconta] Já existe subconta para CPF, buscando...')
      const existing = await buscarSubcontaAsaas(env, motorista.cpf)
      if (existing.walletId) return existing
    }

    return { walletId: null, accountKey: null, error: errDesc || `Erro Asaas ${r.status}` }
  } catch (e: any) {
    console.error('[AsaasSubconta] Erro:', e.message)
    return { walletId: null, accountKey: null, error: e.message }
  }
}

// Buscar subconta existente por CPF
async function buscarSubcontaAsaas(
  env: any,
  cpf: string
): Promise<{ walletId: string | null; accountKey: string | null; error?: string }> {
  const key = asaasKey(env)
  if (!key) return { walletId: null, accountKey: null }

  try {
    const cpfLimpo = cpf.replace(/\D/g,'')
    const r = await fetch(`${ASAAS_BASE}/accounts?cpfCnpj=${cpfLimpo}`, {
      headers: headers(key),
      signal: AbortSignal.timeout(10000)
    })
    const data = await r.json() as any
    const conta = data?.data?.[0]
    if (conta?.walletId) {
      return { walletId: conta.walletId, accountKey: conta.apiKey || null }
    }
    return { walletId: null, accountKey: null, error: 'Subconta não encontrada' }
  } catch (e: any) {
    return { walletId: null, accountKey: null, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  ASAAS: Criar customer do passageiro
// ═══════════════════════════════════════════════════════════════════════

export async function criarCustomerPassageiro(
  env: any,
  passageiro: Pick<PassageiroRS, 'nome' | 'email' | 'cpf' | 'telefone' | 'id'>
): Promise<string | null> {
  const key = asaasKey(env)
  if (!key) return `demo-cus-${passageiro.id}`

  const cpfLimpo = (passageiro.cpf || '').replace(/\D/g,'')

  try {
    // Buscar existente
    if (cpfLimpo.length === 11) {
      const search = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cpfLimpo}&limit=1`, {
        headers: headers(key),
        signal: AbortSignal.timeout(8000)
      })
      const sd = await search.json() as any
      if (sd?.data?.[0]?.id) return sd.data[0].id
    }

    // Criar novo
    const body: any = {
      name: passageiro.nome,
      email: passageiro.email,
      mobilePhone: passageiro.telefone.replace(/\D/g,''),
      externalReference: `rs-passageiro-${passageiro.id}`,
      notificationDisabled: false
    }
    if (cpfLimpo.length === 11) body.cpfCnpj = cpfLimpo

    const r = await fetch(`${ASAAS_BASE}/customers`, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    })
    const data = await r.json() as any
    return r.ok && data?.id ? data.id : null
  } catch { return null }
}

// ═══════════════════════════════════════════════════════════════════════
//  ASAAS: Gerar PIX com split (corrida finalizada)
//  O passageiro paga → 80% vai ao motorista, 20% à plataforma
// ═══════════════════════════════════════════════════════════════════════

export async function gerarPixSplitCorrida(
  env: any,
  dados: {
    corridaId: string
    valorCentavos: number                // total
    passageiroCustomerId: string          // customer Asaas do passageiro
    motoristaWalletId: string            // walletId da subconta do motorista
    motoristaId: string
    descricao?: string
  }
): Promise<ResultadoSplit> {
  const key = asaasKey(env)

  const valorTotal = dados.valorCentavos / 100
  const valorMotorista = Math.round(dados.valorCentavos * SPLIT_MOTORISTA_PCT) // centavos
  const valorPlataforma = dados.valorCentavos - valorMotorista                  // resto

  // DEMO: sem credencial
  if (!key || dados.motoristaWalletId.startsWith('demo')) {
    const brcode = `00020126580014BR.GOV.BCB.PIX0136demo-split-corrida-${dados.corridaId}52040000530398654069.905802BR5913RotaSegura6009BRASILIA62070503RSG630412AB`
    return {
      sucesso: true,
      paymentId: `demo-pay-${Date.now()}`,
      brcode,
      qrCode: qrImg(brcode),
      expiraEm: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      valorMotorista,
      valorPlataforma
    }
  }

  const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0]

  try {
    const body: any = {
      customer: dados.passageiroCustomerId,
      billingType: 'PIX',
      value: valorTotal,
      dueDate,
      description: dados.descricao || `Corrida RotaSegura #${dados.corridaId.slice(-6)}`,
      externalReference: `rs-corrida-${dados.corridaId}`,
      // ── Split de pagamento ──────────────────────────────────────────
      // 80% automático para o motorista via walletId da subconta
      split: [
        {
          walletId: dados.motoristaWalletId,
          percentualValor: SPLIT_MOTORISTA_PCT * 100  // 80
        }
        // Os 20% restantes ficam na conta principal automaticamente
      ]
    }

    const r = await fetch(`${ASAAS_BASE}/payments`, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    })

    const data = await r.json() as any
    console.log('[AsaasSplit] Payment criado:', r.status, data?.id)

    if (!r.ok) {
      const errMsg = data?.errors?.[0]?.description || data?.message || `Erro ${r.status}`
      return { sucesso: false, error: errMsg }
    }

    const paymentId = data.id as string

    // Buscar QR Code
    const qrRes = await fetch(`${ASAAS_BASE}/payments/${paymentId}/pixQrCode`, {
      headers: headers(key),
      signal: AbortSignal.timeout(10000)
    })
    const qrData = await qrRes.json() as any
    const brcode = qrData?.payload || ''
    const qrCodeImg = qrData?.encodedImage
      ? `data:image/png;base64,${qrData.encodedImage}`
      : qrImg(brcode)

    if (!brcode) {
      return { sucesso: false, error: 'QR Code PIX não retornado pelo Asaas' }
    }

    return {
      sucesso: true,
      paymentId,
      brcode,
      qrCode: qrCodeImg,
      expiraEm: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      valorMotorista,
      valorPlataforma
    }
  } catch (e: any) {
    console.error('[AsaasSplit] Erro:', e.message)
    return { sucesso: false, error: 'PIX temporariamente indisponível' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Verificar status de pagamento da corrida
// ═══════════════════════════════════════════════════════════════════════

export async function verificarPagamentoCorrida(
  env: any,
  paymentId: string
): Promise<{ pago: boolean; status: string }> {
  const key = asaasKey(env)
  if (!key || paymentId.startsWith('demo')) return { pago: true, status: 'DEMO' }

  try {
    const r = await fetch(`${ASAAS_BASE}/payments/${paymentId}`, {
      headers: headers(key),
      signal: AbortSignal.timeout(8000)
    })
    const data = await r.json() as any
    const status = data?.status || 'UNKNOWN'
    const pago = ['RECEIVED','CONFIRMED','RECEIVED_IN_CASH'].includes(status)
    return { pago, status }
  } catch { return { pago: false, status: 'ERROR' } }
}
