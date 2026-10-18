import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { navGroupsFor, type NavItem } from '@/constants/navigation';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useNavBadges } from '@/hooks/useNavBadges';
import { cn } from '@/utils/cn';
import { Logo } from './Logo';

function NavEntry({ item, collapsed, badge, onNavigate }: { item: NavItem; collapsed: boolean; badge?: number; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/wallet'}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'text-ink-muted hover:bg-ink/5 hover:text-ink',
          collapsed && 'justify-center',
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {badge ? (
        <span
          className={cn(
            'rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold leading-4 text-white tabular',
            collapsed ? 'absolute right-1 top-1' : 'ml-auto',
          )}
          aria-label={`${badge} new`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </NavLink>
  );
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { can } = useCapabilities();
  const badges = useNavBadges();
  return (
    <nav aria-label="Main navigation" className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
      {navGroupsFor(can).map((group) => (
        <div key={group.label}>
          {!collapsed && <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{group.label}</p>}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavEntry key={item.to} item={item} collapsed={collapsed} badge={item.badgeKey ? badges[item.badgeKey] : undefined} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={cn('hidden shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex', collapsed ? 'w-[68px]' : 'w-60')}>
      <div className={cn('flex h-14 items-center border-b border-line px-3', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && <Logo />}
        <button type="button" onClick={onToggle} className="rounded-md p-1.5 text-ink-subtle hover:bg-ink/5 hover:text-ink" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
