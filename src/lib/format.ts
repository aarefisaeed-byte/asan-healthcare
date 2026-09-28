const FA = '۰۱۲۳۴۵۶۷۸۹'
const AR = '٠١٢٣٤٥٦٧٨٩'

/** Latin digits → Persian digits, for display. */
export function toFa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA[Number(d)])
}

/** Persian/Arabic digits → Latin digits, keeping only digits. For input normalising. */
export function digitsOnly(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
    .replace(/\D/g, '')
}

/** Iranian national code: 10 digits + check digit. */
export function isValidNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code)) return false
  if (/^(\d)\1{9}$/.test(code)) return false
  const check = Number(code[9])
  const sum = code
    .slice(0, 9)
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (10 - i), 0)
  const r = sum % 11
  return r < 2 ? check === r : check === 11 - r
}

/** Iranian mobile: 09xxxxxxxxx */
export function isValidMobile(mobile: string): boolean {
  return /^09\d{9}$/.test(mobile)
}

/** 09121231234 → ۰۹۱۲***۱۲۳۴ */
export function maskMobile(mobile: string): string {
  return toFa(`${mobile.slice(0, 4)}***${mobile.slice(-4)}`)
}

/** seconds → ۰۱:۰۳ */
export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return toFa(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
}
