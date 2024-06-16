lock table run in exclusive mode;

update run
set template_version_id = null
where template_version_id is not null
  and template_version_id not in (select id from template_version);

alter table run add constraint run_template_version_id_fkey foreign key (template_version_id) references template_version(id) on delete set null;