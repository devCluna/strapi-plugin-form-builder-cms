import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Typography,
  TextInput,
  Toggle,
  Loader,
  Field,
} from '@strapi/design-system';
import { ArrowLeft, Pencil } from '@strapi/icons';
import { v4 as uuid } from 'uuid';
import { FieldPalette } from '../components/FieldPalette';
import { DropZone } from '../components/DropZone';
import { FieldSettingsPanel } from '../components/FieldSettingsPanel';
import { FormPreview } from '../components/FormPreview';
import { EmbedModal } from '../components/EmbedModal';
import { useFormsApi } from '../api';
import { Form, FormField, FormSettings, FieldType } from '../types';
import { PLUGIN_ID } from '../pluginId';
import { C, FF } from '../ui';

const DEFAULT_SETTINGS: FormSettings = {
  submitButtonText: 'Submit',
  successMessage: 'Form submitted successfully',
  enableHoneypot: true,
  enableRateLimit: true,
  maxSubmissionsPerHour: 60,
  notificationEmails: [],
  redirectUrl: '',
  customCss: '',
  publicPage: false,
};

function HeaderBtn({ variant, onClick, disabled, children }: {
  variant: 'ghost' | 'sec' | 'pri'; onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    ghost: { background: C.n0, color: C.n800, border: `1px solid ${C.n200}` },
    sec: { background: C.p100, color: C.p700, border: `1px solid ${C.p200}` },
    pri: { background: C.p600, color: '#fff', border: '1px solid transparent' },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ height: 32, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', font: `600 12px ${FF}`, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap', ...styles[variant] }}
    >
      {children}
    </button>
  );
}

function createField(type: FieldType, order: number): FormField {
  const id = uuid();
  return {
    id,
    type,
    // unique per-field name derived from the uuid — Date.now() collided for fields added in the same ms
    name: `${type}_${id.slice(0, 8)}`,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    placeholder: '',
    helpText: '',
    required: false,
    order,
    width: 'full',
    options: ['select', 'radio', 'checkbox-group'].includes(type)
      ? [{ label: 'Option 1', value: 'option_1' }]
      : undefined,
    validation: [],
  };
}

export function FormBuilderPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const api = useFormsApi();
  const isNew = !id || id === 'new';
  // seed a brand-new form from a template chosen on the list page (router state)
  const seed = (location.state || {}) as { templateFields?: FormField[]; templateTitle?: string };

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState(seed.templateTitle || 'New form');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>(seed.templateFields || []);
  const [settings, setSettings] = useState<FormSettings>(DEFAULT_SETTINGS);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(isNew);

  // dirty tracking: compare live state against the last saved/loaded snapshot
  const savedRef = useRef<string>('');
  const snapshot = () => JSON.stringify({ title, description, fields, settings });
  const markSaved = () => { savedRef.current = snapshot(); };

  useEffect(() => {
    if (!isNew && id) {
      api.getForm(Number(id)).then((form: Form) => {
        setTitle(form.title);
        setDescription(form.description || '');
        setFields(form.fields || []);
        setSettings({ ...DEFAULT_SETTINGS, ...(form.settings || {}) });
        setPublishedAt(form.publishedAt ?? null);
        setSlug(form.slug ?? null);
        setLoading(false);
        savedRef.current = JSON.stringify({
          title: form.title,
          description: form.description || '',
          fields: form.fields || [],
          settings: { ...DEFAULT_SETTINGS, ...(form.settings || {}) },
        });
      });
    } else {
      markSaved(); // fresh empty form is not dirty
    }
  }, [id]);

  const dirty = snapshot() !== savedRef.current;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const goBack = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    navigate(`/plugins/${PLUGIN_ID}`);
  };

  const addField = useCallback((type: FieldType) => {
    const newField = createField(type, fields.length);
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  }, [fields.length]);

  const updateField = useCallback((updated: FormField) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);

  const deleteField = useCallback((fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    setSelectedFieldId((prev) => (prev === fieldId ? null : prev));
  }, []);

  const reorderFields = useCallback((reordered: FormField[]) => {
    setFields(reordered.map((f, i) => ({ ...f, order: i })));
  }, []);

  const saveDraft = async () => {
    setSaving(true);
    try {
      const payload = { title, description, fields, settings, conditionalLogic: [], publishedAt: null };
      if (isNew) {
        const created = await api.createForm(payload);
        setPublishedAt(null);
        setSlug(created.slug ?? null);
        markSaved();
        navigate(`/plugins/${PLUGIN_ID}/builder/${created.id}`, { replace: true });
      } else {
        const updated = await api.updateForm(Number(id), payload);
        setPublishedAt(updated.publishedAt ?? null);
        markSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const now = new Date().toISOString();
      const payload = { title, description, fields, settings, conditionalLogic: [], publishedAt: now };
      if (isNew) {
        const created = await api.createForm(payload);
        setPublishedAt(created.publishedAt ?? now);
        setSlug(created.slug ?? null);
        markSaved();
        navigate(`/plugins/${PLUGIN_ID}/builder/${created.id}`, { replace: true });
      } else {
        const updated = await api.updateForm(Number(id), payload);
        setPublishedAt(updated.publishedAt ?? now);
        markSaved();
      }
    } finally {
      setPublishing(false);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

  if (loading) {
    return (
      <Flex justifyContent="center" padding={10}>
        <Loader>Loading form...</Loader>
      </Flex>
    );
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ background: C.n0, borderBottom: `1px solid ${C.n150}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <button type="button" onClick={goBack} title="Back" style={{ width: 34, height: 34, borderRadius: 4, border: `1px solid ${C.n200}`, background: C.n0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.n600, flex: 'none', cursor: 'pointer' }}>
            <ArrowLeft width="16px" height="16px" fill="currentColor" />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {editingTitle ? (
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false); }}
                  style={{ font: `700 18px ${FF}`, color: C.n900, border: `1px solid ${C.p500}`, borderRadius: 4, padding: '1px 6px', outline: 'none', width: 220 }}
                />
              ) : (
                <>
                  <b style={{ font: `700 18px ${FF}`, color: C.n900, whiteSpace: 'nowrap' }}>{title}</b>
                  <button type="button" onClick={() => setEditingTitle(true)} title="Rename" style={{ display: 'inline-flex', color: C.n400, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                    <Pencil width="13px" height="13px" fill="currentColor" />
                  </button>
                </>
              )}
            </div>
            <div style={{ font: `400 11px ${FF}`, color: C.n500 }}>
              {fields.length} {fields.length === 1 ? 'field' : 'fields'} · {publishedAt ? 'published' : 'draft'}
            </div>
          </div>
          <span style={{ height: 24, padding: '0 9px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 6, font: `700 11px ${FF}`, letterSpacing: '.3px', textTransform: 'uppercase', background: publishedAt ? '#eafbe7' : C.n150, color: publishedAt ? C.suc700 : C.n700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: publishedAt ? C.suc600 : C.n500 }} />
            {publishedAt ? 'Published' : 'Draft'}
          </span>
          {/* ponytail: version chip is display-only until version history (backend) lands */}
          <span title="Version history — coming soon" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 30, padding: '0 11px', border: `1px solid ${C.n200}`, borderRadius: 6, background: C.n0, font: `600 12px ${FF}`, color: C.n700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.n400 }} />
            {publishedAt ? 'Published' : 'v1 · editing'}
            <span style={{ color: C.n500, fontSize: 10 }}>▾</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeaderBtn variant="ghost" onClick={() => setShowSettings((v) => !v)}>Settings</HeaderBtn>
          <HeaderBtn variant="ghost" onClick={() => setShowPreview(true)}>Preview</HeaderBtn>
          {!isNew && <HeaderBtn variant="ghost" onClick={() => setShowEmbed(true)}>Embed</HeaderBtn>}
          <HeaderBtn variant="sec" onClick={saveDraft} disabled={saving}>Save draft</HeaderBtn>
          <HeaderBtn variant="pri" onClick={publish} disabled={publishing}>Publish</HeaderBtn>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <Box padding={4} background="primary100" style={{ borderBottom: '1px solid var(--strapi-primary-200)' }}>
          <Flex gap={4} alignItems="flex-start" style={{ flexWrap: 'wrap' }}>
            <Field.Root style={{ minWidth: 300 }}>
              <Field.Label>Description</Field.Label>
              <TextInput
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Submit button</Field.Label>
              <TextInput
                value={settings.submitButtonText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings((s) => ({ ...s, submitButtonText: e.target.value }))
                }
              />
            </Field.Root>
            <Field.Root style={{ minWidth: 300 }}>
              <Field.Label>Success message</Field.Label>
              <TextInput
                value={settings.successMessage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings((s) => ({ ...s, successMessage: e.target.value }))
                }
              />
            </Field.Root>
            <Flex gap={4} alignItems="center">
              <Flex alignItems="center" gap={2}>
                <Toggle
                  checked={settings.enableHoneypot}
                  onChange={() =>
                    setSettings((s) => ({ ...s, enableHoneypot: !s.enableHoneypot }))
                  }
                  onLabel="Yes"
                  offLabel="No"
                />
                <Typography variant="pi">Honeypot anti-spam</Typography>
              </Flex>
              <Flex alignItems="center" gap={2}>
                <Toggle
                  checked={settings.publicPage}
                  onChange={() =>
                    setSettings((s) => ({ ...s, publicPage: !s.publicPage }))
                  }
                  onLabel="Yes"
                  offLabel="No"
                />
                <Typography variant="pi">Public page</Typography>
              </Flex>
            </Flex>
          </Flex>

        </Box>
      )}

      {/* Public page bar */}
      {settings.publicPage && slug && (
        <Box
          paddingTop={2}
          paddingBottom={2}
          paddingLeft={4}
          paddingRight={4}
          background="success100"
          style={{ borderBottom: '1px solid var(--strapi-success-200)', flexShrink: 0 }}
        >
          <Flex alignItems="center" gap={2}>
            <Typography variant="pi" textColor="success700" fontWeight="semiBold">
              Public URL:
            </Typography>
            <Typography variant="pi" textColor="success600" style={{ fontFamily: 'monospace' }}>
              {window.location.origin}/api/strapi-plugin-form-builder-cms/page/{slug}
            </Typography>
            <Button
              variant="ghost"
              size="S"
              onClick={() => window.open(`${window.location.origin}/api/strapi-plugin-form-builder-cms/page/${slug}`, '_blank')}
            >
              Open
            </Button>
          </Flex>
        </Box>
      )}

      {/* Main area */}
      <Flex style={{ flex: 1, minHeight: 0 }}>
        <FieldPalette onAdd={addField} />

        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, alignSelf: 'stretch', background: C.n100, padding: '28px 32px 60px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 860 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <b style={{ font: `700 15px ${FF}`, color: C.n900 }}>Fields</b>
              <span style={{ font: `400 11px ${FF}`, color: C.n500 }}>
                {fields.length} {fields.length === 1 ? 'field' : 'fields'}{fields.length > 0 ? ' · drag to reorder' : ''}
              </span>
            </div>

            {fields.length === 0 ? (
              <div style={{ background: C.n0, border: `1.5px dashed ${C.n300}`, borderRadius: 8, padding: '56px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                <b style={{ font: `700 15px ${FF}`, color: C.n900 }}>No fields yet</b>
                <span style={{ font: `400 13px ${FF}`, color: C.n500 }}>Click a field type in the palette to add it here.</span>
              </div>
            ) : (
              <DropZone
                fields={fields}
                selectedId={selectedFieldId}
                onSelect={setSelectedFieldId}
                onDelete={deleteField}
                onReorder={reorderFields}
              />
            )}

            <button
              type="button"
              onClick={() => addField('text')}
              style={{ width: '100%', height: 46, border: `1.5px dashed ${C.n300}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.p700, font: `600 13px ${FF}`, background: 'transparent', marginTop: 10, cursor: 'pointer' }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add a text field
            </button>
          </div>
        </div>

        {selectedField && (
          <FieldSettingsPanel
            field={selectedField}
            onChange={updateField}
          />
        )}
      </Flex>

      <FormPreview
        title={title}
        fields={fields}
        settings={settings}
        open={showPreview}
        onClose={() => setShowPreview(false)}
      />

      {!isNew && (
        <EmbedModal
          formId={id!}
          open={showEmbed}
          onClose={() => setShowEmbed(false)}
        />
      )}
    </Box>
  );
}
