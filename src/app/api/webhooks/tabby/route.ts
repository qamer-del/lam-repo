import { NextRequest, NextResponse } from 'next/server'
import { finalizeBnplPayment } from '@/actions/bnpl'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('X-Tabby-Signature') || req.headers.get('tabby-signature') || ''
  const webhookSecret = process.env.TABBY_SECRET_KEY!

  // Verify HMAC-SHA256 signature
  if (signature) {
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      console.error('[Tabby Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[Tabby Webhook] Received:', JSON.stringify(payload).slice(0, 300))

  const status = payload?.payment?.status || payload?.status
  const orderReferenceId =
    payload?.payment?.order?.reference_id ||
    payload?.order?.reference_id ||
    payload?.payment?.meta?.order_id

  if (!orderReferenceId) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  try {
    if (status === 'CLOSED' || status === 'AUTHORIZED') {
      await finalizeBnplPayment({
        invoiceNumber: orderReferenceId,
        providerPaymentId: payload?.payment?.id,
        webhookPayload: payload,
      })
    } else if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELED') {
      await prisma.bnplSession.updateMany({
        where: { invoiceNumber: orderReferenceId, status: { notIn: ['PAID'] } },
        data: {
          status: status === 'EXPIRED' ? 'EXPIRED' : status === 'CANCELED' ? 'CANCELLED' : 'FAILED',
          failureReason: `Tabby status: ${status}`,
          webhookPayload: payload as any,
        },
      })
    }
  } catch (err: any) {
    console.error('[Tabby Webhook] Processing error:', err.message)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
