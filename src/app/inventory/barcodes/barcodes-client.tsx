'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Printer, ScanLine, Tag, Settings, Save, Search, 
  Trash2, Copy, Play, CheckCircle2, AlertCircle
} from 'lucide-react'
import { LabelBuilder } from '@/components/label-builder'
import { LabelPreview } from '@/components/label-preview'
import { 
  DEFAULT_LABEL_CONFIG, type LabelConfig, type LabelData 
} from '@/lib/barcode'
import { saveLabelTemplate, deleteLabelTemplate, savePrinterSettings } from '@/actions/barcodes'
import { printZebraLabels, type ZebraPrinterSettings } from '@/lib/zebra-zpl'
import { toast } from 'sonner'
import { useLanguage } from '@/providers/language-provider'

interface BarcodesClientProps {
  initialItems: LabelData[]
  initialTemplates: any[]
  initialPrinterSettings: ZebraPrinterSettings
  userRole: string
}

export function BarcodesClient({
  initialItems,
  initialTemplates,
  initialPrinterSettings,
  userRole
}: BarcodesClientProps) {
  const { t, locale } = useLanguage()
  
  // State
  const [items, setItems] = useState<LabelData[]>(initialItems)
  const [templates, setTemplates] = useState(initialTemplates)
  const [printerSettings, setPrinterSettings] = useState<ZebraPrinterSettings>(initialPrinterSettings)
  
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<LabelData | null>(null)
  const [config, setConfig] = useState<LabelConfig>(DEFAULT_LABEL_CONFIG)
  
  // Batch print state
  const [printQuantities, setPrintQuantities] = useState<Record<number, number>>({})
  const [globalCopies, setGlobalCopies] = useState(1)
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'designer' | 'batch' | 'settings'>('designer')
  
  const [isPrinting, setIsPrinting] = useState(false)
  const [templateName, setTemplateName] = useState('')

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!search) return items
    const s = search.toLowerCase()
    return items.filter(item => 
      item.name.toLowerCase().includes(s) || 
      (item.sku && item.sku.toLowerCase().includes(s)) ||
      (item.barcode && item.barcode.toLowerCase().includes(s))
    )
  }, [items, search])

  // Select first item by default if none selected
  useEffect(() => {
    if (!selectedItem && filteredItems.length > 0) {
      setSelectedItem(filteredItems[0])
    }
  }, [filteredItems, selectedItem])

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name')
      return
    }
    try {
      const newTemplate = await saveLabelTemplate(templateName, config)
      setTemplates([newTemplate, ...templates])
      setTemplateName('')
      toast.success('Template saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template')
    }
  }

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Delete this template?')) return
    try {
      await deleteLabelTemplate(id)
      setTemplates(templates.filter(t => t.id !== id))
      toast.success('Template deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template')
    }
  }

  const handleLoadTemplate = (template: any) => {
    setConfig(template.config)
    toast.success(`Loaded template: ${template.name}`)
  }

  const handleSavePrinterSettings = async () => {
    try {
      await savePrinterSettings(printerSettings)
      toast.success('Printer settings saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save printer settings')
    }
  }

  const handlePrintSingle = async () => {
    if (!selectedItem) {
      toast.error('Select an item to print')
      return
    }
    setIsPrinting(true)
    try {
      const qty = printQuantities[selectedItem.id] || 1
      await printZebraLabels([{ item: selectedItem, quantity: qty }], config, printerSettings, 1)
      toast.success('Print job sent to Zebra printer')
    } catch (err: any) {
      toast.error(err.message || 'Printing failed. Is QZ Tray running?')
      console.error(err)
    } finally {
      setIsPrinting(false)
    }
  }

  const handlePrintBatch = async () => {
    const itemsToPrint = items
      .filter(item => (printQuantities[item.id] || 0) > 0)
      .map(item => ({ item, quantity: printQuantities[item.id]! }))

    if (itemsToPrint.length === 0) {
      toast.error('No items selected for batch printing')
      return
    }

    setIsPrinting(true)
    try {
      await printZebraLabels(itemsToPrint, config, printerSettings, globalCopies)
      toast.success(`Sent ${itemsToPrint.length} items to printer`)
    } catch (err: any) {
      toast.error(err.message || 'Printing failed')
    } finally {
      setIsPrinting(false)
    }
  }

  const updateQuantity = (id: number, val: number) => {
    setPrintQuantities(prev => {
      const next = { ...prev }
      if (val <= 0) delete next[id]
      else next[id] = val
      return next
    })
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Tag className="text-blue-500" />
            Barcode & Labels
          </h1>
          <p className="text-gray-500 text-sm mt-1">Design and print product labels for Zebra printers.</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('designer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'designer' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <ScanLine size={16} /> Designer
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'batch' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Copy size={16} /> Batch Print
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'settings' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Settings size={16} /> Printer Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: Item Selection */}
        <div className="col-span-12 lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col h-[800px]">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left p-3 rounded-xl transition ${
                  selectedItem?.id === item.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  {item.name}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{item.sku || 'No SKU'}</span>
                  {item.barcode ? (
                    <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                      {item.barcodeType}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                      No Barcode
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center/Right Panels based on Tab */}
        {activeTab === 'designer' && (
          <>
            <div className="col-span-12 lg:col-span-5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex flex-col h-[800px] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">Label Configuration</h2>
              <LabelBuilder config={config} onChange={setConfig} />
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center justify-center min-h-[400px]">
                <h2 className="text-lg font-bold mb-4 w-full text-left">Live Preview</h2>
                {selectedItem ? (
                  <div className="bg-gray-100 dark:bg-gray-800 w-full p-4 rounded-xl flex items-center justify-center overflow-hidden min-h-[300px]">
                    <LabelPreview config={config} item={selectedItem} />
                  </div>
                ) : (
                  <div className="text-gray-400 flex flex-col items-center">
                    <ScanLine size={48} className="opacity-20 mb-4" />
                    <p>Select an item to preview</p>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Print Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={selectedItem ? (printQuantities[selectedItem.id] || 1) : 1}
                      onChange={e => selectedItem && updateQuantity(selectedItem.id, parseInt(e.target.value) || 1)}
                      className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
                    />
                  </div>
                  <button
                    onClick={handlePrintSingle}
                    disabled={isPrinting || !selectedItem || !selectedItem.barcode}
                    className="flex-1 mt-5 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition"
                  >
                    <Printer size={18} />
                    {isPrinting ? 'Printing...' : 'Print Label'}
                  </button>
                </div>
                {!selectedItem?.barcode && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 p-3 rounded-lg flex items-start gap-2 text-sm mt-4">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p>This item does not have a barcode assigned. Please edit the item in the Inventory tab to assign one.</p>
                  </div>
                )}
              </div>

              {/* Templates */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-bold mb-3 text-sm">Save Template</h3>
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="Template name..."
                    className="flex-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none"
                  />
                  <button
                    onClick={handleSaveTemplate}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 rounded-lg font-bold text-sm"
                  >
                    Save
                  </button>
                </div>

                <h3 className="font-bold mb-3 text-sm">Saved Templates</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {templates.length === 0 ? (
                    <p className="text-sm text-gray-500">No saved templates</p>
                  ) : (
                    templates.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg group">
                        <button onClick={() => handleLoadTemplate(t)} className="text-sm font-medium flex-1 text-left">
                          {t.name}
                        </button>
                        <button onClick={() => handleDeleteTemplate(t.id)} className="text-red-500 opacity-0 group-hover:opacity-100 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'batch' && (
          <div className="col-span-12 lg:col-span-9 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 h-[800px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Batch Print</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-gray-600">Copies per label:</label>
                  <input
                    type="number" min={1} value={globalCopies}
                    onChange={e => setGlobalCopies(parseInt(e.target.value) || 1)}
                    className="w-16 p-1 text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none"
                  />
                </div>
                <button
                  onClick={handlePrintBatch}
                  disabled={isPrinting || Object.keys(printQuantities).length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  <Printer size={18} />
                  Print Selected
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-800 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                  <tr>
                    <th className="p-4 font-bold">Item Name</th>
                    <th className="p-4 font-bold">SKU</th>
                    <th className="p-4 font-bold">Barcode</th>
                    <th className="p-4 font-bold w-32 text-center">Print Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-4">{item.name}</td>
                      <td className="p-4 text-gray-500">{item.sku || '-'}</td>
                      <td className="p-4 text-gray-500">{item.barcode || '-'}</td>
                      <td className="p-4">
                        <input
                          type="number" min={0}
                          value={printQuantities[item.id] || ''}
                          onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full p-1.5 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="col-span-12 lg:col-span-9 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 h-[800px]">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Printer className="text-blue-500" />
              Zebra Printer Settings
            </h2>
            
            <div className="max-w-xl space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This system uses QZ Tray to communicate directly with Zebra label printers via raw ZPL.
                  Ensure your printer name matches exactly what is shown in Windows Devices & Printers.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Printer Name (OS Name)
                  </label>
                  <input
                    type="text"
                    value={printerSettings.printerName}
                    onChange={e => setPrinterSettings({ ...printerSettings, printerName: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Resolution (DPI)
                    </label>
                    <select
                      value={printerSettings.dpi}
                      onChange={e => setPrinterSettings({ ...printerSettings, dpi: parseInt(e.target.value) })}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                    >
                      <option value={203}>203 DPI (GK420t/GC420t)</option>
                      <option value={300}>300 DPI</option>
                      <option value={600}>600 DPI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Darkness (0-30)
                    </label>
                    <input
                      type="number" min={0} max={30}
                      value={printerSettings.darkness}
                      onChange={e => setPrinterSettings({ ...printerSettings, darkness: parseInt(e.target.value) || 15 })}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Print Speed (IPS)
                    </label>
                    <input
                      type="number" min={2} max={6}
                      value={printerSettings.printSpeed}
                      onChange={e => setPrinterSettings({ ...printerSettings, printSpeed: parseInt(e.target.value) || 4 })}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                    Default Media Dimensions
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Width (mm)
                      </label>
                      <input
                        type="number" min={10}
                        value={printerSettings.labelWidth}
                        onChange={e => setPrinterSettings({ ...printerSettings, labelWidth: parseInt(e.target.value) || 50 })}
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Height (mm)
                      </label>
                      <input
                        type="number" min={10}
                        value={printerSettings.labelHeight}
                        onChange={e => setPrinterSettings({ ...printerSettings, labelHeight: parseInt(e.target.value) || 25 })}
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSavePrinterSettings}
                  className="mt-6 w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition"
                >
                  <Save size={18} />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
