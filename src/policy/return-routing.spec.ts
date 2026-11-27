import { routeAfterResubmission as r } from './policy';
describe('return routing (hybrid)', () => {
  it('resumes at the returning stage when only flagged answers changed', () => {
    expect(r(2, ['q1', 'q2'], ['q1'])).toEqual({ restart: false, stage: 2 });
  });
  it('restarts at stage 1 when any unflagged answer changed', () => {
    expect(r(2, ['q1'], ['q1', 'q9'])).toEqual({ restart: true, stage: 1 });
  });
  it('no flags and a change restarts; no flags and no change resumes', () => {
    expect(r(3, [], ['q4'])).toEqual({ restart: true, stage: 1 });
    expect(r(3, [], [])).toEqual({ restart: false, stage: 3 });
  });
});
