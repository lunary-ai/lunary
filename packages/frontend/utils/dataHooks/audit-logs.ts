import { useState } from 'react';
import { useProjectSWR } from '.';

export function useAuditLogs(params: {
  limit?: number;
  offset?: number;
  action?: string;
  resourceType?: string;
  userId?: string;
  projectId?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  search?: string;
}) {
  const { 
    limit = 50, 
    offset = 0, 
    action, 
    resourceType, 
    userId, 
    projectId,
    startDate,
    endDate,
    search
  } = params;

  // Build the query parts
  let queryParts = [];
  
  queryParts.push(`limit=${limit}`);
  queryParts.push(`offset=${offset}`);
  
  if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
  if (action) queryParts.push(`action=${encodeURIComponent(action)}`);
  if (resourceType) queryParts.push(`resourceType=${encodeURIComponent(resourceType)}`);
  if (userId) queryParts.push(`userId=${encodeURIComponent(userId)}`);
  if (projectId) queryParts.push(`projectId=${encodeURIComponent(projectId)}`);
  if (startDate) queryParts.push(`startDate=${startDate.toISOString()}`);
  if (endDate) queryParts.push(`endDate=${endDate.toISOString()}`);

  const url = `/audit-logs?${queryParts.join('&')}`;

  const { data, isLoading, isValidating, mutate } = useProjectSWR(url);

  return {
    logs: data?.logs || [],
    total: data?.total || 0,
    loading: isLoading,
    isValidating,
    mutate,
  };
}

// For implementing pagination with audit logs
export function usePaginatedAuditLogs(initialParams: {
  limit?: number;
  action?: string;
  resourceType?: string;
  userId?: string;
  projectId?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  search?: string;
}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialParams.limit || 50);
  
  const offset = (page - 1) * limit;
  
  // Call the base hook with pagination params
  const { logs, total, loading, isValidating, mutate } = useAuditLogs({
    ...initialParams,
    limit,
    offset,
  });

  return {
    logs,
    total,
    loading,
    isValidating,
    page,
    limit,
    setPage,
    setLimit,
    mutate,
  };
}