import React from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';
import { FieldType } from '../types';

interface PaletteItem {
  type: FieldType;
  label: string;
  icon: string;
  group: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Basic
  { type: 'text',     label: 'Text',           icon: '📝', group: 'Basic' },
  { type: 'email',    label: 'Email',           icon: '✉️', group: 'Basic' },
  { type: 'number',   label: 'Number',          icon: '#',  group: 'Basic' },
  { type: 'phone',    label: 'Phone',           icon: '📱', group: 'Basic' },
  { type: 'textarea', label: 'Long text',       icon: '📄', group: 'Basic' },
  { type: 'password', label: 'Password',        icon: '🔒', group: 'Basic' },
  // Selection
  { type: 'select',         label: 'Select',         icon: '▼',  group: 'Selection' },
  { type: 'radio',          label: 'Radio',          icon: '◉',  group: 'Selection' },
  { type: 'checkbox',       label: 'Checkbox',       icon: '☑',  group: 'Selection' },
  { type: 'checkbox-group', label: 'Checkbox group', icon: '☑☑', group: 'Selection' },
  // Advanced
  { type: 'date',   label: 'Date',   icon: '📅', group: 'Advanced' },
  { type: 'time',   label: 'Time',   icon: '🕐', group: 'Advanced' },
  { type: 'url',    label: 'URL',    icon: '🔗', group: 'Advanced' },
  { type: 'hidden', label: 'Hidden', icon: '👁',  group: 'Advanced' },
  // Layout
  { type: 'heading',   label: 'Heading',   icon: 'H', group: 'Layout' },
  { type: 'paragraph', label: 'Paragraph', icon: '¶', group: 'Layout' },
  { type: 'divider',   label: 'Divider',   icon: '—', group: 'Layout' },
];

const GROUPS = ['Basic', 'Selection', 'Advanced', 'Layout'];

interface Props {
  onAdd: (type: FieldType) => void;
}

export function FieldPalette({ onAdd }: Props) {
  return (
    <Box
      padding={4}
      background="neutral100"
      style={{ width: 200, minWidth: 200, overflowY: 'auto', borderRight: '1px solid #ddd' }}
    >
      <Typography variant="sigma" textColor="neutral600" marginBottom={3}>
        FIELDS
      </Typography>
      {GROUPS.map((group) => (
        <Box key={group} marginBottom={4}>
          <Typography variant="pi" fontWeight="bold" textColor="neutral500" marginBottom={2}>
            {group}
          </Typography>
          <Flex direction="column" gap={1}>
            {PALETTE_ITEMS.filter((i) => i.group === group).map((item) => (
              <Box
                key={item.type}
                padding={2}
                background="neutral0"
                style={{
                  cursor: 'pointer',
                  borderRadius: 4,
                  border: '1px solid #e5e5e5',
                  userSelect: 'none',
                }}
                onClick={() => onAdd(item.type)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#f0f0ff';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'white';
                }}
              >
                <Flex gap={2} alignItems="center">
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <Typography variant="pi">{item.label}</Typography>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      ))}
    </Box>
  );
}
