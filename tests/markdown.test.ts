import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/lib/markdown';

describe('markdown rendering', () => {
  it('renders common note formatting', () => {
    const html = renderMarkdown('## Done\n- **fixed** timer draft\n- added [docs](https://example.com)');

    expect(html).toContain('<h4>Done</h4>');
    expect(html).toContain('<li><strong>fixed</strong> timer draft</li>');
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noreferrer">docs</a>');
  });

  it('escapes unsafe HTML and links', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)>\n[bad](javascript:alert(1))');

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('href="javascript:');
  });
});
