import { describe, expect, it } from 'vitest';

import { normalizeIngestionInput } from './pipeline';

describe('normalizeIngestionInput', () => {
  it('trims query', () => {
    const n = normalizeIngestionInput({ query: '  crm  ' });
    expect(n.query).toBe('crm');
  });

  it('defaults limitPerConnector to 3 and contentVariant to 0', () => {
    const n = normalizeIngestionInput({ query: 'q' });
    expect(n.limitPerConnector).toBe(3);
    expect(n.contentVariant).toBe(0);
  });

  it('clamps limitPerConnector to 1..10', () => {
    expect(normalizeIngestionInput({ query: 'q', limitPerConnector: 0 }).limitPerConnector).toBe(1);
    expect(normalizeIngestionInput({ query: 'q', limitPerConnector: -2 }).limitPerConnector).toBe(1);
    expect(normalizeIngestionInput({ query: 'q', limitPerConnector: 5 }).limitPerConnector).toBe(5);
    expect(normalizeIngestionInput({ query: 'q', limitPerConnector: 25 }).limitPerConnector).toBe(10);
  });

  it('passes through brandContext and explicit contentVariant', () => {
    const brandContext = { brandName: 'Acme' };
    const n = normalizeIngestionInput({
      query: 'q',
      brandContext,
      contentVariant: 4
    });
    expect(n.brandContext).toBe(brandContext);
    expect(n.contentVariant).toBe(4);
  });
});
