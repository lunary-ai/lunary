update
	api_key
set
	api_key = project_id
where
	type = 'public'; 

alter table api_key 
drop constraint "api_key_project_id_fkey", 
add constraint "api_key_project_id_fkey" foreign key (project_id) references project (id) on delete cascade;

alter table external_user 
drop constraint "external_user_project_id_fkey", 
add constraint "external_user_project_id_fkey" foreign key (project_id) references project (id) on delete cascade;

alter table account 
drop constraint "account_org_id_fkey", 
add constraint "account_org_id_fkey" foreign key (org_id) references org (id) on delete cascade;

alter table project 
drop constraint "project_org_id_fkey", 
add constraint "project_org_id_fkey" foreign key (org_id) references org (id) on delete cascade;