const React = require('react');
const { renderToFile, Document, Page, Text, View, Font } = require('@react-pdf/renderer');
const { shapeArabicVisual } = require('naqqash');
const path = require('path');

Font.register({
  family: 'Cairo',
  fonts: [
    { src: path.join(__dirname, 'public/fonts/Cairo-Regular.ttf'), fontWeight: 400 },
    { src: path.join(__dirname, 'public/fonts/Cairo-Bold.ttf'), fontWeight: 700 }
  ]
});

const s = (text) => shapeArabicVisual(String(text));

const styles = {
  page: { padding: 40, fontFamily: 'Cairo', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 6 },
  label: { color: '#555' },
  value: { fontWeight: 'bold', color: '#000' },
};

const MyDoc = () => React.createElement(Document, null,
  React.createElement(Page, { size: 'A4', style: styles.page },
    React.createElement(View, { style: { marginBottom: 20 } },
      React.createElement(Text, { style: { fontSize: 22, fontWeight: 'bold', color: '#1d4ed8', textAlign: 'right' } },
        s('تقرير الوردية')
      )
    ),
    React.createElement(View, { style: styles.row },
      React.createElement(Text, { style: styles.value }, 'gamer'),
      React.createElement(Text, { style: styles.label }, s('الكاشير')),
    ),
    React.createElement(View, { style: styles.row },
      React.createElement(Text, { style: styles.value }, 'CLOSED'),
      React.createElement(Text, { style: styles.label }, s('الحالة')),
    ),
    React.createElement(View, { style: styles.row },
      React.createElement(Text, { style: styles.value }, '0.00 SAR'),
      React.createElement(Text, { style: styles.label }, s('المبيعات النقدية')),
    ),
    React.createElement(View, { style: styles.row },
      React.createElement(Text, { style: styles.value }, '0.00 SAR'),
      React.createElement(Text, { style: styles.label }, s('إجمالي المبيعات')),
    ),
  )
);

renderToFile(React.createElement(MyDoc), 'test-arabic.pdf')
  .then(() => console.log('SUCCESS: test-arabic.pdf generated'))
  .catch(err => console.error('FAILED:', err.message));
