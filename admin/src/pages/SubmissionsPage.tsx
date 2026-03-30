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
            onChange={(val: string) => setStatusFilter(val)}
            placeholder="All statuses"
            size="S"
          >
            <SingleSelectOption value="">All</SingleSelectOption>
            <SingleSelectOption value="new">New</SingleSelectOption>
            <SingleSelectOption value="read">Read</SingleSelectOption>
            <SingleSelectOption value="archived">Archived</SingleSelectOption>
          </SingleSelect>
          <Button
            variant="secondary"
            size="S"
            onClick={() => window.open(
              `/strapi-plugin-form-builder-cms/submissions/${formId}/export?format=csv`,
              '_blank'
            )}
          >
            Export CSV
          </Button>
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
              <Flex direction="column" gap={2}>
                <Flex gap={2}>
                  <Typography fontWeight="bold">Status:</Typography>
                  <Badge>{selected.status}</Badge>
                </Flex>
                <Flex gap={2}>
                  <Typography fontWeight="bold">Date:</Typography>
                  <Typography>{new Date(selected.createdAt).toLocaleString()}</Typography>
                </Flex>
                <Flex gap={2}>
                  <Typography fontWeight="bold">IP:</Typography>
                  <Typography>{selected.ipAddress || '—'}</Typography>
                </Flex>
                <Box marginTop={3}>
                  <Typography variant="beta" marginBottom={2}>Data</Typography>
                  {dataFields.map((f) => (
                    <Flex key={f.id} gap={2} marginBottom={1}>
                      <Typography fontWeight="semiBold" style={{ minWidth: 120 }}>
                        {f.label}:
                      </Typography>
                      <Typography>{String(selected.data?.[f.name] ?? '—')}</Typography>
                    </Flex>
                  ))}
                </Box>
              </Flex>
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
