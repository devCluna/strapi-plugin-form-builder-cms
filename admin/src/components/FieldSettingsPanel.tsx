import React from 'react';
import {
  Box,
  Flex,
  Typography,
  TextInput,
  Textarea,
  Toggle,
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
    update({ validation: [...field.validation, { type: 'required' }] });
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
      style={{ width: 280, minWidth: 280, overflowY: 'auto', borderLeft: '1px solid #ddd' }}
    >
      <Typography variant="beta" marginBottom={4}>
        Field settings
      </Typography>

      <Flex direction="column" gap={3}>
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

            <Flex justifyContent="space-between" alignItems="center">
              <Typography>Required</Typography>
              <Toggle
                checked={field.required}
                onChange={() => update({ required: !field.required })}
                onLabel="Yes"
                offLabel="No"
              />
            </Flex>

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
              {field.validation.map((rule, i) => (
                <Box key={i} padding={2} background="neutral100" borderRadius="4px">
                  <Flex gap={2} alignItems="center" marginBottom={2}>
                    <Field.Root style={{ flex: 1 }}>
                      <SingleSelect
                        value={rule.type}
                        onChange={(val: string) => updateValidation(i, { type: val })}
                        size="S"
                      >
                        <SingleSelectOption value="required">Required</SingleSelectOption>
                        <SingleSelectOption value="minLength">Min. length</SingleSelectOption>
                        <SingleSelectOption value="maxLength">Max. length</SingleSelectOption>
                        <SingleSelectOption value="min">Min. value</SingleSelectOption>
                        <SingleSelectOption value="max">Max. value</SingleSelectOption>
                        <SingleSelectOption value="email">Email</SingleSelectOption>
                        <SingleSelectOption value="url">URL</SingleSelectOption>
                        <SingleSelectOption value="pattern">Pattern (regex)</SingleSelectOption>
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
              ))}
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
