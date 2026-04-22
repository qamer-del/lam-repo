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
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Representatives & Agents</h1>
      </div>

      <AgentsLedger agents={agents} />
    </div>
  )
}
