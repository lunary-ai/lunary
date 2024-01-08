import sql from "@/lib/db"
import bcrypt from "bcrypt"
import { NextApiRequest, NextApiResponse } from "next"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" })
  }

  const { token, newPassword } = JSON.parse(req.body)

  if (
    !token ||
    typeof token !== "string" ||
    !newPassword ||
    typeof newPassword !== "string"
  ) {
    return res.status(400).json({ message: "Invalid input" })
  }

  try {
    const [{ id, recovery_token: recoveryToken }] =
      await sql`select id, recovery_token from auth.users where recovery_token = ${token}`

    if (token !== recoveryToken) {
      return res.status(400).json({ message: "Invalid token" })
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 12)

    await sql`
      update auth.users
      set encrypted_password = ${hashedPassword.toString()}
      where id = ${id};  
    `

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}
