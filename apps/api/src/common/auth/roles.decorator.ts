import { SetMetadata } from '@nestjs/common';
import { AuthenticatedUserRole } from './session-auth.guard';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AuthenticatedUserRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
