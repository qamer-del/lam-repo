import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const overlapping = await prisma.salarySettlement.findFirst({
    orderBy: { createdAt: 'desc' }
  })
  console.log(overlapping)
}

main().catch(console.error).finally(() => prisma.$disconnect())
