import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import EllipsisStatusText from '@/app/components/EllipsisStatusText';
import { GSC_SUMMARY_UI_STATUS_MAX } from '@/lib/ingestion/gscDiagnostics';

describe('EllipsisStatusText', () => {
  it('renders a single span when under maxChars', () => {
    const html = renderToStaticMarkup(<EllipsisStatusText text="Saved." maxChars={80} />);
    expect(html).toBe('<span>Saved.</span>');
  });

  it('renders sr-only full text when truncated', () => {
    const html = renderToStaticMarkup(<EllipsisStatusText text="0123456789" maxChars={4} />);
    expect(html).toContain('title="0123456789"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('0123…');
    expect(html).toContain('class="sr-only"');
  });

  it('defaults to GSC_SUMMARY_UI_STATUS_MAX', () => {
    const long = 'a'.repeat(GSC_SUMMARY_UI_STATUS_MAX + 3);
    const html = renderToStaticMarkup(<EllipsisStatusText text={long} />);
    expect(html).toContain('class="sr-only"');
    expect(html).toContain(long);
  });
});
