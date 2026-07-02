import { v4 as uuid } from 'uuid';
import { FieldType, FormField } from './types';

// Minimal field factory for seeding templates — mirrors createField() in FormBuilderPage
// but lets each template override label/name/required/width/options.
type Seed = Partial<FormField> & { type: FieldType };

function mk(seed: Seed, order: number): FormField {
  const id = uuid();
  const opts = seed.options?.map((o) =>
    typeof o === 'string' ? { label: o, value: String(o).toLowerCase().replace(/[^a-z0-9]+/g, '_') } : o
  );
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
    options: opts,
    validation: [],
  };
}

const build = (seeds: Seed[]): FormField[] => seeds.map((s, i) => mk(s, i));

export interface FormTemplate {
  key: string;
  name: string;
  desc: string;
  icon: string; // @strapi/icons name
  title: string;
  fields: () => FormField[];
}

export const TEMPLATES: FormTemplate[] = [
  {
    key: 'contact', name: 'Contact us', desc: 'Name, email, message', icon: 'Mail', title: 'Contact us',
    fields: () => build([
      { type: 'text', label: 'First name', name: 'firstName', required: true, width: 'half', placeholder: 'Jane' },
      { type: 'text', label: 'Last name', name: 'lastName', required: true, width: 'half', placeholder: 'Okafor' },
      { type: 'email', label: 'Email', name: 'email', required: true, placeholder: 'jane@acme.co' },
      { type: 'textarea', label: 'Message', name: 'message', required: true, placeholder: 'How can we help?' },
    ]),
  },
  {
    key: 'newsletter', name: 'Newsletter', desc: 'Email + consent', icon: 'BulletList', title: 'Newsletter signup',
    fields: () => build([
      { type: 'email', label: 'Email', name: 'email', required: true, placeholder: 'you@company.com' },
      { type: 'checkbox', label: 'Send me occasional product updates', name: 'consent', required: true },
    ]),
  },
  {
    key: 'feedback', name: 'Feedback', desc: 'Rating + comments', icon: 'Message', title: 'Feedback',
    fields: () => build([
      { type: 'radio', label: 'How would you rate us?', name: 'rating', required: true, options: ['Excellent', 'Good', 'Okay', 'Poor'] as any },
      { type: 'textarea', label: 'What can we improve?', name: 'comments', placeholder: 'Tell us more…' },
    ]),
  },
  {
    key: 'application', name: 'Job application', desc: 'Contact + cover note', icon: 'Feather', title: 'Job application',
    fields: () => build([
      { type: 'text', label: 'Full name', name: 'name', required: true },
      { type: 'email', label: 'Email', name: 'email', required: true, width: 'half' },
      { type: 'phone', label: 'Phone', name: 'phone', width: 'half' },
      { type: 'url', label: 'Portfolio / LinkedIn', name: 'portfolio' },
      { type: 'textarea', label: 'Cover note', name: 'coverNote', placeholder: 'Why are you a great fit?' },
    ]),
  },
  {
    key: 'rsvp', name: 'Event RSVP', desc: 'Attendance + guests', icon: 'Calendar', title: 'Event RSVP',
    fields: () => build([
      { type: 'text', label: 'Full name', name: 'name', required: true },
      { type: 'radio', label: 'Will you attend?', name: 'attending', required: true, options: ['Yes, I’ll be there', 'No, can’t make it'] as any },
      { type: 'number', label: 'Number of guests', name: 'guests', width: 'half', placeholder: '0' },
    ]),
  },
  {
    key: 'blank', name: 'Blank form', desc: 'Start from scratch', icon: 'File', title: 'Untitled form',
    fields: () => [],
  },
];
