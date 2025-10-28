alter table dataset_v2_item
  add column output text;

alter table dataset_v2_version_item
  add column output text;

update dataset_v2_version_item v
set output = i.output
from dataset_v2_item i
where i.id = v.source_item_id;
