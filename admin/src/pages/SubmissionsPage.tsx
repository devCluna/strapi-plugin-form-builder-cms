import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Dialog,
  Checkbox,
} from '@strapi/design-system';
import { ArrowLeft, Search, Cog } from '@strapi/icons';
import { useFormsApi } from '../api';
import { Form, FormField, FormSubmission } from '../types';
import { PLUGIN_ID } from '../pluginId';
import { C, FF } from '../ui';

const STATUS_STYLE: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  new:      { bg: C.p100,   fg: C.p700,   dot: C.p600,   label: 'New' },
  read:     { bg: C.n150,   fg: C.n600,   dot: C.n400,   label: 'Read' },
  archived: { bg: C.wrn100, fg: C.wrn700, dot: C.wrn600, label: 'Archived' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.new;
  return (
    <span style={{ height: 24, padding: '0 9px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 6, font: `700 11px ${FF}`, letterSpacing: '.3px', textTransform: 'uppercase', background: s.bg, color: s.fg }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  );
}

function Stat({ value, label, accent }: { value: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div style={{ background: C.n0, border: `1px solid ${C.n150}`, borderRadius: 6, padding: '9px 16px', minWidth: 96 }}>
      <div style={{ font: `800 22px ${FF}`, color: accent ? C.p600 : C.n900 }}>{value}</div>
      <div style={{ font: `500 11px ${FF}`, color: C.n500, textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</div>
    </div>
  );
}

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'archived', label: 'Archived' },
];

export function SubmissionsPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const api = useFormsApi();

  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [formData, subData, statsData] = await Promise.all([
      api.getForm(Number(formId)),
      api.getSubmissions(Number(formId), statusFilter ? { status: statusFilter } : {}),
      api.getStats(Number(formId)),
    ]);
    setForm(formData);
    setSubmissions(subData?.results || subData || []);
    setStats(statsData);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [formId, statusFilter]);

  // remember hidden columns per form (like Strapi's column picker)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`sfb-cols-${formId}`);
      setHiddenCols(new Set(raw ? JSON.parse(raw) : []));
    } catch { setHiddenCols(new Set()); }
  }, [formId]);

  const toggleCol = (name: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      try { localStorage.setItem(`sfb-cols-${formId}`, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const dataFields: FormField[] = (form?.fields || []).filter(
    (f) => !['heading', 'paragraph', 'divider'].includes(f.type)
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) =>
      String(s.id).includes(q) || JSON.stringify(s.data || {}).toLowerCase().includes(q)
    );
  }, [submissions, query]);

  // Columns = current form fields + any keys still present in submissions (e.g. from
  // fields that were later deleted), so no stored answer is hidden from the table.
  const columns = useMemo(() => {
    const cols: { name: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const f of dataFields) { cols.push({ name: f.name, label: f.label }); seen.add(f.name); }
    for (const s of submissions) {
      const labelByName = new Map((s.fields || []).map((f) => [f.name, f.label] as const));
      for (const k of Object.keys(s.data || {})) {
        if (!seen.has(k)) { seen.add(k); cols.push({ name: k, label: labelByName.get(k) || k }); }
      }
    }
    return cols;
  }, [dataFields, submissions]);

  const shownColumns = columns.filter((c) => !hiddenCols.has(c.name));

  const selIndex = visible.findIndex((s) => s.id === selectedId);
  const selected = selIndex >= 0 ? visible[selIndex] : null;

  const allSelected = visible.length > 0 && visible.every((s) => selectedIds.includes(s.id));
  const someSelected = selectedIds.length > 0 && !allSelected;
  const toggleAll = () => setSelectedIds(allSelected ? [] : visible.map((s) => s.id));
  const toggleOne = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const bulkStatus = async (status: 'read' | 'archived') => {
    await Promise.all(selectedIds.map((id) => api.updateSubmissionStatus(id, status)));
    load();
  };
  const handleBulkDelete = async () => {
    await Promise.all(selectedIds.map((id) => api.deleteSubmission(id)));
    setBulkDeleteOpen(false);
    load();
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteSubmission(deleteTarget);
    setDeleteTarget(null);
    load();
  };
  // keep the drawer open after a status change so the user can keep triaging
  const setStatus = async (id: number, status: string) => {
    await api.updateSubmissionStatus(id, status);
    load();
  };

  // Esc closes the detail drawer
  useEffect(() => {
    if (selectedId == null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await api.exportSubmissions(Number(formId));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions-${form?.slug || formId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const filterLabel = FILTERS.find((f) => f.value === statusFilter)?.label || 'All';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: C.n0, padding: '20px 40px 22px', borderBottom: `1px solid ${C.n150}` }}>
        <div style={{ font: `400 12px ${FF}`, color: C.n500, marginBottom: 6 }}>
          Plugins · Form Builder · {form?.title || '…'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={() => navigate(`/plugins/${PLUGIN_ID}`)} title="Back" style={{ width: 34, height: 34, borderRadius: 4, border: `1px solid ${C.n200}`, background: C.n0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.n600, flex: 'none', cursor: 'pointer' }}>
              <ArrowLeft width="16px" height="16px" fill="currentColor" />
            </button>
            <div>
              <div style={{ font: `800 28px ${FF}`, color: C.n900, letterSpacing: '-.2px' }}>Submissions</div>
              <div style={{ font: `400 13px ${FF}`, color: C.n600, marginTop: 4 }}>
                Responses to “{form?.title || '…'}”.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Stat value={stats?.total ?? 0} label="Total" />
              <Stat value={stats?.byStatus?.new ?? 0} label="New" accent />
            </div>
            <Button variant="tertiary" onClick={handleExport} loading={exporting} disabled={visible.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, background: C.n100, padding: '24px 40px 40px' }}>
        {/* Bulk bar */}
        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.p100, border: `1px solid ${C.p200}`, borderRadius: 6, padding: '10px 16px', marginBottom: 14 }}>
            <span style={{ font: `600 13px ${FF}`, color: C.p700 }}>{selectedIds.length} selected</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <SmallBtn onClick={() => bulkStatus('read')}>Mark as read</SmallBtn>
              <SmallBtn onClick={() => bulkStatus('archived')}>Archive</SmallBtn>
              <SmallBtn danger onClick={() => setBulkDeleteOpen(true)}>Delete</SmallBtn>
              <SmallBtn onClick={() => setSelectedIds([])}>Clear</SmallBtn>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, position: 'relative' }}>
          <div style={{ height: 36, width: 280, border: `1px solid ${C.n200}`, borderRadius: 4, background: C.n0, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px' }}>
            <Search width="14px" height="14px" fill={C.n500} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search submissions" style={{ border: 'none', outline: 'none', flex: 1, font: `400 13px ${FF}`, color: C.n800, background: 'none' }} />
          </div>
          <button type="button" onClick={() => setFilterOpen((v) => !v)} style={{ height: 36, border: `1px solid ${C.n200}`, borderRadius: 4, background: C.n0, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', color: C.n700, font: `500 13px ${FF}`, cursor: 'pointer' }}>
            Status: {filterLabel} <span style={{ color: C.n500, fontSize: 10 }}>▾</span>
          </button>
          {filterOpen && (
            <div style={{ position: 'absolute', top: 44, left: 290, background: C.n0, border: `1px solid ${C.n200}`, borderRadius: 6, boxShadow: '0 2px 15px rgba(33,33,52,.1)', padding: 5, zIndex: 20, minWidth: 150 }}>
              {FILTERS.map((o) => (
                <div
                  key={o.value}
                  onClick={() => { setStatusFilter(o.value); setFilterOpen(false); }}
                  style={{ padding: '8px 10px', borderRadius: 4, font: `500 13px ${FF}`, color: statusFilter === o.value ? C.p700 : C.n700, background: statusFilter === o.value ? C.p100 : 'transparent', fontWeight: statusFilter === o.value ? 600 : 500, cursor: 'pointer' }}
                >
                  {o.label}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button type="button" onClick={() => setColsOpen((v) => !v)} style={{ height: 36, border: `1px solid ${C.n200}`, borderRadius: 4, background: C.n0, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', color: C.n700, font: `500 13px ${FF}`, cursor: 'pointer' }}>
              <Cog width="14px" height="14px" fill={C.n600} /> Columns <span style={{ color: C.n500, fontSize: 10 }}>▾</span>
            </button>
            {colsOpen && (
              <>
                <div onClick={() => setColsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
                <div style={{ position: 'absolute', top: 44, right: 0, background: C.n0, border: `1px solid ${C.n200}`, borderRadius: 6, boxShadow: '0 2px 15px rgba(33,33,52,.1)', padding: 5, zIndex: 20, minWidth: 200, maxHeight: 320, overflowY: 'auto' }}>
                  {columns.length === 0 ? (
                    <div style={{ padding: '8px 10px', font: `400 12px ${FF}`, color: C.n500 }}>No columns yet.</div>
                  ) : columns.map((c) => {
                    const on = !hiddenCols.has(c.name);
                    return (
                      <div key={c.name} onClick={() => toggleCol(c.name)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 4, font: `500 13px ${FF}`, color: C.n700, cursor: 'pointer' }}>
                        <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${on ? C.p600 : C.n300}`, background: on ? C.p600 : C.n0, flex: 'none', position: 'relative' }}>
                          {on && <span style={{ position: 'absolute', left: 4, top: 1, width: 4, height: 8, border: 'solid #fff', borderWidth: '0 2px 2px 0', transform: 'rotate(42deg)' }} />}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <Typography>Loading...</Typography>
        ) : visible.length === 0 ? (
          <div style={{ background: C.n0, border: `1px solid ${C.n150}`, borderRadius: 8, padding: '64px 20px', textAlign: 'center', boxShadow: '0 1px 4px rgba(33,33,52,.1)' }}>
            <div style={{ font: `700 18px ${FF}`, color: C.n900, marginBottom: 6 }}>
              {submissions.length === 0 ? 'No submissions yet' : 'No submissions match'}
            </div>
            <div style={{ font: `400 14px ${FF}`, color: C.n600 }}>
              {submissions.length === 0
                ? 'Responses will appear here once the form is live and people start submitting.'
                : 'Try a different status filter or search term.'}
            </div>
          </div>
        ) : (
          <Box background="neutral0" hasRadius style={{ border: `1px solid ${C.n150}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(33,33,52,.1)' }}>
            <Table colCount={shownColumns.length + 5} rowCount={visible.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Checkbox aria-label="Select all" checked={someSelected ? 'indeterminate' : allSelected} onCheckedChange={toggleAll} />
                  </Th>
                  <Th><Typography variant="sigma">ID</Typography></Th>
                  <Th><Typography variant="sigma">Status</Typography></Th>
                  <Th><Typography variant="sigma">Received</Typography></Th>
                  {shownColumns.map((c) => (
                    <Th key={c.name}><Typography variant="sigma">{c.label}</Typography></Th>
                  ))}
                  <Th><Typography variant="sigma">Actions</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {visible.map((sub) => (
                  <Tr key={sub.id} onClick={() => setSelectedId(sub.id)} style={{ cursor: 'pointer' }}>
                    <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Checkbox aria-label={`Select submission ${sub.id}`} checked={selectedIds.includes(sub.id)} onCheckedChange={() => toggleOne(sub.id)} />
                    </Td>
                    <Td><Typography textColor="neutral500">#{sub.id}</Typography></Td>
                    <Td><StatusBadge status={sub.status} /></Td>
                    <Td><Typography textColor="neutral600">{new Date(sub.createdAt).toLocaleString()}</Typography></Td>
                    {shownColumns.map((c) => {
                      const raw = sub.data?.[c.name];
                      const val = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '');
                      return (
                        <Td key={c.name}>
                          <Typography style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {val}
                          </Typography>
                        </Td>
                      );
                    })}
                    <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <button type="button" onClick={() => setSelectedId(sub.id)} style={{ width: 28, height: 28, borderRadius: 4, border: `1px solid ${C.n200}`, background: C.n0, color: C.n500, cursor: 'pointer' }}>›</button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </div>

      {/* Detail drawer (right slide-over) */}
      {selected && (
        <>
          <div onClick={() => setSelectedId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(33,33,52,.4)', zIndex: 40 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 452, maxWidth: '100vw', background: C.n0, boxShadow: '-10px 0 50px rgba(33,33,52,.22)', display: 'flex', flexDirection: 'column', zIndex: 41 }}>
            {/* header */}
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.n150}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <h3 style={{ font: `800 20px ${FF}`, color: C.n900, margin: 0, whiteSpace: 'nowrap' }}>Submission #{selected.id}</h3>
                <span style={{ font: `400 12px ${FF}`, color: C.n500 }}>{selIndex + 1} of {visible.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <NavBtn label="Previous" disabled={selIndex <= 0} onClick={() => setSelectedId(visible[selIndex - 1].id)}>‹</NavBtn>
                <NavBtn label="Next" disabled={selIndex >= visible.length - 1} onClick={() => setSelectedId(visible[selIndex + 1].id)}>›</NavBtn>
                <button type="button" onClick={() => setSelectedId(null)} title="Close" style={{ width: 30, height: 30, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.n500, border: 'none', background: 'none', cursor: 'pointer', fontSize: 15 }}>✕</button>
              </div>
            </div>

            {/* body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <div style={{ flex: 1, background: C.n0, border: `1px solid ${C.n150}`, borderRadius: 6, padding: '9px 12px' }}>
                  <div style={{ font: `500 11px ${FF}`, color: C.n500, textTransform: 'uppercase', letterSpacing: '.3px' }}>Received</div>
                  <div style={{ font: `700 12px ${FF}`, color: C.n900, marginTop: 6 }}>{new Date(selected.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ flex: 1, background: C.n0, border: `1px solid ${C.n150}`, borderRadius: 6, padding: '9px 12px' }}>
                  <div style={{ font: `500 11px ${FF}`, color: C.n500, textTransform: 'uppercase', letterSpacing: '.3px' }}>IP address</div>
                  <div style={{ font: `600 12px ui-monospace, Menlo, monospace`, color: C.n700, marginTop: 6, wordBreak: 'break-all' }}>{selected.ipAddress || '—'}</div>
                </div>
              </div>

              <div style={{ font: `600 12px ${FF}`, color: C.n700, marginBottom: 8 }}>Submitted data</div>
              <div style={{ border: `1px solid ${C.n200}`, borderRadius: 6, overflow: 'hidden' }}>
                {(() => {
                  // Always render what was actually stored in `data` — never hide an
                  // answer. Field defs (submit-time snapshot, else current form) only
                  // supply nicer labels/order; unknown keys fall back to the raw key.
                  const defs = selected.fields?.length ? selected.fields : dataFields;
                  const labelByName = new Map(defs.map((f) => [f.name, f.label] as const));
                  const orderByName = new Map(defs.map((f, i) => [f.name, f.order ?? i] as const));
                  const entries = Object.entries(selected.data || {})
                    .sort((a, b) => (orderByName.get(a[0]) ?? 999) - (orderByName.get(b[0]) ?? 999));
                  return entries.length === 0 ? (
                    <div style={{ padding: '12px 16px', font: `400 12px ${FF}`, color: C.n500 }}>No data.</div>
                  ) : entries.map(([name, raw], i) => {
                    const val = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '');
                    return (
                      <div key={name || i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', columnGap: 16, padding: '10px 16px', background: i % 2 === 0 ? C.n0 : C.n100, alignItems: 'baseline' }}>
                        <span style={{ font: `600 12px ${FF}`, color: C.n600, wordBreak: 'break-word' }}>{labelByName.get(name) || name}</span>
                        <span style={{ font: `400 13px ${FF}`, color: val ? C.n800 : C.n400, lineHeight: 1.5, wordBreak: 'break-word' }}>{val || '—'}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* footer */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.n150}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="danger-light" onClick={() => { setDeleteTarget(selected.id); setSelectedId(null); }}>Delete</Button>
              <Button variant="secondary" onClick={() => setStatus(selected.id, 'archived')}>Archive</Button>
              <Button onClick={() => setStatus(selected.id, selected.status === 'new' ? 'read' : 'new')}>
                {selected.status === 'new' ? 'Mark as read' : 'Mark as new'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Dialog.Root open onOpenChange={() => setDeleteTarget(null)}>
          <Dialog.Content>
            <Dialog.Header>Confirm delete</Dialog.Header>
            <Dialog.Body><Typography>Delete this submission?</Typography></Dialog.Body>
            <Dialog.Footer>
              <Dialog.Cancel><Button variant="tertiary">Cancel</Button></Dialog.Cancel>
              <Dialog.Action><Button variant="danger" onClick={handleDelete}>Delete</Button></Dialog.Action>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      )}

      {/* Bulk delete confirm */}
      {bulkDeleteOpen && (
        <Dialog.Root open onOpenChange={() => setBulkDeleteOpen(false)}>
          <Dialog.Content>
            <Dialog.Header>Confirm delete</Dialog.Header>
            <Dialog.Body><Typography>Delete {selectedIds.length} selected submission(s)? This cannot be undone.</Typography></Dialog.Body>
            <Dialog.Footer>
              <Dialog.Cancel><Button variant="tertiary">Cancel</Button></Dialog.Cancel>
              <Dialog.Action><Button variant="danger" onClick={handleBulkDelete}>Delete {selectedIds.length}</Button></Dialog.Action>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </div>
  );
}

function NavBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{ width: 30, height: 30, borderRadius: 5, border: `1px solid ${C.n200}`, background: C.n0, color: C.n600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </button>
  );
}

function SmallBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ height: 32, padding: '0 12px', borderRadius: 4, font: `600 12px ${FF}`, cursor: 'pointer', background: C.n0, color: danger ? C.dng600 : C.n800, border: `1px solid ${danger ? C.dng200 : C.n200}` }}
    >
      {children}
    </button>
  );
}
