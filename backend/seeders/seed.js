require('dotenv').config();
const mongoose    = require('mongoose');
const User        = require('../models/User');
const Department  = require('../models/Department');
const Designation = require('../models/Designation');
const { ROLES }   = require('../constants/roles');

const DEMO_PASSWORD = 'Passw0rd!';

/**
 * Demo users — one per role.
 * Thresholds (AED): DM = 500, BC = 3,000
 *
 * Full workflow:
 *   RE → SE → DM → (BC → MD →) Dept Head
 *   → SE (quotations) → DM → Dept Head (PO sign)
 *   → SE (email supplier) → SE (GRN) → DM → Dept Head
 *   → SE (invoice) → Accountant (3-way match)
 */
const DEMO_USERS = [
  {
    email: 'admin@example.com',
    role: ROLES.ADMIN,
    employeeId: 'EMP-001',
    firstName: 'Alex',
    lastName: 'Admin',
  },
  {
    email: 'requesting_employee@example.com',
    role: ROLES.REQUESTING_EMPLOYEE,
    employeeId: 'EMP-002',
    firstName: 'Riya',
    lastName: 'Requester',
  },
  {
    email: 'senior_employee@example.com',
    role: ROLES.SENIOR_EMPLOYEE,
    employeeId: 'EMP-003',
    firstName: 'Sam',
    lastName: 'Senior',
  },
  {
    email: 'department_manager@example.com',
    role: ROLES.DEPARTMENT_MANAGER,
    employeeId: 'EMP-004',
    firstName: 'Maya',
    lastName: 'Manager',
  },
  {
    email: 'budget_controller@example.com',
    role: ROLES.BUDGET_CONTROLLER,
    employeeId: 'EMP-005',
    firstName: 'Ben',
    lastName: 'Controller',
  },
  {
    email: 'department_director@example.com',
    role: ROLES.DEPARTMENT_DIRECTOR,
    employeeId: 'EMP-006',
    firstName: 'Dana',
    lastName: 'Director',
    // Note: DEPARTMENT_DIRECTOR = Department Head in the workflow
  },
  {
    email: 'managing_director@example.com',
    role: ROLES.MANAGING_DIRECTOR,
    employeeId: 'EMP-007',
    firstName: 'Mark',
    lastName: 'MD',
  },
  {
    email: 'chairman@example.com',
    role: ROLES.CHAIRMAN,
    employeeId: 'EMP-008',
    firstName: 'Charlie',
    lastName: 'Chairman',
  },
  {
    email: 'accountant@example.com',
    role: ROLES.ACCOUNTANT,
    employeeId: 'EMP-009',
    firstName: 'Amara',
    lastName: 'Accountant',
    // Senior Accountant — performs 3-way matching (PO + GRN + Invoice)
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] Connected to MongoDB.');

    // ── 1. Department ─────────────────────────────────────────────────────────
    let department = await Department.findOne({ departmentCode: 'GEN' });
    if (!department) {
      department = await Department.create({
        departmentName: 'General Administration',
        departmentCode: 'GEN',
        status: 'Active',
      });
      console.log('[Seed] Created department: General Administration (GEN)');
    }

    // ── 2. Designation ────────────────────────────────────────────────────────
    let designation = await Designation.findOne({ designationName: 'Staff', department: department._id });
    if (!designation) {
      designation = await Designation.create({
        designationName: 'Staff',
        department: department._id,
        level: 1,
        status: 'Active',
      });
      console.log('[Seed] Created designation: Staff');
    }

    // ── 3. Demo users ─────────────────────────────────────────────────────────
    for (const demo of DEMO_USERS) {
      const exists = await User.findOne({ email: demo.email });
      if (exists) {
        console.log(`[Seed] Skipped (exists): ${demo.email}`);
        continue;
      }
      await User.create({
        employeeId:      demo.employeeId,
        firstName:       demo.firstName,
        lastName:        demo.lastName,
        email:           demo.email,
        password:        DEMO_PASSWORD,
        role:            demo.role,
        department:      department._id,
        designation:     designation._id,
        employeeStatus:  'Active',
        isActive:        true,
      });
      console.log(`[Seed] Created: ${demo.email} (${demo.role})`);
    }

    // ── 4. Set department head to the Admin user ──────────────────────────────
    const admin = await User.findOne({ email: 'admin@example.com' });
    if (admin && !department.departmentHead) {
      department.departmentHead = admin._id;
      await department.save();
      console.log('[Seed] Set department head to Admin.');
    }

    console.log('\n[Seed] ✅ Complete. All demo users share the password:', DEMO_PASSWORD);
    console.log('\n[Seed] Demo accounts:');
    DEMO_USERS.forEach(u => console.log(`  ${u.role.padEnd(28)} → ${u.email}`));
    console.log('\n[Seed] AED Thresholds:');
    console.log('  DM_THRESHOLD  = AED 500   (below this DM forwards direct to SE for quotations)');
    console.log('  BC_THRESHOLD  = AED 3,000 (below this BC forwards to Dept Head; above → MD)');

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Failed:', err.message);
    process.exit(1);
  }
};

seed();
