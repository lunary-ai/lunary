import { useMantineTheme } from "@mantine/core"
import { useColorScheme } from "@mantine/hooks"
import { use, useContext } from "react"
import useSWR, { Fetcher, SWRConfiguration } from "swr"
import useSWRInfinite from "swr/infinite"
import { ProjectContext } from "./context"
import { getUserColor } from "./colors"
import useSWRMutation from "swr/mutation"
import { calcRunCost } from "./calcCosts"
import { useRouter } from "next/router"
import { fetcher } from "./fetcher"

// TODO: put in other file
function extendWithCosts(data: any[]) {
  return data?.map((r) => ({
    ...r,
    cost: calcRunCost(r),
  }))
}

type KeyType = string | ((...args: any[]) => string)

export function useProjectSWR(key: KeyType, options?: SWRConfiguration) {
  const { projectId } = useContext(ProjectContext)
  const { org } = useOrg()
  const resolvedKey = typeof key === "function" ? key() : key

  return useSWR(
    () => `/orgs/${org.id}/projects/${projectId}${resolvedKey}`,
    options,
  )
}

export function useProjectMutation(
  key: KeyType,
  customFetcher:
    | typeof fetcher.post
    | typeof fetcher.patch
    | typeof fetcher.delete,
  options?: SWRConfiguration,
) {
  const { projectId } = useContext(ProjectContext)
  const { org } = useOrg()
  const resolvedKey = typeof key === "function" ? key() : key

  return useSWRMutation(
    () => `/orgs/${org.id}/projects/${projectId}${resolvedKey}`,
    customFetcher,
    options,
  )
}

export function useProjectInfiniteSWR(key: string, ...args: any[]) {
  const { projectId } = useContext(ProjectContext)

  function getKey(pageIndex, previousPageData) {
    if (previousPageData && !previousPageData.length) return null

    return projectId && key
      ? encodeURIComponent(
          `/projects/${projectId}${key}` + key.includes("?")
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

  const { data, isLoading, mutate, error } = useSWR(`/users/me`)

  const color = data ? getUserColor(scheme, theme, data.id) : null
  const user = data ? { ...data, color } : null

  return { user, loading: isLoading, mutate, error }
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

  return { org, loading: isLoading, updateOrg, mutate }
}

export function useProjects() {
  const { org } = useOrg()
  const { data, isLoading, mutate } = useSWR(() => `/orgs/${org.id}/projects`)

  const { trigger: insertMutation } = useSWRMutation(
    () => `/orgs/${org.id}/projects`,
    fetcher.post,
  )

  function insert(name: string) {
    return insertMutation({ name })
  }

  return {
    projects: data || [],
    mutate,
    insert,
    isLoading: isLoading,
  }
}

export function useCurrentProject() {
  const { projectId, setProjectId } = useContext(ProjectContext)

  const { projects, isLoading, mutate } = useProjects()

  const currentProject = projects?.find((p) => p.id === projectId)

  const { trigger: updateMutation } = useProjectMutation(`/`, fetcher.patch)
  const { trigger: dropMutation } = useProjectMutation(`/`, fetcher.delete)

  async function update(name: string) {
    await updateMutation({ name })
    const newProjects = projects.map((p) =>
      p.id === projectId ? { ...p, name } : p,
    )
    mutate(newProjects)
  }

  async function drop() {
    await dropMutation()
    const newProjects = projects.filter((p) => p.id !== projectId)
    setProjectId(newProjects[0]?.id)
    mutate(newProjects)
  }

  return {
    currentProject,
    update,
    drop,
    setCurrentProjectId: setProjectId,
    isLoading,
  }
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
  } = useProjectSWR(id && `/templates/${id}`)

  const { trigger: update } = useProjectMutation(`/templates/${id}`, "patch")

  const { trigger: remove } = useProjectMutation(`/templates/${id}`, "delete")

  // insert mutation
  const { trigger: insertVersion } = useProjectMutation(
    `/templates/${id}/versions`,
    "post",
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
  } = useProjectSWR(id && `/template_versions/${id}`)

  const { trigger: update } = useProjectMutation(
    `/template_versions/${id}`,
    "patch",
  )

  return {
    templateVersion,
    update,
    mutate,
    loading: isLoading,
  }
}

export function useLogs(
  type: "llm" | "trace" | "thread" | "chat",
  parentRunId?: string,
) {
  const PAGE_SIZE = 1
  const parentRunIdStr = parentRunId ? `&parentRunId=${parentRunId}` : "" // TODO: use a query param builder
  const { projectId } = useContext(ProjectContext)
  function getKey(pageIndex, previousPageData) {
    return `/projects/${projectId}/runs?type=${type}&page=${pageIndex}&limit=${PAGE_SIZE}${parentRunIdStr}`
  }

  const { data, isLoading, isValidating, size, setSize } =
    useSWRInfinite(getKey)

  function loadMore() {
    const hasMore = data && data[data.length - 1]?.length >= PAGE_SIZE

    if (hasMore) {
      setSize((size) => size + 1)
    }
  }

  const logs = data ? [].concat(...data) : []

  return {
    logs,
    loading: isLoading,
    validating: isValidating,
    loadMore,
  }
}

export function useRun(id: string, initialData?: any) {
  const {
    data: run,
    isLoading,
    mutate,
  } = useProjectSWR(`/runs/${id}`, {
    fallbackData: initialData,
  })

  const { trigger: update } = useProjectMutation(`/runs/${id}`, "patch", {
    populateCache: (updatedRun, run) => {
      console.log({ updatedRun, run })
      return { ...run, ...updatedRun }
    },
    // Since the API already gives us the updated information,
    // we don't need to revalidate here.
    revalidate: false,
  })

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

// TODO: pagination
export function useAppUserList() {
  const { data, isLoading, isValidating } = useProjectSWR(`/users`)

  const { usageByUser } = useRunsUsageByUser()

  const users = data?.map((u) => {
    const usage = usageByUser.find((uu) => uu.userId === u.id)

    return {
      ...u,
      ...usage,
    }
  })

  return { users, isLoading, isValidating }
}

// TODO
export function useAppUsers(usageRange = 30) {
  const { users, isLoading } = useAppUserList()

  const maxLastSeen = new Date(
    new Date().getTime() - usageRange * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10)

  const appUsers = users?.filter((u) => u.lastSeen > maxLastSeen)

  return { users: appUsers || [], loading: isLoading }
}

export function useDatasets() {
  const { data: datasets, isLoading, mutate } = useProjectSWR(`/datasets`)

  // insert mutation
  const { trigger: insert } = useProjectMutation(`/datasets`, fetcher.post)

  return {
    datasets,
    insert,
    mutate,
    loading: isLoading,
  }
}

export function useDataset(id: string) {
  const {
    data: dataset,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/datasets/${id}`)

  const { trigger: update } = useProjectMutation(
    `/datasets/${id}`,
    fetcher.patch,
  )

  const { trigger: remove } = useProjectMutation(
    `/datasets/${id}`,
    fetcher.delete,
  )

  // insert mutation
  const { trigger: insertRun } = useProjectMutation(
    `/datasets/${id}/runs`,
    fetcher.post,
  )

  return {
    dataset,
    insertRun,
    update,
    remove,
    mutate,
    loading: isLoading,
  }
}
