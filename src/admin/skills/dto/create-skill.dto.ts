import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength } from 'class-validator';
import { SkillCategory } from '../../../database/enums';

export class CreateSkillDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiProperty({ enum: SkillCategory })
  @IsEnum(SkillCategory)
  category!: SkillCategory;
}
