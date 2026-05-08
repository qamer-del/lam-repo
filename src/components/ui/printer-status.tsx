'use client'

import { usePrinter } from '@/providers/printer-provider'
import { Printer, Loader2, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * PrinterStatus — a compact badge showing QZ Tray connection state.
 * Renders a colored dot + label; clicking it triggers a reconnect attempt.
 */
export function PrinterStatus({ className }: { className?: string }) {
  const { status, reconnect } = usePrinter()

  const config = {
    connected: {
      dot: 'bg-emerald-500',
      ring: 'ring-emerald-500/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      label: 'Printer Ready',
      icon: <Printer size={12} />,
      pulse: false,
    },
    connecting: {
      dot: 'bg-amber-400',
      ring: 'ring-amber-400/30',
      text: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      label: 'Connecting...',
      icon: <Loader2 size={12} className="animate-spin" />,
      pulse: true,
    },
    disconnected: {
      dot: 'bg-gray-400',
      ring: 'ring-gray-400/30',
      text: 'text-gray-500 dark:text-gray-400',
      bg: 'bg-gray-50 dark:bg-gray-800/50',
      label: 'Printer Offline',
      icon: <WifiOff size={12} />,
      pulse: false,
    },
    error: {
      dot: 'bg-red-500',
      ring: 'ring-red-500/30',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      label: 'Printer Error',
      icon: <WifiOff size={12} />,
      pulse: false,
    },
  }[status]

  return (
    <button
      onClick={() => {
        if (status !== 'connected' && status !== 'connecting') {
          reconnect()
        }
      }}
      title={status === 'connected' ? 'Printer connected' : 'Click to reconnect printer'}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border border-transparent transition-all duration-300 select-none',
        config.bg,
        status !== 'connected' && 'cursor-pointer hover:ring-2 ' + config.ring,
        status === 'connected' && 'cursor-default',
        className
      )}
    >
      {/* Animated dot */}
      <span className="relative flex h-2 w-2 items-center justify-center">
        {config.pulse && (
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', config.dot)} />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dot)} />
      </span>

      {/* Icon + label */}
      <span className={cn('flex items-center gap-1 text-[10px] font-black uppercase tracking-widest', config.text)}>
        {config.icon}
        {config.label}
      </span>
    </button>
  )
}
