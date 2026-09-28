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
 */

const NOT_FOUND_CODE = '4170'

export function createInquiry(env) {
  const url = env.INQUIRY_URL
  const maxCounter = Number(env.INQUIRY_MAX_COUNTER || 20)
  const concurrency = Number(env.INQUIRY_CONCURRENCY || 5)
  const timeoutMs = Number(env.INQUIRY_TIMEOUT_MS || 8000)
  const cacheMs = Number(env.INQUIRY_CACHE_MINUTES || 10) * 60_000

  /** nationalCode → { at, files } */
  const cache = new Map()

  async function lookup(economicCode) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json-patch+json', Accept: 'application/json' },
        body: JSON.stringify({ economicCode }),
        signal: ctrl.signal,
      })
      const data = await res.json().catch(() => null)
      if (data && data.error === false && data.data) return { kind: 'found', data: data.data }
      if (data && data.error === true && String(data.message ?? '').trim().startsWith(NOT_FOUND_CODE)) return { kind: 'none' }
      if (data && data.error === true) return { kind: 'none', note: String(data.message ?? '').slice(0, 120) }
      return { kind: 'failed', note: `HTTP ${res.status}` }
    } catch (e) {
      return { kind: 'failed', note: e.name === 'AbortError' ? 'timeout' : e.message }
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    configured: Boolean(url),

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
