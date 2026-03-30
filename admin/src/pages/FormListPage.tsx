import React, { useEffect, useState } from 'react';
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
} from '@strapi/design-system';
import { Pencil, Trash, Plus, Duplicate, Eye } from '@strapi/icons';
import { useFormsApi } from '../api';
import { Form } from '../types';
import { PLUGIN_ID } from '../pluginId';

export function FormListPage() {
  const navigate = useNavigate();
  const api = useFormsApi();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getForms();
      setForms(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteForm(deleteTarget);
    setDeleteTarget(null);
    load();
  };

  const handleDuplicate = async (id: number) => {
    await api.duplicateForm(id);
    load();
  };

  return (
    <Box padding={8}>
      <Flex justifyContent="space-between" alignItems="center" marginBottom={6}>
        <Typography variant="alpha">Form Builder</Typography>
        <Button startIcon={<Plus />} onClick={() => navigate(`/plugins/${PLUGIN_ID}/builder/new`)}>
          Create form
        </Button>
      </Flex>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : forms.length === 0 ? (
        <Box padding={10} background="neutral100" borderRadius="4px" textAlign="center">
          <Typography variant="beta" textColor="neutral600">
            No forms yet. Create your first one.
          </Typography>
        </Box>
      ) : (
        <Table colCount={5} rowCount={forms.length}>
          <Thead>
            <Tr>
              <Th><Typography variant="sigma">Title</Typography></Th>
              <Th><Typography variant="sigma">Slug</Typography></Th>
              <Th><Typography variant="sigma">Status</Typography></Th>
              <Th><Typography variant="sigma">Created</Typography></Th>
              <Th><Typography variant="sigma">Actions</Typography></Th>
            </Tr>
          </Thead>
          <Tbody>
            {forms.map((form) => (
              <Tr key={form.id}>
                <Td><Typography fontWeight="semiBold">{form.title}</Typography></Td>
                <Td><Typography textColor="neutral600">{form.slug}</Typography></Td>
                <Td>
                  <Badge active={!!form.publishedAt}>
                    {form.publishedAt ? 'Published' : 'Draft'}
                  </Badge>
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
                      <Eye />
                    </IconButton>
                    <IconButton label="Duplicate" onClick={() => handleDuplicate(form.id)}>
                      <Duplicate />
                    </IconButton>
                    <IconButton
                      label="Delete"
                      onClick={() => setDeleteTarget(form.id)}
                    >
                      <Trash />
                    </IconButton>
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
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
    </Box>
  );
}
