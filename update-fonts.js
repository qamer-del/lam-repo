const fs = require('fs');
const path = require('path');

const fontSetup = `
Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf', fontWeight: 700 }
  ]
});
`;

const files = [
  'sales-document.tsx',
  'invoice-document.tsx',
  'salary-settlement-pdf.tsx',
  'agent-report-pdf.tsx',
  'staff-report-pdf.tsx',
  'settlement-document.tsx'
];

files.forEach(f => {
  const p = path.join('d:/project-lamv2/src/components', f);
  let c = fs.readFileSync(p, 'utf8');
  
  // Replace the old Cairo URLs with the new exact ones
  c = c.replace(/https:\/\/fonts\.gstatic\.com\/s\/cairo\/v28\/SLXWc1nY6Hkvalvtszo1\.ttf/g, 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf');
  c = c.replace(/https:\/\/fonts\.gstatic\.com\/s\/cairo\/v28\/SLXLc1nY6HkvalvvtTpmOA\.ttf/g, 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf');

  fs.writeFileSync(p, c);
  console.log('Updated URLs in ' + f);
});
