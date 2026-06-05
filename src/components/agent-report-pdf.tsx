'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import '@/lib/pdf-fonts';
import { en, ar } from '@/lib/translations'

// react-pdf v4 does NOT support direction:rtl. Use shapeArabicVisual for visual (reversed) order.
// Pass text as-is; Noto Naskh Arabic font handles Arabic shaping via GSUB tables
const s = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return '';
  return String(text);
};
const AgentReportPDF = ({ agent, netBalance = 0, locale = 'en' }: any) => {
  if (!agent) return null;
  const t = (k: keyof typeof en) => locale === 'ar' ? (ar as any)[k] || en[k] || k : en[k] || k;
  const isRtl = locale === 'ar';

  const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 12, fontFamily: 'Cairo' },
    header: { fontSize: 20, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
    info: { marginBottom: 10, fontSize: 14, textAlign: isRtl ? 'right' : 'left' },
    table: { display: 'flex', flexDirection: 'column', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderRightWidth: isRtl ? 1 : 0, borderLeftWidth: isRtl ? 0 : 1, borderBottomWidth: 0, marginTop: 10 },
    tableRow: { flexDirection: isRtl ? 'row-reverse' : 'row' },
    tableColHeader: { width: '25%', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderLeftWidth: isRtl ? 1 : 0, borderRightWidth: isRtl ? 0 : 1, borderTopWidth: 0, backgroundColor: '#f0f0f0', padding: 5, fontWeight: 'bold', textAlign: isRtl ? 'right' : 'left' },
    tableCol: { width: '25%', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderLeftWidth: isRtl ? 1 : 0, borderRightWidth: isRtl ? 0 : 1, borderTopWidth: 0, padding: 5, textAlign: isRtl ? 'right' : 'left' },
    summary: { marginTop: 20, padding: 10, backgroundColor: '#f9f9f9', border: '1 solid #ccc', alignItems: isRtl ? 'flex-end' : 'flex-start' },
    summaryText: { marginBottom: 5, fontWeight: 'bold' }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{s(t('agentReport'))}</Text>
        <Text style={styles.info}>{s(`${t('employee')} / ${t('company')}: ${agent.name}`)}</Text>
        <Text style={styles.info}>{s(`${t('company')}: ${agent.companyName || 'N/A'}`)}</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>{s(`${t('openingBalanceDebt')}: ${agent.openingBalance.toFixed(2)}`)}</Text>
          <Text style={styles.summaryText}>{s(`${t('currentNetBalance')}: ${netBalance.toFixed(2)}`)}</Text>
        </View>
        
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}><Text>{s(t('date'))}</Text></View>
            <View style={styles.tableColHeader}><Text>{s(t('type'))}</Text></View>
            <View style={styles.tableColHeader}><Text>{s(t('amount'))}</Text></View>
            <View style={styles.tableColHeader}><Text>{s(t('description'))}</Text></View>
          </View>
          {agent.transactions?.map((tx: any) => (
            <View style={styles.tableRow} key={tx.id}>
              <View style={styles.tableCol}><Text>{s(new Date(tx.createdAt).toLocaleDateString())}</Text></View>
              <View style={styles.tableCol}><Text>{s(t(tx.type.toLowerCase() as any) || tx.type)}</Text></View>
              <View style={styles.tableCol}><Text>{s(tx.amount.toFixed(2))}</Text></View>
              <View style={styles.tableCol}><Text>{s(tx.description || '-')}</Text></View>
            </View>
          ))}
          {(!agent.transactions || agent.transactions.length === 0) && (
            <View style={styles.tableRow}>
               <View style={{...styles.tableCol, width: '100%', textAlign: 'center'}}><Text>{s(t('noTransactionsFound'))}</Text></View>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <button disabled className="px-4 py-2 bg-gray-300 text-gray-700 rounded-full text-sm font-medium">Preparing PDF...</button> }
)

export function AgentPdfReportButton({ agent, netBalance, locale = 'en' }: { agent: any, netBalance: number, locale?: string }) {
  return (
    <PDFDownloadLink document={<AgentReportPDF agent={agent} netBalance={netBalance} locale={locale} />} fileName={`agent-report-${agent.name}.pdf`}>
      {({ loading }) =>
        <button className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${loading ? 'bg-gray-300 text-gray-700' : 'bg-red-600 text-white hover:bg-red-700 shadow-md'}`}>
          {loading ? 'Preparing PDF...' : 'Download PDF Report'}
        </button>
      }
    </PDFDownloadLink>
  )
}
