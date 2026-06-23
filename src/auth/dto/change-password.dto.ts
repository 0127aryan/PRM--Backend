import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { IsPrmPassword } from '../../common/validation/is-prm-password.decorator';

export class ChangePasswordDto {
  @ApiProperty({
    minLength: 8,
    description: 'Existing password (any length already stored)',
  })
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @ApiProperty({
    minLength: 12,
    description: 'At least 12 characters, one number, one special character',
  })
  @IsString()
  @IsPrmPassword()
  newPassword!: string;
}
