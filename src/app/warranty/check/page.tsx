import { checkWarrantyStatus } from '@/actions/warranty'
import { WarrantyCheckCard } from '@/components/warranty-check-card'
import { Shield, Search } from 'lucide-react'

export const metadata = {
  title: 'Warranty Verification',
  description: 'Verify your product warranty status instantly.',
}

interface Props {
  searchParams: Promise<{ invoice?: string; sku?: string }>
}

export default async function PublicWarrantyCheckPage({ searchParams }: Props) {
  const params = await searchParams
  const { invoice, sku } = params

  let warranties: any[] = []
  let error: string | null = null

  if (invoice || sku) {
    try {
      warranties = await checkWarrantyStatus({ invoiceNumber: invoice, sku })
    } catch {
      error = 'Unable to retrieve warranty information. Please try again.'
    }
  }

  const hasQuery = !!(invoice || sku)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900 flex items-start justify-center p-4 pt-16">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl shadow-2xl shadow-violet-500/40 mx-auto">
            <Shield size={40} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white">Warranty Check</h1>
            <p className="text-violet-300/80 font-medium mt-2 text-sm">Verify your product's replacement warranty status</p>
          </div>
        </div>

        {/* Search Form */}
        <form method="GET" className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-violet-300">Invoice Number</label>
            <input
              name="invoice"
              defaultValue={invoice || ''}
              placeholder="e.g. INV-1714819200000"
              className="w-full h-14 rounded-2xl bg-white/10 border-2 border-white/10 focus:border-violet-400 text-white placeholder-white/30 font-bold px-5 text-sm outline-none transition-all"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-transparent px-3 text-[10px] font-black uppercase tracking-widest text-violet-400">or</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-violet-300">Item SKU / Code</label>
            <input
              name="sku"
              defaultValue={sku || ''}
              placeholder="e.g. POL-001"
              className="w-full h-14 rounded-2xl bg-white/10 border-2 border-white/10 focus:border-violet-400 text-white placeholder-white/30 font-bold px-5 text-sm outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-violet-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Search size={18} />
            Check Warranty
          </button>
        </form>

        {/* Results */}
        {hasQuery && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {error ? (
              <div className="p-6 text-center bg-red-500/10 rounded-2xl border border-red-500/20">
                <p className="text-red-400 font-bold">{error}</p>
              </div>
            ) : warranties.length > 0 ? (
              warranties.map(w => (
                <WarrantyCheckCard key={w.id} warranty={w} showClaimButton={false} />
              ))
            ) : (
              <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
                <Shield size={36} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/60 font-black">No warranty records found.</p>
                <p className="text-white/30 text-xs mt-1">
                  {invoice ? `Invoice: ${invoice}` : `SKU: ${sku}`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Branding footer */}
        <p className="text-center text-white/20 text-[10px] font-bold uppercase tracking-widest pb-8">
          Powered by Lamaha · Replacement Warranty System
        </p>
      </div>
    </div>
  )
}
