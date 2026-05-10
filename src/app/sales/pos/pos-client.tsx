'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/providers/language-provider'
import { usePrinter } from '@/providers/printer-provider'
import { useStore, Transaction } from '@/store/useStore'
import { recordDailySales } from '@/actions/transactions'
import { createCustomer } from '@/actions/customers'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Banknote, Wifi,
  SplitSquareHorizontal, ShoppingBag, Users, Check, UserPlus, ArrowLeft,
  CheckCircle2, Package, ChevronsUpDown, X, History, CreditCard,
  ArrowUpRight, ArrowDownLeft, Percent, Tag, Keyboard
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CloseShiftBtn } from '@/components/close-shift-btn'
import { CreditCollectionPanel } from '@/components/credit-collection-panel'
import { ViewInvoiceModal } from '@/components/view-invoice-modal'
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
  allTodaySales, unpaidCreditSales,
}: PosClientProps) {
  const { t, locale } = useLanguage()
  const isRTL = locale === 'ar'
  const router = useRouter()
  const { print: printReceipt, status: printerStatus } = usePrinter()

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Tabs ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos')
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Item search + keyboard nav ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Cart ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Payment ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Customer ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Submit ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Global keyboard shortcuts ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  const submitRef = useRef(handleSubmit)
  submitRef.current = handleSubmit

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      // / or F2 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ focus search (when not in any input)
      if ((e.key === '/' || e.key === 'F2') && !inInput && activeTab === 'pos') {
        e.preventDefault(); searchRef.current?.focus(); setFocusedIdx(-1); return
      }
      // Escape ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ blur back to search
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur()
        setSearch(''); setFocusedIdx(-1)
        setTimeout(() => searchRef.current?.focus(), 50)
        return
      }
      // Arrow nav in search / item list
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
      // Enter ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ add focused item
      if (e.key === 'Enter' && focusedIdx >= 0 && !inInput && activeTab === 'pos') {
        e.preventDefault()
        const item = filteredItems[focusedIdx]
        if (item) addToCart(item)
        return
      }
      // Ctrl+1-6 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ payment method
      if (e.ctrlKey && ['1','2','3','4','5','6'].includes(e.key) && activeTab === 'pos') {
        e.preventDefault()
        const modes: PayMode[] = ['CASH','NETWORK','SPLIT','TABBY','TAMARA','CREDIT']
        setPayMode(modes[parseInt(e.key) - 1])
        return
      }
      // F4 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ focus amount field
      if (e.key === 'F4' && activeTab === 'pos') {
        e.preventDefault(); amountRef.current?.focus(); return
      }
      // F9 or Ctrl+Enter ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ submit
      if ((e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) && activeTab === 'pos') {
        e.preventDefault(); submitRef.current(); return
      }
      // Ctrl+K ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ clear cart
      if (e.ctrlKey && e.key === 'k' && activeTab === 'pos') {
        e.preventDefault(); setCart([]); return
      }
      // ? ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ toggle shortcuts panel
      if (e.key === '?' && !inInput) {
        e.preventDefault(); setShowShortcuts(v => !v); return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, focusedIdx, filteredItems, addToCart])

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIdx >= 0 && itemListRef.current) {
      const el = itemListRef.current.children[focusedIdx] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIdx])

  
  const getPayMethodLabel = (mode: PayMode) => {
    const map = {
      CASH: t('cash'), NETWORK: t('network'), SPLIT: t('splitPayment'),
      TABBY: t('tabby'), TAMARA: t('tamara'), CREDIT: t('credit'),
    }
    return map[mode]
  }

  const shortcuts = [
    { key: '/', label: 'Focus search' },
    { key: 'F2', label: 'Focus search' },
    { key: '\u2191 \u2193', label: 'Navigate list' },
    { key: 'Enter', label: 'Add item' },
    { key: 'Ctrl+1-6', label: t('paymentMethod') },
    { key: 'F4', label: t('totalAmount') },
    { key: 'F9', label: t('recordSale') },
    { key: 'Ctrl+Enter', label: t('recordSale') },
    { key: 'Ctrl+K', label: t('clear') },
    { key: 'Esc', label: 'Back to search' },
    { key: '?', label: t('shortcuts') },
  ]
  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Render ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  return (
    <>
      {pendingWarranties.length > 0 && (
        <WarrantyNotification warranties={pendingWarranties} customerPhone={customerPhone || undefined} onDismiss={() => setPendingWarranties([])} />
      )}
      <ViewInvoiceModal invoiceNumber={selectedInvoice} open={!!selectedInvoice} onOpenChange={o => !o && setSelectedInvoice(null)} />

      <div className="h-screen flex flex-col bg-slate-50 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ HEADER ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
              <Receipt size={16} className="text-white" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pointOfSale')}</p>
              <p className="text-sm font-black text-gray-900">{cashierName}</p>
            </div>
            <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1" />
            <p className="hidden sm:block text-xs font-semibold text-gray-400">{format(new Date(), 'EEE, MMM d')}</p>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {([['pos', t('pos'), ShoppingCart], ['sales', t('today'), History], ['credit', t('credit'), CreditCard]] as const).map(([tab, label, Icon]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/60' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50')}>
                <Icon size={13} />{label}
                {tab === 'credit' && unpaidCreditSales.length > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{unpaidCreditSales.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowShortcuts(v => !v)} title="Keyboard shortcuts (?)"
              className={cn('hidden sm:flex items-center gap-1 h-8 px-2.5 rounded-lg border text-xs font-bold transition-colors',
                showShortcuts ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100')}>
              <Keyboard size={13} /> <span className="hidden lg:inline">{t('shortcuts')}</span>
            </button>
            <div className={cn('hidden md:flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full',
              printerStatus === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
              <div className={cn('w-1.5 h-1.5 rounded-full', printerStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300')} />
              {printerStatus === 'connected' ? t('printer') : t('offline')}
            </div>
            <CloseShiftBtn
              triggerClassName={cn('h-8 px-3 rounded-lg text-xs font-semibold border',
                hasUnsettled ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100')}
              cashTotal={unsettledCash} networkTotal={unsettledNetwork}
              tabbyTotal={unsettledTabby} tamaraTotal={unsettledTamara}
            />
          </div>
        </header>

        {showShortcuts && (
          <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-2.5 flex flex-wrap gap-x-6 gap-y-1 shrink-0">
            {shortcuts.map(s => (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                <kbd className="bg-white border border-indigo-200 rounded px-1.5 py-0.5 text-[10px] font-black text-indigo-700 font-mono shadow-sm whitespace-nowrap">{s.key}</kbd>
                <span className="text-gray-600 font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('todaysTransactions')}</h2>
              {allTodaySales.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 text-gray-200">
                  <Receipt size={32} className="mb-2" /><p className="text-xs font-semibold">{t('noTransactionsToday')}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                  {allTodaySales.map((tx: any) => (
                    <div key={tx.id} onClick={() => tx.invoiceNumber && setSelectedInvoice(tx.invoiceNumber)}
                      className={cn('flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors', tx.invoiceNumber && 'cursor-pointer')}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                          tx.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                          {tx.type === 'SALE' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{tx.description || (tx.type === 'SALE' ? t('sale') : t('refund'))}</p>
                          <p className="text-xs text-gray-400 font-mono">{tx.invoiceNumber || `#${tx.id}`} · {format(new Date(tx.createdAt), 'h:mm a')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ps-3">
                        <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded-full',
                          tx.method === 'CASH' ? 'bg-emerald-100 text-emerald-700' :
                          tx.method === 'NETWORK' ? 'bg-blue-100 text-blue-700' :
                          tx.method === 'CREDIT' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        )}>{tx.method}</span>
                        <span className={cn('text-sm font-black tabular-nums', tx.type === 'RETURN' ? 'text-rose-600' : 'text-gray-900')}>
                          {tx.type === 'RETURN' ? '-' : '+'}{tx.amount.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">{t('sar')}</span>
                        </span>
                        {tx.isSettled && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'credit' && (
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('unpaidCredit')}</h2>
              <CreditCollectionPanel sales={unpaidCreditSales} />
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="flex-1 flex justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 sm:p-3 lg:p-5">
            <div className="flex w-full max-w-[1100px] bg-white sm:rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden border border-gray-200/80">

              {/* LEFT: Item Search */}
              <div className="w-[400px] shrink-0 flex flex-col bg-white border-e border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100/80 bg-white">
                  <div className="relative">
                    <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchRef} type="text" autoFocus
                      placeholder={t('searchItemNameOrSku')}
                      value={search}
                      onChange={e => { setSearch(e.target.value); setFocusedIdx(-1) }}
                      onKeyDown={e => {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, filteredItems.length - 1)) }
                        if (e.key === 'ArrowUp')   { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, -1)) }
                        if (e.key === 'Enter' && focusedIdx >= 0) { e.preventDefault(); addToCart(filteredItems[focusedIdx]) }
                      }}
                      className="w-full h-10 ps-9 pe-8 rounded-xl border border-gray-200 bg-gray-50/80 focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 text-sm font-medium placeholder-gray-400 transition-all"
                    />
                    {search && (
                      <button onClick={() => { setSearch(''); setFocusedIdx(-1); searchRef.current?.focus() }}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1.5 px-0.5">
                    <p className="text-[10px] text-gray-400 font-medium">{filteredItems.length} {t('items')}</p>
                    {cart.length > 0 && <p className="text-[10px] font-bold text-emerald-600">{cart.reduce((s,c)=>s+c.quantity,0)} {t('inCart')} · {cartSubtotal.toFixed(2)} {t('sar')}</p>}
                  </div>
                </div>

                <div ref={itemListRef} className="flex-1 overflow-y-auto">
                  {filteredItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-200">
                      <Package size={28} className="mb-2" /><p className="text-xs font-medium">{t('noItemFound')}</p>
                    </div>
                  )}
                  {filteredItems.map((item, idx) => {
                    const oos = item.currentStock <= 0
                    const low = !oos && item.currentStock <= item.reorderLevel
                    const inCart = cart.find(c => c.itemId === item.id)
                    const isFocused = idx === focusedIdx
                    return (
                      <button key={item.id} onClick={() => { addToCart(item); setFocusedIdx(idx) }}
                        disabled={oos}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-b border-gray-50/80',
                          oos ? 'opacity-40 cursor-not-allowed' :
                          isFocused ? 'bg-emerald-100 ring-2 ring-inset ring-emerald-400' :
                          inCart ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-gray-50 active:bg-gray-100'
                        )}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black transition-colors',
                            isFocused ? 'bg-emerald-500 text-white' :
                            inCart ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400')}>
                            {inCart ? inCart.quantity : <Package size={14} />}
                          </div>
                          <div className="min-w-0">
                            <p className={cn('text-sm font-semibold truncate', inCart || isFocused ? 'text-emerald-700' : 'text-gray-900')}>{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.sku && <span className="text-[10px] text-gray-400 font-mono">{item.sku}</span>}
                              <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full',
                                oos ? 'bg-red-100 text-red-600' : low ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600')}>
                                {oos ? t('outOfStock') : `${item.currentStock} ${item.unit}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-black text-gray-800 tabular-nums shrink-0 ps-3">
                          {item.sellingPrice.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">{t('sar')}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* RIGHT: CART + PAYMENT */}
              <div className="flex-1 flex flex-col bg-slate-50/60 overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={14} className="text-gray-500" />
                      <span className="text-sm font-black text-gray-800">{t('currentOrder')}</span>
                      {cart.length > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                          {cart.reduce((s,c)=>s+c.quantity,0)}
                        </span>
                      )}
                    </div>
                    {cart.length > 0 && (
                      <button onClick={() => setCart([])} className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase">
                        {t('clear')} (Ctrl+K)
                      </button>
                    )}
                  </div>


{cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-200">
                    <ShoppingCart size={28} className="mb-2" />
                    <p className="text-xs font-semibold">{t('noItemsAddedYet')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 bg-white">
                    {cart.map(item => (
                      <div key={item.itemId} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-gray-900 leading-tight flex-1 min-w-0 truncate">{item.name}</p>
                          <button onClick={() => removeFromCart(item.itemId)} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Qty edit */}
                          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden h-8 w-24">
                            <button onClick={() => setQty(item.itemId, item.quantity - 1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"><Minus size={12} strokeWidth={3} /></button>
                            <input type="number" min="0" value={item.quantity === 0 ? '' : item.quantity} onChange={e => setQty(item.itemId, parseInt(e.target.value) || 0)} className="w-8 h-full text-center text-xs font-black tabular-nums bg-transparent border-none outline-none text-gray-900 p-0" />
                            <button onClick={() => setQty(item.itemId, item.quantity + 1)} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"><Plus size={12} strokeWidth={3} /></button>
                          </div>
                          <span className="text-xs text-gray-400 font-bold mx-1">×</span>
                          {/* Price edit */}
                          <div className="flex items-center flex-1 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden h-8 px-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                            <Tag size={10} className="text-gray-400 shrink-0" />
                            <input type="number" step="0.01" min="0" value={item.price === 0 ? '' : item.price} onChange={e => updatePrice(item.itemId, parseFloat(e.target.value) || 0)} className="w-full text-sm font-bold tabular-nums text-right bg-transparent border-none outline-none px-1 text-gray-900 h-full" />
                            <span className="text-[10px] font-bold text-gray-400 shrink-0">SAR</span>
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-gray-500 text-right mt-1.5 tabular-nums">
                          = {(item.quantity * item.price).toFixed(2)} SAR
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Section */}
              <div className="shrink-0 bg-white border-t border-gray-100 p-4 space-y-3 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.03)]">
                
                {/* Subtotal & Discount */}
                {cart.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">{t('subtotal')}</span>
                      <span className="text-sm font-black text-gray-900 tabular-nums">{cartSubtotal.toFixed(2)} {t('sar')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Percent size={14} className="text-gray-400 shrink-0" />
                      <input type="number" step="0.5" min="0" max="100" placeholder="0" value={discountPct} onChange={e => setDiscountPct(e.target.value)} className="flex-1 text-sm font-bold tabular-nums bg-white border border-gray-200 rounded-md px-2 py-1 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-900" />
                      <span className="text-[10px] font-bold text-gray-400 shrink-0 uppercase">{t('discountPercent')}</span>
                    </div>
                    {parseFloat(discountPct) > 0 && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-bold text-rose-500 uppercase">{t('discountAmt')}</span>
                        <span className="text-xs font-black text-rose-500 tabular-nums">-{discountAmt.toFixed(2)} {t('sar')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Method */}
                <div className="grid grid-cols-3 gap-2">
                  {PAY_METHODS.map(({ mode, label, shortcut, icon: Icon, active }) => {
                    const isActive = payMode === mode
                    return (
                      <button key={mode} type="button" onClick={() => setPayMode(mode)}
                        className={cn('flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all relative',
                          isActive ? active : 'border-gray-100 text-gray-400 bg-gray-50 hover:bg-gray-100')}>
                        <Icon size={14} />
                        <span className="text-[10px] font-black uppercase tracking-tight">{getPayMethodLabel(mode)}</span>
                        <span className={cn("text-[8px] font-bold opacity-60 absolute bottom-1 right-1.5", isActive ? 'text-inherit' : 'text-gray-400')}>{shortcut}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Final Amount input */}
                <div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">{t('sar')}</span>
                    <Input ref={amountRef} type="number" step="0.01" min="0" placeholder="0.00"
                      value={totalOverride !== '' ? totalOverride : finalTotal > 0 ? finalTotal.toFixed(2) : ''}
                      onChange={e => setTotalOverride(e.target.value)}
                      className="h-14 pl-12 pr-10 text-2xl font-black rounded-xl border-gray-200 focus:border-emerald-500 tabular-nums bg-gray-50 focus:bg-white" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-300 pointer-events-none">F4</span>
                  </div>
                  {payMode === 'SPLIT' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">{t('cash')}</p>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" value={cashAmt} onChange={e => handleCashAmtChange(e.target.value)} className="h-10 rounded-xl text-sm font-bold border-emerald-200 focus:border-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-blue-600 mb-1">{t('network')}</p>
                        <Input readOnly value={netAmt} className="h-10 rounded-xl text-sm font-bold border-blue-100 bg-blue-50 text-blue-700" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer */}
                <div>
                  <Popover open={customerComboOpen} onOpenChange={v => { setCustomerComboOpen(v); if (!v) { setQuickAddMode(false); setQuickAddPhone('') } }}>
                    <PopoverTrigger render={
                      <button className={cn('flex w-full items-center justify-between h-11 rounded-xl border px-3.5 text-sm font-semibold transition-colors',
                        customerId ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100')}>
                        <div className="flex items-center gap-2">
                          <Users size={14} className={customerId ? 'text-amber-500' : 'text-gray-300'} />
                          <span className="truncate">{customerId ? (customerList.find(c=>c.id===customerId)?.name||customerName) : `${t('customer')}${payMode==='CREDIT'?' *':' ('+t('optional')+')'}`}</span>
                        </div>
                        <ChevronsUpDown size={13} className="opacity-40 shrink-0" />
                      </button>
                    } />
                    <PopoverContent className="w-[300px] p-0 rounded-2xl shadow-2xl border-none overflow-hidden">
                      {quickAddMode ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { setQuickAddMode(false); setQuickAddPhone('') }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><ArrowLeft size={14} /></button>
                            <span className="text-xs font-black uppercase tracking-widest text-violet-600 flex items-center gap-1.5"><UserPlus size={14} /> {t('newCustomer')}</span>
                          </div>
                          <Input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder={t('staffName')} className="h-10 rounded-xl font-bold text-sm" autoFocus />
                          <Input value={quickAddPhone} onChange={e=>setQuickAddPhone(e.target.value)} placeholder="05xxxxxxxx" className="h-10 rounded-xl font-bold text-sm" />
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
                            className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wide transition flex items-center justify-center gap-2">
                            {quickAddSaving ? '...' : <><UserPlus size={14} /> {t('saveAndSelect')}</>}
                          </button>
                        </div>
                      ) : (
                        <Command>
                          <CommandInput placeholder={t('searchCustomer')} className="h-11" value={customerSearch} onValueChange={setCustomerSearch} />
                          <CommandList className="max-h-[220px]">
                            <CommandGroup>
                              {customerId!==null && (
                                <CommandItem value="__clear__" onSelect={() => { setCustomerId(null); setCustomerName(''); setCustomerPhone(''); setCustomerComboOpen(false) }}
                                  className="py-2.5 px-4 cursor-pointer text-gray-400 italic text-xs">
                                  <Check className="mr-2 h-4 w-4 opacity-0" /> {t('walkinCustomer')}</CommandItem>
                              )}
                              {customerList.map(c => (
                                <CommandItem key={c.id} value={`${c.name} ${c.phone||''}`}
                                  onSelect={() => { setCustomerId(c.id); setCustomerName(c.name); setCustomerPhone(c.phone||''); setCustomerSearch(''); setCustomerComboOpen(false) }}
                                  className="py-2.5 px-4 cursor-pointer hover:bg-amber-50">
                                  <Check className={cn('mr-2 h-4 w-4 text-amber-600', customerId===c.id?'opacity-100':'opacity-0')} />
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm">{c.name}</span>
                                    {c.phone && <span className="text-[10px] text-gray-400">{c.phone}</span>}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            {customerSearch.trim().length > 0 && (
                              <CommandGroup>
                                <CommandItem value={`__add__${customerSearch}`} onSelect={() => setQuickAddMode(true)}
                                  className="py-3 px-4 cursor-pointer hover:bg-violet-50 text-violet-600 font-bold text-sm">
                                  <UserPlus size={14} className="mr-2 shrink-0" /> {t('add')} &ldquo;{customerSearch}&rdquo;
                                </CommandItem>
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      )}
                    </PopoverContent>
                  </Popover>
                  {payMode === 'CREDIT' && !customerId && (
                    <div className="grid grid-cols-2 gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                      <Input placeholder={t('customerName') + ' *'} value={customerName} onChange={e=>setCustomerName(e.target.value)} className="h-9 rounded-xl text-sm border-amber-200 focus:border-amber-500" />
                      <Input placeholder={t('placeholderPhone') + ' *'} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} className="h-9 rounded-xl text-sm border-amber-200 focus:border-amber-500" />
                    </div>
                  )}
                  {payMode === 'CREDIT' && (
                    <div className="mt-2 flex items-center gap-2 animate-in fade-in">
                      <p className="text-[10px] font-black uppercase text-amber-500 shrink-0">{t('dueDate')}</p>
                      <Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="h-9 rounded-xl text-sm border-amber-200" />
                    </div>
                  )}
                </div>

                {/* Description */}
                <Input placeholder={t('descriptionOptional')} value={description} onChange={e=>setDescription(e.target.value)} className="h-10 rounded-xl text-sm border-gray-200 bg-gray-50" />

                {/* Submit */}
                <button onClick={handleSubmit} disabled={loading || cart.length === 0}
                  className={cn('w-full h-[52px] mt-1 rounded-2xl font-black text-sm text-white uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed',
                    payMode === 'CASH'    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/25' :
                    payMode === 'NETWORK' ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/25' :
                    payMode === 'SPLIT'   ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/25' :
                    payMode === 'TABBY'   ? 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-purple-500/25' :
                    payMode === 'CREDIT'  ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/25' :
                                           'bg-gradient-to-r from-pink-500 to-pink-600 shadow-pink-500/25')}>
                  {loading
                    ? <><div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> {t('processing')}</>
                    : <><Check size={20} strokeWidth={3} /> {t('recordSale')} · {finalTotal.toFixed(2)} {t('sar')} <span className="opacity-70 ml-1 text-xs font-bold">(F9)</span></>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  )
}
