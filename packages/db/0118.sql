alter table dataset_v2
  add column evaluator_slot_1_id uuid references evaluator(id) on delete set null,
  add column evaluator_slot_2_id uuid references evaluator(id) on delete set null,
  add column evaluator_slot_3_id uuid references evaluator(id) on delete set null,
  add column evaluator_slot_4_id uuid references evaluator(id) on delete set null,
  add column evaluator_slot_5_id uuid references evaluator(id) on delete set null;

alter table dataset_v2_item
  add column evaluator_result_1 jsonb,
  add column evaluator_result_2 jsonb,
  add column evaluator_result_3 jsonb,
  add column evaluator_result_4 jsonb,
  add column evaluator_result_5 jsonb;

alter table dataset_v2_version_item
  add column evaluator_result_1 jsonb,
  add column evaluator_result_2 jsonb,
  add column evaluator_result_3 jsonb,
  add column evaluator_result_4 jsonb,
  add column evaluator_result_5 jsonb;
