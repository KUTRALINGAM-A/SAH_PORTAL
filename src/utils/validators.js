/**
 * Validates Amrita Roll Number format: CH.EN.U4[DEPT][YEAR][NUMBER] or CH.SC.U4[DEPT][YEAR][NUMBER]
 * Examples: CH.EN.U4ARE23008, CH.SC.U4CSE23244
 */
export function validateRollNo(rollNo) {
  if (!rollNo) return { valid: false, message: 'Roll number is required.' };
  const pattern = /^CH\.(EN|SC)\.U4[A-Z]{2,4}\d{5}$/i;
  if (!pattern.test(rollNo.trim())) {
    return {
      valid: false,
      message: 'Invalid Roll ID format. Expected format: CH.EN.U4ARE23008 or CH.SC.U4CSE23244'
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
  if (!pattern.test(email.trim())) {
    return { valid: false, message: 'Invalid email format.' };
  }
  return { valid: true, message: '' };
}

/**
 * Validates College Mail ID format (Mandatory)
 */
export function validateCollegeEmail(collegeEmail) {
  if (!collegeEmail) return { valid: false, message: 'College Mail ID is required.' };
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(collegeEmail.trim())) {
    return { valid: false, message: 'Invalid College Mail ID format.' };
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
 * Validates phone number (Mandatory, Indian format)
 */
export function validatePhone(phone) {
  if (!phone || !phone.trim()) return { valid: false, message: 'Phone number is required.' };
  const pattern = /^[+]?[0-9]{10,13}$/;
  if (!pattern.test(phone.trim().replace(/[\s-]/g, ''))) {
    return { valid: false, message: 'Invalid phone number (min 10 digits).' };
  }
  return { valid: true, message: '' };
}
