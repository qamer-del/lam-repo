const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    const page = pdfData.Pages[0];
    const texts = page.Texts.slice(0, 5); // Just grab the first few text elements
    
    texts.forEach(t => {
        console.log(`Text: ${decodeURIComponent(t.R[0].T)} at X: ${t.x}, Y: ${t.y}, Width: ${t.w}`);
    });
});

pdfParser.loadPDF("test-arabic.pdf");
