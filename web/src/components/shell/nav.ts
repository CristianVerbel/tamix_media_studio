import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CalendarDays,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Plug,
  Radio,
  ScrollText,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { to: '/panel', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/panel/contenido', label: 'Contenido', icon: FileText },
  { to: '/panel/planificador', label: 'Planificador', icon: CalendarDays },
  { to: '/panel/comunidad', label: 'Comunidad', icon: MessageCircle },
  { to: '/panel/canal', label: 'Canal', icon: Radio },
  { to: '/panel/metricas', label: 'Métricas', icon: BarChart3 },
  { to: '/panel/ingresos', label: 'Ingresos', icon: TrendingUp },
  { to: '/panel/integraciones', label: 'Integraciones', icon: Plug },
  { to: '/panel/equipo', label: 'Equipo', icon: Users },
  { to: '/panel/auditoria', label: 'Auditoría', icon: ScrollText },
];

export const CONFIG_ITEM: NavItem = { to: '/panel/configuracion', label: 'Configuración', icon: Settings };
