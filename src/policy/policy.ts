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
/** Flagged default: a returned inspection resumes at the stage that returned it. */
export const RETURN_ROUTING: 'resume_at_returning_stage' | 'restart' = 'resume_at_returning_stage';
/** Flagged default: answers to hidden conditional questions are kept on device, excluded from submission, validation, scoring. */
export const HIDDEN_ANSWER_RULE: 'exclude_from_submission' | 'clear' | 'retain' = 'exclude_from_submission';
