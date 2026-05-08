/**
 * QZ Tray Certificate Generator
 * Run this ONCE to generate an RSA-2048 key pair for signed printing.
 *
 * Usage:  node scripts/generate-certs.js
 *
 * Output:
 *   - public/digital-certificate.txt   (served publicly, safe to expose)
 *   - Console output of the env variable to paste into .env.local
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// ─── Generate RSA-2048 key pair ───────────────────────────────────────────────
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

// ─── Write public certificate ─────────────────────────────────────────────────
const publicDir = path.join(__dirname, '..', 'public')
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })

const certPath = path.join(publicDir, 'digital-certificate.txt')
fs.writeFileSync(certPath, publicKey, 'utf8')

console.log('\n✅  Certificate generated successfully!\n')
console.log(`📄  Public cert → ${certPath}`)
console.log('\n─────────────────────────────────────────────────────────────────')
console.log('Add the following line to your .env.local file:\n')

// Inline the private key as a single-line base64 string for env storage
const b64 = Buffer.from(privateKey).toString('base64')
console.log(`QZ_PRIVATE_KEY="${b64}"`)
console.log('\nAlso add your printer name (must match Windows printer name exactly):')
console.log('NEXT_PUBLIC_PRINTER_NAME="EPSON TM-T88V"')
console.log('─────────────────────────────────────────────────────────────────\n')
console.log('⚠️  Keep QZ_PRIVATE_KEY secret — never commit it to git!\n')
