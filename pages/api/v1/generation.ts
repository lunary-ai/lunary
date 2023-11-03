import { apiWrapper } from "@/lib/api/helpers"

export default apiWrapper(async function handler(req, res) {
  // const { data, error } = await supabase.from('users').select('*')

  // if (error) return res.status(401).json({ error: error.message })
  const data = {}
  return res.status(200).json(data)
})
