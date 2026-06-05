const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../node_modules/@react-pdf/textkit/lib/textkit.js');

if (!fs.existsSync(targetPath)) {
  console.log('React PDF Textkit not found at path:', targetPath);
  process.exit(0);
}

let content = fs.readFileSync(targetPath, 'utf8');
let changed = false;

// ── Patch 1: null-glyph guard ──────────────────────────────────────────────
// Prevents a crash when a glyph cannot be found.
const NULL_GLYPH_MARKER = 'if (!glyph)\n                continue;';
const NULL_GLYPH_MARKER_CRLF = 'if (!glyph)\r\n                continue;';

if (!content.includes(NULL_GLYPH_MARKER) && !content.includes(NULL_GLYPH_MARKER_CRLF)) {
  const targetStr = "const glyph = getItemAtIndex(line.runs, 'glyphs', index);\n            if (addedGlyphs.has(glyph.id))";
  const replacementStr = "const glyph = getItemAtIndex(line.runs, 'glyphs', index);\n            if (!glyph)\n                continue;\n            if (addedGlyphs.has(glyph.id))";

  const targetStrCRLF = targetStr.replace(/\n/g, '\r\n');
  const replacementStrCRLF = replacementStr.replace(/\n/g, '\r\n');

  if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    changed = true;
    console.log('[Patch 1] Null-glyph guard applied.');
  } else if (content.includes(targetStrCRLF)) {
    content = content.replace(targetStrCRLF, replacementStrCRLF);
    changed = true;
    console.log('[Patch 1] Null-glyph guard applied (CRLF).');
  } else {
    console.warn('[Patch 1] Could not find null-glyph target. Pattern may have changed.');
  }
} else {
  console.log('[Patch 1] Null-glyph guard already applied. Skipping.');
}

// ── Patch 2: Preserve Arabic Presentation Forms from NFD normalization ──────
// react-pdf's textkit applies NFD normalization to "complex scripts"
// (selectiveNFD). This DESTROYS Arabic Presentation Forms (U+FB50-FDFF,
// U+FE70-FEFF) produced by naqqash's shapeArabicVisual, converting them
// back to unshaped base characters and breaking Arabic rendering entirely.
//
// We patch selectiveNFD to bail out early when the string already contains
// Arabic Presentation Forms, preserving the shaping done by naqqash.

const ARABIC_PF_MARKER = '// [PATCHED] Preserve Arabic Presentation Forms';

if (!content.includes(ARABIC_PF_MARKER)) {
  // The original function body we are targeting:
  const originalFn = `const selectiveNFD = (str) => {\n    if (!HAS_COMPLEX_SCRIPT.test(str))\n        return str;\n    return str.replace(COMPLEX_SCRIPT_CHARS, (match) => match.normalize('NFD'));\n};`;

  const patchedFn = `const selectiveNFD = (str) => {\n    ${ARABIC_PF_MARKER}\n    if (/[\\uFB50-\\uFDFF\\uFE70-\\uFEFF]/.test(str)) {\n        console.log('[TEXTKIT PATCH] Preserved Arabic text:', str);\n        return str;\n    }\n    if (!HAS_COMPLEX_SCRIPT.test(str))\n        return str;\n    return str.replace(COMPLEX_SCRIPT_CHARS, (match) => match.normalize('NFD'));\n};`;

  if (content.includes(originalFn)) {
    content = content.replace(originalFn, patchedFn);
    changed = true;
    console.log('[Patch 2] Arabic Presentation Forms guard applied.');
  } else {
    // Try CRLF variant
    const originalFnCRLF = originalFn.replace(/\n/g, '\r\n');
    const patchedFnCRLF = patchedFn.replace(/\n/g, '\r\n');
    if (content.includes(originalFnCRLF)) {
      content = content.replace(originalFnCRLF, patchedFnCRLF);
      changed = true;
      console.log('[Patch 2] Arabic Presentation Forms guard applied (CRLF).');
    } else {
      console.warn('[Patch 2] Could not find selectiveNFD. Trying loose match...');
      // Loose replacement: find the normalize('NFD') call and prepend the guard
      const loose = `return str.replace(COMPLEX_SCRIPT_CHARS, (match) => match.normalize('NFD'));`;
      const loosePatch = `${ARABIC_PF_MARKER}\n    if (/[\\uFB50-\\uFDFF\\uFE70-\\uFEFF]/.test(str)) return str;\n    return str.replace(COMPLEX_SCRIPT_CHARS, (match) => match.normalize('NFD'));`;
      if (content.includes(loose)) {
        content = content.replace(loose, loosePatch);
        changed = true;
        console.log('[Patch 2] Arabic Presentation Forms guard applied (loose match).');
      } else {
        console.error('[Patch 2] Could not patch selectiveNFD. Arabic text may not render correctly.');
      }
    }
  }
} else {
  console.log('[Patch 2] Arabic Presentation Forms guard already applied. Skipping.');
}

if (changed) {
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('textkit.js successfully patched!');
} else {
  console.log('No changes made.');
}
