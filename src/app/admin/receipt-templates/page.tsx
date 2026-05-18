import { ensureDefaultTemplate, getReceiptTemplates } from '@/actions/receipt-templates'
import { ReceiptTemplatesClient } from './receipt-templates-client'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ReceiptTemplatesPage() {
  const session = await auth()
  if (!session?.user?.role || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    redirect('/')
  }

  // Auto-seed default template on first visit
  await ensureDefaultTemplate()
  const templates = await getReceiptTemplates()

  return <ReceiptTemplatesClient initialTemplates={templates} />
}
