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
  totalStaffDebt: number
  transactions: Transaction[]
  setVaultData: (data: { cashInDrawer: number; networkSales: number; totalStaffDebt: number; transactions: Transaction[] }) => void
  addTransaction: (tx: Transaction) => void
}

export const useStore = create<VaultState>((set) => ({
  cashInDrawer: 0,
  networkSales: 0,
  totalStaffDebt: 0,
  transactions: [],
  setVaultData: (data) => set(data),
  addTransaction: (tx) => set((state) => {
    let cashChange = 0;
    let netChange = 0;
    let debtChange = 0;

    if (tx.type === 'SALE') {
      if (tx.method === 'CASH') cashChange = tx.amount;
      if (tx.method === 'NETWORK') netChange = tx.amount;
    } else if (tx.type === 'EXPENSE' || tx.type === 'ADVANCE' || tx.type === 'OWNER_WITHDRAWAL') {
      if (tx.method === 'CASH') cashChange = -tx.amount;
      // Network expenses are rarely handled from cash drawer directly, but let's assume they don't affect drawer if paid by network
    }

    if (tx.type === 'ADVANCE') {
      debtChange = tx.amount;
    }

    return {
      transactions: [tx, ...state.transactions],
      cashInDrawer: state.cashInDrawer + cashChange,
      networkSales: state.networkSales + netChange,
      totalStaffDebt: state.totalStaffDebt + debtChange
    }
  })
}))
