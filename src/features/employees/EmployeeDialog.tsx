import { useEffect, useState } from 'react';
import { Button, Dialog, Field, Input } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import type { Provider } from '@/types/api';
import { useCreateProviderMutation, useUpdateProviderMutation, type ProviderCreate } from './api';

const EMPTY: ProviderCreate = { full_name: '', phone: '', email: '', role: '', specialties: '', experience_years: 0, is_available: true };

/** Add a staff member (name + phone is enough: the server finds or creates their login) or edit one. */
export function EmployeeDialog({ open, employee, onClose }: { open: boolean; employee: Provider | null; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<ProviderCreate>(EMPTY);
  const [create, createState] = useCreateProviderMutation();
  const [update, updateState] = useUpdateProviderMutation();

  useEffect(() => {
    if (!open) return;
    setForm(
      employee
        ? {
            full_name: employee.full_name ?? employee.name,
            phone: employee.phone,
            email: employee.email ?? '',
            role: employee.role,
            specialties: employee.specialties,
            experience_years: employee.experience_years,
            is_available: employee.is_available,
          }
        : EMPTY,
    );
  }, [open, employee]);

  const set = <K extends keyof ProviderCreate>(key: K, value: ProviderCreate[K]) => setForm((f) => ({ ...f, [key]: value }));
  const digits = form.phone.replace(/\D/g, '');
  const valid = form.full_name.trim().length >= 2 && digits.length >= 10 && /\S+@\S+\.\S+/.test(form.email);

  const save = async () => {
    const body = { ...form, full_name: form.full_name.trim(), email: form.email.trim(), phone: `+91${digits.slice(-10)}` };
    try {
      if (employee) await update({ id: employee.id, ...body }).unwrap();
      else await create(body).unwrap();
      toast.success(employee ? 'Employee updated' : 'Employee added', body.full_name);
      onClose();
    } catch (err) {
      toast.error(employee ? 'Could not update employee' : 'Could not add employee', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={employee ? `Edit ${employee.name}` : 'Add employee'}
      description={employee ? undefined : 'They can be assigned to bookings straight away. Set their working hours under Availability.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={createState.isLoading || updateState.isLoading} disabled={!valid} onClick={save}>
            {employee ? 'Save' : 'Add employee'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} maxLength={255} />
        </Field>
        <Field label="Mobile number" required hint="10-digit Indian number">
          <Input inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98765 43210" disabled={Boolean(employee)} />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Role">
          <Input value={form.role ?? ''} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Senior stylist" maxLength={50} />
        </Field>
        <Field label="Specialties" hint="Comma-separated">
          <Input value={form.specialties ?? ''} onChange={(e) => set('specialties', e.target.value)} placeholder="Haircut, Colouring" />
        </Field>
        <Field label="Experience (years)">
          <Input type="number" min={0} max={60} value={form.experience_years ?? 0} onChange={(e) => set('experience_years', Number(e.target.value) || 0)} />
        </Field>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_available ?? true} onChange={(e) => set('is_available', e.target.checked)} />
        Available for new bookings
      </label>
    </Dialog>
  );
}
