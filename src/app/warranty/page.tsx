import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getWarrantyStats, getExpiringSoonWarranties, getActiveWarranties } from '@/actions/warranty'
import { WarrantyClient } from './warranty-client'

export const metadata = {
  title: 'Warranty Management | Lamaha',
  description: 'Check, verify, and manage product warranties and replacement claims.',
}

export default async function WarrantyPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [stats, expiringSoon, activeWarranties] = await Promise.allSettled([
    getWarrantyStats(),
    getExpiringSoonWarranties(30),
    getActiveWarranties(),
  ])

  const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(session.user.role || '')

  return (
    <WarrantyClient
      role={session.user.role}
      isAdmin={isAdmin}
      stats={stats.status === 'fulfilled' ? stats.value : null}
      expiringSoon={expiringSoon.status === 'fulfilled' ? expiringSoon.value : []}
      activeWarranties={activeWarranties.status === 'fulfilled' ? activeWarranties.value : []}
    />
  )
}
