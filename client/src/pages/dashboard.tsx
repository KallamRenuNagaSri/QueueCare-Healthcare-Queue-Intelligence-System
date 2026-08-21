import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { z } from "zod";
import { useStats, useQueue } from "@/hooks/use-patients";
import { SidebarNavContent, type SectionKey } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Sheet, SheetContent, SheetOverlay, SheetPortal } from "@/components/ui/sheet";
import { Users, Clock, Building2, CheckCircle, Activity, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [navOpen, setNavOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState("General");
  const [queue, setQueue] = useState<any[]>([]);
  const [queuesByDept, setQueuesByDept] = useState<Record<string, any[]>>({});
  const [lastCheckedIn, setLastCheckedIn] = useState<any>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const { toast } = useToast();

  // ── In-page navigation ────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard");
  const [highlightedSection, setHighlightedSection] = useState<SectionKey | null>(null);

  const overviewRef   = useRef<HTMLDivElement>(null);
  const addPatientRef = useRef<HTMLDivElement>(null);
  const liveQueueRef  = useRef<HTMLDivElement>(null);
  const deptsRef      = useRef<HTMLDivElement>(null);

  const sectionRefs: Record<SectionKey, React.RefObject<HTMLDivElement>> = {
    dashboard:   overviewRef,
    addPatient:  addPatientRef,
    viewQueues:  liveQueueRef,
    departments: deptsRef,
  };

  /**
   * Scroll to the target section, close the drawer, set active state,
   * and flash a temporary highlight ring on the section.
   */
  const scrollToSection = useCallback((key: SectionKey) => {
    setNavOpen(false);
    setActiveSection(key);

    const el = sectionRefs[key].current;
    if (!el) return;

    // scrollIntoView with smooth behaviour; scroll-mt-24 handles header offset
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    // Flash highlight for 1.4 s then clear
    setHighlightedSection(key);
    setTimeout(() => setHighlightedSection(null), 1400);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver — update active sidebar item while user free-scrolls
  useEffect(() => {
    const HEADER_HEIGHT = 80; // matches h-20
    const observers: IntersectionObserver[] = [];

    const entries = new Map<SectionKey, boolean>();

    const onIntersect =
      (key: SectionKey) => (records: IntersectionObserverEntry[]) => {
        entries.set(key, records[0].isIntersecting);
        // Pick the first section that is currently visible (top-to-bottom order)
        const order: SectionKey[] = ["dashboard", "addPatient", "viewQueues", "departments"];
        const visible = order.find((k) => entries.get(k));
        if (visible) setActiveSection(visible);
      };

    (Object.entries(sectionRefs) as [SectionKey, React.RefObject<HTMLDivElement>][]).forEach(
      ([key, ref]) => {
        if (!ref.current) return;
        const obs = new IntersectionObserver(onIntersect(key), {
          rootMargin: `-${HEADER_HEIGHT}px 0px -60% 0px`,
          threshold: 0,
        });
        obs.observe(ref.current);
        observers.push(obs);
      }
    );

    return () => observers.forEach((o) => o.disconnect());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ─────────────────────────────────────────────────────────────────────────

  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: queueData, isLoading: queueLoading } = useQueue(selectedDept);

  const form = useForm<z.infer<typeof api.patients.checkin.input>>({
    resolver: zodResolver(api.patients.checkin.input),
    defaultValues: { name: "", department: "General" }
  });

  const onSubmit = async (data: z.infer<typeof api.patients.checkin.input>) => {
    setIsCheckingIn(true);
    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, department: data.department }),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = typeof result?.message === "string" ? result.message : "Unable to check in";
        throw new Error(message);
      }

      setLastCheckedIn({
        name: data.name,
        department: data.department,
        queuePosition: result?.queuePosition,
        message: result?.message,
      });
      form.reset({ name: "", department: data.department });
      setSelectedDept(data.department);
      toast({
        title: "Patient Checked In",
        description: `${data.name} added to the ${data.department} queue.`,
      });
    } catch (err) {
      toast({
        title: "Check-in Error",
        description: err instanceof Error ? err.message : "Unable to check in",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Keep the local queue state in sync with the API data,
  // always ensuring it is an array to avoid runtime errors.
  useEffect(() => {
    const nextQueue = (queueData as any)?.queue;
    const safeQueue = Array.isArray(nextQueue) ? nextQueue : [];

    setQueuesByDept((prev) => {
      const prevForDept = prev[selectedDept] ?? [];

      // Merge server patients with any existing local state (to preserve status)
      const merged = safeQueue.map((serverPatient: any) => {
        const existing = prevForDept.find((p: any) => p.id === serverPatient.id);
        const status =
          existing?.status ??
          serverPatient.status ??
          "waiting";

        return {
          ...serverPatient,
          status,
        };
      });

      // Recalculate estimated wait times for waiting patients in this department
      let waitingIndex = 0;
      const withWaits = merged.map((patient: any) => {
        let estimatedWaitTime = 0;
        if (patient.status === "waiting") {
          estimatedWaitTime = waitingIndex * 10;
          waitingIndex += 1;
        }
        return {
          ...patient,
          estimatedWaitTime,
        };
      });

      // Update the visible queue if this is the active department
      setQueue(withWaits);

      return {
        ...prev,
        [selectedDept]: withWaits,
      };
    });
  }, [queueData, selectedDept]);

  // Handler to mark a patient as completed.
  // Calls POST /api/complete/:id to persist the status change to PostgreSQL,
  // then updates local UI state only after the backend confirms success.
  const handleMarkCompleted = async (patientId: number, department: string) => {
    try {
      const response = await fetch(`/api/complete/${patientId}`, {
        method: "POST",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const message =
          typeof result?.message === "string"
            ? result.message
            : "Unable to complete patient";
        throw new Error(message);
      }

      // Backend confirmed — now update local UI state so the row
      // shows "Completed" immediately without waiting for the next poll.
      setQueuesByDept((prev) => {
        const deptQueue = prev[department] ?? [];
        if (!deptQueue.length) return prev;

        // Mark the target patient as completed
        const updatedStatusQueue = deptQueue.map((patient: any) =>
          patient.id === patientId
            ? { ...patient, status: "completed" }
            : patient
        );

        // Recalculate estimated wait times for remaining waiting patients
        let waitingIndex = 0;
        const recalculated = updatedStatusQueue.map((patient: any) => {
          if (patient.status === "waiting") {
            const estimatedWaitTime = Math.max(waitingIndex * 10, 0);
            waitingIndex += 1;
            return { ...patient, estimatedWaitTime };
          }
          // Completed patients — zero wait time
          return { ...patient, estimatedWaitTime: 0 };
        });

        if (department === selectedDept) {
          setQueue(recalculated);
        }

        return {
          ...prev,
          [department]: recalculated,
        };
      });
    } catch (err) {
      toast({
        title: "Completion Error",
        description:
          err instanceof Error ? err.message : "Unable to complete patient",
        variant: "destructive",
      });
    }
  };

  // Derive overview metrics from all known department queues
  const deptNames = Object.keys(queuesByDept);

  const patientsToday = deptNames.reduce((total, dept) => {
    const patients = queuesByDept[dept] ?? [];
    return total + patients.length;
  }, 0);

  // Patients currently waiting (across all departments)
  const patientsWaiting = deptNames.reduce((total, dept) => {
    const patients = queuesByDept[dept] ?? [];
    const waitingCount = patients.filter((p: any) => p.status === "waiting").length;
    return total + waitingCount;
  }, 0);

  // Average wait time based on estimatedWaitTime for waiting patients only
  let totalWait = 0;
  let totalWaitingPatients = 0;

  deptNames.forEach((dept) => {
    const patients = queuesByDept[dept] ?? [];
    patients.forEach((patient: any) => {
      if (patient.status === "waiting") {
        totalWait += patient.estimatedWaitTime ?? 0;
        totalWaitingPatients += 1;
      }
    });
  });

  const avgWait =
    totalWaitingPatients > 0 ? Math.round(totalWait / totalWaitingPatients) : 0;

  const activeDepartments = deptNames.length;

  const statCards = [
    { title: "Patients Today", value: patientsToday, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Patients Waiting", value: patientsWaiting, icon: Activity, color: "text-amber-500", bg: "bg-amber-50" },
    { title: "Active Depts", value: activeDepartments, icon: Building2, color: "text-purple-500", bg: "bg-purple-50" },
    { title: "Avg Wait Time", value: `${avgWait} min`, icon: Clock, color: "text-green-500", bg: "bg-green-50" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">

      {/* Navigation drawer — rendered via Sheet so it overlays without reserving space */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetPortal>
          {/* Lighter overlay than the default bg-black/80 */}
          <SheetOverlay className="bg-black/30" />
          <SheetContent
            id="nav-drawer"
            side="left"
            className="w-72 p-0 bg-white border-r border-border/50 [&>button]:hidden"
          >
            <SidebarNavContent
              onNavigate={() => setNavOpen(false)}
              activeSection={activeSection}
              onSectionClick={scrollToSection}
            />
          </SheetContent>
        </SheetPortal>
      </Sheet>

      {/* Sticky header — spans full width now that sidebar is no longer permanent */}
      <Header
        onMenuClick={() => setNavOpen((prev) => !prev)}
        navOpen={navOpen}
      />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Stats Overview */}
            <div
              ref={overviewRef}
              id="overview-section"
              className={`scroll-mt-24 rounded-2xl transition-shadow duration-700 ${
                highlightedSection === "dashboard"
                  ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10"
                  : ""
              }`}
            >
              <h2 className="text-2xl font-bold text-foreground mb-6">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {statCards.map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-border/50 shadow-soft flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      {statsLoading ? (
                        <div className="h-7 w-16 bg-secondary animate-pulse rounded mt-1"></div>
                      ) : (
                        <h3 className="text-2xl font-bold text-foreground mt-0.5">{stat.value}</h3>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Left Column: Actions */}
              <div
                ref={addPatientRef}
                id="add-patient-section"
                className={`space-y-8 scroll-mt-24 rounded-2xl transition-shadow duration-700 ${
                  highlightedSection === "addPatient"
                    ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10"
                    : ""
                }`}
              >
                {/* Add Patient Form */}
                <div className="bg-white rounded-2xl p-6 border border-border/50 shadow-soft">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Add Patient</h2>
                  </div>

                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Patient Name</label>
                      <input 
                        {...form.register("name")}
                        className="w-full px-4 py-3 rounded-xl bg-secondary border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground"
                        placeholder="John Doe"
                      />
                      {form.formState.errors.name && (
                        <p className="text-destructive text-sm mt-1">{form.formState.errors.name.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Department</label>
                      <select 
                        {...form.register("department")}
                        className="w-full px-4 py-3 rounded-xl bg-secondary border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-foreground appearance-none"
                      >
                        <option value="General">General</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                      </select>
                    </div>

                    <button 
                      type="submit"
                      disabled={isCheckingIn}
                      className="w-full py-3.5 rounded-xl font-semibold bg-gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isCheckingIn ? "Processing..." : "Check In"}
                    </button>
                  </form>
                </div>

                {/* Result Panel */}
                {lastCheckedIn && (
                  <div className="bg-gradient-to-br from-accent to-green-600 rounded-2xl p-6 text-white shadow-lg shadow-accent/30 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 mb-4 text-white/90">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Check-in Successful</span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-white/70 text-sm">Patient</p>
                        <p className="text-2xl font-bold tracking-wider">{lastCheckedIn.name}</p>
                      </div>
                      <div className="flex gap-6 pt-4 border-t border-white/20">
                        <div>
                          <p className="text-white/70 text-sm mb-0.5">Position</p>
                          <p className="text-xl font-semibold">#{lastCheckedIn.queuePosition ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-sm mb-0.5">Department</p>
                          <p className="text-xl font-semibold">{lastCheckedIn.department}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Queue Display */}
              <div
                ref={liveQueueRef}
                id="live-queue-section"
                className={`lg:col-span-2 bg-white rounded-2xl p-6 border border-border/50 shadow-soft flex flex-col h-[600px] scroll-mt-24 transition-shadow duration-700 ${
                  highlightedSection === "viewQueues"
                    ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10"
                    : ""
                }`}
              >
                <div
                  ref={deptsRef}
                  id="departments-section"
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 scroll-mt-24 rounded-xl p-2 -m-2 transition-all duration-700 ${
                    highlightedSection === "departments"
                      ? "ring-2 ring-primary/40 bg-primary/5"
                      : ""
                  }`}
                >
                  <h2 className="text-xl font-bold text-foreground">Live Queue</h2>
                  
                  {/* Department Tabs */}
                  <div className="flex p-1 bg-secondary rounded-xl">
                    {["General", "Cardiology", "Neurology"].map((dept) => (
                      <button
                        key={dept}
                        onClick={() => setSelectedDept(dept)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDept === dept 
                            ? "bg-white text-primary shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-auto rounded-xl border border-border/50 bg-secondary/30 relative">
                  {queueLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : !queue || queue.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="w-12 h-12 mb-3 opacity-20" />
                      <p>No patients currently waiting.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-secondary sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="py-4 px-6 font-semibold text-sm text-muted-foreground">Pos</th>
                          <th className="py-4 px-6 font-semibold text-sm text-muted-foreground">Patient Info</th>
                          <th className="py-4 px-6 font-semibold text-sm text-muted-foreground">Time In</th>
                          <th className="py-4 px-6 font-semibold text-sm text-muted-foreground text-right">Est. Wait</th>
                          <th className="py-4 px-6 font-semibold text-sm text-muted-foreground text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {queue.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 px-6 text-center text-muted-foreground">
                              No patients in queue
                            </td>
                          </tr>
                        ) : (
                          queue.map((patient: any, idx: number) => (
                            <tr key={patient.id ?? idx} className="hover:bg-white transition-colors bg-background/50">
                              <td className="py-4 px-6">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  idx === 0 ? "bg-accent/20 text-accent" : 
                                  idx === 1 ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                                }`}>
                                  {patient.queuePosition ?? idx + 1}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <p className="font-semibold text-foreground">{patient.name ?? "Unknown"}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">{patient.patientId ?? "-"}</p>
                              </td>
                              <td className="py-4 px-6">
                                <p className="text-sm text-foreground">
                                  {patient.arrivalTime ? format(new Date(patient.arrivalTime), "HH:mm") : "-"}
                                </p>
                              </td>
                              <td className="py-4 px-6 text-right">
                                {patient.status === "completed" ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                                    Completed
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      (patient.estimatedWaitTime ?? 0) > 30
                                        ? "bg-red-100 text-red-600"
                                        : (patient.estimatedWaitTime ?? 0) > 15
                                        ? "bg-amber-100 text-amber-600"
                                        : "bg-green-100 text-green-600"
                                    }`}
                                  >
                                    {patient.estimatedWaitTime ?? 0} min
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                {patient.status === "completed" ? (
                                  <span className="text-sm font-semibold text-green-600">
                                    Completed
                                  </span>
                                ) : (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 cursor-default"
                                    >
                                      Waiting
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleMarkCompleted(patient.id, patient.department)
                                      }
                                      className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 transition-colors"
                                    >
                                      Completed
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          </div>
        </main>
    </div>
  );
}
