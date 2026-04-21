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
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/providers/language-provider'

export function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter()
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

  const handleDelete = async (id: string) => {
    if(!confirm(t('deleteUserConfirm'))) return;
    try {
      await deleteUser(id)
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('userManagement')}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('systemAccessControl')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">{t('createUser')}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="col-span-2 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
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
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">{format(new Date(user.createdAt), 'PP')}</TableCell>
                  <TableCell className={locale === 'ar' ? 'text-left' : 'text-right'}>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id)}>{t('revoke')}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
