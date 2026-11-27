import { canDownload, checkEvidenceUpload } from './evidence-check';
const MB = 1024 * 1024;
describe('evidence policy', () => {
  it('accepts image at 10 MB, rejects above', () => {
    expect(checkEvidenceUpload({ mimeType: 'image/jpeg', bytes: 10 * MB }, [])).toBeNull();
    expect(checkEvidenceUpload({ mimeType: 'image/jpeg', bytes: 10 * MB + 1 }, [])).toBe('file_too_large');
  });
  it('accepts pdf at 25 MB, rejects above', () => {
    expect(checkEvidenceUpload({ mimeType: 'application/pdf', bytes: 25 * MB }, [])).toBeNull();
    expect(checkEvidenceUpload({ mimeType: 'application/pdf', bytes: 25 * MB + 1 }, [])).toBe('file_too_large');
  });
  it('rejects video and unsupported types', () => {
    expect(checkEvidenceUpload({ mimeType: 'video/mp4', bytes: 1 }, [])).toBe('video_not_allowed');
    expect(checkEvidenceUpload({ mimeType: 'application/zip', bytes: 1 }, [])).toBe('unsupported_type');
  });
  it('enforces 100 MB per submission', () => {
    const ex = [{ mimeType: 'application/pdf', bytes: 25 * MB }, { mimeType: 'application/pdf', bytes: 25 * MB }, { mimeType: 'application/pdf', bytes: 25 * MB }, { mimeType: 'application/pdf', bytes: 20 * MB }];
    expect(checkEvidenceUpload({ mimeType: 'application/pdf', bytes: 5 * MB }, ex)).toBeNull();
    expect(checkEvidenceUpload({ mimeType: 'application/pdf', bytes: 5 * MB + 1 }, ex)).toBe('submission_too_large');
  });
  it('downloads only when scan is clean', () => {
    expect(canDownload('clean')).toBe(true);
    for (const s of ['pending', 'quarantined', 'failed', '']) expect(canDownload(s)).toBe(false);
  });
});
