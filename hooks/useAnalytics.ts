'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalOrders: number;
  grossSales: number;
  netSales: number;
  aov: number;
  trends: {
    totalOrders: number | null;
    grossSales:  number | null;
    netSales:    number | null;
    aov:         number | null;
  };
}

export interface SalesOverTimePoint {
  date:       string;
  grossSales: number;
  netSales:   number;
}

export interface RevenueByProductPoint {
  name:      string;
  value:     number;
  unitsSold: number;
}

export interface SalesByBottleSizePoint {
  name:    string; // e.g. "50ml"
  value:   number; // units sold
  revenue: number;
}

export interface CustomerRetentionPoint {
  period:    string; // e.g. "2024-W12"
  firstTime: number;
  returning: number;
}

export interface AnalyticsCharts {
  salesOverTime:     SalesOverTimePoint[];
  revenueByProduct:  RevenueByProductPoint[];
  salesByPackType: { name: string; value: number }[];
  customerRetention: CustomerRetentionPoint[];
}

export interface TableRow {
  id:      string;
  name:    string;
  sales:   number;
  revenue: number;
}

export interface CancelledRow {
  id:          string;
  name:        string;
  totalSold:   number;
  returnCount: number;
  returnRate:  number;
}

export interface AnalyticsTables {
  bestSellers:   TableRow[];
  worstSellers:  TableRow[];
  mostCancelled: CancelledRow[];
}

export interface DateRangeParams {
  startDate?: string; // ISO string e.g. '2024-01-01'
  endDate?:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQuery(params: DateRangeParams): string {
  const q = new URLSearchParams();
  if (params.startDate) q.append('startDate', params.startDate);
  if (params.endDate)   q.append('endDate',   params.endDate);
  const str = q.toString();
  return str ? `?${str}` : '';
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Unknown error');
  return data.data as T;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalytics(initialParams: DateRangeParams = {}) {
  const [params, setParams] = useState<DateRangeParams>(initialParams);

  // ── State per endpoint ────────────────────────────────────────────────────
  const [summary, setSummary]           = useState<AnalyticsSummary | null>(null);
  const [charts,  setCharts]            = useState<AnalyticsCharts  | null>(null);
  const [tables,  setTables]            = useState<AnalyticsTables  | null>(null);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts,  setLoadingCharts]  = useState(true);
  const [loadingTables,  setLoadingTables]  = useState(true);

  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [errorCharts,  setErrorCharts]  = useState<string | null>(null);
  const [errorTables,  setErrorTables]  = useState<string | null>(null);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async (p: DateRangeParams) => {
    setLoadingSummary(true);
    setErrorSummary(null);
    try {
      const data = await apiFetch<AnalyticsSummary>(
        `/api/proxy/analytics/summary${buildQuery(p)}`
      );
      setSummary(data);
    } catch (err: any) {
      setErrorSummary(err.message);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchCharts = useCallback(async (p: DateRangeParams) => {
    setLoadingCharts(true);
    setErrorCharts(null);
    try {
      const data = await apiFetch<AnalyticsCharts>(
        `/api/proxy/analytics/charts${buildQuery(p)}`
      );
      setCharts(data);
    } catch (err: any) {
      setErrorCharts(err.message);
    } finally {
      setLoadingCharts(false);
    }
  }, []);

  const fetchTables = useCallback(async (p: DateRangeParams) => {
    setLoadingTables(true);
    setErrorTables(null);
    try {
      const data = await apiFetch<AnalyticsTables>(
        `/api/proxy/analytics/tables${buildQuery(p)}`
      );
      setTables(data);
    } catch (err: any) {
      setErrorTables(err.message);
    } finally {
      setLoadingTables(false);
    }
  }, []);

  // ── Fire all three in parallel on mount + when params change ─────────────
  const fetchAll = useCallback((p: DateRangeParams) => {
    fetchSummary(p);  // resolves fast (~50ms) — KPI cards appear first
    fetchCharts(p);   // heavier — charts fill in after
    fetchTables(p);   // heavier — tables fill in after
  }, [fetchSummary, fetchCharts, fetchTables]);

  useEffect(() => {
    fetchAll(params);
  }, [params, fetchAll]);

  // ── Public API ────────────────────────────────────────────────────────────

  /** Call this when the FilterBar date range changes */
  const updateDateRange = useCallback((newParams: DateRangeParams) => {
    setParams(newParams);
  }, []);

  /** Manually refresh everything */
  const refetch = useCallback(() => {
    fetchAll(params);
  }, [fetchAll, params]);

  return {
    // Data
    summary,
    charts,
    tables,

    // Per-section loading states (so KPIs can show while charts load)
    loadingSummary,
    loadingCharts,
    loadingTables,

    // Per-section errors
    errorSummary,
    errorCharts,
    errorTables,

    // Controls
    updateDateRange,
    refetch,
    params,
  };
}