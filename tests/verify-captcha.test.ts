import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyCaptcha } from '../server/src/services/submission';

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
