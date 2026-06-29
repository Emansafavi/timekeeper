import { json } from '@sveltejs/kit';
import { handleApiError, readJson } from '$lib/server/http';
import { discardTimer, stopTimer } from '$lib/server/repository';

export async function POST(event) {
  try {
    const body = await readJson(event);
    if (body.discard === true) {
      discardTimer();
      return json({ entry: null });
    }
    return json({ entry: stopTimer({ note: String(body.note || '') }) });
  } catch (error) {
    return handleApiError(error);
  }
}
