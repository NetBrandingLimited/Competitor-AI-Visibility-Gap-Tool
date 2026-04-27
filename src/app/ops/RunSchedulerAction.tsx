'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RunSchedulerAction() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [forceDigest, setForceDigest] = useState(false);

  async function runNow() {
    setRunning(true);
    setMessage('');
    try {
      const response = await fetch(`/api/debug/scheduler/run?limit=2${forceDigest ? '&forceDigest=1' : ''}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Scheduler run failed (${response.status})`);
      }
      setMessage('Scheduler job completed successfully.');
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Scheduler run failed.';
      setMessage(text);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ margin: '12px 0 20px' }}>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={forceDigest}
          onChange={(e) => setForceDigest(e.target.checked)}
          disabled={running}
          style={{ marginRight: 8 }}
        />
        Force weekly digest generation in this run
      </label>
      <button onClick={runNow} disabled={running}>
        {running ? 'Running scheduled job...' : 'Run scheduled job now'}
      </button>
      {message ? <p style={{ marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
