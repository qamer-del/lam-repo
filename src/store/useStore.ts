import { create } from 'zustand'

export type TransType = 'SALE' | 'EXPENSE' | 'ADVANCE' | 'OWNER_WITHDRAWAL' | 'RETURN' | 'SALARY_PAYMENT' | 'AGENT_PURCHASE' | 'AGENT_PAYMENT'
export type PayMethod = 'CASH' | 'NETWORK'

export interface Transaction {
  id: number
  type: TransType
  amount: number
  fundAmount: number
  method: PayMethod
  description: string | null
  isSettled: boolean
  staffId: number | null
  createdAt: Date
}

interface VaultState {
  cashInDrawer: number
  networkSales: number
  salaryFundRemaining: number
  transactions: Transaction[]
  setVaultData: (data: { cashInDrawer: number; networkSales: number; salaryFundRemaining: number; transactions: Transaction[] }) => void
  addTransaction: (tx: Transaction) => void
}

export const useStore = create<VaultState>((set) => ({
  cashInDrawer: 0,
  networkSales: 0,
  salaryFundRemaining: 0,
  transactions: [],
  setVaultData: (data) => set(data),
  addTransaction: (tx) => set((state) => {
    let cashChange = 0;
    let netChange = 0;
    let fuelFundChange = 0;

    if (tx.type === 'SALE') {
      if (tx.method === 'CASH') {
        cashChange = tx.amount;
        fuelFundChange = tx.fundAmount; 
      }
      if (tx.method === 'NETWORK') netChange = tx.amount;
    } else if (tx.type === 'RETURN') {
      if (tx.method === 'CASH') {
        cashChange = -tx.amount;
        fuelFundChange = -tx.fundAmount;
      }
    } else if (tx.type === 'ADVANCE') {
      if (tx.method === 'CASH') {
        cashChange = -tx.amount;
        fuelFundChange = -tx.fundAmount; // Advances come from the fund too
      }
    } else if (tx.type === 'EXPENSE' || tx.type === 'OWNER_WITHDRAWAL') {
      if (tx.method === 'CASH') cashChange = -tx.amount;
    } else if (tx.type === 'SALARY_PAYMENT') {
      fuelFundChange = -tx.fundAmount;
    }

    return {
      transactions: [tx, ...state.transactions],
      cashInDrawer: state.cashInDrawer + cashChange,
      networkSales: state.networkSales + netChange,
      salaryFundRemaining: state.salaryFundRemaining + fuelFundChange
    }
  })
}))
