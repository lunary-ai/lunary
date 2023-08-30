import { supabaseAdmin } from "@/lib/supabaseClient"
import { NextApiRequest, NextApiResponse } from "next"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await supabaseAdmin.from("app").select("*").eq("id", req.query.id).single()

    return res.status(200).send("ok")
  } catch (error) {
    console.log(error)
    return res.status(404).json({ error: error.message })
  }
}
