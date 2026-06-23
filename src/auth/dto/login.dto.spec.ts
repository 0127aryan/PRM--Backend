import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto validation', () => {
  it('accepts valid email and password', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'user@xyz.com',
      password: 'Password1!',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid email', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'not-an-email',
      password: 'Password1!',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects short password', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'user@xyz.com',
      password: 'short',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
