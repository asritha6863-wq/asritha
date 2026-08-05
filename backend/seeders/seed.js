const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose    = require('mongoose');
const User        = require('../models/User');
const Department  = require('../models/Department');
const Designation = require('../models/Designation');
const { ROLES }   = require('../constants/roles');

const DEMO_PASSWORD = 'Passw0rd!';

/**
 * Seed script creating:
 * - General Administration (GEN), Information Technology (IT), Marketing (MKT)
 * - Department Heads linked to departments
 * - Demo users per department & role with profile photos
 */
const DEPARTMENTS_DATA = [
  { departmentName: 'General Administration', departmentCode: 'GEN' },
  { departmentName: 'Information Technology', departmentCode: 'IT' },
  { departmentName: 'Marketing', departmentCode: 'MKT' },
];

const DEMO_USERS = [
  // Admin & Executives
  {
    email: 'admin@example.com',
    role: ROLES.ADMIN,
    employeeId: 'EMP-001',
    firstName: 'Alex',
    lastName: 'Admin',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'department_director@example.com',
    role: ROLES.DEPARTMENT_DIRECTOR,
    employeeId: 'EMP-006',
    firstName: 'Dana',
    lastName: 'Director',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'managing_director@example.com',
    role: ROLES.MANAGING_DIRECTOR,
    employeeId: 'EMP-007',
    firstName: 'Mark',
    lastName: 'MD',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'chairman@example.com',
    role: ROLES.CHAIRMAN,
    employeeId: 'EMP-008',
    firstName: 'Charlie',
    lastName: 'Chairman',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'budget_controller@example.com',
    role: ROLES.BUDGET_CONTROLLER,
    employeeId: 'EMP-005',
    firstName: 'Ben',
    lastName: 'Controller',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  },

  // Finance & Accounts
  {
    email: 'accountant@example.com',
    role: ROLES.ACCOUNTANT,
    employeeId: 'EMP-009',
    firstName: 'Amara',
    lastName: 'Accountant',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'finance_manager@example.com',
    role: ROLES.FINANCE_MANAGER,
    employeeId: 'EMP-010',
    firstName: 'Farhan',
    lastName: 'Finance',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'junior_accountant@example.com',
    role: ROLES.JUNIOR_ACCOUNTANT,
    employeeId: 'EMP-011',
    firstName: 'Jiya',
    lastName: 'JrAccount',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },

  // Generic Requesting/Senior/Manager (General)
  {
    email: 'requesting_employee@example.com',
    role: ROLES.REQUESTING_EMPLOYEE,
    employeeId: 'EMP-002',
    firstName: 'Riya',
    lastName: 'Requester',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'senior_employee@example.com',
    role: ROLES.SENIOR_EMPLOYEE,
    employeeId: 'EMP-003',
    firstName: 'Sam',
    lastName: 'Senior',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'department_manager@example.com',
    role: ROLES.DEPARTMENT_MANAGER,
    employeeId: 'EMP-004',
    firstName: 'Maya',
    lastName: 'Manager',
    deptCode: 'GEN',
    profileImage: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
  },

  // ── IT DEPARTMENT USERS ──────────────────────────────────────────────────
  {
    email: 'it_employee@example.com',
    role: ROLES.REQUESTING_EMPLOYEE,
    employeeId: 'IT-001',
    firstName: 'Ian',
    lastName: 'Techie',
    deptCode: 'IT',
    profileImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'it_senior@example.com',
    role: ROLES.SENIOR_EMPLOYEE,
    employeeId: 'IT-002',
    firstName: 'Ivan',
    lastName: 'SysAdmin',
    deptCode: 'IT',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'it_manager@example.com',
    role: ROLES.DEPARTMENT_MANAGER,
    employeeId: 'IT-003',
    firstName: 'Irene',
    lastName: 'DevLead',
    deptCode: 'IT',
    profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'it_head@example.com',
    role: ROLES.DEPARTMENT_DIRECTOR,
    employeeId: 'IT-004',
    firstName: 'Isaac',
    lastName: 'IT-Head',
    deptCode: 'IT',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },

  // ── MARKETING DEPARTMENT USERS ───────────────────────────────────────────
  {
    email: 'marketing_employee@example.com',
    role: ROLES.REQUESTING_EMPLOYEE,
    employeeId: 'MKT-001',
    firstName: 'Mona',
    lastName: 'Marketer',
    deptCode: 'MKT',
    profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'marketing_senior@example.com',
    role: ROLES.SENIOR_EMPLOYEE,
    employeeId: 'MKT-002',
    firstName: 'Marco',
    lastName: 'BrandLead',
    deptCode: 'MKT',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'marketing_manager@example.com',
    role: ROLES.DEPARTMENT_MANAGER,
    employeeId: 'MKT-003',
    firstName: 'Mia',
    lastName: 'CampaignMgr',
    deptCode: 'MKT',
    profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'marketing_head@example.com',
    role: ROLES.DEPARTMENT_DIRECTOR,
    employeeId: 'MKT-004',
    firstName: 'Martin',
    lastName: 'Marketing-Head',
    deptCode: 'MKT',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] Connected to MongoDB.');

    // ── 1. Create/Ensure Departments ──────────────────────────────────────────
    const deptMap = {};
    for (const d of DEPARTMENTS_DATA) {
      let dept = await Department.findOne({ departmentCode: d.departmentCode });
      if (!dept) {
        dept = await Department.create({
          departmentName: d.departmentName,
          departmentCode: d.departmentCode,
          status: 'Active',
        });
        console.log(`[Seed] Created department: ${d.departmentName} (${d.departmentCode})`);
      }
      deptMap[d.departmentCode] = dept;
    }

    // ── 2. Create/Ensure Designations ─────────────────────────────────────────
    const desigMap = {};
    for (const code of Object.keys(deptMap)) {
      const dept = deptMap[code];
      let desig = await Designation.findOne({ designationName: 'Staff', department: dept._id });
      if (!desig) {
        desig = await Designation.create({
          designationName: 'Staff',
          department: dept._id,
          level: 1,
          status: 'Active',
        });
      }
      desigMap[code] = desig;
    }

    // ── 3. Create/Update Users ─────────────────────────────────────────────────
    for (const demo of DEMO_USERS) {
      const dept = deptMap[demo.deptCode] || deptMap['GEN'];
      const desig = desigMap[demo.deptCode] || desigMap['GEN'];

      let user = await User.findOne({ email: demo.email });
      if (user) {
        user.department = dept._id;
        user.designation = desig._id;
        user.profileImage = demo.profileImage || user.profileImage;
        user.role = demo.role;
        user.firstName = demo.firstName;
        user.lastName = demo.lastName;
        await user.save({ validateBeforeSave: false });
        console.log(`[Seed] Updated user: ${demo.email}`);
      } else {
        user = await User.create({
          employeeId:     demo.employeeId,
          firstName:      demo.firstName,
          lastName:       demo.lastName,
          email:          demo.email,
          password:       DEMO_PASSWORD,
          role:           demo.role,
          department:     dept._id,
          designation:    desig._id,
          profileImage:   demo.profileImage || '',
          employeeStatus: 'Active',
          isActive:       true,
        });
        console.log(`[Seed] Created user: ${demo.email} (${demo.role})`);
      }
    }

    // ── 4. Set Department Heads ────────────────────────────────────────────────
    // GEN -> Dana Director (or Admin)
    const genHead = await User.findOne({ email: 'department_director@example.com' });
    if (genHead && deptMap['GEN']) {
      deptMap['GEN'].departmentHead = genHead._id;
      await deptMap['GEN'].save();
      console.log('[Seed] Set GEN Department Head -> Dana Director');
    }

    // IT -> Isaac IT-Head
    const itHead = await User.findOne({ email: 'it_head@example.com' });
    if (itHead && deptMap['IT']) {
      deptMap['IT'].departmentHead = itHead._id;
      await deptMap['IT'].save();
      console.log('[Seed] Set IT Department Head -> Isaac IT-Head');
    }

    // MKT -> Martin Marketing-Head
    const mktHead = await User.findOne({ email: 'marketing_head@example.com' });
    if (mktHead && deptMap['MKT']) {
      deptMap['MKT'].departmentHead = mktHead._id;
      await deptMap['MKT'].save();
      console.log('[Seed] Set MKT Department Head -> Martin Marketing-Head');
    }

    console.log('\n[Seed] ✅ Complete. Password for all demo accounts:', DEMO_PASSWORD);
    console.log('\n[Seed] IT Accounts:');
    console.log('  it_employee@example.com      (Requesting Employee)');
    console.log('  it_senior@example.com        (Senior Employee)');
    console.log('  it_manager@example.com       (Department Manager)');
    console.log('  it_head@example.com          (Department Head / Director)');
    console.log('\n[Seed] Marketing Accounts:');
    console.log('  marketing_employee@example.com (Requesting Employee)');
    console.log('  marketing_senior@example.com   (Senior Employee)');
    console.log('  marketing_manager@example.com  (Department Manager)');
    console.log('  marketing_head@example.com     (Department Head / Director)');

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Failed:', err.message);
    process.exit(1);
  }
};

seed();
