import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { finalizeBnplPayment } from '@/actions/bnpl'

// ── Background Reconciliation ─────────────────────────────────────────────────
// Called by Vercel Cron (or any trusted scheduler) every 5 minutes.
// Checks all PAYMENT_LINK_SENT sessions older than 3 minutes against the
// provider API and auto-finalizes any that were paid.
//
// Vercel Cron config (in vercel.json):
// { "crons": [{ "path": "/api/bnpl/reconcile", "schedule": "*/5 * * * *" }] }
//
// Protected by CRON_SECRET env var.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Allow Vercel cron (sends Bearer token) or internal calls without secret in dev
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000)

  const staleSessions = await prisma.bnplSession.findMany({
    where: {
      status: { in: ['PENDING_PAYMENT', 'PAYMENT_LINK_SENT'] },
      createdAt: { lte: threeMinutesAgo },
      // Don't re-check expired sessions (over 35 min)
      expiresAt: { gte: new Date() },
    },
    select: {
      id: true,
      provider: true,
      invoiceNumber: true,
      providerSessionId: true,
      expiresAt: true,
    },
    take: 50,
  })

  if (staleSessions.length === 0) {
    return NextResponse.json({ checked: 0, finalized: 0 })
  }

  console.log(`[BNPL Reconcile] Checking ${staleSessions.length} stale sessions`)

  let finalized = 0
  let failed = 0

  for (const s of staleSessions) {
    if (!s.providerSessionId) continue

    try {
      // Query provider API
      const providerStatus = await checkProviderStatus(s.provider, s.providerSessionId)

      if (providerStatus === 'PAID') {
        await finalizeBnplPayment({
          invoiceNumber: s.invoiceNumber,
          webhookPayload: { source: 'RECONCILE_CRON', sessionId: s.id },
        })
        finalized++
        console.log(`[BNPL Reconcile] Finalized ${s.invoiceNumber} (${s.provider})`)
      } else if (providerStatus === 'FAILED') {
        await prisma.bnplSession.update({
          where: { id: s.id },
          data: { status: 'FAILED', failureReason: 'Provider reported failed/expired (reconcile job)' },
        })
        failed++
      }
    } catch (err: any) {
      console.error(`[BNPL Reconcile] Error for ${s.invoiceNumber}:`, err.message)
    }
  }

  console.log(`[BNPL Reconcile] Done. Finalized: ${finalized}, Failed: ${failed}`)
  return NextResponse.json({
    checked: staleSessions.length,
    finalized,
    failed,
    timestamp: new Date().toISOString(),
  })
}

async function checkProviderStatus(
  provider: 'TABBY' | 'TAMARA',
  providerSessionId: string
): Promise<'PAID' | 'PENDING' | 'FAILED'> {
  if (provider === 'TABBY') {
    const res = await fetch(`https://api.tabby.sa/api/v2/checkout/${providerSessionId}`, {
      headers: { Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}` },
    })
    if (!res.ok) return 'PENDING'
    const json = await res.json()
    const status = json?.payment?.status || json?.status
    if (['CLOSED', 'AUTHORIZED', 'APPROVED'].includes(status)) return 'PAID'
    if (['REJECTED', 'EXPIRED', 'CANCELED'].includes(status)) return 'FAILED'
    return 'PENDING'
  } else {
    const res = await fetch(`https://api.tamara.co/orders/${providerSessionId}`, {
      headers: { Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}` },
    })
    if (!res.ok) return 'PENDING'
    const json = await res.json()
    const status = json?.status
    if (['approved', 'captured', 'fully_captured'].includes(status)) return 'PAID'
    if (['declined', 'expired', 'canceled'].includes(status)) return 'FAILED'
    return 'PENDING'
  }
}
