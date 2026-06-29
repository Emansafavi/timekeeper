import { json } from '@sveltejs/kit';
import { handleApiError, readJson } from '$lib/server/http';
import { startTimer } from '$lib/server/repository';

export async function POST(event) {
  try {
    const body = await readJson(event);
    return json({ activeTimer: startTimer({ profileId: Number(body.profileId), tags: body.tags, allowOverlap: Boolean(body.allowOverlap) }) });
  } catch (error) {
    return handleApiError(error);
  }
}
