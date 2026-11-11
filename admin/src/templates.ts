import { v4 as uuid } from 'uuid';
import { FieldType, FormField } from './types';
import type { TFunction } from './utils/useT';

// Minimal field factory for seeding templates — mirrors createField() in FormBuilderPage
// but lets each template override label/name/required/width/options.
type Seed = Partial<FormField> & { type: FieldType };

function mk(seed: Seed, order: number): FormField {
  const id = uuid();
  return {
    id,
    type: seed.type,
    name: seed.name || `${seed.type}_${id.slice(0, 8)}`,
    label: seed.label || seed.type.charAt(0).toUpperCase() + seed.type.slice(1),
    placeholder: seed.placeholder || '',
    helpText: seed.helpText || '',
    required: seed.required ?? false,
    order,
    width: seed.width || 'full',
    options: seed.options,
    validation: [],
  };
}

const build = (seeds: Seed[]): FormField[] => seeds.map((s, i) => mk(s, i));

export type TemplateKey = 'contact' | 'newsletter' | 'feedback' | 'application' | 'rsvp' | 'blank';

export interface FormTemplate {
  key: TemplateKey;
  icon: string; // @strapi/icons name
  // text (name / description / form title / field labels) comes from the translations —
  // `t` is the admin's translator so seeded content matches the admin language
  fields: (t: TFunction) => FormField[];
}

export const TEMPLATES: FormTemplate[] = [
  {
    key: 'contact', icon: 'Mail',
    fields: (t) => build([
      { type: 'text', label: t('templates.contact.firstName'), name: 'firstName', required: true, width: 'half', placeholder: t('templates.contact.firstNamePlaceholder') },
      { type: 'text', label: t('templates.contact.lastName'), name: 'lastName', required: true, width: 'half', placeholder: t('templates.contact.lastNamePlaceholder') },
      { type: 'email', label: t('templates.field.email'), name: 'email', required: true, placeholder: 'jane@acme.co' },
      { type: 'textarea', label: t('templates.contact.message'), name: 'message', required: true, placeholder: t('templates.contact.messagePlaceholder') },
    ]),
  },
  {
    key: 'newsletter', icon: 'BulletList',
    fields: (t) => build([
      { type: 'email', label: t('templates.field.email'), name: 'email', required: true, placeholder: 'you@company.com' },
      { type: 'checkbox', label: t('templates.newsletter.consent'), name: 'consent', required: true },
    ]),
  },
  {
    key: 'feedback', icon: 'Message',
    fields: (t) => build([
      { type: 'radio', label: t('templates.feedback.rating'), name: 'rating', required: true, options: [
        { label: t('templates.feedback.excellent'), value: 'excellent' },
        { label: t('templates.feedback.good'), value: 'good' },
        { label: t('templates.feedback.okay'), value: 'okay' },
        { label: t('templates.feedback.poor'), value: 'poor' },
      ] },
      { type: 'textarea', label: t('templates.feedback.comments'), name: 'comments', placeholder: t('templates.feedback.commentsPlaceholder') },
    ]),
  },
  {
    key: 'application', icon: 'Feather',
    fields: (t) => build([
      { type: 'text', label: t('templates.field.fullName'), name: 'name', required: true },
      { type: 'email', label: t('templates.field.email'), name: 'email', required: true, width: 'half' },
      { type: 'phone', label: t('templates.application.phone'), name: 'phone', width: 'half' },
      { type: 'url', label: t('templates.application.portfolio'), name: 'portfolio' },
      { type: 'textarea', label: t('templates.application.coverNote'), name: 'coverNote', placeholder: t('templates.application.coverNotePlaceholder') },
    ]),
  },
  {
    key: 'rsvp', icon: 'Calendar',
    fields: (t) => build([
      { type: 'text', label: t('templates.field.fullName'), name: 'name', required: true },
      { type: 'radio', label: t('templates.rsvp.attending'), name: 'attending', required: true, options: [
        { label: t('templates.rsvp.yes'), value: 'yes' },
        { label: t('templates.rsvp.no'), value: 'no' },
      ] },
      { type: 'number', label: t('templates.rsvp.guests'), name: 'guests', width: 'half', placeholder: '0' },
    ]),
  },
  {
    key: 'blank', icon: 'File',
    fields: () => [],
  },
];
