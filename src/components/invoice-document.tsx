import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf', fontWeight: 700 }
  ]
})

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Inter' },
  header: { marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#10b981', paddingBottom: 15 },
  title: { fontSize: 24, fontWeight: 700, color: '#111827' },
  subtitle: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  
  infoBox: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 12, fontWeight: 700, color: '#111827' },

  table: { width: '100%', marginBottom: 30 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1f2937', color: '#ffffff', padding: 8, fontSize: 10, fontWeight: 700 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', padding: 8, fontSize: 10 },
  colNo: { width: '10%' },
  colItem: { width: '50%' },
  colQty: { width: '20%', textAlign: 'center' },
  colTotal: { width: '20%', textAlign: 'right' },

  totalsBox: { marginLeft: 'auto', width: '40%', padding: 15, backgroundColor: '#f3f4f6', borderRadius: 6, marginBottom: 30 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalsLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase' },
  totalsValue: { fontSize: 12, fontWeight: 700, color: '#111827' },
  totalsGrand: { fontSize: 16, fontWeight: 700, color: '#10b981', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#d1d5db' },

  warrantyBox: { padding: 15, backgroundColor: '#f5f3ff', borderRadius: 6, borderLeftWidth: 4, borderLeftColor: '#8b5cf6', marginBottom: 20 },
  warrantyTitle: { fontSize: 12, fontWeight: 700, color: '#6d28d9', marginBottom: 8 },
  warrantyItem: { fontSize: 10, color: '#4c1d95', marginBottom: 4 },

  qrBox: { alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  qrText: { fontSize: 10, color: '#6b7280', marginBottom: 4 },
  qrLink: { fontSize: 10, color: '#8b5cf6', fontWeight: 700 },
})

interface InvoiceDocumentProps {
  details: any
  warranties: any[]
}

export function InvoiceDocument({ details, warranties }: InvoiceDocumentProps) {
  if (!details) return null

  const domain = typeof window !== 'undefined' ? window.location.origin : 'https://lamaha.com'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>LAMAHA RECEIPT</Text>
          <Text style={styles.subtitle}>Digital Invoice</Text>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Invoice No.</Text>
            <Text style={styles.infoValue}>{details.invoiceNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{format(new Date(details.createdAt), 'MMM dd, yyyy HH:mm')}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Cashier</Text>
            <Text style={styles.infoValue}>{details.salesperson}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colItem}>Item</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colTotal}>Method</Text>
          </View>

          {details.items?.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colNo}>{i + 1}</Text>
              <Text style={styles.colItem}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantitySold} {item.unit}</Text>
              <Text style={styles.colTotal}>{details.transactions[0]?.method || 'Mixed'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Grand Total</Text>
            <Text style={styles.totalsGrand}>{details.totalAmount.toFixed(2)} SAR</Text>
          </View>
        </View>

        {warranties && warranties.length > 0 && (
          <View style={styles.warrantyBox}>
            <Text style={styles.warrantyTitle}>Warranty Coverage Included</Text>
            {warranties.map((w: any, i: number) => (
              <Text key={i} style={styles.warrantyItem}>
                • {w.item?.name}: Replacement warranty ({w.item?.warrantyDuration} {w.item?.warrantyUnit}) valid until {format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}
              </Text>
            ))}
          </View>
        )}

        {warranties && warranties.length > 0 && (
          <View style={styles.qrBox}>
            <Text style={styles.qrText}>Scan the QR code or visit the link below to verify your warranty status:</Text>
            <Text style={styles.qrLink}>{domain}/warranty/check?invoice={details.invoiceNumber}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
