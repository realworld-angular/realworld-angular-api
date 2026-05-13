import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but does NOT reject unauthenticated requests.
 * It simply attempts to populate req.user from the JWT cookie when present.
 * Useful for endpoints that are public but behave differently for authenticated users.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(_err: any, user: any): any {
    // Return the user if valid, null otherwise — never throw
    return user ?? null;
  }
}
