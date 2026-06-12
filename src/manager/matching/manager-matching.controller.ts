import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/enums';
import type { JwtAccessPayload } from '../../auth/interfaces/jwt-payload.interface';
import { MatchingSearchDto } from './dto/matching-search.dto';
import { ManagerMatchingService } from './manager-matching.service';

@ApiTags('manager/matching')
@Roles(UserRole.MANAGER)
@Controller('manager/matching')
export class ManagerMatchingController {
  constructor(private readonly service: ManagerMatchingService) {}

  @Post('search')
  @ApiOperation({
    summary: 'AI or keyword skill search (ranked matches + reasons) for allocate',
  })
  search(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: MatchingSearchDto,
  ) {
    return this.service.search(user, dto);
  }
}
