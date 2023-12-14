import { NextApiRequest, NextApiResponse } from "next"
import sql from "../../../lib/db"
import { RESET_PASSWORD } from "../../../lib/emails"
import { sendEmail } from "../../../lib/sendEmail"
import { randomUUID } from "crypto"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { email } = await JSON.parse(req.body)

  const recoveryToken = randomUUID()
  await sql`update auth.users set recovery_token = ${recoveryToken} where email = ${email}`


  const confirmLink = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8080"
  }/reset-password?token=${recoveryToken}&email=${email}`

  await sendEmail(RESET_PASSWORD(email, confirmLink))
  console.log("ok")

  return res.status(200).json({ success: true })
}
