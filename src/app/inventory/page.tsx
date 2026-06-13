import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getInventoryItems, getPurchaseOrders, getStockMovements } from '@/actions/inventory'
import { getPurchaseReturns } from '@/actions/returns'
import { InventoryClient } from './inventory-client'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const session = await auth()
  const role = session?.user?.role

  // Block cashiers entirely
  if (!session) {
    redirect('/')
  }
  
  if (role === 'CASHIER') {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied to Inventory Base Page</div>
  }

  const [items, purchases, movements, returns] = await Promise.all([
    getInventoryItems(),
    getPurchaseOrders(),
    getStockMovements(),
    getPurchaseReturns().catch(() => []), // Admin only, fallback to empty array if unauthorized
  ])

  return (
    <InventoryClient
      initialItems={items}
      initialPurchases={purchases}
      initialMovements={movements}
      initialReturns={returns}
      userRole={role!}
    />
  )
}
