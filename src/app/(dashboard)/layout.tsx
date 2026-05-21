import Sidebar from "@/components/layout/Sidebar";
import DashboardRealtimeManager from "@/components/dashboard/DashboardRealtimeManager";
import TicketNotifier from "@/components/layout/TicketNotifier";
import ChatNotifier from "@/components/layout/ChatNotifier";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-transparent">
      <DashboardRealtimeManager />
      <TicketNotifier />
      <ChatNotifier />
      <Sidebar />
      <main className="flex-1 p-6 relative">{children}</main>
    </div>
  );
}
