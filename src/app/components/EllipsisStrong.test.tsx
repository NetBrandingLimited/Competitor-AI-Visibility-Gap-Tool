import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import EllipsisStrong from '@/app/components/EllipsisStrong';
import { GSC_SUMMARY_UI_STATUS_MAX } from '@/lib/ingestion/gscDiagnostics';

describe('EllipsisStrong', () => {
  it('renders plain strong when under maxChars', () => {
    const html = renderToStaticMarkup(<EllipsisStrong text="hello" maxChars={10} />);
    expect(html).toBe('<strong>hello</strong>');
  });

  it('renders sr-only full text when truncated', () => {
    const html = renderToStaticMarkup(<EllipsisStrong text="0123456789" maxChars={4} />);
    expect(html).toContain('title="0123456789"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('0123…');
    expect(html).toContain('class="sr-only"');
  });

  it('defaults to GSC_SUMMARY_UI_STATUS_MAX', () => {
    const long = 'a'.repeat(GSC_SUMMARY_UI_STATUS_MAX + 5);
    const html = renderToStaticMarkup(<EllipsisStrong text={long} />);
    expect(html).toContain('class="sr-only"');
    expect(html).toContain(long);
  });
});
