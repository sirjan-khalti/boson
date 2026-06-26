import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShieldAlert, Shield, Plus, X, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ats/Avatar";
import { useAuth, type Role, type AuthUser, getToken } from "@/lib/auth";
import { API_BASE } from "@/lib/config";

const roleBadge: Record<Role, string> = {
  SUPERADMIN: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300",
  ADMIN: "bg-primary/15 text-primary",
  RECRUITER: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  VIEWER: "bg-muted text-muted-foreground",
};

export default function TeamPage() {
  const { user, isAdmin } = useAuth();
  const [team, setTeam] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmData, setConfirmData] = useState<{
    memberId: string;
    memberName: string;
    newRole: Role;
  } | null>(null);

  // User creation modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<Role>("VIEWER");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // User password reset confirmation state
  const [resetConfirmData, setResetConfirmData] = useState<{
    memberId: string;
    memberName: string;
    memberEmail: string;
  } | null>(null);

  const fetchTeam = async () => {
    try {
      const apiBase = API_BASE;
      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBase}/team/fetch`, {
        headers,
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchTeam();
  }, [isAdmin]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Sign in required</h2>
        <p className="mt-1 text-sm text-muted-foreground">Please sign in to access team settings.</p>
        <Link to="/login" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to login</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold">Access restricted</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only <span className="font-medium">ADMIN</span> and <span className="font-medium">SUPERADMIN</span> can manage team roles.
          Your current role is <span className="font-medium">{user.role}</span>.
        </p>
      </div>
    );
  }

  const updateRole = async (id: string, role: Role) => {
    try {
      const apiBase = API_BASE;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBase}/team/${id}/role`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ role })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to update role");
        return;
      }
      const updatedUser = await res.json();
      setTeam(team.map((m) => (m.id === id ? updatedUser : m)));
    } catch (e) {
      alert("Error updating role");
    }
  };

  const resetPassword = async (id: string) => {
    try {
      const apiBase = API_BASE;
      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBase}/team/${id}/reset-password`, {
        method: "POST",
        headers,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to reset password");
        return;
      }
      alert("Password has been reset successfully to the user's email address.");
    } catch (e) {
      alert("Error resetting password");
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      const apiBase = API_BASE;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}/team/create`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          role: createRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.detail || "Failed to create team member");
        return;
      }

      const newMember = await res.json();
      setTeam((prev) => [...prev, newMember]);
      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreateRole("VIEWER");
    } catch (err) {
      setCreateError("An unexpected error occurred");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Team & Roles
          </h1>
          <p className="text-sm text-muted-foreground">Manage role-based access for your workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${roleBadge[user.role]}`}>
            You: {user.role}
          </span>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" /> Add Member
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Member</th>
              <th className="px-4 py-2.5 text-left font-medium">Email</th>
              <th className="px-4 py-2.5 text-left font-medium">Current role</th>
              <th className="px-4 py-2.5 text-left font-medium">Change role</th>
              <th className="px-4 py-2.5 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} size={30} />
                    <span className="font-medium">{m.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${roleBadge[m.role]}`}>{m.role}</span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={m.role}
                    disabled={m.role === "SUPERADMIN" || (m.role === "ADMIN" && user.role === "ADMIN")}
                    onChange={(e) => {
                      const newRole = e.target.value as Role;
                      setConfirmData({
                        memberId: m.id,
                        memberName: m.name,
                        newRole,
                      });
                    }}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-50 font-medium"
                  >
                    {["ADMIN", "RECRUITER", "VIEWER"].map((r) => <option key={r} value={r}>{r}</option>)}
                    {m.role === "SUPERADMIN" && <option value="SUPERADMIN">SUPERADMIN</option>}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    disabled={m.role === "SUPERADMIN"}
                    onClick={() => {
                      setResetConfirmData({
                        memberId: m.id,
                        memberName: m.name,
                        memberEmail: m.email,
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        SUPERADMIN roles cannot be altered. Changes take effect immediately.
      </div>

      {/* Role Change Confirmation Modal */}
      {confirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-base font-semibold text-foreground">Confirm Role Change</h3>
            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to change the role of <span className="font-semibold text-foreground">{confirmData.memberName}</span> to <span className="font-semibold text-primary">{confirmData.newRole}</span>?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmData(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateRole(confirmData.memberId, confirmData.newRole);
                  setConfirmData(null);
                }}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {resetConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-base font-semibold text-foreground">Confirm Password Reset</h3>
            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to reset the password for <span className="font-semibold text-foreground">{resetConfirmData.memberName}</span>?
              The password will be reset to match their email address: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-primary font-medium">{resetConfirmData.memberEmail}</span>.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setResetConfirmData(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetPassword(resetConfirmData.memberId);
                  setResetConfirmData(null);
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:opacity-90 transition-opacity"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Member Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Add Team Member</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive mb-4">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Note: The initial password will be set exactly matching the email address.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Role</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as Role)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm focus:outline-none"
                >
                  <option value="VIEWER">VIEWER</option>
                  <option value="RECRUITER">RECRUITER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
