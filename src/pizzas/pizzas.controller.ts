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
  NotFoundException,
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
import { PizzasService } from './pizzas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePizzaDto } from './dto/create-pizza.dto';
import { UpdatePizzaDto } from './dto/update-pizza.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums';

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

function resolvePizzasImagesDir(): string {
  const fromRoot = path.join(process.cwd(), 'assets', 'images', 'pizzas');
  return existsSync(fromRoot)
    ? fromRoot
    : path.join(__dirname, '..', '..', 'assets', 'images', 'pizzas');
}

@ApiTags('Pizzas')
@Controller()
export class PizzasController {
  constructor(
    private readonly pizzasService: PizzasService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveAdminPizzeriaId(
    userId: string,
    _role: Role,
  ): Promise<string> {
    const pizzeria = await this.prisma.pizzeria.findFirst({
      where: { ownerId: userId },
    });
    if (!pizzeria) throw new NotFoundException('You do not own a pizzeria');
    return pizzeria.id;
  }

  @Get('pizzas/images')
  @ApiOperation({ summary: 'List available pizza image filenames' })
  @ApiOkResponse({
    description: 'Sorted basenames under assets/images/pizzas',
    schema: { type: 'array', items: { type: 'string' } },
  })
  listBundledPizzaImages(): string[] {
    return listImagesInDir(resolvePizzasImagesDir());
  }

  @Get('options/sizes')
  @ApiOperation({ summary: 'List all pizza size options' })
  @ApiResponse({ status: 200, description: 'List of pizza sizes' })
  findAllSizeOptions() {
    return this.pizzasService.findAllSizeOptions();
  }

  @Get('options/toppings')
  @ApiOperation({ summary: 'List all pizza topping options' })
  @ApiResponse({ status: 200, description: 'List of pizza toppings' })
  findAllToppingOptions() {
    return this.pizzasService.findAllToppingOptions();
  }

  @Get('pizzerias/:pizzeriaId/pizzas')
  @ApiOperation({ summary: 'List pizzas for a pizzeria' })
  @ApiQuery({
    name: 'name',
    required: false,
    description:
      'Filter pizzas whose name contains this string (case-insensitive)',
  })
  @ApiResponse({ status: 200, description: 'List of pizzas' })
  findAll(
    @Param('pizzeriaId') pizzeriaId: string,
    @Query('name') name?: string,
  ) {
    return this.pizzasService.findAll(pizzeriaId, name);
  }

  // Admin routes — no pizzeriaId needed, resolved from ownership
  @Get('admin/my-pizzeria/pizzas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PIZZERIA_ADMIN)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: "List pizzas for the admin's pizzeria" })
  @ApiResponse({ status: 200, description: 'List of pizzas' })
  async findAllMine(
    @CurrentUser() user: { id: string; role: Role },
    @Query('name') name?: string,
  ) {
    const pizzeriaId = await this.resolveAdminPizzeriaId(user.id, user.role);
    return this.pizzasService.findAll(pizzeriaId, name);
  }

  @Post('admin/my-pizzeria/pizzas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PIZZERIA_ADMIN)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: "Create a pizza for the admin's pizzeria" })
  @ApiResponse({ status: 201, description: 'Pizza created' })
  async createMine(
    @Body() dto: CreatePizzaDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const pizzeriaId = await this.resolveAdminPizzeriaId(user.id, user.role);
    return this.pizzasService.create(pizzeriaId, dto, user.id, user.role);
  }

  @Patch('admin/my-pizzeria/pizzas/:pizzaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PIZZERIA_ADMIN)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: "Update a pizza in the admin's pizzeria" })
  @ApiResponse({ status: 200, description: 'Pizza updated' })
  async updateMine(
    @Param('pizzaId') pizzaId: string,
    @Body() dto: UpdatePizzaDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const pizzeriaId = await this.resolveAdminPizzeriaId(user.id, user.role);
    return this.pizzasService.update(
      pizzeriaId,
      pizzaId,
      dto,
      user.id,
      user.role,
    );
  }

  @Delete('admin/my-pizzeria/pizzas/:pizzaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PIZZERIA_ADMIN)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: "Delete a pizza from the admin's pizzeria" })
  @ApiResponse({ status: 200, description: 'Pizza deleted' })
  async removeMine(
    @Param('pizzaId') pizzaId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const pizzeriaId = await this.resolveAdminPizzeriaId(user.id, user.role);
    return this.pizzasService.remove(pizzeriaId, pizzaId, user.id, user.role);
  }

  @Get('pizzerias/:pizzeriaId/pizzas/:pizzaId')
  @ApiOperation({ summary: 'Get a pizza by ID' })
  @ApiResponse({ status: 200, description: 'Pizza details' })
  @ApiResponse({ status: 404, description: 'Pizza not found' })
  findOne(
    @Param('pizzeriaId') pizzeriaId: string,
    @Param('pizzaId') pizzaId: string,
  ) {
    return this.pizzasService.findOne(pizzeriaId, pizzaId);
  }

  @Post('pizzerias/:pizzeriaId/pizzas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PIZZERIA_ADMIN)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Create a pizza for a pizzeria' })
  @ApiResponse({ status: 201, description: 'Pizza created' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  create(
    @Param('pizzeriaId') pizzeriaId: string,
    @Body() dto: CreatePizzaDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.pizzasService.create(pizzeriaId, dto, user.id, user.role);
  }

  @Patch('pizzerias/:pizzeriaId/pizzas/:pizzaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PIZZERIA_ADMIN)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Update a pizza' })
  @ApiResponse({ status: 200, description: 'Pizza updated' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  update(
    @Param('pizzeriaId') pizzeriaId: string,
    @Param('pizzaId') pizzaId: string,
    @Body() dto: UpdatePizzaDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.pizzasService.update(
      pizzeriaId,
      pizzaId,
      dto,
      user.id,
      user.role,
    );
  }

  @Delete('pizzerias/:pizzeriaId/pizzas/:pizzaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PIZZERIA_ADMIN)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Delete a pizza' })
  @ApiResponse({ status: 200, description: 'Pizza deleted' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  remove(
    @Param('pizzeriaId') pizzeriaId: string,
    @Param('pizzaId') pizzaId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.pizzasService.remove(pizzeriaId, pizzaId, user.id, user.role);
  }
}
