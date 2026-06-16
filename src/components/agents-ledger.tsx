'use client'
import { useLanguage } from '@/providers/language-provider';
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { createAgent, addAgentTransaction, updateAgent, deleteAgent } from '@/actions/agents'
import { AgentPdfReportButton } from './agent-report-pdf'
import { useSession } from 'next-auth/react'
import { 
  Receipt, User, Building2, History, PlusCircle, 
  Search, DollarSign, TrendingUp, Calendar, LayoutDashboard,
  Wallet, ShieldCheck, FileText, ChevronRight, UserPlus,
  Filter, ArrowUpDown, MoreHorizontal, Edit3, Trash2, Check, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function AgentsLedger({ agents, userRole }: { agents: any[], userRole?: string }) {
  const { t, locale } = useLanguage();
  const { data: session } = useSession()
  const isOwner = userRole === 'OWNER'
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  
  // Create agent state
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')

  // Edit agent state
  const [editingAgentId, setEditingAgentId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editOpening, setEditOpening] = useState('')

  // Transaction state
  const [txType, setTxType] = useState<'AGENT_PURCHASE' | 'AGENT_PAYMENT'>('AGENT_PURCHASE')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [method, setMethod] = useState<'CASH' | 'NETWORK'>('CASH')

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAgent({ name, companyName, openingBalance: parseFloat(openingBalance) || 0 })
      setName('')
      setCompanyName('')
      setOpeningBalance('')
      setIsAddModalOpen(false)
    } catch(e) {
      alert('Failed to create agent')
    }
  }

  const startEditAgent = (a: any) => {
    setEditingAgentId(a.id)
    setEditName(a.name)
    setEditCompany(a.companyName || '')
    setEditOpening(String(a.openingBalance || 0))
  }

  const handleEditAgent = async () => {
    if (!editingAgentId) return
    try {
      await updateAgent(editingAgentId, {
        name: editName,
        companyName: editCompany,
        openingBalance: parseFloat(editOpening) || 0,
      })
      setEditingAgentId(null)
    } catch { alert('Failed to update agent') }
  }

  const handleDeleteAgent = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This will permanently remove the agent and all their transactions.`)) return
    try {
      if (selectedAgentId === id) setSelectedAgentId(null)
      await deleteAgent(id)
    } catch (e: any) { alert(e.message || 'Failed to delete agent') }
  }

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgentId) return
    try {
      await addAgentTransaction({
        agentId: selectedAgentId,
        type: txType,
        amount: parseFloat(amount),
        description,
        method: txType === 'AGENT_PAYMENT' ? method : 'CREDIT'
      })
      setAmount('')
      setDescription('')
      setIsTxModalOpen(false)
    } catch(e) {
      alert('Failed to add transaction')
    }
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  // Filtering agents
  const filteredAgents = useMemo(() => {
    return agents.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (a.companyName && a.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [agents, searchTerm])

  // Global Metrics
  const globalMetrics = useMemo(() => {
    const totalDebt = agents.reduce((sum, a) => {
      const purchases = (a.transactions || []).filter((t: any) => t.type === 'AGENT_PURCHASE' && t.method === 'CREDIT').reduce((s: number, t: any) => s + t.amount, 0)
      const payments = (a.transactions || []).filter((t: any) => ['AGENT_PAYMENT', 'PURCHASE_RETURN', 'SUPPLIER_CREDIT_NOTE'].includes(t.type)).reduce((s: number, t: any) => s + t.amount, 0)
      return sum + (a.openingBalance || 0) + purchases - payments
    }, 0)

    const topAgent = [...agents].sort((a, b) => {
      const getBal = (ag: any) => {
        const pur = (ag.transactions || []).filter((t: any) => t.type === 'AGENT_PURCHASE' && t.method === 'CREDIT').reduce((s: number, t: any) => s + t.amount, 0)
        const pay = (ag.transactions || []).filter((t: any) => ['AGENT_PAYMENT', 'PURCHASE_RETURN', 'SUPPLIER_CREDIT_NOTE'].includes(t.type)).reduce((s: number, t: any) => s + t.amount, 0)
        return (ag.openingBalance || 0) + pur - pay
      }
      return getBal(b) - getBal(a)
    })[0]

    return { totalDebt, count: agents.length, topAgent }
  }, [agents])

  // Selected Agent Net Balance
  const netBalance = useMemo(() => {
    if (!selectedAgent) return 0
    const totalPurchases = (selectedAgent.transactions || []).filter((t: any) => t.type === 'AGENT_PURCHASE' && t.method === 'CREDIT').reduce((s: number, t: any) => s + t.amount, 0)
    const totalPayments = (selectedAgent.transactions || []).filter((t: any) => ['AGENT_PAYMENT', 'PURCHASE_RETURN', 'SUPPLIER_CREDIT_NOTE'].includes(t.type)).reduce((s: number, t: any) => s + t.amount, 0)
    return (selectedAgent.openingBalance || 0) + totalPurchases - totalPayments
  }, [selectedAgent])

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/20">
            <Building2 size={30} className="text-white" strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-cairo">{t('agents') || 'Agents / Representatives'}</h1>
            <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 font-cairo">
              {locale === 'ar' ? 'إدارة حسابات المناديب والمستحقات والمسحوبات الآجلة' : 'Track and manage representative balances, invoices, and payments'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Global Statistics Bar ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-white dark:bg-gray-900 border-s-4 border-s-blue-600 rounded-3xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                <Wallet size={24} strokeWidth={2} />
              </div>
              <div className="flex flex-col text-start">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{t('totalOutstanding') || 'Total Market Liability'}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{globalMetrics.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-xs font-black text-gray-400">SAR</span>
                </div>
              </div>
            </div>
            <TrendingUp className="text-blue-500/20" size={36} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-gray-900 border-s-4 border-s-indigo-600 rounded-3xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
                <User size={24} strokeWidth={2} />
              </div>
              <div className="flex flex-col text-start">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{t('activeAgents') || 'Registered Reps'}</p>
                <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{globalMetrics.count}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white dark:bg-gray-900 border-s-4 border-s-cyan-600 rounded-3xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 rounded-2xl">
                <TrendingUp size={24} strokeWidth={2} />
              </div>
              <div className="flex flex-col text-start">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{t('topRepresentative') || 'Highest Debt Rep'}</p>
                <span className="text-lg font-black text-gray-900 dark:text-white truncate max-w-[180px]">{globalMetrics.topAgent?.name || '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ─── Left Sidebar: Master List ─── */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                <Building2 size={16} />
                {t('representatives') || 'Representatives'}
              </h3>
              
              {!isOwner && (
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger render={
                    <Button size="sm" className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-blue-500/20" />
                  }>
                    <div className="flex items-center">
                      <PlusCircle size={14} className="me-2" />
                      {t('add') || 'New Rep'}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl p-0 overflow-hidden font-cairo">
                    <div className="h-2 w-full bg-blue-600" />
                    <DialogHeader className="p-8 pb-0 text-start">
                      <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                          <UserPlus size={24} />
                        </div>
                        {t('registerNewAgent') || 'Register Representative'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateAgent} className="p-8 space-y-6">
                      <div className="space-y-2 text-start">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ms-1">{t('fullName')}</Label>
                        <Input required value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 font-bold px-4 text-start" />
                      </div>
                      <div className="space-y-2 text-start">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ms-1">{t('company') || 'Associated Company'}</Label>
                        <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="h-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 font-bold px-4 text-start" />
                      </div>
                      <div className="space-y-2 text-start">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-orange-500 ms-1">{t('openingBalanceDebt') || 'Opening Debt'}</Label>
                        <div className="relative">
                          <span className="absolute end-4 top-1/2 -translate-y-1/2 text-orange-400 font-black text-sm">SAR</span>
                          <Input type="number" step="0.01" required value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} className="h-12 ps-4 pe-14 rounded-xl border border-gray-200 dark:border-gray-800 bg-orange-500/5 font-black text-orange-600 text-start text-lg" />
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-12 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">
                        {t('saveRepresentative') || 'Create Entry'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 text-gray-400 start-4" size={18} />
              <Input 
                placeholder={t('searchAgents') || 'Search representatives...'} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-12 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:border-blue-500 font-bold ps-10 pe-4 text-start"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[700px] pe-2 custom-scrollbar">
            <button
              onClick={() => setSelectedAgentId(null)}
              className={cn(
                "group flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border-2 text-start",
                selectedAgentId === null
                  ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20 scale-[1.02]"
                  : "bg-white dark:bg-gray-900 border-transparent hover:border-blue-100 dark:hover:border-gray-800 text-gray-500"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedAgentId === null ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800")}>
                  <LayoutDashboard size={18} />
                </div>
                <span className="font-black uppercase tracking-widest text-xs">{t('overview') || 'Overview'}</span>
              </div>
              <ChevronRight size={16} className={cn("transition-transform duration-300", selectedAgentId === null ? "rotate-90" : "opacity-0")} />
            </button>

            {filteredAgents.map(a => {
              const active = selectedAgentId === a.id
              const bal = (a.openingBalance || 0) + 
                (a.transactions || []).filter((t: any) => t.type === 'AGENT_PURCHASE' && t.method === 'CREDIT').reduce((s: number, tx: any) => s + tx.amount, 0) -
                (a.transactions || []).filter((t: any) => ['AGENT_PAYMENT', 'PURCHASE_RETURN', 'SUPPLIER_CREDIT_NOTE'].includes(t.type)).reduce((s: number, tx: any) => s + tx.amount, 0);

              return (
                <div
                  key={a.id}
                  className={cn(
                    "group flex flex-col gap-3 p-4 rounded-2xl transition-all duration-300 border-2",
                    active
                      ? "bg-white dark:bg-gray-950 border-blue-600 shadow-lg scale-[1.02] z-10"
                      : "bg-white dark:bg-gray-900 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  )}
                >
                  {editingAgentId === a.id ? (
                    /* ── Inline Edit Form ── */
                    <div className="space-y-3" onClick={e => e.stopPropagation()}>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Name"
                        className="h-9 text-sm rounded-xl"
                      />
                      <Input
                        value={editCompany}
                        onChange={e => setEditCompany(e.target.value)}
                        placeholder="Company (optional)"
                        className="h-9 text-sm rounded-xl"
                      />
                      <div className="relative">
                        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">SAR</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={editOpening}
                          onChange={e => setEditOpening(e.target.value)}
                          placeholder="Opening balance"
                          className="h-9 text-sm rounded-xl pe-12"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditAgent}
                          className="flex-1 flex items-center justify-center gap-1 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-colors"
                        >
                          <Check size={13} /> Save
                        </button>
                        <button
                          onClick={() => setEditingAgentId(null)}
                          className="flex-1 flex items-center justify-center gap-1 h-8 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-black transition-colors"
                        >
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display Row ── */
                    <div
                      className="flex items-center justify-between w-full cursor-pointer"
                      onClick={() => setSelectedAgentId(a.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", active ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-100 dark:bg-gray-800 text-gray-400")}>
                          <User size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className={cn("font-black text-sm", active ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>{a.name}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{a.companyName || 'Independent'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className={cn("text-sm font-black tabular-nums", bal > 0 ? "text-orange-600" : "text-emerald-600")}>{bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <span className="text-[7px] font-black text-gray-400 uppercase">SAR</span>
                        </div>
                        {isAdmin && (
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => startEditAgent(a)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteAgent(a.id, a.name)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Right Content: Details ─── */}
        <div className="lg:col-span-8 xl:col-span-9">
          {!selectedAgentId ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center space-y-6 text-center animate-in zoom-in-95 duration-500 bg-white/50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
              <div className="w-24 h-24 bg-blue-500/5 rounded-full flex items-center justify-center text-blue-500/20">
                <LayoutDashboard size={64} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">{t('selectRepresentative') || 'Select a Representative'}</h3>
                <p className="text-gray-400 font-bold max-w-sm mx-auto text-sm">{t('selectRepDesc') || 'Choose a rep from the left to view detailed ledger, transaction history, and generate reports.'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
              {/* ─── Top Row Grid ─── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Agent Profile Hero Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-lg shadow-blue-500/20 flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 -mr-10 -mt-10 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-125 duration-700" />
                  <div className="relative z-10 flex flex-col gap-6 h-full justify-between">
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                        <Building2 size={24} />
                      </div>
                      <div className="flex gap-2">
                        <AgentPdfReportButton agent={selectedAgent} netBalance={netBalance} locale={locale} />
                      </div>
                    </div>
                    <div className="text-start mt-auto">
                      <h2 className="text-2xl font-black leading-tight tracking-tight">{selectedAgent?.name}</h2>
                      <p className="text-xs font-black text-white/60 uppercase tracking-[0.2em] mt-1">{selectedAgent?.companyName || 'Verified Agent'}</p>
                    </div>
                  </div>
                </div>

                {/* Account Position / Financial Summary Card */}
                <div className={cn(
                  "p-6 rounded-3xl bg-white dark:bg-gray-900 shadow-md border flex flex-col justify-between min-h-[220px] transition-all duration-300",
                  netBalance > 0 ? "border-s-4 border-s-orange-500" : "border-s-4 border-s-emerald-500"
                )}>
                  <div className="flex items-center justify-between">
                    <div className={cn("p-2.5 rounded-xl", netBalance > 0 ? "bg-orange-500/10 text-orange-600" : "bg-emerald-500/10 text-emerald-600")}>
                      <ArrowUpDown size={18} />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('netPosition' as any) || 'Current Net Position'}</p>
                  </div>
                  <div className="text-start mt-4 flex-1 flex flex-col justify-center">
                    <div className="flex items-baseline gap-2">
                      <p className={cn("text-3xl font-black tabular-nums", netBalance > 0 ? "text-orange-600" : "text-emerald-600")}>
                        {netBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-xs font-black text-gray-450 uppercase dark:text-gray-400">SAR</span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{t('outstandingLiability' as any) || 'Total Outstanding Liability'}</p>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t('openingStatus' as any) || 'Opening Ledger'}</span>
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300 tabular-nums">
                      {selectedAgent?.openingBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[9px] font-black text-gray-400">SAR</span>
                    </span>
                  </div>
                </div>

                {/* Quick Action / Entry Card */}
                <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 shadow-md border border-gray-100 dark:border-gray-800 flex flex-col justify-between min-h-[220px] transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600">
                      <PlusCircle size={18} />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('ledgerActions' as any) || 'Ledger Actions'}</p>
                  </div>
                  <div className="text-start mt-4 flex-1 flex flex-col justify-center">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 leading-relaxed">
                      {locale === 'ar' 
                        ? 'تسجيل المشتريات الآجلة أو دفعات المناديب الواردة مباشرة في الدفتر.' 
                        : 'Record credit purchases or agent payments directly into the ledger feed.'}
                    </p>
                  </div>
                  {!isOwner ? (
                    <Dialog open={isTxModalOpen} onOpenChange={setIsTxModalOpen}>
                      <DialogTrigger render={
                        <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all" />
                      }>
                        <div className="flex items-center justify-center">
                          <PlusCircle size={16} className="me-2" />
                          {t('quickEntry') || 'Record Entry'}
                        </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl p-0 overflow-hidden font-cairo">
                        <div className="h-2 w-full bg-indigo-600" />
                        <DialogHeader className="p-8 pb-0 text-start">
                          <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600">
                              <TrendingUp size={24} />
                            </div>
                            {t('quickEntry') || 'Record Ledger Entry'}
                          </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateTx} className="p-8 space-y-6">
                          <div className="space-y-2 text-start">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ms-1">{t('category') || 'Entry Category'}</Label>
                            <Select value={txType} onValueChange={(val: any) => setTxType(val)}>
                              <SelectTrigger className="h-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 font-bold px-4 flex justify-between items-center">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl font-cairo">
                                <SelectItem value="AGENT_PURCHASE" className="text-start">Purchase on Credit</SelectItem>
                                <SelectItem value="AGENT_PAYMENT" className="text-start">Payment to Agent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {txType === 'AGENT_PAYMENT' && (
                            <div className="space-y-2 text-start animate-in fade-in slide-in-from-top-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ms-1">{t('paymentMethod') || 'Source Account'}</Label>
                              <Select value={method} onValueChange={(val: any) => setMethod(val)}>
                                <SelectTrigger className="h-12 rounded-xl border border-emerald-500/25 bg-emerald-500/5 font-black text-emerald-600 px-4 flex justify-between items-center">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl font-cairo">
                                  <SelectItem value="CASH" className="text-start">Cash Vault</SelectItem>
                                  <SelectItem value="NETWORK" className="text-start">Bank / Network</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          <div className="space-y-2 text-start">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ms-1">{t('amount')}</Label>
                            <div className="relative">
                              <span className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">SAR</span>
                              <Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="h-12 ps-4 pe-14 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 font-black text-lg text-start" />
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-start">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ms-1">{t('reference') || 'Reference'}</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Inv # or Note" className="h-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 font-bold px-4 text-start" />
                          </div>
                          
                          <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all mt-4">
                            {t('confirmEntry') || 'Submit Record'}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button disabled className="w-full h-11 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-xl font-black uppercase tracking-widest text-xs cursor-not-allowed">
                      {t('readOnly' as any) || 'Read Only Access'}
                    </Button>
                  )}
                </div>
              </div>

              {/* ─── Ledger History Feed ─── */}
              <div className="space-y-6 w-full">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3">
                    <History size={18} />
                    {t('ledgerHistory') || 'Detailed Ledger Feed'}
                  </h3>
                </div>

                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 hover:bg-transparent">
                        <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400 pl-6">ID</TableHead>
                        <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400">Type</TableHead>
                        <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400">Method</TableHead>
                        <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400">Reference</TableHead>
                        <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400">Date</TableHead>
                        <TableHead className="h-14 font-black uppercase text-[10px] tracking-wider text-gray-400 text-end pr-6">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAgent?.transactions?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((tx: any) => (
                        <TableRow key={tx.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <TableCell className="pl-6 py-4 font-bold text-gray-400">
                            <div className="flex items-center gap-2">
                              <span className={cn("w-1.5 h-6 rounded-full", tx.type === 'AGENT_PURCHASE' ? "bg-orange-500" : "bg-emerald-500")} />
                              #{tx.id}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-gray-900 dark:text-white">
                            {tx.type === 'AGENT_PURCHASE' ? (t('purchase') || 'Credit Purchase') : 
                             tx.type === 'SUPPLIER_CREDIT_NOTE' ? 'Credit Note (Return)' :
                             tx.type === 'PURCHASE_RETURN' ? 'Purchase Return' :
                             (t('payment') || 'Cash Payment')}
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200/50 dark:border-gray-700/50">
                              {tx.method}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate font-medium text-gray-600 dark:text-gray-400">
                            {tx.description || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-gray-500 font-medium">
                            {format(new Date(tx.createdAt), 'PPp')}
                          </TableCell>
                          <TableCell className="text-end pr-6">
                            <span className={cn("text-base font-black tabular-nums", tx.type === 'AGENT_PURCHASE' ? "text-orange-600" : "text-emerald-600")}>
                              {tx.type === 'AGENT_PURCHASE' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-black text-gray-400 ms-1">SAR</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View List */}
                <div className="md:hidden space-y-4">
                  {selectedAgent?.transactions?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((tx: any) => (
                    <div key={tx.id} className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                      <div className={cn(
                        "absolute top-0 bottom-0 w-1.5 start-0",
                        tx.type === 'AGENT_PURCHASE' ? "bg-orange-500" : "bg-emerald-500"
                      )} />
                      
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-bold text-gray-400">#{tx.id}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                          {tx.method}
                        </span>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-gray-900 dark:text-white">
                            {tx.type === 'AGENT_PURCHASE' ? (t('purchase') || 'Credit Purchase') : 
                             tx.type === 'SUPPLIER_CREDIT_NOTE' ? 'Credit Note (Return)' :
                             tx.type === 'PURCHASE_RETURN' ? 'Purchase Return' :
                             (t('payment') || 'Cash Payment')}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {format(new Date(tx.createdAt), 'PP')}
                          </p>
                        </div>
                        
                        <div className="text-end">
                          <span className={cn("text-lg font-black tabular-nums", tx.type === 'AGENT_PURCHASE' ? "text-orange-600" : "text-emerald-600")}>
                            {tx.type === 'AGENT_PURCHASE' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[8px] font-black text-gray-400 ms-1">SAR</span>
                        </div>
                      </div>
                      
                      {tx.description && (
                        <div className="bg-gray-50 dark:bg-gray-950 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400">
                          {tx.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {(!selectedAgent?.transactions || selectedAgent.transactions.length === 0) && (
                  <div className="py-20 text-center bg-white/50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <FileText size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-450 font-black text-lg italic text-gray-400">{t('noEntries') || 'Empty Ledger Feed'}</p>
                    <p className="text-gray-300 font-bold text-xs mt-1">{t('noEntriesDesc') || 'No transactions recorded for this representative yet.'}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
