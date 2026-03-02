"use client";

// app/(admin)/admin/courses/[courseId]/modules/page.tsx
// Module and lesson management for a course.
// Uses up/down buttons for reordering (dnd-kit not installed).

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  Plus,
  ChevronRight,
  ChevronLeft,
  Trash2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LessonType } from "@/lib/generated/prisma/client";

interface LessonItem {
  id: string;
  title: string;
  type: LessonType;
  content: string | null;
  videoUrl: string | null;
  durationSecs: number | null;
  qcReward: number;
  sortOrder: number;
}

interface ModuleItem {
  id: string;
  title: string;
  sortOrder: number;
  lessons: LessonItem[];
}

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  status: string;
  modules: ModuleItem[];
}

const api = (url: string, opts?: RequestInit) => fetch(url, opts);

export default function CourseModulesPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  // New module form
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingModule, setAddingModule] = useState(false);

  // New lesson form per module
  const [lessonForms, setLessonForms] = useState<Record<string, { title: string; type: LessonType; content: string; videoUrl: string; durationSecs: string; qcReward: string }>>({});

  // Lesson edit
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [lessonEdits, setLessonEdits] = useState<Record<string, Partial<LessonItem>>>({});

  const fetchCourse = useCallback(async () => {
    const res = await api(`/api/admin/courses/${courseId}`);
    if (res.ok) {
      const data: CourseDetail = await res.json();
      setCourse(data);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    setAddingModule(true);
    try {
      const modules = course?.modules ?? [];
      const sortOrder = modules.length;
      await api(`/api/admin/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newModuleTitle.trim(), sortOrder }),
      });
      setNewModuleTitle("");
      await fetchCourse();
    } finally {
      setAddingModule(false);
    }
  }

  async function deleteModule(moduleId: string) {
    if (!confirm("Delete this module and all its lessons?")) return;
    await api(`/api/admin/courses/${courseId}/modules/${moduleId}`, { method: "DELETE" });
    await fetchCourse();
  }

  async function moveModule(moduleId: string, direction: "up" | "down") {
    if (!course) return;
    const modules = [...course.modules].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = modules.findIndex((m) => m.id === moduleId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= modules.length) return;

    const a = modules[idx]!;
    const b = modules[swapIdx]!;
    await Promise.all([
      api(`/api/admin/courses/${courseId}/modules/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      }),
      api(`/api/admin/courses/${courseId}/modules/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      }),
    ]);
    await fetchCourse();
  }

  function getLessonForm(moduleId: string) {
    return lessonForms[moduleId] ?? { title: "", type: "ARTICLE" as LessonType, content: "", videoUrl: "", durationSecs: "", qcReward: "5" };
  }

  function setLessonFormField(moduleId: string, field: string, value: string) {
    setLessonForms((prev) => ({
      ...prev,
      [moduleId]: { ...getLessonForm(moduleId), [field]: value },
    }));
  }

  async function addLesson(moduleId: string) {
    const form = getLessonForm(moduleId);
    if (!form.title.trim()) return;
    const module = course?.modules.find((m) => m.id === moduleId);
    const sortOrder = module?.lessons.length ?? 0;

    await api(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        type: form.type,
        content: form.content || null,
        videoUrl: form.videoUrl || null,
        durationSecs: form.durationSecs ? parseInt(form.durationSecs, 10) : null,
        qcReward: parseInt(form.qcReward, 10) || 5,
        sortOrder,
      }),
    });

    setLessonForms((prev) => ({ ...prev, [moduleId]: { title: "", type: "ARTICLE", content: "", videoUrl: "", durationSecs: "", qcReward: "5" } }));
    await fetchCourse();
  }

  async function saveLesson(lessonId: string) {
    const edits = lessonEdits[lessonId];
    if (!edits) return;
    await api(`/api/admin/lessons/${lessonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edits),
    });
    setEditingLesson(null);
    setLessonEdits((prev) => { const n = { ...prev }; delete n[lessonId]; return n; });
    await fetchCourse();
  }

  async function deleteLesson(lessonId: string) {
    if (!confirm("Delete this lesson?")) return;
    await api(`/api/admin/lessons/${lessonId}`, { method: "DELETE" });
    await fetchCourse();
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!course) {
    return <div className="p-6 text-destructive">Course not found.</div>;
  }

  const sortedModules = [...course.modules].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/admin/courses")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Courses
          </button>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            {sortedModules.length} module{sortedModules.length !== 1 ? "s" : ""} ·{" "}
            {sortedModules.reduce((n, m) => n + m.lessons.length, 0)} lessons
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/admin/courses/${courseId}/edit`)}>
            Edit Details
          </Button>
          {course.status !== "PUBLISHED" && (
            <Button
              size="sm"
              onClick={async () => {
                const res = await api(`/api/admin/courses/${courseId}/publish`, { method: "POST" });
                if (!res.ok) {
                  const err = await res.json();
                  alert(err.error ?? "Cannot publish");
                } else {
                  await fetchCourse();
                }
              }}
            >
              Publish Course
            </Button>
          )}
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {sortedModules.map((mod, modIdx) => (
          <Collapsible
            key={mod.id}
            open={openModules.has(mod.id)}
            onOpenChange={() => toggleModule(mod.id)}
          >
            <div className="rounded-md border bg-card">
              {/* Module header */}
              <div className="flex items-center gap-2 p-3">
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={modIdx === 0}
                    onClick={() => moveModule(mod.id, "up")}
                    aria-label="Move module up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={modIdx === sortedModules.length - 1}
                    onClick={() => moveModule(mod.id, "down")}
                    aria-label="Move module down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <CollapsibleTrigger asChild>
                  <button className="flex flex-1 items-center gap-2 text-left">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                    <span className="font-medium">{mod.title}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""})
                    </span>
                    <ChevronRight
                      className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${
                        openModules.has(mod.id) ? "rotate-90" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </CollapsibleTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => deleteModule(mod.id)}
                  aria-label="Delete module"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Lessons */}
              <CollapsibleContent>
                <div className="border-t px-3 pb-3 space-y-2 pt-2">
                  {mod.lessons
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((lesson) => (
                      <div key={lesson.id} className="rounded border p-2 space-y-2 bg-muted/30">
                        {editingLesson === lesson.id ? (
                          <div className="space-y-2">
                            <Input
                              value={lessonEdits[lesson.id]?.title ?? lesson.title}
                              onChange={(e) =>
                                setLessonEdits((p) => ({ ...p, [lesson.id]: { ...p[lesson.id], title: e.target.value } }))
                              }
                              placeholder="Lesson title"
                            />
                            <Textarea
                              value={lessonEdits[lesson.id]?.content ?? lesson.content ?? ""}
                              onChange={(e) =>
                                setLessonEdits((p) => ({ ...p, [lesson.id]: { ...p[lesson.id], content: e.target.value } }))
                              }
                              placeholder="Markdown content"
                              rows={3}
                            />
                            <Input
                              value={lessonEdits[lesson.id]?.videoUrl ?? lesson.videoUrl ?? ""}
                              onChange={(e) =>
                                setLessonEdits((p) => ({ ...p, [lesson.id]: { ...p[lesson.id], videoUrl: e.target.value } }))
                              }
                              placeholder="Video URL (YouTube/Vimeo embed)"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveLesson(lesson.id)}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingLesson(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium truncate">{lesson.title}</span>
                              <Badge variant="outline" className="shrink-0 text-xs">{lesson.type}</Badge>
                              {lesson.qcReward > 0 && (
                                <span className="text-xs text-muted-foreground shrink-0">{lesson.qcReward} QC</span>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingLesson(lesson.id);
                                  setLessonEdits((p) => ({ ...p, [lesson.id]: {} }));
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteLesson(lesson.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className="sr-only">Delete lesson</span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                  {/* Add lesson form */}
                  <div className="border border-dashed rounded p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Add Lesson</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Lesson title"
                        value={getLessonForm(mod.id).title}
                        onChange={(e) => setLessonFormField(mod.id, "title", e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        value={getLessonForm(mod.id).type}
                        onValueChange={(v) => setLessonFormField(mod.id, "type", v)}
                      >
                        <SelectTrigger className="w-32" aria-label="Lesson type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARTICLE">Article</SelectItem>
                          <SelectItem value="VIDEO">Video</SelectItem>
                          <SelectItem value="QUIZ">Quiz</SelectItem>
                          <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {getLessonForm(mod.id).type === "VIDEO" ? (
                      <Input
                        placeholder="Video embed URL"
                        value={getLessonForm(mod.id).videoUrl}
                        onChange={(e) => setLessonFormField(mod.id, "videoUrl", e.target.value)}
                      />
                    ) : (
                      <Textarea
                        placeholder="Lesson content (markdown)"
                        value={getLessonForm(mod.id).content}
                        onChange={(e) => setLessonFormField(mod.id, "content", e.target.value)}
                        rows={2}
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor={`qc-${mod.id}`} className="text-xs whitespace-nowrap">QC reward</Label>
                        <Input
                          id={`qc-${mod.id}`}
                          type="number"
                          min={0}
                          value={getLessonForm(mod.id).qcReward}
                          onChange={(e) => setLessonFormField(mod.id, "qcReward", e.target.value)}
                          className="w-16 h-7 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addLesson(mod.id)}
                        disabled={!getLessonForm(mod.id).title.trim()}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {/* Add module form */}
      <form onSubmit={addModule} className="flex gap-2">
        <Input
          placeholder="New module title"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={addingModule || !newModuleTitle.trim()}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Add Module
        </Button>
      </form>
    </div>
  );
}
