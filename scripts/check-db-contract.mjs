// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_USER_JWT=<any signed-in user session token> node scripts/check-db-contract.mjs
// Reads the PostgREST OpenAPI of the `api` schema (the anon role cannot read it: a signed-in user token is needed; no user data is read) and checks every object in src/db-contract.ts exists.
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/db-contract.ts', import.meta.url), 'utf8');
const items = [...src.matchAll(/^\s{2}([a-z_0-9]+): \{ kind: '(rpc|view)', migration: '([^']+)', status: '(on_test|pending)' \}/gm)]
  .map((m) => ({ name: m[1], kind: m[2], migration: m[3], status: m[4] }));
const url = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, ''); const key = process.env.SUPABASE_ANON_KEY ?? '';
if (!url || !key) { console.error('SUPABASE_URL and SUPABASE_ANON_KEY required'); process.exit(2); }
const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, authorization: `Bearer ${process.env.SUPABASE_USER_JWT ?? key}`, 'Accept-Profile': 'api' } });
if (!res.ok) { console.error('openapi fetch failed', res.status); process.exit(2); }
const paths = Object.keys((await res.json()).paths ?? {});
let bad = 0;
for (const it of items) {
  const present = paths.includes(it.kind === 'rpc' ? `/rpc/${it.name}` : `/${it.name}`);
  const ok = present === (it.status === 'on_test');
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'MISMATCH'} ${it.kind} ${it.name} migration=${it.migration} manifest=${it.status} actual=${present ? 'present' : 'absent'}`);
}
console.log(bad ? `${bad} mismatch(es)` : 'manifest matches the database');
process.exit(bad ? 1 : 0);
