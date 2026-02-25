import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Package,
  ArrowRight,
  Leaf,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAllSalesRecords, useGetInventory, useGetAllExpenditures, getTodayString, formatCurrency } from '../hooks/useQueries';

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  color: 'green' | 'terracotta' | 'blue' | 'amber';
  loading?: boolean;
}) {
  const colorMap = {
    green: 'bg-primary/10 text-primary',
    terracotta: 'bg-accent/10 text-accent',
    blue: 'bg-chart-4/10 text-chart-4',
    amber: 'bg-chart-3/10 text-chart-3',
  };

  return (
    <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-28 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{value}</p>
            )}
            {trend && !loading && (
              <p className="text-xs text-muted-foreground mt-1">{trend}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const today = getTodayString();
  const { data: salesRecords = [], isLoading: salesLoading } = useGetAllSalesRecords();
  const { data: inventory = [], isLoading: inventoryLoading } = useGetInventory();
  const { data: expenditures = [], isLoading: expendituresLoading } = useGetAllExpenditures();

  const todayStats = useMemo(() => {
    const todaySales = salesRecords.filter((r) => r.date === today);
    const totalSales = todaySales.reduce((sum, r) => sum + Number(r.totalAmount), 0);
    const transactionCount = todaySales.length;

    const todayExpenditures = expenditures.filter((e) => e.date === today);
    const totalExpenditure = todayExpenditures.reduce((sum, e) => sum + Number(e.amount), 0);

    // Compute COGS from today's sales
    const inventoryMap = new Map(inventory.map((i) => [i.plantName, i]));
    let totalCOGS = 0;
    todaySales.forEach((sale) => {
      sale.items.forEach((item) => {
        const inv = inventoryMap.get(item.plantName);
        if (inv) {
          totalCOGS += Number(inv.costPrice) * Number(item.quantity);
        }
      });
    });

    const grossProfit = totalSales - totalCOGS;
    const netProfit = grossProfit - totalExpenditure;

    return { totalSales, transactionCount, totalExpenditure, netProfit, todaySales };
  }, [salesRecords, expenditures, inventory, today]);

  const lowStockItems = useMemo(
    () => inventory.filter((item) => Number(item.stockQuantity) < 10),
    [inventory]
  );

  const recentTransactions = useMemo(
    () => [...salesRecords].reverse().slice(0, 5),
    [salesRecords]
  );

  const isLoading = salesLoading || inventoryLoading || expendituresLoading;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div
        className="relative rounded-2xl overflow-hidden h-40 flex items-end p-6"
        style={{
          backgroundImage: `url('/assets/generated/nursery-hero-bg.dim_1440x320.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-forest/80 to-forest/30" />
        <div className="relative z-10">
          <h1 className="font-display text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}! 🌿
          </h1>
          <p className="text-white/80 text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Leaf className="w-4 h-4 text-primary" />
          Today's Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Sales"
            value={formatCurrency(todayStats.totalSales)}
            icon={ShoppingCart}
            trend={`${todayStats.transactionCount} transaction${todayStats.transactionCount !== 1 ? 's' : ''}`}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title="Transactions"
            value={String(todayStats.transactionCount)}
            icon={DollarSign}
            trend="Sales recorded today"
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title="Expenditure"
            value={formatCurrency(todayStats.totalExpenditure)}
            icon={TrendingDown}
            trend="Today's expenses"
            color="terracotta"
            loading={isLoading}
          />
          <StatCard
            title="Net Profit"
            value={formatCurrency(Math.max(0, todayStats.netProfit))}
            icon={TrendingUp}
            trend={todayStats.netProfit < 0 ? '⚠ Loss today' : 'After all expenses'}
            color="amber"
            loading={isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sales">
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
            <CardDescription>Latest sales records</CardDescription>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No transactions yet</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link to="/sales">Record a Sale</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((record, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {record.items.map((i) => i.plantName).join(', ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.date} · {record.items.reduce((s, i) => s + Number(i.quantity), 0)} items
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(record.totalAmount)}
                      </p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {record.paymentMethod as string}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent" />
                Low Stock Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/inventory">
                  Manage <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
            <CardDescription>Plants with stock below 10 units</CardDescription>
          </CardHeader>
          <CardContent>
            {inventoryLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">All plants are well stocked!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.plantName}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/20"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.plantName}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <Badge
                      variant={Number(item.stockQuantity) === 0 ? 'destructive' : 'outline'}
                      className={Number(item.stockQuantity) === 0 ? '' : 'border-accent text-accent'}
                    >
                      {Number(item.stockQuantity) === 0 ? 'Out of stock' : `${Number(item.stockQuantity)} ${item.unit}`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
