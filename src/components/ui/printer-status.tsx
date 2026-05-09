'use client'

import { usePrinter } from '@/providers/printer-provider'
import { Printer, Loader2, WifiOff, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

// QZ Tray listens on this port for secure WebSocket connections (WSS)
const QZ_WSS_TRUST_URL = 'https://localhost:8181'

/**
 * PrinterStatus — a compact badge showing QZ Tray connection state.
 * Renders a colored dot + label; clicking it triggers a reconnect attempt.
 *
 * On HTTPS deployments (e.g. Vercel), QZ Tray requires a one-time browser
 * trust of its localhost SSL certificate. When disconnected/errored on HTTPS,
 * this component shows a direct link to the trust URL.
 */
export function PrinterStatus({ className }: { className?: string }) {
  const { status, reconnect } = usePrinter()

  // Detect HTTPS — on HTTPS, browsers block ws:// and require wss:// from QZ Tray.
  // QZ Tray's wss:// uses a self-signed cert the browser must explicitly trust once.
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const needsCertTrust = isHttps && (status === 'disconnected' || status === 'error')

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

  // On HTTPS with untrusted cert: open the QZ Tray WSS URL so the browser
  // can prompt the user to accept the self-signed certificate.
  if (needsCertTrust) {
    return (
      <a
        href={QZ_WSS_TRUST_URL}
        target="_blank"
        rel="noreferrer"
        title="Click to trust QZ Tray certificate, then return here and refresh"
        onClick={() => {
          // After a short delay, attempt reconnect so the user doesn't need to
          // manually refresh after trusting the cert in the new tab.
          setTimeout(reconnect, 5000)
        }}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border border-transparent transition-all duration-300 select-none cursor-pointer hover:ring-2',
          config.bg,
          config.ring,
          className
        )}
      >
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dot)} />
        </span>
        <span className={cn('flex items-center gap-1 text-[10px] font-black uppercase tracking-widest', config.text)}>
          {config.icon}
          {config.label}
        </span>
      </a>
    )
  }

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
