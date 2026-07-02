import React, { useMemo, useState } from 'react';
import { Search } from '@strapi/icons';
import { FieldType } from '../types';
import { C, FF, FIELD_CATEGORIES, FieldIcon } from '../ui';

interface Props {
  onAdd: (type: FieldType) => void;
}

export function FieldPalette({ onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState<FieldType | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FIELD_CATEGORIES;
    return FIELD_CATEGORIES
      .map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <div style={{ width: 232, minWidth: 232, background: C.n0, borderRight: `1px solid ${C.n150}`, overflowY: 'auto', alignSelf: 'stretch', padding: '16px 14px' }}>
      <div style={{ height: 34, border: `1px solid ${C.n200}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', marginBottom: 14 }}>
        <span style={{ color: C.n500, display: 'inline-flex' }}><Search width="14px" height="14px" fill={C.n500} /></span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fields"
          style={{ border: 'none', outline: 'none', flex: 1, font: `400 12px ${FF}`, color: C.n800, background: 'none', width: '100%' }}
        />
      </div>

      {groups.map((grp) => (
        <div key={grp.cat}>
          <div style={{ font: `700 10px ${FF}`, letterSpacing: '.5px', textTransform: 'uppercase', color: C.n500, margin: '14px 4px 8px' }}>{grp.cat}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {grp.items.map((item) => {
              const on = hover === item.type;
              const full = item.type === 'divider';
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => onAdd(item.type)}
                  onMouseEnter={() => setHover(item.type)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    gridColumn: full ? '1 / -1' : undefined,
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 10,
                    border: `1px solid ${on ? C.p500 : C.n200}`, borderRadius: 6,
                    background: on ? C.p100 : C.n0, cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color .1s, background .1s',
                  }}
                >
                  <span style={{ color: on ? C.p600 : C.n600, display: 'inline-flex' }}><FieldIcon type={item.type} size={16} /></span>
                  <span style={{ font: `500 12px ${FF}`, color: C.n800 }}>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
