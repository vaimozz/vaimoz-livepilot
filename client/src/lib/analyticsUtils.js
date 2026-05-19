export function getAnalyticsData() {
  return [];
}

export function getAnalyticsSummary(data = []) {
  return data.reduce(
    (total, item) => ({
      revenue: total.revenue + Number(item.revenue || 0),
      watchHours: total.watchHours + Number(item.watchHours || 0),
      subscribers: total.subscribers + Number(item.subscribers || 0),
      views: total.views + Number(item.views || 0),
    }),
    { revenue: 0, watchHours: 0, subscribers: 0, views: 0 }
  );
}
