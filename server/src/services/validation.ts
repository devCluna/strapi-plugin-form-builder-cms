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
        fieldErrors.push(reqRule?.message || `${field.label} es obligatorio`);
      }

      if (this.isEmpty(value) && !field.required) continue;

      for (const rule of field.validation || []) {
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
        if (String(value).length < rule.value)
          return rule.message || `Mínimo ${rule.value} caracteres`;
        break;
      case 'maxLength':
        if (String(value).length > rule.value)
          return rule.message || `Máximo ${rule.value} caracteres`;
        break;
      case 'min':
        if (Number(value) < rule.value)
          return rule.message || `El valor mínimo es ${rule.value}`;
        break;
      case 'max':
        if (Number(value) > rule.value)
          return rule.message || `El valor máximo es ${rule.value}`;
        break;
      case 'pattern':
        if (!new RegExp(rule.value).test(String(value)))
          return rule.message || `Formato inválido`;
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)))
          return rule.message || `Email inválido`;
        break;
      case 'url':
        try {
          new URL(String(value));
        } catch {
          return rule.message || `URL inválida`;
        }
        break;
      case 'matchField':
        if (value !== allData[rule.value])
          return rule.message || `Los campos no coinciden`;
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
