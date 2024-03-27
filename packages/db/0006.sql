alter table account add column if not exists single_use_token text;

create table if not exists account_project (
    account_id uuid references account(id) on delete cascade,
    project_id uuid references project(id) on delete cascade,
    primary key (account_id, project_id)
);

insert into account_project (account_id, project_id)
select a.id as account_id, p.id as project_id
from account a
join project p on a.org_id = p.org_id
on conflict (account_id, project_id) do nothing;