import { OtpModal } from './OtpModal'
import { sendLoginOtp, verifyLoginOtp, type User } from '../lib/api'
import { maskMobile } from '../lib/format'

type Props = {
  open: boolean
  nationalCode: string
  mobile: string
  onClose: () => void
  onVerified: (user: User) => void
  onMismatch: () => void
}

export function LoginOtpModal({ open, nationalCode, mobile, onClose, onVerified, onMismatch }: Props) {
  return (
    <OtpModal
      open={open}
      title="تأیید شماره موبایل"
      subtitle="کد تأیید پیامک‌شده را وارد کنید."
      info={
        <>
          کد تأیید به شماره{' '}
          <b className="font-bold text-ink" dir="ltr">
            {maskMobile(mobile)}
          </b>{' '}
          ارسال شد.
        </>
      }
      submitLabel="ورود به انتخاب پرونده"
      onClose={onClose}
      onSubmit={async (code) => onVerified(await verifyLoginOtp(nationalCode, mobile, code))}
      onResend={() => sendLoginOtp(nationalCode, mobile)}
      onOtherError={(c) => c === 'shahkar_mismatch' && onMismatch()}
    />
  )
}
