/**
 * One-off check of the inquiry service with the settings in .env — prints the result
 * without ever printing the service URL.
 *
 *   sudo -u asan node server/inquiry-check.mjs 04993708990001
 */
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInquiry } from './inquiry.mjs'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
try {
  process.loadEnvFile(join(ROOT, '.env'))
} catch {
  /* use real environment */
}
const code = process.argv[2]
if (!/^\d{11,14}$/.test(code || '')) {
  console.log('Usage: node server/inquiry-check.mjs <economic number>')
  process.exit(1)
}
const inquiry = createInquiry(process.env)
if (!inquiry.configured) {
  console.log('INQUIRY_URL is empty in .env')
  process.exit(1)
}
const started = Date.now()
const r = await inquiry.lookup(code)
console.log(`${inquiry.viaTunnel ? 'via tunnel' : 'direct'} — ${Date.now() - started} ms`)
console.log(JSON.stringify(r, null, 2))
