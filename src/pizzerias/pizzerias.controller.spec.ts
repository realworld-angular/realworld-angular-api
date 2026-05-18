import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PizzeriasController } from './pizzerias.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { FEATURE_ACCESS_POLICY } from '../auth/feature-access.policy';

describe('PizzeriasController authorization', () => {
  const method = (name: keyof PizzeriasController) =>
    PizzeriasController.prototype[name];

  it('keeps public endpoints unguarded', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, method('findAll')),
    ).toBeUndefined();
  });

  it('uses optional JWT auth on findOne', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, method('findOne')),
    ).toContain(OptionalJwtAuthGuard);
  });

  it('enforces role policy on create', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('create'))).toEqual(
      FEATURE_ACCESS_POLICY.pizzerias.create,
    );

    const createGuards =
      Reflect.getMetadata(GUARDS_METADATA, method('create')) ?? [];

    expect(createGuards).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
  });
});
