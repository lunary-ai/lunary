import { NextApiRequest, NextApiResponse } from "next"

// TODO: put this on the backend (used for legacy LLMonitorCallbackHandler python)
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  return res.status(200).json("ok")
}
