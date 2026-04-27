'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  organizationId: string;
  canEdit: boolean;
  initial: {
    enabled: boolean;
    dayUtc: number;
    hourUtc: number;
    refreshPipelineFirst: boolean;
  };
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeeklyDigestScheduleForm({ organizationId, canEdit, initial }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [dayUtc, setDayUtc] = useState(initial.dayUtc);
  const [hourUtc, setHourUtc] = useState(initial.hourUtc);
  const [refreshPipelineFirst, setRefreshPipelineFirst] = useState(initial.refreshPipelineFirst);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    if (!canEdit) {
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/orgs/${organizationId}/digest/schedule`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled, dayUtc, hourUtc, refreshPipelineFirst })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setMessage(body.error ?? `Save failed (${response.status})`);
        return;
      }
      setMessage('Schedule saved.');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginBottom: 20, padding: 12, border: '1px solid #ddd', borderRadius: 6, background: '#fafafa' }}>
      <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Weekly digest schedule (UTC)</h2>
      <p style={{ marginTop: 0, fontSize: 14, color: '#444' }}>
        Stored per workspace. Scheduler runs can use this as the standard digest cadence.
      </p>
      <label style={{ display: 'block', marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={!canEdit || saving}
          style={{ marginRight: 8 }}
        />
        Enable weekly digest schedule
      </label>
      <label style={{ display: 'block', marginBottom: 10, fontSize: 14, color: '#333' }}>
        <input
          type="checkbox"
          checked={refreshPipelineFirst}
          onChange={(e) => setRefreshPipelineFirst(e.target.checked)}
          disabled={!canEdit || saving}
          style={{ marginRight: 8 }}
        />
        Refresh pipeline + trends before digest if data is older than 7 days (digest-only / cron)
      </label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Day:{' '}
          <select value={dayUtc} onChange={(e) => setDayUtc(Number(e.target.value))} disabled={!canEdit || saving}>
            {DAYS.map((d, idx) => (
              <option key={d} value={idx}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hour (UTC):{' '}
          <input
            type="number"
            min={0}
            max={23}
            value={hourUtc}
            onChange={(e) => setHourUtc(Number(e.target.value))}
            disabled={!canEdit || saving}
            style={{ width: 80 }}
          />
        </label>
        <button type="button" onClick={save} disabled={!canEdit || saving}>
          {saving ? 'Saving...' : 'Save schedule'}
        </button>
      </div>
      {message ? <p style={{ marginTop: 10 }}>{message}</p> : null}
      {!canEdit ? <p style={{ marginTop: 8, color: '#666', fontSize: 13 }}>Viewer role: schedule is read-only.</p> : null}
    </div>
  );
}
