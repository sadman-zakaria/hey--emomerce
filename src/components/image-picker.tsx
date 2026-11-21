import { useState } from "react";
import { ImagePlus, Images, Loader2, Upload } from "lucide-react";
import { store } from "@/lib/store";
import { compressImage } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type ImagePickerProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  previewClassName?: string;
};

export function ImagePicker({
  id = "image",
  label = "Image",
  value,
  onChange,
  required = false,
  previewClassName = "h-32 w-32",
}: ImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      const item = await store.addMedia({ name: file.name, dataUrl });
      onChange(item.dataUrl);
      toast.success("Image uploaded");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://... or choose from media"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="shrink-0 gap-2">
              <Images className="h-4 w-4" /> Media
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Media library</DialogTitle>
            </DialogHeader>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {uploading ? "Uploading..." : "Upload a new image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  void handleUpload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>

            {store.media.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <ImagePlus className="h-8 w-8" />
                <p className="text-sm">No media yet. Upload your first image above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {store.media.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.dataUrl);
                      setOpen(false);
                    }}
                    className="group overflow-hidden rounded-lg border border-border text-left transition-colors hover:border-primary"
                  >
                    <img
                      src={item.dataUrl}
                      alt={item.name}
                      className="h-28 w-full object-cover"
                    />
                    <span className="block truncate px-2 py-1.5 text-xs text-muted-foreground">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {value && (
        <img
          src={value}
          alt="Preview"
          className={`rounded-lg border border-border object-cover ${previewClassName}`}
        />
      )}
    </div>
  );
}
