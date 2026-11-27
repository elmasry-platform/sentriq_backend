import { changedQuestionIds, routeAfterResubmission as r } from './policy';
const reply = 'nothing needed to change here';
describe('return routing (hybrid, server-computed changes)', () => {
  it('resumes at the returning stage when only flagged answers changed', () => {
    expect(r(2, ['q1', 'q2'], { q1: 'a', q2: 'b' }, { q1: 'x', q2: 'b' })).toMatchObject({ ok: true, restart: false, stage: 2, changed: ['q1'] });
  });
  it('restarts at stage 1 when any unflagged answer changed', () => {
    expect(r(2, ['q1'], { q1: 'a', q9: 'b' }, { q1: 'x', q9: 'c' })).toMatchObject({ ok: true, restart: true, stage: 1, changed: ['q1', 'q9'] });
  });
  it('no flags and a change restarts', () => {
    expect(r(3, [], { q4: 1 }, { q4: 2 })).toMatchObject({ restart: true, stage: 1 });
  });
  it('change and revert counts as no change (compared to stored answers)', () => {
    expect(changedQuestionIds({ q1: 'a' }, { q1: 'a' })).toEqual([]);
    expect(r(2, ['q1'], { q1: 'a' }, { q1: 'a' }, reply)).toMatchObject({ ok: true, restart: false, resubmittedWithoutChange: true });
  });
  it('empty flag list with no change needs the written reply, then resumes with the history flag', () => {
    expect(r(2, [], { q1: 'a' }, { q1: 'a' })).toEqual({ ok: false, reason: 'reply_required_when_unchanged' });
    expect(r(2, [], { q1: 'a' }, { q1: 'a' }, 'too short')).toEqual({ ok: false, reason: 'reply_required_when_unchanged' });
    expect(r(2, [], { q1: 'a' }, { q1: 'a' }, reply)).toMatchObject({ ok: true, stage: 2, resubmittedWithoutChange: true });
  });
  it('compares nested values and key order independently', () => {
    expect(changedQuestionIds({ q: { a: 1, b: [1, 2] } }, { q: { b: [1, 2], a: 1 } })).toEqual([]);
    expect(changedQuestionIds({ q: [1, 2] }, { q: [2, 1] })).toEqual(['q']);
  });
  it('an added or removed answer counts as a change', () => {
    expect(changedQuestionIds({ a: 1 }, { a: 1, b: 2 })).toEqual(['b']);
    expect(changedQuestionIds({ a: 1, b: 2 }, { a: 1 })).toEqual(['b']);
  });
});
