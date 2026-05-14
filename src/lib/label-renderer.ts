'use client'

import type { LabelConfig, LabelData } from '@/lib/barcode'

export async function generateLabelImageBase64(
  config: LabelConfig,
  item: LabelData,
  dpi: number
): Promise<string> {
  const mmToPx = (mm: number) => (mm / 25.4) * dpi

  const pxW = Math.round(mmToPx(config.width))
  const pxH = Math.round(mmToPx(config.height))

  const canvas = document.createElement('canvas')
  canvas.width = pxW
  canvas.height = pxH

  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, pxW, pxH)

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, pxW, pxH)

  const ml = mmToPx(config.marginLeft)
  const mt = mmToPx(config.marginTop)
  const mr = mmToPx(config.marginRight)
  const mb = mmToPx(config.marginBottom)
  const contentW = pxW - ml - mr
  const spacing = mmToPx(config.spacing)

  let currentY = mt
  let hasOverflow = false

  const checkOverflow = (nextY: number) => {
    if (nextY > pxH - mb) hasOverflow = true
  }

  // Draw Text Helper
  const drawText = (text: string, fontSizeMm: number, bold = false, color = '#000000') => {
    const fontSize = mmToPx(fontSizeMm)
    if (currentY + fontSize > pxH - mb) { hasOverflow = true; return }
    // Using Arial/Tahoma for standard font metrics
    ctx.font = `${bold ? '700' : '400'} ${fontSize}px 'Arial', 'Tahoma', sans-serif`
    ctx.fillStyle = color
    ctx.textBaseline = 'top'

    if (config.textAlignment === 'center') {
      ctx.textAlign = 'center'
      ctx.fillText(text, pxW / 2, currentY, contentW)
    } else if (config.textAlignment === 'right') {
      ctx.textAlign = 'right'
      ctx.fillText(text, pxW - mr, currentY, contentW)
    } else {
      ctx.textAlign = 'left'
      ctx.fillText(text, ml, currentY, contentW)
    }
    currentY += fontSize + spacing
  }

  // Draw Barcode Helper
  const drawBarcodeBlock = async () => {
    const bcValue = item?.barcode || item?.sku
    if (config.showBarcode && config.barcodeType !== 'QR' && bcValue) {
      const barcodeH = mmToPx(config.barcodeHeight)
      const barcodeW = Math.min(contentW, contentW * 0.9)
      const barcodeX = config.textAlignment === 'center' ? (pxW - barcodeW) / 2 : ml
      const extraH = mmToPx(4) // 4mm extra for text underneath
      checkOverflow(currentY + barcodeH + extraH)

      try {
        const bcCanvas = document.createElement('canvas')
        const mod = await import('jsbarcode')
        const JsB = mod.default ?? mod
        if (typeof JsB !== 'function') throw new Error('JsB not function')
        
        if (JsB && bcValue) {
          const format = config.barcodeType === 'EAN13' ? 'EAN13' : config.barcodeType === 'UPC' ? 'UPC' : 'CODE128'
          try {
            JsB(bcCanvas, bcValue, {
              format,
              height: barcodeH,
              displayValue: true,
              fontSize: mmToPx(config.fontSizeLabel),
              margin: 2,
              background: '#ffffff',
              lineColor: '#000000',
              width: 2, // Slightly thicker for print
            })
          } catch (err) {
            JsB(bcCanvas, bcValue, {
              format: 'CODE128',
              height: barcodeH,
              displayValue: true,
              fontSize: mmToPx(config.fontSizeLabel),
              margin: 2,
              background: '#ffffff',
              lineColor: '#000000',
              width: 2,
            })
          }
          
          const imgUrl = bcCanvas.toDataURL('image/png')
          const img = new Image()
          await new Promise<void>((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, barcodeX, currentY, barcodeW, barcodeH + extraH)
              resolve()
            }
            img.src = imgUrl
          })
          currentY += barcodeH + extraH + spacing
        }
      } catch (err: any) {
        // Fallback box for barcode
        ctx.fillStyle = '#000000'
        ctx.fillRect(barcodeX, currentY, barcodeW, barcodeH)
        currentY += barcodeH + spacing
      }
    }
  }

  // 1. Top Barcode
  if (config.barcodePosition === 'top') {
    await drawBarcodeBlock()
  }

  // 2. Product name (EN)
  if (config.showProductName && item?.name) {
    drawText(item.name, config.fontSizeName, true)
  }

  // 3. Product name (AR) - RTL
  if (config.showProductNameAr && item?.nameAr) {
    const fontSize = mmToPx(config.fontSizeName)
    if (currentY + fontSize <= pxH - mb) {
      ctx.font = `700 ${fontSize}px 'Arial', 'Tahoma', sans-serif`
      ctx.fillStyle = '#000000'
      ctx.textBaseline = 'top'
      ctx.textAlign = 'right'
      ctx.direction = 'rtl'
      ctx.fillText(item.nameAr, pxW - mr, currentY, contentW)
      ctx.direction = 'ltr'
      currentY += fontSize + spacing
    } else {
      hasOverflow = true
    }
  }

  // 4. SKU
  if (config.showSku && item?.sku) {
    drawText(`SKU: ${item.sku}`, config.fontSizeLabel, false)
  }

  // 5. VAT note & Price
  if (config.showPrice && item?.sellingPrice) {
    if (config.showVatPrice) {
      if (config.textAlignment === 'right' || config.showProductNameAr) {
        drawText(`السعر يشمل الضريبة: ${item.sellingPrice.toFixed(2)}`, config.fontSizePrice, true)
      } else {
        drawText(`${item.sellingPrice.toFixed(2)} SAR (Inc. VAT 15%)`, config.fontSizePrice, true)
      }
    } else {
      drawText(`${item.sellingPrice.toFixed(2)} SAR`, config.fontSizePrice, true)
    }
  }

  // 6. Store name
  if (config.showStoreName && config.storeName) {
    drawText(config.storeName, config.fontSizeLabel, false)
  }

  // 7. Warranty badge
  if (config.showWarrantyBadge && item?.hasWarranty) {
    drawText('WARRANTY', config.fontSizeLabel, true)
  }

  // 8. Custom text 1 & 2
  if (config.showCustomText1 && config.customText1) {
    drawText(config.customText1, config.fontSizeLabel, false)
  }
  if (config.showCustomText2 && config.customText2) {
    drawText(config.customText2, config.fontSizeLabel, false)
  }

  // 9. QR Code
  const qrValue = item?.barcode || item?.sku
  if (config.showQrCode && qrValue) {
    const qrSize = mmToPx(config.qrSize)
    const qrX = config.textAlignment === 'center' ? (pxW - qrSize) / 2 : ml
    checkOverflow(currentY + qrSize)

    if (currentY + qrSize <= pxH - mb) {
      try {
        const QRCode = await import('qrcode')
        const qrDataUrl = await QRCode.toDataURL(qrValue, {
          width: Math.round(qrSize * 2),
          margin: 1,
        })
        const img = new Image()
        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, qrX, currentY, qrSize, qrSize)
            resolve()
          }
          img.src = qrDataUrl
        })
        currentY += qrSize + spacing
      } catch (err) {
        ctx.fillStyle = '#000000'
        ctx.fillRect(qrX, currentY, qrSize, qrSize)
        currentY += qrSize + spacing
      }
    } else {
      hasOverflow = true
    }
  }

  // 10. Bottom Barcode
  if (config.barcodePosition !== 'top') {
    await drawBarcodeBlock()
  }

  // We convert to black and white or just send as PNG base64 and QZ Tray will dither it
  // Return just the base64 part, stripping out the 'data:image/png;base64,' prefix
  const dataUrl = canvas.toDataURL('image/png')
  return dataUrl.split(',')[1]
}
