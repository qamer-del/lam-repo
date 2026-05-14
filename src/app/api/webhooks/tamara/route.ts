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
    const expected = crypto
      .createHmac('sha256', notificationKey)
      .update(rawBody)
      .digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      console.error('[Tamara Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[Tamara Webhook] Received:', JSON.stringify(payload).slice(0, 300))

  const eventType = payload?.event_type || payload?.status
  const orderReferenceId = payload?.order_reference_id || payload?.data?.order_reference_id

  if (!orderReferenceId) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  try {
    if (eventType === 'order_approved' || eventType === 'payment_captured') {
      await finalizeBnplPayment({
        invoiceNumber: orderReferenceId,
        providerPaymentId: payload?.order_id || payload?.data?.order_id,
        webhookPayload: payload,
      })
    } else if (
      eventType === 'order_declined' ||
      eventType === 'order_expired' ||
      eventType === 'order_canceled'
    ) {
      await prisma.bnplSession.updateMany({
        where: { invoiceNumber: orderReferenceId, status: { notIn: ['PAID'] } },
        data: {
          status:
            eventType === 'order_expired'
              ? 'EXPIRED'
              : eventType === 'order_canceled'
                ? 'CANCELLED'
                : 'FAILED',
          failureReason: `Tamara event: ${eventType}`,
          webhookPayload: payload as any,
        },
      })
    }
  } catch (err: any) {
    console.error('[Tamara Webhook] Processing error:', err.message)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
