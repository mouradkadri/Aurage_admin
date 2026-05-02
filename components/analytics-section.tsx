'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Receipt,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAnalytics, type DateRangeParams } from '@/hooks/useAnalytics';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendIndicator {
  value: number;
  isPositive: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-zinc-800 rounded ${className}`} />
);

// ─── TrendBadge ───────────────────────────────────────────────────────────────

const TrendBadge: React.FC<TrendIndicator> = ({ value, isPositive }) => (
  <div
    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
      isPositive
        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
        : 'bg-red-500/10 text-red-500 dark:text-red-400'
    }`}
  >
    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
    <span>{Math.abs(value)}%</span>
  </div>
);

// ─── MetricCard ───────────────────────────────────────────────────────────────

const MetricCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: TrendIndicator | null;
  iconColor: string;
  loading?: boolean;
}> = ({ icon: Icon, label, value, trend, iconColor, loading }) => (
  <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:shadow-sm transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 truncate">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-24 mt-2" />
          ) : (
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 leading-none break-all">
              {value}
            </p>
          )}
          {!loading && trend && (
            <div className="mt-2">
              <TrendBadge {...trend} />
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${iconColor} flex-shrink-0 mt-0.5`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── ChartSkeleton ────────────────────────────────────────────────────────────

const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <div style={{ width: '100%', height }} className="flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
  </div>
);

// ─── FilterBar ────────────────────────────────────────────────────────────────

// Added "Last Quarter" (90d) and "Last Year" (365d) — Custom picker kept intact
const PRESETS = [
  { label: '7d',  fullLabel: 'Last 7 days',  days: 7   },
  { label: '30d', fullLabel: 'Last 30 days', days: 30  },
  { label: '90d', fullLabel: 'Last Quarter', days: 90  },
  { label: '1y',  fullLabel: 'Last Year',    days: 365 },
];

const FilterBar: React.FC<{
  onDateChange: (params: DateRangeParams) => void;
}> = ({ onDateChange }) => {
  const [open, setOpen]             = useState(false);
  const [dateOpen, setDateOpen]     = useState(false);
  const [activePreset, setPreset]   = useState(30);
  const [selectedDates, setDates]   = useState<{ from?: Date; to?: Date }>({});

  const applyPreset = (days: number) => {
    setPreset(days);
    const end   = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    onDateChange({ startDate: toISODate(start), endDate: toISODate(end) });
    setDateOpen(false);
  };

  const applyCustom = () => {
    if (selectedDates.from && selectedDates.to) {
      setPreset(0);
      onDateChange({
        startDate: toISODate(selectedDates.from),
        endDate:   toISODate(selectedDates.to),
      });
      setDateOpen(false);
    }
  };

  const activeLabel =
    activePreset
      ? PRESETS.find(p => p.days === activePreset)?.fullLabel ?? 'Custom Range'
      : selectedDates.from && selectedDates.to
        ? `${toISODate(selectedDates.from)} → ${toISODate(selectedDates.to)}`
        : 'Pick dates';

  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      {/* ── Mobile header (tap to expand) ── */}
      <button
        className="flex items-center justify-between w-full p-4 sm:hidden"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-zinc-300">
          <SlidersHorizontal className="w-4 h-4 text-amber-500" />
          <span>Filters</span>
          <span className="text-xs text-gray-400 dark:text-zinc-500 font-normal">— {activeLabel}</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
          : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
        }
      </button>

      {/* ── Filter body (always visible on ≥sm, collapsible on mobile) ── */}
      <div className={`${open ? 'block' : 'hidden'} sm:block border-t border-gray-100 dark:border-zinc-800 sm:border-none`}>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* ── Quick preset pills + Custom picker ── */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400 block mb-2">
                Date Range
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.days}
                    onClick={() => applyPreset(p.days)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activePreset === p.days
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {p.label}
                    <span className="hidden sm:inline"> — {p.fullLabel}</span>
                  </button>
                ))}

                {/* Custom date picker */}
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activePreset === 0
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      Custom
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-3 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                    align="start"
                    side="bottom"
                  >
                    <Calendar
                      mode="range"
                      selected={{ from: selectedDates.from, to: selectedDates.to }}
                      onSelect={(range) => setDates({ from: range?.from, to: range?.to })}
                      className="rounded-md"
                    />
                    {selectedDates.from && selectedDates.to && (
                      <Button
                        onClick={applyCustom}
                        className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white text-xs h-8"
                      >
                        Apply Range
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Compare To */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400 block mb-2">
                Compare To
              </label>
              <Select defaultValue="previous">
                <SelectTrigger className="h-9 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                  <SelectItem value="previous">Previous Period</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </div>
    </Card>
  );
};

// ─── Chart theme hook ─────────────────────────────────────────────────────────

const useChartTheme = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return {
    gridColor:     isDark ? '#27272a' : '#f1f5f9',
    axisColor:     isDark ? '#71717a' : '#94a3b8',
    tooltipBg:     isDark ? '#18181b' : '#ffffff',
    tooltipBorder: isDark ? '#3f3f46' : '#e2e8f0',
    textColor:     isDark ? '#f4f4f5' : '#0f172a',
  };
};

// ─── Sales Over Time ──────────────────────────────────────────────────────────

const SalesOverTimeChart: React.FC<{
  data: { date: string; grossSales: number; netSales: number }[];
  loading: boolean;
}> = ({ data, loading }) => {
  const t = useChartTheme();
  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
        <CardTitle className="text-gray-900 dark:text-white text-sm sm:text-base font-semibold">
          Sales Over Time
        </CardTitle>
        <CardDescription className="text-gray-500 dark:text-zinc-400 text-xs">
          Gross vs. Net sales
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-2">
        <div style={{ width: '100%', height: 260 }}>
          {loading ? <ChartSkeleton height={260} /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridColor} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={t.axisColor}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke={t.axisColor}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: t.tooltipBg,
                    border: `1px solid ${t.tooltipBorder}`,
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: t.textColor, fontWeight: 600 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Area
                  type="monotone"
                  dataKey="grossSales"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGross)"
                  name="Gross Sales"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="netSales"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNet)"
                  name="Net Sales"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
      
    </Card>
    
  );
};

// ─── Revenue by Product ───────────────────────────────────────────────────────

const RevenueByProductChart: React.FC<{
  data: { name: string; value: number }[];
  loading: boolean;
}> = ({ data, loading }) => {
  const t = useChartTheme();
  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardHeader className="p-4 sm:p-5 pb-2">
        <CardTitle className="text-gray-900 dark:text-white text-sm font-semibold">
          Revenue by Product
        </CardTitle>
        <CardDescription className="text-gray-500 dark:text-zinc-400 text-xs">
          Top performing scents
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-2">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div style={{ minWidth: 260, height: 220 }}>
            {loading ? <ChartSkeleton height={220} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.gridColor} horizontal vertical={false} />
                  <XAxis dataKey="name" stroke={t.axisColor} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis stroke={t.axisColor} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    contentStyle={{ backgroundColor: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: t.textColor, fontWeight: 600 }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Revenue (TND)" maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Sales by Pack Type ───────────────────────────────────────────────────────

const SalesByPackTypeChart: React.FC<{
  data: { name: string; value: number }[];
  loading: boolean;
}> = ({ data, loading }) => {
  const t = useChartTheme();
  const COLORS = ['#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f87171'];
  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardHeader className="p-4 sm:p-5 pb-2">
        <CardTitle className="text-gray-900 dark:text-white text-sm font-semibold">
          Sales by Type
        </CardTitle>
        <CardDescription className="text-gray-500 dark:text-zinc-400 text-xs">
          Packs vs. Single products
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center p-4 sm:p-5 pt-2">
        <div style={{ width: '100%', height: 220 }}>
          {loading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="45%"
                  innerRadius={44}
                  outerRadius={76}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Customer Retention ───────────────────────────────────────────────────────

const CustomerRetentionChart: React.FC<{
  data: { period: string; firstTime: number; returning: number }[];
  loading: boolean;
}> = ({ data, loading }) => {
  const t = useChartTheme();
  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardHeader className="p-4 sm:p-5 pb-2">
        <CardTitle className="text-gray-900 dark:text-white text-sm font-semibold">
          Customer Retention
        </CardTitle>
        <CardDescription className="text-gray-500 dark:text-zinc-400 text-xs">
          First-time vs. Returning
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-2">
        <div style={{ width: '100%', height: 220 }}>
          {loading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridColor} vertical={false} />
                <XAxis dataKey="period" stroke={t.axisColor} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis
  stroke={t.axisColor}
  tick={{ fontSize: 10 }}
  tickLine={false}
  axisLine={false}
  width={48}
  tickFormatter={(value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value;
  }}
/>
                <Tooltip
                  contentStyle={{ backgroundColor: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: t.textColor, fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" iconSize={8} />
                <Bar dataKey="firstTime" stackId="a" fill="#f59e0b" name="First-Time" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="returning" stackId="a" fill="#8b5cf6" name="Returning"  radius={[0, 0, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── DataTable ────────────────────────────────────────────────────────────────

interface TableRow     { id: string; name: string; sales: number; revenue: number; }
interface CancelledRow { id: string; name: string; totalSold: number; returnCount: number; returnRate: number; }

const DataTable: React.FC<{
  title: string;
  description: string;
  data: TableRow[] | CancelledRow[];
  columns: string[];
  loading: boolean;
  isReturnData?: boolean;
  accent?: string;
}> = ({ title, description, data, columns, loading, isReturnData = false, accent = 'bg-amber-500/10' }) => (
  <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
    <CardHeader className="p-4 sm:p-5 pb-3">
      <CardTitle className="text-gray-900 dark:text-white text-sm font-semibold">{title}</CardTitle>
      <CardDescription className="text-gray-500 dark:text-zinc-400 text-xs">{description}</CardDescription>
    </CardHeader>
    <CardContent className="p-0 pb-1">
      {loading ? (
        <div className="space-y-1 px-4 pb-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : data.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-zinc-600 text-center py-6">No data for this period</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[260px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800">
                {columns.map((col, i) => (
                  <th
                    key={col}
                    className={`px-4 py-2 text-left font-semibold text-gray-500 dark:text-zinc-400 whitespace-nowrap ${
                      i === 0 ? 'sticky left-0 bg-white dark:bg-zinc-900 z-10' : ''
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, rowIndex) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-zinc-900 z-10">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${accent} text-amber-700 dark:text-amber-300`}
                      >
                        {rowIndex + 1}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-none">
                        {item.name}
                      </span>
                    </div>
                  </td>

                  {isReturnData ? (
                    <>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                        {(item as CancelledRow).totalSold}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                        {(item as CancelledRow).returnCount}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-semibold">
                          {(item as CancelledRow).returnRate}%
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                        {(item as TableRow).sales}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {formatCurrency((item as TableRow).revenue)} TND
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
);

// ─── AnalyticsSection (main export) ──────────────────────────────────────────

export const AnalyticsSection: React.FC = () => {
  const {
    summary, charts, tables,
    loadingSummary, loadingCharts, loadingTables,
    updateDateRange,
  } = useAnalytics();

  const makeTrend = (value: number | null | undefined): TrendIndicator | undefined => {
    if (value == null) return undefined;
    return { value: Math.abs(value), isPositive: value >= 0 };
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Filter Bar ── */}
      <FilterBar onDateChange={updateDateRange} />

      {/* ── KPI Cards — 2-col on mobile, 4-col on desktop ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          icon={DollarSign}
          label="Gross Sales"
          value={summary ? `${formatCurrency(summary.grossSales)} TND` : '—'}
          trend={makeTrend(summary?.trends.grossSales)}
          iconColor="bg-amber-500"
          loading={loadingSummary}
        />
        <MetricCard
          icon={Receipt}
          label="Net Sales"
          value={summary ? `${formatCurrency(summary.netSales)} TND` : '—'}
          trend={makeTrend(summary?.trends.netSales)}
          iconColor="bg-violet-500"
          loading={loadingSummary}
        />
        <MetricCard
          icon={ShoppingCart}
          label="Total Orders"
          value={summary?.totalOrders ?? '—'}
          trend={makeTrend(summary?.trends.totalOrders)}
          iconColor="bg-sky-500"
          loading={loadingSummary}
        />
        <MetricCard
          icon={Wallet}
          label="Avg. Order"
          value={summary ? `${formatCurrency(summary.aov)} TND` : '—'}
          trend={makeTrend(summary?.trends.aov)}
          iconColor="bg-emerald-500"
          loading={loadingSummary}
        />
      </div>

      {/* ── Sales Over Time (full-width) ── */}
      <SalesOverTimeChart
        data={charts?.salesOverTime ?? []}
        loading={loadingCharts}
      />

      {/* ── Charts Row — stack on mobile, 3-col on md+ ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <RevenueByProductChart
          data={charts?.revenueByProduct ?? []}
          loading={loadingCharts}
        />
        <SalesByPackTypeChart
          data={charts?.salesByPackType ?? []}
          loading={loadingCharts}
        />
        <CustomerRetentionChart
          data={charts?.customerRetention ?? []}
          loading={loadingCharts}
        />
      </div>

      {/* ── Tables Row — stack on mobile, 3-col on md+ ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <DataTable
          title="Top 5 Best Sellers"
          description="Highest revenue products"
          data={tables?.bestSellers ?? []}
          columns={['Product', 'Units', 'Revenue']}
          loading={loadingTables}
          accent="bg-amber-500/10"
        />
        <DataTable
          title="Worst Sellers"
          description="Action needed — low revenue"
          data={tables?.worstSellers ?? []}
          columns={['Product', 'Units', 'Revenue']}
          loading={loadingTables}
          accent="bg-red-500/10"
        />
        <DataTable
          title="Most Cancelled"
          description="High cancellation rate products"
          data={tables?.mostCancelled ?? []}
          columns={['Product', 'Sold', 'Cancelled', 'Rate']}
          loading={loadingTables}
          isReturnData
          accent="bg-orange-500/10"
        />
      </div>

    </div>
  );
};