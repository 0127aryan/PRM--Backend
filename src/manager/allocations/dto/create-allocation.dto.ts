import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, Max, Min } from 'class-validator';

export class CreateAllocationDto {
  @ApiProperty({ description: 'Direct report employees.id' })
  @IsInt()
  @Min(1)
  employeeId!: number;

  @ApiProperty({ description: 'Manager-owned project id' })
  @IsInt()
  @Min(1)
  projectId!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  utilizationPct!: number;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  fromDate!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  toDate!: string;
}
