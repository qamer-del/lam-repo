'use client'

/**
 * receipt-renderer.ts
 * Builds a full HTML receipt string from a ReceiptTemplateConfig + ReceiptData.
 * This is the Template Layer — it is completely independent of QZ Tray,
 * Epson ESC/POS commands, and the existing printer.ts implementation.
 *
 * Usage:
 *   const html = await renderReceiptHtml(saleData, templateConfig)
 *   // → pass to QZ Tray pixel job, iframe srcdoc, or PDF generator
 */

import type { ReceiptData } from '@/lib/printer'
import type { ReceiptTemplateConfig } from '@/lib/receipt-template'
import { PAPER_WIDTHS, PAPER_PADDING } from '@/lib/receipt-template'
import { generateZatcaQrDataUrl, calcVat15 } from '@/lib/zatca-qr'

// ─── Payment method labels (bilingual) ────────────────────────────────────────
const PAY_LABELS: Record<string, string> = {
  CASH:    'كاش / CASH',
  NETWORK: 'شبكة / CARD',
  SPLIT:   'كاش+شبكة / SPLIT',
  TABBY:   'TABBY',
  TAMARA:  'TAMARA',
  CREDIT:  'آجل / CREDIT',
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function alignCss(a: 'left' | 'center' | 'right'): string {
  return `text-align:${a};`
}

// ─── Main renderer ─────────────────────────────────────────────────────────────
export async function renderReceiptHtml(
  data: ReceiptData,
  config: ReceiptTemplateConfig,
): Promise<string> {
  const {
    invoiceNumber, createdAt, cashierName, items,
    totalAmount, paymentMethod, cashAmount, networkAmount,
    customerName, customerTaxNumber, description,
  } = data

  const {
    store, paperSize, alignment, sections, itemLayout,
    fontSizes, footerText, vatLabel, currencyLabel,
    showBorderLines, compactMode,
  } = config

  const vPad = compactMode ? '3px' : '5px'
  const bodyPad = PAPER_PADDING[paperSize]
  const pageWidth = PAPER_WIDTHS[paperSize]
  const isThermal = paperSize !== 'A4'

  // ── Date/time ──────────────────────────────────────────────────────────────
  const dateStr = new Date(createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const timeStr = new Date(createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  // ── VAT breakdown ──────────────────────────────────────────────────────────
  const { vat: vatAmount, base: subtotal } = calcVat15(totalAmount)
  const payLabel = PAY_LABELS[paymentMethod] ?? paymentMethod

  // ── ZATCA QR ───────────────────────────────────────────────────────────────
  let qrDataUrl: string | null = null
  if (sections.qrCode) {
    qrDataUrl = await generateZatcaQrDataUrl({
      sellerName: store.name,
      vatNumber: store.vatNumber,
      invoiceDate: new Date(createdAt),
      totalWithVat: totalAmount,
      vatAmount,
    })
  }

  // ── Item rows ──────────────────────────────────────────────────────────────
  const showPrice = itemLayout === 'name-qty-price'
  const itemRows = items.map((item, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f7f7f7'
    if (itemLayout === 'compact') {
      return `
        <tr style="background:${bg};">
          <td style="padding:${vPad} 8px;font-size:${fontSizes.items}px;direction:rtl;text-align:right;">
            ${esc(item.name)} × ${item.quantity}${showPrice && item.price != null ? ` — ${item.price.toFixed(2)} ${currencyLabel}` : ''}
          </td>
        </tr>`
    }
    return `
      <tr style="background:${bg};">
        <td style="padding:${vPad} 8px;text-align:right;direction:rtl;word-break:break-all;font-size:${fontSizes.items}px;">${esc(item.name)}</td>
        <td style="padding:${vPad} 8px;text-align:center;white-space:nowrap;font-weight:700;font-size:${fontSizes.items}px;">x${item.quantity}</td>
        ${showPrice ? `<td style="padding:${vPad} 8px;text-align:right;white-space:nowrap;font-size:${fontSizes.items}px;">${item.price != null ? item.price.toFixed(2) : ''}</td>` : ''}
      </tr>`
  }).join('')

  // ── Split payment rows ─────────────────────────────────────────────────────
  const splitRows = sections.splitPaymentDetails && paymentMethod === 'SPLIT' && cashAmount != null && networkAmount != null
    ? `<tr><td style="padding:2px 8px;color:#555;font-size:${fontSizes.body}px;">كاش / Cash</td><td style="padding:2px 8px;text-align:right;font-size:${fontSizes.body}px;">${cashAmount.toFixed(2)}</td></tr>
       <tr><td style="padding:2px 8px;color:#555;font-size:${fontSizes.body}px;">شبكة / Card</td><td style="padding:2px 8px;text-align:right;font-size:${fontSizes.body}px;">${networkAmount.toFixed(2)}</td></tr>`
    : ''

  // ── Customer rows ──────────────────────────────────────────────────────────
  const customerRows = [
    sections.customerName && customerName
      ? `<tr><td style="color:#555;font-size:${fontSizes.body}px;">العميل / Customer</td><td style="font-weight:600;font-size:${fontSizes.body}px;">${esc(customerName)}</td></tr>`
      : '',
    sections.customerVatNumber && customerTaxNumber
      ? `<tr><td style="color:#555;font-size:${fontSizes.body}px;">الرقم الضريبي</td><td style="font-weight:600;font-size:${fontSizes.body}px;">${esc(customerTaxNumber)}</td></tr>`
      : '',
  ].join('')

  // ── Note ───────────────────────────────────────────────────────────────────
  const noteHtml = description
    ? `<div style="margin:4px 8px;padding:4px 6px;border:1px dashed #bbb;font-size:${fontSizes.body}px;color:#444;">
         <span style="color:#888;">ملاحظة / Note:</span> ${esc(description)}
       </div>`
    : ''

  // ── QR ─────────────────────────────────────────────────────────────────────
  const qrHtml = qrDataUrl
    ? `<div style="${alignCss(alignment.footer)}margin:6px 0 2px;">
         <img src="${qrDataUrl}" style="width:110px;height:110px;max-width:100%;" alt="QR"/>
         <div style="font-size:9px;color:#888;margin-top:2px;">ZATCA QR • فاتورة ضريبية مبسطة</div>
       </div>`
    : ''

  // ── Logo ───────────────────────────────────────────────────────────────────
  const logoHtml = sections.logo && store.logoBase64
    ? `<div style="${alignCss(alignment.header)}margin-bottom:6px;">
         <img src="${store.logoBase64}" style="max-width:120px;max-height:80px;object-fit:contain;" alt="Logo"/>
       </div>`
    : ''

  // ── Header ─────────────────────────────────────────────────────────────────
  const sep = showBorderLines
    ? `<div style="border-top:${isThermal ? '1px dashed #aaa' : '1px solid #e5e7eb'};margin:3px 0;"></div>`
    : ''
  const sepSolid = showBorderLines
    ? `<div style="border-top:2px solid #000;margin:3px 0;"></div>`
    : ''

  const headerStyle = `text-align:${alignment.header};padding:8px 6px 5px;${showBorderLines ? 'border-bottom:2px solid #000;' : ''}`
  const footerLines = footerText.split('\n').map(l => `<div>${esc(l)}</div>`).join('')

  // ── Columns for items table ────────────────────────────────────────────────
  const thCols = itemLayout === 'compact'
    ? `<th style="text-align:right;direction:rtl;padding:${vPad} 8px;font-size:${fontSizes.items}px;">الصنف / Item</th>`
    : `<th style="text-align:right;direction:rtl;width:${showPrice ? '55%' : '75%'};padding:${vPad} 8px;font-size:${fontSizes.items}px;">الصنف / Item</th>
       <th style="text-align:center;width:${showPrice ? '20%' : '25%'};padding:${vPad} 8px;font-size:${fontSizes.items}px;">الكمية</th>
       ${showPrice ? `<th style="text-align:right;width:25%;padding:${vPad} 8px;font-size:${fontSizes.items}px;">السعر</th>` : ''}`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    font-family:'Tahoma','Arial',sans-serif;
    font-size:${fontSizes.body}px;
    width:${isThermal ? '100%' : pageWidth + 'px'};
    max-width:${pageWidth}px;
    padding:${bodyPad};
    direction:ltr;
    background:#fff;
    color:#000;
  }
  .meta{width:100%;border-collapse:collapse;}
  .meta td{padding:2px 8px;}
  .meta td:first-child{color:#555;white-space:nowrap;width:45%;}
  .meta td:last-child{font-weight:600;text-align:right;}
  .items{width:100%;border-collapse:collapse;table-layout:fixed;}
  .items thead tr{background:#000;color:#fff;}
  .items th{font-size:${fontSizes.items}px;}
  .totals{width:100%;border-collapse:collapse;}
  .totals td{padding:3px 8px;}
  .totals td:first-child{color:#555;}
  .totals td:last-child{text-align:right;font-weight:600;}
  .grand{width:100%;border-collapse:collapse;}
  .grand td{padding:6px 8px;font-size:${fontSizes.total}px;font-weight:900;${showBorderLines ? 'border-top:2px solid #000;border-bottom:2px solid #000;' : ''}}
  .grand td:last-child{text-align:right;}
  .method{width:100%;border-collapse:collapse;}
  .method td{padding:3px 8px;color:#555;font-size:${fontSizes.body}px;}
  .method td:last-child{text-align:right;font-weight:600;color:#000;}
  .footer{${alignCss(alignment.footer)}padding:6px 4px;font-size:${fontSizes.footer}px;color:#444;${showBorderLines ? 'border-top:2px solid #000;' : ''}margin-top:4px;}
</style>
</head>
<body>

<!-- HEADER -->
<div style="${headerStyle}">
  ${logoHtml}
  ${sections.storeName ? `<div style="font-size:${fontSizes.storeName}px;font-weight:900;letter-spacing:4px;${alignCss(alignment.header)}">${esc(store.name)}</div>` : ''}
  ${sections.phone && store.phone ? `<div style="font-size:${fontSizes.body}px;color:#333;margin-top:2px;">&#128222; ${esc(store.phone)}</div>` : ''}
  ${sections.vatNumber && store.vatNumber ? `<div style="font-size:10px;color:#888;margin-top:1px;">VAT# ${esc(store.vatNumber)}</div>` : ''}
  ${sections.address && store.address ? `<div style="font-size:10px;color:#555;margin-top:1px;">${esc(store.address)}</div>` : ''}
</div>

<!-- META -->
<table class="meta">
  ${sections.invoiceNumber ? `<tr><td>Invoice# / رقم الفاتورة</td><td>${esc(invoiceNumber)}</td></tr>` : ''}
  ${sections.date ? `<tr><td>Date / التاريخ</td><td>${dateStr} ${timeStr}</td></tr>` : ''}
  ${sections.cashierName ? `<tr><td>Cashier / الكاشير</td><td>${esc(cashierName)}</td></tr>` : ''}
  ${customerRows}
</table>

${sep}

<!-- ITEMS -->
${sections.itemsTable ? `
<table class="items">
  <thead><tr>${thCols}</tr></thead>
  <tbody>${itemRows}</tbody>
</table>` : ''}

${sep}

<!-- TOTALS -->
<table class="totals">
  ${splitRows}
  ${sections.subtotal ? `<tr><td>Subtotal (excl. ${vatLabel})</td><td>${subtotal.toFixed(2)} ${currencyLabel}</td></tr>` : ''}
  ${sections.vat ? `<tr><td>${vatLabel}</td><td>${vatAmount.toFixed(2)} ${currencyLabel}</td></tr>` : ''}
</table>

${sections.total ? `
<table class="grand">
  <tr><td>TOTAL / الإجمالي</td><td>${totalAmount.toFixed(2)} ${currencyLabel}</td></tr>
</table>` : ''}

<table class="method">
  ${sections.paymentMethod ? `<tr><td>Payment / الدفع</td><td>${payLabel}</td></tr>` : ''}
</table>

${noteHtml}
${qrHtml}

${sections.footer ? `<div class="footer">${footerLines}</div>` : ''}

</body>
</html>`
}
