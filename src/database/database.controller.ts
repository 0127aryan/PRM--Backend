import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { DatabaseService } from './database.service';

@ApiTags('Database')
@Public()
@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Schema and migration status (tables present, migrations applied)',
  })
  getStatus() {
    return this.databaseService.getStatus();
  }
}
