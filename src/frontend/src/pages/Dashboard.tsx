import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart2,
  DollarSign,
  Leaf,
  Maximize2,
  Minimize2,
  Package,
  Settings2,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatCurrency,
  getTodayString,
  useGetAllExpenditures,
  useGetAllSalesRecords,
  useGetInventory,
} from "../hooks/useQueries";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "12m";

interface ChartDataPoint {
  label: string;
  sales: number;
  netProfit: number;
  netProfitDisplay: number; // clamped at 0 for chart rendering
}

// ─── Helper: compute chart data ────────────────────────────────────────────────

function usePeriodChartData(period: Period) {
  const { data: salesRecords = [] } = useGetAllSalesRecords();
  const { data: inventory = [] } = useGetInventory();
  const { data: expenditures = [] } = useGetAllExpenditures();

  return useMemo<ChartDataPoint[]>(() => {
    const inventoryMap = new Map(inventory.map((i) => [i.plantName, i]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === "7d" || period === "30d") {
      const days = period === "7d" ? 7 : 30;
      return Array.from({ length: days }, (_, idx) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (days - 1 - idx));
        const dateStr = d.toISOString().split("T")[0];
        const label =
          period === "7d"
            ? d.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
              })
            : d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

        const daySales = salesRecords.filter((r) => r.date === dateStr);
        const salesAmount = daySales.reduce(
          (s, r) => s + Number(r.totalAmount),
          0,
        );

        let cogs = 0;
        for (const sale of daySales) {
          for (const item of sale.items) {
            const inv = inventoryMap.get(item.plantName);
            cogs += Number(item.quantity) * (inv ? Number(inv.costPrice) : 0);
          }
        }

        const expenditure = expenditures
          .filter((e) => e.date === dateStr)
          .reduce((s, e) => s + Number(e.amount), 0);

        const netProfit = salesAmount - cogs - expenditure;

        return {
          label,
          sales: salesAmount,
          netProfit,
          netProfitDisplay: Math.max(0, netProfit),
        };
      });
    }

    // 12 months
    return Array.from({ length: 12 }, (_, idx) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (11 - idx), 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("en-IN", { month: "short" });

      const monthSales = salesRecords.filter((r) => {
        const rd = new Date(r.date);
        return rd.getFullYear() === year && rd.getMonth() === month;
      });
      const salesAmount = monthSales.reduce(
        (s, r) => s + Number(r.totalAmount),
        0,
      );

      let cogs = 0;
      for (const sale of monthSales) {
        for (const item of sale.items) {
          const inv = inventoryMap.get(item.plantName);
          cogs += Number(item.quantity) * (inv ? Number(inv.costPrice) : 0);
        }
      }

      const expenditure = expenditures
        .filter((e) => {
          const ed = new Date(e.date);
          return ed.getFullYear() === year && ed.getMonth() === month;
        })
        .reduce((s, e) => s + Number(e.amount), 0);

      const netProfit = salesAmount - cogs - expenditure;

      return {
        label,
        sales: salesAmount,
        netProfit,
        netProfitDisplay: Math.max(0, netProfit),
      };
    });
  }, [period, salesRecords, inventory, expenditures]);
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
  dataKey: string;
  payload: ChartDataPoint;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm min-w-36">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Sales</span>
          <span className="font-medium text-primary">
            {formatCurrency(point.sales)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Net Profit</span>
          <span
            className={`font-medium ${point.netProfit < 0 ? "text-destructive" : "text-chart-2"}`}
          >
            {point.netProfit < 0
              ? `−${formatCurrency(Math.abs(point.netProfit))}`
              : formatCurrency(point.netProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Chart Section ─────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "12 Months", value: "12m" },
];

function DashboardCharts({ isLoading }: { isLoading: boolean }) {
  const [period, setPeriod] = useState<Period>("7d");
  const data = usePeriodChartData(period);

  const totals = useMemo(
    () => ({
      sales: data.reduce((s, d) => s + d.sales, 0),
      netProfit: data.reduce((s, d) => s + d.netProfit, 0),
    }),
    [data],
  );

  const formatYAxis = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
    return `₹${value}`;
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-5">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          Performance Overview
        </h2>
        {/* Period Toggle */}
        <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                period === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Sales
              </CardTitle>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totals.sales)}
              </span>
            </div>
            <CardDescription className="text-xs">
              Total revenue for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={data}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Net Profit Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Net Profit
              </CardTitle>
              <span
                className={`text-lg font-bold ${totals.netProfit < 0 ? "text-destructive" : "text-chart-2"}`}
              >
                {totals.netProfit < 0
                  ? `−${formatCurrency(Math.abs(totals.netProfit))}`
                  : formatCurrency(totals.netProfit)}
              </span>
            </div>
            <CardDescription className="text-xs">
              After cost of goods &amp; expenditure — hover bars to see actual
              values
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={data}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="profitGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="netProfitDisplay"
                  name="Net Profit"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  fill="url(#profitGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--chart-2))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

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
  color: "green" | "terracotta" | "blue" | "amber";
  loading?: boolean;
}) {
  const colorMap = {
    green: "bg-primary/10 text-primary",
    terracotta: "bg-accent/10 text-accent",
    blue: "bg-chart-4/10 text-chart-4",
    amber: "bg-chart-3/10 text-chart-3",
  };

  return (
    <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium mb-1">
              {title}
            </p>
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

// ─── Card Customize Types ──────────────────────────────────────────────────────

type CardSize = "normal" | "wide";
interface CardPref {
  id: string;
  size: CardSize;
}

const DEFAULT_CARD_PREFS: CardPref[] = [
  { id: "sales", size: "normal" },
  { id: "transactions", size: "normal" },
  { id: "expenditure", size: "normal" },
  { id: "netProfit", size: "normal" },
];

function loadCardPrefs(): CardPref[] {
  try {
    const raw = localStorage.getItem("dashboard_card_prefs");
    if (!raw) return DEFAULT_CARD_PREFS;
    const parsed = JSON.parse(raw) as CardPref[];
    // Validate that all default IDs are present
    const ids = parsed.map((p) => p.id);
    const allPresent = DEFAULT_CARD_PREFS.every((d) => ids.includes(d.id));
    return allPresent ? parsed : DEFAULT_CARD_PREFS;
  } catch {
    return DEFAULT_CARD_PREFS;
  }
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────

export function Dashboard() {
  const today = getTodayString();
  const { data: salesRecords = [], isLoading: salesLoading } =
    useGetAllSalesRecords();
  const { data: inventory = [], isLoading: inventoryLoading } =
    useGetInventory();
  const { data: expenditures = [], isLoading: expendituresLoading } =
    useGetAllExpenditures();

  // Card customization state
  const [cardPrefs, setCardPrefs] = useState<CardPref[]>(loadCardPrefs);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const todayStats = useMemo(() => {
    const todaySales = salesRecords.filter((r) => r.date === today);
    const totalSales = todaySales.reduce(
      (sum, r) => sum + Number(r.totalAmount),
      0,
    );
    const transactionCount = todaySales.length;

    const todayExpenditures = expenditures.filter((e) => e.date === today);
    const totalExpenditure = todayExpenditures.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );

    // Compute COGS from today's sales
    const inventoryMap = new Map(inventory.map((i) => [i.plantName, i]));
    let totalCOGS = 0;
    for (const sale of todaySales) {
      for (const item of sale.items) {
        const inv = inventoryMap.get(item.plantName);
        if (inv) {
          totalCOGS += Number(inv.costPrice) * Number(item.quantity);
        }
      }
    }

    const grossProfit = totalSales - totalCOGS;
    const netProfit = grossProfit - totalExpenditure;

    return {
      totalSales,
      transactionCount,
      totalExpenditure,
      netProfit,
      todaySales,
    };
  }, [salesRecords, expenditures, inventory, today]);

  const lowStockItems = useMemo(
    () => inventory.filter((item) => Number(item.currentStock) < 10),
    [inventory],
  );

  const recentTransactions = useMemo(
    () =>
      [...salesRecords]
        .sort((a, b) => {
          const dateDiff = b.date.localeCompare(a.date);
          if (dateDiff !== 0) return dateDiff;
          return b.billingNumber.localeCompare(a.billingNumber);
        })
        .slice(0, 5),
    [salesRecords],
  );

  const isLoading = salesLoading || inventoryLoading || expendituresLoading;

  // Card definitions map
  const CARD_DEFINITIONS: Record<
    string,
    {
      title: string;
      icon: React.ElementType;
      color: "green" | "terracotta" | "blue" | "amber";
      getValue: (stats: typeof todayStats) => string;
      getTrend: (stats: typeof todayStats) => string;
    }
  > = {
    sales: {
      title: "Today's Sales",
      icon: ShoppingCart,
      color: "green",
      getValue: (s) => formatCurrency(s.totalSales),
      getTrend: (s) =>
        `${s.transactionCount} transaction${s.transactionCount !== 1 ? "s" : ""}`,
    },
    transactions: {
      title: "Transactions",
      icon: DollarSign,
      color: "blue",
      getValue: (s) => String(s.transactionCount),
      getTrend: () => "Sales recorded today",
    },
    expenditure: {
      title: "Expenditure",
      icon: TrendingDown,
      color: "terracotta",
      getValue: (s) => formatCurrency(s.totalExpenditure),
      getTrend: () => "Today's expenses",
    },
    netProfit: {
      title: "Net Profit",
      icon: TrendingUp,
      color: "amber",
      getValue: (s) => formatCurrency(Math.max(0, s.netProfit)),
      getTrend: (s) =>
        s.netProfit < 0 ? "⚠ Loss today" : "After all expenses",
    },
  };

  const updateCardPrefs = (updated: CardPref[]) => {
    setCardPrefs(updated);
    localStorage.setItem("dashboard_card_prefs", JSON.stringify(updated));
  };

  const moveCard = (index: number, direction: "up" | "down") => {
    const newPrefs = [...cardPrefs];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newPrefs.length) return;
    [newPrefs[index], newPrefs[swapIdx]] = [newPrefs[swapIdx], newPrefs[index]];
    updateCardPrefs(newPrefs);
  };

  const toggleSize = (index: number) => {
    const newPrefs = cardPrefs.map((p, i) =>
      i === index
        ? { ...p, size: (p.size === "normal" ? "wide" : "normal") as CardSize }
        : p,
    );
    updateCardPrefs(newPrefs);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div
        className="relative rounded-2xl overflow-hidden h-40 flex items-end p-6"
        style={{
          backgroundImage: `url('/assets/generated/nursery-hero-bg.dim_1440x320.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-forest/80 to-forest/30" />
        <div className="relative z-10">
          <h1 className="font-display text-2xl font-bold text-white">
            Good{" "}
            {new Date().getHours() < 12
              ? "Morning"
              : new Date().getHours() < 17
                ? "Afternoon"
                : "Evening"}
            ! 🌿
          </h1>
          <p className="text-white/80 text-sm mt-1">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            Today's Summary
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCustomizeOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Customize
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cardPrefs.map((pref) => {
            const def = CARD_DEFINITIONS[pref.id];
            if (!def) return null;
            return (
              <div
                key={pref.id}
                className={pref.size === "wide" ? "sm:col-span-2" : ""}
              >
                <StatCard
                  title={def.title}
                  value={def.getValue(todayStats)}
                  icon={def.icon}
                  trend={def.getTrend(todayStats)}
                  color={def.color}
                  loading={isLoading}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Customize Sheet */}
      <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Customize Dashboard
            </SheetTitle>
            <SheetDescription>
              Reorder and resize the summary cards to your preference.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-2">
            {cardPrefs.map((pref, index) => {
              const def = CARD_DEFINITIONS[pref.id];
              if (!def) return null;
              const Icon = def.icon;
              return (
                <div
                  key={pref.id}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                >
                  {/* Icon + Title */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {def.title}
                    </span>
                  </div>

                  {/* Size Badge */}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      pref.size === "wide"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {pref.size === "wide" ? "Wide" : "Normal"}
                  </span>

                  {/* Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveCard(index, "up")}
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === cardPrefs.length - 1}
                      onClick={() => moveCard(index, "down")}
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleSize(index)}
                      title={
                        pref.size === "wide"
                          ? "Set normal size"
                          : "Set wide size"
                      }
                    >
                      {pref.size === "wide" ? (
                        <Minimize2 className="w-3.5 h-3.5" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => updateCardPrefs(DEFAULT_CARD_PREFS)}
            >
              Reset to Default
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Charts Section */}
      <DashboardCharts isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Recent Transactions
              </CardTitle>
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
                {recentTransactions.map((record) => (
                  <div
                    key={record.billingNumber}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {record.items.map((i) => i.plantName).join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.date} ·{" "}
                        {record.items.reduce(
                          (s, i) => s + Number(i.quantity),
                          0,
                        )}{" "}
                        items
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
                      <p className="text-xs text-muted-foreground">
                        {item.category}
                      </p>
                    </div>
                    <Badge
                      variant={
                        Number(item.currentStock) === 0
                          ? "destructive"
                          : "outline"
                      }
                      className={
                        Number(item.currentStock) === 0
                          ? ""
                          : "border-accent text-accent"
                      }
                    >
                      {Number(item.currentStock) === 0
                        ? "Out of stock"
                        : `${Number(item.currentStock)} ${item.unit}`}
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
