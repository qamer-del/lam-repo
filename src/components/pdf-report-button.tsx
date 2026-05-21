'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { StaffReportPDF } from './staff-report-pdf'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/language-provider'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <Button disabled variant="outline" className="gap-2 px-6"><Loader2 size={16} className="animate-spin" /> Preparing PDF...</Button> }
)

export function PdfReportButton({ staffSummary, totals }: { staffSummary: any, totals: any }) {
  const { locale } = useLanguage();
  return (
    <PDFDownloadLink document={<StaffReportPDF staffSummary={staffSummary} totals={totals} locale={locale} />} fileName="staff-report.pdf">
      {({ loading }) =>
        <Button 
          variant="outline" 
          className={`gap-2 px-6 border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-md transition-all active:scale-95 ${loading ? 'opacity-70' : ''}`}
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {loading ? 'Preparing PDF...' : 'Download PDF Report'}
        </Button>
      }
    </PDFDownloadLink>
  )
}
