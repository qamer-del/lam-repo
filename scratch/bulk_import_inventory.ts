import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = "postgresql://neondb_owner:npg_1JKwOSx9WcQX@ep-shy-sea-amrd2p40-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const items = [
  { "item_name": "انوار ليد H7", "item_code": "11000271", "cost_price": 85.0, "quantity": 14.0 },
  { "item_name": "انوار ليد H4", "item_code": "11000281", "cost_price": 95.0, "quantity": 8.0 },
  { "item_name": "انوار ليد H11", "item_code": "11000291", "cost_price": 85.0, "quantity": 10.0 },
  { "item_name": "لمبة فرامل خلفي", "item_code": "11000301", "cost_price": 5.0, "quantity": 60.0 },
  { "item_name": "لمبة اشارة", "item_code": "11000311", "cost_price": 3.0, "quantity": 80.0 },
  { "item_name": "محلول تنظيف بخاخات", "item_code": "11000321", "cost_price": 15.0, "quantity": 24.0 },
  { "item_name": "زيت فرامل صغير", "item_code": "11000331", "cost_price": 4.0, "quantity": 50.0 },
  { "item_name": "زيت فرامل كبير", "item_code": "11000341", "cost_price": 12.0, "quantity": 20.0 },
  { "item_name": "شحم حراري صغير", "item_code": "11000351", "cost_price": 7.0, "quantity": 30.0 },
  { "item_name": "شحم حراري كبير", "item_code": "11000361", "cost_price": 18.0, "quantity": 15.0 },
  { "item_name": "غراء قزاز", "item_code": "11000371", "cost_price": 10.0, "quantity": 12.0 },
  { "item_name": "توصيلة ولاعة 3 مخارج", "item_code": "11000381", "cost_price": 15.0, "quantity": 10.0 },
  { "item_name": "شاحن سيارة سريع", "item_code": "11000391", "cost_price": 25.0, "quantity": 20.0 },
  { "item_name": "سلك شاحن ايفون", "item_code": "11000401", "cost_price": 12.0, "quantity": 40.0 },
  { "item_name": "سلك شاحن تايب سي", "item_code": "11000411", "cost_price": 10.0, "quantity": 40.0 },
  { "item_name": "حامل جوال مغناطيس", "item_code": "11000421", "cost_price": 8.0, "quantity": 50.0 },
  { "item_name": "حامل جوال طبلون", "item_code": "11000431", "cost_price": 15.0, "quantity": 25.0 },
  { "item_name": "منظم مراتب", "item_code": "11000441", "cost_price": 20.0, "quantity": 15.0 },
  { "item_name": "كيس نفايات سيارة", "item_code": "11000451", "cost_price": 2.0, "quantity": 200.0 },
  { "item_name": "معطر سيارة فواحة", "item_code": "11000461", "cost_price": 5.0, "quantity": 100.0 },
  { "item_name": "معطر سيارة كرز", "item_code": "11000471", "cost_price": 7.0, "quantity": 60.0 },
  { "item_name": "بخاخ تنظيف طبلون", "item_code": "11000481", "cost_price": 8.0, "quantity": 36.0 },
  { "item_name": "فوطة مايكروفايبر", "item_code": "11000491", "cost_price": 3.0, "quantity": 120.0 },
  { "item_name": "اسفنج غسيل", "item_code": "11000501", "cost_price": 2.0, "quantity": 80.0 },
  { "item_name": "شامبو غسيل سيارات", "item_code": "11000511", "cost_price": 12.0, "quantity": 24.0 }
];

async function main() {
  console.log('Starting bulk import of third inventory batch...');

  for (const item of items) {
    try {
      const existing = await prisma.inventoryItem.findUnique({
        where: { sku: item.item_code }
      });

      if (existing) {
        console.log(`SKU ${item.item_code} already exists. Skipping...`);
        continue;
      }

      const createdItem = await prisma.inventoryItem.create({
        data: {
          name: item.item_name,
          sku: item.item_code,
          unitCost: item.cost_price,
          currentStock: item.quantity,
          category: 'OTHER',
          unit: 'pcs',
          reorderLevel: 5,
          sellingPrice: item.cost_price * 1.5,
        }
      });

      if (item.quantity > 0) {
        await prisma.stockMovement.create({
          data: {
            itemId: createdItem.id,
            type: 'ADJUSTMENT',
            quantity: item.quantity,
            unitCost: item.cost_price,
            note: 'Bulk import initial stock batch 3',
          }
        });
      }

      console.log(`Successfully imported: ${item.item_name}`);
    } catch (error: any) {
      console.error(`Failed to import ${item.item_name}:`, error.message);
    }
  }

  console.log('Bulk import completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
