'use client'

/**
 * printer.ts — QZ Tray printing library
 *
 * Handles:
 *   - QZ Tray WebSocket connection & security setup
 *   - HTML-based receipt rendering (supports Arabic item names via Windows fonts)
 *   - Auto paper cut  (raw ESC/POS appended after HTML page)
 *   - Cash drawer control (raw ESC/POS)
 */

// ─── ESC/POS Command Constants ────────────────────────────────────────────────
// Only the raw hardware commands are still needed — text formatting is now
// handled entirely by HTML/CSS and rendered as a bitmap by QZ Tray.
const ESC = '\x1B'
const GS  = '\x1D'

const CMD = {
  CUT_PAPER:   `${GS}\x56\x42\x00`,        // Full paper cut
  CASH_DRAWER: `${ESC}\x70\x00\x19\xFA`,   // Kick cash drawer (pin 2)
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

// ─── HTML Receipt builder ─────────────────────────────────────────────────────
// Renders an HTML page that QZ Tray converts to a bitmap before sending to the
// printer. This is the only reliable way to print Arabic text on ESC/POS
// thermal printers, which have no built-in Unicode Arabic glyph support.
function buildReceiptHtml(data: ReceiptData): string {
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

  const vatAmount = (totalAmount * 15) / 115
  const subtotal  = totalAmount - vatAmount

  // ── Item rows ──
  const itemRows = items.map(item => `
    <tr>
      <td class="item-name">${item.name}</td>
      <td class="item-qty">x${item.quantity}</td>
    </tr>
  `).join('')

  // ── Split payment rows ──
  const splitRows = (paymentMethod === 'SPLIT' && cashAmount !== undefined && networkAmount !== undefined)
    ? `
      <tr><td>Cash</td><td>${cashAmount.toFixed(2)} SAR</td></tr>
      <tr><td>Card</td><td>${networkAmount.toFixed(2)} SAR</td></tr>
    `
    : ''

  const customerRow = customerName
    ? `<tr><td>Customer</td><td>${customerName}</td></tr>`
    : ''

  const noteSection = description
    ? `<div class="divider"></div><div class="note">Note: ${description}</div>`
    : ''

  // ── Full HTML ──
  // Width is 72mm which maps to 80mm paper (8mm margins).
  // Tahoma is the best Arabic-supporting monospace-friendly font on Windows 7+.
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Tahoma', 'Arial', sans-serif;
    font-size: 13px;
    width: 72mm;
    padding: 2mm 1mm;
    direction: rtl;
  }
  .header {
    text-align: center;
    margin-bottom: 4px;
  }
  .store-name {
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 2px;
  }
  .store-sub {
    font-size: 12px;
    color: #333;
  }
  .divider {
    border-top: 1px dashed #000;
    margin: 4px 0;
  }
  .meta-table, .items-table, .totals-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .meta-table td { padding: 1px 2px; }
  .meta-table td:first-child { color: #555; width: 60px; direction: ltr; text-align: left; }
  .meta-table td:last-child { direction: ltr; text-align: left; }
  .items-table th {
    font-weight: bold;
    padding: 2px;
    border-bottom: 1px solid #000;
    font-size: 11px;
    text-align: right;
  }
  .items-table th.item-qty-h { text-align: left; direction: ltr; }
  .items-table td { padding: 3px 2px; vertical-align: top; }
  .item-name { text-align: right; direction: rtl; }
  .item-qty  { text-align: left;  direction: ltr; white-space: nowrap; font-weight: bold; }
  .totals-table td { padding: 2px; }
  .totals-table td:first-child { direction: ltr; text-align: left; color: #444; }
  .totals-table td:last-child  { direction: ltr; text-align: right; font-weight: bold; }
  .total-row td { font-size: 16px; font-weight: bold; padding-top: 4px; }
  .method-row td { font-size: 11px; color: #555; }
  .footer {
    text-align: center;
    margin-top: 6px;
    font-size: 12px;
    color: #333;
  }
  .note { font-size: 11px; color: #444; padding: 2px; }
</style>
</head>
<body>

<div class="header">
  <div class="store-name">LAMAHA</div>
  <div class="store-sub">Car Care Center</div>
</div>

<div class="divider"></div>

<table class="meta-table">
  <tr><td>Date</td><td>${dateStr} ${timeStr}</td></tr>
  <tr><td>Invoice</td><td>${invoiceNumber}</td></tr>
  <tr><td>Cashier</td><td>${cashierName}</td></tr>
  ${customerRow}
</table>

<div class="divider"></div>

<table class="items-table">
  <thead>
    <tr>
      <th>الصنف / Item</th>
      <th class="item-qty-h">الكمية</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
  </tbody>
</table>

<div class="divider"></div>

<table class="totals-table">
  ${splitRows}
  <tr><td>Subtotal (excl. VAT)</td><td>${subtotal.toFixed(2)} SAR</td></tr>
  <tr><td>VAT 15%</td><td>${vatAmount.toFixed(2)} SAR</td></tr>
  <tr class="total-row"><td>TOTAL (incl. VAT)</td><td>${totalAmount.toFixed(2)} SAR</td></tr>
  <tr class="method-row"><td>Method</td><td>${payLabel(paymentMethod)}</td></tr>
</table>

${noteSection}

<div class="divider"></div>

<div class="footer">
  <div>Thank you for your visit!</div>
  <div>شكراً لزيارتكم</div>
</div>

</body>
</html>`
}

// ─── Print receipt ─────────────────────────────────────────────────────────────
export async function printReceipt(data: ReceiptData): Promise<void> {
  const qzInstance = await loadQZ()

  if (!qzInstance.websocket.isActive()) {
    await connectPrinter()
  }

  const printerName = await getPrinterName(qzInstance)

  // pixel/html config: QZ Tray renders the HTML on the local Windows machine
  // (which has Arabic fonts) and sends the resulting bitmap to the printer.
  const config = qzInstance.configs.create(printerName, {
    colorType: 'blackwhite',
    copies: 1,
    units: 'mm',
    size: { width: 80, height: null },  // 80mm thermal paper
  })

  const htmlReceipt = buildReceiptHtml(data)

  const printData: any[] = [
    // 1. Cash drawer kick (raw — must come before the HTML page)
    ...(data.paymentMethod === 'CASH' || data.paymentMethod === 'SPLIT'
      ? [{ type: 'raw', format: 'plain', flavor: 'plain', data: CMD.CASH_DRAWER }]
      : []),
    // 2. Receipt rendered as bitmap (supports Arabic via system fonts)
    { type: 'pixel', format: 'html', flavor: 'plain', data: htmlReceipt },
    // 3. Paper cut (raw — must come after the HTML page)
    { type: 'raw', format: 'plain', flavor: 'plain', data: CMD.CUT_PAPER },
  ]

  await qzInstance.print(config, printData)
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
