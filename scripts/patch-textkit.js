const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../node_modules/@react-pdf/textkit/lib/textkit.js');

if (!fs.existsSync(targetPath)) {
  console.log('React PDF Textkit not found at path:', targetPath);
  process.exit(0);
}

let content = fs.readFileSync(targetPath, 'utf8');

// Check if already patched
if (content.includes('if (!glyph)\n                continue;') || content.includes('if (!glyph)\r\n                continue;')) {
  console.log('React PDF Textkit is already patched.');
  process.exit(0);
}

// Perform replacement
const targetStr = "const glyph = getItemAtIndex(line.runs, 'glyphs', index);\n            if (addedGlyphs.has(glyph.id))";
const replacementStr = "const glyph = getItemAtIndex(line.runs, 'glyphs', index);\n            if (!glyph)\n                continue;\n            if (addedGlyphs.has(glyph.id))";

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('React PDF Textkit successfully patched!');
} else {
  // Let's check with CRLF
  const targetStrCRLF = targetStr.replace(/\n/g, '\r\n');
  const replacementStrCRLF = replacementStr.replace(/\n/g, '\r\n');
  if (content.includes(targetStrCRLF)) {
    content = content.replace(targetStrCRLF, replacementStrCRLF);
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('React PDF Textkit successfully patched (CRLF)!');
  } else {
    console.error('Could not find target pattern in textkit.js to patch. The library might have been updated.');
  }
}
