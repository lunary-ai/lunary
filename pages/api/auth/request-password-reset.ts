import { NextApiRequest, NextApiResponse } from "next"
import sql from "../../../lib/db"
import { RESET_PASSWORD } from "../../../lib/emails"
import { sendEmail } from "../../../lib/sendEmail"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { email } = await JSON.parse(req.body)

  const [{ recovery_token: token }] =
    await sql`select recovery_token from auth.users where email = ${email}`

  const confirmLink = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8080"
  }/reset-password?token=${token}&email=${email}`

  await sendEmail(RESET_PASSWORD(email, confirmLink))
  console.log("ok")

  return res.status(200).json({ success: true })
}
