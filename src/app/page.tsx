import { Suspense } from 'react'
import { DashboardWrapper } from '@/components/dashboard-wrapper'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>}>
      <DashboardWrapper />
    </Suspense>
  )
}
