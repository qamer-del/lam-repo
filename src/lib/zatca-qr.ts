'use client'

/**
 * zatca-qr.ts
 * Generates a ZATCA-compliant QR code for Saudi B2C simplified tax invoices.
 *
 * Format: TLV (Tag-Length-Value) encoded then Base64 → rendered as QR image
 * ZATCA Phase 1 mandatory tags:
 *   Tag 1 - Seller name
 *   Tag 2 - VAT registration number (15-digit)
 *   Tag 3 - Invoice timestamp (ISO 8601)
 *   Tag 4 - Invoice total (tax-inclusive)
 *   Tag 5 - VAT amount
 */

/** Build TLV-encoded Base64 string for ZATCA QR */
export function buildZatcaQrString(params: {
  sellerName: string
  vatNumber: string
  invoiceDate: Date
  totalWithVat: number
  vatAmount: number
}): string {
  const { sellerName, vatNumber, invoiceDate, totalWithVat, vatAmount } = params

  const timestamp = invoiceDate.toISOString()
  const totalStr = totalWithVat.toFixed(2)
  const vatStr = vatAmount.toFixed(2)

  function tlv(tag: number, value: string): Uint8Array {
    const valueBytes = new TextEncoder().encode(value)
    const result = new Uint8Array(2 + valueBytes.length)
    result[0] = tag
    result[1] = valueBytes.length
    result.set(valueBytes, 2)
    return result
  }

  const chunks = [
    tlv(1, sellerName),
    tlv(2, vatNumber),
    tlv(3, timestamp),
    tlv(4, totalStr),
    tlv(5, vatStr),
  ]

  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0)
  const combined = new Uint8Array(totalLen)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }

  // Base64 encode
  return btoa(String.fromCharCode(...combined))
}

/**
 * Generates a ZATCA QR code as a Data URL (PNG base64)
 * Returns null if generation fails (graceful degradation)
 */
export async function generateZatcaQrDataUrl(params: {
  sellerName: string
  vatNumber: string
  invoiceDate: Date
  totalWithVat: number
  vatAmount: number
}): Promise<string | null> {
  try {
    const qrString = buildZatcaQrString(params)
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: { dark: '#000000', light: '#ffffff' },
    })
  } catch (err) {
    console.error('[ZATCA QR] Generation failed:', err)
    return null
  }
}

/**
 * Calculate VAT breakdown from a tax-inclusive total at 15% VAT
 * Total = Base + VAT  →  VAT = Total × 15/115
 */
export function calcVat15(totalInclusive: number): { base: number; vat: number } {
  const vat = (totalInclusive * 15) / 115
  const base = totalInclusive - vat
  return { base: Math.round(base * 100) / 100, vat: Math.round(vat * 100) / 100 }
}
