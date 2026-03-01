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
import { Download, Filter, Loader2, Plus, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { ExpenditureCategory } from "../backend";
import {
  filterByDateRange,
  filterExpendituresByCategory,
  formatCurrency,
  getTodayString,
  useAddExpenditure,
  useGetAllExpenditures,
} from "../hooks/useQueries";
import { exportToExcel } from "../utils/excelExport";

const categoryColors: Record<string, string> = {
  rent: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  labour: "bg-primary/10 text-primary border-primary/20",
  supplies: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  transport: "bg-accent/10 text-accent border-accent/20",
  utilities: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  other: "bg-muted text-muted-foreground border-border",
};

const categoryLabels: Record<string, string> = {
  rent: "Rent",
  labour: "Labour",
  supplies: "Supplies",
  transport: "Transport",
  utilities: "Utilities",
  other: "Other",
};

export default function Expenditure() {
  const today = getTodayString();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<ExpenditureCategory>(
    ExpenditureCategory.other,
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [filterCategory, setFilterCategory] = useState<
    ExpenditureCategory | "all"
  >("all");
  const [isExporting, setIsExporting] = useState(false);

  const { data: expenditures = [], isLoading } = useGetAllExpenditures();
  const addExpenditure = useAddExpenditure();

  const filteredExpenditures = useMemo(() => {
    let result = filterByDateRange(expenditures, filterStart, filterEnd);
    result = filterExpendituresByCategory(result, filterCategory);
    return result;
  }, [expenditures, filterStart, filterEnd, filterCategory]);

  const periodTotal = useMemo(
    () => filteredExpenditures.reduce((sum, e) => sum + Number(e.amount), 0),
    [filteredExpenditures],
  );

  const handleSubmit = async () => {
    if (!date || !description || !amount) return;
    await addExpenditure.mutateAsync({
      date,
      category,
      description,
      amount: BigInt(Math.round(Number.parseFloat(amount))),
    });
    setOpen(false);
    setDescription("");
    setAmount("");
    setDate(today);
    setCategory(ExpenditureCategory.other);
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      // Use a loose row type to allow the summary row with empty strings
      const rows: Record<string, string | number>[] = filteredExpenditures.map(
        (exp) => ({
          Date: exp.date,
          Category: exp.category as string,
          Description: exp.description,
          Amount: Number(exp.amount),
        }),
      );

      rows.push({
        Date: "",
        Category: "",
        Description: "TOTAL",
        Amount: periodTotal,
      });

      const startLabel = filterStart || "all";
      const endLabel = filterEnd || "all";
      await exportToExcel(
        `expenditure-report-${startLabel}-to-${endLabel}.xlsx`,
        rows,
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Expenditure
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track and manage business expenses
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Add Expenditure
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as ExpenditureCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ExpenditureCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat] ?? cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  placeholder="e.g. Monthly shop rent"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={addExpenditure.isPending || !description || !amount}
              >
                {addExpenditure.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Expenditure"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters + Export */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Filter className="w-3 h-3" /> From Date
              </Label>
              <Input
                type="date"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select
                value={filterCategory}
                onValueChange={(v) =>
                  setFilterCategory(v as ExpenditureCategory | "all")
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.values(ExpenditureCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat] ?? cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting || filteredExpenditures.length === 0}
              className="gap-2 ml-auto"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting…" : "Export to Excel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredExpenditures.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Period Total</p>
              <p className="text-xl font-bold text-accent">
                {formatCurrency(periodTotal)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-xl font-bold">{filteredExpenditures.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Expenditure Records
            {filteredExpenditures.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filteredExpenditures.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-muted/40 rounded animate-pulse"
                />
              ))}
            </div>
          ) : filteredExpenditures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No expenditures found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setOpen(true)}
              >
                Add First Expense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenditures.map((exp) => (
                    <TableRow
                      key={`${exp.date}-${exp.category as string}-${String(exp.amount)}-${exp.description}`}
                      className="hover:bg-muted/20"
                    >
                      <TableCell className="text-sm">{exp.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${categoryColors[exp.category as string] ?? ""}`}
                        >
                          {categoryLabels[exp.category as string] ??
                            (exp.category as string)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {exp.description}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-accent">
                        {formatCurrency(exp.amount)}
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
