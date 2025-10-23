import { useContext } from "react";
import useSWR, { Key, SWRConfiguration, useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";
import useSWRMutation, { SWRMutationConfiguration } from "swr/mutation";
import { ProjectContext } from "../context";
import { fetcher } from "../fetcher";

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
  return useSWRMutation(
    () => generateKey(key, projectId),
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
