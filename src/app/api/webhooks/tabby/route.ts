import { NextRequest, NextResponse } from 'next/server'
import { finalizeBnplPayment } from '@/actions/bnpl'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature =
    req.headers.get('X-Tabby-Signature') ||
    req.headers.get('tabby-signature') ||
    req.headers.get('x-tabby-hmac-sha256') ||
    ''
  const webhookSecret = process.env.TABBY_SECRET_KEY!

  // Verify HMAC-SHA256 signature
  if (signature) {
    try {
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex')
      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
        console.error('[Tabby Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[Tabby Webhook] Received:', JSON.stringify(payload).slice(0, 500))

  const status =
    payload?.payment?.status ||
    payload?.status ||
    payload?.event?.status

  // Cover all known payload shapes for reference_id
  const orderReferenceId =
    payload?.payment?.order?.reference_id ||
    payload?.order?.reference_id ||
    payload?.payment?.meta?.order_id ||
    payload?.meta?.order_id ||
    payload?.reference_id

  if (!orderReferenceId) {
    console.warn('[Tabby Webhook] No order reference_id found in payload')
    return NextResponse.json({ received: true }, { status: 200 })
  }

  console.log(`[Tabby Webhook] Status: ${status} | Ref: ${orderReferenceId}`)

  try {
    const PAID_STATUSES = ['CLOSED', 'AUTHORIZED', 'APPROVED']
    const FAILED_STATUSES = ['REJECTED', 'EXPIRED', 'CANCELED']

    if (PAID_STATUSES.includes(status)) {
      await finalizeBnplPayment({
        invoiceNumber: orderReferenceId,
        providerPaymentId: payload?.payment?.id,
        webhookPayload: payload,
      })
      console.log(`[Tabby Webhook] Finalized payment for ${orderReferenceId}`)
    } else if (FAILED_STATUSES.includes(status)) {
      const newStatus = status === 'EXPIRED' ? 'EXPIRED' : status === 'CANCELED' ? 'CANCELLED' : 'FAILED'
      await prisma.bnplSession.updateMany({
        where: { invoiceNumber: orderReferenceId, status: { notIn: ['PAID'] } },
        data: {
          status: newStatus as any,
          failureReason: `Tabby status: ${status}`,
          webhookPayload: payload as any,
        },
      })
      console.log(`[Tabby Webhook] Marked ${orderReferenceId} as ${newStatus}`)
    } else {
      console.log(`[Tabby Webhook] Unhandled status: ${status} — ignoring`)
    }
  } catch (err: any) {
    console.error('[Tabby Webhook] Processing error:', err.message)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
