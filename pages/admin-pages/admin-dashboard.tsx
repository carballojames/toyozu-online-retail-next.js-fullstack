import AdminDashboardClient from "./admin-dashboard-client";

export default function AdminDashboard() {
  // Server wrapper: renders the interactive client dashboard.
  return <AdminDashboardClient />;
}

export { default as AdminDashboardClient } from "./admin-dashboard-client";
