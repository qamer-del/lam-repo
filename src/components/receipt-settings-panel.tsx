'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, Copy, Star, RefreshCw,
  Printer, Check, ImageIcon, X, ImagePlus, CheckCircle2
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

// ─── iOS-Inspired Form Helpers ─────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="px-1">
        <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{title}</h3>
        {description && <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800/50">
        {children}
      </div>
    </div>
  )
}

function Row({ label, children, vertical = false }: { label: string; children: React.ReactNode; vertical?: boolean }) {
  return (
    <div className={`px-5 py-3.5 flex ${vertical ? 'flex-col gap-2' : 'items-center justify-between gap-4'} transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/20`}>
      <span className="text-[15px] font-medium text-gray-700 dark:text-gray-200 shrink-0">{label}</span>
      <div className={vertical ? 'w-full' : 'flex-1 flex justify-end min-w-0'}>
        {children}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1 dark:focus:ring-offset-gray-900 shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
      <span className={`absolute top-[2px] left-[2px] w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function Input({ value, onChange, placeholder, type = 'text', className = '' }: { value: string | number; onChange: (v: any) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={placeholder}
      className={`w-full text-right bg-transparent text-[15px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none ${className}`}
    />
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-transparent text-[15px] text-blue-600 dark:text-blue-400 font-medium focus:outline-none appearance-none pr-4 text-right cursor-pointer"
      style={{ WebkitAppearance: 'none' }}
    >
      {options.map(o => <option key={o.value} value={o.value} className="text-gray-900">{o.label}</option>)}
    </select>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ReceiptSettingsPanel({ initialTemplates }: { initialTemplates: ReceiptTemplateRow[] }) {
  const [templates, setTemplates] = useState<ReceiptTemplateRow[]>(initialTemplates)
  const [activeId, setActiveId] = useState<number>(initialTemplates.find(t => t.isDefault)?.id || initialTemplates[0]?.id || 0)
  
  // The currently edited config
  const activeTemplate = templates.find(t => t.id === activeId)
  const [config, setConfig] = useState<ReceiptTemplateConfig | null>(activeTemplate?.config || null)
  const [templateName, setTemplateName] = useState(activeTemplate?.name || '')
  
  const [previewHtml, setPreviewHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const previewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync state when active ID changes
  useEffect(() => {
    const t = templates.find(x => x.id === activeId)
    if (t) {
      setConfig(t.config)
      setTemplateName(t.name)
    }
  }, [activeId, templates])

  // Live preview generator
  useEffect(() => {
    if (!config) return
    if (previewDebounce.current) clearTimeout(previewDebounce.current)
    previewDebounce.current = setTimeout(async () => {
      try {
        const html = await renderReceiptHtml(SAMPLE_DATA, config)
        setPreviewHtml(html)
      } catch { /* silent */ }
    }, 400)
    return () => { if (previewDebounce.current) clearTimeout(previewDebounce.current) }
  }, [config])

  if (!config || !activeTemplate) return null

  // Config updaters
  const setStore = (patch: Partial<typeof config.store>) => setConfig(c => c ? { ...c, store: { ...c.store, ...patch } } : c)
  const setSections = (patch: Partial<typeof config.sections>) => setConfig(c => c ? { ...c, sections: { ...c.sections, ...patch } } : c)
  const setFontSizes = (patch: Partial<typeof config.fontSizes>) => setConfig(c => c ? { ...c, fontSizes: { ...c.fontSizes, ...patch } } : c)
  const setAlignment = (patch: Partial<typeof config.alignment>) => setConfig(c => c ? { ...c, alignment: { ...c.alignment, ...patch } } : c)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateReceiptTemplate(activeId, { name: templateName, config })
      setTemplates(ts => ts.map(t => t.id === activeId ? { ...t, name: templateName, config } : t))
      toast.success('Template saved successfully')
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const t = await createReceiptTemplate('New Template', DEFAULT_TEMPLATE_CONFIG)
      setTemplates(ts => [...ts, t])
      setActiveId(t.id)
      toast.success('Template created')
    } catch { toast.error('Failed to create') }
    finally { setCreating(false) }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultReceiptTemplate(id)
      setTemplates(ts => ts.map(t => ({ ...t, isDefault: t.id === id })))
      toast.success('Active printer template updated')
    } catch { toast.error('Failed to update') }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200 * 1024) { toast.error('Logo must be under 200KB'); return }
    const reader = new FileReader()
    reader.onload = ev => setStore({ logoBase64: ev.target?.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col lg:flex-row items-start gap-8 max-w-[1200px] mx-auto pb-20">
      
      {/* ── LEFT: Settings Editor (iOS Style) ── */}
      <div className="flex-1 w-full space-y-10 min-w-0">

        {/* Template Selector */}
        <Section title="Receipt Templates" description="Select or create a template layout for the thermal printer.">
          {templates.map(t => (
            <div key={t.id} onClick={() => setActiveId(t.id)} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer group transition-colors">
              <button 
                onClick={(e) => { e.stopPropagation(); handleSetDefault(t.id) }} 
                title="Set as Default Printer Template"
                className="shrink-0 focus:outline-none"
              >
                {t.isDefault 
                  ? <CheckCircle2 size={24} className="text-blue-600 dark:text-blue-500 fill-blue-50 dark:fill-blue-900/30" /> 
                  : <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-blue-400 transition-colors" />
                }
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-medium truncate ${activeId === t.id ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {t.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {t.isDefault ? 'Active on Printer' : 'Draft'} • {(t.config as ReceiptTemplateConfig).paperSize}
                </p>
              </div>

              {activeId === t.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); duplicateReceiptTemplate(t.id).then(nt => { setTemplates(ts => [...ts, nt]); setActiveId(nt.id); toast.success('Duplicated') }) }} className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors">
                    <Copy size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) { deleteReceiptTemplate(t.id).then(() => { setTemplates(ts => ts.filter(x => x.id !== t.id)); setActiveId(templates[0]?.id); toast.success('Deleted') }).catch(err => toast.error(err.message)) } }} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
          <div onClick={handleCreate} className="px-5 py-3.5 flex items-center gap-3 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
            {creating ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            <span className="text-[15px] font-medium">Create New Template</span>
          </div>
        </Section>

        {/* Current Template Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Editing: {templateName}</h2>
            <p className="text-sm text-gray-500">Configure branding, layout, and sections</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
            Save Changes
          </button>
        </div>

        {/* Settings Sections */}
        <Section title="General Settings" description="Template name and physical paper size.">
          <Row label="Template Name">
            <Input value={templateName} onChange={setTemplateName} />
          </Row>
          <Row label="Paper Size">
            <Select 
              value={config.paperSize} 
              onChange={v => setConfig({ ...config, paperSize: v as PaperSize })}
              options={[
                { value: '80mm', label: '80mm (Standard Thermal)' },
                { value: '58mm', label: '58mm (Compact Thermal)' },
                { value: 'A4',   label: 'A4 (Standard Paper)' },
              ]}
            />
          </Row>
          <Row label="Compact Mode">
             <Toggle checked={config.compactMode} onChange={v => setConfig({ ...config, compactMode: v })} />
          </Row>
        </Section>

        <Section title="Store Branding" description="Store details and logo printed at the top.">
          <Row label="Store Name">
            <Input value={config.store.name} onChange={v => setStore({ name: v })} placeholder="Store Name" />
          </Row>
          <Row label="Phone Number">
            <Input value={config.store.phone} onChange={v => setStore({ phone: v })} placeholder="+966..." />
          </Row>
          <Row label="VAT Number">
            <Input value={config.store.vatNumber} onChange={v => setStore({ vatNumber: v })} placeholder="15-digit number" />
          </Row>
          <Row label="Address">
            <Input value={config.store.address || ''} onChange={v => setStore({ address: v })} placeholder="Optional" />
          </Row>
          <Row label="Header Alignment">
            <Select value={config.alignment.header} onChange={v => setAlignment({ header: v as Alignment })} options={[{value:'center',label:'Center'},{value:'left',label:'Left'},{value:'right',label:'Right'}]} />
          </Row>
          <Row label="Logo Image" vertical>
            <div className="flex items-center gap-4 mt-2">
              {config.store.logoBase64 ? (
                <div className="relative group">
                  <img src={config.store.logoBase64} alt="Logo" className="h-16 w-auto object-contain rounded-lg border border-gray-200 shadow-sm" />
                  <button onClick={() => setStore({ logoBase64: '' })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                  <ImageIcon size={24} />
                </div>
              )}
              <label className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer text-sm font-medium transition-colors flex items-center gap-2">
                <ImagePlus size={16} />
                Upload Logo
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Black and white images work best on thermal printers (Max 200KB).</p>
          </Row>
        </Section>

        <Section title="Receipt Layout & Visibility" description="Toggle which sections are visible on the printed receipt.">
          <Row label="Print Logo"><Toggle checked={config.sections.logo} onChange={v => setSections({ logo: v })} /></Row>
          <Row label="Store Name"><Toggle checked={config.sections.storeName} onChange={v => setSections({ storeName: v })} /></Row>
          <Row label="Invoice Number & Date"><Toggle checked={config.sections.invoiceNumber} onChange={v => setSections({ invoiceNumber: v, date: v })} /></Row>
          <Row label="Cashier & Customer Info"><Toggle checked={config.sections.cashierName} onChange={v => setSections({ cashierName: v, customerName: v, customerVatNumber: v })} /></Row>
          <Row label="Items Table"><Toggle checked={config.sections.itemsTable} onChange={v => setSections({ itemsTable: v })} /></Row>
          
          {config.sections.itemsTable && (
            <div className="pl-10 pr-5 py-3 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-gray-600 dark:text-gray-400">Item Format</span>
                <Select value={config.itemLayout} onChange={v => setConfig({ ...config, itemLayout: v as ItemLayout })} 
                  options={[{value:'name-qty',label:'Name + Qty (Legacy)'},{value:'name-qty-price',label:'Name + Qty + Price'},{value:'compact',label:'Single Line'}]} />
              </div>
            </div>
          )}

          <Row label="Tax & Totals"><Toggle checked={config.sections.total} onChange={v => setSections({ subtotal: v, vat: v, total: v })} /></Row>
          <Row label="Payment Method Details"><Toggle checked={config.sections.paymentMethod} onChange={v => setSections({ paymentMethod: v, splitPaymentDetails: v })} /></Row>
          <Row label="ZATCA QR Code"><Toggle checked={config.sections.qrCode} onChange={v => setSections({ qrCode: v })} /></Row>
          <Row label="Separator Lines"><Toggle checked={config.showBorderLines} onChange={v => setConfig({ ...config, showBorderLines: v })} /></Row>
        </Section>

        <Section title="Typography & Labels">
          <Row label="Store Name Size (px)">
            <Input type="number" value={config.fontSizes.storeName} onChange={v => setFontSizes({ storeName: v })} className="w-16" />
          </Row>
          <Row label="Body Text Size (px)">
            <Input type="number" value={config.fontSizes.body} onChange={v => setFontSizes({ body: v })} className="w-16" />
          </Row>
          <Row label="Items Text Size (px)">
            <Input type="number" value={config.fontSizes.items} onChange={v => setFontSizes({ items: v })} className="w-16" />
          </Row>
          <Row label="Grand Total Size (px)">
            <Input type="number" value={config.fontSizes.total} onChange={v => setFontSizes({ total: v })} className="w-16" />
          </Row>
          <Row label="VAT Label">
            <Input value={config.vatLabel} onChange={v => setConfig({ ...config, vatLabel: v })} />
          </Row>
          <Row label="Currency Symbol">
            <Input value={config.currencyLabel} onChange={v => setConfig({ ...config, currencyLabel: v })} />
          </Row>
        </Section>

        <Section title="Footer Message">
          <Row label="Footer Text" vertical>
            <textarea
              value={config.footerText}
              onChange={e => setConfig({ ...config, footerText: e.target.value })}
              rows={3}
              placeholder="Text at the bottom of the receipt"
              className="w-full mt-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </Row>
          <Row label="Footer Alignment">
            <Select value={config.alignment.footer} onChange={v => setAlignment({ footer: v as Alignment })} options={[{value:'center',label:'Center'},{value:'left',label:'Left'},{value:'right',label:'Right'}]} />
          </Row>
        </Section>

      </div>

      {/* ── RIGHT: Sticky Live Preview (iOS Style) ── */}
      <div className="w-full lg:w-[380px] shrink-0 sticky top-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden flex flex-col h-[750px]">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 backdrop-blur flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm">
              <Printer size={16} className="text-blue-500" />
              Live Preview
            </div>
            <span className="text-[11px] font-medium bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
              {config.paperSize}
            </span>
          </div>
          
          <div className="flex-1 bg-gray-100/50 dark:bg-[#0a0a0a] overflow-y-auto overflow-x-hidden flex justify-center p-6 custom-scrollbar relative">
            {/* The receipt paper effect */}
            <div className="relative shadow-2xl transition-all duration-300 mx-auto bg-white"
                 style={{ 
                   width: config.paperSize === 'A4' ? '280px' : config.paperSize === '58mm' ? '180px' : '230px', 
                   minHeight: '400px'
                 }}>
              
              {/* Paper zigzag top edge (simulated) */}
              <div className="absolute -top-1 left-0 right-0 h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjQiPjxwYXRoIGQ9Ik0wIDRsNC00IDQgNHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] opacity-50" />
              
              <iframe
                srcDoc={previewHtml}
                className="w-full border-none pointer-events-none"
                style={{ 
                  height: '1200px', // Allow enough space for content 
                  transform: config.paperSize === 'A4' ? 'scale(0.35)' : config.paperSize === '58mm' ? 'scale(0.82)' : 'scale(0.76)',
                  transformOrigin: 'top center',
                }}
                title="Receipt Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
