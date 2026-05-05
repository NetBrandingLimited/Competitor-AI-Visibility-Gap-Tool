'use client';

import { usePathname, useRouter } from 'next/navigation';
import { startTransition, useEffect, useState, type FormEvent } from 'react';

import EllipsisStatusText from '@/app/components/EllipsisStatusText';
import { redirectToLogin } from '@/lib/client/redirect-to-login';
import type { LlmAnswerAnalytics } from '@/lib/ai-visibility/analyzeLlmOutput';
import {
  PROMPT_SURFACE_IDS,
  PROMPT_SURFACE_LABELS,
  type PromptSurfaceId,
  type TrackedPromptDTO
} from '@/lib/ai-visibility/measurement';
import { membershipCanEdit } from '@/lib/roles';

type Org = { id: string; name: string; role: string };

type AnswerSampleRow = {
  id: string;
  trackedPromptId: string;
  promptText: string;
  promptLabel: string | null;
  surface: string;
  surfaceLabel: string;
  provider: string;
  model: string;
  answerText: string;
  error: string | null;
  createdAt: string;
  analytics?: LlmAnswerAnalytics | null;
};

function formatMentionBreakdown(a: LlmAnswerAnalytics): string {
  const parts = Object.entries(a.mentionsByBrand)
    .filter(([, n]) => n > 0)
    .sort((x, y) => y[1] - x[1])
    .map(([b, n]) => `${b}: ${n}`);
  return parts.length > 0 ? parts.join(' · ') : 'No mentions of tracked brands';
}

type AiAnswersApiPayload = {
  samples: AnswerSampleRow[];
  analyticsRollup?: {
    samplesWithAnalytics: number;
    avgBrandShareOfMentions: number | null;
    shareCount: number;
  };
};

type DraftPrompt = {
  id?: string;
  text: string;
  label: string;
  category: string;
  isActive: boolean;
  targetSurfaces: PromptSurfaceId[];
};

function emptyDraft(): DraftPrompt {
  return {
    text: '',
    label: '',
    category: '',
    isActive: true,
    targetSurfaces: []
  };
}

function fromDto(p: TrackedPromptDTO): DraftPrompt {
  return {
    id: p.id,
    text: p.text,
    label: p.label ?? '',
    category: p.category ?? '',
    isActive: p.isActive,
    targetSurfaces: [...p.targetSurfaces]
  };
}

export default function TrackedPromptsForm() {
  const pathname = usePathname();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState('');
  const [rows, setRows] = useState<DraftPrompt[]>([emptyDraft()]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [samples, setSamples] = useState<AnswerSampleRow[]>([]);
  const [analyticsRollup, setAnalyticsRollup] = useState<AiAnswersApiPayload['analyticsRollup'] | null>(null);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [collectMessage, setCollectMessage] = useState('');

  const selected = orgs.find((o) => o.id === orgId);
  const canEdit = selected ? membershipCanEdit(selected.role) : false;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      const data = (await response.json()) as { user: unknown; organizations: Org[] };
      if (cancelled) {
        return;
      }
      if (!data.user) {
        setLoading(false);
        redirectToLogin(pathname);
        return;
      }
      setOrgs(data.organizations ?? []);
      const first = data.organizations?.[0];
      if (first) {
        setOrgId(first.id);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!orgId) {
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/orgs/${orgId}/tracked-prompts`, { credentials: 'include' });
      if (cancelled || !res.ok) {
        return;
      }
      const data = (await res.json()) as { prompts: TrackedPromptDTO[] };
      if (cancelled) {
        return;
      }
      if (data.prompts.length === 0) {
        setRows([emptyDraft()]);
      } else {
        setRows(data.prompts.map(fromDto));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    if (!orgId) {
      return;
    }
    let cancelled = false;
    (async () => {
      setSamplesLoading(true);
      const res = await fetch(`/api/orgs/${orgId}/ai-answers?limit=30`, { credentials: 'include' });
      if (cancelled || !res.ok) {
        setSamplesLoading(false);
        return;
      }
      const data = (await res.json()) as AiAnswersApiPayload;
      if (!cancelled) {
        setSamples(data.samples ?? []);
        setAnalyticsRollup(data.analyticsRollup ?? null);
      }
      setSamplesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  async function collectAnswers() {
    if (!orgId || !canEdit) {
      return;
    }
    setCollectMessage('');
    setCollecting(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/ai-answers/collect`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = (await res.json()) as {
        summary?: {
          attempted: number;
          persisted: number;
          skippedNoCredentials: { surface: string; reason: string }[];
          failures: { message: string }[];
        };
        envHints?: { openai: boolean; anthropic: boolean };
      };
      if (!res.ok) {
        setCollectMessage(`Collect failed (${res.status}).`);
        return;
      }
      const s = data.summary;
      const hints = data.envHints;
      const parts: string[] = [];
      if (s) {
        parts.push(`attempted ${s.attempted}, persisted ${s.persisted}`);
        if (s.skippedNoCredentials.length > 0) {
          parts.push(`skipped ${s.skippedNoCredentials.length} (missing keys or unsupported surfaces)`);
        }
        if (s.failures.length > 0) {
          parts.push(`${s.failures.length} failure(s) recorded`);
        }
      }
      if (hints && !hints.openai && !hints.anthropic) {
        parts.push('Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY on the server.');
      }
      setCollectMessage(parts.join(' · ') || 'Done.');
      const refresh = await fetch(`/api/orgs/${orgId}/ai-answers?limit=30`, { credentials: 'include' });
      if (refresh.ok) {
        const again = (await refresh.json()) as AiAnswersApiPayload;
        setSamples(again.samples ?? []);
        setAnalyticsRollup(again.analyticsRollup ?? null);
      }
    } finally {
      setCollecting(false);
    }
  }

  function toggleSurface(rowIndex: number, surface: PromptSurfaceId, on: boolean) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIndex) {
          return r;
        }
        const next = new Set(r.targetSurfaces);
        if (on) {
          next.add(surface);
        } else {
          next.delete(surface);
        }
        return { ...r, targetSurfaces: [...next] as PromptSurfaceId[] };
      })
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !canEdit) {
      return;
    }
    for (const r of rows) {
      const t = r.text.trim();
      if (t.length === 1) {
        setMessage('Prompt text must be at least 2 characters, or leave the row empty.');
        return;
      }
    }
    setMessage('');
    setSaving(true);
    try {
      const prompts = rows
        .map((r, i) => ({
          id: r.id,
          text: r.text.trim(),
          label: r.label.trim() || null,
          category: r.category.trim() || null,
          isActive: r.isActive,
          sortOrder: i,
          targetSurfaces: r.targetSurfaces
        }))
        .filter((p) => p.text.length >= 2);

      const response = await fetch(`/api/orgs/${orgId}/tracked-prompts`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompts })
      });
      if (response.status === 401) {
        redirectToLogin(pathname);
        return;
      }
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { message?: string };
        setMessage(err.message ?? `Save failed (${response.status})`);
        return;
      }
      const data = (await response.json()) as { prompts: TrackedPromptDTO[] };
      setRows(data.prompts.length === 0 ? [emptyDraft()] : data.prompts.map(fromDto));
      setMessage('Saved.');
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p role="status" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (orgs.length === 0) {
    return (
      <p>
        You are signed in but have no organization membership. Run <code>npm run db:seed</code>.
      </p>
    );
  }

  return (
    <div className="brand-form">
    <form method="post" onSubmit={onSubmit}>
      {orgs.length > 1 ? (
        <label className="field" htmlFor="prompts-organizationId">
          <span>Workspace</span>
          <select
            id="prompts-organizationId"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.role})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <p className="text-muted-note-wide">
        Each entry is one <strong>measurement unit</strong>: the exact prompt you plan to run, optional labels, and
        which assistant surfaces you intend to track. Executing these prompts against live models is not wired yet—this
        step defines the library only.
      </p>

      {rows.map((row, idx) => (
        <div key={row.id ?? `new-${idx}`} className="panel-box-info mb-20">
          <label className="field" htmlFor={row.id ? `prompt-text-${row.id}` : `prompt-text-new-${idx}`}>
            <span>Prompt text</span>
            <textarea
              id={row.id ? `prompt-text-${row.id}` : `prompt-text-new-${idx}`}
              value={row.text}
              onChange={(e) =>
                setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, text: e.target.value } : r)))
              }
              rows={3}
              disabled={!canEdit}
              placeholder="e.g. What are the best CRM tools for mid-market B2B in 2026?"
            />
            <small className="field-hint-small">Required for saved rows: at least 2 characters.</small>
          </label>

          <label className="field" htmlFor={row.id ? `prompt-label-${row.id}` : `prompt-label-new-${idx}`}>
            <span>Short label (optional)</span>
            <input
              id={row.id ? `prompt-label-${row.id}` : `prompt-label-new-${idx}`}
              type="text"
              value={row.label}
              onChange={(e) =>
                setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))
              }
              disabled={!canEdit}
              placeholder="CRM comparison"
            />
          </label>

          <label className="field" htmlFor={row.id ? `prompt-cat-${row.id}` : `prompt-cat-new-${idx}`}>
            <span>Category / intent (optional)</span>
            <input
              id={row.id ? `prompt-cat-${row.id}` : `prompt-cat-new-${idx}`}
              type="text"
              value={row.category}
              onChange={(e) =>
                setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, category: e.target.value } : r)))
              }
              disabled={!canEdit}
              placeholder="comparison, branded, category…"
            />
          </label>

          <div className="field">
            <span>Target surfaces</span>
            <small className="field-hint-small">
              OpenAI ChatGPT and Anthropic Claude use provider APIs when you click Collect answers below.
            </small>
            <div className="prompt-surface-grid">
              {PROMPT_SURFACE_IDS.map((sid) => (
                <label key={sid} className="prompt-surface-item">
                  <input
                    type="checkbox"
                    checked={row.targetSurfaces.includes(sid)}
                    disabled={!canEdit}
                    onChange={(e) => toggleSurface(idx, sid, e.target.checked)}
                  />{' '}
                  {PROMPT_SURFACE_LABELS[sid]}
                </label>
              ))}
            </div>
          </div>

          <label className="field field-checkbox-row">
            <input
              type="checkbox"
              checked={row.isActive}
              disabled={!canEdit}
              onChange={(e) =>
                setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, isActive: e.target.checked } : r)))
              }
            />
            <span>Active (include in future scheduled runs)</span>
          </label>

          {canEdit ? (
            <button
              type="button"
              className="secondary btn-compact-inline-secondary"
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
            >
              Remove this prompt
            </button>
          ) : null}
        </div>
      ))}

      {canEdit ? (
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setRows((prev) => [...prev, emptyDraft()])}>
            Add prompt
          </button>
          <button type="submit" className="primary" disabled={saving} aria-busy={saving}>
            {saving ? 'Saving…' : 'Save prompts'}
          </button>
        </div>
      ) : (
        <p className="text-muted-small mt-8">Viewer role: prompt library is read-only for this workspace.</p>
      )}

      {message ? (
        <p
          className={message === 'Saved.' ? 'success' : 'error'}
          role="status"
          aria-live="polite"
        >
          <EllipsisStatusText text={message} />
        </p>
      ) : null}
    </form>

    <section className="mt-24">
      <h2 className="subheading-prompts">AI answers (API)</h2>
      <p className="text-muted-note-wide">
        Stores <strong>real assistant output text</strong> from OpenAI / Anthropic APIs — not Search Console rows.
        Keys are server-side only (<code>OPENAI_API_KEY</code>, <code>ANTHROPIC_API_KEY</code>; see{' '}
        <code>.env.example</code>).
      </p>
      {canEdit ? (
        <div className="actions">
          <button type="button" className="primary" disabled={collecting} onClick={() => void collectAnswers()}>
            {collecting ? 'Collecting…' : 'Collect answers now'}
          </button>
        </div>
      ) : (
        <p className="text-muted-small">Editors can run collection; viewers see samples only.</p>
      )}
      {collectMessage ? (
        <p
          className={collectMessage.includes('failed') ? 'error' : 'success'}
          role="status"
          aria-live="polite"
        >
          <EllipsisStatusText text={collectMessage} />
        </p>
      ) : null}

      <h3 className="subheading-sm mt-16">Recent samples</h3>
      <p className="text-muted-note-wide">
        Mention analytics use your workspace <strong>Brand &amp; competitors</strong> names with the same rules as the
        pipeline leaderboard (whole-word matches for single tokens).
      </p>
      {analyticsRollup && analyticsRollup.shareCount > 0 && analyticsRollup.avgBrandShareOfMentions != null ? (
        <p className="text-metric-line llm-rollup-line">
          <strong>Rollup:</strong> average your-brand mention share{' '}
          <strong>{(analyticsRollup.avgBrandShareOfMentions * 100).toFixed(0)}%</strong> across{' '}
          {analyticsRollup.shareCount} sample(s) with at least one tracked-brand mention (of {samples.length} loaded).
        </p>
      ) : null}
      {samplesLoading ? (
        <p className="text-muted-note">Loading samples…</p>
      ) : samples.length === 0 ? (
        <p className="text-muted-note">No samples yet.</p>
      ) : (
        <ul className="list-plain answers-sample-list">
          {samples.map((s) => (
            <li key={s.id} className="panel-box-info mb-12">
              <p className="text-metric-line">
                <strong>{s.surfaceLabel}</strong> · {s.provider} · <code>{s.model}</code> ·{' '}
                {new Date(s.createdAt).toLocaleString()}
              </p>
              {s.promptLabel ? (
                <p className="text-muted-small mt-0 mb-4">
                  <strong>{s.promptLabel}</strong>
                </p>
              ) : null}
              <p className="text-muted-small-subtle mt-0 mb-6 prompt-snippet">{s.promptText}</p>
              {s.error ? (
                <p className="error text-muted-small mt-0">
                  <strong>Error:</strong> <EllipsisStatusText text={s.error} />
                </p>
              ) : (
                <>
                  {s.analytics ? (
                    <p className="text-metric-line llm-analytics-line">
                      <strong>Mentions:</strong> {formatMentionBreakdown(s.analytics)} (total{' '}
                      {s.analytics.totalMentions}) · <strong>Your brand share:</strong>{' '}
                      {s.analytics.brandShareOfMentions != null
                        ? `${(s.analytics.brandShareOfMentions * 100).toFixed(0)}%`
                        : '—'}{' '}
                      · <strong>Top:</strong> {s.analytics.topBrandByMentions ?? '—'}
                      {s.analytics.brandIsTopOrTied ? ' · your brand tied or leads' : ''}
                    </p>
                  ) : s.answerText ? (
                    <p className="text-muted-xs mt-0 mb-8">
                      Save brand and competitors under Brand settings to compute mention analytics.
                    </p>
                  ) : null}
                  <pre className="answer-pre">{s.answerText || '(empty)'}</pre>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
    </div>
  );
}
