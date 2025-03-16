import { useContext } from "react";
import useSWRInfinite from "swr/infinite";
import { ProjectContext } from "../context";

export function useAuditLogs() {
  const { projectId } = useContext(ProjectContext);
  const PAGE_SIZE = 10;

  function getKey(pageIndex, previousPageData) {
    if (previousPageData && !previousPageData.length) return null;
    return `/audit-logs?project_id=${projectId}&page=${pageIndex}&limit=${PAGE_SIZE}`;
  }

  const { data, isLoading, size, setSize } = useSWRInfinite(getKey);
  const items = data?.length ? data[size - 1] || [] : [];
  const hasMore = items.length === PAGE_SIZE;

  return { auditLogs: items, isLoading, page: size, setPage: setSize, hasMore };
}
