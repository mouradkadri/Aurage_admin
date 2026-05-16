'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, BottleVariant } from '@/hooks/useProducts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockThresholds {
  liquidMl:   number; // alert when liquid_stock_quantity (ml) falls below this
  bottleUnits: number; // alert when global_stock_quantity (units) falls below this
}

export interface StockAlert {
  id:       string;
  name:     string;
  type:     'liquid' | 'bottle';
  current:  number;
  threshold: number;
  unit:     string;
}

const STORAGE_KEY = 'aurage:stock-thresholds';

const DEFAULT_THRESHOLDS: StockThresholds = {
  liquidMl:    500,  // <500ml liquid stock → alert
  bottleUnits: 10,   // <10 bottle units → alert
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStockAlerts(
  products: Product[],
  bottleVariants: BottleVariant[],
) {
  const [thresholds, setThresholds] = useState<StockThresholds>(DEFAULT_THRESHOLDS);
  const [hydrated, setHydrated]     = useState(false);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StockThresholds>;
        setThresholds(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore parse errors
    } finally {
      setHydrated(true);
    }
  }, []);

  const updateThresholds = useCallback((next: Partial<StockThresholds>) => {
    setThresholds(prev => {
      const updated = { ...prev, ...next };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const resetThresholds = useCallback(() => {
    setThresholds(DEFAULT_THRESHOLDS);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  // ── Compute alerts ─────────────────────────────────────────────────────────
  const alerts = useMemo<StockAlert[]>(() => {
    if (!hydrated) return [];
    const result: StockAlert[] = [];

    products.forEach(p => {
      if (p.liquid_stock_quantity < thresholds.liquidMl) {
        result.push({
          id:        p._id,
          name:      typeof p.name === 'object' ? (p.name.fr || p.name.en || '') : p.name,
          type:      'liquid',
          current:   p.liquid_stock_quantity,
          threshold: thresholds.liquidMl,
          unit:      'ml',
        });
      }
    });

    bottleVariants.forEach(b => {
      if (b.global_stock_quantity < thresholds.bottleUnits) {
        result.push({
          id:        b._id,
          name:      b.name,
          type:      'bottle',
          current:   b.global_stock_quantity,
          threshold: thresholds.bottleUnits,
          unit:      'units',
        });
      }
    });

    // Most critical first
    return result.sort((a, b) => a.current - b.current);
  }, [products, bottleVariants, thresholds, hydrated]);

  const criticalCount = alerts.filter(a => a.current === 0).length;
  const lowCount      = alerts.filter(a => a.current > 0).length;

  return {
    alerts,
    thresholds,
    criticalCount,
    lowCount,
    totalAlerts: alerts.length,
    updateThresholds,
    resetThresholds,
    hydrated,
  };
}