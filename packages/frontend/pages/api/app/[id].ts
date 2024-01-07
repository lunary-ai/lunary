import { apiWrapper } from "@/lib/api/helpers"

import { NextApiRequest, NextApiResponse } from "next"
import sql from "@/lib/db"

export default apiWrapper(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!req.query.id) return res.status(400).send("no id")

  const [row] = await sql`
    SELECT * FROM app WHERE id = ${req.query.id} LIMIT 1
  `

  if (!row) throw new Error("not found")

  return res.status(200).json("ok")
})
