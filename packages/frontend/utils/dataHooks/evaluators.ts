import { useProjectMutation, useProjectSWR } from "."
import { fetcher } from "../fetcher"

interface CreateEvaluatorData {
  ownerId?: string
  name: string
  slug: string
  description?: string
  type: string
  mode: string
  params: Record<string, any>
  filters?: string
}

export function useEvaluators() {
  const { data, isLoading } = useProjectSWR(`/evaluators`)

  const { trigger: insertMutation } = useProjectMutation(
    `/evaluators`,
    fetcher.post,
  )

  async function insert(data: CreateEvaluatorData) {
    insertMutation(data)
  }

  return {
    evaluators: data,
    isLoading,
    insert,
  }
}

// TODO
export function useEvaluator(id: string) {}
