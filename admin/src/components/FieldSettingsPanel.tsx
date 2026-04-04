import React from 'react';
import {
  Box,
  Flex,
  Typography,
  TextInput,
  Textarea,
  Button,
  IconButton,
  Field,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { Plus, Trash } from '@strapi/icons';
import { FormField, FieldOption, ValidationRule } from '../types';

interface Props {
  field: FormField;
  onChange: (updated: FormField) => void;
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  size,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  size?: 'S' | 'M';
}) {
  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <TextInput
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        size={size}
      />
    </Field.Root>
  );
}

/**
 * Render the settings panel UI for editing a single form field.
 *
 * Displays controls for label, name, placeholder, help text, required/width toggles,
 * type-specific inputs (heading, paragraph), option management (add/update/remove),
 * validation rule management (add/update/remove) with value/message editing, and CSS class.
 *
 * @param field - The current FormField to edit.
 * @param onChange - Callback invoked with the updated FormField whenever a change is made.
 * @returns A React element containing the field settings panel UI.
 */
export function FieldSettingsPanel({ field, onChange }: Props) {
  const update = (patch: Partial<FormField>) => onChange({ ...field, ...patch });

  const addOption = () => {
    const options = [...(field.options || []), { label: '', value: '' }];
    update({ options });
  };

  const updateOption = (index: number, patch: Partial<FieldOption>) => {
    const options = (field.options || []).map((o, i) =>
      i === index ? { ...o, ...patch } : o
    );
    update({ options });
  };

  const removeOption = (index: number) => {
    update({ options: (field.options || []).filter((_, i) => i !== index) });
  };

  const addValidation = () => {
    const usedTypes = field.validation.map((r) => r.type);
    const defaultType =
      field.type === 'number'  ? (usedTypes.includes('min') ? (usedTypes.includes('max') ? 'pattern' : 'max') : 'min') :
      field.type === 'email'   ? (usedTypes.includes('email') ? 'minLength' : 'email') :
      field.type === 'url'     ? (usedTypes.includes('url')   ? 'minLength' : 'url')   :
      usedTypes.includes('minLength') ? (usedTypes.includes('maxLength') ? 'pattern' : 'maxLength') : 'minLength';
    update({ validation: [...field.validation, { type: defaultType }] });
  };

  const updateValidation = (index: number, patch: Partial<ValidationRule>) => {
    const validation = field.validation.map((v, i) =>
      i === index ? { ...v, ...patch } : v
    );
    update({ validation });
  };

  const removeValidation = (index: number) => {
    update({ validation: field.validation.filter((_, i) => i !== index) });
  };

  const hasOptions = ['select', 'radio', 'checkbox-group'].includes(field.type);
  const isDecorative = ['heading', 'paragraph', 'divider'].includes(field.type);

  return (
    <Box
      padding={4}
      background="neutral0"
      style={{ width: 280, minWidth: 280, overflowY: 'auto', alignSelf: 'stretch', borderLeft: '1px solid var(--strapi-neutral-200)' }}
    >
      <Typography variant="beta" marginBottom={4}>
        Field settings
      </Typography>

      <Flex direction="column" gap={3} alignItems="stretch">
        {!isDecorative && (
          <>
            <LabeledInput
              label="Label"
              value={field.label}
              onChange={(v) => update({ label: v })}
            />
            <LabeledInput
              label="Name (technical)"
              value={field.name}
              onChange={(v) => update({ name: v })}
            />
            <LabeledInput
              label="Placeholder"
              value={field.placeholder || ''}
              onChange={(v) => update({ placeholder: v })}
            />
            <LabeledInput
              label="Help text"
              value={field.helpText || ''}
              onChange={(v) => update({ helpText: v })}
            />

            <Box>
              <Typography variant="pi" fontWeight="semiBold" marginBottom={1}>
                Required
              </Typography>
              <Flex gap={2}>
                <Button
                  variant={!field.required ? 'default' : 'secondary'}
                  size="S"
                  onClick={() => update({ required: false })}
                >
                  No
                </Button>
                <Button
                  variant={field.required ? 'default' : 'secondary'}
                  size="S"
                  onClick={() => update({ required: true })}
                >
                  Yes
                </Button>
              </Flex>
            </Box>

            <Box>
              <Typography variant="pi" fontWeight="semiBold" marginBottom={1}>
                Width
              </Typography>
              <Flex gap={2}>
                <Button
                  variant={field.width === 'full' ? 'default' : 'secondary'}
                  size="S"
                  onClick={() => update({ width: 'full' })}
                >
                  Full
                </Button>
                <Button
                  variant={field.width === 'half' ? 'default' : 'secondary'}
                  size="S"
                  onClick={() => update({ width: 'half' })}
                >
                  Half
                </Button>
              </Flex>
            </Box>
          </>
        )}

        {field.type === 'heading' && (
          <LabeledInput
            label="Heading text"
            value={field.label}
            onChange={(v) => update({ label: v })}
          />
        )}

        {field.type === 'paragraph' && (
          <Field.Root>
            <Field.Label>Content</Field.Label>
            <Textarea
              value={field.label}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                update({ label: e.target.value })
              }
            />
          </Field.Root>
        )}

        {hasOptions && (
          <Box>
            <Flex justifyContent="space-between" alignItems="center" marginBottom={2}>
              <Typography variant="pi" fontWeight="semiBold">Options</Typography>
              <Button size="S" variant="secondary" startIcon={<Plus />} onClick={addOption}>
                Add
              </Button>
            </Flex>
            <Flex direction="column" gap={2}>
              {(field.options || []).map((opt, i) => (
                <Flex key={i} gap={2} alignItems="center">
                  <TextInput
                    aria-label="Label"
                    placeholder="Label"
                    value={opt.label}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateOption(i, { label: e.target.value })
                    }
                  />
                  <TextInput
                    aria-label="Value"
                    placeholder="Value"
                    value={opt.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateOption(i, { value: e.target.value })
                    }
                  />
                  <IconButton label="Delete" onClick={() => removeOption(i)} variant="ghost">
                    <Trash />
                  </IconButton>
                </Flex>
              ))}
            </Flex>
          </Box>
        )}

        {!isDecorative && (
          <Box>
            <Flex justifyContent="space-between" alignItems="center" marginBottom={2}>
              <Typography variant="pi" fontWeight="semiBold">Validations</Typography>
              <Button size="S" variant="secondary" startIcon={<Plus />} onClick={addValidation}>
                Add
              </Button>
            </Flex>
            <Flex direction="column" gap={2}>
              {field.validation.map((rule, i) => {
                const usedTypes = field.validation
                  .filter((_, j) => j !== i)
                  .map((r) => r.type);

                const isNumber = field.type === 'number';
                const isEmail  = field.type === 'email';
                const isUrl    = field.type === 'url';

                const available = [
                  !isNumber && { value: 'minLength', label: 'Min. length' },
                  !isNumber && { value: 'maxLength', label: 'Max. length' },
                  isNumber  && { value: 'min',       label: 'Min. value'  },
                  isNumber  && { value: 'max',       label: 'Max. value'  },
                  !isEmail  && { value: 'email',     label: 'Email'       },
                  !isUrl    && { value: 'url',       label: 'URL'         },
                  { value: 'pattern', label: 'Pattern (regex)' },
                ].filter((opt): opt is { value: string; label: string } =>
                  !!opt && (opt.value === rule.type || !usedTypes.includes(opt.value))
                );

                return (
                <Box key={i} padding={2} background="neutral100" hasRadius>
                  <Flex gap={2} alignItems="center" marginBottom={2}>
                    <Field.Root style={{ flex: 1 }}>
                      <SingleSelect
                        value={rule.type}
                        onChange={(val: string | number) => updateValidation(i, { type: String(val), value: undefined, message: '' })}
                        size="S"
                      >
                        {available.map((opt) => (
                          <SingleSelectOption key={opt.value} value={opt.value}>
                            {opt.label}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                    </Field.Root>
                    <IconButton label="Delete" onClick={() => removeValidation(i)} variant="ghost">
                      <Trash />
                    </IconButton>
                  </Flex>
                  {['minLength', 'maxLength', 'min', 'max', 'pattern'].includes(rule.type) && (
                    <LabeledInput
                      label="Value"
                      value={String(rule.value ?? '')}
                      onChange={(v) => updateValidation(i, { value: v })}
                      size="S"
                    />
                  )}
                  <LabeledInput
                    label="Error message"
                    value={rule.message || ''}
                    onChange={(v) => updateValidation(i, { message: v })}
                    placeholder="Custom message (optional)"
                    size="S"
                  />
                </Box>
                );
              })}
            </Flex>
          </Box>
        )}

        <LabeledInput
          label="CSS class"
          value={field.cssClass || ''}
          onChange={(v) => update({ cssClass: v })}
          placeholder="my-custom-class"
        />
      </Flex>
    </Box>
  );
}
