import React from 'react';
import {
  Mail, Hashtag, Phone, Link, Lock, BulletList,
  ChevronDown, Check, ListPlus, Calendar, Clock,
} from '@strapi/icons';
import { FieldType } from './types';

// Prototype palette (equal to Strapi tokens) kept inline so the builder renders
// pixel-for-pixel like the design mock rather than DS component defaults.
export const C = {
  n0: '#ffffff', n100: '#f6f6f9', n150: '#eaeaef', n200: '#dcdce4', n300: '#c0c0cf',
  n400: '#a5a5ba', n500: '#8e8ea9', n600: '#666687', n700: '#4a4a6a', n800: '#32324d', n900: '#212134',
  p100: '#f0f0ff', p200: '#d9d8ff', p500: '#7b79ff', p600: '#4945ff', p700: '#271fe0',
  suc500: '#5cb176', suc600: '#328048', suc700: '#2f6846',
  dng100: '#fcecea', dng200: '#f5c0b8', dng600: '#d02b20',
  wrn100: '#fdf4dc', wrn600: '#d9822f', wrn700: '#be5d01',
};

export const FF = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

export interface FieldMeta {
  type: FieldType;
  name: string;
  cat: string;
  deco?: boolean;
}

// Palette structure & labels mirror the prototype (4 categories).
export const FIELD_CATEGORIES: { cat: string; items: FieldMeta[] }[] = [
  { cat: 'Basic', items: [
    { type: 'text', name: 'Text', cat: 'Basic' },
    { type: 'email', name: 'Email', cat: 'Basic' },
    { type: 'number', name: 'Number', cat: 'Basic' },
    { type: 'phone', name: 'Phone', cat: 'Basic' },
    { type: 'url', name: 'URL', cat: 'Basic' },
    { type: 'password', name: 'Password', cat: 'Basic' },
    { type: 'textarea', name: 'Textarea', cat: 'Basic' },
  ]},
  { cat: 'Choice', items: [
    { type: 'select', name: 'Select', cat: 'Choice' },
    { type: 'radio', name: 'Radio', cat: 'Choice' },
    { type: 'checkbox', name: 'Checkbox', cat: 'Choice' },
    { type: 'checkbox-group', name: 'Checkboxes', cat: 'Choice' },
  ]},
  { cat: 'Date & time', items: [
    { type: 'date', name: 'Date', cat: 'Date & time' },
    { type: 'time', name: 'Time', cat: 'Date & time' },
  ]},
  { cat: 'Content', items: [
    { type: 'heading', name: 'Heading', cat: 'Content', deco: true },
    { type: 'paragraph', name: 'Paragraph', cat: 'Content', deco: true },
    { type: 'divider', name: 'Divider', cat: 'Content', deco: true },
  ]},
];

export const DECORATIVE: FieldType[] = ['heading', 'paragraph', 'divider'];
export const isDecorative = (t: FieldType) => DECORATIVE.includes(t);

// Human type name for canvas rows ("— text", "— textarea", …)
const TYPE_NAMES: Partial<Record<FieldType, string>> = {
  'checkbox-group': 'checkboxes',
};
export const typeName = (t: FieldType) => TYPE_NAMES[t] || t;

// Monochrome glyph per field type. Uses @strapi/icons where a match exists and
// styled letters for the ones the icon set has no clean equivalent for (T/H/¶/—/◉).
const ICON_COMPONENTS: Partial<Record<FieldType, React.ComponentType<any>>> = {
  email: Mail, number: Hashtag, phone: Phone, url: Link, password: Lock,
  textarea: BulletList, select: ChevronDown, checkbox: Check,
  'checkbox-group': ListPlus, date: Calendar, time: Clock,
};
const GLYPHS: Partial<Record<FieldType, string>> = {
  text: 'T', radio: '◉', heading: 'H', paragraph: '¶', divider: '—',
};

export function FieldIcon({ type, size = 16 }: { type: FieldType; size?: number }) {
  const Comp = ICON_COMPONENTS[type];
  if (Comp) return React.createElement(Comp, { width: `${size}px`, height: `${size}px`, fill: 'currentColor' });
  const glyph = GLYPHS[type] || '•';
  return React.createElement(
    'span',
    { style: { font: `700 ${size}px ${FF}`, lineHeight: 1, display: 'inline-flex', width: size, justifyContent: 'center' } },
    glyph
  );
}
