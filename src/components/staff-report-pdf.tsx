import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 12 },
  header: { fontSize: 20, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  table: { display: 'flex', flexDirection: 'column', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderRightWidth: 0, borderBottomWidth: 0 },
  tableRow: { flexDirection: 'row' },
  tableColHeader: { width: '20%', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#f0f0f0', padding: 5, fontWeight: 'bold' },
  tableCol: { width: '20%', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderLeftWidth: 0, borderTopWidth: 0, padding: 5 },
  summary: { marginTop: 20, padding: 10, backgroundColor: '#f9f9f9', border: '1 solid #ccc' },
  summaryText: { marginBottom: 5, fontWeight: 'bold' }
})

export const StaffReportPDF = ({ staffSummary, totals }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Staff Salary Report</Text>
      
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}><Text>Employee</Text></View>
          <View style={styles.tableColHeader}><Text>Base Salary</Text></View>
          <View style={styles.tableColHeader}><Text>Advances</Text></View>
          <View style={styles.tableColHeader}><Text>Deductions</Text></View>
          <View style={styles.tableColHeader}><Text>Net Salary</Text></View>
        </View>
        {staffSummary.map((s: any) => (
          <View style={styles.tableRow} key={s.id}>
            <View style={styles.tableCol}><Text>{s.name}</Text></View>
            <View style={styles.tableCol}><Text>{s.baseSalary.toFixed(2)}</Text></View>
            <View style={styles.tableCol}><Text>{s.advances.toFixed(2)}</Text></View>
            <View style={styles.tableCol}><Text>{s.deductions.toFixed(2)}</Text></View>
            <View style={styles.tableCol}><Text>{s.netSalary.toFixed(2)}</Text></View>
          </View>
        ))}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Total Base Salaries: {totals.base.toFixed(2)}</Text>
        <Text style={styles.summaryText}>Total Advances: {totals.advances.toFixed(2)}</Text>
        <Text style={styles.summaryText}>Total Deductions: {totals.deductions.toFixed(2)}</Text>
        <Text style={styles.summaryText}>Total Net Salaries: {totals.net.toFixed(2)}</Text>
      </View>
    </Page>
  </Document>
)
