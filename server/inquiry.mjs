/**
 * Economic-number inquiry.
 *
 * An individual's economic number = national code + 4-digit counter (0001, 0002, …).
 * To list someone's tax files we ask the inquiry service about every counter
 * from 0001 to INQUIRY_MAX_COUNTER and keep the ones that exist.
 *
 * Service contract (as observed):
 *   POST INQUIRY_URL   Content-Type: application/json-patch+json
 *   body  {"economicCode":"<14 digits>"}
 *   found     → { "data": { "nameTrade", "taxpayerStatus", "nationalId" }, "error": false }
 *   not found → { "error": true, "message": "4170 : شماره اقتصادی وارد شده یافت نشد.", … }
 *
 * The URL lives only in .env (INQUIRY_URL) and is never sent to the browser or logged.
 *
 * The service only answers Iranian IPs. When INQUIRY_TUNNEL=127.0.0.1:<port> is set,
 * requests are sent into an SSH reverse tunnel opened from a machine inside Iran
 * (see docs/relay-fa.md). The Host header and TLS name stay those of INQUIRY_URL,
 * so the service sees a normal request.
 */
import http from 'node:http'
import https from 'node:https'

const NOT_FOUND_CODE = '4170'

export function createInquiry(env) {
  const url = env.INQUIRY_URL
  const maxCounter = Number(env.INQUIRY_MAX_COUNTER || 20)
  const concurrency = Number(env.INQUIRY_CONCURRENCY || 5)
  const timeoutMs = Number(env.INQUIRY_TIMEOUT_MS || 8000)
  const cacheMs = Number(env.INQUIRY_CACHE_MINUTES || 10) * 60_000

  /** nationalCode → { at, files } */
  const cache = new Map()

  const tunnel = (env.INQUIRY_TUNNEL || '').trim()

  /** POST JSON to INQUIRY_URL, optionally through the tunnel. Resolves { status, body }. */
  function post(payload) {
    const u = new URL(url)
    const secure = u.protocol === 'https:'
    const [tHost, tPort] = tunnel ? tunnel.split(':') : []
    const data = Buffer.from(JSON.stringify(payload))
    return new Promise((resolve, reject) => {
      const req = (secure ? https : http).request(
        {
          host: tHost || u.hostname,
          port: Number(tPort) || Number(u.port) || (secure ? 443 : 80),
          path: u.pathname + u.search,
          method: 'POST',
          servername: secure ? u.hostname : undefined, // TLS name check against the real host
          headers: {
            Host: u.host,
            'Content-Type': 'application/json-patch+json',
            Accept: 'application/json',
            'Content-Length': data.length,
          },
          timeout: timeoutMs,
        },
        (res) => {
          const chunks = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
        },
      )
      req.on('timeout', () => req.destroy(new Error('timeout')))
      req.on('error', reject)
      req.end(data)
    })
  }

  async function lookup(economicCode) {
    try {
      const { status, body } = await post({ economicCode })
      let data = null
      try {
        data = JSON.parse(body)
      } catch {
        /* not JSON */
      }
      if (data && data.error === false && data.data) return { kind: 'found', data: data.data }
      if (data && data.error === true && String(data.message ?? '').trim().startsWith(NOT_FOUND_CODE)) return { kind: 'none' }
      if (data && data.error === true) return { kind: 'none', note: String(data.message ?? '').slice(0, 120) }
      return { kind: 'failed', note: `HTTP ${status}` }
    } catch (e) {
      return { kind: 'failed', note: e.code || e.message }
    }
  }

  return {
    configured: Boolean(url),
    viaTunnel: Boolean(url && tunnel),
    lookup,

    /**
     * Returns the tax files for a national code.
     * Throws Error('unavailable') when the service could not be reached at all.
     */
    async listFiles(nationalCode) {
      const hit = cache.get(nationalCode)
      if (hit && Date.now() - hit.at < cacheMs) return hit.files

      const codes = Array.from({ length: maxCounter }, (_, i) => nationalCode + String(i + 1).padStart(4, '0'))
      const results = new Array(codes.length)
      let next = 0
      await Promise.all(
        Array.from({ length: Math.min(concurrency, codes.length) }, async () => {
          while (next < codes.length) {
            const i = next++
            results[i] = await lookup(codes[i])
          }
        }),
      )

      const failed = results.filter((r) => r.kind === 'failed')
      if (failed.length === results.length) {
        console.error(`[inquiry] all ${results.length} lookups failed (first: ${failed[0]?.note})`)
        throw new Error('unavailable')
      }
      if (failed.length) console.warn(`[inquiry] ${failed.length}/${results.length} lookups failed (first: ${failed[0].note})`)

      const files = results
        .map((r, i) =>
          r.kind === 'found'
            ? {
                id: codes[i],
                economicNumber: codes[i],
                title: String(r.data.nameTrade || '').trim() || 'بدون نام تجاری',
                taxpayerStatus: String(r.data.taxpayerStatus || '').toUpperCase(),
              }
            : null,
        )
        .filter(Boolean)

      // Cache only complete answers, so a partial outage is retried next time.
      if (!failed.length) cache.set(nationalCode, { at: Date.now(), files })
      return files
    },
  }
}
