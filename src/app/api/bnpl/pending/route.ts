import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Returns all PAYMENT_LINK_SENT sessions from the last 24 hours
// so the Pending Panel can restore monitoring after a page refresh.

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const pending = await prisma.bnplSession.findMany({
    where: {
      status: { in: ['PENDING_PAYMENT', 'PAYMENT_LINK_SENT'] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      provider: true,
      amount: true,
      customerName: true,
      customerPhone: true,
      invoiceNumber: true,
      createdAt: true,
      status: true,
    },
    take: 10,
  })

  return NextResponse.json(pending)
}
