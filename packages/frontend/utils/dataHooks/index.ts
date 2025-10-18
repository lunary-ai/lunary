import { useContext, useMemo } from "react";
import useSWR, { Key, SWRConfiguration, useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";
import useSWRMutation, { SWRMutationConfiguration } from "swr/mutation";
import { getUserColor } from "../colors";
import { ProjectContext } from "../context";

import { useComputedColorScheme } from "@mantine/core";

import type { APIPrompt, APIPromptVersion } from "@/types/prompt-types";
import { useAuth } from "../auth";
import { fetcher } from "../fetcher";

// Define rule interface for project rules
type ProjectRule = { type: string; [key: string]: any };

export function generateKey(
  baseKey: Key,
  projectId: string | undefined,
  extraParams?: string,
) {
  const resolvedKey = typeof baseKey === "function" ? baseKey() : baseKey;
  if (!projectId || !resolvedKey) return null;

  const operator = resolvedKey.includes("?") ? "&" : "?";

  let url = `${resolvedKey}${
    !resolvedKey.endsWith("?") ? operator : ""
  }projectId=${projectId}`;
  if (extraParams) {
    url += `&${extraParams}`;
  }

  return url;
}
export function useProjectSWR<T>(key?: Key, options?: SWRConfiguration) {
  const { projectId } = useContext(ProjectContext);

  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    () => generateKey(key, projectId),
    options,
  );

  return {
    data,
    error,
    isLoading: projectId === null ? true : isLoading,
    isValidating,
    mutate,
  };
}

export function useProjectMutation(
  key: Key,
  customFetcher:
    | typeof fetcher.post
    | typeof fetcher.patch
    | typeof fetcher.delete,
  options?: SWRMutationConfiguration<any, any>,
) {
  const { projectId } = useContext(ProjectContext);
  // Wrap customFetcher to accept direct data payload
  const fetcherWrapper = (_key: string, data: any) => {
    return customFetcher(_key, { arg: data });
  };

  return useSWRMutation(
    () => generateKey(key, projectId),
    // mutationFn receives (url, { arg: payload })
    (url, { arg }) => customFetcher(url, { arg }),
    options,
  );
}

export function useProjectInfiniteSWR(key: string, ...args: any[]) {
  const PAGE_SIZE = 30;

  const { projectId } = useContext(ProjectContext);

  function getKey(pageIndex, previousPageData) {
    if (previousPageData && !previousPageData.data?.length) return null;
    return generateKey(key, projectId, `page=${pageIndex}&limit=${PAGE_SIZE}`);
  }

  const { data, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite(getKey, ...(args as [any]));

  const items = data?.map((d) => d?.data).flat();
  const hasMore = items && items.length === PAGE_SIZE * size;

  function loadMore() {
    if (hasMore) {
      setSize((size) => size + 1);
    }
  }

  return {
    data: items,
    isLoading,
    isValidating,
    loadMore,
    mutate,
  };
}

export function useProjectMutate(key: Key, options?: SWRConfiguration) {
  const { projectId } = useContext(ProjectContext);

  const { mutate } = useSWRConfig();

  return (data) => {
    mutate(generateKey(key, projectId), data, false);
  };
}

export function useUser() {
  const { isSignedIn } = useAuth();

  const scheme = useComputedColorScheme();

  const { data, isLoading, mutate, error } = useSWR(
    () => isSignedIn && `/users/me`,
  );

  const color = data ? getUserColor(scheme, data.id) : null;
  const user = data ? { ...data, color } : null;

  return { user, loading: isLoading, mutate, error };
}

export function useOrg() {
  const { isSignedIn } = useAuth();

  const { data, isLoading, mutate } = useSWR(
    () => isSignedIn && `/users/me/org`,
  );

  const { trigger: createUserTrigger } = useSWRMutation(`/users`, fetcher.post);

  async function addUserToOrg(user) {
    await createUserTrigger(user);
    mutate();
  }

  const scheme = useComputedColorScheme();

  const users = data?.users?.map((user) => ({
    ...user,
    color: getUserColor(scheme, user.id),
  }));

  const org = data ? { ...data, users } : null;

  const { trigger: updateOrg } = useSWRMutation(
    `/orgs/${org?.id}`,
    fetcher.patch,
  );

  const { trigger: regenerateOrgKeyTrigger } = useSWRMutation(
    org ? `/orgs/${org.id}/api-key/regenerate` : null,
    fetcher.post,
  );

  async function regenerateOrgKey() {
    if (!org) return null;
    const response = await regenerateOrgKeyTrigger({});

    if (response?.apiKey) {
      mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            orgApiKey: response.apiKey,
          };
        },
        { revalidate: false },
      );
    }

    return response;
  }

  return {
    org,
    loading: isLoading,
    updateOrg,
    addUserToOrg,
    mutate,
    regenerateOrgKey,
  };
}

export function useJoinData(token?: string) {
  const { data, error, isLoading } = useSWR(
    token ? `/auth/join-data?token=${token}` : null,
  );

  return {
    data,
    isLoading,
    error,
  };
}

export function useProjects() {
  const { isSignedIn } = useAuth();

  const { data, isLoading, mutate } = useSWR(() => isSignedIn && `/projects`);

  const { trigger: insertMutation } = useSWRMutation(
    () => `/projects`,
    fetcher.post,
    {
      populateCache(result, currentData) {
        return [...currentData, result];
      },
    },
  );

  return {
    projects: data || [],
    mutate,
    insert: insertMutation,
    isLoading: isLoading,
  };
}

export function useProject() {
  const { projectId, setProjectId } = useContext(ProjectContext);

  const { projects, isLoading, mutate } = useProjects();

  const project = useMemo(
    () => projects?.find((p) => p.id === projectId),
    [projects, projectId],
  );

  const { trigger: updateMutation } = useSWRMutation(
    projectId && `/projects/${projectId}`,
    fetcher.patch,
  );

  const { trigger: dropMutation, isMutating: dropLoading } = useSWRMutation(
    projectId && `/projects/${projectId}`,
    fetcher.delete,
  );

  async function update(name: string) {
    await updateMutation({ name });
    const newProjects = projects.map((p) =>
      p.id === projectId ? { ...p, name } : p,
    );
    mutate(newProjects);
  }

  async function updateDataRetention(dataRetentionDays: string) {
    await updateMutation({ dataRetentionDays });
    const newProjects = projects.map((p) =>
      p.id === projectId ? { ...p, dataRetentionDays } : p,
    );
    mutate(newProjects);
  }

  async function drop(): Promise<Boolean> {
    try {
      await dropMutation();
      const newProjects = projects.filter((p) => p.id !== projectId);
      setProjectIygroundd(newProjects[0]?.id);
      mutate(newProjects);
      return true;
    } catch (error) {
      return false;
    }
  }

  return {
    project,
    update,
    updateDataRetention,
    drop,
    dropLoading,
    setProjectId,
    mutate,
    isLoading,
  };
}

export function useProjectRules() {
  const { projectId } = useContext(ProjectContext);

  const {
    data: rules,
    isLoading,
    mutate,
  } = useProjectSWR<ProjectRule[]>(projectId && `/projects/${projectId}/rules`);

  const { trigger: addRule, isMutating: addRulesLoading } = useSWRMutation(
    projectId && `/projects/${projectId}/rules`,
    fetcher.post,
    {
      onSuccess() {
        mutate();
      },
    },
  );

  const { trigger: deleteRule, isMutating: deleteRulesLoading } =
    useSWRMutation(
      projectId && `/projects/${projectId}/rules`,
      fetcher.delete,
      {
        onSuccess() {
          mutate();
        },
      },
    );

  const maskingRule = rules?.find((r) => r.type === "masking");
  const filteringRule = rules?.find((r) => r.type === "filtering");

  return {
    rules,
    isLoading,
    mutate,
    addRule,
    addRulesLoading,
    deleteRule,
    deleteRulesLoading,
    maskingRule,
    filteringRule,
  };
}

export function useTemplates(): {
  templates: APIPrompt[] | undefined;
  insert: (data: any) => Promise<APIPrompt>;
  mutate: (
    data?:
      | APIPrompt[]
      | Promise<APIPrompt[]>
      | ((
          current?: APIPrompt[] | undefined,
        ) => APIPrompt[] | Promise<APIPrompt[]>),
    shouldRevalidate?: boolean,
  ) => Promise<APIPrompt[] | undefined>;
  loading: boolean;
  isInserting: boolean;
} {
  const {
    data: templates,
    isLoading,
    mutate,
  } = useProjectSWR<APIPrompt[]>(`/templates`);

  // insert mutation
  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/templates`,
    fetcher.post,
  );

  return {
    templates,
    insert,
    mutate,
    loading: isLoading,
    isInserting,
  };
}

export function useTemplate(id: string): {
  template: APIPrompt | undefined;
  insertVersion: (data: any) => Promise<APIPromptVersion>;
  update: (data: any) => Promise<APIPrompt>;
  remove: (data?: any) => Promise<unknown>;
  mutate: (
    data?:
      | APIPrompt
      | Promise<APIPrompt>
      | ((current?: APIPrompt | undefined) => APIPrompt | Promise<APIPrompt>),
    shouldRevalidate?: boolean,
  ) => Promise<APIPrompt | undefined>;
  loading: boolean;
} {
  const {
    data: template,
    isLoading,
    mutate,
  } = useProjectSWR<APIPrompt>(id && `/templates/${id}`);

  const { trigger: update } = useProjectMutation(
    id && `/templates/${id}`,
    fetcher.patch,
  );

  const { trigger: remove } = useProjectMutation(
    id && `/templates/${id}`,
    fetcher.delete,
    {
      revalidate: false,
    },
  );

  // insert version mutation
  const { trigger: insertVersion } = useProjectMutation(
    `/templates/${id}/versions`,
    fetcher.post,
  );

  return {
    template,
    insertVersion,
    update,
    remove,
    mutate,
    loading: isLoading,
  };
}

export function useTemplateVersion(id: string): {
  templateVersion: APIPromptVersion | undefined;
  update: (data: any) => Promise<APIPromptVersion>;
  mutate: (
    data?:
      | APIPromptVersion
      | Promise<APIPromptVersion>
      | ((
          current?: APIPromptVersion | undefined,
        ) => APIPromptVersion | Promise<APIPromptVersion>),
    shouldRevalidate?: boolean,
  ) => Promise<APIPromptVersion | undefined>;
  loading: boolean;
} {
  const {
    data: templateVersion,
    isLoading,
    mutate,
  } = useProjectSWR<APIPromptVersion>(id && `/template_versions/${id}`);

  const { trigger: update } = useProjectMutation(
    `/template_versions/${id}`,
    fetcher.patch,
  );

  return {
    templateVersion,
    update,
    mutate,
    loading: isLoading,
  };
}

export function buildLogsAPIUrl(data = {}) {
  let url = `/runs?`;

  const params = Object.entries(data)
    .map(([key, value]) => {
      return `${key}=${value}`;
    })
    .join("&");

  return url + params;
}

export function useLogs(params: any) {
  return useProjectInfiniteSWR(buildLogsAPIUrl(params));
}

export function useRun(id: string | null, initialData?: any) {
  const {
    data: run,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/runs/${id}`, {
    fallbackData: initialData,
  });

  const { trigger: updateVisibilityTrigger } = useProjectMutation(
    id && `/runs/${id}/visibility`,
    fetcher.patch,
  );

  const { trigger: updateFeedbackTrigger } = useProjectMutation(
    id && `/runs/${id}/feedback`,
    fetcher.patch,
  );

  const { trigger: deleteTrigger } = useProjectMutation(
    id && `/runs/${id}`,
    fetcher.delete,
    {
      revalidate: false,
    },
  );

  async function updateVisibility(visibility) {
    await updateVisibilityTrigger({ visibility });
    await mutate();
  }

  async function updateFeedback(feedback) {
    await updateFeedbackTrigger(feedback);
    await mutate();
  }

  async function deleteRun() {
    await deleteTrigger();
  }

  return {
    run,
    updateVisibility,
    updateFeedback,
    deleteRun,
    mutate,
    loading: isLoading,
  };
}

export function useDeleteRunById() {
  const { projectId } = useContext(ProjectContext);

  async function deleteRunById(id: string) {
    await fetcher.delete(generateKey(`/runs/${id}`, projectId));
  }

  return { deleteRun: deleteRunById };
}
export function useLogCount(filters: any) {
  const { data, isLoading } = useProjectSWR(`/runs/count?${filters}`);

  return { count: data, isLoading };
}

export function useRunsUsage(range, userId?: string) {
  const userIdStr = userId ? `&userId=${userId}` : "";
  const { data: usage, isLoading } = useProjectSWR(
    `/runs/usage?days=${range}${userIdStr}`,
  );

  return { usage, loading: isLoading };
}

export function useRunsUsageByDay(range, userId?: string) {
  const userIdStr = userId ? `&userId=${userId}` : "";

  const { data, isLoading } = useProjectSWR(
    `/runs/usage?days=${range}${userIdStr}&daily=true`,
  );

  return { dailyUsage: data, loading: isLoading };
}

export function useRunsUsageByUser(range = null) {
  const { data: usageByUser, isLoading } = useProjectSWR(
    `/external-users/runs/usage`,
  );

  const reduceUsersUsage = (usage) => {
    const userData: any = [];

    const uniqueUserIds = Array.from(new Set(usage.map((u) => u.user_id)));

    for (let id of uniqueUserIds) {
      const userUsage = usage.filter((u) => u.user_id === id);
      const totalCost = userUsage.reduce((acc, curr) => {
        acc += curr.cost;
        return acc;
      }, 0);

      const totalAgentRuns = userUsage.reduce((acc, curr) => {
        acc += curr.success + curr.errors;
        return acc;
      }, 0);

      userData.push({
        user_id: id,
        agentRuns: totalAgentRuns,
        cost: totalCost,
      });
    }

    return userData;
  };

  return {
    usageByUser: reduceUsersUsage(usageByUser || []),
    loading: isLoading,
  };
}

export function useOrgUser(userId: string) {
  const { mutate: mutateOrg } = useOrg();

  const { data, isLoading, mutate } = useProjectSWR<{
    id: string;
    [key: string]: any;
  }>(userId && `/users/${userId}`);

  async function removeUserFromOrg() {
    await triggerDelete();
    await mutateOrg();
  }
  const { trigger: triggerDelete } = useProjectMutation(
    `/users/${userId}`,
    fetcher.delete,
  );

  async function updateUser(data: any) {
    await triggerUpdate(data);
    await mutateOrg();
  }
  const { trigger: triggerUpdate } = useProjectMutation(
    `/users/${userId}`,
    fetcher.patch,
  );

  const scheme = useComputedColorScheme();

  const user = data ? { ...data, color: getUserColor(scheme, data.id) } : null;

  return { user, loading: isLoading, mutate, removeUserFromOrg, updateUser };
}

export function useChecklists(type: string) {
  const { data, isLoading, mutate } = useProjectSWR(
    type && `/checklists?type=${type}`,
  );

  // insert mutation
  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/checklists`,
    fetcher.post,
  );

  const { trigger: update, isMutating: isUpdating } = useProjectMutation(
    `/checklists`,
    fetcher.patch,
  );

  return {
    checklists: data,
    insert,
    isInserting,
    update,
    isUpdating,
    mutate,
    loading: isLoading,
  };
}

export function useChecklist(id: string, initialData?: any) {
  const {
    data: checklist,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/checklists/${id}`, {
    fallbackData: initialData,
  });

  const { trigger: update } = useProjectMutation(
    id && `/checklists/${id}`,
    fetcher.patch,
  );

  const { trigger: remove } = useProjectMutation(
    id && `/checklists/${id}`,
    fetcher.delete,
    {
      revalidate: false,
    },
  );

  return {
    checklist,
    update,
    remove,
    mutate,
    loading: isLoading,
  };
}

export function useDatasets() {
  const { data, isLoading, mutate } = useProjectSWR(`/datasets`);

  // insert mutation
  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/datasets`,
    fetcher.post,
  );

  const { trigger: insertPrompt } = useProjectMutation(
    `/datasets/prompts`,
    fetcher.post,
  );

  const { trigger: update, isMutating: isUpdating } = useProjectMutation(
    `/datasets`,
    fetcher.patch,
  );

  const { trigger: insertPrompts, isMutating: isInsertingPrompts } =
    useProjectMutation(`/datasets/prompts/attach`, fetcher.post);

  return {
    datasets: data || [],
    insert,
    isInserting,
    update,
    isUpdating,
    mutate,
    isLoading,
    insertPrompt,
    insertPrompts,
    isInsertingPrompts,
  };
}

export function useDataset(id: string, initialData?: any) {
  const { mutate: mutateDatasets } = useDatasets();

  const {
    data: dataset,
    isLoading,
    isValidating,
    mutate,
  } = useProjectSWR(id && id !== "new" ? `/datasets/${id}` : null, {
    fallbackData: initialData,
  });

  const { trigger: update } = useProjectMutation(
    `/datasets/${id}`,
    fetcher.patch,
  );

  const { trigger: remove } = useProjectMutation(
    `/datasets/${id}`,
    fetcher.delete,
    {
      onSuccess() {
        mutateDatasets((datasets) => datasets.filter((d) => d.id !== id));
      },
    },
  );

  const { trigger: insertPrompt, isMutating: isInsertingPrompt } =
    useProjectMutation(`/datasets/prompts`, fetcher.post);

  return {
    dataset,
    insertPrompt,
    update,
    remove,
    mutate,
    loading: isLoading,
    isValidating,
    isInsertingPrompt,
  };
}

export function useDatasetPrompt(id: string) {
  const {
    data: prompt,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/datasets/prompts/${id}`);

  const { trigger: update } = useProjectMutation(
    id && `/datasets/prompts/${id}`,
    fetcher.patch,
  );

  const { trigger: remove } = useProjectMutation(
    id && `/datasets/prompts/${id}`,
    fetcher.delete,
    {
      revalidate: false,
    },
  );

  const { trigger: insertVariation, isMutating: isInsertingVariation } =
    useProjectMutation(id && `/datasets/variations`, fetcher.post);

  return {
    prompt,
    update,
    remove,
    mutate,
    loading: isLoading,
    insertVariation,
    isInsertingVariation,
  };
}

/* ─────────────────────────────── Datasets V2 ────────────────────────────── */

export interface DatasetV2 {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

export interface DatasetItemV2 {
  id: string;
  datasetId: string;
  input: string;
  expectedOutput: string | null;
  createdAt: string;
  updatedAt: string;
}

type DatasetListResponse = {
  data: DatasetV2[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export function useDatasetsV2({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
} = {}) {
  const key = `/datasets-v2?page=${page}&pageSize=${pageSize}`;

  const {
    data,
    isLoading,
    isValidating,
    mutate,
    error,
  } = useProjectSWR<DatasetListResponse>(key, {
    keepPreviousData: true,
  });

  return {
    datasets: data?.data ?? [],
    pagination: {
      page: data?.page ?? page,
      pageSize: data?.pageSize ?? pageSize,
      totalCount: data?.totalCount ?? 0,
      totalPages: data?.totalPages ?? 0,
    },
    isLoading,
    isValidating,
    mutate,
    error,
  };
}

export function useDatasetV2(id?: string) {
  const {
    data,
    isLoading,
    isValidating,
    mutate,
    error,
  } = useProjectSWR<DatasetV2>(id ? `/datasets-v2/${id}` : null);

  const { trigger: update } = useProjectMutation(
    id ? `/datasets-v2/${id}` : null,
    fetcher.patch,
  );

  const { trigger: remove } = useProjectMutation(
    id ? `/datasets-v2/${id}` : null,
    fetcher.delete,
  );

  return {
    dataset: data ?? null,
    mutate,
    update,
    remove,
    isLoading,
    isValidating,
    error,
  };
}

export function useCreateDatasetV2() {
  const { trigger, isMutating } = useProjectMutation(
    `/datasets-v2`,
    fetcher.post,
  );

  return {
    createDataset: trigger,
    creating: isMutating,
  };
}

export function useDatasetPromptVariation(id: string) {
  const {
    data: variation,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/datasets/variations/${id}`);

  const { trigger: update } = useProjectMutation(
    id && `/datasets/variations/${id}`,
    fetcher.patch,
    {
      revalidate: false,
    },
  );

  const { trigger: remove } = useProjectMutation(
    id && `/datasets/variations/${id}`,
    fetcher.delete,
    {
      revalidate: false,
    },
  );

  return {
    variation,
    update,
    remove,
    mutate,
    loading: isLoading,
  };
}

export function useEvaluations() {
  const { data, isLoading } = useProjectSWR(`/evaluations`);

  return {
    evaluations: data || [],
    isLoading,
  };
}

export function useEvaluation(id: string) {
  const {
    data: evaluation,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/evaluations/${id}`);

  return {
    evaluation,
    mutate,
    loading: isLoading,
  };
}

export function useLunaryVersion() {
  const { data: backendVersion, isLoading } = useSWR("/version");

  return {
    backendVersion: backendVersion ? backendVersion.version : null,
    frontendVersion: process.env.NEXT_PUBLIC_LUNARY_VERSION,
    isLoading,
  };
}

export function useCustomEventsNames() {
  const { data, isLoading } = useProjectSWR<string[]>("/filters/custom-events");

  return {
    names: data || [],
    isLoading,
  };
}

export function useMetadataKeys(type?: string) {
  const { data, isLoading, error } = useProjectSWR(
    type ? `/filters/metadata?type=${type}` : "/filters/metadata",
  );

  return {
    metadataKeys: data || [],
    isLoading,
    error,
  };
}

export * from "./audit-logs";
export * from "./playground-endpoints";
