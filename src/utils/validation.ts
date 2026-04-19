// ---------------------------------------------------------------------------
// Validation utilities — auth forms
// ---------------------------------------------------------------------------

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0=empty, 1=weak, 2=fair, 3=good, 4=strong
  label: 'Weak' | 'Fair' | 'Good' | 'Strong' | '';
  checks: {
    length: boolean;      // ≥ 8 chars
    uppercase: boolean;   // A-Z
    lowercase: boolean;   // a-z
    digit: boolean;       // 0-9
    symbol: boolean;      // special char
  };
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: '', checks: { length: false, uppercase: false, lowercase: false, digit: false, symbol: false } };
  }

  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit:     /[0-9]/.test(password),
    symbol:    /[^A-Za-z0-9]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;

  if (passed <= 1) return { score: 1, label: 'Weak',   checks };
  if (passed === 2) return { score: 2, label: 'Fair',   checks };
  if (passed === 3) return { score: 3, label: 'Good',   checks };
  return             { score: 4, label: 'Strong', checks };
}

export function isPasswordValid(password: string): boolean {
  const { checks } = getPasswordStrength(password);
  return checks.length && checks.uppercase && checks.lowercase && checks.digit && checks.symbol;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailValid(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export interface AuthFieldErrors {
  email?: string;
  password?: string;
}

export function validateAuthFields(email: string, password: string, isRegistering: boolean): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!isEmailValid(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (isRegistering && !isPasswordValid(password)) {
    errors.password = 'Password must be at least 8 characters and include uppercase, lowercase, a digit, and a symbol.';
  }

  return errors;
}
