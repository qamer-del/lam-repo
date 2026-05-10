const fs = require('fs')
const path = 'd:/project-lamv2/src/app/sales/pos/pos-client.tsx'
let c = fs.readFileSync(path, 'utf8')

// The corrupted section starts where the Clear button was wrongly placed
// We need to inject the complete header-close, shortcuts panel, tabs, and left sidebar
// before the cart section which starts at: {cart.length === 0 ?

const correctMiddle = `          <div className="flex items-center gap-2">
            <button onClick={() => setShowShortcuts(v => !v)} title="Keyboard shortcuts (?)"
              className={cn('hidden sm:flex items-center gap-1 h-8 px-2.5 rounded-lg border text-xs font-bold transition-colors',
                showShortcuts ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100')}>
              <Keyboard size={13} /> <span className="hidden lg:inline">{t('shortcuts')}</span>
            </button>
            <div className={cn('hidden md:flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full',
              printerStatus === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
              <div className={cn('w-1.5 h-1.5 rounded-full', printerStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300')} />
              {printerStatus === 'connected' ? t('printer') : t('offline')}
            </div>
            <CloseShiftBtn
              triggerClassName={cn('h-8 px-3 rounded-lg text-xs font-semibold border',
                hasUnsettled ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100')}
              cashTotal={unsettledCash} networkTotal={unsettledNetwork}
              tabbyTotal={unsettledTabby} tamaraTotal={unsettledTamara}
            />
          </div>
        </header>

        {showShortcuts && (
          <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-2.5 flex flex-wrap gap-x-6 gap-y-1 shrink-0">
            {shortcuts.map(s => (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                <kbd className="bg-white border border-indigo-200 rounded px-1.5 py-0.5 text-[10px] font-black text-indigo-700 font-mono shadow-sm whitespace-nowrap">{s.key}</kbd>
                <span className="text-gray-600 font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('todaysTransactions')}</h2>
              {allTodaySales.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 text-gray-200">
                  <Receipt size={32} className="mb-2" /><p className="text-xs font-semibold">{t('noTransactionsToday')}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                  {allTodaySales.map((tx: any) => (
                    <div key={tx.id} onClick={() => tx.invoiceNumber && setSelectedInvoice(tx.invoiceNumber)}
                      className={cn('flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors', tx.invoiceNumber && 'cursor-pointer')}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                          tx.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                          {tx.type === 'SALE' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{tx.description || (tx.type === 'SALE' ? t('sale') : t('refund'))}</p>
                          <p className="text-xs text-gray-400 font-mono">{tx.invoiceNumber || \`#\${tx.id}\`} · {format(new Date(tx.createdAt), 'h:mm a')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ps-3">
                        <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded-full',
                          tx.method === 'CASH' ? 'bg-emerald-100 text-emerald-700' :
                          tx.method === 'NETWORK' ? 'bg-blue-100 text-blue-700' :
                          tx.method === 'CREDIT' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        )}>{tx.method}</span>
                        <span className={cn('text-sm font-black tabular-nums', tx.type === 'RETURN' ? 'text-rose-600' : 'text-gray-900')}>
                          {tx.type === 'RETURN' ? '-' : '+'}{tx.amount.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">{t('sar')}</span>
                        </span>
                        {tx.isSettled && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'credit' && (
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('unpaidCredit')}</h2>
              <CreditCollectionPanel sales={unpaidCreditSales} />
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="flex-1 flex justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 sm:p-3 lg:p-5">
            <div className="flex w-full max-w-[1100px] bg-white sm:rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden border border-gray-200/80">

              {/* LEFT: Item Search */}
              <div className="w-[400px] shrink-0 flex flex-col bg-white border-e border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100/80 bg-white">
                  <div className="relative">
                    <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchRef} type="text" autoFocus
                      placeholder={t('searchItemNameOrSku')}
                      value={search}
                      onChange={e => { setSearch(e.target.value); setFocusedIdx(-1) }}
                      onKeyDown={e => {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, filteredItems.length - 1)) }
                        if (e.key === 'ArrowUp')   { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, -1)) }
                        if (e.key === 'Enter' && focusedIdx >= 0) { e.preventDefault(); addToCart(filteredItems[focusedIdx]) }
                      }}
                      className="w-full h-10 ps-9 pe-8 rounded-xl border border-gray-200 bg-gray-50/80 focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 text-sm font-medium placeholder-gray-400 transition-all"
                    />
                    {search && (
                      <button onClick={() => { setSearch(''); setFocusedIdx(-1); searchRef.current?.focus() }}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1.5 px-0.5">
                    <p className="text-[10px] text-gray-400 font-medium">{filteredItems.length} {t('items')}</p>
                    {cart.length > 0 && <p className="text-[10px] font-bold text-emerald-600">{cart.reduce((s,c)=>s+c.quantity,0)} {t('inCart')} · {cartSubtotal.toFixed(2)} {t('sar')}</p>}
                  </div>
                </div>

                <div ref={itemListRef} className="flex-1 overflow-y-auto">
                  {filteredItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-200">
                      <Package size={28} className="mb-2" /><p className="text-xs font-medium">{t('noItemFound')}</p>
                    </div>
                  )}
                  {filteredItems.map((item, idx) => {
                    const oos = item.currentStock <= 0
                    const low = !oos && item.currentStock <= item.reorderLevel
                    const inCart = cart.find(c => c.itemId === item.id)
                    const isFocused = idx === focusedIdx
                    return (
                      <button key={item.id} onClick={() => { addToCart(item); setFocusedIdx(idx) }}
                        disabled={oos}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors border-b border-gray-50/80',
                          oos ? 'opacity-40 cursor-not-allowed' :
                          isFocused ? 'bg-emerald-100 ring-2 ring-inset ring-emerald-400' :
                          inCart ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-gray-50 active:bg-gray-100'
                        )}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black transition-colors',
                            isFocused ? 'bg-emerald-500 text-white' :
                            inCart ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400')}>
                            {inCart ? inCart.quantity : <Package size={14} />}
                          </div>
                          <div className="min-w-0">
                            <p className={cn('text-sm font-semibold truncate', inCart || isFocused ? 'text-emerald-700' : 'text-gray-900')}>{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.sku && <span className="text-[10px] text-gray-400 font-mono">{item.sku}</span>}
                              <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full',
                                oos ? 'bg-red-100 text-red-600' : low ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600')}>
                                {oos ? t('outOfStock') : \`\${item.currentStock} \${item.unit}\`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-black text-gray-800 tabular-nums shrink-0 ps-3">
                          {item.sellingPrice.toFixed(2)} <span className="text-[10px] font-bold text-gray-400">{t('sar')}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* RIGHT: CART + PAYMENT */}
              <div className="flex-1 flex flex-col bg-slate-50/60 overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={14} className="text-gray-500" />
                      <span className="text-sm font-black text-gray-800">{t('currentOrder')}</span>
                      {cart.length > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                          {cart.reduce((s,c)=>s+c.quantity,0)}
                        </span>
                      )}
                    </div>
                    {cart.length > 0 && (
                      <button onClick={() => setCart([])} className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase">
                        {t('clear')} (Ctrl+K)
                      </button>
                    )}
                  </div>

`

// Find the corrupted section and replace everything from line 338 to the cart content
// The corruption starts at: <div className="flex items-center gap-2">
//                             {/* Keyboard shortcut toggle */}
//                             <button onClick={() => setCart([])}
// and ends just before the cart.length === 0 ternary

const corruptStart = `          <div className="flex items-center gap-2">
            {/* Keyboard shortcut toggle */}
            <button onClick={() => setCart([])} className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase">
                      {t('clear')} (Ctrl+K)
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (`

const correctCartOnward = `                  {cart.length === 0 ? (`

if (!c.includes(corruptStart.trim().slice(0, 80))) {
  console.log('Pattern not found, trying alternate approach')
  // Find by the unique wrong button pattern
  const wrongBtn = c.indexOf("onClick={() => setCart([])} className=\"text-[10px] font-bold text-red-400")
  if (wrongBtn === -1) { console.log('ERROR: cannot find corruption point'); process.exit(1) }
  
  // Find the start of the div containing the corrupt button
  const divStart = c.lastIndexOf('\n          <div className="flex items-center gap-2">', wrongBtn)
  // Find where the cart ternary begins after the corruption
  const cartStart = c.indexOf('{cart.length === 0 ? (', wrongBtn)
  
  const before = c.slice(0, divStart)
  const after = c.slice(cartStart)
  
  c = before + '\n' + correctMiddle + '\n' + after
} else {
  c = c.replace(corruptStart, correctMiddle + '\n' + correctCartOnward)
}

fs.writeFileSync(path, c, 'utf8')
console.log('Corruption fixed. File length:', c.length)
