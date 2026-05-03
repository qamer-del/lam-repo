'use client'

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { en, ar } from '@/lib/translations'

// Font setup matching the previous PDF builder
Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 }
  ]
});

interface SalesDocumentProps {
  sales: any[];
  totalCash: number;
  totalNetwork: number;
  totalCredit: number;
  vatAmount: number;
  manualProfit: number;
  dateStr?: string;
  summaryOnly?: boolean;
  locale?: 'en' | 'ar' | string;
}

export function SalesDocument({ sales = [], totalCash = 0, totalNetwork = 0, totalCredit = 0, vatAmount = 0, manualProfit = 0, dateStr, summaryOnly, locale = 'en' }: SalesDocumentProps) {
  if (!sales) return null;
  const currentDate = dateStr || format(new Date(), 'PPP p');
  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || en[k] || k : en[k] || k;
  const isRtl = locale === 'ar';
  
  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Cairo' },
    header: { marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#10b981', paddingBottom: 15, alignItems: isRtl ? 'flex-end' : 'flex-start' },
    title: { fontSize: 24, fontWeight: 700, color: '#111827' },
    subtitle: { fontSize: 10, color: '#6b7280', marginTop: 4 },
    
    summaryBox: { 
      flexDirection: isRtl ? 'row-reverse' : 'row', 
      justifyContent: 'space-between', 
      backgroundColor: '#f3f4f6', 
      padding: 15, 
      borderRadius: 6,
      marginBottom: 30 
    },
    summaryItem: { flex: 1, alignItems: isRtl ? 'flex-end' : 'flex-start' },
    summaryLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4, textAlign: isRtl ? 'right' : 'left' },
    summaryValue: { fontSize: 16, fontWeight: 700, color: '#10b981', textAlign: isRtl ? 'right' : 'left' },
    
    table: { width: '100%', marginBottom: 30 },
    tableHeader: { 
      flexDirection: isRtl ? 'row-reverse' : 'row', 
      backgroundColor: '#1f2937', 
      color: '#ffffff',
      padding: 8,
      fontSize: 10,
      fontWeight: 700 
    },
    tableRow: { 
      flexDirection: isRtl ? 'row-reverse' : 'row', 
      borderBottomWidth: 1, 
      borderBottomColor: '#e5e7eb',
      padding: 8,
      fontSize: 10 
    },
    colMethod: { width: '20%', textAlign: isRtl ? 'right' : 'left' },
    colAmount: { width: '20%', textAlign: isRtl ? 'right' : 'left' },
    colDesc: { width: '35%', textAlign: isRtl ? 'right' : 'left' },
    colDate: { width: '25%', textAlign: isRtl ? 'right' : 'left' },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{summaryOnly ? t('officialSalesReportSummary') : t('officialSalesReport')}</Text>
          <Text style={styles.subtitle}>{t('generatedAt')} {currentDate}</Text>
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('grossSales')}</Text>
            <Text style={styles.summaryValue}>{(totalCash + totalNetwork + totalCredit).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('netCash')}</Text>
            <Text style={styles.summaryValue}>{totalCash.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('netNetwork')}</Text>
            <Text style={styles.summaryValue}>{totalNetwork.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('netCredit')}</Text>
            <Text style={styles.summaryValue}>{totalCredit.toFixed(2)}</Text>
          </View>
        </View>

        <View style={[styles.summaryBox, { marginTop: -20 }]}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('vat15')}</Text>
            <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{vatAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('netProfit')}</Text>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>{manualProfit.toFixed(2)}</Text>
          </View>
        </View>

        {!summaryOnly && (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colMethod}>{t('method')}</Text>
              <Text style={styles.colAmount}>{t('amount')}</Text>
              <Text style={styles.colDesc}>{t('description')}</Text>
              <Text style={styles.colDate}>{t('reportDate')}</Text>
            </View>

            {sales.map((sale) => {
              const saleMethodText = sale.type === 'RETURN' ? t('refund') : t((sale.method as string).toLowerCase() as any) || sale.method;
              return (
              <View key={sale.id} style={[styles.tableRow, sale.type === 'RETURN' ? { backgroundColor: '#fef2f2' } : {}]}>
                <Text style={styles.colMethod}>{saleMethodText}</Text>
                <Text style={[styles.colAmount, sale.type === 'RETURN' ? { color: '#b91c1c', fontWeight: 'bold' } : {}]}>
                  {sale.type === 'RETURN' ? '-' : ''}{sale.amount.toFixed(2)}
                </Text>
                <Text style={styles.colDesc}>{sale.description || '-'}</Text>
                <Text style={styles.colDate}>{format(new Date(sale.createdAt), 'MM/dd/yy HH:mm')}</Text>
              </View>
            )})}
          </View>
        )}

      </Page>
    </Document>
  )
}
