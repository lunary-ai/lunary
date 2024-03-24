alter table account add column if not exists single_use_token text;
create table if not exists account_project (
    account_id uuid references account(id) on delete cascade,
    project_id uuid references project(id) on delete cascade,
    primary key (account_id, project_id)
);

