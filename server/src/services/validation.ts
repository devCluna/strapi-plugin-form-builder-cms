const PLUGIN_ID = 'strapi-plugin-form-builder-cms';

export interface ValidationRule {
  type: string;
  value?: any;
  message?: string;
}

export interface FormField {
  id: string;
  type: string;
  name: string;
  label: string;
  required: boolean;
  validation?: ValidationRule[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

const validation = {
  validate(fields: FormField[], data: Record<string, any>): ValidationResult {
    const errors: Record<string, string[]> = {};
    const decorative = ['heading', 'paragraph', 'divider', 'hidden'];

    for (const field of fields) {
      if (decorative.includes(field.type)) continue;

      const value = data[field.name];
      const fieldErrors: string[] = [];

      if (field.required && this.isEmpty(value)) {
        const reqRule = field.validation?.find((v) => v.type === 'required');
        fieldErrors.push(reqRule?.message || `${field.label} is required`);
      }

      if (this.isEmpty(value) && !field.required) {
        const hasLengthOrValueRule = (field.validation || []).some((r) =>
          ['minLength', 'min'].includes(r.type)
        );
        if (!hasLengthOrValueRule) continue;
      }

      // auto-validate based on field type
      if (!this.isEmpty(value)) {
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          fieldErrors.push(`${field.label}: enter a valid email address`);
        }
        if (field.type === 'url') {
          try { new URL(String(value)); } catch { fieldErrors.push(`${field.label}: enter a valid URL`); }
        }
        if (field.type === 'number' && isNaN(Number(value))) {
          fieldErrors.push(`${field.label}: enter a valid number`);
        }
      }

      for (const rule of field.validation || []) {
        if (rule.type === 'required') continue; // handled above
        const error = this.runRule(rule, value, field, data);
        if (error) fieldErrors.push(error);
      }

      if (fieldErrors.length > 0) {
        errors[field.name] = fieldErrors;
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  },

  runRule(
    rule: ValidationRule,
    value: any,
    field: FormField,
    allData: Record<string, any>
  ): string | null {
    switch (rule.type) {
      case 'minLength':
        if (String(value).length < Number(rule.value))
          return rule.message || `Minimum ${rule.value} characters`;
        break;
      case 'maxLength':
        if (String(value).length > Number(rule.value))
          return rule.message || `Maximum ${rule.value} characters`;
        break;
      case 'min':
        if (Number(value) < Number(rule.value))
          return rule.message || `Minimum value is ${rule.value}`;
        break;
      case 'max':
        if (Number(value) > Number(rule.value))
          return rule.message || `Maximum value is ${rule.value}`;
        break;
      case 'pattern':
        if (!new RegExp(rule.value).test(String(value)))
          return rule.message || `Invalid format`;
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)))
          return rule.message || `Enter a valid email address`;
        break;
      case 'url':
        try {
          new URL(String(value));
        } catch {
          return rule.message || `Enter a valid URL`;
        }
        break;
      case 'matchField':
        if (value !== allData[rule.value])
          return rule.message || `Fields do not match`;
        break;
    }
    return null;
  },

  isEmpty(value: any): boolean {
    return (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    );
  },
};

export default () => validation;
