'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Settings2, RotateCcw, X } from 'lucide-react';
import { StockAlert, StockThresholds } from '@/hooks/useStockAlerts';

interface StockAlertBannerProps {
  alerts:         StockAlert[];
  thresholds:     StockThresholds;
  criticalCount:  number;
  lowCount:       number;
  onUpdateThresholds: (next: Partial<StockThresholds>) => void;
  onResetThresholds:  () => void;
}

export const StockAlertBanner: React.FC<StockAlertBannerProps> = ({
  alerts,
  thresholds,
  criticalCount,
  lowCount,
  onUpdateThresholds,
  onResetThresholds,
}) => {
  const [expanded,      setExpanded]      = useState(false);
  const [showSettings,  setShowSettings]  = useState(false);
  const [dismissed,     setDismissed]     = useState(false);
  const [draftLiquid,   setDraftLiquid]   = useState(String(thresholds.liquidMl));
  const [draftBottle,   setDraftBottle]   = useState(String(thresholds.bottleUnits));

  if (dismissed || alerts.length === 0) return null;

  const hasCritical = criticalCount > 0;

  const handleSaveThresholds = () => {
    const liquid = parseInt(draftLiquid, 10);
    const bottle = parseInt(draftBottle, 10);
    if (!isNaN(liquid) && liquid >= 0) onUpdateThresholds({ liquidMl: liquid });
    if (!isNaN(bottle) && bottle >= 0) onUpdateThresholds({ bottleUnits: bottle });
    setShowSettings(false);
  };

  const handleReset = () => {
    onResetThresholds();
    setDraftLiquid('500');
    setDraftBottle('10');
  };

  return (
    <div className={`rounded-xl border ${
      hasCritical
        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
        : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
    }`}>
      {/* ── Header row ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          hasCritical
            ? 'bg-red-100 dark:bg-red-900/40'
            : 'bg-amber-100 dark:bg-amber-900/40'
        }`}>
          <AlertTriangle className={`w-4 h-4 ${
            hasCritical ? 'text-red-500' : 'text-amber-500'
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${
            hasCritical ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
          }`}>
            {hasCritical
              ? `${criticalCount} item${criticalCount > 1 ? 's' : ''} out of stock`
              : `${lowCount} item${lowCount > 1 ? 's' : ''} running low`
            }
            {criticalCount > 0 && lowCount > 0 && (
              <span className="font-normal text-amber-700 dark:text-amber-400 ml-1.5">
                · {lowCount} low
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
            Thresholds: liquid &lt;{thresholds.liquidMl}ml · bottles &lt;{thresholds.bottleUnits} units
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => { setShowSettings(s => !s); setExpanded(true); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-colors"
            title="Configure thresholds"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-colors"
            title={expanded ? 'Collapse' : 'See all'}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Threshold settings ── */}
      {showSettings && (
        <div className="px-4 pb-3 pt-0 border-t border-amber-200/60 dark:border-amber-900/30">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-widest mt-3 mb-2">
            Alert Thresholds
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-zinc-400 font-medium">
                Liquid stock (ml)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={draftLiquid}
                  onChange={e => setDraftLiquid(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                />
                <span className="text-xs text-gray-400 flex-shrink-0">ml</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-zinc-400 font-medium">
                Bottle units
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={draftBottle}
                  onChange={e => setDraftBottle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                />
                <span className="text-xs text-gray-400 flex-shrink-0">units</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveThresholds}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              Save thresholds
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300 rounded-lg hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset defaults
            </button>
          </div>
        </div>
      )}

      {/* ── Alert list ── */}
      {expanded && !showSettings && (
        <div className="border-t border-amber-200/60 dark:border-amber-900/30 divide-y divide-amber-100 dark:divide-amber-900/20">
          {alerts.map(alert => {
            const isCritical = alert.current === 0;
            const pct = Math.min(100, Math.round((alert.current / alert.threshold) * 100));
            return (
              <div key={`${alert.type}-${alert.id}`} className="flex items-center gap-3 px-4 py-2.5">
                {/* Severity dot */}
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isCritical ? 'bg-red-500' : 'bg-amber-500'
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-xs font-medium text-gray-800 dark:text-zinc-200 truncate">
                      {alert.name}
                    </span>
                    <span className={`text-xs font-semibold tabular-nums flex-shrink-0 ${
                      isCritical
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      {alert.current} / {alert.threshold} {alert.unit}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 w-full bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCritical ? 'bg-red-500' : pct < 30 ? 'bg-amber-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                  isCritical
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}>
                  {isCritical ? 'OUT' : alert.type === 'liquid' ? 'LOW ML' : 'LOW'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};