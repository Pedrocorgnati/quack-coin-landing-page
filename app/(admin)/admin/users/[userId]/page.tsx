"use client";

// app/(admin)/admin/users/[userId]/page.tsx
// Admin user detail: profile card, membership override, QC audit, ban control.

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, UserCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

interface QcTx {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  membershipTier: "FREE" | "SILVER" | "GOLD" | "PLATINUM";
  membershipExpiresAt: string | null;
  isBanned: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  qcTransactions: QcTx[];
}

// ── Component ─────────────────────────────────────────────────

export default function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banDialog, setBanDialog] = useState(false);
  const [banReason, setBanReason] = useState("");

  // Membership override form state
  const [tier, setTier] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (!res.ok) return;
        const json: { user: UserDetail } = await res.json();
        setUser(json.user);
        setTier(json.user.membershipTier);
        setExpiresAt(
          json.user.membershipExpiresAt
            ? new Date(json.user.membershipExpiresAt).toISOString().slice(0, 10)
            : "",
        );
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [userId]);

  async function patchUser(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const json: { user: UserDetail } = await res.json();
      setUser((prev) => prev ? { ...prev, ...json.user } : null);
    } catch {
      // fail silently
    } finally {
      setSaving(false);
    }
  }

  async function handleMembershipSave() {
    await patchUser({
      membershipTier: tier,
      membershipExpiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
  }

  async function handleBan() {
    await patchUser({ banned: true, bannedReason: banReason || "Banned by admin" });
    setBanDialog(false);
  }

  async function handleUnban() {
    await patchUser({ banned: false });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-12 text-muted-foreground">User not found</div>;
  }

  const qcBalance = user.qcTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-bold">{user.name ?? user.email}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border bg-card p-5 flex flex-wrap gap-6">
        <div className="flex flex-col gap-1 min-w-[140px]">
          <span className="text-xs text-muted-foreground">Role</span>
          <div className="flex items-center gap-1.5">
            {user.role === "ADMIN" && <Shield className="h-3.5 w-3.5 text-amber-500" />}
            <span className="font-medium">{user.role}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Tier</span>
          <span className="font-medium">{user.membershipTier}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">QC Balance</span>
          <span className="font-medium tabular-nums">{qcBalance.toLocaleString()} QC</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Member since</span>
          <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Last login</span>
          <span className="font-medium">
            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Status</span>
          {user.isBanned ? (
            <Badge variant="destructive" className="w-fit text-xs">Banned</Badge>
          ) : (
            <Badge variant="outline" className="w-fit text-xs border-green-500/50 text-green-700 dark:text-green-400">Active</Badge>
          )}
        </div>
      </div>

      {/* Membership override */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold mb-4">Membership Override</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tier">Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger id="tier" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="SILVER">Silver</SelectItem>
                <SelectItem value="GOLD">Gold</SelectItem>
                <SelectItem value="PLATINUM">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expires">Expires at</Label>
            <Input
              id="expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={handleMembershipSave} disabled={saving} size="sm">
            {saving ? "Saving..." : "Save membership"}
          </Button>
        </div>
      </div>

      {/* Ban control */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold mb-3">Account Control</h3>
        {user.isBanned ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm font-medium text-destructive">Account is banned</p>
              {user.bannedReason && (
                <p className="text-xs text-muted-foreground mt-1">Reason: {user.bannedReason}</p>
              )}
              {user.bannedAt && (
                <p className="text-xs text-muted-foreground">
                  Since {new Date(user.bannedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-fit gap-1.5 text-green-700 dark:text-green-400 border-green-500/50"
              onClick={handleUnban}
              disabled={saving}
            >
              <UserCheck className="h-4 w-4" />
              Unban user
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => { setBanReason(""); setBanDialog(true); }}
          >
            <Ban className="h-4 w-4" />
            Ban user
          </Button>
        )}
      </div>

      {/* QC audit */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold mb-3">QC Transactions (last 50)</h3>
        {user.qcTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions</p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {user.qcTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                <div>
                  <span className="font-medium">{tx.type}</span>
                  {tx.description && (
                    <span className="text-muted-foreground ml-2 text-xs">{tx.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("tabular-nums font-semibold", tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ban confirm dialog */}
      <Dialog open={banDialog} onOpenChange={(open: boolean) => !open && setBanDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {user.email}?</DialogTitle>
            <DialogDescription>
              The user will be blocked immediately and redirected to the banned page.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Reason for ban (optional)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleBan}
            >
              Ban user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
