import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "@/hooks/useActor";
import { SalesRecord, SaleItem, PaymentMethod } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  FileDown,
  Camera,
  X,
  Loader2,
  ShoppingCart,
  User,
  Phone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SaleItemForm {
  plantName: string;
  quantity: string;
  unitPrice: string;
}

// ─── PDF Generation (CDN jsPDF loaded lazily) ─────────────────────────────────

function loadJsPDF(): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).jspdf) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => {
      const autoScript = document.createElement("script");
      autoScript.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
      autoScript.onload = () => resolve();
      autoScript.onerror = reject;
      document.head.appendChild(autoScript);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function exportInvoicePDF(record: SalesRecord, index: number) {
  await loadJsPDF();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { jsPDF } = (window as any).jspdf;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ── Header ──
  doc.setFillColor(34, 85, 34);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Green Roots Nursery", margin, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Your trusted plant partner", margin, 19);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SALES INVOICE", pageW - margin, 12, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #${String(index + 1).padStart(4, "0")}`, pageW - margin, 19, {
    align: "right",
  });
  y = 36;

  // ── Date & Payment ──
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.text(`Date: ${record.date}`, margin, y);
  const pmLabel =
    record.paymentMethod === PaymentMethod.cash
      ? "Cash"
      : record.paymentMethod === PaymentMethod.card
      ? "Card"
      : "UPI";
  doc.text(`Payment: ${pmLabel}`, pageW - margin, y, { align: "right" });
  y += 8;

  // ── Customer Info ──
  if (record.customerName || record.customerMobile) {
    doc.setFillColor(240, 248, 240);
    doc.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 85, 34);
    doc.text("Customer Details", margin + 3, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    if (record.customerName) {
      doc.text(`Name: ${record.customerName}`, margin + 3, y + 12);
    }
    if (record.customerMobile) {
      doc.text(
        `Mobile: ${record.customerMobile}`,
        record.customerName ? pageW / 2 : margin + 3,
        y + 12
      );
    }
    if (record.customerPhoto) {
      try {
        const imgX = pageW - margin - 18;
        doc.addImage(record.customerPhoto, "JPEG", imgX, y + 1, 16, 16);
      } catch {
        // ignore image errors
      }
    }
    y += 24;
  }

  // ── Line Items Table ──
  const tableData = record.items.map((item) => [
    item.plantName,
    String(item.quantity),
    `Rs.${Number(item.unitPrice).toLocaleString("en-IN")}`,
    `Rs.${(Number(item.quantity) * Number(item.unitPrice)).toLocaleString("en-IN")}`,
  ]);

  doc.autoTable({
    startY: y,
    head: [["Plant Name", "Qty", "Unit Price", "Subtotal"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [34, 85, 34],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [245, 252, 245] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Total ──
  doc.setFillColor(34, 85, 34);
  doc.roundedRect(pageW - margin - 60, y, 60, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Total: Rs.${Number(record.totalAmount).toLocaleString("en-IN")}`,
    pageW - margin - 4,
    y + 8,
    { align: "right" }
  );

  // ── Footer ──
  const pageH = doc.internal.pageSize.getHeight();
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your purchase!", pageW / 2, pageH - 10, {
    align: "center",
  });

  doc.save(`invoice-${record.date.replace(/\//g, "-")}-${index + 1}.pdf`);
}

// ─── Camera Capture Sub-component ─────────────────────────────────────────────

function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (base64: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Camera access denied"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.8);
    onCapture(base64);
    stopCamera();
    onClose();
  }, [onCapture, stopCamera, onClose]);

  return (
    <div className="flex flex-col gap-3">
      {cameraError && (
        <p className="text-destructive text-sm bg-destructive/10 rounded p-2">
          {cameraError}
        </p>
      )}
      <div
        className="relative bg-muted rounded-lg overflow-hidden"
        style={{ minHeight: 240, aspectRatio: "4/3" }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          style={{ minHeight: 240 }}
        />
        <canvas ref={canvasRef} className="hidden" />
        {!isActive && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button onClick={startCamera} disabled={isLoading}>
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            stopCamera();
            onClose();
          }}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={capturePhoto}
          disabled={!isActive || isLoading}
        >
          <Camera className="w-4 h-4 mr-2" />
          Capture Photo
        </Button>
      </div>
    </div>
  );
}

// ─── Main Sales Page ───────────────────────────────────────────────────────────

export function Sales() {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();

  // Dialog state
  const [open, setOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Form state
  const [items, setItems] = useState<SaleItemForm[]>([
    { plantName: "", quantity: "", unitPrice: "" },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.cash
  );
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerPhoto, setCustomerPhoto] = useState<string>("");
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ──
  const { data: salesRecords = [], isLoading } = useQuery<SalesRecord[]>({
    queryKey: ["salesRecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllSalesRecords();
    },
    enabled: !!actor && !isFetching,
  });

  // ── Mutations ──
  const addSaleMutation = useMutation({
    mutationFn: async (record: SalesRecord) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.addSalesRecord(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesRecords"] });
      resetForm();
      setOpen(false);
    },
  });

  // ── Helpers ──
  function resetForm() {
    setItems([{ plantName: "", quantity: "", unitPrice: "" }]);
    setPaymentMethod(PaymentMethod.cash);
    setCustomerName("");
    setCustomerMobile("");
    setCustomerPhoto("");
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { plantName: "", quantity: "", unitPrice: "" },
    ]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof SaleItemForm, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  function calcTotal(): number {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomerPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    const validItems = items.filter(
      (item) => item.plantName && item.quantity && item.unitPrice
    );
    if (validItems.length === 0) return;

    const saleItems: SaleItem[] = validItems.map((item) => ({
      plantName: item.plantName,
      quantity: BigInt(Math.round(parseFloat(item.quantity))),
      unitPrice: BigInt(Math.round(parseFloat(item.unitPrice))),
    }));

    const record: SalesRecord = {
      date: new Date().toISOString().split("T")[0],
      items: saleItems,
      totalAmount: BigInt(Math.round(calcTotal())),
      paymentMethod,
      customerName: customerName || undefined,
      customerMobile: customerMobile || undefined,
      customerPhoto: customerPhoto || undefined,
    };

    addSaleMutation.mutate(record);
  }

  async function handleExportPDF(record: SalesRecord, index: number) {
    setExportingIndex(index);
    try {
      await exportInvoicePDF(record, index);
    } finally {
      setExportingIndex(null);
    }
  }

  const paymentBadgeVariant = (
    pm: PaymentMethod
  ): "default" | "secondary" | "outline" => {
    if (pm === PaymentMethod.cash) return "default";
    if (pm === PaymentMethod.card) return "secondary";
    return "outline";
  };

  const paymentLabel = (pm: PaymentMethod) => {
    if (pm === PaymentMethod.cash) return "Cash";
    if (pm === PaymentMethod.card) return "Card";
    return "UPI";
  };

  // ── Render ──
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Records</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track all plant sales and generate invoices
          </p>
        </div>

        {/* New Sale Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Record New Sale
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Customer Info Section */}
              <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Customer Information (Optional)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      placeholder="e.g. Priya Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="customerMobile">
                      <Phone className="w-3 h-3 inline mr-1" />
                      Mobile Number
                    </Label>
                    <Input
                      id="customerMobile"
                      placeholder="e.g. 9876543210"
                      inputMode="tel"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                    />
                  </div>
                </div>

                {/* Customer Photo */}
                <div className="space-y-2">
                  <Label>Customer Photo</Label>
                  <div className="flex items-start gap-3">
                    {customerPhoto ? (
                      <div className="relative">
                        <img
                          src={customerPhoto}
                          alt="Customer"
                          className="w-20 h-20 rounded-lg object-cover border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomerPhoto("")}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      {/* Camera capture dialog */}
                      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            Use Camera
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Capture Customer Photo</DialogTitle>
                          </DialogHeader>
                          <CameraCapture
                            onCapture={(base64) => setCustomerPhoto(base64)}
                            onClose={() => setCameraOpen(false)}
                          />
                        </DialogContent>
                      </Dialog>

                      {/* File upload fallback */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Plus className="w-4 h-4" />
                        Upload Photo
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sale Items */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Sale Items
                </h3>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_80px_90px_36px] gap-2 items-end"
                  >
                    <div className="space-y-1">
                      {idx === 0 && <Label>Plant Name</Label>}
                      <Input
                        placeholder="e.g. Rose Bush"
                        value={item.plantName}
                        onChange={(e) =>
                          updateItem(idx, "plantName", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label>Qty</Label>}
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, "quantity", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label>Unit Price (Rs.)</Label>}
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(idx, "unitPrice", e.target.value)
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.cash}>Cash</SelectItem>
                    <SelectItem value={PaymentMethod.card}>Card</SelectItem>
                    <SelectItem value={PaymentMethod.upi}>UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center rounded-lg bg-primary/10 px-4 py-3">
                <span className="font-semibold text-foreground">
                  Total Amount
                </span>
                <span className="text-xl font-bold text-primary">
                  Rs.{calcTotal().toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={addSaleMutation.isPending}
                className="gap-2"
              >
                {addSaleMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Save Sale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {salesRecords.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              Rs.
              {salesRecords
                .reduce((sum, r) => sum + Number(r.totalAmount), 0)
                .toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Avg. Sale Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              Rs.
              {salesRecords.length > 0
                ? Math.round(
                    salesRecords.reduce(
                      (sum, r) => sum + Number(r.totalAmount),
                      0
                    ) / salesRecords.length
                  ).toLocaleString("en-IN")
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : salesRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <ShoppingCart className="w-10 h-10 opacity-30" />
              <p className="text-sm">
                No sales recorded yet. Add your first sale!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRecords.map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        {record.date}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.customerPhoto && (
                            <img
                              src={record.customerPhoto}
                              alt="Customer"
                              className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            {record.customerName ? (
                              <p className="text-sm font-medium truncate max-w-[120px]">
                                {record.customerName}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                Walk-in
                              </p>
                            )}
                            {record.customerMobile && (
                              <p className="text-xs text-muted-foreground">
                                {record.customerMobile}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {record.items.slice(0, 2).map((item, i) => (
                            <p key={i} className="text-xs text-muted-foreground">
                              {item.plantName} × {String(item.quantity)}
                            </p>
                          ))}
                          {record.items.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{record.items.length - 2} more
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={paymentBadgeVariant(record.paymentMethod)}
                        >
                          {paymentLabel(record.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        Rs.{Number(record.totalAmount).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => handleExportPDF(record, idx)}
                          disabled={exportingIndex === idx}
                        >
                          {exportingIndex === idx ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileDown className="w-3 h-3" />
                          )}
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Sales;
