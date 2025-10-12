alter table api_key add column org_id uuid;

update api_key
set org_id = project.org_id
from project
where api_key.project_id = project.id;

alter table api_key alter column org_id set not null;
alter table api_key alter column project_id drop not null;

alter table api_key
  add constraint api_key_scope_check
  check (
    (type = 'org_private' and project_id is null)
    or (type <> 'org_private' and project_id is not null)
  );

alter table api_key
  add constraint fk_api_key_org_id
  foreign key (org_id) references org(id) on delete cascade;

create index api_key_org_id_idx on api_key(org_id);

create unique index api_key_org_private_unique
  on api_key(org_id)
  where type = 'org_private';

insert into api_key (type, org_id)
select 'org_private', org.id
from org
where not exists (
  select 1 from api_key where api_key.org_id = org.id and api_key.type = 'org_private'
);

update api_key
set api_key = uuid_generate_v4()
where type = 'org_private' and api_key is null;

