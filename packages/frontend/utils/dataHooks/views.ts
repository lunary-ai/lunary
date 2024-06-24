import { useProjectMutation, useProjectSWR } from "."
import { fetcher } from "../fetcher"

export function useViews() {
  const { data, isLoading, mutate } = useProjectSWR(`/views`)

  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/views`,
    fetcher.post,
  )

  const { trigger: update, isMutating: isUpdating } = useProjectMutation(
    `/views`,
    fetcher.patch,
  )

  return {
    views: data,
    insert,
    isInserting,
    update,
    isUpdating,
    mutate,
    loading: isLoading,
  }
}

export function useView(id?: string, initialData?: any) {
  const { mutate: mutateViews } = useViews()

  const {
    data: view,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/views/${id}`, {
    fallbackData: initialData,
  })

  const { trigger: update } = useProjectMutation(
    id && `/views/${id}`,
    fetcher.patch,
    {
      onSuccess() {
        mutateViews()
      },
    },
  )

  const { trigger: remove } = useProjectMutation(
    id && `/views/${id}`,
    fetcher.delete,
    {
      revalidate: false,
      onSuccess() {
        mutateViews()
      },
    },
  )

  return {
    view,
    update,
    remove,
    mutate,
    loading: isLoading,
  }
}
