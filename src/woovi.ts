// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Integração Woovi (OpenPix) PIX Recorrente
//  API: https://api.openpix.com.br/api/v1/
//  Docs: https://developers.woovi.com/docs/subscriptions/subscriptions-overview
//
//  FLUXO PIX RECORRENTE:
//  1. Criar Customer (cliente)
//  2. Criar Subscription (assinatura) → retorna QR Code do 1º pagamento
//  3. Usuário paga → Woovi dispara webhook OPENPIX:SUBSCRIPTION_PAYMENT_CREATED
//  4. Woovi cobra automaticamente todo ciclo (mensal/anual)
//  5. Webhook notifica cada pagamento → atualizar status no KV
// ═══════════════════════════════════════════════════════════════════════

export interface PlanoAssinatura {
  id: string
  nome: string
  valor: number        // em centavos
  ciclo: 'MONTHLY' | 'YEARLY'
  descricao: string
  features: string[]
}

export const PLANOS: Record<string, PlanoAssinatura> = {
  premium: {
    id: 'premium',
    nome: 'RotaPosto Premium',
    valor: 990,          // R$ 9,90/mês
    ciclo: 'MONTHLY',
    descricao: 'Assinatura mensal RotaPosto Premium',
    features: [
      'Todos os postos do Brasil',
      'Mapa com preços em tempo real',
      'Rota de menor custo',
      'Histórico completo',
      'Sem anúncios',
      'Suporte prioritário'
    ]
  },
  anual: {
    id: 'anual',
    nome: 'RotaPosto Anual',
    valor: 8900,         // R$ 89,00/ano (2 meses grátis)
    ciclo: 'YEARLY',
    descricao: 'Assinatura anual RotaPosto (economize R$29,80)',
    features: [
      'Tudo do Premium',
      '2 meses grátis',
      'Relatorios avancados',
      'Export de dados',
      'Badge exclusivo'
    ]
  }
}

const WOOVI_BASE = 'https://api.openpix.com.br/api/v1'

// ─── Tipos de resposta da Woovi ──────────────────────────────────────────────

export interface WooviCustomer {
  name: string
  email: string
  taxID: { taxID: string; type: 'BR:CPF' | 'BR:CNPJ' }
  phone?: string
  correlationID?: string
}

export interface WooviSubscription {
  globalID: string
  status: 'ACTIVE' | 'CANCELED' | 'PENDING'
  customer: WooviCustomer
  value: number
  dayGenerateCharge?: number  // dia do mes para gerar cobranca
  pixQrCode?: {
    brCode: string
    brCodeBase64?: string
  }
  nextChargeDate?: string
  lastChargeDate?: string
}

export interface WooviCharge {
  correlationID: string
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED'
  value: number
  brCode?: string
  customer?: WooviCustomer
  createdAt?: string
  expiresIn?: number
}

// ─── Resultado padronizado ────────────────────────────────────────────────────

export interface ResultadoPIX {
  sucesso: boolean
  subscriptionId?: string
  chargeId?: string
  qrCode?: string          // URL da imagem QR
  brcode?: string          // código copia-e-cola
  error?: string
  demo?: boolean
}

// ─── Helper: headers Woovi ───────────────────────────────────────────────────

function wooviHeaders(token: string) {
  return {
    'Authorization': token,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

// ─── Helper: gerar QR Code image URL ─────────────────────────────────────────

function qrImageUrl(brcode: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=${encodeURIComponent(brcode)}`
}

// ─── Helper: gerar demo QR ───────────────────────────────────────────────────

function demoResult(plano: string): ResultadoPIX {
  const p = PLANOS[plano] || PLANOS.premium
  const valor = (p.valor / 100).toFixed(2).replace('.', '')
  const brcode = `00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-4266141740005204000053039865406${valor}5802BR5913RotaPosto6009SAOPAULO62070503RP163041234`
  return {
    sucesso: true,
    subscriptionId: `demo-sub-${Date.now()}`,
    chargeId: `demo-charge-${Date.now()}`,
    qrCode: qrImageUrl(brcode),
    brcode,
    demo: true
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  1. Criar ou buscar Customer na Woovi
// ═══════════════════════════════════════════════════════════════════════

export async function criarOuBuscarCustomer(
  token: string,
  nome: string,
  email: string,
  cpf: string,
  telefone?: string
): Promise<{ correlationID?: string; error?: string }> {
  const cpfLimpo = cpf.replace(/\D/g, '')
  const correlationID = `rp-cust-${cpfLimpo}`

  try {
    // Tentar criar (se já existir, a API retorna o existente)
    const body: any = {
      name: nome,
      email,
      correlationID,
      taxID: { taxID: cpfLimpo, type: 'BR:CPF' }
    }
    if (telefone) body.phone = telefone.replace(/\D/g, '')

    const res = await fetch(`${WOOVI_BASE}/customer`, {
      method: 'POST',
      headers: wooviHeaders(token),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    })

    const data = await res.json() as any

    // Woovi pode retornar customer existente ou recém-criado
    const cust = data?.customer || data
    if (cust?.correlationID || cust?.taxID) {
      return { correlationID: cust.correlationID || correlationID }
    }

    // Se erro de duplicata, o correlationID já existe - usar mesmo assim
    if (data?.error?.includes('already') || res.status === 400) {
      return { correlationID }
    }

    return { error: data?.error || 'Erro ao criar cliente' }
  } catch (e: any) {
    console.error('[Woovi] criarCustomer error:', e.message)
    return { error: 'Timeout ao criar cliente' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  2. Criar Assinatura PIX Recorrente (Subscription)
//     Woovi docs: POST /api/v1/subscriptions
//     → retorna QR Code do PRIMEIRO pagamento
//     → Woovi cobra automaticamente os seguintes
// ═══════════════════════════════════════════════════════════════════════

export async function criarAssinaturaPIX(
  env: any,
  nome: string,
  email: string,
  cpf: string,
  plano: string,
  telefone?: string
): Promise<ResultadoPIX> {
  const WOOVI_TOKEN = (env?.WOOVI_API_KEY as string) || ''

  if (!WOOVI_TOKEN) {
    console.log('[Woovi] Modo DEMO - sem WOOVI_API_KEY')
    return demoResult(plano)
  }

  const planoInfo = PLANOS[plano] || PLANOS.premium
  const cpfLimpo = cpf.replace(/\D/g, '')

  try {
    // 1. Garantir que o customer existe
    const custResult = await criarOuBuscarCustomer(WOOVI_TOKEN, nome, email, cpfLimpo, telefone)
    if (custResult.error && !custResult.correlationID) {
      // Tentar prosseguir sem correlationID explícito
      console.warn('[Woovi] Customer sem correlationID, prosseguindo...')
    }

    // 2. Criar Subscription (assinatura recorrente)
    // A Woovi gera automaticamente os pagamentos subsequentes
    const globalID = `rp-sub-${cpfLimpo.slice(-6)}-${Date.now()}`
    const diaCobranca = new Date().getDate() // cobra todo dia X do mês

    const subBody: any = {
      customer: {
        name: nome,
        email,
        taxID: { taxID: cpfLimpo, type: 'BR:CPF' }
      },
      value: planoInfo.valor,
      globalID,
      dayGenerateCharge: diaCobranca,
      additionalInfo: [
        { key: 'plano', value: planoInfo.id },
        { key: 'app', value: 'RotaPosto' },
        { key: 'ciclo', value: planoInfo.ciclo }
      ]
    }

    // Se temos correlationID do customer, usar
    if (custResult.correlationID) {
      subBody.customer.correlationID = custResult.correlationID
    }

    const res = await fetch(`${WOOVI_BASE}/subscriptions`, {
      method: 'POST',
      headers: wooviHeaders(WOOVI_TOKEN),
      body: JSON.stringify(subBody),
      signal: AbortSignal.timeout(15000)
    })

    const data = await res.json() as any
    console.log('[Woovi] Subscription response:', JSON.stringify(data).slice(0, 500))

    if (data?.subscription) {
      const sub: WooviSubscription = data.subscription
      const brcode = sub.pixQrCode?.brCode || ''

      return {
        sucesso: true,
        subscriptionId: sub.globalID || globalID,
        qrCode: brcode ? qrImageUrl(brcode) : '',
        brcode,
        demo: false
      }
    }

    // Woovi pode retornar erro mas com brCode de qualquer forma
    const brcode = data?.pixQrCode?.brCode || data?.charge?.brCode || ''
    if (brcode) {
      return {
        sucesso: true,
        subscriptionId: data?.globalID || globalID,
        qrCode: qrImageUrl(brcode),
        brcode,
        demo: false
      }
    }

    console.error('[Woovi] Erro subscription:', JSON.stringify(data))
    return { sucesso: false, error: data?.error || data?.message || 'Erro ao criar assinatura PIX' }

  } catch (e: any) {
    console.error('[Woovi] criarAssinatura exception:', e.message)
    return { sucesso: false, error: 'Serviço PIX temporariamente indisponível. Tente novamente.' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  3. Verificar status de uma assinatura
// ═══════════════════════════════════════════════════════════════════════

export async function verificarAssinatura(
  env: any,
  subscriptionId: string
): Promise<{ status: string; ativa: boolean; nextCharge?: string }> {
  const WOOVI_TOKEN = (env?.WOOVI_API_KEY as string) || ''

  if (!WOOVI_TOKEN || subscriptionId.startsWith('demo')) {
    return { status: 'ACTIVE', ativa: true }
  }

  try {
    const res = await fetch(`${WOOVI_BASE}/subscriptions/${subscriptionId}`, {
      headers: wooviHeaders(WOOVI_TOKEN),
      signal: AbortSignal.timeout(8000)
    })
    const data = await res.json() as any
    const sub = data?.subscription || data

    return {
      status: sub?.status || 'UNKNOWN',
      ativa: sub?.status === 'ACTIVE',
      nextCharge: sub?.nextChargeDate
    }
  } catch {
    return { status: 'UNKNOWN', ativa: false }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  4. Verificar status de uma cobrança avulsa (charge)
// ═══════════════════════════════════════════════════════════════════════

export async function verificarPagamento(env: any, txid: string): Promise<boolean> {
  const WOOVI_TOKEN = (env?.WOOVI_API_KEY as string) || ''

  if (!WOOVI_TOKEN || txid.startsWith('demo')) return true

  try {
    const res = await fetch(`${WOOVI_BASE}/charge/${txid}`, {
      headers: wooviHeaders(WOOVI_TOKEN),
      signal: AbortSignal.timeout(8000)
    })
    const data = await res.json() as any
    const charge = data?.charge || data
    return charge?.status === 'COMPLETED'
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  5. Cancelar assinatura
// ═══════════════════════════════════════════════════════════════════════

export async function cancelarAssinatura(
  env: any,
  subscriptionId: string
): Promise<{ sucesso: boolean; error?: string }> {
  const WOOVI_TOKEN = (env?.WOOVI_API_KEY as string) || ''

  if (!WOOVI_TOKEN || subscriptionId.startsWith('demo')) {
    return { sucesso: true }
  }

  try {
    const res = await fetch(`${WOOVI_BASE}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: wooviHeaders(WOOVI_TOKEN),
      signal: AbortSignal.timeout(8000)
    })
    const data = await res.json() as any

    if (res.ok || data?.subscription?.status === 'CANCELED') {
      return { sucesso: true }
    }
    return { sucesso: false, error: data?.error || 'Erro ao cancelar' }
  } catch (e: any) {
    return { sucesso: false, error: e.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  6. Listar assinaturas de um customer
// ═══════════════════════════════════════════════════════════════════════

export async function listarAssinaturas(
  env: any,
  cpf: string
): Promise<WooviSubscription[]> {
  const WOOVI_TOKEN = (env?.WOOVI_API_KEY as string) || ''

  if (!WOOVI_TOKEN) return []

  try {
    const cpfLimpo = cpf.replace(/\D/g, '')
    const res = await fetch(`${WOOVI_BASE}/subscriptions?customer=${cpfLimpo}`, {
      headers: wooviHeaders(WOOVI_TOKEN),
      signal: AbortSignal.timeout(8000)
    })
    const data = await res.json() as any
    return data?.subscriptions || []
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  7. Parsear webhook Woovi
//  Eventos relevantes:
//  - OPENPIX:CHARGE_COMPLETED        → pagamento único concluído
//  - OPENPIX:SUBSCRIPTION_PAYMENT_CREATED → assinatura criada
//  - OPENPIX:SUBSCRIPTION_PAYMENT_SUCCEED → pagamento recorrente OK
//  - OPENPIX:SUBSCRIPTION_CANCELED   → assinatura cancelada
// ═══════════════════════════════════════════════════════════════════════

export interface WebhookPayload {
  event: string
  charge?: WooviCharge
  subscription?: WooviSubscription
  pixTransaction?: { correlationID: string }
}

export function parsearWebhook(body: any): {
  evento: string
  correlationID: string
  subscriptionId: string
  status: 'PAGO' | 'CANCELADO' | 'DESCONHECIDO'
} {
  const evento = body?.event || ''
  const charge = body?.charge || body?.pixTransaction || {}
  const sub = body?.subscription || {}

  const correlationID = charge.correlationID || sub.globalID || ''
  const subscriptionId = sub.globalID || charge.correlationID || ''

  let status: 'PAGO' | 'CANCELADO' | 'DESCONHECIDO' = 'DESCONHECIDO'

  if (
    evento === 'OPENPIX:CHARGE_COMPLETED' ||
    evento === 'OPENPIX:SUBSCRIPTION_PAYMENT_CREATED' ||
    evento === 'OPENPIX:SUBSCRIPTION_PAYMENT_SUCCEED' ||
    charge?.status === 'COMPLETED'
  ) {
    status = 'PAGO'
  } else if (
    evento === 'OPENPIX:SUBSCRIPTION_CANCELED' ||
    sub?.status === 'CANCELED'
  ) {
    status = 'CANCELADO'
  }

  return { evento, correlationID, subscriptionId, status }
}
