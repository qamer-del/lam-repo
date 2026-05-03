import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { en, ar } from '@/lib/translations'

Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 }
  ]
});

export function SalarySettlementDocument({ 
  staffName, 
  idNumber,
  nationality,
  month, 
  year, 
  baseSalary = 0, 
  advances = [], 
  totalAdvances = 0, 
  netPaid = 0,
  paymentMethod = 'CASH',
  locale = 'en'
}: { 
  staffName: string, 
  idNumber?: string,
  nationality?: string,
  month: number, 
  year: number, 
  baseSalary: number, 
  advances: any[], 
  totalAdvances: number, 
  netPaid: number,
  paymentMethod: 'CASH' | 'NETWORK',
  locale?: 'en' | 'ar' | string
}) {
  if (month === undefined || year === undefined) return null;
  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || en[k] || k : en[k] || k;
  const isRtl = locale === 'ar';

  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Cairo', backgroundColor: '#ffffff' },
    header: { marginBottom: 30, textAlign: isRtl ? 'right' : 'center', borderBottom: 2, borderBottomColor: '#3b82f6', paddingBottom: 10 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
    infoSection: { marginBottom: 30, flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between' },
    infoBox: { flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' },
    label: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2, textAlign: isRtl ? 'right' : 'left' },
    value: { fontSize: 14, fontWeight: 'bold', color: '#1f2937', textAlign: isRtl ? 'right' : 'left' },
    table: { marginTop: 20 },
    tableHeader: { flexDirection: isRtl ? 'row-reverse' : 'row', backgroundColor: '#f9fafb', padding: 8, borderBottom: 1, borderBottomColor: '#e5e7eb' },
    tableRow: { flexDirection: isRtl ? 'row-reverse' : 'row', padding: 8, borderBottom: 1, borderBottomColor: '#f3f4f6' },
    col1: { flex: 2, textAlign: isRtl ? 'right' : 'left' },
    col2: { flex: 1, textAlign: isRtl ? 'left' : 'right' },
    summary: { marginTop: 30, padding: 15, backgroundColor: '#f0f9ff', borderRadius: 8 },
    totalRow: { flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 5 },
    totalLabel: { fontSize: 12, color: '#0369a1' },
    totalValue: { fontSize: 16, fontWeight: 'bold', color: '#0c4a6e' },
    
    declarationBox: { marginTop: 50, padding: 20, borderTop: 1, borderTopColor: '#e5e7eb' },
    declarationTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, textAlign: isRtl ? 'right' : 'left' },
    declarationText: { fontSize: 10, color: '#4b5563', marginBottom: 30, lineHeight: 1.5, textAlign: isRtl ? 'right' : 'left' },
    signatureBox: { flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 20 },
    signatureBlock: { width: '40%', borderTop: 1, borderTopColor: '#d1d5db', paddingTop: 10 },
    signatureLabel: { fontSize: 10, color: '#6b7280', textAlign: 'center' }
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('salarySettlementVoucher')}</Text>
          <Text style={styles.subtitle}>{month}/{year}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Text style={styles.label}>{t('staffDetails')}</Text>
            <Text style={styles.value}>{staffName}</Text>
            {idNumber && <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{t('idNumber')}: {idNumber}</Text>}
            {nationality && <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{t('nationality')}: {nationality}</Text>}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>{t('date')}</Text>
            <Text style={styles.value}>{format(new Date(), 'PP')}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.label}>{t('paymentMethod')}</Text>
            <Text style={[styles.value, { color: paymentMethod === 'NETWORK' ? '#7c3aed' : '#2563eb' }]}>{t(paymentMethod.toLowerCase() as any) || paymentMethod}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, textAlign: isRtl ? 'right' : 'left' }}>{t('deductionsTotal')}</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, { fontSize: 10, fontWeight: 'bold' }]}>{t('description')} / {t('date')}</Text>
            <Text style={[styles.col2, { fontSize: 10, fontWeight: 'bold' }]}>{t('amount')}</Text>
          </View>
          {advances.map((adv, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.col1, { fontSize: 10 }]}>{format(new Date(adv.createdAt), 'PP')}</Text>
              <Text style={[styles.col2, { fontSize: 10 }]}>{adv.amount.toFixed(2)}</Text>
            </View>
          ))}
          {advances.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.col1, { fontSize: 10, color: '#9ca3af' }]}>{t('noTransactionsFound')}</Text>
              <Text style={[styles.col2, { fontSize: 10 }]}>0.00</Text>
            </View>
          )}
        </View>

        <View style={styles.summary}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('baseSalary')}</Text>
            <Text style={[styles.totalValue, { fontSize: 14, color: '#1f2937' }]}>{baseSalary.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('deductionsTotal')}</Text>
            <Text style={[styles.totalValue, { fontSize: 14, color: '#b91c1c' }]}>- {totalAdvances.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 10, borderTop: 1, borderTopColor: '#bae6fd', paddingTop: 10 }]}>
            <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>{t('netSalaryPaid')}</Text>
            <Text style={styles.totalValue}>{netPaid.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.declarationBox}>
          <Text style={styles.declarationTitle}>{t('declaration')}</Text>
          <Text style={styles.declarationText}>{t('declarationText')}</Text>
          
          <View style={styles.signatureBox}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>{t('employeeSignature')}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>{t('managerSignature')}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
