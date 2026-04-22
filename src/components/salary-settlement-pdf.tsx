import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'

Font.register({
  family: 'Cairo',
  src: 'https://fonts.gstatic.com/s/cairo/v20/SLXQ1nq9_z82-S97K1vV.ttf'
})

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Cairo', backgroundColor: '#ffffff' },
  header: { marginBottom: 30, textAlign: 'center', borderBottom: 2, borderBottomColor: '#3b82f6', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  infoSection: { marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between' },
  infoBox: { flex: 1 },
  label: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' },
  table: { marginTop: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', padding: 8, borderBottom: 1, borderBottomColor: '#e5e7eb' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottom: 1, borderBottomColor: '#f3f4f6' },
  col1: { flex: 2 },
  col2: { flex: 1, textAlign: 'right' },
  footer: { marginTop: 50, textAlign: 'center', borderTop: 1, borderTopColor: '#e5e7eb', paddingTop: 20 },
  summary: { marginTop: 30, padding: 15, backgroundColor: '#f0f9ff', borderRadius: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  totalLabel: { fontSize: 12, color: '#0369a1' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#0c4a6e' }
})

export function SalarySettlementDocument({ 
  staffName, 
  month, 
  year, 
  baseSalary, 
  advances, 
  totalAdvances, 
  netPaid 
}: { 
  staffName: string, 
  month: number, 
  year: number, 
  baseSalary: number, 
  advances: any[], 
  totalAdvances: number, 
  netPaid: number 
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Salary Settlement Advice</Text>
          <Text style={styles.subtitle}>Period: {month}/{year}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Employee Name</Text>
            <Text style={styles.value}>{staffName}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>Settlement Date</Text>
            <Text style={styles.value}>{format(new Date(), 'PP')}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Advances & Deductions</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, { fontSize: 10, fontWeight: 'bold' }]}>Description / Date</Text>
            <Text style={[styles.col2, { fontSize: 10, fontWeight: 'bold' }]}>Amount</Text>
          </View>
          {advances.map((adv, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.col1, { fontSize: 10 }]}>{format(new Date(adv.createdAt), 'PP')}</Text>
              <Text style={[styles.col2, { fontSize: 10 }]}>{adv.amount.toFixed(2)}</Text>
            </View>
          ))}
          {advances.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.col1, { fontSize: 10, color: '#9ca3af' }]}>No advances recorded.</Text>
              <Text style={[styles.col2, { fontSize: 10 }]}>0.00</Text>
            </View>
          )}
        </View>

        <View style={styles.summary}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gross Base Salary</Text>
            <Text style={[styles.totalValue, { fontSize: 14, color: '#1f2937' }]}>{baseSalary.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Advances Deducted</Text>
            <Text style={[styles.totalValue, { fontSize: 14, color: '#b91c1c' }]}>- {totalAdvances.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 10, borderTop: 1, borderTopColor: '#bae6fd', paddingTop: 10 }]}>
            <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>Final Payment (Net)</Text>
            <Text style={styles.totalValue}>{netPaid.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>This is an electronically generated salary settlement advice. No signature is required.</Text>
          <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 5 }}>Lamaha Tech Accounting</Text>
        </View>
      </Page>
    </Document>
  )
}
