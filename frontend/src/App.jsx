import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoadingScreen from './components/common/LoadingScreen';
import useAuth from './hooks/useAuth';
import { ROLES, ROLE_DASHBOARD_PATH } from './constants/roles';

// Auth
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// General
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

// Dashboards
import AdminDashboard from './pages/dashboards/AdminDashboard';
import AdminUsers from './pages/dashboards/AdminUsers';
import AdminDepartments from './pages/dashboards/AdminDepartments';
import RequestingEmployeeDashboard from './pages/dashboards/RequestingEmployeeDashboard';
import SeniorEmployeeDashboard from './pages/dashboards/SeniorEmployeeDashboard';
import DepartmentManagerDashboard from './pages/dashboards/DepartmentManagerDashboard';
import BudgetControllerDashboard from './pages/dashboards/BudgetControllerDashboard';
import DepartmentDirectorDashboard from './pages/dashboards/DepartmentDirectorDashboard';
import ManagingDirectorDashboard from './pages/dashboards/ManagingDirectorDashboard';
import ChairmanDashboard from './pages/dashboards/ChairmanDashboard';
import AccountantDashboard from './pages/dashboards/AccountantDashboard';
import FinanceManagerDashboard from './pages/dashboards/FinanceManagerDashboard';
import JuniorAccountantDashboard from './pages/dashboards/JuniorAccountantDashboard';

// Requirements (Requesting Employee only)
import RequirementForm from './pages/requirements/RequirementForm';
import MyRequirements from './pages/requirements/MyRequirements';
import RequirementDetail from './pages/requirements/RequirementDetail';

// Approval (Senior Employee, Dept Manager, etc.)
import ReviewQueue from './pages/approval/ReviewQueue';
import ReviewDetail from './pages/approval/ReviewDetail';
import QuotationUpload from './pages/approval/QuotationUpload';
import POUpload from './pages/approval/POUpload';
import POSignUpload from './pages/approval/POSignUpload';
import GRNUpload from './pages/approval/GRNUpload';
import InvoiceUpload from './pages/approval/InvoiceUpload';

const DashboardRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_DASHBOARD_PATH[user.role] || '/unauthorized'} replace />;
};

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<DashboardRedirect />} />
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Role dashboards */}
          <Route path="/dashboard/requesting-employee" element={<RequestingEmployeeDashboard />} />
          <Route path="/dashboard/senior-employee" element={<SeniorEmployeeDashboard />} />
          <Route path="/dashboard/department-manager" element={<DepartmentManagerDashboard />} />
          <Route path="/dashboard/budget-controller" element={<BudgetControllerDashboard />} />
          <Route path="/dashboard/department-director" element={<DepartmentDirectorDashboard />} />
          <Route path="/dashboard/managing-director" element={<ManagingDirectorDashboard />} />
          <Route path="/dashboard/chairman" element={<ChairmanDashboard />} />
          <Route path="/dashboard/accountant" element={<AccountantDashboard />} />
        </Route>

        {/* Requesting Employee module */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.REQUESTING_EMPLOYEE]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/requirements" element={<MyRequirements />} />
            <Route path="/requirements/new" element={<RequirementForm />} />
            <Route path="/requirements/:id" element={<RequirementDetail />} />
            <Route path="/requirements/:id/edit" element={<RequirementForm />} />
          </Route>
        </Route>

        {/* Approval module — Senior Employee, Dept Manager, and higher roles */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.SENIOR_EMPLOYEE, ROLES.DEPARTMENT_MANAGER, ROLES.BUDGET_CONTROLLER, ROLES.DEPARTMENT_DIRECTOR, ROLES.MANAGING_DIRECTOR, ROLES.CHAIRMAN, ROLES.ACCOUNTANT, ROLES.FINANCE_MANAGER, ROLES.JUNIOR_ACCOUNTANT, ROLES.ADMIN]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/review/queue" element={<ReviewQueue />} />
            <Route path="/review/:id" element={<ReviewDetail />} />
            <Route path="/review/:id/quotations" element={<QuotationUpload />} />
            <Route path="/review/:id/po" element={<POUpload />} />
            <Route path="/review/:id/po-sign" element={<POSignUpload />} />
            <Route path="/review/:id/grn" element={<GRNUpload />} />
            <Route path="/review/:id/invoice" element={<InvoiceUpload />} />
          </Route>
        </Route>

        {/* Accountant dashboard */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard/accountant" element={<AccountantDashboard />} />
          </Route>
        </Route>

        {/* Finance Manager dashboard */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard/finance-manager" element={<FinanceManagerDashboard />} />
          </Route>
        </Route>

        {/* Junior Accountant dashboard */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.JUNIOR_ACCOUNTANT]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard/junior-accountant" element={<JuniorAccountantDashboard />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="/dashboard/admin/users" element={<AdminUsers />} />
            <Route path="/dashboard/admin/departments" element={<AdminDepartments />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
