import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ActivityClient from './activity-client'
import { getActivityData } from '@/actions/activity'

export default async function ActivityPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const initialActivity = await getActivityData({ dateRange: 'THIS_MONTH', limit: 20 })

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Activity History</h1>
        <p className="text-sm text-gray-500">Full audit log of all system transactions and settlements</p>
      </div>

      <ActivityClient initialData={initialActivity.data} initialTotal={initialActivity.total} />
    </div>
  )
}
