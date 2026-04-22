'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { createAgent, addAgentTransaction } from '@/actions/agents'
import { AgentPdfReportButton } from './agent-report-pdf'
import { useSession } from 'next-auth/react'

export function AgentsLedger({ agents }: { agents: any[] }) {
  const { data: session } = useSession()
  const isOwner = session?.user?.role === 'OWNER'
  const isAdmin = session?.user?.role === 'ADMIN'

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  
  // Create agent state
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')

  // Transaction state
  const [txType, setTxType] = useState<'AGENT_PURCHASE' | 'AGENT_PAYMENT'>('AGENT_PURCHASE')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAgent({ name, companyName, openingBalance: parseFloat(openingBalance) || 0 })
      setName('')
      setCompanyName('')
      setOpeningBalance('')
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
        method: 'CASH'
      })
      setAmount('')
      setDescription('')
    } catch(e) {
      alert('Failed to add transaction')
    }
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  // Calculate Net Balance for selected agent
  let netBalance = 0
  if (selectedAgent) {
    const totalPurchases = selectedAgent.transactions.filter((t: any) => t.type === 'AGENT_PURCHASE').reduce((s: number, t: any) => s + t.amount, 0)
    const totalPayments = selectedAgent.transactions.filter((t: any) => t.type === 'AGENT_PAYMENT').reduce((s: number, t: any) => s + t.amount, 0)
    netBalance = selectedAgent.openingBalance + totalPurchases - totalPayments
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedAgentId(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedAgentId === null
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Overview & Add Agent
        </button>
        {agents.map(a => (
          <button
            key={a.id}
            onClick={() => setSelectedAgentId(a.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedAgentId === a.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {a.name} {a.companyName && `(${a.companyName})`}
          </button>
        ))}
      </div>

      {!selectedAgentId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!isOwner ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Register New Representative / Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div className="space-y-2">
                  <Label>Representative Name</Label>
                  <Input required value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Company Name (Optional)</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Opening Balance (Debt on Store)</Label>
                  <Input type="number" step="0.01" required value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} />
                </div>
                <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700">Add Agent</Button>
              </form>
            </CardContent>
          </Card>
          ) : (
            <div className="text-gray-500 italic p-6">Registering Agents is restricted to Administrators.</div>
          )}
          
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-700">Agents List</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Opening Debt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-gray-400">No agents registered.</TableCell></TableRow>
                )}
                {agents.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-semibold">{a.name}</TableCell>
                    <TableCell>{a.companyName || '-'}</TableCell>
                    <TableCell className="text-orange-600">{a.openingBalance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center min-w-[150px]">
                <p className="text-sm text-gray-500">Opening Debt</p>
                <p className="text-xl font-bold">{selectedAgent?.openingBalance.toFixed(2)}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center min-w-[150px]">
                <p className="text-sm text-gray-500">Net Balance (Debt)</p>
                <p className="text-xl font-bold text-orange-600">{netBalance.toFixed(2)}</p>
              </div>
            </div>
            
            <AgentPdfReportButton agent={selectedAgent} netBalance={netBalance} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {!isOwner && (
              <Card className="col-span-1 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Add Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTx} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Transaction Type</Label>
                    <Select value={txType} onValueChange={(val: any) => setTxType(val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGENT_PURCHASE">Purchase on Credit (Increases Debt)</SelectItem>
                        <SelectItem value="AGENT_PAYMENT">Payment to Agent (Decreases Debt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Invoice #1234" />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700">Record Transaction</Button>
                </form>
              </CardContent>
            </Card>
            )}

            <Card className={`shadow-sm border-gray-200 ${isOwner ? 'col-span-1 md:col-span-3' : 'col-span-2'}`}>
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedAgent?.transactions.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-gray-400">No transactions recorded.</TableCell></TableRow>
                  )}
                  {selectedAgent?.transactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.createdAt), 'PPp')}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tx.type === 'AGENT_PURCHASE' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {tx.type === 'AGENT_PURCHASE' ? 'Purchase' : 'Payment'}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">{tx.amount.toFixed(2)}</TableCell>
                      <TableCell>{tx.description || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
