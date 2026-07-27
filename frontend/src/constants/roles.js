// Mirrors backend/constants/roles.js - keep in sync.
export const ROLES = {
  ADMIN: 'Admin',
  REQUESTING_EMPLOYEE: 'Requesting Employee',
  SENIOR_EMPLOYEE: 'Senior Employee',
  DEPARTMENT_MANAGER: 'Department Manager',
  BUDGET_CONTROLLER: 'Budget Controller',
  DEPARTMENT_DIRECTOR: 'Department Director',
  MANAGING_DIRECTOR: 'Managing Director',
  CHAIRMAN: 'Chairman',
  ACCOUNTANT: 'Accountant',
};

export const ALL_ROLES = Object.values(ROLES);

// Maps each role to its dashboard route path segment.
export const ROLE_DASHBOARD_PATH = {
  [ROLES.ADMIN]: '/dashboard/admin',
  [ROLES.REQUESTING_EMPLOYEE]: '/dashboard/requesting-employee',
  [ROLES.SENIOR_EMPLOYEE]: '/dashboard/senior-employee',
  [ROLES.DEPARTMENT_MANAGER]: '/dashboard/department-manager',
  [ROLES.BUDGET_CONTROLLER]: '/dashboard/budget-controller',
  [ROLES.DEPARTMENT_DIRECTOR]: '/dashboard/department-director',
  [ROLES.MANAGING_DIRECTOR]: '/dashboard/managing-director',
  [ROLES.CHAIRMAN]: '/dashboard/chairman',
  [ROLES.ACCOUNTANT]: '/dashboard/accountant',
};
