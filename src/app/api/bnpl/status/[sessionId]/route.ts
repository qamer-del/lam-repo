import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { finalizeBnplPayment } from '@/actions/bnpl'

// ── Active provider status check ─────────────────────────────────────────────
// When a session is still PENDING/PAYMENT_LINK_SENT, we query the provider's
// API directly. This means the sale finalizes automatically even if the webhook
// never arrives (e.g. localhost dev, network hiccup, misconfigured webhook URL).

async function checkTabbyStatus(providerSessionId: string): Promise<'PAID' | 'PENDING' | 'FAILED'> {
  try {
    const res = await fetch(`https://api.tabby.sa/api/v2/checkout/${providerSessionId}`, {
      headers: { Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return 'PENDING'
    const json = await res.json()
    const status = json?.payment?.status || json?.status
    if (status === 'CLOSED' || status === 'AUTHORIZED' || status === 'APPROVED') return 'PAID'
    if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELED') return 'FAILED'
    return 'PENDING'
  } catch {
    return 'PENDING'
  }
}

async function checkTamaraStatus(providerSessionId: string): Promise<'PAID' | 'PENDING' | 'FAILED'> {
  try {
    const res = await fetch(`https://api.tamara.co/orders/${providerSessionId}`, {
      headers: { Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return 'PENDING'
    const json = await res.json()
    const status = json?.status
    if (status === 'approved' || status === 'captured' || status === 'fully_captured') return 'PAID'
    if (status === 'declined' || status === 'expired' || status === 'canceled') return 'FAILED'
    return 'PENDING'
  } catch {
    return 'PENDING'
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params
  const bnplSession = await prisma.bnplSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      checkoutUrl: true,
      paidAt: true,
      failureReason: true,
      expiresAt: true,
      amount: true,
      provider: true,
      invoiceNumber: true,
      customerName: true,
      customerPhone: true,
      providerSessionId: true,
    },
  })

  if (!bnplSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // ── Active polling: check provider API if session is still pending ────────
  if (
    (bnplSession.status === 'PENDING_PAYMENT' || bnplSession.status === 'PAYMENT_LINK_SENT') &&
    bnplSession.providerSessionId
  ) {
    const providerStatus =
      bnplSession.provider === 'TABBY'
        ? await checkTabbyStatus(bnplSession.providerSessionId)
        : await checkTamaraStatus(bnplSession.providerSessionId)

    if (providerStatus === 'PAID') {
      console.log(`[BNPL Status Poll] Provider confirmed PAID for ${bnplSession.invoiceNumber} — auto-finalizing`)
      try {
        await finalizeBnplPayment({
          invoiceNumber: bnplSession.invoiceNumber,
          webhookPayload: { source: 'STATUS_POLL', provider: bnplSession.provider },
        })
        return NextResponse.json({ ...bnplSession, status: 'PAID', providerSessionId: undefined })
      } catch (err: any) {
        console.error('[BNPL Status Poll] finalize error:', err.message)
      }
    } else if (providerStatus === 'FAILED') {
      // Mark as failed in DB
      await prisma.bnplSession.update({
        where: { id: bnplSession.id },
        data: { status: 'FAILED', failureReason: 'Provider reported payment failed/expired' },
      }).catch(() => {})
      return NextResponse.json({ ...bnplSession, status: 'FAILED', providerSessionId: undefined })
    }

    // Check expiry
    if (bnplSession.expiresAt && new Date() > bnplSession.expiresAt) {
      await prisma.bnplSession.update({
        where: { id: bnplSession.id },
        data: { status: 'EXPIRED' },
      }).catch(() => {})
      return NextResponse.json({ ...bnplSession, status: 'EXPIRED', providerSessionId: undefined })
    }
  }

  // Strip internal field from response
  const { providerSessionId: _, ...safeSession } = bnplSession
  return NextResponse.json(safeSession)
}
