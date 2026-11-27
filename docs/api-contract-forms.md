# Forms and inspections API contract (staging, draft)

All routes: `Authorization: Bearer <user JWT>`. The backend forwards the JWT; PostgreSQL RLS and api.* guards decide. No service key.

## Templates (M01/M02)
| Route | DB call | Success |
|---|---|---|
| GET /v1/forms?tenantId | api.v_forms | 200 list |
| GET /v1/forms/:id | api.v_forms | 200 |
| POST /v1/forms/validate {tenantId,...} (needs hse.forms.read) | form_validate | 200 error list (empty = valid) |
| POST /v1/forms | form_create_draft | 201 {id} |
| PUT /v1/forms/:id | form_save_draft (expectedRevision) | 200 |
| POST /v1/forms/:id/submit | form_submit_for_approval | 204 |
| POST /v1/forms/:id/return | form_return_to_draft (expectedRevision, reason) | 204 |
| POST /v1/forms/:id/approve | form_approve_publish | 200 {version} |
| POST /v1/forms/:id/status | form_set_status (expectedRevision) | 204 |
| POST /v1/forms/:id/clone | form_clone | 201 {id} |
| GET /v1/forms/:id/versions | api.v_form_versions (no snapshot body) | 200 list |
| GET /v1/forms/:id/versions/:n | form_version_get | 200 snapshot |
| GET /v1/forms/:id/compare?from&to | form_compare_versions | 200 |

## Expected denied / error responses (not interchangeable)
| Situation | Response |
|---|---|
| No/invalid token | 401 bearer_token_required |
| Row hidden by RLS (other company/site) on GET by id | 404 form_not_found |
| List where nothing is visible | 200 [] |
| Mutation without permission (RLS 42501) | 403 forbidden |
| Self-approval (approver = submitter or last editor) | 403 form_approver_must_differ_from_author |
| Publish without approval | 403 form_publish_requires_approval |
| Visible but not manageable (42501 form_not_permitted) | 403 form_not_permitted |
| Not visible id-based write (22023 form_not_found) | 404 form_not_found |
| Unsupported question type at publish / definition_too_large / too_many_questions | 422 with that code |
| Stale revision | 409 form_revision_conflict |
| Edit while in approval | 423 form_locked_in_approval |
| Illegal status move | 409 form_status_transition_not_allowed |
| Validation errors | 422 form_validation_failed |
| Missing change note / return reason | 422 |
| Anything unexpected | 502 database_error (no internals) |

## Offline sync (M03): POST /v1/inspections/sync
Body `{tenantId, ops[1..100]}`; op = `{clientOpId, type: start|answers|attach_evidence|submit, inspectionId, payload, clientMeta?}`; ids are client-generated UUIDs, stable across retries.
Response 200 `{results:[{clientOpId, status: applied|duplicate|rejected, reason?, details?}]}`, one per op, same order.
- Same clientOpId + same payload: `duplicate` with the stored outcome. Same id + different payload: `rejected payload_mismatch`, nothing overwritten.
- Reasons: payload_mismatch, assignment_revoked, inspection_already_submitted, template_version_retired_or_missing, site_access_lost, validation_failed, evidence_missing, server_conflict. A missing result is returned as rejected `server_no_result`, never as applied.
- Inspection is pinned to its form_version_id; template edits never affect it.
- Hidden conditional answers (default, flagged): kept on device, excluded from submission, validation and scoring.
- Queued ops are not "Submitted" until the response confirms `applied` or `duplicate`.
- DB side (api.inspection_sync, hse.sync_operations) is a Data Engineer deliverable; backend is pass-through.

### Payload comparison (Reviewer rule)
Same clientOpId/inspectionId with a payload is compared by SHA-256 of the CANONICAL JSON of the answers (sorted keys, no whitespace, UTF-8), computed in the database (digest(...,'sha256')), never a weak or client-supplied hash. Mismatch = rejected `payload_mismatch` (client equivalent: CLIENT_ID_PAYLOAD_MISMATCH), the stored record is untouched.

## Evidence (M05) - DB pieces pending (DE 062): evidence_create_intent, evidence_confirm, evidence_get_download
- POST /v1/evidence/intents: per-file checks in API (image 10 MB, pdf 25 MB, no video, jpeg/png/webp/pdf only) then DB (aggregate 100 MB, authz, client-id idempotency). Same clientEvidenceId + same sha256 = same row; different sha256 = 409 payload_mismatch.
- POST /v1/evidence/:id/confirm {sha256}: marks uploaded; scan_status starts pending/quarantined.
- GET /v1/evidence/:id/download: 423 evidence_not_available until scan_status=clean; then a 10-minute signed link signed with the user's own token (storage RLS applies). Invisible row: 404; forbidden: 403.
- Undecided: max files per submission, scanner vendor.

## Schedules and occurrences (M07) - DB pieces pending (DE 064): v_schedules, v_occurrences, schedule_create, schedule_cancel, schedule_reassign
- POST /v1/schedules (published template only, pinned to the version at creation; timezone = IANA zone, due date computed in it), GET /v1/schedules, POST /v1/schedules/:id/cancel {reason}, POST /v1/schedules/:id/reassign {assigneeMembershipId, reason}, GET /v1/occurrences?tenantId&status.
- Occurrence uniqueness key schedule_id + occurrence_date (DB), so scheduler retries create no duplicates. Overdue is derived in the DB. Retired template: 422 template_retired for new schedules; existing occurrences stay pinned. Scheduler trigger (Vercel cron vs pg_cron) is undecided (Mohamed).

## Return routing (Mohamed 27729263, hybrid)
A returned submission resumes at the returning stage only if every changed answer is one of the flagged questions; if any unflagged answer changed it restarts at stage 1. Return reason is always mandatory; flags optional. Each resubmission is a new history event that records which answers changed. The DB (M04, DE) enforces and stores this; src/policy/policy.ts holds the reference function and tests the API vectors.
