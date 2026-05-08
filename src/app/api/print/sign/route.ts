import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { auth } from '@/auth'

/**
 * POST /api/print/sign
 * Signs a QZ Tray message with the server-side private key.
 * Only accessible to authenticated users.
 *
 * Body:   { message: string }
 * Result: { signature: string }  (base64-encoded SHA-512 RSA signature)
 */
export async function POST(req: NextRequest) {
  // Auth guard — only signed-in users can trigger print jobs
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b64Key = process.env.QZ_PRIVATE_KEY
  if (!b64Key) {
    return NextResponse.json(
      { error: 'QZ_PRIVATE_KEY is not configured. Run: node scripts/generate-certs.js' },
      { status: 500 }
    )
  }

  let message: string
  try {
    const body = await req.json()
    message = body.message
    if (typeof message !== 'string' || !message) throw new Error('missing message')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const privateKeyPem = Buffer.from(b64Key, 'base64').toString('utf8')

    const sign = crypto.createSign('SHA512')
    sign.update(message)
    sign.end()
    const signature = sign.sign(privateKeyPem, 'base64')

    return NextResponse.json({ signature })
  } catch (err) {
    console.error('[print/sign] Signing error:', err)
    return NextResponse.json({ error: 'Signing failed' }, { status: 500 })
  }
}
