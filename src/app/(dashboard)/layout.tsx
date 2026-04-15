import Sidebar from "@/components/layout/Sidebar";
import DashboardRealtimeManager from "@/components/dashboard/DashboardRealtimeManager";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-transparent">
      <DashboardRealtimeManager />
      <Sidebar />
      <main className="flex-1 p-6 relative">{children}</main>
    </div>
  );
}
