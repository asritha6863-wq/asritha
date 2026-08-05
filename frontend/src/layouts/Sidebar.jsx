import { NavLink } from 'react-router-dom';
import { ROLE_DASHBOARD_PATH, ROLES } from '../constants/roles';
import useAuth from '../hooks/useAuth';

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ico = ({ d, className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICONS = {
  home:    'M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9',
  users:   'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 4a3 3 0 0 1 6 0v2h-6v-2z',
  building:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  user:    'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  plus:    'M12 5v14M5 12h14',
  list:    'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4',
  draft:   'M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 0 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  bell:    'M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9',
  clock:   'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
};

const linkBase = 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors';
const linkClasses = ({ isActive }) =>
  `${linkBase} ${isActive ? 'bg-pink-700 text-white' : 'text-pink-100 hover:bg-pink-800 hover:text-white'}`;

const SectionLabel = ({ children }) => (
  <p className="mt-5 mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
    {children}
  </p>
);

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = ({ open, onClose }) => {
  const { user } = useAuth();
  const dashboardPath = user ? ROLE_DASHBOARD_PATH[user.role] : '/dashboard';
  const isRE   = user?.role === ROLES.REQUESTING_EMPLOYEE;
  const isSE   = user?.role === ROLES.SENIOR_EMPLOYEE;
  const isDM   = user?.role === ROLES.DEPARTMENT_MANAGER;
  const isBC   = user?.role === ROLES.BUDGET_CONTROLLER;
  const isMD   = user?.role === ROLES.MANAGING_DIRECTOR;
  const isDD   = user?.role === ROLES.DEPARTMENT_DIRECTOR;
  const isAcc  = user?.role === ROLES.ACCOUNTANT;
  const isFM   = user?.role === ROLES.FINANCE_MANAGER;
  const isJA   = user?.role === ROLES.JUNIOR_ACCOUNTANT;
  const isAdmin = user?.role === ROLES.ADMIN;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-pink-900 px-4 py-6 transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-100">
            <span className="font-display text-lg font-extrabold text-pink-700">E</span>
          </div>
          <div>
            <p className="font-display text-sm font-bold text-white leading-tight">ERP Procurement</p>
            <p className="text-xs text-slate-400 leading-tight">& Payment Management</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <NavLink to={dashboardPath} end className={linkClasses}>
            <Ico d={ICONS.home} className="h-5 w-5" />
            Dashboard
          </NavLink>

          {/* Requesting Employee nav */}
          {isRE && (
            <>
              <SectionLabel>Requirements</SectionLabel>
              <NavLink to="/requirements/new" className={linkClasses}>
                <Ico d={ICONS.plus} className="h-5 w-5" />
                New Requirement
              </NavLink>
              <NavLink to="/requirements" end className={linkClasses}>
                <Ico d={ICONS.list} className="h-5 w-5" />
                My Requirements
              </NavLink>
              <NavLink to="/requirements?status=Draft" className={({ isActive }) => `${linkBase} ${isActive ? 'bg-pink-700 text-white' : 'text-pink-100 hover:bg-pink-800 hover:text-white'}`}>
                <Ico d={ICONS.draft} className="h-5 w-5" />
                Drafts
              </NavLink>
              <NavLink to="/requirements?status=Submitted" className={({ isActive }) => `${linkBase} ${isActive ? 'bg-pink-700 text-white' : 'text-pink-100 hover:bg-pink-800 hover:text-white'}`}>
                <Ico d={ICONS.clock} className="h-5 w-5" />
                Pending Requests
              </NavLink>
              <SectionLabel>Alerts</SectionLabel>
              <NavLink to="/notifications" className={linkClasses}>
                <Ico d={ICONS.bell} className="h-5 w-5" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Senior Employee nav */}
          {isSE && (
            <>
              <SectionLabel>Approvals</SectionLabel>
              <NavLink to="/review/queue" className={linkClasses}>
                <Ico d={ICONS.list} className="h-5 w-5" />
                Review Queue
              </NavLink>
              <SectionLabel>Documents</SectionLabel>
              <NavLink to="/review/queue" className={({ isActive }) => `${linkBase} ${isActive ? 'bg-pink-700 text-white' : 'text-pink-100 hover:bg-pink-800 hover:text-white'}`}>
                <Ico d={ICONS.draft} className="h-5 w-5" />
                Upload Quotations
              </NavLink>
              <SectionLabel>Alerts</SectionLabel>
              <NavLink to="/notifications" className={linkClasses}>
                <Ico d={ICONS.bell} className="h-5 w-5" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Department Manager nav */}
          {isDM && (
            <>
              <SectionLabel>Approvals</SectionLabel>
              <NavLink to="/review/queue" className={linkClasses}>
                <Ico d={ICONS.list} className="h-5 w-5" />
                Review Queue
              </NavLink>
              <SectionLabel>Alerts</SectionLabel>
              <NavLink to="/notifications" className={linkClasses}>
                <Ico d={ICONS.bell} className="h-5 w-5" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Budget Controller nav */}
          {isBC && (
            <>
              <SectionLabel>Budget Approvals</SectionLabel>
              <NavLink to="/review/queue" className={linkClasses}>
                <Ico d={ICONS.list} className="h-5 w-5" />
                Budget Queue
              </NavLink>
              <SectionLabel>Alerts</SectionLabel>
              <NavLink to="/notifications" className={linkClasses}>
                <Ico d={ICONS.bell} className="h-5 w-5" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Managing Director nav */}
          {isMD && (
            <>
              <SectionLabel>Executive Approvals</SectionLabel>
              <NavLink to="/review/queue" className={linkClasses}>
                <Ico d={ICONS.list} className="h-5 w-5" />
                MD Review Queue
              </NavLink>
              <SectionLabel>Alerts</SectionLabel>
              <NavLink to="/notifications" className={linkClasses}>
                <Ico d={ICONS.bell} className="h-5 w-5" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Department Director nav */}
          {isDD && (
            <>
              <SectionLabel>Director Approvals</SectionLabel>
              <NavLink to="/review/queue" className={linkClasses}>
                <Ico d={ICONS.list} className="h-5 w-5" />
                Director Queue
              </NavLink>
              <SectionLabel>Alerts</SectionLabel>
              <NavLink to="/notifications" className={linkClasses}>
                <Ico d={ICONS.bell} className="h-5 w-5" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Accountant nav */}
          {isAcc && (
            <>
              <SectionLabel>Accounts</SectionLabel>
              <NavLink to="/review/queue" className={linkClasses}>
                <Ico d={ICONS.list} className="h-5 w-5" />
                Verification Queue
              </NavLink>
              <SectionLabel>Alerts</SectionLabel>
              <NavLink to="/notifications" className={linkClasses}>
                <Ico d={ICONS.bell} className="h-5 w-5" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Finance Manager nav */}
          {isFM && (
            <>
              <SectionLabel>Finance</SectionLabel>
              <NavLink to="/review/queue" className={linkClasses}>
                <Ico d={ICONS.list} className="h-5 w-5" />
                Payment Confirmations
              </NavLink>
              <SectionLabel>Alerts</SectionLabel>
              <NavLink to="/notifications" className={linkClasses}>
                <Ico d={ICONS.bell} className="h-5 w-5" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Junior Accountant nav */}
          {isJA && (
            <>
              <SectionLabel>Payments</SectionLabel>
              <NavLink to="/review/queue" className={linkClasses}>
                <Ico d={ICONS.list} className="h-5 w-5" />
                Payment Processing
              </NavLink>
              <SectionLabel>Alerts</SectionLabel>
              <NavLink to="/notifications" className={linkClasses}>
                <Ico d={ICONS.bell} className="h-5 w-5" />
                Notifications
              </NavLink>
            </>
          )}

          {/* Admin nav */}
          {isAdmin && (
            <>
              <SectionLabel>Administration</SectionLabel>
              <NavLink to="/dashboard/admin/users" className={linkClasses}>
                <Ico d={ICONS.users} className="h-5 w-5" />
                Users
              </NavLink>
              <NavLink to="/dashboard/admin/departments" className={linkClasses}>
                <Ico d={ICONS.building} className="h-5 w-5" />
                Departments
              </NavLink>
            </>
          )}

          <SectionLabel>Account</SectionLabel>
          <NavLink to="/profile" className={linkClasses}>
            <Ico d={ICONS.user} className="h-5 w-5" />
            Profile
          </NavLink>
        </nav>

        <div className="mt-6 rounded-lg bg-pink-800 px-3 py-3 text-xs text-pink-200">
          {isRE  ? 'Create and track your purchase requests. Returned items can be edited and resubmitted.'
            : isSE ? 'Review Queue → Quotations → PO upload → confirm sent → GRN → Invoice submission.'
            : isDM ? 'Budget ≤ AED 500 → direct to quotation stage. Budget > AED 500 → Budget Controller.'
            : isBC ? 'AED 500–3,000 → forward to Dept Head. Above AED 3,000 → escalate to MD.'
            : isMD ? 'You approve requests above AED 3,000. Forwards to Department Head after approval.'
            : isDD ? 'First pass → SE collects quotes. PO stage → digitally sign PO. GRN stage → approve GRN.'
            : isAcc ? 'Three-way match: PO + GRN + Invoice must all align before approving payment.'
            : 'Full procurement workflow: PR → SE → DM → BC/MD → Dept Head → Quotation → PO → GRN → Payment.'}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
