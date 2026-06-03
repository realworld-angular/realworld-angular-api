import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const PIZZERIA_IMAGE_LIST = Array.from({ length: 10 }, (_, i) => `pizzeria${i + 1}.png`);
const PIZZA_IMAGE_MAP: Record<string, string> = {
  'Margherita': 'margherita.png',
  'Pepperoni': 'pepperoni.png',
  'Quattro Formaggi': 'quattro-formaggi.png',
  'Prosciutto e Funghi': 'prosciutto-funghi.png',
  'Diavola': 'diavola.png',
  'Capricciosa': 'capricciosa.png',
  'Hawaiian': 'hawaiian.png',
  'Vegetariana': 'vegetariana.png',
  'BBQ Chicken': 'bbq-chicken.png',
  'Nduja & Honey': 'nduja-honey.png',
  'Bresaola & Arugula': 'bresaola-arugula.png',
  'Burrata e Pomodoro': 'burrata-pomodoro.png',
  'Marinara': 'marinara.png',
  'Bianca': 'bianca.png',
  'Pugliese': 'pugliese.png',
  'Calabrese': 'calabrese.png',
  'Napoletana': 'napoletana.png',
  'Siciliana': 'siciliana.png',
  'Carbonara': 'carbonara.png',
  'Parma': 'parma.png',
  'Rustica': 'rustica.png',
  'Fior di Latte': 'fior-di-atte.png',
  'Tonno e Cipolla': 'tonno-cipolla.png',
  'Porcini e Tartufo': 'porcini-tartufo.png',
  'Spinaci e Aglio': 'spinaci-aglio.png',
  'Ortolana': 'ortolana.png',
  'Genovese': 'genovese.png',
  'Crostino': 'crostino.png',
  'Americana': 'americana.png',
  'Campagnola': 'campagnola.png',
};

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const PIZZERIA_DATA: { name: string; city: string; country: string }[] = [
  { name: 'Crispy Corner', city: 'Naples', country: 'Italy' },
  { name: 'La Forza Pizzeria', city: 'Palermo', country: 'Italy' },
  { name: 'Wood & Fire', city: 'Rome', country: 'Italy' },
  { name: 'Slice Republic', city: 'New York', country: 'United States' },
  { name: "Mama Rosa's", city: 'Chicago', country: 'United States' },
  { name: 'The Dough House', city: 'London', country: 'United Kingdom' },
  { name: 'Napoli Express', city: 'Milan', country: 'Italy' },
  { name: 'Crust & Crumble', city: 'Paris', country: 'France' },
  { name: 'Fuoco e Farina', city: 'Lyon', country: 'France' },
  { name: 'The Roman Slice', city: 'Bologna', country: 'Italy' },
  { name: 'Bianco Pizzeria', city: 'Berlin', country: 'Germany' },
  { name: "Sal's Oven", city: 'Munich', country: 'Germany' },
  { name: 'Inferno Pies', city: 'Barcelona', country: 'Spain' },
  { name: 'Golden Crust Co.', city: 'Madrid', country: 'Spain' },
  { name: 'Toscana Pizza Bar', city: 'Florence', country: 'Italy' },
  { name: 'Il Forno', city: 'Lisbon', country: 'Portugal' },
  { name: 'Urban Pie Kitchen', city: 'Amsterdam', country: 'Netherlands' },
  { name: 'Margherita & Co.', city: 'Copenhagen', country: 'Denmark' },
  { name: 'Quattro Stagioni', city: 'Stockholm', country: 'Sweden' },
  { name: 'Volare Pizzeria', city: 'Melbourne', country: 'Australia' },
];

const PIZZA_RECIPES = [
  { name: 'Margherita', basePrice: 12.5, toppingLabels: ['Tomato slices', 'Fresh basil'] },
  { name: 'Pepperoni', basePrice: 14.0, toppingLabels: ['Pepperoni', 'Extra cheese'] },
  { name: 'Quattro Formaggi', basePrice: 15.5, toppingLabels: ['Extra cheese', 'Parmesan flakes'] },
  { name: 'Prosciutto e Funghi', basePrice: 16.0, toppingLabels: ['Prosciutto', 'Mushrooms'] },
  { name: 'Diavola', basePrice: 13.5, toppingLabels: ['Pepperoni', 'Jalapeños'] },
  { name: 'Capricciosa', basePrice: 15.0, toppingLabels: ['Mushrooms', 'Ham', 'Olives', 'Artichoke hearts'] },
  { name: 'Hawaiian', basePrice: 14.0, toppingLabels: ['Ham', 'Pineapple'] },
  { name: 'Vegetariana', basePrice: 13.0, toppingLabels: ['Bell peppers', 'Onions', 'Mushrooms', 'Spinach'] },
  { name: 'BBQ Chicken', basePrice: 14.5, toppingLabels: ['Bacon', 'Onions', 'Bell peppers'] },
  { name: 'Nduja & Honey', basePrice: 15.0, toppingLabels: ['Pepperoni', 'Fresh basil'] },
  { name: 'Bresaola & Arugula', basePrice: 16.5, toppingLabels: ['Arugula', 'Parmesan flakes'] },
  { name: 'Burrata e Pomodoro', basePrice: 17.5, toppingLabels: ['Fresh basil', 'Tomato slices'] },
  { name: 'Marinara', basePrice: 11.0, toppingLabels: ['Tomato slices', 'Fresh garlic', 'Fresh basil'] },
  { name: 'Bianca', basePrice: 14.0, toppingLabels: ['Extra cheese', 'Fresh garlic', 'Arugula'] },
  { name: 'Pugliese', basePrice: 13.0, toppingLabels: ['Tomato slices', 'Onions', 'Anchovies'] },
  { name: 'Calabrese', basePrice: 14.5, toppingLabels: ['Pepperoni', 'Bell peppers', 'Onions'] },
  { name: 'Napoletana', basePrice: 14.0, toppingLabels: ['Anchovies', 'Olives', 'Fresh garlic'] },
  { name: 'Siciliana', basePrice: 14.5, toppingLabels: ['Anchovies', 'Olives', 'Tomato slices'] },
  { name: 'Carbonara', basePrice: 15.5, toppingLabels: ['Bacon', 'Onions', 'Parmesan flakes'] },
  { name: 'Parma', basePrice: 17.0, toppingLabels: ['Prosciutto', 'Arugula', 'Parmesan flakes'] },
  { name: 'Rustica', basePrice: 14.0, toppingLabels: ['Mushrooms', 'Bacon', 'Onions'] },
  { name: 'Fior di Latte', basePrice: 13.5, toppingLabels: ['Tomato slices', 'Fresh basil', 'Extra cheese'] },
  { name: 'Tonno e Cipolla', basePrice: 15.0, toppingLabels: ['Anchovies', 'Onions', 'Olives'] },
  { name: 'Porcini e Tartufo', basePrice: 18.0, toppingLabels: ['Mushrooms', 'Truffle oil'] },
  { name: 'Spinaci e Aglio', basePrice: 13.5, toppingLabels: ['Spinach', 'Fresh garlic', 'Extra cheese'] },
  { name: 'Ortolana', basePrice: 14.0, toppingLabels: ['Bell peppers', 'Onions', 'Spinach', 'Tomato slices'] },
  { name: 'Genovese', basePrice: 15.5, toppingLabels: ['Prosciutto', 'Mushrooms', 'Fresh basil'] },
  { name: 'Crostino', basePrice: 12.5, toppingLabels: ['Tomato slices', 'Fresh garlic', 'Anchovies'] },
  { name: 'Americana', basePrice: 15.0, toppingLabels: ['Pepperoni', 'Bacon', 'Extra cheese'] },
  { name: 'Campagnola', basePrice: 14.0, toppingLabels: ['Mushrooms', 'Bell peppers', 'Onions', 'Olives'] },
];

const PIZZA_SIZE_OPTIONS = [
  { label: 'Small (25cm)', price: 0, sortOrder: 1 },
  { label: 'Medium (30cm)', price: 2.5, sortOrder: 2 },
  { label: 'Large (35cm)', price: 4, sortOrder: 3 },
];

const PIZZA_TOPPING_OPTIONS = [
  { label: 'Extra cheese', price: 1.5, sortOrder: 1 },
  { label: 'Mushrooms', price: 1, sortOrder: 2 },
  { label: 'Olives', price: 1, sortOrder: 3 },
  { label: 'Onions', price: 0.5, sortOrder: 4 },
  { label: 'Bell peppers', price: 1, sortOrder: 5 },
  { label: 'Jalapeños', price: 1, sortOrder: 6 },
  { label: 'Anchovies', price: 1.5, sortOrder: 7 },
  { label: 'Truffle oil', price: 2.5, sortOrder: 8 },
  { label: 'Pepperoni', price: 1.5, sortOrder: 9 },
  { label: 'Bacon', price: 1.5, sortOrder: 10 },
  { label: 'Ham', price: 1.5, sortOrder: 11 },
  { label: 'Pineapple', price: 1, sortOrder: 12 },
  { label: 'Spinach', price: 1, sortOrder: 13 },
  { label: 'Fresh garlic', price: 0.5, sortOrder: 14 },
  { label: 'Fresh basil', price: 0.5, sortOrder: 15 },
  { label: 'Arugula', price: 1, sortOrder: 16 },
  { label: 'Tomato slices', price: 1, sortOrder: 17 },
  { label: 'Artichoke hearts', price: 1.5, sortOrder: 18 },
  { label: 'Prosciutto', price: 2, sortOrder: 19 },
  { label: 'Parmesan flakes', price: 1, sortOrder: 20 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandomN<T>(arr: T[], n: number, seed: number): T[] {
  const indices = arr.map((_, i) => i);
  let s = seed;
  for (let i = indices.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) | 0;
    const j = (s >>> 0) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, n).map((i) => arr[i]);
}

// ---------------------------------------------------------------------------
// Order seed helpers
// ---------------------------------------------------------------------------

type SizeRow = { id: string; label: string; price: unknown };
type ToppingRow = { id: string; label: string; price: unknown };

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding database...');

  // Seed pizza size / topping catalogs first so we can reference their ids
  // when building order item snapshots below.
  await prisma.pizzaSizeOption.createMany({
    skipDuplicates: true,
    data: PIZZA_SIZE_OPTIONS,
  });
  await prisma.pizzaToppingOption.createMany({
    skipDuplicates: true,
    data: PIZZA_TOPPING_OPTIONS,
  });
  console.log('✅ Pizza option catalogs seeded');

  const toppingLabelToId = new Map(
    (
      await prisma.pizzaToppingOption.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { id: true, label: true },
      })
    ).map((t) => [t.label, t.id] as const),
  );
  if (toppingLabelToId.size === 0) {
    throw new Error('No topping options available for pizza seed');
  }

  // Demo admin user
  const adminHash = await bcrypt.hash('password123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pizza.dev' },
    update: {},
    create: {
      email: 'admin@pizza.dev',
      passwordHash: adminHash,
      name: 'CrispyMozzarella',
      role: 'PIZZERIA_ADMIN',
    },
  });

  // Demo client user
  const clientHash = await bcrypt.hash('password123', 12);
  const client = await prisma.user.upsert({
    where: { email: 'client@pizza.dev' },
    update: {},
    create: {
      email: 'client@pizza.dev',
      passwordHash: clientHash,
      name: 'HungryBasil',
      role: 'CUSTOMER',
    },
  });

  // Seed pizzerias and pizzas — cycle bundled image option arrays
  const seededPizzerias: { id: string; name: string }[] = [];
  for (let pi = 0; pi < PIZZERIA_DATA.length; pi++) {
    const pd = PIZZERIA_DATA[pi];
    const pizzeriaFilename =
      PIZZERIA_IMAGE_LIST[pi % PIZZERIA_IMAGE_LIST.length];

    const pizzeria = await prisma.pizzeria.upsert({
      where: { name: pd.name },
      update: {
        city: pd.city,
        country: pd.country,
        imageFilename: pizzeriaFilename,
      },
      create: {
        name: pd.name,
        city: pd.city,
        country: pd.country,
        imageFilename: pizzeriaFilename,
        ownerId: admin.id,
      },
    });
    seededPizzerias.push({ id: pizzeria.id, name: pizzeria.name });

    const selectedRecipes = pickRandomN(PIZZA_RECIPES, 15, pi);
    for (let pj = 0; pj < selectedRecipes.length; pj++) {
      const recipe = selectedRecipes[pj];
      const seedId = `seed-p${pi}-pizza-${pj}`;
      const pizzaFilename = PIZZA_IMAGE_MAP[recipe.name];

      const toppingIds = recipe.toppingLabels
        .map((label) => toppingLabelToId.get(label))
        .filter((id): id is string => id !== undefined);

      await prisma.pizza.upsert({
        where: { id: seedId },
        update: {
          imageFilename: pizzaFilename,
          toppings: { set: toppingIds.map((id) => ({ id })) },
        },
        create: {
          id: seedId,
          pizzeriaId: pizzeria.id,
          name: recipe.name,
          basePrice: recipe.basePrice,
          imageFilename: pizzaFilename,
          toppings: { connect: toppingIds.map((id) => ({ id })) },
        },
      });
    }

    console.log(`  ✅ ${pd.name} — 15 pizzas`);
  }

  // ---------------------------------------------------------------------------
  // Demo orders — one per lifecycle status
  // ---------------------------------------------------------------------------

  const sizeOptions = (await prisma.pizzaSizeOption.findMany({
    select: { id: true, label: true, price: true },
    orderBy: { sortOrder: 'asc' },
  })) as SizeRow[];
  const toppingOptions = (await prisma.pizzaToppingOption.findMany({
    select: { id: true, label: true, price: true },
    orderBy: { sortOrder: 'asc' },
  })) as ToppingRow[];

  const sizeByLabel = new Map(sizeOptions.map((s) => [s.label, s]));
  const toppingByLabel = new Map(toppingOptions.map((t) => [t.label, t]));

  // Helper to look up a seeded pizza by (pizzeriaIndex, pizzaIndex).
  async function getSeededPizza(pi: number, pj: number) {
    const id = `seed-p${pi}-pizza-${pj}`;
    const pizza = await prisma.pizza.findUniqueOrThrow({
      where: { id },
      select: { id: true, basePrice: true, pizzeriaId: true },
    });
    return { ...pizza, basePrice: Number(pizza.basePrice) };
  }

  const sizeById = new Map(sizeOptions.map((s) => [s.id, s]));
  const toppingById = new Map(toppingOptions.map((t) => [t.id, t]));

  type DemoLine = {
    pizzaId: string;
    quantity: number;
    selectedSizeId: string | null;
    selectedOptionIds: string[];
  };

  function lineTotal(basePrice: number, quantity: number, selectedSizeId: string | null, selectedOptionIds: string[]) {
    const sizePrice = selectedSizeId ? Number(sizeById.get(selectedSizeId)?.price ?? 0) : 0;
    const toppingsPrice = selectedOptionIds.reduce((sum, id) => sum + Number(toppingById.get(id)?.price ?? 0), 0);
    const unit = Number(basePrice) + sizePrice + toppingsPrice;
    return { unit, subtotal: unit * quantity };
  }

  type DemoOrderSpec = {
    id: string;
    pizzeriaIndex: number;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
    delivery: { street: string; city: string; country: string };
    billing: { street: string; city: string; country: string } | null;
    notes?: string | null;
    lines: Array<{
      pi: number;
      pj: number;
      quantity: number;
      sizeLabel?: string;
      toppingLabels?: string[];
    }>;
  };

  const mediumSize = sizeByLabel.get('Medium (30cm)');
  const largeSize = sizeByLabel.get('Large (35cm)');
  const smallSize = sizeByLabel.get('Small (25cm)');
  const extraCheese = toppingByLabel.get('Extra cheese');
  const mushrooms = toppingByLabel.get('Mushrooms');
  const truffleOil = toppingByLabel.get('Truffle oil');
  const olives = toppingByLabel.get('Olives');
  const jalapenos = toppingByLabel.get('Jalapeños');

  if (
    !mediumSize ||
    !largeSize ||
    !smallSize ||
    !extraCheese ||
    !mushrooms ||
    !truffleOil ||
    !olives ||
    !jalapenos
  ) {
    throw new Error('Missing expected size/topping options after seeding');
  }

  const demoOrders: DemoOrderSpec[] = [
    {
      id: 'seed-order-pending',
      pizzeriaIndex: 0, // Crispy Corner
      status: 'PENDING',
      delivery: { street: '12 Basil Lane', city: 'Naples', country: 'Italy' },
      billing: null,
      lines: [
        {
          pi: 0,
          pj: 0,
          quantity: 1,
          sizeLabel: 'Medium (30cm)',
          toppingLabels: ['Extra cheese', 'Mushrooms'],
        },
        { pi: 0, pj: 4, quantity: 2 },
      ],
    },
    {
      id: 'seed-order-preparing',
      pizzeriaIndex: 1, // La Forza Pizzeria
      status: 'PREPARING',
      delivery: { street: '12 Basil Lane', city: 'Naples', country: 'Italy' },
      billing: null,
      lines: [{ pi: 1, pj: 1, quantity: 2, sizeLabel: 'Large (35cm)' }],
    },
    {
      id: 'seed-order-ready',
      pizzeriaIndex: 2, // Wood & Fire
      status: 'READY',
      delivery: { street: '12 Basil Lane', city: 'Naples', country: 'Italy' },
      billing: null,
      lines: [
        {
          pi: 2,
          pj: 8,
          quantity: 1,
          sizeLabel: 'Large (35cm)',
          toppingLabels: ['Truffle oil'],
        },
        {
          pi: 2,
          pj: 5,
          quantity: 1,
          sizeLabel: 'Small (25cm)',
          toppingLabels: ['Olives'],
        },
      ],
    },
    {
      id: 'seed-order-delivered',
      pizzeriaIndex: 3, // Slice Republic
      status: 'DELIVERED',
      delivery: { street: '12 Basil Lane', city: 'Naples', country: 'Italy' },
      billing: { street: '7 Finance Road', city: 'Naples', country: 'Italy' },
      lines: [
        {
          pi: 3,
          pj: 6,
          quantity: 1,
          sizeLabel: 'Medium (30cm)',
          toppingLabels: ['Jalapeños'],
        },
      ],
    },
    {
      id: 'seed-order-cancelled',
      pizzeriaIndex: 4, // Mama Rosa's
      status: 'CANCELLED',
      delivery: { street: '12 Basil Lane', city: 'Naples', country: 'Italy' },
      billing: null,
      notes: 'Cancelled by client — buzzer broken, please skip.',
      lines: [{ pi: 4, pj: 11, quantity: 1, sizeLabel: 'Medium (30cm)' }],
    },
  ];

  for (const spec of demoOrders) {
    const pizzeriaId = seededPizzerias[spec.pizzeriaIndex].id;

    // Skip if order already exists (idempotent reseed without raw upsert,
    // since `Order` doesn't support nested item upsert via the typed API).
    const existing = await prisma.order.findUnique({
      where: { id: spec.id },
      select: { id: true },
    });
    if (existing) continue;

    const itemsData: Array<{
      pizzaId: string;
      quantity: number;
      selectedSizeId: string | null;
      toppingIds: string[];
    }> = [];
    let total = 0;

    for (const line of spec.lines) {
      const pizza = await getSeededPizza(line.pi, line.pj);
      if (pizza.pizzeriaId !== pizzeriaId) {
        throw new Error(
          `Demo order ${spec.id}: pizza seed-p${line.pi}-pizza-${line.pj} does not belong to pizzeria index ${spec.pizzeriaIndex}`,
        );
      }

      const selectedSizeId = line.sizeLabel ? (sizeByLabel.get(line.sizeLabel)?.id ?? null) : null;
      const selectedOptionIds = (line.toppingLabels ?? [])
        .map((label) => toppingByLabel.get(label)?.id ?? '')
        .filter((id) => id !== '');

      const { unit, subtotal } = lineTotal(pizza.basePrice, line.quantity, selectedSizeId, selectedOptionIds);
      itemsData.push({
        pizzaId: pizza.id,
        quantity: line.quantity,
        selectedSizeId,
        toppingIds: selectedOptionIds,
      });
      total += subtotal;
    }

    await prisma.order.create({
      data: {
        id: spec.id,
        clientId: client.id,
        pizzeriaId,
        deliveryStreetAddress: spec.delivery.street,
        deliveryCity: spec.delivery.city,
        deliveryCountry: spec.delivery.country,
        billingStreetAddress: spec.billing?.street ?? null,
        billingCity: spec.billing?.city ?? null,
        billingCountry: spec.billing?.country ?? null,
        notes: spec.notes ?? null,
        status: spec.status,
        total,
        items: {
          create: itemsData.map((item) => ({
            pizzaId: item.pizzaId,
            quantity: item.quantity,
            selectedSizeId: item.selectedSizeId,
            toppings: {
              create: item.toppingIds.map((toppingId) => ({
                toppingId,
              })),
            },
          })),
        },
      },
    });
  }

  console.log(`✅ Demo orders seeded — ${demoOrders.length} orders covering every status`);

  // ---------------------------------------------------------------------------
  // Coupon code
  // ---------------------------------------------------------------------------

  await prisma.couponCode.upsert({
    where: { code: 'SAVE20' },
    update: {},
    create: {
      code: 'SAVE20',
      discountPercent: 20,
    },
  });
  console.log('✅ Coupon code "SAVE20" created');

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log('');
  console.log('✅ Demo data seeded — 20 pizzerias × 15 pizzas = 300 pizzas total');
  console.log('');
  console.log('Demo accounts (password: password123):');
  console.log('  admin@pizza.dev     (PIZZERIA_ADMIN, owns all 20 pizzerias)');
  console.log('  client@pizza.dev    (CUSTOMER)');
  console.log('');
  console.log('Demo orders for client@pizza.dev:');
  for (const o of demoOrders) {
    console.log(`  ${o.id.padEnd(22)} ${o.status.padEnd(10)} on ${seededPizzerias[o.pizzeriaIndex].name}`);
  }
  console.log('');
  console.log('Note: the OrderJob advances non-terminal orders based on updatedAt.');
  console.log('  With default delays (PENDING→PREPARING 2m, PREPARING→READY 5m,');
  console.log('  READY→DELIVERED 3m), demo PENDING/PREPARING/READY orders will progress');
  console.log('  shortly after seed. DELIVERED and CANCELLED orders are terminal.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().then(() => pool.end()));
