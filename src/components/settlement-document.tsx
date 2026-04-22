import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register Arabic Font and English Font if necessary for PDF. 
// For now we will use default PDF fonts and keep structure clean.
// Font.register({ family: 'Cairo', src: 'https://fonts.gstatic.com/s/cairo/v20/SLXGc1nY6HkvamIn.woff2' });

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
    paddingBottom: 5,
    paddingTop: 5,
  },
  col: {
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
  total: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  }
});

export function SettlementDocument({ settlement, transactions }: { settlement: any, transactions: any[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Settlement Report</Text>
        
        <View style={styles.row}>
          <Text style={[styles.col, styles.bold]}>Date:</Text>
          <Text style={styles.col}>{new Date(settlement.reportDate).toLocaleString()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, styles.bold]}>Settlement ID:</Text>
          <Text style={styles.col}>#{settlement.id}</Text>
        </View>

        <Text style={{ marginTop: 20, marginBottom: 10, fontSize: 14, fontWeight: 'bold' }}>Transaction Summary</Text>
        <View style={[styles.row, { backgroundColor: '#f3f4f6' }]}>
          <Text style={[styles.col, { flex: 0.5 }]}>ID</Text>
          <Text style={styles.col}>Type</Text>
          <Text style={styles.col}>Method</Text>
          <Text style={styles.col}>Amount</Text>
        </View>
        
        {transactions.map((tx) => (
          <View style={styles.row} key={tx.id}>
            <Text style={[styles.col, { flex: 0.5 }]}>#{tx.id}</Text>
            <Text style={styles.col}>{tx.type}</Text>
            <Text style={styles.col}>{tx.method}</Text>
            <Text style={styles.col}>
              {['EXPENSE', 'ADVANCE', 'OWNER_WITHDRAWAL', 'AGENT_PAYMENT', 'SALARY_PAYMENT', 'RETURN'].includes(tx.type) ? '-' : ''}
              {tx.amount.toFixed(2)}
            </Text>
          </View>
        ))}

        <View style={styles.total}>
          <Text style={{ fontSize: 13, color: '#4b5563' }}>Expected Cash in Drawer: {settlement.totalCashHanded.toFixed(2)}</Text>
          <Text style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>Expected Network Total: {settlement.totalNetworkVolume.toFixed(2)}</Text>
          <Text style={{ marginTop: 10, fontSize: 16 }}>Grand Total: {(settlement.totalCashHanded + settlement.totalNetworkVolume).toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  );
}
