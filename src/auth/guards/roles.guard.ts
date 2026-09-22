import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // ຖ້າ API ນັ້ນບໍ່ໄດ້ກຳນົດ @Roles() ໄວ້ ໃຫ້ຜ່ານໄດ້ເລີຍ
        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        // ກວດສອບ Role ຂອງ User
        const hasRole = requiredRoles.some((role) => user?.role === role);

        if (!hasRole) {
            throw new ForbiddenException('ທ່ານບໍ່ມີສິດເຂົ້າເຖິງຂໍ້ມູນໃນສ່ວນນີ້ (ADMIN Only)');
        }

        return true;
    }
}