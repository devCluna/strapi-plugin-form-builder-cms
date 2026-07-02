import React from 'react';
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
import { Trash } from '@strapi/icons';
import { FormField } from '../types';
import { C, FF, isDecorative, typeName } from '../ui';

function DragDots({ active }: { active: boolean }) {
  return (
    <span style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 3px)', gridAutoRows: '3px', gap: 3, cursor: 'grab', flex: 'none' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <i key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: active ? C.p500 : C.n300 }} />
      ))}
    </span>
  );
}

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
  const deco = isDecorative(field.type);

  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        display: 'flex', alignItems: 'center', gap: 16,
        background: selected ? C.p100 : C.n0,
        border: `1px solid ${selected ? C.p600 : C.n150}`,
        borderRadius: 6, padding: '15px 18px', cursor: 'pointer',
        boxShadow: selected ? `0 0 0 1px ${C.p600}` : '0 1px 4px rgba(33,33,52,.1)',
      }}
    >
      <span
        {...attributes}
        {...listeners}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <DragDots active={selected} />
      </span>
      <div style={{ flex: 1, font: `600 15px ${FF}`, color: C.n900, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{field.label || '(no label)'}</span>
        {field.required && <span style={{ color: C.dng600, fontWeight: 700 }}>*</span>}
        <span style={{ fontWeight: 400, color: C.n500 }}>— {typeName(field.type)}</span>
      </div>
      {deco ? (
        <span style={{ font: `600 10px ${FF}`, letterSpacing: '.3px', textTransform: 'uppercase', color: C.wrn700, background: C.wrn100, border: '1px solid #f2d9a6', borderRadius: 4, padding: '3px 7px', flex: 'none' }}>Deco</span>
      ) : (
        <span style={{ font: `600 10px ${FF}`, letterSpacing: '.3px', textTransform: 'uppercase', color: C.n600, background: C.n100, border: `1px solid ${C.n200}`, borderRadius: 4, padding: '3px 7px', flex: 'none' }}>{field.width}</span>
      )}
      <button
        type="button"
        title="Delete field"
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(); }}
        style={{ width: 30, height: 30, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.n400, border: 'none', background: 'none', cursor: 'pointer', flex: 'none' }}
      >
        <Trash width="16px" height="16px" fill="currentColor" />
      </button>
    </div>
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fields.map((field) => (
            <SortableFieldRow
              key={field.id}
              field={field}
              selected={selectedId === field.id}
              onSelect={() => onSelect(field.id)}
              onDelete={() => onDelete(field.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
