import { notFound } from 'next/navigation'
import { getStaffProfile } from '@/actions/staff'
import { StaffWorkspace } from '@/components/staff/StaffWorkspace'

export default async function StaffProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const staffId = parseInt(id)

  if (isNaN(staffId)) notFound()

  const staff = await getStaffProfile(staffId)
  if (!staff) notFound()

  return <StaffWorkspace staff={staff} activeTab={tab || 'overview'} />
}
