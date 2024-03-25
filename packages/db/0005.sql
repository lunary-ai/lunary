alter table org add column if not exists radar_allowance integer default 500;
alter table org add column if not exists eval_allowance integer default 500;

-- Update to runs to save metadatas
alter table run add column if not exists metadata jsonb;
create index if not exists run_metadata_idx on run using gin (metadata);

-- Migration of radars with PII

create index if not exists radar_result_radar_id_run_id_idx on radar_result (radar_id, run_id);

alter table radar add column if not exists created_at timestamp with time zone default now() not null;
alter table radar add column if not exists updated_at timestamp with time zone default now() not null;

alter table radar alter column project_id set not null;
alter table radar alter column checks set not null;

update radar
set checks = '[
    "AND",
    {
        "id": "pii",
        "params": {
            "field": "input",
            "type": "contains",
            "entities": ["person", "location", "email", "cc", "phone", "ssn"]
        }
    }
]'::jsonb
where description like '%rompt contains PII%';

update radar
set checks = '[
    "AND",
    {
        "id": "pii",
        "params": {
            "field": "output",
            "type": "contains",
            "entities": ["person", "location", "email", "cc", "phone", "ssn"]
        }
    }
]'::jsonb
where description like '%nswer contains PII%';
