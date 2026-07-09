import { describe, it, expect } from 'vitest';
import { publicSchemaFrom } from '../server/src/services/form';

const baseForm = {
  id: 1,
  slug: 'contact',
  publishedAt: '2026-01-01T00:00:00.000Z',
  publishedData: {
    title: 'Contact',
    description: '',
    fields: [{ id: 'a', type: 'email', name: 'email' }],
    conditionalLogic: [],
    settings: {},
  },
};

describe('publicSchemaFrom (public form serialization)', () => {
  it('returns null for an unpublished form (drafts never leak)', () => {
    expect(publicSchemaFrom({ ...baseForm, publishedAt: null })).toBeNull();
    expect(publicSchemaFrom(null)).toBeNull();
  });

  it('NEVER exposes the CAPTCHA secret key, but keeps the public site key', () => {
    const form = {
      ...baseForm,
      publishedData: {
        ...baseForm.publishedData,
        settings: { captcha: { provider: 'turnstile', siteKey: 'PUBLIC', secretKey: 'TOP-SECRET' } },
      },
    };
    const out = publicSchemaFrom(form);
    const captcha = out!.data.settings.captcha;
    expect(captcha).toEqual({ provider: 'turnstile', siteKey: 'PUBLIC' });
    expect('secretKey' in captcha).toBe(false);
    // belt-and-suspenders: the secret must not appear anywhere in the serialized payload
    expect(JSON.stringify(out)).not.toContain('TOP-SECRET');
  });

  it('passes settings through untouched when no captcha is configured', () => {
    const out = publicSchemaFrom(baseForm);
    expect(out!.data.settings).toEqual({});
    expect(out!.data.slug).toBe('contact');
  });
});
