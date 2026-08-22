export default function TimelinePage() {
  const events = [
    {
      date: "12 Jan 2024",
      title: "ED visit — oxygen started",
      detail: "SpO₂ 84% room air → NC 2–3 L/min. Target SpO₂ 88–92%.",
      tag: "Critical",
    },
    {
      date: "05 Feb 2024",
      title: "Pulmonary function test",
      detail: "Severe obstruction (FEV1 ~38% predicted). Exertional dyspnea + desaturation.",
      tag: "Diagnostic",
    },
    {
      date: "10 Mar 2024",
      title: "ABG indicates chronic respiratory failure",
      detail: "Hypoxemia + CO₂ retention → controlled oxygen advised (avoid over-oxygenation).",
      tag: "Lab",
    },
    {
      date: "22 Apr 2024",
      title: "Discharge with LTOT plan",
      detail: "LTOT: 2 L/min rest, 3 L/min exertion, ≥15 hrs/day including sleep.",
      tag: "Treatment",
    },
    {
      date: "15 Jun 2024",
      title: "Follow-up stable on LTOT",
      detail: "SpO₂ improves on oxygen; drops off oxygen. Adherence + safety counseling.",
      tag: "Follow-up",
    },
  ];

  const tagStyle: Record<string, string> = {
    Critical: "bg-rose-50 text-rose-700 ring-rose-200",
    Diagnostic: "bg-violet-50 text-violet-700 ring-violet-200",
    Lab: "bg-sky-50 text-sky-700 ring-sky-200",
    Treatment: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "Follow-up": "bg-amber-50 text-amber-700 ring-amber-200",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <h1 className="text-2xl font-semibold text-medx-navy">Medical Timeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-generated from uploaded reports (demo). Focus: COPD + oxygen dependency.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-black/5">
            LTOT Active • Target SpO₂ 88–92%
          </span>
          <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-black/5">
            Latest update: demo
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {events.map((e) => (
          <div
            key={e.title}
            className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:shadow-md"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-medx-navy">{e.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{e.date}</p>
              </div>

              <span
                className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs ring-1 ${
                  tagStyle[e.tag] ?? "bg-slate-50 text-slate-700 ring-slate-200"
                }`}
              >
                {e.tag}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-700">{e.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
