import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Typography,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Dialog,
  Checkbox,
  Searchbar,
} from '@strapi/design-system';
import {
  Pencil, Trash, Plus, Duplicate, Eye, File,
  Mail, BulletList, Message, Calendar, Feather,
} from '@strapi/icons';
import { useFormsApi } from '../api';
import { Form } from '../types';
import { PLUGIN_ID } from '../pluginId';
import { TEMPLATES, FormTemplate } from '../templates';

const TEMPLATE_ICONS: Record<string, React.ComponentType<any>> = {
  Mail, BulletList, Message, File, Calendar, Feather,
};

// Prototype palette (matches Strapi tokens) — kept inline so the first-run screen
// renders pixel-for-pixel like the design mock rather than DS defaults.
const C = {
  n0: '#ffffff', n100: '#f6f6f9', n200: '#dcdce4', n500: '#8e8ea9',
  n600: '#666687', n900: '#212134', p100: '#f0f0ff', p200: '#d9d8ff',
  p500: '#7b79ff', p600: '#4945ff',
};

function TemplateCard({ tpl, onPick }: { tpl: FormTemplate; onPick: (t: FormTemplate) => void }) {
  const Icon = TEMPLATE_ICONS[tpl.icon] || File;
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onPick(tpl)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4, padding: 16,
        border: `1px solid ${hover ? C.p500 : C.n200}`, borderRadius: 8,
        background: hover ? C.p100 : C.n0, cursor: 'pointer', textAlign: 'left',
        transition: 'border-color .1s, background .1s',
      }}
    >
      <span style={{ color: C.p600, marginBottom: 8, display: 'inline-flex' }}>
        <Icon width="1.4rem" height="1.4rem" fill={C.p600} />
      </span>
      <span style={{ font: `700 14px var(--ff, -apple-system, sans-serif)`, color: C.n900 }}>{tpl.name}</span>
      <span style={{ font: `400 12px var(--ff, -apple-system, sans-serif)`, color: C.n600 }}>{tpl.desc}</span>
    </button>
  );
}

export function FormListPage() {
  const navigate = useNavigate();
  const api = useFormsApi();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getForms();
      setForms(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visibleForms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return forms;
    return forms.filter((f) => f.title.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q));
  }, [forms, query]);

  const allSelected = visibleForms.length > 0 && visibleForms.every((f) => selectedIds.includes(f.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleAll = () =>
    setSelectedIds(allSelected ? [] : visibleForms.map((f) => f.id));

  const toggleOne = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteForm(deleteTarget);
    setDeleteTarget(null);
    load();
  };

  const handleBulkDelete = async () => {
    await Promise.all(selectedIds.map((id) => api.deleteForm(id)));
    setBulkDeleteOpen(false);
    load();
  };

  const handleDuplicate = async (id: number) => {
    await api.duplicateForm(id);
    load();
  };

  const pickTemplate = (tpl: FormTemplate) => {
    setPickerOpen(false);
    navigate(`/plugins/${PLUGIN_ID}/builder/new`, {
      state: { templateFields: tpl.fields(), templateTitle: tpl.title },
    });
  };

  const openLive = (form: Form) => {
    window.open(`/api/${PLUGIN_ID}/page/${form.slug}`, '_blank', 'noopener');
  };

  const templateGrid = (
    <Box
      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
    >
      {TEMPLATES.map((t) => (
        <TemplateCard key={t.key} tpl={t} onPick={pickTemplate} />
      ))}
    </Box>
  );

  return (
    <Box padding={8}>
      <Flex justifyContent="space-between" alignItems="flex-start" marginBottom={6}>
        <Box>
          <Typography variant="alpha" as="h1">Forms</Typography>
          <Box marginTop={1}>
            <Typography variant="epsilon" textColor="neutral600">
              Build, publish and embed forms on any site.
            </Typography>
          </Box>
        </Box>
        <Button startIcon={<Plus />} onClick={() => setPickerOpen(true)}>
          Create form
        </Button>
      </Flex>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : forms.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 20px 44px', margin: '0 auto' }}>
          <div style={{ width: 72, height: 72, marginBottom: 20, borderRadius: 16, background: C.p100, border: `1px solid ${C.p200}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.p500 }}>
            <File width="2.1rem" height="2.1rem" fill={C.p500} />
          </div>
          <div style={{ font: '800 24px var(--ff, -apple-system, sans-serif)', color: C.n900 }}>Build your first form</div>
          <p style={{ font: '400 15px var(--ff, -apple-system, sans-serif)', color: C.n600, lineHeight: 1.6, maxWidth: 460, margin: '10px auto 26px' }}>
            Drag fields onto a canvas, set validation, then publish. Embed on any site or share a public link.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 520, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: C.n200 }} />
            <span style={{ font: '600 11px var(--ff, -apple-system, sans-serif)', letterSpacing: '.5px', textTransform: 'uppercase', color: C.n500 }}>Start from a template</span>
            <div style={{ flex: 1, height: 1, background: C.n200 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 660 }}>
            {TEMPLATES.map((t) => (<TemplateCard key={t.key} tpl={t} onPick={pickTemplate} />))}
          </div>
        </div>
      ) : (
        <>
          <Flex justifyContent="space-between" alignItems="center" marginBottom={4} gap={4}>
            <Box style={{ maxWidth: 320, flex: 1 }}>
              <Searchbar
                name="search"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                onClear={() => setQuery('')}
                clearLabel="Clear search"
                placeholder="Search forms"
              >
                Search forms
              </Searchbar>
            </Box>
            <Typography variant="pi" textColor="neutral600">
              {visibleForms.length} {visibleForms.length === 1 ? 'form' : 'forms'}
            </Typography>
          </Flex>

          {selectedIds.length > 0 && (
            <Flex
              justifyContent="space-between"
              alignItems="center"
              padding={3}
              marginBottom={4}
              background="primary100"
              hasRadius
            >
              <Typography variant="pi" fontWeight="semiBold" textColor="primary700">
                {selectedIds.length} selected
              </Typography>
              <Flex gap={2}>
                <Button
                  variant="danger-light"
                  size="S"
                  startIcon={<Trash />}
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  Delete selected
                </Button>
                <Button variant="tertiary" size="S" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </Flex>
            </Flex>
          )}

          {visibleForms.length === 0 ? (
            <Box padding={10} background="neutral100" hasRadius textAlign="center">
              <Typography variant="beta" textColor="neutral600">
                No forms match “{query}”
              </Typography>
            </Box>
          ) : (
            <Table colCount={7} rowCount={visibleForms.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Checkbox
                      aria-label="Select all"
                      checked={someSelected ? 'indeterminate' : allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </Th>
                  <Th><Typography variant="sigma">Title</Typography></Th>
                  <Th><Typography variant="sigma">Slug</Typography></Th>
                  <Th><Typography variant="sigma">Status</Typography></Th>
                  <Th><Typography variant="sigma">Submissions</Typography></Th>
                  <Th><Typography variant="sigma">Created</Typography></Th>
                  <Th><Typography variant="sigma">Actions</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {visibleForms.map((form) => {
                  const count = form.submissionCount ?? 0;
                  return (
                    <Tr key={form.id}>
                      <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${form.title}`}
                          checked={selectedIds.includes(form.id)}
                          onCheckedChange={() => toggleOne(form.id)}
                        />
                      </Td>
                      <Td><Typography fontWeight="semiBold">{form.title}</Typography></Td>
                      <Td>
                        <Typography textColor="neutral600" style={{ fontFamily: 'monospace' }}>
                          {form.slug}
                        </Typography>
                      </Td>
                      <Td>
                        <Badge active={!!form.publishedAt}>
                          {form.publishedAt ? 'Published' : 'Draft'}
                        </Badge>
                      </Td>
                      <Td>
                        {count > 0 ? (
                          <Typography
                            textColor="primary600"
                            fontWeight="semiBold"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/plugins/${PLUGIN_ID}/submissions/${form.id}`)}
                          >
                            {count}
                          </Typography>
                        ) : (
                          <Typography textColor="neutral400">0</Typography>
                        )}
                      </Td>
                      <Td>
                        <Typography textColor="neutral600">
                          {new Date(form.createdAt).toLocaleDateString()}
                        </Typography>
                      </Td>
                      <Td>
                        <Flex gap={1}>
                          <IconButton
                            label="Edit"
                            onClick={() => navigate(`/plugins/${PLUGIN_ID}/builder/${form.id}`)}
                          >
                            <Pencil />
                          </IconButton>
                          <IconButton
                            label="View submissions"
                            onClick={() => navigate(`/plugins/${PLUGIN_ID}/submissions/${form.id}`)}
                          >
                            <File />
                          </IconButton>
                          {form.publishedAt && form.settings?.publicPage && (
                            <IconButton label="Open live form" onClick={() => openLive(form)}>
                              <Eye />
                            </IconButton>
                          )}
                          <IconButton label="Duplicate" onClick={() => handleDuplicate(form.id)}>
                            <Duplicate />
                          </IconButton>
                          <IconButton label="Delete" onClick={() => setDeleteTarget(form.id)}>
                            <Trash />
                          </IconButton>
                        </Flex>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </>
      )}

      {/* Template picker */}
      {pickerOpen && (
        <Dialog.Root open onOpenChange={() => setPickerOpen(false)}>
          <Dialog.Content>
            <Dialog.Header>Create a form</Dialog.Header>
            <Dialog.Body>
              <Box marginBottom={4}>
                <Typography variant="omega" textColor="neutral600">
                  Start from a template or a blank form — you can change everything later.
                </Typography>
              </Box>
              {templateGrid}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Cancel>
                <Button variant="tertiary">Cancel</Button>
              </Dialog.Cancel>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      )}

      {deleteTarget && (
        <Dialog.Root open onOpenChange={() => setDeleteTarget(null)}>
          <Dialog.Content>
            <Dialog.Header>Confirm delete</Dialog.Header>
            <Dialog.Body>
              <Typography>Are you sure you want to delete this form?</Typography>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Cancel>
                <Button variant="tertiary">Cancel</Button>
              </Dialog.Cancel>
              <Dialog.Action>
                <Button variant="danger" onClick={handleDelete}>Delete</Button>
              </Dialog.Action>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      )}

      {bulkDeleteOpen && (
        <Dialog.Root open onOpenChange={() => setBulkDeleteOpen(false)}>
          <Dialog.Content>
            <Dialog.Header>Confirm delete</Dialog.Header>
            <Dialog.Body>
              <Typography>Delete {selectedIds.length} selected form(s)? This also removes their submissions and cannot be undone.</Typography>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Cancel>
                <Button variant="tertiary">Cancel</Button>
              </Dialog.Cancel>
              <Dialog.Action>
                <Button variant="danger" onClick={handleBulkDelete}>Delete {selectedIds.length}</Button>
              </Dialog.Action>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </Box>
  );
}
