// Re-export Prisma enums and types for use throughout the app.
// Enums are plain string union objects — safe to import from the generated enums file.

export enum Role {
  CUSTOMER = 'CUSTOMER',
  PIZZERIA_ADMIN = 'PIZZERIA_ADMIN',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}
