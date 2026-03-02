"use client";

// app/(admin)/admin/courses/new/page.tsx
// Course creation form.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [qcReward, setQcReward] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug: slug || undefined, description, qcReward }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create course");
        return;
      }
      router.push(`/admin/courses/${data.id}/modules`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Course</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the basics — you can add modules and lessons after creating the course.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
          <CardDescription>Basic information about the course.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Introduction to QuackCoin"
                required
                minLength={3}
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">
                Slug{" "}
                <span className="text-muted-foreground text-xs">(auto-generated)</span>
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                placeholder="introduction-to-quackcoin"
                minLength={2}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                URL: /courses/{slug || "your-slug"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will students learn in this course?"
                required
                minLength={10}
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qcReward">QC Reward on Completion</Label>
              <Input
                id="qcReward"
                type="number"
                value={qcReward}
                onChange={(e) => setQcReward(Math.max(0, parseInt(e.target.value, 10) || 0))}
                min={0}
                max={100000}
              />
              <p className="text-xs text-muted-foreground">
                QuackCoin awarded when a user completes this course.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create Course"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/courses")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
