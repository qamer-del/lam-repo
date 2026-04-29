import { NextResponse } from 'next/server'
import { createSettlement } from '@/actions/transactions'
import { createInventoryItem } from '@/actions/inventory'

export async function GET() {
  try {
    console.log("Calling createSettlement...");
    const settlement = await createSettlement(100)
    console.log("Calling createInventoryItem...");
    const item = await createInventoryItem({
      name: "API Test Action",
      category: "OTHER",
      unit: "pcs",
      reorderLevel: 5,
      unitCost: 10,
      costIncludesVat: false,
      sellingPrice: 15,
      initialStock: 0,
    })
    
    return NextResponse.json({ success: true, settlement, item })
  } catch (err: any) {
    console.error("Test Action Error", err)
    return NextResponse.json({ success: false, error: err.message, stack: err.stack, name: err.name })
  }
}
