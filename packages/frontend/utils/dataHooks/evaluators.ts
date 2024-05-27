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
  const { data, isLoading, mutate } = useProjectSWR(`/evaluators`)

  const { trigger: insertMutation } = useProjectMutation(
    `/evaluators`,
    fetcher.post,
  )

  async function insert(data: CreateEvaluatorData) {
    insertMutation(data)
  }

  return {
    evaluators: data,
    mutate,
    isLoading,
    insert,
  }
}

export function useEvaluator(id: string, initialData?: any) {
  const { mutate: mutateEvaluators } = useEvaluators()

  const { data, isLoading, mutate } = useProjectSWR(id && `/evaluators/${id}`, {
    fallbackData: initialData,
  })

  const { trigger: updateMutation } = useProjectMutation(
    `/evaluators/${id}`,
    fetcher.patch,
  )

  const { trigger: deleteMutation } = useProjectMutation(
    `/evaluators/${id}`,
    fetcher.delete,
    {
      onSuccess() {
        mutateEvaluators((evaluators) => evaluators.filter((r) => r.id !== id))
      },
    },
  )

  return {
    evaluator: data,
    update: updateMutation,
    delete: deleteMutation,
    mutate,
    isLoading,
  }
}
