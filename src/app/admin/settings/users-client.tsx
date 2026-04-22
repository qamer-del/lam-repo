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
import { AlertTriangle } from 'lucide-react'
import { useSession } from 'next-auth/react'

export function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter()
  const { data: session } = useSession()
  const isOwner = session?.user?.role === 'OWNER'
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'CASHIER' })

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
    if (confirm('DANGER: Are you absolutely sure you want to completely FACTORY RESET the system? ALL transaction, settlement, and staff data will be permanently deleted!')) {
      try {
        const res = await factoryReset()
        if (res.error) {
          alert('Reset Error: ' + res.error)
        } else {
          alert('System has been factory reset.')
          router.refresh()
        }
      } catch (err) {
        alert('Server Error during reset')
      }
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

        <Card className={`${isOwner ? 'col-span-1' : 'col-span-2'} border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden`}>
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
              <TableRow>
                <TableHead className={locale === 'ar' ? 'text-right' : ''}>{t('user')}</TableHead>
                <TableHead className={locale === 'ar' ? 'text-right' : ''}>{t('role')}</TableHead>
                <TableHead className={locale === 'ar' ? 'text-right' : ''}>{t('joined')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-gray-500" dir="ltr">@{user.username}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">{format(new Date(user.createdAt), 'PP')}</TableCell>
                  <TableCell className={locale === 'ar' ? 'text-left' : 'text-right'}>
                    {!isOwner && <Button variant="destructive" size="sm" onClick={() => handleDelete(user.role, user.id)}>{t('revoke')}</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {isSuperAdmin && (
        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Danger Zone</h2>
          <Card className="border border-red-200 dark:border-red-900 shadow-sm bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Factory Reset System</h3>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                  Permanently delete all financial data, transactions, staff, and agents. This action is irreversible. Admins will not be logged out.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleReset}
                className="whitespace-nowrap bg-red-600 hover:bg-red-700 font-bold"
              >
                <AlertTriangle className="mr-2" size={18} />
                Erase All Data
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
