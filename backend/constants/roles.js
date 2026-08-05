// Centralized list of all valid user roles in the system.
// Import this everywhere instead of hardcoding role strings.

const ROLES = {
  ADMIN: 'Admin',
  REQUESTING_EMPLOYEE: 'Requesting Employee',
  SENIOR_EMPLOYEE: 'Senior Employee',
  DEPARTMENT_MANAGER: 'Department Manager',
  BUDGET_CONTROLLER: 'Budget Controller',
  DEPARTMENT_DIRECTOR: 'Department Director',
  MANAGING_DIRECTOR: 'Managing Director',
  CHAIRMAN: 'Chairman',
  ACCOUNTANT: 'Accountant',
  FINANCE_MANAGER: 'Finance Manager',
  JUNIOR_ACCOUNTANT: 'Junior Accountant',
};

const ALL_ROLES = Object.values(ROLES);

module.exports = { ROLES, ALL_ROLES };
