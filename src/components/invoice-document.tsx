import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { en, ar } from '@/lib/translations'
import { calcVat15, buildZatcaQrString } from '@/lib/zatca-qr'

Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 },
  ],
})

// ─── Shop config (update these to match your ZATCA registration) ──────────────
const SHOP = {
  name: 'LAMAHA Car Care Center',
  nameAr: 'مركز لمعة للعناية بالسيارات',
  vatNumber: '300000000000000', // ← Replace with your actual 15-digit VAT number
  address: 'Riyadh, Saudi Arabia',
  addressAr: 'الرياض، المملكة العربية السعودية',
  phone: '+966 50 000 0000',
  crNumber: '1000000000',      // Commercial Registration number
}

interface InvoiceDocumentProps {
  details: any
  warranties?: any[]
  locale?: 'en' | 'ar' | string
  qrDataUrl?: string | null     // Pre-generated ZATCA QR data URL
}

export function InvoiceDocument({ details, warranties = [], locale = 'en', qrDataUrl }: InvoiceDocumentProps) {
  if (!details) return null

  const isRtl = locale === 'ar'
  const t = (k: keyof typeof en) => (locale === 'ar' ? (ar as any)[k] ?? en[k] : en[k]) ?? k

  // ── VAT calculation (prices are inclusive of 15% VAT) ──
  const totalInclVat = details.totalAmount
  const { base: subtotal, vat: vatAmount } = calcVat15(totalInclVat)

  // ── ZATCA QR string (inline fallback if no pre-rendered image) ──
  const zatcaQrString = buildZatcaQrString({
    sellerName: SHOP.name,
    vatNumber: SHOP.vatNumber,
    invoiceDate: new Date(details.createdAt),
    totalWithVat: totalInclVat,
    vatAmount,
  })

  const row = (a: string, b: string, bold = false) => (
    <View style={[styles.totalsRow, bold ? styles.totalsRowBold : {}]}>
      <Text style={[styles.totalsLabel, bold ? styles.bold : {}]}>{a}</Text>
      <Text style={[styles.totalsValue, bold ? styles.bold : {}]}>{b}</Text>
    </View>
  )

  const styles = StyleSheet.create({
    page:       { fontFamily: 'Cairo', fontSize: 10, color: '#111827', backgroundColor: '#ffffff' },
    bold:       { fontWeight: 700 },

    // ── Header band ──
    headerBand: { backgroundColor: '#0f172a', padding: '24 36 16 36', flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    shopName:   { fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 2 },
    shopNameAr: { fontSize: 13, fontWeight: 400, color: '#94a3b8', marginBottom: 6 },
    shopMeta:   { fontSize: 8, color: '#94a3b8', marginBottom: 2 },
    invoiceTag: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, alignSelf: 'flex-start' },
    invoiceTagText: { color: '#ffffff', fontSize: 11, fontWeight: 700, letterSpacing: 1 },
    invoiceTagSubtext: { color: '#d1fae5', fontSize: 8, textAlign: 'center', marginTop: 2 },

    // ── Info grid ──
    infoSection: { padding: '20 36 0 36', flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between' },
    infoBlock:   { flex: 1 },
    infoLabel:   { fontSize: 7.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
    infoValue:   { fontSize: 10, fontWeight: 700, color: '#111827', marginBottom: 2 },
    infoValueSm: { fontSize: 9, color: '#374151', marginBottom: 1 },
    dividerLine: { height: 1, backgroundColor: '#e5e7eb', marginHorizontal: 36, marginVertical: 16 },

    // ── Items table ──
    tableSection: { marginHorizontal: 36 },
    tableHeader:  {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      backgroundColor: '#1e293b',
      borderRadius: 4,
      padding: '8 10',
      marginBottom: 2,
    },
    tableRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      padding: '9 10',
      alignItems: 'center',
    },
    tableRowAlt: { backgroundColor: '#f8fafc' },
    thText:       { color: '#ffffff', fontSize: 8.5, fontWeight: 700 },
    tdText:       { fontSize: 9, color: '#374151' },
    colNo:        { width: '7%',  textAlign: isRtl ? 'right' : 'left' },
    colItem:      { width: '43%', textAlign: isRtl ? 'right' : 'left' },
    colQty:       { width: '12%', textAlign: 'center' },
    colUnit:      { width: '10%', textAlign: 'center' },
    colPrice:     { width: '14%', textAlign: isRtl ? 'left' : 'right' },
    colTotal:     { width: '14%', textAlign: isRtl ? 'left' : 'right' },

    // ── Totals + QR ──
    bottomSection: { padding: '16 36 24 36', flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    qrBlock:      { alignItems: 'center', width: 120 },
    qrLabel:      { fontSize: 7.5, color: '#6b7280', textAlign: 'center', marginTop: 6 },
    qrBorder:     { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, padding: 4 },

    totalsBlock:    { width: '44%' },
    totalsRow:      { flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    totalsRowBold:  { borderBottomColor: '#10b981' },
    totalsLabel:    { fontSize: 9, color: '#6b7280' },
    totalsValue:    { fontSize: 9, color: '#111827', textAlign: isRtl ? 'left' : 'right' },
    grandTotalRow:  { flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', backgroundColor: '#0f172a', borderRadius: 6, padding: '12 14', marginTop: 8 },
    grandLabel:     { fontSize: 11, fontWeight: 700, color: '#ffffff' },
    grandValue:     { fontSize: 13, fontWeight: 700, color: '#10b981' },

    // ── Tax summary strip ──
    taxStrip:     { marginHorizontal: 36, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 6, padding: '10 14', marginBottom: 12, flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between' },
    taxStripItem: { alignItems: 'center' },
    taxStripLabel:{ fontSize: 7.5, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
    taxStripValue:{ fontSize: 10, fontWeight: 700, color: '#15803d' },

    // ── Warranty ──
    warrantyBox:  { marginHorizontal: 36, marginBottom: 10, padding: 12, backgroundColor: '#faf5ff', borderRadius: 6, borderLeftWidth: isRtl ? 0 : 3, borderRightWidth: isRtl ? 3 : 0, borderLeftColor: '#7c3aed', borderRightColor: '#7c3aed' },
    warrantyTitle:{ fontSize: 9, fontWeight: 700, color: '#6d28d9', marginBottom: 5 },
    warrantyItem: { fontSize: 8.5, color: '#4c1d95', marginBottom: 3 },

    // ── Footer ──
    footer:       { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginHorizontal: 36, paddingTop: 10, flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between' },
    footerText:   { fontSize: 7.5, color: '#9ca3af' },
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header Band ── */}
        <View style={styles.headerBand}>
          <View style={{ flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
            <Text style={styles.shopName}>{isRtl ? SHOP.nameAr : SHOP.name}</Text>
            <Text style={styles.shopNameAr}>{isRtl ? SHOP.name : SHOP.nameAr}</Text>
            <Text style={styles.shopMeta}>{t('vatNumber')}: {SHOP.vatNumber}</Text>
            <Text style={styles.shopMeta}>CR: {SHOP.crNumber}  |  {SHOP.phone}</Text>
            <Text style={styles.shopMeta}>{isRtl ? SHOP.addressAr : SHOP.address}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', marginLeft: 20 }}>
            <View style={styles.invoiceTag}>
              <Text style={styles.invoiceTagText}>{t('simplifiedTaxInvoice')}</Text>
              <Text style={styles.invoiceTagSubtext}>فاتورة ضريبية مبسطة</Text>
            </View>
          </View>
        </View>

        {/* ── Invoice + Parties Info ── */}
        <View style={styles.infoSection}>
          {/* Invoice metadata */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>{t('taxInvoiceNumber')}</Text>
            <Text style={styles.infoValue}>{details.invoiceNumber}</Text>
            <Text style={styles.infoLabel}>{t('date')}</Text>
            <Text style={styles.infoValue}>{format(new Date(details.createdAt), 'dd/MM/yyyy HH:mm')}</Text>
            <Text style={styles.infoLabel}>{t('salesperson')}</Text>
            <Text style={styles.infoValue}>{details.salesperson}</Text>
          </View>

          {/* Bill To */}
          {(details.customerName || details.customerPhone) && (
            <View style={[styles.infoBlock, { marginLeft: isRtl ? 0 : 30, marginRight: isRtl ? 30 : 0 }]}>
              <Text style={styles.infoLabel}>{t('billTo')}</Text>
              {details.customerName && <Text style={styles.infoValue}>{details.customerName}</Text>}
              {details.customerPhone && <Text style={styles.infoValueSm}>{details.customerPhone}</Text>}
            </View>
          )}

          {/* Payment method */}
          <View style={[styles.infoBlock, { alignItems: isRtl ? 'flex-start' : 'flex-end' }]}>
            <Text style={styles.infoLabel}>{t('paymentMethod')}</Text>
            {details.transactions?.map((tx: any, i: number) => (
              <Text key={i} style={styles.infoValue}>{tx.method}</Text>
            ))}
          </View>
        </View>

        <View style={styles.dividerLine} />

        {/* ── Items Table ── */}
        <View style={styles.tableSection}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.colNo]}>#</Text>
            <Text style={[styles.thText, styles.colItem]}>{t('description')}</Text>
            <Text style={[styles.thText, styles.colQty]}>{t('qty')}</Text>
            <Text style={[styles.thText, styles.colUnit]}>{t('unit')}</Text>
            <Text style={[styles.thText, styles.colPrice]}>{t('unitPrice')}</Text>
            <Text style={[styles.thText, styles.colTotal]}>{t('lineTotal')}</Text>
          </View>

          {details.items?.map((item: any, i: number) => {
            const lineTotal = (item.sellingPrice || 0) * item.quantitySold
            return (
              <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tdText, styles.colNo]}>{i + 1}</Text>
                <View style={styles.colItem}>
                  <Text style={[styles.tdText, { fontWeight: 700 }]}>{item.name}</Text>
                  {item.sku && <Text style={[styles.tdText, { color: '#9ca3af', fontSize: 7.5 }]}>{item.sku}</Text>}
                </View>
                <Text style={[styles.tdText, styles.colQty]}>{item.quantitySold}</Text>
                <Text style={[styles.tdText, styles.colUnit]}>{item.unit}</Text>
                <Text style={[styles.tdText, styles.colPrice]}>{(item.sellingPrice || 0).toFixed(2)}</Text>
                <Text style={[styles.tdText, styles.colTotal, { fontWeight: 700 }]}>{lineTotal.toFixed(2)}</Text>
              </View>
            )
          })}
        </View>

        <View style={{ height: 16 }} />

        {/* ── Tax Summary Strip ── */}
        <View style={styles.taxStrip}>
          <View style={styles.taxStripItem}>
            <Text style={styles.taxStripLabel}>{t('subtotalExclVat')}</Text>
            <Text style={styles.taxStripValue}>{subtotal.toFixed(2)} SAR</Text>
          </View>
          <View style={styles.taxStripItem}>
            <Text style={styles.taxStripLabel}>{t('vatAmount')} (15%)</Text>
            <Text style={styles.taxStripValue}>{vatAmount.toFixed(2)} SAR</Text>
          </View>
          <View style={styles.taxStripItem}>
            <Text style={styles.taxStripLabel}>{t('totalInclVat')}</Text>
            <Text style={[styles.taxStripValue, { fontSize: 12 }]}>{totalInclVat.toFixed(2)} SAR</Text>
          </View>
        </View>

        {/* ── Bottom: QR + Totals ── */}
        <View style={styles.bottomSection}>

          {/* ZATCA QR Code */}
          <View style={styles.qrBlock}>
            <View style={styles.qrBorder}>
              {qrDataUrl ? (
                <Image src={qrDataUrl} style={{ width: 112, height: 112 }} />
              ) : (
                /* Fallback: show QR string as tiny text if image not available */
                <View style={{ width: 112, height: 112, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                  <Text style={{ fontSize: 6, color: '#9ca3af', textAlign: 'center' }}>QR Code{'\n'}(ZATCA TLV)</Text>
                </View>
              )}
            </View>
            <Text style={styles.qrLabel}>{t('scanToVerify')}</Text>
            <Text style={[styles.qrLabel, { fontSize: 6.5, color: '#9ca3af', marginTop: 2 }]}>{SHOP.vatNumber}</Text>
          </View>

          {/* Totals breakdown */}
          <View style={styles.totalsBlock}>
            {row(t('subtotalExclVat'), `${subtotal.toFixed(2)} SAR`)}
            {row(t('vatAmount'), `${vatAmount.toFixed(2)} SAR`)}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandLabel}>{t('totalInclVat')}</Text>
              <Text style={styles.grandValue}>{totalInclVat.toFixed(2)} SAR</Text>
            </View>
          </View>
        </View>

        {/* ── Warranty Section ── */}
        {warranties && warranties.length > 0 && (
          <View style={styles.warrantyBox}>
            <Text style={styles.warrantyTitle}>{t('warrantyCoverageIncluded')}</Text>
            {warranties.map((w: any, i: number) => (
              <Text key={i} style={styles.warrantyItem}>
                • {w.item?.name}: {t('warranty')} ({w.item?.warrantyDuration} {w.item?.warrantyUnit}) — {t('validUntil')} {format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}
              </Text>
            ))}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('taxInvoiceNumber')}: {details.invoiceNumber}  |  {format(new Date(details.createdAt), 'dd/MM/yyyy HH:mm')}
          </Text>
          <Text style={styles.footerText}>
            {SHOP.vatNumber}  |  {t('taxInvoice')}
          </Text>
        </View>

      </Page>
    </Document>
  )
}
