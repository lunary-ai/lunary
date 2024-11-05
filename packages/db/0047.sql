alter table run drop constraint "run_parent_run_id_fkey";
alter table run add constraint "run_parent_run_id_fkey" foreign key (parent_run_id) references run (id) on update cascade on delete cascade;