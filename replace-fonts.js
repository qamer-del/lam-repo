const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

walk('src/components').forEach(file => {
  let c = fs.readFileSync(file, 'utf8');
  let original = c;
  if (c.includes('Amiri')) {
    c = c.replace(/\/fonts\/Amiri-Regular\.ttf/g, '/fonts/NotoNaskhArabic-Regular.ttf');
    c = c.replace(/\/fonts\/Amiri-Bold\.ttf/g, '/fonts/NotoNaskhArabic-Bold.ttf');
    c = c.replace(/fontFamily:\s*'Amiri'/g, "fontFamily: 'NotoNaskhArabic'");
    c = c.replace(/family:\s*'Amiri'/g, "family: 'NotoNaskhArabic'");
    if (c !== original) {
      fs.writeFileSync(file, c);
      console.log('Fixed Amiri in ' + file);
    }
  }
});
