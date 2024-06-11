lock table run;
alter table run drop constraint run_external_user_id_fkey;
alter table run add constraint run_external_user_id_fkey foreign key (external_user_id) references external_user(id) on delete cascade on update cascade;
