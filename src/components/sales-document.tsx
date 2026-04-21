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
  dateStr?: string;
}

export function SalesDocument({ sales, totalCash, totalNetwork, dateStr }: SalesDocumentProps) {
  const currentDate = dateStr || format(new Date(), 'PPP p');
  const grandTotal = totalCash + totalNetwork;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>OFFICIAL SALES REPORT</Text>
          <Text style={styles.subtitle}>Generated at: {currentDate}</Text>
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Cash Sales</Text>
            <Text style={styles.summaryValue}>{totalCash.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Net Sales</Text>
            <Text style={styles.summaryValue}>{totalNetwork.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Combined Total</Text>
            <Text style={[styles.summaryValue, { color: '#4f46e5' }]}>{grandTotal.toFixed(2)}</Text>
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
            <View key={sale.id} style={styles.tableRow}>
              <Text style={styles.colMethod}>{sale.method}</Text>
              <Text style={styles.colAmount}>{sale.amount.toFixed(2)}</Text>
              <Text style={styles.colDesc}>{sale.description || '-'}</Text>
              <Text style={styles.colDate}>{format(new Date(sale.createdAt), 'MM/dd/yy HH:mm')}</Text>
            </View>
          ))}
        </View>

      </Page>
    </Document>
  )
}
