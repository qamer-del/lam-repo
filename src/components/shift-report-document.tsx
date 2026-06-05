import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import '@/lib/pdf-fonts';
import { en, ar } from '@/lib/translations';
// Pass text as-is; Noto Naskh Arabic font handles Arabic shaping via GSUB tables
const s = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return '';
  return String(text);
};
export function ShiftReportDocument({ 
  shift, 
  qrCodeDataUrl, 
  locale = 'en',
  storeName = 'Lamaha Car Care',
  storePhone = '+966 50 000 0000',
  fontOrigin = ''
}: { 
  shift: any, 
  qrCodeDataUrl?: string | null,
  locale?: 'en' | 'ar' | string,
  storeName?: string,
  storePhone?: string,
  fontOrigin?: string
}) {
  if (!shift) return null;

  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || en[k] || k : en[k] || k;
  const isRtl = locale === 'ar';

  const styles = StyleSheet.create({
    page: {
      padding: 30,
      fontSize: 10,
      fontFamily: 'Cairo',
      color: '#0f172a',
      backgroundColor: '#ffffff',
    },
    // Header
    headerContainer: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 3,
      borderBottomColor: '#1e293b',
      paddingBottom: 15,
      marginBottom: 20,
    },
    storeTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#0f172a',
    },
    storePhone: {
      fontSize: 10,
      color: '#64748b',
      marginTop: 4,
    },
    reportTitleBlock: {
      alignItems: isRtl ? 'flex-start' : 'flex-end',
    },
    reportTitleText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#3b82f6',
    },
    reportIdContainer: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      marginTop: 4,
    },
    reportIdLabel: {
      fontSize: 10,
      color: '#64748b',
    },
    reportIdValue: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#0f172a',
      marginHorizontal: 4,
    },

    // Grid details
    detailsGrid: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      backgroundColor: '#f8fafc',
      borderRadius: 6,
      padding: 15,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    detailBox: {
      width: '50%',
      marginBottom: 10,
      paddingRight: isRtl ? 0 : 10,
      paddingLeft: isRtl ? 10 : 0,
    },
    detailLabel: {
      fontSize: 8,
      fontWeight: 'bold',
      color: '#64748b',
      textTransform: 'uppercase',
      textAlign: isRtl ? 'right' : 'left',
      marginBottom: 2,
    },
    detailValue: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#0f172a',
      textAlign: isRtl ? 'right' : 'left',
    },

    // Section Titles
    sectionTitleBlock: {
      backgroundColor: '#1e293b',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 4,
      marginBottom: 10,
      flexDirection: isRtl ? 'row-reverse' : 'row',
    },
    sectionTitleText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#ffffff',
    },

    // Summary Rows
    summaryTable: {
      marginBottom: 20,
    },
    summaryRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    summaryRowAlt: {
      backgroundColor: '#fafafa',
    },
    summaryLabel: {
      fontSize: 10,
      color: '#334155',
    },
    summaryValue: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#0f172a',
    },

    // Grand Total
    grandTotalBox: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#eff6ff',
      borderWidth: 2,
      borderColor: '#3b82f6',
      borderRadius: 8,
      padding: 12,
      marginBottom: 25,
    },
    grandTotalLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#1e3a8a',
    },
    grandTotalValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1d4ed8',
    },

    // Reconciliation
    reconBox: {
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 30,
    },
    reconHeader: {
      backgroundColor: '#f1f5f9',
      padding: 10,
      flexDirection: isRtl ? 'row-reverse' : 'row',
    },
    reconHeaderText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#334155',
    },
    reconBody: {
      padding: 15,
    },
    reconRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    reconDiffRowMatch: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      backgroundColor: '#ecfdf5',
      padding: 8,
      borderRadius: 4,
    },
    reconDiffRowShort: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      backgroundColor: '#fef2f2',
      padding: 8,
      borderRadius: 4,
    },
    reconDiffLabelMatch: { fontSize: 12, fontWeight: 'bold', color: '#059669' },
    reconDiffValueMatch: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
    reconDiffLabelShort: { fontSize: 12, fontWeight: 'bold', color: '#dc2626' },
    reconDiffValueShort: { fontSize: 14, fontWeight: 'bold', color: '#dc2626' },

    // Footer
    footerBlock: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 20,
    },
    qrImage: {
      width: 80,
      height: 80,
    },
    signatures: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-around',
      flexGrow: 1,
      paddingHorizontal: 20,
    },
    sigBox: {
      width: 120,
      alignItems: 'center',
    },
    sigLine: {
      width: '100%',
      height: 1,
      backgroundColor: '#94a3b8',
      marginBottom: 8,
    },
    sigLabel: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#64748b',
    },

    pageFooter: {
      position: 'absolute',
      bottom: 20,
      left: 30,
      right: 30,
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'center',
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      paddingTop: 10,
    },
    pageFooterText: {
      fontSize: 8,
      color: '#94a3b8',
      marginHorizontal: 2,
    }
  });

  const formatCurrency = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (date: any) => date ? new Date(date).toLocaleString('en-US') : 'N/A';
  const diff = shift.difference || 0;
  const isMatch = diff >= 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.storeTitle}>{s(storeName)}</Text>
            <Text style={[styles.storePhone, { textAlign: isRtl ? 'right' : 'left' }]}>{storePhone}</Text>
          </View>
          <View style={styles.reportTitleBlock}>
            <Text style={styles.reportTitleText}>{s(t('shiftReport'))}</Text>
            <View style={styles.reportIdContainer}>
              <Text style={styles.reportIdLabel}>{s(t('idHash'))}</Text>
              <Text style={styles.reportIdValue}>#{shift.id}</Text>
            </View>
          </View>
        </View>

        {/* Shift Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>{s(t('cashier'))}</Text>
            <Text style={styles.detailValue}>{s(shift.openedBy?.name || 'N/A')}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>{s(t('status'))}</Text>
            <Text style={styles.detailValue}>{s(shift.status)}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>{s(t('shiftOpened'))}</Text>
            <Text style={styles.detailValue}>{formatDate(shift.openedAt)}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>{s(t('shiftClosed'))}</Text>
            <Text style={styles.detailValue}>{formatDate(shift.closedAt)}</Text>
          </View>
        </View>

        {/* Sales Summary */}
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitleText}>{s(t('salesSummary'))}</Text>
        </View>

        <View style={styles.summaryTable}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{s(t('cashSales'))}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(shift.cashSales)} SAR</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowAlt]}>
            <Text style={styles.summaryLabel}>{s(t('cardSales'))}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(shift.cardSales)} SAR</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{s(t('tamara'))}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(shift.tamaraSales)} SAR</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowAlt]}>
            <Text style={styles.summaryLabel}>{s(t('tabby'))}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(shift.tabbySales)} SAR</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{s(t('creditSales'))}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(shift.creditSales)} SAR</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowAlt]}>
            <Text style={styles.summaryLabel}>{s(t('totalInvoices'))}</Text>
            <Text style={styles.summaryValue}>{shift.invoiceCount}</Text>
          </View>
        </View>

        {/* Grand Total */}
        <View style={styles.grandTotalBox}>
          <Text style={styles.grandTotalLabel}>{s(t('totalSales'))}</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(shift.totalSales)} SAR</Text>
        </View>

        {/* Cash Reconciliation */}
        <View style={styles.reconBox}>
          <View style={styles.reconHeader}>
            <Text style={styles.reconHeaderText}>{s(t('cashReconciliation'))}</Text>
          </View>
          <View style={styles.reconBody}>
            <View style={styles.reconRow}>
              <Text style={styles.summaryLabel}>{s(t('expectedCash'))}</Text>
              <Text style={styles.summaryValue}>{formatCurrency(shift.expectedCash)} SAR</Text>
            </View>
            <View style={styles.reconRow}>
              <Text style={styles.summaryLabel}>{s(t('actualCash'))}</Text>
              <Text style={styles.summaryValue}>{formatCurrency(shift.actualCash)} SAR</Text>
            </View>
            <View style={isMatch ? styles.reconDiffRowMatch : styles.reconDiffRowShort}>
              <Text style={isMatch ? styles.reconDiffLabelMatch : styles.reconDiffLabelShort}>
                {s(t('difference'))}
              </Text>
              <Text style={isMatch ? styles.reconDiffValueMatch : styles.reconDiffValueShort}>
                {diff > 0 ? '+' : ''}{formatCurrency(diff)} SAR
              </Text>
            </View>
          </View>
        </View>

        {/* Footer block (QR + Signatures) */}
        <View style={styles.footerBlock}>
          <View style={{ width: 80 }}>
            {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrImage} />}
          </View>
          <View style={styles.signatures}>
            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>{s(t('cashierSignature'))}</Text>
            </View>
            <View style={styles.sigBox}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>{s(t('managerSignature'))}</Text>
            </View>
          </View>
        </View>

        {/* Absolute Page Footer */}
        <View style={styles.pageFooter}>
          <Text style={styles.pageFooterText}>{s(t('officialRecordFooter'))}</Text>
          <Text style={styles.pageFooterText}>-</Text>
          <Text style={styles.pageFooterText}>{new Date().toLocaleString('en-US')}</Text>
        </View>

      </Page>
    </Document>
  );
}

