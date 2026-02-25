import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Leaf } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  useGetAllSalesRecords,
  useGetAllExpenditures,
  useGetInventory,
  filterByDateRange,
  formatCurrency,
} from '../hooks/useQueries';

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  positive,
  loading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  positive?: boolean;
  loading?: boolean;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-28 mt-1" />
            ) : (
              <p className={`text-2xl font-bold ${positive === undefined ? 'text-foreground' : positive ? 'text-primary' : 'text-accent'}`}>
                {value}
              </p>
            )}
            {subtitle && !loading && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${positive === undefined ? 'bg-muted text-muted-foreground' : positive ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfitAnalysis() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.substring(0, 8) + '01';

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);

  const { data: salesRecords = [], isLoading: salesLoading } = useGetAllSalesRecords();
  const { data: expenditures = [], isLoading: expLoading } = useGetAllExpenditures();
  const { data: inventory = [], isLoading: invLoading } = useGetInventory();

  const isLoading = salesLoading || expLoading || invLoading;

  const analysis = useMemo(() => {
    const filteredSales = filterByDateRange(salesRecords, startDate, endDate);
    const filteredExp = filterByDateRange(expenditures, startDate, endDate);

    const totalRevenue = filteredSales.reduce((sum, r) => sum + Number(r.totalAmount), 0);
    const totalExpenditure = filteredExp.reduce((sum, e) => sum + Number(e.amount), 0);

    const inventoryMap = new Map(inventory.map((i) => [i.plantName, i]));
    let totalCOGS = 0;
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const inv = inventoryMap.get(item.plantName);
        if (inv) {
          totalCOGS += Number(inv.costPrice) * Number(item.quantity);
        }
      });
    });

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenditure;

    return { totalRevenue, totalCOGS, grossProfit, totalExpenditure, netProfit };
  }, [salesRecords, expenditures, inventory, startDate, endDate]);

  // Build daily chart data
  const chartData = useMemo(() => {
    const filteredSales = filterByDateRange(salesRecords, startDate, endDate);
    const filteredExp = filterByDateRange(expenditures, startDate, endDate);

    const dateMap = new Map<string, { date: string; revenue: number; expenditure: number }>();

    filteredSales.forEach((r) => {
      const existing = dateMap.get(r.date) || { date: r.date, revenue: 0, expenditure: 0 };
      existing.revenue += Number(r.totalAmount);
      dateMap.set(r.date, existing);
    });

    filteredExp.forEach((e) => {
      const existing = dateMap.get(e.date) || { date: e.date, revenue: 0, expenditure: 0 };
      existing.expenditure += Number(e.amount);
      dateMap.set(e.date, existing);
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [salesRecords, expenditures, startDate, endDate]);

  const grossMarginPct = analysis.totalRevenue > 0
    ? ((analysis.grossProfit / analysis.totalRevenue) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Profit Analysis</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Financial performance overview</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate(firstOfMonth);
                  setEndDate(today);
                }}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const year = today.substring(0, 4);
                  setStartDate(`${year}-01-01`);
                  setEndDate(today);
                }}
              >
                This Year
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(analysis.totalRevenue)}
          subtitle="From all sales"
          icon={DollarSign}
          positive={true}
          loading={isLoading}
        />
        <MetricCard
          title="Total COGS"
          value={formatCurrency(analysis.totalCOGS)}
          subtitle="Cost of goods sold"
          icon={TrendingDown}
          positive={false}
          loading={isLoading}
        />
        <MetricCard
          title="Gross Profit"
          value={formatCurrency(Math.max(0, analysis.grossProfit))}
          subtitle={`${grossMarginPct}% margin`}
          icon={TrendingUp}
          positive={analysis.grossProfit >= 0}
          loading={isLoading}
        />
        <MetricCard
          title="Total Expenditure"
          value={formatCurrency(analysis.totalExpenditure)}
          subtitle="Operating expenses"
          icon={TrendingDown}
          positive={false}
          loading={isLoading}
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(Math.abs(analysis.netProfit))}
          subtitle={analysis.netProfit < 0 ? '⚠ Net Loss' : 'After all expenses'}
          icon={Leaf}
          positive={analysis.netProfit >= 0}
          loading={isLoading}
        />
      </div>

      {/* Bar Chart */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Revenue vs Expenditure
          </CardTitle>
          <CardDescription>Daily breakdown for selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No data for selected period</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.02 140)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.substring(5)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid oklch(0.88 0.02 140)',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="oklch(0.52 0.14 155)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenditure" name="Expenditure" fill="oklch(0.65 0.14 42)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
