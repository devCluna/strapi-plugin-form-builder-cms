import React from 'react';
import { Box, Flex, Typography, IconButton } from '@strapi/design-system';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash, Drag } from '@strapi/icons';
import { FormField } from '../types';

function SortableFieldRow({
  field,
  selected,
  onSelect,
  onDelete,
}: {
  field: FormField;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      padding={3}
      background={selected ? 'primary100' : 'neutral0'}
      borderRadius="4px"
      marginBottom={2}
      onClick={onSelect}
      hasRadius
      style={{
        ...style,
        border: selected ? '2px solid #4945ff' : '1px solid #ddd',
        cursor: 'pointer',
      }}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Flex gap={2} alignItems="center">
          <Box
            {...attributes}
            {...listeners}
            style={{ cursor: 'grab', color: '#aaa', padding: '0 4px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Drag />
          </Box>
          <Box>
            <Typography variant="pi" fontWeight="semiBold">
              {field.label || '(no label)'}
            </Typography>
            <Typography variant="pi" textColor="neutral500">
              {' '}— {field.type}
            </Typography>
          </Box>
        </Flex>
        <IconButton
          label="Delete field"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onDelete();
          }}
          variant="ghost"
        >
          <Trash />
        </IconButton>
      </Flex>
    </Box>
  );
}

interface Props {
  fields: FormField[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fields: FormField[]) => void;
}

export function DropZone({ fields, selectedId, onSelect, onDelete, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      onReorder(arrayMove(fields, oldIndex, newIndex));
    }
  };

  if (fields.length === 0) {
    return (
      <Box
        padding={10}
        background="neutral100"
        borderRadius="4px"
        style={{ border: '2px dashed #ccc', textAlign: 'center', flex: 1 }}
      >
        <Typography textColor="neutral500">
          Click on a field in the left panel to add it to the form
        </Typography>
      </Box>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <Box style={{ flex: 1 }}>
          {fields.map((field) => (
            <SortableFieldRow
              key={field.id}
              field={field}
              selected={selectedId === field.id}
              onSelect={() => onSelect(field.id)}
              onDelete={() => onDelete(field.id)}
            />
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  );
}
