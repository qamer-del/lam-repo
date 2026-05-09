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

// ─── ESC/POS Command Constants ─────────────────────────────────────────────────
// Only raw hardware commands are needed — text formatting is handled by HTML/CSS.
const ESC = '\x1B'
const GS  = '\x1D'

const CMD = {
  CUT_PAPER:   `${GS}\x56\x42\x00`,        // Full paper cut
  CASH_DRAWER: `${ESC}\x70\x00\x19\xFA`,   // Kick cash drawer (pin 2)
}

// ─── Types ─────────────────────────────────────────────────────────────────────
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
  customerTaxNumber?: string
  description?: string
}

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// ─── QZ Tray state ─────────────────────────────────────────────────────────────
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

// ─── Load QZ Tray (client-side only) ───────────────────────────────────────────
async function loadQZ(): Promise<any> {
  if (qz) return qz
  const mod = await import('qz-tray')
  qz = mod.default ?? mod
  return qz
}

// ─── Security: certificate + signing ───────────────────────────────────────────
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

// ─── Connect ───────────────────────────────────────────────────────────────────
export async function connectPrinter(): Promise<void> {
  if (connectionStatus === 'connected') return
  setStatus('connecting')

  try {
    const qzInstance = await loadQZ()

    // Security callbacks must be registered ONCE — re-registering on every
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

// ─── Get printer name (auto-detect or env fallback) ────────────────────────────
async function getPrinterName(qzInstance: any): Promise<string> {
  const envName = process.env.NEXT_PUBLIC_PRINTER_NAME
  if (envName && envName !== 'EPSON TM-T88V') return envName

  try {
    const allPrinters: string[] = await qzInstance.printers.find()
    const keywords = ['epson', 'tm-t', 'tm-u', 'tm-m', 'receipt', 'thermal', 'pos']
    const found = allPrinters.find(p => keywords.some(kw => p.toLowerCase().includes(kw)))
    if (found) { console.log(`[Printer] Auto-detected: "${found}"`); return found }
    if (envName) return envName
    if (allPrinters.length > 0) { console.warn(`[Printer] Using first: "${allPrinters[0]}"`); return allPrinters[0] }
  } catch {
    // QZ Tray might not support listing — fall back silently
  }

  return envName || 'EPSON TM-T88V'
}

// ─── Store constants ────────────────────────────────────────────────────────────
// Update these to match your actual business details.
const STORE_NAME   = 'LAMAHA'
const STORE_SUB    = 'Car Care Center'
const STORE_PHONE  = '+966 50 000 0000'
const STORE_VAT_NO = '300000000000000'

// ─── HTML Receipt builder ───────────────────────────────────────────────────────
// QZ Tray renders this HTML page on the local Windows machine (which has Tahoma/
// Arial with full Arabic glyph support), converts it to a bitmap, and sends the
// image to the thermal printer. This is the only reliable way to print Arabic
// on ESC/POS printers that have no built-in Unicode support.
//
// ALIGNMENT FIX: body uses direction:ltr so the 560px viewport fills the paper
// left-to-right. Arabic text is applied per-cell with direction:rtl.
function buildReceiptHtml(data: ReceiptData, qrDataUrl?: string | null): string {
  const {
    invoiceNumber, createdAt, cashierName, items,
    totalAmount, paymentMethod, cashAmount, networkAmount,
    customerName, customerTaxNumber, description,
  } = data

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const dateStr = new Date(createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const timeStr = new Date(createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  const PAY_LABELS: Record<string, string> = {
    CASH:    'كاش / CASH',
    NETWORK: 'شبكة / CARD',
    SPLIT:   'كاش+شبكة / SPLIT',
    TABBY:   'TABBY',
    TAMARA:  'TAMARA',
    CREDIT:  'آجل / CREDIT',
  }
  const payLabel = PAY_LABELS[paymentMethod] ?? paymentMethod

  const vatAmount = (totalAmount * 15) / 115
  const subtotal  = totalAmount - vatAmount

  const itemRows = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f7f7f7'};">
      <td style="padding:5px 8px;text-align:right;direction:rtl;word-break:break-all;">${esc(item.name)}</td>
      <td style="padding:5px 8px;text-align:center;white-space:nowrap;font-weight:700;">x${item.quantity}</td>
    </tr>`).join('')

  const splitRows = (paymentMethod === 'SPLIT' && cashAmount != null && networkAmount != null)
    ? `<tr><td style="padding:2px 8px;color:#555;">كاش / Cash</td><td style="padding:2px 8px;text-align:right;">${cashAmount.toFixed(2)}</td></tr>
       <tr><td style="padding:2px 8px;color:#555;">شبكة / Card</td><td style="padding:2px 8px;text-align:right;">${networkAmount.toFixed(2)}</td></tr>`
    : ''

  const customerRows = [
    customerName      ? `<tr><td style="color:#555;">العميل / Customer</td><td style="font-weight:600;">${esc(customerName)}</td></tr>` : '',
    customerTaxNumber ? `<tr><td style="color:#555;">الرقم الضريبي</td><td style="font-weight:600;">${esc(customerTaxNumber)}</td></tr>` : '',
  ].join('')

  const noteHtml = description
    ? `<div style="margin:4px 8px;padding:4px 6px;border:1px dashed #bbb;font-size:11px;color:#444;">
         <span style="color:#888;">ملاحظة / Note:</span> ${esc(description)}
       </div>`
    : ''

  const qrHtml = qrDataUrl
    ? `<div style="text-align:center;margin:6px 0 2px;">
         <img src="${qrDataUrl}" style="width:110px;height:110px;max-width:100%;" alt="QR"/>
         <div style="font-size:9px;color:#888;margin-top:2px;">ZATCA QR • فاتورة ضريبية مبسطة</div>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    font-family:'Tahoma','Arial',sans-serif;
    font-size:12px;
    width:100%;
    padding:0 4px;
    direction:ltr;
    background:#fff;
    color:#000;
  }
  .hdr{text-align:center;padding:8px 6px 5px;border-bottom:2px solid #000;}
  .hdr-name{font-size:22px;font-weight:900;letter-spacing:4px;}
  .hdr-sub{font-size:11px;color:#444;margin-top:1px;}
  .hdr-phone{font-size:11px;color:#333;margin-top:2px;}
  .hdr-vat{font-size:10px;color:#888;margin-top:1px;}
  .sep{border-top:1px dashed #aaa;margin:3px 0;}
  .sep-solid{border-top:2px solid #000;margin:3px 0;}
  .meta{width:100%;border-collapse:collapse;font-size:11px;margin:4px 0;}
  .meta td{padding:2px 8px;}
  .meta td:first-child{color:#555;white-space:nowrap;width:45%;}
  .meta td:last-child{font-weight:600;text-align:right;}
  .items{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed;}
  .items thead tr{background:#000;color:#fff;}
  .items th{padding:5px 8px;font-size:11px;}
  .items th:first-child{text-align:right;direction:rtl;width:75%;}
  .items th:last-child{text-align:center;width:25%;}
  .totals{width:100%;border-collapse:collapse;font-size:12px;}
  .totals td{padding:3px 8px;}
  .totals td:first-child{color:#555;}
  .totals td:last-child{text-align:right;font-weight:600;}
  .grand{width:100%;border-collapse:collapse;}
  .grand td{padding:6px 8px;font-size:16px;font-weight:900;border-top:2px solid #000;border-bottom:2px solid #000;}
  .grand td:last-child{text-align:right;}
  .method{width:100%;border-collapse:collapse;font-size:11px;}
  .method td{padding:3px 8px;color:#555;}
  .method td:last-child{text-align:right;font-weight:600;color:#000;}
  .footer{text-align:center;padding:6px 4px;font-size:11px;color:#444;border-top:2px solid #000;margin-top:4px;}
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-name">${STORE_NAME}</div>
  <div class="hdr-sub">${STORE_SUB}</div>
  <div class="hdr-phone">&#128222; ${STORE_PHONE}</div>
  <div class="hdr-vat">VAT# ${STORE_VAT_NO}</div>
</div>

<table class="meta">
  <tr><td>Invoice# / رقم الفاتورة</td><td>${esc(invoiceNumber)}</td></tr>
  <tr><td>Date / التاريخ</td><td>${dateStr} ${timeStr}</td></tr>
  <tr><td>Cashier / الكاشير</td><td>${esc(cashierName)}</td></tr>
  ${customerRows}
</table>

<div class="sep"></div>

<table class="items">
  <thead>
    <tr>
      <th style="text-align:right;direction:rtl;">الصنف / Item</th>
      <th>الكمية</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<div class="sep"></div>

<table class="totals">
  ${splitRows}
  <tr><td>Subtotal (excl. VAT)</td><td>${subtotal.toFixed(2)} SAR</td></tr>
  <tr><td>VAT 15%</td><td>${vatAmount.toFixed(2)} SAR</td></tr>
</table>

<table class="grand">
  <tr><td>TOTAL / الإجمالي</td><td>${totalAmount.toFixed(2)} SAR</td></tr>
</table>

<table class="method">
  <tr><td>Payment / الدفع</td><td>${payLabel}</td></tr>
</table>

${noteHtml}

${qrHtml}

<div class="footer">
  <div style="font-size:14px;font-weight:700;">Thank you! شكراً لزيارتكم</div>
  <div style="margin-top:2px;">Tax Invoice • فاتورة ضريبية مبسطة</div>
</div>

</body>
</html>`
}

// ─── Print receipt ──────────────────────────────────────────────────────────────
// Uses exactly 2 qz.print() calls to minimise QZ Tray security prompts:
//   Call 1 (pixel) — HTML receipt rendered as bitmap (Arabic-safe)
//   Call 2 (raw)   — cash drawer kick (if CASH/SPLIT) + paper cut in one job
export async function printReceipt(data: ReceiptData): Promise<void> {
  const qzInstance = await loadQZ()

  if (!qzInstance.websocket.isActive()) {
    await connectPrinter()
  }

  const printerName = await getPrinterName(qzInstance)
  const rawConfig   = qzInstance.configs.create(printerName)
  // size tells QZ Tray the paper dimensions so the HTML viewport matches the
  // printable area. height:null means unlimited (continuous roll).
  const pixelConfig = qzInstance.configs.create(printerName, {
    colorType: 'blackwhite',
    copies: 1,
    units: 'mm',
    size: { width: 80, height: null },
  })

  // Generate ZATCA QR (falls back to null gracefully if qrcode lib fails)
  const { generateZatcaQrDataUrl, calcVat15 } = await import('@/lib/zatca-qr')
  const { vat } = calcVat15(data.totalAmount)
  const qrDataUrl = await generateZatcaQrDataUrl({
    sellerName:   STORE_NAME + ' ' + STORE_SUB,
    vatNumber:    STORE_VAT_NO,
    invoiceDate:  new Date(data.createdAt),
    totalWithVat: data.totalAmount,
    vatAmount:    vat,
  })

  // Call 1: HTML receipt as bitmap
  await qzInstance.print(pixelConfig, [
    { type: 'pixel', format: 'html', flavor: 'plain', data: buildReceiptHtml(data, qrDataUrl) },
  ])

  // Call 2: hardware — cash drawer (if CASH/SPLIT) + paper cut in one raw job
  const isCash = data.paymentMethod === 'CASH' || data.paymentMethod === 'SPLIT'
  await qzInstance.print(rawConfig, [
    { type: 'raw', format: 'plain', data: (isCash ? CMD.CASH_DRAWER : '') + CMD.CUT_PAPER },
  ])
}

// ─── Open cash drawer ───────────────────────────────────────────────────────────
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
