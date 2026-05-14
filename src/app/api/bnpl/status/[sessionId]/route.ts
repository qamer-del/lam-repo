import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

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
    },
  })

  if (!bnplSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json(bnplSession)
}
