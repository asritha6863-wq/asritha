const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose    = require('mongoose');
const User        = require('../models/User');
const Department  = require('../models/Department');
const Designation = require('../models/Designation');
const { ROLES }   = require('../constants/roles');

const DEMO_PASSWORD = 'Passw0rd!';

/**
 * NiSHKA Momentous Jewellery — full department seed
 * Departments: GEN, FIN, SCM, STR, PRD, DES, SAL, MKT, IT, HR, QC, EXP
 * Each department gets: RE, SE, DM, DD (Head)
 * Shared (GEN): BC, MD, Chairman, Admin, Finance Manager, Sr Accountant, Jr Accountant
 */

const DEPARTMENTS_DATA = [
  { departmentName: 'General Administration',    departmentCode: 'GEN' },
  { departmentName: 'Finance & Accounts',        departmentCode: 'FIN' },
  { departmentName: 'Supply Chain Management',   departmentCode: 'SCM' },
  { departmentName: 'Store & Inventory',         departmentCode: 'STR' },
  { departmentName: 'Production',                departmentCode: 'PRD' },
  { departmentName: 'Design & Development',      departmentCode: 'DES' },
  { departmentName: 'Sales & Customer Relations',departmentCode: 'SAL' },
  { departmentName: 'Marketing',                 departmentCode: 'MKT' },
  { departmentName: 'Information Technology',    departmentCode: 'IT'  },
  { departmentName: 'Human Resources',           departmentCode: 'HR'  },
  { departmentName: 'Quality Control',           departmentCode: 'QC'  },
  { departmentName: 'Export & Logistics',        departmentCode: 'EXP' },
];

// Unsplash avatar pool (reused across departments)
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
  // ── EXECUTIVES & SHARED ROLES (GEN) ─────────────────────────────────────
  { email: 'admin@example.com',              role: ROLES.ADMIN,               employeeId: 'EMP-001', firstName: 'Alex',    lastName: 'Admin',       deptCode: 'GEN', profileImage: av() },
  { email: 'requesting_employee@example.com',role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'EMP-002', firstName: 'Riya',    lastName: 'Requester',   deptCode: 'GEN', profileImage: av() },
  { email: 'senior_employee@example.com',    role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'EMP-003', firstName: 'Sam',     lastName: 'Senior',      deptCode: 'GEN', profileImage: av() },
  { email: 'department_manager@example.com', role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'EMP-004', firstName: 'Maya',    lastName: 'Manager',     deptCode: 'GEN', profileImage: av() },
  { email: 'budget_controller@example.com',  role: ROLES.BUDGET_CONTROLLER,   employeeId: 'EMP-005', firstName: 'Ben',     lastName: 'Controller',  deptCode: 'GEN', profileImage: av() },
  { email: 'department_director@example.com',role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'EMP-006', firstName: 'Dana',    lastName: 'Director',    deptCode: 'GEN', profileImage: av() },
  { email: 'managing_director@example.com',  role: ROLES.MANAGING_DIRECTOR,   employeeId: 'EMP-007', firstName: 'Mark',    lastName: 'MD',          deptCode: 'GEN', profileImage: av() },
  { email: 'chairman@example.com',           role: ROLES.CHAIRMAN,            employeeId: 'EMP-008', firstName: 'Charlie', lastName: 'Chairman',    deptCode: 'GEN', profileImage: av() },
  { email: 'accountant@example.com',         role: ROLES.ACCOUNTANT,          employeeId: 'EMP-009', firstName: 'Amara',   lastName: 'Accountant',  deptCode: 'FIN', profileImage: av() },
  { email: 'finance_manager@example.com',    role: ROLES.FINANCE_MANAGER,     employeeId: 'EMP-010', firstName: 'Farhan',  lastName: 'Finance',     deptCode: 'FIN', profileImage: av() },
  { email: 'junior_accountant@example.com',  role: ROLES.JUNIOR_ACCOUNTANT,   employeeId: 'EMP-011', firstName: 'Jiya',    lastName: 'JrAccount',   deptCode: 'FIN', profileImage: av() },

  // ── FINANCE & ACCOUNTS (FIN) ─────────────────────────────────────────────
  { email: 'fin_employee@example.com',  role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'FIN-001', firstName: 'Fatima',  lastName: 'Finance',    deptCode: 'FIN', profileImage: av() },
  { email: 'fin_senior@example.com',    role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'FIN-002', firstName: 'Felix',   lastName: 'Accounts',   deptCode: 'FIN', profileImage: av() },
  { email: 'fin_manager@example.com',   role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'FIN-003', firstName: 'Fiona',   lastName: 'FinMgr',     deptCode: 'FIN', profileImage: av() },
  { email: 'fin_head@example.com',      role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'FIN-004', firstName: 'Frank',   lastName: 'CFO',        deptCode: 'FIN', profileImage: av() },

  // ── SUPPLY CHAIN MANAGEMENT (SCM) ────────────────────────────────────────
  { email: 'scm_employee@example.com',  role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'SCM-001', firstName: 'Sophia',  lastName: 'Supply',     deptCode: 'SCM', profileImage: av() },
  { email: 'scm_senior@example.com',    role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'SCM-002', firstName: 'Steve',   lastName: 'Procurement',deptCode: 'SCM', profileImage: av() },
  { email: 'scm_manager@example.com',   role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'SCM-003', firstName: 'Sara',    lastName: 'SCMMgr',     deptCode: 'SCM', profileImage: av() },
  { email: 'scm_head@example.com',      role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'SCM-004', firstName: 'Simon',   lastName: 'SCMHead',    deptCode: 'SCM', profileImage: av() },

  // ── STORE & INVENTORY (STR) ──────────────────────────────────────────────
  { email: 'str_employee@example.com',  role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'STR-001', firstName: 'Nadia',   lastName: 'Store',      deptCode: 'STR', profileImage: av() },
  { email: 'str_senior@example.com',    role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'STR-002', firstName: 'Neil',    lastName: 'Inventory',  deptCode: 'STR', profileImage: av() },
  { email: 'str_manager@example.com',   role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'STR-003', firstName: 'Nina',    lastName: 'StoreMgr',   deptCode: 'STR', profileImage: av() },
  { email: 'str_head@example.com',      role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'STR-004', firstName: 'Nathan',  lastName: 'StoreHead',  deptCode: 'STR', profileImage: av() },

  // ── PRODUCTION (PRD) ─────────────────────────────────────────────────────
  { email: 'prd_employee@example.com',  role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'PRD-001', firstName: 'Priya',   lastName: 'Crafts',     deptCode: 'PRD', profileImage: av() },
  { email: 'prd_senior@example.com',    role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'PRD-002', firstName: 'Prakash', lastName: 'Goldsmith',  deptCode: 'PRD', profileImage: av() },
  { email: 'prd_manager@example.com',   role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'PRD-003', firstName: 'Parveen', lastName: 'ProdMgr',    deptCode: 'PRD', profileImage: av() },
  { email: 'prd_head@example.com',      role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'PRD-004', firstName: 'Param',   lastName: 'ProdHead',   deptCode: 'PRD', profileImage: av() },

  // ── DESIGN & DEVELOPMENT (DES) ───────────────────────────────────────────
  { email: 'des_employee@example.com',  role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'DES-001', firstName: 'Divya',   lastName: 'Designer',   deptCode: 'DES', profileImage: av() },
  { email: 'des_senior@example.com',    role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'DES-002', firstName: 'Dev',     lastName: 'JewelDes',   deptCode: 'DES', profileImage: av() },
  { email: 'des_manager@example.com',   role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'DES-003', firstName: 'Deepa',   lastName: 'DesMgr',     deptCode: 'DES', profileImage: av() },
  { email: 'des_head@example.com',      role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'DES-004', firstName: 'Dhruv',   lastName: 'DesHead',    deptCode: 'DES', profileImage: av() },

  // ── SALES & CUSTOMER RELATIONS (SAL) ────────────────────────────────────
  { email: 'sal_employee@example.com',  role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'SAL-001', firstName: 'Sunita',  lastName: 'Sales',      deptCode: 'SAL', profileImage: av() },
  { email: 'sal_senior@example.com',    role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'SAL-002', firstName: 'Suresh',  lastName: 'SalesExec',  deptCode: 'SAL', profileImage: av() },
  { email: 'sal_manager@example.com',   role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'SAL-003', firstName: 'Sheila',  lastName: 'SalesMgr',   deptCode: 'SAL', profileImage: av() },
  { email: 'sal_head@example.com',      role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'SAL-004', firstName: 'Sanjay',  lastName: 'SalesHead',  deptCode: 'SAL', profileImage: av() },

  // ── MARKETING (MKT) ──────────────────────────────────────────────────────
  { email: 'marketing_employee@example.com', role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'MKT-001', firstName: 'Mona',   lastName: 'Marketer',     deptCode: 'MKT', profileImage: av() },
  { email: 'marketing_senior@example.com',   role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'MKT-002', firstName: 'Marco',  lastName: 'BrandLead',    deptCode: 'MKT', profileImage: av() },
  { email: 'marketing_manager@example.com',  role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'MKT-003', firstName: 'Mia',    lastName: 'CampaignMgr',  deptCode: 'MKT', profileImage: av() },
  { email: 'marketing_head@example.com',     role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'MKT-004', firstName: 'Martin', lastName: 'MktHead',       deptCode: 'MKT', profileImage: av() },

  // ── INFORMATION TECHNOLOGY (IT) ──────────────────────────────────────────
  { email: 'it_employee@example.com',  role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'IT-001', firstName: 'Ian',    lastName: 'Techie',    deptCode: 'IT', profileImage: av() },
  { email: 'it_senior@example.com',    role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'IT-002', firstName: 'Ivan',   lastName: 'SysAdmin',  deptCode: 'IT', profileImage: av() },
  { email: 'it_manager@example.com',   role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'IT-003', firstName: 'Irene',  lastName: 'DevLead',   deptCode: 'IT', profileImage: av() },
  { email: 'it_head@example.com',      role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'IT-004', firstName: 'Isaac',  lastName: 'IT-Head',   deptCode: 'IT', profileImage: av() },

  // ── HUMAN RESOURCES (HR) ─────────────────────────────────────────────────
  { email: 'hr_employee@example.com',  role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'HR-001', firstName: 'Hema',   lastName: 'HR',        deptCode: 'HR', profileImage: av() },
  { email: 'hr_senior@example.com',    role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'HR-002', firstName: 'Hari',   lastName: 'HRExec',    deptCode: 'HR', profileImage: av() },
  { email: 'hr_manager@example.com',   role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'HR-003', firstName: 'Hina',   lastName: 'HRMgr',     deptCode: 'HR', profileImage: av() },
  { email: 'hr_head@example.com',      role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'HR-004', firstName: 'Hemant', lastName: 'HRHead',     deptCode: 'HR', profileImage: av() },

  // ── QUALITY CONTROL (QC) ─────────────────────────────────────────────────
  { email: 'qc_employee@example.com',  role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'QC-001', firstName: 'Qurat',  lastName: 'QC',        deptCode: 'QC', profileImage: av() },
  { email: 'qc_senior@example.com',    role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'QC-002', firstName: 'Qadir',  lastName: 'Inspector', deptCode: 'QC', profileImage: av() },
  { email: 'qc_manager@example.com',   role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'QC-003', firstName: 'Qasim',  lastName: 'QCMgr',     deptCode: 'QC', profileImage: av() },
  { email: 'qc_head@example.com',      role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'QC-004', firstName: 'Quresh', lastName: 'QCHead',     deptCode: 'QC', profileImage: av() },

  // ── EXPORT & LOGISTICS (EXP) ─────────────────────────────────────────────
  { email: 'exp_employee@example.com', role: ROLES.REQUESTING_EMPLOYEE, employeeId: 'EXP-001', firstName: 'Elena',  lastName: 'Export',    deptCode: 'EXP', profileImage: av() },
  { email: 'exp_senior@example.com',   role: ROLES.SENIOR_EMPLOYEE,     employeeId: 'EXP-002', firstName: 'Ethan',  lastName: 'Logistics', deptCode: 'EXP', profileImage: av() },
  { email: 'exp_manager@example.com',  role: ROLES.DEPARTMENT_MANAGER,  employeeId: 'EXP-003', firstName: 'Eva',    lastName: 'ExpMgr',    deptCode: 'EXP', profileImage: av() },
  { email: 'exp_head@example.com',     role: ROLES.DEPARTMENT_DIRECTOR, employeeId: 'EXP-004', firstName: 'Edwin',  lastName: 'ExpHead',   deptCode: 'EXP', profileImage: av() },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] Connected to MongoDB.');

    // ── 1. Create/Ensure Departments ─────────────────────────────────────────
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
      } else {
        // Update name in case it changed
        dept.departmentName = d.departmentName;
        await dept.save();
        console.log(`[Seed] Ensured department: ${d.departmentName} (${d.departmentCode})`);
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
      const dept  = deptMap[demo.deptCode] || deptMap['GEN'];
      const desig = desigMap[demo.deptCode] || desigMap['GEN'];

      let user = await User.findOne({ email: demo.email });
      if (user) {
        user.department   = dept._id;
        user.designation  = desig._id;
        user.profileImage = demo.profileImage || user.profileImage;
        user.role         = demo.role;
        user.firstName    = demo.firstName;
        user.lastName     = demo.lastName;
        user.employeeId   = demo.employeeId;
        await user.save({ validateBeforeSave: false });
        console.log(`[Seed] Updated: ${demo.email}`);
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

    // ── 4. Set Department Heads ───────────────────────────────────────────────
    const headMap = {
      GEN: 'department_director@example.com',
      FIN: 'fin_head@example.com',
      SCM: 'scm_head@example.com',
      STR: 'str_head@example.com',
      PRD: 'prd_head@example.com',
      DES: 'des_head@example.com',
      SAL: 'sal_head@example.com',
      MKT: 'marketing_head@example.com',
      IT:  'it_head@example.com',
      HR:  'hr_head@example.com',
      QC:  'qc_head@example.com',
      EXP: 'exp_head@example.com',
    };

    for (const [code, email] of Object.entries(headMap)) {
      const headUser = await User.findOne({ email });
      if (headUser && deptMap[code]) {
        deptMap[code].departmentHead = headUser._id;
        await deptMap[code].save();
        console.log(`[Seed] Set ${code} Department Head -> ${headUser.firstName} ${headUser.lastName}`);
      }
    }

    console.log('\n[Seed] ✅ Complete!');
    console.log('Password for ALL demo accounts:', DEMO_PASSWORD);
    console.log('\nDepartments seeded:');
    DEPARTMENTS_DATA.forEach(d => console.log(`  ${d.departmentCode}  ${d.departmentName}`));
    console.log('\nSample logins per dept (email format: <code>_employee@example.com, etc.):');
    console.log('  scm_employee@example.com / scm_senior / scm_manager / scm_head');
    console.log('  str_employee@example.com / str_senior / str_manager / str_head');
    console.log('  prd_employee@example.com / prd_senior / prd_manager / prd_head');
    console.log('  des_employee@example.com / des_senior / des_manager / des_head');
    console.log('  sal_employee@example.com / sal_senior / sal_manager / sal_head');
    console.log('  hr_employee@example.com  / hr_senior  / hr_manager  / hr_head');
    console.log('  qc_employee@example.com  / qc_senior  / qc_manager  / qc_head');
    console.log('  exp_employee@example.com / exp_senior / exp_manager / exp_head');
    console.log('  it_employee@example.com  / it_senior  / it_manager  / it_head');
    console.log('  fin_employee@example.com / fin_senior / fin_manager / fin_head');
    console.log('  marketing_employee@example.com / marketing_senior / marketing_manager / marketing_head');

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Failed:', err.message);
    process.exit(1);
  }
};

seed();
