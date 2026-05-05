'use client'
import { useLanguage } from '@/providers/language-provider';
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { createAgent, addAgentTransaction } from '@/actions/agents'
import { AgentPdfReportButton } from './agent-report-pdf'
import { useSession } from 'next-auth/react'
import { 
  Receipt, User, Building2, History, PlusCircle, 
  Search, DollarSign, TrendingUp, Calendar, LayoutDashboard,
  Wallet, ShieldCheck, FileText, ChevronRight, UserPlus,
  Filter, ArrowUpDown, MoreHorizontal, Edit3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function AgentsLedger({ agents, userRole }: { agents: any[], userRole?: string }) {
  const { t, locale } = useLanguage();
  const { data: session } = useSession()
  const isOwner = userRole === 'OWNER'
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  
  // Create agent state
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')

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
      const payments = (a.transactions || []).filter((t: any) => t.type === 'AGENT_PAYMENT').reduce((s: number, t: any) => s + t.amount, 0)
      return sum + (a.openingBalance || 0) + purchases - payments
    }, 0)

    const topAgent = [...agents].sort((a, b) => {
      const getBal = (ag: any) => {
        const pur = (ag.transactions || []).filter((t: any) => t.type === 'AGENT_PURCHASE' && t.method === 'CREDIT').reduce((s: number, t: any) => s + t.amount, 0)
        const pay = (ag.transactions || []).filter((t: any) => t.type === 'AGENT_PAYMENT').reduce((s: number, t: any) => s + t.amount, 0)
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
    const totalPayments = (selectedAgent.transactions || []).filter((t: any) => t.type === 'AGENT_PAYMENT').reduce((s: number, t: any) => s + t.amount, 0)
    return (selectedAgent.openingBalance || 0) + totalPurchases - totalPayments
  }, [selectedAgent])

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 font-cairo animate-in fade-in duration-1000 p-4 sm:p-6 lg:p-8">
      
      {/* ─── Global Statistics Bar ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600">
              <Wallet size={32} strokeWidth={2} />
            </div>
            <div className="flex flex-col text-right">
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{t('totalOutstanding') || 'Total Market Liability'}</p>
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-4xl font-black text-gray-900 dark:text-white tabular-nums">{globalMetrics.totalDebt.toLocaleString()}</span>
                <span className="text-sm font-black text-gray-400">SAR</span>
              </div>
            </div>
          </div>
          <TrendingUp className="text-blue-500/20 group-hover:text-blue-500 transition-colors" size={48} />
        </div>

        <div className="p-8 rounded-[2.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center text-right hover:shadow-xl transition-all duration-500">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{t('activeAgents') || 'Registered Reps'}</p>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{globalMetrics.count}</p>
          <div className="mt-2 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full w-[65%]" />
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center text-right hover:shadow-xl transition-all duration-500">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{t('topRepresentative') || 'Highest Debt Rep'}</p>
          <p className="text-lg font-black text-gray-900 dark:text-white truncate">{globalMetrics.topAgent?.name || '-'}</p>
          <p className="text-[8px] font-black text-blue-600 uppercase mt-1 tracking-widest">Performance Leader</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* ─── Left Sidebar: Master List ─── */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 size={16} />
                {t('representatives') || 'Representatives'}
              </h3>
              
              {!isOwner && (
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger render={
                    <Button size="sm" className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-blue-500/20" />
                  }>
                    <div className="flex items-center">
                      <PlusCircle size={14} className={locale === 'ar' ? 'ml-2' : 'mr-2'} />
                      {t('add') || 'New Rep'}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden font-cairo">
                    <div className="h-2 w-full bg-blue-600" />
                    <DialogHeader className="p-8 pb-0 text-right">
                      <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-4 flex-row-reverse">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                          <UserPlus size={24} className="text-blue-600" />
                        </div>
                        {t('registerNewAgent') || 'Register Representative'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateAgent} className="p-8 space-y-6">
                      <div className="space-y-2 text-right">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2">{t('fullName')}</Label>
                        <Input required value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-xl border-none bg-gray-50 dark:bg-gray-900 font-bold px-5 text-right" />
                      </div>
                      <div className="space-y-2 text-right">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2">{t('company') || 'Associated Company'}</Label>
                        <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="h-14 rounded-xl border-none bg-gray-50 dark:bg-gray-900 font-bold px-5 text-right" />
                      </div>
                      <div className="space-y-2 text-right">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-orange-500 mr-2">{t('openingBalanceDebt') || 'Opening Debt'}</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 font-black">SAR</span>
                          <Input type="number" step="0.01" required value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} className="h-14 pl-14 pr-5 rounded-xl border-none bg-orange-500/5 font-black text-orange-600 text-right text-lg" />
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-14 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">
                        {t('saveRepresentative') || 'Create Entry'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="relative">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 text-gray-400", locale === 'ar' ? "left-4" : "right-4")} size={18} />
              <Input 
                placeholder={t('searchAgents') || 'Search representatives...'} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-14 rounded-2xl border-none bg-white dark:bg-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500/10 font-bold px-6 text-right"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
            <button
              onClick={() => setSelectedAgentId(null)}
              className={cn(
                "group flex items-center justify-between p-5 rounded-[1.8rem] transition-all duration-500 border-2",
                selectedAgentId === null
                  ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20 scale-[1.02]"
                  : "bg-white dark:bg-gray-900 border-transparent hover:border-blue-100 text-gray-500"
              )}
            >
              <div className="flex items-center gap-4 flex-row-reverse">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedAgentId === null ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800")}>
                  <LayoutDashboard size={20} />
                </div>
                <span className="font-black uppercase tracking-widest text-xs">{t('overview') || 'Overview'}</span>
              </div>
              <ChevronRight size={18} className={cn("transition-transform duration-500", selectedAgentId === null ? "rotate-90" : "opacity-0")} />
            </button>

            {filteredAgents.map(a => {
              const active = selectedAgentId === a.id
              const bal = (a.openingBalance || 0) + 
                (a.transactions || []).filter((t: any) => t.type === 'AGENT_PURCHASE' && t.method === 'CREDIT').reduce((s: number, tx: any) => s + tx.amount, 0) -
                (a.transactions || []).filter((t: any) => t.type === 'AGENT_PAYMENT').reduce((s: number, tx: any) => s + tx.amount, 0);

              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgentId(a.id)}
                  className={cn(
                    "group flex flex-col gap-4 p-5 rounded-[1.8rem] transition-all duration-500 border-2 text-right",
                    active
                      ? "bg-white dark:bg-gray-950 border-blue-600 shadow-2xl scale-[1.02] z-10"
                      : "bg-white dark:bg-gray-900 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  )}
                >
                  <div className="flex items-center justify-between flex-row-reverse">
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", active ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-100 dark:bg-gray-800 text-gray-400")}>
                        <User size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className={cn("font-black text-sm", active ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>{a.name}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{a.companyName || 'Independent'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={cn("text-sm font-black tabular-nums", bal > 0 ? "text-orange-600" : "text-emerald-600")}>{bal.toLocaleString()}</span>
                      <span className="text-[7px] font-black text-gray-400 uppercase">SAR</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── Right Content: Details ─── */}
        <div className="lg:col-span-8 xl:col-span-9">
          {!selectedAgentId ? (
            <div className="h-full min-h-[600px] flex flex-col items-center justify-center space-y-6 text-center animate-in zoom-in-95 duration-700 bg-white/50 dark:bg-gray-900/50 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
              <div className="w-24 h-24 bg-blue-500/5 rounded-full flex items-center justify-center text-blue-500/20">
                <LayoutDashboard size={64} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{t('selectRepresentative') || 'Select a Representative'}</h3>
                <p className="text-gray-400 font-bold max-w-sm mx-auto">{t('selectRepDesc') || 'Choose a rep from the left to view detailed ledger, transaction history, and generate reports.'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-1000">
              
              {/* Agent Hero Header */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-2xl shadow-blue-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 -mr-10 -mt-10 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-125 duration-1000" />
                  <div className="relative z-10 flex flex-col gap-8 h-full">
                    <div className="flex justify-between items-start flex-row-reverse">
                      <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                        <Building2 size={24} />
                      </div>
                      <div className="flex gap-2">
                        <AgentPdfReportButton agent={selectedAgent} netBalance={netBalance} locale={locale} />
                        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                          <Edit3 size={18} />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-3xl font-black leading-tight tracking-tight">{selectedAgent?.name}</h2>
                      <p className="text-xs font-black text-white/60 uppercase tracking-[0.2em] mt-2">{selectedAgent?.companyName || 'Verified Agent'}</p>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-8 rounded-[2.5rem] bg-white dark:bg-gray-900 shadow-xl border border-gray-50 dark:border-gray-800 flex flex-col justify-center text-right hover:shadow-2xl transition-all duration-500">
                    <div className="flex items-center justify-between flex-row-reverse mb-6">
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-400">
                        <Calendar size={20} />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('openingStatus') || 'Opening Ledger'}</p>
                    </div>
                    <div className="flex items-baseline justify-end gap-3">
                      <p className="text-4xl font-black text-gray-900 dark:text-white tabular-nums">{selectedAgent?.openingBalance?.toLocaleString()}</p>
                      <span className="text-sm font-black text-gray-400 uppercase">SAR</span>
                    </div>
                    <p className="text-[9px] font-black text-blue-600 mt-2 uppercase tracking-widest">Initial Registered Debt</p>
                  </div>

                  <div className={cn(
                    "p-8 rounded-[2.5rem] shadow-xl border flex flex-col justify-center text-right transition-all duration-700",
                    netBalance > 0 ? "bg-orange-500/5 border-orange-500/10" : "bg-emerald-500/5 border-emerald-500/10"
                  )}>
                    <div className="flex items-center justify-between flex-row-reverse mb-6">
                      <div className={cn("p-3 rounded-xl", netBalance > 0 ? "bg-orange-500/10 text-orange-600" : "bg-emerald-500/10 text-emerald-600")}>
                        <ArrowUpDown size={20} />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('netPosition') || 'Current Net Position'}</p>
                    </div>
                    <div className="flex items-baseline justify-end gap-3">
                      <p className={cn("text-5xl font-black tabular-nums", netBalance > 0 ? "text-orange-600" : "text-emerald-600")}>
                        {netBalance?.toLocaleString()}
                      </p>
                      <span className="text-sm font-black text-gray-400 uppercase">SAR</span>
                    </div>
                    <p className="text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest">Total Outstanding Liability</p>
                  </div>
                </div>
              </div>

              {/* Action and History Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* Add Entry Card */}
                {!isOwner && (
                  <div className="xl:col-span-4">
                    <Card className="border-none shadow-2xl rounded-[3rem] bg-white dark:bg-gray-950 overflow-hidden sticky top-8">
                      <div className="h-2 w-full bg-indigo-600" />
                      <CardHeader className="p-10 pb-0 text-right">
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-4 flex-row-reverse">
                          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-600">
                            <TrendingUp size={24} />
                          </div>
                          {t('quickEntry') || 'Record Entry'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-10 space-y-6">
                        <form onSubmit={handleCreateTx} className="space-y-6">
                          <div className="space-y-2 text-right">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2">{t('category') || 'Entry Category'}</Label>
                            <Select value={txType} onValueChange={(val: any) => setTxType(val)}>
                              <SelectTrigger className="h-14 rounded-2xl border-none bg-gray-50 dark:bg-gray-900 font-black px-6 flex-row-reverse">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-none shadow-2xl font-cairo">
                                <SelectItem value="AGENT_PURCHASE" className="text-right">Purchase on Credit</SelectItem>
                                <SelectItem value="AGENT_PAYMENT" className="text-right">Payment to Agent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {txType === 'AGENT_PAYMENT' && (
                            <div className="space-y-2 text-right animate-in fade-in slide-in-from-top-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mr-2">{t('paymentMethod') || 'Source Account'}</Label>
                              <Select value={method} onValueChange={(val: any) => setMethod(val)}>
                                <SelectTrigger className="h-14 rounded-2xl border-none bg-emerald-500/5 font-black text-emerald-600 px-6 flex-row-reverse">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl font-cairo">
                                  <SelectItem value="CASH" className="text-right">Cash Vault</SelectItem>
                                  <SelectItem value="NETWORK" className="text-right">Bank / Network</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          <div className="space-y-2 text-right">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2">{t('amount')}</Label>
                            <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">SAR</span>
                              <Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="h-14 pl-14 pr-6 rounded-2xl border-none bg-gray-50 dark:bg-gray-900 font-black text-xl text-right" />
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-right">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2">{t('reference') || 'Reference'}</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Inv # or Note" className="h-14 rounded-2xl border-none bg-gray-50 dark:bg-gray-900 font-bold px-6 text-right" />
                          </div>
                          
                          <Button type="submit" className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all mt-4">
                            {t('confirmEntry') || 'Submit Record'}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Ledger History Feed */}
                <div className={cn("space-y-6", isOwner ? "xl:col-span-12" : "xl:col-span-8")}>
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3 flex-row-reverse">
                      <History size={18} />
                      {t('ledgerHistory') || 'Detailed Ledger Feed'}
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-gray-400">
                        <Filter size={18} />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-gray-400">
                        <MoreHorizontal size={18} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pb-20">
                    {selectedAgent?.transactions?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((tx: any) => (
                      <div key={tx.id} className="group relative overflow-hidden p-8 rounded-[2.5rem] bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
                        <div className={cn(
                          "absolute top-0 bottom-0 w-2.5 transition-all duration-500 group-hover:w-4",
                          locale === 'ar' ? "right-0" : "left-0",
                          tx.type === 'AGENT_PURCHASE' ? "bg-orange-500" : "bg-emerald-500"
                        )} />
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                          <div className="flex items-center gap-6 w-full sm:w-auto flex-row-reverse">
                            <div className={cn(
                              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg",
                              tx.type === 'AGENT_PURCHASE' ? "bg-orange-50 text-orange-600 shadow-orange-500/5" : "bg-emerald-50 text-emerald-600 shadow-emerald-500/5"
                            )}>
                              {tx.type === 'AGENT_PURCHASE' ? <Receipt size={28} strokeWidth={2.5} /> : <ShieldCheck size={28} strokeWidth={2.5} />}
                            </div>
                            <div className="flex flex-col text-right">
                              <div className="flex items-center gap-3 justify-end">
                                <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
                                  {tx.method}
                                </span>
                                <span className="font-black text-gray-900 dark:text-white text-xl">
                                  {tx.type === 'AGENT_PURCHASE' ? (t('purchase') || 'Credit Purchase') : (t('payment') || 'Cash Payment')}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-tight mt-2 flex items-center gap-2 justify-end">
                                {format(new Date(tx.createdAt), 'PPp')}
                                <Calendar size={12} />
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-10 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="hidden lg:block text-right max-w-[200px]">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reference</p>
                              <p className="text-sm font-bold text-gray-600 dark:text-gray-400 truncate">
                                {tx.description || 'General Ledger Entry'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex items-baseline gap-2 justify-end">
                                <p className={cn("text-4xl font-black tabular-nums", tx.type === 'AGENT_PURCHASE' ? "text-orange-600" : "text-emerald-600")}>
                                  {tx.type === 'AGENT_PURCHASE' ? '+' : '-'}{tx.amount.toLocaleString()}
                                </p>
                                <span className="text-xs font-black text-gray-400 uppercase">SAR</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!selectedAgent?.transactions || selectedAgent.transactions.length === 0) && (
                      <div className="py-40 text-center bg-white/50 dark:bg-gray-900/50 rounded-[3.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                        <FileText size={80} className="text-gray-200 mx-auto mb-6" />
                        <p className="text-gray-400 font-black text-xl italic">{t('noEntries') || 'Empty Ledger Feed'}</p>
                        <p className="text-gray-300 font-bold text-sm mt-2">{t('noEntriesDesc') || 'No transactions recorded for this representative yet.'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
