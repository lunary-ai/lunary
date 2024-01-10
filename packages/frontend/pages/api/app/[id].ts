import { apiWrapper } from "@/lib/api/helpers"

import { NextApiRequest, NextApiResponse } from "next"

export default apiWrapper(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  return res.status(200).json("ok")
})
