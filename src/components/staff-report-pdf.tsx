import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import '@/lib/pdf-fonts';
import { en, ar } from '@/lib/translations'
// react-pdf v4 does NOT support direction:rtl. Use shapeArabicVisual for visual (reversed) order.
// Pass text as-is; Noto Naskh Arabic font handles Arabic shaping via GSUB tables
const s = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return '';
  return String(text);
};
export const StaffReportPDF = ({ staffSummary = [], totals = { base: 0, advances: 0, deductions: 0, net: 0 }, locale = 'en' }: { staffSummary: any[], totals: any, locale?: 'en' | 'ar' | string }) => {
  if (!staffSummary || !totals) return null;
  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || en[k] || k : en[k] || k;
  const isRtl = locale === 'ar';

  const styles = StyleSheet.create({
    page: { padding: 20, fontSize: 8, fontFamily: 'Cairo', direction: isRtl ? 'rtl' : 'ltr' },
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
        <Text style={styles.header}>{s(t('staffSalaryReport'))}</Text>
        
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.tableColHeader, styles.colEmployee]}><Text>{s(t('employee'))}</Text></View>
            <View style={[styles.tableColHeader, styles.colBase]}><Text>{s(t('baseSalary'))}</Text></View>
            <View style={[styles.tableColHeader, styles.colOT]}><Text>{s(t('overtime'))}</Text></View>
            <View style={[styles.tableColHeader, styles.colTrans]}><Text>{s(t('transport'))}</Text></View>
            <View style={[styles.tableColHeader, styles.colOther]}><Text>{s(t('otherAllowance'))}</Text></View>
            <View style={[styles.tableColHeader, styles.colTotal]}><Text>{s(t('totalSalary'))}</Text></View>
            <View style={[styles.tableColHeader, styles.colAdv]}><Text>{s(t('advances'))}</Text></View>
            <View style={[styles.tableColHeader, styles.colDed]}><Text>{s(t('deductions'))}</Text></View>
            <View style={[styles.tableColHeader, styles.colNet]}><Text>{s(t('netSalary'))}</Text></View>
          </View>
          {staffSummary.map((item: any) => (
            <View style={styles.tableRow} key={item.id}>
              <View style={[styles.tableCol, styles.colEmployee]}><Text>{s(item.name)}</Text></View>
              <View style={[styles.tableCol, styles.colBase]}><Text>{s(item.baseSalary.toFixed(2))}</Text></View>
              <View style={[styles.tableCol, styles.colOT]}><Text>{s((item.overtimeAllowance || 0).toFixed(2))}</Text></View>
              <View style={[styles.tableCol, styles.colTrans]}><Text>{s((item.transportAllowance || 0).toFixed(2))}</Text></View>
              <View style={[styles.tableCol, styles.colOther]}><Text>{s((item.otherAllowance || 0).toFixed(2))}</Text></View>
              <View style={[styles.tableCol, styles.colTotal]}><Text>{s(item.totalSalary.toFixed(2))}</Text></View>
              <View style={[styles.tableCol, styles.colAdv]}><Text>{s(item.advances.toFixed(2))}</Text></View>
              <View style={[styles.tableCol, styles.colDed]}><Text>{s(item.deductions.toFixed(2))}</Text></View>
              <View style={[styles.tableCol, styles.colNet]}><Text>{s(item.netSalary.toFixed(2))}</Text></View>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>{s(`${t('totalBaseSalaries')}: ${totals.base.toFixed(2)}`)}</Text>
          <Text style={styles.summaryText}>{s(`${t('totalAdvances')}: ${totals.advances.toFixed(2)}`)}</Text>
          <Text style={styles.summaryText}>{s(`${t('totalDeductions')}: ${totals.deductions.toFixed(2)}`)}</Text>
          <Text style={styles.summaryText}>{s(`${t('totalNetSalaries')}: ${totals.net.toFixed(2)}`)}</Text>
        </View>
      </Page>
    </Document>
  )
}
