-- create alert and alert_history tables

create table alert (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  project_id uuid not null,
  owner_id uuid not null,
  name text not null,
  status text not null default 'healthy',
  threshold float not null,
  metric text not null,
  time_frame_minutes integer not null,
  email text,
  webhook_url text,
  constraint fk_alert_project_id foreign key (project_id) references project(id) on delete cascade,
  constraint fk_alert_owner_id foreign key (owner_id) references account(id) on delete set null
);

create index idx_alert_project_id on alert (project_id);

create table alert_history (
  id uuid default uuid_generate_v4() primary key,
  alert_id uuid not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  trigger float not null,
  status text not null,
  constraint fk_alert_history_alert foreign key (alert_id) references alert(id) on delete set null
);

create index idx_alert_history_alert_id on alert_history (alert_id);
