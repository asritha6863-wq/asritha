const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose    = require('mongoose');
const User        = require('../models/User');
const Department  = require('../models/Department');
const Designation = require('../models/Designation');
const { ROLES }   = require('../constants/roles');

const DEMO_PASSWORD = 'Passw0rd!';

/**
 * NiSHKA Momentous Jewellery — 7 Departments with flexible role structure
 * 
 * Departments: IT, Marketing, General Admin, SCM, Accounts, HR, Investors
 * 
 * Role structure per dept:
 * - All depts: Jr Employee (RE) + Sr Employee + Dept Head
 * - Some depts: have Dept Manager, some don't (workflow skips if missing)
 * - Shared roles (cross-dept): Admin, BC, MD, Chairman, Finance Manager, Sr Accountant, Jr Accountant
 * 
 * Workflow: Jr → Sr → [DM if exists] → Dept Head → quotations → PO → GRN → payment
 */

const DEPARTMENTS_DATA = [
  { departmentName: 'Information Technology',    departmentCode: 'IT',  hasDM: false },  // IT: Jr → Sr → Head (no DM)
  { departmentName: 'Marketing',                 departmentCode: 'MKT', hasDM: true  },  // Marketing: Jr → Sr → DM → Head
  { departmentName: 'General Administration',    departmentCode: 'GEN', hasDM: true  },  // General: Jr → Sr → DM → Head
  { departmentName: 'Supply Chain Management',   departmentCode: 'SCM', hasDM: true  },  // SCM: Jr → Sr → DM → Head
  { departmentName: 'Accounts',                  departmentCode: 'ACC', hasDM: false },  // Accounts: Jr → Sr → Head (no DM)
  { departmentName: 'Human Resources',           departmentCode: 'HR',  hasDM: false },  // HR: Jr → Sr → Head (no DM)
  { departmentName: 'Investors Relations',       departmentCode: 'INV', hasDM: true  },  // Investors: Jr → Sr → DM → Head
];

// Unsplash avatar pool
const AV = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
];
let _av = 0;
const av = () => AV[_av++ % AV.length];

const DEMO_USERS = [
  // ── SHARED / EXECUTIVE ROLES (GEN) ───────────────────────────────────────
  { email: 'admin@example.com',             role: ROLES.ADMIN,               employeeId: 'EMP-001', firstName: 'Alex',    lastName: 'Admin',      deptCode: 'GEN', profileImage: av() },
  { email: 'budget_controller@example.com', role: ROLES.BUDGET_CONTROLLER,   employeeId: 'EMP-005', firstName: 'Ben',     lastName: 'Controller', deptCode: 'GEN', profileImage: av() },
  { email: 'managing_director@example.com', role: ROLES.MANAGING_DIRECTOR,   employeeId: 'EMP-007', firstName: 'Mark',    lastName: 'MD',         deptCode: 'GEN', profileImage: av() },
  { email: 'chairman@example.com',          role: ROLES.CHAIRMAN,            employeeId: 'EMP-008', firstName: 'Charlie', lastName: 'Chairman',   deptCode: 'GEN', profileImage: av() },

  // ── FINANCE TEAM (ACC department) ────────────────────────────────────────
  { email: 'accountant@example.com',        role: ROLES.ACCOUNTANT,          employeeId: 'ACC-010', firstName: 'Amara',   lastName: 'SrAccount',  deptCode: 'ACC', profileImage: av() },
  { email: 'finance_manager@example.com',   role: ROLES.FINANCE_MANAGER,     employeeId: 'ACC-011', firstName: 'Farhan',  lastName: 'FinMgr',     deptCode: 'ACC', profileImage: av() },
  { email: 'junior_accountant@example.com', role: ROLES.JUNIOR_ACCOUNTANT,   employeeId: 'ACC-012', firstName: 'Jiya',    lastName: 'JrAccount',  deptCode: 'ACC', profileImage: av() },

  // ── IT DEPARTMENT (no DM — Jr → Sr → Head) ───────────────────────────────
  { email: 'it_employee@example.com', role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'IT-001', firstName: 'Ian',    lastName: 'Techie',    deptCode: 'IT', profileImage: av() },
  { email: 'it_senior@example.com',   role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'IT-002', firstName: 'Ivan',   lastName: 'SysAdmin',  deptCode: 'IT', profileImage: av() },
  { email: 'it_head@example.com',     role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'IT-004', firstName: 'Isaac',  lastName: 'IT-Head',   deptCode: 'IT', profileImage: av() },

  // ── MARKETING (has DM — Jr → Sr → DM → Head) ─────────────────────────────
  { email: 'marketing_employee@example.com', role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'MKT-001', firstName: 'Mona',   lastName: 'Marketer',   deptCode: 'MKT', profileImage: av() },
  { email: 'marketing_senior@example.com',   role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'MKT-002', firstName: 'Marco',  lastName: 'BrandLead',  deptCode: 'MKT', profileImage: av() },
  { email: 'marketing_manager@example.com',  role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'MKT-003', firstName: 'Mia',    lastName: 'MktMgr',     deptCode: 'MKT', profileImage: av() },
  { email: 'marketing_head@example.com',     role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'MKT-004', firstName: 'Martin', lastName: 'MktHead',    deptCode: 'MKT', profileImage: av() },

  // ── GENERAL ADMINISTRATION (has DM — Jr → Sr → DM → Head) ────────────────
  { email: 'gen_employee@example.com', role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'GEN-001', firstName: 'Riya',  lastName: 'Requester', deptCode: 'GEN', profileImage: av() },
  { email: 'gen_senior@example.com',   role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'GEN-002', firstName: 'Sam',   lastName: 'Senior',    deptCode: 'GEN', profileImage: av() },
  { email: 'gen_manager@example.com',  role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'GEN-003', firstName: 'Maya',  lastName: 'GenMgr',    deptCode: 'GEN', profileImage: av() },
  { email: 'gen_head@example.com',     role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'GEN-004', firstName: 'Dana',  lastName: 'GenHead',   deptCode: 'GEN', profileImage: av() },

  // ── SUPPLY CHAIN MANAGEMENT (has DM — Jr → Sr → DM → Head) ──────────────
  { email: 'scm_employee@example.com', role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'SCM-001', firstName: 'Sophia', lastName: 'Supply',     deptCode: 'SCM', profileImage: av() },
  { email: 'scm_senior@example.com',   role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'SCM-002', firstName: 'Steve',  lastName: 'Procurement',deptCode: 'SCM', profileImage: av() },
  { email: 'scm_manager@example.com',  role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'SCM-003', firstName: 'Sara',   lastName: 'SCMMgr',     deptCode: 'SCM', profileImage: av() },
  { email: 'scm_head@example.com',     role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'SCM-004', firstName: 'Simon',  lastName: 'SCMHead',    deptCode: 'SCM', profileImage: av() },

  // ── ACCOUNTS (no DM — Jr → Sr → Head) ────────────────────────────────────
  { email: 'acc_employee@example.com', role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'ACC-001', firstName: 'Aisha',  lastName: 'AccJr',    deptCode: 'ACC', profileImage: av() },
  { email: 'acc_senior@example.com',   role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'ACC-002', firstName: 'Akash',  lastName: 'AccSr',    deptCode: 'ACC', profileImage: av() },
  { email: 'acc_head@example.com',     role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'ACC-004', firstName: 'Anwar',  lastName: 'AccHead',  deptCode: 'ACC', profileImage: av() },

  // ── HUMAN RESOURCES (no DM — Jr → Sr → Head) ─────────────────────────────
  { email: 'hr_employee@example.com', role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'HR-001', firstName: 'Hema',   lastName: 'HR',      deptCode: 'HR', profileImage: av() },
  { email: 'hr_senior@example.com',   role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'HR-002', firstName: 'Hari',   lastName: 'HRExec',  deptCode: 'HR', profileImage: av() },
  { email: 'hr_head@example.com',     role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'HR-004', firstName: 'Hemant', lastName: 'HRHead',  deptCode: 'HR', profileImage: av() },

  // ── INVESTORS RELATIONS (has DM — Jr → Sr → DM → Head) ───────────────────
  { email: 'inv_employee@example.com', role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'INV-001', firstName: 'Ira',    lastName: 'InvJr',   deptCode: 'INV', profileImage: av() },
  { email: 'inv_senior@example.com',   role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'INV-002', firstName: 'Irfan',  lastName: 'InvSr',   deptCode: 'INV', profileImage: av() },
  { email: 'inv_manager@example.com',  role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'INV-003', firstName: 'Isha',   lastName: 'InvMgr',  deptCode: 'INV', profileImage: av() },
  { email: 'inv_head@example.com',     role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'INV-004', firstName: 'Imran',  lastName: 'InvHead', deptCode: 'INV', profileImage: av() },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] Connected to MongoDB.');

    // ── 1. Create/Update Departments ─────────────────────────────────────────
    const deptMap = {};
    for (const d of DEPARTMENTS_DATA) {
      let dept = await Department.findOne({ departmentCode: d.departmentCode });
      if (!dept) {
        dept = await Department.create({
          departmentName: d.departmentName,
          departmentCode: d.departmentCode,
          status: 'Active',
        });
        console.log(`[Seed] Created: ${d.departmentName} (${d.departmentCode}) — DM: ${d.hasDM ? 'Yes' : 'No'}`);
      } else {
        dept.departmentName = d.departmentName;
        dept.status = 'Active';
        await dept.save();
        console.log(`[Seed] Updated: ${d.departmentName} (${d.departmentCode}) — DM: ${d.hasDM ? 'Yes' : 'No'}`);
      }
      deptMap[d.departmentCode] = dept;
    }

    // ── 2. Create/Ensure Designations ────────────────────────────────────────
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

    // ── 3. Create/Update Users ────────────────────────────────────────────────
    for (const demo of DEMO_USERS) {
      const dept  = deptMap[demo.deptCode];
      const desig = desigMap[demo.deptCode];

      if (!dept || !desig) {
        console.warn(`[Seed] Skipping ${demo.email} — missing dept/desig for ${demo.deptCode}`);
        continue;
      }

      let user = await User.findOne({ email: demo.email });
      if (user) {
        user.department   = dept._id;
        user.designation  = desig._id;
        user.profileImage = demo.profileImage || user.profileImage;
        user.role         = demo.role;
        user.firstName    = demo.firstName;
        user.lastName     = demo.lastName;
        user.employeeId   = demo.employeeId;
        user.isActive     = true;
        await user.save({ validateBeforeSave: false });
        console.log(`[Seed] Updated: ${demo.email} (${demo.role})`);
      } else {
        await User.create({
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
        console.log(`[Seed] Created: ${demo.email} (${demo.role})`);
      }
    }

    // ── 3b. Deactivate old DM users in depts that no longer have DM ──────────
    const noDMDepts = DEPARTMENTS_DATA.filter(d => !d.hasDM).map(d => deptMap[d.departmentCode]?._id).filter(Boolean);
    if (noDMDepts.length > 0) {
      const deactivated = await User.updateMany(
        { role: ROLES.DEPARTMENT_MANAGER, department: { $in: noDMDepts } },
        { isActive: false }
      );
      if (deactivated.modifiedCount > 0) {
        console.log(`[Seed] Deactivated ${deactivated.modifiedCount} DM user(s) in no-DM departments.`);
      }
    }

    // ── 4. Set Department Heads ───────────────────────────────────────────────
    const headMap = {
      IT:  'it_head@example.com',
      MKT: 'marketing_head@example.com',
      GEN: 'gen_head@example.com',
      SCM: 'scm_head@example.com',
      ACC: 'acc_head@example.com',
      HR:  'hr_head@example.com',
      INV: 'inv_head@example.com',
    };

    for (const [code, email] of Object.entries(headMap)) {
      const headUser = await User.findOne({ email });
      if (headUser && deptMap[code]) {
        deptMap[code].departmentHead = headUser._id;
        await deptMap[code].save();
        console.log(`[Seed] Set ${code} Department Head → ${headUser.firstName} ${headUser.lastName}`);
      }
    }

    console.log('\n[Seed] ✅ Complete! Password for ALL accounts: ' + DEMO_PASSWORD);
    console.log('\n7 Departments:');
    DEPARTMENTS_DATA.forEach(d => {
      const dm = d.hasDM ? '✓ has DM' : '✗ no DM';
      console.log(`  ${d.departmentCode}  ${d.departmentName.padEnd(28)} ${dm}`);
    });
    console.log('\nLogin pattern: <code>_employee@example.com / <code>_senior / <code>_manager / <code>_head');
    console.log('  it_employee@example.com  / it_senior@example.com  / it_head@example.com  (no DM)');
    console.log('  marketing_employee / marketing_senior / marketing_manager / marketing_head');
    console.log('  scm_employee / scm_senior / scm_manager / scm_head');
    console.log('  acc_employee / acc_senior / acc_head  (no DM)');
    console.log('  hr_employee / hr_senior / hr_head  (no DM)');
    console.log('  inv_employee / inv_senior / inv_manager / inv_head');
    console.log('  gen_employee / gen_senior / gen_manager / gen_head');
    console.log('\nShared roles (all departments):');
    console.log('  admin@example.com');
    console.log('  budget_controller@example.com');
    console.log('  managing_director@example.com');
    console.log('  chairman@example.com');
    console.log('  accountant@example.com (Senior Accountant)');
    console.log('  finance_manager@example.com');
    console.log('  junior_accountant@example.com');

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

seed();
