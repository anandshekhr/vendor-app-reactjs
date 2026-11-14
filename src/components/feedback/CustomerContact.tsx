import { Lock, Mail, Phone } from 'lucide-react';
import { formatDateTime } from '@/utils/format';
import { isMaskedContact } from '@/utils/contactPrivacy';

interface Props {
  phone?: string | null;
  email?: string | null;
  /** From the API: the contact window after the order closed has passed. */
  masked?: boolean;
  /** When the vendor stops seeing the details (set once the order is closed). */
  visibleUntil?: string | null;
}

/**
 * A customer's phone/email for the vendor. The API hides them some time after an order is delivered, completed,
 * cancelled or rejected; then they're shown masked, not as call/mail links, with the reason.
 */
export function CustomerContact({ phone, email, masked, visibleUntil }: Props) {
  const hidden = Boolean(masked) || isMaskedContact(phone) || isMaskedContact(email);
  if (!phone && !email) return null;
  if (hidden) {
    return (
      <div className="space-y-1 text-sm">
        {phone && (
          <p className="flex items-center gap-2 text-ink-muted tabular">
            <Lock className="h-4 w-4" aria-hidden /> {phone}
          </p>
        )}
        {email && <p className="flex items-center gap-2 text-ink-muted">{email}</p>}
        <p className="text-xs text-ink-subtle">Contact details are hidden for the customer’s privacy some time after an order closes.</p>
      </div>
    );
  }
  return (
    <div className="space-y-1 text-sm">
      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-2 text-brand-700 hover:underline">
          <Phone className="h-4 w-4" aria-hidden /> {phone}
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className="flex items-center gap-2 text-brand-700 hover:underline">
          <Mail className="h-4 w-4" aria-hidden /> {email}
        </a>
      )}
      {visibleUntil && <p className="text-xs text-ink-subtle">Visible until {formatDateTime(visibleUntil)}, then hidden for the customer’s privacy.</p>}
    </div>
  );
}
