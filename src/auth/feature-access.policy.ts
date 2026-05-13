import { Role } from '../common/enums';

/**
 * Central API access matrix aligned with frontend-visible features.
 * Keep this in sync with Angular route guards/template role gating.
 */
export const FEATURE_ACCESS_POLICY = {
  pizzerias: {
    create: [Role.PIZZERIA_ADMIN] as const,
    update: [Role.PIZZERIA_ADMIN] as const,
    remove: [Role.PIZZERIA_ADMIN] as const,
  },
  orders: {
    create: [Role.CUSTOMER] as const,
    list: [Role.CUSTOMER, Role.PIZZERIA_ADMIN] as const,
    cancel: [Role.CUSTOMER, Role.PIZZERIA_ADMIN] as const,
    markDelivered: [Role.PIZZERIA_ADMIN] as const,
    subscribe: [Role.CUSTOMER, Role.PIZZERIA_ADMIN] as const,
  },
} as const;
