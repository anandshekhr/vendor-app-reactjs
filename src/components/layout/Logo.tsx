export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#C23C3C" />
        <path d="M9 13.5 16 8l7 5.5V24a1 1 0 0 1-1 1h-4v-6h-4v6h-4a1 1 0 0 1-1-1z" fill="#fff" />
      </svg>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-ink">TheNearByShop</span>
          <span className="block text-[11px] font-medium text-ink-subtle">Vendor Portal</span>
        </span>
      )}
    </span>
  );
}
