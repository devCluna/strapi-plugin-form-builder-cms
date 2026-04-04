import React, { useState } from 'react';
import { Modal, Box, Typography, Button } from '@strapi/design-system';
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
  height: 40,
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
  gap: 4,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: TOKEN.text,
  lineHeight: '16px',
};

const helpStyle: React.CSSProperties = {
  fontSize: 11,
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
      <div style={{ gridColumn: '1 / -1' }}>
        <hr style={{ border: 'none', borderTop: TOKEN.border, margin: '4px 0' }} />
      </div>
    );
  }

  if (field.type === 'heading') {
    return (
      <div style={{ gridColumn: '1 / -1' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: TOKEN.text, margin: 0 }}>{field.label || 'Heading'}</p>
      </div>
    );
  }

  if (field.type === 'paragraph') {
    return (
      <div style={{ gridColumn: '1 / -1' }}>
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

  return <div style={{ gridColumn: `span ${colSpan}` }}>{content}</div>;
}

/* ── modal ──────────────────────────────────────────────────────────── */

interface Props {
  title: string;
  fields: FormField[];
  settings: FormSettings;
  open: boolean;
  onClose: () => void;
}

export function FormPreview({ title, fields, settings, open, onClose }: Props) {
  if (!open) return null;

  return (
    <Modal.Root open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <Modal.Content style={{ maxWidth: 760, width: '100%' }}>
        <Modal.Header>
          <Typography variant="beta">Preview — {title}</Typography>
        </Modal.Header>
        <Modal.Body>
          <Box padding={6} background="neutral0" hasRadius style={{ border: TOKEN.border }}>
            <form onSubmit={(e) => e.preventDefault()}>
              {fields.length === 0 ? (
                <p style={{ textAlign: 'center', color: TOKEN.sub, padding: '32px 0', margin: 0 }}>
                  No fields added yet.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {fields.map((field) => (
                    <PreviewField key={field.id} field={field} />
                  ))}
                </div>
              )}
              {fields.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <button
                    type="submit"
                    style={{
                      background: TOKEN.accent,
                      color: '#fff',
                      border: 'none',
                      borderRadius: TOKEN.radius,
                      padding: '10px 24px',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {settings.submitButtonText || 'Submit'}
                  </button>
                </div>
              )}
            </form>
          </Box>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="tertiary" onClick={onClose}>Close</Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
