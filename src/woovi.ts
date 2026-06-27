// ═══════════════════════════════════════════════════════════════════════
//  RotaPosto – Integração Woovi (OpenPix) PIX Recorrente
//  API: https://api.openpix.com.br/api/v1/
//  Docs: https://developers.woovi.com/docs/subscriptions/subscriptions-overview
// ═══════════════════════════════════════════════════════════════════════

export interface PlanoAssinatura {
  nome: string
  valor: number
  ciclo: 'MONTHLY' | 'YEARLY'
  descricao: string
}

export const PLANOS: Record<string, PlanoAssinatura> = {
  premium: {
    nome: 'RotaPosto Premium',
    valor: 990,   // centavos = R$9,90
    ciclo: 'MONTHLY',
    descricao: 'Assinatura mensal RotaPosto Premium'
  },
  anual: {
    nome: 'RotaPosto Anual',
    valor: 8900,  // centavos = R$89,00
    ciclo: 'YEARLY',
    descricao: 'Assinatura anual RotaPosto (2 meses grátis)'
  }
}

// Criar cobrança PIX única (para primeiro pagamento / teste)
export async function criarCobrancaPIX(
  env: any,
  nome: string,
  email: string,
  cpf: string,
  plano: string
): Promise<{ qrCode?: string; brcode?: string; txid?: string; error?: string }> {
  const WOOVI_TOKEN = env?.WOOVI_API_KEY || ''
  if (!WOOVI_TOKEN) {
    // Modo demo: retornar dados simulados
    return {
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020126330014BR.GOV.BCB.PIX2566qrcoderotaposto.com.br%2Fdemo5204000053039865406${(PLANOS[plano]?.valor || 990).toString().padStart(7,'0')}5802BR5913ROTAPOSTO6009SAOPAULO6207050310304${plano.toUpperCase().slice(0,4)}`,
      brcode: `00020126330014BR.GOV.BCB.PIX0111000000000005204000053039865406${(PLANOS[plano]?.valor || 990).toString().padStart(7,'0')}5802BR5913ROTAPOSTO6009SAOPAULO62070503***63041234`,
      txid: `demo-${Date.now()}`,
    }
  }

  const planoInfo = PLANOS[plano] || PLANOS.premium

  try {
    // 1. Criar ou buscar customer
    const custRes = await fetch('https://api.openpix.com.br/api/v1/customer', {
      method: 'POST',
      headers: {
        'Authorization': WOOVI_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: nome,
        email,
        taxID: { taxID: cpf.replace(/\D/g, ''), type: 'BR:CPF' }
      })
    })
    const custData = await custRes.json() as any
    const customerId = custData?.customer?.correlationID || custData?.customer?.taxID?.taxID

    // 2. Criar cobrança PIX
    const chargeRes = await fetch('https://api.openpix.com.br/api/v1/charge', {
      method: 'POST',
      headers: {
        'Authorization': WOOVI_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        correlationID: `rp-${cpf.replace(/\D/g, '').slice(-6)}-${Date.now()}`,
        value: planoInfo.valor,
        comment: planoInfo.descricao,
        customer: { name: nome, email, taxID: { taxID: cpf.replace(/\D/g, ''), type: 'BR:CPF' } },
        additionalInfo: [
          { key: 'Plano', value: plano },
          { key: 'App', value: 'RotaPosto' }
        ]
      })
    })
    const chargeData = await chargeRes.json() as any

    if (chargeData?.charge?.brCode) {
      const brcode = chargeData.charge.brCode
      // Gerar QR Code via serviço público
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(brcode)}`
      return {
        qrCode,
        brcode,
        txid: chargeData.charge.correlationID
      }
    }

    return { error: chargeData?.error || 'Erro ao criar cobrança PIX' }
  } catch (e: any) {
    console.error('[Woovi] Erro:', e)
    return { error: 'Serviço PIX temporariamente indisponível' }
  }
}

// Criar assinatura PIX recorrente
export async function criarAssinaturaPIX(
  env: any,
  nome: string,
  email: string,
  cpf: string,
  plano: string
): Promise<{ subscriptionId?: string; qrCode?: string; brcode?: string; error?: string }> {
  const WOOVI_TOKEN = env?.WOOVI_API_KEY || ''
  if (!WOOVI_TOKEN) {
    // Demo mode
    return {
      subscriptionId: `demo-sub-${Date.now()}`,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ROTAPOSTO-DEMO-PIX-${plano.toUpperCase()}`,
      brcode: 'demo-brcode',
    }
  }

  const planoInfo = PLANOS[plano] || PLANOS.premium

  try {
    const res = await fetch('https://api.openpix.com.br/api/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': WOOVI_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: {
          name: nome,
          email,
          taxID: { taxID: cpf.replace(/\D/g, ''), type: 'BR:CPF' }
        },
        value: planoInfo.valor,
        globalID: `rp-sub-${cpf.replace(/\D/g, '').slice(-6)}-${Date.now()}`,
        additionalInfo: [
          { key: 'plano', value: plano },
          { key: 'app', value: 'RotaPosto' }
        ]
      })
    })
    const data = await res.json() as any

    if (data?.subscription?.globalID) {
      const brcode = data.subscription?.pixQrCode?.brCode || ''
      const qrCode = brcode
        ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(brcode)}`
        : ''
      return {
        subscriptionId: data.subscription.globalID,
        qrCode,
        brcode
      }
    }

    return { error: data?.error || 'Erro ao criar assinatura' }
  } catch (e: any) {
    return { error: 'Serviço indisponível. Tente novamente.' }
  }
}

// Verificar status de pagamento
export async function verificarPagamento(env: any, txid: string): Promise<boolean> {
  const WOOVI_TOKEN = env?.WOOVI_API_KEY || ''
  if (!WOOVI_TOKEN || txid.startsWith('demo')) return true // demo sempre aprovado

  try {
    const res = await fetch(`https://api.openpix.com.br/api/v1/charge/${txid}`, {
      headers: { 'Authorization': WOOVI_TOKEN }
    })
    const data = await res.json() as any
    return data?.charge?.status === 'COMPLETED'
  } catch {
    return false
  }
}
