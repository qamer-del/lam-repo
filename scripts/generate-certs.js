/**
 * QZ Tray Certificate Generator
 * Run this ONCE to generate an RSA-2048 key pair for signed printing.
 *
 * Usage:  node scripts/generate-certs.js
 *
 * Output:
 *   - public/digital-certificate.txt   (self-signed X.509 cert — served publicly)
 *   - Console output: QZ_PRIVATE_KEY env variable to paste into .env.local
 *
 * WHY THIS MATTERS:
 *   QZ Tray 2.x requires a proper self-signed X.509 certificate (BEGIN CERTIFICATE),
 *   NOT a bare public key (BEGIN PUBLIC KEY). Using a bare public key causes QZ Tray
 *   to silently reject the connection even when it is running.
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { execSync, spawnSync } = require('child_process')
const os = require('os')

// ─── Generate RSA-2048 key pair ───────────────────────────────────────────────
console.log('Generating RSA-2048 key pair...')
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',   format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8',  format: 'pem' },
})

// ─── Write temp key files ─────────────────────────────────────────────────────
const tmpDir   = os.tmpdir()
const keyPath  = path.join(tmpDir, 'qz-private.pem')
const certPath2 = path.join(tmpDir, 'qz-cert.pem')

fs.writeFileSync(keyPath, privateKey, 'utf8')

// ─── Try to generate self-signed X.509 cert via openssl ──────────────────────
let certPem = null

const opensslResult = spawnSync('openssl', [
  'req', '-new', '-x509',
  '-key',     keyPath,
  '-out',     certPath2,
  '-days',    '3650',
  '-subj',    '/CN=QZ Tray/O=LAMAHA/C=SA',
  '-sha256',
], { encoding: 'utf8' })

if (opensslResult.status === 0 && fs.existsSync(certPath2)) {
  certPem = fs.readFileSync(certPath2, 'utf8')
  console.log('✅  Self-signed X.509 certificate created via openssl.')
} else {
  // ─── Fallback: build a minimal self-signed X.509 cert in pure Node ───────
  console.log('ℹ️  openssl not found — building self-signed cert in pure Node...')
  certPem = buildSelfSignedCert(privateKey, publicKey)
  console.log('✅  Self-signed X.509 certificate created via pure Node.')
}

// Clean up temp files
try { fs.unlinkSync(keyPath)   } catch {}
try { fs.unlinkSync(certPath2) } catch {}

// ─── Write public certificate ─────────────────────────────────────────────────
const publicDir = path.join(__dirname, '..', 'public')
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })

const certOutPath = path.join(publicDir, 'digital-certificate.txt')
fs.writeFileSync(certOutPath, certPem, 'utf8')

console.log(`📄  Public cert → ${certOutPath}`)
console.log('\n─────────────────────────────────────────────────────────────────')
console.log('Add the following lines to your .env.local file:\n')

const b64 = Buffer.from(privateKey).toString('base64')
console.log(`QZ_PRIVATE_KEY="${b64}"`)
console.log('\nAlso add your printer name (must match Windows printer name exactly):')
console.log('NEXT_PUBLIC_PRINTER_NAME="EPSON TM-T88V"')
console.log('─────────────────────────────────────────────────────────────────\n')
console.log('⚠️  Keep QZ_PRIVATE_KEY secret — never commit it to git!\n')
console.log('🔁  Restart your Next.js dev server after updating .env.local\n')

// ─── Pure-Node ASN.1 self-signed X.509 builder ───────────────────────────────
// This produces a minimal but valid X.509v3 cert that QZ Tray accepts.
function buildSelfSignedCert(privKeyPem, pubKeyPem) {
  // Extract the raw DER-encoded public key bytes (strip PEM headers)
  const pubKeyDer = Buffer.from(
    pubKeyPem.replace(/-----[^-]+-----/g, '').replace(/\s/g, ''),
    'base64'
  )

  const now    = new Date()
  const expiry = new Date(now)
  expiry.setFullYear(expiry.getFullYear() + 10)

  // ASN.1 DER helpers
  const tlv = (tag, value) => {
    const b = Buffer.isBuffer(value) ? value : Buffer.from(value)
    let lenBytes
    if (b.length < 128) {
      lenBytes = Buffer.from([b.length])
    } else if (b.length < 256) {
      lenBytes = Buffer.from([0x81, b.length])
    } else {
      lenBytes = Buffer.from([0x82, (b.length >> 8) & 0xff, b.length & 0xff])
    }
    return Buffer.concat([Buffer.from([tag]), lenBytes, b])
  }
  const seq  = v => tlv(0x30, v)
  const set  = v => tlv(0x31, v)
  const oid  = bytes => tlv(0x06, Buffer.from(bytes))
  const utf8 = s => tlv(0x0c, Buffer.from(s, 'utf8'))
  const int  = n => tlv(0x02, Buffer.from([n]))
  const bitStr = v => tlv(0x03, Buffer.concat([Buffer.from([0x00]), v]))

  const utcTime = d => {
    const s = d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'
    return tlv(0x17, Buffer.from(s))
  }

  // OIDs
  const OID_SHA256_RSA = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]
  const OID_COMMON_NAME = [0x55, 0x04, 0x03]

  // AlgorithmIdentifier for sha256WithRSAEncryption
  const algId = seq(Buffer.concat([oid(OID_SHA256_RSA), tlv(0x05, Buffer.alloc(0))]))

  // Name: CN=QZ Tray
  const name = seq(set(seq(Buffer.concat([oid(OID_COMMON_NAME), utf8('QZ Tray')]))))

  // Validity
  const validity = seq(Buffer.concat([utcTime(now), utcTime(expiry)]))

  // TBSCertificate
  const tbs = seq(Buffer.concat([
    tlv(0xa0, int(2)),       // version: v3
    int(1),                  // serialNumber
    algId,                   // signature algorithm
    name,                    // issuer
    validity,                // validity
    name,                    // subject (self-signed: same as issuer)
    pubKeyDer,               // subjectPublicKeyInfo (already DER)
  ]))

  // Sign the TBSCertificate
  const sign = crypto.createSign('SHA256')
  sign.update(tbs)
  const signature = sign.sign(privKeyPem)

  // Full Certificate
  const cert = seq(Buffer.concat([tbs, algId, bitStr(signature)]))

  // PEM encode
  const b64Cert = cert.toString('base64').match(/.{1,64}/g).join('\n')
  return `-----BEGIN CERTIFICATE-----\n${b64Cert}\n-----END CERTIFICATE-----\n`
}
