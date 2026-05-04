import { describe, expect, it } from 'vitest';

import { buildDownloadHeaders } from './downloadHeaders';

describe('buildDownloadHeaders', () => {
  it('sets content-type, attachment disposition, cache-control, and nosniff', () => {
    const h = buildDownloadHeaders('text/csv; charset=utf-8', 'report.csv');
    expect(h['content-type']).toBe('text/csv; charset=utf-8');
    expect(h['cache-control']).toBe('no-store');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['content-disposition']).toContain('attachment');
    expect(h['content-disposition']).toContain('filename="report.csv"');
    expect(h['content-disposition']).toContain(`filename*=UTF-8''${encodeURIComponent('report.csv')}`);
  });

  it('sanitizes path-like characters in the quoted ASCII filename', () => {
    const h = buildDownloadHeaders('text/plain', 'a/b:c?.txt');
    const cd = h['content-disposition'];
    expect(cd).toContain('attachment');
    expect(cd).not.toMatch(/filename="[^"]*\/[^"]*"/);
    expect(cd).toContain(`filename*=UTF-8''${encodeURIComponent('a/b:c?.txt')}`);
  });

  it('includes UTF-8 filename parameter for unicode names', () => {
    const name = '周报.md';
    const h = buildDownloadHeaders('text/markdown; charset=utf-8', name);
    expect(h['content-disposition']).toContain(`filename*=UTF-8''${encodeURIComponent(name)}`);
  });

  it('falls back to download when filename is empty', () => {
    const h = buildDownloadHeaders('application/octet-stream', '   ');
    expect(h['content-disposition']).toContain('filename="download"');
    expect(h['content-disposition']).toContain(`filename*=UTF-8''${encodeURIComponent('download')}`);
  });
});
