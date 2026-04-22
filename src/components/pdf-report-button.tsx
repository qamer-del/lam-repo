'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { StaffReportPDF } from './staff-report-pdf'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <button disabled className="px-4 py-2 bg-gray-300 text-gray-700 rounded-full text-sm font-medium">Preparing PDF...</button> }
)

export function PdfReportButton({ staffSummary, totals }: { staffSummary: any, totals: any }) {
  return (
    <PDFDownloadLink document={<StaffReportPDF staffSummary={staffSummary} totals={totals} />} fileName="staff-report.pdf">
      {({ loading }) =>
        <button className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${loading ? 'bg-gray-300 text-gray-700' : 'bg-red-600 text-white hover:bg-red-700 shadow-md'}`}>
          {loading ? 'Preparing PDF...' : 'Download PDF Report'}
        </button>
      }
    </PDFDownloadLink>
  )
}
