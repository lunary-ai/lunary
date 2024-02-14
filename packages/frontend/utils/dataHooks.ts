import { useMantineTheme } from "@mantine/core"
import { useContext } from "react"
import useSWR, { SWRConfiguration } from "swr"
import useSWRInfinite from "swr/infinite"
import { ProjectContext } from "./context"
import { getUserColor, useFixedColorScheme } from "./colors"
import useSWRMutation, { SWRMutationConfiguration } from "swr/mutation"

import { fetcher } from "./fetcher"
import { useAuth } from "./auth"

type KeyType = string | ((...args: any[]) => string)

function generateKey(
  baseKey: KeyType | undefined,
  projectId: string | undefined,
  extraParams?: string,
) {
  const resolvedKey = typeof baseKey === "function" ? baseKey() : baseKey
  if (!projectId || !resolvedKey) return null

  const operator = resolvedKey.includes("?") ? "&" : "?"

  let url = `${resolvedKey}${
    !resolvedKey.endsWith("?") ? operator : ""
  }projectId=${projectId}`
  if (extraParams) {
    url += `&${extraParams}`
  }

  return url
}
export function useProjectSWR(key?: KeyType, options?: SWRConfiguration) {
  const { projectId } = useContext(ProjectContext)

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    () => generateKey(key, projectId),
    options,
  )

  return {
    data,
    error,
    isLoading: projectId === null ? true : isLoading,
    isValidating,
    mutate,
  }
}

export function useProjectMutation(
  key: KeyType,
  customFetcher:
    | typeof fetcher.post
    | typeof fetcher.patch
    | typeof fetcher.delete,
  options?: SWRMutationConfiguration<any, any>,
) {
  const { projectId } = useContext(ProjectContext)

  return useSWRMutation(
    () => generateKey(key, projectId),
    customFetcher,
    options,
  )
}

export function useProjectInfiniteSWR(key: string, ...args: any[]) {
  const PAGE_SIZE = 1

  const { projectId } = useContext(ProjectContext)

  function getKey(pageIndex, previousPageData) {
    if (previousPageData && !previousPageData.length) return null
    return generateKey(key, projectId, `page=${pageIndex}&limit=100`)
  }

  const { data, isLoading, isValidating, size, setSize } = useSWRInfinite(
    getKey,
    ...(args as [any]),
  )

  function loadMore() {
    const hasMore = data && data[data.length - 1]?.length >= PAGE_SIZE

    if (hasMore) {
      setSize((size) => size + 1)
    }
  }

  return {
    data: data?.flat(),
    loading: isLoading,
    validating: isValidating,
    loadMore,
  }
}
export function useUser() {
  const { isSignedIn } = useAuth()

  const theme = useMantineTheme()
  const scheme = useFixedColorScheme()

  const { data, isLoading, mutate, error } = useSWR(
    () => isSignedIn && `/users/me`,
  )

  const color = data ? getUserColor(scheme, theme, data.id) : null
  const user = data ? { ...data, color } : null

  return { user, loading: isLoading, mutate, error }
}

export function useOrg() {
  const { isSignedIn } = useAuth()

  const { data, isLoading, mutate } = useSWR(
    () => isSignedIn && `/users/me/org`,
  )

  const theme = useMantineTheme()
  const scheme = useFixedColorScheme()

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
  const { isSignedIn } = useAuth()

  const { data, isLoading, isValidating, mutate } = useSWR(
    () => isSignedIn && `/projects`,
  )

  const { trigger: insertMutation } = useSWRMutation(
    () => `/projects`,
    fetcher.post,
    {
      populateCache(result, currentData) {
        return [...currentData, result]
      },
    },
  )

  return {
    projects: data || [],
    mutate,
    insert: insertMutation,
    isLoading: isLoading,
  }
}

export function useProject() {
  const { projectId, setProjectId } = useContext(ProjectContext)

  const { projects, isLoading, mutate } = useProjects()

  const project = projects?.find((p) => p.id === projectId)

  const { trigger: updateMutation } = useSWRMutation(
    `/projects/${projectId}`,
    fetcher.patch,
  )
  const { trigger: dropMutation } = useSWRMutation(
    `/projects/${projectId}`,
    fetcher.delete,
  )

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
    project,
    update,
    drop,
    setProjectId: setProjectId,
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
  } = useProjectSWR(id && `/template_versions/${id}`)

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

export function buildLogsAPIUrl(data = {}) {
  let url = `/runs?`

  const params = Object.entries(data)
    .map(([key, value]) => {
      return `${key}=${value}`
    })
    .join("&")

  return url + params
}

export function useLogs(params: any) {
  return useProjectInfiniteSWR(buildLogsAPIUrl(params))
}

export function useRun(id: string, initialData?: any) {
  const {
    data: run,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/runs/${id}`, {
    fallbackData: initialData,
  })

  const { trigger: update } = useProjectMutation(
    id && `/runs/${id}`,
    fetcher.patch,
  )

  async function updateRun(data) {
    await update(data)
    mutate({ ...run, ...data })
  }

  return {
    run,
    update: updateRun,
    mutate,
    loading: isLoading,
  }
}

export function useRunsUsage(range, userId?: string) {
  const userIdStr = userId ? `&userId=${userId}` : ""
  const { data: usage, isLoading } = useProjectSWR(
    `/runs/usage?days=${range}${userIdStr}`,
  )

  return { usage, loading: isLoading }
}

export function useRunsUsageByDay(range, userId?: string) {
  const userIdStr = userId ? `&userId=${userId}` : ""

  const { data, isLoading } = useProjectSWR(
    `/runs/usage?days=${range}${userIdStr}&daily=true`,
  )

  return { dailyUsage: data, loading: isLoading }
}

export function useRunsUsageByUser(range = null) {
  const { data: usageByUser, isLoading } = useProjectSWR(
    `/external-users/runs/usage`,
  )

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
    usageByUser: reduceUsersUsage(usageByUser || []),
    loading: isLoading,
  }
}

// TODO: pagination
export function useAppUserList() {
  const {
    data: users,
    isLoading,
    isValidating,
  } = useProjectSWR(`/external-users`)

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

export function useOrgUser(userId: string) {
  const { data, isLoading, mutate } = useProjectSWR(
    userId && `/users/${userId}`,
  )

  const theme = useMantineTheme()
  const scheme = useFixedColorScheme()

  const user = {
    ...data,
    color: getUserColor(scheme, theme, data?.id),
  }

  return { user, loading: isLoading, mutate }
}

export function useDatasets() {
  const { data, isLoading, mutate } = useProjectSWR(`/datasets`)

  // insert mutation
  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/datasets`,
    fetcher.post,
  )

  const { trigger: update, isMutating: isUpdating } = useProjectMutation(
    `/datasets`,
    fetcher.patch,
  )

  return {
    datasets: data || [],
    insert,
    isInserting,
    update,
    isUpdating,
    mutate,
    isLoading,
  }
}

export function useDataset(id: string) {
  const {
    data: dataset,
    isLoading,
    mutate,
  } = useProjectSWR(id && id !== "new" && `/datasets/${id}`)

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
    isLoading,
  }
}

export function useRadars() {
  const { data: radars, isLoading, mutate } = useProjectSWR(`/radars`)

  // insert mutation
  const { trigger: insert } = useProjectMutation(`/radars`, fetcher.post, {
    populateCache(result, currentData) {
      return [...currentData, result]
    },
  })

  return {
    radars,
    insert,
    mutate,
    loading: isLoading,
  }
}

export function useRadar(id, initialData?: any) {
  const { mutate: mutateRadars } = useRadars()

  const {
    data: radar,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/radars/${id}`, {
    fallbackData: initialData,
  })

  const { trigger: update } = useProjectMutation(
    id && `/radars/${id}`,
    fetcher.patch,
    {},
  )

  const { trigger: remove } = useProjectMutation(
    id && `/radars/${id}`,
    fetcher.delete,
    {
      onSuccess() {
        mutateRadars((radars) => radars.filter((r) => r.id !== id))
      },
    },
  )

  const { data: chart } = useProjectSWR(id && `/radars/${id}/chart`)

  return {
    radar,
    chart,
    update,
    remove,
    mutate,
    loading: isLoading,
  }
}

export function useEvaluations() {
  const { data, isLoading } = useProjectSWR(`/evaluations`)

  return {
    evaluations: data || [],
    isLoading,
  }
}
