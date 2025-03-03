create type provider_name as enum (
    'openai',
    'azure_openai',
    'amazon_bedrock',
    'google_ai_studio',
    'google_vertex',
    'anthropic',
    'x_ai'
);


create table provider_config (
	id uuid default uuid_generate_v4() primary key,
	project_id uuid not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	provider_name provider_name not null,
	api_key text not null,
	extra_config jsonb,
	constraint fk_project_id foreign key (project_id) references project (id)
);

create table provider_config_model (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    provider_config_id uuid not null,
    name varchar(100) not null,
    display_name varchar(100),
    constraint fk_provider_config_id foreign key (provider_config_id) references provider_config(id)
);
create unique index on provider_config_model(provider_config_id, name)
