'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Truck, MapPin, Package, Loader2, CheckCircle2,
  AlertCircle, XCircle, ExternalLink, RefreshCw,
} from 'lucide-react';
import { useIntigoDelivery } from '@/hooks/useIntigoDelivery';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntigoShippingPanelProps {
  orderId: string;
  orderStatus: string;
  deliveryMethod?: string;
  intigo?: {
    nid: string | null;
    status_code: number | null;
    status_label: string | null;
    event_type: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    returned_at: string | null;
  };
  onShipped: () => void; // Callback to refresh order details after shipping
}

// ─── Status styling ───────────────────────────────────────────────────────────

const INTIGO_STATUS_STYLES: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  pickup_pending:   { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: Package },
  pending_delivery: { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', icon: Truck },
  in_depot:         { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', icon: Package },
  in_transit:       { color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', icon: Truck },
  out_for_delivery: { color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30', icon: Truck },
  delivered:        { color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', icon: CheckCircle2 },
  return_pending:   { color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', icon: AlertCircle },
  returned:         { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', icon: XCircle },
  cancelled:        { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', icon: XCircle },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const IntigoShippingPanel: React.FC<IntigoShippingPanelProps> = ({
  orderId,
  orderStatus,
  deliveryMethod,
  intigo,
  onShipped,
}) => {
  const {
    cities, districts, neighborhoods, pickupAddresses,
    trackingData,
    loadingCities, loadingDistricts, loadingNeighborhoods,
    loadingPickup, loadingShip, loadingTrack, loadingCancel,
    error, setError,
    fetchCities, fetchDistricts, fetchNeighborhoods,
    fetchPickupAddresses, shipViaIntigo, cancelIntigoParcel,
    trackIntigoParcel, resetRegions,
  } = useIntigoDelivery();

  // ── Form state ──────────────────────────────────────────────────────────
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string>('');
  const [selectedPickupIndex, setSelectedPickupIndex] = useState<string>('');
  const [packageSize, setPackageSize] = useState<string>('1');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [canOpen, setCanOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isIntigoOrder = deliveryMethod === 'intigo' && intigo?.nid;
  const canShipViaIntigo = ['pending', 'printed'].includes(orderStatus) && !isIntigoOrder;

  // ── Load cities + pickup addresses on mount ─────────────────────────────
  useEffect(() => {
    if (canShipViaIntigo) {
      fetchCities();
      fetchPickupAddresses();
    }
  }, [canShipViaIntigo, fetchCities, fetchPickupAddresses]);

  // ── Cascade: city → districts ───────────────────────────────────────────
  useEffect(() => {
    if (selectedCityId) {
      fetchDistricts(Number(selectedCityId));
      setSelectedDistrictId('');
      setSelectedNeighborhoodId('');
    }
  }, [selectedCityId, fetchDistricts]);

  // ── Cascade: district → neighborhoods ───────────────────────────────────
  useEffect(() => {
    if (selectedCityId && selectedDistrictId) {
      fetchNeighborhoods(Number(selectedCityId), Number(selectedDistrictId));
      setSelectedNeighborhoodId('');
    }
  }, [selectedCityId, selectedDistrictId, fetchNeighborhoods]);

  // ── Handle ship submission ──────────────────────────────────────────────
  const handleShip = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!selectedCityId || !selectedDistrictId || !selectedPickupIndex) {
      setError('Please select city, district, and pickup address.');
      return;
    }

    const result = await shipViaIntigo(orderId, {
      destination_city_id: Number(selectedCityId),
      destination_district_id: Number(selectedDistrictId),
      destination_neighborhood_id: selectedNeighborhoodId ? Number(selectedNeighborhoodId) : undefined,
      pickup_index: Number(selectedPickupIndex),
      package_size: Number(packageSize),
      additional_info: additionalInfo || undefined,
      can_open: canOpen,
    });

    if (result.success) {
      setSuccessMessage(result.message);
      onShipped();
    }
  };

  // ── Handle cancel ───────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this Intigo parcel?')) return;
    const result = await cancelIntigoParcel(orderId);
    if (result.success) {
      setSuccessMessage(result.message);
      onShipped();
    }
  };

  // ── Render: Already shipped via Intigo ──────────────────────────────────
  if (isIntigoOrder) {
    const statusStyle = INTIGO_STATUS_STYLES[intigo?.event_type || ''] || INTIGO_STATUS_STYLES.pickup_pending;
    const StatusIcon = statusStyle.icon;
    const canCancelIntigo = intigo?.status_code != null && ![5000, 6900, 1100].includes(intigo.status_code);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">
            Intigo Delivery
          </p>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusStyle.color} ${statusStyle.bg}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {intigo?.status_label || 'Unknown'}
          </div>
        </div>

        {/* Parcel info card */}
        <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-zinc-500">Tracking NID</p>
              <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                {intigo?.nid}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => trackIntigoParcel(orderId)}
              disabled={loadingTrack}
              className="text-xs"
            >
              {loadingTrack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span className="ml-1.5">Refresh</span>
            </Button>
          </div>

          {intigo?.shipped_at && (
            <div>
              <p className="text-xs text-gray-500 dark:text-zinc-500">Shipped</p>
              <p className="text-xs text-gray-700 dark:text-zinc-300">
                {new Date(intigo.shipped_at).toLocaleString()}
              </p>
            </div>
          )}

          {intigo?.delivered_at && (
            <div>
              <p className="text-xs text-gray-500 dark:text-zinc-500">Delivered</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                {new Date(intigo.delivered_at).toLocaleString()}
              </p>
            </div>
          )}

          {intigo?.returned_at && (
            <div>
              <p className="text-xs text-gray-500 dark:text-zinc-500">Returned</p>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {new Date(intigo.returned_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Tracking history (if fetched) */}
        {trackingData && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">
              Intigo tracking history
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Array.isArray(trackingData.history) && trackingData.history.length > 0 ? (
                trackingData.history.map((entry: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-zinc-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {entry.status_label || entry.status || 'Status update'}
                      </p>
                      {entry.timestamp && (
                        <p className="text-gray-500 dark:text-zinc-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No history entries available.</p>
              )}
            </div>
          </div>
        )}

        {/* Cancel button */}
        {canCancelIntigo && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={loadingCancel}
            className="w-full"
          >
            {loadingCancel ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
            Cancel Intigo Parcel
          </Button>
        )}

        {/* Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50">
            <p className="text-xs text-green-600 dark:text-green-400">{successMessage}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Render: Ship via Intigo form ────────────────────────────────────────
  if (!canShipViaIntigo) {
    return null; // Don't show if order can't be shipped
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-amber-500" />
        <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">
          Ship via Intigo
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 space-y-4">

        {/* City */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">City *</label>
          <Select value={selectedCityId} onValueChange={setSelectedCityId}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={loadingCities ? 'Loading cities...' : 'Select city'} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {cities.map(c => (
                <SelectItem key={c.city_id} value={c.city_id.toString()}>
                  {c.city_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* District */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">District *</label>
          <Select
            value={selectedDistrictId}
            onValueChange={setSelectedDistrictId}
            disabled={!selectedCityId || loadingDistricts}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={loadingDistricts ? 'Loading...' : 'Select district'} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {districts.map(d => (
                <SelectItem key={d.district_id} value={d.district_id.toString()}>
                  {d.district_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Neighborhood (optional) */}
        {neighborhoods.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
              Neighborhood <span className="text-gray-400">(optional)</span>
            </label>
            <Select
              value={selectedNeighborhoodId}
              onValueChange={setSelectedNeighborhoodId}
              disabled={loadingNeighborhoods}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder={loadingNeighborhoods ? 'Loading...' : 'Select neighborhood'} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {neighborhoods.map(n => (
                  <SelectItem key={n.neighborhood_id} value={n.neighborhood_id.toString()}>
                    {n.neighborhood_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator className="bg-gray-100 dark:bg-zinc-800" />

        {/* Pickup Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">Pickup Address *</label>
          <Select value={selectedPickupIndex} onValueChange={setSelectedPickupIndex}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={loadingPickup ? 'Loading...' : 'Select pickup point'} />
            </SelectTrigger>
            <SelectContent>
              {pickupAddresses.map((p, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {p.name || p.address || `Pickup #${i}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Package Size */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">Package Size</label>
          <Select value={packageSize} onValueChange={setPackageSize}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Small (1)</SelectItem>
              <SelectItem value="4">Large (4)</SelectItem>
              <SelectItem value="5">XL (5)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Additional Info */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
            Delivery instructions <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="e.g. Ring doorbell twice, call before delivery..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent resize-none"
            rows={2}
            maxLength={500}
          />
        </div>

        {/* Can open checkbox */}
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={canOpen}
            onChange={(e) => setCanOpen(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 accent-amber-500"
          />
          Allow opening the package on delivery
        </label>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50">
          <p className="text-xs text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleShip}
        disabled={loadingShip || !selectedCityId || !selectedDistrictId || selectedPickupIndex === ''}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
      >
        {loadingShip ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Creating parcel...
          </>
        ) : (
          <>
            <Truck className="w-4 h-4 mr-2" />
            Ship via Intigo
          </>
        )}
      </Button>
    </div>
  );
};