import DashboardBase from './DashboardBase';

const stats = ['Executive Approvals', 'Total Company Spend', 'Active Vendors', 'Risk Flags'];

const ChairmanDashboard = () => <DashboardBase statLabels={stats} />;

export default ChairmanDashboard;
