'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import EllipsisStatusText from '@/app/components/EllipsisStatusText';

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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void save();
  }

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
    <div className="panel-box mb-20">
      <h2 className="heading-panel">Weekly digest schedule (UTC)</h2>
      <p className="text-muted-note mt-0">
        Stored per workspace. Scheduler runs can use this as the standard digest cadence.
      </p>
      <form method="post" onSubmit={onSubmit}>
      <label className="label-block-tight">
        <input
          type="checkbox"
          name="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={!canEdit || saving}
          className="mr-8"
        />
        Enable weekly digest schedule
      </label>
      <label className="label-block-body">
        <input
          type="checkbox"
          name="refreshPipelineFirst"
          checked={refreshPipelineFirst}
          onChange={(e) => setRefreshPipelineFirst(e.target.checked)}
          disabled={!canEdit || saving}
          className="mr-8"
        />
        Refresh pipeline + trends before digest if data is older than 7 days (digest-only / cron)
      </label>
      <div className="flex-row-wrap-gap">
        <label>
          Day:{' '}
          <select
            name="dayUtc"
            value={dayUtc}
            onChange={(e) => setDayUtc(Number(e.target.value))}
            disabled={!canEdit || saving}
          >
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
            name="hourUtc"
            min={0}
            max={23}
            value={hourUtc}
            onChange={(e) => setHourUtc(Number(e.target.value))}
            disabled={!canEdit || saving}
            className="input-narrow-num"
          />
        </label>
        <button type="submit" disabled={!canEdit || saving} aria-busy={saving}>
          {saving ? 'Saving…' : 'Save schedule'}
        </button>
      </div>
      </form>
      {message ? (
        <p className="mt-10" role="status" aria-live="polite">
          <EllipsisStatusText text={message} />
        </p>
      ) : null}
      {!canEdit ? <p className="text-muted-small mt-8">Viewer role: schedule is read-only.</p> : null}
    </div>
  );
}
