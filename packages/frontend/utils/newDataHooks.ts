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

export function useProjectMutation(key: string, ...args: any[]) {
  const { projectId } = useContext(ProjectContext)

  // const key

  return useSWRMutation(
    projectId && key ? `/v1/projects/${projectId}${key}` : null,
    ...(args as [any]),
  )
}

export function useProjectInfiniteSWR(key: string, ...args: any[]) {
  const { projectId } = useContext(ProjectContext)

  function getKey(pageIndex, previousPageData) {
    if (previousPageData && !previousPageData.length) return null

    return projectId && key
      ? encodeURIComponent(
          `/v1/projects/${projectId}${key}` + key.includes("?")
            ? "&"
            : "?" + `page=${pageIndex}&limit=100`,
        )
      : null
  }

  const { data, isLoading, isValidating, size, setSize } = useSWRInfinite(
    getKey,
    ...(args as [any]),
  )

  return {
    data,
    loading: isLoading,
    validating: isValidating,
    loadMore: () => setSize(size + 1),
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

export function useTemplates() {
  const { data: templates, isLoading, mutate } = useProjectSWR(`/templates`)

  // insert mutation
  const { trigger: insert } = useProjectMutation(`/templates`, fetcher.post)

  return {
    templates,
    insert,
    mutate,
    loading: isLoading,
  }
}

export function useTemplate(id: string) {
  const {
    data: template,
    isLoading,
    mutate,
  } = useProjectSWR(`/templates/${id}`)

  const { trigger: update } = useProjectMutation(
    `/templates/${id}`,
    fetcher.patch,
  )

  const { trigger: remove } = useProjectMutation(
    `/templates/${id}`,
    fetcher.delete,
  )

  // insert mutation
  const { trigger: insertVersion } = useProjectMutation(
    `/templates/${id}/versions`,
    fetcher.post,
  )

  return {
    template,
    insertVersion,
    update,
    remove,
    mutate,
    loading: isLoading,
  }
}

export function useTemplateVersion(id: string) {
  const {
    data: templateVersion,
    isLoading,
    mutate,
  } = useProjectSWR(`/template_versions/${id}`)

  const { trigger: update } = useProjectMutation(
    `/template_versions/${id}`,
    fetcher.patch,
  )

  return {
    templateVersion,
    update,
    mutate,
    loading: isLoading,
  }
}

export function useRun(id: string) {
  const { data: run, isLoading, mutate } = useProjectSWR(`/runs/${id}`)

  const { trigger: update } = useProjectMutation(`/runs/${id}`, fetcher.patch)

  return {
    run,
    update,
    mutate,
    loading: isLoading,
  }
}

export function useRunsUsage(range, user_id?: string) {
  const { data: usage, isLoading } = useProjectSWR(
    `/runs/usage?days=${range}&user_id=${user_id}`,
  )

  return { usage: extendWithCosts(usage), loading: isLoading }
}

export function useRunsUsageByDay(range, user_id?: string) {
  const { data: usage, isLoading } = useProjectSWR(
    `/runs/usage?days=${range}&user_id=${user_id}&daily=true`,
  )

  return { dailyUsage: extendWithCosts(usage), loading: isLoading }
}

export function useRunsUsageByUser(range = null) {
  const { data: usageByUser, isLoading } = useProjectSWR(`/users/runs/usage`)

  const reduceUsersUsage = (usage) => {
    const userData = []

    const uniqueUserIds = Array.from(new Set(usage.map((u) => u.user_id)))

    for (let id of uniqueUserIds) {
      const userUsage = usage.filter((u) => u.user_id === id)
      const totalCost = userUsage.reduce((acc, curr) => {
        acc += curr.cost
        return acc
      }, 0)

      const totalAgentRuns = userUsage.reduce((acc, curr) => {
        acc += curr.success + curr.errors
        return acc
      }, 0)

      userData.push({
        user_id: id,
        agentRuns: totalAgentRuns,
        cost: totalCost,
      })
    }

    return userData
  }

  return {
    usageByUser: reduceUsersUsage(extendWithCosts(usageByUser || [])),
    loading: isLoading,
  }
}
