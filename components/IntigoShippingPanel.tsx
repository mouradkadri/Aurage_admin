'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Truck, Package, Loader2, CheckCircle2, AlertCircle,
  XCircle, RefreshCw, Copy, Check, FileSpreadsheet, Clock,
} from 'lucide-react';
import { useIntigoDelivery } from '@/hooks/useIntigoDelivery';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntigoShippingPanelProps {
  orderId:         string;
  orderStatus:     string;
  deliveryMethod?: string;
  shippingAddress?: {
    governorate?:    string;
    governorate_id?: number;
    district?:       string;
    district_id?:    number;
  };
  intigo?: {
    nid:          string | null;
    status_code:  number | null;
    status_label: string | null;
    event_type:   string | null;
    shipped_at:   string | null;
    delivered_at: string | null;
    returned_at:  string | null;
  };
  onShipped: () => void;
}

// ─── Status config ────────────────────────────────────────────────────────────

const INTIGO_STATUS: Record<string, {
  color: string; bg: string; border: string; icon: React.ElementType; label: string;
}> = {
  pickup_pending:   { color: 'text-amber-700',   bg: 'bg-amber-50 dark:bg-amber-950/30',    border: 'border-amber-200 dark:border-amber-800/50',    icon: Package,        label: 'Pickup en attente'     },
  pending_delivery: { color: 'text-blue-700',    bg: 'bg-blue-50 dark:bg-blue-950/30',      border: 'border-blue-200 dark:border-blue-800/50',      icon: Truck,          label: 'En attente livraison'  },
  in_depot:         { color: 'text-blue-700',    bg: 'bg-blue-50 dark:bg-blue-950/30',      border: 'border-blue-200 dark:border-blue-800/50',      icon: Package,        label: 'En dépôt'              },
  in_transit:       { color: 'text-purple-700',  bg: 'bg-purple-50 dark:bg-purple-950/30',  border: 'border-purple-200 dark:border-purple-800/50',  icon: Truck,          label: 'En transit'            },
  out_for_delivery: { color: 'text-indigo-700',  bg: 'bg-indigo-50 dark:bg-indigo-950/30',  border: 'border-indigo-200 dark:border-indigo-800/50',  icon: Truck,          label: 'En cours de livraison' },
  delivered:        { color: 'text-green-700',   bg: 'bg-green-50 dark:bg-green-950/30',    border: 'border-green-200 dark:border-green-800/50',    icon: CheckCircle2,   label: 'Livré'                 },
  return_pending:   { color: 'text-orange-700',  bg: 'bg-orange-50 dark:bg-orange-950/30',  border: 'border-orange-200 dark:border-orange-800/50',  icon: AlertCircle,    label: 'Retour en attente'     },
  returned:         { color: 'text-red-700',     bg: 'bg-red-50 dark:bg-red-950/30',        border: 'border-red-200 dark:border-red-800/50',        icon: XCircle,        label: 'Retourné'              },
  cancelled:        { color: 'text-red-700',     bg: 'bg-red-50 dark:bg-red-950/30',        border: 'border-red-200 dark:border-red-800/50',        icon: XCircle,        label: 'Annulé'                },
  excel_dispatched: { color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-950/30',border: 'border-emerald-200 dark:border-emerald-800/50',icon: FileSpreadsheet, label: 'Expédié via Excel'    },
};

const DEFAULT_STATUS = {
  color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-zinc-800',
  border: 'border-gray-200 dark:border-zinc-700', icon: Package, label: 'Inconnu',
};

// ─── NID copy chip ────────────────────────────────────────────────────────────

const NidChip: React.FC<{ nid: string }> = ({ nid }) => {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(nid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [nid]);

  return (
    <button
      onClick={copy}
      title="Copier le NID"
      className="group flex items-center gap-2 font-mono text-sm font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
    >
      <span>{nid}</span>
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        : <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 flex-shrink-0" />
      }
    </button>
  );
};

// ─── Timestamp row ────────────────────────────────────────────────────────────

const TsRow: React.FC<{ label: string; value: string | null; color?: string }> = ({ label, value, color }) => {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 dark:text-zinc-500 whitespace-nowrap">{label}</span>
      <span className={`text-xs font-medium text-right ${color ?? 'text-gray-700 dark:text-zinc-300'}`}>
        {new Date(value).toLocaleString('fr-FR')}
      </span>
    </div>
  );
};

// ─── Live tracking history ────────────────────────────────────────────────────
// Handles both possible shapes Intigo returns:
//   data.history[]  — direct array
//   data.current_status.history[]  — nested

const TrackingHistory: React.FC<{ data: any }> = ({ data }) => {
  const history: any[] = Array.isArray(data?.history)
    ? data.history
    : Array.isArray(data?.current_status?.history)
      ? data.current_status.history
      : [];

  if (history.length === 0) {
    return (
      <p className="text-xs text-gray-400 dark:text-zinc-500 text-center py-3">
        Aucun historique disponible.
      </p>
    );
  }

  return (
    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
      {history.map((entry: any, i: number) => {
        const label  = entry.status_label ?? entry.label ?? entry.status ?? 'Mise à jour';
        const ts     = entry.timestamp ?? entry.created_at ?? entry.date ?? null;
        const style  = INTIGO_STATUS[entry.event_type ?? ''] ?? DEFAULT_STATUS;
        const Icon   = style.icon;

        return (
          <div key={i} className="flex items-start gap-2.5 text-xs">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${style.bg} ${style.border} border`}>
              <Icon className={`w-2.5 h-2.5 ${style.color}`} />
            </div>
            <div>
              <p className="text-gray-900 dark:text-white font-medium">{label}</p>
              {ts && (
                <p className="text-gray-400 dark:text-zinc-500 mt-0.5">
                  {new Date(ts).toLocaleString('fr-FR')}
                </p>
              )}
              {entry.comment && (
                <p className="text-gray-400 dark:text-zinc-500 italic mt-0.5">{entry.comment}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const IntigoShippingPanel: React.FC<IntigoShippingPanelProps> = ({
  orderId, orderStatus, deliveryMethod, shippingAddress, intigo, onShipped,
}) => {
  const {
    pickupAddresses, trackingData,
    loadingPickup, loadingShip, loadingTrack, loadingCancel,
    error, setError,
    fetchPickupAddresses, shipViaIntigo, cancelIntigoParcel, trackIntigoParcel,
  } = useIntigoDelivery();

  const [selectedPickupIndex, setSelectedPickupIndex] = useState('');
  const [packageSize, setPackageSize]                 = useState('1');
  const [additionalInfo, setAdditionalInfo]           = useState('');
  const [canOpen, setCanOpen]                         = useState(false);
  const [successMessage, setSuccessMessage]           = useState<string | null>(null);

  // Three mutually exclusive states
  const isIntigoApi   = deliveryMethod === 'intigo' && !!intigo?.nid;
  const isIntigoExcel = deliveryMethod === 'intigo' && !intigo?.nid
                        && (intigo?.event_type === 'excel_dispatched' || !!intigo?.shipped_at);
  const canShip       = ['pending', 'printed'].includes(orderStatus) && !isIntigoApi && !isIntigoExcel;
  const missingIds    = canShip && (!shippingAddress?.governorate_id || !shippingAddress?.district_id);

  useEffect(() => {
    if (canShip && !missingIds) fetchPickupAddresses();
  }, [canShip, missingIds, fetchPickupAddresses]);

  // Auto-select single pickup point
  useEffect(() => {
    if (pickupAddresses.length === 1 && selectedPickupIndex === '') {
      setSelectedPickupIndex(pickupAddresses[0].index.toString());
    }
  }, [pickupAddresses, selectedPickupIndex]);

  const handleShip = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!shippingAddress?.governorate_id || !shippingAddress?.district_id) {
      setError('Adresse incomplète — gouvernorat/délégation manquants.');
      return;
    }
    if (selectedPickupIndex === '') {
      setError('Sélectionnez un point de collecte.');
      return;
    }
    const result = await shipViaIntigo(orderId, {
      destination_city_id:     shippingAddress.governorate_id,
      destination_district_id: shippingAddress.district_id,
      pickup_index:            Number(selectedPickupIndex),
      package_size:            Number(packageSize),
      additional_info:         additionalInfo || undefined,
      can_open:                canOpen,
    });
    if (result.success) { setSuccessMessage(result.message); onShipped(); }
  };

  const handleCancel = async () => {
    if (!confirm('Annuler ce colis Intigo ?')) return;
    const result = await cancelIntigoParcel(orderId);
    if (result.success) { setSuccessMessage(result.message); onShipped(); }
  };

  // ── VIEW A: Shipped via API — has NID, full tracking ───────────────────
  if (isIntigoApi) {
    const style      = INTIGO_STATUS[intigo?.event_type ?? ''] ?? DEFAULT_STATUS;
    const StatusIcon = style.icon;
    const canCancel  = intigo?.status_code != null && ![5000, 6900, 1100].includes(intigo.status_code);

    return (
      <div className="space-y-4">

        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
            Livraison Intigo — API
          </p>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${style.color} ${style.bg} ${style.border}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {intigo?.status_label ?? style.label}
          </div>
        </div>

        {/* Parcel card */}
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-4 space-y-3">

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mb-1">Numéro de suivi (NID)</p>
              <NidChip nid={intigo!.nid!} />
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => trackIntigoParcel(orderId)}
              disabled={loadingTrack}
              className="flex-shrink-0 text-xs"
            >
              {loadingTrack
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
              <span className="ml-1.5">Actualiser</span>
            </Button>
          </div>

          <Separator className="bg-gray-200 dark:bg-zinc-800" />

          <div className="space-y-2">
            <TsRow label="Expédié le"  value={intigo?.shipped_at   ?? null} />
            <TsRow label="Livré le"    value={intigo?.delivered_at ?? null} color="text-green-600 dark:text-green-400" />
            <TsRow label="Retourné le" value={intigo?.returned_at  ?? null} color="text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Live tracking history — shown after refresh */}
        {trackingData && (
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
              Historique Intigo
            </p>
            <TrackingHistory data={trackingData} />
          </div>
        )}

        {canCancel && (
          <Button variant="destructive" size="sm" onClick={handleCancel} disabled={loadingCancel} className="w-full">
            {loadingCancel
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <XCircle className="w-4 h-4 mr-2" />}
            Annuler le colis Intigo
          </Button>
        )}

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">{error}</p>
        )}
        {successMessage && (
          <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg px-3 py-2">{successMessage}</p>
        )}
      </div>
    );
  }

  // ── VIEW B: Dispatched via Excel — no NID, manual tracking only ────────
  if (isIntigoExcel) {
    return (
      <div className="space-y-4">

        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
            Livraison Intigo — Excel
          </p>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800/50">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Expédié via Excel
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Colis soumis via fichier Excel
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                Ce colis a été exporté manuellement vers Intigo. Le suivi en temps réel n'est pas disponible — consultez directement le tableau de bord Intigo.
              </p>
            </div>
          </div>

          <Separator className="bg-emerald-200 dark:bg-emerald-800/50" />

          <TsRow label="Exporté le" value={intigo?.shipped_at ?? null} />

          <a
            href="https://partner.intigo.net"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            <Truck className="w-3.5 h-3.5" />
            Ouvrir le tableau de bord Intigo →
          </a>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700">
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Pour un suivi en temps réel la prochaine fois, utilisez{' '}
            <strong className="text-gray-700 dark:text-zinc-300">Expédier via Intigo</strong>{' '}
            directement depuis la fiche commande.
          </p>
        </div>
      </div>
    );
  }

  // ── VIEW C: Ready to ship — compact form ───────────────────────────────
  if (!canShip) return null;

  return (
    <div className="space-y-4">

      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-purple-500" />
        <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
          Expédier via Intigo
        </p>
      </div>

      {missingIds && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">Adresse incomplète</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
              Gouvernorat ID ou délégation ID manquant. Utilisez l'export Excel à la place.
            </p>
          </div>
        </div>
      )}

      {!missingIds && (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">

          {/* Pre-filled destination */}
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700">
            <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Destination</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {shippingAddress?.district
                ? `${shippingAddress.district}, ${shippingAddress.governorate}`
                : shippingAddress?.governorate ?? '—'}
            </p>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
              Ville ID {shippingAddress?.governorate_id} · Délégation ID {shippingAddress?.district_id}
            </p>
          </div>

          <Separator className="bg-gray-100 dark:bg-zinc-800" />

          {/* Pickup address */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
              Point de collecte <span className="text-red-500">*</span>
            </label>
            {pickupAddresses.length === 0 && !loadingPickup && (
              <p className="text-xs text-amber-600">Aucune adresse de collecte configurée dans Intigo.</p>
            )}
            {pickupAddresses.length === 1 ? (
              <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm text-gray-900 dark:text-white">
                {pickupAddresses[0].name}
                {pickupAddresses[0].address && (
                  <span className="text-xs text-gray-500 ml-2">— {pickupAddresses[0].address}</span>
                )}
              </div>
            ) : (
              <Select value={selectedPickupIndex} onValueChange={setSelectedPickupIndex}
                disabled={loadingPickup || pickupAddresses.length === 0}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={loadingPickup ? 'Chargement...' : 'Sélectionner un point'} />
                </SelectTrigger>
                <SelectContent>
                  {pickupAddresses.map(p => (
                    <SelectItem key={p.index} value={p.index.toString()}>
                      <span className="font-medium">{p.name}</span>
                      {p.address && <span className="text-xs text-gray-500 ml-1">— {p.address}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Package size */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">Taille du colis</label>
            <Select value={packageSize} onValueChange={setPackageSize}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Petit (1)</SelectItem>
                <SelectItem value="4">Grand (4)</SelectItem>
                <SelectItem value="5">XL (5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
              Instructions <span className="text-gray-400">(facultatif)</span>
            </label>
            <textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)}
              placeholder="Ex : Appeler avant livraison..." rows={2} maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent resize-none" />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400 cursor-pointer select-none">
            <input type="checkbox" checked={canOpen} onChange={e => setCanOpen(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 accent-purple-500" />
            Autoriser l'ouverture du colis à la livraison
          </label>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">{error}</p>
      )}
      {successMessage && (
        <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg px-3 py-2">{successMessage}</p>
      )}

      {!missingIds && (
        <Button onClick={handleShip}
          disabled={loadingShip || selectedPickupIndex === '' || loadingPickup}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white">
          {loadingShip
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Création du colis...</>
            : <><Truck className="w-4 h-4 mr-2" />Expédier via Intigo</>}
        </Button>
      )}
    </div>
  );
};