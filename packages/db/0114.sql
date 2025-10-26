create table dataset_v2_version (
    id uuid default uuid_generate_v4() primary key,
    dataset_id uuid not null references dataset_v2(id) on delete cascade,
    version_number integer not null,
    created_at timestamptz not null default statement_timestamp(),
    created_by uuid references account(id) on delete set null,
    restored_from_version_id uuid references dataset_v2_version(id) on delete set null,
    name text,
    description text,
    unique (dataset_id, version_number)
);

create index dataset_v2_version_dataset_id_created_at_idx
    on dataset_v2_version (dataset_id, created_at desc);

create table dataset_v2_version_item (
    id uuid default uuid_generate_v4() primary key,
    version_id uuid not null references dataset_v2_version(id) on delete cascade,
    dataset_id uuid not null,
    item_index integer not null,
    input text not null default '',
    ground_truth text,
    source_item_id uuid,
    source_created_at timestamptz,
    source_updated_at timestamptz
);

create index dataset_v2_version_item_version_id_idx
    on dataset_v2_version_item (version_id, item_index asc);

create index dataset_v2_version_item_dataset_version_idx
    on dataset_v2_version_item (dataset_id, version_id);

alter table dataset_v2
  add column current_version_id uuid references dataset_v2_version(id);

alter table dataset_v2
  add column current_version_number integer not null default 0;

insert into dataset_v2_version (dataset_id, version_number, created_by, name, description)
select d.id, 1, d.owner_id, d.name, d.description
from dataset_v2 d;

insert into dataset_v2_version_item (version_id, dataset_id, item_index, input, ground_truth, source_item_id, source_created_at, source_updated_at)
select v.id,
       i.dataset_id,
       row_number() over (partition by i.dataset_id order by i.created_at asc, i.id asc) as item_index,
       i.input,
       i.ground_truth,
       i.id,
       i.created_at,
       i.updated_at
from dataset_v2_item i
join dataset_v2_version v on v.dataset_id = i.dataset_id and v.version_number = 1;

update dataset_v2 d
set current_version_id = v.id,
    current_version_number = v.version_number
from dataset_v2_version v
where v.dataset_id = d.id
  and v.version_number = 1;
