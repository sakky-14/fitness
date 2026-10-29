import { Controller, Post, Body, Get, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() dto: LoginDto, @Request() req: any) {
    const ipAddress =
      req.headers['x-forwarded-for']?.toString() ||
      req.socket?.remoteAddress ||
      req.ip ||
      'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    return this.authService.login(dto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: { user: any }) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('audit-logs')
  getAuditLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.authService.getAuditLogs(parsedLimit);
  }
}