import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import type { JwtAccessPayload } from './interfaces/jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Login with email and password (returns accessToken; also sets httpOnly cookies)',
  })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(
      req.cookies as Record<string, string | undefined>,
      res,
    );
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear auth cookies' })
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(
      req.cookies as Record<string, string | undefined>,
      res,
    );
  }

  @Public()
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'First-time password setup with work email (account must be pending password)',
  })
  setPassword(@Body() dto: SetPasswordDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.setPassword(dto, res);
  }

  @Public()
  @Get('set-password/validate')
  @ApiOperation({
    summary: 'Check whether an email can use first-time password setup',
  })
  validateSetupEligibility(@Query('email') email: string) {
    return this.auth.validateSetupEligibility(email ?? '');
  }

  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user' })
  me(@CurrentUser() user: JwtAccessPayload) {
    return this.auth.getMe(user.sub);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (required when force_password_change is set)' })
  changePassword(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.sub, dto);
  }
}
