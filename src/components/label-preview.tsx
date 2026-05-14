'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { LabelConfig, LabelData } from '@/lib/barcode'

interface LabelPreviewProps {
  config: LabelConfig
  item: LabelData | null
  className?: string
}

const MM_TO_PX_AT_96DPI = 3.7795275591 // 1mm = 3.779px at 96 DPI

export function LabelPreview({ config, item, className = '' }: LabelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [overflow, setOverflow] = useState(false)

  const drawLabel = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pxW = config.width * MM_TO_PX_AT_96DPI
    const pxH = config.height * MM_TO_PX_AT_96DPI
    canvas.width = pxW
    canvas.height = pxH

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, pxW, pxH)

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pxW, pxH)

    // Print boundary (dashed border)
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 2])
    ctx.strokeRect(0.5, 0.5, pxW - 1, pxH - 1)
    ctx.setLineDash([])

    const ml = config.marginLeft * MM_TO_PX_AT_96DPI
    const mt = config.marginTop * MM_TO_PX_AT_96DPI
    const mr = config.marginRight * MM_TO_PX_AT_96DPI
    const mb = config.marginBottom * MM_TO_PX_AT_96DPI
    const contentW = pxW - ml - mr
    const spacing = config.spacing * MM_TO_PX_AT_96DPI

    let currentY = mt
    let hasOverflow = false

    const checkOverflow = (nextY: number) => {
      if (nextY > pxH - mb) hasOverflow = true
    }

    // Helper to draw centered or aligned text
    const drawText = (text: string, fontSize: number, bold = false, color = '#111827') => {
      if (currentY + fontSize > pxH - mb) { hasOverflow = true; return }
      ctx.font = `${bold ? '700' : '400'} ${fontSize}px 'Inter', 'Segoe UI', Arial, sans-serif`
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

    const drawBarcodeBlock = async () => {
      const bcValue = item?.barcode || item?.sku
      if (config.showBarcode && config.barcodeType !== 'QR' && bcValue) {
        const barcodeH = config.barcodeHeight * MM_TO_PX_AT_96DPI
        const barcodeW = Math.min(contentW, contentW * 0.9)
        const barcodeX = config.textAlignment === 'center' ? (pxW - barcodeW) / 2 : ml
        checkOverflow(currentY + barcodeH + 16)

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
                fontSize: config.fontSizeLabel * MM_TO_PX_AT_96DPI,
                margin: 2,
                background: '#ffffff',
                lineColor: '#000000',
                width: 1.5,
              })
            } catch (err) {
              // Fallback to CODE128
              JsB(bcCanvas, bcValue, {
                format: 'CODE128',
                height: barcodeH,
                displayValue: true,
                fontSize: config.fontSizeLabel * MM_TO_PX_AT_96DPI,
                margin: 2,
                background: '#ffffff',
                lineColor: '#000000',
                width: 1.5,
              })
            }
            
            const imgUrl = bcCanvas.toDataURL('image/png')
            const img = new Image()
            await new Promise<void>((resolve) => {
              img.onload = () => {
                ctx.drawImage(img, barcodeX, currentY, barcodeW, barcodeH + 16)
                resolve()
              }
              img.src = imgUrl
            })
            currentY += barcodeH + 18 + spacing
          }
        } catch (err: any) {
          // Fallback: draw placeholder with error message
          ctx.fillStyle = '#fee2e2'
          ctx.fillRect(barcodeX, currentY, barcodeW, barcodeH + 16)
          ctx.fillStyle = '#b91c1c'
          ctx.font = `600 8px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const msg = err?.message ? err.message.substring(0, 30) : 'BARCODE ERROR'
          ctx.fillText(msg, pxW / 2, currentY + (barcodeH + 16) / 2)
          currentY += barcodeH + 18 + spacing
        }
      }
    }

    if (config.barcodePosition === 'top') {
      await drawBarcodeBlock()
    }

    // Product name (EN)
    if (config.showProductName && item?.name) {
      const fontSize = config.fontSizeName * MM_TO_PX_AT_96DPI
      drawText(item.name, fontSize, true)
    }

    // Product name (AR) - RTL
    if (config.showProductNameAr && item?.nameAr) {
      const fontSize = config.fontSizeName * MM_TO_PX_AT_96DPI
      ctx.font = `700 ${fontSize}px 'Tahoma', 'Cairo', Arial`
      ctx.fillStyle = '#111827'
      ctx.textBaseline = 'top'
      ctx.textAlign = 'right'
      ctx.direction = 'rtl'
      ctx.fillText(item.nameAr, pxW - mr, currentY, contentW)
      ctx.direction = 'ltr'
      currentY += fontSize + spacing
    }


    // SKU
    if (config.showSku && item?.sku) {
      const fontSize = config.fontSizeLabel * MM_TO_PX_AT_96DPI
      drawText(`SKU: ${item.sku}`, fontSize, false, '#9ca3af')
    }

    // VAT note & Price
    if (config.showPrice && item?.sellingPrice) {
      const fontSize = config.fontSizePrice * MM_TO_PX_AT_96DPI
      
      if (config.showVatPrice) {
        if (config.textAlignment === 'right' || config.showProductNameAr) {
           drawText(`السعر يشمل الضريبة: ${item.sellingPrice.toFixed(2)}`, fontSize, true, '#059669')
        } else {
           drawText(`${item.sellingPrice.toFixed(2)} SAR (Inc. VAT 15%)`, fontSize, true, '#059669')
        }
      } else {
        drawText(`${item.sellingPrice.toFixed(2)} SAR`, fontSize, true, '#059669')
      }
    }

    // Store name
    if (config.showStoreName && config.storeName) {
      const fontSize = config.fontSizeLabel * MM_TO_PX_AT_96DPI
      drawText(config.storeName, fontSize, false, '#6b7280')
    }

    // Warranty badge
    if (config.showWarrantyBadge && item?.hasWarranty) {
      const badgeH = config.fontSizeLabel * MM_TO_PX_AT_96DPI + 4
      if (currentY + badgeH <= pxH - mb) {
        ctx.fillStyle = '#fef3c7'
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 0.8
        const badgeX = config.textAlignment === 'center' ? ml : ml
        const badgeW = contentW
        roundRect(ctx, badgeX, currentY, badgeW, badgeH, 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#92400e'
        ctx.font = `700 ${config.fontSizeLabel * MM_TO_PX_AT_96DPI}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('★ WARRANTY', pxW / 2, currentY + badgeH / 2)
        currentY += badgeH + spacing
      } else {
        hasOverflow = true
      }
    }

    // Custom text 1
    if (config.showCustomText1 && config.customText1) {
      drawText(config.customText1, config.fontSizeLabel * MM_TO_PX_AT_96DPI)
    }

    // Custom text 2
    if (config.showCustomText2 && config.customText2) {
      drawText(config.customText2, config.fontSizeLabel * MM_TO_PX_AT_96DPI)
    }


    // QR Code
    const qrValue = item?.barcode || item?.sku
    if (config.showQrCode && qrValue) {
      const qrSize = config.qrSize * MM_TO_PX_AT_96DPI
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
        } catch {
          ctx.fillStyle = '#e5e7eb'
          ctx.fillRect(qrX, currentY, qrSize, qrSize)
          ctx.fillStyle = '#9ca3af'
          ctx.font = '400 7px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('QR', qrX + qrSize / 2, currentY + qrSize / 2)
          currentY += qrSize + spacing
        }
      } else {
        hasOverflow = true
      }
    }

    // Bottom Barcode
    if (config.barcodePosition !== 'top') {
      await drawBarcodeBlock()
    }

    // Margin guides (subtle dotted lines)
    ctx.strokeStyle = 'rgba(59,130,246,0.2)'
    ctx.lineWidth = 0.5
    ctx.setLineDash([1, 2])
    ctx.strokeRect(ml, mt, contentW, pxH - mt - mb)
    ctx.setLineDash([])

    setOverflow(hasOverflow)
  }, [config, item])

  // Recalculate scale when container or label size changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(() => {
      const containerW = container.clientWidth - 16
      const labelW = config.width * MM_TO_PX_AT_96DPI
      setScale(Math.min(1, containerW / labelW))
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [config.width])

  useEffect(() => {
    drawLabel()
  }, [drawLabel])

  return (
    <div ref={containerRef} className={`relative flex flex-col items-center ${className}`}>
      {/* Label info */}
      <div className="flex items-center gap-3 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        <span>{config.width}mm × {config.height}mm</span>
        {overflow && (
          <span className="text-amber-500 flex items-center gap-1">
            ⚠ Content overflow
          </span>
        )}
      </div>

      {/* Canvas wrapper with shadow */}
      <div
        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
        className="shadow-xl shadow-gray-900/20 rounded"
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{
            imageRendering: 'crisp-edges',
          }}
        />
      </div>

      {/* Scale indicator */}
      <p className="mt-3 text-[9px] text-gray-400 font-medium">
        Preview at {Math.round(scale * 100)}% scale
      </p>
    </div>
  )
}

// Helper: rounded rectangle
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
