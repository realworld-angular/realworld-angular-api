import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  UseGuards,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ACCESS_TOKEN_COOKIE_OPTIONS } from './access-token-cookie';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and receive auth cookie' })
  @ApiResponse({
    status: 201,
    description: 'User registered and logged in successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    res.cookie('access_token', result.token, ACCESS_TOKEN_COOKIE_OPTIONS);
    return result.user;
  }

  @Post('register-pizzeria-owner')
  @HttpCode(201)
  @ApiOperation({
    summary:
      'Register as pizzeria owner (PIZZERIA_ADMIN) and receive auth cookie',
  })
  @ApiResponse({
    status: 201,
    description: 'Registered and logged in successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async registerPizzeriaOwner(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerPizzeriaOwner(dto);
    res.cookie('access_token', result.token, ACCESS_TOKEN_COOKIE_OPTIONS);
    return result.user;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login and receive auth cookie' })
  @ApiResponse({ status: 200, description: 'Logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    res.cookie('access_token', result.token, ACCESS_TOKEN_COOKIE_OPTIONS);
    return result.user;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout and clear auth cookie' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { message: 'Logged out' };
  }

  @Get('check-email')
  @ApiOperation({ summary: 'Check if an email is already registered' })
  @ApiQuery({ name: 'email', type: String })
  @ApiResponse({ status: 200, description: 'Email availability status' })
  async checkEmail(@Query('email') email: string) {
    return this.authService.checkEmail(email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  me(@CurrentUser() user: Express.User) {
    return user;
  }
}
