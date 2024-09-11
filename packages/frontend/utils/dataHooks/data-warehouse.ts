import { useProjectMutation, useProjectSWR } from ".";
import { fetcher } from "../fetcher";

export function useBigQuery() {
  const { data, isLoading, mutate } = useProjectSWR("/data-warehouse/bigquery");
  const { trigger: insertMutation } = useProjectMutation(
    `/data-warehouse/bigquery`,
    fetcher.post,
  );

  async function insert(apiKey: string) {
    await insertMutation({ apiKey });
    await mutate();
  }

  return { insert, connector: data, isLoading };
}
