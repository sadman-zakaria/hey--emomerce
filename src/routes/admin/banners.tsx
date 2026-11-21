import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { useStore } from "@/lib/use-store";
import type { Banner } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImagePicker } from "@/components/image-picker";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({
    meta: [
      { title: "Banners — Maison Admin" },
      { name: "description", content: "Manage homepage hero banners." },
      { property: "og:title", content: "Banners — Maison Admin" },
      { property: "og:description", content: "Manage homepage hero banners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminBanners,
});

const emptyBanner: Omit<Banner, "id"> = {
  title: "",
  subtitle: "",
  ctaText: "Shop now",
  ctaLink: "/shop",
  image: "",
  align: "left",
  active: true,
  order: 0,
};

function AdminBanners() {
  const store = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [form, setForm] = useState<Omit<Banner, "id">>(emptyBanner);

  const banners = [...store.banners].sort((a, b) => a.order - b.order);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyBanner, order: store.banners.length + 1 });
    setIsDialogOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditing(banner);
    const { id, ...rest } = banner;
    void id;
    setForm(rest);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await store.updateBanner(editing.id, form);
        toast.success("Banner updated");
      } else {
        await store.addBanner(form);
        toast.success("Banner added");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save banner");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await store.deleteBanner(deleteTarget.id);
      toast.success("Banner deleted");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete banner");
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      await store.updateBanner(banner.id, { active: !banner.active });
      toast.success(banner.active ? "Banner hidden" : "Banner activated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update banner");
    }
  };

  const move = async (banner: Banner, direction: -1 | 1) => {
    const sorted = [...store.banners].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((b) => b.id === banner.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    try {
      await store.updateBanner(banner.id, { order: swapWith.order });
      await store.updateBanner(swapWith.id, { order: banner.order });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reorder banners");
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Banners</h1>
          <p className="mt-1 text-muted-foreground">
            Manage the homepage hero carousel · {store.banners.length} banners
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add banner
        </Button>
      </div>

      <div className="mt-6 rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Banner</TableHead>
              <TableHead>CTA link</TableHead>
              <TableHead>Align</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.map((b, i) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === 0}
                      onClick={() => move(b, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === banners.length - 1}
                      onClick={() => move(b, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img src={b.image} alt={b.title} className="h-12 w-16 rounded object-cover" />
                    <div className="min-w-0">
                      <div className="font-medium text-foreground line-clamp-1">{b.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{b.subtitle}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{b.ctaLink}</TableCell>
                <TableCell className="capitalize">{b.align}</TableCell>
                <TableCell>
                  <Badge variant={b.active ? "default" : "secondary"}>
                    {b.active ? "Active" : "Hidden"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(b)}
                      title={b.active ? "Hide" : "Show"}
                    >
                      {b.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(b)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {banners.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No banners yet. Click "Add banner" to create your first one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Edit banner" : "Add banner"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Objects worth keeping"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="A tightly curated edit..."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ctaText">CTA button text *</Label>
                <Input
                  id="ctaText"
                  required
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  placeholder="Shop the collection"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaLink">CTA link *</Label>
                <Input
                  id="ctaLink"
                  required
                  value={form.ctaLink}
                  onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                  placeholder="/shop or /shop?category=electronics or https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Internal paths (e.g. /shop?category=electronics) or external URLs.
                </p>
              </div>
            </div>
            <ImagePicker
              id="image"
              label="Banner image *"
              required
              value={form.image}
              onChange={(image) => setForm({ ...form, image })}
              previewClassName="h-32 w-56"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Text alignment</Label>
                <Select
                  value={form.align}
                  onValueChange={(v) => setForm({ ...form, align: v as Banner["align"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  Active (show in carousel)
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save changes" : "Add banner"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete banner?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
