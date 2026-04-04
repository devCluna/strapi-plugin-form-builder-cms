import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  SingleSelect,
  SingleSelectOption,
  Dialog,
} from '@strapi/design-system';
import { ArrowLeft, Trash, Eye } from '@strapi/icons';
import { useFormsApi } from '../api';
import { Form, FormField, FormSubmission } from '../types';
import { PLUGIN_ID } from '../pluginId';

/**
 * Render the submissions management page for a specific form.
 *
 * Loads and displays form metadata, submission list, and statistics; provides controls to filter by status, view submission details, mark submissions as read, and delete submissions.
 *
 * @returns The React element for the Submissions page (table, filters, detail modal, and delete confirmation modal).
 */
export function SubmissionsPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const api = useFormsApi();

  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<FormSubmission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

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
    setLoading(false);
  };

  useEffect(() => { load(); }, [formId, statusFilter]);

  const dataFields: FormField[] = (form?.fields || []).filter(
    (f) => !['heading', 'paragraph', 'divider'].includes(f.type)
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteSubmission(deleteTarget);
    setDeleteTarget(null);
    load();
  };

  const statusColor: Record<string, any> = {
    new: 'success',
    read: 'secondary',
    archived: 'neutral',
  };

  return (
    <Box padding={8}>
      <Flex justifyContent="space-between" alignItems="center" marginBottom={6}>
        <Flex gap={3} alignItems="center">
          <Button
            variant="ghost"
            startIcon={<ArrowLeft />}
            onClick={() => navigate(`/plugins/${PLUGIN_ID}`)}
          >
            Back
          </Button>
          <Typography variant="alpha">
            Submissions — {form?.title || '...'}
          </Typography>
        </Flex>

        <Flex gap={3} alignItems="center">
          {stats && (
            <Flex gap={2}>
              <Badge>Total: {stats.total}</Badge>
              <Badge active>New: {stats.byStatus?.new || 0}</Badge>
            </Flex>
          )}
          <SingleSelect
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(val: string | number) => setStatusFilter(String(val))}
            placeholder="All statuses"
            size="S"
          >
            <SingleSelectOption value="">All</SingleSelectOption>
            <SingleSelectOption value="new">New</SingleSelectOption>
            <SingleSelectOption value="read">Read</SingleSelectOption>
            <SingleSelectOption value="archived">Archived</SingleSelectOption>
          </SingleSelect>
        </Flex>
      </Flex>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : submissions.length === 0 ? (
        <Box padding={10} background="neutral100" borderRadius="4px" style={{ textAlign: 'center' }}>
          <Typography textColor="neutral600">No submissions yet.</Typography>
        </Box>
      ) : (
        <Table colCount={dataFields.length + 4} rowCount={submissions.length}>
          <Thead>
            <Tr>
              <Th><Typography variant="sigma">ID</Typography></Th>
              <Th><Typography variant="sigma">Status</Typography></Th>
              <Th><Typography variant="sigma">Date</Typography></Th>
              {dataFields.map((f) => (
                <Th key={f.id}><Typography variant="sigma">{f.label}</Typography></Th>
              ))}
              <Th><Typography variant="sigma">Actions</Typography></Th>
            </Tr>
          </Thead>
          <Tbody>
            {submissions.map((sub) => (
              <Tr key={sub.id}>
                <Td><Typography>{sub.id}</Typography></Td>
                <Td>
                  <Badge variant={statusColor[sub.status]}>
                    {sub.status}
                  </Badge>
                </Td>
                <Td>
                  <Typography textColor="neutral600">
                    {new Date(sub.createdAt).toLocaleString()}
                  </Typography>
                </Td>
                {dataFields.map((f) => (
                  <Td key={f.id}>
                    <Typography style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {String(sub.data?.[f.name] ?? '')}
                    </Typography>
                  </Td>
                ))}
                <Td>
                  <Flex gap={1}>
                    <IconButton label="View details" onClick={() => setSelected(sub)}>
                      <Eye />
                    </IconButton>
                    <IconButton label="Delete" onClick={() => setDeleteTarget(sub.id)}>
                      <Trash />
                    </IconButton>
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Detail modal */}
      {selected && (
        <Dialog.Root open onOpenChange={() => setSelected(null)}>
          <Dialog.Content>
            <Dialog.Header>Submission #{selected.id}</Dialog.Header>
            <Dialog.Body>
              <div style={{ textAlign: 'left' }}>
                {/* Meta */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  rowGap: 10,
                  columnGap: 16,
                  background: 'var(--strapi-neutral-100)',
                  borderRadius: 6,
                  padding: '12px 16px',
                  marginBottom: 16,
                }}>
                  <Typography variant="pi" fontWeight="semiBold" textColor="neutral500">Status</Typography>
                  <Badge variant={statusColor[selected.status]}>{selected.status.toUpperCase()}</Badge>

                  <Typography variant="pi" fontWeight="semiBold" textColor="neutral500">Date</Typography>
                  <Typography variant="pi">{new Date(selected.createdAt).toLocaleString()}</Typography>

                  <Typography variant="pi" fontWeight="semiBold" textColor="neutral500">IP</Typography>
                  <Typography variant="pi">{selected.ipAddress || '—'}</Typography>
                </div>

                {/* Submitted data */}
                <Typography variant="sigma" textColor="neutral400" style={{ display: 'block', marginBottom: 8 }}>
                  SUBMITTED DATA
                </Typography>
                <div style={{
                  border: '1px solid var(--strapi-neutral-200)',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}>
                  {dataFields.length === 0 ? (
                    <Typography variant="pi" textColor="neutral500" style={{ padding: '12px 16px', display: 'block' }}>
                      No data fields.
                    </Typography>
                  ) : dataFields.map((f, i) => {
                    const val = String(selected.data?.[f.name] ?? '');
                    return (
                      <div key={f.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 1fr',
                        columnGap: 16,
                        padding: '10px 16px',
                        background: i % 2 === 0 ? '#fff' : 'var(--strapi-neutral-100)',
                        alignItems: 'start',
                      }}>
                        <Typography variant="pi" fontWeight="semiBold" textColor="neutral600" style={{ whiteSpace: 'nowrap' }}>
                          {f.label}
                        </Typography>
                        <Typography variant="pi" textColor={val ? 'neutral800' : 'neutral400'}>
                          {val || '—'}
                        </Typography>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Cancel>
                <Button variant="tertiary">Close</Button>
              </Dialog.Cancel>
              <Dialog.Action>
                <Button
                  onClick={async () => {
                    await api.updateSubmissionStatus(selected.id, 'read');
                    setSelected(null);
                    load();
                  }}
                >
                  Mark as read
                </Button>
              </Dialog.Action>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Dialog.Root open onOpenChange={() => setDeleteTarget(null)}>
          <Dialog.Content>
            <Dialog.Header>Confirm delete</Dialog.Header>
            <Dialog.Body>
              <Typography>Delete this submission?</Typography>
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
    </Box>
  );
}
