import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { en, ar } from '@/lib/translations'

Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 }
  ]
});

export const StaffReportPDF = ({ staffSummary = [], totals = { base: 0, advances: 0, deductions: 0, net: 0 }, locale = 'en' }: { staffSummary: any[], totals: any, locale?: 'en' | 'ar' | string }) => {
  if (!staffSummary || !totals) return null;
  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || en[k] || k : en[k] || k;
  const isRtl = locale === 'ar';

  const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 12, fontFamily: 'Cairo' },
    header: { fontSize: 20, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
    table: { display: 'flex', flexDirection: 'column', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderRightWidth: isRtl ? 1 : 0, borderLeftWidth: isRtl ? 0 : 1, borderBottomWidth: 0 },
    tableRow: { flexDirection: isRtl ? 'row-reverse' : 'row' },
    tableColHeader: { width: '20%', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderLeftWidth: isRtl ? 1 : 0, borderRightWidth: isRtl ? 0 : 1, borderTopWidth: 0, backgroundColor: '#f0f0f0', padding: 5, fontWeight: 'bold', textAlign: isRtl ? 'right' : 'left' },
    tableCol: { width: '20%', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderLeftWidth: isRtl ? 1 : 0, borderRightWidth: isRtl ? 0 : 1, borderTopWidth: 0, padding: 5, textAlign: isRtl ? 'right' : 'left' },
    summary: { marginTop: 20, padding: 10, backgroundColor: '#f9f9f9', border: '1 solid #ccc', alignItems: isRtl ? 'flex-end' : 'flex-start' },
    summaryText: { marginBottom: 5, fontWeight: 'bold' }
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{t('staffSalaryReport')}</Text>
        
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}><Text>{t('employee')}</Text></View>
            <View style={styles.tableColHeader}><Text>{t('baseSalary')}</Text></View>
            <View style={styles.tableColHeader}><Text>{t('advances')}</Text></View>
            <View style={styles.tableColHeader}><Text>{t('deductions')}</Text></View>
            <View style={styles.tableColHeader}><Text>{t('netSalary')}</Text></View>
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
          <Text style={styles.summaryText}>{t('totalBaseSalaries')}: {totals.base.toFixed(2)}</Text>
          <Text style={styles.summaryText}>{t('totalAdvances')}: {totals.advances.toFixed(2)}</Text>
          <Text style={styles.summaryText}>{t('totalDeductions')}: {totals.deductions.toFixed(2)}</Text>
          <Text style={styles.summaryText}>{t('totalNetSalaries')}: {totals.net.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  )
}
