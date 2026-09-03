import { useAuth } from "@/hooks/useAuth";
import { ClientDashboardView } from "../components/ClientDashboardView";
import { AdminDashboardView } from "../components/AdminDashboardView";
import { Navigate } from "react-router-dom";

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "ADMIN") {
    return <AdminDashboardView />;
  }

  if (user.role === "CLIENT") {
    return <ClientDashboardView />;
  }

  if (user.role === "TECHNICIAN") {
    return <Navigate to="/tech/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-zinc-500 dark:text-zinc-400">You do not have permission to access this page.</p>
      </div>
    </div>
  );
}

export default DashboardPage;
