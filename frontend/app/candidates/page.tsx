"use client";

import { useState, useRef, useCallback } from "react";
import {
  LayoutDashboard, Users, BarChart2, GitBranch,
  MessageSquare, PieChart, Bell, User, Briefcase,
  Sparkles, Upload, FileText, GraduationCap,
  Laptop, FolderKanban, Download, CheckCircle2,
  X, ChevronRight,
} from "lucide-react";

// ── Nav ──────────────────────────────────────────────────────────
const navItems = [
  { label: "Dashboard",           icon: LayoutDashboard },
  { label: "Candidates",          icon: Users },
  { label: "Ranking",             icon: BarChart2 },
  { label: "Pipeline",            icon: GitBranch },
  { label: "Interview Questions", icon: MessageSquare },
  { label: "Analytics",           icon: PieChart },
  { label: "Notifications",       icon: Bell },
  { label: "Profile",             icon: User },
];

// ── Mock parsed resume data ───────────────────────────────────────
const parsedData = {
  skills: ["Java", "Spring Boot", "Docker", "AWS", "React"],
  education: [
    { degree: "B.Tech in Computer Science", school: "National Institute of Technology", year: "2020" },
    { degree: "Higher Secondary",           school: "Delhi Public School",              year: "2016" },
  ],
  experience: [
    { role: "Frontend Engineer", company: "TechNova", period: "2022 – Present" },
    { role: "UI Developer",      company: "PixelCraft", period: "2020 – 2022" },
  ],
  projects: [
    { name: "AI Hiring Dashboard",  desc: "Built a responsive recruiter dashboard with analytics, candidate tracking, and smart filters." },
    { name: "Resume Parser",        desc: "Created a resume analysis flow that extracts skills, experience, and education into structured cards." },
  ],
};

const skillColors: Record<string, string> = {
  Java:        "bg-orange-100 text-orange-700",
  "Spring Boot":"bg-green-100 text-green-700",
  Docker:      "bg-blue-100 text-blue-700",
  AWS:         "bg-yellow-100 text-yellow-700",
  React:       "bg-cyan-100 text-cyan-700",
};

export default function CandidateDashboard() {
  const [activeNav, setActiveNav]   = useState("Dashboard");
  const [dragOver, setDragOver]     = useState(false);
  const [file, setFile]             = useState<File | null>(null);
  const [progress, setProgress]     = useState(0);
  const [uploaded, setUploaded]     = useState(false);
  const [analyzed, setAnalyzed]     = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);

  // Simulate upload + analysis
  const handleFile = useCallback((f: File) => {
    if (!f) return;
    setFile(f);
    setProgress(0);
    setUploaded(false);
    setAnalyzed(false);

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 18 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setUploaded(true);
        setTimeout(() => setAnalyzed(true), 600);
      }
      setProgress(Math.min(Math.round(p), 100));
    }, 180);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
    setUploaded(false);
    setAnalyzed(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Sidebar ── */}
      <aside className="w-52 flex-shrink-0 bg-[#0f1c2e] flex flex-col">
        <div className="flex items-center gap-2.5 px-4 py-5">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-[11px] font-semibold tracking-wide">HireFlow AI</p>
            <p className="text-slate-500 text-[10px]">Recruitment workspace</p>
          </div>
        </div>

        <div className="h-px bg-white/5 mx-4" />

        <nav className="flex-1 px-2.5 py-3 space-y-0.5">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors text-left ${
                activeNav === label
                  ? "bg-gray-800 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

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

      {/* ── Content ── */}
      <div className="flex-1 flex gap-4 p-5 overflow-hidden">

        {/* ── Upload Panel ── */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col min-w-0">
          {/* Panel Header */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Resume Upload</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Upload a PDF or DOCX resume to generate AI insights instantly.
              </p>
            </div>
            <span className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 text-[10px] text-gray-500">
              <FileText className="w-3 h-3" />
              Supported formats
            </span>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !file && fileRef.current?.click()}
            className={`flex-1 mt-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : file
                ? "border-gray-200 bg-gray-50 cursor-default"
                : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
            }`}
          >
            {!file ? (
              <>
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-900 text-center">
                  Drag & Drop your Resume here<br />or Browse Files
                </p>
                <p className="text-[11px] text-gray-400 mt-2 text-center max-w-[200px]">
                  Drop your file into this area or click browse to select a document from your device.
                </p>
                <div className="flex gap-3 mt-4">
                  {["PDF", "DOCX"].map((f) => (
                    <span key={f} className="text-[11px] font-medium text-gray-500 border border-gray-200 rounded px-2 py-0.5">
                      {f}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {uploaded ? (
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                ) : (
                  <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
                )}
                <p className="text-sm font-medium text-gray-700">
                  {uploaded ? "Upload complete!" : "Uploading..."}
                </p>
                <p className="text-[11px] text-gray-400">{file.name}</p>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={onInputChange}
          />

          {/* File progress row */}
          {file && (
            <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-[10px] text-gray-400">
                    {uploaded ? "Uploading complete" : `Uploading... ${progress}%`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {uploaded && (
                    <span className="text-[11px] font-medium text-green-600">Upload Successful</span>
                  )}
                  <button onClick={removeFile} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${uploaded ? "bg-green-500" : "bg-blue-500"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">Progress</span>
                <span className="text-[10px] text-gray-400">{progress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* ── AI Analysis Panel ── */}
        <div className="w-[340px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col overflow-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">AI Resume Analysis</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Parsed resume data organized into skills, education, experience, and projects.
              </p>
            </div>
            {analyzed && (
              <span className="flex items-center gap-1 bg-purple-50 text-purple-600 text-[10px] font-medium px-2 py-1 rounded-lg">
                <Sparkles className="w-3 h-3" />
                AI parsed
              </span>
            )}
          </div>

          {!analyzed ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">No resume analysed yet</p>
              <p className="text-[11px] text-gray-400 max-w-[200px]">
                Upload a resume on the left and AI will parse it instantly.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">

              {/* Skills */}
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-[12px] font-semibold text-gray-700">Skills Detected</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parsedData.skills.map((s) => (
                    <span
                      key={s}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${skillColors[s] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education + Experience */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[12px] font-semibold text-gray-700">Education</p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {parsedData.education.map((e) => (
                      <div key={e.degree}>
                        <p className="text-[11px] font-medium text-gray-900 leading-snug">{e.degree}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{e.school}</p>
                        <p className="text-[10px] text-gray-400">{e.year}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Laptop className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[12px] font-semibold text-gray-700">Experience</p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {parsedData.experience.map((e) => (
                      <div key={e.role} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-[11px] font-medium text-gray-900">{e.role}</p>
                          <p className="text-[10px] text-gray-500">{e.company} • {e.period}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Projects */}
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <FolderKanban className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-[12px] font-semibold text-gray-700">Projects</p>
                </div>
                <div className="flex flex-col gap-3">
                  {parsedData.projects.map((p) => (
                    <div key={p.name} className="border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-medium text-gray-900">{p.name}</p>
                        <ChevronRight className="w-3 h-3 text-gray-300" />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Download */}
              <button className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-[12px] font-medium py-2.5 rounded-xl transition-colors">
                <Download className="w-3.5 h-3.5" />
                Download Analysis
              </button>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}