import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { EmployeeSkillInputDto } from './create-employee.dto';

export class SetEmployeeSkillsDto {
  @ApiProperty({ type: [EmployeeSkillInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeSkillInputDto)
  skills!: EmployeeSkillInputDto[];
}
