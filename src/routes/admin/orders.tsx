import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Eye, Trash2 } from "lucide-react";
import { useStore } from "@/lib/use-store";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const statusOptions: Order["status"][] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];
const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

function AdminOrders() {
  const store = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  const filtered = store.orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = async (orderId: string, status: Order["status"]) => {
    try {
      const updated = await store.updateOrderStatus(orderId, status);
      toast.success(
        status === "delivered"
          ? "Order delivered · payment marked as paid"
          : `Order status updated to ${status}`,
      );
      if (updated && viewing?.id === orderId) setViewing(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update order");
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteTarget) return;
    try {
      await store.deleteOrder(deleteTarget.id);
      toast.success(`Order ${deleteTarget.orderNumber} deleted`);
      if (viewing?.id === deleteTarget.id) setViewing(null);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete order");
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Orders</h1>
        <p className="mt-1 text-muted-foreground">
          {store.totalOrders} orders · {store.pendingOrdersCount} pending
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders, customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.orderNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{o.customerName}</div>
                      <div className="text-xs text-muted-foreground">{o.customerEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>{o.items.reduce((s, i) => s + i.quantity, 0)}</TableCell>
                  <TableCell>${o.total}</TableCell>
                  <TableCell className="text-muted-foreground">{o.createdAt}</TableCell>
                  <TableCell>
                    <Badge variant={o.paymentStatus === "paid" ? "default" : "secondary"}>
                      {o.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={o.status}
                      onValueChange={(v) => handleStatusChange(o.id, v as Order["status"])}
                    >
                      <SelectTrigger className="h-8 w-32 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewing(o)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(o)}
                        title="Delete order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order detail */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Order {viewing.orderNumber}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[viewing.status]} className="capitalize">
                      {viewing.status}
                    </Badge>
                    <Badge variant={viewing.paymentStatus === "paid" ? "default" : "secondary"}>
                      {viewing.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{viewing.createdAt}</span>
                </div>
                <div className="rounded-lg border border-border p-4 text-sm">
                  <h3 className="font-semibold text-foreground">Customer</h3>
                  <p className="mt-1 text-muted-foreground">{viewing.customerName}</p>
                  <p className="text-muted-foreground">{viewing.customerEmail}</p>
                  <p className="text-muted-foreground">{viewing.customerPhone}</p>
                </div>
                <div className="rounded-lg border border-border p-4 text-sm">
                  <h3 className="font-semibold text-foreground">Shipping address</h3>
                  <p className="mt-1 text-muted-foreground">{viewing.shippingAddress}</p>
                  <p className="text-muted-foreground">
                    {viewing.city}, {viewing.zipCode}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <h3 className="font-semibold text-foreground">Items</h3>
                  <div className="mt-2 space-y-3">
                    {viewing.items.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × ${item.price}
                          </p>
                        </div>
                        <span className="text-sm font-medium">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${viewing.subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>${viewing.shipping}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-foreground">
                      <span>Total</span>
                      <span>${viewing.total}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                  Payment: Cash on Delivery ·{" "}
                  <strong>{viewing.paymentStatus === "paid" ? "Paid" : "Unpaid"}</strong>
                  {viewing.paymentStatus !== "paid" && " (collect on delivery)"}
                </div>
                {viewing.notes && (
                  <div className="rounded-lg border border-border p-3 text-sm">
                    <span className="font-medium">Notes: </span>
                    <span className="text-muted-foreground">{viewing.notes}</span>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Update status</label>
                  <Select
                    value={viewing.status}
                    onValueChange={(v) => handleStatusChange(viewing.id, v as Order["status"])}
                  >
                    <SelectTrigger className="mt-1 capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete order confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete order?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete order <strong>{deleteTarget?.orderNumber}</strong>? This cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrder}>
              Delete order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}