import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { en, ar } from '@/lib/translations';
import { shapeArabicVisual } from 'naqqash';

// react-pdf v4 does NOT support direction:rtl in its layout engine.
// shapeArabicVisual reverses the character order for LTR renderers — correct for react-pdf.
// shapeArabicText keeps logical order (for PDF viewers with native bidi support) — wrong for react-pdf.
const s = (text: string | number | null | undefined, isRtl = false): string => {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return isRtl ? shapeArabicVisual(str) : str;
};

Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 }
  ]
});

export function SettlementDocument({ settlement, transactions = [], locale = 'en' }: { settlement: any, transactions?: any[], locale?: 'en' | 'ar' | string }) {
  if (!settlement) return null;
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
      padding: 40,
      fontSize: 10,
      fontFamily: 'Cairo',
      color: '#333',
      // direction is intentionally NOT set — react-pdf v4 does not support it.
      // RTL layout is achieved via flexDirection:row-reverse and textAlign:right.
    },
    header: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginBottom: 30,
      borderBottomWidth: 2,
      borderBottomColor: '#1e40af',
      paddingBottom: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1e40af',
      textAlign: isRtl ? 'right' : 'left',
    },
    meta: {
      fontSize: 10,
      color: '#666',
      textAlign: isRtl ? 'left' : 'right',
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 10,
      backgroundColor: '#f3f4f6',
      padding: 5,
      textAlign: isRtl ? 'right' : 'left',
    },
    table: {
      width: 'auto',
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRightWidth: isRtl ? 1 : 0,
      borderLeftWidth: isRtl ? 0 : 1,
      borderBottomWidth: 0,
    },
    tableRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      borderBottomColor: '#e5e7eb',
      borderBottomWidth: 1,
      minHeight: 25,
      alignItems: 'center',
    },
    tableHeader: {
      backgroundColor: '#f9fafb',
      fontWeight: 'bold',
    },
    tableCol: {
      borderRightColor: '#e5e7eb',
      borderRightWidth: isRtl ? 0 : 1,
      borderLeftWidth: isRtl ? 1 : 0,
      borderLeftColor: '#e5e7eb',
      padding: 5,
    },
    colId: { width: '15%', textAlign: isRtl ? 'right' : 'left' },
    colType: { width: '25%', textAlign: isRtl ? 'right' : 'left' },
    colMethod: { width: '20%', textAlign: isRtl ? 'right' : 'left' },
    colAmount: { width: '20%', textAlign: isRtl ? 'left' : 'right' },
    colDate: { width: '20%', textAlign: isRtl ? 'right' : 'left' },
    summarySection: {
      marginTop: 30,
      padding: 15,
      backgroundColor: '#f8fafc',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    summaryRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginBottom: 5,
    },
    summaryLabel: {
      fontWeight: 'bold',
      textAlign: isRtl ? 'right' : 'left',
    },
    summaryValue: {
      fontWeight: 'bold',
      textAlign: isRtl ? 'left' : 'right',
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      fontSize: 8,
      color: '#999',
      textAlign: 'center',
      borderTopWidth: 1,
      borderTopColor: '#eee',
      paddingTop: 10,
    }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{s(String(t('financialSettlementReport')), isRtl)}</Text>
            <Text style={{ fontSize: 12, marginTop: 4, textAlign: isRtl ? 'right' : 'left' }}>{s(`${t('idHash')}${settlement.id || ''}`, isRtl)}</Text>
          </View>
          <View style={styles.meta}>
            <Text>{s(`${t('reportDate')}: ${settlement.reportDate ? new Date(settlement.reportDate).toLocaleString() : ''}`, isRtl)}</Text>
            <Text>{s(`${t('performedBy')}: ${String(settlement.performedBy?.name || 'System')}`, isRtl)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{s(t('cashTransactionsDetails'), isRtl)}</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCol, styles.colId]}>{s(t('idHash'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colType]}>{s(t('type'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colDate]}>{s(t('time'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colAmount]}>{s(t('amount'), isRtl)}</Text>
          </View>
          {cashTransactions.map((tx, idx) => (
            <View style={styles.tableRow} key={`cash-${idx}-${tx?.id || 'tx'}`}>
              <Text style={[styles.tableCol, styles.colId]}>{s(`#${tx?.id || 'N/A'}`)}</Text>
              <Text style={[styles.tableCol, styles.colType]}>{s(tx?.type ? t(tx.type.toLowerCase() as any) || tx.type : 'N/A', isRtl)}</Text>
              <Text style={[styles.tableCol, styles.colDate]}>{tx?.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              <Text style={[styles.tableCol, styles.colAmount]}>
                {`${tx?.type && ['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT', 'SALARY_PAYMENT', 'RETURN'].includes(tx.type) ? '-' : ''}${(tx?.amount || 0).toFixed(2)}`}
              </Text>
            </View>
          ))}
          {cashTransactions.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '100%', textAlign: 'center', borderRightWidth: 0, borderLeftWidth: 0 }]}>{s(t('noCashTxPeriod'), isRtl)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{s(t('networkTransactions'), isRtl)}</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCol, styles.colId]}>{s(t('idHash'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colType]}>{s(t('type'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colDate]}>{s(t('time'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colAmount]}>{s(t('amount'), isRtl)}</Text>
          </View>
          {networkTransactions.map((tx, idx) => (
            <View style={styles.tableRow} key={`net-${idx}-${tx?.id || 'tx'}`}>
              <Text style={[styles.tableCol, styles.colId]}>{s(`#${tx?.id || 'N/A'}`)}</Text>
              <Text style={[styles.tableCol, styles.colType]}>{s(tx?.type ? t(tx.type.toLowerCase() as any) || tx.type : 'N/A', isRtl)}</Text>
              <Text style={[styles.tableCol, styles.colDate]}>{tx?.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              <Text style={[styles.tableCol, styles.colAmount]}>{(tx?.amount || 0).toFixed(2)}</Text>
            </View>
          ))}
          {networkTransactions.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '100%', textAlign: 'center', borderRightWidth: 0, borderLeftWidth: 0 }]}>{s(t('noNetTxPeriod'), isRtl)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{s(t('tabbyTransactions'), isRtl)}</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCol, styles.colId]}>{s(t('idHash'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colType]}>{s(t('type'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colDate]}>{s(t('time'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colAmount]}>{s(t('amount'), isRtl)}</Text>
          </View>
          {tabbyTransactions.map((tx, idx) => (
            <View style={styles.tableRow} key={`tabby-${idx}-${tx?.id || 'tx'}`}>
              <Text style={[styles.tableCol, styles.colId]}>{s(`#${tx?.id || 'N/A'}`)}</Text>
              <Text style={[styles.tableCol, styles.colType]}>{s(tx?.type ? t(tx.type.toLowerCase() as any) || tx.type : 'N/A', isRtl)}</Text>
              <Text style={[styles.tableCol, styles.colDate]}>{tx?.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              <Text style={[styles.tableCol, styles.colAmount]}>{(tx?.amount || 0).toFixed(2)}</Text>
            </View>
          ))}
          {tabbyTransactions.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '100%', textAlign: 'center', borderRightWidth: 0, borderLeftWidth: 0 }]}>{s(t('noTabbyTxPeriod'), isRtl)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{s(t('tamaraTransactions'), isRtl)}</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCol, styles.colId]}>{s(t('idHash'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colType]}>{s(t('type'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colDate]}>{s(t('time'), isRtl)}</Text>
            <Text style={[styles.tableCol, styles.colAmount]}>{s(t('amount'), isRtl)}</Text>
          </View>
          {tamaraTransactions.map((tx, idx) => (
            <View style={styles.tableRow} key={`tamara-${idx}-${tx?.id || 'tx'}`}>
              <Text style={[styles.tableCol, styles.colId]}>{s(`#${tx?.id || 'N/A'}`)}</Text>
              <Text style={[styles.tableCol, styles.colType]}>{s(tx?.type ? t(tx.type.toLowerCase() as any) || tx.type : 'N/A', isRtl)}</Text>
              <Text style={[styles.tableCol, styles.colDate]}>{tx?.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              <Text style={[styles.tableCol, styles.colAmount]}>{(tx?.amount || 0).toFixed(2)}</Text>
            </View>
          ))}
          {tamaraTransactions.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '100%', textAlign: 'center', borderRightWidth: 0, borderLeftWidth: 0 }]}>{s(t('noTamaraTxPeriod'), isRtl)}</Text>
            </View>
          )}
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{s(t('totalNetworkVolume'), isRtl)}</Text>
            <Text style={styles.summaryValue}>{settlement.totalNetworkVolume.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{s(t('totalTabbyVolume'), isRtl)}</Text>
            <Text style={styles.summaryValue}>{settlement.totalTabbyVolume?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{s(t('totalTamaraVolume'), isRtl)}</Text>
            <Text style={styles.summaryValue}>{settlement.totalTamaraVolume?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 }]}>
            <Text style={styles.summaryLabel}>{s(t('systemExpectedCash'), isRtl)}</Text>
            <Text style={styles.summaryValue}>{settlement.totalCashHanded.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{s(t('physicallyCountedCash'), isRtl)}</Text>
            <Text style={styles.summaryValue}>{settlement.actualCashCounted?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: discrepancy !== 0 ? '#b91c1c' : '#059669' }]}>{s(t('settlementDiscrepancy'), isRtl)}</Text>
            <Text style={[styles.summaryValue, { color: discrepancy !== 0 ? '#b91c1c' : '#059669' }]}>
              {`${discrepancy > 0 ? '+' : ''}${discrepancy.toFixed(2)}`}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {s(`${t('officialRecordFooter')} ${new Date().toLocaleString()}.`, isRtl)}
        </Text>
      </Page>
    </Document>
  );
}
