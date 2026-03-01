import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Principal } from "@dfinity/principal";
import { Loader2, ShieldCheck, UserCog } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend";
import { useAssignRole } from "../hooks/useQueries";

export default function ManageRoles() {
  const [principalId, setPrincipalId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "clerk">("clerk");
  const assignRole = useAssignRole();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalId.trim()) {
      toast.error("Please enter a Principal ID");
      return;
    }

    let principal: Principal;
    try {
      principal = Principal.fromText(principalId.trim());
    } catch {
      toast.error("Invalid Principal ID format");
      return;
    }

    // admin = UserRole.admin, clerk = UserRole.user (the backend uses 'user' for clerk)
    const roleEnum = selectedRole === "admin" ? UserRole.admin : UserRole.user;

    try {
      await assignRole.mutateAsync({ user: principal, role: roleEnum });
      toast.success(`Role "${selectedRole}" assigned successfully!`);
      setPrincipalId("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to assign role";
      toast.error(message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Manage User Roles
        </h1>
        <p className="text-muted-foreground">
          Assign roles to users to control their access level in the system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Assign Role
            </CardTitle>
            <CardDescription>
              Enter the user's Principal ID and select a role to assign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="principalId">Principal ID</Label>
                <Input
                  id="principalId"
                  value={principalId}
                  onChange={(e) => setPrincipalId(e.target.value)}
                  placeholder="e.g. aaaaa-aa or 2vxsx-fae..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The user must log in first to obtain their Principal ID.
                </p>
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => setSelectedRole(v as "admin" | "clerk")}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — Full access</SelectItem>
                    <SelectItem value="clerk">Clerk — Sales only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={assignRole.isPending}
                className="w-full"
              >
                {assignRole.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Role"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>What each role can access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Admin
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ Dashboard</li>
                <li>✅ Sales &amp; Billing</li>
                <li>✅ Inventory Management</li>
                <li>✅ Expenditure Tracking</li>
                <li>✅ Profit Analysis</li>
                <li>✅ Manage User Roles</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <UserCog className="w-4 h-4 text-muted-foreground" />
                Clerk
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>❌ Dashboard</li>
                <li>✅ Sales &amp; Billing</li>
                <li>❌ Inventory Management</li>
                <li>❌ Expenditure Tracking</li>
                <li>❌ Profit Analysis</li>
                <li>❌ Manage User Roles</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
