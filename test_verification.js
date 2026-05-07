const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDashboardDataSim() {
  const allTxs = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    include: { settlement: { include: { performedBy: { select: { role: true } } } } }
  });

  let cashInDrawer = 0;
  
  allTxs.forEach((tx) => {
    const isNeutral = tx.description?.includes('[DRAWER_NEUTRAL]');
    if (isNeutral) return;

    const isClearedByAdmin = tx.settlementId && tx.settlement?.performedBy?.role && 
      ['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(tx.settlement.performedBy.role);
    
    const isStaffRelated = tx.type === 'ADVANCE' || tx.type === 'SALARY_PAYMENT' || (tx.type === 'EXPENSE' && tx.staffId !== null);
    
    const isActiveInDrawer = isStaffRelated 
      ? !isClearedByAdmin 
      : !tx.isSettled && !isClearedByAdmin;

    if (tx.type === 'SALE') {
      if (tx.method === 'CASH' && isActiveInDrawer) cashInDrawer += tx.amount;
    } else if (tx.type === 'RETURN') {
      if (tx.method === 'CASH' && isActiveInDrawer) cashInDrawer -= tx.amount;
    } else if (['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT', 'AGENT_PURCHASE', 'SALARY_PAYMENT'].includes(tx.type)) {
      if (tx.method === 'CASH' && isActiveInDrawer) cashInDrawer -= tx.amount;
    }
  });

  return { cashInDrawer };
}

async function main() {
  console.log('--- STARTING VERIFICATION ---');

  // 1. Setup staff
  const staff = await prisma.staff.create({
    data: { name: 'Test Staff', baseSalary: 1000 }
  });
  console.log('Created staff:', staff.name);

  // 2. Add ADVANCE
  const advance = await prisma.transaction.create({
    data: {
      type: 'ADVANCE',
      amount: 200,
      method: 'CASH',
      staffId: staff.id,
      description: 'Test Advance'
    }
  });
  console.log('Added advance: 200');

  let data = await getDashboardDataSim();
  console.log('Dashboard Cash in Drawer (should be -200):', data.cashInDrawer);

  // 3. Simulate settleSalary
  const salarySettlement = await prisma.salarySettlement.create({
    data: {
      staffId: staff.id,
      month: 5,
      year: 2026,
      baseSalary: 1000,
      advancesTally: 200,
      netPaid: 800,
      method: 'CASH'
    }
  });

  await prisma.transaction.update({
    where: { id: advance.id },
    data: { isSettled: true, salarySettlementId: salarySettlement.id }
  });

  const paymentTx = await prisma.transaction.create({
    data: {
      type: 'SALARY_PAYMENT',
      amount: 800,
      method: 'CASH',
      staffId: staff.id,
      isSettled: true,
      salarySettlementId: salarySettlement.id,
      description: 'Final payout'
    }
  });
  console.log('Performed salary settlement (800 net paid)');

  data = await getDashboardDataSim();
  console.log('Dashboard Cash in Drawer (should be -1000):', data.cashInDrawer);

  // 4. Simulate createSettlement
  // Find "unsettled" transactions using our NEW logic
  const unsettled = await prisma.transaction.findMany({
    where: { 
      AND: [
        {
          OR: [
            { isSettled: false },
            { salarySettlementId: { not: null } }
          ]
        },
        {
          OR: [
            { settlementId: null }
            // skipping cashier logic for simplicity
          ]
        }
      ]
    }
  });
  console.log('Found unsettled count:', unsettled.length);

  const settlement = await prisma.settlement.create({
    data: {
      totalCashHanded: -1000,
      totalNetworkVolume: 0,
      performedById: null // system
    }
  });

  await prisma.transaction.updateMany({
    where: { id: { in: unsettled.map(u => u.id) } },
    data: { settlementId: settlement.id }
  });
  console.log('Performed Admin Settlement');

  data = await getDashboardDataSim();
  console.log('Dashboard Cash in Drawer (should be 0):', data.cashInDrawer);

  // Cleanup
  await prisma.transaction.deleteMany({ where: { OR: [{ id: advance.id }, { id: paymentTx.id }] } });
  await prisma.salarySettlement.delete({ where: { id: salarySettlement.id } });
  await prisma.settlement.delete({ where: { id: settlement.id } });
  await prisma.staff.delete({ where: { id: staff.id } });
  console.log('--- CLEANUP COMPLETE ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
