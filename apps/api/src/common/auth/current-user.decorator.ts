import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from './session-auth.guard';

export const CurrentUser = createParamDecorator<keyof AuthenticatedUser | undefined>(
  (field: keyof AuthenticatedUser | undefined, context: ExecutionContext):
    | AuthenticatedUser
    | AuthenticatedUser[keyof AuthenticatedUser]
    | undefined => {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
