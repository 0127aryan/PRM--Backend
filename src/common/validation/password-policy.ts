/** Shared PRM password rules (aligned with frontend Set Password screen). */

export const PASSWORD_MIN_LENGTH = 12;

const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

export function isPrmPassword(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  return (
    value.length >= PASSWORD_MIN_LENGTH &&
    HAS_NUMBER.test(value) &&
    HAS_SPECIAL.test(value)
  );
}

export const PRM_PASSWORD_MESSAGE =
  'Password must be at least 12 characters and include a number and a special character';
