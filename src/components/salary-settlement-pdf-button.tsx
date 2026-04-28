'use client'

import { PDFDownloadLink } from '@react-pdf/renderer';
import { Printer, Download } from 'lucide-react';
import { Button } from './ui/button';
import { SalarySettlementDocument } from './salary-settlement-document';
import { useState, useEffect } from 'react';

interface SalarySettlementPdfButtonProps {
  staffName: string;
  idNumber?: string;
  nationality?: string;
  settlement: any;
}

export function SalarySettlementPdfButton({ staffName, idNumber, nationality, settlement }: SalarySettlementPdfButtonProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <PDFDownloadLink
      document={<SalarySettlementDocument staffName={staffName} idNumber={idNumber} nationality={nationality} settlement={settlement} />}
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
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
          ) : (
            <Printer size={16} />
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
