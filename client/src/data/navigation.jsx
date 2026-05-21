import { Activity, BarChart3, Calendar, Gauge, Image as ImageIcon, Radio, Settings } from 'lucide-react';

export const defaultActivePage = 'Dasbor';

export const menuItems = [
  { label: 'Dasbor', icon: Gauge },
  { label: 'Kampanye Live', icon: Radio },
  { label: 'Recurring Schedule', icon: Calendar },
  { label: 'Pustaka Aset', icon: ImageIcon },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Monitor Stream', icon: Activity },
  { label: 'Pengaturan', icon: Settings },
];
