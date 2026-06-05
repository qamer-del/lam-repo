import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import '@/lib/pdf-fonts';
import { format } from 'date-fns'
import { en, ar } from '@/lib/translations'
// react-pdf v4 does NOT support direction:rtl. Use shapeArabicVisual for visual (reversed) order.
// Pass text as-is; Noto Naskh Arabic font handles Arabic shaping via GSUB tables
const s = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return '';
  return String(text);
};
// Cairo font supports both Arabic and Latin — required for correct Arabic character shaping

interface FinanceReportDocumentProps {
  data: any
  dateRange: { from: Date; to: Date }
  t: any
  locale?: 'en' | 'ar' | string
}

export const FinanceReportDocument = ({ data, dateRange, t, locale = 'en' }: FinanceReportDocumentProps) => {
  const { stats, methodBreakdown } = data
  const isRtl = locale === 'ar'

  const styles = StyleSheet.create({
    page: {
      padding: 40,
      backgroundColor: '#ffffff',
      fontFamily: 'Cairo',
      direction: isRtl ? 'rtl' : 'ltr',
    },
    header: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginBottom: 40,
      borderBottomWidth: 2,
      borderBottomColor: '#1e40af',
      paddingBottom: 20,
    },
    titleContainer: {
      flexDirection: 'column',
      alignItems: isRtl ? 'flex-end' : 'flex-start',
    },
    reportTitle: {
      fontSize: 24,
      color: '#1e40af',
      fontWeight: 'bold',
    },
    reportSubtitle: {
      fontSize: 10,
      color: '#64748b',
      marginTop: 4,
      fontWeight: 'bold',
    },
    metaContainer: {
      textAlign: isRtl ? 'left' : 'right',
      alignItems: isRtl ? 'flex-start' : 'flex-end',
    },
    metaText: {
      fontSize: 9,
      color: '#64748b',
      marginBottom: 2,
    },
    summaryGrid: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
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
      marginBottom: 5,
      fontWeight: 'bold',
      textAlign: isRtl ? 'right' : 'left',
    },
    cardValue: {
      fontSize: 14,
      color: '#0f172a',
      fontWeight: 'bold',
      textAlign: isRtl ? 'right' : 'left',
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#1e40af',
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      paddingBottom: 5,
      textAlign: isRtl ? 'right' : 'left',
    },
    table: {
      width: 'auto',
    },
    tableRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
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
      textAlign: isRtl ? 'right' : 'left',
    },
    tableCellHeader: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#475569',
      textAlign: isRtl ? 'right' : 'left',
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      paddingTop: 10,
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
    },
    footerText: {
      fontSize: 8,
      color: '#94a3b8',
    },
  })

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' SAR'
  }

  const totalRevenue = stats?.totalRevenue || 1 // avoid div/0 in percentage calc

  const reportTitle = isRtl ? 'تقرير مالي' : 'Finance Report'
  const reportSubtitle = isRtl ? 'نظام المحاسبة والرواتب - لمعة' : 'Lamaha Accounting & Payroll System'
  const generatedLabel = isRtl ? 'تاريخ الإنشاء:' : 'Generated:'
  const periodLabel = isRtl ? 'الفترة:' : 'Period:'
  const revenueLabel = isRtl ? 'الإيرادات' : 'Revenue'
  const cogsLabel = isRtl ? 'تكلفة البضاعة' : 'COGS'
  const expensesLabel = isRtl ? 'المصروفات' : 'Expenses'
  const netProfitLabel = isRtl ? 'صافي الربح' : 'Net Profit'
  const paymentMethodsTitle = isRtl ? 'الإيرادات حسب طريقة الدفع' : 'Revenue by Payment Method'
  const methodHeader = isRtl ? 'الطريقة' : 'Method'
  const amountHeader = isRtl ? 'المبلغ' : 'Amount'
  const percentageHeader = isRtl ? 'النسبة' : 'Percentage'
  const opsTitle = isRtl ? 'ملخص العمليات المالية' : 'Financial Operations Summary'
  const dateHeader = isRtl ? 'التاريخ' : 'Date'
  const descHeader = isRtl ? 'البيان' : 'Description'
  const typeHeader = isRtl ? 'النوع' : 'Type'
  const footerText = isRtl ? 'نظام إدارة لمعة - سري' : 'Lamaha Car Care Management System - Confidential'
  const pageLabel = isRtl ? 'صفحة 1 من 1' : 'Page 1 of 1'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.reportTitle}>{s(reportTitle)}</Text>
            <Text style={styles.reportSubtitle}>{s(reportSubtitle)}</Text>
          </View>
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>{s(`${generatedLabel} ${format(new Date(), 'dd MMM yyyy')}`)}</Text>
            <Text style={styles.metaText}>
              {s(`${periodLabel} ${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`)}
            </Text>
          </View>
        </View>

        {/* Summary Grid */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>{s(revenueLabel)}</Text>
            <Text style={styles.cardValue}>{s(formatCurrency(stats?.totalRevenue))}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>{s(cogsLabel)}</Text>
            <Text style={styles.cardValue}>{s(formatCurrency(stats?.totalCogs))}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>{s(expensesLabel)}</Text>
            <Text style={styles.cardValue}>{s(formatCurrency(stats?.totalExpenses))}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.cardValue, { color: (stats?.netProfit || 0) >= 0 ? '#059669' : '#dc2626' }]}>
              {s(formatCurrency(stats?.netProfit))}
            </Text>
            <Text style={styles.cardLabel}>{s(netProfitLabel)}</Text>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{s(paymentMethodsTitle)}</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>{s(methodHeader)}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>{s(amountHeader)}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>{s(percentageHeader)}</Text></View>
            </View>
            {Object.entries(methodBreakdown || {}).map(([method, amount]: [any, any]) => (
              <View key={method} style={styles.tableRow}>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{s(method)}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{s(formatCurrency(amount))}</Text></View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {s(`${((amount / totalRevenue) * 100).toFixed(1)}%`)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{s(opsTitle)}</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>{s(dateHeader)}</Text></View>
              <View style={[styles.tableCol, { flex: 2 }]}><Text style={styles.tableCellHeader}>{s(descHeader)}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>{s(typeHeader)}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>{s(amountHeader)}</Text></View>
            </View>
            {(data.allTransactions || []).slice(0, 15).map((tx: any) => (
              <View key={tx.id} style={styles.tableRow}>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{s(format(new Date(tx.createdAt), 'dd/MM/yyyy'))}</Text></View>
                <View style={[styles.tableCol, { flex: 2 }]}><Text style={styles.tableCell}>{s(tx.description || (isRtl ? 'لا يوجد وصف' : 'No description'))}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{s(tx.type)}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{s(formatCurrency(tx.amount))}</Text></View>
              </View>
            ))}
          </View>
          {(data.allTransactions || []).length > 15 && (
            <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 10, textAlign: isRtl ? 'right' : 'left' }}>
              {s(isRtl ? '* تظهر أول 15 معاملة فقط في ملخص PDF.' : '* Only showing first 15 transactions in PDF summary.')}
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{s(footerText)}</Text>
          <Text style={styles.footerText}>{s(pageLabel)}</Text>
        </View>
      </Page>
    </Document>
  )
}
