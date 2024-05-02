create index idx_run_feedback_thumb on run using gin ((feedback -> 'thumb') jsonb_path_ops);
create index idx_run_feedback_thumbs on run using gin ((feedback -> 'thumbs') jsonb_path_ops);