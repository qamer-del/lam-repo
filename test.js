const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const credits = await prisma.transaction.findMany({
    where: { method: 'CREDIT' },
    orderBy: { createdAt: 'desc' }
  });
  console.log('CREDIT TRANSACTIONS:');
  console.log(credits);
  
  const staff = await prisma.staff.findMany();
  console.log('STAFF:');
  console.log(staff);
}
main().finally(() => prisma.$disconnect());
