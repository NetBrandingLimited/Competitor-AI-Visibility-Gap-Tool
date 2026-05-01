import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import EllipsisAccessible from '@/app/components/EllipsisAccessible';
import { UI_INLINE_ID_DISPLAY_MAX } from '@/lib/ingestion/gscDiagnostics';

describe('EllipsisAccessible', () => {
  it('renders a single element without sr-only when under maxChars', () => {
    const html = renderToStaticMarkup(<EllipsisAccessible value="hello" maxChars={10} />);
    expect(html).toBe('<span>hello</span>');
  });

  it('renders aria-hidden display plus sr-only full value when truncated', () => {
    const html = renderToStaticMarkup(<EllipsisAccessible value="0123456789" maxChars={4} />);
    expect(html).toContain('title="0123456789"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('0123…');
    expect(html).toContain('class="sr-only"');
    expect(html).toMatch(/0123456789<\/span><\/span>$/);
  });

  it('supports as="code" and className when truncated', () => {
    const longId = `${'a'.repeat(UI_INLINE_ID_DISPLAY_MAX)}x`;
    const html = renderToStaticMarkup(
      <EllipsisAccessible
        as="code"
        className="connector-id"
        value={longId}
        maxChars={UI_INLINE_ID_DISPLAY_MAX}
      />
    );
    expect(html.startsWith('<code class="connector-id"')).toBe(true);
    expect(html).toContain('class="sr-only"');
    expect(html).toContain(longId);
  });

  it('renders empty span for blank value', () => {
    const html = renderToStaticMarkup(<EllipsisAccessible value="   " />);
    expect(html).toBe('<span></span>');
  });
});
