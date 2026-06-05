const fs = require('fs');
const path = require('path');

const dir = 'd:/project-lamv2/src/components';
const files = [
  'agent-report-pdf.tsx',
  'finance-report-document.tsx',
  'invoice-document.tsx',
  'payroll-report-document.tsx',
  'salary-settlement-document.tsx',
  'salary-settlement-pdf.tsx',
  'sales-document.tsx',
  'settlement-document.tsx',
  'shift-report-document.tsx',
  'staff-report-pdf.tsx'
];

const regex = /Font\.register\(\{\s*family:\s*'Cairo',\s*fonts:\s*\[\s*\{\s*src:\s*'\/fonts\/Cairo-Regular\.ttf',\s*fontWeight:\s*400\s*\},\s*\{\s*src:\s*'\/fonts\/Cairo-Bold\.ttf',\s*fontWeight:\s*700\s*\}\s*\]\s*\}\);?/g;

const replacementBlock = `if (typeof window !== 'undefined') {
  Font.register({
    family: 'Cairo',
    fonts: [
      { src: \`\${window.location.origin}/fonts/Cairo-Regular.ttf\`, fontWeight: 400 },
      { src: \`\${window.location.origin}/fonts/Cairo-Bold.ttf\`, fontWeight: 700 }
    ]
  });
}`;

let count = 0;
for (const file of files) {
  const filePath = path.join(dir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (regex.test(content)) {
      content = content.replace(regex, replacementBlock);
      fs.writeFileSync(filePath, content);
      count++;
    }
  }
}

console.log(`Fixed ${count} files with absolute URLs`);
