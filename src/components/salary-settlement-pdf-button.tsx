'use client'

import { PDFDownloadLink } from '@react-pdf/renderer';
import { Printer, Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { SalarySettlementDocument } from './salary-settlement-document';
import { useState, useEffect } from 'react'
import { useLanguage } from '@/providers/language-provider';

interface SalarySettlementPdfButtonProps {
  staffName: string;
  idNumber?: string;
  nationality?: string;
  settlement: any;
}

export function SalarySettlementPdfButton({ staffName, idNumber, nationality, settlement }: SalarySettlementPdfButtonProps) {
  const { locale } = useLanguage();

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <PDFDownloadLink
      document={<SalarySettlementDocument locale={locale} staffName={staffName} idNumber={idNumber} nationality={nationality} settlement={settlement} />}
      fileName={`salary-settlement-${staffName}-${settlement.month}-${settlement.year}.pdf`}
    >
      {({ loading }) => (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Printer size={16} />
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
