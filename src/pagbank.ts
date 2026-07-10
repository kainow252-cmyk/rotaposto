// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Integração PagBank (PagSeguro) PIX Recorrente
//  API: https://api.pagseguro.com
//  Docs: https://dev.pagbank.uol.com.br/reference
//
//  TOKEN: 650cf0fa-7948-41aa-abef-7521f39c110c0e95bec84f92af7d0dbf6e5cf8316f46b9ff-44db-4973-a04f-076aebec93b6
//  Secret Cloudflare: PAGBANK_TOKEN
//
//  FLUXO PIX RECORRENTE PAGBANK:
//  1. Criar Order com método PIX → retorna QR Code do 1º pagamento
//  2. Usuário paga o QR Code → webhook TRANSACTION_PAID notifica
//  3. Criar Plan recorrente (assinatura) → vinculada ao customer
//  4. PagBank gera novas cobranças automaticamente todo ciclo
//  5. Webhook SUBSCRIPTION_CHARGE_PAID / SUBSCRIPTION_CHARGE_OVERDUE
//     notifica cada pagamento/inadimplência
//
//  SUSPENSÃO AUTOMÁTICA:
//  - Dia 1: cobrança gerada pelo PagBank automaticamente
//  - Dia 1+3: se não pago → webhook OVERDUE → aviso no app
//  - Dia 3 após aviso → SUSPENDED pelo cron job
//  - Usuário pode gerar novo PIX a qualquer momento para reativar
// ═══════════════════════════════════════════════════════════════════════

const PB_BASE = 'https://api.pagseguro.com'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ResultadoPagBank {
  sucesso: boolean
  orderId?: string        // ID da order do 1º pagamento (PIX)
  subscriptionId?: string // ID da assinatura recorrente
  planId?: string         // ID do plano criado no PagBank
  qrCode?: string         // URL da imagem QR
  brcode?: string         // código copia-e-cola PIX
  qrCodeText?: string     // texto do QR Code (= brcode)
  expiraEm?: string       // ISO timestamp de expiração do QR
  error?: string
  demo?: boolean
}

export interface PagBankPlan {
  id: string
  reference_id: string
  status: 'ACTIVE' | 'INACTIVE'
  name: string
  description?: string
  amount: { value: number; currency: string }
  interval: { unit: 'MONTH' | 'YEAR'; length: number }
  trial?: { period_duration: number; frequency: 'MONTHLY' }
}

export interface PagBankSubscription {
  id: string
  reference_id: string
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELED' | 'TRIAL' | 'PENDING'
  plan: { id: string }
  customer: { id?: string; name?: string; email?: string }
  created_at?: string
  next_invoice_at?: string
}

export interface PagBankWebhookEvent {
  id: string
  created_at: string
  type: string   // ex: 'subscription.charge.paid', 'subscription.charge.overdue', 'transaction.paid'
  data: any
}

// ─── Helper: headers padrão PagBank ──────────────────────────────────────────

function pbHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-api-version': '4.0'
  }
}

// ─── Helper: obter token do env ───────────────────────────────────────────────

function pbToken(env: any): string {
  return (env?.PAGBANK_TOKEN as string)
    || (env?.PAGBANK_KEY as string)
    || ''
}

// ─── Helper: QR Code como imagem (fallback externo) ──────────────────────────

function qrImageUrl(brcode: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(brcode)}`
}

// ─── Helper: Demo (sem credencial) ───────────────────────────────────────────

function demoResult(): ResultadoPagBank {
  const brcode = '00020126580014BR.GOV.BCB.PIX0136demo-pix-pagbank-rotaposto-uuid52040000530398654069.905802BR5913RotaPosto6009SAOPAULO62070503RPB630412AB'
  return {
    sucesso: true,
    orderId: `demo-pb-order-${Date.now()}`,
    subscriptionId: `demo-pb-sub-${Date.now()}`,
    planId: `demo-pb-plan-${Date.now()}`,
    qrCode: qrImageUrl(brcode),
    brcode,
    qrCodeText: brcode,
    expiraEm: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    demo: true
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  1. Criar ou recuperar Plan no PagBank
//     Um Plan define valor, ciclo e nome do produto recorrente.
//     Deve ser criado uma vez e reutilizado para todas as assinaturas.
// ═══════════════════════════════════════════════════════════════════════

export async function criarOuBuscarPlanPagBank(
  env: any,
  plano: { id: string; nome: string; valor: number; ciclo: string; descricao?: string }
): Promise<{ planId: string | null; error?: string }> {
  const token = pbToken(env)
  if (!token) return { planId: `demo-plan-${plano.id}` }

  const referenceId = `rp-plan-${plano.id}`
  const unit = plano.ciclo === 'yearly' ? 'YEAR' : 'MONTH'
  const length = 1

  try {
    // Tentar criar o plano
    const body = {
      reference_id: referenceId,
      name: plano.nome,
      description: plano.descricao || plano.nome,
      amount: { value: plano.valor, currency: 'BRL' },
      interval: { unit, length },
      payment_method: { type: 'PIX' },
      status: 'ACTIVE'
    }

    const r = await fetch(`${PB_BASE}/billing/plans`, {
      method: 'POST',
      headers: pbHeaders(token),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000)
    })

    const data = await r.json() as any

    // Se o plano já existe com esse reference_id, PagBank retorna conflict
    if (r.status === 409 || data?.error_messages?.some((e: any) => e.code === 'REFERENCE_ALREADY_EXISTS')) {
      // Buscar o plano existente
      const search = await fetch(`${PB_BASE}/billing/plans?reference_id=${referenceId}`, {
        headers: pbHeaders(token),
        signal: AbortSignal.timeout(8000)
      })
      const searchData = await search.json() as any
      const existente = searchData?.plans?.[0] || searchData?.[0]
      if (existente?.id) return { planId: existente.id }
    }

    if (r.ok && data?.id) return { planId: data.id }

    return { planId: null, error: data?.error_messages?.[0]?.description || `Erro PagBank ${r.status}` }
  } catch (e: any) {
    return { planId: null, error: 'Timeout: ' + e.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  2. Gerar PIX avulso (1º pagamento ou renovação)
//     Cria uma Order com método PIX e retorna QR Code.
//     Após pagamento, webhook 'transaction.paid' é disparado.
// ═══════════════════════════════════════════════════════════════════════

export async function gerarPixPagBank(
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
): Promise<ResultadoPagBank> {
  const token = pbToken(env)
  if (!token) {
    console.log('[PagBank] DEMO — sem PAGBANK_TOKEN')
    return demoResult()
  }

  const cpfLimpo = dados.cpf.replace(/\D/g, '')
  const referenceId = dados.referencia || `rp-pix-${dados.userId}-${Date.now()}`
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min

  try {
    const body = {
      reference_id: referenceId,
      customer: {
        name: dados.nome,
        email: dados.email,
        tax_id: cpfLimpo
      },
      items: [{
        reference_id: dados.planoId,
        name: dados.planoNome,
        quantity: 1,
        unit_amount: dados.valorCentavos
      }],
      qr_codes: [{
        amount: { value: dados.valorCentavos },
        expiration_date: expiresAt
      }],
      notification_urls: [
        'https://rotaposto.com.br/api/pagbank/webhook'
      ]
    }

    const r = await fetch(`${PB_BASE}/orders`, {
      method: 'POST',
      headers: pbHeaders(token),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    })

    const data = await r.json() as any
    console.log('[PagBank] Order response:', r.status, data?.id)

    if (!r.ok) {
      const erroMsg = data?.error_messages?.[0]?.description || data?.message || `Erro HTTP ${r.status}`
      return { sucesso: false, error: erroMsg }
    }

    // Extrair QR Code da resposta
    const qrCodeObj = data?.qr_codes?.[0]
    const brcode = qrCodeObj?.text || ''
    const qrCodeImg = qrCodeObj?.links?.find((l: any) => l.media === 'image/png')?.href || ''

    if (!brcode) {
      console.error('[PagBank] Order sem QR Code:', JSON.stringify(data).slice(0, 400))
      return { sucesso: false, error: 'QR Code não retornado pelo PagBank' }
    }

    return {
      sucesso: true,
      orderId: data.id,
      qrCode: qrCodeImg || qrImageUrl(brcode),
      brcode,
      qrCodeText: brcode,
      expiraEm: expiresAt,
      demo: false
    }

  } catch (e: any) {
    console.error('[PagBank] gerarPix exception:', e.message)
    return { sucesso: false, error: 'Serviço PIX temporariamente indisponível.' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  3. Criar Subscription recorrente no PagBank
//     Vincula o customer ao Plan → PagBank cobra automaticamente
//     a cada ciclo. O 1º pagamento é feito via Order (gerarPixPagBank).
// ═══════════════════════════════════════════════════════════════════════

export async function criarSubscriptionPagBank(
  env: any,
  dados: {
    userId: string
    nome: string
    email: string
    cpf: string
    planId: string
    referencia?: string
  }
): Promise<{ subscriptionId: string | null; error?: string }> {
  const token = pbToken(env)
  if (!token) return { subscriptionId: `demo-sub-${dados.userId}` }

  const cpfLimpo = dados.cpf.replace(/\D/g, '')
  const referenceId = dados.referencia || `rp-sub-${dados.userId}-${Date.now()}`

  try {
    const body = {
      reference_id: referenceId,
      plan: { id: dados.planId },
      customer: {
        name: dados.nome,
        email: dados.email,
        tax_id: cpfLimpo
      },
      payment_method: { type: 'PIX' }
    }

    const r = await fetch(`${PB_BASE}/billing/subscriptions`, {
      method: 'POST',
      headers: pbHeaders(token),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000)
    })

    const data = await r.json() as any
    console.log('[PagBank] Subscription response:', r.status, data?.id)

    if (r.ok && data?.id) return { subscriptionId: data.id }

    return {
      subscriptionId: null,
      error: data?.error_messages?.[0]?.description || `Erro ${r.status}`
    }
  } catch (e: any) {
    return { subscriptionId: null, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  4. Verificar status de uma Order (pagamento do PIX)
// ═══════════════════════════════════════════════════════════════════════

export async function verificarOrderPagBank(
  env: any,
  orderId: string
): Promise<{ pago: boolean; status: string }> {
  const token = pbToken(env)
  if (!token || orderId.startsWith('demo')) return { pago: false, status: 'DEMO' }

  try {
    const r = await fetch(`${PB_BASE}/orders/${orderId}`, {
      headers: pbHeaders(token),
      signal: AbortSignal.timeout(8000)
    })
    const data = await r.json() as any
    const charges = data?.charges || []
    const pago = charges.some((ch: any) => ch.status === 'PAID')
    const status = data?.status || 'UNKNOWN'
    return { pago, status }
  } catch {
    return { pago: false, status: 'ERROR' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  5. Verificar status de Subscription
// ═══════════════════════════════════════════════════════════════════════

export async function verificarSubscriptionPagBank(
  env: any,
  subscriptionId: string
): Promise<{ ativa: boolean; status: string; nextCharge?: string }> {
  const token = pbToken(env)
  if (!token || subscriptionId.startsWith('demo')) return { ativa: false, status: 'DEMO' }

  try {
    const r = await fetch(`${PB_BASE}/billing/subscriptions/${subscriptionId}`, {
      headers: pbHeaders(token),
      signal: AbortSignal.timeout(8000)
    })
    const data = await r.json() as any
    const status = data?.status || 'UNKNOWN'
    return {
      ativa: status === 'ACTIVE',
      status,
      nextCharge: data?.next_invoice_at
    }
  } catch {
    return { ativa: false, status: 'ERROR' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  6. Cancelar Subscription
// ═══════════════════════════════════════════════════════════════════════

export async function cancelarSubscriptionPagBank(
  env: any,
  subscriptionId: string
): Promise<{ sucesso: boolean; error?: string }> {
  const token = pbToken(env)
  if (!token || subscriptionId.startsWith('demo')) return { sucesso: true }

  try {
    const r = await fetch(`${PB_BASE}/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: pbHeaders(token),
      signal: AbortSignal.timeout(8000)
    })
    if (r.ok) return { sucesso: true }
    const data = await r.json() as any
    return { sucesso: false, error: data?.error_messages?.[0]?.description || `Erro ${r.status}` }
  } catch (e: any) {
    return { sucesso: false, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  7. Parsear Webhook PagBank
//
//  Eventos relevantes:
//  - transaction.paid                    → 1º pagamento PIX (Order)
//  - subscription.charge.paid            → recorrência paga
//  - subscription.charge.overdue         → inadimplência (lembrete)
//  - subscription.charge.created         → nova cobrança gerada
//  - subscription.canceled               → assinatura cancelada
// ═══════════════════════════════════════════════════════════════════════

export interface PagBankWebhookParsed {
  tipo: 'PAGO' | 'INADIMPLENTE' | 'CANCELADO' | 'DESCONHECIDO'
  evento: string
  orderId?: string        // para 'transaction.paid'
  subscriptionId?: string // para eventos de subscription
  chargeId?: string
  referenceId?: string    // reference_id do pedido/assinatura
  valorCentavos?: number
}

export function parsearWebhookPagBank(body: any): PagBankWebhookParsed {
  const evento = body?.type || body?.event || ''
  const data = body?.data || body

  let tipo: PagBankWebhookParsed['tipo'] = 'DESCONHECIDO'
  let orderId: string | undefined
  let subscriptionId: string | undefined
  let chargeId: string | undefined
  let referenceId: string | undefined
  let valorCentavos: number | undefined

  if (evento === 'transaction.paid' || evento === 'order.paid') {
    tipo = 'PAGO'
    orderId = data?.id || body?.data?.id
    referenceId = data?.reference_id || body?.data?.reference_id
    const charge = data?.charges?.[0]
    chargeId = charge?.id
    valorCentavos = charge?.amount?.value || data?.amount?.value
  } else if (evento === 'subscription.charge.paid' || evento === 'billing.subscription.charge.paid') {
    tipo = 'PAGO'
    subscriptionId = data?.subscription?.id || data?.id
    chargeId = data?.charge?.id || data?.id
    referenceId = data?.reference_id || data?.subscription?.reference_id
    valorCentavos = data?.charge?.amount?.value || data?.amount?.value
  } else if (
    evento === 'subscription.charge.overdue' ||
    evento === 'billing.subscription.charge.overdue' ||
    evento === 'subscription.overdue'
  ) {
    tipo = 'INADIMPLENTE'
    subscriptionId = data?.subscription?.id || data?.id
    chargeId = data?.charge?.id
    referenceId = data?.reference_id || data?.subscription?.reference_id
  } else if (
    evento === 'subscription.canceled' ||
    evento === 'billing.subscription.canceled'
  ) {
    tipo = 'CANCELADO'
    subscriptionId = data?.subscription?.id || data?.id
    referenceId = data?.reference_id
  }

  return { tipo, evento, orderId, subscriptionId, chargeId, referenceId, valorCentavos }
}

// ═══════════════════════════════════════════════════════════════════════
//  8. Testar conexão com PagBank
// ═══════════════════════════════════════════════════════════════════════

export async function testarConexaoPagBank(
  token: string
): Promise<{ ok: boolean; mensagem: string }> {
  if (!token) return { ok: false, mensagem: 'Token não configurado.' }
  try {
    // Testa criando uma order mínima (POST /orders) — endpoint principal do nosso fluxo
    // e que retorna erros JSON claros, diferente de /billing/plans que pode dar 403 CF
    const r = await fetch(`${PB_BASE}/orders`, {
      method: 'POST',
      headers: pbHeaders(token),
      body: JSON.stringify({
        reference_id: 'test-ping-001',
        customer: { name: 'Teste', email: 'ping@rotaposto.com.br', tax_id: '12345678909' },
        items: [{ name: 'Ping', quantity: 1, unit_amount: 100 }],
        qr_codes: [{ amount: { value: 100 }, expiration_date: '2026-12-31T23:59:59-03:00' }]
      }),
      signal: AbortSignal.timeout(8000)
    })
    // HTTP 200/201 = sucesso real
    if (r.ok) return { ok: true, mensagem: '✅ PagBank conectado!' }
    // Tentar ler JSON da resposta para diagnóstico preciso
    let body: any = {}
    try { body = await r.json() } catch {}
    const erros: any[] = body?.error_messages || []
    const primeiro = erros[0] || {}
    // Erro de whitelist = token válido mas conta precisa de habilitação pelo suporte PagBank
    if (primeiro.code === 'ACCESS_DENIED' && String(primeiro.description).includes('whitelist')) {
      return {
        ok: false,
        mensagem: '⚠️ Token válido! Conta precisa de habilitação API pelo suporte PagBank. ' +
                  'Acesse: pagseguro.uol.com.br/suporte → solicite "Habilitação API de Pagamentos".'
      }
    }
    // Token inválido / expirado
    if (r.status === 401) {
      return { ok: false, mensagem: '❌ Token inválido ou expirado. Gere um novo token no painel PagBank.' }
    }
    // Outros erros com mensagem da API
    const desc = primeiro.description || primeiro.message || `Erro HTTP ${r.status}`
    return { ok: false, mensagem: `Erro ${r.status}: ${desc}` }
  } catch (e: any) {
    return { ok: false, mensagem: 'Falha de rede: ' + e.message }
  }
}
