update
	api_key
set
	api_key = project_id
where
	type = 'public'; 

alter table api_key 
drop constraint "api_key_project_id_fkey", 
add constraint "api_key_project_id_fkey" foreign key (project_id) references project (id) on delete cascade;

alter table external_user 
drop constraint "external_user_project_id_fkey", 
add constraint "external_user_project_id_fkey" foreign key (project_id) references project (id) on delete cascade;

alter table account 
drop constraint "account_org_id_fkey", 
add constraint "account_org_id_fkey" foreign key (org_id) references org (id) on delete cascade;

alter table project 
drop constraint "project_org_id_fkey", 
add constraint "project_org_id_fkey" foreign key (org_id) references org (id) on delete cascade;


-- convert radar tables to use uuids (no data yet)

drop table radar;
drop table radar_result;

create table "public"."radar" (
	"id" uuid default uuid_generate_v4 (),
	"description" text,
	"project_id" uuid,
	"owner_id" uuid,
	"view" jsonb,
	"checks" jsonb,
	"alerts" jsonb,
	"negative" bool,
	constraint "radar_owner_id_fkey" foreign key ("owner_id") references "public"."account" ("id") on delete set null,
	constraint "radar_project_id_fkey" foreign key ("project_id") references "public"."project" ("id") on delete cascade,
	primary key ("id")
);


create table "public"."radar_result" (
	"id" uuid default uuid_generate_v4 (),
	"radar_id" uuid,
	"run_id" uuid,
	"created_at" timestamptz not null default now(),
	"results" _jsonb,
	"passed" bool,
	"details" jsonb,
	constraint "radar_result_radar_id_fkey" foreign key ("radar_id") references "public"."radar" ("id") on delete cascade,
	constraint "radar_result_run_id_fkey" foreign key ("run_id") references "public"."run" ("id") on delete cascade on update cascade,
	primary key ("id")
);


create table evaluation (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now() not null,
  name text not null,
  owner_id uuid not null,
  project_id uuid not null,
  models text[],
  checks jsonb,
  constraint fk_evaluation_owner_id foreign key (owner_id) references account(id) on delete cascade,
  constraint fk_evaluation_project_id foreign key (project_id) references project(id) on delete cascade
);
create index on evaluation (project_id);


create table prompt (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now() not null,
  evaluation_id uuid not null,
  content jsonb not null,
  extra jsonb,
  constraint fk_prompt_evaluation_id foreign key (evaluation_id) references evaluation(id) on delete cascade
);
create index on prompt (evaluation_id);


create table prompt_variation (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now() not null,
  variables jsonb not null,
  context text,
  ideal_output text,
  prompt_id uuid not null,
  constraint fk_prompt_variation_prompt_id foreign key (prompt_id) references prompt(id) on delete cascade
);
create index on prompt_variation (prompt_id);



create table evaluation_result (
  id uuid default uuid_generate_v4() primary key,
  evaluation_id uuid not null,
  prompt_id uuid,
  variation_id uuid,
  model text not null,
  output jsonb not null,
  results jsonb not null,
  passed boolean default false,
  completion_tokens integer,
  cost float8,
  duration text,
  created_at timestamp with time zone default now() not null,
  constraint fk_evaluation_result_evaluation_id foreign key (evaluation_id) references evaluation(id) on delete cascade,
  constraint fk_evaluation_result_prompt_id foreign key (prompt_id) references prompt(id) on delete cascade,
  constraint fk_evaluation_result_variation_id foreign key (variation_id) references prompt_variation(id) on delete cascade
);
create index on evaluation_result(evaluation_id, prompt_id, variation_id, model);


alter table prompt rename to evaluation_prompt;
alter table prompt_variation rename to evaluation_prompt_variation;
alter table prompt rename column content to messages

-- 14/02/2024

create table checklist (
    id uuid primary key default gen_random_uuid(),
    slug text,
    data jsonb,
    type text not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    owner_id uuid references account(id) on delete set null,
    project_id uuid not null references project(id) on delete cascade
);
