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
    <div className="stack-y-actions">
      <label className="block mb-8">
        <input
          type="checkbox"
          checked={forceDigest}
          onChange={(e) => setForceDigest(e.target.checked)}
          disabled={running}
          className="mr-8"
        />
        Force weekly digest generation in this run
      </label>
      <button onClick={runNow} disabled={running}>
        {running ? 'Running scheduled job...' : 'Run scheduled job now'}
      </button>
      {message ? <p className="mt-8">{message}</p> : null}
    </div>
  );
}
