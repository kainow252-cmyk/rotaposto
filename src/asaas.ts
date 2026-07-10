// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Integração Asaas PIX Recorrente
//  API: https://api.asaas.com/v3
//  Docs: https://docs.asaas.com
//
//  Secret Cloudflare: ASAAS_API_KEY
//
//  FLUXO PIX ASAAS:
//  1. Criar Customer → retorna customerId
//  2. Criar Cobrança PIX (billingType=PIX) → retorna QR Code
//  3. Usuário paga → webhook PAYMENT_RECEIVED notifica
//  4. Criar Assinatura (subscription) → recorrência automática mensal
//  5. Webhook PAYMENT_RECEIVED para cada ciclo da assinatura
//
//  SUSPENSÃO AUTOMÁTICA:
//  - Asaas gera cobrança automaticamente a cada ciclo
//  - Se vencer sem pagar → webhook PAYMENT_OVERDUE → aviso no app
//  - D+3 → cron job suspende usuário
//  - Usuário paga → PAYMENT_RECEIVED → reativação automática
// ═══════════════════════════════════════════════════════════════════════

const ASAAS_BASE = 'https://api.asaas.com/v3'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ResultadoAsaas {
  sucesso: boolean
  paymentId?: string      // ID da cobrança PIX
  subscriptionId?: string // ID da assinatura recorrente
  customerId?: string     // ID do customer no Asaas
  qrCode?: string         // URL da imagem QR
  brcode?: string         // código copia-e-cola PIX
  qrCodeText?: string     // texto do QR Code (= brcode)
  expiraEm?: string       // ISO timestamp de expiração
  error?: string
  demo?: boolean
}

export interface AsaasWebhookParsed {
  tipo: 'PAGO' | 'INADIMPLENTE' | 'CANCELADO' | 'DESCONHECIDO'
  evento: string
  paymentId?: string
  subscriptionId?: string
  referenceId?: string    // nosso userId/referencia
  valorCentavos?: number
}

// ─── Helper: headers padrão Asaas ────────────────────────────────────────────

function asaasHeaders(apiKey: string) {
  return {
    'access_token': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'RotaPosto/1.0'
  }
}

// ─── Helper: obter API Key do env ────────────────────────────────────────────

function asaasKey(env: any): string {
  return (env?.ASAAS_API_KEY as string) || ''
}

// ─── Helper: QR Code como imagem (fallback) ──────────────────────────────────

function qrImageUrl(brcode: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(brcode)}`
}

// ─── Helper: Demo (sem credencial) ───────────────────────────────────────────

function demoResult(): ResultadoAsaas {
  const brcode = '00020126580014BR.GOV.BCB.PIX0136demo-pix-asaas-rotaposto-uuid52040000530398654069.905802BR5913RotaPosto6009SAOPAULO62070503RPA630412AB'
  return {
    sucesso: true,
    paymentId: `demo-asaas-pay-${Date.now()}`,
    subscriptionId: `demo-asaas-sub-${Date.now()}`,
    customerId: `demo-asaas-cus-${Date.now()}`,
    qrCode: qrImageUrl(brcode),
    brcode,
    qrCodeText: brcode,
    expiraEm: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    demo: true
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  1. Criar ou recuperar Customer no Asaas
//     CPF/CNPJ é usado como externalReference para dedup.
// ═══════════════════════════════════════════════════════════════════════

export async function criarOuBuscarCustomerAsaas(
  env: any,
  dados: { nome: string; email: string; cpf: string; userId: string }
): Promise<{ customerId: string | null; error?: string }> {
  const key = asaasKey(env)
  if (!key) return { customerId: `demo-cus-${dados.userId}` }

  const cpfLimpo = dados.cpf.replace(/\D/g, '')

  try {
    // Buscar customer existente pelo CPF
    const search = await fetch(
      `${ASAAS_BASE}/customers?cpfCnpj=${cpfLimpo}&limit=1`,
      { headers: asaasHeaders(key), signal: AbortSignal.timeout(8000) }
    )
    const searchData = await search.json() as any
    const existente = searchData?.data?.[0]
    if (existente?.id) {
      console.log('[Asaas] Customer existente:', existente.id)
      return { customerId: existente.id }
    }

    // Criar novo customer
    const body = {
      name: dados.nome,
      email: dados.email,
      cpfCnpj: cpfLimpo,
      externalReference: dados.userId,
      notificationDisabled: false
    }

    const r = await fetch(`${ASAAS_BASE}/customers`, {
      method: 'POST',
      headers: asaasHeaders(key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    })

    const data = await r.json() as any
    console.log('[Asaas] Customer criado:', r.status, data?.id)

    if (r.ok && data?.id) return { customerId: data.id }
    return { customerId: null, error: data?.errors?.[0]?.description || `Erro Asaas ${r.status}` }
  } catch (e: any) {
    return { customerId: null, error: 'Timeout: ' + e.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  2. Gerar PIX avulso (cobrança única)
//     Retorna QR Code para pagamento imediato.
//     Após pagamento, webhook PAYMENT_RECEIVED é disparado.
// ═══════════════════════════════════════════════════════════════════════

export async function gerarPixAsaas(
  env: any,
  dados: {
    userId: string
    nome: string
    email: string
    cpf: string
    valorCentavos: number
    planoNome: string
    planoId: string
    referencia?: string
  }
): Promise<ResultadoAsaas> {
  const key = asaasKey(env)
  if (!key) {
    console.log('[Asaas] DEMO — sem ASAAS_API_KEY')
    return demoResult()
  }

  // Garantir customer
  const { customerId, error: errCus } = await criarOuBuscarCustomerAsaas(env, {
    nome: dados.nome,
    email: dados.email,
    cpf: dados.cpf,
    userId: dados.userId
  })
  if (!customerId) return { sucesso: false, error: `Erro ao criar customer: ${errCus}` }

  const valorReais = dados.valorCentavos / 100
  const dueDate = new Date(Date.now() + 30 * 60 * 1000) // 30 min
  const dueDateStr = dueDate.toISOString().split('T')[0] // YYYY-MM-DD

  try {
    const body = {
      customer: customerId,
      billingType: 'PIX',
      value: valorReais,
      dueDate: dueDateStr,
      description: dados.planoNome,
      externalReference: dados.referencia || `rp-pix-${dados.userId}-${Date.now()}`,
      postalService: false
    }

    const r = await fetch(`${ASAAS_BASE}/payments`, {
      method: 'POST',
      headers: asaasHeaders(key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    })

    const data = await r.json() as any
    console.log('[Asaas] Payment criado:', r.status, data?.id)

    if (!r.ok) {
      const errMsg = data?.errors?.[0]?.description || data?.message || `Erro HTTP ${r.status}`
      return { sucesso: false, error: errMsg }
    }

    const paymentId = data.id as string

    // Buscar QR Code PIX
    const qrRes = await fetch(`${ASAAS_BASE}/payments/${paymentId}/pixQrCode`, {
      headers: asaasHeaders(key),
      signal: AbortSignal.timeout(10000)
    })
    const qrData = await qrRes.json() as any
    const brcode = qrData?.payload || ''
    const qrCodeImg = qrData?.encodedImage
      ? `data:image/png;base64,${qrData.encodedImage}`
      : qrImageUrl(brcode)

    if (!brcode) {
      console.error('[Asaas] Payment sem QR Code:', JSON.stringify(qrData).slice(0, 300))
      return { sucesso: false, error: 'QR Code não retornado pelo Asaas' }
    }

    return {
      sucesso: true,
      paymentId,
      customerId,
      qrCode: qrCodeImg,
      brcode,
      qrCodeText: brcode,
      expiraEm: dueDate.toISOString(),
      demo: false
    }
  } catch (e: any) {
    console.error('[Asaas] gerarPix exception:', e.message)
    return { sucesso: false, error: 'Serviço PIX temporariamente indisponível.' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  3. Criar Assinatura recorrente no Asaas
//     Cobra automaticamente a cada ciclo (MONTHLY/YEARLY).
//     O 1º pagamento é gerado junto com a assinatura.
// ═══════════════════════════════════════════════════════════════════════

export async function criarAssinaturaAsaas(
  env: any,
  dados: {
    userId: string
    customerId: string
    valorCentavos: number
    planoNome: string
    ciclo: 'monthly' | 'yearly'
    referencia?: string
  }
): Promise<{ subscriptionId: string | null; paymentId?: string; error?: string }> {
  const key = asaasKey(env)
  if (!key) return { subscriptionId: `demo-sub-${dados.userId}` }

  const valorReais = dados.valorCentavos / 100
  const nextDue = new Date(Date.now() + 30 * 60 * 1000) // 30 min (1º vencimento)
  const nextDueStr = nextDue.toISOString().split('T')[0]
  const cycle = dados.ciclo === 'yearly' ? 'YEARLY' : 'MONTHLY'

  try {
    const body = {
      customer: dados.customerId,
      billingType: 'PIX',
      value: valorReais,
      nextDueDate: nextDueStr,
      cycle,
      description: dados.planoNome,
      externalReference: dados.referencia || `rp-sub-${dados.userId}-${Date.now()}`
    }

    const r = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders(key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000)
    })

    const data = await r.json() as any
    console.log('[Asaas] Subscription criada:', r.status, data?.id)

    if (r.ok && data?.id) {
      // Buscar 1º payment da assinatura para retornar QR
      const pagsRes = await fetch(`${ASAAS_BASE}/subscriptions/${data.id}/payments?limit=1`, {
        headers: asaasHeaders(key),
        signal: AbortSignal.timeout(8000)
      })
      const pagsData = await pagsRes.json() as any
      const primeiroPaymentId = pagsData?.data?.[0]?.id
      return { subscriptionId: data.id, paymentId: primeiroPaymentId }
    }

    return {
      subscriptionId: null,
      error: data?.errors?.[0]?.description || `Erro ${r.status}`
    }
  } catch (e: any) {
    return { subscriptionId: null, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  4. Verificar status de um Payment (cobrança PIX)
// ═══════════════════════════════════════════════════════════════════════

export async function verificarPaymentAsaas(
  env: any,
  paymentId: string
): Promise<{ pago: boolean; status: string }> {
  const key = asaasKey(env)
  if (!key || paymentId.startsWith('demo')) return { pago: false, status: 'DEMO' }

  try {
    const r = await fetch(`${ASAAS_BASE}/payments/${paymentId}`, {
      headers: asaasHeaders(key),
      signal: AbortSignal.timeout(8000)
    })
    const data = await r.json() as any
    const status = data?.status || 'UNKNOWN'
    // Status Asaas: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, RECEIVED_IN_CASH, CHARGEBACK_REQUESTED, CHARGEBACK_DISPUTE, AWAITING_CHARGEBACK_REVERSAL, DUNNING_REQUESTED, DUNNING_RECEIVED, AWAITING_RISK_ANALYSIS
    const pago = status === 'RECEIVED' || status === 'CONFIRMED' || status === 'RECEIVED_IN_CASH'
    return { pago, status }
  } catch {
    return { pago: false, status: 'ERROR' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  5. Verificar status de Assinatura
// ═══════════════════════════════════════════════════════════════════════

export async function verificarAssinaturaAsaas(
  env: any,
  subscriptionId: string
): Promise<{ ativa: boolean; status: string; nextDueDate?: string }> {
  const key = asaasKey(env)
  if (!key || subscriptionId.startsWith('demo')) return { ativa: false, status: 'DEMO' }

  try {
    const r = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
      headers: asaasHeaders(key),
      signal: AbortSignal.timeout(8000)
    })
    const data = await r.json() as any
    const status = data?.status || 'UNKNOWN'
    // Status: ACTIVE, INACTIVE, EXPIRED
    return {
      ativa: status === 'ACTIVE',
      status,
      nextDueDate: data?.nextDueDate
    }
  } catch {
    return { ativa: false, status: 'ERROR' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  6. Cancelar Assinatura
// ═══════════════════════════════════════════════════════════════════════

export async function cancelarAssinaturaAsaas(
  env: any,
  subscriptionId: string
): Promise<{ sucesso: boolean; error?: string }> {
  const key = asaasKey(env)
  if (!key || subscriptionId.startsWith('demo')) return { sucesso: true }

  try {
    const r = await fetch(`${ASAAS_BASE}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: asaasHeaders(key),
      signal: AbortSignal.timeout(8000)
    })
    if (r.ok || r.status === 204) return { sucesso: true }
    const data = await r.json() as any
    return { sucesso: false, error: data?.errors?.[0]?.description || `Erro ${r.status}` }
  } catch (e: any) {
    return { sucesso: false, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  7. Gerar PIX completo (customer + cobrança + QR Code)
//     Função principal usada pelas rotas de assinatura.
// ═══════════════════════════════════════════════════════════════════════

export async function assinarComAsaas(
  env: any,
  dados: {
    userId: string
    nome: string
    email: string
    cpf: string
    valorCentavos: number
    planoNome: string
    planoId: string
    ciclo: 'monthly' | 'yearly'
    referencia?: string
  }
): Promise<ResultadoAsaas> {
  const key = asaasKey(env)
  if (!key) return demoResult()

  // 1. Criar/buscar customer
  const { customerId, error: errCus } = await criarOuBuscarCustomerAsaas(env, {
    nome: dados.nome,
    email: dados.email,
    cpf: dados.cpf,
    userId: dados.userId
  })
  if (!customerId) return { sucesso: false, error: `Customer: ${errCus}` }

  // 2. Criar assinatura recorrente (gera 1º cobrança automaticamente)
  const { subscriptionId, paymentId: firstPaymentId, error: errSub } = await criarAssinaturaAsaas(env, {
    userId: dados.userId,
    customerId,
    valorCentavos: dados.valorCentavos,
    planoNome: dados.planoNome,
    ciclo: dados.ciclo,
    referencia: dados.referencia
  })
  if (!subscriptionId) return { sucesso: false, error: `Assinatura: ${errSub}` }

  // 3. Buscar QR Code do 1º pagamento
  if (firstPaymentId) {
    try {
      const qrRes = await fetch(`${ASAAS_BASE}/payments/${firstPaymentId}/pixQrCode`, {
        headers: asaasHeaders(key),
        signal: AbortSignal.timeout(10000)
      })
      const qrData = await qrRes.json() as any
      const brcode = qrData?.payload || ''
      const qrCodeImg = qrData?.encodedImage
        ? `data:image/png;base64,${qrData.encodedImage}`
        : qrImageUrl(brcode)

      if (brcode) {
        return {
          sucesso: true,
          paymentId: firstPaymentId,
          subscriptionId,
          customerId,
          qrCode: qrCodeImg,
          brcode,
          qrCodeText: brcode,
          expiraEm: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          demo: false
        }
      }
    } catch (e: any) {
      console.error('[Asaas] Erro QR Code 1º pagamento:', e.message)
    }
  }

  // Fallback: cobrança PIX avulsa
  const pixRes = await gerarPixAsaas(env, dados)
  return { ...pixRes, subscriptionId, customerId }
}

// ═══════════════════════════════════════════════════════════════════════
//  8. Parsear Webhook Asaas
//
//  Eventos relevantes:
//  - PAYMENT_RECEIVED       → PIX pago (avulso ou assinatura)
//  - PAYMENT_CONFIRMED      → Pago e confirmado
//  - PAYMENT_OVERDUE        → Venceu sem pagar
//  - PAYMENT_DELETED        → Cobrança removida/cancelada
//  - SUBSCRIPTION_DELETED   → Assinatura cancelada
// ═══════════════════════════════════════════════════════════════════════

export function parsearWebhookAsaas(body: any): AsaasWebhookParsed {
  const evento = body?.event || ''
  const payment = body?.payment || {}

  let tipo: AsaasWebhookParsed['tipo'] = 'DESCONHECIDO'
  let paymentId: string | undefined = payment?.id
  let subscriptionId: string | undefined = payment?.subscription
  let referenceId: string | undefined = payment?.externalReference
  let valorCentavos: number | undefined

  if (payment?.value) {
    valorCentavos = Math.round(payment.value * 100)
  }

  if (evento === 'PAYMENT_RECEIVED' || evento === 'PAYMENT_CONFIRMED') {
    tipo = 'PAGO'
  } else if (evento === 'PAYMENT_OVERDUE') {
    tipo = 'INADIMPLENTE'
  } else if (evento === 'PAYMENT_DELETED' || evento === 'SUBSCRIPTION_DELETED') {
    tipo = 'CANCELADO'
  }

  return { tipo, evento, paymentId, subscriptionId, referenceId, valorCentavos }
}

// ═══════════════════════════════════════════════════════════════════════
//  9. Testar conexão com Asaas
// ═══════════════════════════════════════════════════════════════════════

export async function testarConexaoAsaas(
  apiKey: string
): Promise<{ ok: boolean; mensagem: string }> {
  if (!apiKey) return { ok: false, mensagem: '❌ API Key não configurada.' }
  try {
    const r = await fetch(`${ASAAS_BASE}/myAccount`, {
      headers: asaasHeaders(apiKey),
      signal: AbortSignal.timeout(8000)
    })
    if (r.ok) {
      const data = await r.json() as any
      const nome = data?.name || data?.company || 'Conta Asaas'
      const status = data?.status || ''
      if (status === 'APPROVED' || status === 'ACTIVE') {
        return { ok: true, mensagem: `✅ Asaas conectado! Conta: ${nome}` }
      }
      return { ok: false, mensagem: `⚠️ Conta Asaas não aprovada. Status: ${status}` }
    }
    if (r.status === 401 || r.status === 403) {
      return { ok: false, mensagem: '❌ API Key inválida ou sem permissão.' }
    }
    return { ok: false, mensagem: `❌ Erro HTTP ${r.status}` }
  } catch (e: any) {
    return { ok: false, mensagem: 'Falha de rede: ' + e.message }
  }
}
