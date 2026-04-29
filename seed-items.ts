import 'dotenv/config';
import { InventoryCategory } from '@prisma/client';
import { prisma } from './src/lib/prisma';

const prefixes = ["Mega", "Ultra", "Super", "Pro", "Eco", "Max", "Giga", "Auto", "Shine", "Clean"];
const middle = ["Wash", "Wax", "Polish", "Coat", "Lube", "Scrub", "Protect", "Glow", "Detail", "Guard"];
const suffixes = ["Plus", "X", "Pro", "Max", "Ultimate", "Elite", "Advanced", "100", "200", "V2"];
const categories: InventoryCategory[] = ['POLISH', 'COATING', 'CONSUMABLE', 'EQUIPMENT', 'CHEMICAL', 'OTHER'];
const units = ['pcs', 'L', 'kg', 'roll', 'box'];

async function main() {
  console.log('Seeding 300 inventory items...');
  
  const itemsToCreate = [];
  
  for (let i = 1; i <= 300; i++) {
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const m = middle[Math.floor(Math.random() * middle.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    const name = `${p} ${m} ${s} ${i}`;
    const category = categories[Math.floor(Math.random() * categories.length)];
    const unitCost = Math.floor(Math.random() * 50) + 10;
    const sellingPrice = Math.floor(unitCost * 1.5);
    const unit = units[Math.floor(Math.random() * units.length)];
    
    itemsToCreate.push({
      name,
      sku: `SKU-${10000 + i}`,
      category,
      unit,
      currentStock: Math.floor(Math.random() * 100) + 20,
      reorderLevel: 10,
      unitCost,
      costIncludesVat: Math.random() > 0.5,
      sellingPrice,
      isActive: true,
    });
  }

  const result = await prisma.inventoryItem.createMany({
    data: itemsToCreate,
    skipDuplicates: true,
  });

  console.log(`Successfully seeded ${result.count} items.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
