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
/** Mohamed (27729263): hybrid. Resume at the returning stage only if every changed answer was flagged; otherwise restart at stage 1. */
export const RETURN_ROUTING = 'hybrid_flagged_only_resumes' as const;
export function routeAfterResubmission(returningStage: number, flaggedQuestionIds: string[], changedQuestionIds: string[]): { restart: boolean; stage: number } {
  const flagged = new Set(flaggedQuestionIds);
  const allFlagged = changedQuestionIds.every((q) => flagged.has(q));
  // No change at all: nothing contradicts the flagged-only rule, resume at the returning stage.
  return allFlagged ? { restart: false, stage: returningStage } : { restart: true, stage: 1 };
}
/** Flagged default: answers to hidden conditional questions are kept on device, excluded from submission, validation, scoring. */
export const HIDDEN_ANSWER_RULE: 'exclude_from_submission' | 'clear' | 'retain' = 'exclude_from_submission';
