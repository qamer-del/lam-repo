'use client'

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'

// Font setup matching the previous PDF builder
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf', fontWeight: 700 }
  ]
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Inter' },
  header: { marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#10b981', paddingBottom: 15 },
  title: { fontSize: 24, fontWeight: 700, color: '#111827' },
  subtitle: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  
  summaryBox: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    backgroundColor: '#f3f4f6', 
    padding: 15, 
    borderRadius: 6,
    marginBottom: 30 
  },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: 700, color: '#10b981' },
  
  table: { width: '100%', marginBottom: 30 },
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#1f2937', 
    color: '#ffffff',
    padding: 8,
    fontSize: 10,
    fontWeight: 700 
  },
  tableRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb',
    padding: 8,
    fontSize: 10 
  },
  colMethod: { width: '20%' },
  colAmount: { width: '20%' },
  colDesc: { width: '35%' },
  colDate: { width: '25%' },
})

interface SalesDocumentProps {
  sales: any[];
  totalCash: number;
  totalNetwork: number;
  vatAmount: number;
  manualProfit: number;
  dateStr?: string;
}

export function SalesDocument({ sales, totalCash, totalNetwork, vatAmount, manualProfit, dateStr }: SalesDocumentProps) {
  const currentDate = dateStr || format(new Date(), 'PPP p');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>OFFICIAL SALES REPORT</Text>
          <Text style={styles.subtitle}>Generated at: {currentDate}</Text>
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net Cash Sales</Text>
            <Text style={styles.summaryValue}>{totalCash.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net Network Sales</Text>
            <Text style={styles.summaryValue}>{totalNetwork.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>VAT (15%)</Text>
            <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{vatAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net Profit</Text>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>{manualProfit.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colMethod}>Method</Text>
            <Text style={styles.colAmount}>Amount</Text>
            <Text style={styles.colDesc}>Notes</Text>
            <Text style={styles.colDate}>Date</Text>
          </View>

          {sales.map((sale) => (
            <View key={sale.id} style={[styles.tableRow, sale.type === 'RETURN' ? { backgroundColor: '#fef2f2' } : {}]}>
              <Text style={styles.colMethod}>{sale.type === 'RETURN' ? 'REFUND' : sale.method}</Text>
              <Text style={[styles.colAmount, sale.type === 'RETURN' ? { color: '#b91c1c', fontWeight: 'bold' } : {}]}>
                {sale.type === 'RETURN' ? '-' : ''}{sale.amount.toFixed(2)}
              </Text>
              <Text style={styles.colDesc}>{sale.description || '-'}</Text>
              <Text style={styles.colDate}>{format(new Date(sale.createdAt), 'MM/dd/yy HH:mm')}</Text>
            </View>
          ))}
        </View>

      </Page>
    </Document>
  )
}
