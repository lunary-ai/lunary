import { useMantineTheme } from "@mantine/core"
import { useColorScheme } from "@mantine/hooks"
import { useContext } from "react"
import useSWR from "swr"
import useSWRInfinite from "swr/infinite"
import { ProjectContext } from "./context"
import { getUserColor } from "./colors"
import useSWRMutation from "swr/mutation"
import { fetcher } from "./swr"
import { calcRunCost } from "./calcCosts"

// TODO: put in other file
function extendWithCosts(data: any[]) {
  return data?.map((r) => ({
    ...r,
    cost: calcRunCost(r),
  }))
}

export function useProjectSWR(key: string, ...args: any[]) {
  const { projectId } = useContext(ProjectContext)

  return useSWR(
    projectId && key ? `/v1/projects/${projectId}${key}` : null,
    ...(args as [any]),
  )
}

export function useProjectInfiniteSWR(key: string, ...args: any[]) {
  const { projectId } = useContext(ProjectContext)

  function getKey(pageIndex, previousPageData) {
    if (previousPageData && !previousPageData.length) return null
    return projectId && key
      ? `/v1/projects/${projectId}${key}?page=${pageIndex}&limit=100`
      : null
  }

  const { data, isLoading, isValidating, size, setSize } = useSWRInfinite(
    getKey,
    ...(args as [any]),
  )

  function loadMore() {
    setSize(size + 1)
  }

  return {
    data,
    isLoading,
    isValidating,
    loadMore,
  }
}

// TODO: not sure all queries should have soft options
// TODO: optimistic insert and updates

// TODO: find better names for hooks
export function useModelNames() {
  const { data, isLoading } = useProjectSWR(`/filters/models`)

  return { modelNames: data || [], isLoading }
}

export function useTags() {
  const { data, isLoading } = useProjectSWR(`/filters/tags`)

  return { tags: data || [], isLoading }
}

export function useAllFeedbacks() {
  const { data, isLoading } = useProjectSWR(`/filters/feedbacks`)

  return { allFeedbacks: data || [], isLoading }
}

export function useLogs(type: "llm" | "trace" | "thread") {
  function getKey(pageIndex, previousPageData) {
    if (previousPageData && !previousPageData.length) return null
    return `/logs?type=${type}&page=${pageIndex}&limit=100`
  }

  const { data, isLoading, isValidating, size, setSize } =
    useSWRInfinite(getKey)

  function loadMore() {
    setSize(size + 1)
  }

  const logs = data ? [].concat(...data) : []

  return { logs, loading: isLoading, validating: isValidating, loadMore }
}

export function useUser() {
  const theme = useMantineTheme()
  const scheme = useColorScheme()

  const { data, isLoading, mutate, error } = useSWR(`/v1/users/me`)

  const color = data ? getUserColor(scheme, theme, data.id) : null
  const user = data ? { ...data, color } : null

  return { user, isLoading, mutate, error }
}

export function useOrg() {
  const { data, isLoading, mutate } = useSWR(`/v1/users/me/org`)
  const theme = useMantineTheme()
  const scheme = useColorScheme()

  const users = data?.users?.map((user) => ({
    ...user,
    color: getUserColor(scheme, theme, user.id),
  }))

  const org = data ? { ...data, users } : null

  const { trigger: updateOrg } = useSWRMutation(
    `/v1/orgs/${org?.id}`,
    fetcher.patch,
  )

  return { org, isLoading, updateOrg, mutate }
}

export function useProjects() {
  const { org } = useOrg()
  const { data, isLoading } = useSWR(() => org && `/v1/orgs/${org.id}/projects`)

  // TODO: mutations

  return {
    projects: data || [],
    loading: isLoading,
    insert: () => {},
    drop: () => {},
    update: () => {},
  }
}

export function useCurrentProject() {
  const { projectId, setProjectId } = useContext(ProjectContext)
  const { projects, loading } = useProjects()

  const project = projects?.find((p) => p.id === projectId)

  return { project, setProjectId, loading }
}
