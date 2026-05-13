import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { format } from 'date-fns'

// NOTE: Use explicit built-in font family names for bold text.
// Do NOT use fontWeight: 'bold' with fontFamily: 'Helvetica' — it crashes @react-pdf/textkit.
// Built-in font families: Helvetica, Helvetica-Bold, Helvetica-Oblique,
//   Times-Roman, Times-Bold, Courier, Courier-Bold

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    paddingBottom: 20,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  reportTitle: {
    fontSize: 24,
    color: '#1e40af',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  reportSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    fontFamily: 'Helvetica-Bold',
  },
  metaContainer: {
    textAlign: 'right',
  },
  metaText: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 40,
  },
  summaryCard: {
    flex: 1,
    minWidth: '22%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
  },
  cardValue: {
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    marginBottom: 15,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 5,
  },
  table: {
    width: 'auto',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  tableCol: {
    flex: 1,
    padding: 5,
  },
  tableCell: {
    fontSize: 9,
    color: '#334155',
  },
  tableCellHeader: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
})

interface FinanceReportDocumentProps {
  data: any
  dateRange: { from: Date; to: Date }
  t: any
}

export const FinanceReportDocument = ({ data, dateRange, t }: FinanceReportDocumentProps) => {
  const { stats, methodBreakdown } = data

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' SAR'
  }

  const totalRevenue = stats?.totalRevenue || 1 // avoid div/0 in percentage calc

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.reportTitle}>Finance Report</Text>
            <Text style={styles.reportSubtitle}>Lamaha Accounting & Payroll System</Text>
          </View>
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>Generated: {format(new Date(), 'dd MMM yyyy')}</Text>
            <Text style={styles.metaText}>
              Period: {format(dateRange.from, 'dd MMM yyyy')} - {format(dateRange.to, 'dd MMM yyyy')}
            </Text>
          </View>
        </View>

        {/* Summary Grid */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Revenue</Text>
            <Text style={styles.cardValue}>{formatCurrency(stats?.totalRevenue)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>COGS</Text>
            <Text style={styles.cardValue}>{formatCurrency(stats?.totalCogs)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>Expenses</Text>
            <Text style={styles.cardValue}>{formatCurrency(stats?.totalExpenses)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.cardValue, { color: (stats?.netProfit || 0) >= 0 ? '#059669' : '#dc2626' }]}>
              {formatCurrency(stats?.netProfit)}
            </Text>
            <Text style={styles.cardLabel}>Net Profit</Text>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue by Payment Method</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Method</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Amount</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Percentage</Text></View>
            </View>
            {Object.entries(methodBreakdown || {}).map(([method, amount]: [any, any]) => (
              <View key={method} style={styles.tableRow}>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{method}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{formatCurrency(amount)}</Text></View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {((amount / totalRevenue) * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Operations Summary</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Date</Text></View>
              <View style={[styles.tableCol, { flex: 2 }]}><Text style={styles.tableCellHeader}>Description</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Type</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Amount</Text></View>
            </View>
            {(data.allTransactions || []).slice(0, 15).map((tx: any) => (
              <View key={tx.id} style={styles.tableRow}>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{format(new Date(tx.createdAt), 'dd/MM/yyyy')}</Text></View>
                <View style={[styles.tableCol, { flex: 2 }]}><Text style={styles.tableCell}>{tx.description || 'No description'}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{tx.type}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{formatCurrency(tx.amount)}</Text></View>
              </View>
            ))}
          </View>
          {(data.allTransactions || []).length > 15 && (
            <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 10 }}>
              * Only showing first 15 transactions in PDF summary.
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Lamaha Car Care Management System - Confidential</Text>
          <Text style={styles.footerText}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  )
}
