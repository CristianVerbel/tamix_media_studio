import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { CONFIG_ITEM, NAV_ITEMS } from './nav';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegación del estudio" className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
            )
          }
        >
          <Icon className="size-[18px]" />
          <span>{label}</span>
        </NavLink>
      ))}
      <div className="my-2 h-px bg-border" />
      <NavLink
        to={CONFIG_ITEM.to}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
          )
        }
      >
        <CONFIG_ITEM.icon className="size-[18px]" />
        <span>{CONFIG_ITEM.label}</span>
      </NavLink>
    </nav>
  );
}
