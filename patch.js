const fs = require('fs');

function patch(file, regex1, replace1) {
  let c = fs.readFileSync(file, 'utf8');
  // inject useLanguage import if not there
  if (!c.includes('useLanguage')) {
    c = "import { useLanguage } from '@/providers/language-provider';\n" + c;
  }
  
  if (!c.includes('const { locale } = useLanguage()')) {
    // Basic injection after the first { of the component
    // this regex finds `}) {` or `) {` for the main component
    c = c.replace(/(\nexport (default )?function [^{]+\{\n)/, "$1  const { locale } = useLanguage();\n");
    // fallback for const Arrow = () => {
    if (!c.includes('const { locale } = useLanguage()')) {
      c = c.replace(/(= \([^)]*\) => \{\n)/, "$1  const { locale } = useLanguage();\n");
    }
  }

  // replace component
  if (regex1) {
    c = c.replace(regex1, replace1);
  }

  fs.writeFileSync(file, c);
  console.log('Patched ' + file);
}

patch('d:/project-lamv2/src/components/view-invoice-modal.tsx', /<InvoiceDocument details={details} warranties={warranties} \/>/, '<InvoiceDocument details={details} warranties={warranties} locale={locale} />');

patch('d:/project-lamv2/src/components/settlement-history.tsx', /<SettlementDocument settlement={data} transactions={data.transactions} \/>/, '<SettlementDocument settlement={data} transactions={data.transactions} locale={locale} />');

patch('d:/project-lamv2/src/components/settle-cash-btn.tsx', /<SettlementDocument settlement={settlement} transactions={settlement.transactions as any\[\]} \/>/, '<SettlementDocument settlement={settlement} transactions={settlement.transactions as any[]} locale={locale} />');

patch('d:/project-lamv2/src/components/close-shift-btn.tsx', /<SettlementDocument settlement={settlement} transactions={settlement.transactions as any\[\]} \/>/, '<SettlementDocument settlement={settlement} transactions={settlement.transactions as any[]} locale={locale} />');

patch('d:/project-lamv2/src/components/salary-settlement-modal.tsx', /<SalarySettlementDocument([^>]*)staffName={selectedStaff\.name}([^>]*)\/>/s, '<SalarySettlementDocument$1staffName={selectedStaff.name}$2 locale={locale} />');

patch('d:/project-lamv2/src/components/salary-settlement-pdf-button.tsx', /<SalarySettlementDocument([^>]*)settlement={settlement}([^>]*)\/>/s, '<SalarySettlementDocument$1settlement={settlement}$2 locale={locale} />');

patch('d:/project-lamv2/src/components/pdf-report-button.tsx', /<StaffReportPDF staffSummary={staffSummary} totals={totals} \/>/, '<StaffReportPDF staffSummary={staffSummary} totals={totals} locale={locale} />');

patch('d:/project-lamv2/src/components/agents-ledger.tsx', /<AgentPdfReportButton agent={selectedAgent} netBalance={netBalance} \/>/, '<AgentPdfReportButton agent={selectedAgent} netBalance={netBalance} locale={locale} />');
