/**
 * Pure helpers for the embed runtime. These are injected into the served embed
 * script via `.toString()`, so the browser runs the exact code covered by tests
 * here — no drift between the tested function and the shipped one. Keep them
 * self-contained (globals only, no imports) so the stringified source runs
 * standalone in the browser.
 */

/** Is a post-submit redirect target safe to navigate to (http/https/relative only)? */
export function isSafeRedirect(url: string, base: string): boolean {
  try {
    const u = new URL(url, base);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}
