import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { ArrowLeft, Check, Pencil, Eye, Duplicate } from '@strapi/icons';
import { v4 as uuid } from 'uuid';
import { FieldPalette } from '../components/FieldPalette';
import { DropZone } from '../components/DropZone';
import { FieldSettingsPanel } from '../components/FieldSettingsPanel';
import { FormPreview } from '../components/FormPreview';
import { EmbedModal } from '../components/EmbedModal';
import { useFormsApi } from '../api';
import { Form, FormField, FormSettings, FieldType } from '../types';
import { PLUGIN_ID } from '../pluginId';

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

function createField(type: FieldType, order: number): FormField {
  return {
    id: uuid(),
    type,
    name: `field_${Date.now()}`,
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
  const api = useFormsApi();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState('New form');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [settings, setSettings] = useState<FormSettings>(DEFAULT_SETTINGS);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

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
      });
    }
  }, [id]);

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
        navigate(`/plugins/${PLUGIN_ID}/builder/${created.id}`, { replace: true });
      } else {
        const updated = await api.updateForm(Number(id), payload);
        setPublishedAt(updated.publishedAt ?? null);
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
        navigate(`/plugins/${PLUGIN_ID}/builder/${created.id}`, { replace: true });
      } else {
        const updated = await api.updateForm(Number(id), payload);
        setPublishedAt(updated.publishedAt ?? now);
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
      <Box padding={4} background="neutral0" style={{ borderBottom: '1px solid var(--strapi-neutral-200)' }}>
        <Flex justifyContent="space-between" alignItems="center">
          <Flex gap={3} alignItems="center">
            <Button
              variant="ghost"
              startIcon={<ArrowLeft />}
              onClick={() => navigate(`/plugins/${PLUGIN_ID}`)}
            >
              Back
            </Button>
            <TextInput
              aria-label="Form title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              style={{ minWidth: 300, fontWeight: 'bold', fontSize: 18 }}
            />
          </Flex>
          <Flex gap={2} alignItems="center">
            <Typography
              variant="pi"
              textColor={publishedAt ? 'success600' : 'warning600'}
              style={{ fontWeight: 600 }}
            >
              {publishedAt ? 'Published' : 'Draft'}
            </Typography>
            {!isNew && (
              <Button
                variant="ghost"
                startIcon={<Duplicate />}
                onClick={() => setShowEmbed(true)}
              >
                Embed
              </Button>
            )}
            <Button
              variant="ghost"
              startIcon={<Eye />}
              onClick={() => setShowPreview(true)}
            >
              Preview
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowSettings((v) => !v)}
            >
              {showSettings ? 'Hide settings' : 'Settings'}
            </Button>
            <Button
              variant="secondary"
              startIcon={<Pencil />}
              onClick={saveDraft}
              loading={saving}
            >
              Save draft
            </Button>
            <Button startIcon={<Check />} onClick={publish} loading={publishing}>
              Publish
            </Button>
          </Flex>
        </Flex>
      </Box>

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

        <Box
          padding={4}
          style={{ flex: 1, overflowY: 'auto', minWidth: 0, alignSelf: 'stretch' }}
        >
          {fields.length === 0 ? (
            <Box
              padding={10}
              background="neutral100"
              hasRadius
              style={{ border: '2px dashed var(--strapi-neutral-300)', textAlign: 'center' }}
            >
              <Typography textColor="neutral500">
                Click on a field in the left panel to add it to the form
              </Typography>
            </Box>
          ) : (
            <DropZone
              fields={fields}
              selectedId={selectedFieldId}
              onSelect={setSelectedFieldId}
              onDelete={deleteField}
              onReorder={reorderFields}
            />
          )}
        </Box>

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
