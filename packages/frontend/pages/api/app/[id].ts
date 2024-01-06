import { apiWrapper } from "@/lib/api/helpers"
import { supabaseAdmin } from "@/lib/supabaseClient"
import { NextApiRequest, NextApiResponse } from "next"

export default apiWrapper(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!req.query.id) return res.status(400).send("no id")

  await supabaseAdmin.from("app").select("*").eq("id", req.query.id).single()

  return res.status(200).send("ok")
})
