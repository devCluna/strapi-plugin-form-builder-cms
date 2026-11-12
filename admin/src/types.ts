import type { FormTheme } from './theme';

export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'phone'
  | 'textarea'
  | 'file'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkbox-group'
  | 'date'
  | 'time'
  | 'url'
  | 'password'
  | 'hidden'
  | 'heading'
  | 'paragraph'
  | 'divider';

export interface FieldOption {
  label: string;
  value: string;
}

export interface ValidationRule {
  type: string;
  value?: any;
  message?: string;
}

export const FILE_DEFAULTS = {
  accept: '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx',
  maxSizeMb: 5,
  multiple: false,
  maxFiles: 3,
};

export interface UploadedFileItem {
  id: number;
  documentId?: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  ext?: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  queryParam?: string;
  accept?: string;
  maxSizeMb?: number;
  multiple?: boolean;
  maxFiles?: number;
  required: boolean;
  order: number;
  width: 'full' | 'half';
  options?: FieldOption[];
  validation: ValidationRule[];
  cssClass?: string;
}

export interface ConditionalRule {
  id: string;
  targetFieldId: string;
  action: 'show' | 'hide';
  logicType: 'all' | 'any';
  conditions: Array<{
    fieldId: string;
    operator: string;
    value: any;
  }>;
}

export interface FormSettings {
  submitButtonText: string;
  successMessage: string;
  enableHoneypot: boolean;
  enableRateLimit: boolean;
  maxSubmissionsPerHour: number;
  notificationEmails: string[];
  redirectUrl: string;
  customCss: string;
  publicPage: boolean;
  captcha?: {
    provider: 'none' | 'turnstile' | 'recaptcha';
    siteKey: string;
    secretKey: string;
  };
  enableStyle?: boolean;
  theme?: FormTheme;
  // resolved --sfb-* vars, baked at edit time so the embed/public page apply them verbatim
  themeVars?: Record<string, string>;
}

export interface Form {
  id: number;
  title: string;
  slug: string;
  description?: string;
  fields: FormField[];
  conditionalLogic: ConditionalRule[];
  settings: FormSettings;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  submissionCount?: number;
}

export interface FormSubmission {
  id: number;
  form: { id: number; title: string; slug: string };
  data: Record<string, any>;
  // schema snapshot captured at submit time (accurate even after the form changes)
  fields?: Array<
    Pick<
      FormField,
      'name' | 'label' | 'type' | 'order' | 'options' | 'accept' | 'maxSizeMb' | 'multiple' | 'maxFiles'
    >
  >;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'new' | 'read' | 'archived';
  createdAt: string;
}
