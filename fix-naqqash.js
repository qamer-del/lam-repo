/**
 * Fix all PDF document components:
 * 1. Remove naqqash/shapeArabicVisual - it caused double-reversal with react-pdf's BiDi engine
 * 2. Change the `s()` helper to simply return the string as-is (no shaping)
 * 3. Raw Unicode Arabic + Noto Naskh Arabic font = correct shaping via font GSUB tables
 */
const fs = require('fs');

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

  // 1. Remove naqqash import
  src = src.replace(/^import\s+\{[^}]*shapeArabicVisual[^}]*\}\s+from\s+['"]naqqash['"];?\s*\n/gm, '');
  src = src.replace(/^import\s+['"]naqqash['"];?\s*\n/gm, '');

  // 2. Replace the `s()` helper function with a simple passthrough
  // Pattern: const s = (text: ..., isRtl = ...) => { ... shapeArabicVisual ... }
  src = src.replace(
    /\/\/ react-pdf v4[^\n]*\n\/\/ Use shapeArabicVisual[^\n]*\n/g,
    ''
  );
  src = src.replace(
    /const s\s*=\s*\([^)]*\)\s*(?::\s*string\s*)?\s*=>\s*\{[\s\S]*?shapeArabicVisual[\s\S]*?\};\s*\n/g,
    "// Pass text as-is; Noto Naskh Arabic font handles Arabic shaping via GSUB tables\nconst s = (text: string | number | null | undefined): string => {\n  if (text === null || text === undefined) return '';\n  return String(text);\n};\n"
  );

  // 3. Also handle inline arrow: const s = text => shapeArabicVisual(String(text));
  src = src.replace(
    /const s\s*=\s*(?:\([^)]*\)|text)\s*=>\s*shapeArabicVisual\([^)]+\);?\s*\n/g,
    "const s = (text: string | number | null | undefined): string => text == null ? '' : String(text);\n"
  );

  // 4. Fix all s(x, isRtl) calls → s(x)  (remove the second argument)
  src = src.replace(/\bs\(([^,)]+),\s*isRtl\)/g, 's($1)');
  src = src.replace(/\bs\(([^,)]+),\s*true\)/g, 's($1)');
  src = src.replace(/\bs\(([^,)]+),\s*false\)/g, 's($1)');

  // 5. Clean up multiple blank lines
  src = src.replace(/\n{4,}/g, '\n\n\n');

  if (src !== original) {
    fs.writeFileSync(filePath, src);
    console.log('✅ Fixed: ' + filePath);
  } else {
    console.log('⏭️  No change: ' + filePath);
  }
});

console.log('\nDone!');
