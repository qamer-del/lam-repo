import { NextRequest, NextResponse } from 'next/server'
import { finalizeBnplPayment } from '@/actions/bnpl'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('X-Tamara-Signature') || ''
  const notificationKey = process.env.TAMARA_NOTIFICATION_KEY!

  // Verify HMAC-SHA256 signature if provided
  if (signature && notificationKey) {
    try {
      const expected = crypto
        .createHmac('sha256', notificationKey)
        .update(rawBody)
        .digest('hex')
      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
        console.error('[Tamara Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } catch {
      // Buffer length mismatch — signature format mismatch, reject
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[Tamara Webhook] Received:', JSON.stringify(payload).slice(0, 500))

  // Tamara wraps events differently per type — cover all known shapes
  const eventType =
    payload?.event_type ||
    payload?.status ||
    payload?.data?.status ||
    payload?.data?.event_type

  // order_reference_id can appear at multiple levels depending on Tamara version
  const orderReferenceId =
    payload?.order_reference_id ||
    payload?.data?.order_reference_id ||
    payload?.data?.order?.order_reference_id ||
    payload?.order?.order_reference_id ||
    payload?.order?.reference_id

  if (!orderReferenceId) {
    console.warn('[Tamara Webhook] No order_reference_id found in payload')
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // Provider order_id for cross-reference
  const providerOrderId =
    payload?.order_id ||
    payload?.data?.order_id ||
    payload?.data?.order?.order_id

  console.log(`[Tamara Webhook] Event: ${eventType} | Ref: ${orderReferenceId}`)

  try {
    const PAID_EVENTS = ['order_approved', 'approved', 'payment_captured', 'captured', 'fully_captured']
    const FAILED_EVENTS = ['order_declined', 'declined', 'order_expired', 'expired', 'order_canceled', 'canceled']

    if (PAID_EVENTS.includes(eventType)) {
      await finalizeBnplPayment({
        invoiceNumber: orderReferenceId,
        providerPaymentId: providerOrderId,
        webhookPayload: payload,
      })
      console.log(`[Tamara Webhook] Finalized payment for ${orderReferenceId}`)
    } else if (FAILED_EVENTS.includes(eventType)) {
      const newStatus = eventType.includes('expired') ? 'EXPIRED'
        : eventType.includes('canceled') ? 'CANCELLED'
        : 'FAILED'
      await prisma.bnplSession.updateMany({
        where: { invoiceNumber: orderReferenceId, status: { notIn: ['PAID'] } },
        data: {
          status: newStatus as any,
          failureReason: `Tamara event: ${eventType}`,
          webhookPayload: payload as any,
        },
      })
      console.log(`[Tamara Webhook] Marked ${orderReferenceId} as ${newStatus}`)
    } else {
      console.log(`[Tamara Webhook] Unhandled event type: ${eventType} — ignoring`)
    }
  } catch (err: any) {
    console.error('[Tamara Webhook] Processing error:', err.message)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
