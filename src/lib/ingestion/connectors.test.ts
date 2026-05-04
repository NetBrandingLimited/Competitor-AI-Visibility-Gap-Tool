import { describe, expect, it } from 'vitest';

import { MOCK_CONNECTORS } from './connectors';

describe('MOCK_CONNECTORS', () => {
  it('lists reddit-mock then hn-mock', () => {
    expect(MOCK_CONNECTORS.map((c) => c.name)).toEqual(['reddit-mock', 'hn-mock']);
  });

  it('reddit-mock returns the requested number of documents', async () => {
    const reddit = MOCK_CONNECTORS[0];
    const docs = await reddit.fetchDocuments({ query: 'seo tool', limit: 3, contentVariant: 0 });
    expect(docs).toHaveLength(3);
    expect(docs.every((d) => d.source === 'reddit-mock')).toBe(true);
    expect(docs[0].title).toContain('seo tool');
    expect(docs[0].content.length).toBeGreaterThan(20);
  });

  it('hn-mock shapes the first URL for dedupe coverage', async () => {
    const hn = MOCK_CONNECTORS[1];
    const docs = await hn.fetchDocuments({ query: 'ai tool', limit: 2, contentVariant: 1 });
    expect(docs).toHaveLength(2);
    expect(docs[0].url).toContain('-dupe');
    expect(docs[0].source).toBe('hn-mock');
  });

  it('rotates mock body text with contentVariant', async () => {
    const reddit = MOCK_CONNECTORS[0];
    const a = await reddit.fetchDocuments({ query: 'same', limit: 1, contentVariant: 0 });
    const b = await reddit.fetchDocuments({ query: 'same', limit: 1, contentVariant: 3 });
    expect(a[0].content).not.toBe(b[0].content);
  });
});
