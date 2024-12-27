alter table evaluation_result_v2
    drop constraint evaluation_result_run_id_fkey,
    add constraint evaluation_result_run_id_fkey foreign key (run_id) references public.run(id) on delete cascade on update cascade;