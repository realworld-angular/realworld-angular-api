# Sliced API

The backend REST API for the Sliced application. Built with [NestJS](https://nestjs.com/) and [PostgreSQL](https://www.postgresql.org/), it handles authentication, pizzeria management, pizza menus, order processing with an automated lifecycle state machine, and staff management.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Database](#database)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Overview

This API serves as the backbone of the Sliced platform. Key features include:

- **JWT authentication** with cookie-based sessions
- **Role-based access control** — `CUSTOMER` and `PIZZERIA_ADMIN` roles
- **Pizzeria management** — create and manage restaurants with image support
- **Pizza menus** — pizza items with configurable options (size, crust, toppings)
- **Order lifecycle** — orders automatically transition through `PENDING → PREPARING → READY → DELIVERED` states via a background job
- **Bundled image serving** — read files from `assets/images/`, list names via `GET /api/pizzerias/images` and `GET /api/pizzas/images`, stream via `GET /api/pizzerias/images/:filename` and `GET /api/pizzas/images/:filename`

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [NestJS v11](https://nestjs.com/) |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM | [Prisma v7](https://www.prisma.io/) |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`) |
| Validation | `class-validator` + `class-transformer` |
| Testing | Jest + Supertest, Playwright |
| Package manager | pnpm |

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 — install with `npm install -g pnpm`
- **Docker** and **Docker Compose** — to run the PostgreSQL database

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd realworld-angular-api
pnpm install
```

### 2. Configure environment variables

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

See the [Environment Variables](#environment-variables) section for details on each variable.

### 3. Start the database

```bash
pnpm run db:up
```

This starts a PostgreSQL 16 container via Docker Compose on port `5432`.

### 4. Run database migrations

```bash
pnpm run db:migrate
```

### 5. (Optional) Seed the database

```bash
pnpm run db:seed
```

Populates the database with sample pizzerias, menus, and a test user.

### 6. Start the development server

```bash
pnpm run start:dev
```

The API will be available at **http://localhost:3000/api**.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://pizza:pizza@localhost:5432/pizza_marketplace?schema=public` | PostgreSQL connection string |
| `JWT_SECRET` | `change-me-in-production-use-a-long-random-string` | Secret used to sign JWT tokens — **change this in production** |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiration duration |
| `COOKIE_SECRET` | `change-me-in-production` | Secret used to sign cookies — **change this in production** |
| `PORT` | `3000` | Port the API listens on |
| `NODE_ENV` | `development` | Node environment (`development` / `production`) |
| `ALLOWED_ORIGINS` | `` | Comma-separated list of allowed CORS origins (e.g. `http://localhost:4200`) |
| `ORDER_PENDING_TO_PREPARING_MS` | `120000` | Delay before a pending order moves to preparing (ms) |
| `ORDER_PREPARING_TO_READY_MS` | `300000` | Delay before a preparing order moves to ready (ms) |
| `ORDER_READY_TO_DELIVERED_MS` | `180000` | Delay before a ready order moves to delivered (ms) |
| `ORDER_JOB_INTERVAL_MS` | `30000` | How often the order lifecycle job polls (ms) |

## Available Scripts

| Script | Description |
|---|---|
| `pnpm run start` | Start the server |
| `pnpm run start:dev` | Start with hot-reload (development) |
| `pnpm run start:prod` | Start compiled production build |
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm run test` | Run unit tests |
| `pnpm run test:e2e` | Run end-to-end tests |
| `pnpm run test:api` | Run Playwright API integration tests |
| `pnpm run test:cov` | Run unit tests with coverage report |
| `pnpm run db:up` | Start the PostgreSQL Docker container |
| `pnpm run db:down` | Stop the PostgreSQL Docker container |
| `pnpm run db:migrate` | Apply pending Prisma migrations |
| `pnpm run db:generate` | Regenerate the Prisma client |
| `pnpm run db:seed` | Seed the database with sample data |
| `pnpm run db:reset` | Reset the database and re-seed |

## API Reference

All endpoints are prefixed with `/api`.

### Bundled images

Binary files live under `assets/images/{pizzerias|pizzas}/` (the whole `assets/` tree is copied into `dist/assets/` on `pnpm run build`). Allowed basenames are defined in `src/common/public-images.ts` and must match the `imageFilename` stored on each `Pizzeria` / `Pizza`.

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/pizzerias/images` | List image basenames in `assets/images/pizzerias` | Public |
| `GET` | `/api/pizzas/images` | List image basenames in `assets/images/pizzas` | Public |
| `GET` | `/api/pizzerias/images/:filename` | Stream a pizzeria storefront image | Public |
| `GET` | `/api/pizzas/images/:filename` | Stream a pizza product image | Public |

### Auth

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/register-pizzeria-owner` | Register as `PIZZERIA_ADMIN` and receive a JWT cookie | Public |
| `POST` | `/api/auth/login` | Login and receive a JWT cookie | Public |
| `POST` | `/api/auth/logout` | Clear the session cookie | Authenticated |
| `GET` | `/api/auth/me` | Get the current authenticated user | Authenticated |

### Users

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/users/:id` | Get a user profile | Authenticated |
| `PATCH` | `/api/users/:id` | Update a user profile | Authenticated |

### Pizzerias

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/pizzerias` | List all pizzerias | Public |
| `POST` | `/api/pizzerias` | Create a new pizzeria | `PIZZERIA_ADMIN` |
| `GET` | `/api/pizzerias/:id` | Get a pizzeria | Public |
| `PATCH` | `/api/pizzerias/:id` | Update a pizzeria | `PIZZERIA_ADMIN` |
| `DELETE` | `/api/pizzerias/:id` | Delete a pizzeria | `PIZZERIA_ADMIN` |

### Pizzas

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/pizzerias/:id/pizzas` | List pizzas for a pizzeria | Public |
| `POST` | `/api/pizzerias/:id/pizzas` | Add a pizza to the menu | `PIZZERIA_ADMIN` |
| `PATCH` | `/api/pizzerias/:id/pizzas/:pizzaId` | Update a pizza | `PIZZERIA_ADMIN` |
| `DELETE` | `/api/pizzerias/:id/pizzas/:pizzaId` | Remove a pizza | `PIZZERIA_ADMIN` |

### Orders

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/orders` | List orders for the current user | Authenticated |
| `POST` | `/api/orders` | Place a new order | Authenticated |
| `PATCH` | `/api/orders/:id/cancel` | Cancel an order | Authenticated |
| `GET` | `/api/pizzerias/:id/orders` | List orders for a pizzeria | `PIZZERIA_ADMIN` |

## Database

The project uses **Prisma** as the ORM with **PostgreSQL**. The database schema is located in `prisma/schema.prisma`.

### Models

- **User** — Application users with roles: `CUSTOMER`, `PIZZERIA_ADMIN`
- **Pizzeria** — Pizza restaurants with name, location, and `imageFilename` (basename; binary under `assets/images/pizzerias/`, served via `GET /api/pizzerias/images/:filename`)
- **Pizza** — Menu items with name, price, and `imageFilename` (basename; binary under `assets/images/pizzas/`, served via `GET /api/pizzas/images/:filename`)
- **PizzaOption** — Configurable options per pizza (SIZE, CRUST, TOPPING)
- **Order** — Customer orders with status tracking
- **OrderItem** — Individual pizza items within an order

### Order Lifecycle

Orders are automatically advanced through states by a background job (`OrderJob`):

```
PENDING → PREPARING → READY → DELIVERED
                ↓
            CANCELLED
```

Transition delays are configurable via environment variables (see [Environment Variables](#environment-variables)).

## Testing

```bash
# Unit tests
pnpm run test

# Unit tests with coverage
pnpm run test:cov

# End-to-end tests
pnpm run test:e2e

# API integration tests (Playwright)
pnpm run test:api
```

Unit tests live alongside their source files (`*.spec.ts`). End-to-end tests are in the `test/` directory.

## Project Structure

```
realworld-angular-api/
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Migration history
│   └── seed.ts              # Database seeder
├── src/
│   ├── auth/                # Authentication module (JWT, cookies)
│   ├── users/               # User profile management
│   ├── pizzerias/           # Pizzeria CRUD
│   ├── pizzas/              # Pizza menu management
│   ├── orders/              # Order placement and tracking
│   ├── order-job/           # Background order lifecycle job
│   ├── staff/               # Staff invitations and management
│   ├── names/               # Random name generation
│   ├── images/              # Static image serving
│   ├── prisma/              # Prisma service module
│   └── main.ts              # Application entry point
├── test/                    # E2E test files
├── docker-compose.yml       # PostgreSQL container
└── .env                     # Environment variables (not committed)
```

## Contributing

Contributions are welcome! Please read through the following guidelines before submitting a pull request.

- **Fork** the repository and create your branch from `main`
- **Write tests** for any new features or bug fixes
- **Follow** the existing code style (TypeScript, NestJS conventions)
- **Run the full test suite** before submitting: `pnpm run test`
- **Keep commits focused** — one logical change per commit
- Open a **pull request** with a clear description of the changes and motivation

### Reporting Issues

If you find a bug or have a feature request, please [open an issue](../../issues) with:
- A clear and descriptive title
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Environment details (OS, Node version, etc.)

## License

This project is licensed under the [MIT License](LICENSE).
