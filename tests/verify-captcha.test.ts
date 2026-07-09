import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyCaptcha } from '../server/src/services/submission';
import submissionService from '../server/src/services/submission';

// verifyCaptcha hits the provider over fetch; mock it so tests stay offline + deterministic.
function mockFetch(impl: (url: string, init: any) => any) {
  (globalThis as any).fetch = vi.fn(impl);
}

afterEach(() => vi.restoreAllMocks());

describe('verifyCaptcha (fail-closed CAPTCHA check)', () => {
  it('accepts when the provider returns success:true', async () => {
    mockFetch(async () => ({ json: async () => ({ success: true }) }));
    expect(await verifyCaptcha('turnstile', 'secret', 'token', '1.2.3.4')).toBe(true);
  });

  it('rejects when the provider returns success:false', async () => {
    mockFetch(async () => ({ json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) }));
    expect(await verifyCaptcha('turnstile', 'secret', 'token', '1.2.3.4')).toBe(false);
  });

  it('fails closed (rejects) when the network throws', async () => {
    mockFetch(async () => { throw new Error('network down'); });
    expect(await verifyCaptcha('recaptcha', 'secret', 'token', '')).toBe(false);
  });

  it('trims stray whitespace from the secret and token before sending', async () => {
    let sentBody = '';
    mockFetch(async (_url, init) => { sentBody = init.body; return { json: async () => ({ success: true }) }; });
    await verifyCaptcha('turnstile', '  sek ret  ', '  tok ', '');
    const params = new URLSearchParams(sentBody);
    expect(params.get('secret')).toBe('sek ret'); // outer whitespace trimmed, inner preserved
    expect(params.get('response')).toBe('tok');
  });

  it('fails closed on an unknown provider (returns false without a request)', async () => {
    mockFetch(async () => { throw new Error('should not be called'); });
    expect(await verifyCaptcha('nope', 'secret', 'token', '')).toBe(false);
  });
});

describe('testCaptchaSecret (admin "Test secret key")', () => {
  const svc = submissionService({ strapi: {} } as any);

  it('rejects an empty secret without a request', async () => {
    mockFetch(async () => { throw new Error('should not be called'); });
    expect(await svc.testCaptchaSecret('turnstile', '  ')).toEqual({ ok: false, reason: 'Secret key is empty' });
  });

  it('rejects an unknown provider', async () => {
    const r = await svc.testCaptchaSecret('nope', 'secret');
    expect(r.ok).toBe(false);
  });

  it('reports an invalid secret when the provider says invalid-input-secret', async () => {
    mockFetch(async () => ({ json: async () => ({ success: false, 'error-codes': ['invalid-input-secret'] }) }));
    const r = await svc.testCaptchaSecret('turnstile', 'bad-secret');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/invalid/i);
  });

  it('treats invalid-input-response as a VALID secret (only the dummy token was bad)', async () => {
    mockFetch(async () => ({ json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) }));
    expect(await svc.testCaptchaSecret('turnstile', 'good-secret')).toEqual({ ok: true });
  });
});
