alter table evaluation add column if not exists checklist_id uuid;
alter table evaluation DROP CONSTRAINT IF EXISTS evaluation_checklist_id_fkey;
alter table evaluation add constraint evaluation_checklist_id_fkey foreign key (checklist_id) references checklist(id) on delete set null;

drop table if exists evaluation_prompt cascade;
drop table if exists evaluation_prompt_variation cascade;

alter table evaluation_result add constraint "fk_evaluation_result_prompt_id" foreign key (prompt_id) references dataset_prompt(id) on delete cascade;
