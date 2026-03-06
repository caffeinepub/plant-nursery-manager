import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  History,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MovementReason } from "../backend";
import type { InventoryItem, StockMovement } from "../backend";
import { usePinRole } from "../hooks/usePinRole";
import {
  useAddInventoryItem,
  useDeleteInventoryItem,
  useGetInventory,
  useGetStockMovements,
  useRecordStockMovement,
  useUpdateInventoryItem,
} from "../hooks/useQueries";
import { exportToExcel } from "../utils/excelExport";

/** Safely convert a string to BigInt; returns 0n on failure */
function safeBigInt(value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) return 0n;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return 0n;
  return BigInt(Math.floor(num));
}

const CATEGORIES = [
  "Flowering Plants",
  "Succulents",
  "Trees",
  "Shrubs",
  "Herbs",
  "Indoor Plants",
  "Outdoor Plants",
  "Other",
];
const UNITS = [
  "piece",
  "pot",
  "kg",
  "bundle",
  "tray",
  "dozen",
  "numbers",
  "sq.ft",
];

function MovementHistory({ plantName }: { plantName: string }) {
  const { data: movements, isLoading } = useGetStockMovements(plantName);

  const reasonLabel = (reason: MovementReason) => {
    switch (reason) {
      case MovementReason.purchase:
        return "Purchase";
      case MovementReason.sale:
        return "Sale";
      case MovementReason.loss:
        return "Loss";
      case MovementReason.adjustment:
        return "Adjustment";
      default:
        return String(reason);
    }
  };

  const reasonVariant = (
    reason: MovementReason,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (reason) {
      case MovementReason.purchase:
        return "default";
      case MovementReason.sale:
        return "secondary";
      case MovementReason.loss:
        return "destructive";
      case MovementReason.adjustment:
        return "outline";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No movement history for this plant.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...movements].reverse().map((m) => (
          <TableRow key={`${m.date}-${m.reason}-${String(m.quantity)}`}>
            <TableCell>{m.date}</TableCell>
            <TableCell>
              <Badge variant={reasonVariant(m.reason as MovementReason)}>
                {reasonLabel(m.reason as MovementReason)}
              </Badge>
            </TableCell>
            <TableCell>{Number(m.quantity)}</TableCell>
            <TableCell>{m.notes}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

type EditFormState = {
  plantName: string;
  category: string;
  unit: string;
  currentStock: string;
  costPrice: string;
  sellingPrice: string;
};

export default function Inventory() {
  const { data: inventory, isLoading } = useGetInventory();
  const addItem = useAddInventoryItem();
  const recordMovement = useRecordStockMovement();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const { appRole } = usePinRole();
  const isOwner = appRole === "owner";

  const [movementOpen, setMovementOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>("");

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<string>("");
  const [editForm, setEditForm] = useState<EditFormState>({
    plantName: "",
    category: "",
    unit: "piece",
    currentStock: "",
    costPrice: "",
    sellingPrice: "",
  });

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingPlant, setDeletingPlant] = useState<string>("");

  // Add plant form state
  const [newPlant, setNewPlant] = useState({
    plantName: "",
    category: "",
    unit: "piece",
    currentStock: "",
    costPrice: "",
    sellingPrice: "",
  });

  // Movement form state
  const [movement, setMovement] = useState({
    plantName: "",
    quantity: "",
    reason: MovementReason.purchase as MovementReason,
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });

  const handleAddPlant = async () => {
    if (!newPlant.plantName.trim()) {
      toast.error("Plant name is required");
      return;
    }
    if (!newPlant.category) {
      toast.error("Category is required");
      return;
    }
    try {
      await addItem.mutateAsync({
        plantName: newPlant.plantName.trim(),
        category: newPlant.category,
        unit: newPlant.unit,
        currentStock: safeBigInt(newPlant.currentStock),
        costPrice: safeBigInt(newPlant.costPrice),
        sellingPrice: safeBigInt(newPlant.sellingPrice),
      } as InventoryItem);
      toast.success(`${newPlant.plantName.trim()} added to inventory`);
      setNewPlant({
        plantName: "",
        category: "",
        unit: "piece",
        currentStock: "",
        costPrice: "",
        sellingPrice: "",
      });
    } catch (err) {
      console.error("Failed to add plant:", err);
      toast.error("Failed to add plant. Please try again.");
    }
  };

  const handleRecordMovement = async () => {
    if (!movement.plantName || !movement.quantity) return;
    const qty = Number.parseInt(movement.quantity, 10);
    if (Number.isNaN(qty) || qty <= 0) return;

    const stockMovement: StockMovement = {
      date: movement.date,
      quantity: BigInt(qty),
      reason: movement.reason,
      notes: movement.notes,
    };

    await recordMovement.mutateAsync({
      plantName: movement.plantName,
      movement: stockMovement,
    });

    setMovement({
      plantName: "",
      quantity: "",
      reason: MovementReason.purchase,
      notes: "",
      date: new Date().toISOString().split("T")[0],
    });
    setMovementOpen(false);
  };

  const handleExport = () => {
    if (!inventory) return;
    const rows = inventory.map((item) => ({
      "Plant Name": item.plantName,
      Category: item.category,
      Unit: item.unit,
      "Current Stock": Number(item.currentStock),
      "Cost Price (₹)": Number(item.costPrice),
      "Selling Price (₹)": Number(item.sellingPrice),
    }));
    exportToExcel("inventory", rows);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingPlant(item.plantName);
    setEditForm({
      plantName: item.plantName,
      category: item.category,
      unit: item.unit,
      currentStock: String(Number(item.currentStock)),
      costPrice: String(Number(item.costPrice)),
      sellingPrice: String(Number(item.sellingPrice)),
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.category) return;
    await updateItem.mutateAsync({
      plantName: editingPlant,
      updatedItem: {
        plantName: editingPlant,
        category: editForm.category,
        unit: editForm.unit,
        currentStock: safeBigInt(editForm.currentStock),
        costPrice: safeBigInt(editForm.costPrice),
        sellingPrice: safeBigInt(editForm.sellingPrice),
      } as InventoryItem,
    });
    toast.success(`${editingPlant} updated successfully`);
    setEditOpen(false);
  };

  const handleOpenDelete = (plantName: string) => {
    setDeletingPlant(plantName);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    await deleteItem.mutateAsync(deletingPlant);
    toast.success(`${deletingPlant} removed from inventory`);
    setDeleteConfirmOpen(false);
    setDeletingPlant("");
  };

  const isOutwardMovement = (reason: MovementReason) =>
    reason === MovementReason.loss ||
    reason === MovementReason.adjustment ||
    reason === MovementReason.sale;

  return (
    <div className="p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your plant stock
          </p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

          {/* Record Stock Movement — owner only */}
          {isOwner && (
            <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Record Movement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Stock Movement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Plant</Label>
                    <Select
                      value={movement.plantName}
                      onValueChange={(v) =>
                        setMovement((m) => ({ ...m, plantName: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plant" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory?.map((item) => (
                          <SelectItem
                            key={item.plantName}
                            value={item.plantName}
                          >
                            {item.plantName} (Stock: {Number(item.currentStock)}
                            )
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Movement Type</Label>
                    <Select
                      value={movement.reason}
                      onValueChange={(v) =>
                        setMovement((m) => ({
                          ...m,
                          reason: v as MovementReason,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={MovementReason.purchase}>
                          <span className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Purchase (Stock In)
                          </span>
                        </SelectItem>
                        <SelectItem value={MovementReason.loss}>
                          <span className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            Loss (Stock Out)
                          </span>
                        </SelectItem>
                        <SelectItem value={MovementReason.adjustment}>
                          <span className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-orange-600" />
                            Adjustment (Stock Out)
                          </span>
                        </SelectItem>
                        <SelectItem value={MovementReason.sale}>
                          <span className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-blue-600" />
                            Sale (Stock Out)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {isOutwardMovement(movement.reason) && (
                      <p className="text-xs text-destructive mt-1">
                        This will reduce the current stock by the entered
                        quantity.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      value={movement.quantity}
                      onChange={(e) =>
                        setMovement((m) => ({ ...m, quantity: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={movement.date}
                      onChange={(e) =>
                        setMovement((m) => ({ ...m, date: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Input
                      placeholder="Optional notes"
                      value={movement.notes}
                      onChange={(e) =>
                        setMovement((m) => ({ ...m, notes: e.target.value }))
                      }
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleRecordMovement}
                    disabled={
                      recordMovement.isPending ||
                      !movement.plantName ||
                      !movement.quantity
                    }
                  >
                    {recordMovement.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                        Recording...
                      </>
                    ) : (
                      "Record Movement"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ── Add Stock Card (Owner only) — prominent, always visible at top ── */}
      {isOwner && (
        <Card
          className="border-2 border-primary/30 bg-primary/5 shadow-md"
          data-ocid="inventory.add_stock.card"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <Plus className="h-5 w-5" />
              Add New Plant to Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Plant Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Rose, Jasmine, Tulsi"
                  value={newPlant.plantName}
                  onChange={(e) =>
                    setNewPlant((p) => ({ ...p, plantName: e.target.value }))
                  }
                  className="h-10 text-base"
                  data-ocid="inventory.plant_name.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={newPlant.category}
                  onValueChange={(v) =>
                    setNewPlant((p) => ({ ...p, category: v }))
                  }
                >
                  <SelectTrigger
                    className="h-10 text-base"
                    data-ocid="inventory.category.select"
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Unit</Label>
                <Select
                  value={newPlant.unit}
                  onValueChange={(v) => setNewPlant((p) => ({ ...p, unit: v }))}
                >
                  <SelectTrigger
                    className="h-10 text-base"
                    data-ocid="inventory.unit.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Initial Stock Qty</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newPlant.currentStock}
                  onChange={(e) =>
                    setNewPlant((p) => ({ ...p, currentStock: e.target.value }))
                  }
                  className="h-10 text-base"
                  data-ocid="inventory.stock.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Cost Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="₹0"
                  value={newPlant.costPrice}
                  onChange={(e) =>
                    setNewPlant((p) => ({ ...p, costPrice: e.target.value }))
                  }
                  className="h-10 text-base"
                  data-ocid="inventory.cost_price.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Selling Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="₹0"
                  value={newPlant.sellingPrice}
                  onChange={(e) =>
                    setNewPlant((p) => ({
                      ...p,
                      sellingPrice: e.target.value,
                    }))
                  }
                  className="h-10 text-base"
                  data-ocid="inventory.selling_price.input"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 text-base font-semibold"
                onClick={handleAddPlant}
                disabled={
                  addItem.isPending ||
                  !newPlant.plantName.trim() ||
                  !newPlant.category
                }
                data-ocid="inventory.add_plant.primary_button"
              >
                {addItem.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Adding Plant...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Add Plant to Inventory
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !inventory || inventory.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No plants in inventory</p>
          <p className="text-sm mt-1">Click "Add Plant" to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plant Name</TableHead>
                <TableHead>Category</TableHead>
                {isOwner && <TableHead>Unit</TableHead>}
                <TableHead className="text-right">Current Stock</TableHead>
                {isOwner && (
                  <TableHead className="text-right">Cost Price (₹)</TableHead>
                )}
                <TableHead className="text-right">Selling Price (₹)</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.plantName}>
                  <TableCell className="font-medium">
                    {item.plantName}
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  {isOwner && <TableCell>{item.unit}</TableCell>}
                  <TableCell className="text-right">
                    <span
                      className={
                        Number(item.currentStock) <= 5
                          ? "text-destructive font-semibold"
                          : ""
                      }
                    >
                      {Number(item.currentStock)}
                    </span>
                  </TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      ₹{Number(item.costPrice)}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    ₹{Number(item.sellingPrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Movement History — available to all */}
                      <Dialog
                        open={historyOpen && selectedPlant === item.plantName}
                        onOpenChange={(open) => {
                          setHistoryOpen(open);
                          if (open) setSelectedPlant(item.plantName);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Movement History"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              Movement History — {item.plantName}
                            </DialogTitle>
                          </DialogHeader>
                          <MovementHistory plantName={item.plantName} />
                        </DialogContent>
                      </Dialog>

                      {/* Edit — owner only */}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit item"
                          onClick={() => handleOpenEdit(item)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Delete — owner only */}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete item"
                          onClick={() => handleOpenDelete(item.plantName)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Plant — {editingPlant}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Plant Name</Label>
              <Input
                value={editForm.plantName}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Plant name cannot be changed (it's the unique key)
              </p>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, category: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit</Label>
              <Select
                value={editForm.unit}
                onValueChange={(v) => setEditForm((f) => ({ ...f, unit: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Current Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.currentStock}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, currentStock: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Cost Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.costPrice}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, costPrice: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Selling Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.sellingPrice}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, sellingPrice: e.target.value }))
                  }
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleSaveEdit}
              disabled={updateItem.isPending || !editForm.category}
            >
              {updateItem.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingPlant}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deletingPlant}</strong> from
              the inventory. All stock movement history for this plant will also
              be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItem.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
