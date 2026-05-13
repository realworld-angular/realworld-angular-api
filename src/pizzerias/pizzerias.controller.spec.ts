import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PizzeriasController } from './pizzerias.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
    expect(
      Reflect.getMetadata(GUARDS_METADATA, method('findOne')),
    ).toBeUndefined();
  });

  it('enforces role policy on managed pizzerias', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('findMine'))).toEqual(
      FEATURE_ACCESS_POLICY.pizzerias.managedPizzerias,
    );
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, method('findMine')) ?? [];
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
  });

  it('enforces role policy on create/update/remove', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('create'))).toEqual(
      FEATURE_ACCESS_POLICY.pizzerias.create,
    );
    expect(Reflect.getMetadata(ROLES_KEY, method('update'))).toEqual(
      FEATURE_ACCESS_POLICY.pizzerias.update,
    );
    expect(Reflect.getMetadata(ROLES_KEY, method('remove'))).toEqual(
      FEATURE_ACCESS_POLICY.pizzerias.remove,
    );

    const createGuards =
      Reflect.getMetadata(GUARDS_METADATA, method('create')) ?? [];
    const updateGuards =
      Reflect.getMetadata(GUARDS_METADATA, method('update')) ?? [];
    const removeGuards =
      Reflect.getMetadata(GUARDS_METADATA, method('remove')) ?? [];

    expect(createGuards).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
    expect(updateGuards).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
    expect(removeGuards).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
  });
});
