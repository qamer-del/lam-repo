/**
 * Remove the second `isRtl` argument from all s() calls in PDF components.
 * Uses a simple regex that matches s(..., isRtl) with arbitrary first argument.
 */
const fs = require('fs');

const files = [
  'src/components/agent-report-pdf.tsx',
  'src/components/finance-report-document.tsx',
  'src/components/invoice-document.tsx',
  'src/components/payroll-report-document.tsx',
  'src/components/salary-settlement-document.tsx',
  'src/components/salary-settlement-pdf.tsx',
  'src/components/sales-document.tsx',
  'src/components/settlement-document.tsx',
  'src/components/shift-report-document.tsx',
  'src/components/staff-report-pdf.tsx',
];

// Remove ", isRtl)" and ", true)" and ", false)" as second arg to s()
// We can't easily match balanced parens with regex, so we use a simpler approach:
// replace the literal strings ", isRtl)" -> ")" wherever they appear
files.forEach(filePath => {
  let src = fs.readFileSync(filePath, 'utf8');
  const original = src;

  // Replace all ", isRtl)" occurrences (second arg removal)
  src = src.replace(/,\s*isRtl\)/g, ')');

  if (src !== original) {
    fs.writeFileSync(filePath, src);
    const count = (original.match(/,\s*isRtl\)/g) || []).length;
    console.log(`✅ Fixed ${count} occurrences in: ${filePath}`);
  } else {
    console.log(`⏭️  No change: ${filePath}`);
  }
});

console.log('\nDone!');
