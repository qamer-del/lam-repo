'use client'

import { useState, useEffect } from 'react'
import { 
  Package, ShoppingCart, ArrowLeftRight, AlertTriangle, TrendingUp, 
  Box, SlidersHorizontal, Pencil, Power,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLanguage } from '@/providers/language-provider'
import { AddInventoryItemModal } from '@/components/add-inventory-item-modal'
import { AddPurchaseModal } from '@/components/add-purchase-modal'
import { StockAdjustmentModal } from '@/components/stock-adjustment-modal'
import { ImportInventoryModal } from '@/components/import-inventory-modal'
import { deactivateInventoryItem } from '@/actions/inventory'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { InventoryCategory } from '@prisma/client'

type Tab = 'items' | 'purchases' | 'movements'

const CATEGORY_COLORS: Record<string, string> = {
  POLISH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  COATING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  CONSUMABLE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  EQUIPMENT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  CHEMICAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  OTHER: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const CATEGORY_LABELS: Record<string, string> = {
  POLISH: 'Polish', COATING: 'Coating', CONSUMABLE: 'Consumable',
  EQUIPMENT: 'Equipment', CHEMICAL: 'Chemical', OTHER: 'Other',
}

const MOVEMENT_COLORS: Record<string, string> = {
  PURCHASE_IN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  SALE_OUT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ADJUSTMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RETURN_IN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

const MOVEMENT_LABELS: Record<string, string> = {
  PURCHASE_IN: 'Stock In', SALE_OUT: 'Sale Out', ADJUSTMENT: 'Adjustment', RETURN_IN: 'Returned',
}

interface InventoryItem {
  id: number; name: string; sku: string | null; category: InventoryCategory
  unit: string; currentStock: number; reorderLevel: number; unitCost: number
  sellingPrice: number; isActive: boolean; createdAt: Date; updatedAt: Date
}

interface PurchaseOrder {
  id: number; totalCost: number; method: string; note: string | null
  status: string; receivedAt: Date | null; createdAt: Date
  agent: { name: string; companyName: string | null } | null
  recordedBy: { name: string } | null
  items: { id: number; quantity: number; unitCost: number; totalCost: number; item: { name: string; unit: string } }[]
}

interface StockMovement {
  id: number; type: string; quantity: number; unitCost: number | null
  note: string | null; createdAt: Date; isRestocked: boolean; invoiceNumber: string | null
  item: { name: string; unit: string }
  recordedBy: { name: string } | null
}

interface Props {
  initialItems: InventoryItem[]
  initialPurchases: PurchaseOrder[]
  initialMovements: StockMovement[]
  userRole: string
}

function StockBadge({ item }: { item: InventoryItem }) {
  if (item.currentStock <= 0)
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Out of Stock</span>
  if (item.currentStock <= item.reorderLevel)
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1"><AlertTriangle size={10} />Low</span>
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">In Stock</span>
}

function Pagination({ 
  currentPage, 
  totalPages, 
  startIndex, 
  endIndex, 
  totalItems, 
  onPageChange 
}: { 
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  totalItems: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
        Showing <span className="font-bold text-gray-900 dark:text-white">{startIndex + 1}</span> to <span className="font-bold text-gray-900 dark:text-white">{endIndex}</span> of <span className="font-bold text-gray-900 dark:text-white">{totalItems}</span> records
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-gray-200 dark:border-gray-800 disabled:opacity-30"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft size={14} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-gray-200 dark:border-gray-800 disabled:opacity-30"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={14} />
        </Button>
        
        <div className="flex items-center gap-1 px-2">
          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{currentPage}</span>
          <span className="text-xs text-gray-400">/</span>
          <span className="text-xs font-medium text-gray-500">{totalPages}</span>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-gray-200 dark:border-gray-800 disabled:opacity-30"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={14} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-gray-200 dark:border-gray-800 disabled:opacity-30"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight size={14} />
        </Button>
      </div>
    </div>
  )
}

export function InventoryClient({ initialItems, initialPurchases, initialMovements, userRole }: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('items')
  const [searchQuery, setSearchQuery] = useState('')
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [tab, searchQuery])

  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const isAdmin = userRole === 'ADMIN' || isSuperAdmin
  const isOwner = userRole === 'OWNER'

  const totalValue = initialItems.reduce((s, i) => s + i.currentStock * i.unitCost, 0)
  const lowStockCount = initialItems.filter(i => i.currentStock <= i.reorderLevel && i.currentStock > 0).length
  const outOfStockCount = initialItems.filter(i => i.currentStock <= 0).length

  const handleDeactivate = async (id: number) => {
    if (!confirm('Deactivate this item? It will no longer appear in stock.')) return
    await deactivateInventoryItem(id)
    router.refresh()
  }

  const filteredItems = initialItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'items', label: t('items'), icon: Package },
    { key: 'purchases', label: t('purchases'), icon: ShoppingCart },
    { key: 'movements', label: t('movements'), icon: ArrowLeftRight },
  ]

  // Pagination Logic for Items
  const totalItemPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  
  // Pagination Logic for Purchases
  const totalPurchasePages = Math.ceil(initialPurchases.length / ITEMS_PER_PAGE)
  const paginatedPurchases = initialPurchases.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Pagination Logic for Movements
  const totalMovementPages = Math.ceil(initialMovements.length / ITEMS_PER_PAGE)
  const paginatedMovements = initialMovements.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const currentStartIndex = (currentPage - 1) * ITEMS_PER_PAGE

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent font-cairo">{t('inventory')}</h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm font-cairo">{t('inventorySubtitle')}</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <ImportInventoryModal />
            <AddInventoryItemModal triggerClassName="h-10 px-4 text-sm" />
            <AddPurchaseModal triggerClassName="h-10 px-4 text-sm" />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-white dark:bg-gray-900 border-l-4 border-l-teal-500">
          <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
            <div className="p-1.5 bg-teal-100 text-teal-600 dark:bg-teal-900/30 rounded-lg"><Box size={16} /></div>
            <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total Items</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-black text-teal-600">{initialItems.length}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-gray-900 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
            <div className="p-1.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 rounded-lg"><TrendingUp size={16} /></div>
            <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total Value</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-black text-blue-600 tabular-nums">{totalValue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-gray-900 border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
            <div className="p-1.5 bg-amber-100 text-amber-600 dark:bg-amber-900/30 rounded-lg"><AlertTriangle size={16} /></div>
            <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Low Stock</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-black text-amber-600">{lowStockCount}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-gray-900 border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-4 px-4">
            <div className="p-1.5 bg-red-100 text-red-600 dark:bg-red-900/30 rounded-lg"><Package size={16} /></div>
            <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-black text-red-600">{outOfStockCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 p-1.5 rounded-2xl w-full sm:w-auto sm:inline-flex font-cairo">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 sm:flex-none justify-center ${
                tab === key
                  ? 'bg-white dark:bg-gray-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        
        {tab === 'items' && (
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search items by name or SKU..."
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition duration-150 ease-in-out font-cairo"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── ITEMS TAB ── */}
      {tab === 'items' && (
        <Card className="shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder At</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Sell Price</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-gray-400">{t('noItemsYet')}</TableCell></TableRow>
                )}
                {paginatedItems.map(item => (
                  <TableRow key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition ${item.currentStock <= 0 ? 'opacity-60' : ''}`}>
                    <TableCell>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                        {item.sku && <p className="text-xs text-gray-400 font-mono mt-0.5">{item.sku}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold tabular-nums">{item.currentStock} <span className="text-xs text-gray-400">{item.unit}</span></TableCell>
                    <TableCell className="text-sm text-gray-500 tabular-nums">{item.reorderLevel} {item.unit}</TableCell>
                    <TableCell className="tabular-nums font-medium">{item.unitCost.toFixed(2)}</TableCell>
                    <TableCell className="tabular-nums font-bold text-teal-600">{item.sellingPrice?.toFixed(2)}</TableCell>
                    <TableCell className="font-bold tabular-nums text-blue-600">{(item.currentStock * item.unitCost).toFixed(2)}</TableCell>
                    <TableCell><StockBadge item={item} /></TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setEditItem(item)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition">
                            <Pencil size={14} />
                          </button>
                          {isSuperAdmin && (
                            <button onClick={() => setAdjustItem(item)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition">
                              <SlidersHorizontal size={14} />
                            </button>
                          )}
                          <button onClick={() => handleDeactivate(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                            <Power size={14} />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedItems.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">{t('noItemsYet')}</div>}
            {paginatedItems.map(item => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                    {item.sku && <p className="text-xs text-gray-400 font-mono">{item.sku}</p>}
                    <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${CATEGORY_COLORS[item.category]}`}>{CATEGORY_LABELS[item.category]}</span>
                  </div>
                  <StockBadge item={item} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Stock</p>
                    <p className="font-black text-gray-900 dark:text-white tabular-nums">{item.currentStock}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Cost</p>
                    <p className="font-black text-gray-900 dark:text-white tabular-nums">{item.unitCost.toFixed(2)}</p>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-2 text-center border border-teal-100 dark:border-teal-900/30">
                    <p className="text-[10px] text-teal-600 font-bold uppercase">Sell</p>
                    <p className="font-black text-teal-700 dark:text-teal-400 tabular-nums">{item.sellingPrice?.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-blue-400 font-bold uppercase">Value</p>
                    <p className="font-black text-blue-600 dark:text-blue-400 tabular-nums">{(item.currentStock * item.unitCost).toFixed(0)}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => setEditItem(item)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 rounded-xl hover:bg-teal-100 transition">
                      <Pencil size={12} /> Edit
                    </button>
                    {isSuperAdmin && (
                      <button onClick={() => setAdjustItem(item)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl hover:bg-amber-100 transition">
                        <SlidersHorizontal size={12} /> Adjust
                      </button>
                    )}
                    <button onClick={() => handleDeactivate(item.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition">
                      <Power size={12} /> Off
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {filteredItems.length > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalItemPages}
              startIndex={currentStartIndex}
              endIndex={Math.min(currentStartIndex + ITEMS_PER_PAGE, filteredItems.length)}
              totalItems={filteredItems.length}
              onPageChange={setCurrentPage}
            />
          )}
        </Card>
      )}

      {/* ── PURCHASES TAB ── */}
      {tab === 'purchases' && (
        <Card className="shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPurchases.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-400">{t('noPurchasesYet')}</TableCell></TableRow>
                )}
                {paginatedPurchases.map(po => (
                  <TableRow key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <TableCell className="font-bold text-gray-500">#{po.id}</TableCell>
                    <TableCell>
                      {po.agent ? (
                        <div>
                          <p className="font-semibold">{po.agent.name}</p>
                          {po.agent.companyName && <p className="text-xs text-gray-400">{po.agent.companyName}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No Supplier</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {po.items.map(li => (
                          <p key={li.id} className="text-xs text-gray-600 dark:text-gray-400">
                            {li.item.name} × {li.quantity} {li.item.unit}
                          </p>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-black tabular-nums text-blue-600">{po.totalCost.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${po.method === 'CASH' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {po.method}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{format(new Date(po.createdAt), 'PP')}</TableCell>
                    <TableCell className="text-sm text-gray-500">{po.recordedBy?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Purchases */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedPurchases.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">{t('noPurchasesYet')}</div>}
            {paginatedPurchases.map(po => (
              <div key={po.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">PO #{po.id}</p>
                    <p className="text-xs text-gray-400">{po.agent?.name || 'No Supplier'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-600 tabular-nums">{po.totalCost.toFixed(2)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${po.method === 'CASH' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{po.method}</span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1">
                  {po.items.map(li => (
                    <p key={li.id} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                      <span>{li.item.name} × {li.quantity} {li.item.unit}</span>
                      <span className="font-bold">{li.totalCost.toFixed(2)}</span>
                    </p>
                  ))}
                </div>
                <p className="text-xs text-gray-400">{format(new Date(po.createdAt), 'PPp')} · {po.recordedBy?.name}</p>
              </div>
            ))}
          </div>
          {initialPurchases.length > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPurchasePages}
              startIndex={currentStartIndex}
              endIndex={Math.min(currentStartIndex + ITEMS_PER_PAGE, initialPurchases.length)}
              totalItems={initialPurchases.length}
              onPageChange={setCurrentPage}
            />
          )}
        </Card>
      )}

      {/* ── MOVEMENTS TAB ── */}
      {tab === 'movements' && (
        <Card className="shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                <TableRow>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Qty</TableHead>
                  <TableHead className="text-xs">Unit Cost</TableHead>
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Note</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMovements.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-400">{t('noMovementsYet')}</TableCell></TableRow>
                )}
                {paginatedMovements.map(m => (
                  <TableRow key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit ${MOVEMENT_COLORS[m.type]}`}>
                          {MOVEMENT_LABELS[m.type]}
                        </span>
                        {m.type === 'RETURN_IN' && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold w-fit ${
                            m.isRestocked ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {m.isRestocked ? '↑ Restocked' : '✕ Not restocked'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{m.item.name}</TableCell>
                    <TableCell className={`font-bold tabular-nums text-sm ${m.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity} <span className="text-xs text-gray-400 font-normal">{m.item.unit}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 tabular-nums">{m.unitCost ? m.unitCost.toFixed(2) : '—'}</TableCell>
                    <TableCell>
                      {m.invoiceNumber
                        ? <span className="font-mono text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">{m.invoiceNumber}</span>
                        : <span className="text-gray-400 text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400 max-w-[140px] truncate">{m.note || '—'}</TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">{format(new Date(m.createdAt), 'PP · p')}</TableCell>
                    <TableCell className="text-xs text-gray-500">{m.recordedBy?.name || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Movements */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedMovements.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">{t('noMovementsYet')}</div>}
            {paginatedMovements.map(m => (
              <div key={m.id} className="p-4 flex justify-between items-start gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${MOVEMENT_COLORS[m.type]}`}>{MOVEMENT_LABELS[m.type]}</span>
                    {m.type === 'RETURN_IN' && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        m.isRestocked ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {m.isRestocked ? '↑ Restocked' : '✕ Not restocked'}
                      </span>
                    )}
                    {m.invoiceNumber && (
                      <span className="font-mono text-[9px] text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">{m.invoiceNumber}</span>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{m.item.name}</p>
                  <p className="text-xs text-gray-400">{format(new Date(m.createdAt), 'MMM d · h:mm a')} · {m.recordedBy?.name || '—'}</p>
                </div>
                <p className={`text-lg font-black tabular-nums shrink-0 ${m.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {m.quantity > 0 ? '+' : ''}{m.quantity}
                  <span className="text-xs text-gray-400 font-normal ml-1">{m.item.unit}</span>
                </p>
              </div>
            ))}
          </div>
          {initialMovements.length > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalMovementPages}
              startIndex={currentStartIndex}
              endIndex={Math.min(currentStartIndex + ITEMS_PER_PAGE, initialMovements.length)}
              totalItems={initialMovements.length}
              onPageChange={setCurrentPage}
            />
          )}
        </Card>
      )}

      {/* Edit Item Modal */}
      {editItem && (
        <AddInventoryItemModal
          editItem={editItem}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* Stock Adjustment Modal */}
      {adjustItem && (
        <StockAdjustmentModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
        />
      )}
    </div>
  )
}
