'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
  connectPrinter,
  disconnectPrinter,
  getPrinterStatus,
  onStatusChange,
  printReceipt,
  openCashDrawer,
  listPrinters,
  getSelectedPrinter,
  setSelectedPrinter,
  type PrinterStatus,
  type ReceiptData,
} from '@/lib/printer'
import { toast } from 'sonner'

interface PrinterContextValue {
  status: PrinterStatus
  isPrinting: boolean
  availablePrinters: string[]
  selectedPrinter: string | null
  print: (data: ReceiptData) => Promise<void>
  openDrawer: () => Promise<void>
  reconnect: () => Promise<void>
  selectPrinter: (name: string | null) => void
  refreshPrinters: () => Promise<void>
}

const PrinterContext = createContext<PrinterContextValue | null>(null)

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PrinterStatus>('disconnected')
  const [isPrinting, setIsPrinting] = useState(false)
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([])
  const [selectedPrinter, setSelectedPrinterState] = useState<string | null>(
    () => (typeof window !== 'undefined' ? getSelectedPrinter() : null)
  )
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const refreshPrinters = useCallback(async () => {
    const list = await listPrinters()
    if (mountedRef.current) setAvailablePrinters(list)
  }, [])

  const connect = useCallback(async () => {
    try {
      await connectPrinter()
      // Fetch printer list once connected
      await refreshPrinters()
    } catch {
      // Silently retry — QZ Tray might not be running yet
      if (mountedRef.current) {
        retryTimerRef.current = setTimeout(connect, 8000)
      }
    }
  }, [refreshPrinters])

  const selectPrinter = useCallback((name: string | null) => {
    setSelectedPrinter(name)
    setSelectedPrinterState(name)
  }, [])

  useEffect(() => {
    mountedRef.current = true

    // Subscribe to status changes
    const unsub = onStatusChange(s => {
      if (!mountedRef.current) return
      setStatus(s)
      // Auto-retry after disconnect/error
      if (s === 'disconnected' || s === 'error') {
        setAvailablePrinters([])
        retryTimerRef.current = setTimeout(connect, 8000)
      }
      // Re-fetch printer list on reconnect
      if (s === 'connected') {
        refreshPrinters()
      }
    })

    // Initial connection attempt
    connect()

    return () => {
      mountedRef.current = false
      unsub()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      disconnectPrinter().catch(() => {})
    }
  }, [connect, refreshPrinters])

  const print = useCallback(async (data: ReceiptData) => {
    if (isPrinting) return
    setIsPrinting(true)
    try {
      await printReceipt(data)
      toast.success('Receipt Printed', { description: `Invoice ${data.invoiceNumber} sent to printer.` })
    } catch (err: any) {
      console.error('[Printer] Print error:', err)
      const detail = err?.message || String(err) || 'Unknown error'
      toast.error('Printing Failed', {
        description: detail.length < 120 ? detail : 'Check browser console for details.',
      })
    } finally {
      setIsPrinting(false)
    }
  }, [isPrinting])

  const openDrawer = useCallback(async () => {
    try {
      await openCashDrawer()
    } catch (err) {
      console.error('[Printer] Drawer error:', err)
      toast.error('Cash Drawer Error', { description: 'Could not open cash drawer.' })
    }
  }, [])

  const reconnect = useCallback(async () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    await connect()
  }, [connect])

  return (
    <PrinterContext.Provider value={{
      status, isPrinting,
      availablePrinters, selectedPrinter,
      print, openDrawer, reconnect,
      selectPrinter, refreshPrinters,
    }}>
      {children}
    </PrinterContext.Provider>
  )
}

export function usePrinter(): PrinterContextValue {
  const ctx = useContext(PrinterContext)
  if (!ctx) throw new Error('usePrinter must be used within PrinterProvider')
  return ctx
}
