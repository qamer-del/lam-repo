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
    page: { padding: 20, fontSize: 8, fontFamily: 'Cairo' },
    header: { fontSize: 16, marginBottom: 15, textAlign: 'center', fontWeight: 'bold' },
    table: { display: 'flex', flexDirection: 'column', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderRightWidth: isRtl ? 1 : 0, borderLeftWidth: isRtl ? 0 : 1, borderBottomWidth: 0 },
    tableRow: { flexDirection: isRtl ? 'row-reverse' : 'row' },
    tableColHeader: { borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderLeftWidth: isRtl ? 1 : 0, borderRightWidth: isRtl ? 0 : 1, borderTopWidth: 0, backgroundColor: '#f0f0f0', padding: 4, fontWeight: 'bold', textAlign: isRtl ? 'right' : 'left' },
    tableCol: { borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderLeftWidth: isRtl ? 1 : 0, borderRightWidth: isRtl ? 0 : 1, borderTopWidth: 0, padding: 4, textAlign: isRtl ? 'right' : 'left' },
    summary: { marginTop: 20, padding: 10, backgroundColor: '#f9f9f9', border: '1 solid #ccc', alignItems: isRtl ? 'flex-end' : 'flex-start' },
    summaryText: { marginBottom: 3, fontWeight: 'bold', fontSize: 10 },
    
    // Column widths
    colEmployee: { width: '16%' },
    colBase: { width: '9%' },
    colOT: { width: '8%' },
    colTrans: { width: '8%' },
    colOther: { width: '8%' },
    colTotal: { width: '10%' },
    colAdv: { width: '9%' },
    colDed: { width: '9%' },
    colNet: { width: '23%' },
  })

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <Text style={styles.header}>{t('staffSalaryReport')}</Text>
        
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.tableColHeader, styles.colEmployee]}><Text>{t('employee')}</Text></View>
            <View style={[styles.tableColHeader, styles.colBase]}><Text>Base</Text></View>
            <View style={[styles.tableColHeader, styles.colOT]}><Text>O.T.</Text></View>
            <View style={[styles.tableColHeader, styles.colTrans]}><Text>Trans.</Text></View>
            <View style={[styles.tableColHeader, styles.colOther]}><Text>Other</Text></View>
            <View style={[styles.tableColHeader, styles.colTotal]}><Text>Total</Text></View>
            <View style={[styles.tableColHeader, styles.colAdv]}><Text>Adv.</Text></View>
            <View style={[styles.tableColHeader, styles.colDed]}><Text>Ded.</Text></View>
            <View style={[styles.tableColHeader, styles.colNet]}><Text>{t('netSalary')}</Text></View>
          </View>
          {staffSummary.map((s: any) => (
            <View style={styles.tableRow} key={s.id}>
              <View style={[styles.tableCol, styles.colEmployee]}><Text>{s.name}</Text></View>
              <View style={[styles.tableCol, styles.colBase]}><Text>{s.baseSalary.toFixed(2)}</Text></View>
              <View style={[styles.tableCol, styles.colOT]}><Text>{(s.overtimeAllowance || 0).toFixed(2)}</Text></View>
              <View style={[styles.tableCol, styles.colTrans]}><Text>{(s.transportAllowance || 0).toFixed(2)}</Text></View>
              <View style={[styles.tableCol, styles.colOther]}><Text>{(s.otherAllowance || 0).toFixed(2)}</Text></View>
              <View style={[styles.tableCol, styles.colTotal]}><Text>{s.totalSalary.toFixed(2)}</Text></View>
              <View style={[styles.tableCol, styles.colAdv]}><Text>{s.advances.toFixed(2)}</Text></View>
              <View style={[styles.tableCol, styles.colDed]}><Text>{s.deductions.toFixed(2)}</Text></View>
              <View style={[styles.tableCol, styles.colNet]}><Text>{s.netSalary.toFixed(2)}</Text></View>
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
