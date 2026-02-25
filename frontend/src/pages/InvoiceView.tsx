import { useParams } from '@tanstack/react-router';
import { Printer, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGetInvoice, formatCurrency } from '../hooks/useQueries';
import { PaymentStatus } from '../backend';

export function InvoiceView() {
  const { invoiceNumber } = useParams({ from: '/invoice/$invoiceNumber' });
  const invoiceNum = invoiceNumber ? BigInt(invoiceNumber) : null;
  const { data: invoice, isLoading, error } = useGetInvoice(invoiceNum);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/billing">Back to Billing</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Actions - hidden on print */}
      <div className="flex items-center justify-between mb-6 no-print">
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link to="/billing">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Print Invoice
        </Button>
      </div>

      {/* Invoice Document */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-8 text-primary-foreground">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img
                  src="/assets/generated/nursery-logo.dim_256x256.png"
                  alt="Logo"
                  className="w-10 h-10 rounded-lg object-cover bg-white/20"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <h1 className="font-display text-xl font-bold">Green Roots Nursery</h1>
                  <p className="text-primary-foreground/70 text-sm">Plant Nursery & Garden Center</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-primary-foreground/70 text-sm uppercase tracking-wider">Invoice</p>
              <p className="font-mono text-2xl font-bold">
                #{String(invoice.invoiceNumber).padStart(4, '0')}
              </p>
              <p className="text-primary-foreground/70 text-sm mt-1">{invoice.date}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Customer & Status */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bill To</p>
              <p className="font-semibold text-lg text-foreground">{invoice.customerName}</p>
              {invoice.customerPhone && (
                <p className="text-muted-foreground text-sm">{invoice.customerPhone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <Badge
                className={invoice.paymentStatus === PaymentStatus.paid
                  ? 'bg-primary/10 text-primary border-primary/20 border gap-1'
                  : 'bg-accent/10 text-accent border-accent/20 border gap-1'
                }
              >
                {invoice.paymentStatus === PaymentStatus.paid
                  ? <><CheckCircle className="w-3 h-3" /> Paid</>
                  : <><Clock className="w-3 h-3" /> Unpaid</>
                }
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Plant / Item</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lineItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.plantName}</TableCell>
                    <TableCell className="text-center">{Number(item.quantity)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {Number(invoice.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-accent">- {formatCurrency(invoice.discount)}</span>
                </div>
              )}
              {Number(invoice.tax) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>+ {formatCurrency(invoice.tax)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Grand Total</span>
                <span className="text-primary">{formatCurrency(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
            <p>Thank you for your business! 🌿</p>
            <p className="mt-1">Green Roots Nursery · Plant Nursery Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
}
