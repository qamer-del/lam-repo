import { create } from 'zustand'

export type TransType = 'SALE' | 'EXPENSE' | 'ADVANCE' | 'OWNER_WITHDRAWAL'
export type PayMethod = 'CASH' | 'NETWORK'

export interface Transaction {
  id: number
  type: TransType
  amount: number
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
  recentSettlements: any[]
  setVaultData: (data: { 
    cashInDrawer: number; 
    networkSales: number; 
    salaryFundRemaining: number; 
    transactions: Transaction[];
    recentSettlements: any[];
  }) => void
  addTransaction: (tx: Transaction) => void
}

export const useStore = create<VaultState>((set) => ({
  cashInDrawer: 0,
  networkSales: 0,
  salaryFundRemaining: 0,
  transactions: [],
  recentSettlements: [],
  setVaultData: (data) => set(data),
  addTransaction: (tx) => set((state) => {
    let cashChange = 0;
    let netChange = 0;
    let fuelFundChange = 0;

    if (tx.type === 'SALE') {
      if (tx.method === 'CASH') {
        cashChange = tx.amount;
        fuelFundChange = tx.amount; // Sales increase the salary fund
      }
      if (tx.method === 'NETWORK') netChange = tx.amount;
    } else if (tx.type === 'EXPENSE' || tx.type === 'ADVANCE' || tx.type === 'OWNER_WITHDRAWAL') {
      if (tx.method === 'CASH') cashChange = -tx.amount;
    } else if (tx.type === 'SALARY_PAYMENT') {
      // Salary payments come from the fund, NOT the daily drawer
      fuelFundChange = -tx.amount;
    }

    return {
      transactions: [tx, ...state.transactions],
      cashInDrawer: state.cashInDrawer + cashChange,
      networkSales: state.networkSales + netChange,
      salaryFundRemaining: state.salaryFundRemaining + fuelFundChange
    }
  })
}))
