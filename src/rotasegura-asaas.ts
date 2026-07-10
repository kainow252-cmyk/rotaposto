// ═══════════════════════════════════════════════════════════════════════
//  RotaSegura — Integração Asaas: Subcontas + Split de pagamento
//
//  REGRAS ASAAS (2025):
//  • Subcontas EXIGEM CNPJ (MEI ou empresa) — CPF puro NÃO cria subconta
//  • Campos obrigatórios: name, email, cpfCnpj (CNPJ), companyType,
//    mobilePhone, address, addressNumber, province, postalCode, incomeValue
//  • apiKey e walletId retornam APENAS na criação → salvar imediatamente no KV
//  • Split: walletId do motorista recebe % automático no payment
//
//  FLUXO:
//  1. Motorista cadastra com CNPJ (MEI) + CEP
//  2. Plataforma cria subconta Asaas → recebe walletId + apiKey
//  3. walletId salvo no perfil do motorista no KV
//  4. Passageiro paga corrida → split 80% motorista / 20% plataforma
//  5. Webhook Asaas confirma → atualiza ganhos do motorista
//
//  FALLBACK (motorista PF sem CNPJ):
//  → Pagamento vai 100% para conta principal
//  → Repasse manual via transferência Asaas
// ═══════════════════════════════════════════════════════════════════════

const ASAAS_BASE = 'https://api.asaas.com/v3'
const SPLIT_MOTORISTA_PCT = 80   // 80% para motorista
// const SPLIT_PLATAFORMA_PCT = 20 // 20% para plataforma (fica automaticamente)

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MotoristaRS {
  id: string
  nome: string
  email: string
  cpf: string          // CPF, 11 dígitos (pessoa física)
  cnpj?: string        // CNPJ do MEI, 14 dígitos (obrigatório para subconta)
  telefone: string
  cnh: string
  veiculo: string
  placa: string
  // Endereço (necessário para subconta Asaas)
  cep?: string
  logradouro?: string
  numero?: string
  bairro?: string
  cidade?: string
  uf?: string
  // Dados financeiros (necessário para subconta)
  rendaMensal?: number  // em R$ (ex: 3000)
  dataNascimento?: string // YYYY-MM-DD (para PF)
  // Asaas
  asaasAccountKey?: string   // apiKey da subconta — salvar e nunca exibir
  asaasWalletId?: string     // walletId para split
  asaasCustomerId?: string   // customerId quando paga como passageiro
  asaasSubcontaId?: string   // ID da subconta Asaas
  asaasStatus?: 'pendente' | 'aprovado' | 'sem_cnpj' | 'erro'
  asaasErro?: string
  // Documentos (base64 ou URL)
  fotoSelfie?: string      // selfie do motorista
  fotoCnh?: string         // foto da CNH
  fotoDocVeiculo?: string  // foto do documento do veículo
  fotoCnhVerso?: string    // verso da CNH (opcional)
  docsStatus?: 'pendente' | 'aprovado' | 'rejeitado'
  docsObs?: string         // observação do admin
  // Geolocalização no cadastro
  geoLat?: number
  geoLng?: number
  geoEndereco?: string
  // Métricas
  avaliacao: number
  corridasTotal: number
  ganhoTotal: number   // centavos
  // Auth
  senhaHash: string
  status: 'ativo' | 'inativo' | 'bloqueado'
  criadoEm: number
}

export interface PassageiroRS {
  id: string
  nome: string
  email: string
  cpf?: string
  telefone: string
  fotoSelfie?: string      // selfie do passageiro
  fotoDoc?: string         // doc de identidade (opcional)
  docsStatus?: 'pendente' | 'aprovado' | 'rejeitado'
  // Geolocalização no cadastro
  geoLat?: number
  geoLng?: number
  geoEndereco?: string
  avaliacao: number
  asaasCustomerId?: string
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
  valorMotorista?: number
  valorPlataforma?: number
  temSplit?: boolean  // false quando motorista sem CNPJ (sem walletId)
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
    'User-Agent': 'RotaSegura/2.0 (rotaposto.com.br)'
  }
}

function qrImg(brcode: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(brcode)}`
}

// SHA-256 via Web Crypto
export async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// JWT mínimo compatível com Cloudflare Workers (sem libs externas)
export function gerarToken(payload: Record<string, any>, _secret: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const body = btoa(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 30
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const sig = btoa(`${header}.${body}.${_secret}`)
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_').slice(0, 43)
  return `${header}.${body}.${sig}`
}

export function decodificarToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const pad = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(pad + '=='.slice(0, (4 - pad.length % 4) % 4)))
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null
    return decoded
  } catch { return null }
}

export function extrairToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const m = authHeader.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

// ─── KV ───────────────────────────────────────────────────────────────────────

const TTL2Y  = 60 * 60 * 24 * 365 * 2
const TTL30D = 60 * 60 * 24 * 30

export async function kvGetMotorista(kv: KVNamespace, id: string): Promise<MotoristaRS | null> {
  const raw = await kv.get(`rs:motorista:${id}`)
  return raw ? JSON.parse(raw) : null
}

export async function kvSaveMotorista(kv: KVNamespace, m: MotoristaRS) {
  await kv.put(`rs:motorista:${m.id}`, JSON.stringify(m), { expirationTtl: TTL2Y })
  await kv.put(`rs:motorista:email:${m.email.toLowerCase()}`, m.id, { expirationTtl: TTL2Y })
  if (m.cpf) await kv.put(`rs:motorista:cpf:${m.cpf}`, m.id, { expirationTtl: TTL2Y })
  if (m.cnpj) await kv.put(`rs:motorista:cnpj:${m.cnpj}`, m.id, { expirationTtl: TTL2Y })
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
  await kv.put(`rs:passageiro:${p.id}`, JSON.stringify(p), { expirationTtl: TTL2Y })
  await kv.put(`rs:passageiro:email:${p.email.toLowerCase()}`, p.id, { expirationTtl: TTL2Y })
}

export async function kvGetPassageiroPorEmail(kv: KVNamespace, email: string): Promise<PassageiroRS | null> {
  const id = await kv.get(`rs:passageiro:email:${email.toLowerCase()}`)
  if (!id) return null
  return kvGetPassageiro(kv, id)
}

export async function kvSaveToken(kv: KVNamespace, token: string, tipo: 'motorista' | 'passageiro', userId: string) {
  const hash = await sha256(token)
  await kv.put(`rs:token:${hash}`, JSON.stringify({ tipo, userId }), { expirationTtl: TTL30D })
}

export async function kvVerificarToken(kv: KVNamespace, token: string): Promise<{ tipo: 'motorista' | 'passageiro'; userId: string } | null> {
  const decoded = decodificarToken(token)
  if (!decoded) return null
  const hash = await sha256(token)
  const raw = await kv.get(`rs:token:${hash}`)
  if (!raw) return null
  return JSON.parse(raw)
}

export async function kvRevogarToken(kv: KVNamespace, token: string) {
  const hash = await sha256(token)
  await kv.delete(`rs:token:${hash}`)
}

// ═══════════════════════════════════════════════════════════════════════
//  ASAAS: Criar subconta do motorista (requer CNPJ)
//  Retorna walletId (para split) e apiKey (salvar no KV)
// ═══════════════════════════════════════════════════════════════════════

export async function criarSubcontaAsaas(
  env: any,
  motorista: {
    nome: string
    email: string
    cpf: string       // CPF da pessoa física (para dataNascimento)
    cnpj: string      // CNPJ do MEI — obrigatório
    telefone: string
    cep: string
    logradouro: string
    numero: string
    bairro: string
    rendaMensal: number   // R$ mensais (ex: 3000)
    dataNascimento?: string  // YYYY-MM-DD
  }
): Promise<{
  walletId: string | null
  accountKey: string | null
  subcontaId: string | null
  error?: string
}> {
  const key = asaasKey(env)
  if (!key) {
    // DEMO sem credencial
    const demoId = `demo-${Date.now()}`
    return { walletId: `demo-wallet-${demoId}`, accountKey: `demo-key-${demoId}`, subcontaId: demoId }
  }

  const cnpjLimpo = motorista.cnpj.replace(/\D/g, '')
  if (cnpjLimpo.length !== 14) {
    return { walletId: null, accountKey: null, subcontaId: null, error: 'CNPJ inválido (deve ter 14 dígitos)' }
  }

  const cepLimpo = motorista.cep.replace(/\D/g, '')

  try {
    const body: Record<string, any> = {
      name: motorista.nome,
      email: motorista.email,
      cpfCnpj: cnpjLimpo,
      companyType: 'MEI',              // MEI é o mais comum para motoristas autônomos
      mobilePhone: motorista.telefone.replace(/\D/g, ''),
      address: motorista.logradouro || 'Rua não informada',
      addressNumber: motorista.numero || 'S/N',
      province: motorista.bairro || 'Centro',
      postalCode: cepLimpo,
      incomeValue: motorista.rendaMensal,  // Faturamento mensal — OBRIGATÓRIO
      site: 'https://rotaposto.com.br/rotasegura',
      // Webhook da subconta — configurar para receber notificações
      webhooks: [
        {
          url: 'https://rotaposto.com.br/api/rotasegura/pagamento/webhook',
          email: motorista.email,
          apiVersion: 3,
          enabled: true,
          interrupted: false,
          authToken: '',
          events: ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE']
        }
      ]
    }

    // Adicionar data de nascimento se informada (campo birthDate para MEI)
    if (motorista.dataNascimento) {
      body.birthDate = motorista.dataNascimento
    }

    console.log('[AsaasSubconta] Criando subconta para CNPJ:', cnpjLimpo)

    const r = await fetch(`${ASAAS_BASE}/accounts`, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    })

    const data = await r.json() as any
    console.log('[AsaasSubconta] Resposta:', r.status, JSON.stringify(data).slice(0, 300))

    if (r.ok && data?.walletId) {
      return {
        walletId: data.walletId,
        accountKey: data.apiKey || null,
        subcontaId: data.id || null
      }
    }

    // CNPJ já tem subconta → buscar walletId existente
    const errDesc = (data?.errors?.[0]?.description || data?.message || '').toLowerCase()
    if (errDesc.includes('already') || errDesc.includes('exist') || errDesc.includes('duplicat') || errDesc.includes('já cadastr')) {
      console.log('[AsaasSubconta] CNPJ já cadastrado, buscando subconta existente...')
      const existente = await buscarSubcontaPorCnpj(env, cnpjLimpo)
      if (existente.walletId) return existente
    }

    const errMsg = data?.errors?.[0]?.description || data?.message || `Erro HTTP ${r.status}`
    console.error('[AsaasSubconta] Erro:', errMsg, JSON.stringify(data).slice(0, 200))
    return { walletId: null, accountKey: null, subcontaId: null, error: errMsg }

  } catch (e: any) {
    console.error('[AsaasSubconta] Exception:', e.message)
    return { walletId: null, accountKey: null, subcontaId: null, error: e.message }
  }
}

// Buscar subconta Asaas existente pelo CNPJ
async function buscarSubcontaPorCnpj(
  env: any,
  cnpj: string
): Promise<{ walletId: string | null; accountKey: string | null; subcontaId: string | null; error?: string }> {
  const key = asaasKey(env)
  if (!key) return { walletId: null, accountKey: null, subcontaId: null }

  try {
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    const r = await fetch(`${ASAAS_BASE}/accounts?cpfCnpj=${cnpjLimpo}&limit=1`, {
      headers: headers(key),
      signal: AbortSignal.timeout(10000)
    })
    const data = await r.json() as any
    const conta = data?.data?.[0]
    console.log('[AsaasSubconta] Busca por CNPJ:', r.status, conta?.id, conta?.walletId)

    if (conta?.walletId) {
      return {
        walletId: conta.walletId,
        accountKey: null,   // apiKey não retorna na listagem — já deve estar salva
        subcontaId: conta.id || null
      }
    }
    return { walletId: null, accountKey: null, subcontaId: null, error: 'Não encontrada' }
  } catch (e: any) {
    return { walletId: null, accountKey: null, subcontaId: null, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  ASAAS: Criar/buscar customer do passageiro
// ═══════════════════════════════════════════════════════════════════════

export async function criarCustomerPassageiro(
  env: any,
  passageiro: Pick<PassageiroRS, 'nome' | 'email' | 'cpf' | 'telefone' | 'id'>
): Promise<string | null> {
  const key = asaasKey(env)
  if (!key) return `demo-cus-${passageiro.id}`

  const cpfLimpo = (passageiro.cpf || '').replace(/\D/g, '')

  try {
    // Buscar customer existente por CPF
    if (cpfLimpo.length === 11) {
      const search = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cpfLimpo}&limit=1`, {
        headers: headers(key),
        signal: AbortSignal.timeout(8000)
      })
      const sd = await search.json() as any
      if (sd?.data?.[0]?.id) {
        console.log('[AsaasCustomer] Passageiro existente:', sd.data[0].id)
        return sd.data[0].id
      }
    }

    // Criar novo customer
    const body: any = {
      name: passageiro.nome,
      email: passageiro.email,
      mobilePhone: passageiro.telefone.replace(/\D/g, ''),
      externalReference: `rs-pass-${passageiro.id}`,
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
    console.log('[AsaasCustomer] Passageiro criado:', r.status, data?.id)
    return r.ok && data?.id ? data.id : null
  } catch (e: any) {
    console.error('[AsaasCustomer] Erro:', e.message)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  ASAAS: Gerar PIX com split (corrida finalizada)
//
//  SE motorista tem walletId → split 80/20 automático
//  SE motorista SEM walletId (PF sem CNPJ) → pagamento 100% plataforma
//    (repasse manual depois)
// ═══════════════════════════════════════════════════════════════════════

export async function gerarPixSplitCorrida(
  env: any,
  dados: {
    corridaId: string
    valorCentavos: number
    passageiroCustomerId: string
    motoristaWalletId: string | null  // null = sem split
    motoristaId: string
    descricao?: string
  }
): Promise<ResultadoSplit> {
  const key = asaasKey(env)

  const valorTotal = dados.valorCentavos / 100
  const temSplit = !!dados.motoristaWalletId && !dados.motoristaWalletId.startsWith('demo')
  const valorMotorista = temSplit ? Math.round(dados.valorCentavos * SPLIT_MOTORISTA_PCT / 100) : 0
  const valorPlataforma = dados.valorCentavos - valorMotorista

  // DEMO
  if (!key || dados.passageiroCustomerId.startsWith('demo')) {
    const brcode = `00020126580014BR.GOV.BCB.PIX0136rs-demo-${dados.corridaId.slice(-8)}52040000530398654069.905802BR5913RotaSegura6009BRASILIA62070503RSG630412AB`
    return {
      sucesso: true,
      paymentId: `demo-pay-${Date.now()}`,
      brcode,
      qrCode: qrImg(brcode),
      expiraEm: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      valorMotorista,
      valorPlataforma,
      temSplit
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
    }

    // Adicionar split apenas se motorista tem walletId
    if (temSplit) {
      body.split = [
        {
          walletId: dados.motoristaWalletId,
          percentualValor: SPLIT_MOTORISTA_PCT  // 80
        }
      ]
    }

    console.log(`[AsaasSplit] Gerando PIX corridaId=${dados.corridaId} valor=R$${valorTotal} split=${temSplit}`)

    const r = await fetch(`${ASAAS_BASE}/payments`, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    })

    const data = await r.json() as any
    console.log('[AsaasSplit] Payment:', r.status, data?.id)

    if (!r.ok) {
      const errMsg = data?.errors?.[0]?.description || data?.message || `Erro ${r.status}`
      return { sucesso: false, error: errMsg }
    }

    const paymentId = data.id as string

    // Buscar QR Code PIX
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
      valorPlataforma,
      temSplit
    }
  } catch (e: any) {
    console.error('[AsaasSplit] Erro:', e.message)
    return { sucesso: false, error: 'PIX temporariamente indisponível' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Verificar status pagamento da corrida
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
    const pago = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status)
    return { pago, status }
  } catch { return { pago: false, status: 'ERROR' } }
}

// ═══════════════════════════════════════════════════════════════════════
//  Diagnóstico: testar criação de subconta (sem salvar)
// ═══════════════════════════════════════════════════════════════════════

export async function diagnosticarSubcontaAsaas(apiKey: string): Promise<{
  ok: boolean
  permiteSubconta: boolean
  contaNome: string
  contaStatus: string
  mensagem: string
}> {
  try {
    const r = await fetch(`${ASAAS_BASE}/myAccount`, {
      headers: headers(apiKey),
      signal: AbortSignal.timeout(8000)
    })
    if (!r.ok) return { ok: false, permiteSubconta: false, contaNome: '', contaStatus: '', mensagem: `Erro HTTP ${r.status}` }
    const data = await r.json() as any
    const nome = data?.name || data?.company || 'Conta Asaas'
    const status = data?.status || ''
    const cpfCnpj = data?.cpfCnpj || ''
    const isCnpj = cpfCnpj.length === 14
    const permiteSubconta = isCnpj && (status === 'APPROVED' || status === 'ACTIVE')

    return {
      ok: true,
      permiteSubconta,
      contaNome: nome,
      contaStatus: status,
      mensagem: permiteSubconta
        ? `✅ Conta ${nome} (CNPJ) aprovada — subcontas habilitadas`
        : isCnpj
          ? `⚠️ Conta CNPJ mas status ${status} — aguardar aprovação`
          : `⚠️ Conta CPF — subcontas exigem CNPJ na conta raiz`
    }
  } catch (e: any) {
    return { ok: false, permiteSubconta: false, contaNome: '', contaStatus: '', mensagem: e.message }
  }
}
