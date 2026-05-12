'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/providers/language-provider'
import { usePrinter } from '@/providers/printer-provider'
import { useStore, Transaction } from '@/store/useStore'
import { recordDailySales, getInvoiceDetails } from '@/actions/transactions'
import { createCustomer } from '@/actions/customers'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Banknote, Wifi,
  SplitSquareHorizontal, ShoppingBag, Users, Check, UserPlus, ArrowLeft,
  CheckCircle2, Package, ChevronsUpDown, X, History, CreditCard, LogOut,
  ArrowUpRight, ArrowDownLeft, Percent, Tag, Keyboard, ChevronDown, ChevronUp, Loader2, Printer
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CloseShiftBtn } from '@/components/close-shift-btn'
import { CreditCollectionPanel } from '@/components/credit-collection-panel'
// ViewInvoiceModal removed — invoice details now shown inline in Today tab
import { WarrantyNotification } from '@/components/warranty-notification'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

type PayMode = 'CASH' | 'NETWORK' | 'SPLIT' | 'TABBY' | 'TAMARA' | 'CREDIT'
type ActiveTab = 'pos' | 'sales' | 'credit'

interface InventoryItem {
  id: number; name: string; sku: string | null; unit: string
  currentStock: number; sellingPrice: number; reorderLevel: number
  hasWarranty?: boolean; warrantyDuration?: number | null; warrantyUnit?: string | null
}
interface CartItem { itemId: number; name: string; unit: string; quantity: number; price: number }
interface CustomerOption { id: number; name: string; phone: string | null }

interface PosClientProps {
  inventoryItems: InventoryItem[]
  customers: CustomerOption[]
  cashierName: string
  hasUnsettled: boolean
  unsettledCash: number; unsettledNetwork: number; unsettledTabby: number; unsettledTamara: number
  allTodaySales: any[]
  unpaidCreditSales: any[]
  activeShift: any | null
}

const PAY_METHODS: { mode: PayMode; label: string; shortcut: string; icon: any; active: string }[] = [
  { mode: 'CASH',    label: 'Cash',    shortcut: 'Ctrl+1', icon: Banknote,              active: 'bg-emerald-50 border-emerald-500 text-emerald-700' },
  { mode: 'NETWORK', label: 'Network', shortcut: 'Ctrl+2', icon: Wifi,                  active: 'bg-blue-50 border-blue-500 text-blue-700' },
  { mode: 'SPLIT',   label: 'Split',   shortcut: 'Ctrl+3', icon: SplitSquareHorizontal, active: 'bg-orange-50 border-orange-500 text-orange-700' },
  { mode: 'TABBY',   label: 'Tabby',   shortcut: 'Ctrl+4', icon: ShoppingBag,           active: 'bg-purple-50 border-purple-500 text-purple-700' },
  { mode: 'TAMARA',  label: 'Tamara',  shortcut: 'Ctrl+5', icon: ShoppingBag,           active: 'bg-pink-50 border-pink-500 text-pink-700' },
  { mode: 'CREDIT',  label: 'Credit',  shortcut: 'Ctrl+6', icon: Users,                 active: 'bg-amber-50 border-amber-500 text-amber-700' },
]

export function PosClient({
  inventoryItems, customers: initialCustomers, cashierName,
  hasUnsettled, unsettledCash, unsettledNetwork, unsettledTabby, unsettledTamara,
  allTodaySales, unpaidCreditSales, activeShift
}: PosClientProps) {
  const { t, locale } = useLanguage()
  const isRTL = locale === 'ar'
  const router = useRouter()
  const { print: printReceipt, status: printerStatus, isPrinting } = usePrinter()

  const { activeShift: storeActiveShift, setVaultData } = useStore()

  useEffect(() => {
    setVaultData({ 
      activeShift, 
      transactions: allTodaySales,
      cashInDrawer: unsettledCash,
      networkSales: unsettledNetwork,
      tabbyBalance: unsettledTabby,
      tamaraBalance: unsettledTamara
    })
  }, [activeShift, allTodaySales, unsettledCash, unsettledNetwork, unsettledTabby, unsettledTamara, setVaultData])
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<any>(null)
  const [expandedLoading, setExpandedLoading] = useState(false)
  const [mobilePosView, setMobilePosView] = useState<'items' | 'cart'>('items')
  const [collapsedShifts, setCollapsedShifts] = useState<number[]>([])

  const [search, setSearch] = useState('')
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)
  const itemListRef = useRef<HTMLDivElement>(null)

  const filteredItems = search.trim() === ''
    ? inventoryItems
    : inventoryItems.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.sku?.toLowerCase().includes(search.toLowerCase()))
      )

  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = useCallback((item: InventoryItem) => {
    if (item.currentStock <= 0) return
    setCart(prev => {
      const ex = prev.find(c => c.itemId === item.id)
      if (ex) return prev.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { itemId: item.id, name: item.name, unit: item.unit, quantity: 1, price: item.sellingPrice }]
    })
  }, [])

  const setQty = (id: number, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(c => c.itemId !== id)); return }
    setCart(prev => prev.map(c => c.itemId === id ? { ...c, quantity: qty } : c))
  }
  const updatePrice = (id: number, price: number) =>
    setCart(prev => prev.map(c => c.itemId === id ? { ...c, price: Math.max(0, price) } : c))
  const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.itemId !== id))

  const cartSubtotal = cart.reduce((s, c) => s + c.quantity * c.price, 0)

  const [payMode, setPayMode] = useState<PayMode>('CASH')
  const [totalOverride, setTotalOverride] = useState('')
  const [cashAmt, setCashAmt] = useState('')
  const [netAmt, setNetAmt] = useState('')
  const [discountPct, setDiscountPct] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(() => format(addDays(new Date(), 30), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [pendingWarranties, setPendingWarranties] = useState<any[]>([])
  const amountRef = useRef<HTMLInputElement>(null)

  const baseTotal = totalOverride !== '' ? (parseFloat(totalOverride) || 0) : cartSubtotal
  const discountAmt = baseTotal * (parseFloat(discountPct) || 0) / 100
  const finalTotal = Math.max(0, baseTotal - discountAmt)

  const handleCashAmtChange = (val: string) => {
    setCashAmt(val)
    const c = parseFloat(val) || 0
    if (finalTotal >= c) setNetAmt((finalTotal - c).toFixed(2))
  }

  const [customerList, setCustomerList] = useState<CustomerOption[]>(initialCustomers)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerComboOpen, setCustomerComboOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [quickAddPhone, setQuickAddPhone] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)

  const resetForm = () => {
    setCart([]); setPayMode('CASH'); setTotalOverride('')
    setCashAmt(''); setNetAmt(''); setDiscountPct(''); setDescription('')
    setCustomerId(null); setCustomerName(''); setCustomerPhone('')
    setCustomerSearch(''); setQuickAddMode(false); setQuickAddPhone('')
    setFocusedIdx(-1)
    setTimeout(() => { searchRef.current?.focus() }, 100)
  }

  const handleSubmit = useCallback(async () => {
    const validItems = cart.filter(c => c.quantity > 0)
    if (!validItems.length) { toast.warning(t('selectAtLeastOneItem')); return }
    if (finalTotal <= 0) { toast.warning(t('enterValidTotal')); return }
    if (payMode === 'SPLIT') {
      const c = parseFloat(cashAmt) || 0, n = parseFloat(netAmt) || 0
      if (Math.abs(finalTotal - (c + n)) > 0.01) { toast.warning(t('splitAmountError')); return }
    }
    if (payMode === 'CREDIT' && !customerId && (!customerName.trim() || !customerPhone.trim())) {
      toast.warning(t('creditCustomerRequired')); return
    }
    setLoading(true)
    try {
      const results = await recordDailySales({
        paymentMode: payMode, totalAmount: finalTotal,
        cashAmount: payMode === 'SPLIT' ? (parseFloat(cashAmt) || 0) : undefined,
        networkAmount: payMode === 'SPLIT' ? (parseFloat(netAmt) || 0) : undefined,
        description: description || undefined,
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        dueDate: payMode === 'CREDIT' && dueDate ? new Date(dueDate) : undefined,
        consumedItems: validItems.map(ci => ({ itemId: ci.itemId, quantity: ci.quantity })),
      })
      if (results) {
        useStore.getState().addTransactions(results as Transaction[])
        if (printerStatus === 'connected' && results.length > 0) {
          printReceipt({
            invoiceNumber: results[0].invoiceNumber || '',
            createdAt: results[0].createdAt ? new Date(results[0].createdAt) : new Date(),
            cashierName: (results[0] as any).recordedBy?.name || cashierName,
            items: validItems.map(ci => ({ name: ci.name, quantity: ci.quantity, price: ci.price, unit: ci.unit })),
            totalAmount: finalTotal, paymentMethod: payMode,
            cashAmount: payMode === 'SPLIT' ? (parseFloat(cashAmt) || 0) : undefined,
            networkAmount: payMode === 'SPLIT' ? (parseFloat(netAmt) || 0) : undefined,
            customerName: customerName || undefined, description: description || undefined,
          }).catch(() => {})
        }
        const soldIds = validItems.map(ci => ci.itemId)
        const warrantyItems = inventoryItems.filter(i => soldIds.includes(i.id) && i.hasWarranty)
        if (warrantyItems.length > 0 && results.length > 0) {
          const { checkWarrantyStatus } = await import('@/actions/warranty')
          const invNum = results[0].invoiceNumber
          if (invNum) { const wr = await checkWarrantyStatus({ invoiceNumber: invNum }); if (wr.length > 0) setPendingWarranties(wr) }
        }
      }
      toast.success(t('transactionAdded'))
      resetForm()
      router.refresh()
    } catch (e) { console.error(e); toast.error(t('operationFailed')) }
    finally { setLoading(false) }
  }, [cart, finalTotal, payMode, cashAmt, netAmt, customerId, customerName, customerPhone, dueDate, description, printerStatus])

  const submitRef = useRef(handleSubmit)
  submitRef.current = handleSubmit

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if ((e.key === '/' || e.key === 'F2') && !inInput && activeTab === 'pos') {
        e.preventDefault(); searchRef.current?.focus(); setFocusedIdx(-1); return
      }
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur()
        setSearch(''); setFocusedIdx(-1)
        setTimeout(() => searchRef.current?.focus(), 50)
        return
      }
      if (e.key === 'ArrowDown' && (e.target === searchRef.current || !inInput) && activeTab === 'pos') {
        e.preventDefault()
        setFocusedIdx(prev => Math.min(prev + 1, filteredItems.length - 1))
        return
      }
      if (e.key === 'ArrowUp' && (e.target === searchRef.current || !inInput) && activeTab === 'pos') {
        e.preventDefault()
        setFocusedIdx(prev => Math.max(prev - 1, -1))
        if (focusedIdx <= 0) searchRef.current?.focus()
        return
      }
      if (e.key === 'Enter' && focusedIdx >= 0 && !inInput && activeTab === 'pos') {
        e.preventDefault()
        const item = filteredItems[focusedIdx]
        if (item) addToCart(item)
        return
      }
      if (e.ctrlKey && ['1','2','3','4','5','6'].includes(e.key) && activeTab === 'pos') {
        e.preventDefault()
        const modes: PayMode[] = ['CASH','NETWORK','SPLIT','TABBY','TAMARA','CREDIT']
        setPayMode(modes[parseInt(e.key) - 1])
        return
      }
      if (e.key === 'F4' && activeTab === 'pos') { e.preventDefault(); amountRef.current?.focus(); return }
      if ((e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) && activeTab === 'pos') {
        e.preventDefault(); submitRef.current(); return
      }
      if (e.ctrlKey && e.key === 'k' && activeTab === 'pos') { e.preventDefault(); setCart([]); return }
      if (e.key === '?' && !inInput) { e.preventDefault(); setShowShortcuts(v => !v); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, focusedIdx, filteredItems, addToCart])

  useEffect(() => {
    if (focusedIdx >= 0 && itemListRef.current) {
      const el = itemListRef.current.children[focusedIdx] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIdx])

  const getPayMethodLabel = (mode: PayMode) => {
    const map = { CASH: t('cash'), NETWORK: t('network'), SPLIT: t('splitPayment'), TABBY: t('tabby'), TAMARA: t('tamara'), CREDIT: t('credit') }
    return map[mode]
  }

  const shortcuts = [
    { key: '/', label: 'Focus search' }, { key: 'F2', label: 'Focus search' },
    { key: '↑ ↓', label: 'Navigate list' }, { key: 'Enter', label: 'Add item' },
    { key: 'Ctrl+1-6', label: t('paymentMethod') }, { key: 'F4', label: t('totalAmount') },
    { key: 'F9', label: t('recordSale') }, { key: 'Ctrl+Enter', label: t('recordSale') },
    { key: 'Ctrl+K', label: t('clear') }, { key: 'Esc', label: 'Back to search' },
    { key: '?', label: t('shortcuts') },
  ]

  const submitBtnColor = payMode === 'CASH' ? 'from-emerald-500 to-emerald-600 shadow-emerald-500/25'
    : payMode === 'NETWORK' ? 'from-blue-500 to-blue-600 shadow-blue-500/25'
    : payMode === 'SPLIT' ? 'from-orange-500 to-orange-600 shadow-orange-500/25'
    : payMode === 'TABBY' ? 'from-purple-500 to-purple-600 shadow-purple-500/25'
    : payMode === 'CREDIT' ? 'from-amber-500 to-amber-600 shadow-amber-500/25'
    : 'from-pink-500 to-pink-600 shadow-pink-500/25'

  return (
    <>
      {pendingWarranties.length > 0 && (
        <WarrantyNotification warranties={pendingWarranties} customerPhone={customerPhone || undefined} onDismiss={() => setPendingWarranties([])} />
      )}

      <div className="fixed inset-0 lg:relative lg:h-screen flex flex-col bg-[#f0f2f5] overflow-hidden z-[100] lg:z-auto" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* ── HEADER ── */}
        <header className="min-h-14 py-1 sm:py-0 bg-white border-b border-gray-200 px-2 sm:px-4 flex items-center justify-between shrink-0 z-20 gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
              <Receipt size={18} className="text-white" />
            </div>
            <div className="leading-none hidden sm:block">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">{t('pointOfSale')}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-gray-800 leading-none">{cashierName}</p>
                {activeShift && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Shift #{activeShift.id}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex justify-center min-w-0">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto no-scrollbar max-w-full">
            {([['pos', t('pos'), ShoppingCart], ['sales', t('activity'), History], ['credit', t('credit'), CreditCard]] as const).map(([tab, label, Icon]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-1.5 rounded-lg text-[9px] sm:text-[11px] font-black transition-all whitespace-nowrap',
                  activeTab === tab ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700')}>
                <Icon size={16} className="shrink-0" />
                <span className="leading-none">{label}</span>
                {tab === 'credit' && unpaidCreditSales.length > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-[16px] flex items-center justify-center">{unpaidCreditSales.length}</span>
                )}
              </button>
            ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('printer')}
            </div>
            <CloseShiftBtn
              triggerClassName="h-10 w-10 sm:h-9 sm:w-auto sm:px-3 rounded-xl text-[11px] font-black border bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center shadow-sm"
              triggerIcon={<LogOut size={18} className="sm:hidden" />}
            />
          </div>
        </header>

        {/* Shortcuts bar */}
        {showShortcuts && (
          <div className="bg-indigo-50/80 border-b border-indigo-100 px-4 py-1.5 flex flex-wrap gap-x-5 gap-y-0.5 shrink-0">
            {shortcuts.map(s => (
              <div key={s.key} className="flex items-center gap-1.5 text-[10px]">
                <kbd className="bg-white border border-indigo-200 rounded px-1 py-0.5 text-[9px] font-black text-indigo-700 font-mono shadow-sm">{s.key}</kbd>
                <span className="text-gray-500 font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── SALES TAB ── */}
        {activeTab === 'sales' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('dailyActivityLog')}</h2>
              {allTodaySales.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                  <Receipt size={28} className="mb-2" /><p className="text-xs font-medium">{t('noTransactionsToday')}</p>
                </div>
              ) : (
                <div className="space-y-6 pb-8">
                  {(() => {
                    // Grouping allTodaySales by shiftId
                    // Since allTodaySales is already sorted by createdAt desc, shift groups will naturally be in order
                    const groups: any[] = [];
                    let currentShiftId: number | null = -999;
                    let currentGroup: any = null;

                    allTodaySales.forEach((tx: any) => {
                      if (tx.shiftId !== currentShiftId) {
                        currentShiftId = tx.shiftId;
                        currentGroup = {
                          shift: tx.shift,
                          transactions: [],
                          totalAmount: 0
                        };
                        groups.push(currentGroup);
                      }
                      currentGroup.transactions.push(tx);
                      // Calculate total (Sales - Refunds)
                      currentGroup.totalAmount += (tx.type === 'SALE' ? tx.amount : -tx.amount);
                    });

                    return groups.map((group, gIdx) => {
                      const shiftId = group.shift?.id || -1;
                      const isCollapsed = group.shift?.status === 'CLOSED' && !collapsedShifts.includes(shiftId);
                      
                      return (
                        <div key={shiftId !== -1 ? shiftId : `no-shift-${gIdx}`} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          {/* ── Shift Header ── */}
                          <button 
                            onClick={() => {
                              if (collapsedShifts.includes(shiftId)) {
                                setCollapsedShifts(prev => prev.filter(id => id !== shiftId))
                              } else {
                                setCollapsedShifts(prev => [...prev, shiftId])
                              }
                            }}
                            className="w-full flex items-center justify-between px-1.5 py-1 hover:bg-gray-50/50 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", 
                                group.shift?.status === 'OPEN' ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                {group.shift ? `${t('shift')} #${group.shift.id}` : t('other')}
                              </span>
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter", 
                                group.shift?.status === 'OPEN' 
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                  : "bg-gray-100 text-gray-500 border border-gray-200")}>
                                {group.shift?.status === 'OPEN' ? t('shiftActive') : t('shiftClosed')}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black tabular-nums text-gray-600 bg-white shadow-sm border border-gray-100 px-2 py-0.5 rounded-lg">
                                  {group.totalAmount.toFixed(2)} <span className="text-[8px] opacity-60">SAR</span>
                                </span>
                              </div>
                              <div className="text-[9px] text-gray-400 font-bold hidden md:flex items-center gap-3">
                                {group.shift?.openedAt && (
                                  <div className="flex items-center gap-1">
                                    <span className="opacity-60">{t('openedAtLabel')}:</span>
                                    <span>{format(new Date(group.shift.openedAt), 'h:mm a')}</span>
                                  </div>
                                )}
                                {group.shift?.closedAt && (
                                  <div className="flex items-center gap-1">
                                    <span className="opacity-60">{t('closedAtLabel')}:</span>
                                    <span>{format(new Date(group.shift.closedAt), 'h:mm a')}</span>
                                  </div>
                                )}
                              </div>
                              {isCollapsed ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
                            </div>
                          </button>

                          {!isCollapsed && (
                            <div className={cn(
                              "bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300",
                              group.shift?.status === 'CLOSED' ? "opacity-90 bg-gray-50/30" : "ring-1 ring-blue-500/5 shadow-blue-500/5"
                            )}>
                              {group.transactions.map((tx: any) => {
                                const isExpanded = expandedTxId === tx.id
                                return (
                                  <div key={tx.id} className="border-b border-gray-100 last:border-b-0">
                                    {/* Row */}
                                    <button
                                      onClick={async () => {
                                        if (isExpanded) {
                                          setExpandedTxId(null); setExpandedDetails(null); return
                                        }
                                        setExpandedTxId(tx.id)
                                        if (tx.invoiceNumber) {
                                          setExpandedLoading(true); setExpandedDetails(null)
                                          try {
                                            const res = await getInvoiceDetails(tx.invoiceNumber)
                                            setExpandedDetails(res)
                                          } catch { setExpandedDetails(null) }
                                          finally { setExpandedLoading(false) }
                                        }
                                      }}
                                      className={cn('w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 transition-colors text-start',
                                        isExpanded && 'bg-gray-50')}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                                          tx.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                                          {tx.type === 'SALE' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-bold text-gray-900 truncate leading-tight">{tx.description || (tx.type === 'SALE' ? t('sale') : t('refund'))}</p>
                                          <p className="text-[10px] text-gray-400 font-bold font-mono mt-0.5">{tx.invoiceNumber || `#${tx.id}`} · {format(new Date(tx.createdAt), 'h:mm a')}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 shrink-0 ps-3">
                                        <div className="flex flex-col items-end gap-1">
                                          <div className="flex items-center gap-2">
                                            <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded-lg border tabular-nums',
                                              tx.method === 'CASH' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                              tx.method === 'NETWORK' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                              tx.method === 'CREDIT' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-gray-50 text-gray-600 border-gray-100'
                                            )}>{getPayMethodLabel(tx.method)}</span>
                                            <span className={cn('text-sm font-black tabular-nums', tx.type === 'RETURN' ? 'text-rose-600' : 'text-gray-900')}>
                                              {tx.type === 'RETURN' ? '-' : '+'}{tx.amount.toFixed(2)}
                                            </span>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                            {tx.settlementId && (
                                              <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-blue-100 flex items-center gap-0.5 uppercase tracking-tighter">
                                                <CheckCircle2 size={9} /> {t('settled')}
                                              </span>
                                            )}
                                            {tx.isSettled && !tx.settlementId && (
                                              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                            )}
                                          </div>
                                        </div>
                                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-300" />}
                                      </div>
                                    </button>

                                    {/* Expanded inline detail */}
                                    {isExpanded && (
                                      <div className="bg-gray-50/50 border-t border-gray-100 px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {expandedLoading ? (
                                          <div className="flex items-center justify-center py-8 gap-3 text-gray-400">
                                            <Loader2 size={18} className="animate-spin text-blue-500" />
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-70">Loading Details...</span>
                                          </div>
                                        ) : expandedDetails ? (
                                          <>
                                            {/* Meta row */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                              <div className="bg-white rounded-xl border border-gray-200 p-2.5 shadow-sm">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Invoice</span>
                                                <p className="font-mono font-bold text-gray-800 text-xs mt-0.5">{expandedDetails.invoiceNumber}</p>
                                              </div>
                                              <div className="bg-white rounded-xl border border-gray-200 p-2.5 shadow-sm">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</span>
                                                <p className="font-bold text-gray-800 text-[11px] mt-0.5">{format(new Date(expandedDetails.createdAt), 'MMM dd, h:mm a')}</p>
                                              </div>
                                              <div className="bg-white rounded-xl border border-gray-200 p-2.5 shadow-sm col-span-2 sm:col-span-1">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cashier</span>
                                                <p className="font-bold text-gray-800 text-[11px] mt-0.5">{expandedDetails.salesperson}</p>
                                              </div>
                                            </div>

                                            {/* Items */}
                                            {expandedDetails.items && expandedDetails.items.length > 0 && (
                                              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                                <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-100">
                                                  <Package size={12} className="text-gray-400" />
                                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('items')}</span>
                                                </div>
                                                <div className="divide-y divide-gray-50">
                                                  {expandedDetails.items.map((item: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50/50 transition-colors">
                                                      <div className="flex items-center gap-3 min-w-0">
                                                        <span className="w-5 h-5 rounded-lg bg-gray-100 text-gray-400 text-[10px] font-black flex items-center justify-center shrink-0">{i+1}</span>
                                                        <div className="min-w-0">
                                                          <p className="text-xs font-bold text-gray-800 truncate leading-tight">{item.name}</p>
                                                          {item.sku && <p className="text-[9px] text-gray-400 font-bold font-mono mt-0.5">{item.sku}</p>}
                                                        </div>
                                                      </div>
                                                      <div className="text-end shrink-0 ps-4">
                                                        <span className="text-xs font-black text-gray-900 tabular-nums">{item.quantitySold}</span>
                                                        <span className="text-[10px] text-gray-400 font-bold ms-1">{item.unit}</span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Total with VAT */}
                                            <div className="bg-gray-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-gray-900/10">
                                              <div className="flex items-center gap-6 text-[10px] w-full sm:w-auto border-b sm:border-b-0 sm:border-e border-white/10 pb-3 sm:pb-0 sm:pe-6">
                                                <div className="flex-1 sm:flex-none">
                                                  <span className="text-gray-500 font-black uppercase tracking-widest opacity-80">Excl. VAT</span>
                                                  <p className="font-bold tabular-nums text-gray-300 text-sm mt-0.5">{(expandedDetails.totalAmount / 1.15).toFixed(2)}</p>
                                                </div>
                                                <div className="flex-1 sm:flex-none">
                                                  <span className="text-amber-500 font-black uppercase tracking-widest opacity-80">VAT 15%</span>
                                                  <p className="font-bold tabular-nums text-amber-400 text-sm mt-0.5">{(expandedDetails.totalAmount - expandedDetails.totalAmount / 1.15).toFixed(2)}</p>
                                                </div>
                                              </div>
                                              <div className="text-center sm:text-end w-full sm:w-auto">
                                                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Total Amount</span>
                                                <p className="text-2xl font-black tabular-nums text-emerald-400 leading-none mt-1">{expandedDetails.totalAmount.toFixed(2)} <span className="text-xs font-bold opacity-60 ms-1 uppercase">SAR</span></p>
                                              </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col sm:flex-row gap-2">
                                              {printerStatus === 'connected' && (
                                                <button
                                                  type="button"
                                                  disabled={isPrinting}
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    printReceipt({
                                                      invoiceNumber: expandedDetails.invoiceNumber,
                                                      createdAt: new Date(expandedDetails.createdAt),
                                                      cashierName: expandedDetails.salesperson || cashierName,
                                                      items: (expandedDetails.items || []).map((item: any) => ({
                                                        name: item.name,
                                                        quantity: item.quantitySold,
                                                        price: item.price || 0,
                                                        unit: item.unit,
                                                      })),
                                                      totalAmount: expandedDetails.totalAmount,
                                                      paymentMethod: expandedDetails.transactions?.[0]?.method || 'CASH',
                                                    })
                                                  }}
                                                  className="flex-1 flex items-center justify-center gap-2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50"
                                                >
                                                  <Printer size={16} />
                                                  {isPrinting ? 'Printing...' : 'Reprint Receipt'}
                                                </button>
                                              )}
                                              
                                              {expandedDetails.description && (
                                                <div className="flex-[2] bg-amber-50 rounded-xl border border-amber-100 px-3 py-2 flex gap-2 items-start">
                                                  <Tag size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                                  <div>
                                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Notes</p>
                                                    <p className="text-[11px] text-gray-700 font-medium leading-tight">"{expandedDetails.description}"</p>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </>
                                        ) : (
                                          <div className="text-center py-8">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No detailed info available</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CREDIT TAB ── */}
        {activeTab === 'credit' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('unpaidCredit')}</h2>
              <CreditCollectionPanel sales={unpaidCreditSales} />
            </div>
          </div>
        )}

        {/* ── POS TAB ── */}
        {activeTab === 'pos' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

            {/* LEFT PANEL — Product Browser */}
            <div className={cn(
              "w-full lg:w-[400px] lg:shrink-0 flex flex-col bg-white lg:border-e border-gray-200 transition-all duration-300",
              mobilePosView === 'cart' ? 'hidden lg:flex' : 'flex'
            )}>
              {/* Search */}
              <div className="px-3 py-2.5 border-b border-gray-100">
                <div className="relative">
                  <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input ref={searchRef} type="text" autoFocus
                    placeholder={t('searchItemNameOrSku')}
                    value={search}
                    onChange={e => { setSearch(e.target.value); setFocusedIdx(-1) }}
                    onKeyDown={e => {
                      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, filteredItems.length - 1)) }
                      if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, -1)) }
                      if (e.key === 'Enter' && focusedIdx >= 0) { e.preventDefault(); addToCart(filteredItems[focusedIdx]) }
                    }}
                    className="w-full h-9 ps-8 pe-7 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 text-sm font-medium placeholder-gray-400 transition-all"
                  />
                  {search && (
                    <button onClick={() => { setSearch(''); setFocusedIdx(-1); searchRef.current?.focus() }}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1 px-0.5">
                  <p className="text-[9px] text-gray-400 font-medium">{filteredItems.length} {t('items')}</p>
                  {cart.length > 0 && <p className="text-[9px] font-bold text-emerald-600">{cart.reduce((s,c)=>s+c.quantity,0)} {t('inCart')}</p>}
                </div>
              </div>

              {/* Column headers */}
              <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <span className="flex-1">{t('items')}</span>
                <span className="w-16 text-center">{t('stock') || 'Stock'}</span>
                <span className="w-20 text-end">{t('price') || 'Price'}</span>
              </div>

              {/* Item list */}
              <div ref={itemListRef} className="flex-1 overflow-y-auto p-2 lg:p-0">
                {filteredItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                    <Package size={24} className="mb-1.5" /><p className="text-[10px] font-medium">{t('noItemFound')}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-0">
                  {filteredItems.map((item, idx) => {
                    const oos = item.currentStock <= 0
                    const low = !oos && item.currentStock <= item.reorderLevel
                    const inCart = cart.find(c => c.itemId === item.id)
                    const isFocused = idx === focusedIdx
                    return (
                      <button key={item.id} onClick={() => { addToCart(item); setFocusedIdx(idx) }}
                        disabled={oos}
                        className={cn(
                          'relative flex flex-col lg:flex-row lg:items-center p-4 lg:px-3 lg:py-[7px] text-start transition-all rounded-2xl lg:rounded-none border lg:border-0 lg:border-b border-gray-200 lg:border-gray-50 shadow-sm lg:shadow-none mb-1 lg:mb-0',
                          oos ? 'opacity-35 cursor-not-allowed bg-gray-50' :
                          isFocused ? 'bg-blue-50 border-blue-300 lg:border-s-[3px] lg:border-s-blue-500' :
                          inCart ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white hover:bg-gray-50 active:bg-gray-100'
                        )}>
                        <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-2">
                          <div className="flex items-center justify-between lg:justify-start gap-2">
                            {inCart ? (
                              <span className="w-6 h-6 lg:w-5 lg:h-5 rounded-lg bg-emerald-500 text-white text-[10px] lg:text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm">{inCart.quantity}</span>
                            ) : (
                              <span className="w-6 h-6 lg:w-5 lg:h-5 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center shrink-0"><Package size={12} /></span>
                            )}
                            <div className="lg:hidden text-end">
                              <span className="text-sm font-black text-gray-900">{item.sellingPrice.toFixed(0)} <span className="text-[10px] text-gray-400">{t('sar')}</span></span>
                            </div>
                          </div>
                          <div className="min-w-0 mt-1 lg:mt-0">
                            <p className={cn('text-sm lg:text-[13px] font-bold lg:font-semibold truncate leading-tight', inCart || isFocused ? 'text-blue-700' : 'text-gray-800')}>{item.name}</p>
                            {item.sku && <p className="text-[10px] lg:text-[9px] text-gray-400 font-mono mt-0.5">{item.sku}</p>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between lg:justify-end gap-3 mt-2 lg:mt-0">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                            oos ? 'bg-red-100 text-red-600' : low ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600')}>
                            {oos ? t('outOfStock') : `${item.currentStock} ${t('units') || ''}`}
                          </span>
                          <span className="hidden lg:block w-20 text-end text-[13px] font-bold text-gray-800 tabular-nums shrink-0">
                            {item.sellingPrice.toFixed(0)} <span className="text-[9px] text-gray-400">{t('sar')}</span>
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mobile Cart Toggle Footer */}
              {cart.length > 0 && (
                <div className="lg:hidden sticky bottom-0 p-4 bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] z-30">
                  <button
                    onClick={() => setMobilePosView('cart')}
                    className="w-full h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-between px-6 shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center relative">
                        <ShoppingCart size={22} />
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                          {cart.reduce((s,c)=>s+c.quantity,0)}
                        </span>
                      </div>
                      <span className="font-black text-sm uppercase tracking-widest">{t('reviewOrder') || 'Review Order'}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">{t('total')}</p>
                      <p className="text-xl font-black">{finalTotal.toFixed(2)} SAR</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT PANEL — Cart + Payment */}
            <div className={cn(
              "flex-1 flex flex-col bg-[#f8f9fb] transition-all duration-300",
              mobilePosView === 'items' ? 'hidden lg:flex' : 'flex'
            )}>
              {/* Mobile Back Button */}
              <div className="lg:hidden bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => setMobilePosView('items')} className="flex items-center gap-2 text-gray-600 font-bold">
                  <ArrowLeft size={18} />
                  <span>{t('backToItems') || 'Add More Items'}</span>
                </button>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-black uppercase">{t('total')}</p>
                  <p className="text-lg font-black text-emerald-600">{finalTotal.toFixed(2)} SAR</p>
                </div>
              </div>
              {/* Cart header */}
              <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={13} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('currentOrder')}</span>
                  {cart.length > 0 && (
                    <span className="bg-emerald-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{cart.reduce((s,c)=>s+c.quantity,0)}</span>
                  )}
                </div>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-[9px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-wider">
                    {t('clear')}
                  </button>
                )}
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto bg-[#f8f9fb]">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                    <ShoppingCart size={32} className="mb-2 opacity-30" />
                    <p className="text-xs font-medium">{t('noItemsAddedYet')}</p>
                    <p className="text-[10px] text-gray-300 mt-1">/ {t('or')} F2 → {t('search')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {cart.map(item => (
                      <div key={item.itemId} className="bg-white px-3 py-2.5 flex items-center gap-2">
                        <button onClick={() => removeFromCart(item.itemId)} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors p-0.5">
                          <Trash2 size={12} />
                        </button>
                        <p className="text-[13px] font-semibold text-gray-800 truncate flex-1 min-w-0">{item.name}</p>
                        {/* Qty */}
                        <div className="flex items-center bg-gray-50 rounded-md border border-gray-200 h-8 shrink-0">
                          <button onClick={() => setQty(item.itemId, item.quantity - 1)} className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors rounded-s-md"><Minus size={10} strokeWidth={3} /></button>
                          <input type="number" min="0" value={item.quantity === 0 ? '' : item.quantity} onChange={e => setQty(item.itemId, parseInt(e.target.value) || 0)} className="w-8 h-full text-center text-xs font-black tabular-nums bg-transparent border-none outline-none text-gray-900 p-0" />
                          <button onClick={() => setQty(item.itemId, item.quantity + 1)} className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors rounded-e-md"><Plus size={10} strokeWidth={3} /></button>
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold shrink-0">×</span>
                        {/* Price */}
                        <div className="flex items-center bg-gray-50 rounded-md border border-gray-200 h-7 w-20 shrink-0 px-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                          <input type="number" step="0.01" min="0" value={item.price === 0 ? '' : item.price} onChange={e => updatePrice(item.itemId, parseFloat(e.target.value) || 0)} className="w-full text-[11px] font-bold tabular-nums text-end bg-transparent border-none outline-none text-gray-900 h-full p-0" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 tabular-nums shrink-0 w-12 sm:w-16 text-end">
                          {(item.quantity * item.price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PAYMENT SECTION */}
              <div className="shrink-0 bg-white border-t border-gray-200 p-3 space-y-2.5 z-10">

                {/* Subtotal + Discount */}
                {cart.length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center justify-between flex-1">
                      <span className="font-bold text-gray-400 uppercase text-[10px]">{t('subtotal')}</span>
                      <span className="font-black text-gray-800 tabular-nums">{cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 rounded-md border border-gray-200 h-7 px-2 w-28">
                      <Percent size={10} className="text-gray-400 shrink-0" />
                      <input type="number" step="0.5" min="0" max="100" placeholder="0" value={discountPct} onChange={e => setDiscountPct(e.target.value)} className="flex-1 text-[11px] font-bold tabular-nums bg-transparent border-none outline-none text-gray-900 h-full p-0 text-end" />
                      <span className="text-[8px] font-bold text-gray-400 shrink-0">%</span>
                    </div>
                    {parseFloat(discountPct) > 0 && (
                      <span className="text-[10px] font-black text-rose-500 tabular-nums shrink-0">-{discountAmt.toFixed(2)}</span>
                    )}
                  </div>
                )}

                {/* Payment method pill bar */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {PAY_METHODS.map(({ mode, label, shortcut, icon: Icon, active }) => {
                    const isActive = payMode === mode
                    return (
                      <button key={mode} type="button" onClick={() => setPayMode(mode)}
                        className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all whitespace-nowrap shrink-0',
                          isActive ? active + ' border-current' : 'border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600')}>
                        <Icon size={isActive ? 14 : 12} className="shrink-0" />
                        <span className="text-[11px] font-bold uppercase">{getPayMethodLabel(mode)}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Total amount input */}
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">{t('sar')}</span>
                  <Input ref={amountRef} type="number" step="0.01" min="0" placeholder="0.00"
                    value={totalOverride !== '' ? totalOverride : finalTotal > 0 ? finalTotal.toFixed(2) : ''}
                    onChange={e => setTotalOverride(e.target.value)}
                    className="h-12 ps-12 pe-10 text-xl font-black rounded-lg border-gray-200 focus:border-emerald-500 tabular-nums bg-gray-50 focus:bg-white" />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-300 pointer-events-none">F4</span>
                </div>

                {/* Split amounts */}
                {payMode === 'SPLIT' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] font-black uppercase text-emerald-600 mb-0.5">{t('cash')}</p>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" value={cashAmt} onChange={e => handleCashAmtChange(e.target.value)} className="h-8 rounded-lg text-sm font-bold border-emerald-200 focus:border-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-blue-600 mb-0.5">{t('network')}</p>
                      <Input readOnly value={netAmt} className="h-8 rounded-lg text-sm font-bold border-blue-100 bg-blue-50 text-blue-700" />
                    </div>
                  </div>
                )}

                {/* Customer */}
                <Popover open={customerComboOpen} onOpenChange={v => { setCustomerComboOpen(v); if (!v) { setQuickAddMode(false); setQuickAddPhone('') } }}>
                  <PopoverTrigger render={
                    <button className={cn('flex w-full items-center justify-between h-9 rounded-lg border px-3 text-xs font-semibold transition-colors',
                      customerId ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100')}>
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className={customerId ? 'text-amber-500' : 'text-gray-300'} />
                        <span className="truncate">{customerId ? (customerList.find(c=>c.id===customerId)?.name||customerName) : `${t('customer')}${payMode==='CREDIT'?' *':''}`}</span>
                      </div>
                      <ChevronsUpDown size={11} className="opacity-40 shrink-0" />
                    </button>
                  } />
                  <PopoverContent className="w-[280px] p-0 rounded-xl shadow-2xl border-none overflow-hidden">
                    {quickAddMode ? (
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => { setQuickAddMode(false); setQuickAddPhone('') }} className="p-1 rounded-md hover:bg-gray-100 text-gray-400"><ArrowLeft size={12} /></button>
                          <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 flex items-center gap-1"><UserPlus size={12} /> {t('newCustomer')}</span>
                        </div>
                        <Input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder={t('staffName')} className="h-8 rounded-lg font-bold text-sm" autoFocus />
                        <Input value={quickAddPhone} onChange={e=>setQuickAddPhone(e.target.value)} placeholder="05xxxxxxxx" className="h-8 rounded-lg font-bold text-sm" />
                        <button type="button" disabled={!customerSearch.trim()||quickAddSaving}
                          onClick={async () => {
                            if (!customerSearch.trim()) return
                            setQuickAddSaving(true)
                            try {
                              const nc = await createCustomer({ name: customerSearch.trim(), phone: quickAddPhone.trim()||undefined })
                              setCustomerList(prev=>[...prev,{id:nc.id,name:nc.name,phone:nc.phone}].sort((a,b)=>a.name.localeCompare(b.name)))
                              setCustomerId(nc.id); setCustomerName(nc.name); setCustomerPhone(nc.phone||'')
                              setCustomerComboOpen(false); setQuickAddMode(false); setQuickAddPhone('')
                              toast.success(t('customerAdded') + ': ' + nc.name)
                            } catch { toast.error(t('failedToAddCustomer')) } finally { setQuickAddSaving(false) }
                          }}
                          className="w-full h-8 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black text-[10px] uppercase tracking-wide transition flex items-center justify-center gap-1.5">
                          {quickAddSaving ? '...' : <><UserPlus size={12} /> {t('saveAndSelect')}</>}
                        </button>
                      </div>
                    ) : (
                      <Command>
                        <CommandInput placeholder={t('searchCustomer')} className="h-9" value={customerSearch} onValueChange={setCustomerSearch} />
                        <CommandList className="max-h-[200px]">
                          <CommandGroup>
                            {customerId!==null && (
                              <CommandItem value="__clear__" onSelect={() => { setCustomerId(null); setCustomerName(''); setCustomerPhone(''); setCustomerComboOpen(false) }}
                                className="py-2 px-3 cursor-pointer text-gray-400 italic text-xs">
                                <Check className="mr-2 h-3.5 w-3.5 opacity-0" /> {t('walkinCustomer')}</CommandItem>
                            )}
                            {customerList.map(c => (
                              <CommandItem key={c.id} value={`${c.name} ${c.phone||''}`}
                                onSelect={() => { setCustomerId(c.id); setCustomerName(c.name); setCustomerPhone(c.phone||''); setCustomerSearch(''); setCustomerComboOpen(false) }}
                                className="py-2 px-3 cursor-pointer hover:bg-amber-50">
                                <Check className={cn('mr-2 h-3.5 w-3.5 text-amber-600', customerId===c.id?'opacity-100':'opacity-0')} />
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{c.name}</span>
                                  {c.phone && <span className="text-[9px] text-gray-400">{c.phone}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          {customerSearch.trim().length > 0 && (
                            <CommandGroup>
                              <CommandItem value={`__add__${customerSearch}`} onSelect={() => setQuickAddMode(true)}
                                className="py-2 px-3 cursor-pointer hover:bg-violet-50 text-violet-600 font-bold text-sm">
                                <UserPlus size={12} className="mr-2 shrink-0" /> {t('add')} &ldquo;{customerSearch}&rdquo;
                              </CommandItem>
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    )}
                  </PopoverContent>
                </Popover>

                {payMode === 'CREDIT' && !customerId && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder={t('customerName') + ' *'} value={customerName} onChange={e=>setCustomerName(e.target.value)} className="h-8 rounded-lg text-sm border-amber-200 focus:border-amber-500" />
                    <Input placeholder={t('placeholderPhone') + ' *'} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} className="h-8 rounded-lg text-sm border-amber-200 focus:border-amber-500" />
                  </div>
                )}
                {payMode === 'CREDIT' && (
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] font-black uppercase text-amber-500 shrink-0">{t('dueDate')}</p>
                    <Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="h-8 rounded-lg text-sm border-amber-200 flex-1" />
                  </div>
                )}

                {/* Description */}
                <Input placeholder={t('descriptionOptional')} value={description} onChange={e=>setDescription(e.target.value)} className="h-8 rounded-lg text-xs border-gray-200 bg-gray-50" />

                {/* Submit */}
                <button onClick={handleSubmit} disabled={loading || cart.length === 0}
                  className={cn('w-full h-11 rounded-xl font-black text-sm text-white uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed',
                    `bg-gradient-to-r ${submitBtnColor}`)}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('processing')}</>
                    : <><Check size={16} strokeWidth={3} /> {t('recordSale')} · {finalTotal.toFixed(2)} {t('sar')} <span className="opacity-60 ms-1 text-[10px]">(F9)</span></>
                  }
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  )
}
