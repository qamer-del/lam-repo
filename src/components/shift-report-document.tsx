import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { en, ar } from '@/lib/translations';

Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 }
  ]
});

export function ShiftReportDocument({ 
  shift, 
  qrCodeDataUrl, 
  locale = 'en',
  storeName = 'Lamaha Car Care',
  storePhone = '+966 50 000 0000'
}: { 
  shift: any, 
  qrCodeDataUrl?: string | null,
  locale?: 'en' | 'ar' | string,
  storeName?: string,
  storePhone?: string
}) {
  if (!shift) return null;

  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || en[k] || k : en[k] || k;
  const isRtl = locale === 'ar';

  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: 'Cairo',
      color: '#1a1a1a',
      backgroundColor: '#ffffff',
    },
    header: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 2,
      borderBottomColor: '#1e40af',
      paddingBottom: 20,
      marginBottom: 20,
    },
    storeInfo: {
      flexDirection: 'column',
      alignItems: isRtl ? 'flex-end' : 'flex-start',
    },
    storeName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e40af',
    },
    storePhone: {
      fontSize: 10,
      color: '#666',
      marginTop: 2,
    },
    reportTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#333',
      textAlign: isRtl ? 'left' : 'right',
    },
    reportId: {
      fontSize: 9,
      color: '#999',
      textAlign: isRtl ? 'left' : 'right',
      marginTop: 2,
    },
    grid: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      marginBottom: 20,
    },
    gridItem: {
      width: '50%',
      marginBottom: 10,
      paddingRight: isRtl ? 0 : 10,
      paddingLeft: isRtl ? 10 : 0,
    },
    label: {
      fontSize: 8,
      color: '#666',
      textTransform: 'uppercase',
      letterSpacing: 1,
      textAlign: isRtl ? 'right' : 'left',
    },
    value: {
      fontSize: 11,
      fontWeight: 'bold',
      marginTop: 2,
      textAlign: isRtl ? 'right' : 'left',
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      backgroundColor: '#f8fafc',
      padding: 8,
      marginBottom: 15,
      textAlign: isRtl ? 'right' : 'left',
      borderRadius: 4,
    },
    summaryRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    summaryLabel: {
      color: '#475569',
      textAlign: isRtl ? 'right' : 'left',
    },
    summaryValue: {
      fontWeight: 'bold',
      textAlign: isRtl ? 'left' : 'right',
    },
    totalRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 2,
      borderTopColor: '#1e40af',
    },
    totalLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#1e40af',
    },
    totalValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#1e40af',
    },
    reconciliationSection: {
      marginTop: 30,
      padding: 15,
      backgroundColor: '#f0f9ff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#bae6fd',
    },
    reconciliationRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    differenceRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#bae6fd',
    },
    differenceValue: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    qrSection: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginTop: 40,
      alignItems: 'flex-end',
    },
    qrImage: {
      width: 80,
      height: 80,
    },
    signatures: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginTop: 60,
    },
    signatureLine: {
      width: '40%',
      borderTopWidth: 1,
      borderTopColor: '#333',
      textAlign: 'center',
      paddingTop: 5,
    },
    signatureLabel: {
      fontSize: 9,
      fontWeight: 'bold',
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      fontSize: 8,
      color: '#94a3b8',
      textAlign: 'center',
      borderTopWidth: 1,
      borderTopColor: '#f1f5f9',
      paddingTop: 10,
    }
  });

  const formatCurrency = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' SAR';
  const formatDate = (date: any) => date ? new Date(date).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US') : 'N/A';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.storePhone}>{storePhone}</Text>
          </View>
          <View>
            <Text style={styles.reportTitle}>{t('shiftReport')}</Text>
            <Text style={styles.reportId}>#{shift.id}</Text>
          </View>
        </View>

        {/* Shift Info Grid */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.label}>{t('cashier')}</Text>
            <Text style={styles.value}>{shift.openedBy?.name || 'N/A'}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>{t('status')}</Text>
            <Text style={styles.value}>{shift.status}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>{t('shiftOpened')}</Text>
            <Text style={styles.value}>{formatDate(shift.openedAt)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>{t('shiftClosed')}</Text>
            <Text style={styles.value}>{formatDate(shift.closedAt)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Sales Summary */}
        <Text style={styles.sectionTitle}>{t('salesSummary')}</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('cashSales')}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(shift.cashSales)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('cardSales')}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(shift.cardSales)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('tamara')}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(shift.tamaraSales)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('tabby')}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(shift.tabbySales)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('creditSales')}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(shift.creditSales)}</Text>
        </View>
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('totalSales')}</Text>
          <Text style={styles.totalValue}>{formatCurrency(shift.totalSales)}</Text>
        </View>

        <View style={[styles.summaryRow, { marginTop: 10 }]}>
          <Text style={styles.summaryLabel}>{t('totalInvoices')}</Text>
          <Text style={styles.summaryValue}>{shift.invoiceCount}</Text>
        </View>

        {/* Cash Reconciliation */}
        <View style={styles.reconciliationSection}>
          <Text style={[styles.sectionTitle, { backgroundColor: 'transparent', padding: 0, marginBottom: 10 }]}>
            {t('cashReconciliation')}
          </Text>
          <View style={styles.reconciliationRow}>
            <Text style={styles.summaryLabel}>{t('expectedCash')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(shift.expectedCash)}</Text>
          </View>
          <View style={styles.reconciliationRow}>
            <Text style={styles.summaryLabel}>{t('actualCash')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(shift.actualCash)}</Text>
          </View>
          <View style={styles.differenceRow}>
            <Text style={[styles.totalLabel, { color: shift.difference < 0 ? '#b91c1c' : shift.difference > 0 ? '#059669' : '#1e40af' }]}>
              {t('difference')}
            </Text>
            <Text style={[styles.differenceValue, { color: shift.difference < 0 ? '#b91c1c' : shift.difference > 0 ? '#059669' : '#1e40af' }]}>
              {shift.difference > 0 ? '+' : ''}{formatCurrency(shift.difference)}
            </Text>
          </View>
        </View>

        {/* QR & Signatures */}
        <View style={styles.qrSection}>
          <View style={{ alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
            {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrImage} />}
          </View>
          
          <View style={{ width: '60%' }}>
            <View style={styles.signatures}>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>{t('cashierSignature')}</Text>
              </View>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>{t('managerSignature')}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          {t('officialRecordFooter')} {new Date().toLocaleString()}.
        </Text>
      </Page>
    </Document>
  );
}
