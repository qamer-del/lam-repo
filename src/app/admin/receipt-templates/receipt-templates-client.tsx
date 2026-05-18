'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, Copy, Star, StarOff, Save,
  Printer, Eye, Settings, FileText, Palette, Layout, Type,
  ChevronRight, UploadCloud, X, RefreshCw,
} from 'lucide-react'
import {
  createReceiptTemplate, updateReceiptTemplate, deleteReceiptTemplate,
  setDefaultReceiptTemplate, duplicateReceiptTemplate,
} from '@/actions/receipt-templates'
import type { ReceiptTemplateRow } from '@/actions/receipt-templates'
import type { ReceiptTemplateConfig, PaperSize, Alignment, ItemLayout } from '@/lib/receipt-template'
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/receipt-template'
import { renderReceiptHtml } from '@/lib/receipt-renderer'
import type { ReceiptData } from '@/lib/printer'

// ─── Sample data for live preview ─────────────────────────────────────────────
const SAMPLE_DATA: ReceiptData = {
  invoiceNumber: 'INV-2026-0042',
  createdAt: new Date(),
  cashierName: 'Ahmad',
  customerName: 'Mohammed Al-Rashidi',
  customerTaxNumber: '310000000000003',
  items: [
    { name: 'براق بلورة للزجاج', quantity: 2, price: 45.0 },
    { name: 'شمع حماية سيراميك', quantity: 1, price: 120.0 },
    { name: 'منظف داخلي متعدد الأغراض', quantity: 3, price: 25.0 },
  ],
  totalAmount: 282.5,
  paymentMethod: 'CASH',
  cashAmount: 282.5,
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'store',    label: 'Store Info',  icon: FileText },
  { id: 'sections', label: 'Sections',    icon: Eye },
  { id: 'layout',   label: 'Layout',      icon: Layout },
  { id: 'fonts',    label: 'Appearance',  icon: Type },
  { id: 'footer',   label: 'Footer',      icon: Palette },
] as const
type TabId = typeof TABS[number]['id']

// ─── Reusable form components ─────────────────────────────────────────────────
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[140px] pt-1">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
    />
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-all duration-200 focus:outline-none ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  )
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function NumberInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ReceiptTemplatesClient({ initialTemplates }: { initialTemplates: ReceiptTemplateRow[] }) {
  const [templates, setTemplates] = useState<ReceiptTemplateRow[]>(initialTemplates)
  const [activeId, setActiveId] = useState<number>(initialTemplates[0]?.id ?? 0)
  const [config, setConfig] = useState<ReceiptTemplateConfig>(
    initialTemplates[0]?.config ?? DEFAULT_TEMPLATE_CONFIG
  )
  const [templateName, setTemplateName] = useState(initialTemplates[0]?.name ?? '')
  const [activeTab, setActiveTab] = useState<TabId>('store')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const previewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Select a template ──────────────────────────────────────────────────────
  const selectTemplate = (t: ReceiptTemplateRow) => {
    setActiveId(t.id)
    setConfig(t.config)
    setTemplateName(t.name)
  }

  // ── Config updater helpers ─────────────────────────────────────────────────
  const setStore = (patch: Partial<typeof config.store>) =>
    setConfig(c => ({ ...c, store: { ...c.store, ...patch } }))
  const setSections = (patch: Partial<typeof config.sections>) =>
    setConfig(c => ({ ...c, sections: { ...c.sections, ...patch } }))
  const setAlignment = (patch: Partial<typeof config.alignment>) =>
    setConfig(c => ({ ...c, alignment: { ...c.alignment, ...patch } }))
  const setFontSizes = (patch: Partial<typeof config.fontSizes>) =>
    setConfig(c => ({ ...c, fontSizes: { ...c.fontSizes, ...patch } }))

  // ── Live preview ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (previewDebounce.current) clearTimeout(previewDebounce.current)
    previewDebounce.current = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const html = await renderReceiptHtml(SAMPLE_DATA, config)
        setPreviewHtml(html)
      } catch { /* preview fails silently */ }
      finally { setPreviewLoading(false) }
    }, 500)
    return () => { if (previewDebounce.current) clearTimeout(previewDebounce.current) }
  }, [config])

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateReceiptTemplate(activeId, { name: templateName, config })
      setTemplates(ts => ts.map(t => t.id === activeId ? { ...t, name: templateName, config } : t))
      toast.success('Template saved')
    } catch { toast.error('Failed to save template') }
    finally { setSaving(false) }
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true)
    try {
      const t = await createReceiptTemplate('New Template', DEFAULT_TEMPLATE_CONFIG)
      setTemplates(ts => [...ts, t])
      selectTemplate(t)
      toast.success('New template created')
    } catch { toast.error('Failed to create template') }
    finally { setCreating(false) }
  }

  // ── Set default ────────────────────────────────────────────────────────────
  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultReceiptTemplate(id)
      setTemplates(ts => ts.map(t => ({ ...t, isDefault: t.id === id })))
      toast.success('Default template updated')
    } catch { toast.error('Failed to update default') }
  }

  // ── Duplicate ──────────────────────────────────────────────────────────────
  const handleDuplicate = async (id: number) => {
    try {
      const t = await duplicateReceiptTemplate(id)
      setTemplates(ts => [...ts, t])
      selectTemplate(t)
      toast.success('Template duplicated')
    } catch { toast.error('Failed to duplicate') }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (templates.length <= 1) { toast.error('Cannot delete the only template'); return }
    if (!confirm('Delete this template?')) return
    try {
      await deleteReceiptTemplate(id)
      const remaining = templates.filter(t => t.id !== id)
      setTemplates(remaining)
      selectTemplate(remaining[0])
      toast.success('Template deleted')
    } catch (e: any) { toast.error(e.message || 'Failed to delete') }
  }

  // ── Logo upload ────────────────────────────────────────────────────────────
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200 * 1024) { toast.error('Logo must be under 200KB'); return }
    const reader = new FileReader()
    reader.onload = ev => setStore({ logoBase64: ev.target?.result as string })
    reader.readAsDataURL(file)
  }

  const active = templates.find(t => t.id === activeId)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* ── LEFT: Template list ──────────────────────────────────────────────── */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Templates</h1>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
              title="New template"
            >
              {creating ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
            </button>
          </div>
          <p className="text-xs text-gray-400">Click to edit • ★ = default print</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {templates.map(t => (
            <div
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
                t.id === activeId
                  ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {t.isDefault && <Star size={11} className="text-amber-500 shrink-0 fill-amber-500" />}
                <span className={`text-xs font-bold truncate ${t.id === activeId ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {t.name}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{(t.config as ReceiptTemplateConfig).paperSize}</p>

              {/* Actions on hover */}
              <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1">
                <button onClick={e => { e.stopPropagation(); handleSetDefault(t.id) }} title="Set as default" className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500 transition-colors">
                  {t.isDefault ? <StarOff size={11} /> : <Star size={11} />}
                </button>
                <button onClick={e => { e.stopPropagation(); handleDuplicate(t.id) }} title="Duplicate" className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 transition-colors">
                  <Copy size={11} />
                </button>
                <button onClick={e => { e.stopPropagation(); handleDelete(t.id) }} title="Delete" className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── MIDDLE: Settings editor ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center gap-4">
          <div className="flex-1">
            <input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="text-lg font-black bg-transparent border-none outline-none text-gray-900 dark:text-white w-full"
              placeholder="Template name…"
            />
            <p className="text-xs text-gray-400">
              {active?.isDefault ? '⭐ Default template — used for all prints' : 'Not the default print template'}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-all disabled:opacity-60 shadow-lg shadow-blue-500/20"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl space-y-0 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-2">

            {/* STORE INFO */}
            {activeTab === 'store' && <>
              <FormRow label="Store Name">
                <TextInput value={config.store.name} onChange={v => setStore({ name: v })} placeholder="Store name" />
              </FormRow>
              <FormRow label="Phone">
                <TextInput value={config.store.phone} onChange={v => setStore({ phone: v })} placeholder="+966…" />
              </FormRow>
              <FormRow label="VAT Number">
                <TextInput value={config.store.vatNumber} onChange={v => setStore({ vatNumber: v })} placeholder="15-digit VAT#" />
              </FormRow>
              <FormRow label="Address">
                <TextInput value={config.store.address ?? ''} onChange={v => setStore({ address: v })} placeholder="Optional" />
              </FormRow>
              <FormRow label="Logo">
                <div className="space-y-2">
                  {config.store.logoBase64 ? (
                    <div className="flex items-center gap-3">
                      <img src={config.store.logoBase64} className="h-14 rounded-lg object-contain border border-gray-200" alt="Logo" />
                      <button onClick={() => setStore({ logoBase64: '' })} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><X size={14} /></button>
                    </div>
                  ) : null}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-400 transition-colors text-sm text-gray-500">
                    <UploadCloud size={16} />
                    Upload logo (max 200KB)
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </FormRow>
            </>}

            {/* SECTIONS */}
            {activeTab === 'sections' && <>
              {([
                ['logo',              'Logo'],
                ['storeName',         'Store Name'],
                ['phone',             'Phone Number'],
                ['vatNumber',         'VAT Number'],
                ['address',           'Address'],
                ['invoiceNumber',     'Invoice Number'],
                ['date',              'Date & Time'],
                ['cashierName',       'Cashier Name'],
                ['customerName',      'Customer Name'],
                ['customerVatNumber', 'Customer VAT#'],
                ['itemsTable',        'Items Table'],
                ['subtotal',          'Subtotal (excl. VAT)'],
                ['vat',               'VAT Row'],
                ['total',             'Grand Total'],
                ['paymentMethod',     'Payment Method'],
                ['splitPaymentDetails','Split Payment Detail'],
                ['discount',          'Discount Row'],
                ['qrCode',            'ZATCA QR Code'],
                ['footer',            'Footer Text'],
              ] as [keyof typeof config.sections, string][]).map(([key, label]) => (
                <FormRow key={key} label={label}>
                  <Toggle
                    checked={config.sections[key]}
                    onChange={v => setSections({ [key]: v })}
                    label={config.sections[key] ? 'Visible' : 'Hidden'}
                  />
                </FormRow>
              ))}
            </>}

            {/* LAYOUT */}
            {activeTab === 'layout' && <>
              <FormRow label="Paper Size">
                <SelectInput
                  value={config.paperSize}
                  onChange={v => setConfig(c => ({ ...c, paperSize: v as PaperSize }))}
                  options={[
                    { value: '80mm', label: '80mm — Standard thermal' },
                    { value: '58mm', label: '58mm — Compact thermal' },
                    { value: 'A4',   label: 'A4 — Standard paper' },
                  ]}
                />
              </FormRow>
              <FormRow label="Header Alignment">
                <SelectInput value={config.alignment.header} onChange={v => setAlignment({ header: v as Alignment })}
                  options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
              </FormRow>
              <FormRow label="Footer Alignment">
                <SelectInput value={config.alignment.footer} onChange={v => setAlignment({ footer: v as Alignment })}
                  options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
              </FormRow>
              <FormRow label="Item Layout">
                <SelectInput value={config.itemLayout} onChange={v => setConfig(c => ({ ...c, itemLayout: v as ItemLayout }))}
                  options={[
                    { value: 'name-qty',       label: 'Name + Qty (current)' },
                    { value: 'name-qty-price', label: 'Name + Qty + Price' },
                    { value: 'compact',        label: 'Compact (single line)' },
                  ]} />
              </FormRow>
              <FormRow label="VAT Label">
                <TextInput value={config.vatLabel} onChange={v => setConfig(c => ({ ...c, vatLabel: v }))} placeholder="VAT 15%" />
              </FormRow>
              <FormRow label="Currency">
                <TextInput value={config.currencyLabel} onChange={v => setConfig(c => ({ ...c, currencyLabel: v }))} placeholder="SAR" />
              </FormRow>
              <FormRow label="Border Lines">
                <Toggle checked={config.showBorderLines} onChange={v => setConfig(c => ({ ...c, showBorderLines: v }))} label="Show separator lines" />
              </FormRow>
              <FormRow label="Compact Mode">
                <Toggle checked={config.compactMode} onChange={v => setConfig(c => ({ ...c, compactMode: v }))} label="Reduce padding (58mm rolls)" />
              </FormRow>
            </>}

            {/* FONTS / APPEARANCE */}
            {activeTab === 'fonts' && <>
              {([
                ['storeName', 'Store Name (px)', 10, 48],
                ['body',      'Body Text (px)',   8, 20],
                ['items',     'Item Rows (px)',   8, 20],
                ['total',     'Grand Total (px)', 10, 36],
                ['footer',    'Footer (px)',       8, 18],
              ] as [keyof typeof config.fontSizes, string, number, number][]).map(([key, label, min, max]) => (
                <FormRow key={key} label={label}>
                  <div className="flex items-center gap-3">
                    <NumberInput value={config.fontSizes[key]} onChange={v => setFontSizes({ [key]: v })} min={min} max={max} />
                    <span className="text-xs text-gray-400 whitespace-nowrap">{config.fontSizes[key]}px</span>
                  </div>
                </FormRow>
              ))}
            </>}

            {/* FOOTER */}
            {activeTab === 'footer' && <>
              <FormRow label="Footer Text">
                <textarea
                  value={config.footerText}
                  onChange={e => setConfig(c => ({ ...c, footerText: e.target.value }))}
                  rows={4}
                  placeholder="Each line break = new line on receipt"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </FormRow>
              <FormRow label="Thank You Msg">
                <TextInput value={config.thankYouMessage} onChange={v => setConfig(c => ({ ...c, thankYouMessage: v }))} />
              </FormRow>
            </>}

          </div>
        </div>
      </div>

      {/* ── RIGHT: Live preview ──────────────────────────────────────────────── */}
      <div className="w-80 bg-gray-900 dark:bg-gray-950 border-l border-gray-800 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer size={14} className="text-gray-400" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Live Preview</span>
          </div>
          <span className="text-[10px] text-gray-600 font-medium">{config.paperSize}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex justify-center">
          <div className="relative">
            {/* Paper frame */}
            <div
              className="bg-white shadow-2xl shadow-black/50 rounded-sm overflow-hidden"
              style={{
                width: config.paperSize === 'A4' ? '210px' : config.paperSize === '58mm' ? '120px' : '160px',
                minHeight: 200,
              }}
            >
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={16} className="animate-spin text-gray-300" />
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border-none"
                  style={{ height: '600px', pointerEvents: 'none' }}
                  title="Receipt preview"
                />
              )}
            </div>
            {/* Paper shadow effect */}
            <div className="absolute -bottom-2 left-2 right-2 h-4 bg-black/20 blur-md rounded-full" />
          </div>
        </div>

        <div className="p-3 border-t border-gray-800 text-center text-[10px] text-gray-600">
          Preview updates automatically • Sample data shown
        </div>
      </div>

    </div>
  )
}
