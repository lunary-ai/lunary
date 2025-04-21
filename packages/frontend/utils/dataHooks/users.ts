import { useProjectMutation, useProjectSWR } from ".";
import { fetcher } from "../fetcher";
import { useSWRConfig } from "swr";

export interface InvitationRequest {
  email: string;
  role: string;
  projects: string[];
}

export interface InvitedUser {
  id: string;
  email: string;
  role: string;
  projects: string[];
  orgId: string;
  token: string;
}

export function useInvitedUsers() {
  const { data, error, isLoading, mutate } =
    useProjectSWR<InvitedUser[]>("/users/invited");

  return {
    invitedUsers: data ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useInviteUser() {
  const { mutate: mutateUsers } =
    useProjectSWR<InvitedUser[]>("/users/invited");

  const { trigger: inviteTrigger, isMutating: isInviting } = useProjectMutation(
    "/users/invitation",
    fetcher.post,
    {
      onSuccess: async () => {
        await mutateUsers();
      },
    },
  );

  async function invite(body: InvitationRequest) {
    await inviteTrigger(body);
  }

  return {
    invite,
    isInviting,
  };
}
