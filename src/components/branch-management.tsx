'use client'

import { useState, useTransition } from 'react'
import { Branch } from '@prisma/client'
import { createBranch, updateBranch, deleteBranch, assignUserToBranch } from '@/actions/branches'
import { Building2, MapPin, Pencil, Trash2, Plus, CheckCircle, XCircle } from 'lucide-react'

type AnyBranch = Branch & { [key: string]: any }

interface Props {
  branches: AnyBranch[]
  users: { id: string; name: string; role: string; branchId: number | null }[]
}

export function BranchManagement({ branches: initialBranches, users }: Props) {
  const [branches, setBranches] = useState(initialBranches)
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const getBranchName = (id: number | null) =>
    branches.find(b => b.id === id)?.name ?? 'Main Branch'

  const handleCreate = () => {
    if (!newName.trim()) return
    setError('')
    startTransition(async () => {
      try {
        const branch = await createBranch({ name: newName.trim(), location: newLocation.trim() || undefined })
        setBranches(prev => [...prev, branch as AnyBranch])
        setNewName('')
        setNewLocation('')
        setShowAddForm(false)
        setSuccess('Branch created successfully')
        setTimeout(() => setSuccess(''), 3000)
      } catch (e: any) { setError(e.message) }
    })
  }

  const handleUpdate = (id: number, name: string, location: string) => {
    startTransition(async () => {
      try {
        await updateBranch(id, { name, location: location || undefined })
        setBranches(prev => prev.map(b => b.id === id ? { ...b, name, location } : b))
        setEditingId(null)
        setSuccess('Branch updated')
        setTimeout(() => setSuccess(''), 3000)
      } catch (e: any) { setError(e.message) }
    })
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this branch? Existing data will remain but lose branch association.')) return
    startTransition(async () => {
      try {
        await deleteBranch(id)
        setBranches(prev => prev.filter(b => b.id !== id))
        setSuccess('Branch deleted')
        setTimeout(() => setSuccess(''), 3000)
      } catch (e: any) { setError(e.message) }
    })
  }

  const handleAssign = (userId: string, branchId: number) => {
    startTransition(async () => {
      try {
        await assignUserToBranch(userId, branchId)
        setSuccess('User assigned to branch')
        setTimeout(() => setSuccess(''), 3000)
      } catch (e: any) { setError(e.message) }
    })
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Branch Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage store branches and assign users
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setError('') }}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 shrink-0"
        >
          <Plus size={16} />
          Add Branch
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <XCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
          <CheckCircle size={16} className="shrink-0" />
          {success}
        </div>
      )}

      {/* Add Branch Form */}
      {showAddForm && (
        <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-4">New Branch</p>
          <div className="flex flex-wrap gap-3">
            <input
              className="flex-1 min-w-[180px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Branch Name *"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <input
              className="flex-1 min-w-[180px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Location (optional)"
              value={newLocation}
              onChange={e => setNewLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isPending || !newName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {isPending ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setError('') }}
                className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map(branch => (
          <BranchCard
            key={branch.id}
            branch={branch}
            isEditing={editingId === branch.id}
            onEdit={() => setEditingId(branch.id)}
            onCancelEdit={() => setEditingId(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            isPending={isPending}
            isOnly={branches.length === 1}
          />
        ))}
      </div>

      {/* User Assignment Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">User ↔ Branch Assignment</h3>
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assign Branch</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{user.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{getBranchName(user.branchId)}</td>
                  <td className="px-4 py-3">
                    <select
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      defaultValue={user.branchId ?? 1}
                      onChange={e => handleAssign(user.id, Number(e.target.value))}
                      disabled={isPending}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function BranchCard({
  branch, isEditing, onEdit, onCancelEdit, onUpdate, onDelete, isPending, isOnly
}: {
  branch: AnyBranch
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onUpdate: (id: number, name: string, location: string) => void
  onDelete: (id: number) => void
  isPending: boolean
  isOnly: boolean
}) {
  const [editName, setEditName] = useState(branch.name)
  const [editLocation, setEditLocation] = useState(branch.location ?? '')

  if (isEditing) {
    return (
      <div className="p-5 bg-white dark:bg-gray-800 border-2 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20 rounded-2xl space-y-3">
        <input
          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          placeholder="Branch Name"
        />
        <input
          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={editLocation}
          onChange={e => setEditLocation(e.target.value)}
          placeholder="Location (optional)"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate(branch.id, editName, editLocation)}
            disabled={isPending}
            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="flex-1 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-4 ${!branch.isActive ? 'opacity-60' : ''}`}>
      {/* Card Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 rounded-xl shrink-0">
          <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base truncate text-gray-900 dark:text-white">{branch.name}</div>
          {branch.location && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              <MapPin size={11} />
              {branch.location}
            </div>
          )}
          <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
            branch.isActive
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}>
            {branch.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-gray-700 dark:text-gray-300"
        >
          <Pencil size={12} />
          Edit
        </button>
        {!isOnly && (
          <button
            onClick={() => onDelete(branch.id)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all disabled:opacity-50"
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
