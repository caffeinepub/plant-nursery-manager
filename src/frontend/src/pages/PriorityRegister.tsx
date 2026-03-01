import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PriorityRequestStatus } from "../backend";
import type { PriorityRequest } from "../backend";
import {
  useAddPriorityRequest,
  useGetPriorityRequests,
  useUpdatePriorityRequestStatus,
} from "../hooks/useQueries";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Add Request Dialog ───────────────────────────────────────────────────────
interface AddRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddRequestDialog({ open, onOpenChange }: AddRequestDialogProps) {
  const addRequest = useAddPriorityRequest();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [plantName, setPlantName] = useState("");
  const [plantVariety, setPlantVariety] = useState("");
  const [quantity, setQuantity] = useState("");
  const [requestDate, setRequestDate] = useState(getTodayStr());
  const [wantedDate, setWantedDate] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setPlantName("");
    setPlantVariety("");
    setQuantity("");
    setRequestDate(getTodayStr());
    setWantedDate("");
    setNotes("");
  };

  const isValid =
    customerName.trim() &&
    customerPhone.trim() &&
    plantName.trim() &&
    quantity.trim() &&
    Number(quantity) > 0 &&
    wantedDate.trim();

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      await addRequest.mutateAsync({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        plantName: plantName.trim(),
        plantVariety: plantVariety.trim(),
        quantity: BigInt(Number.parseInt(quantity)),
        requestDate,
        wantedDate,
        status: PriorityRequestStatus.pending,
        notes: notes.trim() || undefined,
      });
      toast.success("Priority request added successfully");
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("Failed to add request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Priority Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="pr-cname">
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pr-cname"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="pr-phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pr-phone"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pr-plant">
                Plant Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pr-plant"
                placeholder="e.g. Rose"
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pr-variety">Variety</Label>
              <Input
                id="pr-variety"
                placeholder="e.g. Hybrid Red"
                value={plantVariety}
                onChange={(e) => setPlantVariety(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pr-qty">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pr-qty"
              type="number"
              min="1"
              placeholder="Number of plants"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pr-req-date">Date of Request</Label>
              <Input
                id="pr-req-date"
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pr-wanted-date">
                Date Wanted <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pr-wanted-date"
                type="date"
                value={wantedDate}
                onChange={(e) => setWantedDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pr-notes">Notes (Optional)</Label>
            <Textarea
              id="pr-notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || addRequest.isPending}
          >
            {addRequest.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              "Add Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Fulfil Dialog ────────────────────────────────────────────────────────────
interface FulfilDialogProps {
  request: PriorityRequest | null;
  onClose: () => void;
}

function FulfilDialog({ request, onClose }: FulfilDialogProps) {
  const [deliveryDate, setDeliveryDate] = useState(getTodayStr());
  const updateStatus = useUpdatePriorityRequestStatus();

  const handleFulfil = async () => {
    if (!request) return;
    try {
      await updateStatus.mutateAsync({
        id: request.id,
        status: PriorityRequestStatus.fulfilled,
        deliveryDate,
      });
      toast.success("Request marked as fulfilled");
      onClose();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <Dialog
      open={!!request}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as Fulfilled</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Mark this request as fulfilled for{" "}
            <strong>{request?.customerName}</strong> —{" "}
            <strong>{request?.plantName}</strong>
            {request?.plantVariety ? ` (${request.plantVariety})` : ""}.
          </p>
          <div>
            <Label htmlFor="fulfil-date">Delivery Date</Label>
            <Input
              id="fulfil-date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleFulfil}
            disabled={!deliveryDate || updateStatus.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {updateStatus.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Fulfilled
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reopen Dialog ────────────────────────────────────────────────────────────
interface ReopenDialogProps {
  request: PriorityRequest | null;
  onClose: () => void;
}

function ReopenDialog({ request, onClose }: ReopenDialogProps) {
  const updateStatus = useUpdatePriorityRequestStatus();

  const handleReopen = async () => {
    if (!request) return;
    try {
      await updateStatus.mutateAsync({
        id: request.id,
        status: PriorityRequestStatus.pending,
        deliveryDate: null,
      });
      toast.success("Request reopened as pending");
      onClose();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <Dialog
      open={!!request}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reopen Request</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Mark this request as <strong>pending</strong> again for{" "}
          <strong>{request?.customerName}</strong>?
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleReopen}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" /> Mark Pending
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shared Table Columns ─────────────────────────────────────────────────────
function RequestTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-10">#</TableHead>
        <TableHead>Customer</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead>Plant / Variety</TableHead>
        <TableHead className="text-center">Qty</TableHead>
        <TableHead>Requested</TableHead>
        <TableHead>Wanted By</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Delivery Date</TableHead>
        <TableHead className="text-center">Action</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PriorityRegister() {
  const { data: requests, isLoading } = useGetPriorityRequests();
  const [addOpen, setAddOpen] = useState(false);
  const [fulfilTarget, setFulfilTarget] = useState<PriorityRequest | null>(
    null,
  );
  const [reopenTarget, setReopenTarget] = useState<PriorityRequest | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  const allRequests = requests ?? [];

  // Split into pending and fulfilled
  const pendingList = [...allRequests]
    .filter((r) => r.status === PriorityRequestStatus.pending)
    .sort((a, b) => b.requestDate.localeCompare(a.requestDate));

  const fulfilledList = [...allRequests]
    .filter((r) => r.status === PriorityRequestStatus.fulfilled)
    .sort((a, b) => {
      // Sort by delivery date descending (newest first), fallback to requestDate
      const aDate = (a.deliveryDate as string | null) ?? a.requestDate;
      const bDate = (b.deliveryDate as string | null) ?? b.requestDate;
      return bDate.localeCompare(aDate);
    });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Priority Register
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track customer plant requests for future fulfilment
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Request
        </Button>
      </div>

      {/* Summary Badges */}
      {!isLoading && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              {pendingList.length} Pending
            </span>
          </div>
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              {fulfilledList.length} Fulfilled
            </span>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "active"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Active Requests
          {pendingList.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              {pendingList.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          History
          {fulfilledList.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {fulfilledList.length}
            </span>
          )}
        </button>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeTab === "active" ? (
        /* Active / Pending Tab */
        pendingList.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-lg bg-card">
            <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No pending requests</p>
            <p className="text-sm mt-1">
              All requests have been fulfilled or no requests added yet.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden overflow-x-auto">
            <Table>
              <RequestTableHeader />
              <TableBody>
                {pendingList.map((req, idx) => (
                  <TableRow key={req.id.toString()}>
                    <TableCell className="text-muted-foreground text-sm">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {req.customerName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {req.customerPhone}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{req.plantName}</span>
                      {req.plantVariety && (
                        <span className="text-muted-foreground text-sm ml-1">
                          ({req.plantVariety})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {Number(req.quantity)}
                    </TableCell>
                    <TableCell className="text-sm">{req.requestDate}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {req.wantedDate}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="text-muted-foreground">—</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20"
                        onClick={() => setFulfilTarget(req)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Fulfil
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : /* History / Fulfilled Tab */
      fulfilledList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-lg bg-card">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No fulfilled requests yet</p>
          <p className="text-sm mt-1">
            Fulfilled requests will appear here after you mark them as
            fulfilled.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden overflow-x-auto">
          <Table>
            <RequestTableHeader />
            <TableBody>
              {fulfilledList.map((req, idx) => (
                <TableRow key={req.id.toString()}>
                  <TableCell className="text-muted-foreground text-sm">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {req.customerName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {req.customerPhone}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{req.plantName}</span>
                    {req.plantVariety && (
                      <span className="text-muted-foreground text-sm ml-1">
                        ({req.plantVariety})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {Number(req.quantity)}
                  </TableCell>
                  <TableCell className="text-sm">{req.requestDate}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {req.wantedDate}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Fulfilled
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {req.deliveryDate ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-yellow-700 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-700 dark:hover:bg-yellow-900/20"
                      onClick={() => setReopenTarget(req)}
                    >
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Reopen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <AddRequestDialog open={addOpen} onOpenChange={setAddOpen} />
      <FulfilDialog
        request={fulfilTarget}
        onClose={() => setFulfilTarget(null)}
      />
      <ReopenDialog
        request={reopenTarget}
        onClose={() => setReopenTarget(null)}
      />
    </div>
  );
}
