create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";


create type user_role as enum (
  'member',
  'admin'
);

create type org_plan as enum (
    'free',
    'pro',
    'unlimited',
    'custom'
);

create type api_key_type as enum (
    'public',
    'private'
);

----------
--- TABLES 
----------
create table account (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default now() not null,
    email text unique, 
    password_hash text,
    recovery_token text,
    name text,
    org_id uuid,
    role user_role,
    verified boolean default false not null
);
create index on account(org_id);

create table api_key (
    id serial primary key,
    created_at timestamp with time zone default now() not null,
    type api_key_type not null, 
    api_key uuid default uuid_generate_v4() not null,
    project_id uuid not null
);
create index on api_key(project_id);

create table external_user (
    id serial primary key,
    created_at timestamp with time zone default now() not null,
    project_id uuid not null,
    external_id character varying,
    last_seen timestamp with time zone,
    props jsonb
);
create unique index on external_user (project_id, external_id);
create index on external_user using gin (lower((props)::text) gin_trgm_ops);
create index on external_user using gin (lower(external_id) gin_trgm_ops);
create index on external_user (project_id, last_seen desc);


create table log (
    id bigint primary key,
    created_at timestamp with time zone default now() not null,
    message text,
    level text,
    extra jsonb,
    project_id uuid not null,
    run_id uuid
);

create table org (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default now() not null,
    name text not null,
    plan org_plan not null,
    play_allowance integer default 3 not null,
    stripe_customer text,
    stripe_subscription text,
    limited boolean default false not null,
    plan_period text default 'monthly'::text not null,
    canceled boolean default false not null
);


create table project (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default now() not null,
    name text not null,
    org_id uuid not null
);
create index on project(org_id);


create table run (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default now() not null,
    ended_at timestamp with time zone,
    duration interval generated always as (ended_at - created_at) stored,
    tags text[],
    project_id uuid not null,
    status text,
    name text,
    error jsonb,
    input jsonb,
    output jsonb,
    params jsonb,
    type text not null,
    parent_run_id uuid,
    prompt_tokens integer,
    completion_tokens integer,
    cost float,
    external_user_id bigint,
    feedback jsonb,
    is_public boolean default false not null,
    sibling_run_id uuid,
    template_version_id integer,
    input_text text generated always as ((input)::text) stored,
    output_text text generated always as ((output)::text) stored,
    error_text text generated always as ((error)::text) stored,
    runtime text
);
create index on run (type, parent_run_id);
create index on run (type);
create index on run (duration);
create index on run using gin (lower(name) gin_trgm_ops);
create index on run using gin (lower(output_text) gin_trgm_ops);
create index on run using gin (lower(input_text) gin_trgm_ops);
create index on run (ended_at, created_at);
create index on run (created_at desc);
create index on run (created_at);
create index on run (created_at, project_id);
create index on run (project_id, external_user_id);
create index on run (project_id, type);
create index on run (project_id, type, created_at desc);
create index on run (project_id);
create index on run (external_user_id);
create index on run using gin (tags);
create index on run (parent_run_id);
create index on run (type, external_user_id);
create index on run (name);
create index on run using gin (feedback);


create table template (
    id serial primary key, 
    created_at timestamp with time zone default now(),
    owner_id uuid,
    name text,
    "group" text,
    slug text,
    project_id uuid not null,
    mode text
);


create table template_version (
    id serial primary key,
    created_at timestamp with time zone default now() not null,
    extra jsonb,
    content jsonb,
    template_id integer not null,
    version integer,
    test_values jsonb,
    is_draft boolean
);


create table radar (
    "id" uuid default uuid_generate_v4 (),
    "description" text,
    "project_id" uuid,
    "owner_id" uuid,
    "view" jsonb,
    "checks" jsonb,
    "alerts" jsonb,
    "negative" boolean,
    primary key ("id")
);

create table radar_result (
    "id" uuid default uuid_generate_v4 (),
    "radar_id" uuid not null,
    "run_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "results" jsonb[],
    "passed" boolean,
    "details" jsonb,
    primary key ("id")
);

----------------------
--- MATERIALIZED VIEWS
----------------------
create materialized view tag_cache as  
select 
    run.project_id,
    unnest(run.tags) as tag,
    now() as refreshed_at
from 
    run
where 
    run.type = 'llm'::text
group by 
    run.project_id, 
    (unnest(run.tags));

create unique index on tag_cache (project_id, tag);
create index on tag_cache(project_id);


create materialized view model_name_cache as  
select 
    run.project_id,
    run.name,
    now() as refreshed_at
from 
    run
where 
    run.type = 'llm'::text 
    and run.name is not null
group by 
    run.project_id, 
    run.name;

create unique index on  model_name_cache (project_id, name);
create index on model_name_cache(project_id);


----------------
--- FOREIGN KEYS 
----------------
alter table account add foreign key (org_id) references org(id) on delete cascade;

alter table api_key add foreign key (project_id) references project(id) on delete cascade;

alter table external_user add foreign key (project_id) references project(id) on delete cascade;

alter table log add foreign key (project_id) references project(id);
alter table log add foreign key (run_id) references run(id) on delete cascade on update cascade;

alter table project add foreign key (org_id) references org(id) on delete cascade;

alter table run add foreign key (project_id) references project(id) on delete cascade;
alter table run add foreign key (parent_run_id) references run(id) on delete set null on update cascade;
alter table run add foreign key (external_user_id) references external_user(id) on delete set null on update cascade;
alter table run add foreign key (sibling_run_id) references run(id) on delete set null on update cascade;

alter table template add foreign key (project_id) references project(id) on delete cascade;
alter table template add foreign key (owner_id) references account(id) on delete set null;

alter table template_version add foreign key (template_id) references template(id) on delete cascade;

alter table radar add foreign key (project_id) references project(id) on delete cascade;
alter table radar add foreign key (owner_id) references account(id) on delete set null;

alter table radar_result add foreign key (radar_id) references radar(id) on delete cascade;
alter table radar_result add foreign key (run_id) references run(id) on delete cascade on update cascade;


update api_key
set api_key = project_id
where type = 'public';

create table checklist (
    id uuid default uuid_generate_v4() primary key,
    slug text not null,
    data jsonb not null,
    type text not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    owner_id uuid not null,
    project_id uuid not null,
    constraint fk_checklist_owner_id foreign key (owner_id) references account(id) on delete set null,
    constraint fk_checklist_project_id foreign key (project_id) references project(id) on delete cascade
);

create table dataset (
    id uuid not null default uuid_generate_v4() primary key,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    project_id uuid not null,
    owner_id uuid not null,
    slug text not null,
    format VARCHAR default 'chat' NOT NULL,
    foreign key (project_id) references project(id) on delete cascade,
    foreign key (owner_id) references account(id)
);
create index on dataset (project_id, slug);

create table evaluation (
    id uuid not null default uuid_generate_v4() primary key,
    created_at timestamptz not null default now(),
    name text not null,
    project_id uuid not null,
    owner_id uuid not null,
    dataset_id uuid not null,
    models text[] not null,
    checks jsonb not null,
    foreign key (project_id) references project(id) on delete cascade,
    foreign key (owner_id) references account(id),
    foreign key (dataset_id) references dataset(id)
);
create index on evaluation(project_id);


create table evaluation_prompt (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now() not null,
  evaluation_id uuid not null,
  messages jsonb not null,
  extra jsonb,
  constraint fk_evaluation_prompt_evaluation_id foreign key (evaluation_id) references evaluation(id) on delete cascade
);
create index on evaluation_prompt (evaluation_id);

create table evaluation_prompt_variation (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now() not null,
  variables jsonb not null,
  context text,
  ideal_output text,
  prompt_id uuid not null,
  constraint fk_evaluation_prompt_variation_prompt_id foreign key (prompt_id) references evaluation_prompt(id) on delete cascade
);
create index on evaluation_prompt_variation (prompt_id);

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
  constraint fk_evaluation_result_prompt_id foreign key (prompt_id) references evaluation_prompt(id) on delete cascade,
  constraint fk_evaluation_result_variation_id foreign key (variation_id) references evaluation_prompt_variation(id) on delete cascade
);
create index on evaluation_result(evaluation_id, prompt_id, variation_id, model);


create table provider (
    id uuid default uuid_generate_v4() primary key,
    model text not null,
    params jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    owner_id uuid not null,
    project_id uuid not null,
    constraint fk_provider_owner_id foreign key (owner_id) references account(id) on delete set null,
    constraint fk_provider_project_id foreign key (project_id) references project(id) on delete cascade
);





create table dataset_prompt (
    id uuid not null default uuid_generate_v4() primary key,
    created_at timestamptz not null default now(),
    dataset_id uuid not null,
    messages jsonb not null,
    foreign key (dataset_id) references dataset(id) on delete cascade
);
create index on  dataset_prompt(dataset_id);


create table dataset_prompt_variation (
    id uuid not null default uuid_generate_v4() primary key,
    created_at timestamptz not null default now(),
    variables jsonb not null,
    context text,
    ideal_output text,
    prompt_id uuid not null,
    foreign key (prompt_id) references dataset_prompt (id) on delete cascade
);
create index on dataset_prompt_variation(prompt_id);





alter table evaluation_result
drop constraint "fk_evaluation_result_variation_id",
add constraint "fk_evaluation_result_variation_id" foreign key (variation_id) references dataset_prompt_variation(id) on delete cascade;
