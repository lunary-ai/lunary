import sql from "@/src/utils/db";
import type { Sql } from "postgres";

export interface CreateDatasetVersionOptions {
  createdBy?: string | null;
  restoredFromVersionId?: string | null;
}

export interface DatasetVersionWithCount {
  id: string;
  datasetId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: string | null;
  restoredFromVersionId: string | null;
  name: string | null;
  description: string | null;
  itemCount: number;
}

type SqlClient = Sql<any> | typeof sql;

export async function createDatasetVersion(
  client: SqlClient,
  datasetId: string,
  options: CreateDatasetVersionOptions = {},
): Promise<DatasetVersionWithCount> {
  const [dataset] = await client`
    select id, owner_id, name, description, current_version_number
    from dataset_v2
    where id = ${datasetId}
    for update
  `;

  if (!dataset) {
    throw new Error(`Dataset ${datasetId} not found while creating version`);
  }

  const versionNumber = Number(dataset.currentVersionNumber ?? 0) + 1;
  const createdBy = options.createdBy ?? dataset.ownerId ?? null;
  const restoredFromVersionId = options.restoredFromVersionId ?? null;

  const [insertedVersion] = await client`
    insert into dataset_v2_version (
      dataset_id,
      version_number,
      created_by,
      restored_from_version_id,
      name,
      description
    ) values (
      ${datasetId},
      ${versionNumber},
      ${createdBy},
      ${restoredFromVersionId},
      ${dataset.name ?? null},
      ${dataset.description ?? null}
    )
    returning *
  `;

  await client`
    insert into dataset_v2_version_item (
      version_id,
      dataset_id,
      item_index,
      input,
      ground_truth,
      output,
      evaluator_result_1,
      evaluator_result_2,
      evaluator_result_3,
      evaluator_result_4,
      evaluator_result_5,
      source_item_id,
      source_created_at,
      source_updated_at
    )
    select ${insertedVersion.id},
      ${datasetId},
      row_number() over (order by created_at asc, id asc) as item_index,
      input,
      ground_truth,
      output,
      evaluator_result_1,
      evaluator_result_2,
      evaluator_result_3,
      evaluator_result_4,
      evaluator_result_5,
      id,
      created_at,
      updated_at
    from dataset_v2_item
    where dataset_id = ${datasetId}
  `;

  await client`
    update dataset_v2
    set current_version_id = ${insertedVersion.id},
        current_version_number = ${versionNumber},
        updated_at = statement_timestamp()
    where id = ${datasetId}
  `;

  const [versionWithCount] = await client`
    select
      v.*,
      coalesce(version_items.item_count, 0)::int as item_count
    from dataset_v2_version v
    left join lateral (
      select count(*) as item_count
      from dataset_v2_version_item vi
      where vi.version_id = v.id
    ) version_items on true
    where v.id = ${insertedVersion.id}
    limit 1
  `;

  return versionWithCount as DatasetVersionWithCount;
}
