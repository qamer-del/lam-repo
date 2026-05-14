'use client'

import { useState, useCallback } from 'react'
import {
  Settings2, ChevronDown, ChevronUp, Zap, LayoutTemplate
} from 'lucide-react'
import type { LabelConfig, BarcodeType } from '@/lib/barcode'
import { LABEL_PRESETS, DEFAULT_LABEL_CONFIG } from '@/lib/barcode'
import { useLanguage } from '@/providers/language-provider'

interface LabelBuilderProps {
  config: LabelConfig
  onChange: (config: LabelConfig) => void
}

const BARCODE_TYPES: { value: BarcodeType; label: string }[] = [
  { value: 'CODE128', label: 'CODE128 (Default)' },
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'UPC', label: 'UPC-A' },
  { value: 'QR', label: 'QR Code' },
]

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: any
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
          <Icon size={14} className="text-blue-500" />
          {title}
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  )
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
  children,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => onChange(!checked)}
          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
            checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
              checked ? 'left-4' : 'left-0.5'
            }`}
          />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      </label>
      {checked && children && <div className="ml-12">{children}</div>}
    </div>
  )
}

// ─── Number input ─────────────────────────────────────────────────────────────

function NumInput({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 0.5,
  unit = '',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 shrink-0">{label}</label>
      <div className="flex items-center gap-1 flex-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || min)}
          className="w-full h-8 px-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {unit && <span className="text-xs text-gray-400 w-6">{unit}</span>}
      </div>
    </div>
  )
}

// ─── Text input ────────────────────────────────────────────────────────────────

function TextInput({
  label,
  value,
  onChange,
  placeholder = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
      />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function LabelBuilder({ config, onChange }: LabelBuilderProps) {
  const { locale } = useLanguage()

  const set = useCallback(
    <K extends keyof LabelConfig>(key: K, value: LabelConfig[K]) => {
      onChange({ ...config, [key]: value })
    },
    [config, onChange]
  )

  const applyPreset = (presetKey: string) => {
    const preset = LABEL_PRESETS.find((p) => p.key === presetKey)
    if (!preset) return
    onChange({ ...DEFAULT_LABEL_CONFIG, ...preset.config })
  }

  return (
    <div className="space-y-3 font-sans">

      {/* Preset Templates */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
          <LayoutTemplate size={12} />
          Quick Templates
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {LABEL_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset.key)}
              className="text-left px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-xs font-semibold text-gray-700 dark:text-gray-300 truncate"
            >
              {locale === 'ar' ? preset.nameAr : preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">

        {/* Dimensions */}
        <Section title="Dimensions" icon={Settings2}>
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="Width" value={config.width} onChange={(v) => set('width', v)} min={10} max={300} unit="mm" />
            <NumInput label="Height" value={config.height} onChange={(v) => set('height', v)} min={5} max={300} unit="mm" />
          </div>
          <div className="pt-1 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Margins (mm)</p>
            <div className="grid grid-cols-2 gap-2">
              <NumInput label="Top" value={config.marginTop} onChange={(v) => set('marginTop', v)} min={0} max={20} unit="mm" />
              <NumInput label="Bottom" value={config.marginBottom} onChange={(v) => set('marginBottom', v)} min={0} max={20} unit="mm" />
              <NumInput label="Left" value={config.marginLeft} onChange={(v) => set('marginLeft', v)} min={0} max={20} unit="mm" />
              <NumInput label="Right" value={config.marginRight} onChange={(v) => set('marginRight', v)} min={0} max={20} unit="mm" />
            </div>
          </div>
          <NumInput label="Spacing" value={config.spacing} onChange={(v) => set('spacing', v)} min={0} max={10} step={0.5} unit="mm" />
        </Section>

        {/* Content */}
        <Section title="Content" icon={Zap}>
          <Toggle label="Product Name (EN)" checked={config.showProductName} onChange={(v) => set('showProductName', v)} />
          <Toggle label="Product Name (AR)" checked={config.showProductNameAr} onChange={(v) => set('showProductNameAr', v)} />

          <Toggle label="Barcode" checked={config.showBarcode} onChange={(v) => set('showBarcode', v)}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Barcode Type</label>
              <select
                value={config.barcodeType}
                onChange={(e) => set('barcodeType', e.target.value as BarcodeType)}
                className="w-full h-8 px-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BARCODE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <NumInput label="Height" value={config.barcodeHeight} onChange={(v) => set('barcodeHeight', v)} min={4} max={30} step={1} unit="mm" />
            </div>
          </Toggle>

          <Toggle label="QR Code" checked={config.showQrCode} onChange={(v) => set('showQrCode', v)}>
            <NumInput label="QR Size" value={config.qrSize} onChange={(v) => set('qrSize', v)} min={8} max={50} step={1} unit="mm" />
          </Toggle>

          <Toggle label="SKU / Code" checked={config.showSku} onChange={(v) => set('showSku', v)} />

          <Toggle label="Price" checked={config.showPrice} onChange={(v) => set('showPrice', v)} />

          <Toggle label="Price (Inc. VAT label)" checked={config.showVatPrice} onChange={(v) => set('showVatPrice', v)} />

          <Toggle label="Store Name" checked={config.showStoreName} onChange={(v) => set('showStoreName', v)}>
            <TextInput label="" value={config.storeName} onChange={(v) => set('storeName', v)} placeholder="Store name" />
          </Toggle>

          <Toggle label="Warranty Badge" checked={config.showWarrantyBadge} onChange={(v) => set('showWarrantyBadge', v)} />

          <Toggle label="Custom Text 1" checked={config.showCustomText1} onChange={(v) => set('showCustomText1', v)}>
            <TextInput label="" value={config.customText1} onChange={(v) => set('customText1', v)} placeholder="Custom text..." />
          </Toggle>

          <Toggle label="Custom Text 2" checked={config.showCustomText2} onChange={(v) => set('showCustomText2', v)}>
            <TextInput label="" value={config.customText2} onChange={(v) => set('customText2', v)} placeholder="Custom text..." />
          </Toggle>
        </Section>

        {/* Typography */}
        <Section title="Typography & Size" icon={Settings2} defaultOpen={false}>
          <NumInput label="Name font" value={config.fontSizeName} onChange={(v) => set('fontSizeName', v)} min={3} max={20} step={0.5} unit="mm" />
          <NumInput label="Price font" value={config.fontSizePrice} onChange={(v) => set('fontSizePrice', v)} min={3} max={20} step={0.5} unit="mm" />
          <NumInput label="Label font" value={config.fontSizeLabel} onChange={(v) => set('fontSizeLabel', v)} min={2} max={12} step={0.5} unit="mm" />

          <div className="space-y-1 pt-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Text Alignment</label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => set('textAlignment', align)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition capitalize ${
                    config.textAlignment === align
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
