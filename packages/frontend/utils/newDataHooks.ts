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

// TODO: not sure all queries should have soft options
// TODO: optimistic insert and updates

// TODO: find better names for hooks
export function useModelNames() {
  const { projectId } = useContext(ProjectContext)
  const { data, isLoading } = useSWR(`/filters/models/${projectId}`)

  return { modelNames: data || [], isLoading }
}

export function useTags() {
  const { projectId } = useContext(ProjectContext)
  const { data, isLoading } = useSWR(`/filters/tags/${projectId}`)

  return { tags: data || [], isLoading }
}

export function useAllFeedbacks() {
  const { projectId } = useContext(ProjectContext)
  const { data, isLoading } = useSWR(`/filters/feedbacks/${projectId}`)

  return { allFeedbacks: data || [], isLoading }
}

export function useLogs(type: "llm" | "trace" | "thread") {
  function getKey(pageIndex, previousPageData) {
    if (previousPageData && !previousPageData.length) return null
    return `/logs/${projectId}?type=${type}&page=${pageIndex}&limit=100`
  }

  const { projectId } = useContext(ProjectContext)
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

  const { data, isLoading, mutate, error } = useSWR(`/users/me`)

  const color = data ? getUserColor(scheme, theme, data.id) : null
  const user = data ? { ...data, color } : null

  return { user, isLoading, mutate, error }
}

export function useOrg() {
  const { data, isLoading, mutate } = useSWR(`/users/me/org`)
  const theme = useMantineTheme()
  const scheme = useColorScheme()

  const users = data?.users?.map((user) => ({
    ...user,
    color: getUserColor(scheme, theme, user.id),
  }))

  const org = data ? { ...data, users } : null

  const { trigger: updateOrg } = useSWRMutation(
    `/orgs/${org?.id}`,
    fetcher.patch,
  )

  return { org, isLoading, updateOrg, mutate }
}

export function useProjects() {
  const { org } = useOrg()
  const { data, isLoading } = useSWR(() => org && `/projects/${org.id}`)

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
