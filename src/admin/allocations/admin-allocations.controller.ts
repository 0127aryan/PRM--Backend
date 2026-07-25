import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import { AdminAllocationsService } from './admin-allocations.service';

@ApiTags('admin/allocations')
@Roles(UserRole.ADMIN)
@Controller('admin/allocations')
export class AdminAllocationsController {
  constructor(private readonly service: AdminAllocationsService) {}

  @Get()
  list() {
    return this.service.list();
  }
}
