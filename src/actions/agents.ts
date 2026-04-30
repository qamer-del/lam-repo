'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

export async function getAgents() {
  const agents = await prisma.agent.findMany({
    orderBy: { name: 'asc' },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })
  return agents
}

export async function createAgent(data: { name: string; companyName?: string; openingBalance: number }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  await prisma.agent.create({
    data: {
      name: data.name,
      companyName: data.companyName,
      openingBalance: data.openingBalance,
    }
  })
  
  revalidatePath('/agents')
}

// Transaction: Store purchases on credit from agent -> debt increases
// Transaction: Store pays agent -> debt decreases
export async function addAgentTransaction(data: {
  agentId: number
  type: 'AGENT_PURCHASE' | 'AGENT_PAYMENT'
  amount: number
  description?: string
  method: 'CASH' | 'NETWORK' | 'CREDIT'
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') throw new Error('Unauthorized')

  await prisma.transaction.create({
    data: {
      type: data.type,
      amount: data.amount,
      method: data.method,
      description: data.description,
      agentId: data.agentId,
      recordedById: session.user.id
    }
  })

  revalidatePath('/agents')
}
