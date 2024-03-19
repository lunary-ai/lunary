drop table provider cascade;

alter table evaluation add column providers jsonb;

drop index evaluation_result_evaluation_id_prompt_id_variation_id_mode_idx;

alter table evaluation_result add column provider jsonb;

alter table evaluation_result add column status text default 'success';
alter table evaluation_result alter column status set not null; 
alter table evaluation_result add column error text;
alter table evaluation_result alter column results drop not null; 
alter table evaluation_result alter column output drop not null; 
alter table evaluation_result alter column model drop not null; 