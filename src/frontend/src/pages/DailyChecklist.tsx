import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePinRole } from "../hooks/usePinRole";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ChecklistTask {
  id: number;
  label: string;
  sortOrder: number;
}

interface ChecklistEntry {
  taskId: number;
  isDone: boolean;
  remarks: string;
}

// ─── localStorage helpers ──────────────────────────────────────────────────────
const TASKS_KEY = "checklist_tasks";

function getEntryKey(date: string) {
  return `checklist_entries_${date}`;
}

function loadTasks(): ChecklistTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChecklistTask[];
  } catch {
    return [];
  }
}

function saveTasks(tasks: ChecklistTask[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function loadEntries(date: string): ChecklistEntry[] {
  try {
    const raw = localStorage.getItem(getEntryKey(date));
    if (!raw) return [];
    return JSON.parse(raw) as ChecklistEntry[];
  } catch {
    return [];
  }
}

function saveEntries(date: string, entries: ChecklistEntry[]) {
  localStorage.setItem(getEntryKey(date), JSON.stringify(entries));
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Confetti / Applause Animation ────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: "rect" | "circle";
  opacity: number;
}

const CONFETTI_COLORS = [
  "#22c55e",
  "#16a34a",
  "#4ade80",
  "#facc15",
  "#f97316",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

function createParticles(count = 120): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * 200,
    vx: (Math.random() - 0.5) * 6,
    vy: 2 + Math.random() * 5,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 10,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 8,
    shape: Math.random() > 0.5 ? "rect" : "circle",
    opacity: 1,
  }));
}

function ApplauseOverlay({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(createParticles(150));
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const DURATION = 3500; // ms

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, 1 - progress ** 1.8);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onDone();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {/* Big congratulations message */}
      <div className="relative z-10 text-center animate-bounce pointer-events-none select-none">
        <div className="text-6xl mb-3">🎉</div>
        <div className="bg-white/95 rounded-2xl shadow-2xl px-8 py-5 border-2 border-primary">
          <p className="text-2xl font-extrabold text-primary">All Done!</p>
          <p className="text-lg font-semibold text-foreground mt-1">
            Great work today! 🌿
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Every task completed successfully
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Manage Tasks (Owner only) ─────────────────────────────────────────────────
function ManageTasks() {
  const [tasks, setTasks] = useState<ChecklistTask[]>(() => loadTasks());
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const persist = (updated: ChecklistTask[]) => {
    saveTasks(updated);
    setTasks(updated);
  };

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = Date.now();
    const sortOrder = tasks.length;
    persist([...tasks, { id, label, sortOrder }]);
    setNewLabel("");
    inputRef.current?.focus();
  };

  const handleStartEdit = (task: ChecklistTask) => {
    setEditingId(task.id);
    setEditLabel(task.label);
  };

  const handleSaveEdit = (id: number) => {
    const label = editLabel.trim();
    if (!label) return;
    persist(tasks.map((t) => (t.id === id ? { ...t, label } : t)));
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
  };

  const handleDelete = (id: number) => {
    persist(tasks.filter((t) => t.id !== id));
    setDeleteId(null);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...tasks];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    persist(updated.map((t, i) => ({ ...t, sortOrder: i })));
  };

  const moveDown = (idx: number) => {
    if (idx === tasks.length - 1) return;
    const updated = [...tasks];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    persist(updated.map((t, i) => ({ ...t, sortOrder: i })));
  };

  const deleteTarget = tasks.find((t) => t.id === deleteId);

  return (
    <div className="space-y-6">
      {/* Add new task */}
      <div className="space-y-2">
        <Label>Add New Task</Label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="e.g. Water all flowering plants"
            value={newLabel}
            data-ocid="checklist.task.input"
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            onClick={handleAdd}
            disabled={!newLabel.trim()}
            data-ocid="checklist.task.primary_button"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div
          className="text-center py-12 text-muted-foreground border border-dashed rounded-lg"
          data-ocid="checklist.task.empty_state"
        >
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tasks yet</p>
          <p className="text-sm mt-1">Add your first checklist task above.</p>
        </div>
      ) : (
        <div className="space-y-2" data-ocid="checklist.task.list">
          {tasks.map((task, idx) => (
            <div
              key={task.id}
              className="flex items-center gap-2 p-3 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
              data-ocid={`checklist.task.item.${idx + 1}`}
            >
              {/* Order controls */}
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={idx === 0}
                  onClick={() => moveUp(idx)}
                  title="Move up"
                  data-ocid={`checklist.task.toggle.${idx + 1}`}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={idx === tasks.length - 1}
                  onClick={() => moveDown(idx)}
                  title="Move down"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Label or edit input */}
              {editingId === task.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(task.id);
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    autoFocus
                    data-ocid={`checklist.task.input.${idx + 1}`}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveEdit(task.id)}
                    disabled={!editLabel.trim()}
                    data-ocid={`checklist.task.save_button.${idx + 1}`}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    data-ocid={`checklist.task.cancel_button.${idx + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <span className="flex-1 text-sm font-medium">{task.label}</span>
              )}

              {/* Actions */}
              {editingId !== task.id && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => handleStartEdit(task)}
                    title="Edit task"
                    data-ocid={`checklist.task.edit_button.${idx + 1}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(task.id)}
                    title="Delete task"
                    data-ocid={`checklist.task.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="checklist.task.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this task from all future daily
              sheets. Existing entries will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteId(null)}
              data-ocid="checklist.task.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="checklist.task.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Daily Sheet ──────────────────────────────────────────────────────────────
function DailySheet({ isClerk }: { isClerk: boolean }) {
  const [date, setDate] = useState(todayStr());
  const [tasks, setTasks] = useState<ChecklistTask[]>(() => loadTasks());
  const [entries, setEntries] = useState<ChecklistEntry[]>(() =>
    loadEntries(todayStr()),
  );
  const [showApplause, setShowApplause] = useState(false);
  // Track whether we've already shown the applause for this session/date
  const applausedRef = useRef(false);

  // Reload tasks when component mounts
  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  // Reload entries when date changes; reset applause flag
  useEffect(() => {
    setEntries(loadEntries(date));
    applausedRef.current = false;
  }, [date]);

  // Listen for storage events (tasks edited in another tab)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TASKS_KEY) {
        setTasks(loadTasks());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const getEntry = (taskId: number): ChecklistEntry => {
    const existing = entries.find((e) => e.taskId === taskId);
    return existing ?? { taskId, isDone: false, remarks: "" };
  };

  const updateEntry = (
    taskId: number,
    field: "isDone" | "remarks",
    value: boolean | string,
  ) => {
    setEntries((prev) => {
      const existing = prev.find((e) => e.taskId === taskId);
      let updated: ChecklistEntry[];
      if (existing) {
        updated = prev.map((e) =>
          e.taskId === taskId ? { ...e, [field]: value } : e,
        );
      } else {
        const newEntry: ChecklistEntry = {
          taskId,
          isDone: field === "isDone" ? (value as boolean) : false,
          remarks: field === "remarks" ? (value as string) : "",
        };
        updated = [...prev, newEntry];
      }
      saveEntries(date, updated);

      // Check if all done after update — trigger applause for clerk
      if (
        isClerk &&
        field === "isDone" &&
        value === true &&
        !applausedRef.current
      ) {
        const allDoneNow =
          tasks.length > 0 &&
          tasks.every((t) => {
            const entry = updated.find((en) => en.taskId === t.id);
            return entry?.isDone === true;
          });
        if (allDoneNow) {
          applausedRef.current = true;
          setTimeout(() => setShowApplause(true), 200);
        }
      }

      return updated;
    });
  };

  const allDone = tasks.length > 0 && tasks.every((t) => getEntry(t.id).isDone);
  const doneCount = tasks.filter((t) => getEntry(t.id).isDone).length;

  return (
    <>
      {/* Applause overlay */}
      {showApplause && (
        <ApplauseOverlay onDone={() => setShowApplause(false)} />
      )}

      <div className="space-y-4">
        {/* Date picker + progress */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
              data-ocid="checklist.sheet.input"
            />
          </div>
          {tasks.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Badge
                variant={allDone ? "default" : "secondary"}
                className={allDone ? "bg-primary" : ""}
              >
                {doneCount}/{tasks.length} done
              </Badge>
            </div>
          )}
        </div>

        {/* All done banner */}
        {allDone && (
          <div
            className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary"
            data-ocid="checklist.sheet.success_state"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="font-semibold">
              All tasks done! Great work today 🌿
            </span>
          </div>
        )}

        {/* Tasks table */}
        {tasks.length === 0 ? (
          <div
            className="text-center py-12 text-muted-foreground border border-dashed rounded-lg"
            data-ocid="checklist.sheet.empty_state"
          >
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No tasks configured</p>
            <p className="text-sm mt-1">
              The owner needs to add tasks in the "Manage Tasks" tab first.
            </p>
          </div>
        ) : (
          <div
            className="rounded-lg border bg-card overflow-hidden"
            data-ocid="checklist.sheet.table"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground w-8">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                    Task
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground w-16">
                    Done
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => {
                  const entry = getEntry(task.id);
                  return (
                    <tr
                      key={task.id}
                      className={`border-b last:border-0 transition-colors ${entry.isDone ? "bg-primary/5" : "hover:bg-muted/20"}`}
                      data-ocid={`checklist.sheet.row.${idx + 1}`}
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <span
                          className={
                            entry.isDone
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {task.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Checkbox
                          checked={entry.isDone}
                          onCheckedChange={(checked) =>
                            updateEntry(task.id, "isDone", !!checked)
                          }
                          data-ocid={`checklist.sheet.checkbox.${idx + 1}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          placeholder="Add remarks..."
                          value={entry.remarks}
                          onChange={(e) =>
                            updateEntry(task.id, "remarks", e.target.value)
                          }
                          className="h-8 text-sm"
                          data-ocid={`checklist.sheet.input.${idx + 1}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DailyChecklist() {
  const { appRole } = usePinRole();
  const isOwner = appRole === "owner";
  const isClerk = appRole === "clerk";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Daily Checklist
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isOwner
              ? "Manage tasks and track daily operations"
              : "Track your daily tasks and activities"}
          </p>
        </div>
      </div>

      {/* Owner sees two tabs; Clerk sees only Daily Sheet */}
      {isOwner ? (
        <Tabs defaultValue="daily" className="space-y-4">
          <TabsList data-ocid="checklist.tab">
            <TabsTrigger value="daily" data-ocid="checklist.daily.tab">
              Daily Sheet
            </TabsTrigger>
            <TabsTrigger value="manage" data-ocid="checklist.manage.tab">
              Manage Tasks
            </TabsTrigger>
          </TabsList>
          <TabsContent value="daily">
            <DailySheet isClerk={false} />
          </TabsContent>
          <TabsContent value="manage">
            <ManageTasks />
          </TabsContent>
        </Tabs>
      ) : (
        // Clerk (and any unauthenticated state) sees Daily Sheet directly
        <DailySheet isClerk={isClerk} />
      )}
    </div>
  );
}
