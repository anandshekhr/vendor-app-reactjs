import { useEffect, useState } from 'react';
import { Bike, MapPinOff } from 'lucide-react';
import { Button, Dialog, Field, Select, Textarea, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAppSelector } from '@/hooks/store';
import { useToast } from '@/hooks/useToast';
import { useAssignPartnerMutation, useLazyNearbyPartnersQuery } from './api';

export function AssignPartnerDialog({ open, onClose, vendorOrderId }: { open: boolean; onClose: () => void; vendorOrderId: number }) {
  const business = useAppSelector((s) => s.auth.business);
  const toast = useToast();
  const [radius, setRadius] = useState(5);
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [fetchPartners, partners] = useLazyNearbyPartnersQuery();
  const [assign, { isLoading }] = useAssignPartnerMutation();
  const hasLocation = business?.latitude != null && business?.longitude != null;

  useEffect(() => {
    if (open && hasLocation) fetchPartners({ latitude: business!.latitude!, longitude: business!.longitude!, radius_km: radius });
  }, [open, radius, hasLocation, business, fetchPartners]);

  const submit = async () => {
    if (!selected) return;
    try {
      const res = await assign({ vendorOrderId, partnerId: selected, notes }).unwrap();
      toast.success('Delivery partner assigned', `Assignment #${res.assignment_id} · ${res.status}`);
      onClose();
    } catch (err) {
      toast.error('Could not assign partner', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Assign delivery partner"
      description="Partners near your shop, as reported by the delivery system."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!selected} loading={isLoading}>
            Assign partner
          </Button>
        </>
      }
    >
      {!hasLocation ? (
        <EmptyState icon={<MapPinOff className="h-5 w-5" />} title="Shop location missing" description="Add your shop's map location in the business profile to search for nearby partners." />
      ) : (
        <div className="space-y-4">
          <Field label="Search radius">
            <Select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              {[2, 5, 10, 15].map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </Select>
          </Field>
          {partners.isFetching ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : partners.error ? (
            <ErrorState error={partners.error} />
          ) : (partners.data ?? []).length === 0 ? (
            <EmptyState icon={<Bike className="h-5 w-5" />} title="No partners available nearby" description="Try a larger radius or wait for the automatic assignment." />
          ) : (
            <fieldset className="space-y-2">
              <legend className="sr-only">Available partners</legend>
              {partners.data!.map((p) => (
                <label key={p.id} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${selected === p.id ? 'border-brand-500 bg-brand-50/50' : 'border-line'}`}>
                  <input type="radio" name="partner" value={p.id} checked={selected === p.id} onChange={() => setSelected(p.id)} className="accent-brand-600" />
                  <div className="min-w-0 flex-1">
                    {/* Only operational fields are shown; identity documents in the payload are ignored (API_MAPPING S-4). */}
                    <p className="text-sm font-medium">{p.name || p.user_name || 'Delivery partner'}</p>
                    <p className="text-xs text-ink-subtle">{p.vehicle_type ? `Vehicle: ${p.vehicle_type}` : 'Vehicle not specified'}</p>
                  </div>
                </label>
              ))}
            </fieldset>
          )}
          <Field label="Note for partner (optional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
          </Field>
        </div>
      )}
    </Dialog>
  );
}
