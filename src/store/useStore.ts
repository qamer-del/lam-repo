import { create } from 'zustand'

export type TransType = 'SALE' | 'RETURN' | 'EXPENSE' | 'ADVANCE' | 'SALARY_PAYMENT' | 'OWNER_WITHDRAWAL' | 'AGENT_PURCHASE' | 'AGENT_PAYMENT' | 'WARRANTY_REPLACEMENT'
export type PayMethod = 'CASH' | 'NETWORK' | 'TABBY' | 'TAMARA' | 'CREDIT'

export interface Transaction {
  id: number
  type: TransType
  amount: number
  method: PayMethod
  description: string | null
  isSettled: boolean
  staffId: number | null
  agentId: number | null
  settlementId: number | null
  salarySettlementId: number | null
  recordedById: string | null
  isInternal: boolean
  linkedTransactionId: number | null
  invoiceNumber: string | null
  customerName?: string | null
  customerPhone?: string | null
  createdAt: Date
  staff?: { name: string } | null
  recordedBy?: { name: string } | null
}

interface VaultState {
  cashInDrawer: number
  networkSales: number
  tabbyBalance: number
  tamaraBalance: number
  salaryFundRemaining: number
  totalOutstandingCredit: number
  transactions: Transaction[]
  recentSettlements: any[]
  isSettleCashOpen: boolean
  isAddTxOpen: boolean
  setVaultData: (data: Partial<VaultState>) => void
  setIsSettleCashOpen: (open: boolean) => void
  setIsAddTxOpen: (open: boolean) => void
  addTransactions: (txs: Transaction[]) => void
  addTransaction: (tx: Transaction) => void
}

export const useStore = create<VaultState>((set) => ({
  cashInDrawer: 0,
  networkSales: 0,
  tabbyBalance: 0,
  tamaraBalance: 0,
  salaryFundRemaining: 0,
  totalOutstandingCredit: 0,
  transactions: [],
  recentSettlements: [],
  isSettleCashOpen: false,
  isAddTxOpen: false,
  setVaultData: (data) => set((state) => ({ ...state, ...data })),
  setIsSettleCashOpen: (open) => set({ isSettleCashOpen: open }),
  setIsAddTxOpen: (open) => set({ isAddTxOpen: open }),
  addTransactions: (txs) => set((state) => {
    let cashChange = 0;
    let netChange = 0;
    let tabbyChange = 0;
    let tamaraChange = 0;
    let fuelFundChange = 0;
    let creditChange = 0;

    txs.forEach(tx => {
      const isNetworkLike = ['NETWORK', 'TABBY', 'TAMARA'].includes(tx.method)
      
      if (tx.type === 'SALE') {
        if (tx.method === 'CASH') {
          cashChange += tx.amount;
          fuelFundChange += tx.amount;
        } else if (tx.method === 'NETWORK') {
          netChange += tx.amount;
        } else if (tx.method === 'TABBY') {
          tabbyChange += tx.amount;
        } else if (tx.method === 'TAMARA') {
          tamaraChange += tx.amount;
        } else if (tx.method === 'CREDIT') {
          creditChange += tx.amount;
        }
      } else if (tx.type === 'RETURN') {
        if (tx.method === 'CASH') {
          cashChange -= tx.amount;
          fuelFundChange -= tx.amount;
        } else if (tx.method === 'NETWORK') {
          netChange -= tx.amount;
        } else if (tx.method === 'TABBY') {
          tabbyChange -= tx.amount;
        } else if (tx.method === 'TAMARA') {
          tamaraChange -= tx.amount;
        }
      } else if (['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PURCHASE', 'AGENT_PAYMENT'].includes(tx.type)) {
        if (tx.method === 'CASH') cashChange -= tx.amount;
        else if (tx.method === 'NETWORK') netChange -= tx.amount;
        else if (tx.method === 'TABBY') tabbyChange -= tx.amount;
        else if (tx.method === 'TAMARA') tamaraChange -= tx.amount;
      } else if (tx.type === 'SALARY_PAYMENT') {
        fuelFundChange -= tx.amount;
      }
    })

    return {
      transactions: [...txs, ...state.transactions],
      cashInDrawer: state.cashInDrawer + cashChange,
      networkSales: state.networkSales + netChange,
      tabbyBalance: state.tabbyBalance + tabbyChange,
      tamaraBalance: state.tamaraBalance + tamaraChange,
      salaryFundRemaining: state.salaryFundRemaining + fuelFundChange,
      totalOutstandingCredit: state.totalOutstandingCredit + creditChange
    }
  }),
  addTransaction: (tx) => useStore.getState().addTransactions([tx])
}))
