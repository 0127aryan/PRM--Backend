import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import type { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ManagerAllocationsService } from './manager-allocations.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { EndAllocationDto } from './dto/end-allocation.dto';

@ApiTags('manager/allocations')
@Roles(UserRole.MANAGER)
@Controller('manager/allocations')
export class ManagerAllocationsController {
  constructor(private readonly service: ManagerAllocationsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: CreateAllocationDto,
  ) {
    return this.service.create(user, dto);
  }

  @Patch(':id/end')
  @HttpCode(HttpStatus.OK)
  end(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EndAllocationDto,
  ) {
    return this.service.end(user, id, dto);
  }
}
