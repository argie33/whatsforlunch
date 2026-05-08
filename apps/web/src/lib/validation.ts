export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface ValidationErrors {
  [field: string]: string;
}

export function validateField(value: string, rules: ValidationRule): string | null {
  if (rules.required && !value.trim()) {
    return 'This field is required';
  }

  if (rules.minLength && value.length < rules.minLength) {
    return `Minimum length is ${rules.minLength} characters`;
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return `Maximum length is ${rules.maxLength} characters`;
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    return 'Invalid format';
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

export function validateForm(
  formData: Record<string, string>,
  rules: ValidationRules,
): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const field in rules) {
    const error = validateField(formData[field] || '', rules[field]);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
}

export function isValidPhoneNumber(phone: string): boolean {
  return /^\+?1?\d{9,15}$/.test(phone.replace(/\D/g, ''));
}

export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function formatError(field: string, error: string): string {
  return `${field}: ${error}`;
}

export function getFieldError(errors: ValidationErrors, field: string): string | null {
  return errors[field] || null;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export const commonRules = {
  email: {
    required: true,
    custom: (value: string) => (isValidEmail(value) ? null : 'Invalid email address'),
  },
  password: {
    required: true,
    minLength: 8,
    custom: (value: string) =>
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)
        ? null
        : 'Password must contain uppercase, lowercase, and numbers',
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    custom: (value: string) =>
      isValidUsername(value) ? null : 'Username must be alphanumeric with dashes/underscores',
  },
  phone: {
    required: true,
    custom: (value: string) => (isValidPhoneNumber(value) ? null : 'Invalid phone number'),
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  date: {
    required: true,
    custom: (value: string) => (isValidDate(value) ? null : 'Invalid date'),
  },
  url: {
    required: true,
    custom: (value: string) => (isValidUrl(value) ? null : 'Invalid URL'),
  },
};
