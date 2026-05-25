import { StaffWorkspace } from "@/components/staff/staff-workspace"
import { getStaffListSummary } from "@/actions/staff"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Staff Workspace | Lamv2",
  description: "Manage staff, payroll, and attendance",
}

export default async function StaffPage() {
  const summary = await getStaffListSummary()

  return (
    <div className="-m-4 sm:-m-6 md:-m-8 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
      <StaffWorkspace initialStaffList={summary} />
    </div>
  )
}
