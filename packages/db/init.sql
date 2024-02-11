create extension if not exists pg_trgm;
create extension if not exists pgroonga;
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
create index on run using pgroonga (input_text, created_at desc);
create index on run using pgroonga (input);
create index on run (ended_at, created_at);
create index on run (created_at desc);
create index on run (created_at);
create index on run (created_at, project_id);
create index on run (project_id, external_user_id);
create index on run using pgroonga (project_id, type, output_text);
create index on run using pgroonga (project_id, type, input_text);
create index on run (project_id, type);
create index on run using pgroonga (project_id, type, error_text);
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
    id serial primary key,
    "description" text,
    project_id uuid,
    owner_id uuid,
    view jsonb,
    checks jsonb
);

create table radar_result (
    id serial primary key,
    radar_id integer,
    run_id uuid,
    created_at timestamp with time zone default now() not null,
    results jsonb[],
    passed boolean,
    details jsonb
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
alter table account add foreign key (org_id) references org(id);

alter table api_key add foreign key (project_id) references project(id);

-- alter table dataset add foreign key (project_id) references project(id) on delete cascade;

alter table external_user add foreign key (project_id) references project(id);

alter table log add foreign key (project_id) references project(id);
alter table log add foreign key (run_id) references run(id) on delete cascade on update cascade;

alter table project add foreign key (org_id) references org(id);

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