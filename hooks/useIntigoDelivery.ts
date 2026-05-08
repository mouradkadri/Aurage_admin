'use client';

import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntigoCity {
  city_id: number;
  city_name: string;
}

export interface IntigoDistrict {
  district_id: number;
  district_name: string;
}

export interface IntigoNeighborhood {
  neighborhood_id: number;
  neighborhood_name: string;
}

export interface IntigoPickupAddress {
  index: number;
  name: string;
  address: string;
  city: string;
}

export interface IntigoTrackingData {
  nid: string;
  current_status: any;
  history: any;
  local_status: {
    order_status: string;
    intigo_status_code: number;
    intigo_status_label: string;
  };
}

export interface ShipViaIntigoPayload {
  destination_city_id: number;
  destination_district_id: number;
  destination_neighborhood_id?: number;
  pickup_index: number;
  package_size?: number;
  additional_info?: string;
  can_open?: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIntigoDelivery() {
  const [cities, setCities] = useState<IntigoCity[]>([]);
  const [districts, setDistricts] = useState<IntigoDistrict[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<IntigoNeighborhood[]>([]);
  const [pickupAddresses, setPickupAddresses] = useState<IntigoPickupAddress[]>([]);
  const [trackingData, setTrackingData] = useState<IntigoTrackingData | null>(null);

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [loadingPickup, setLoadingPickup] = useState(false);
  const [loadingShip, setLoadingShip] = useState(false);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ── Fetch cities (from local DB, synced from Intigo) ────────────────────
  const fetchCities = useCallback(async () => {
    setLoadingCities(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/intigo-regions/cities');
      const data = await res.json();
      setCities(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('Failed to load cities');
    } finally {
      setLoadingCities(false);
    }
  }, []);

  // ── Fetch districts for a city ──────────────────────────────────────────
  const fetchDistricts = useCallback(async (cityId: number) => {
    setLoadingDistricts(true);
    setDistricts([]);
    setNeighborhoods([]);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/intigo-regions/cities/${cityId}/districts`);
      const data = await res.json();
      setDistricts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('Failed to load districts');
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  // ── Fetch neighborhoods for a district ──────────────────────────────────
  const fetchNeighborhoods = useCallback(async (cityId: number, districtId: number) => {
    setLoadingNeighborhoods(true);
    setNeighborhoods([]);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/intigo-regions/districts/${cityId}/${districtId}/neighborhoods`);
      const data = await res.json();
      setNeighborhoods(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('Failed to load neighborhoods');
    } finally {
      setLoadingNeighborhoods(false);
    }
  }, []);

  // ── Fetch pickup addresses from Intigo ──────────────────────────────────
  // Auth is handled server-side by the proxy via the httpOnly admin_access_token
  // cookie — no token should ever be read from localStorage/sessionStorage here.
  const fetchPickupAddresses = useCallback(async () => {
    setLoadingPickup(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/delivery/intigo/pickup-addresses');
      const data = await res.json();
      console.log('[Intigo] Raw pickup response:', JSON.stringify(data, null, 2));

      if (data.success && data.data) {
        // Intigo may return { pickup_addresses: [...] } or just an array
        let addresses: any[] = [];
        if (Array.isArray(data.data)) {
          addresses = data.data;
        } else if (data.data.pickup_addresses && Array.isArray(data.data.pickup_addresses)) {
          addresses = data.data.pickup_addresses;
        } else if (typeof data.data === 'object') {
          // Try to find any array value inside the response
          const arrayKey = Object.keys(data.data).find(k => Array.isArray(data.data[k]));
          if (arrayKey) {
            addresses = data.data[arrayKey];
          }
        }

        // Normalize each address to a consistent shape
        const normalized = addresses.map((addr: any, idx: number) => ({
          index: addr.index ?? addr.pickup_index ?? idx,
          name: addr.name || addr.label || addr.contact_name || `${addr.district_name || addr.city_name || 'Pickup'} — #${addr.index ?? idx}`,
          address: addr.street_address || addr.address || addr.full_address || addr.street || '',
          city: addr.city_name || addr.city || '',
          raw: addr,
        }));

        console.log('[Intigo] Normalized pickup addresses:', normalized);
        setPickupAddresses(normalized);
      }
    } catch (err: any) {
      setError('Failed to load pickup addresses');
    } finally {
      setLoadingPickup(false);
    }
  }, []);

  // ── Ship an order via Intigo ────────────────────────────────────────────
  const shipViaIntigo = useCallback(async (
    orderId: string,
    payload: ShipViaIntigoPayload
  ): Promise<{ success: boolean; message: string; nid?: string }> => {
    setLoadingShip(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/delivery/intigo/${orderId}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.message || data.intigo_detail || 'Failed to ship via Intigo';
        setError(msg);
        return { success: false, message: msg };
      }

      return { success: true, message: data.message, nid: data.data?.nid };
    } catch (err: any) {
      const msg = err.message || 'Network error';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoadingShip(false);
    }
  }, []);

  // ── Cancel an Intigo parcel ─────────────────────────────────────────────
  const cancelIntigoParcel = useCallback(async (
    orderId: string
  ): Promise<{ success: boolean; message: string }> => {
    setLoadingCancel(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/delivery/intigo/${orderId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.message || 'Failed to cancel Intigo parcel';
        setError(msg);
        return { success: false, message: msg };
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      const msg = err.message || 'Network error';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoadingCancel(false);
    }
  }, []);

  // ── Track an Intigo parcel ──────────────────────────────────────────────
  const trackIntigoParcel = useCallback(async (orderId: string) => {
    setLoadingTrack(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/delivery/intigo/${orderId}/track`);
      const data = await res.json();

      if (data.success) {
        setTrackingData(data.data);
      } else {
        setError(data.message || 'Failed to track parcel');
      }
    } catch (err: any) {
      setError('Failed to track parcel');
    } finally {
      setLoadingTrack(false);
    }
  }, []);

  // ── Reset region selections ─────────────────────────────────────────────
  const resetRegions = useCallback(() => {
    setDistricts([]);
    setNeighborhoods([]);
  }, []);

  return {
    // Data
    cities,
    districts,
    neighborhoods,
    pickupAddresses,
    trackingData,

    // Loading states
    loadingCities,
    loadingDistricts,
    loadingNeighborhoods,
    loadingPickup,
    loadingShip,
    loadingTrack,
    loadingCancel,

    // Error
    error,
    setError,

    // Actions
    fetchCities,
    fetchDistricts,
    fetchNeighborhoods,
    fetchPickupAddresses,
    shipViaIntigo,
    cancelIntigoParcel,
    trackIntigoParcel,
    resetRegions,
  };
}