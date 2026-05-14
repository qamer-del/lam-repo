'use client'

/**
 * barcode.ts — Barcode generation, validation, and ZPL utilities
 *
 * Handles:
 *  - Generating barcodes as data URLs (CODE128, EAN-13, UPC-A, QR)
 *  - Validating barcode values by type
 *  - Generating random valid barcode values
 *  - Building ZPL strings for Zebra GK420t printer
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type BarcodeType = 'CODE128' | 'EAN13' | 'UPC' | 'QR'

export interface LabelConfig {
  // Dimensions (mm)
  width: number
  height: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  spacing: number

  // Content toggles
  showProductName: boolean
  showProductNameAr: boolean
  showBarcode: boolean
  showQrCode: boolean
  showSku: boolean
  showPrice: boolean
  showVatPrice: boolean
  showStoreName: boolean
  showWarrantyBadge: boolean
  showCustomText1: boolean
  showCustomText2: boolean

  // Custom values
  customText1: string
  customText2: string
  storeName: string

  // Typography
  fontSizeName: number
  fontSizePrice: number
  fontSizeLabel: number
  barcodeHeight: number  // mm
  qrSize: number         // mm

  // Barcode
  barcodeType: BarcodeType
  textAlignment: 'left' | 'center' | 'right'
  barcodePosition?: 'top' | 'bottom'
}

export interface LabelData {
  id: number
  name: string
  nameAr?: string
  sku: string | null
  barcode: string | null
  barcodeType: string | null
  sellingPrice: number
  hasWarranty: boolean
}

export const DEFAULT_LABEL_CONFIG: LabelConfig = {
  width: 50,
  height: 25,
  marginTop: 2,
  marginRight: 2,
  marginBottom: 2,
  marginLeft: 2,
  spacing: 1.5,

  showProductName: true,
  showProductNameAr: false,
  showBarcode: true,
  showQrCode: false,
  showSku: true,
  showPrice: true,
  showVatPrice: false,
  showStoreName: false,
  showWarrantyBadge: false,
  showCustomText1: false,
  showCustomText2: false,

  customText1: '',
  customText2: '',
  storeName: 'لمعة لزينة السيارات',

  fontSizeName: 7,
  fontSizePrice: 9,
  fontSizeLabel: 5,
  barcodeHeight: 8,
  qrSize: 15,

  barcodeType: 'CODE128',
  textAlignment: 'center',
  barcodePosition: 'bottom',
}

// ─── Label Presets ────────────────────────────────────────────────────────────

export const LABEL_PRESETS: { key: string; name: string; nameAr: string; config: Partial<LabelConfig> }[] = [
  {
    key: 'lamaha_standard',
    name: 'Lamaha Standard (AR)',
    nameAr: 'ملصق لمعة المعتمد',
    config: {
      width: 50, height: 25,
      showProductName: false, showProductNameAr: true, showBarcode: true, showPrice: true,
      showSku: false, showQrCode: false, showStoreName: true, showVatPrice: true,
      fontSizeName: 8, fontSizePrice: 8, fontSizeLabel: 7, barcodeHeight: 8,
      barcodePosition: 'top', textAlignment: 'right', storeName: 'مؤسسة لمعة الدرة'
    },
  },
  {
    key: 'small_price',
    name: 'Small Price Label',
    nameAr: 'ملصق سعر صغير',
    config: {
      width: 50, height: 25,
      showProductName: true, showBarcode: true, showPrice: true,
      showSku: false, showQrCode: false, showStoreName: false,
      fontSizeName: 6, fontSizePrice: 10, barcodeHeight: 7,
    },
  },
  {
    key: 'product_label',
    name: 'Product Label',
    nameAr: 'ملصق منتج',
    config: {
      width: 80, height: 50,
      showProductName: true, showBarcode: true, showPrice: true,
      showSku: true, showStoreName: true, showQrCode: false,
      fontSizeName: 8, fontSizePrice: 11, barcodeHeight: 12,
    },
  },
  {
    key: 'barcode_only',
    name: 'Barcode Only',
    nameAr: 'باركود فقط',
    config: {
      width: 40, height: 15,
      showProductName: false, showBarcode: true, showPrice: false,
      showSku: true, showStoreName: false, showQrCode: false,
      barcodeHeight: 8,
    },
  },
  {
    key: 'qr_label',
    name: 'QR Label',
    nameAr: 'ملصق QR',
    config: {
      width: 50, height: 50,
      showProductName: true, showBarcode: false, showPrice: true,
      showSku: false, showStoreName: true, showQrCode: true,
      barcodeType: 'QR', qrSize: 30,
    },
  },
  {
    key: 'warranty_label',
    name: 'Warranty Label',
    nameAr: 'ملصق ضمان',
    config: {
      width: 80, height: 40,
      showProductName: true, showBarcode: true, showPrice: true,
      showSku: true, showStoreName: true, showWarrantyBadge: true,
      showQrCode: false, fontSizeName: 8, fontSizePrice: 10,
    },
  },
  {
    key: 'shelf_label',
    name: 'Shelf Label',
    nameAr: 'ملصق رف',
    config: {
      width: 100, height: 30,
      showProductName: true, showBarcode: true, showPrice: true,
      showSku: true, showStoreName: false, showQrCode: false,
      fontSizeName: 10, fontSizePrice: 14, barcodeHeight: 8,
    },
  },
]

// ─── Barcode Generation ────────────────────────────────────────────────────────

/**
 * Generate a barcode as an SVG string using JsBarcode
 * Returns null if value is invalid for the format
 */
export async function generateBarcodeSvg(
  type: BarcodeType,
  value: string,
  height = 40,
  displayValue = true
): Promise<string | null> {
  if (!value) return null
  try {
    const JsBarcode = (await import('jsbarcode')).default
    // Use canvas in browser environment
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas')
      const format = type === 'EAN13' ? 'EAN13' : type === 'UPC' ? 'UPC' : 'CODE128'
      JsBarcode(canvas, value, {
        format,
        height,
        displayValue,
        fontSize: 10,
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
      })
      return canvas.toDataURL('image/png')
    }
    return null
  } catch (err) {
    console.error('[Barcode] Generation failed:', err)
    return null
  }
}



/**
 * Generate QR code as data URL
 */
export async function generateQrDataUrl(value: string, size = 128): Promise<string | null> {
  if (!value) return null
  try {
    const QRCode = await import('qrcode')
    return await QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
  } catch (err) {
    console.error('[QR] Generation failed:', err)
    return null
  }
}

// ─── Random Barcode Generation ─────────────────────────────────────────────────

function randomDigits(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('')
}

function ean13CheckDigit(digits12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return String((10 - (sum % 10)) % 10)
}

function upcCheckDigit(digits11: string): string {
  let sum = 0
  for (let i = 0; i < 11; i++) {
    sum += parseInt(digits11[i]) * (i % 2 === 0 ? 3 : 1)
  }
  return String((10 - (sum % 10)) % 10)
}

export function generateRandomBarcode(type: BarcodeType): string {
  switch (type) {
    case 'EAN13': {
      const d = randomDigits(12)
      return d + ean13CheckDigit(d)
    }
    case 'UPC': {
      const d = randomDigits(11)
      return d + upcCheckDigit(d)
    }
    case 'QR':
      return `PROD-${Date.now()}-${randomDigits(4)}`
    case 'CODE128':
    default:
      return `${randomDigits(4)}-${randomDigits(4)}-${randomDigits(4)}`
  }
}

// ─── Barcode Validation ────────────────────────────────────────────────────────

export function validateBarcode(type: BarcodeType, value: string): { valid: boolean; error?: string } {
  if (!value) return { valid: false, error: 'Barcode value is required' }
  switch (type) {
    case 'EAN13': {
      if (!/^\d{13}$/.test(value)) return { valid: false, error: 'EAN-13 must be exactly 13 digits' }
      const check = ean13CheckDigit(value.slice(0, 12))
      if (check !== value[12]) return { valid: false, error: 'Invalid EAN-13 check digit' }
      return { valid: true }
    }
    case 'UPC': {
      if (!/^\d{12}$/.test(value)) return { valid: false, error: 'UPC-A must be exactly 12 digits' }
      const check = upcCheckDigit(value.slice(0, 11))
      if (check !== value[11]) return { valid: false, error: 'Invalid UPC-A check digit' }
      return { valid: true }
    }
    case 'CODE128': {
      if (value.length < 1) return { valid: false, error: 'CODE128 barcode cannot be empty' }
      if (value.length > 80) return { valid: false, error: 'CODE128 barcode too long (max 80 chars)' }
      return { valid: true }
    }
    case 'QR': {
      if (value.length < 1) return { valid: false, error: 'QR code value cannot be empty' }
      return { valid: true }
    }
    default:
      return { valid: true }
  }
}
