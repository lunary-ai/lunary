alter table _job
  add column if not exists payload jsonb;
