import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { en, ar } from '@/lib/translations'

Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 }
  ]
});

interface InvoiceDocumentProps {
  details: any
  warranties: any[]
  locale?: 'en' | 'ar' | string;
}

export function InvoiceDocument({ details, warranties = [], locale = 'en' }: InvoiceDocumentProps) {
  if (!details) return null

  const domain = typeof window !== 'undefined' ? window.location.origin : 'https://lamaha.com'
  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || en[k] || k : en[k] || k;
  const isRtl = locale === 'ar';

  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Cairo' },
    header: { marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#10b981', paddingBottom: 15, alignItems: isRtl ? 'flex-end' : 'flex-start' },
    title: { fontSize: 24, fontWeight: 700, color: '#111827' },
    subtitle: { fontSize: 10, color: '#6b7280', marginTop: 4 },
    
    infoBox: { flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 30 },
    infoItem: { flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' },
    infoLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 },
    infoValue: { fontSize: 12, fontWeight: 700, color: '#111827' },
  
    table: { width: '100%', marginBottom: 30 },
    tableHeader: { flexDirection: isRtl ? 'row-reverse' : 'row', backgroundColor: '#1f2937', color: '#ffffff', padding: 8, fontSize: 10, fontWeight: 700 },
    tableRow: { flexDirection: isRtl ? 'row-reverse' : 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', padding: 8, fontSize: 10 },
    colNo: { width: '10%', textAlign: isRtl ? 'right' : 'left' },
    colItem: { width: '50%', textAlign: isRtl ? 'right' : 'left' },
    colQty: { width: '20%', textAlign: 'center' },
    colTotal: { width: '20%', textAlign: isRtl ? 'left' : 'right' },
  
    totalsBox: { 
      marginLeft: isRtl ? 0 : 'auto', 
      marginRight: isRtl ? 'auto' : 0, 
      width: '40%', 
      padding: 15, 
      backgroundColor: '#f3f4f6', 
      borderRadius: 6, 
      marginBottom: 30 
    },
    totalsRow: { flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 8 },
    totalsLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase' },
    totalsValue: { fontSize: 12, fontWeight: 700, color: '#111827' },
    totalsGrand: { fontSize: 16, fontWeight: 700, color: '#10b981', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#d1d5db' },
  
    warrantyBox: { 
      padding: 15, 
      backgroundColor: '#f5f3ff', 
      borderRadius: 6, 
      borderLeftWidth: isRtl ? 0 : 4, 
      borderRightWidth: isRtl ? 4 : 0,
      borderLeftColor: '#8b5cf6', 
      borderRightColor: '#8b5cf6', 
      marginBottom: 20 
    },
    warrantyTitle: { fontSize: 12, fontWeight: 700, color: '#6d28d9', marginBottom: 8, textAlign: isRtl ? 'right' : 'left' },
    warrantyItem: { fontSize: 10, color: '#4c1d95', marginBottom: 4, textAlign: isRtl ? 'right' : 'left' },
  
    qrBox: { alignItems: 'center', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    qrText: { fontSize: 10, color: '#6b7280', marginBottom: 4, textAlign: 'center' },
    qrLink: { fontSize: 10, color: '#8b5cf6', fontWeight: 700 },
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('lamahaReceipt')}</Text>
          <Text style={styles.subtitle}>{t('digitalInvoice')}</Text>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('invoiceNo')}</Text>
            <Text style={styles.infoValue}>{details.invoiceNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('date')}</Text>
            <Text style={styles.infoValue}>{format(new Date(details.createdAt), 'MMM dd, yyyy HH:mm')}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('salesperson')}</Text>
            <Text style={styles.infoValue}>{details.salesperson}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colItem}>{t('description')}</Text>
            <Text style={styles.colQty}>{t('qty')}</Text>
            <Text style={styles.colTotal}>{t('method')}</Text>
          </View>

          {details.items?.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colNo}>{i + 1}</Text>
              <Text style={styles.colItem}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantitySold} {item.unit}</Text>
              <Text style={styles.colTotal}>{t((details.transactions[0]?.method as string)?.toLowerCase() as any) || t('mixed')}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{t('grandTotal')}</Text>
            <Text style={styles.totalsGrand}>{details.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {warranties && warranties.length > 0 && (
          <View style={styles.warrantyBox}>
            <Text style={styles.warrantyTitle}>{t('warrantyCoverageIncluded')}</Text>
            {warranties.map((w: any, i: number) => (
              <Text key={i} style={styles.warrantyItem}>
                • {w.item?.name}: {t('warranty')} ({w.item?.warrantyDuration} {w.item?.warrantyUnit}) - {format(new Date(w.warrantyEndDate), 'dd MMM yyyy')}
              </Text>
            ))}
          </View>
        )}

        {warranties && warranties.length > 0 && (
          <View style={styles.qrBox}>
            <Text style={styles.qrText}>{t('scanQrToVerify')}</Text>
            <Text style={styles.qrLink}>{domain}/warranty/check?invoice={details.invoiceNumber}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
