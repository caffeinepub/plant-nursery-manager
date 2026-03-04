import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PaymentMethod } from "../backend";
import type { SaleItem, SalesRecord } from "../backend";
import { usePinRole } from "../hooks/usePinRole";
import {
  useAddSale,
  useDeleteSale,
  useGetInventory,
  useGetSales,
  useGetSalesByPlant,
} from "../hooks/useQueries";
import { exportToExcel } from "../utils/excelExport";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SaleItemForm {
  plantName: string;
  quantity: string;
  unitPrice: string;
}

// ─── Stock-wise Report Row ────────────────────────────────────────────────────
function StockReportRow({
  plantName,
  startDate,
  endDate,
}: {
  plantName: string;
  startDate: string;
  endDate: string;
}) {
  const { data, isLoading } = useGetSalesByPlant(plantName, startDate, endDate);

  if (isLoading) {
    return (
      <TableRow>
        <TableCell>{plantName}</TableCell>
        <TableCell className="text-center">
          <Loader2 className="h-4 w-4 animate-spin inline" />
        </TableCell>
        <TableCell className="text-center">
          <Loader2 className="h-4 w-4 animate-spin inline" />
        </TableCell>
      </TableRow>
    );
  }

  const qty = data ? Number(data[0]) : 0;
  const revenue = data ? Number(data[1]) : 0;

  if (qty === 0) return null;

  return (
    <TableRow>
      <TableCell className="font-medium">{plantName}</TableCell>
      <TableCell className="text-center">{qty}</TableCell>
      <TableCell className="text-right">
        ₹{revenue.toLocaleString("en-IN")}
      </TableCell>
    </TableRow>
  );
}

// ─── Thermal Invoice PDF (4-inch / 302px wide) ───────────────────────────────
function generateInvoicePDF(sale: SalesRecord) {
  const paymentLabel =
    sale.paymentMethod === PaymentMethod.cash
      ? "Cash"
      : sale.paymentMethod === PaymentMethod.card
        ? "Card"
        : "UPI";

  const itemRows = sale.items
    .map((item: SaleItem) => {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      const amt = qty * price;
      // Truncate plant name to fit 302px width
      const name =
        item.plantName.length > 16
          ? `${item.plantName.slice(0, 14)}..`
          : item.plantName;
      return `<tr>
        <td style="padding:1px 0;font-size:11px;word-break:break-word;">${name}</td>
        <td style="padding:1px 2px;font-size:11px;text-align:center;">${qty}</td>
        <td style="padding:1px 2px;font-size:11px;text-align:right;">${price}</td>
        <td style="padding:1px 0;font-size:11px;text-align:right;">${amt.toLocaleString("en-IN")}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Bill ${sale.billingNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000;
      background: #fff;
      max-width: 302px;
      margin: 0 auto;
      padding: 8px 6px 16px 6px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .company-name { font-size: 14px; font-weight: bold; text-align: center; letter-spacing: 0.5px; }
    .address { font-size: 9px; text-align: center; color: #333; line-height: 1.4; margin-top: 2px; }
    .divider { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    .meta-line { font-size: 10px; text-align: center; }
    .customer-line { font-size: 10px; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 2px 0; }
    thead tr th { font-size: 10px; font-weight: bold; border-bottom: 1px solid #000; padding: 1px 2px; }
    thead tr th:first-child { text-align: left; }
    thead tr th:nth-child(2) { text-align: center; }
    thead tr th:nth-child(3), thead tr th:nth-child(4) { text-align: right; }
    .total-row td { font-weight: bold; font-size: 11px; border-top: 1px solid #000; padding: 2px 0; }
    .total-row td:first-child { text-align: right; }
    .total-row td:last-child { text-align: right; }
    .footer-text { font-size: 9px; text-align: center; color: #333; line-height: 1.5; margin-top: 6px; }
    .thank-you { font-size: 11px; font-weight: bold; text-align: center; margin-top: 5px; }
    .tamil-verse { font-size: 11px; text-align: center; color: #000; line-height: 1.6; margin: 3px 0; font-family: serif; }
    @media print {
      body { margin: 0; padding: 4px 4px 12px 4px; }
    }
  </style>
</head>
<body>
  <div class="company-name">ESEARTH NURSERY GARDEN</div>
  <div class="address">Near Jio Petrol Bunk, Salem Highway,<br/>Papinaickenpatti, Namakkal-637003</div>

  <hr class="divider"/>

  <div class="meta-line bold">Bill No: ${sale.billingNumber || "—"}</div>
  <div class="meta-line">Date: ${sale.date} &nbsp;|&nbsp; Payment: ${paymentLabel}</div>

  ${
    sale.customerName || sale.customerMobile
      ? `<div class="customer-line">Customer: ${sale.customerName || "Walk-in"}</div>
         ${sale.customerMobile ? `<div class="customer-line">Mobile: ${sale.customerMobile}</div>` : ""}`
      : ""
  }

  <hr class="divider"/>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;width:42%;">Item</th>
        <th style="text-align:center;width:13%;">Qty</th>
        <th style="text-align:right;width:20%;">Price</th>
        <th style="text-align:right;width:25%;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align:right;padding-right:4px;">TOTAL</td>
        <td style="text-align:right;">&#8377;${Number(sale.totalAmount).toLocaleString("en-IN")}</td>
      </tr>
    </tfoot>
  </table>

  <hr class="divider"/>

  <div class="tamil-verse">உழுதுண்டு வாழ்வாரே வாழ்வார்மற் றெல்லாம்</div>
  <div class="tamil-verse">தொழுதுண்டு பின்செல் பவர்.</div>

  <hr class="divider"/>

  <div class="footer-text">
    Declaration: We declare that this invoice shows the actual price<br/>
    of the goods described and all the particulars are true and correct.
  </div>
  <div class="thank-you">THANK YOU FOR SHOPPING WITH US</div>
  <div class="footer-text">VISIT AGAIN, HAVE A NICE DAY</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

// ─── Searchable Plant Combobox ────────────────────────────────────────────────
interface PlantOption {
  plantName: string;
  currentStock: number;
}

function PlantCombobox({
  value,
  onChange,
  options,
  placeholder,
  ocidIndex,
}: {
  value: string;
  onChange: (v: string) => void;
  options: PlantOption[];
  placeholder?: string;
  ocidIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = options.find((o) => o.plantName === value);
  const displayLabel = selected
    ? `${selected.plantName} (Stock: ${selected.currentStock})`
    : "";

  // Filter options based on typed search keyword (case-insensitive)
  const filteredOptions = search.trim()
    ? options.filter((o) =>
        o.plantName.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : options;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left h-12 text-base"
          data-ocid={`sales.plant.select.${ocidIndex}`}
        >
          <span
            className={`truncate text-base ${!value ? "text-muted-foreground" : ""}`}
          >
            {value ? displayLabel : (placeholder ?? "Select plant")}
          </span>
          <ChevronDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        data-ocid={`sales.plant.popover.${ocidIndex}`}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search plant..."
            value={search}
            onValueChange={setSearch}
            className="text-base h-12"
            data-ocid={`sales.plant.search_input.${ocidIndex}`}
          />
          <CommandList className="max-h-60">
            <CommandEmpty>No plant found.</CommandEmpty>
            {filteredOptions.map((opt) => (
              <CommandItem
                key={opt.plantName}
                value={opt.plantName}
                onSelect={() => {
                  onChange(opt.plantName === value ? "" : opt.plantName);
                  setSearch("");
                  setOpen(false);
                }}
                className="text-base py-3 cursor-pointer"
                data-ocid={`sales.plant.item.${ocidIndex}`}
              >
                <span className="flex-1 text-base">{opt.plantName}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  Stock: {opt.currentStock}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Sales() {
  const queryClient = useQueryClient();
  const { data: sales, isLoading: salesLoading } = useGetSales();
  const {
    data: inventory,
    isLoading: inventoryLoading,
    refetch: refetchInventory,
  } = useGetInventory();
  const addSale = useAddSale();
  const deleteSale = useDeleteSale();
  const { appRole } = usePinRole();
  const isOwner = appRole === "owner";

  const [formExpanded, setFormExpanded] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("records");

  // New sale form state
  const [items, setItems] = useState<SaleItemForm[]>([
    { plantName: "", quantity: "", unitPrice: "" },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.cash,
  );
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Refresh inventory on page load and when dialog opens
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    refetchInventory();
  }, [queryClient, refetchInventory]);

  // Filtered sales
  const filteredSales = (sales ?? []).filter((s) => {
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    return true;
  });

  // Unique plant names from filtered sales for stock-wise report
  const uniquePlantNames = Array.from(
    new Set(filteredSales.flatMap((s) => s.items.map((i) => i.plantName))),
  ).sort();

  // All unique plant names from all sales (for report when no date filter)
  const allUniquePlantNames = Array.from(
    new Set((sales ?? []).flatMap((s) => s.items.map((i) => i.plantName))),
  ).sort();

  const reportPlantNames =
    startDate || endDate ? uniquePlantNames : allUniquePlantNames;
  const reportStartDate = startDate || "2000-01-01";
  const reportEndDate = endDate || "2099-12-31";

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { plantName: "", quantity: "", unitPrice: "" },
    ]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (
    idx: number,
    field: keyof SaleItemForm,
    value: string,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      // Auto-fill unit price from inventory
      if (field === "plantName" && inventory) {
        const inv = inventory.find((i) => i.plantName === value);
        if (inv) updated[idx].unitPrice = String(Number(inv.sellingPrice));
      }
      return updated;
    });
  };

  const totalAmount = items.reduce((sum, item) => {
    const qty = Number.parseInt(item.quantity) || 0;
    const price = Number.parseInt(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const handleSubmit = async () => {
    const validItems = items.filter(
      (i) => i.plantName && i.quantity && i.unitPrice,
    );
    if (validItems.length === 0) return;

    const saleItems: SaleItem[] = validItems.map((i) => ({
      plantName: i.plantName,
      quantity: BigInt(Number.parseInt(i.quantity)),
      unitPrice: BigInt(Number.parseInt(i.unitPrice)),
    }));

    const sale: SalesRecord = {
      date: saleDate,
      items: saleItems,
      totalAmount: BigInt(totalAmount),
      paymentMethod,
      customerName: customerName || undefined,
      customerMobile: customerMobile || undefined,
      customerPhoto: undefined,
      billingNumber: "", // will be assigned by backend
    };

    await addSale.mutateAsync(sale);

    // Reset form
    setItems([{ plantName: "", quantity: "", unitPrice: "" }]);
    setPaymentMethod(PaymentMethod.cash);
    setCustomerName("");
    setCustomerMobile("");
    setSaleDate(new Date().toISOString().split("T")[0]);
  };

  const handleExport = () => {
    if (!filteredSales.length) return;
    const rows = filteredSales.map((s) => ({
      "Billing No.": s.billingNumber,
      Date: s.date,
      Customer: s.customerName || "Walk-in",
      Mobile: s.customerMobile || "",
      Items: s.items
        .map((i) => `${i.plantName} x${Number(i.quantity)}`)
        .join(", "),
      Payment: s.paymentMethod,
      "Total (₹)": Number(s.totalAmount),
    }));
    exportToExcel("sales-records", rows);
  };

  const paymentBadgeVariant = (
    method: PaymentMethod,
  ): "default" | "secondary" | "outline" => {
    if (method === PaymentMethod.cash) return "default";
    if (method === PaymentMethod.card) return "secondary";
    return "outline";
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── RECORD NEW SALE — Prominent inline form at the top ── */}
      <div
        className="rounded-xl border-2 border-primary bg-card shadow-md"
        data-ocid="sales.new_sale.card"
      >
        {/* Card header with toggle */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-4 text-left"
          onClick={() => setFormExpanded((v) => !v)}
          data-ocid="sales.new_sale.toggle"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground rounded-lg p-2">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Record New Sale
              </h2>
              <p className="text-sm text-muted-foreground">
                {formExpanded
                  ? "Fill in the details below to record a sale"
                  : "Tap to expand and record a sale"}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${formExpanded ? "rotate-180" : ""}`}
          />
        </button>

        {formExpanded && (
          <div className="px-5 pb-5 space-y-5 border-t pt-5">
            {/* Date + Customer row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-base font-medium mb-1 block">Date</Label>
                <Input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="h-11 text-base"
                  data-ocid="sales.date.input"
                />
              </div>
              <div>
                <Label className="text-base font-medium mb-1 block">
                  Customer Name
                </Label>
                <Input
                  placeholder="Optional"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-11 text-base"
                  data-ocid="sales.customer_name.input"
                />
              </div>
              <div>
                <Label className="text-base font-medium mb-1 block">
                  Mobile
                </Label>
                <Input
                  placeholder="Optional"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="h-11 text-base"
                  data-ocid="sales.customer_mobile.input"
                />
              </div>
            </div>

            {/* Items section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Sale Items</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  data-ocid="sales.add_item.button"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>

              {inventoryLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading inventory...
                </div>
              ) : !inventory || inventory.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-muted rounded p-3">
                  No plants in inventory.{" "}
                  <button
                    type="button"
                    className="underline text-primary"
                    onClick={() => refetchInventory()}
                  >
                    Refresh
                  </button>{" "}
                  or add plants in the Inventory page first.
                </div>
              ) : null}

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={`${item.plantName}-${idx}`}
                    className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-end"
                  >
                    <div>
                      {idx === 0 && (
                        <Label className="text-sm text-muted-foreground mb-1 block">
                          Plant Name
                        </Label>
                      )}
                      <PlantCombobox
                        value={item.plantName}
                        onChange={(v) => updateItem(idx, "plantName", v)}
                        options={(inventory ?? []).map((inv) => ({
                          plantName: inv.plantName,
                          currentStock: Number(inv.currentStock),
                        }))}
                        placeholder="Select or type plant name"
                        ocidIndex={idx + 1}
                      />
                    </div>
                    <div>
                      {idx === 0 && (
                        <Label className="text-sm text-muted-foreground mb-1 block">
                          Qty
                        </Label>
                      )}
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, "quantity", e.target.value)
                        }
                        className="h-12 text-base text-center"
                        data-ocid={`sales.qty.input.${idx + 1}`}
                      />
                    </div>
                    <div>
                      {idx === 0 && (
                        <Label className="text-sm text-muted-foreground mb-1 block">
                          Price (₹)
                        </Label>
                      )}
                      <Input
                        type="number"
                        min="0"
                        placeholder="₹Price"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(idx, "unitPrice", e.target.value)
                        }
                        className="h-12 text-base"
                        data-ocid={`sales.price.input.${idx + 1}`}
                      />
                    </div>
                    <div className={idx === 0 ? "pt-6" : ""}>
                      {items.length > 1 ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(idx)}
                          data-ocid={`sales.remove_item.button.${idx + 1}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <div className="w-9" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment + Total + Submit row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label className="text-base font-medium mb-1 block">
                  Payment Method
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger
                    className="h-11 text-base"
                    data-ocid="sales.payment.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.cash}>Cash</SelectItem>
                    <SelectItem value={PaymentMethod.card}>Card</SelectItem>
                    <SelectItem value={PaymentMethod.upi}>UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-3 flex justify-between items-center">
                <span className="text-base font-semibold text-foreground">
                  Total
                </span>
                <span className="text-2xl font-bold text-primary">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <Button
                size="lg"
                className="h-11 text-base font-semibold"
                onClick={handleSubmit}
                disabled={addSale.isPending || items.every((i) => !i.plantName)}
                data-ocid="sales.record_sale.submit_button"
              >
                {addSale.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Record Sale
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Header row with export ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sales Records</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            View and manage past sales
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={!filteredSales.length}
          data-ocid="sales.export.button"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Date Filter */}
      <div className="flex gap-4 items-end">
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
            data-ocid="sales.date_from.input"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
            data-ocid="sales.date_to.input"
          />
        </div>
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            data-ocid="sales.clear_filter.button"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Tabs: Sales Records | Stock-wise Report */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records">
            <FileText className="h-4 w-4 mr-2" />
            Sales Records
          </TabsTrigger>
          <TabsTrigger value="stockreport">
            <BarChart3 className="h-4 w-4 mr-2" />
            Stock-wise Report
          </TabsTrigger>
        </TabsList>

        {/* ── Sales Records Tab ── */}
        <TabsContent value="records" className="mt-4">
          {salesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No sales records found</p>
              <p className="text-sm mt-1">
                {startDate || endDate
                  ? "No sales in the selected date range."
                  : 'Record your first sale using the "New Sale" button.'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Billing No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total (₹)</TableHead>
                    <TableHead className="text-center">Invoice</TableHead>
                    {isOwner && (
                      <TableHead className="text-center">Delete</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filteredSales].reverse().map((sale, idx) => (
                    <TableRow key={sale.billingNumber || `sale-${idx}`}>
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-primary">
                          {sale.billingNumber || "—"}
                        </span>
                      </TableCell>
                      <TableCell>{sale.date}</TableCell>
                      <TableCell>{sale.customerName || "Walk-in"}</TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {sale.items
                            .map((i) => `${i.plantName} ×${Number(i.quantity)}`)
                            .join(", ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={paymentBadgeVariant(
                            sale.paymentMethod as PaymentMethod,
                          )}
                        >
                          {sale.paymentMethod === PaymentMethod.cash
                            ? "Cash"
                            : sale.paymentMethod === PaymentMethod.card
                              ? "Card"
                              : "UPI"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{Number(sale.totalAmount).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateInvoicePDF(sale)}
                          title="Print Invoice"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      {isOwner && (
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleteSale.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete sale ${sale.billingNumber}? This cannot be undone.`,
                                )
                              ) {
                                deleteSale.mutate(sale.billingNumber);
                              }
                            }}
                            title="Delete Sale"
                          >
                            {deleteSale.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Stock-wise Report Tab ── */}
        <TabsContent value="stockreport" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <h2 className="font-semibold text-foreground">
                Stock-wise Sales Report
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {startDate || endDate
                  ? `Showing data from ${startDate || "beginning"} to ${endDate || "today"}`
                  : "Showing all-time data"}
              </p>
            </div>
            {salesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : reportPlantNames.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">
                  No sales data for the selected period
                </p>
                <p className="text-sm mt-1">
                  Try adjusting the date range or record some sales first.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plant Name</TableHead>
                    <TableHead className="text-center">
                      Total Qty Sold
                    </TableHead>
                    <TableHead className="text-right">
                      Total Revenue (₹)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportPlantNames.map((plantName) => (
                    <StockReportRow
                      key={plantName}
                      plantName={plantName}
                      startDate={reportStartDate}
                      endDate={reportEndDate}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
