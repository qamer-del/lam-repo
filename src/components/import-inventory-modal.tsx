'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { bulkCreateInventoryItems } from '@/actions/inventory'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { InventoryCategory } from '@prisma/client'

const VAT_RATE = 0.15

const VALID_CATEGORIES: InventoryCategory[] = ['POLISH', 'COATING', 'CONSUMABLE', 'EQUIPMENT', 'CHEMICAL', 'OTHER']
const VALID_UNITS = ['pcs', 'L', 'mL', 'kg', 'g', 'roll', 'box', 'set', 'pair', 'bottle', 'can', 'bag', 'unit']

interface ParsedRow {
  rowIndex: number
  name: string
  sku?: string
  category: InventoryCategory
  unit: string
  unitCost: number
  basePrice: number     // From Excel — pre-VAT
  vatAmount: number     // Calculated: basePrice × 0.15
  finalPrice: number    // Calculated: basePrice + vatAmount
  initialStock: number
  reorderLevel: number
  errors: string[]
  isValid: boolean
}

function validateRow(raw: Record<string, any>, rowIndex: number): ParsedRow {
  const errors: string[] = []

  const name = String(raw['name'] || raw['Name'] || raw['ITEM NAME'] || raw['item name'] || '').trim()
  if (!name) errors.push('Name is required')

  const rawCategory = String(raw['category'] || raw['Category'] || raw['CATEGORY'] || 'OTHER').trim().toUpperCase()
  const category: InventoryCategory = VALID_CATEGORIES.includes(rawCategory as InventoryCategory)
    ? (rawCategory as InventoryCategory)
    : 'OTHER'

  const rawUnit = String(raw['unit'] || raw['Unit'] || raw['UNIT'] || 'pcs').trim().toLowerCase()
  const unit = VALID_UNITS.includes(rawUnit) ? rawUnit : 'pcs'

  const unitCost = parseFloat(String(raw['unitCost'] || raw['Unit Cost'] || raw['UNIT COST'] || raw['cost'] || 0))
  if (isNaN(unitCost) || unitCost < 0) errors.push('Unit cost must be a non-negative number')

  // Excel price is always the BASE price (pre-VAT) per specification
  const basePrice = parseFloat(String(raw['sellingPrice'] || raw['Selling Price'] || raw['SELLING PRICE'] || raw['price'] || raw['basePrice'] || raw['Base Price'] || 0))
  if (isNaN(basePrice) || basePrice < 0) errors.push('Selling price must be a non-negative number')

  const vatAmount = parseFloat((basePrice * VAT_RATE).toFixed(2))
  const finalPrice = parseFloat((basePrice + vatAmount).toFixed(2))

  const initialStock = parseFloat(String(raw['initialStock'] || raw['Initial Stock'] || raw['INITIAL STOCK'] || raw['stock'] || 0))
  const reorderLevel = parseFloat(String(raw['reorderLevel'] || raw['Reorder Level'] || raw['REORDER LEVEL'] || raw['reorder'] || 5))

  const sku = String(raw['sku'] || raw['SKU'] || raw['Sku'] || raw['Code'] || raw['CODE'] || '').trim() || undefined

  return {
    rowIndex,
    name,
    sku,
    category,
    unit,
    unitCost: isNaN(unitCost) ? 0 : unitCost,
    basePrice: isNaN(basePrice) ? 0 : basePrice,
    vatAmount: isNaN(basePrice) ? 0 : vatAmount,
    finalPrice: isNaN(basePrice) ? 0 : finalPrice,
    initialStock: isNaN(initialStock) ? 0 : initialStock,
    reorderLevel: isNaN(reorderLevel) ? 5 : reorderLevel,
    errors,
    isValid: errors.length === 0 && !!name,
  }
}

function generateTemplate() {
  const headers = ['name', 'sku', 'category', 'unit', 'unitCost', 'sellingPrice', 'initialStock', 'reorderLevel']
  const sample = [
    ['Meguiar\'s G17 Polish', 'POL-001', 'POLISH', 'bottle', 120, 180, 10, 3],
    ['Ceramic Coating Pro', 'COA-002', 'COATING', 'mL', 450, 700, 5, 2],
    ['Microfiber Towel', 'CON-003', 'CONSUMABLE', 'pcs', 15, 25, 50, 10],
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample])
  ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
  XLSX.writeFile(wb, 'inventory-template.xlsx')
}

const CATEGORY_COLORS: Record<string, string> = {
  POLISH: 'bg-blue-100 text-blue-700',
  COATING: 'bg-purple-100 text-purple-700',
  CONSUMABLE: 'bg-orange-100 text-orange-700',
  EQUIPMENT: 'bg-gray-100 text-gray-700',
  CHEMICAL: 'bg-red-100 text-red-700',
  OTHER: 'bg-slate-100 text-slate-600',
}

export function ImportInventoryModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validRows = rows.filter(r => r.isValid)
  const invalidRows = rows.filter(r => !r.isValid)

  const parseFile = useCallback((file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        const parsed = json.map((row, i) => validateRow(row, i + 2))
        setRows(parsed)
      } catch {
        toast.error('Failed to parse file', { description: 'Please ensure the file is a valid .xlsx or .csv format.' })
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const handleImport = async () => {
    if (validRows.length === 0) return
    setLoading(true)
    try {
      await bulkCreateInventoryItems(validRows.map(r => ({
        name: r.name,
        sku: r.sku,
        category: r.category,
        unit: r.unit,
        unitCost: r.unitCost,
        basePrice: r.basePrice,  // Pre-VAT; action computes vatAmount + finalPrice
        initialStock: r.initialStock,
        reorderLevel: r.reorderLevel,
      })))
      toast.success(`${validRows.length} items imported successfully`, {
        description: invalidRows.length > 0
          ? `${invalidRows.length} rows were skipped due to errors. VAT (15%) applied to all prices.`
          : 'VAT of 15% has been applied to all selling prices.',
      })
      setOpen(false)
      setRows([])
      setFileName('')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error('Import failed', { description: 'An error occurred while importing. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setRows([])
    setFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset() }}>
      <DialogTrigger render={
        <Button
          variant="outline"
          className="h-10 px-4 text-sm gap-2 border-teal-200 text-teal-700 dark:border-teal-800 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 font-bold"
        >
          <FileSpreadsheet size={16} />
          Import Excel
        </Button>
      } />

      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-[2rem] bg-white dark:bg-gray-950">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-600 flex-shrink-0" />

        <div className="p-6 sm:p-8 flex flex-col gap-5 overflow-hidden flex-1 min-h-0">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/10 text-teal-600 rounded-2xl">
                  <FileSpreadsheet size={22} />
                </div>
                Import Inventory from Excel
              </DialogTitle>
              <button
                onClick={generateTemplate}
                className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 px-3 py-1.5 rounded-xl transition"
              >
                <Download size={13} />
                Template
              </button>
            </div>
            <div className="ml-[52px] mt-1 space-y-1">
              <p className="text-sm text-gray-400">Upload an .xlsx or .csv file. Download the template to see the correct format.</p>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30">
                <span>⚡</span>
                VAT 15% will be automatically added to all selling prices during import
              </div>
            </div>
          </DialogHeader>

          {/* Drop Zone */}
          {rows.length === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                dragging
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 scale-[1.01]'
                  : 'border-gray-200 dark:border-gray-700 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/10'
              }`}
            >
              <div className={`p-4 rounded-2xl transition-colors ${dragging ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                <Upload size={28} />
              </div>
              <div className="text-center">
                <p className="font-black text-gray-900 dark:text-white">Drop your Excel file here</p>
                <p className="text-sm text-gray-400 mt-1">or click to browse — .xlsx and .csv supported</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <div className="flex flex-col gap-4 overflow-hidden flex-1 min-h-0">
              {/* Stats bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-800">
                  <FileSpreadsheet size={15} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400 truncate max-w-[180px]">{fileName}</span>
                  <button onClick={handleReset} className="text-gray-400 hover:text-red-500 transition ml-1">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{validRows.length} valid</span>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-100 dark:border-red-900/30">
                    <AlertTriangle size={14} className="text-red-600" />
                    <span className="text-sm font-black text-red-600">{invalidRows.length} errors</span>
                  </div>
                )}
                <span className="text-xs text-gray-400 ml-auto">{rows.length} rows total</span>
              </div>

              {/* VAT Legend */}
              <div className="flex items-center gap-4 text-[11px] font-bold px-1">
                <span className="text-gray-400 uppercase tracking-widest">Price columns:</span>
                <span className="text-gray-600 dark:text-gray-400">Base = from Excel</span>
                <span className="text-amber-600">+VAT = 15%</span>
                <span className="text-teal-600 font-black">Final = stored in system</span>
              </div>

              {/* Preview Table */}
              <div className="overflow-auto flex-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-900/80 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-3 py-3 font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">#</th>
                      <th className="text-left px-3 py-3 font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Name</th>
                      <th className="text-left px-3 py-3 font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">SKU</th>
                      <th className="text-left px-3 py-3 font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Cat.</th>
                      <th className="text-right px-3 py-3 font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Cost</th>
                      <th className="text-right px-3 py-3 font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Base Price</th>
                      <th className="text-right px-3 py-3 font-black text-amber-500 uppercase tracking-wider whitespace-nowrap">+VAT (15%)</th>
                      <th className="text-right px-3 py-3 font-black text-teal-600 uppercase tracking-wider whitespace-nowrap">Final Price</th>
                      <th className="text-right px-3 py-3 font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Stock</th>
                      <th className="text-left px-3 py-3 font-black text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {rows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={`transition-colors ${
                          row.isValid
                            ? 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                            : 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-gray-400 font-mono">{row.rowIndex}</td>
                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white max-w-[160px] truncate">
                          {row.name || <span className="text-red-400 italic">missing</span>}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-gray-400">{row.sku || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase ${CATEGORY_COLORS[row.category]}`}>
                            {row.category}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{row.unitCost.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium text-gray-700 dark:text-gray-300">{row.basePrice.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-amber-600">+{row.vatAmount.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-black text-teal-600">{row.finalPrice.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-blue-600">{row.initialStock}</td>
                        <td className="px-3 py-2.5">
                          {row.isValid ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-bold whitespace-nowrap"><CheckCircle2 size={12} /> OK</span>
                          ) : (
                            <div className="space-y-0.5">
                              {row.errors.map((err, i) => (
                                <span key={i} className="flex items-center gap-1 text-red-500 text-[10px] font-bold whitespace-nowrap">
                                  <AlertTriangle size={10} /> {err}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="rounded-xl border-gray-200 dark:border-gray-800 text-gray-500 font-bold"
                >
                  Choose Another File
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validRows.length === 0 || loading}
                  className="flex-1 h-12 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black rounded-xl shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Importing {validRows.length} items...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      Import {validRows.length} Items with VAT Applied
                      {invalidRows.length > 0 && <span className="opacity-70 text-xs font-medium">({invalidRows.length} skipped)</span>}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
