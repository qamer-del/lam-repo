import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getBnplSessions } from '@/actions/bnpl'
import { BnplAdminClient } from './bnpl-client'

export default async function BnplAdminPage() {
  const session = await auth()
  const role = session?.user?.role
  if (!['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(role || '')) {
    redirect('/')
  }

  const sessions = await getBnplSessions({ limit: 200 })

  return <BnplAdminClient sessions={sessions as any} />
}
