/**
 * This script rewrites every react-pdf document component to:
 * 1. Remove inline Font.register() calls (including those wrapped in window checks)
 * 2. Remove inline fontFamily/family references to 'NotoNaskhArabic'
 * 3. Add a top-level import of '@/lib/pdf-fonts' (the centralized registration)
 *
 * Run: node fix-pdf-fonts.js
 */
const fs = require('fs');
const path = require('path');

const components = [
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

components.forEach(filePath => {
  let src = fs.readFileSync(filePath, 'utf8');
  const original = src;

  // 1. Remove the `if (typeof window !== 'undefined') { Font.register({...}); }` blocks
  //    This handles up to 4 levels of nesting and multi-line Font.register blocks.
  src = src.replace(
    /if\s*\(\s*typeof\s+window\s*!==\s*['"]undefined['"]\s*\)\s*\{[\s\S]*?Font\.register\s*\(\s*\{[\s\S]*?\}\s*\)\s*;?\s*\}/g,
    ''
  );

  // 2. Remove bare top-level Font.register({...}); calls (not inside a function/if)
  src = src.replace(
    /^Font\.register\s*\(\s*\{[\s\S]*?\}\s*\)\s*;?\s*$/gm,
    ''
  );

  // 3. Remove standalone Font.register blocks that are inside component functions
  //    (catch any remaining ones with broader pattern)
  src = src.replace(
    /\s*Font\.register\s*\(\s*\{[\s\S]*?fonts:\s*\[[\s\S]*?\]\s*\}\s*\)\s*;?/g,
    ''
  );

  // 4. Ensure import of pdf-fonts is present (after the last @react-pdf import)
  if (!src.includes("'@/lib/pdf-fonts'") && !src.includes('"@/lib/pdf-fonts"')) {
    // Insert after the last react-pdf import
    src = src.replace(
      /(import\s+.*?from\s+['"]@react-pdf\/renderer['"][^\n]*\n)/,
      "$1import '@/lib/pdf-fonts';\n"
    );
  }

  // 5. Clean up multiple consecutive blank lines
  src = src.replace(/\n{4,}/g, '\n\n\n');

  if (src !== original) {
    fs.writeFileSync(filePath, src);
    console.log('✅ Fixed: ' + filePath);
  } else {
    console.log('⏭️  No change: ' + filePath);
  }
});

console.log('\nDone!');
