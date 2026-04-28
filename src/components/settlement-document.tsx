import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  header: {
    flexDirection: 'row',
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
  },
  meta: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 5,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
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
    borderRightWidth: 1,
    padding: 5,
  },
  colId: { width: '15%' },
  colType: { width: '25%' },
  colMethod: { width: '20%' },
  colAmount: { width: '20%', textAlign: 'right' },
  colDate: { width: '20%' },
  summarySection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontWeight: 'bold',
  },
  summaryValue: {
    fontWeight: 'bold',
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

export function SettlementDocument({ settlement, transactions }: { settlement: any, transactions: any[] }) {
  const cashTransactions = transactions.filter(tx => tx.method === 'CASH');
  const networkTransactions = transactions.filter(tx => tx.method === 'NETWORK');
  
  const discrepancy = (settlement.actualCashCounted || 0) - settlement.totalCashHanded;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>CASH SETTLEMENT REPORT</Text>
            <Text style={{ fontSize: 12, marginTop: 4 }}>ID: #{settlement.id}</Text>
          </View>
          <View style={styles.meta}>
            <Text>Report Date: {new Date(settlement.reportDate).toLocaleString()}</Text>
            <Text>Performed By: {settlement.performedBy?.name || 'System'}</Text>
          </View>
        </View>

        {/* Cash Transactions Table */}
        <Text style={styles.sectionTitle}>Cash Transactions Details</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCol, styles.colId]}>ID</Text>
            <Text style={[styles.tableCol, styles.colType]}>Type</Text>
            <Text style={[styles.tableCol, styles.colDate]}>Time</Text>
            <Text style={[styles.tableCol, styles.colAmount]}>Amount</Text>
          </View>
          {cashTransactions.map((tx) => (
            <View style={styles.tableRow} key={tx.id}>
              <Text style={[styles.tableCol, styles.colId]}>#{tx.id}</Text>
              <Text style={[styles.tableCol, styles.colType]}>{tx.type}</Text>
              <Text style={[styles.tableCol, styles.colDate]}>{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <Text style={[styles.tableCol, styles.colAmount]}>
                {['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT', 'SALARY_PAYMENT', 'RETURN'].includes(tx.type) ? '-' : ''}
                {tx.amount.toFixed(2)}
              </Text>
            </View>
          ))}
          {cashTransactions.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '100%', textAlign: 'center' }]}>No cash transactions in this period.</Text>
            </View>
          )}
        </View>

        {/* Network Transactions Table */}
        <Text style={styles.sectionTitle}>Network / Bank Transactions</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCol, styles.colId]}>ID</Text>
            <Text style={[styles.tableCol, styles.colType]}>Type</Text>
            <Text style={[styles.tableCol, styles.colDate]}>Time</Text>
            <Text style={[styles.tableCol, styles.colAmount]}>Amount</Text>
          </View>
          {networkTransactions.map((tx) => (
            <View style={styles.tableRow} key={tx.id}>
              <Text style={[styles.tableCol, styles.colId]}>#{tx.id}</Text>
              <Text style={[styles.tableCol, styles.colType]}>{tx.type}</Text>
              <Text style={[styles.tableCol, styles.colDate]}>{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <Text style={[styles.tableCol, styles.colAmount]}>{tx.amount.toFixed(2)}</Text>
            </View>
          ))}
          {networkTransactions.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, { width: '100%', textAlign: 'center' }]}>No network transactions in this period.</Text>
            </View>
          )}
        </View>

        {/* Summary Footer */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Network Sales Volume:</Text>
            <Text style={styles.summaryValue}>{settlement.totalNetworkVolume.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 }]}>
            <Text style={styles.summaryLabel}>System Expected Cash:</Text>
            <Text style={styles.summaryValue}>{settlement.totalCashHanded.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Physically Counted Cash:</Text>
            <Text style={styles.summaryValue}>{settlement.actualCashCounted?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: discrepancy !== 0 ? '#b91c1c' : '#059669' }]}>Settlement Discrepancy:</Text>
            <Text style={[styles.summaryValue, { color: discrepancy !== 0 ? '#b91c1c' : '#059669' }]}>
              {discrepancy > 0 ? '+' : ''}{discrepancy.toFixed(2)}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is an official financial record of LAM Detailing Shop. Generated on {new Date().toLocaleString()}.
        </Text>
      </Page>
    </Document>
  );
}
