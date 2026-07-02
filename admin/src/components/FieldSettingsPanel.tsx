import React, { useState } from 'react';
import { Trash } from '@strapi/icons';
import { FormField, FieldOption, ValidationRule } from '../types';
import { C, FF, isDecorative, typeName } from '../ui';

interface Props {
  field: FormField;
  onChange: (updated: FormField) => void;
}

// Which settings apply to which field type (drives conditional visibility).
const PLACEHOLDER_TYPES = ['text', 'email', 'number', 'phone', 'url', 'password', 'textarea', 'select'];

const RULE_LABELS: Record<string, string> = {
  minLength: 'Min. length', maxLength: 'Max. length',
  min: 'Min. value', max: 'Max. value',
  email: 'Email', url: 'URL', pattern: 'Pattern (regex)',
};

// Extra validation rules (beyond Required) that make sense for a given type.
// email/url/number already auto-validate their format by type, so those rules
// are only offered where you'd validate free text.
function ruleTypesFor(type: string): string[] {
  if (type === 'number') return ['min', 'max'];
  if (type === 'text' || type === 'textarea') return ['minLength', 'maxLength', 'pattern', 'email', 'url'];
  if (['email', 'url', 'phone', 'password'].includes(type)) return ['minLength', 'maxLength', 'pattern'];
  return []; // select, radio, checkbox, checkbox-group, date, time → only Required
}

// One-time style block for input focus + placeholder (inline styles can't do :focus).
const STYLE_ID = 'sfb-settings-style';
function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    .sfb-inp:focus{border-color:${C.p600} !important;box-shadow:0 0 0 2px ${C.p200} !important}
  `;
  document.head.appendChild(el);
}

const inpStyle: React.CSSProperties = {
  height: 36, border: `1px solid ${C.n200}`, borderRadius: 4, background: C.n0,
  padding: '0 11px', font: `400 13px ${FF}`, color: C.n800, width: '100%', outline: 'none',
};

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ font: `600 12px ${FF}`, color: C.n700 }}>{label}</span>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, hint, mono, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; mono?: boolean; placeholder?: string;
}) {
  return (
    <Labeled label={label}>
      <input
        className="sfb-inp"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inpStyle, ...(mono ? { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: C.n700 } : {}) }}
      />
      {hint && <span style={{ font: `400 11px ${FF}`, color: C.n500 }}>{hint}</span>}
    </Labeled>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: 40, height: 22, borderRadius: 20, background: on ? C.suc500 : C.n200, position: 'relative', flex: 'none', cursor: 'pointer', border: 'none', padding: 0 }}
    >
      <span style={{ content: '""', position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.2)', transition: 'left .15s' }} />
    </button>
  );
}

function Seg({ value, onChange }: { value: 'full' | 'half'; onChange: (v: 'full' | 'half') => void }) {
  const cell = (active: boolean): React.CSSProperties => ({
    flex: 1, textAlign: 'center', padding: '8px 0', font: `600 12px ${FF}`, cursor: 'pointer',
    color: active ? '#fff' : C.n600, background: active ? C.p600 : 'transparent', border: 'none',
  });
  return (
    <div style={{ display: 'flex', border: `1px solid ${C.n200}`, borderRadius: 4, overflow: 'hidden' }}>
      <button type="button" style={cell(value === 'half')} onClick={() => onChange('half')}>Half</button>
      <button type="button" style={cell(value === 'full')} onClick={() => onChange('full')}>Full</button>
    </div>
  );
}

export function FieldSettingsPanel({ field, onChange }: Props) {
  ensureStyle();
  const deco = isDecorative(field.type);
  const [tab, setTab] = useState<'general' | 'validation'>('general');
  const update = (patch: Partial<FormField>) => onChange({ ...field, ...patch });

  const hasOptions = ['select', 'radio', 'checkbox-group'].includes(field.type);

  const addOption = () => update({ options: [...(field.options || []), { label: '', value: '' }] });
  const updateOption = (i: number, patch: Partial<FieldOption>) =>
    update({ options: (field.options || []).map((o, j) => (j === i ? { ...o, ...patch } : o)) });
  const removeOption = (i: number) => update({ options: (field.options || []).filter((_, j) => j !== i) });

  const ruleTypes = ruleTypesFor(field.type);
  const addValidation = () => {
    const used = field.validation.map((r) => r.type);
    const next = ruleTypes.find((t) => !used.includes(t));
    if (!next) return;
    update({ validation: [...field.validation, { type: next }] });
  };
  const updateValidation = (i: number, patch: Partial<ValidationRule>) =>
    update({ validation: field.validation.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const removeValidation = (i: number) => update({ validation: field.validation.filter((_, j) => j !== i) });

  // "required" is a boolean flag; its custom message lives in a validation rule of type 'required'
  const reqMsg = field.validation.find((v) => v.type === 'required')?.message || '';
  const setRequired = (on: boolean) => {
    const rest = field.validation.filter((v) => v.type !== 'required');
    update({ required: on, validation: on ? field.validation : rest });
  };
  const setReqMsg = (msg: string) => {
    const rest = field.validation.filter((v) => v.type !== 'required');
    update({ validation: msg ? [...rest, { type: 'required', message: msg }] : rest });
  };

  const kicker = `${typeName(field.type)} field`.toUpperCase();

  const tabBtn = (id: 'general' | 'validation', label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{ padding: '8px 12px', font: `600 13px ${FF}`, color: tab === id ? C.p700 : C.n500, borderBottom: `2px solid ${tab === id ? C.p600 : 'transparent'}`, marginBottom: -1, cursor: 'pointer', background: 'none', border: 'none' }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ width: 328, minWidth: 328, background: C.n0, borderLeft: `1px solid ${C.n150}`, overflowY: 'auto', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 18px 0' }}>
        <div style={{ font: `700 10px ${FF}`, letterSpacing: '.5px', textTransform: 'uppercase', color: C.p600, marginBottom: 5 }}>{kicker}</div>
        <div style={{ font: `700 16px ${FF}`, color: C.n900 }}>Field settings</div>
      </div>

      <div style={{ display: 'flex', gap: 2, padding: '12px 18px 0', borderBottom: `1px solid ${C.n150}` }}>
        {tabBtn('general', 'General')}
        {!deco && tabBtn('validation', 'Validation')}
      </div>

      {(tab === 'general' || deco) && (
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TextField label={deco ? (field.type === 'divider' ? 'Label (internal)' : 'Text') : 'Label'} value={field.label} onChange={(v) => update({ label: v })} />

          {!deco && (
            <>
              <TextField label="Name (technical)" value={field.name} onChange={(v) => update({ name: v })} mono hint="Used as the key in submissions & the API payload." />
              {PLACEHOLDER_TYPES.includes(field.type) && (
                <TextField
                  label={field.type === 'select' ? 'Empty option text' : 'Placeholder'}
                  value={field.placeholder || ''}
                  onChange={(v) => update({ placeholder: v })}
                />
              )}
              <TextField label="Help text" value={field.helpText || ''} onChange={(v) => update({ helpText: v })} />
            </>
          )}

          {hasOptions && (
            <Labeled label="Options">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(field.options || []).map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input className="sfb-inp" placeholder="Label" value={opt.label} onChange={(e) => updateOption(i, { label: e.target.value, value: opt.value || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') })} style={{ ...inpStyle, flex: 1 }} />
                    <button type="button" onClick={() => removeOption(i)} style={{ width: 28, height: 28, borderRadius: 4, border: `1px solid ${C.n200}`, color: C.n400, background: C.n0, cursor: 'pointer', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash width="14px" height="14px" fill="currentColor" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addOption} style={{ height: 32, border: `1px dashed ${C.n300}`, borderRadius: 4, color: C.p700, font: `600 12px ${FF}`, background: C.p100, cursor: 'pointer' }}>+ Add option</button>
              </div>
            </Labeled>
          )}

          {field.type !== 'divider' && (
            <Labeled label="Width">
              <Seg value={field.width} onChange={(v) => update({ width: v })} />
            </Labeled>
          )}

          <TextField label="CSS class" value={field.cssClass || ''} onChange={(v) => update({ cssClass: v })} placeholder="my-custom-class" />
        </div>
      )}

      {tab === 'validation' && !deco && (
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Required — flag + custom message */}
          <div style={{ border: `1px solid ${C.n200}`, borderRadius: 5, padding: 11, display: 'flex', flexDirection: 'column', gap: 8, background: C.n0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ font: `600 13px ${FF}`, color: C.n800 }}>Required</span>
              <Toggle on={field.required} onClick={() => setRequired(!field.required)} />
            </div>
            {field.required && (
              <input className="sfb-inp" value={reqMsg} placeholder={`${field.label || 'This field'} is required`} onChange={(e) => setReqMsg(e.target.value)} style={inpStyle} />
            )}
          </div>

          {ruleTypes.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ font: `700 11px ${FF}`, letterSpacing: '.5px', textTransform: 'uppercase', color: C.n500 }}>Rules</span>
                <button type="button" onClick={addValidation} style={{ height: 30, padding: '0 10px', borderRadius: 4, border: `1px solid ${C.p200}`, background: C.p100, color: C.p700, font: `600 12px ${FF}`, cursor: 'pointer' }}>+ Add rule</button>
              </div>

              {field.validation.filter((v) => v.type !== 'required').length === 0 && (
                <span style={{ font: `400 12px ${FF}`, color: C.n500, lineHeight: 1.5 }}>No extra rules yet.</span>
              )}

              {field.validation.map((rule, i) => {
                if (rule.type === 'required') return null;
                const used = field.validation.filter((_, j) => j !== i).map((r) => r.type);
                // options = rules valid for this type, minus ones already used (keep current)
                const available = ruleTypes.filter((t) => t === rule.type || !used.includes(t));
                const hasValue = ['minLength', 'maxLength', 'min', 'max', 'pattern'].includes(rule.type);
                return (
                  <div key={i} style={{ border: `1px solid ${C.n200}`, borderRadius: 5, padding: 11, display: 'flex', flexDirection: 'column', gap: 8, background: C.n0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <select className="sfb-inp" value={rule.type} onChange={(e) => updateValidation(i, { type: e.target.value, value: undefined, message: '' })} style={{ ...inpStyle, flex: 1, cursor: 'pointer' }}>
                        {available.map((t) => <option key={t} value={t}>{RULE_LABELS[t]}</option>)}
                      </select>
                      <button type="button" onClick={() => removeValidation(i)} style={{ width: 28, height: 28, borderRadius: 4, border: `1px solid ${C.n200}`, color: C.n400, background: C.n0, cursor: 'pointer', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash width="14px" height="14px" fill="currentColor" />
                      </button>
                    </div>
                    {hasValue && (
                      <input className="sfb-inp" placeholder={rule.type === 'pattern' ? '^[a-z0-9]+$' : 'Value'} value={String(rule.value ?? '')} onChange={(e) => updateValidation(i, { value: e.target.value })} style={{ ...inpStyle, ...(rule.type === 'pattern' ? { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 } : {}) }} />
                    )}
                    <input className="sfb-inp" placeholder="Custom error message (optional)" value={rule.message || ''} onChange={(e) => updateValidation(i, { message: e.target.value })} style={inpStyle} />
                  </div>
                );
              })}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, font: `400 11px ${FF}`, color: C.n500, lineHeight: 1.5 }}>
                <span style={{ color: C.wrn600 }}>⚠</span>Rules run on the public form and in the preview.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
