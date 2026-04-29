import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getInventoryItems, getPurchaseOrders, getStockMovements } from '@/actions/inventory'
import { InventoryClient } from './inventory-client'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const session = await auth()
  const role = session?.user?.role

  // Block cashiers entirely
  if (!session || role === 'CASHIER') {
    redirect('/')
  }

  const [items, purchases, movements] = await Promise.all([
    getInventoryItems(),
    getPurchaseOrders(),
    getStockMovements(),
  ])

  return (
    <InventoryClient
      initialItems={items}
      initialPurchases={purchases}
      initialMovements={movements}
      userRole={role!}
    />
  )
}
