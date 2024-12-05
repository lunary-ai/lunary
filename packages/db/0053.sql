create table dashboard (
    id uuid default uuid_generate_v4 () primary key,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    owner_id uuid not null,
    project_id uuid not null,
    name text not null,
    description text null,
    filters jsonb default '{}' not null,
   	is_home boolean default false not null,
		charts jsonb default '[]' not null,
    constraint fk_checklist_owner_id foreign key (owner_id) references account (id) on delete set null,
    constraint fk_checklist_project_id foreign key (project_id) references project (id) on delete cascade
);

create table chart (
	id uuid not null default uuid_generate_v4(),
	created_at timestamptz default now(),
	updated_at timestamptz default now(),
	dashboard_id uuid not null,
	name text not null,
	description text,
	type text not null,
	filters jsonb not null,
	config jsonb not null,
	display_order integer not null,
	constraint fk_chart_dashboard_id foreign key (dashboard_id) references dashboard(id) on delete cascade,
	constraint unique_dashboard_order unique (dashboard_id, display_order),
	primary key (id)
);