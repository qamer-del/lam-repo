const fs = require('fs')
const path = 'd:/project-lamv2/src/app/sales/pos/pos-client.tsx'
let content = fs.readFileSync(path, 'utf8')

// ─── 1. Fix the comment+shortcuts block ──────────────────────────────────────
// Remove the corrupted comment line and replace the entire shortcuts array
// with a clean version that includes getPayMethodLabel
const shortcutsRegex = /\/\/[^\n]*Keyboard shortcuts legend[^\n]*\n(\s*const shortcuts = \[[\s\S]*?\]\s*\n)/
const newShortcuts = `
  const getPayMethodLabel = (mode) => {
    const map = {
      CASH: t('cash'), NETWORK: t('network'), SPLIT: t('splitPayment'),
      TABBY: t('tabby'), TAMARA: t('tamara'), CREDIT: t('credit'),
    }
    return map[mode]
  }

  const shortcuts = [
    { key: '/', label: 'Focus search' },
    { key: 'F2', label: 'Focus search' },
    { key: '\\u2191 \\u2193', label: 'Navigate list' },
    { key: 'Enter', label: 'Add item' },
    { key: 'Ctrl+1-6', label: t('paymentMethod') },
    { key: 'F4', label: t('totalAmount') },
    { key: 'F9', label: t('recordSale') },
    { key: 'Ctrl+Enter', label: t('recordSale') },
    { key: 'Ctrl+K', label: t('clear') },
    { key: 'Esc', label: 'Back to search' },
    { key: '?', label: t('shortcuts') },
  ]
`
content = content.replace(shortcutsRegex, newShortcuts)

// ─── 2. Replace hardcoded header strings with translation calls ───────────────
content = content.replace(
  /<p className="text-\[10px\] font-bold text-gray-400 uppercase tracking-wider">Point of Sale<\/p>/,
  `<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pointOfSale')}</p>`
)

// ─── 3. Replace tab labels with translations ──────────────────────────────────
content = content.replace(
  /\(\[\['pos', 'POS', ShoppingCart\], \['sales', 'Today', History\], \['credit', 'Credit', CreditCard\]\] as const\)/,
  `([['pos', t('pos'), ShoppingCart], ['sales', t('today'), History], ['credit', t('credit'), CreditCard]] as const)`
)

// ─── 4. Replace "Shortcuts" text in button ────────────────────────────────────
content = content.replace(
  /<span className="hidden lg:inline">Shortcuts<\/span>/,
  `<span className="hidden lg:inline">{t('shortcuts')}</span>`
)

// ─── 5. Replace printer status strings ───────────────────────────────────────
content = content.replace(
  /\{printerStatus === 'connected' \? 'Printer' : 'Offline'\}/,
  `{printerStatus === 'connected' ? t('printer') : t('offline')}`
)

// ─── 6. Today's Transactions tab header ──────────────────────────────────────
content = content.replace(
  /<h2 className="text-sm font-black text-gray-900">Today&apos;s Transactions<\/h2>/,
  `<h2 className="text-sm font-black text-gray-900">{t('todaysTransactions')}</h2>`
)
content = content.replace(
  /<p className="text-xs font-semibold">No transactions today<\/p>/,
  `<p className="text-xs font-semibold">{t('noTransactionsToday')}</p>`
)

// ─── 7. Credit tab header ─────────────────────────────────────────────────────
content = content.replace(
  /<h2 className="text-sm font-black text-gray-900">Unpaid Credit<\/h2>/,
  `<h2 className="text-sm font-black text-gray-900">{t('unpaidCredit')}</h2>`
)

// ─── 8. Item search placeholder ──────────────────────────────────────────────
// Has garbled chars – match loosely
content = content.replace(
  /placeholder="Search item name or SKU[^"]*"/,
  `placeholder={t('searchItemNameOrSku')}`
)

// ─── 9. Items count / in cart ────────────────────────────────────────────────
content = content.replace(
  /\{filteredItems\.length\} items/,
  `{filteredItems.length} {t('items')}`
)
// "in cart · X SAR"
content = content.replace(
  /\{cart\.reduce\(\(s,c\)=>s\+c\.quantity,0\)\} in cart/,
  `{cart.reduce((s,c)=>s+c.quantity,0)} {t('inCart')}`
)

// ─── 10. No items found ───────────────────────────────────────────────────────
content = content.replace(
  /<p className="text-xs font-medium">No items found<\/p>/,
  `<p className="text-xs font-medium">{t('noItemsFound')}</p>`
)

// ─── 11. Out of stock ─────────────────────────────────────────────────────────
content = content.replace(
  /oos \? 'Out of stock' : /,
  `oos ? t('outOfStock') : `
)

// ─── 12. Current Order header ─────────────────────────────────────────────────
content = content.replace(
  /<span className="text-sm font-black text-gray-800">Current Order<\/span>/,
  `<span className="text-sm font-black text-gray-800">{t('currentOrder')}</span>`
)

// ─── 13. Clear cart button ────────────────────────────────────────────────────
content = content.replace(
  /<button onClick=\{.*?setCart\(\[\]\).*?\}[^>]*>\s*Clear \(Ctrl\+K\)\s*<\/button>/s,
  `<button onClick={() => setCart([])} className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase">\n                      {t('clear')} (Ctrl+K)\n                    </button>`
)

// ─── 14. No items added yet ───────────────────────────────────────────────────
content = content.replace(
  /<p className="text-xs font-semibold">No items added yet<\/p>/,
  `<p className="text-xs font-semibold">{t('noItemsAddedYet')}</p>`
)

// ─── 15. Subtotal label ───────────────────────────────────────────────────────
content = content.replace(
  /<span className="text-xs font-bold text-gray-500 uppercase">Subtotal<\/span>/,
  `<span className="text-xs font-bold text-gray-500 uppercase">{t('subtotal')}</span>`
)

// ─── 16. Discount label ───────────────────────────────────────────────────────
content = content.replace(
  /<span className="text-\[10px\] font-bold text-gray-400 shrink-0 uppercase">% Discount<\/span>/,
  `<span className="text-[10px] font-bold text-gray-400 shrink-0 uppercase">{t('discountPercent')}</span>`
)
content = content.replace(
  /<span className="text-\[10px\] font-bold text-rose-500 uppercase">Discount Amt<\/span>/,
  `<span className="text-[10px] font-bold text-rose-500 uppercase">{t('discountAmt')}</span>`
)

// ─── 17. Payment method labels ────────────────────────────────────────────────
// Replace static label from PAY_METHODS with translated version
content = content.replace(
  /<span className="text-\[10px\] font-black uppercase tracking-tight">\{label\}<\/span>/,
  `<span className="text-[10px] font-black uppercase tracking-tight">{getPayMethodLabel(mode)}</span>`
)

// ─── 18. SAR prefix on amount input ──────────────────────────────────────────
content = content.replace(
  /<span className="absolute left-3 top-1\/2 -translate-y-1\/2 text-sm font-black text-gray-400">SAR<\/span>/,
  `<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">{t('sar')}</span>`
)

// ─── 19. Split Cash / Network labels ─────────────────────────────────────────
content = content.replace(
  /<p className="text-\[10px\] font-black uppercase text-emerald-600 mb-1">Cash<\/p>/,
  `<p className="text-[10px] font-black uppercase text-emerald-600 mb-1">{t('cash')}</p>`
)
content = content.replace(
  /<p className="text-\[10px\] font-black uppercase text-blue-600 mb-1">Network<\/p>/,
  `<p className="text-[10px] font-black uppercase text-blue-600 mb-1">{t('network')}</p>`
)

// ─── 20. Customer selector placeholder ───────────────────────────────────────
content = content.replace(
  /`Customer\$\{payMode==='CREDIT'\?' \*':' \(opt\)'\}`/,
  `\`\${t('customer')}\${payMode==='CREDIT'?' *':' ('+t('optional')+')'}\``
)

// ─── 21. New Customer label in quick-add panel ────────────────────────────────
content = content.replace(
  /> New Customer<\/span>/,
  `> {t('newCustomer')}</span>`
)

// ─── 22. Full name / phone placeholders in quick-add ─────────────────────────
content = content.replace(
  /placeholder="Full name"/,
  `placeholder={t('staffName')}`
)

// ─── 23. Save & Select button ─────────────────────────────────────────────────
content = content.replace(
  /<>\s*<UserPlus size=\{14\} \/> Save & Select\s*<\/>/,
  `<><UserPlus size={14} /> {t('saveAndSelect')}</>`
)
content = content.replace(
  /toast\.success\(`Customer added: \$\{nc\.name\}`\)/,
  `toast.success(t('customerAdded') + ': ' + nc.name)`
)
content = content.replace(
  /toast\.error\('Failed to create customer'\)/,
  `toast.error(t('failedToAddCustomer'))`
)

// ─── 24. Walk-in label ────────────────────────────────────────────────────────
content = content.replace(
  /> Walk-in\s*<\/CommandItem>/,
  `> {t('walkinCustomer')}</CommandItem>`
)

// ─── 25. Search customer placeholder ─────────────────────────────────────────
content = content.replace(
  /placeholder="Search customer\.\.\."/,
  `placeholder={t('searchCustomer')}`
)

// ─── 26. Credit inline name/phone placeholders ───────────────────────────────
content = content.replace(
  /placeholder="Name \*"/,
  `placeholder={t('customerName') + ' *'}`
)
content = content.replace(
  /placeholder="05xxxxxxxx \*"/,
  `placeholder={t('placeholderPhone') + ' *'}`
)

// ─── 27. Due Date label ───────────────────────────────────────────────────────
content = content.replace(
  /<p className="text-\[10px\] font-black uppercase text-amber-500 shrink-0">Due Date<\/p>/,
  `<p className="text-[10px] font-black uppercase text-amber-500 shrink-0">{t('dueDate')}</p>`
)

// ─── 28. Description placeholder ─────────────────────────────────────────────
content = content.replace(
  /placeholder="Description \(optional\)"/,
  `placeholder={t('descriptionOptional')}`
)

// ─── 29. Submit button text ───────────────────────────────────────────────────
content = content.replace(
  /> Processing\.\.\.<\/>/,
  `> {t('processing')}</>`
)
content = content.replace(
  /> Record & \{finalTotal\.toFixed\(2\)\} SAR/,
  `> {t('recordSale')} · {finalTotal.toFixed(2)} {t('sar')}`
)
// The middot version
content = content.replace(
  /<Check size=\{20\} strokeWidth=\{3\} \/> Record &middot; \{finalTotal\.toFixed\(2\)\} SAR /,
  `<Check size={20} strokeWidth={3} /> {t('recordSale')} · {finalTotal.toFixed(2)} {t('sar')} `
)

// ─── 30. Improve design: main container with RTL-aware flex direction ─────────
// Add dir attribute to root div
content = content.replace(
  /<div className="h-screen flex flex-col bg-\[#F4F6F9\] overflow-hidden font-sans">/,
  `<div className="h-screen flex flex-col bg-[#F4F6F9] overflow-hidden font-sans" dir={isRTL ? 'rtl' : 'ltr'}>`
)

// ─── 31. Improve POS panel layout – widen max container, improve split ────────
content = content.replace(
  /<div className="flex-1 flex justify-center overflow-hidden bg-gray-100\/50 sm:p-4 lg:p-6">/,
  `<div className="flex-1 flex justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 sm:p-3 lg:p-5">`
)
content = content.replace(
  /<div className="flex w-full max-w-\[1000px\] bg-white sm:rounded-2xl shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] overflow-hidden border border-gray-200\/60">/,
  `<div className="flex w-full max-w-[1100px] bg-white sm:rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden border border-gray-200/80">`
)

// ─── 32. Left sidebar width ───────────────────────────────────────────────────
content = content.replace(
  /<div className="w-\[420px\] shrink-0 flex flex-col bg-white border-r border-gray-100 overflow-hidden">/,
  `<div className="w-[400px] shrink-0 flex flex-col bg-white border-e border-gray-100 overflow-hidden">`
)

// ─── 33. Improve payment section top border ───────────────────────────────────
content = content.replace(
  /<div className="shrink-0 bg-white border-t-2 border-gray-100 p-4 space-y-3\.5 z-10 shadow-\[0_-4px_10px_rgba\(0,0,0,0\.02\)\]">/,
  `<div className="shrink-0 bg-white border-t border-gray-100 p-4 space-y-3 z-10 shadow-[0_-2px_12px_rgba(0,0,0,0.03)]">`
)

// ─── 34. Improve right panel background ──────────────────────────────────────
content = content.replace(
  /<div className="flex-1 flex flex-col bg-\[#F4F6F9\] overflow-hidden">/,
  `<div className="flex-1 flex flex-col bg-slate-50/60 overflow-hidden">`
)

// ─── 35. Improve cart item row ─────────────────────────────────────────────
content = content.replace(
  /<div className="divide-y divide-gray-100 bg-white">/,
  `<div className="divide-y divide-gray-50 bg-white">`
)

// ─── 36. Cart item padding improvement ────────────────────────────────────────
content = content.replace(
  /<div key=\{item\.itemId\} className="p-3">/,
  `<div key={item.itemId} className="px-4 py-3">`
)

// ─── 37. Tab bar styling improvement ──────────────────────────────────────────
content = content.replace(
  /className=\{cn\('flex items-center gap-1\.5 px-3 py-1\.5 rounded-lg text-xs font-bold transition-all',\s*activeTab === tab \? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'\)\}/,
  `className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/60' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50')}`
)

// ─── 38. Improve Today's Sales tab container ──────────────────────────────────
content = content.replace(
  /<div className="flex-1 overflow-y-auto p-5">\s*<div className="max-w-2xl mx-auto space-y-3">\s*<h2 className="text-sm font-black text-gray-900">\{t\('todaysTransactions'\)\}<\/h2>/,
  `<div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('todaysTransactions')}</h2>`
)

// ─── 39. Improve Credit tab container ─────────────────────────────────────────
content = content.replace(
  /<div className="flex-1 overflow-y-auto p-5">\s*<div className="max-w-2xl mx-auto space-y-3">\s*<h2 className="text-sm font-black text-gray-900">\{t\('unpaidCredit'\)\}<\/h2>/,
  `<div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('unpaidCredit')}</h2>`
)

fs.writeFileSync(path, content, 'utf8')
console.log('POS client updated successfully')
