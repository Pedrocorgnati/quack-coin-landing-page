"use client";

// app/(admin)/admin/users/page.tsx
// Admin user management: searchable/filterable table with row actions and bulk CSV export.

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Ban, UserCheck, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  role: "USER" | "ADMIN";
  membershipTier: "FREE" | "SILVER" | "GOLD" | "PLATINUM";
  membershipExpiresAt: string | null;
  isBanned: boolean;
  bannedReason: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  qcBalance: number;
  totalSpentUsdc: string;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pages: number;
}

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-muted text-muted-foreground",
  SILVER: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  GOLD: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  PLATINUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
};

// ── Component ─────────────────────────────────────────────────

export default function AdminUsersPage() {
  const router = useRouter();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("");
  const [membershipTier, setMembershipTier] = useState<string>("");
  const [banned, setBanned] = useState<string>("");
  const [page, setPage] = useState(1);
  const [banDialogUser, setBanDialogUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (membershipTier) params.set("membershipTier", membershipTier);
    if (banned) params.set("banned", banned);
    params.set("page", String(page));
    return params.toString();
  }, [search, role, membershipTier, banned, page]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?${buildQuery()}`);
      if (!res.ok) return;
      const json: UsersResponse = await res.json();
      setData(json);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {}, 0);
  }

  async function handleBanToggle(user: AdminUser) {
    if (user.isBanned) {
      // Unban immediately
      setActioning(user.id);
      try {
        await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banned: false }),
        });
        void fetchUsers();
      } finally {
        setActioning(null);
      }
    } else {
      setBanDialogUser(user);
      setBanReason("");
    }
  }

  async function confirmBan() {
    if (!banDialogUser) return;
    setActioning(banDialogUser.id);
    try {
      await fetch(`/api/admin/users/${banDialogUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: true, bannedReason: banReason || "Banned by admin" }),
      });
      void fetchUsers();
    } finally {
      setActioning(null);
      setBanDialogUser(null);
    }
  }

  function handleExportCSV() {
    const params = buildQuery();
    window.open(`/api/admin/users/export?${params}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total.toLocaleString()} users` : "Loading..."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            className="pl-8 w-64"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <Select value={role || "__all__"} onValueChange={(v) => { setRole(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select value={membershipTier || "__all__"} onValueChange={(v) => { setMembershipTier(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All tiers</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
            <SelectItem value="SILVER">Silver</SelectItem>
            <SelectItem value="GOLD">Gold</SelectItem>
            <SelectItem value="PLATINUM">Platinum</SelectItem>
          </SelectContent>
        </Select>

        <Select value={banned || "__all__"} onValueChange={(v) => { setBanned(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="false">Active</SelectItem>
            <SelectItem value="true">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Tier</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">QC Balance</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                        <div className="h-2.5 w-48 animate-pulse rounded bg-muted" />
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-7 w-20 animate-pulse rounded bg-muted ml-auto" />
                    </td>
                  </tr>
                ))
              : data?.users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name ?? user.username ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TIER_COLORS[user.membershipTier])}>
                        {user.membershipTier}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums hidden lg:table-cell">
                      {user.qcBalance.toLocaleString()} QC
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {user.isBanned ? (
                        <Badge variant="destructive" className="text-xs">Banned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-700 dark:text-green-400">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn("h-7 text-xs", user.isBanned ? "text-green-600" : "text-red-600")}
                          disabled={actioning === user.id}
                          onClick={() => handleBanToggle(user)}
                        >
                          {user.isBanned ? (
                            <><UserCheck className="h-3 w-3 mr-1" />Unban</>
                          ) : (
                            <><Ban className="h-3 w-3 mr-1" />Ban</>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && data?.users.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {data.page} of {data.pages}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={data.page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Ban dialog */}
      <Dialog open={!!banDialogUser} onOpenChange={(open: boolean) => !open && setBanDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {banDialogUser?.email}?</DialogTitle>
            <DialogDescription>
              This user will be immediately blocked from accessing the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Ban reason (optional)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogUser(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmBan}
            >
              Ban user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
