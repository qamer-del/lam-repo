import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import '@/lib/pdf-fonts';
import { en, ar } from '@/lib/translations';
// react-pdf v4 does NOT support direction:rtl in its layout engine.
// shapeArabicVisual reverses the character order for LTR renderers.
// IMPORTANT: Never mix numbers or English dates into the same string passed to this function.
// Pass text as-is; Noto Naskh Arabic font handles Arabic shaping via GSUB tables
const s = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return '';
  return String(text);
};
export function SettlementDocument({ settlement, transactions = [], locale = 'en', fontOrigin = '' }: { settlement: any, transactions?: any[], locale?: 'en' | 'ar' | string, fontOrigin?: string }) {
  if (!settlement) return null;

  // Register font using the embedded base64 strings to bypass network issues
  

  const visibleTransactions = (transactions || []).filter(tx => tx && !tx.isInternal && !(tx.description || '').includes('[DRAWER_NEUTRAL]'));
  const cashTransactions = visibleTransactions.filter(tx => tx && tx.method === 'CASH');
  const networkTransactions = visibleTransactions.filter(tx => tx && tx.method === 'NETWORK');
  const tabbyTransactions = visibleTransactions.filter(tx => tx && tx.method === 'TABBY');
  const tamaraTransactions = visibleTransactions.filter(tx => tx && tx.method === 'TAMARA');
  
  const discrepancy = (settlement.actualCashCounted || 0) - (settlement.totalCashHanded || 0);

  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || en[k] || k : en[k] || k;
  const isRtl = locale === 'ar';

  const styles = StyleSheet.create({
    page: {
      padding: 30,
      fontSize: 9,
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
    reportTitleText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#0f172a',
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
      color: '#3b82f6',
      marginHorizontal: 4,
    },
    metaContainer: {
      alignItems: isRtl ? 'flex-start' : 'flex-end',
    },
    metaRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      marginTop: 2,
    },
    metaLabel: {
      fontSize: 9,
      color: '#64748b',
    },
    metaValue: {
      fontSize: 9,
      color: '#0f172a',
      fontWeight: 'bold',
      marginHorizontal: 4,
    },

    // Sections
    sectionTitleBlock: {
      backgroundColor: '#f1f5f9',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 4,
      marginBottom: 10,
      marginTop: 20,
      flexDirection: isRtl ? 'row-reverse' : 'row',
      borderLeftWidth: isRtl ? 0 : 3,
      borderRightWidth: isRtl ? 3 : 0,
      borderColor: '#3b82f6',
    },
    sectionTitleText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#1e293b',
    },

    // Tables
    table: {
      width: '100%',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 6,
      overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      backgroundColor: '#f8fafc',
      borderBottomWidth: 1,
      borderBottomColor: '#cbd5e1',
    },
    tableRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      minHeight: 24,
      alignItems: 'center',
    },
    tableCol: {
      paddingVertical: 5,
      paddingHorizontal: 8,
    },
    colId: { width: '15%', textAlign: isRtl ? 'right' : 'left' },
    colType: { width: '35%', textAlign: isRtl ? 'right' : 'left' },
    colDate: { width: '25%', textAlign: isRtl ? 'right' : 'left' },
    colAmount: { width: '25%', textAlign: isRtl ? 'left' : 'right' },
    headerText: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#475569',
    },
    cellText: {
      fontSize: 9,
      color: '#0f172a',
    },

    // Summary Section
    summarySection: {
      marginTop: 30,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 8,
      overflow: 'hidden',
    },
    summaryRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      backgroundColor: '#ffffff',
    },
    summaryLabel: {
      fontSize: 10,
      color: '#334155',
      fontWeight: 'bold',
    },
    summaryValue: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#0f172a',
    },
    
    // Reconciliation Row inside Summary
    reconTopDivider: {
      borderTopWidth: 2,
      borderTopColor: '#cbd5e1',
      backgroundColor: '#f8fafc',
    },
    reconResultMatch: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: '#ecfdf5',
    },
    reconResultShort: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: '#fef2f2',
    },
    reconDiffLabelMatch: { fontSize: 12, fontWeight: 'bold', color: '#059669' },
    reconDiffValueMatch: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
    reconDiffLabelShort: { fontSize: 12, fontWeight: 'bold', color: '#dc2626' },
    reconDiffValueShort: { fontSize: 14, fontWeight: 'bold', color: '#dc2626' },

    // Footer
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
  const isMatch = discrepancy >= 0;

  const renderTable = (titleKey: string, txs: any[]) => (
    <View wrap={false}>
      <View style={styles.sectionTitleBlock}>
        <Text style={styles.sectionTitleText}>{s(t(titleKey as any))}</Text>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={[styles.tableCol, styles.colId]}><Text style={[styles.headerText, { textAlign: styles.colId.textAlign as any }]}>{s(t('idHash'))}</Text></View>
          <View style={[styles.tableCol, styles.colType]}><Text style={[styles.headerText, { textAlign: styles.colType.textAlign as any }]}>{s(t('type'))}</Text></View>
          <View style={[styles.tableCol, styles.colDate]}><Text style={[styles.headerText, { textAlign: styles.colDate.textAlign as any }]}>{s(t('time'))}</Text></View>
          <View style={[styles.tableCol, styles.colAmount]}><Text style={[styles.headerText, { textAlign: styles.colAmount.textAlign as any }]}>{s(t('amount'))}</Text></View>
        </View>
        {txs.map((tx, idx) => {
          const isNegative = tx?.type && ['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT', 'SALARY_PAYMENT', 'RETURN'].includes(tx.type);
          return (
            <View style={styles.tableRow} key={`${titleKey}-${idx}-${tx?.id || 'tx'}`}>
              <View style={[styles.tableCol, styles.colId]}>
                <Text style={[styles.cellText, { textAlign: styles.colId.textAlign as any }]}>#{tx?.id || 'N/A'}</Text>
              </View>
              <View style={[styles.tableCol, styles.colType]}>
                <Text style={[styles.cellText, { textAlign: styles.colType.textAlign as any }]}>{s(tx?.type ? t(tx.type.toLowerCase() as any) || tx.type : 'N/A')}</Text>
              </View>
              <View style={[styles.tableCol, styles.colDate]}>
                <Text style={[styles.cellText, { textAlign: styles.colDate.textAlign as any }]}>{tx?.createdAt ? new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              </View>
              <View style={[styles.tableCol, styles.colAmount]}>
                <Text style={[styles.cellText, { textAlign: styles.colAmount.textAlign as any }]}>{isNegative ? '-' : ''}{formatCurrency(tx?.amount || 0)}</Text>
              </View>
            </View>
          );
        })}
        {txs.length === 0 && (
          <View style={styles.tableRow}>
            <View style={[styles.tableCol, { width: '100%' }]}>
              <Text style={{ textAlign: 'center', fontSize: 9, color: '#94a3b8' }}>{s(t('noData' as any))}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.reportTitleText}>{s(t('financialSettlementReport'))}</Text>
            <View style={styles.reportIdContainer}>
              <Text style={styles.reportIdLabel}>{s(t('idHash'))}</Text>
              <Text style={styles.reportIdValue}>#{settlement.id}</Text>
            </View>
          </View>
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{s(t('reportDate'))}:</Text>
              <Text style={styles.metaValue}>{settlement.reportDate ? new Date(settlement.reportDate).toLocaleString('en-US') : ''}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{s(t('performedBy'))}:</Text>
              <Text style={styles.metaValue}>{s(String(settlement.performedBy?.name || 'System'))}</Text>
            </View>
          </View>
        </View>

        {/* Transactions Tables */}
        {renderTable('cashTransactionsDetails', cashTransactions)}
        {renderTable('networkTransactions', networkTransactions)}
        {renderTable('tabbyTransactions', tabbyTransactions)}
        {renderTable('tamaraTransactions', tamaraTransactions)}

        {/* Summary Section */}
        <View wrap={false} style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{s(t('totalNetworkVolume'))}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(settlement.totalNetworkVolume)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{s(t('totalTabbyVolume'))}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(settlement.totalTabbyVolume || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{s(t('totalTamaraVolume'))}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(settlement.totalTamaraVolume || 0)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.reconTopDivider]}>
            <Text style={styles.summaryLabel}>{s(t('systemExpectedCash'))}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(settlement.totalCashHanded)}</Text>
          </View>
          <View style={[styles.summaryRow, { backgroundColor: '#f8fafc' }]}>
            <Text style={styles.summaryLabel}>{s(t('physicallyCountedCash'))}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(settlement.actualCashCounted || 0)}</Text>
          </View>
          
          <View style={isMatch ? styles.reconResultMatch : styles.reconResultShort}>
            <Text style={isMatch ? styles.reconDiffLabelMatch : styles.reconDiffLabelShort}>
              {s(t('settlementDiscrepancy'))}
            </Text>
            <Text style={isMatch ? styles.reconDiffValueMatch : styles.reconDiffValueShort}>
              {discrepancy > 0 ? '+' : ''}{formatCurrency(discrepancy)}
            </Text>
          </View>
        </View>

        {/* Absolute Page Footer */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.pageFooterText}>{s(t('officialRecordFooter'))}</Text>
          <Text style={styles.pageFooterText}>-</Text>
          <Text style={styles.pageFooterText}>{new Date().toLocaleString('en-US')}</Text>
        </View>
      </Page>
    </Document>
  );
}
