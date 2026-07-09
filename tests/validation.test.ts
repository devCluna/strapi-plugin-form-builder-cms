import { describe, it, expect } from 'vitest';
import validationFactory from '../server/src/services/validation';

const v = validationFactory();
const field = (over: any = {}) => ({ id: 'f', type: 'text', name: 'f', label: 'Field', required: false, ...over });

describe('validation.validate', () => {
  it('flags a required field left empty', () => {
    const r = v.validate([field({ required: true })], {});
    expect(r.valid).toBe(false);
    expect(r.errors.f[0]).toContain('required');
  });

  it('passes when a required field has a value', () => {
    expect(v.validate([field({ required: true })], { f: 'hi' }).valid).toBe(true);
  });

  it('rejects a malformed email by field type', () => {
    const r = v.validate([field({ type: 'email', name: 'e', label: 'Email' })], { e: 'not-an-email' });
    expect(r.valid).toBe(false);
  });

  it('enforces a regex pattern rule with the custom message', () => {
    const rules = [{ type: 'pattern', value: '^[a-z0-9]+$', message: 'lowercase only' }];
    const r = v.validate([field({ validation: rules })], { f: 'BAD Value' });
    expect(r.errors.f).toContain('lowercase only');
  });

  it('skips optional empty fields (no false errors)', () => {
    expect(v.validate([field()], {}).valid).toBe(true);
  });
});
