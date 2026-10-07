/**
 * Enamad trust seal. The markup is Enamad's own snippet, kept unchanged as they require.
 * The seal is issued for asanfsp.ir, so it is shown only there (Enamad refuses other hosts).
 */
const SEAL_HTML =
  "<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=8069337&Code=l6FqNATrNTDsQM7y6Lf5yKk8UKUjjt42'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=8069337&Code=l6FqNATrNTDsQM7y6Lf5yKk8UKUjjt42' alt='' style='cursor:pointer' code='l6FqNATrNTDsQM7y6Lf5yKk8UKUjjt42'></a>"

const SEAL_HOST = 'asanfsp.ir'

export function EnamadSeal() {
  const host = typeof window === 'undefined' ? '' : window.location.hostname
  if (host !== SEAL_HOST && host !== `www.${SEAL_HOST}`) return null
  return <div className="enamad-seal flex min-h-24 items-center justify-center" dangerouslySetInnerHTML={{ __html: SEAL_HTML }} />
}
