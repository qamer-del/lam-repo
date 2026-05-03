const fs = require('fs');

function replace(file, src, dest) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(src, dest);
  fs.writeFileSync(file, c);
}

replace('d:/project-lamv2/src/components/agents-ledger.tsx', 
  'export function AgentsLedger({ agents }: { agents: any[] }) {\n  const { data: session } = useSession()',
  'export function AgentsLedger({ agents }: { agents: any[] }) {\n  const { locale } = useLanguage();\n  const { data: session } = useSession()'
);

replace('d:/project-lamv2/src/components/agents-ledger.tsx', 
  'export function AgentsLedger({ agents }: { agents: any[] }) {\r\n  const { data: session } = useSession()',
  'export function AgentsLedger({ agents }: { agents: any[] }) {\r\n  const { locale } = useLanguage();\r\n  const { data: session } = useSession()'
);

// For view-invoice-modal.tsx
replace('d:/project-lamv2/src/components/view-invoice-modal.tsx', 
  '}) {\n  const [loading, setLoading] = useState(false)',
  '}) {\n  const { locale } = useLanguage();\n  const [loading, setLoading] = useState(false)'
);
replace('d:/project-lamv2/src/components/view-invoice-modal.tsx', 
  '}) {\r\n  const [loading, setLoading] = useState(false)',
  '}) {\r\n  const { locale } = useLanguage();\r\n  const [loading, setLoading] = useState(false)'
);

let vim = fs.readFileSync('d:/project-lamv2/src/components/view-invoice-modal.tsx', 'utf8');
if(vim.startsWith("import { useLanguage } from '@/providers/language-provider';\n'use client'")) {
  vim = vim.replace("import { useLanguage } from '@/providers/language-provider';\n'use client'", "'use client'\nimport { useLanguage } from '@/providers/language-provider';");
  fs.writeFileSync('d:/project-lamv2/src/components/view-invoice-modal.tsx', vim);
}
if(vim.startsWith("import { useLanguage } from '@/providers/language-provider';\r\n'use client'")) {
  vim = vim.replace("import { useLanguage } from '@/providers/language-provider';\r\n'use client'", "'use client'\r\nimport { useLanguage } from '@/providers/language-provider';");
  fs.writeFileSync('d:/project-lamv2/src/components/view-invoice-modal.tsx', vim);
}

// For salary-settlement-pdf-button.tsx
replace('d:/project-lamv2/src/components/salary-settlement-pdf-button.tsx', 
  "import { SalarySettlementDocument } from './salary-settlement-pdf'\n",
  "import { SalarySettlementDocument } from './salary-settlement-pdf'\nimport { useLanguage } from '@/providers/language-provider'\n"
);
replace('d:/project-lamv2/src/components/salary-settlement-pdf-button.tsx', 
  "import { SalarySettlementDocument } from './salary-settlement-pdf'\r\n",
  "import { SalarySettlementDocument } from './salary-settlement-pdf'\r\nimport { useLanguage } from '@/providers/language-provider'\r\n"
);

replace('d:/project-lamv2/src/components/salary-settlement-pdf-button.tsx', 
  'export function SalarySettlementPdfButton({ settlement }: { settlement: any }) {\n',
  'export function SalarySettlementPdfButton({ settlement }: { settlement: any }) {\n  const { locale } = useLanguage();\n'
);
replace('d:/project-lamv2/src/components/salary-settlement-pdf-button.tsx', 
  'export function SalarySettlementPdfButton({ settlement }: { settlement: any }) {\r\n',
  'export function SalarySettlementPdfButton({ settlement }: { settlement: any }) {\r\n  const { locale } = useLanguage();\r\n'
);

// Fix the PDF component type in salary-settlement-pdf-button.tsx
replace('d:/project-lamv2/src/components/salary-settlement-pdf-button.tsx', 
  '<SalarySettlementDocument\n',
  '<SalarySettlementDocument locale={locale}\n'
);
replace('d:/project-lamv2/src/components/salary-settlement-pdf-button.tsx', 
  '<SalarySettlementDocument\r\n',
  '<SalarySettlementDocument locale={locale}\r\n'
);

replace('d:/project-lamv2/src/components/salary-settlement-pdf-button.tsx', 
  '<SalarySettlementDocument ',
  '<SalarySettlementDocument locale={locale} '
);

console.log("Patched additional TSX files");
