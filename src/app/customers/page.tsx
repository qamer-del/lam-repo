import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getAllCustomers } from '@/actions/customers'
import CustomersClient from './customers-client'

export const metadata = { title: 'Customers — Lamaha' }

export default async function CustomersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const allowed = ['SUPER_ADMIN', 'ADMIN', 'OWNER']
  if (!allowed.includes(session.user.role as string)) redirect('/')

  const customers = await getAllCustomers()

  return <CustomersClient initialCustomers={customers} />
}
