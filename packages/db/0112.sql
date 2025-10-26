create table intent_cluster_version (
    id uuid primary key default uuid_generate_v4(),
    created_at timestamptz not null default now(),
    evaluator_id uuid not null references evaluator(id) on delete cascade,
    model text not null default 'gpt-5-mini',
    max_intents integer not null,
    prompt text,
    raw_response jsonb
);

create table intent_cluster (
    id uuid primary key default uuid_generate_v4(),
    version_id uuid not null references intent_cluster_version(id) on delete cascade,
    label text not null,
    description text,
    occurrences integer not null default 0,
    sort_order integer not null
);

create table intent_cluster_alias (
    version_id uuid not null references intent_cluster_version(id) on delete cascade,
    alias text not null,
    cluster_id uuid not null references intent_cluster(id) on delete cascade,
    occurrences integer not null default 0,
    primary key (version_id, alias)
);
