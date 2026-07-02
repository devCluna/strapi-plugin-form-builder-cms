export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'phone'
  | 'textarea'
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

export interface FormField {
  id: string;
  type: FieldType;
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
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
  fields?: Array<Pick<FormField, 'name' | 'label' | 'type' | 'order' | 'options'>>;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'new' | 'read' | 'archived';
  createdAt: string;
}
