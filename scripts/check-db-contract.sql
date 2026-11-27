-- Read-only. Run as a DB admin on the target DB. Lists each manifest object as present/absent (compare with src/db-contract.ts).
with want(name, kind) as (values
 ('v_memberships','view'),('list_my_entitlements','rpc'),('authorize','rpc'),
 ('form_validate','rpc'),('form_create_draft','rpc'),('form_save_draft','rpc'),('form_submit_for_approval','rpc'),('form_return_to_draft','rpc'),
 ('form_approve_publish','rpc'),('form_set_status','rpc'),('form_clone','rpc'),('form_compare_versions','rpc'),('form_version_get','rpc'),
 ('v_forms','view'),('v_form_versions','view'),('inspection_sync','rpc'),('inspection_review_decide','rpc'),('inspection_resubmit','rpc'),('inspection_reopen','rpc'),
 ('evidence_create_intent','rpc'),('evidence_confirm','rpc'),('evidence_get_download','rpc'),('v_schedules','view'),('v_occurrences','view'),
 ('schedule_create','rpc'),('schedule_cancel','rpc'),('schedule_reassign','rpc'))
select w.name, w.kind,
  case w.kind when 'rpc' then exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname=w.name)
              else exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='api' and c.relname=w.name and c.relkind='v') end as present
from want w order by present desc, w.name;
