import { edgeWrapper } from "@/lib/api/edgeHelpers"

import { jsonResponse } from "@/lib/api/jsonResponse"
import { CONFIRM_EMAIL } from "@/lib/emails"
import { sendEmail } from "@/lib/sendEmail"
import { sign } from "@/utils/auth"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default edgeWrapper(async function handler(req) {
  // get email from body
  const { email, name } = await req.json()

  if (process.env.SKIP_EMAIL_VERIFY) jsonResponse(200, { message: "skipped" })

  // Generate token
  const token = await sign({ email }, process.env.JWT_SECRET)

  // Generate confirmation link
  const confirmLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/user/verify-email?token=${token}`

  await sendEmail(CONFIRM_EMAIL(email, name, confirmLink))

  return jsonResponse(200, { success: true })
})
