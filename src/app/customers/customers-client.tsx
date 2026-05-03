'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { useLanguage } from '@/providers/language-provider'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  UserCheck, Plus, Search, Phone, Mail, StickyNote,
  TrendingUp, AlertCircle, Receipt, X, Check, Edit2, Trash2,
  ChevronRight, Banknote, Wifi
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createCustomer, updateCustomer, deactivateCustomer, getCustomerDetails } from '@/actions/customers'
import { settleCreditSale } from '@/actions/transactions'
import { ModernLoader } from '@/components/ui/modern-loader'

type Customer = {
  id: number; name: string; phone: string | null; email: string | null
  notes: string | null; isActive: boolean; createdAt: Date
  totalSpend: number; outstandingCredit: number; invoiceCount: number
  transactionCount: number; lastPurchase: Date | null
}

type CustomerDetail = {
  id: number; name: string; phone: string | null; email: string | null; notes: string | null
  transactions: Array<{
    id: number; type: string; method: string; amount: number
    description: string | null; isSettled: boolean; invoiceNumber: string | null
    createdAt: Date; recordedBy: { name: string } | null
  }>
}

export default function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [customers, setCustomers] = useState(initialCustomers)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // Add/Edit dialog
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [settleLoading, setSettleLoading] = useState(false)

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q)
  })

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpend, 0)
  const totalOutstanding = customers.reduce((s, c) => s + c.outstandingCredit, 0)

  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', email: '', notes: '' }); setFormOpen(true) }
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', notes: c.notes || '' }); setFormOpen(true) }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.warning('Name is required'); return }
    setLoading(true)
    try {
      if (editing) {
        await updateCustomer(editing.id, form)
        setCustomers(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c))
        toast.success('Customer updated')
      } else {
        await createCustomer(form)
        toast.success('Customer created')
        router.refresh()
      }
      setFormOpen(false)
    } catch { toast.error('Failed to save customer') }
    finally { setLoading(false) }
  }

  const handleDeactivate = async (id: number) => {
    if (!confirm('Remove this customer?')) return
    setLoading(true)
    try {
      await deactivateCustomer(id)
      setCustomers(prev => prev.filter(c => c.id !== id))
      toast.success('Customer removed')
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }

  const openDetail = async (c: Customer) => {
    setDetailOpen(true)
    setDetail(null)
    const data = await getCustomerDetails(c.id)
    setDetail(data as CustomerDetail)
  }

  const handleSettle = async (txId: number, method: 'CASH' | 'NETWORK') => {
    setSettleLoading(true)
    try {
      await settleCreditSale({ transactionId: txId, paymentMethod: method })
      toast.success('Payment collected')
      if (detail) {
        const updated = await getCustomerDetails(detail.id)
        setDetail(updated as CustomerDetail)
      }
      router.refresh()
    } catch { toast.error('Failed to settle') }
    finally { setSettleLoading(false) }
  }

  const unpaidInDetail = detail?.transactions.filter(t => t.method === 'CREDIT' && !t.isSettled) || []

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {loading && <ModernLoader />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo flex items-center gap-2">
            <UserCheck className="text-violet-500" size={24} /> {t('customers')}
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">{t('customersSubtitle')}</p>
        </div>
        <Button onClick={openAdd} className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 gap-2">
          <Plus size={16} /> {t('addCustomer')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
            <div className="p-1.5 bg-violet-100 text-violet-600 rounded-lg"><UserCheck size={14} /></div>
            <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{t('allCustomers')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-black text-violet-600">{customers.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp size={14} /></div>
            <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{t('totalSpend')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-black text-emerald-600">{totalRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400">SAR</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-4">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><AlertCircle size={14} /></div>
            <CardTitle className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{t('outstandingBalance')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className={cn('text-xl font-black', totalOutstanding > 0 ? 'text-amber-600' : 'text-gray-400')}>{totalOutstanding.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400">SAR</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={t('searchCustomer')}
          className="pl-10 h-10 rounded-xl border-gray-200 dark:border-gray-700"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserCheck size={24} className="text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">{t('noCustomersYet')}</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                  <TableRow>
                    <TableHead className="text-xs">{t('customerName')}</TableHead>
                    <TableHead className="text-xs">{t('customerPhone')}</TableHead>
                    <TableHead className="text-xs text-right">{t('invoiceCount')}</TableHead>
                    <TableHead className="text-xs text-right">{t('totalSpend')}</TableHead>
                    <TableHead className="text-xs text-right">{t('outstandingBalance')}</TableHead>
                    <TableHead className="text-xs">{t('lastPurchase')}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} className="hover:bg-violet-50/30 dark:hover:bg-violet-900/10 cursor-pointer transition" onClick={() => openDetail(c)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                            {c.name[0].toUpperCase()}
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white">{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{c.phone || '—'}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs font-bold text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{c.invoiceCount}</span>
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-600 tabular-nums">{c.totalSpend.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {c.outstandingCredit > 0
                          ? <span className="font-black text-amber-600 tabular-nums">{c.outstandingCredit.toFixed(2)}</span>
                          : <span className="text-xs text-gray-300 flex items-center justify-end gap-1"><Check size={12} className="text-emerald-400" /> Paid</span>}
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {c.lastPurchase ? format(new Date(c.lastPurchase), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-violet-600 transition rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeactivate(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map(c => (
                <div key={c.id} className="p-4 space-y-2 cursor-pointer active:bg-gray-50" onClick={() => openDetail(c)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-black shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{c.phone || '—'}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 dark:bg-gray-900 px-2 py-1.5 rounded-lg text-center">
                      <p className="text-[9px] text-gray-400 uppercase font-bold">{t('invoiceCount')}</p>
                      <p className="font-black text-sm text-gray-700 dark:text-gray-300">{c.invoiceCount}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 rounded-lg text-center">
                      <p className="text-[9px] text-emerald-600 uppercase font-bold">{t('totalSpend')}</p>
                      <p className="font-black text-sm text-emerald-700">{c.totalSpend.toFixed(0)}</p>
                    </div>
                    <div className={cn('px-2 py-1.5 rounded-lg text-center', c.outstandingCredit > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-900')}>
                      <p className="text-[9px] text-amber-600 uppercase font-bold">{t('outstandingBalance')}</p>
                      <p className={cn('font-black text-sm', c.outstandingCredit > 0 ? 'text-amber-700' : 'text-gray-400')}>{c.outstandingCredit.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
          <div className="h-2 bg-gradient-to-r from-violet-500 to-violet-700 w-full" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-600"><UserCheck size={22} /></div>
                {editing ? t('editCustomer') : t('addCustomer')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('customerName')} *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ahmad Al-Harbi" className="h-12 rounded-2xl font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('customerPhone')}</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="05xxxxxxxx" className="h-12 rounded-2xl font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('customerEmail')}</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" className="h-12 rounded-2xl font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('customerNotes')}</Label>
                <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="VIP customer..." className="h-12 rounded-2xl font-bold" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setFormOpen(false)} className="flex-1 h-12 rounded-2xl text-gray-400">Cancel</Button>
                <Button onClick={handleSave} disabled={loading} className="flex-1 h-12 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black">
                  {loading ? '...' : <><Check size={16} className="mr-2" />{editing ? 'Save Changes' : t('addCustomer')}</>}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
          <div className="h-2 bg-gradient-to-r from-violet-500 to-indigo-600 w-full sticky top-0 z-10" />
          <div className="p-8 space-y-6">
            {!detail ? (
              <div className="py-12 text-center text-gray-400">Loading...</div>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-black text-2xl shrink-0">
                      {detail.name[0].toUpperCase()}
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-black">{detail.name}</DialogTitle>
                      <div className="flex items-center gap-3 mt-1 text-gray-400 text-xs">
                        {detail.phone && <span className="flex items-center gap-1"><Phone size={11} />{detail.phone}</span>}
                        {detail.email && <span className="flex items-center gap-1"><Mail size={11} />{detail.email}</span>}
                      </div>
                      {detail.notes && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1 italic"><StickyNote size={10} />{detail.notes}</p>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                {/* Unpaid credits */}
                {unpaidInDetail.length > 0 && (
                  <div className="p-4 bg-amber-500/5 border border-amber-200/40 dark:border-amber-800/30 rounded-2xl space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                      <AlertCircle size={12} /> Outstanding Credit
                    </p>
                    {unpaidInDetail.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-amber-700 tabular-nums">{tx.amount.toFixed(2)} SAR</p>
                          <p className="text-[10px] text-gray-400">{format(new Date(tx.createdAt), 'MMM d, yyyy')} · {tx.invoiceNumber || `#${tx.id}`}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSettle(tx.id, 'CASH')} disabled={settleLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 rounded-xl text-xs font-black transition">
                            <Banknote size={12} /> Cash
                          </button>
                          <button onClick={() => handleSettle(tx.id, 'NETWORK')} disabled={settleLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 rounded-xl text-xs font-black transition">
                            <Wifi size={12} /> Network
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transaction history */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><Receipt size={12} />{t('purchaseHistory')}</p>
                  {detail.transactions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">{t('noSalesYet')}</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {detail.transactions.map(tx => (
                        <div key={tx.id} className={cn('flex items-center justify-between p-3 rounded-xl border text-sm', tx.method === 'CREDIT' && !tx.isSettled ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/30' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800')}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn('text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full', tx.method === 'CREDIT' ? 'bg-amber-100 text-amber-700' : tx.method === 'NETWORK' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}>{tx.method}</span>
                              {tx.method === 'CREDIT' && !tx.isSettled && <span className="text-[9px] font-black uppercase text-amber-600">Unpaid</span>}
                              {tx.method === 'CREDIT' && tx.isSettled && <span className="text-[9px] font-black uppercase text-emerald-600">Settled</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{format(new Date(tx.createdAt), 'MMM d, yyyy · HH:mm')} · {tx.invoiceNumber || `#${tx.id}`}</p>
                          </div>
                          <span className="font-black text-gray-900 dark:text-white tabular-nums">{tx.amount.toFixed(2)} SAR</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
