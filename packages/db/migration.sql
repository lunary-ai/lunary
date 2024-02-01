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


-- convert radar tables to use uuids (no data yet)

drop table radar;
drop table radar_result;

create table "public"."radar" (
	"id" uuid default uuid_generate_v4 (),
	"description" text,
	"project_id" uuid,
	"owner_id" uuid,
	"view" jsonb,
	"checks" jsonb,
	"alerts" jsonb,
	"negative" bool,
	constraint "radar_owner_id_fkey" foreign key ("owner_id") references "public"."account" ("id") on delete set null,
	constraint "radar_project_id_fkey" foreign key ("project_id") references "public"."project" ("id") on delete cascade,
	primary key ("id")
);


create table "public"."radar_result" (
	"id" uuid default uuid_generate_v4 (),
	"radar_id" uuid,
	"run_id" uuid,
	"created_at" timestamptz not null default now(),
	"results" _jsonb,
	"passed" bool,
	"details" jsonb,
	constraint "radar_result_radar_id_fkey" foreign key ("radar_id") references "public"."radar" ("id") on delete cascade,
	constraint "radar_result_run_id_fkey" foreign key ("run_id") references "public"."run" ("id") on delete cascade on update cascade,
	primary key ("id")
);