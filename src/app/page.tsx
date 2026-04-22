import { Suspense } from 'react'
import { DashboardWrapper } from '@/components/dashboard-wrapper'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await auth()
  if (session?.user?.role === 'CASHIER') {
    redirect('/sales')
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>}>
      <DashboardWrapper />
    </Suspense>
  )
}
