'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { getOrCreateActiveShift } from '@/actions/transactions'
import { createWarrantyRecordsForSale } from '@/actions/warranty'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  itemId: number
  name: string
  quantity: number
  price: number
  unit: string
}

export interface CreateBnplSessionInput {
  provider: 'TABBY' | 'TAMARA'
  amount: number
  customerPhone: string
  customerName?: string
  customerId?: number
  description?: string
  cart: CartItem[]
}

// ── Tabby API (In-Store SMS via HPP Link) ───────────────────────────────────
// Flow: Create checkout session → detect product → call send_hpp_link → Tabby sends SMS

async function createTabbySession(data: {
  invoiceNumber: string
  amount: number
  currency: string
  customerPhone: string
  customerName?: string
  cart: CartItem[]
  appUrl: string
}): Promise<{ sessionId: string }> {
  const secretKey = process.env.TABBY_SECRET_KEY!
  const merchantCode = process.env.TABBY_MERCHANT_CODE || 'default'

  // Step 1: Create checkout session
  const payload = {
    payment: {
      amount: data.amount.toFixed(2),
      currency: data.currency,
      buyer: {
        phone: data.customerPhone.replace(/\s+/g, '').replace(/^\+/, ''),
        name: data.customerName || 'Customer',
        email: 'pos@lamaha.sa',
      },
      buyer_history: {
        registered_since: new Date().toISOString(),
        loyalty_level: 0,
      },
      order: {
        reference_id: data.invoiceNumber,
        items: data.cart.map(item => ({
          title: item.name,
          quantity: item.quantity,
          unit_price: item.price.toFixed(2),
          discount_amount: '0.00',
          reference_id: String(item.itemId),
          image_url: '',
          product_url: data.appUrl,
          category: 'Auto Care',
        })),
      },
      shipping_amount: '0.00',
      tax_amount: (data.amount - data.amount / 1.15).toFixed(2),
      meta: { order_id: data.invoiceNumber },
    },
    lang: 'ar',
    merchant_code: merchantCode,
    merchant_urls: {
      success: `${data.appUrl}/api/bnpl/tabby/return?inv=${data.invoiceNumber}&status=success`,
      cancel: `${data.appUrl}/api/bnpl/tabby/return?inv=${data.invoiceNumber}&status=cancel`,
      failure: `${data.appUrl}/api/bnpl/tabby/return?inv=${data.invoiceNumber}&status=failure`,
    },
  }

  const res = await fetch('https://api.tabby.sa/api/v2/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Tabby checkout error ${res.status}: ${err}`)
  }

  const json = await res.json()
  console.log('[Tabby] Full session response:', JSON.stringify(json, null, 2))

  const sessionId = json.id || json.session_id || json.payment?.id
  if (!sessionId) throw new Error('Tabby did not return a session ID')

  const sessionStatus = json.status // e.g. 'created', 'rejected'
  const rejectionCode = json.rejection_reason_code
  const availableProducts = json.configuration?.available_products || {}
  const productKeys = Object.keys(availableProducts).filter(
    k => availableProducts[k] && (Array.isArray(availableProducts[k]) ? availableProducts[k].length > 0 : true)
  )

  console.log('[Tabby] Session status:', sessionStatus, '| Rejection code:', rejectionCode)
  console.log('[Tabby] Available products:', productKeys)

  // If no products available, Tabby rejected this buyer's application
  if (productKeys.length === 0) {
    // Throw a structured error the UI can parse for friendly bilingual messages
    const code = rejectionCode || 'not_available'
    throw new Error(`BNPL_DECLINED:${code}`)
  }

  // Prefer installments, fall back to first available product
  const product = productKeys.includes('installments')
    ? 'installments'
    : productKeys.includes('pay_later')
      ? 'pay_later'
      : productKeys[0]

  // Step 3: Send SMS with product field (required by Tabby)
  const cleanPhone = data.customerPhone.replace(/\s+/g, '').replace(/^\+/, '')
  const smsRes = await fetch(`https://api.tabby.sa/api/v2/checkout/${sessionId}/send_hpp_link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
    body: JSON.stringify({ phone: cleanPhone, product }),
  })

  if (!smsRes.ok) {
    const smsErr = await smsRes.text()
    console.error(`[Tabby] send_hpp_link FAILED ${smsRes.status}:`, smsErr)
    let friendlyErr = smsErr
    try { friendlyErr = JSON.parse(smsErr)?.error || smsErr } catch {}
    throw new Error(`Tabby could not send SMS: ${friendlyErr}`)
  }

  console.log('[Tabby] SMS sent successfully to', cleanPhone, '| product:', product)
  return { sessionId }
}

// ── Tamara API (In-Store SMS Session) ────────────────────────────────────────
// Uses the official /checkout/in-store-session endpoint designed for POS/ERP.
// Tamara sends the SMS payment link directly to the customer's phone.

async function createTamaraSession(data: {
  invoiceNumber: string
  amount: number
  currency: string
  customerPhone: string
  customerName?: string
  cart: CartItem[]
  appUrl: string
}): Promise<{ sessionId: string }> {
  const apiToken = process.env.TAMARA_API_TOKEN!

  // Format phone: Tamara expects local format or E.164
  const phone = data.customerPhone.replace(/\s+/g, '')
  const firstName = data.customerName?.split(' ')[0] || 'Customer'
  const lastName = data.customerName?.split(' ').slice(1).join(' ') || ''

  const payload = {
    order_reference_id: data.invoiceNumber,
    order_number: data.invoiceNumber,
    total_amount: {
      amount: data.amount.toFixed(2),
      currency: data.currency,
    },
    description: `Lamaha POS — ${data.invoiceNumber}`,
    country_code: 'SA',
    payment_type: 'PAY_BY_INSTALMENTS',
    instalments: 3,
    locale: 'ar_SA',
    // In-store: phone number is the primary delivery mechanism for SMS
    phone_number: phone,
    items: data.cart.map(item => ({
      reference_id: String(item.itemId),
      type: 'PHYSICAL',
      name: item.name,
      sku: String(item.itemId),
      quantity: item.quantity,
      unit_price: { amount: item.price.toFixed(2), currency: data.currency },
      discount_amount: { amount: '0.00', currency: data.currency },
      tax_amount: {
        amount: (item.price - item.price / 1.15).toFixed(2),
        currency: data.currency,
      },
      total_amount: {
        amount: (item.price * item.quantity).toFixed(2),
        currency: data.currency,
      },
      image_url: '',
    })),
    consumer: {
      first_name: firstName,
      last_name: lastName,
      phone_number: phone,
      email: 'pos@lamaha.sa',
    },
    billing_address: {
      first_name: firstName,
      last_name: lastName,
      phone_number: phone,
      address_line1: 'Saudi Arabia',
      city: 'Riyadh',
      country_code: 'SA',
    },
    shipping_address: {
      first_name: firstName,
      last_name: lastName,
      phone_number: phone,
      address_line1: 'Saudi Arabia',
      city: 'Riyadh',
      country_code: 'SA',
    },
    shipping_amount: { amount: '0.00', currency: data.currency },
    tax_amount: {
      amount: (data.amount - data.amount / 1.15).toFixed(2),
      currency: data.currency,
    },
    discount: { amount: { amount: '0.00', currency: data.currency } },
    merchant_url: {
      notification: `${data.appUrl}/api/webhooks/tamara`,
    },
  }

  // Use the official In-Store SMS endpoint
  const res = await fetch('https://api.tamara.co/checkout/in-store-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Tamara in-store error ${res.status}: ${err}`)
  }

  const json = await res.json()
  return {
    sessionId: json.order_id || json.checkout_id || json.session_id,
  }
}

// ── Main Server Action: Create Session ───────────────────────────────────────

export async function createBnplSession(input: CreateBnplSessionInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const activeShift = await getOrCreateActiveShift()
  const invoiceNumber = `BNPL-${Date.now()}`
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 min

  // Create DB record first (PENDING)
  const bnplSession = await prisma.bnplSession.create({
    data: {
      provider: input.provider,
      status: 'PENDING_PAYMENT',
      amount: input.amount,
      invoiceNumber,
      customerPhone: input.customerPhone,
      customerName: input.customerName,
      customerId: input.customerId,
      cartSnapshot: input.cart as any,
      expiresAt,
      recordedById: session.user.id,
      shiftId: activeShift.id,
    },
  })

  // Call provider API
  try {
    const sessionData =
      input.provider === 'TABBY'
        ? await createTabbySession({
            invoiceNumber,
            amount: input.amount,
            currency: 'SAR',
            customerPhone: input.customerPhone,
            customerName: input.customerName,
            cart: input.cart,
            appUrl,
          })
        : await createTamaraSession({
            invoiceNumber,
            amount: input.amount,
            currency: 'SAR',
            customerPhone: input.customerPhone,
            customerName: input.customerName,
            cart: input.cart,
            appUrl,
          })

    // Update session with provider ID — no checkout URL needed (SMS is sent by provider)
    await prisma.bnplSession.update({
      where: { id: bnplSession.id },
      data: {
        providerSessionId: sessionData.sessionId,
        status: 'PAYMENT_LINK_SENT',
      },
    })

    return {
      sessionId: bnplSession.id,
      invoiceNumber,
    }
  } catch (err: any) {
    // Mark as failed and rethrow
    await prisma.bnplSession.update({
      where: { id: bnplSession.id },
      data: { status: 'FAILED', failureReason: err.message },
    })
    throw err
  }
}

// ── Cancel a BNPL session ─────────────────────────────────────────────────────

export async function cancelBnplSession(sessionId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  await prisma.bnplSession.update({
    where: { id: sessionId },
    data: { status: 'CANCELLED' },
  })
}

// ── Finalize BNPL after webhook confirms payment ──────────────────────────────
// Called internally by webhook handlers — NOT exposed to client

export async function finalizeBnplPayment(params: {
  invoiceNumber: string
  providerPaymentId?: string
  webhookPayload: any
}) {
  const bnplSession = await prisma.bnplSession.findUnique({
    where: { invoiceNumber: params.invoiceNumber },
  })

  if (!bnplSession) throw new Error(`No BNPL session for invoice ${params.invoiceNumber}`)
  if (bnplSession.status === 'PAID') return // Already processed (idempotency)

  // Get active shift (or the shift the session was created in)
  let shiftId = bnplSession.shiftId
  if (!shiftId) {
    const shift = await prisma.shift.findFirst({ where: { status: 'OPEN' } })
    shiftId = shift?.id ?? null
  }

  const cart = bnplSession.cartSnapshot as unknown as CartItem[]

  await prisma.$transaction(async (tx) => {
    // 1. Mark BNPL session as PAID
    await tx.bnplSession.update({
      where: { id: bnplSession.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        webhookPayload: params.webhookPayload,
        ...(params.providerPaymentId && { providerSessionId: params.providerPaymentId }),
      },
    })

    // 2. Create the financial Transaction record
    await tx.transaction.create({
      data: {
        type: 'SALE',
        method: bnplSession.provider === 'TABBY' ? 'TABBY' : 'TAMARA',
        amount: bnplSession.amount,
        description: `[BNPL-${bnplSession.provider}] ${cart.map(i => `${i.name} x${i.quantity}`).join(', ')}`,
        invoiceNumber: bnplSession.invoiceNumber,
        customerName: bnplSession.customerName,
        customerPhone: bnplSession.customerPhone,
        customerId: bnplSession.customerId,
        recordedById: bnplSession.recordedById,
        shiftId: shiftId,
        isSettled: false,
      },
    })

    // 3. Deduct inventory stock
    for (const item of cart) {
      if (item.quantity <= 0) continue
      await tx.inventoryItem.update({
        where: { id: item.itemId },
        data: { currentStock: { decrement: item.quantity } },
      })
      const invItem = await tx.inventoryItem.findUnique({
        where: { id: item.itemId },
        select: { unitCost: true, sellingPrice: true },
      })
      await tx.stockMovement.create({
        data: {
          itemId: item.itemId,
          type: 'SALE_OUT',
          quantity: -item.quantity,
          unitCost: invItem?.unitCost || 0,
          sellingPrice: invItem?.sellingPrice || 0,
          note: `BNPL ${bnplSession.provider} sale — ${bnplSession.invoiceNumber}`,
          invoiceNumber: bnplSession.invoiceNumber,
          recordedById: bnplSession.recordedById,
        },
      })
    }
  })

  // 4. Create warranty records (non-fatal)
  try {
    await createWarrantyRecordsForSale({
      invoiceNumber: bnplSession.invoiceNumber,
      saleDate: new Date(),
      items: cart.map(i => ({ itemId: i.itemId, quantity: i.quantity })),
      customerId: bnplSession.customerId ?? undefined,
      customerName: bnplSession.customerName ?? undefined,
      customerPhone: bnplSession.customerPhone,
    })
  } catch (err) {
    console.error('[BNPL] Warranty creation failed:', err)
  }

  revalidatePath('/')
  revalidatePath('/sales')
  revalidatePath('/inventory')
}

// ── Admin: Get all BNPL sessions ──────────────────────────────────────────────

export async function getBnplSessions(filters?: {
  provider?: 'TABBY' | 'TAMARA'
  status?: string
  limit?: number
}) {
  const session = await auth()
  const role = session?.user?.role
  if (!['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(role || '')) throw new Error('Unauthorized')

  return prisma.bnplSession.findMany({
    where: {
      ...(filters?.provider && { provider: filters.provider }),
      ...(filters?.status && { status: filters.status as any }),
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 100,
    include: {
      recordedBy: { select: { name: true } },
    },
  })
}

// ── Retry: Regenerate payment link ────────────────────────────────────────────

export async function retryBnplSession(sessionId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const bnplSession = await prisma.bnplSession.findUnique({ where: { id: sessionId } })
  if (!bnplSession) throw new Error('Session not found')
  if (bnplSession.status === 'PAID') throw new Error('Session already paid')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const cart = bnplSession.cartSnapshot as unknown as CartItem[]

  const newExpiry = new Date(Date.now() + 30 * 60 * 1000)

  try {
    const sessionData =
      bnplSession.provider === 'TABBY'
        ? await createTabbySession({
            invoiceNumber: bnplSession.invoiceNumber,
            amount: bnplSession.amount,
            currency: 'SAR',
            customerPhone: bnplSession.customerPhone,
            customerName: bnplSession.customerName ?? undefined,
            cart,
            appUrl,
          })
        : await createTamaraSession({
            invoiceNumber: bnplSession.invoiceNumber,
            amount: bnplSession.amount,
            currency: 'SAR',
            customerPhone: bnplSession.customerPhone,
            customerName: bnplSession.customerName ?? undefined,
            cart,
            appUrl,
          })

    await prisma.bnplSession.update({
      where: { id: sessionId },
      data: {
        status: 'PAYMENT_LINK_SENT',
        providerSessionId: sessionData.sessionId,
        expiresAt: newExpiry,
        failureReason: null,
      },
    })

    return { smsSent: true }
  } catch (err: any) {
    await prisma.bnplSession.update({
      where: { id: sessionId },
      data: { status: 'FAILED', failureReason: err.message },
    })
    throw err
  }
}
