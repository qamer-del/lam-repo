import { prisma } from './src/lib/prisma'

async function test() {
  try {
    const item = await prisma.inventoryItem.create({
      data: {
        name: "Test Item with Stock",
        category: "OTHER",
        unit: "pcs",
        reorderLevel: 5,
        unitCost: 10,
        sellingPrice: 15,
        currentStock: 10,
        costIncludesVat: false,
      }
    })
    
    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: 'ADJUSTMENT',
        quantity: 10,
        unitCost: 10,
        note: 'Initial stock entry',
        recordedById: "test-user-id", // mock user ID
      },
    })
    
    console.log("Success:", item)
    process.exit(0)
  } catch (err) {
    console.error("Prisma Error:", err)
    process.exit(1)
  }
}
test()
