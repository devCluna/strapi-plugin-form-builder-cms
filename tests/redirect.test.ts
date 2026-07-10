import { describe, it, expect } from 'vitest';
import { isSafeRedirect } from '../server/src/lib/embed';

const BASE = 'https://acme.co/contact';

describe('isSafeRedirect (post-submit redirect guard)', () => {
  it('allows absolute http(s) URLs', () => {
    expect(isSafeRedirect('https://acme.co/thanks', BASE)).toBe(true);
    expect(isSafeRedirect('http://acme.co/thanks', BASE)).toBe(true);
  });

  it('allows relative paths (resolved against the current page)', () => {
    expect(isSafeRedirect('/thanks', BASE)).toBe(true);
    expect(isSafeRedirect('thank-you', BASE)).toBe(true);
  });

  it('blocks javascript: and data: URLs (XSS / open-redirect)', () => {
    expect(isSafeRedirect('javascript:alert(1)', BASE)).toBe(false);
    expect(isSafeRedirect('JavaScript:alert(1)', BASE)).toBe(false);
    expect(isSafeRedirect('data:text/html,<script>alert(1)</script>', BASE)).toBe(false);
  });

  it('blocks other non-http protocols', () => {
    expect(isSafeRedirect('mailto:x@y.com', BASE)).toBe(false);
    expect(isSafeRedirect('ftp://acme.co/f', BASE)).toBe(false);
    expect(isSafeRedirect('tel:+123', BASE)).toBe(false);
  });
  // note: an empty string is filtered upstream by the `redirect && …` guard in the embed,
  // so it never reaches isSafeRedirect (where, against a base, it would resolve to the page).
});
