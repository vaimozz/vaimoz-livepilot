import { DashboardPage } from '@/features/dashboard/DashboardPage.jsx';
import { CampaignPage } from '@/features/campaign/CampaignPage.jsx';
import { AssetLibraryPage } from '@/features/assets/AssetLibraryPage.jsx';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage.jsx';
import { StreamMonitorPage } from '@/features/monitor/StreamMonitorPage.jsx';
import { SettingsPage } from '@/features/settings/SettingsPage.jsx';

export function renderPage(activePage, selectedPlatform, setSelectedPlatform) {
  if (activePage === 'Kampanye Live') return <CampaignPage />;
  if (activePage === 'Pustaka Aset') return <AssetLibraryPage />;
  if (activePage === 'Analytics') return <AnalyticsPage />;
  if (activePage === 'Monitor Stream') return <StreamMonitorPage />;
  if (activePage === 'Pengaturan') return <SettingsPage />;
  return <DashboardPage selectedPlatform={selectedPlatform} setSelectedPlatform={setSelectedPlatform} />;
}
