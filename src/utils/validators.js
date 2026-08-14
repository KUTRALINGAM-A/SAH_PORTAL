/**
 * Validates Amrita Chennai Roll Number format: AM.CH.U4XXX00000
 * Examples: AM.CH.U4CSE22001, AM.CH.U4AIE23045
 */
export function validateRollNo(rollNo) {
  if (!rollNo) return { valid: false, message: 'Roll number is required.' };
  const pattern = /^AM\.CH\.U4[A-Z]{2,4}\d{5}$/;
  if (!pattern.test(rollNo.toUpperCase())) {
    return {
      valid: false,
      message: 'Invalid Roll ID format. Expected: AM.CH.U4CSE22001'
    };
  }
  return { valid: true, message: '' };
}

/**
 * Validates email format
 */
export function validateEmail(email) {
  if (!email) return { valid: false, message: 'Email is required.' };
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) {
    return { valid: false, message: 'Invalid email format.' };
  }
  return { valid: true, message: '' };
}

/**
 * Validates team name (3-50 chars, alphanumeric + spaces + hyphens)
 */
export function validateTeamName(name) {
  if (!name) return { valid: false, message: 'Team name is required.' };
  if (name.length < 3 || name.length > 50) {
    return { valid: false, message: 'Team name must be 3-50 characters.' };
  }
  const pattern = /^[a-zA-Z0-9\s\-_.]+$/;
  if (!pattern.test(name)) {
    return { valid: false, message: 'Team name can only contain letters, numbers, spaces, hyphens, dots, and underscores.' };
  }
  return { valid: true, message: '' };
}

/**
 * Validates password strength
 */
export function validatePassword(password) {
  if (!password) return { valid: false, message: 'Password is required.' };
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters.' };
  }
  return { valid: true, message: '' };
}

/**
 * Validates URL format
 */
export function validateUrl(url) {
  if (!url) return { valid: true, message: '' }; // Optional
  try {
    new URL(url);
    return { valid: true, message: '' };
  } catch {
    return { valid: false, message: 'Invalid URL format.' };
  }
}

/**
 * Validates phone number (Indian format)
 */
export function validatePhone(phone) {
  if (!phone) return { valid: true, message: '' }; // Optional
  const pattern = /^[+]?[0-9]{10,13}$/;
  if (!pattern.test(phone.replace(/[\s-]/g, ''))) {
    return { valid: false, message: 'Invalid phone number.' };
  }
  return { valid: true, message: '' };
}
