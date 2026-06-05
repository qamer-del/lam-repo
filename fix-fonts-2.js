const fs = require('fs');
const path = require('path');

const dir = 'd:/project-lamv2/src/components';
const files = [
  'finance-report-document.tsx',
  'invoice-document.tsx',
  'payroll-report-document.tsx'
];

const replacementBlock = `Font.register({
  family: 'Cairo',
  fonts: [
    { src: '/fonts/Cairo-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Cairo-Bold.ttf', fontWeight: 700 }
  ]
});`;

for (const file of files) {
  const filePath = path.join(dir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /Font\.register\(\{\s*family:\s*'Cairo',\s*fonts:\s*\[\s*\{\s*src:\s*'https:\/\/fonts\.gstatic\.com[^']+',\s*fontWeight:\s*400\s*\},\s*\{\s*src:\s*'https:\/\/fonts\.gstatic\.com[^']+',\s*fontWeight:\s*700\s*\}?,?\s*\]\s*\}\);?/g;
    content = content.replace(regex, replacementBlock);
    fs.writeFileSync(filePath, content);
  }
}
console.log('Fixed remaining files');
