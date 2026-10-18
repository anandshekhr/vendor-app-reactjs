import type { ReactNode } from 'react';
import { Construction } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Marks a feature the backend does not support yet (see API_MAPPING.md → BACKEND_GAPS). Rendering this instead of
 * placeholder data keeps the UI honest about what is operational.
 */
export function BackendGap({ gap, title, children, className }: { gap: string; title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex gap-3 rounded-md border border-dashed border-amber-400/60 bg-amber-50/60 p-3 text-sm dark:bg-amber-900/10', className)} role="note">
      <Construction className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-medium text-amber-900 dark:text-amber-200">
          {title} <span className="font-mono text-xs text-amber-700/80">[{gap}]</span>
        </p>
        {children && <div className="mt-0.5 text-amber-800/90 dark:text-amber-200/80">{children}</div>}
      </div>
    </div>
  );
}
