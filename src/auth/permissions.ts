import { Permission, Role } from '../database/generated/prisma/enums';

const permissionsByRole: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.MANAGE_INSTRUCTORS,
    Permission.APPROVE_INSTRUCTORS,
    Permission.MANAGE_COURSES,
    Permission.APPROVE_COURSES,
    Permission.MANAGE_PROMOTIONS,
    Permission.MANAGE_THEMES,
    Permission.REVIEW_CONTENT,
    Permission.APPROVE_AI_DRAFTS,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_ADMIN_ANALYTICS,
    Permission.VIEW_INSTRUCTOR_ANALYTICS,
    Permission.MANAGE_OWN_COURSES,
    Permission.MANAGE_OWN_PROFILE,
    Permission.VIEW_OWN_STUDENTS,
    Permission.MANAGE_OWN_QUIZZES,
  ],
  [Role.INSTRUCTOR]: [
    Permission.VIEW_INSTRUCTOR_ANALYTICS,
    Permission.MANAGE_OWN_COURSES,
    Permission.MANAGE_OWN_PROFILE,
    Permission.VIEW_OWN_STUDENTS,
    Permission.MANAGE_OWN_QUIZZES,
  ],
  [Role.USER]: [Permission.MANAGE_OWN_PROFILE],
};

export function normalizeRoles(primaryRole: Role, roles?: Role[]) {
  const nextRoles = new Set<Role>(roles?.length ? roles : [primaryRole]);

  nextRoles.add(primaryRole);

  return Array.from(nextRoles);
}

export function getPermissionsForRoles(
  roles: Role[],
  customPermissions: Permission[] = [],
) {
  const permissions = new Set<Permission>(customPermissions);

  roles.forEach((role) => {
    permissionsByRole[role].forEach((permission) =>
      permissions.add(permission),
    );
  });

  return Array.from(permissions);
}
