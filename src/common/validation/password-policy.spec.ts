import { isPrmPassword, PASSWORD_MIN_LENGTH } from './password-policy';

describe('password-policy', () => {
  it('accepts a valid password', () => {
    expect(isPrmPassword('Manager@1234')).toBe(true);
  });

  it('rejects short passwords', () => {
    expect(isPrmPassword('Short1!')).toBe(false);
    expect(PASSWORD_MIN_LENGTH).toBe(12);
  });

  it('rejects passwords without a number', () => {
    expect(isPrmPassword('NoNumberHere!@')).toBe(false);
  });

  it('rejects passwords without a special character', () => {
    expect(isPrmPassword('NoSpecial1234')).toBe(false);
  });
});
