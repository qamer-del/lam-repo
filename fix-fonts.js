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

const targetBlock = `Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 }
  ]
});`;

const replacementBlock = `Font.register({
  family: 'Cairo',
  fonts: [
    { src: '/fonts/Cairo-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Cairo-Bold.ttf', fontWeight: 700 }
  ]
});`;

let changed = 0;
for (const file of files) {
  const filePath = path.join(dir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(targetBlock)) {
      content = content.replace(targetBlock, replacementBlock);
      fs.writeFileSync(filePath, content);
      changed++;
    } else {
        // Try regex if spacing is different
        const regex = /Font\.register\(\{\s*family:\s*'Cairo',\s*fonts:\s*\[\s*\{\s*src:\s*'https:\/\/fonts\.gstatic\.com[^']+',\s*fontWeight:\s*400\s*\},\s*\{\s*src:\s*'https:\/\/fonts\.gstatic\.com[^']+',\s*fontWeight:\s*700\s*\}\s*\]\s*\}\);/g;
        if (regex.test(content)) {
            content = content.replace(regex, replacementBlock);
            fs.writeFileSync(filePath, content);
            changed++;
        }
    }
  }
}

console.log(`Updated ${changed} files.`);
