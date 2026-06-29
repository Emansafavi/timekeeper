import { json } from '@sveltejs/kit';
import { handleApiError, readJson } from '$lib/server/http';
import { getSettings, updateSettings } from '$lib/server/repository';

export function GET() {
  try {
    return json({ settings: getSettings() });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(event) {
  try {
    const body = await readJson(event);
    return json({ settings: updateSettings(body) });
  } catch (error) {
    return handleApiError(error);
  }
}
