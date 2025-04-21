alter table provider_config
    drop constraint fk_project_id,
    add constraint fk_project_id foreign key (project_id) references project (id) on delete cascade;