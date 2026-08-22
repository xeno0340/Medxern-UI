"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Stethoscope,
  Share2,
  ShieldCheck,
  Bot,
  HeartPulse,
  CalendarClock,
  Cpu,
  Bell,
  ArrowUpRight,
  Download,
  Activity,
  type LucideIcon,
  Loader2,
} from "lucide-react";

// ✅ Firebase callable
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase";

type Report = {
  id: string;
  name: string;
  category: "Lab" | "Imaging" | "Prescription" | "Other";
  date: string;
  highlight?: string;
};

type ActivityItem = {
  id: string;
  label: string;
  time: string;
};

type GenerateTimelinePdfResult = {
  ok: boolean;
  pdfUrl: string;
  storagePath: string;
  reportCount: number;
};

const mockReports: Report[] = [
  {
    id: "r1",
    name: "CBC + Lipid Profile",
    category: "Lab",
    date: "Jan 12, 2026",
    highlight: "Hb slightly high — can reflect chronic low oxygen (hypoxemia).",
  },
  {
    id: "r2",
    name: "Chest X-Ray",
    category: "Imaging",
    date: "Jan 05, 2026",
    highlight: "Hyperinflated lungs — consistent with COPD/emphysema pattern.",
  },
  {
    id: "r3",
    name: "Prescription (General Physician)",
    category: "Prescription",
    date: "Dec 28, 2025",
    highlight: "LTOT continued — target SpO₂ 88–92% with controlled oxygen flow.",
  },
];

const mockActivity: ActivityItem[] = [
  { id: "a1", label: "Report uploaded: CBC + Lipid Profile", time: "Today • 11:10 AM" },
  { id: "a2", label: "Records shared with Dr. Rao", time: "Yesterday • 6:40 PM" },
  { id: "a3", label: "Clinic viewed your history", time: "Jan 13 • 2:15 PM" },
  { id: "a4", label: "Report uploaded: Chest X-Ray", time: "Jan 05 • 9:02 AM" },
  { id: "a5", label: "MEDXERN ID created", time: "Dec 28 • 4:21 PM" },
];

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warn";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : "bg-white/80 text-muted-foreground ring-black/5";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs shadow-sm ring-1 backdrop-blur ${toneClass}`}
    >
      {children}
    </span>
  );
}

function CardShell({
  title,
  children,
  rightSlot,
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-medx-navy">{title}</h2>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtext,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-medx-teal/15 text-medx-teal ring-1 ring-medx-teal/15">
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-medx-navy">{title}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-2xl font-semibold text-medx-navy">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      </div>
    </div>
  );
}

function ReportBadge({ category }: { category: Report["category"] }) {
  const map: Record<Report["category"], string> = {
    Lab: "bg-sky-50 text-sky-700 ring-sky-200",
    Imaging: "bg-violet-50 text-violet-700 ring-violet-200",
    Prescription: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Other: "bg-slate-50 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${map[category]}`}
    >
      {category}
    </span>
  );
}

function StepRow({
  active,
  label,
  done,
}: {
  active: boolean;
  label: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2">
      <span className={active ? "text-medx-navy font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={
          done
            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
            : active
            ? "rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800"
            : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700"
        }
      >
        {done ? "Done" : active ? "Running" : "Pending"}
      </span>
    </div>
  );
}

export default function PatientDashboard() {
  // reports as state (so UI updates after upload)
  const [reports, setReports] = useState<Report[]>(mockReports);

  // mock “stats” derived from reports state
  const reportsStored = String(reports.length);
  const doctorsConnected = "0";
  const recordsShared = "0";
  const alerts = "Stable";

  // Upload modal + mock processing states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);

  // Track timeouts so we can cancel if user closes/restarts quickly
  const timersRef = useRef<number[]>([]);

  // ✅ Doctor Summary button generates Timeline PDF
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  function clearAllTimers() {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }

  function openUploadModalClean() {
    clearAllTimers();
    setFileName("");
    setProcessing(false);
    setStep(0);
    setUploadOpen(true);
  }

  function startMockUpload() {
    clearAllTimers();

    setProcessing(true);
    setStep(1);

    timersRef.current.push(window.setTimeout(() => setStep(2), 900)); // extracting
    timersRef.current.push(window.setTimeout(() => setStep(3), 1800)); // creating events
    timersRef.current.push(window.setTimeout(() => setStep(4), 2600)); // done

    timersRef.current.push(
      window.setTimeout(() => {
        const cleanName =
          (fileName || "New Uploaded Report")
            .replace(/_/g, " ")
            .replace(/\.(pdf|docx|png|jpg|jpeg)$/i, "")
            .trim() || "New Uploaded Report";

        setReports((prev) => [
          {
            id: `r_${Date.now()}`,
            name: cleanName,
            category: "Other",
            date: "Today",
            highlight: "Oxygen therapy + hypoxemia details extracted — timeline updated.",
          },
          ...prev,
        ]);

        // close & reset modal after successful run
        setProcessing(false);
        setStep(0);
        setFileName("");
        setUploadOpen(false);
        clearAllTimers();
      }, 3000)
    );
  }

  function resetUpload() {
    clearAllTimers();
    setFileName("");
    setProcessing(false);
    setStep(0);
    setUploadOpen(false);
  }

  async function handleDoctorSummaryClick() {
    setGeneratingPdf(true);
    setPdfError(null);

    try {
      const functions = getFunctions(app, "asia-south1");
      const fn = httpsCallable<unknown, GenerateTimelinePdfResult>(
        functions,
        "generateTimelinePdf"
      );

      // ✅ no payload; function reads from Storage
      const res = await fn({});
      const data = res.data;

      if (!data?.ok || !data.pdfUrl) {
        throw new Error("No PDF URL returned from server.");
      }

      window.open(data.pdfUrl, "_blank", "noopener,noreferrer");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setPdfError(e?.message || "Failed to generate Doctor Summary PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-medx-navy">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Your records aren’t just stored — they’re summarized into a clear health story.
        </p>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-medx-teal/15 via-white to-medx-gold/15 p-6 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-medx-teal/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-medx-gold/25 blur-3xl" />

        <div className="relative grid gap-4 lg:grid-cols-3">
          {/* Left */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-black/5">
                  <HeartPulse className="h-5 w-5 text-medx-teal" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-medx-navy">Health Snapshot</p>
                  <p className="text-xs text-muted-foreground">
                    Updated from your uploaded reports (mocked for demo).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Pill>Last updated: 8 days ago</Pill>
                <Pill tone="success">Status: Stable</Pill>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Health Story */}
              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-black/5 shadow-sm">
                <p className="text-sm font-semibold text-medx-navy">Health Story</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  You have oxygen-dependent COPD/hypoxemia. LTOT plan is active and stable. Upload new
                  reports to refresh your timeline and risk checks.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill tone="success">No critical alerts</Pill>
                  <Pill>Follow-up due: 6–8 weeks</Pill>
                </div>

                <Button
                  variant="secondary"
                  className="mt-4 w-full justify-between bg-white/80 ring-1 ring-black/5 hover:bg-medx-teal/10"
                  asChild
                >
                  <Link href="/patient/timeline">
                    View Timeline <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Oxygen Therapy */}
              <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-black/5 shadow-sm">
                <p className="text-sm font-semibold text-medx-navy">Oxygen Therapy</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Make oxygen the centerpiece — this is your standout differentiator.
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/80 p-3 ring-1 ring-black/5">
                    <p className="text-[11px] text-muted-foreground">Rest</p>
                    <p className="text-lg font-semibold text-medx-navy">2 L/min</p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-3 ring-1 ring-black/5">
                    <p className="text-[11px] text-muted-foreground">Exertion</p>
                    <p className="text-lg font-semibold text-medx-navy">3 L/min</p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-3 ring-1 ring-black/5">
                    <p className="text-[11px] text-muted-foreground">Target SpO₂</p>
                    <p className="text-lg font-semibold text-medx-navy">88–92%</p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-medx-teal/10 p-3 ring-1 ring-medx-teal/15">
                  <p className="text-xs text-medx-navy">
                    Tip: Use controlled oxygen to avoid CO₂ retention in COPD patients.
                  </p>
                </div>

                <Button className="mt-4 w-full justify-between shadow-sm" onClick={openUploadModalClean}>
                  Upload Report <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <CardShell title="Quick Actions">
              <div className="grid gap-2">
                <Button className="justify-between shadow-sm" asChild>
                  <Link href="/patient/reports">
                    Manage reports <FileText className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  variant="secondary"
                  className="justify-between bg-white/80 ring-1 ring-black/5 hover:bg-medx-teal/10"
                  asChild
                >
                  <Link href="/patient/assistant">
                    Open AI Assistant <Bot className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  variant="secondary"
                  className="justify-between bg-white/80 ring-1 ring-black/5 hover:bg-medx-teal/10"
                  asChild
                >
                  <Link href="/patient/appointments">
                    Book appointment <CalendarClock className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  variant="secondary"
                  className="justify-between bg-white/80 ring-1 ring-black/5 hover:bg-medx-teal/10"
                  asChild
                >
                  <Link href="/patient/devices">
                    Connect a device <Cpu className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardShell>

            <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-medx-navy">Alerts</h2>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                <p className="text-sm font-semibold text-emerald-900">Stable</p>
                <p className="mt-1 text-xs text-emerald-700">
                  No critical issues detected. Upload new reports to refresh oxygen risk checks.
                </p>
              </div>

              <Button
                variant="secondary"
                className="mt-3 w-full justify-between bg-white/80 ring-1 ring-black/5 hover:bg-medx-teal/10"
                onClick={handleDoctorSummaryClick}
                disabled={generatingPdf}
              >
                {generatingPdf ? (
                  <>
                    Generating Summary…
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </>
                ) : (
                  <>
                    Download Doctor Summary <Download className="h-4 w-4" />
                  </>
                )}
              </Button>

              {pdfError ? (
                <div className="mt-2 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200">
                  <p className="text-xs font-semibold text-rose-900">Generation failed</p>
                  <p className="mt-1 text-xs text-rose-700">{pdfError}</p>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </section>

      {/* Top Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} title="Reports Stored" value={reportsStored} subtext="Last upload 5 days ago" />
        <StatCard icon={Stethoscope} title="Doctors Connected" value={doctorsConnected} subtext="Access controlled by you" />
        <StatCard icon={Share2} title="Records Shared" value={recordsShared} subtext="View sharing history" />
        <StatCard icon={ShieldCheck} title="Health Status" value={alerts} subtext="No critical alerts detected" />
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Reports */}
        <CardShell
          title="Recent Reports"
          rightSlot={
            <Button variant="ghost" size="sm" asChild className="hover:bg-medx-teal/10">
              <Link href="/patient/reports">View all</Link>
            </Button>
          }
        >
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-white/70 p-4 ring-1 ring-black/5 transition hover:bg-white"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-medx-navy">{r.name}</p>
                    <ReportBadge category={r.category} />
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">{r.date}</p>

                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                    <span className="font-medium text-medx-navy">AI highlight:</span>{" "}
                    {r.highlight ?? "Key insights will appear here after processing."}
                  </p>
                </div>

                <Button variant="secondary" size="sm" className="bg-white/80 ring-1 ring-black/5">
                  Open
                </Button>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Highlights are mocked — will be generated from your OpenAI extraction pipeline.
          </p>
        </CardShell>

        {/* What changed */}
        <CardShell title="What changed?" rightSlot={<Activity className="h-4 w-4 text-muted-foreground" />}>
          <div className="space-y-3">
            <div className="rounded-xl bg-white/70 p-3 ring-1 ring-black/5">
              <p className="text-sm font-semibold text-medx-navy">Oxygen Plan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                LTOT active • Rest 2 L/min • Exertion 3 L/min • Target SpO₂ 88–92%
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-3 ring-1 ring-black/5">
              <p className="text-sm font-semibold text-medx-navy">New Insights</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Lab trends may reflect chronic hypoxemia. Consider follow-up if symptoms increase.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-3 ring-1 ring-black/5">
              <p className="text-sm font-semibold text-medx-navy">Next Best Action</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload ABG / PFT report to update oxygen dependency timeline.
              </p>
            </div>

            <details className="rounded-xl bg-white/70 p-3 ring-1 ring-black/5">
              <summary className="cursor-pointer text-sm font-semibold text-medx-navy">
                View audit trail (optional)
              </summary>
              <div className="mt-3 space-y-2">
                {mockActivity.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3">
                    <p className="text-sm text-medx-navy">{a.label}</p>
                    <p className="shrink-0 text-xs text-muted-foreground">{a.time}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </CardShell>
      </div>

      {/* UPLOAD MODAL */}
      <Dialog open={uploadOpen} onOpenChange={(open) => (open ? openUploadModalClean() : resetUpload())}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-medx-navy">Upload a medical report</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-sm font-medium text-medx-navy">Choose a file</p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX, or image. (Demo: processing is mocked.)
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="example: ABG_Report.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  disabled={processing}
                />
                <Button onClick={startMockUpload} disabled={!fileName || processing} className="shrink-0">
                  {processing ? "Processing…" : "Start"}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <p className="text-sm font-semibold text-medx-navy">Processing</p>
              <div className="mt-3 space-y-2 text-sm">
                <StepRow active={step >= 1} label="Uploading file" />
                <StepRow active={step >= 2} label="Extracting text" />
                <StepRow active={step >= 3} label="Creating structured events" />
                <StepRow active={step >= 4} label="Timeline updated" done={step >= 4} />
              </div>

              {step >= 4 && (
                <div className="mt-4 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                  <p className="text-sm font-semibold text-emerald-900">Done</p>
                  <p className="text-xs text-emerald-700">
                    New events detected from <span className="font-medium">{fileName}</span>.
                  </p>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" className="bg-white/80 ring-1 ring-black/5" onClick={resetUpload}>
                  Close
                </Button>

                <Button className="bg-medx-navy text-white hover:opacity-90" disabled={step < 4} asChild>
                  <Link href="/patient/timeline">View Timeline</Link>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
