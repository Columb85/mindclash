import type { Metadata } from 'next';
import { MaintenancePage } from '@/components/layout/MaintenancePage';

export const metadata: Metadata = {
  title: 'MindClash — Under Maintenance',
  description: 'The site is temporarily unavailable due to scheduled maintenance.',
  robots: { index: false, follow: false },
};

export default function Maintenance() {
  return <MaintenancePage />;
}
