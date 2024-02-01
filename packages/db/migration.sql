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

CREATE TABLE "public"."radar" (
    "id" uuid DEFAULT uuid_generate_v4(),
    "description" text,
    "project_id" uuid,
    "owner_id" uuid,
    "view" jsonb,
    "checks" jsonb,
    "alerts" jsonb,
    "negative" bool,
    CONSTRAINT "radar_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."account"("id") ON DELETE SET NULL,
    CONSTRAINT "radar_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE CASCADE,
    PRIMARY KEY ("id")
);


CREATE TABLE "public"."radar_result" (
    "id" uuid DEFAULT uuid_generate_v4(),
    "radar_id" uuid,
    "run_id" uuid,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "results" _jsonb,
    "passed" bool,
    "details" jsonb,
    CONSTRAINT "radar_result_radar_id_fkey" FOREIGN KEY ("radar_id") REFERENCES "public"."radar"("id") ON DELETE CASCADE,
    CONSTRAINT "radar_result_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("id")
);