/** Product defaults awaiting Mohamed's confirmation. One constant each; change here only. */
export const EVIDENCE_POLICY = {
  maxImageBytes: 10 * 1024 * 1024,
  maxFileBytes: 25 * 1024 * 1024,
  maxPerSubmissionBytes: 100 * 1024 * 1024,
  maxFilesPerSubmission: undefined as number | undefined, // UNDECIDED
  signedLinkTtlSeconds: 10 * 60,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  fileTypes: ['application/pdf'],
  allowVideo: false,
  downloadRequiresScanStatus: 'clean',
} as const;
/** Mohamed (27729263, confirmed 27764778): hybrid. Resume at the returning stage only if every changed answer was flagged; otherwise restart at stage 1. */
export const RETURN_ROUTING = 'hybrid_flagged_only_resumes' as const;
export const UNCHANGED_REPLY_MIN_CHARS = 10;
export type Answers = Record<string, unknown>;

function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v === undefined ? null : v);
}
/** Changed question ids, computed from the STORED answers (server side) vs the resubmitted answers. Never trust a client-sent change list. */
export function changedQuestionIds(stored: Answers, resubmitted: Answers): string[] {
  const ids = new Set([...Object.keys(stored), ...Object.keys(resubmitted)]);
  return [...ids].filter((q) => canon(stored[q]) !== canon(resubmitted[q])).sort();
}
export type ResubmitDecision =
  | { ok: true; restart: boolean; stage: number; changed: string[]; resubmittedWithoutChange: boolean }
  | { ok: false; reason: 'reply_required_when_unchanged' };

export function routeAfterResubmission(
  returningStage: number, flaggedQuestionIds: string[], stored: Answers, resubmitted: Answers, reply?: string,
): ResubmitDecision {
  const changed = changedQuestionIds(stored, resubmitted);
  if (changed.length === 0) {
    if ((reply ?? '').trim().length < UNCHANGED_REPLY_MIN_CHARS) return { ok: false, reason: 'reply_required_when_unchanged' };
    return { ok: true, restart: false, stage: returningStage, changed, resubmittedWithoutChange: true };
  }
  const flagged = new Set(flaggedQuestionIds);
  const allFlagged = changed.every((q) => flagged.has(q));
  return allFlagged
    ? { ok: true, restart: false, stage: returningStage, changed, resubmittedWithoutChange: false }
    : { ok: true, restart: true, stage: 1, changed, resubmittedWithoutChange: false };
}
/** Flagged default: answers to hidden conditional questions are kept on device, excluded from submission, validation, scoring. */
export const HIDDEN_ANSWER_RULE: 'exclude_from_submission' | 'clear' | 'retain' = 'exclude_from_submission';
