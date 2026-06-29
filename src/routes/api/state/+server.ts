import { json } from '@sveltejs/kit';
import { handleApiError } from '$lib/server/http';
import { getActiveTimer, getAllTags, getDashboardStats, getSettings, listEntries, listProfiles } from '$lib/server/repository';

export function GET() {
  try {
    return json({
      profiles: listProfiles(),
      settings: getSettings(),
      activeTimer: getActiveTimer(),
      stats: getDashboardStats(),
      recentEntries: listEntries({ limit: 30 }),
      tags: getAllTags()
    });
  } catch (error) {
    return handleApiError(error);
  }
}
