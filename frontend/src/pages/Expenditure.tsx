import { useState, useMemo } from 'react';
import { Plus, Receipt, Filter, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useGetAllExpenditures,
  useAddExpenditure,
  filterByDateRange,
  filterExpendituresByCategory,
  getTodayString,
  formatCurrency,
} from '../hooks/useQueries';
import { ExpenditureCategory } from '../backend';

const categoryColors: Record<string, string> = {
  rent: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  labour: 'bg-primary/10 text-primary border-primary/20',
  supplies: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  transport: 'bg-accent/10 text-accent border-accent/20',
  utilities: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  other: 'bg-muted text-muted-foreground border-border',
};

const categoryLabels: Record<string, string> = {
  rent: 'Rent',
  labour: 'Labour',
  supplies: 'Supplies',
  transport: 'Transport',
  utilities: 'Utilities',
  other: 'Other',
};

export function Expenditure() {
  const today = getTodayString();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<ExpenditureCategory>(ExpenditureCategory.other);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterCategory, setFilterCategory] = useState<ExpenditureCategory | 'all'>('all');

  const { data: expenditures = [], isLoading } = useGetAllExpenditures();
  const addExpenditure = useAddExpenditure();

  const filteredExpenditures = useMemo(() => {
    let result = filterByDateRange(expenditures, filterStart, filterEnd);
    result = filterExpendituresByCategory(result, filterCategory);
    return result;
  }, [expenditures, filterStart, filterEnd, filterCategory]);

  const periodTotal = useMemo(
    () => filteredExpenditures.reduce((sum, e) => sum + Number(e.amount), 0),
    [filteredExpenditures]
  );

  const handleSubmit = async () => {
    if (!date || !description || !amount) return;
    await addExpenditure.mutateAsync({
      date,
      category,
      description,
      amount: BigInt(Math.round(parseFloat(amount))),
    });
    setOpen(false);
    setDescription(''); setAmount('');
    setDate(today); setCategory(ExpenditureCategory.other);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Expenditure</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track all business expenses</p>
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
              <DialogTitle className="font-display text-xl">Add Expenditure</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ExpenditureCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ExpenditureCategory).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryLabels[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  placeholder="e.g. Monthly rent payment"
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  'Add Expenditure'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <Filter className="w-4 h-4 text-muted-foreground mt-6" />
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as ExpenditureCategory | 'all')}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.values(ExpenditureCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFilterStart(''); setFilterEnd(''); setFilterCategory('all'); }}>
              Clear
            </Button>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Period Total</p>
              <p className="text-lg font-bold text-accent">{formatCurrency(periodTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenditure Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-accent" />
            Expenditure Records
            <Badge variant="secondary" className="ml-1">{filteredExpenditures.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />)}
            </div>
          ) : filteredExpenditures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No expenditure records found</p>
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
                  {[...filteredExpenditures].reverse().map((exp, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-sm">{exp.date}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${categoryColors[exp.category as string] || categoryColors.other}`}>
                          {categoryLabels[exp.category as string] || exp.category as string}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{exp.description}</TableCell>
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
