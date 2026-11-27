import { EVIDENCE_POLICY as P } from './policy';

export type EvidenceReject = 'unsupported_type' | 'video_not_allowed' | 'file_too_large' | 'submission_too_large' | 'too_many_files' | 'not_scanned_clean';
export interface EvidenceMeta { mimeType: string; bytes: number }

export function checkEvidenceUpload(f: EvidenceMeta, existing: EvidenceMeta[]): EvidenceReject | null {
  if (f.mimeType.startsWith('video/') && !P.allowVideo) return 'video_not_allowed';
  const isImg = (P.imageTypes as readonly string[]).includes(f.mimeType);
  const isFile = (P.fileTypes as readonly string[]).includes(f.mimeType);
  if (!isImg && !isFile) return 'unsupported_type';
  if (f.bytes > (isImg ? P.maxImageBytes : P.maxFileBytes)) return 'file_too_large';
  if (P.maxFilesPerSubmission !== undefined && existing.length + 1 > P.maxFilesPerSubmission) return 'too_many_files';
  if (existing.reduce((s, e) => s + e.bytes, f.bytes) > P.maxPerSubmissionBytes) return 'submission_too_large';
  return null;
}
/** Evidence is downloadable only once scan_status is clean (quarantined until then). */
export function canDownload(scanStatus: string): boolean { return scanStatus === P.downloadRequiresScanStatus; }
