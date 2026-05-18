'use client'

/**
 * receipt-template.ts
 * Full type system for the dynamic receipt template system.
 * These types are used by:
 *   - receipt-renderer.ts   (builds HTML from config)
 *   - receipt-templates.ts  (server actions: CRUD in DB)
 *   - printer.ts            (optional config override for Epson path)
 *   - Admin UI              (editor + live preview)
 */

// ─── Sub-types ─────────────────────────────────────────────────────────────────

export interface StoreInfo {
  name: string          // Primary display name (Arabic or English)
  phone: string
  vatNumber: string
  address?: string
  logoBase64?: string   // Data URL (e.g. "data:image/png;base64,…")
}

export type PaperSize = '80mm' | '58mm' | 'A4'

export type Alignment = 'left' | 'center' | 'right'

export type ItemLayout =
  | 'name-qty'          // Name + quantity (current Epson default)
  | 'name-qty-price'    // Name + quantity + price per row
  | 'compact'           // Compressed single-line format

export interface SectionVisibility {
  logo: boolean
  storeName: boolean
  phone: boolean
  vatNumber: boolean
  address: boolean
  invoiceNumber: boolean
  date: boolean
  cashierName: boolean
  customerName: boolean
  customerVatNumber: boolean
  itemsTable: boolean
  subtotal: boolean
  vat: boolean
  total: boolean
  paymentMethod: boolean
  splitPaymentDetails: boolean
  discount: boolean
  qrCode: boolean
  footer: boolean
}

export interface FontSizes {
  storeName: number   // px
  body: number        // px — meta rows, labels
  items: number       // px — item table rows
  total: number       // px — grand total
  footer: number      // px
}

// ─── Root config ───────────────────────────────────────────────────────────────

export interface ReceiptTemplateConfig {
  store: StoreInfo
  paperSize: PaperSize
  alignment: {
    header: Alignment
    items: Alignment
    footer: Alignment
  }
  sections: SectionVisibility
  itemLayout: ItemLayout
  fontSizes: FontSizes
  footerText: string          // Supports \n for line breaks
  thankYouMessage: string
  vatLabel: string            // e.g. "VAT 15%"
  currencyLabel: string       // e.g. "SAR"
  showBorderLines: boolean
  compactMode: boolean        // reduces padding for 58mm rolls
}

// ─── Default config — mirrors current Epson hardcoded values ───────────────────
// Changing this does NOT affect any existing Epson print path until a template
// is saved in the DB and loaded by the printer provider.

export const DEFAULT_TEMPLATE_CONFIG: ReceiptTemplateConfig = {
  store: {
    name: 'لمعة لزينة السيارات',
    phone: '+966 546590141',
    vatNumber: '3109204959',
    address: '',
    logoBase64: '',
  },
  paperSize: '80mm',
  alignment: {
    header: 'center',
    items: 'right',
    footer: 'center',
  },
  sections: {
    logo: false,
    storeName: true,
    phone: true,
    vatNumber: true,
    address: false,
    invoiceNumber: true,
    date: true,
    cashierName: true,
    customerName: true,
    customerVatNumber: true,
    itemsTable: true,
    subtotal: true,
    vat: true,
    total: true,
    paymentMethod: true,
    splitPaymentDetails: true,
    discount: false,
    qrCode: true,
    footer: true,
  },
  itemLayout: 'name-qty',
  fontSizes: {
    storeName: 22,
    body: 11,
    items: 12,
    total: 16,
    footer: 11,
  },
  footerText: 'Thank you! شكراً لزيارتكم\nTax Invoice • فاتورة ضريبية مبسطة',
  thankYouMessage: 'Thank you! شكراً لزيارتكم',
  vatLabel: 'VAT 15%',
  currencyLabel: 'SAR',
  showBorderLines: true,
  compactMode: false,
}

// ─── Paper size → viewport width mapping (for HTML receipt) ───────────────────
export const PAPER_WIDTHS: Record<PaperSize, number> = {
  '80mm': 302,  // ~302px at 96dpi
  '58mm': 219,  // ~219px at 96dpi
  'A4':   794,  // standard A4 width at 96dpi
}

export const PAPER_PADDING: Record<PaperSize, string> = {
  '80mm': '0 6mm',
  '58mm': '0 3mm',
  'A4':   '10mm 20mm',
}
