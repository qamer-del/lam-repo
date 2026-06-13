'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { getBranchFilter, getCurrentBranchId } from '@/actions/branch-helpers'

export async function getAgents() {
  const branchFilter = await getBranchFilter()
  const agents = await prisma.agent.findMany({
    where: { ...branchFilter },
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

  const branchId = await getCurrentBranchId()

  await prisma.agent.create({
    data: {
      name: data.name,
      companyName: data.companyName,
      openingBalance: data.openingBalance,
      branchId,
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

  const branchId = await getCurrentBranchId()

  await prisma.transaction.create({
    data: {
      type: data.type,
      amount: data.amount,
      method: data.method,
      description: data.description,
      agentId: data.agentId,
      recordedById: session.user.id,
      branchId,
    }
  })

  revalidatePath('/agents')
}
