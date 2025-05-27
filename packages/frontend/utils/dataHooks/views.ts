import { deserializeLogic, hasAccess, serializeLogic } from "shared";
import { useProjectMutation, useProjectSWR, useUser } from ".";
import { fetcher } from "../fetcher";

export function useViews() {
  const { user } = useUser();
  const { data, isLoading, mutate } = useProjectSWR(
    hasAccess(user?.role, "logs", "list") && `/views`,
  );

  const { trigger: insert, isMutating: isInserting } = useProjectMutation(
    `/views`,
    fetcher.post,
  );

  return {
    views: data,
    insert,
    isInserting,
    mutate,
    loading: isLoading,
  };
}

export function useView(id: string | null, initialData?: any) {
  const { mutate: mutateViews } = useViews();

  const {
    data: view,
    isLoading,
    mutate,
  } = useProjectSWR(id && `/views/${id}`, {
    fallbackData: initialData,
  });

  if (view) {
    view.data = deserializeLogic(serializeLogic(view?.data || [])); // because the params values are serialized in the server json response, we serialize everything first, then deserialize it
  }

  const { trigger: update } = useProjectMutation(
    id && `/views/${id}`,
    fetcher.patch,
    {
      onSuccess(data) {
        mutate(data);
        mutateViews();
      },
    },
  );

  const { trigger: remove } = useProjectMutation(
    id && `/views/${id}`,
    fetcher.delete,
    {
      revalidate: false,
      onSuccess() {
        mutateViews();
      },
    },
  );

  return {
    view,
    update,
    remove,
    mutate,
    loading: id && isLoading,
  };
}
