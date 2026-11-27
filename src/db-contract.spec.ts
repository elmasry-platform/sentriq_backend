import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { DB_CONTRACT, pendingDbObjects } from './db-contract';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith('.ts') && !p.endsWith('.spec.ts') ? [p] : [];
  });
}
describe('DB contract', () => {
  const code = sources(join(__dirname)).map((p) => readFileSync(p, 'utf8')).join('\n');
  const called = new Set<string>();
  for (const m of code.matchAll(/\.rpc(?:<[^>]*>)?\(\s*'([a-z_0-9]+)'/g)) called.add(m[1]);
  for (const m of code.matchAll(/\.select(?:<[^>]*>)?\(\s*'([a-z_0-9]+)'/g)) called.add(m[1]);
  it('every DB object the code calls is listed in the manifest', () => {
    const missing = [...called].filter((n) => !(n in DB_CONTRACT));
    expect(missing).toEqual([]);
  });
  it('review decide depends on migration 062 (p_flagged_question_ids), so the backend must not deploy before it', () => {
    expect(DB_CONTRACT['inspection_review_decide']).toMatchObject({ migration: '062 (M04)', status: 'pending' });
    expect(code).toContain('p_flagged_question_ids');
    expect(pendingDbObjects().length).toBeGreaterThan(0);
  });
});
