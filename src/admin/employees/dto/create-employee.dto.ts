import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Proficiency } from '../../../database/enums';

export class EmployeeSkillInputDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  skillId!: number;

  @ApiProperty({ enum: Proficiency })
  @IsEnum(Proficiency)
  proficiency!: Proficiency;
}

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Existing users.id (MANAGER or EMPLOYEE role)' })
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({ example: 'EMP-001' })
  @IsString()
  @MaxLength(32)
  employeeCode!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  fullName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  department!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  designation!: string;

  @ApiPropertyOptional({ description: 'Manager users.id — required for EMPLOYEE role users' })
  @IsOptional()
  @IsInt()
  @Min(1)
  reportingManagerId?: number;

  @ApiPropertyOptional({ type: [EmployeeSkillInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeSkillInputDto)
  skills?: EmployeeSkillInputDto[];
}
