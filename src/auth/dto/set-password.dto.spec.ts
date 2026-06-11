import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetPasswordDto } from './set-password.dto';

describe('SetPasswordDto validation', () => {
  it('accepts a policy-compliant password with email', async () => {
    const dto = plainToInstance(SetPasswordDto, {
      email: 'manager@company.com',
      password: 'SecurePass1!',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects password shorter than 12 characters', async () => {
    const dto = plainToInstance(SetPasswordDto, {
      email: 'manager@company.com',
      password: 'Short1!',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects password without a special character', async () => {
    const dto = plainToInstance(SetPasswordDto, {
      email: 'manager@company.com',
      password: 'NoSpecial1234',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid email', async () => {
    const dto = plainToInstance(SetPasswordDto, {
      email: 'not-an-email',
      password: 'SecurePass1!',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
