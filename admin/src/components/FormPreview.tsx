import React, { useEffect, useState } from 'react';
import { FormField, FormSettings } from '../types';

/* ── shared tokens ─────────────────────────────────────────────────── */
const TOKEN = {
  border: '1px solid #dcdce4',
  radius: 4,
  accent: '#4945ff',
  text: '#32324d',
  sub: '#666687',
  danger: '#ee5e52',
  bg: '#fff',
  hover: '#f0f0ff',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  border: TOKEN.border,
  borderRadius: TOKEN.radius,
  fontSize: 14,
  color: TOKEN.text,
  background: TOKEN.bg,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
};

const fieldWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: TOKEN.text,
  lineHeight: '18px',
};

const helpStyle: React.CSSProperties = {
  fontSize: 12,
  color: TOKEN.sub,
  margin: 0,
};

function Label({ field }: { field: FormField }) {
  return (
    <span style={labelStyle}>
      {field.label || <em style={{ color: TOKEN.sub }}>No label</em>}
      {field.required && <span style={{ color: TOKEN.danger, marginLeft: 2 }}>*</span>}
    </span>
  );
}

/* ── individual field renderers ────────────────────────────────────── */

function TextField({ field }: { field: FormField }) {
  const typeMap: Record<string, string> = {
    text: 'text', email: 'email', number: 'number', phone: 'tel',
    password: 'password', url: 'url', date: 'date', time: 'time',
  };
  return (
    <div style={fieldWrap}>
      <Label field={field} />
      <input
        type={typeMap[field.type] ?? 'text'}
        placeholder={field.placeholder}
        style={inputBase}
        readOnly
      />
      {field.helpText && <p style={helpStyle}>{field.helpText}</p>}
    </div>
  );
}

function TextareaField({ field }: { field: FormField }) {
  return (
    <div style={fieldWrap}>
      <Label field={field} />
      <textarea
        placeholder={field.placeholder}
        style={{ ...inputBase, height: 88, padding: '8px 12px', resize: 'vertical' }}
        readOnly
      />
      {field.helpText && <p style={helpStyle}>{field.helpText}</p>}
    </div>
  );
}

function SelectField({ field }: { field: FormField }) {
  const [val, setVal] = useState('');
  return (
    <div style={fieldWrap}>
      <Label field={field} />
      <div style={{ position: 'relative' }}>
        <select
          value={val}
          onChange={(e) => setVal(e.target.value)}
          style={{
            ...inputBase,
            appearance: 'none',
            paddingRight: 32,
            cursor: 'pointer',
          }}
        >
          <option value="">{field.placeholder || 'Select an option…'}</option>
          {(field.options || []).map((o, i) => (
            <option key={i} value={o.value}>{o.label || o.value}</option>
          ))}
        </select>
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: TOKEN.sub, fontSize: 10,
        }}>▼</span>
      </div>
      {field.helpText && <p style={helpStyle}>{field.helpText}</p>}
    </div>
  );
}

function RadioField({ field }: { field: FormField }) {
  const [val, setVal] = useState('');
  const options = field.options || [];
  return (
    <div style={fieldWrap}>
      <Label field={field} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
        {options.map((o, i) => {
          const checked = val === o.value;
          return (
            <label
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: TOKEN.text, userSelect: 'none' }}
              onClick={() => setVal(o.value)}
            >
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                border: `2px solid ${checked ? TOKEN.accent : '#c0c0cf'}`,
                background: TOKEN.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'border-color .15s',
              }}>
                {checked && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: TOKEN.accent,
                  }} />
                )}
              </span>
              {o.label || o.value}
            </label>
          );
        })}
      </div>
      {field.helpText && <p style={helpStyle}>{field.helpText}</p>}
    </div>
  );
}

function CheckboxField({ field }: { field: FormField }) {
  const [checked, setChecked] = useState(false);
  return (
    <div style={fieldWrap}>
      <label
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: TOKEN.text, userSelect: 'none' }}
        onClick={() => setChecked((v) => !v)}
      >
        <span style={{
          width: 18, height: 18, borderRadius: 3,
          border: `2px solid ${checked ? TOKEN.accent : '#c0c0cf'}`,
          background: checked ? TOKEN.accent : TOKEN.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all .15s',
        }}>
          {checked && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>}
        </span>
        <span>
          {field.label}
          {field.required && <span style={{ color: TOKEN.danger, marginLeft: 2 }}>*</span>}
        </span>
      </label>
      {field.helpText && <p style={{ ...helpStyle, marginLeft: 28 }}>{field.helpText}</p>}
    </div>
  );
}

function CheckboxGroupField({ field }: { field: FormField }) {
  const [vals, setVals] = useState<Set<string>>(new Set());
  const options = field.options || [];
  const toggle = (v: string) =>
    setVals((prev) => { const s = new Set(prev); s.has(v) ? s.delete(v) : s.add(v); return s; });

  return (
    <div style={fieldWrap}>
      <Label field={field} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
        {options.map((o, i) => {
          const checked = vals.has(o.value);
          return (
            <label
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: TOKEN.text, userSelect: 'none' }}
              onClick={() => toggle(o.value)}
            >
              <span style={{
                width: 18, height: 18, borderRadius: 3,
                border: `2px solid ${checked ? TOKEN.accent : '#c0c0cf'}`,
                background: checked ? TOKEN.accent : TOKEN.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all .15s',
              }}>
                {checked && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>}
              </span>
              {o.label || o.value}
            </label>
          );
        })}
      </div>
      {field.helpText && <p style={helpStyle}>{field.helpText}</p>}
    </div>
  );
}

/* ── dispatcher ─────────────────────────────────────────────────────── */

function PreviewField({ field }: { field: FormField }) {
  const half = field.width === 'half';
  const colSpan = half ? 1 : 2;

  if (field.type === 'hidden') return null;

  if (field.type === 'divider') {
    return (
      <div className={field.cssClass || undefined} style={{ gridColumn: '1 / -1' }}>
        <hr style={{ border: 'none', borderTop: TOKEN.border, margin: '4px 0' }} />
      </div>
    );
  }

  if (field.type === 'heading') {
    return (
      <div className={field.cssClass || undefined} style={{ gridColumn: '1 / -1' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: TOKEN.text, margin: 0 }}>{field.label || 'Heading'}</p>
      </div>
    );
  }

  if (field.type === 'paragraph') {
    return (
      <div className={field.cssClass || undefined} style={{ gridColumn: '1 / -1' }}>
        <p style={{ fontSize: 14, color: TOKEN.sub, margin: 0, lineHeight: 1.6 }}>{field.label || 'Paragraph text'}</p>
      </div>
    );
  }

  let content: React.ReactNode;
  switch (field.type) {
    case 'textarea':      content = <TextareaField field={field} />; break;
    case 'select':        content = <SelectField field={field} />; break;
    case 'radio':         content = <RadioField field={field} />; break;
    case 'checkbox':      content = <CheckboxField field={field} />; break;
    case 'checkbox-group': content = <CheckboxGroupField field={field} />; break;
    default:              content = <TextField field={field} />; break;
  }

  return <div className={field.cssClass || undefined} style={{ gridColumn: `span ${colSpan}` }}>{content}</div>;
}

/* ── modal ──────────────────────────────────────────────────────────── */

interface Props {
  title: string;
  description?: string;
  fields: FormField[];
  settings: FormSettings;
  open: boolean;
  onClose: () => void;
}

/**
 * Render a centered modal preview of the public form (no device toggle, no footer bar).
 * Closes on scrim click, the header ✕, or Escape.
 */
export function FormPreview({ title, description, fields, settings, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(33,33,52,.4)', zIndex: 50 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 660, maxWidth: '96vw', maxHeight: '90vh', background: '#fff', borderRadius: 8, boxShadow: '0 2px 15px rgba(33,33,52,.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 51 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #eaeaef', flex: 'none' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: TOKEN.text, margin: 0, fontFamily: 'inherit' }}>Preview — {title}</h3>
          <button type="button" onClick={onClose} title="Close" style={{ width: 30, height: 30, borderRadius: 5, color: TOKEN.sub, border: 'none', background: 'none', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>

        {/* body */}
        <div style={{ background: '#f5f5f9', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 24 }}>
          <div style={{ width: '100%', background: '#fff', border: '1px solid #eaeaef', borderRadius: 12, padding: '32px 32px 28px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: TOKEN.text, margin: '0 0 8px' }}>{title}</h1>
            {description && <p style={{ fontSize: 14, color: TOKEN.sub, margin: '0 0 22px', lineHeight: 1.55 }}>{description}</p>}
            <form onSubmit={(e) => e.preventDefault()}>
              {fields.length === 0 ? (
                <p style={{ textAlign: 'center', color: TOKEN.sub, padding: '32px 0', margin: 0 }}>No fields added yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  {fields.map((field) => (
                    <PreviewField key={field.id} field={field} />
                  ))}
                </div>
              )}
              {fields.length > 0 && (
                <button
                  type="submit"
                  style={{ marginTop: 26, height: 48, width: '100%', borderRadius: TOKEN.radius, background: TOKEN.accent, color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', border: 'none', cursor: 'pointer' }}
                >
                  {settings.submitButtonText || 'Submit'}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
