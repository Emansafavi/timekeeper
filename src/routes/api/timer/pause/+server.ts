import { json } from '@sveltejs/kit';
import { handleApiError } from '$lib/server/http';
import { pauseTimer } from '$lib/server/repository';

export function POST() {
  try {
    return json({ activeTimer: pauseTimer() });
  } catch (error) {
    return handleApiError(error);
  }
}
