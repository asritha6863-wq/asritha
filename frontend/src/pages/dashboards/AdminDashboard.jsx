import DashboardBase from './DashboardBase';

const stats = ['Total Users', 'Departments', 'Active Sessions', 'Pending Approvals'];

const AdminDashboard = () => <DashboardBase statLabels={stats} />;

export default AdminDashboard;
