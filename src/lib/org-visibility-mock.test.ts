import { describe, expect, it } from 'vitest';

import type { OrgBrandFields } from './org-visibility-mock';
import {
  defaultPipelineQueryFromOrg,
  enrichDocumentsWithOrgContext,
  getDashboardSnapshot,
  getDashboardSnapshotForOrganization,
  simpleHash
} from './org-visibility-mock';

describe('simpleHash', () => {
  it('is deterministic', () => {
    expect(simpleHash('org-1-query')).toBe(simpleHash('org-1-query'));
  });

  it('returns 0 for empty string', () => {
    expect(simpleHash('')).toBe(0);
  });

  it('differs for different inputs', () => {
    expect(simpleHash('a')).not.toBe(simpleHash('b'));
  });
});

describe('defaultPipelineQueryFromOrg', () => {
  it('uses default when no brand fields', () => {
    expect(defaultPipelineQueryFromOrg({})).toBe('ai visibility competitor comparison');
  });

  it('joins non-empty trimmed fields', () => {
    const f: OrgBrandFields = {
      brandName: ' Acme ',
      category: 'Widgets',
      competitorA: 'Beta',
      competitorB: undefined,
      competitorC: '   '
    };
    expect(defaultPipelineQueryFromOrg(f)).toBe('Acme Widgets Beta alternatives reviews');
  });

  it('caps length at 220 characters', () => {
    const long = 'word '.repeat(80).trim();
    const f: OrgBrandFields = { brandName: long, category: long };
    const q = defaultPipelineQueryFromOrg(f);
    expect(q.length).toBeLessThanOrEqual(220);
  });
});

describe('enrichDocumentsWithOrgContext', () => {
  it('returns the same documents when context is empty', () => {
    const docs = [
      {
        id: '1',
        source: 'reddit-mock' as const,
        url: 'https://example.com/1',
        title: 't',
        content: 'hello',
        publishedAt: '2026-01-01T00:00:00.000Z'
      }
    ];
    expect(enrichDocumentsWithOrgContext(docs, {})).toEqual(docs);
  });

  it('appends org context to document content', () => {
    const docs = [
      {
        id: '1',
        source: 'reddit-mock' as const,
        url: 'https://example.com/1',
        title: 't',
        content: 'body',
        publishedAt: '2026-01-01T00:00:00.000Z'
      }
    ];
    const out = enrichDocumentsWithOrgContext(docs, { brandName: 'Acme', category: 'CRM' });
    expect(out).toHaveLength(1);
    expect(out[0].content).toContain('body');
    expect(out[0].content).toContain('Acme');
    expect(out[0].content).toContain('CRM');
  });
});

describe('getDashboardSnapshotForOrganization', () => {
  const fixedNow = new Date('2026-03-01T10:00:00.000Z');

  it('returns five leaderboard rows and shareOfVoice that sums to 1', () => {
    const snap = getDashboardSnapshotForOrganization(
      { brandName: 'Acme', category: 'SaaS', competitorA: 'Beta', competitorB: 'Gamma', competitorC: 'Delta' },
      fixedNow
    );
    expect(snap.generatedAt).toBe(fixedNow.toISOString());
    expect(snap.leaderboard).toHaveLength(5);
    const sum = snap.leaderboard.reduce((s, r) => s + r.shareOfVoice, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(snap.recent.length).toBeGreaterThan(0);
  });
});

describe('getDashboardSnapshot', () => {
  it('returns a snapshot with default placeholder labels', () => {
    const snap = getDashboardSnapshot();
    expect(snap.leaderboard).toHaveLength(5);
    expect(snap.leaderboard[0].brand).toContain('Brand settings');
  });
});
