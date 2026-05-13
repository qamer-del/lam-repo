import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import {
  getWarrantyStats,
  getExpiringSoonWarranties,
  getActiveWarranties,
  getReplacementHistory,
  getWarrantyReturnStock,
  getSupplierWarrantyCases,
} from '@/actions/warranty'
import { prisma } from '@/lib/prisma'
import { WarrantyClient } from './warranty-client'

export const metadata = {
  title: 'Warranty Management | Lamaha',
  description: 'Check, verify, and manage product warranties, replacements, and supplier returns.',
}

export default async function WarrantyPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(session.user.role || '')

  // Always fetch for search functionality
  const [stats, expiringSoon, activeWarranties, replacementHistory, returnStock, supplierCases, agents] = await Promise.allSettled([
    getWarrantyStats(),
    getExpiringSoonWarranties(30),
    getActiveWarranties(),
    isAdmin ? getReplacementHistory(100) : Promise.resolve([]),
    isAdmin ? getWarrantyReturnStock() : Promise.resolve([]),
    isAdmin ? getSupplierWarrantyCases() : Promise.resolve([]),
    isAdmin
      ? prisma.agent.findMany({ where: { isActive: true }, select: { id: true, name: true, companyName: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
  ])

  return (
    <WarrantyClient
      role={session.user.role}
      isAdmin={isAdmin}
      stats={stats.status === 'fulfilled' ? stats.value : null}
      expiringSoon={expiringSoon.status === 'fulfilled' ? expiringSoon.value : []}
      activeWarranties={activeWarranties.status === 'fulfilled' ? activeWarranties.value : []}
      replacementHistory={replacementHistory.status === 'fulfilled' ? replacementHistory.value : []}
      returnStockItems={returnStock.status === 'fulfilled' ? returnStock.value : []}
      supplierCases={supplierCases.status === 'fulfilled' ? supplierCases.value : []}
      agents={agents.status === 'fulfilled' ? agents.value : []}
    />
  )
}
