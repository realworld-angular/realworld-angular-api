import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { existsSync, readdirSync, statSync } from 'fs';
import * as path from 'path';
import { PizzeriasService } from './pizzerias.service';
import { CreatePizzeriaDto } from './dto/create-pizzeria.dto';
import { UpdatePizzeriaDto } from './dto/update-pizzeria.dto';
import { PaginationDto } from './dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums';
import { FEATURE_ACCESS_POLICY } from '../auth/feature-access.policy';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function listImagesInDir(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) return false;
      try {
        return statSync(path.join(dir, name)).isFile();
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.localeCompare(b));
}

function resolvePizzeriasImagesDir(): string {
  const fromRoot = path.join(process.cwd(), 'assets', 'images', 'pizzerias');
  return existsSync(fromRoot)
    ? fromRoot
    : path.join(__dirname, '..', '..', 'assets', 'images', 'pizzerias');
}

@ApiTags('Pizzerias')
@Controller('pizzerias')
export class PizzeriasController {
  constructor(private readonly pizzeriasService: PizzeriasService) {}

  // Public
  @Get()
  @ApiOperation({ summary: 'List all pizzerias (paginated)' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filter by name (case-insensitive substring)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of pizzerias' })
  findAll(@Query() dto: PaginationDto) {
    return this.pizzeriasService.findAll(dto);
  }

  // Admin-only
  @Get('admin/pizzeria')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PIZZERIA_ADMIN)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get the single pizzeria for the current admin' })
  @ApiResponse({ status: 200, description: 'The pizzeria' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'No pizzeria found for this user' })
  findMyPizzeria(@CurrentUser() user: { id: string; role: Role }) {
    return this.pizzeriasService.findMyPizzeria(user.id, user.role);
  }

  @Get('images')
  @ApiOperation({ summary: 'List available pizzeria image filenames' })
  @ApiOkResponse({
    description: 'Sorted basenames under assets/images/pizzerias',
    schema: { type: 'array', items: { type: 'string' } },
  })
  listBundledPizzeriaImages(): string[] {
    return listImagesInDir(resolvePizzeriasImagesDir()).filter(
      (name) => !name.startsWith('banner-'),
    );
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a pizzeria by ID' })
  @ApiResponse({ status: 200, description: 'Pizzeria details' })
  @ApiResponse({ status: 404, description: 'Pizzeria not found' })
  findOne(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.pizzeriasService.findOne(id, user?.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEATURE_ACCESS_POLICY.pizzerias.create)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Create a new pizzeria (admin can only have one)' })
  @ApiResponse({ status: 201, description: 'Pizzeria created' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 409, description: 'Admin already owns a pizzeria' })
  create(@Body() dto: CreatePizzeriaDto, @CurrentUser() user: { id: string }) {
    return this.pizzeriasService.create(dto, user.id);
  }

  @Patch('admin/pizzeria')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEATURE_ACCESS_POLICY.pizzerias.update)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: "Update the admin's pizzeria" })
  @ApiResponse({ status: 200, description: 'Pizzeria updated' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'No pizzeria found for this admin' })
  updateMine(
    @Body() dto: UpdatePizzeriaDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.pizzeriasService.updateMine(dto, user.id);
  }

  @Delete('admin/pizzeria')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEATURE_ACCESS_POLICY.pizzerias.remove)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: "Delete the admin's pizzeria" })
  @ApiResponse({ status: 200, description: 'Pizzeria deleted' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'No pizzeria found for this admin' })
  removeMine(@CurrentUser() user: { id: string }) {
    return this.pizzeriasService.removeMine(user.id);
  }

}
