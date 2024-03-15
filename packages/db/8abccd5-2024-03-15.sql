DROP table provider cascade;

alter table evaluation add column providers jsonb;

drop index CONCURRENTLY evaluation_result_evaluation_id_prompt_id_variation_id_mode_idx;

alter table evaluation_result add column provider jsonb;

alter table evaluation_result add column status text default 'success';
ALTER TABLE evaluation_result ALTER COLUMN status SET NOT NULL;
alter table evaluation_result add column error text;

ALTER TABLE evaluation_result ALTER COLUMN results DROP NOT NULL;
ALTER TABLE evaluation_result ALTER COLUMN output DROP NOT NULL;
ALTER TABLE evaluation_result ALTER COLUMN model DROP NOT NULL;