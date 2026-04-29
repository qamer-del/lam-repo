const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  try {
    const item = await prisma.inventoryItem.create({
      data: {
        name: "Test Item",
        category: "OTHER",
        unit: "pcs",
        reorderLevel: 5,
        unitCost: 10,
        sellingPrice: 15,
        currentStock: 0,
        costIncludesVat: false,
      }
    })
    console.log("Success:", item)
  } catch (err) {
    console.error("Prisma Error:", err)
  }
}
test()
