import { GUARDS_METADATA } from '@nestjs/common/constants';
import { OrdersController } from './orders.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { FEATURE_ACCESS_POLICY } from '../auth/feature-access.policy';

describe('OrdersController authorization', () => {
  const method = (name: keyof OrdersController) =>
    OrdersController.prototype[name];

  it('requires JWT auth on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, OrdersController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
  });

  it('enforces role policy on create', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('create'))).toEqual(
      FEATURE_ACCESS_POLICY.orders.create,
    );
    const guards = Reflect.getMetadata(GUARDS_METADATA, method('create')) ?? [];
    expect(guards).toContain(RolesGuard);
  });

  it('enforces role policy on list', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('findAll'))).toEqual(
      FEATURE_ACCESS_POLICY.orders.list,
    );
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, method('findAll')) ?? [];
    expect(guards).toContain(RolesGuard);
  });

  it('enforces role policy on subscribe', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('subscribeToOrder'))).toEqual(
      FEATURE_ACCESS_POLICY.orders.subscribe,
    );
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, method('subscribeToOrder')) ?? [];
    expect(guards).toContain(RolesGuard);
  });

  it('enforces role policy on findOne', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('findOne'))).toEqual(
      FEATURE_ACCESS_POLICY.orders.read,
    );
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, method('findOne')) ?? [];
    expect(guards).toContain(RolesGuard);
  });

  it('enforces role policy on cancel', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('cancel'))).toEqual(
      FEATURE_ACCESS_POLICY.orders.cancel,
    );
    const guards = Reflect.getMetadata(GUARDS_METADATA, method('cancel')) ?? [];
    expect(guards).toContain(RolesGuard);
  });

  it('enforces role policy on markDelivered', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('markDelivered'))).toEqual(
      FEATURE_ACCESS_POLICY.orders.markDelivered,
    );
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, method('markDelivered')) ?? [];
    expect(guards).toContain(RolesGuard);
  });
});
