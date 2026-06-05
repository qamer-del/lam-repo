'use client'

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import '@/lib/pdf-fonts';
import { en, ar } from '@/lib/translations'
// react-pdf v4 does NOT support direction:rtl. Use shapeArabicVisual for visual (reversed) order.
// Pass text as-is; Noto Naskh Arabic font handles Arabic shaping via GSUB tables
const s = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return '';
  return String(text);
};
interface PayrollEntry {
  id: number
  name: string
  baseSalary: number
  overtimeAllowance?: number
  transportAllowance?: number
  otherAllowance?: number
  totalSalary: number
  advances: number
  deductions: number
  netSalary: number
}

interface PayrollReportDocumentProps {
  staffSummary: PayrollEntry[]
  totals: {
    base: number
    overtime: number
    transport: number
    other: number
    total: number
    advances: number
    deductions: number
    net: number
  }
  locale?: 'en' | 'ar' | string
  storeName?: string
  storePhone?: string
  reportMonth?: string
  reportYear?: number
}

export function PayrollReportDocument({
  staffSummary = [],
  totals,
  locale = 'en',
  storeName = 'Lamaha Car Care',
  storePhone = '+966 50 000 0000',
  reportMonth,
  reportYear,
}: PayrollReportDocumentProps) {
  if (!staffSummary || !totals) return null

  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || (en as any)[k] || k : (en as any)[k] || k
  const isRtl = locale === 'ar'

  const styles = StyleSheet.create({
    page: {
      padding: 30,
      fontSize: 9,
      fontFamily: 'Cairo',
      backgroundColor: '#ffffff',
      direction: isRtl ? 'rtl' : 'ltr',
    },

    // ── Header ───────────────────────────────────────────────────────
    header: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 2,
      borderBottomColor: '#1e40af',
      paddingBottom: 14,
      marginBottom: 16,
    },
    storeName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e40af',
    },
    storePhone: {
      fontSize: 9,
      color: '#64748b',
      marginTop: 3,
    },
    reportTitleBlock: {
      alignItems: isRtl ? 'flex-start' : 'flex-end',
    },
    reportTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    reportMeta: {
      fontSize: 8,
      color: '#94a3b8',
      marginTop: 3,
    },

    // ── Table ─────────────────────────────────────────────────────────
    table: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: 4,
    },
    tableRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      minHeight: 26,
      alignItems: 'center',
    },
    tableRowAlt: {
      backgroundColor: '#f8fafc',
    },
    tableHeaderRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      backgroundColor: '#1e40af',
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      minHeight: 28,
      alignItems: 'center',
    },
    cell: {
      padding: '4 6',
      fontSize: 8,
      color: '#334155',
      textAlign: isRtl ? 'right' : 'left',
    },
    headerCell: {
      padding: '4 6',
      fontSize: 8,
      fontWeight: 'bold',
      color: '#ffffff',
      textAlign: isRtl ? 'right' : 'left',
    },

    // Column widths
    colName:    { width: '18%' },
    colBase:    { width: '10%' },
    colOt:      { width: '9%' },
    colTrans:   { width: '9%' },
    colOther:   { width: '9%' },
    colTotal:   { width: '10%' },
    colAdv:     { width: '9%' },
    colDed:     { width: '9%' },
    colNet:     { width: '17%' },

    // ── Totals row ────────────────────────────────────────────────────
    totalsRow: {
      flexDirection: isRtl ? 'row-reverse' : 'row',
      backgroundColor: '#1e293b',
      minHeight: 28,
      alignItems: 'center',
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 4,
    },
    totalsCell: {
      padding: '4 6',
      fontSize: 8,
      fontWeight: 'bold',
      color: '#f0f9ff',
      textAlign: isRtl ? 'right' : 'left',
    },

    // ── Summary box ───────────────────────────────────────────────────
    summarySection: {
      marginTop: 20,
      flexDirection: isRtl ? 'row-reverse' : 'row',
      gap: 10,
    },
    summaryCard: {
      flex: 1,
      padding: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
      alignItems: isRtl ? 'flex-end' : 'flex-start',
    },
    summaryCardAccent: {
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
    },
    summaryLabel: {
      fontSize: 7,
      color: '#64748b',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    summaryValueAccent: {
      color: '#1e40af',
    },

    // ── Footer ────────────────────────────────────────────────────────
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 30,
      right: 30,
      fontSize: 7,
      color: '#94a3b8',
      textAlign: 'center',
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      paddingTop: 8,
    },
  })

  const fmt = (n: number) => (n ?? 0).toFixed(2)
  const now = new Date()
  const generatedStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const periodLabel = reportMonth && reportYear
    ? `${reportMonth} ${reportYear}`
    : now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const headerEmployee   = isRtl ? 'الموظف'      : 'Employee'
  const headerBase       = isRtl ? 'الأساسي'     : 'Base Sal.'
  const headerOt         = isRtl ? 'إضافي'       : 'OT'
  const headerTrans      = isRtl ? 'نقل'          : 'Trans.'
  const headerOther      = isRtl ? 'أخرى'        : 'Other'
  const headerTotal      = isRtl ? 'الإجمالي'    : 'Total'
  const headerAdv        = isRtl ? 'السلف'       : 'Advances'
  const headerDed        = isRtl ? 'الخصومات'    : 'Deductions'
  const headerNet        = isRtl ? 'صافي الراتب' : 'Net Salary'
  const totalsLabel      = isRtl ? 'المجموع'     : 'TOTALS'
  const labelBase        = isRtl ? 'إجمالي الرواتب الأساسية'  : 'Total Base Salaries'
  const labelNet         = isRtl ? 'إجمالي صافي الرواتب'      : 'Total Net Salaries'
  const labelAdv         = isRtl ? 'إجمالي السلف'             : 'Total Advances'
  const footerText       = isRtl
    ? `تقرير الرواتب الرسمي — ${storeName} | تم الإنشاء: ${generatedStr}`
    : `Official Payroll Report — ${storeName} | Generated: ${generatedStr}`

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        {/* Header */}
        <View style={styles.header}>
          <View style={{ alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
            <Text style={styles.storeName}>{s(storeName)}</Text>
            <Text style={styles.storePhone}>{s(storePhone)}</Text>
          </View>
          <View style={styles.reportTitleBlock}>
            <Text style={styles.reportTitle}>{s(isRtl ? 'تقرير الرواتب' : 'Payroll Report')}</Text>
            <Text style={styles.reportMeta}>{s(isRtl ? 'الفترة:' : 'Period:')} {s(periodLabel)}</Text>
            <Text style={styles.reportMeta}>{s(isRtl ? 'تاريخ الإنشاء:' : 'Generated:')} {s(generatedStr)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.headerCell, styles.colName]}>{s(headerEmployee)}</Text>
            <Text style={[styles.headerCell, styles.colBase]}>{s(headerBase)}</Text>
            <Text style={[styles.headerCell, styles.colOt]}>{s(headerOt)}</Text>
            <Text style={[styles.headerCell, styles.colTrans]}>{s(headerTrans)}</Text>
            <Text style={[styles.headerCell, styles.colOther]}>{s(headerOther)}</Text>
            <Text style={[styles.headerCell, styles.colTotal]}>{s(headerTotal)}</Text>
            <Text style={[styles.headerCell, styles.colAdv]}>{s(headerAdv)}</Text>
            <Text style={[styles.headerCell, styles.colDed]}>{s(headerDed)}</Text>
            <Text style={[styles.headerCell, styles.colNet]}>{s(headerNet)}</Text>
          </View>

          {/* Data Rows */}
          {staffSummary.map((item, idx) => (
            <View style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]} key={item.id}>
              <Text style={[styles.cell, styles.colName, { fontWeight: 'bold' }]}>{s(item.name)}</Text>
              <Text style={[styles.cell, styles.colBase]}>{s(fmt(item.baseSalary))}</Text>
              <Text style={[styles.cell, styles.colOt]}>{s(fmt(item.overtimeAllowance ?? 0))}</Text>
              <Text style={[styles.cell, styles.colTrans]}>{s(fmt(item.transportAllowance ?? 0))}</Text>
              <Text style={[styles.cell, styles.colOther]}>{s(fmt(item.otherAllowance ?? 0))}</Text>
              <Text style={[styles.cell, styles.colTotal, { fontWeight: 'bold' }]}>{s(fmt(item.totalSalary))}</Text>
              <Text style={[styles.cell, styles.colAdv, { color: '#dc2626' }]}>{s(fmt(item.advances))}</Text>
              <Text style={[styles.cell, styles.colDed, { color: '#dc2626' }]}>{s(fmt(item.deductions))}</Text>
              <Text style={[styles.cell, styles.colNet, { fontWeight: 'bold', color: '#059669' }]}>{s(fmt(item.netSalary))} SAR</Text>
            </View>
          ))}

          {/* Totals Row */}
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsCell, styles.colName]}>{s(totalsLabel)}</Text>
            <Text style={[styles.totalsCell, styles.colBase]}>{s(fmt(totals.base))}</Text>
            <Text style={[styles.totalsCell, styles.colOt]}>{s(fmt(totals.overtime))}</Text>
            <Text style={[styles.totalsCell, styles.colTrans]}>{s(fmt(totals.transport))}</Text>
            <Text style={[styles.totalsCell, styles.colOther]}>{s(fmt(totals.other))}</Text>
            <Text style={[styles.totalsCell, styles.colTotal]}>{s(fmt(totals.total))}</Text>
            <Text style={[styles.totalsCell, styles.colAdv]}>{s(fmt(totals.advances))}</Text>
            <Text style={[styles.totalsCell, styles.colDed]}>{s(fmt(totals.deductions))}</Text>
            <Text style={[styles.totalsCell, styles.colNet]}>{s(fmt(totals.net))} SAR</Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{s(labelBase)}</Text>
            <Text style={styles.summaryValue}>{s(fmt(totals.base))} SAR</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{s(labelAdv)}</Text>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{s(fmt(totals.advances))} SAR</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardAccent]}>
            <Text style={styles.summaryLabel}>{s(labelNet)}</Text>
            <Text style={[styles.summaryValue, styles.summaryValueAccent]}>{s(fmt(totals.net))} SAR</Text>
          </View>
        </View>

        <Text style={styles.footer}>{s(footerText)}</Text>
      </Page>
    </Document>
  )
}
