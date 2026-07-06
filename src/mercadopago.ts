// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Integração Mercado Pago (Cartão de Crédito Recorrente)
//  API: https://api.mercadopago.com
//  Docs: https://www.mercadopago.com.br/developers/pt/docs/subscriptions
//
//  FLUXO CARTÃO RECORRENTE (Subscriptions):
//  1. Frontend: MP SDK tokeniza o cartão → retorna card_token
//  2. Backend: POST /preapproval com card_token → cria assinatura
//  3. MP cobra automaticamente todo mês no cartão
//  4. Webhook notifica cada pagamento → atualizar status no KV
// ═══════════════════════════════════════════════════════════════════════

const MP_BASE = 'https://api.mercadopago.com'

// ─── Planos (IDs criados no painel MP) ───────────────────────────────────────
// Usamos preapproval_plan para assinaturas recorrentes gerenciadas pelo MP
export const MP_PLANOS = {
  premium: {
    nome: 'RotaPosto Premium',
    valor: 9.90,
    ciclo: 'monthly' as const,
    descricao: 'Assinatura mensal RotaPosto Premium — Encontre os postos mais baratos',
    frequency: 1,
    frequency_type: 'months' as const,
  },
  anual: {
    nome: 'RotaPosto Anual',
    valor: 89.00,
    ciclo: 'yearly' as const,
    descricao: 'Assinatura anual RotaPosto Premium — 2 meses grátis',
    frequency: 12,
    frequency_type: 'months' as const,
  }
}

function mpHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': `rp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

// ─── Resultado padronizado ────────────────────────────────────────────────────
export interface ResultadoMP {
  sucesso: boolean
  subscriptionId?: string
  status?: string
  proximaCobranca?: string
  error?: string
  demo?: boolean
}

// ─── Demo (sem credenciais) ───────────────────────────────────────────────────
function demoResult(plano: string): ResultadoMP {
  return {
    sucesso: true,
    subscriptionId: `demo-mp-${Date.now()}`,
    status: 'authorized',
    proximaCobranca: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    demo: true
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  1. Criar assinatura recorrente com card_token (tokenizado pelo SDK)
// ═══════════════════════════════════════════════════════════════════════
export async function criarAssinaturaCartao(
  env: any,
  dados: {
    cardToken: string      // token gerado pelo MP SDK no frontend
    email: string
    nome: string
    cpf: string
    plano: string
    userId: string
  }
): Promise<ResultadoMP> {
  const MP_TOKEN = (env?.MP_ACCESS_TOKEN as string) || ''

  if (!MP_TOKEN) {
    console.log('[MP] Modo DEMO - sem MP_ACCESS_TOKEN')
    return demoResult(dados.plano)
  }

  const planoInfo = MP_PLANOS[dados.plano as keyof typeof MP_PLANOS] || MP_PLANOS.premium
  const cpfLimpo = (dados.cpf || '').replace(/\D/g, '')

  // Data de início (agora) e fim (2 anos — renovável)
  const agora = new Date()
  const fimStr = new Date(agora.getTime() + 2 * 365 * 24 * 3600 * 1000).toISOString()

  try {
    // preapproval = assinatura recorrente no MP
    const body = {
      preapproval_plan_id: undefined,   // sem plano fixo — usamos valores inline
      reason: planoInfo.descricao,
      external_reference: `rp-${dados.userId}-${dados.plano}-${Date.now()}`,
      payer_email: dados.email,
      card_token_id: dados.cardToken,
      auto_recurring: {
        frequency: planoInfo.frequency,
        frequency_type: planoInfo.frequency_type,
        transaction_amount: planoInfo.valor,
        currency_id: 'BRL',
        start_date: agora.toISOString(),
        end_date: fimStr,
      },
      back_url: 'https://rotaposto.com.br/app',
      status: 'authorized'   // cobrar imediatamente
    }

    const res = await fetch(`${MP_BASE}/preapproval`, {
      method: 'POST',
      headers: mpHeaders(MP_TOKEN),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    })

    const data = await res.json() as any
    console.log('[MP] preapproval status:', res.status, 'id:', data?.id)

    if (res.status === 200 || res.status === 201) {
      return {
        sucesso: true,
        subscriptionId: data.id,
        status: data.status,         // 'authorized' | 'pending' | 'cancelled'
        proximaCobranca: data.next_payment_date,
        demo: false
      }
    }

    const errMsg = data?.message || data?.error || `HTTP ${res.status}`
    console.error('[MP] Erro preapproval:', JSON.stringify(data).slice(0, 400))
    return { sucesso: false, error: errMsg }

  } catch (e: any) {
    console.error('[MP] Exception:', e.message)
    return { sucesso: false, error: 'Serviço de pagamento temporariamente indisponível.' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  2. Consultar status de uma assinatura
// ═══════════════════════════════════════════════════════════════════════
export async function consultarAssinaturaMP(
  env: any,
  subscriptionId: string
): Promise<{ status: string; ativa: boolean; proximaCobranca?: string }> {
  const MP_TOKEN = (env?.MP_ACCESS_TOKEN as string) || ''

  if (!MP_TOKEN || subscriptionId.startsWith('demo')) {
    return { status: 'authorized', ativa: true }
  }

  try {
    const res = await fetch(`${MP_BASE}/preapproval/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
      signal: AbortSignal.timeout(10000)
    })
    const data = await res.json() as any

    const ativa = data?.status === 'authorized'
    return {
      status: data?.status || 'unknown',
      ativa,
      proximaCobranca: data?.next_payment_date
    }
  } catch {
    return { status: 'unknown', ativa: false }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  3. Cancelar assinatura
// ═══════════════════════════════════════════════════════════════════════
export async function cancelarAssinaturaMP(
  env: any,
  subscriptionId: string
): Promise<boolean> {
  const MP_TOKEN = (env?.MP_ACCESS_TOKEN as string) || ''
  if (!MP_TOKEN || subscriptionId.startsWith('demo')) return true

  try {
    const res = await fetch(`${MP_BASE}/preapproval/${subscriptionId}`, {
      method: 'PUT',
      headers: mpHeaders(MP_TOKEN),
      body: JSON.stringify({ status: 'cancelled' }),
      signal: AbortSignal.timeout(10000)
    })
    return res.status === 200 || res.status === 201
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  4. Validar assinatura secreta do webhook (HMAC-SHA256)
//
//  O MP envia 3 partes no header x-signature: ts, v1
//  Template: "id:{data.id};request-id:{x-request-id};ts:{ts};"
//  Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
// ═══════════════════════════════════════════════════════════════════════
export async function validarAssinaturaWebhookMP(
  secret: string,
  headers: Headers,
  dataId: string           // body.data.id
): Promise<boolean> {
  try {
    const xSignature = headers.get('x-signature') || ''
    const xRequestId = headers.get('x-request-id') || ''

    // Extrair ts e v1 do header x-signature: "ts=1234567890,v1=abcdef..."
    const parts = Object.fromEntries(
      xSignature.split(',').map(p => p.split('=').map(s => s.trim()))
    )
    const ts = parts['ts']
    const v1 = parts['v1']

    if (!ts || !v1) {
      console.warn('[MP Webhook] x-signature inválido:', xSignature)
      return false
    }

    // Montar template exato conforme documentação MP
    const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`

    // HMAC-SHA256 usando Web Crypto API (compatível com Cloudflare Workers)
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const msgData = encoder.encode(template)

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    const computed = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const valid = computed === v1
    if (!valid) {
      console.warn('[MP Webhook] Assinatura inválida. computed:', computed.slice(0, 16), 'v1:', v1.slice(0, 16))
    }
    return valid
  } catch (e: any) {
    console.error('[MP Webhook] Erro ao validar assinatura:', e.message)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  5. Processar webhook do Mercado Pago
// ═══════════════════════════════════════════════════════════════════════
export interface WebhookEventoMP {
  tipo: 'pagamento_aprovado' | 'assinatura_cancelada' | 'pagamento_recusado' | 'desconhecido'
  subscriptionId?: string
  paymentId?: string
  status?: string
}

export function interpretarWebhookMP(body: any): WebhookEventoMP {
  const tipo = body?.type || body?.topic || ''
  const action = body?.action || ''
  const data = body?.data || {}

  // Preapproval (assinatura)
  if (tipo === 'subscription_preapproval' || tipo === 'preapproval') {
    const subId = data?.id || body?.data_id
    if (action === 'updated' || action === 'created') {
      return { tipo: 'pagamento_aprovado', subscriptionId: subId }
    }
    if (action === 'cancelled') {
      return { tipo: 'assinatura_cancelada', subscriptionId: subId }
    }
  }

  // Pagamento individual
  if (tipo === 'payment') {
    const payId = data?.id || body?.data_id
    if (action === 'payment.created' || action === 'payment.updated') {
      return { tipo: 'pagamento_aprovado', paymentId: String(payId) }
    }
  }

  // Formato antigo (IPN)
  if (tipo === 'subscription' || tipo === 'preapproval') {
    const subId = data?.id || body?.id
    return { tipo: 'pagamento_aprovado', subscriptionId: String(subId) }
  }

  return { tipo: 'desconhecido', status: tipo }
}

// ═══════════════════════════════════════════════════════════════════════
//  5. Verificar pagamento individual (para confirmar aprovação)
// ═══════════════════════════════════════════════════════════════════════
export async function verificarPagamentoMP(
  env: any,
  paymentId: string
): Promise<{ aprovado: boolean; status: string; subscriptionId?: string }> {
  const MP_TOKEN = (env?.MP_ACCESS_TOKEN as string) || ''
  if (!MP_TOKEN) return { aprovado: true, status: 'approved' }

  try {
    const res = await fetch(`${MP_BASE}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
      signal: AbortSignal.timeout(10000)
    })
    const data = await res.json() as any

    return {
      aprovado: data?.status === 'approved',
      status: data?.status || 'unknown',
      subscriptionId: data?.metadata?.preapproval_id || data?.preapproval_id
    }
  } catch {
    return { aprovado: false, status: 'error' }
  }
}
