import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { IsPrmPassword } from '../../common/validation/is-prm-password.decorator';

export class SetPasswordDto {
  @ApiProperty({ example: 'manager@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    minLength: 12,
    description: 'At least 12 characters, one number, one special character',
  })
  @IsString()
  @IsPrmPassword()
  password!: string;
}
