'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/providers/language-provider'
import { addStaff } from '@/actions/staff'

export function AddStaffModal({ onAdded }: { onAdded?: () => void }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [salary, setSalary] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await addStaff({ name, baseSalary: parseFloat(salary) })
      setOpen(false)
      setName('')
      setSalary('')
      onAdded?.()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="flex items-center gap-2" />}>
        <UserPlus size={16} />
        Add Staff
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="staffName">Name</Label>
            <Input
              id="staffName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="baseSalary">Base Salary</Label>
            <Input
              id="baseSalary"
              type="number"
              step="0.01"
              required
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="mt-2 text-white bg-blue-600 hover:bg-blue-700">
            {loading ? '...' : t('submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
