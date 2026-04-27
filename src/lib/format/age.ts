export function formatAge(iso: string | null): string {
  if (!iso) {
    return 'no data';
  }
  const deltaMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    return 'just now';
  }
  const mins = Math.floor(deltaMs / 60000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
