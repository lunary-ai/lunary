create index concurrently on run using gin (to_tsvector('simple', substring(input_text, 1, 500000)));
create index concurrently on run using gin (to_tsvector('simple', substring(output_text, 1, 500000)));


create table evaluator (
	id uuid default uuid_generate_v4() primary key,
	created_at timestamptz default now(),
	updated_at timestamptz default now(),
	project_id uuid not null,
	owner_id uuid,
	name varchar(100) not null,
	slug varchar(100) not null,
	type varchar(25) not null,
	mode varchar(25), -- TODO: use enum
	description text,
	params jsonb,
	filters jsonb,
	
	
	constraint "evaluator_project_id_fkey" foreign key (project_id) references project(id) on delete cascade,
	constraint "evaluator_owner_id_fkey" foreign key (owner_id) references account(id) on delete set null
);

create table evaluator_result (
	id uuid default uuid_generate_v4() primary key,
	created_at timestamptz default now(),
	updated_at timestamptz default now(),
	
	evaluator_id uuid not null,
	run_id uuid not null,
	
	constraint "evaluator_result_evaluator_id_fkey" foreign key (evaluator_id) references evaluator(id) on delete cascade,
	constraint "evaluator_result_run_id_fkey" foreign key (run_id) references run(id) on delete cascade
)