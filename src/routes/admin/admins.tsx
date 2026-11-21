import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { useStore } from "@/lib/use-store";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/admins")({
  component: AdminAdmins,
});

type AdminForm = {
  name: string;
  email: string;
  status: User["status"];
  password: string;
  confirmPassword: string;
};

const emptyForm: AdminForm = {
  name: "",
  email: "",
  status: "active",
  password: "",
  confirmPassword: "",
};

function AdminAdmins() {
  const store = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [form, setForm] = useState<AdminForm>(emptyForm);

  const admins = store.admins;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      status: user.status,
      password: "",
      confirmPassword: "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!editing && form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      if (editing) {
        await store.updateUser(editing.id, {
          name: form.name,
          email: form.email,
          status: form.status,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success("Admin updated");
      } else {
        await store.addUser({
          name: form.name,
          email: form.email,
          role: "admin",
          status: "active",
          orderCount: 0,
          totalSpent: 0,
          password: form.password,
        });
        toast.success("Admin created");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save admin");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await store.deleteUser(deleteTarget.id);
      toast.success("Admin removed");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove admin");
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Admins</h1>
          <p className="mt-1 text-muted-foreground">
            Create staff logins and control who can access this dashboard.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add admin
        </Button>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-accent p-4 text-sm text-accent-foreground">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          New admins sign in at <strong>/admin</strong> with the email and password you set here.
          Passwords are hashed before they are stored and are never shown again.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <UserCog className="h-4 w-4 text-muted-foreground" />
                    {admin.name}
                    {store.adminUser?.id === admin.id && (
                      <Badge variant="secondary" className="ml-1">
                        You
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                <TableCell>
                  <Badge variant={admin.status === "active" ? "default" : "secondary"}>
                    {admin.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{admin.lastLogin ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(admin)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      disabled={store.adminUser?.id === admin.id}
                      onClick={() => setDeleteTarget(admin)}
                      title={
                        store.adminUser?.id === admin.id
                          ? "You cannot remove your own account"
                          : "Remove admin"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Edit admin" : "Add admin"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Name *</Label>
              <Input
                id="admin-name"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email *</Label>
              <Input
                id="admin-email"
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            {editing && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({ ...form, status: value as User["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="admin-password">
                {editing ? "New password (leave blank to keep current)" : "Password *"}
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  required={!editing}
                  minLength={6}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="pl-9"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-confirm">Confirm password</Label>
              <Input
                id="admin-confirm"
                type="password"
                required={!editing || Boolean(form.password)}
                minLength={6}
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                autoComplete="new-password"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save changes" : "Create admin"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove admin?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <strong>{deleteTarget?.name}</strong>? They will lose access to the dashboard
            immediately.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remove admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}