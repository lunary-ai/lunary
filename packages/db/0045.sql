create table _data_warehouse_connector(
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  project_id uuid not null,
  type text,
  status text,
  constraint fk_checklist_project_id foreign key (project_id) references project(id) on delete cascade
);
create unique index on  _data_warehouse_connector(project_id);