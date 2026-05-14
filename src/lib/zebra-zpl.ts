'use client'

/**
 * zebra-zpl.ts — ZPL string generation and Zebra GK420t printing via QZ Tray
 *
 * Uses raw ZPL sent through QZ Tray (same connection, different printer).
 * Does NOT touch the existing receipt printing (Epson) setup.
 */

import type { LabelConfig, LabelData, BarcodeType } from '@/lib/barcode'
import { generateLabelImageBase64 } from '@/lib/label-renderer'

export interface ZebraPrinterSettings {
  printerName: string
  dpi: number
  darkness: number
  printSpeed: number
  labelWidth: number   // mm
  labelHeight: number  // mm
}

// ─── Unit Conversion ─────────────────────────────────────────────────────────

function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi)
}

// ─── ZPL Field Builders ────────────────────────────────────────────────────────

function zplText(x: number, y: number, text: string, fontSize = 20): string {
  // ^CF0 = scalable font, fontSize in dots
  return `^FO${x},${y}^CF0,${fontSize}^FD${text}^FS\n`
}

function zplBarcode(x: number, y: number, type: BarcodeType, value: string, height: number): string {
  switch (type) {
    case 'EAN13':
      return `^FO${x},${y}^BE N,${height},Y,N^FD${value}^FS\n`
    case 'UPC':
      return `^FO${x},${y}^BU N,${height},Y,N^FD${value}^FS\n`
    case 'QR':
      return `^FO${x},${y}^BQ ,2,4^FDMA,${value}^FS\n`
    case 'CODE128':
    default:
      return `^FO${x},${y}^BC N,${height},Y,N,N^FD${value}^FS\n`
  }
}

function zplQr(x: number, y: number, value: string, magnification = 4): string {
  return `^FO${x},${y}^BQ ,2,${magnification}^FDMA,${value}^FS\n`
}

// ─── ZPL Label Builder ────────────────────────────────────────────────────────

export function buildZPL(
  config: LabelConfig,
  item: LabelData,
  settings: ZebraPrinterSettings,
  quantity = 1,
  copies = 1
): string {
  const { dpi, darkness, printSpeed, labelWidth, labelHeight } = settings
  const labelWidthDots = mmToDots(labelWidth, dpi)
  const labelHeightDots = mmToDots(labelHeight, dpi)

  const ml = mmToDots(config.marginLeft, dpi)
  const mt = mmToDots(config.marginTop, dpi)
  const contentWidth = labelWidthDots - mmToDots(config.marginLeft + config.marginRight, dpi)
  const spacing = mmToDots(config.spacing, dpi)

  // Font sizes (ZPL dots)
  const fontName = Math.max(12, mmToDots(config.fontSizeName * 0.35, dpi))
  const fontPrice = Math.max(14, mmToDots(config.fontSizePrice * 0.35, dpi))
  const fontLabel = Math.max(10, mmToDots(config.fontSizeLabel * 0.35, dpi))
  const barcodeH = mmToDots(config.barcodeHeight, dpi)
  const qrMag = Math.max(2, Math.floor(mmToDots(config.qrSize, dpi) / 22))

  const totalCopies = quantity * copies

  let zpl = ''

  // Header: label format settings
  zpl += `^XA\n`
  zpl += `^CI28\n`                                  // UTF-8 encoding (Arabic support)
  zpl += `^MNM\n`                                   // Mark media type
  zpl += `^PW${labelWidthDots}\n`                   // Label width
  zpl += `^LL${labelHeightDots}\n`                  // Label length
  zpl += `~SD${darkness}\n`                         // Darkness
  zpl += `^PR${printSpeed}\n`                       // Print speed
  zpl += `^PQ${totalCopies},0,1,Y\n`               // Print quantity

  let currentY = mt

  const buildBarcodeBlock = () => {
    let block = ''
    if (config.showBarcode && item.barcode && config.barcodeType !== 'QR') {
      const barcodeX = config.textAlignment === 'center'
        ? Math.max(ml, Math.floor((labelWidthDots - contentWidth * 0.8) / 2))
        : ml
      block += zplBarcode(barcodeX, currentY, config.barcodeType, item.barcode, barcodeH)
      currentY += barcodeH + 20 + spacing // +20 for barcode text below
    }
    return block
  }

  if (config.barcodePosition === 'top') {
    zpl += buildBarcodeBlock()
  }

  // Product name (English)
  if (config.showProductName && item.name) {
    zpl += `^FO${ml},${currentY}^CF0,${fontName}^FD${item.name}^FS\n`
    currentY += fontName + spacing
  }

  // Product name (Arabic) — RTL
  if (config.showProductNameAr && item.nameAr) {
    zpl += `^FO${ml},${currentY}^CF0,${fontName}^FD${item.nameAr}^FS\n`
    currentY += fontName + spacing
  }


  // SKU
  if (config.showSku && item.sku) {
    zpl += `^FO${ml},${currentY}^CF0,${fontLabel}^FDSKU: ${item.sku}^FS\n`
    currentY += fontLabel + spacing
  }

  // Price & VAT
  if (config.showPrice && item.sellingPrice) {
    if (config.showVatPrice) {
      if (config.textAlignment === 'right' || config.showProductNameAr) {
        zpl += `^FO${ml},${currentY}^CF0,${fontPrice}^FDالسعر يشمل الضريبة: ${item.sellingPrice.toFixed(2)}^FS\n`
      } else {
        zpl += `^FO${ml},${currentY}^CF0,${fontPrice}^FD${item.sellingPrice.toFixed(2)} SAR (Inc. VAT 15%)^FS\n`
      }
    } else {
      zpl += `^FO${ml},${currentY}^CF0,${fontPrice}^FD${item.sellingPrice.toFixed(2)} SAR^FS\n`
    }
    currentY += fontPrice + spacing
  }

  // Store name
  if (config.showStoreName && config.storeName) {
    zpl += `^FO${ml},${currentY}^CF0,${fontLabel}^FD${config.storeName}^FS\n`
    currentY += fontLabel + spacing
  }

  // Warranty badge
  if (config.showWarrantyBadge && item.hasWarranty) {
    zpl += `^FO${ml},${currentY}^CF0,${fontLabel}^GB${contentWidth},${fontLabel + 4},2^FS\n`
    zpl += `^FO${ml + 4},${currentY + 2}^CF0,${fontLabel}^FD★ WARRANTY^FS\n`
    currentY += fontLabel + 8 + spacing
  }

  // Custom text 1
  if (config.showCustomText1 && config.customText1) {
    zpl += `^FO${ml},${currentY}^CF0,${fontLabel}^FD${config.customText1}^FS\n`
    currentY += fontLabel + spacing
  }

  // Custom text 2
  if (config.showCustomText2 && config.customText2) {
    zpl += `^FO${ml},${currentY}^CF0,${fontLabel}^FD${config.customText2}^FS\n`
    currentY += fontLabel + spacing
  }

  // Barcode (Bottom)
  if (config.barcodePosition !== 'top') {
    zpl += buildBarcodeBlock()
  }

  // QR Code
  if (config.showQrCode && item.barcode) {
    const qrX = config.textAlignment === 'center'
      ? Math.max(ml, Math.floor((labelWidthDots - qrMag * 22) / 2))
      : ml
    zpl += zplQr(qrX, currentY, item.barcode, qrMag)
    currentY += qrMag * 22 + spacing
  }

  zpl += `^XZ\n`

  return zpl
}

// ─── Send ZPL via QZ Tray ─────────────────────────────────────────────────────

async function getQZ(): Promise<any> {
  const mod = await import('qz-tray')
  return mod.default ?? mod
}

export async function printZebraLabel(
  zpl: string,
  printerName: string
): Promise<void> {
  const qz = await getQZ()

  if (!qz.websocket.isActive()) {
    throw new Error('QZ Tray is not connected. Please ensure QZ Tray is running.')
  }

  const config = qz.configs.create(printerName)
  await qz.print(config, [
    { type: 'raw', format: 'plain', data: zpl },
  ])
}

export async function printZebraLabels(
  items: { item: LabelData; quantity: number }[],
  config: LabelConfig,
  settings: ZebraPrinterSettings,
  copies = 1
): Promise<void> {
  const qz = await getQZ()

  if (!qz.websocket.isActive()) {
    throw new Error('QZ Tray is not connected.')
  }

  // Create printer config with strict dimensions and density
  const printerConfig = qz.configs.create(settings.printerName, {
    size: { width: config.width, height: config.height },
    units: 'mm',
    density: settings.dpi,
    margins: 0,
    copies: 1, // We handle quantities by duplicating the image data
  })

  const printData = []
  
  // Generate high-resolution image for each item
  for (const { item, quantity } of items) {
    const base64 = await generateLabelImageBase64(config, item, settings.dpi)
    const totalQty = quantity * copies
    
    // Add the image to the print queue N times
    for (let i = 0; i < totalQty; i++) {
      printData.push({ type: 'image', format: 'base64', data: base64 })
    }
  }

  await qz.print(printerConfig, printData)
}
