const React = require('react');
const { renderToFile, Document, Page, Text, Font } = require('@react-pdf/renderer');
const { shapeArabicVisual } = require('naqqash');

Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf' }
  ]
});

const MyDoc = () => {
  return React.createElement(Document, null, 
    React.createElement(Page, { style: { fontFamily: 'Cairo', fontSize: 24, padding: 20 } }, 
      React.createElement(Text, null, 'Raw: ملخص المبيعات'),
      React.createElement(Text, null, 'Shaped: ' + shapeArabicVisual('ملخص المبيعات'))
    )
  );
};

renderToFile(React.createElement(MyDoc), 'test.pdf').then(() => console.log('Done'));
