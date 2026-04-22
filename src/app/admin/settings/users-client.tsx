'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { createUser, deleteUser } from '@/actions/users'
import { factoryReset } from '@/actions/settings'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/providers/language-provider'
import { AlertTriangle, LogOut } from 'lucide-react'
import { useSession } from 'next-auth/react'

export function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter()
  const { data: session } = useSession()
  const isOwner = session?.user?.role === 'OWNER'
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'CASHIER' })
  const [resetConfirm, setResetConfirm] = useState('')

  const { t, locale } = useLanguage()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createUser(form)
      setForm({ name: '', username: '', password: '', role: 'CASHIER' })
      router.refresh()
    } catch (e) {
      alert(t('errorCreatingUser'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userRole: string, id: string) => {
    if (userRole === 'SUPER_ADMIN' && !isSuperAdmin) {
      alert("Only Super Admins can revoke Super Admin accounts.")
      return;
    }
    if(!confirm(t('deleteUserConfirm'))) return;
    try {
      await deleteUser(id)
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  const handleReset = async () => {
    if (resetConfirm !== 'RESET') return;
    
    setLoading(true)
    try {
      const res = await factoryReset()
      if (res.error) {
        alert('Reset Error: ' + res.error)
      } else {
        alert('System has been factory reset.')
        setResetConfirm('')
        router.refresh()
      }
    } catch (err) {
      alert('Server Error during reset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('settings')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('systemAccessControl')}</p>
      </div>

      <div className={`grid grid-cols-1 ${isOwner ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-6`}>
        {!isOwner && (
          <Card className="col-span-1 border border-gray-200 dark:border-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t('createNewUser')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('fullName')}</Label>
                  <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>{t('usernameLogin')}</Label>
                  <Input required value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="text-left" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{t('password')}</Label>
                  <Input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="text-left" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{t('role')}</Label>
                  <Select value={form.role} onValueChange={v => setForm({...form, role: v || 'CASHIER'})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASHIER">{t('cashierLimited')}</SelectItem>
                      <SelectItem value="ADMIN">{t('adminFullAccess')}</SelectItem>
                      <SelectItem value="SUPER_ADMIN">{t('superAdmin') || 'Super Admin'}</SelectItem>
                      <SelectItem value="OWNER">{t('ownerViewOnly') || 'Owner (View Only)'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">{t('createUser')}</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className={`${isOwner ? 'col-span-1' : 'col-span-1 md:col-span-2'} border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden`}>
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                <TableRow>
                  <TableHead className={`whitespace-nowrap ${locale === 'ar' ? 'text-right' : ''}`}>{t('user')}</TableHead>
                  <TableHead className={`whitespace-nowrap ${locale === 'ar' ? 'text-right' : ''}`}>{t('role')}</TableHead>
                  <TableHead className={`whitespace-nowrap ${locale === 'ar' ? 'text-right' : ''}`}>{t('joined')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialUsers.map(user => (
                  <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <TableCell>
                      <div className="font-medium whitespace-nowrap">{user.name}</div>
                      <div className="text-xs text-gray-500" dir="ltr">@{user.username}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap ${
                        user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm whitespace-nowrap">{format(new Date(user.createdAt), 'PP')}</TableCell>
                    <TableCell className={locale === 'ar' ? 'text-left' : 'text-right'}>
                      {!isOwner && <Button variant="destructive" size="sm" onClick={() => handleDelete(user.role, user.id)}>{t('revoke')}</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {initialUsers.map(user => (
              <div key={user.id} className="p-4 flex items-center justify-between gap-4 active:bg-gray-50 dark:active:bg-gray-900 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                    user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-600' :
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.name.substring(0,2).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium" dir="ltr">@{user.username}</p>
                    <div className="pt-1">
                      <span className={`px-1.5 py-0.5 text-[9px] uppercase tracking-tighter rounded-md font-black ${
                        user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' :
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {!isOwner && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(user.role, user.id)}
                  >
                    <LogOut size={18} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {isSuperAdmin && (
        <div className="mt-12 space-y-6 pt-12 border-t border-red-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Critical Security Zone</h2>
              <p className="text-sm text-gray-500">Perform irreversible system actions</p>
            </div>
          </div>

          <Card className="border-2 border-red-200 dark:border-red-900/50 shadow-2xl shadow-red-500/5 bg-red-50/30 dark:bg-red-950/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <AlertTriangle size={120} className="text-red-600" />
            </div>
            <CardContent className="p-8 space-y-8 relative z-10">
              <div className="max-w-2xl">
                <h3 className="text-xl font-bold text-red-700 dark:text-red-400">Total System Factory Reset</h3>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-2 leading-relaxed font-medium">
                  This will PERMANENTLY ERASE all fuel sales, expenses, employee advances, agent ledgers, and settlement reports. 
                  User accounts will be preserved to maintain access. There is no way to recover this data.
                </p>
              </div>

              <div className="flex flex-col md:flex-row items-end gap-4 max-w-xl bg-white dark:bg-black/40 p-6 rounded-2xl border border-red-100 dark:border-red-900/40">
                <div className="flex-1 space-y-2">
                  <Label className="text-[10px] font-black uppercase text-red-500 tracking-widest">Type "RESET" to confirm</Label>
                  <Input 
                    placeholder="Type RESET here..." 
                    className="h-12 border-red-100 focus:ring-red-500 font-black text-center tracking-widest uppercase placeholder:font-normal placeholder:tracking-normal"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                  />
                </div>
                <Button 
                  variant="destructive" 
                  disabled={loading || resetConfirm !== 'RESET'}
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
