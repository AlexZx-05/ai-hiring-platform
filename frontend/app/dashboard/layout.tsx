import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      {children}
    </div>
  );
}