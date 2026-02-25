import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, FileText, CheckCircle, Loader2, Eye } from 'lucide-react';
import { Link } from '@tanstack/react-router';
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
import { Separator } from '@/components/ui/separator';
import {
  useGetInventory,
  useCreateInvoice,
  getTodayString,
  formatCurrency,
} from '../hooks/useQueries';
import { PaymentStatus } from '../backend';
import type { SaleItem, Invoice } from '../backend';
import { useActor } from '../hooks/useActor';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface LineItem {
  plantName: string;
  quantity: string;
  unitPrice: string;
}

const defaultLineItem: LineItem = { plantName: '', quantity: '', unitPrice: '' };

// Hook to fetch all invoices by probing invoice numbers
function useAllInvoices() {
  const { actor, isFetching } = useActor();
  return useQuery<Invoice[]>({
    queryKey: ['invoiceList'],
    queryFn: async () => {
      if (!actor) return [];
      const invoices: Invoice[] = [];
      let num = 1;
      while (true) {
        try {
          const inv = await actor.getInvoice(BigInt(num));
          invoices.push(inv);
          num++;
        } catch {
          break;
        }
      }
      return invoices;
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000,
  });
}

export function Billing() {
  const today = getTodayString();
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState(today);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...defaultLineItem }]);
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');

  const { data: inventory = [] } = useGetInventory();
  const { data: invoices = [], isLoading } = useAllInvoices();
  const createInvoice = useCreateInvoice();
  const queryClient = useQueryClient();
  const { actor } = useActor();

  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'all') return invoices;
    return invoices.filter((inv) => inv.paymentStatus === filterStatus);
  }, [invoices, filterStatus]);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0),
    [lineItems]
  );

  const grandTotal = useMemo(() => {
    const disc = parseFloat(discount) || 0;
    const taxAmt = parseFloat(tax) || 0;
    return subtotal - disc + taxAmt;
  }, [subtotal, discount, tax]);

  const handleLineItemChange = (idx: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'plantName') {
      const inv = inventory.find((i) => i.plantName === value);
      if (inv) updated[idx].unitPrice = String(Number(inv.sellingPrice));
    }
    setLineItems(updated);
  };

  const handleSubmit = async () => {
    const validItems: SaleItem[] = lineItems
      .filter((i) => i.plantName && i.quantity && i.unitPrice)
      .map((i) => ({
        plantName: i.plantName,
        quantity: BigInt(Math.round(parseFloat(i.quantity))),
        unitPrice: BigInt(Math.round(parseFloat(i.unitPrice))),
      }));

    if (validItems.length === 0 || !customerName) return;

    await createInvoice.mutateAsync({
      invoiceNumber: BigInt(0), // will be overwritten by backend
      date,
      customerName,
      customerPhone,
      lineItems: validItems,
      subtotal: BigInt(Math.round(subtotal)),
      discount: BigInt(Math.round(parseFloat(discount) || 0)),
      tax: BigInt(Math.round(parseFloat(tax) || 0)),
      grandTotal: BigInt(Math.round(grandTotal)),
      paymentStatus: PaymentStatus.unpaid,
    });

    setOpen(false);
    setCustomerName(''); setCustomerPhone('');
    setLineItems([{ ...defaultLineItem }]);
    setDiscount('0'); setTax('0');
  };

  const handleMarkPaid = useCallback(async (invoiceNumber: bigint) => {
    if (!actor) return;
    // Re-fetch the invoice, update status, and re-create (backend limitation)
    try {
      const inv = await actor.getInvoice(invoiceNumber);
      await actor.createInvoice({ ...inv, paymentStatus: PaymentStatus.paid });
      queryClient.invalidateQueries({ queryKey: ['invoiceList'] });
    } catch (e) {
      console.error('Failed to mark as paid', e);
    }
  }, [actor, queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Billing & Invoices</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create and manage customer invoices</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Customer Name</Label>
                  <Input placeholder="Full name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input placeholder="+91 XXXXX XXXXX" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Line Items</Label>
                  <Button variant="outline" size="sm" onClick={() => setLineItems([...lineItems, { ...defaultLineItem }])} className="gap-1">
                    <Plus className="w-3 h-3" /> Add Item
                  </Button>
                </div>
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5 space-y-1">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Plant</Label>}
                      <Select value={item.plantName} onValueChange={(v) => handleLineItemChange(idx, 'plantName', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select plant" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.map((inv) => (
                            <SelectItem key={inv.plantName} value={inv.plantName}>{inv.plantName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                      <Input type="number" min="1" placeholder="0" value={item.quantity} onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)} />
                    </div>
                    <div className="col-span-3 space-y-1">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Price (₹)</Label>}
                      <Input type="number" min="0" placeholder="0" value={item.unitPrice} onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Button variant="ghost" size="icon" onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} disabled={lineItems.length === 1} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Discount (₹)</Label>
                  <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tax (₹)</Label>
                  <Input type="number" min="0" value={tax} onChange={(e) => setTax(e.target.value)} />
                </div>
              </div>

              <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-accent">- {formatCurrency(parseFloat(discount) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>+ {formatCurrency(parseFloat(tax) || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Grand Total</span>
                  <span className="text-primary text-lg">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <Button className="w-full" onClick={handleSubmit} disabled={createInvoice.isPending || !customerName || lineItems.every((i) => !i.plantName)}>
                {createInvoice.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Invoice'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm">Filter by status:</Label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as PaymentStatus | 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value={PaymentStatus.paid}>Paid</SelectItem>
                <SelectItem value={PaymentStatus.unpaid}>Unpaid</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-4 text-sm">
              <span className="text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{filteredInvoices.length}</span>
              </span>
              <span className="text-muted-foreground">
                Unpaid: <span className="font-semibold text-accent">
                  {invoices.filter((i) => i.paymentStatus === PaymentStatus.unpaid).length}
                </span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Invoices
            <Badge variant="secondary" className="ml-1">{filteredInvoices.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />)}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filteredInvoices].reverse().map((inv) => (
                    <TableRow key={Number(inv.invoiceNumber)} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-medium text-sm">
                        #{String(inv.invoiceNumber).padStart(4, '0')}
                      </TableCell>
                      <TableCell className="text-sm">{inv.date}</TableCell>
                      <TableCell className="font-medium text-sm">{inv.customerName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.customerPhone}</TableCell>
                      <TableCell className="text-sm">{inv.lineItems.length} item{inv.lineItems.length !== 1 ? 's' : ''}</TableCell>
                      <TableCell>
                        <Badge
                          variant={inv.paymentStatus === PaymentStatus.paid ? 'default' : 'outline'}
                          className={inv.paymentStatus === PaymentStatus.paid
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'border-accent/30 text-accent'
                          }
                        >
                          {inv.paymentStatus as string}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(inv.grandTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
                            <Link to="/invoice/$invoiceNumber" params={{ invoiceNumber: String(inv.invoiceNumber) }}>
                              <Eye className="w-3 h-3" />
                              View
                            </Link>
                          </Button>
                          {inv.paymentStatus === PaymentStatus.unpaid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs text-primary hover:text-primary"
                              onClick={() => handleMarkPaid(inv.invoiceNumber)}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Mark Paid
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
        </CardContent>
      </Card>
    </div>
  );
}
