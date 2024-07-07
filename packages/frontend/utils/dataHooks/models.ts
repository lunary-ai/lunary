import { useProjectMutation, useProjectSWR } from "."
import { fetcher } from "../fetcher"

export function useModels() {
  const { data, isLoading, mutate } = useProjectSWR(`/models`)

  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/models`,
    fetcher.post,
    {
      onSuccess: () => {
        mutate()
      },
    },
  )

  const { trigger: update, isMutating: isUpdating } = useProjectMutation(
    `/models`,
    fetcher.patch,
  )

  return {
    models: data,
    insert,
    isInserting,
    update,
    isUpdating,
    mutate,
    loading: isLoading,
  }
}
