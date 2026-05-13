import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Word lists — all pizza-themed to match the project domain
// ---------------------------------------------------------------------------

const PIZZERIA_DESCRIPTORS = [
  'Crispy',
  'Golden',
  'Smoky',
  'Saucy',
  'Blazing',
  'Melted',
  'Fiery',
  'Rustic',
  'Zesty',
  'Hearty',
  'Crunchy',
  'Spicy',
  'Toasted',
  'Steaming',
  'Loaded',
  'Bubbling',
  'Charred',
  'Flaky',
  'Gooey',
  'Savory',
];

const PIZZERIA_NOUNS = [
  'Corner',
  'Slice',
  'Crust',
  'Wedge',
  'Pie',
  'Edge',
  'Oven',
  'Base',
  'Ring',
  'Dough',
  'Bite',
  'Wheel',
  'Pan',
  'Box',
  'Square',
  'Round',
  'Fold',
  'Layer',
  'Board',
  'Stone',
];

const PIZZA_ADJECTIVES = [
  'Smoky',
  'Crispy',
  'Golden',
  'Spicy',
  'Creamy',
  'Tangy',
  'Rich',
  'Bold',
  'Zesty',
  'Classic',
  'Wild',
  'Rustic',
  'Fiery',
  'Silky',
  'Hearty',
];

const PIZZA_INGREDIENTS = [
  'Salami',
  'Nduja',
  'Burrata',
  'Prosciutto',
  'Gorgonzola',
  'Truffle',
  'Anchovy',
  'Mozzarella',
  'Basil',
  'Ricotta',
  'Pancetta',
  'Pecorino',
  'Olives',
  'Artichoke',
  'Mushroom',
  'Pepperoni',
  'Arugula',
  'Capers',
];

const USER_ADJECTIVES = [
  'Spicy',
  'Crunchy',
  'Melted',
  'Crispy',
  'Saucy',
  'Gooey',
  'Zesty',
  'Smoky',
  'Tangy',
  'Golden',
  'Fiery',
  'Rustic',
  'Cheesy',
  'Fluffy',
  'Savory',
];

const USER_NOUNS = [
  'Mozzarella',
  'Basil',
  'Prosciutto',
  'Salami',
  'Ricotta',
  'Nduja',
  'Burrata',
  'Pancetta',
  'Truffle',
  'Pepperoni',
  'Anchovy',
  'Pecorino',
  'Gorgonzola',
  'Arugula',
  'Capers',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

@Injectable()
export class NamesService {
  constructor(private readonly prisma: PrismaService) {}

  /** e.g. "Crispy Corner" */
  async generatePizzeriaName(): Promise<string> {
    for (let attempt = 0; attempt < 50; attempt++) {
      const name = `${pick(PIZZERIA_DESCRIPTORS)} ${pick(PIZZERIA_NOUNS)}`;
      const existing = await this.prisma.pizzeria.findUnique({
        where: { name },
      });
      if (!existing) return name;
    }
    // Fallback with random suffix
    return `${pick(PIZZERIA_DESCRIPTORS)} ${pick(PIZZERIA_NOUNS)} ${Math.floor(Math.random() * 1000)}`;
  }

  /** e.g. "Smoky Salami" */
  generatePizzaName(): string {
    return `${pick(PIZZA_ADJECTIVES)} ${pick(PIZZA_INGREDIENTS)}`;
  }

  /** e.g. "SpicyMozzarella" */
  async generateName(): Promise<string> {
    for (let attempt = 0; attempt < 50; attempt++) {
      const name = `${pick(USER_ADJECTIVES)}${pick(USER_NOUNS)}`;
      const existing = await this.prisma.user.findUnique({
        where: { name: name },
      });
      if (!existing) return name;
    }
    return `${pick(USER_ADJECTIVES)}${pick(USER_NOUNS)}${Math.floor(Math.random() * 10000)}`;
  }
}
