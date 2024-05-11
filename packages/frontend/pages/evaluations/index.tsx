import { useRouter } from "next/router"
import { useEffect } from "react"

// const FEATURE_LIST = [
//   "Define assertions to test variations of prompts",
//   "Powerful AI powered assertion engine",
//   "Compare results with OpenAI, Anthropic, Mistral and more",
// ]

export default function Evaluations() {
  const router = useRouter()

  useEffect(() => {
    router.push("/evaluations/new")
  }, [])

  return null
}
