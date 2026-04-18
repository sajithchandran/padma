import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   *
   * Exchange user credentials for a JWT.
   * In dev / demo mode this accepts only an email (no password).
   * In production this endpoint is replaced by OIDC callback handling.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ sensitive: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login — obtain a Bearer token' })
  @ApiResponse({ status: 200, description: 'JWT token issued' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account inactive or tenant suspended' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Stateless logout — instructs the client to drop its token.
   * In a production setup this would also revoke the refresh token
   * and call the OIDC provider's end-session endpoint.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — invalidate session on client' })
  async logout() {
    // JWT is stateless — actual invalidation happens on the client.
    // TODO: maintain a token deny-list in Redis for true revocation.
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * GET /api/v1/auth/me
   *
   * Returns the caller's identity from the verified JWT.
   * Useful for the frontend to hydrate the auth store on page refresh
   * without storing sensitive data in localStorage.
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user identity from token' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  async me(@Req() req: Request) {
    const payload = (req as any).jwtPayload;
    if (!payload?.sub) {
      throw new UnauthorizedException('Verified JWT payload missing');
    }

    return { sub: payload.sub, email: payload.email, tenantId: payload.tenantId };
  }
}
