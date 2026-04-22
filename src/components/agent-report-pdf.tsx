'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 12 },
  header: { fontSize: 20, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  info: { marginBottom: 10, fontSize: 14 },
  table: { display: 'flex', flexDirection: 'column', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderRightWidth: 0, borderBottomWidth: 0, marginTop: 10 },
  tableRow: { flexDirection: 'row' },
  tableColHeader: { width: '25%', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: '#f0f0f0', padding: 5, fontWeight: 'bold' },
  tableCol: { width: '25%', borderStyle: 'solid', borderWidth: 1, borderColor: '#ccc', borderLeftWidth: 0, borderTopWidth: 0, padding: 5 },
  summary: { marginTop: 20, padding: 10, backgroundColor: '#f9f9f9', border: '1 solid #ccc' },
  summaryText: { marginBottom: 5, fontWeight: 'bold' }
})

const AgentReportPDF = ({ agent, netBalance }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Representative / Agent Report</Text>
      <Text style={styles.info}>Name: {agent.name}</Text>
      <Text style={styles.info}>Company: {agent.companyName || 'N/A'}</Text>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Opening Balance (Debt): {agent.openingBalance.toFixed(2)}</Text>
        <Text style={styles.summaryText}>Current Net Balance: {netBalance.toFixed(2)}</Text>
      </View>
      
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}><Text>Date</Text></View>
          <View style={styles.tableColHeader}><Text>Type</Text></View>
          <View style={styles.tableColHeader}><Text>Amount</Text></View>
          <View style={styles.tableColHeader}><Text>Description</Text></View>
        </View>
        {agent.transactions?.map((tx: any) => (
          <View style={styles.tableRow} key={tx.id}>
            <View style={styles.tableCol}><Text>{new Date(tx.createdAt).toLocaleDateString()}</Text></View>
            <View style={styles.tableCol}><Text>{tx.type}</Text></View>
            <View style={styles.tableCol}><Text>{tx.amount.toFixed(2)}</Text></View>
            <View style={styles.tableCol}><Text>{tx.description || '-'}</Text></View>
          </View>
        ))}
        {(!agent.transactions || agent.transactions.length === 0) && (
          <View style={styles.tableRow}>
             <View style={{...styles.tableCol, width: '100%'}}><Text>No transactions found.</Text></View>
          </View>
        )}
      </View>
    </Page>
  </Document>
)

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <button disabled className="px-4 py-2 bg-gray-300 text-gray-700 rounded-full text-sm font-medium">Preparing PDF...</button> }
)

export function AgentPdfReportButton({ agent, netBalance }: { agent: any, netBalance: number }) {
  return (
    <PDFDownloadLink document={<AgentReportPDF agent={agent} netBalance={netBalance} />} fileName={`agent-report-${agent.name}.pdf`}>
      {({ loading }) =>
        <button className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${loading ? 'bg-gray-300 text-gray-700' : 'bg-red-600 text-white hover:bg-red-700 shadow-md'}`}>
          {loading ? 'Preparing PDF...' : 'Download PDF Report'}
        </button>
      }
    </PDFDownloadLink>
  )
}
