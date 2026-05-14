import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getItemsWithBarcodes } from '@/actions/barcodes'
import { getLabelTemplates } from '@/actions/barcodes'
import { getPrinterSettings } from '@/actions/barcodes'
import { BarcodesClient } from './barcodes-client'

export const metadata = {
  title: 'Barcode & Labels | Lamaha',
  description: 'Manage product barcodes and print professional labels',
}

export default async function BarcodesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = session.user.role
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'OWNER') {
    redirect('/')
  }

  const [items, templates, printerSettings] = await Promise.all([
    getItemsWithBarcodes(),
    getLabelTemplates(),
    getPrinterSettings(),
  ])

  return (
    <BarcodesClient
      initialItems={items}
      initialTemplates={templates}
      initialPrinterSettings={printerSettings}
      userRole={role}
    />
  )
}
