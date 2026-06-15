"use client";

import { useState } from "react";
import {
  LayoutDashboard, Users, GitBranch, BarChart2,
  MessageSquare, PieChart, Bell, User, Briefcase,
  FileText, UserCheck, CalendarDays, Trophy,
  Upload, TrendingUp, TrendingDown, Sparkles, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const weeklyData = [
  { day: "Mon", apps: 18 },
  { day: "Tue", apps: 24 },
  { day: "Wed", apps: 15 },
  { day: "Thu", apps: 30 },
  { day: "Fri", apps: 22 },
  { day: "Sat", apps: 8 },
  { day: "Sun", apps: 7 },
];

const navItems = [
  { label: "Dashboard",           icon: LayoutDashboard, href: "/dashboard" },
  { label: "Candidates",          icon: Users,           href: "/candidates" },
  { label: "Pipeline",            icon: GitBranch,       href: "/pipeline" },
  { label: "Rankings",            icon: BarChart2,       href: "/rankings" },
  { label: "Interview Questions", icon: MessageSquare,   href: "/interviews" },
  { label: "Analytics",           icon: PieChart,        href: "/analytics" },
  { label: "Notifications",       icon: Bell,            href: "/notifications" },
  { label: "Profile",             icon: User,            href: "/profile" },
];

const metrics = [
  { label: "Total Applications",     value: 124, change: "+12.4%", up: true,  icon: FileText,    color: "bg-blue-50 text-blue-500" },
  { label: "Shortlisted Candidates", value: 38,  change: "+8.1%",  up: true,  icon: UserCheck,   color: "bg-green-50 text-green-500" },
  { label: "Interviews Scheduled",   value: 12,  change: "-3.2%",  up: false, icon: CalendarDays,color: "bg-orange-50 text-orange-500" },
  { label: "Hired This Month",       value: 5,   change: "+5.7%",  up: true,  icon: Trophy,      color: "bg-purple-50 text-purple-500" },
];

const activities = [
  {
    icon: Upload,
    color: "bg-blue-50 text-blue-500",
    title: "Resume uploaded by John Doe",
    time: "09:42 AM",
    desc: "New candidate profile added to the system.",
  },
  {
    icon: UserCheck,
    color: "bg-purple-50 text-purple-500",
    title: "Candidate Rahul Sharma shortlisted",
    time: "10:18 AM",
    desc: "AI score exceeded the shortlist threshold.",
  },
  {
    icon: CalendarDays,
    color: "bg-orange-50 text-orange-500",
    title: "Interview scheduled with Amit Kumar",
    time: "11:05 AM",
    desc: "Technical round booked for Thursday afternoon.",
  },
];

export default function RecruiterDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-52 flex-shrink-0 bg-[#0f1c2e] flex flex-col">

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-5">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-[11px] font-semibold tracking-wide">HireFlow AI</p>
            <p className="text-slate-500 text-[10px]">Recruiter Dashboard</p>
          </div>
        </div>

        <div className="h-px bg-white/5 mx-4" />

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors text-left ${
                activeNav === label
                  ? "bg-blue-700 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* AI Insights card */}
        <div className="p-3 pb-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <p className="text-slate-200 text-[11px] font-medium">AI Insights</p>
            </div>
            <p className="text-slate-500 text-[10px] mb-2">Smart hiring recommendations</p>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-[65%] bg-blue-500 rounded-full" />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-auto">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-0">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Recruiter Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Overview of hiring activity and application performance
            </p>
          </div>
          <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 bg-white hover:bg-gray-50 transition-colors">
            <Calendar className="w-3.5 h-3.5" />
            This Month
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-3 px-6 py-4">
          {metrics.map(({ label, value, change, up, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[11px] font-medium flex items-center gap-0.5 ${up ? "text-green-600" : "text-red-500"}`}>
                  {up
                    ? <TrendingUp className="w-3 h-3" />
                    : <TrendingDown className="w-3 h-3" />
                  }
                  {change}
                </span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
              <p className="text-[11px] text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-2 gap-3 px-6 pb-6 flex-1 min-h-0">

          {/* Recent Activity */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col overflow-auto">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-sm font-medium text-gray-900">Recent Activity</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Latest updates from your hiring pipeline
                </p>
              </div>
              <span className="flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-medium px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Live
              </span>
            </div>

            <div className="divide-y divide-gray-50 mt-2">
              {activities.map(({ icon: Icon, color, title, time, desc }) => (
                <div key={title} className="flex items-start gap-2.5 py-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <p className="text-[12px] font-medium text-gray-900">{title}</p>
                      <p className="text-[10px] text-gray-400 ml-2 whitespace-nowrap">{time}</p>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col">
            <div className="mb-1">
              <h2 className="text-sm font-medium text-gray-900">Applications per Week</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Weekly application volume trend</p>
            </div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[11px] text-gray-500">Applications</span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar dataKey="apps" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}