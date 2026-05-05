import { getAgents } from '@/actions/agents'
import { AgentsLedger } from '@/components/agents-ledger'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const session = await auth()
  const role = session?.user?.role
  
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    redirect('/')
  }

  const agents = await getAgents()

  return (
    <div className="p-0">
      <AgentsLedger agents={agents} userRole={role} />
    </div>
  )
}
