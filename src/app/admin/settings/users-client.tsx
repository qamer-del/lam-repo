'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { createUser, deleteUser, approveUser, rejectUser, updateUser } from '@/actions/users'
import { factoryReset } from '@/actions/settings'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/providers/language-provider'
import {
  AlertTriangle, LogOut, Check, X, Clock, Pencil, Save,
  ChevronDown, ChevronUp, UserPlus, ShieldAlert
} from 'lucide-react'
import { useSession } from 'next-auth/react'

// ── Helpers ───────────────────────────────────────────────────────────────────
const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    OWNER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    CASHIER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return map[role] ?? 'bg-gray-100 text-gray-600'
}

const statusBadge = (status: string) => {
  if (status === 'REJECTED') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
}

export function UsersClient({
  initialUsers,
  initialPendingUsers,
  userRole,
  branches,
}: {
  initialUsers: any[]
  initialPendingUsers: any[]
  userRole: string
  branches?: any[]
}) {
  const router = useRouter()
  // Derive session user id for self-deletion guard (still need session for the id)
  const { data: session } = useSession()

  const isOwner = userRole === 'OWNER'
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const isAdmin = userRole === 'ADMIN' || isSuperAdmin

  const { t, locale } = useLanguage()

  // ── Create user form state ────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'CASHIER', phone: '', branchId: '' })

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', role: '', password: '', phone: '', branchId: '' })

  // ── Reset confirmation ────────────────────────────────────────────────────
  const [resetConfirm, setResetConfirm] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = { ...form }
      if (payload.branchId) payload.branchId = Number(payload.branchId)
      else delete payload.branchId
      
      await createUser(payload)
      setForm({ name: '', username: '', password: '', role: 'CASHIER', phone: '', branchId: '' })
      router.refresh()
    } catch (err: any) {
      alert(err.message || t('errorCreatingUser'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userRole: string, id: string) => {
    if (id === session?.user?.id) { alert("You cannot delete your own account."); return }
    if (userRole === 'SUPER_ADMIN' && !isSuperAdmin) { alert("Only Super Admins can revoke Super Admin accounts."); return }
    if (!confirm(t('deleteUserConfirm'))) return
    try {
      await deleteUser(id)
      router.refresh()
    } catch (err: any) { alert(err.message) }
  }

  const startEdit = (user: any) => {
    setEditingId(user.id)
    setEditForm({ name: user.name, role: user.role, password: '', phone: user.phone || '', branchId: user.branchId ? String(user.branchId) : '' })
  }

  const handleEditSave = async (id: string) => {
    setLoading(true)
    try {
      await updateUser(id, {
        name: editForm.name || undefined,
        role: editForm.role || undefined,
        password: editForm.password || undefined,
        phone: editForm.phone,
        branchId: editForm.branchId ? Number(editForm.branchId) : undefined,
      })
      setEditingId(null)
      router.refresh()
    } catch (err: any) { alert(err.message) } finally { setLoading(false) }
  }

  const handleApprove = async (id: string) => {
    try {
      await approveUser(id)
      router.refresh()
    } catch (err: any) { alert(err.message) }
  }

  const handleReject = async (id: string) => {
    if (!confirm('Reject this registration request?')) return
    try {
      await rejectUser(id)
      router.refresh()
    } catch (err: any) { alert(err.message) }
  }

  const handleReset = async () => {
    if (resetConfirm.trim() !== 'RESET') return
    setLoading(true)
    try {
      const res = await factoryReset()
      if (res.error) {
        alert('Reset Error: ' + res.error)
      } else {
        alert('System has been factory reset. All data and other user accounts have been removed. You remain logged in.')
        setResetConfirm('')
        router.refresh()
      }
    } catch { alert('Server Error during reset') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-8">

      {/* ── Pending Registrations ─────────────────────────────────────────── */}
      {isAdmin && initialPendingUsers.length > 0 && (
        <Card className="border-2 border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Pending Registrations</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">{initialPendingUsers.length} account{initialPendingUsers.length !== 1 ? 's' : ''} awaiting approval</p>
              </div>
              <span className="ml-auto min-w-[28px] h-7 rounded-full bg-amber-500 text-white text-sm font-black flex items-center justify-center px-2">
                {initialPendingUsers.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialPendingUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-400 shrink-0">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user.name}</p>
                  <p className="text-xs text-gray-400 font-medium mt-0.5" dir="ltr">@{user.username}</p>
                  {user.phone && <p className="text-xs text-gray-400 mt-0.5" dir="ltr">{user.phone}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">Requested {format(new Date(user.createdAt), 'dd MMM yyyy, h:mm a')}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(user.id)}
                    className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5"
                  >
                    <Check size={13} /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(user.id)}
                    className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold gap-1.5"
                  >
                    <X size={13} /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Create + Users list ───────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 ${isOwner ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-6`}>

        {/* Create user form */}
        {!isOwner && (
          <Card className="col-span-1 border border-gray-200 dark:border-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus size={18} className="text-blue-500" />
                {t('createNewUser')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('fullName')}</Label>
                  <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('usernameLogin')}</Label>
                  <Input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="text-left" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{t('password')}</Label>
                  <Input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="text-left" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>Phone <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                  <Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="text-left" dir="ltr" placeholder="+966..." />
                </div>
                <div className="space-y-2">
                  <Label>{t('role')}</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v || 'CASHIER' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASHIER">{t('cashierLimited')}</SelectItem>
                      <SelectItem value="ADMIN">{t('adminFullAccess')}</SelectItem>
                      {isSuperAdmin && <SelectItem value="SUPER_ADMIN">{t('superAdmin') || 'Super Admin'}</SelectItem>}
                      <SelectItem value="OWNER">{t('ownerViewOnly') || 'Owner'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {branches && branches.length > 0 && (
                  <div className="space-y-2">
                    <Label>Assigned Branch</Label>
                    <Select value={form.branchId} onValueChange={v => setForm({ ...form, branchId: v ?? '' })}>
                      <SelectTrigger><SelectValue placeholder="Main Branch (Default)" /></SelectTrigger>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {t('createUser')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users list */}
        <Card className={`${isOwner ? 'col-span-1' : 'col-span-1 md:col-span-2'} border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {initialUsers.map(user => (
                <div key={user.id} className="p-4">
                  {editingId === user.id ? (
                    /* ── Edit row ── */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Name</Label>
                          <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Phone</Label>
                          <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-sm" dir="ltr" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Role</Label>
                          <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v || '' }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CASHIER">Cashier</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              {isSuperAdmin && <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>}
                              <SelectItem value="OWNER">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">New Password <span className="text-gray-400 font-normal">(leave blank to keep)</span></Label>
                          <Input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} className="h-8 text-sm" dir="ltr" placeholder="••••••••" />
                        </div>
                        {branches && branches.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-xs">Branch</Label>
                            <Select value={editForm.branchId} onValueChange={v => setEditForm(f => ({ ...f, branchId: v ?? '' }))}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select branch" /></SelectTrigger>
                              <SelectContent>
                                {branches.map(b => (
                                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditSave(user.id)} disabled={loading} className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
                          <Save size={13} /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8 text-xs">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display row ── */
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${roleBadge(user.role)}`}>
                        {user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-none truncate">{user.name}</p>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5" dir="ltr">@{user.username}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`px-1.5 py-0.5 text-[9px] uppercase tracking-tighter rounded-md font-black ${roleBadge(user.role)}`}>
                            {user.role.replace('_', ' ')}
                          </span>
                          {user.branchId && branches && branches.find(b => b.id === user.branchId) && (
                            <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-tighter rounded-md font-black bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {branches.find(b => b.id === user.branchId)?.name}
                            </span>
                          )}
                          {user.status === 'REJECTED' && (
                            <span className={`px-1.5 py-0.5 text-[9px] uppercase tracking-tighter rounded-md font-black ${statusBadge(user.status)}`}>
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>
                      {!isOwner && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
                            onClick={() => startEdit(user)}
                          >
                            <Pencil size={15} />
                          </Button>
                          {user.id !== session?.user?.id && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                              onClick={() => handleDelete(user.role, user.id)}
                            >
                              <LogOut size={15} />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {initialUsers.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">No active users found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Factory Reset ─────────────────────────────────────────────────── */}
      {isSuperAdmin && (
        <div className="mt-12 space-y-6 pt-12 border-t border-red-100 dark:border-red-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Critical Security Zone</h2>
              <p className="text-sm text-gray-500">Perform irreversible system actions</p>
            </div>
          </div>

          <Card className="border-2 border-red-200 dark:border-red-900/50 shadow-2xl shadow-red-500/5 bg-red-50/30 dark:bg-red-950/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <AlertTriangle size={120} className="text-red-600" />
            </div>
            <CardContent className="p-8 space-y-6 relative z-10">
              <div className="max-w-2xl">
                <h3 className="text-xl font-bold text-red-700 dark:text-red-400">Total System Factory Reset</h3>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-2 leading-relaxed font-medium">
                  This will <strong>permanently erase</strong> all sales, transactions, inventory, purchase orders, staff records,
                  payroll, salary settlements, advances, warranty records, activity logs, and all other operational data.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-red-600/70 dark:text-red-400/70">
                  <li className="flex items-center gap-2"><Check size={13} className="text-red-500" /> All business data will be removed</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-red-500" /> All user accounts will be deleted <strong>except yours</strong></li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-red-500" /> Your Super Admin account is preserved — you will remain logged in</li>
                  <li className="flex items-center gap-2"><Check size={13} className="text-red-500" /> You can create new users immediately after reset</li>
                </ul>
                <p className="text-xs text-red-500 font-bold mt-3 uppercase tracking-widest">⚠ There is absolutely no way to recover this data.</p>
              </div>

              <div className="flex flex-col md:flex-row items-end gap-4 max-w-xl bg-white dark:bg-black/40 p-6 rounded-2xl border border-red-100 dark:border-red-900/40">
                <div className="flex-1 space-y-2">
                  <Label className="text-[10px] font-black uppercase text-red-500 tracking-widest">Type "RESET" to confirm</Label>
                  <input
                    type="text"
                    placeholder="Type RESET here..."
                    className="flex w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-12 border-red-100 focus:ring-red-500 font-black text-center tracking-widest uppercase placeholder:font-normal placeholder:tracking-normal"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value.toUpperCase())}
                  />
                </div>
                <Button
                  variant="destructive"
                  disabled={loading || resetConfirm.trim() !== 'RESET'}
                  onClick={handleReset}
                  className="h-12 px-8 bg-red-600 hover:bg-red-700 font-black text-sm uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all disabled:opacity-30"
                >
                  Confirm Erase
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
