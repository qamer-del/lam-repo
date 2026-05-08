'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
  connectPrinter,
  disconnectPrinter,
  getPrinterStatus,
  onStatusChange,
  printReceipt,
  openCashDrawer,
  type PrinterStatus,
  type ReceiptData,
} from '@/lib/printer'
import { toast } from 'sonner'

interface PrinterContextValue {
  status: PrinterStatus
  isPrinting: boolean
  print: (data: ReceiptData) => Promise<void>
  openDrawer: () => Promise<void>
  reconnect: () => Promise<void>
}

const PrinterContext = createContext<PrinterContextValue | null>(null)

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PrinterStatus>('disconnected')
  const [isPrinting, setIsPrinting] = useState(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(async () => {
    try {
      await connectPrinter()
    } catch {
      // Silently retry — QZ Tray might not be running yet
      if (mountedRef.current) {
        retryTimerRef.current = setTimeout(connect, 8000)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    // Subscribe to status changes
    const unsub = onStatusChange(s => {
      if (!mountedRef.current) return
      setStatus(s)
      // Auto-retry after disconnect/error
      if (s === 'disconnected' || s === 'error') {
        retryTimerRef.current = setTimeout(connect, 8000)
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
  }, [connect])

  const print = useCallback(async (data: ReceiptData) => {
    if (isPrinting) return
    setIsPrinting(true)
    try {
      await printReceipt(data)
      toast.success('Receipt Printed', { description: `Invoice ${data.invoiceNumber} sent to printer.` })
    } catch (err) {
      console.error('[Printer] Print error:', err)
      toast.error('Printing Failed', {
        description: 'Could not send receipt to printer. Is QZ Tray running?',
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
    <PrinterContext.Provider value={{ status, isPrinting, print, openDrawer, reconnect }}>
      {children}
    </PrinterContext.Provider>
  )
}

export function usePrinter(): PrinterContextValue {
  const ctx = useContext(PrinterContext)
  if (!ctx) throw new Error('usePrinter must be used within PrinterProvider')
  return ctx
}
