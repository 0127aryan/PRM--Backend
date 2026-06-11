import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../../database/enums';

export class CreateUserDto {
  @ApiProperty({ example: 'user@xyz.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLOYEE })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ description: 'Defaults to email if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;
}
