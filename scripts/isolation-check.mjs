// Criterion 5 isolation check (cross-company), direct PostgREST with each user's OWN session. No service key.
// Env: SUPABASE_URL SUPABASE_ANON_KEY TOKEN_A TOKEN_B TENANT_A FORM_A [VERSION_A=1]
//   TOKEN_A: session of a user of company A who can read FORM_A (positive control). TOKEN_B: session of a user of company B only.
// Every mutation below is expected to be REFUSED, so a correct system changes no data. A "FAIL" on a mutation means it was allowed.
const e = process.env; const need = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'TOKEN_A', 'TOKEN_B', 'TENANT_A', 'FORM_A'];
for (const n of need) if (!e[n]) { console.error(`missing ${n}`); process.exit(2); }
const base = e.SUPABASE_URL.replace(/\/+$/, ''); const ver = Number(e.VERSION_A ?? 1);
const hdr = (tok, profile = 'api') => ({ apikey: e.SUPABASE_ANON_KEY, authorization: `Bearer ${tok}`, 'Accept-Profile': profile, 'Content-Profile': profile, 'content-type': 'application/json' });
const get = async (path, tok, profile) => { const r = await fetch(`${base}/rest/v1/${path}`, { headers: hdr(tok, profile) }); return { status: r.status, body: await r.json().catch(() => null) }; };
const rpc = async (fn, args, tok) => { const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: 'POST', headers: hdr(tok), body: JSON.stringify(args) }); return { status: r.status, body: await r.json().catch(() => null) }; };
const U = '00000000-0000-4000-8000-000000000000';
const def = { sections: [], questions: [] };
let fails = 0;
const check = (id, name, ok, got) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name} | got ${JSON.stringify(got).slice(0, 160)}`); };
const empty = (r) => r.status === 200 && Array.isArray(r.body) && r.body.length === 0;
const refused = (r) => r.status >= 400;

const a = await get(`v_forms?id=eq.${e.FORM_A}&select=id`, e.TOKEN_A);
check('ISO-00', 'positive control: user A reads FORM_A', a.status === 200 && a.body?.length === 1, a);
check('ISO-01', 'B cannot read A form by id (empty, not an error)', empty(await get(`v_forms?id=eq.${e.FORM_A}&select=id`, e.TOKEN_B)), 'see above');
const l = await get(`v_forms?workspaceId=eq.${e.TENANT_A}&select=id`, e.TOKEN_B); check('ISO-02', 'B cannot list A tenant forms (empty)', empty(l), l);
const v = await get(`v_form_versions?templateId=eq.${e.FORM_A}&select=id`, e.TOKEN_B); check('ISO-03', 'B cannot list A form versions (empty)', empty(v), v);
let r = await rpc('form_version_get', { p_template_id: e.FORM_A, p_version: ver }, e.TOKEN_B); check('ISO-04', 'B form_version_get on A is refused', refused(r) && /form_not_found|form_version_not_found|permission/.test(JSON.stringify(r.body)), r);
r = await rpc('form_save_draft', { p_id: e.FORM_A, p_expected_revision: 1, p_title: { en: 'x', ar: 'x' }, p_category: 'c', p_definition: def, p_languages: ['en', 'ar'] }, e.TOKEN_B); check('ISO-05', 'B save on A form refused (form_not_found)', refused(r) && /form_not_found/.test(JSON.stringify(r.body)), r);
r = await rpc('form_approve_publish', { p_id: e.FORM_A, p_expected_revision: 1 }, e.TOKEN_B); check('ISO-06', 'B approve on A form refused', refused(r), r);
r = await rpc('form_set_status', { p_id: e.FORM_A, p_expected_revision: 1, p_status: 'archived', p_reason: 'isolation probe' }, e.TOKEN_B); check('ISO-07', 'B set_status on A form refused', refused(r), r);
r = await rpc('form_clone', { p_id: e.FORM_A, p_title: null }, e.TOKEN_B); check('ISO-08', 'B clone of A form refused', refused(r), r);
r = await rpc('form_create_draft', { p_tenant_id: e.TENANT_A, p_title: { en: 'x', ar: 'x' }, p_category: 'c', p_definition: def, p_languages: ['en', 'ar'] }, e.TOKEN_B); check('ISO-09', 'B create draft inside tenant A refused', refused(r), r);
r = await rpc('form_validate', { p_tenant_id: e.TENANT_A, p_title: { en: 'x', ar: 'x' }, p_languages: ['en', 'ar'], p_definition: def }, e.TOKEN_B); check('ISO-10', 'B validate in tenant A refused (needs hse.forms.read there)', refused(r), r);
r = await get('form_templates?select=id', e.TOKEN_B, 'hse'); check('ISO-11', 'direct hse schema is not exposed to B', refused(r) || empty(r), r);
r = await get(`v_forms?id=eq.${e.FORM_A}&select=id`, e.SUPABASE_ANON_KEY); check('ISO-12', 'anon (no session) cannot read forms', refused(r) || empty(r), r);
r = await rpc('form_clone', { p_id: U, p_title: null }, e.TOKEN_A); check('ISO-13', 'unknown id gives form_not_found (same as hidden id: no existence leak)', refused(r) && /form_not_found/.test(JSON.stringify(r.body)), r);
console.log(fails ? `${fails} FAIL` : 'all isolation checks PASS');
process.exit(fails ? 1 : 0);
