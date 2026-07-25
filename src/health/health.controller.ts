import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'API and database health check' })
  async getHealth() {
    const result = await this.healthService.check();

    if (result.database === 'down') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
