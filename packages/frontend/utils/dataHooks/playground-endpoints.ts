import { z } from "zod";
import { useProjectSWR, useProjectMutation, generateKey } from ".";
import { fetcher } from "../fetcher";
import { useSWRConfig } from "swr";
import { useState, useContext } from "react";
import { ProjectContext } from "../context";

// Schema for playground endpoints
const playgroundEndpointSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string().url(),
  auth: z
    .union([
      z.object({
        type: z.literal("bearer"),
        token: z.string(),
      }),
      z.object({
        type: z.literal("api_key"),
        header: z.string(),
        key: z.string(),
      }),
      z.object({
        type: z.literal("basic"),
        username: z.string(),
        password: z.string(),
      }),
    ])
    .nullable(),
  headers: z.record(z.string()),
  defaultPayload: z.record(z.any()),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PlaygroundEndpoint = z.infer<typeof playgroundEndpointSchema>;

// Hook to get all playground endpoints
export function usePlaygroundEndpoints() {
  const { data, isLoading, mutate } = useProjectSWR<PlaygroundEndpoint[]>(
    "/playground-endpoints"
  );

  const endpoints = data ? z.array(playgroundEndpointSchema).parse(data) : [];

  return {
    endpoints,
    isLoading,
    mutate,
  };
}

// Hook to get a single playground endpoint
export function usePlaygroundEndpoint(id: string | null) {
  const { data, isLoading, mutate } = useProjectSWR<PlaygroundEndpoint>(
    id && `/playground-endpoints/${id}`
  );

  const endpoint = id && data ? playgroundEndpointSchema.parse(data) : null;

  return {
    endpoint,
    isLoading,
    mutate,
  };
}

// Hook to create a new playground endpoint
export function useCreatePlaygroundEndpoint() {
  const { mutate } = useProjectSWR<PlaygroundEndpoint[]>("/playground-endpoints");
  
  const { trigger, isMutating } = useProjectMutation(
    "/playground-endpoints",
    fetcher.post,
    {
      onSuccess: async () => {
        await mutate();
      },
    }
  );

  async function createEndpoint(data: {
    name: string;
    url: string;
    auth?: PlaygroundEndpoint["auth"];
    headers?: Record<string, string>;
    defaultPayload?: Record<string, any>;
  }) {
    return trigger({
      name: data.name,
      url: data.url,
      auth: data.auth || null,
      headers: data.headers || {},
      defaultPayload: data.defaultPayload || {},
    });
  }

  return {
    createEndpoint,
    isCreating: isMutating,
  };
}

// Hook to update a playground endpoint
export function useUpdatePlaygroundEndpoint(id: string | null) {
  const { mutate } = useProjectSWR<PlaygroundEndpoint[]>("/playground-endpoints");
  const { mutate: mutateEndpoint } = useProjectSWR<PlaygroundEndpoint>(
    id && `/playground-endpoints/${id}`
  );
  
  const { trigger, isMutating } = useProjectMutation(
    id && `/playground-endpoints/${id}`,
    fetcher.put,
    {
      onSuccess: async () => {
        await mutate();
        await mutateEndpoint();
      },
    }
  );

  async function updateEndpoint(data: Partial<{
    name: string;
    url: string;
    auth: PlaygroundEndpoint["auth"];
    headers: Record<string, string>;
    defaultPayload: Record<string, any>;
  }>) {
    if (!id) return;
    return trigger(data);
  }

  return {
    updateEndpoint,
    isUpdating: isMutating,
  };
}

// Hook to delete a playground endpoint
export function useDeletePlaygroundEndpoint() {
  const { mutate } = useProjectSWR<PlaygroundEndpoint[]>("/playground-endpoints");
  const { projectId } = useContext(ProjectContext);
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteEndpoint(id: string) {
    setIsDeleting(true);
    try {
      const url = generateKey(`/playground-endpoints/${id}`, projectId);
      if (url) {
        await fetcher.delete(url);
        await mutate();
      }
    } catch (error) {
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    deleteEndpoint,
    isDeleting,
  };
}

// Hook to test endpoint connection
export function useTestEndpointConnection() {
  const testConnection = async (endpoint: {
    url: string;
    auth?: PlaygroundEndpoint["auth"];
    headers?: Record<string, string>;
  }) => {
    const headers: Record<string, string> = {
      ...(endpoint.headers || {}),
    };

    // Add authentication headers
    if (endpoint.auth?.type === "bearer") {
      headers.Authorization = `Bearer ${endpoint.auth.token}`;
    } else if (endpoint.auth?.type === "api_key") {
      headers[endpoint.auth.header] = endpoint.auth.key;
    } else if (endpoint.auth?.type === "basic") {
      headers.Authorization = `Basic ${btoa(
        `${endpoint.auth.username}:${endpoint.auth.password}`
      )}`;
    }

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response;
  };

  return { testConnection };
}

// Hook to run prompt against endpoint
export function useRunEndpoint() {
  const runEndpoint = async ({
    endpoint,
    payload,
  }: {
    endpoint: PlaygroundEndpoint;
    payload: any;
  }) => {
    const headers: Record<string, string> = {
      ...(endpoint.headers || {}),
    };

    // Add authentication headers
    if (endpoint.auth?.type === "bearer") {
      headers.Authorization = `Bearer ${endpoint.auth.token}`;
    } else if (endpoint.auth?.type === "api_key") {
      headers[endpoint.auth.header] = endpoint.auth.key;
    } else if (endpoint.auth?.type === "basic") {
      headers.Authorization = `Basic ${btoa(
        `${endpoint.auth.username}:${endpoint.auth.password}`
      )}`;
    }

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  return { runEndpoint };
}