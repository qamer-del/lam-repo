'use client'

/**
 * printer.ts — QZ Tray ESC/POS printing library
 *
 * Handles:
 *   - QZ Tray WebSocket connection & security setup
 *   - ESC/POS receipt formatting (English structure, Arabic item names)
 *   - Auto paper cut
 *   - Cash drawer control
 */

// ─── ESC/POS Command Constants ────────────────────────────────────────────────
const ESC  = '\x1B'
const GS   = '\x1D'

const CMD = {
  INIT:           `${ESC}\x40`,           // Initialize printer
  ALIGN_LEFT:     `${ESC}\x61\x00`,       // Left align
  ALIGN_CENTER:   `${ESC}\x61\x01`,       // Center align
  ALIGN_RIGHT:    `${ESC}\x61\x02`,       // Right align
  BOLD_ON:        `${ESC}\x45\x01`,       // Bold text on
  BOLD_OFF:       `${ESC}\x45\x00`,       // Bold text off
  DOUBLE_HEIGHT:  `${GS}\x21\x01`,        // Double height text
  DOUBLE_SIZE:    `${GS}\x21\x11`,        // Double width + height
  NORMAL_SIZE:    `${GS}\x21\x00`,        // Normal size
  LINE_FEED:      '\n',
  FEED_2:         `${ESC}\x64\x02`,       // Feed 2 lines
  FEED_4:         `${ESC}\x64\x04`,       // Feed 4 lines
  CUT_PAPER:      `${GS}\x56\x42\x00`,   // Full cut
  CASH_DRAWER:    `${ESC}\x70\x00\x19\xFA`, // Kick cash drawer pin 2
  DIVIDER:        '--------------------------------',  // 32 chars (58mm paper)
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ReceiptItem {
  name: string           // Arabic name (from inventory)
  quantity: number
  price?: number
  unit?: string
}

export interface ReceiptData {
  invoiceNumber: string
  createdAt: Date
  cashierName: string
  items: ReceiptItem[]
  totalAmount: number
  paymentMethod: string  // 'CASH' | 'NETWORK' | 'SPLIT' | 'TABBY' | 'TAMARA' | 'CREDIT'
  cashAmount?: number
  networkAmount?: number
  customerName?: string
  description?: string
}

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// ─── QZ Tray state ────────────────────────────────────────────────────────────
let qz: any = null
let connectionStatus: PrinterStatus = 'disconnected'
let statusListeners: ((s: PrinterStatus) => void)[] = []
let securityReady = false   // setupSecurity must only run once per session

function setStatus(s: PrinterStatus) {
  connectionStatus = s
  statusListeners.forEach(fn => fn(s))
}

export function getPrinterStatus(): PrinterStatus {
  return connectionStatus
}

export function onStatusChange(fn: (s: PrinterStatus) => void) {
  statusListeners.push(fn)
  return () => { statusListeners = statusListeners.filter(l => l !== fn) }
}

// ─── Load QZ Tray (client-side only) ─────────────────────────────────────────
async function loadQZ(): Promise<any> {
  if (qz) return qz
  const mod = await import('qz-tray')
  qz = mod.default ?? mod
  return qz
}

// ─── Security: certificate + signing ─────────────────────────────────────────
async function setupSecurity(qzInstance: any) {
  qzInstance.security.setCertificatePromise((resolve: any, reject: any) => {
    fetch('/digital-certificate.txt', {
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain' },
    })
      .then(r => (r.ok ? resolve(r.text()) : reject(r.text())))
      .catch(reject)
  })

  qzInstance.security.setSignatureAlgorithm('SHA512')

  qzInstance.security.setSignaturePromise((toSign: string) => {
    return (resolve: any, reject: any) => {
      fetch('/api/print/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: toSign }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.signature) resolve(data.signature)
          else reject(new Error(data.error || 'No signature returned'))
        })
        .catch(reject)
    }
  })
}

// ─── Connect ──────────────────────────────────────────────────────────────────
export async function connectPrinter(): Promise<void> {
  if (connectionStatus === 'connected') return
  setStatus('connecting')

  try {
    const qzInstance = await loadQZ()

    // Security callbacks must be registered ONCE — re-registering them on every
    // retry causes QZ Tray to silently reject the connection.
    if (!securityReady) {
      await setupSecurity(qzInstance)
      securityReady = true
    }

    if (!qzInstance.websocket.isActive()) {
      await qzInstance.websocket.connect({ retries: 3, delay: 1 })
    }

    qzInstance.websocket.setClosedCallbacks(() => setStatus('disconnected'))
    qzInstance.websocket.setErrorCallbacks(() => setStatus('error'))

    setStatus('connected')
  } catch (err) {
    console.error('[Printer] Connection failed:', err)
    setStatus('error')
    throw err
  }
}

export async function disconnectPrinter(): Promise<void> {
  if (!qz || !qz.websocket.isActive()) return
  await qz.websocket.disconnect()
  setStatus('disconnected')
}

export function isPrinterConnected(): boolean {
  return connectionStatus === 'connected'
}

// ─── Get printer name (auto-detect or env fallback) ──────────────────────────
async function getPrinterName(qzInstance: any): Promise<string> {
  // 1. Try env variable first (exact override)
  const envName = process.env.NEXT_PUBLIC_PRINTER_NAME
  if (envName && envName !== 'EPSON TM-T88V') {
    return envName
  }

  // 2. Auto-detect: look for any Epson/thermal receipt printer
  try {
    const allPrinters: string[] = await qzInstance.printers.find()
    const keywords = ['epson', 'tm-t', 'tm-u', 'tm-m', 'receipt', 'thermal', 'pos']
    const found = allPrinters.find(p =>
      keywords.some(kw => p.toLowerCase().includes(kw))
    )
    if (found) {
      console.log(`[Printer] Auto-detected: "${found}"`)
      return found
    }

    // 3. If no Epson found, use env fallback (even if it's the default)
    if (envName) return envName

    // 4. Last resort: use first available printer
    if (allPrinters.length > 0) {
      console.warn(`[Printer] No Epson found, using first available: "${allPrinters[0]}"`)
      return allPrinters[0]
    }
  } catch {
    // QZ Tray might not support listing — fall back silently
  }

  return envName || 'EPSON TM-T88V'
}

// ─── Receipt builder ──────────────────────────────────────────────────────────
function buildReceiptData(data: ReceiptData): string[] {
  const {
    invoiceNumber, createdAt, cashierName, items,
    totalAmount, paymentMethod, cashAmount, networkAmount,
    customerName, description,
  } = data

  const dateStr = new Date(createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const timeStr = new Date(createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  const payLabel = (m: string) => {
    switch (m) {
      case 'CASH':    return 'CASH'
      case 'NETWORK': return 'NETWORK / CARD'
      case 'SPLIT':   return 'SPLIT (CASH + CARD)'
      case 'TABBY':   return 'TABBY'
      case 'TAMARA':  return 'TAMARA'
      case 'CREDIT':  return 'CREDIT (DEFERRED)'
      default:        return m
    }
  }

  const pad = (left: string, right: string, width = 32): string => {
    const gap = width - left.length - right.length
    return gap > 0 ? left + ' '.repeat(gap) + right : left + ' ' + right
  }

  const lines: string[] = [
    CMD.INIT,

    // ── Header ──
    CMD.ALIGN_CENTER,
    CMD.BOLD_ON,
    CMD.DOUBLE_SIZE,
    'LAMAHA\n',
    CMD.NORMAL_SIZE,
    CMD.BOLD_OFF,
    'Car Care Center\n',
    CMD.DIVIDER + '\n',

    // ── Invoice meta ──
    CMD.ALIGN_LEFT,
    `Date : ${dateStr}  ${timeStr}\n`,
    `Inv  : ${invoiceNumber}\n`,
    `By   : ${cashierName}\n`,
  ]

  if (customerName) {
    lines.push(`Cust : ${customerName}\n`)
  }

  lines.push(CMD.DIVIDER + '\n')

  // ── Items ──
  lines.push(CMD.BOLD_ON)
  lines.push(pad('ITEM', 'QTY') + '\n')
  lines.push(CMD.BOLD_OFF)
  lines.push(CMD.DIVIDER + '\n')

  for (const item of items) {
    // Item name (Arabic) — left side, quantity right side
    const qtyStr = `x${item.quantity}`
    // Wrap long names
    const maxNameLen = 32 - qtyStr.length - 1
    const name = item.name.length > maxNameLen
      ? item.name.slice(0, maxNameLen - 1) + '…'
      : item.name
    lines.push(pad(name, qtyStr) + '\n')
  }

  lines.push(CMD.DIVIDER + '\n')

  // ── Totals with VAT breakdown ──
  const vatAmount = (totalAmount * 15) / 115
  const subtotal = totalAmount - vatAmount

  if (paymentMethod === 'SPLIT' && cashAmount !== undefined && networkAmount !== undefined) {
    lines.push(pad('Cash:', `${cashAmount.toFixed(2)} SAR`) + '\n')
    lines.push(pad('Card:', `${networkAmount.toFixed(2)} SAR`) + '\n')
    lines.push(CMD.DIVIDER + '\n')
  }

  lines.push(pad('Subtotal (excl.VAT):', `${subtotal.toFixed(2)}`) + '\n')
  lines.push(pad('VAT 15%:', `${vatAmount.toFixed(2)}`) + '\n')
  lines.push(CMD.DIVIDER + '\n')

  lines.push(CMD.BOLD_ON)
  lines.push(CMD.DOUBLE_HEIGHT)
  lines.push(pad('TOTAL (incl.VAT):', `${totalAmount.toFixed(2)}`) + '\n')
  lines.push(CMD.NORMAL_SIZE)
  lines.push(CMD.BOLD_OFF)

  lines.push(pad('Method:', payLabel(paymentMethod)) + '\n')
  lines.push(CMD.DIVIDER + '\n')

  if (description) {
    lines.push(`Note: ${description}\n`)
    lines.push(CMD.DIVIDER + '\n')
  }

  // ── Footer ──
  lines.push(CMD.ALIGN_CENTER)
  lines.push('Thank you for your visit!\n')
  lines.push('شكراً لزيارتكم\n')
  lines.push(CMD.FEED_4)
  lines.push(CMD.CUT_PAPER)

  return lines
}

// ─── Print receipt ─────────────────────────────────────────────────────────────
export async function printReceipt(data: ReceiptData): Promise<void> {
  const qzInstance = await loadQZ()

  if (!qzInstance.websocket.isActive()) {
    await connectPrinter()
  }

  const printerName = await getPrinterName(qzInstance)
  const config = qzInstance.configs.create(printerName, {
    encoding: 'UTF8',
    copies: 1,
  })

  const receiptLines = buildReceiptData(data)

  await qzInstance.print(config, [
    { type: 'raw', format: 'plain', data: receiptLines.join('') },
  ])

  // Open cash drawer automatically for cash payments
  if (data.paymentMethod === 'CASH' || data.paymentMethod === 'SPLIT') {
    await openCashDrawer()
  }
}

// ─── Open cash drawer ─────────────────────────────────────────────────────────
export async function openCashDrawer(): Promise<void> {
  const qzInstance = await loadQZ()

  if (!qzInstance.websocket.isActive()) {
    await connectPrinter()
  }

  const printerName = await getPrinterName(qzInstance)
  const config = qzInstance.configs.create(printerName)

  await qzInstance.print(config, [
    { type: 'raw', format: 'plain', data: CMD.CASH_DRAWER },
  ])
}
