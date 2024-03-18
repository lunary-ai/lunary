drop table provider cascade;

alter table evaluation add column providers jsonb;

drop index CONCURRENTLY evaluation_result_evaluation_id_prompt_id_variation_id_mode_idx;

alter table evaluation_result add column provider jsonb;

alter table evaluation_result add column status text default 'success';
alter table evaluation_result alter column status SET NOT NULL;
alter table evaluation_result add column error text;

alter table evaluation_result alter column results DROP NOT NULL;
alter table evaluation_result alter column output DROP NOT NULL;
alter table evaluation_result alter column model DROP NOT NULL;