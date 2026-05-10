const fs = require('fs')
const path = 'd:/project-lamv2/src/app/sales/pos/pos-client.tsx'
let c = fs.readFileSync(path, 'utf8')

// Fix garbled × symbol in cart item (between qty and price inputs)
c = c.replace(/<span className="text-xs text-gray-400 font-bold">[^<]+<\/span>\s*\{\/\* Price edit \*\/\}/,
  `<span className="text-xs text-gray-400 font-bold mx-1">×</span>
                          {/* Price edit */}`)

// Fix hardcoded SAR in cart item line total
c = c.replace(
  /= \{(item\.quantity \* item\.price)\.toFixed\(2\)\} SAR/,
  `= {($1).toFixed(2)} {t('sar')}`
)

// Fix hardcoded SAR in subtotal display (line ~393)
c = c.replace(
  />\{cartSubtotal\.toFixed\(2\)\} SAR<\/span>/,
  `>{cartSubtotal.toFixed(2)} {t('sar')}</span>`
)

// Fix hardcoded SAR in discount amount (line ~403)
c = c.replace(
  />-\{discountAmt\.toFixed\(2\)\} SAR<\/span>/,
  `>-{discountAmt.toFixed(2)} {t('sar')}</span>`
)

// Fix hardcoded SAR in item list price
c = c.replace(
  /\{item\.sellingPrice\.toFixed\(2\)\} <span className="text-\[10px\] font-bold text-gray-400">SAR<\/span>/,
  `{item.sellingPrice.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">{t('sar')}</span>`
)

// Fix hardcoded SAR in header cart summary (sidebar "in cart · X SAR")
c = c.replace(
  /\} in cart.*\{cartSubtotal\.toFixed\(2\)\} SAR<\/p>/,
  `} {t('inCart')} · {cartSubtotal.toFixed(2)} {t('sar')}</p>`
)

// Fix "Sale" / "Return" labels in today's sales list
c = c.replace(
  /(tx\.description \|\| \(tx\.type === 'SALE' \? )'Sale'( : )'Return'/,
  `$1t('sale')$2t('refund')`
)

// Fix SAR in sales transaction rows
c = c.replace(
  />\{tx\.amount\.toFixed\(2\)\} <span className="text-\[10px\] font-bold text-gray-400">SAR<\/span>/g,
  `>{tx.amount.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">{t('sar')}</span>`
)

// Fix tx.method labels in transactions list (just let them render raw – they are internal codes)
// Add 'Add "{name}"' translation in customer search
c = c.replace(
  /> Add &ldquo;\{customerSearch\}&rdquo;/,
  `> {t('add')} &ldquo;{customerSearch}&rdquo;`
)

// Fix "in cart" summary in search bar when cart has items (the second occurrence)  
c = c.replace(
  /\{cart\.reduce\(\(s,c\)=>s\+c\.quantity,0\)\} \{t\('inCart'\)\} · \{cartSubtotal\.toFixed\(2\)\} \{t\('sar'\)\}/,
  `{cart.reduce((s,c)=>s+c.quantity,0)} {t('inCart')} · {cartSubtotal.toFixed(2)} {t('sar')}`
)

// Improve header styling: add subtle gradient
c = c.replace(
  /className="bg-white border-b border-gray-200 px-5 py-2\.5 flex items-center justify-between shrink-0 shadow-sm z-10"/,
  `className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm z-10"`
)

// Make the main wrapper height account for the shortcuts panel gracefully
c = c.replace(
  /className="h-screen flex flex-col bg-\[#F4F6F9\] overflow-hidden font-sans" dir/,
  `className="h-screen flex flex-col bg-slate-50 overflow-hidden" dir`
)

// Improve item list item visual separation
c = c.replace(
  /className="flex-1 overflow-y-auto divide-y divide-gray-50"/,
  `className="flex-1 overflow-y-auto"`
)

// Improve item row hover / selected states
c = c.replace(
  /'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',/,
  `'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-b border-gray-50/80',`
)

// Make the cart header sticky bar cleaner
c = c.replace(
  /className="flex items-center justify-between px-4 py-2\.5 bg-white border-b border-gray-200 sticky top-0 z-10"/,
  `className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10"`
)

// Improve empty cart state
c = c.replace(
  /className="flex flex-col items-center justify-center h-32 text-gray-300"/,
  `className="flex flex-col items-center justify-center h-40 text-gray-200"`
)

// Fix empty items found state
c = c.replace(
  /className="flex flex-col items-center justify-center h-40 text-gray-300"/,
  `className="flex flex-col items-center justify-center h-48 text-gray-200"`
)

// Improve payment button grid
c = c.replace(
  /className="grid grid-cols-3 gap-1\.5"/,
  `className="grid grid-cols-3 gap-2"`
)

// Improve submit button: bigger, bolder
c = c.replace(
  /'w-full h-14 mt-1 rounded-2xl font-black text-base text-white uppercase tracking-wider transition-all active:scale-\[0\.98\] shadow-xl flex items-center justify-center gap-2\.5 disabled:opacity-50 disabled:cursor-not-allowed',/,
  `'w-full h-[52px] mt-1 rounded-2xl font-black text-sm text-white uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed',`
)

// Improve the overall search input height
c = c.replace(
  /className="w-full h-10 pl-9 pr-8 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500\/20 text-sm font-medium placeholder-gray-400 transition-all"/,
  `className="w-full h-10 pl-9 pr-8 rounded-xl border border-gray-200 bg-gray-50/80 focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 text-sm font-medium placeholder-gray-400 transition-all"`
)

// Clean up the search bar top section spacing
c = c.replace(
  /className="px-4 py-3 border-b border-gray-100 bg-white"/,
  `className="px-4 py-3 border-b border-gray-100/80 bg-white"`
)

// Improve today's sales empty state
c = c.replace(
  /className="flex flex-col items-center justify-center h-48 text-gray-300"/,
  `className="flex flex-col items-center justify-center h-56 text-gray-200"`
)

// Fix the "Record · X SAR (F9)" button content
c = c.replace(
  /<Check size=\{20\} strokeWidth=\{3\} \/> Record &middot; \{finalTotal\.toFixed\(2\)\} SAR <span className="opacity-70 ml-1 text-xs font-bold">\(F9\)<\/span>/,
  `<Check size={18} strokeWidth={3} /> {t('recordSale')} · {finalTotal.toFixed(2)} {t('sar')} <span className="opacity-60 ms-1 text-[10px] font-bold">(F9)</span>`
)

// Fix Processing button
c = c.replace(
  /<div className="w-5 h-5 border-3 border-white\/30 border-t-white rounded-full animate-spin" \/> Processing\.\.\./,
  `<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('processing')}`
)

fs.writeFileSync(path, c, 'utf8')
console.log('All remaining fixes applied')
