alter table provider_config_model drop constraint fk_provider_config_id;
alter table provider_config_model add constraint fk_provider_config_id foreign key (provider_config_id) references provider_config (id) on delete cascade;
