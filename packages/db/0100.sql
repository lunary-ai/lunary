create table playground_endpoint (
    id            uuid primary key default gen_random_uuid(),
    created_at    timestamp with time zone default now(),
    updated_at    timestamp with time zone default now(),
    project_id    uuid not null,
    name          text not null,
    url           text not null,
    auth          jsonb,
    headers       jsonb not null default '{}',
    default_payload jsonb not null default '{}',
    foreign key (project_id) references project (id) on delete cascade
);

create index on playground_endpoint(project_id);
create index on playground_endpoint(created_at);

comment on column playground_endpoint.auth is 'Authentication configuration: NULL for no auth | {type: "bearer", token: string} | {type: "api_key", header: string, key: string} | {type: "basic", username: string, password: string}';
comment on column playground_endpoint.headers is 'Object with header names as keys and values as strings, e.g. {"Content-Type": "application/json", "X-Custom": "value"}';
comment on column playground_endpoint.default_payload is 'Default JSON payload to merge with prompt data';