'use client'

import { useState, useRef, useEffect } from 'react'
import { usePrinter } from '@/providers/printer-provider'
import {
  Printer, Loader2, WifiOff, ShieldAlert,
  ChevronDown, Check, RefreshCw, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSelectedPrinter } from '@/lib/printer'

// QZ Tray listens on this port for secure WebSocket connections (WSS)
const QZ_WSS_TRUST_URL = 'https://localhost:8181'

export function PrinterStatus({ className }: { className?: string }) {
  const { status, reconnect, availablePrinters, selectedPrinter, selectPrinter, refreshPrinters } = usePrinter()
  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const needsCertTrust = isHttps && (status === 'disconnected' || status === 'error')

  // Active printer label: localStorage selection → first available → fallback
  const activePrinter =
    selectedPrinter ||
    (typeof window !== 'undefined' ? getSelectedPrinter() : null) ||
    null

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setRefreshing(true)
    await refreshPrinters()
    setRefreshing(false)
  }

  const handleSelect = (name: string) => {
    selectPrinter(name)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectPrinter(null)
    setOpen(false)
  }

  // ── Styles per connection state ────────────────────────────────────────────
  const cfg = {
    connected: {
      dot: 'bg-emerald-500',
      ring: 'ring-emerald-500/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      label: activePrinter
        ? activePrinter.length > 18 ? activePrinter.slice(0, 18) + '…' : activePrinter
        : 'Printer Ready',
      icon: <Printer size={12} />,
      pulse: false,
    },
    connecting: {
      dot: 'bg-amber-400',
      ring: 'ring-amber-400/30',
      text: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      label: 'Connecting…',
      icon: <Loader2 size={12} className="animate-spin" />,
      pulse: true,
    },
    disconnected: {
      dot: 'bg-gray-400',
      ring: 'ring-gray-400/30',
      text: 'text-gray-500 dark:text-gray-400',
      bg: 'bg-gray-50 dark:bg-gray-800/50',
      label: needsCertTrust ? 'Trust Required' : 'Printer Offline',
      icon: needsCertTrust ? <ShieldAlert size={12} /> : <WifiOff size={12} />,
      pulse: false,
    },
    error: {
      dot: 'bg-red-500',
      ring: 'ring-red-500/30',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      label: needsCertTrust ? 'Trust Required' : 'Printer Error',
      icon: needsCertTrust ? <ShieldAlert size={12} /> : <WifiOff size={12} />,
      pulse: false,
    },
  }[status]

  // ── HTTPS cert-trust link ──────────────────────────────────────────────────
  if (needsCertTrust) {
    return (
      <a
        href={QZ_WSS_TRUST_URL}
        target="_blank"
        rel="noreferrer"
        title="Click to trust QZ Tray certificate, then return and refresh"
        onClick={() => setTimeout(reconnect, 5000)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border border-transparent',
          'transition-all duration-300 select-none cursor-pointer hover:ring-2',
          cfg.bg, cfg.ring, className,
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className={cn('relative inline-flex rounded-full h-2 w-2', cfg.dot)} />
        </span>
        <span className={cn('flex items-center gap-1 text-[10px] font-black uppercase tracking-widest', cfg.text)}>
          {cfg.icon}{cfg.label}
        </span>
      </a>
    )
  }

  // ── Offline / connecting — simple reconnect button ─────────────────────────
  if (status !== 'connected') {
    return (
      <button
        onClick={() => { if (status !== 'connecting') reconnect() }}
        title="Click to reconnect printer"
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border border-transparent',
          'transition-all duration-300 select-none cursor-pointer hover:ring-2',
          cfg.bg, cfg.ring, className,
        )}
      >
        <span className="relative flex h-2 w-2">
          {cfg.pulse && (
            <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', cfg.dot)} />
          )}
          <span className={cn('relative inline-flex rounded-full h-2 w-2', cfg.dot)} />
        </span>
        <span className={cn('flex items-center gap-1 text-[10px] font-black uppercase tracking-widest', cfg.text)}>
          {cfg.icon}{cfg.label}
        </span>
      </button>
    )
  }

  // ── Connected — printer picker ─────────────────────────────────────────────
  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Badge / trigger */}
      <button
        id="printer-picker-trigger"
        onClick={() => setOpen(v => !v)}
        title="Click to change printer"
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border border-transparent w-full',
          'transition-all duration-300 select-none cursor-pointer hover:ring-2',
          cfg.bg, cfg.ring,
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className={cn('relative inline-flex rounded-full h-2 w-2', cfg.dot)} />
        </span>
        <span className={cn('flex items-center gap-1 text-[10px] font-black uppercase tracking-widest flex-1', cfg.text)}>
          {cfg.icon}{cfg.label}
        </span>
        <ChevronDown
          size={10}
          className={cn('transition-transform duration-200 shrink-0', cfg.text, open && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute bottom-full mb-2 left-0 right-0 z-50',
            'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800',
            'overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Select Printer
            </span>
            <div className="flex items-center gap-1">
              <button
                id="printer-refresh-btn"
                onClick={handleRefresh}
                title="Refresh printer list"
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          </div>

          {/* Printer list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {availablePrinters.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] text-gray-400 font-medium">
                No printers detected
              </div>
            ) : (
              availablePrinters.map(name => {
                const isActive = name === (selectedPrinter || activePrinter)
                return (
                  <button
                    key={name}
                    id={`printer-option-${name.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => handleSelect(name)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                      'text-[11px] font-semibold',
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                    )}
                  >
                    <Printer size={12} className="shrink-0 opacity-60" />
                    <span className="flex-1 truncate">{name}</span>
                    {isActive && <Check size={11} className="shrink-0 text-emerald-500" />}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer: clear selection to restore auto-detect */}
          {selectedPrinter && (
            <div className="border-t border-gray-100 dark:border-gray-800 px-2 py-1.5">
              <button
                id="printer-clear-selection"
                onClick={handleClear}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X size={10} />
                Reset to auto-detect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
