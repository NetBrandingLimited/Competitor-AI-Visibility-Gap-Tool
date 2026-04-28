function toAsciiFilename(filename: string): string {
  const trimmed = filename.trim();
  const fallback = trimmed.length > 0 ? trimmed : 'download';
  const asciiOnly = fallback
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const safe = asciiOnly.length > 0 ? asciiOnly : 'download';
  return safe.replace(/["\\]/g, '_');
}

export function buildDownloadHeaders(contentType: string, filename: string): Record<string, string> {
  const asciiFilename = toAsciiFilename(filename);
  const encodedUtf8Filename = encodeURIComponent(filename.trim() || 'download');

  return {
    'content-type': contentType,
    'content-disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedUtf8Filename}`,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  };
}
