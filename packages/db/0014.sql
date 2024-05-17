begin;
lock radar_result;
delete from radar_result where run_id is null;
alter table radar_result alter column run_id set not null;
commit;
